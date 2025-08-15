"""
Usage tracking middleware for automatic usage recording and limit enforcement.
"""

import asyncio
import logging
import time
from typing import Callable, Optional
from uuid import UUID

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ..core.config import get_settings
from ..services.usage_service import usage_service
from ..schemas.usage import UsageType

logger = logging.getLogger(__name__)
settings = get_settings()


class UsageTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for tracking usage and enforcing limits.
    
    Features:
    - Automatic usage recording for eligible endpoints
    - Pre-processing limit checks 
    - Concurrent processing enforcement
    - Rate limiting integration
    - Performance monitoring
    """
    
    # Endpoints that should be tracked for usage
    TRACKED_ENDPOINTS = {
        "/api/v1/transcription/process": UsageType.TRANSCRIPTION,
        "/api/v1/transcription/upload": UsageType.TRANSCRIPTION,
        "/api/v1/transcription/youtube": UsageType.TRANSCRIPTION,
        "/api/v1/files/export": UsageType.EXPORT,
    }
    
    # Endpoints that require usage checks before processing
    USAGE_CHECK_ENDPOINTS = {
        "/api/v1/transcription/process",
        "/api/v1/transcription/upload",
        "/api/v1/transcription/youtube",
    }
    
    def __init__(self, app: ASGIApp, enable_enforcement: bool = True):
        super().__init__(app)
        self.enable_enforcement = enable_enforcement
        self.processing_jobs = {}  # Track active processing jobs
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through usage tracking middleware."""
        start_time = time.time()
        
        try:
            # Skip processing for non-tracked endpoints
            if not self._should_track_endpoint(request.url.path):
                return await call_next(request)
            
            # Extract user ID from request
            user_id = await self._extract_user_id(request)
            if not user_id:
                return await call_next(request)  # No authentication, let endpoint handle it
            
            # Pre-processing checks for usage-limited endpoints
            if request.url.path in self.USAGE_CHECK_ENDPOINTS and request.method == "POST":
                check_result = await self._perform_usage_check(request, user_id)
                if not check_result["can_process"]:
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "error": "Usage limit exceeded",
                            "details": check_result,
                            "upgrade_url": "/pricing"
                        }
                    )
            
            # Track concurrent processing
            processing_id = None
            if request.url.path in self.USAGE_CHECK_ENDPOINTS:
                processing_id = await self._start_processing_tracking(user_id)
            
            try:
                # Process the request
                response = await call_next(request)
                
                # Post-processing usage recording
                if response.status_code < 400:  # Only track successful requests
                    await self._record_usage_from_response(
                        request, response, user_id, start_time
                    )
                
                return response
                
            finally:
                # Stop tracking concurrent processing
                if processing_id:
                    await self._stop_processing_tracking(user_id, processing_id)
                    
        except Exception as e:
            logger.error(f"Error in usage tracking middleware: {str(e)}")
            # Don't block requests due to middleware errors
            return await call_next(request)
    
    def _should_track_endpoint(self, path: str) -> bool:
        """Check if endpoint should be tracked for usage."""
        return any(path.startswith(endpoint) for endpoint in self.TRACKED_ENDPOINTS.keys())
    
    async def _extract_user_id(self, request: Request) -> Optional[UUID]:
        """Extract user ID from request headers or JWT token."""
        try:
            # Try to get from Authorization header
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                # In production, you would decode the JWT token here
                # For now, we'll assume the user_id is available in request state
                # This would be set by the authentication dependency
                user = getattr(request.state, 'user', None)
                if user and 'sub' in user:
                    return UUID(user['sub'])
            
            return None
        except Exception as e:
            logger.warning(f"Could not extract user ID from request: {str(e)}")
            return None
    
    async def _perform_usage_check(self, request: Request, user_id: UUID) -> dict:
        """Perform pre-processing usage limit check."""
        try:
            # Extract request details for usage check
            body = await self._get_request_body(request)
            
            # Estimate processing requirements
            estimated_duration = self._estimate_processing_duration(body)
            file_size = self._estimate_file_size(body)
            
            # Check usage limits
            check_response = await usage_service.check_usage_limits(
                user_id=user_id,
                estimated_duration_seconds=estimated_duration,
                file_size_bytes=file_size
            )
            
            return {
                "can_process": check_response.can_process,
                "reason": check_response.blocking_reason,
                "credits_required": check_response.credits_required,
                "credits_available": check_response.credits_available,
                "warnings": check_response.warnings,
                "concurrent_limit_reached": not check_response.can_process_concurrent
            }
            
        except Exception as e:
            logger.error(f"Error performing usage check for user {user_id}: {str(e)}")
            # Default to allowing processing if check fails
            return {"can_process": True, "reason": None}
    
    async def _get_request_body(self, request: Request) -> dict:
        """Safely get request body for analysis."""
        try:
            # Store body for later use since it can only be read once
            body = await request.body()
            
            # Create a new request with the same body for the actual endpoint
            async def receive():
                return {"type": "http.request", "body": body}
            
            request._receive = receive
            
            # Try to parse as JSON
            import json
            return json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            return {}
    
    def _estimate_processing_duration(self, request_body: dict) -> int:
        """Estimate processing duration from request data."""
        # Default estimation - could be enhanced with ML models
        if "duration" in request_body:
            return int(request_body["duration"])
        elif "file_size" in request_body:
            # Rough estimate: 1MB = ~60 seconds of processing
            return int(request_body["file_size"] / 1024 / 1024 * 60)
        else:
            # Default to 5 minutes for unknown files
            return 300
    
    def _estimate_file_size(self, request_body: dict) -> int:
        """Estimate file size from request data."""
        if "file_size" in request_body:
            return int(request_body["file_size"])
        elif "content_length" in request_body:
            return int(request_body["content_length"])
        else:
            # Default to 10MB for unknown files
            return 10 * 1024 * 1024
    
    async def _start_processing_tracking(self, user_id: UUID) -> str:
        """Start tracking a concurrent processing job."""
        processing_id = f"{user_id}_{int(time.time())}"
        
        if str(user_id) not in self.processing_jobs:
            self.processing_jobs[str(user_id)] = set()
        
        self.processing_jobs[str(user_id)].add(processing_id)
        
        logger.info(f"Started processing tracking for user {user_id}, job {processing_id}")
        return processing_id
    
    async def _stop_processing_tracking(self, user_id: UUID, processing_id: str):
        """Stop tracking a concurrent processing job."""
        try:
            if str(user_id) in self.processing_jobs:
                self.processing_jobs[str(user_id)].discard(processing_id)
                
                # Clean up empty sets
                if not self.processing_jobs[str(user_id)]:
                    del self.processing_jobs[str(user_id)]
            
            logger.info(f"Stopped processing tracking for user {user_id}, job {processing_id}")
        except Exception as e:
            logger.error(f"Error stopping processing tracking: {str(e)}")
    
    async def _record_usage_from_response(
        self, 
        request: Request, 
        response: Response, 
        user_id: UUID,
        start_time: float
    ):
        """Record usage based on successful response."""
        try:
            endpoint_path = request.url.path
            usage_type = self._get_usage_type(endpoint_path)
            
            if not usage_type:
                return
            
            # Extract usage metrics from response
            processing_time = int((time.time() - start_time) * 1000)  # milliseconds
            
            # Get response data for usage calculation
            usage_data = await self._extract_usage_from_response(response)
            
            # Record the usage
            await usage_service.record_usage(
                user_id=user_id,
                usage_type=usage_type,
                duration_seconds=usage_data.get("duration_seconds", 0),
                file_size_bytes=usage_data.get("file_size_bytes", 0),
                cost=usage_data.get("cost", 0),
                tokens_used=usage_data.get("tokens_used", 0),
                transcription_id=usage_data.get("transcription_id")
            )
            
            logger.info(f"Usage recorded for user {user_id}: {usage_type}, processing_time: {processing_time}ms")
            
        except Exception as e:
            logger.error(f"Error recording usage for user {user_id}: {str(e)}")
            # Don't fail the request if usage recording fails
    
    def _get_usage_type(self, endpoint_path: str) -> Optional[str]:
        """Get usage type for an endpoint."""
        for endpoint, usage_type in self.TRACKED_ENDPOINTS.items():
            if endpoint_path.startswith(endpoint):
                return usage_type
        return None
    
    async def _extract_usage_from_response(self, response: Response) -> dict:
        """Extract usage metrics from response data."""
        try:
            # This would need to be customized based on actual response formats
            # For now, returning basic structure
            return {
                "duration_seconds": 0,
                "file_size_bytes": 0,
                "cost": 0,
                "tokens_used": 0,
                "transcription_id": None
            }
        except Exception as e:
            logger.error(f"Error extracting usage from response: {str(e)}")
            return {}


class ConcurrentProcessingLimiter:
    """
    Helper class for managing concurrent processing limits.
    Works with the usage tracking middleware to enforce limits.
    """
    
    def __init__(self):
        self.active_jobs = {}  # user_id -> set of job_ids
        self.lock = asyncio.Lock()
    
    async def can_start_processing(self, user_id: UUID, max_concurrent: int) -> bool:
        """Check if user can start a new processing job."""
        async with self.lock:
            user_jobs = self.active_jobs.get(str(user_id), set())
            return len(user_jobs) < max_concurrent
    
    async def start_job(self, user_id: UUID, job_id: str) -> bool:
        """Start tracking a processing job."""
        async with self.lock:
            if str(user_id) not in self.active_jobs:
                self.active_jobs[str(user_id)] = set()
            
            self.active_jobs[str(user_id)].add(job_id)
            return True
    
    async def finish_job(self, user_id: UUID, job_id: str):
        """Stop tracking a processing job."""
        async with self.lock:
            if str(user_id) in self.active_jobs:
                self.active_jobs[str(user_id)].discard(job_id)
                
                # Clean up empty sets
                if not self.active_jobs[str(user_id)]:
                    del self.active_jobs[str(user_id)]
    
    async def get_active_job_count(self, user_id: UUID) -> int:
        """Get count of active jobs for user."""
        async with self.lock:
            return len(self.active_jobs.get(str(user_id), set()))


# Global instance
concurrent_limiter = ConcurrentProcessingLimiter()
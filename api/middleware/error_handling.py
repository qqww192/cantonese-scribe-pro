"""
Comprehensive error handling middleware for CantoneseScribe API.

This middleware provides centralized error handling, logging, and user-friendly
error responses while maintaining security by not exposing sensitive information.
"""

import json
import logging
import traceback
import time
from typing import Callable, Dict, Any
import asyncio

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from core.exceptions import (
    AppException, AuthenticationError, AuthorizationError, ValidationError,
    FileError, ProcessingError, ExternalAPIError, RateLimitError,
    CostLimitError, DatabaseError, NotFoundError
)
from core.config import get_settings
from services.retry_service import CircuitBreakerOpenError

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive error handling and logging."""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self._settings = get_settings()
        self._error_counts = {}
        self._last_error_reset = time.time()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with comprehensive error handling."""
        start_time = time.time()
        request_id = self._generate_request_id()
        
        try:
            # Add request ID to logging context
            logger.info(
                f"[{request_id}] {request.method} {request.url.path} - Started",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "query_params": str(request.query_params),
                    "client_ip": request.client.host if request.client else "unknown"
                }
            )
            
            # Add request ID to request state for use in endpoints
            request.state.request_id = request_id
            
            response = await call_next(request)
            
            # Log successful requests
            processing_time = time.time() - start_time
            logger.info(
                f"[{request_id}] Completed successfully in {processing_time:.3f}s - Status: {response.status_code}",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "processing_time": processing_time
                }
            )
            
            return response
            
        except Exception as exc:
            processing_time = time.time() - start_time
            
            # Create error response
            error_response = await self._handle_exception(
                exc, request, request_id, processing_time
            )
            
            return error_response
    
    def _generate_request_id(self) -> str:
        """Generate unique request ID."""
        import uuid
        return str(uuid.uuid4())[:8]
    
    async def _handle_exception(
        self, 
        exc: Exception, 
        request: Request, 
        request_id: str, 
        processing_time: float
    ) -> JSONResponse:
        """Handle different types of exceptions and create appropriate responses."""
        
        # Track error frequency
        self._track_error(exc.__class__.__name__)
        
        # Prepare base error context
        error_context = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "processing_time": processing_time,
            "client_ip": request.client.host if request.client else "unknown"
        }
        
        # Handle specific exception types
        if isinstance(exc, AppException):
            return await self._handle_app_exception(exc, error_context)
        
        elif isinstance(exc, HTTPException):
            return await self._handle_http_exception(exc, error_context)
        
        elif isinstance(exc, CircuitBreakerOpenError):
            return await self._handle_circuit_breaker_error(exc, error_context)
        
        elif isinstance(exc, asyncio.TimeoutError):
            return await self._handle_timeout_error(exc, error_context)
        
        elif isinstance(exc, ValueError):
            return await self._handle_value_error(exc, error_context)
        
        else:
            return await self._handle_generic_exception(exc, error_context)
    
    async def _handle_app_exception(
        self, 
        exc: AppException, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle application-specific exceptions."""
        
        # Log based on severity
        if exc.status_code >= 500:
            logger.error(
                f"[{context['request_id']}] Application error: {exc.detail}",
                extra={**context, "error_code": exc.error_code, "exception": str(exc)},
                exc_info=exc if self._settings.debug else None
            )
        else:
            logger.warning(
                f"[{context['request_id']}] Application warning: {exc.detail}",
                extra={**context, "error_code": exc.error_code}
            )
        
        # Create user-friendly response
        response_data = {
            "error": {
                "type": exc.__class__.__name__,
                "code": exc.error_code,
                "message": exc.detail,
                "request_id": context["request_id"]
            }
        }
        
        # Add debug information in development
        if self._settings.debug:
            response_data["error"]["debug"] = {
                "processing_time": context["processing_time"],
                "path": context["path"]
            }
        
        return JSONResponse(
            status_code=exc.status_code,
            content=response_data
        )
    
    async def _handle_http_exception(
        self, 
        exc: HTTPException, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle FastAPI HTTP exceptions."""
        
        logger.warning(
            f"[{context['request_id']}] HTTP exception: {exc.detail}",
            extra={**context, "status_code": exc.status_code}
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "HTTPException",
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "request_id": context["request_id"]
                }
            }
        )
    
    async def _handle_circuit_breaker_error(
        self, 
        exc: CircuitBreakerOpenError, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle circuit breaker open errors."""
        
        logger.error(
            f"[{context['request_id']}] Circuit breaker open: {str(exc)}",
            extra=context
        )
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": {
                    "type": "ServiceUnavailable",
                    "code": "CIRCUIT_BREAKER_OPEN",
                    "message": "Service temporarily unavailable. Please try again later.",
                    "request_id": context["request_id"],
                    "retry_after": 60
                }
            }
        )
    
    async def _handle_timeout_error(
        self, 
        exc: asyncio.TimeoutError, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle timeout errors."""
        
        logger.error(
            f"[{context['request_id']}] Request timeout after {context['processing_time']:.2f}s",
            extra=context
        )
        
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content={
                "error": {
                    "type": "TimeoutError",
                    "code": "REQUEST_TIMEOUT", 
                    "message": "Request processing timed out. Please try again with a smaller file or check your connection.",
                    "request_id": context["request_id"],
                    "processing_time": context["processing_time"]
                }
            }
        )
    
    async def _handle_value_error(
        self, 
        exc: ValueError, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle value errors (usually input validation)."""
        
        logger.warning(
            f"[{context['request_id']}] Validation error: {str(exc)}",
            extra=context
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "type": "ValidationError",
                    "code": "INVALID_INPUT",
                    "message": "Invalid input data provided.",
                    "request_id": context["request_id"],
                    "details": str(exc) if self._settings.debug else None
                }
            }
        )
    
    async def _handle_generic_exception(
        self, 
        exc: Exception, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle unexpected exceptions."""
        
        # Log full error details
        logger.error(
            f"[{context['request_id']}] Unexpected error: {str(exc)}",
            extra={
                **context,
                "exception_type": exc.__class__.__name__,
                "traceback": traceback.format_exc()
            },
            exc_info=exc
        )
        
        # Create safe response for production
        if self._settings.environment == "production":
            error_message = "An unexpected error occurred. Please try again later."
            debug_info = None
        else:
            error_message = f"Unexpected error: {str(exc)}"
            debug_info = {
                "exception_type": exc.__class__.__name__,
                "traceback": traceback.format_exc(),
                "processing_time": context["processing_time"]
            }
        
        response_data = {
            "error": {
                "type": "InternalServerError",
                "code": "INTERNAL_ERROR",
                "message": error_message,
                "request_id": context["request_id"]
            }
        }
        
        if debug_info:
            response_data["error"]["debug"] = debug_info
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response_data
        )
    
    def _track_error(self, error_type: str) -> None:
        """Track error frequency for monitoring."""
        current_time = time.time()
        
        # Reset counters every hour
        if current_time - self._last_error_reset > 3600:
            self._error_counts = {}
            self._last_error_reset = current_time
        
        # Increment error count
        self._error_counts[error_type] = self._error_counts.get(error_type, 0) + 1
        
        # Log high error rates
        if self._error_counts[error_type] % 10 == 0:
            logger.warning(
                f"High error rate detected: {error_type} occurred {self._error_counts[error_type]} times in the last hour"
            )
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics."""
        return {
            "error_counts": self._error_counts.copy(),
            "last_reset": self._last_error_reset,
            "window_hours": 1
        }


def create_error_handler_for_exception(exception_class: type):
    """
    Create a specific error handler for an exception class.
    
    This is useful for handling specific exceptions that might not be caught
    by the middleware (e.g., in WebSocket endpoints).
    """
    
    async def error_handler(request: Request, exc: exception_class):
        """Handle specific exception type."""
        middleware = ErrorHandlingMiddleware(None)  # We don't need the app here
        
        request_id = getattr(request.state, 'request_id', 'unknown')
        
        return await middleware._handle_exception(
            exc, request, request_id, 0.0
        )
    
    return error_handler


def add_error_handlers(app: FastAPI) -> None:
    """Add comprehensive error handlers to FastAPI app."""
    
    # Add middleware
    app.add_middleware(ErrorHandlingMiddleware)
    
    # Add specific exception handlers
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return await create_error_handler_for_exception(AppException)(request, exc)
    
    @app.exception_handler(CircuitBreakerOpenError)
    async def circuit_breaker_handler(request: Request, exc: CircuitBreakerOpenError):
        return await create_error_handler_for_exception(CircuitBreakerOpenError)(request, exc)
    
    @app.exception_handler(asyncio.TimeoutError)
    async def timeout_handler(request: Request, exc: asyncio.TimeoutError):
        return await create_error_handler_for_exception(asyncio.TimeoutError)(request, exc)
    
    logger.info("Comprehensive error handling configured")


# Health check for error handling
async def error_handling_health_check() -> Dict[str, Any]:
    """Check error handling system health."""
    return {
        "status": "healthy",
        "middleware": "active",
        "handlers": "configured"
    }
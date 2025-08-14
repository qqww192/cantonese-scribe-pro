"""
Real-time progress tracking service for CantoneseScribe.

This service manages live progress updates for transcription jobs using
WebSockets and Server-Sent Events (SSE) for real-time communication.
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any, List
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import WebSocket, WebSocketDisconnect
from starlette.responses import StreamingResponse

from ..core.config import get_settings
from ..core.exceptions import ProcessingError
from ..services.database_service import DatabaseService

logger = logging.getLogger(__name__)


class ProgressEventType(str, Enum):
    """Types of progress events."""
    JOB_CREATED = "job_created"
    JOB_STARTED = "job_started" 
    PROGRESS_UPDATE = "progress_update"
    JOB_COMPLETED = "job_completed"
    JOB_FAILED = "job_failed"
    JOB_CANCELLED = "job_cancelled"
    STATUS_UPDATE = "status_update"
    ERROR = "error"


@dataclass
class ProgressEvent:
    """Progress event data structure."""
    event_type: ProgressEventType
    job_id: str
    user_id: str
    progress: float = 0.0
    status: str = ""
    message: str = ""
    data: Optional[Dict[str, Any]] = None
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        # Store active WebSocket connections by user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store SSE connections by user_id
        self.sse_connections: Dict[str, Set[asyncio.Queue]] = {}
        # Store job subscribers by job_id
        self.job_subscribers: Dict[str, Set[str]] = {}
    
    async def connect_websocket(self, websocket: WebSocket, user_id: str) -> None:
        """Connect a new WebSocket client."""
        try:
            await websocket.accept()
            
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            
            self.active_connections[user_id].add(websocket)
            logger.info(f"WebSocket connected for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket: {str(e)}")
            raise
    
    def disconnect_websocket(self, websocket: WebSocket, user_id: str) -> None:
        """Disconnect a WebSocket client."""
        try:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            logger.info(f"WebSocket disconnected for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {str(e)}")
    
    async def connect_sse(self, user_id: str) -> asyncio.Queue:
        """Connect a new SSE client."""
        try:
            queue = asyncio.Queue()
            
            if user_id not in self.sse_connections:
                self.sse_connections[user_id] = set()
            
            self.sse_connections[user_id].add(queue)
            logger.info(f"SSE connected for user: {user_id}")
            
            return queue
            
        except Exception as e:
            logger.error(f"Error connecting SSE: {str(e)}")
            raise
    
    def disconnect_sse(self, queue: asyncio.Queue, user_id: str) -> None:
        """Disconnect an SSE client."""
        try:
            if user_id in self.sse_connections:
                self.sse_connections[user_id].discard(queue)
                if not self.sse_connections[user_id]:
                    del self.sse_connections[user_id]
            
            logger.info(f"SSE disconnected for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting SSE: {str(e)}")
    
    def subscribe_to_job(self, user_id: str, job_id: str) -> None:
        """Subscribe user to job updates."""
        if job_id not in self.job_subscribers:
            self.job_subscribers[job_id] = set()
        
        self.job_subscribers[job_id].add(user_id)
        logger.debug(f"User {user_id} subscribed to job {job_id}")
    
    def unsubscribe_from_job(self, user_id: str, job_id: str) -> None:
        """Unsubscribe user from job updates."""
        if job_id in self.job_subscribers:
            self.job_subscribers[job_id].discard(user_id)
            if not self.job_subscribers[job_id]:
                del self.job_subscribers[job_id]
        
        logger.debug(f"User {user_id} unsubscribed from job {job_id}")
    
    async def send_to_user(self, user_id: str, event: ProgressEvent) -> None:
        """Send event to specific user via all their connections."""
        try:
            # Send to WebSocket connections
            if user_id in self.active_connections:
                dead_connections = set()
                
                for websocket in self.active_connections[user_id].copy():
                    try:
                        await websocket.send_text(event.to_json())
                    except WebSocketDisconnect:
                        dead_connections.add(websocket)
                    except Exception as e:
                        logger.error(f"Error sending WebSocket message: {str(e)}")
                        dead_connections.add(websocket)
                
                # Clean up dead connections
                for websocket in dead_connections:
                    self.active_connections[user_id].discard(websocket)
            
            # Send to SSE connections
            if user_id in self.sse_connections:
                dead_queues = set()
                
                for queue in self.sse_connections[user_id].copy():
                    try:
                        queue.put_nowait(event)
                    except asyncio.QueueFull:
                        logger.warning(f"SSE queue full for user {user_id}")
                        dead_queues.add(queue)
                    except Exception as e:
                        logger.error(f"Error sending SSE message: {str(e)}")
                        dead_queues.add(queue)
                
                # Clean up dead queues
                for queue in dead_queues:
                    self.sse_connections[user_id].discard(queue)
            
        except Exception as e:
            logger.error(f"Error sending event to user {user_id}: {str(e)}")
    
    async def broadcast_job_update(self, event: ProgressEvent) -> None:
        """Broadcast job update to all subscribers."""
        try:
            job_id = event.job_id
            if job_id in self.job_subscribers:
                for user_id in self.job_subscribers[job_id].copy():
                    await self.send_to_user(user_id, event)
            
        except Exception as e:
            logger.error(f"Error broadcasting job update: {str(e)}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics."""
        return {
            "websocket_connections": len(self.active_connections),
            "sse_connections": len(self.sse_connections),
            "job_subscriptions": len(self.job_subscribers),
            "total_websockets": sum(len(conns) for conns in self.active_connections.values()),
            "total_sse": sum(len(conns) for conns in self.sse_connections.values())
        }


class ProgressService:
    """Service for managing real-time progress updates."""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self._settings = get_settings()
        self._job_progress: Dict[str, float] = {}
        self._job_status: Dict[str, str] = {}
    
    async def create_job_progress(self, job_id: str, user_id: str) -> None:
        """Initialize progress tracking for a new job."""
        try:
            self._job_progress[job_id] = 0.0
            self._job_status[job_id] = "created"
            
            event = ProgressEvent(
                event_type=ProgressEventType.JOB_CREATED,
                job_id=job_id,
                user_id=user_id,
                progress=0.0,
                status="created",
                message="Job created successfully"
            )
            
            await self.connection_manager.send_to_user(user_id, event)
            logger.info(f"Progress tracking initialized for job: {job_id}")
            
        except Exception as e:
            logger.error(f"Error creating job progress: {str(e)}")
    
    async def update_job_progress(
        self, 
        job_id: str, 
        user_id: str, 
        progress: float, 
        status: str = "", 
        message: str = "",
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Update job progress and notify subscribers."""
        try:
            # Clamp progress between 0 and 1
            progress = max(0.0, min(1.0, progress))
            
            self._job_progress[job_id] = progress
            if status:
                self._job_status[job_id] = status
            
            event = ProgressEvent(
                event_type=ProgressEventType.PROGRESS_UPDATE,
                job_id=job_id,
                user_id=user_id,
                progress=progress,
                status=status or self._job_status.get(job_id, ""),
                message=message,
                data=data
            )
            
            # Update database if available
            try:
                from services.database_service import database_service
                await database_service.update_job_status(
                    job_id=job_id,
                    status=status if status else self._job_status.get(job_id, "processing"),
                    progress=progress
                )
            except Exception as db_e:
                logger.warning(f"Failed to update database progress: {str(db_e)}")
            
            # Broadcast to subscribers
            await self.connection_manager.broadcast_job_update(event)
            logger.debug(f"Progress updated for job {job_id}: {progress:.2%}")
            
        except Exception as e:
            logger.error(f"Error updating job progress: {str(e)}")
    
    async def complete_job(
        self, 
        job_id: str, 
        user_id: str, 
        success: bool = True, 
        message: str = "",
        result_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Mark job as completed (success or failure)."""
        try:
            if success:
                self._job_progress[job_id] = 1.0
                self._job_status[job_id] = "completed"
                event_type = ProgressEventType.JOB_COMPLETED
                message = message or "Job completed successfully"
            else:
                self._job_status[job_id] = "failed"
                event_type = ProgressEventType.JOB_FAILED
                message = message or "Job failed"
            
            event = ProgressEvent(
                event_type=event_type,
                job_id=job_id,
                user_id=user_id,
                progress=self._job_progress[job_id],
                status=self._job_status[job_id],
                message=message,
                data=result_data
            )
            
            # Update database
            try:
                from services.database_service import database_service
                await database_service.update_job_status(
                    job_id=job_id,
                    status=self._job_status[job_id],
                    progress=self._job_progress[job_id],
                    result_data=result_data,
                    error_message=message if not success else None
                )
            except Exception as db_e:
                logger.warning(f"Failed to update database completion: {str(db_e)}")
            
            # Broadcast completion
            await self.connection_manager.broadcast_job_update(event)
            
            # Clean up tracking data after delay
            asyncio.create_task(self._cleanup_job_data(job_id))
            
            logger.info(f"Job {job_id} marked as {'completed' if success else 'failed'}")
            
        except Exception as e:
            logger.error(f"Error completing job: {str(e)}")
    
    async def cancel_job(self, job_id: str, user_id: str, message: str = "") -> None:
        """Cancel a job."""
        try:
            self._job_status[job_id] = "cancelled"
            
            event = ProgressEvent(
                event_type=ProgressEventType.JOB_CANCELLED,
                job_id=job_id,
                user_id=user_id,
                progress=self._job_progress.get(job_id, 0.0),
                status="cancelled",
                message=message or "Job cancelled by user"
            )
            
            # Update database
            try:
                from services.database_service import database_service
                await database_service.update_job_status(
                    job_id=job_id,
                    status="cancelled"
                )
            except Exception as db_e:
                logger.warning(f"Failed to update database cancellation: {str(db_e)}")
            
            # Broadcast cancellation
            await self.connection_manager.broadcast_job_update(event)
            
            # Clean up tracking data
            asyncio.create_task(self._cleanup_job_data(job_id))
            
            logger.info(f"Job {job_id} cancelled")
            
        except Exception as e:
            logger.error(f"Error cancelling job: {str(e)}")
    
    async def _cleanup_job_data(self, job_id: str, delay: int = 300) -> None:
        """Clean up job tracking data after delay."""
        try:
            await asyncio.sleep(delay)  # Keep data for 5 minutes after completion
            
            self._job_progress.pop(job_id, None)
            self._job_status.pop(job_id, None)
            
            # Clean up subscribers
            if job_id in self.connection_manager.job_subscribers:
                del self.connection_manager.job_subscribers[job_id]
            
            logger.debug(f"Cleaned up tracking data for job: {job_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up job data: {str(e)}")
    
    async def get_job_progress(self, job_id: str) -> Dict[str, Any]:
        """Get current progress for a job."""
        try:
            # Try to get from database first
            from services.database_service import database_service
            job_data = await database_service.get_transcription_job(job_id, user_id=None)  # Admin access
            
            if job_data:
                return {
                    'job_id': job_id,
                    'progress': job_data.get('progress', 0.0),
                    'status': job_data.get('status', 'unknown'),
                    'created_at': job_data.get('created_at'),
                    'started_at': job_data.get('started_at'),
                    'completed_at': job_data.get('completed_at'),
                    'error_message': job_data.get('error_message')
                }
            
            # Fallback to in-memory data
            return {
                'job_id': job_id,
                'progress': self._job_progress.get(job_id, 0.0),
                'status': self._job_status.get(job_id, 'unknown'),
                'in_memory': True
            }
            
        except Exception as e:
            logger.error(f"Error getting job progress: {str(e)}")
            return {
                'job_id': job_id,
                'progress': 0.0,
                'status': 'error',
                'error': str(e)
            }
    
    async def subscribe_to_job(self, user_id: str, job_id: str) -> None:
        """Subscribe user to job updates."""
        self.connection_manager.subscribe_to_job(user_id, job_id)
    
    async def unsubscribe_from_job(self, user_id: str, job_id: str) -> None:
        """Unsubscribe user from job updates."""
        self.connection_manager.unsubscribe_from_job(user_id, job_id)
    
    async def connect_websocket(self, websocket: WebSocket, user_id: str) -> None:
        """Connect WebSocket for user."""
        await self.connection_manager.connect_websocket(websocket, user_id)
    
    def disconnect_websocket(self, websocket: WebSocket, user_id: str) -> None:
        """Disconnect WebSocket for user."""
        self.connection_manager.disconnect_websocket(websocket, user_id)
    
    async def connect_sse(self, user_id: str) -> asyncio.Queue:
        """Connect SSE for user."""
        return await self.connection_manager.connect_sse(user_id)
    
    def disconnect_sse(self, queue: asyncio.Queue, user_id: str) -> None:
        """Disconnect SSE for user."""
        self.connection_manager.disconnect_sse(queue, user_id)
    
    async def send_error(self, user_id: str, job_id: str, error_message: str) -> None:
        """Send error event to user."""
        try:
            event = ProgressEvent(
                event_type=ProgressEventType.ERROR,
                job_id=job_id,
                user_id=user_id,
                progress=self._job_progress.get(job_id, 0.0),
                status="error",
                message=error_message
            )
            
            await self.connection_manager.send_to_user(user_id, event)
            
        except Exception as e:
            logger.error(f"Error sending error event: {str(e)}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return {
            'connection_stats': self.connection_manager.get_connection_stats(),
            'active_jobs': len(self._job_progress),
            'job_statuses': {
                status: len([j for j in self._job_status.values() if j == status])
                for status in set(self._job_status.values())
            }
        }


# Global service instance
progress_service = ProgressService()


# SSE Generator function
async def sse_generator(queue: asyncio.Queue) -> str:
    """Generate SSE events from queue."""
    try:
        while True:
            try:
                # Wait for event with timeout
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"data: {event.to_json()}\n\n"
            except asyncio.TimeoutError:
                # Send keep-alive ping
                yield f"data: {json.dumps({'type': 'ping', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
            except Exception as e:
                logger.error(f"SSE generator error: {str(e)}")
                break
    except Exception as e:
        logger.error(f"SSE generator failed: {str(e)}")


# Dependency function
async def get_progress_service() -> ProgressService:
    """Dependency to get progress service."""
    return progress_service
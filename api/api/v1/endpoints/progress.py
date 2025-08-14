"""
Real-time progress tracking endpoints for WebSocket and SSE connections.
"""

import asyncio
import logging
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from starlette.responses import Response

from api.dependencies import get_current_user, get_optional_user
from services.progress_service import (
    ProgressService, progress_service, sse_generator, get_progress_service
)
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    progress_svc: ProgressService = Depends(get_progress_service)
):
    """
    WebSocket endpoint for real-time progress updates.
    
    Clients can connect to receive live updates for their transcription jobs.
    """
    try:
        # Connect WebSocket
        await progress_svc.connect_websocket(websocket, user_id)
        
        logger.info(f"WebSocket connected for user: {user_id}")
        
        try:
            while True:
                # Receive messages from client
                data = await websocket.receive_text()
                
                try:
                    import json
                    message = json.loads(data)
                    
                    # Handle different message types
                    if message.get("type") == "subscribe":
                        job_id = message.get("job_id")
                        if job_id:
                            await progress_svc.subscribe_to_job(user_id, job_id)
                            await websocket.send_text(json.dumps({
                                "type": "subscribed",
                                "job_id": job_id,
                                "message": "Subscribed to job updates"
                            }))
                    
                    elif message.get("type") == "unsubscribe":
                        job_id = message.get("job_id")
                        if job_id:
                            await progress_svc.unsubscribe_from_job(user_id, job_id)
                            await websocket.send_text(json.dumps({
                                "type": "unsubscribed", 
                                "job_id": job_id,
                                "message": "Unsubscribed from job updates"
                            }))
                    
                    elif message.get("type") == "ping":
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "timestamp": message.get("timestamp")
                        }))
                    
                    elif message.get("type") == "get_progress":
                        job_id = message.get("job_id")
                        if job_id:
                            progress_data = await progress_svc.get_job_progress(job_id)
                            await websocket.send_text(json.dumps({
                                "type": "progress_data",
                                "job_id": job_id,
                                "data": progress_data
                            }))
                
                except json.JSONDecodeError:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON message"
                    }))
                except Exception as e:
                    logger.error(f"Error handling WebSocket message: {str(e)}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Error processing message"
                    }))
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user: {user_id}")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {str(e)}")
        
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
    
    finally:
        # Clean up connection
        progress_svc.disconnect_websocket(websocket, user_id)


@router.get("/sse/{user_id}")
async def sse_endpoint(
    user_id: str,
    progress_svc: ProgressService = Depends(get_progress_service)
):
    """
    Server-Sent Events (SSE) endpoint for real-time progress updates.
    
    Alternative to WebSocket for clients that prefer SSE.
    """
    try:
        # Connect SSE
        queue = await progress_svc.connect_sse(user_id)
        
        logger.info(f"SSE connected for user: {user_id}")
        
        async def event_stream():
            try:
                async for event in sse_generator(queue):
                    yield event
            except Exception as e:
                logger.error(f"SSE stream error: {str(e)}")
            finally:
                progress_svc.disconnect_sse(queue, user_id)
        
        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
    
    except Exception as e:
        logger.error(f"SSE connection error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to establish SSE connection")


@router.get("/status/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    progress_svc: ProgressService = Depends(get_progress_service)
):
    """
    Get current status and progress of a transcription job.
    """
    try:
        progress_data = await progress_svc.get_job_progress(job_id)
        
        # Verify user has access to this job
        if not progress_data.get('in_memory', False):  # Database job
            from services.database_service import database_service
            job = await database_service.get_transcription_job(job_id, current_user["id"])
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job_id,
            "progress": progress_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get job status")


@router.post("/subscribe/{job_id}")
async def subscribe_to_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    progress_svc: ProgressService = Depends(get_progress_service)
):
    """
    Subscribe to real-time updates for a specific job.
    """
    try:
        # Verify user has access to this job
        from services.database_service import database_service
        job = await database_service.get_transcription_job(job_id, current_user["id"])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        await progress_svc.subscribe_to_job(current_user["id"], job_id)
        
        return {
            "message": "Subscribed to job updates",
            "job_id": job_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subscribing to job: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to subscribe to job")


@router.post("/unsubscribe/{job_id}")
async def unsubscribe_from_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    progress_svc: ProgressService = Depends(get_progress_service)
):
    """
    Unsubscribe from real-time updates for a specific job.
    """
    try:
        await progress_svc.unsubscribe_from_job(current_user["id"], job_id)
        
        return {
            "message": "Unsubscribed from job updates",
            "job_id": job_id
        }
    
    except Exception as e:
        logger.error(f"Error unsubscribing from job: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unsubscribe from job")


@router.get("/stats")
async def get_progress_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    progress_svc: ProgressService = Depends(get_progress_service)
):
    """
    Get real-time service statistics (admin users only).
    """
    try:
        # In a real implementation, check if user is admin
        # For now, return stats for any authenticated user
        stats = progress_svc.get_stats()
        
        return {
            "stats": stats,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    except Exception as e:
        logger.error(f"Error getting progress stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")


@router.get("/health")
async def health_check():
    """
    Health check endpoint for progress service.
    """
    try:
        stats = progress_service.get_stats()
        
        return {
            "status": "healthy",
            "service": "progress_tracking",
            "connections": stats["connection_stats"],
            "timestamp": asyncio.get_event_loop().time()
        }
    
    except Exception as e:
        logger.error(f"Progress service health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "progress_tracking",
            "error": str(e)
        }
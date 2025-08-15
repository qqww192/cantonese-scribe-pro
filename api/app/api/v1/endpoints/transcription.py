"""
Transcription processing endpoints with integrated usage tracking and limit enforcement.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse

from ...dependencies import get_current_user
from ....schemas.transcription import (
    TranscriptionRequest, TranscriptionResponse, TranscriptionJob,
    ExportRequest, ExportResponse
)
from ....schemas.usage import UsageCheckRequest, UsageType
from ....services.transcription_service import transcription_service
from ....services.usage_service import usage_service
from ....core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.post("/check-limits", response_model=dict)
async def check_transcription_limits(
    request: UsageCheckRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Check if user can process a transcription before uploading.
    Frontend should call this before allowing file uploads.
    """
    try:
        user_id = UUID(current_user["sub"])
        
        # Perform usage limit check
        usage_check = await usage_service.check_usage_limits(
            user_id=user_id,
            estimated_duration_seconds=request.estimated_duration_seconds,
            file_size_bytes=request.file_size_bytes
        )
        
        # Get current usage for additional context
        current_usage = await usage_service.get_current_usage(user_id)
        
        return {
            "can_process": usage_check.can_process,
            "can_process_concurrent": usage_check.can_process_concurrent,
            "blocking_reason": usage_check.blocking_reason,
            "credits_required": usage_check.credits_required,
            "credits_available": usage_check.credits_available,
            "credits_after": usage_check.credits_after,
            "estimated_cost": float(usage_check.estimated_cost),
            "warnings": usage_check.warnings,
            "current_usage": {
                "credits_used": current_usage.credits_used,
                "credits_total": current_usage.credits_total,
                "is_near_limit": current_usage.is_near_limit,
                "is_at_limit": current_usage.is_at_limit,
                "concurrent_processing": current_usage.concurrent_processing,
                "max_concurrent": current_usage.max_concurrent,
                "days_until_reset": current_usage.days_until_reset
            },
            "upgrade_url": "/pricing" if not usage_check.can_process else None
        }
        
    except ValueError as e:
        logger.error(f"Invalid limit check request: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    except Exception as e:
        logger.error(f"Error checking transcription limits: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check limits")


@router.post("/start", response_model=TranscriptionResponse)
async def start_transcription(
    request: TranscriptionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Start transcription job for uploaded file or YouTube URL.
    Includes pre-processing usage limit checks and concurrent job enforcement.
    """
    try:
        user_id = UUID(current_user["sub"])
        
        # Get file/video information for usage check
        file_info = await transcription_service.get_file_info(
            file_id=request.file_id,
            youtube_url=request.youtube_url,
            user_id=user_id
        )
        
        # Perform usage limit check before starting transcription
        usage_check = await usage_service.check_usage_limits(
            user_id=user_id,
            estimated_duration_seconds=file_info.get("estimated_duration", 300),  # Default 5 min
            file_size_bytes=file_info.get("file_size", 10 * 1024 * 1024)  # Default 10MB
        )
        
        # Block if user has exceeded limits
        if not usage_check.can_process:
            logger.warning(f"Usage limit exceeded for user {user_id}: {usage_check.blocking_reason}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Usage limit exceeded",
                    "reason": usage_check.blocking_reason,
                    "credits_required": usage_check.credits_required,
                    "credits_available": usage_check.credits_available,
                    "upgrade_url": "/pricing",
                    "usage_check": usage_check.dict()
                }
            )
        
        # Check concurrent processing limits
        if not usage_check.can_process_concurrent:
            logger.warning(f"Concurrent processing limit reached for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Concurrent processing limit reached",
                    "reason": f"Maximum {usage_check.max_concurrent_jobs} concurrent jobs allowed",
                    "current_jobs": usage_check.current_concurrent_jobs,
                    "max_jobs": usage_check.max_concurrent_jobs,
                    "queue_available": True,  # Could implement queuing
                    "upgrade_url": "/pricing"
                }
            )
        
        # Show warnings if any (e.g., approaching limit)
        if usage_check.warnings:
            logger.info(f"Usage warnings for user {user_id}: {usage_check.warnings}")
        
        # Create transcription job
        job = await transcription_service.create_job(
            user_id=user_id,
            file_id=request.file_id,
            youtube_url=request.youtube_url,
            options=request.options,
            estimated_credits=usage_check.credits_required,
            estimated_cost=usage_check.estimated_cost
        )
        
        # Record usage initiation (actual usage will be recorded on completion)
        await usage_service.record_usage(
            user_id=user_id,
            usage_type=UsageType.TRANSCRIPTION,
            duration_seconds=file_info.get("estimated_duration", 0),
            file_size_bytes=file_info.get("file_size", 0),
            cost=usage_check.estimated_cost,
            transcription_id=UUID(job.job_id)
        )
        
        # Start processing in background
        background_tasks.add_task(
            transcription_service.process_job,
            job.job_id,
            user_id  # Pass user_id for additional usage tracking
        )
        
        logger.info(f"Transcription job started: {job.job_id} for user {user_id}, credits required: {usage_check.credits_required}")
        
        # Include usage information in response
        response = TranscriptionResponse(
            job_id=job.job_id,
            status="processing",
            message="Transcription job started successfully"
        )
        
        # Add usage info to response
        response.usage_info = {
            "credits_used": usage_check.credits_required,
            "credits_remaining": usage_check.credits_available - usage_check.credits_required,
            "estimated_cost": float(usage_check.estimated_cost),
            "warnings": usage_check.warnings
        }
        
        return response
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions (like usage limits)
    except ValueError as e:
        logger.error(f"Invalid request data: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    except Exception as e:
        logger.error(f"Error starting transcription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start transcription")


@router.get("/status/{job_id}", response_model=TranscriptionJob)
async def get_transcription_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get transcription job status and results with current usage information."""
    try:
        user_id = UUID(current_user["sub"])
        job = await transcription_service.get_job_status(job_id, current_user["user_id"])
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Add current usage information to the response
        try:
            current_usage = await usage_service.get_current_usage(user_id)
            
            # If job doesn't have usage_info yet, add current usage context
            if not job.usage_info:
                job.usage_info = {
                    "credits_remaining": current_usage.credits_total - current_usage.credits_used,
                    "credits_total": current_usage.credits_total,
                    "credits_used_this_month": current_usage.credits_used,
                    "billing_period": current_usage.current_month,
                    "days_until_reset": current_usage.days_until_reset,
                    "is_near_limit": current_usage.is_near_limit,
                    "is_at_limit": current_usage.is_at_limit,
                    "concurrent_processing": current_usage.concurrent_processing,
                    "max_concurrent": current_usage.max_concurrent
                }
            else:
                # Update usage_info with current data
                job.usage_info.update({
                    "credits_remaining": current_usage.credits_total - current_usage.credits_used,
                    "credits_total": current_usage.credits_total,
                    "credits_used_this_month": current_usage.credits_used,
                    "billing_period": current_usage.current_month,
                    "days_until_reset": current_usage.days_until_reset,
                    "is_near_limit": current_usage.is_near_limit,
                    "is_at_limit": current_usage.is_at_limit,
                    "concurrent_processing": current_usage.concurrent_processing,
                    "max_concurrent": current_usage.max_concurrent
                })
                
        except Exception as usage_error:
            logger.warning(f"Failed to get usage info for job status {job_id}: {str(usage_error)}")
            # Don't fail the request if usage info fails
        
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get job status")


@router.get("/jobs", response_model=List[TranscriptionJob])
async def list_transcription_jobs(
    current_user: dict = Depends(get_current_user),
    limit: int = 10,
    offset: int = 0
):
    """List user's transcription jobs with current usage context."""
    try:
        user_id = UUID(current_user["sub"])
        jobs = await transcription_service.list_user_jobs(
            current_user["user_id"], 
            limit=limit, 
            offset=offset
        )
        
        # Add current usage context to the response (not to each job, but as overall context)
        try:
            current_usage = await usage_service.get_current_usage(user_id)
            
            # Add usage context to each job that doesn't have it
            for job in jobs:
                if not job.usage_info:
                    job.usage_info = {
                        "credits_remaining": current_usage.credits_total - current_usage.credits_used,
                        "credits_total": current_usage.credits_total,
                        "billing_period": current_usage.current_month,
                        "is_near_limit": current_usage.is_near_limit,
                        "is_at_limit": current_usage.is_at_limit
                    }
                    
        except Exception as usage_error:
            logger.warning(f"Failed to get usage info for job list: {str(usage_error)}")
            # Don't fail the request if usage info fails
        
        return jobs
        
    except Exception as e:
        logger.error(f"Error listing jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list jobs")


@router.delete("/jobs/{job_id}")
async def cancel_transcription_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a transcription job."""
    try:
        success = await transcription_service.cancel_job(job_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")
        
        return {"message": "Job cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel job")


@router.post("/export", response_model=ExportResponse)
async def export_transcription(
    request: ExportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Export transcription in various formats (SRT, VTT, TXT, CSV).
    Tracks export usage for analytics and potential future limits.
    """
    try:
        user_id = UUID(current_user["sub"])
        
        # Export the transcription
        export_data = await transcription_service.export_transcription(
            job_id=request.job_id,
            user_id=user_id,
            format=request.format,
            options=request.options
        )
        
        # Record export usage (currently doesn't count against limits, but tracked for analytics)
        try:
            await usage_service.record_usage(
                user_id=user_id,
                usage_type=UsageType.EXPORT,
                duration_seconds=0,  # No duration for exports
                file_size_bytes=export_data.get("file_size", 0),
                cost=0,  # Currently free
                tokens_used=0
            )
        except Exception as usage_error:
            # Don't fail export if usage recording fails
            logger.warning(f"Failed to record export usage for user {user_id}: {str(usage_error)}")
        
        return ExportResponse(
            download_url=export_data["download_url"],
            filename=export_data["filename"],
            format=request.format,
            file_size=export_data["file_size"]
        )
        
    except ValueError as e:
        logger.error(f"Invalid export request: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid export request: {str(e)}")
    except Exception as e:
        logger.error(f"Error exporting transcription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export transcription")


@router.get("/download/{job_id}/{format}")
async def download_transcription(
    job_id: str,
    format: str,
    current_user: dict = Depends(get_current_user)
):
    """Download transcription file in specified format."""
    try:
        file_path = await transcription_service.get_export_file(
            job_id=job_id,
            user_id=current_user["user_id"],
            format=format
        )
        
        if not file_path or not file_path.exists():
            raise HTTPException(status_code=404, detail="Export file not found")
        
        media_type = {
            "srt": "text/plain",
            "vtt": "text/vtt",
            "txt": "text/plain",
            "csv": "text/csv",
            "json": "application/json"
        }.get(format.lower(), "application/octet-stream")
        
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type=media_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading transcription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download transcription")
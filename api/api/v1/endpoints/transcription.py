"""
Transcription processing endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from api.dependencies import get_current_user
from schemas.transcription import (
    TranscriptionRequest, TranscriptionResponse, TranscriptionJob,
    ExportRequest, ExportResponse
)
from services.transcription_service import transcription_service
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.post("/start", response_model=TranscriptionResponse)
async def start_transcription(
    request: TranscriptionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Start transcription job for uploaded file or YouTube URL.
    """
    try:
        job = await transcription_service.create_job(
            user_id=current_user["user_id"],
            file_id=request.file_id,
            youtube_url=request.youtube_url,
            options=request.options
        )
        
        # Start processing in background
        background_tasks.add_task(
            transcription_service.process_job,
            job.job_id
        )
        
        logger.info(f"Transcription job started: {job.job_id} for user {current_user['user_id']}")
        
        return TranscriptionResponse(
            job_id=job.job_id,
            status="processing",
            message="Transcription job started successfully"
        )
        
    except Exception as e:
        logger.error(f"Error starting transcription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start transcription")


@router.get("/status/{job_id}", response_model=TranscriptionJob)
async def get_transcription_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get transcription job status and results."""
    try:
        job = await transcription_service.get_job_status(job_id, current_user["user_id"])
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
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
    """List user's transcription jobs."""
    try:
        jobs = await transcription_service.list_user_jobs(
            current_user["user_id"], 
            limit=limit, 
            offset=offset
        )
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
    """Export transcription in various formats (SRT, VTT, TXT, CSV)."""
    try:
        export_data = await transcription_service.export_transcription(
            job_id=request.job_id,
            user_id=current_user["user_id"],
            format=request.format,
            options=request.options
        )
        
        return ExportResponse(
            download_url=export_data["download_url"],
            filename=export_data["filename"],
            format=request.format,
            file_size=export_data["file_size"]
        )
        
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
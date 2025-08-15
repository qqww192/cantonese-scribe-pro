"""
File management endpoints.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse

from ....core.storage import file_manager
from ....core.exceptions import FileError
from ....schemas.files import FileUploadResponse, FileMetadata, StorageUsage
from ....schemas.usage import UsageCheckRequest
from ....services.usage_service import usage_service
from ...dependencies import get_current_user
from ....core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a file for processing.
    
    Supports audio and video files for transcription.
    Validates usage limits before allowing upload.
    """
    try:
        user_id = UUID(current_user["sub"])
        
        # Read file size first
        file_content = await file.read()
        file_size_bytes = len(file_content)
        
        # Reset file position
        await file.seek(0)
        
        # Validate file type
        allowed_types = {
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac',
            'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
        }
        
        if file.content_type not in allowed_types:
            raise FileError(f"Unsupported file type: {file.content_type}")
        
        # Determine file type
        file_type = "audio" if file.content_type.startswith("audio") else "video"
        
        # Estimate duration (rough estimate: 1MB = 1 minute for audio, 0.5 minute for video)
        if file_type == "audio":
            estimated_duration_seconds = int((file_size_bytes / (1024 * 1024)) * 60)
        else:
            estimated_duration_seconds = int((file_size_bytes / (1024 * 1024)) * 30)
        
        # Check usage limits before proceeding with upload
        usage_check = await usage_service.check_usage_limits(
            user_id=user_id,
            estimated_duration_seconds=estimated_duration_seconds,
            file_size_bytes=file_size_bytes
        )
        
        # Block upload if user exceeds limits
        if not usage_check.can_process:
            logger.warning(f"Upload blocked for user {user_id}: {usage_check.blocking_reason}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Upload not allowed",
                    "reason": usage_check.blocking_reason,
                    "file_size_mb": round(file_size_bytes / (1024 * 1024), 2),
                    "estimated_duration_minutes": round(estimated_duration_seconds / 60, 1),
                    "credits_required": usage_check.credits_required,
                    "credits_available": usage_check.credits_available,
                    "upgrade_url": "/pricing",
                    "usage_check": usage_check.dict()
                }
            )
        
        # Show warnings if any (e.g., approaching limit)
        if usage_check.warnings:
            logger.info(f"Upload warnings for user {user_id}: {usage_check.warnings}")
        
        # Save the file (reset to original content)
        await file.seek(0)
        metadata = await file_manager.save_upload_file(
            file, 
            current_user["user_id"], 
            file_type
        )
        
        logger.info(f"File uploaded: {metadata['file_id']} by user {user_id}, estimated duration: {estimated_duration_seconds}s")
        
        # Include usage information in response
        response = FileUploadResponse(
            file_id=metadata["file_id"],
            filename=metadata["original_filename"],
            file_size=metadata["file_size"],
            file_type=file_type,
            upload_time=metadata["upload_time"],
            message="File uploaded successfully"
        )
        
        # Add usage info to response
        response.usage_info = {
            "estimated_duration_seconds": estimated_duration_seconds,
            "estimated_duration_minutes": round(estimated_duration_seconds / 60, 1),
            "estimated_credits": usage_check.credits_required,
            "estimated_cost": float(usage_check.estimated_cost),
            "warnings": usage_check.warnings,
            "credits_remaining_after": usage_check.credits_after
        }
        
        return response
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions (like usage limits)
    except FileError:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get("/list", response_model=List[FileMetadata])
async def list_user_files(
    current_user: dict = Depends(get_current_user)
):
    """Get list of user's uploaded and processed files."""
    try:
        files = await file_manager.get_user_files(current_user["user_id"])
        return [FileMetadata(**file_data) for file_data in files]
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list files")


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download a file by ID."""
    try:
        file_path = await file_manager.get_file_path(file_id, current_user["user_id"])
        
        if not file_path or not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        raise HTTPException(status_code=500, detail="Download failed")


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a file by ID."""
    try:
        success = await file_manager.delete_file(file_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail="Delete failed")


@router.get("/usage", response_model=StorageUsage)
async def get_storage_usage(
    current_user: dict = Depends(get_current_user)
):
    """Get user's storage usage statistics."""
    try:
        usage = await file_manager.calculate_storage_usage(current_user["user_id"])
        return StorageUsage(**usage)
    except Exception as e:
        logger.error(f"Error calculating usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate usage")
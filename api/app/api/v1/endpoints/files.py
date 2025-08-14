"""
File management endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from ....core.storage import file_manager
from ....core.exceptions import FileError
from ....schemas.files import FileUploadResponse, FileMetadata, StorageUsage
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
    Maximum file size: 100MB
    """
    try:
        # Validate file type
        allowed_types = {
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac',
            'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
        }
        
        if file.content_type not in allowed_types:
            raise FileError(f"Unsupported file type: {file.content_type}")
        
        # Determine file type
        file_type = "audio" if file.content_type.startswith("audio") else "video"
        
        # Save the file
        metadata = await file_manager.save_upload_file(
            file, 
            current_user["user_id"], 
            file_type
        )
        
        logger.info(f"File uploaded: {metadata['file_id']} by user {current_user['user_id']}")
        
        return FileUploadResponse(
            file_id=metadata["file_id"],
            filename=metadata["original_filename"],
            file_size=metadata["file_size"],
            file_type=file_type,
            upload_time=metadata["upload_time"],
            message="File uploaded successfully"
        )
        
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
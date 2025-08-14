"""
File storage and management system optimized for Vercel serverless deployment.

This module handles:
- Temporary file management
- File upload/download operations
- Cleanup strategies for serverless environments
- Secure file handling
"""

import os
import shutil
import tempfile
import hashlib
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import UploadFile, HTTPException
import aiofiles
import logging

from ..core.config import get_settings

logger = logging.getLogger(__name__)


class FileManager:
    """Handles file operations optimized for serverless deployment."""
    
    def __init__(self):
        self.settings = get_settings()
        self.temp_dir = Path(self.settings.temp_dir)
        self.upload_dir = Path(self.settings.upload_dir)
        self.processed_dir = Path(self.settings.processed_dir)
    
    def ensure_directories(self) -> None:
        """Ensure all required directories exist."""
        for directory in [self.temp_dir, self.upload_dir, self.processed_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def generate_file_id(self, filename: str) -> str:
        """Generate unique file ID based on filename and timestamp."""
        timestamp = datetime.utcnow().isoformat()
        content = f"{filename}_{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def save_upload_file(
        self, 
        file: UploadFile, 
        user_id: str,
        file_type: str = "audio"
    ) -> Dict[str, Any]:
        """
        Save uploaded file with proper organization and metadata.
        
        Args:
            file: FastAPI UploadFile object
            user_id: User identifier for file organization
            file_type: Type of file (audio, video, etc.)
            
        Returns:
            Dictionary with file metadata
        """
        try:
            # Validate file size
            if file.size > self.settings.max_file_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size: {self.settings.max_file_size} bytes"
                )
            
            # Generate unique file ID and path
            file_id = self.generate_file_id(file.filename)
            file_extension = Path(file.filename).suffix.lower()
            
            # Create user-specific directory structure
            user_dir = self.upload_dir / user_id
            user_dir.mkdir(exist_ok=True)
            
            # Generate safe filename
            safe_filename = f"{file_id}{file_extension}"
            file_path = user_dir / safe_filename
            
            # Save file asynchronously
            async with aiofiles.open(file_path, "wb") as f:
                content = await file.read()
                await f.write(content)
            
            # Calculate file hash for integrity checking
            file_hash = hashlib.sha256(content).hexdigest()
            
            # Create metadata
            metadata = {
                "file_id": file_id,
                "original_filename": file.filename,
                "safe_filename": safe_filename,
                "file_path": str(file_path),
                "file_size": len(content),
                "file_hash": file_hash,
                "file_type": file_type,
                "user_id": user_id,
                "upload_time": datetime.utcnow().isoformat(),
                "mime_type": file.content_type
            }
            
            logger.info(f"File saved: {file_id} for user {user_id}")
            return metadata
            
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save file")
    
    async def get_file_path(self, file_id: str, user_id: str) -> Optional[Path]:
        """Get file path if it exists and belongs to the user."""
        user_dir = self.upload_dir / user_id
        
        # Search for file with matching ID
        for file_path in user_dir.glob(f"{file_id}*"):
            if file_path.is_file():
                return file_path
        return None
    
    async def delete_file(self, file_id: str, user_id: str) -> bool:
        """Delete a file if it exists and belongs to the user."""
        file_path = await self.get_file_path(file_id, user_id)
        if file_path and file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Deleted file: {file_id} for user {user_id}")
                return True
            except Exception as e:
                logger.error(f"Error deleting file {file_id}: {str(e)}")
        return False
    
    async def create_temp_file(
        self, 
        content: bytes, 
        suffix: str = None,
        prefix: str = "temp_"
    ) -> Path:
        """Create a temporary file with automatic cleanup tracking."""
        try:
            # Create temporary file
            fd, temp_path = tempfile.mkstemp(
                suffix=suffix,
                prefix=prefix,
                dir=self.temp_dir
            )
            
            # Write content and close file descriptor
            with os.fdopen(fd, 'wb') as f:
                f.write(content)
            
            temp_file_path = Path(temp_path)
            logger.debug(f"Created temp file: {temp_file_path}")
            return temp_file_path
            
        except Exception as e:
            logger.error(f"Error creating temp file: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create temporary file")
    
    async def save_processed_file(
        self,
        content: Any,
        file_id: str,
        user_id: str,
        file_type: str,
        extension: str
    ) -> Dict[str, Any]:
        """Save processed file (transcription results, exports, etc.)."""
        try:
            # Create user-specific processed directory
            user_processed_dir = self.processed_dir / user_id
            user_processed_dir.mkdir(exist_ok=True)
            
            # Generate filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{file_id}_{file_type}_{timestamp}{extension}"
            file_path = user_processed_dir / filename
            
            # Save content based on type
            if isinstance(content, (str, bytes)):
                mode = "w" if isinstance(content, str) else "wb"
                async with aiofiles.open(file_path, mode) as f:
                    await f.write(content)
            else:
                # Handle JSON or other serializable content
                import json
                async with aiofiles.open(file_path, "w") as f:
                    await f.write(json.dumps(content, ensure_ascii=False, indent=2))
            
            metadata = {
                "file_id": file_id,
                "filename": filename,
                "file_path": str(file_path),
                "file_type": file_type,
                "user_id": user_id,
                "created_time": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Saved processed file: {filename} for user {user_id}")
            return metadata
            
        except Exception as e:
            logger.error(f"Error saving processed file: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save processed file")
    
    async def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """Clean up files older than specified age."""
        cleaned_count = 0
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        try:
            for directory in [self.temp_dir, self.upload_dir, self.processed_dir]:
                if not directory.exists():
                    continue
                
                for file_path in directory.rglob("*"):
                    if file_path.is_file():
                        # Check file age
                        file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if file_time < cutoff_time:
                            try:
                                file_path.unlink()
                                cleaned_count += 1
                                logger.debug(f"Cleaned up old file: {file_path}")
                            except Exception as e:
                                logger.error(f"Error deleting {file_path}: {str(e)}")
            
            logger.info(f"Cleaned up {cleaned_count} old files")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return cleaned_count
    
    async def get_user_files(self, user_id: str) -> List[Dict[str, Any]]:
        """Get list of user's files with metadata."""
        files = []
        user_upload_dir = self.upload_dir / user_id
        user_processed_dir = self.processed_dir / user_id
        
        for directory, file_type in [(user_upload_dir, "upload"), (user_processed_dir, "processed")]:
            if directory.exists():
                for file_path in directory.iterdir():
                    if file_path.is_file():
                        stat = file_path.stat()
                        files.append({
                            "filename": file_path.name,
                            "file_path": str(file_path),
                            "file_size": stat.st_size,
                            "file_type": file_type,
                            "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
        
        return sorted(files, key=lambda x: x["modified_time"], reverse=True)
    
    async def calculate_storage_usage(self, user_id: str) -> Dict[str, int]:
        """Calculate user's storage usage."""
        usage = {"upload_size": 0, "processed_size": 0, "total_files": 0}
        
        user_upload_dir = self.upload_dir / user_id
        user_processed_dir = self.processed_dir / user_id
        
        for directory, key in [(user_upload_dir, "upload_size"), (user_processed_dir, "processed_size")]:
            if directory.exists():
                for file_path in directory.iterdir():
                    if file_path.is_file():
                        usage[key] += file_path.stat().st_size
                        usage["total_files"] += 1
        
        return usage


# Global file manager instance
file_manager = FileManager()


def ensure_directories() -> None:
    """Ensure all required directories exist."""
    file_manager.ensure_directories()


async def cleanup_temp_files() -> None:
    """Clean up temporary files (called during shutdown)."""
    await file_manager.cleanup_old_files(max_age_hours=1)


# Periodic cleanup task for long-running instances
async def periodic_cleanup():
    """Periodic cleanup task for development environments."""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            await file_manager.cleanup_old_files()
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {str(e)}")


# Utility functions for common operations
async def save_upload(file: UploadFile, user_id: str, file_type: str = "audio") -> Dict[str, Any]:
    """Convenience function to save uploaded file."""
    return await file_manager.save_upload_file(file, user_id, file_type)


async def get_temp_file(content: bytes, suffix: str = None) -> Path:
    """Convenience function to create temporary file."""
    return await file_manager.create_temp_file(content, suffix)


async def save_result(content: Any, file_id: str, user_id: str, file_type: str, extension: str) -> Dict[str, Any]:
    """Convenience function to save processed results."""
    return await file_manager.save_processed_file(content, file_id, user_id, file_type, extension)
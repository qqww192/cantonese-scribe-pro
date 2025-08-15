"""
File-related Pydantic schemas.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, validator


class FileUploadResponse(BaseModel):
    """Response model for file upload."""
    file_id: str
    filename: str
    file_size: int
    file_type: str
    upload_time: str
    message: str
    usage_info: Optional[Dict[str, Any]] = None


class FileMetadata(BaseModel):
    """File metadata model."""
    filename: str
    file_path: str
    file_size: int
    file_type: str
    modified_time: str
    
    @validator('file_size')
    def format_file_size(cls, v):
        """Format file size for display."""
        return v


class StorageUsage(BaseModel):
    """Storage usage statistics."""
    upload_size: int
    processed_size: int
    total_files: int
    
    @property
    def total_size(self) -> int:
        return self.upload_size + self.processed_size
    
    @property
    def upload_size_mb(self) -> float:
        return round(self.upload_size / (1024 * 1024), 2)
    
    @property
    def processed_size_mb(self) -> float:
        return round(self.processed_size / (1024 * 1024), 2)
    
    @property
    def total_size_mb(self) -> float:
        return round(self.total_size / (1024 * 1024), 2)
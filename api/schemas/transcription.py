"""
Transcription-related Pydantic schemas.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator
from enum import Enum


class JobStatus(str, Enum):
    """Job status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExportFormat(str, Enum):
    """Export format enumeration."""
    SRT = "srt"
    VTT = "vtt"
    TXT = "txt"
    CSV = "csv"
    JSON = "json"


class TranscriptionOptions(BaseModel):
    """Transcription processing options."""
    language: str = "yue"  # Cantonese
    include_yale: bool = True
    include_jyutping: bool = True
    include_english: bool = True
    confidence_threshold: float = 0.7
    speaker_diarization: bool = False


class TranscriptionRequest(BaseModel):
    """Request model for starting transcription."""
    file_id: Optional[str] = None
    youtube_url: Optional[str] = None
    options: Optional[TranscriptionOptions] = TranscriptionOptions()
    
    @validator('file_id')
    def validate_input(cls, v, values):
        if not v and not values.get('youtube_url'):
            raise ValueError('Either file_id or youtube_url must be provided')
        return v


class TranscriptionResponse(BaseModel):
    """Response model for transcription job creation."""
    job_id: str
    status: JobStatus
    message: str


class TranscriptionItem(BaseModel):
    """Individual transcription item/segment."""
    id: int
    start_time: float
    end_time: float
    chinese: str
    yale: Optional[str] = None
    jyutping: Optional[str] = None
    english: Optional[str] = None
    confidence: float
    speaker: Optional[str] = None


class TranscriptionResult(BaseModel):
    """Complete transcription result."""
    items: List[TranscriptionItem]
    metadata: Dict[str, Any]
    statistics: Dict[str, Any]


class TranscriptionJob(BaseModel):
    """Transcription job model with full details."""
    job_id: str
    user_id: str
    status: JobStatus
    file_id: Optional[str] = None
    youtube_url: Optional[str] = None
    options: TranscriptionOptions
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    progress: float = 0.0
    result: Optional[TranscriptionResult] = None
    cost: Optional[float] = None
    duration: Optional[float] = None


class ExportOptions(BaseModel):
    """Export formatting options."""
    include_timestamps: bool = True
    include_speaker_labels: bool = False
    max_line_length: Optional[int] = None
    segment_duration: Optional[float] = None


class ExportRequest(BaseModel):
    """Request model for exporting transcription."""
    job_id: str
    format: ExportFormat
    options: Optional[ExportOptions] = ExportOptions()


class ExportResponse(BaseModel):
    """Response model for transcription export."""
    download_url: str
    filename: str
    format: ExportFormat
    file_size: int


class CostEstimate(BaseModel):
    """Cost estimation for transcription."""
    estimated_cost: float
    estimated_duration: float
    cost_per_minute: float
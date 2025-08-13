"""
Transcription service that orchestrates the entire pipeline.
"""

import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
import json

from schemas.transcription import (
    TranscriptionJob, TranscriptionOptions, JobStatus,
    TranscriptionResult, TranscriptionItem, ExportFormat
)
from services.audio_service import audio_service
from services.whisper_service import whisper_service
from services.romanization_service import romanization_service
from services.translation_service import translation_service
from services.export_service import export_service
from core.storage import file_manager
from core.logging import get_logger
from core.exceptions import ProcessingError

logger = get_logger(__name__)


class TranscriptionService:
    """Main transcription service that coordinates the entire pipeline."""
    
    def __init__(self):
        self.jobs: Dict[str, TranscriptionJob] = {}
        self.active_jobs: Dict[str, asyncio.Task] = {}
    
    async def create_job(
        self,
        user_id: str,
        file_id: Optional[str] = None,
        youtube_url: Optional[str] = None,
        options: Optional[TranscriptionOptions] = None
    ) -> TranscriptionJob:
        """Create a new transcription job."""
        job_id = str(uuid.uuid4())
        
        if options is None:
            options = TranscriptionOptions()
        
        job = TranscriptionJob(
            job_id=job_id,
            user_id=user_id,
            status=JobStatus.PENDING,
            file_id=file_id,
            youtube_url=youtube_url,
            options=options,
            created_at=datetime.utcnow().isoformat()
        )
        
        self.jobs[job_id] = job
        logger.info(f"Created transcription job: {job_id}")
        return job
    
    async def process_job(self, job_id: str) -> None:
        """Process a transcription job through the complete pipeline."""
        job = self.jobs.get(job_id)
        if not job:
            logger.error(f"Job not found: {job_id}")
            return
        
        try:
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.utcnow().isoformat()
            job.progress = 0.1
            
            logger.info(f"Starting transcription job: {job_id}")
            
            # Step 1: Get audio file
            audio_path = await self._get_audio_file(job)
            job.progress = 0.2
            
            # Step 2: Extract audio metadata
            metadata = await audio_service.get_audio_metadata(audio_path)
            job.duration = metadata.get("duration", 0)
            job.progress = 0.3
            
            # Step 3: Transcribe with Whisper
            whisper_result = await whisper_service.transcribe(
                audio_path, 
                language="zh"
            )
            job.progress = 0.6
            
            # Step 4: Process transcription segments
            segments = await self._process_segments(whisper_result, job.options)
            job.progress = 0.9
            
            # Step 5: Create final result
            result = TranscriptionResult(
                items=segments,
                metadata={
                    "duration": job.duration,
                    "language": job.options.language,
                    "segments_count": len(segments),
                    "processing_time": self._calculate_processing_time(job)
                },
                statistics={
                    "average_confidence": sum(s.confidence for s in segments) / len(segments) if segments else 0,
                    "low_confidence_segments": len([s for s in segments if s.confidence < job.options.confidence_threshold]),
                    "total_characters": sum(len(s.chinese) for s in segments)
                }
            )
            
            job.result = result
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow().isoformat()
            job.progress = 1.0
            
            # Calculate cost
            job.cost = self._calculate_cost(job.duration)
            
            # Save result to file
            await self._save_job_result(job)
            
            logger.info(f"Completed transcription job: {job_id}")
            
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {str(e)}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow().isoformat()
        
        finally:
            # Clean up active job tracking
            if job_id in self.active_jobs:
                del self.active_jobs[job_id]
    
    async def _get_audio_file(self, job: TranscriptionJob) -> Path:
        """Get audio file for processing."""
        if job.file_id:
            # Get uploaded file
            file_path = await file_manager.get_file_path(job.file_id, job.user_id)
            if not file_path:
                raise ProcessingError(f"File not found: {job.file_id}")
            return file_path
        
        elif job.youtube_url:
            # Download from YouTube
            audio_path = await audio_service.download_youtube_audio(
                job.youtube_url, 
                job.user_id
            )
            return audio_path
        
        else:
            raise ProcessingError("No input source specified")
    
    async def _process_segments(
        self, 
        whisper_result: Dict[str, Any], 
        options: TranscriptionOptions
    ) -> List[TranscriptionItem]:
        """Process Whisper transcription segments."""
        segments = []
        
        for i, segment in enumerate(whisper_result.get("segments", [])):
            chinese_text = segment["text"].strip()
            
            # Skip empty segments
            if not chinese_text:
                continue
            
            # Initialize segment
            item = TranscriptionItem(
                id=i,
                start_time=segment["start"],
                end_time=segment["end"],
                chinese=chinese_text,
                confidence=segment.get("avg_logprob", 0.0)
            )
            
            # Add romanization if requested
            if options.include_yale or options.include_jyutping:
                romanization = await romanization_service.romanize(
                    chinese_text,
                    include_yale=options.include_yale,
                    include_jyutping=options.include_jyutping
                )
                item.yale = romanization.get("yale") if options.include_yale else None
                item.jyutping = romanization.get("jyutping") if options.include_jyutping else None
            
            # Add translation if requested
            if options.include_english:
                translation = await translation_service.translate(
                    chinese_text, 
                    target_language="en"
                )
                item.english = translation
            
            segments.append(item)
        
        return segments
    
    def _calculate_processing_time(self, job: TranscriptionJob) -> float:
        """Calculate processing time in seconds."""
        if job.started_at and job.completed_at:
            start = datetime.fromisoformat(job.started_at)
            end = datetime.fromisoformat(job.completed_at)
            return (end - start).total_seconds()
        return 0.0
    
    def _calculate_cost(self, duration_seconds: float) -> float:
        """Calculate processing cost based on duration."""
        from core.config import get_settings
        settings = get_settings()
        
        duration_minutes = duration_seconds / 60
        return duration_minutes * settings.whisper_cost_per_minute
    
    async def _save_job_result(self, job: TranscriptionJob) -> None:
        """Save job result to file."""
        result_data = {
            "job_id": job.job_id,
            "result": job.result.dict() if job.result else None,
            "metadata": {
                "user_id": job.user_id,
                "created_at": job.created_at,
                "completed_at": job.completed_at,
                "cost": job.cost,
                "duration": job.duration
            }
        }
        
        await file_manager.save_processed_file(
            content=result_data,
            file_id=job.job_id,
            user_id=job.user_id,
            file_type="transcription",
            extension=".json"
        )
    
    async def get_job_status(self, job_id: str, user_id: str) -> Optional[TranscriptionJob]:
        """Get job status and results."""
        job = self.jobs.get(job_id)
        
        if not job or job.user_id != user_id:
            return None
        
        return job
    
    async def list_user_jobs(
        self, 
        user_id: str, 
        limit: int = 10, 
        offset: int = 0
    ) -> List[TranscriptionJob]:
        """List user's transcription jobs."""
        user_jobs = [
            job for job in self.jobs.values() 
            if job.user_id == user_id
        ]
        
        # Sort by creation time (newest first)
        user_jobs.sort(key=lambda x: x.created_at, reverse=True)
        
        return user_jobs[offset:offset + limit]
    
    async def cancel_job(self, job_id: str, user_id: str) -> bool:
        """Cancel a transcription job."""
        job = self.jobs.get(job_id)
        
        if not job or job.user_id != user_id:
            return False
        
        if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
            return False
        
        # Cancel active task if running
        if job_id in self.active_jobs:
            task = self.active_jobs[job_id]
            task.cancel()
            del self.active_jobs[job_id]
        
        job.status = JobStatus.CANCELLED
        job.completed_at = datetime.utcnow().isoformat()
        
        logger.info(f"Cancelled transcription job: {job_id}")
        return True
    
    async def export_transcription(
        self,
        job_id: str,
        user_id: str,
        format: ExportFormat,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Export transcription in specified format."""
        job = await self.get_job_status(job_id, user_id)
        
        if not job or job.status != JobStatus.COMPLETED or not job.result:
            raise ProcessingError("Job not found or not completed")
        
        # Generate export file
        export_data = await export_service.export_transcription(
            transcription_result=job.result,
            format=format,
            job_id=job_id,
            user_id=user_id,
            options=options or {}
        )
        
        return export_data
    
    async def get_export_file(
        self,
        job_id: str,
        user_id: str,
        format: str
    ) -> Optional[Path]:
        """Get path to exported file."""
        return await export_service.get_export_file_path(job_id, user_id, format)


# Global service instance
transcription_service = TranscriptionService()
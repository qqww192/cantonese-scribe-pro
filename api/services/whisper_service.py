"""
OpenAI Whisper API service for speech-to-text transcription.
"""

import asyncio
import aiohttp
from pathlib import Path
from typing import Dict, Any, Optional
import json

from core.config import get_settings
from core.logging import get_logger
from core.exceptions import ExternalAPIError, ProcessingError
from services.retry_service import with_api_retry

logger = get_logger(__name__)


class WhisperService:
    """Service for OpenAI Whisper API transcription."""
    
    def __init__(self):
        self.settings = get_settings()
        self.api_url = "https://api.openai.com/v1/audio/transcriptions"
        self.max_file_size = 25 * 1024 * 1024  # 25MB limit for Whisper API
    
    @with_api_retry("whisper", max_attempts=3)
    async def transcribe(
        self,
        audio_path: Path,
        language: str = "zh",
        response_format: str = "verbose_json"
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using OpenAI Whisper API.
        
        Args:
            audio_path: Path to audio file
            language: Language code (zh for Chinese)
            response_format: Response format (verbose_json for timestamps)
            
        Returns:
            Transcription result with segments and metadata
        """
        try:
            if not self.settings.openai_api_key:
                raise ProcessingError("OpenAI API key not configured")
            
            # Check file size
            file_size = audio_path.stat().st_size
            if file_size > self.max_file_size:
                raise ProcessingError(f"Audio file too large: {file_size} bytes (max: {self.max_file_size})")
            
            logger.info(f"Starting Whisper transcription for: {audio_path}")
            
            # Prepare the request
            headers = {
                "Authorization": f"Bearer {self.settings.openai_api_key}"
            }
            
            # Prepare form data
            data = aiohttp.FormData()
            data.add_field('file', 
                          open(audio_path, 'rb'),
                          filename=audio_path.name,
                          content_type='audio/mpeg')
            data.add_field('model', 'whisper-1')
            data.add_field('language', language)
            data.add_field('response_format', response_format)
            data.add_field('timestamp_granularities[]', 'segment')
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=1800)  # 30 minutes timeout
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Whisper API error {response.status}: {error_text}")
                        raise ExternalAPIError(
                            f"Whisper API error: {error_text}",
                            service="whisper"
                        )
                    
                    result = await response.json()
            
            # Process and validate result
            if not result.get("text"):
                logger.warning("Empty transcription result")
                return {"text": "", "segments": [], "language": language}
            
            # Ensure segments exist
            if "segments" not in result:
                # Create a single segment if segments are missing
                result["segments"] = [{
                    "id": 0,
                    "start": 0.0,
                    "end": result.get("duration", 0.0),
                    "text": result["text"],
                    "avg_logprob": -1.0
                }]
            
            logger.info(f"Whisper transcription completed: {len(result.get('segments', []))} segments")
            return result
            
        except ExternalAPIError:
            raise
        except Exception as e:
            logger.error(f"Error in Whisper transcription: {str(e)}")
            raise ProcessingError(f"Transcription failed: {str(e)}")
    
    async def transcribe_with_cost_tracking(
        self,
        audio_path: Path,
        language: str = "zh"
    ) -> Dict[str, Any]:
        """
        Transcribe with cost tracking and monitoring.
        
        Args:
            audio_path: Path to audio file
            language: Language code
            
        Returns:
            Transcription result with cost information
        """
        try:
            # Get audio duration for cost calculation
            from services.audio_service import audio_service
            metadata = await audio_service.get_audio_metadata(audio_path)
            duration_minutes = metadata.get("duration", 0) / 60
            
            # Calculate estimated cost
            estimated_cost = duration_minutes * self.settings.whisper_cost_per_minute
            
            logger.info(f"Transcription cost estimate: ${estimated_cost:.4f} for {duration_minutes:.2f} minutes")
            
            # Check daily cost limits (simplified implementation)
            # In production, this would check against a real cost tracking system
            if estimated_cost > self.settings.max_daily_cost:
                raise ProcessingError(f"Cost limit exceeded: ${estimated_cost:.4f}")
            
            # Perform transcription
            result = await self.transcribe(audio_path, language)
            
            # Add cost information to result
            result["cost_info"] = {
                "duration_minutes": duration_minutes,
                "cost_per_minute": self.settings.whisper_cost_per_minute,
                "total_cost": estimated_cost
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in cost-tracked transcription: {str(e)}")
            raise
    
    async def validate_api_key(self) -> bool:
        """
        Validate that the OpenAI API key is working.
        
        Returns:
            True if API key is valid, False otherwise
        """
        try:
            if not self.settings.openai_api_key:
                return False
            
            headers = {
                "Authorization": f"Bearer {self.settings.openai_api_key}"
            }
            
            # Test with a minimal request to models endpoint
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.openai.com/v1/models",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False
    
    async def estimate_cost(self, duration_seconds: float) -> Dict[str, float]:
        """
        Estimate transcription cost for given duration.
        
        Args:
            duration_seconds: Audio duration in seconds
            
        Returns:
            Cost estimation details
        """
        duration_minutes = duration_seconds / 60
        total_cost = duration_minutes * self.settings.whisper_cost_per_minute
        
        return {
            "duration_minutes": duration_minutes,
            "cost_per_minute": self.settings.whisper_cost_per_minute,
            "total_cost": total_cost,
            "currency": "USD"
        }


# Global service instance
whisper_service = WhisperService()
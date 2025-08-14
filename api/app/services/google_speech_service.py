"""
Google Cloud Speech-to-Text service for CantoneseScribe.

This service handles audio transcription using Google Cloud Speech-to-Text API
with optimized settings for Cantonese language recognition.
"""

import asyncio
import logging
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from datetime import datetime

import aiofiles
from google.cloud import speech
from google.oauth2 import service_account
from google.api_core import exceptions as google_exceptions

from ..core.config import get_settings
from ..core.exceptions import ExternalAPIError, ProcessingError, ValidationError
from ..services.database_service import DatabaseService
from ..services.retry_service import with_api_retry, RetryConfig, CircuitBreakerConfig

logger = logging.getLogger(__name__)


class GoogleSpeechService:
    """Google Cloud Speech-to-Text service for Cantonese transcription."""
    
    def __init__(self):
        self._client: Optional[speech.SpeechClient] = None
        self._settings = get_settings()
        self._credentials = None
    
    async def initialize(self) -> None:
        """Initialize Google Cloud Speech client."""
        try:
            # Set up authentication
            await self._setup_authentication()
            
            # Initialize client
            if self._credentials:
                self._client = speech.SpeechClient(credentials=self._credentials)
            else:
                # Use default credentials (service account key from environment)
                self._client = speech.SpeechClient()
            
            logger.info("Google Speech service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Speech service: {str(e)}")
            raise ExternalAPIError(f"Google Speech initialization failed: {str(e)}", "google_speech")
    
    async def _setup_authentication(self) -> None:
        """Set up Google Cloud authentication."""
        try:
            # Check for service account key file
            if self._settings.google_application_credentials:
                if os.path.exists(self._settings.google_application_credentials):
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self._settings.google_application_credentials
                    logger.info("Using Google Cloud credentials from file")
                    return
            
            # Check for JSON credentials in environment variable
            if self._settings.google_cloud_credentials:
                try:
                    # Parse JSON credentials
                    creds_data = json.loads(self._settings.google_cloud_credentials)
                    self._credentials = service_account.Credentials.from_service_account_info(creds_data)
                    logger.info("Using Google Cloud credentials from environment variable")
                    return
                except json.JSONDecodeError:
                    logger.error("Invalid JSON in google_cloud_credentials")
            
            # If no explicit credentials, try default
            logger.info("Using default Google Cloud credentials")
            
        except Exception as e:
            logger.error(f"Error setting up Google Cloud authentication: {str(e)}")
            raise
    
    @property
    def client(self) -> speech.SpeechClient:
        """Get Speech client."""
        if not self._client:
            raise ExternalAPIError("Google Speech client not initialized")
        return self._client
    
    async def transcribe_audio(
        self,
        audio_file_path: Path,
        language_code: str = "yue-Hant-HK",  # Cantonese (Traditional Chinese, Hong Kong)
        sample_rate: Optional[int] = None,
        encoding: Optional[speech.RecognitionConfig.AudioEncoding] = None,
        enable_automatic_punctuation: bool = True,
        enable_speaker_diarization: bool = False,
        max_speakers: int = 2,
        model: str = "latest_long"
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using Google Cloud Speech-to-Text.
        
        Args:
            audio_file_path: Path to the audio file
            language_code: Language code (default: Cantonese Hong Kong)
            sample_rate: Audio sample rate (auto-detected if None)
            encoding: Audio encoding (auto-detected if None)
            enable_automatic_punctuation: Enable automatic punctuation
            enable_speaker_diarization: Enable speaker identification
            max_speakers: Maximum number of speakers for diarization
            model: Recognition model to use
        
        Returns:
            Dict containing transcription results
        """
        try:
            if not audio_file_path.exists():
                raise ValidationError(f"Audio file not found: {audio_file_path}")
            
            start_time = datetime.utcnow()
            
            # Read audio file
            async with aiofiles.open(audio_file_path, "rb") as audio_file:
                audio_content = await audio_file.read()
            
            # Auto-detect encoding if not provided
            if encoding is None:
                encoding = self._detect_audio_encoding(audio_file_path)
            
            # Create audio object
            audio = speech.RecognitionAudio(content=audio_content)
            
            # Configure recognition settings
            config = speech.RecognitionConfig(
                encoding=encoding,
                sample_rate_hertz=sample_rate,
                language_code=language_code,
                enable_automatic_punctuation=enable_automatic_punctuation,
                model=model,
                use_enhanced=True,  # Use enhanced models for better accuracy
                alternative_language_codes=["zh-HK", "zh-TW", "en-US"],  # Fallback languages
                max_alternatives=1,
                profanity_filter=False,
                enable_word_time_offsets=True,
                enable_word_confidence=True
            )
            
            # Add speaker diarization if requested
            if enable_speaker_diarization:
                config.diarization_config = speech.SpeakerDiarizationConfig(
                    enable_speaker_diarization=True,
                    max_speaker_count=max_speakers,
                )
            
            # Choose appropriate recognition method based on file size
            file_size = len(audio_content)
            
            if file_size > 10 * 1024 * 1024:  # 10MB threshold for long-running recognition
                logger.info(f"Using long-running recognition for large file: {file_size} bytes")
                response = await self._long_running_recognize(audio, config)
            else:
                logger.info(f"Using standard recognition for file: {file_size} bytes")
                response = await self._recognize(audio, config)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Process results
            result = await self._process_recognition_response(
                response, 
                processing_time,
                str(audio_file_path)
            )
            
            logger.info(f"Transcription completed: {len(result['segments'])} segments in {processing_time:.2f}s")
            return result
            
        except google_exceptions.GoogleAPICallError as e:
            logger.error(f"Google Speech API error: {str(e)}")
            raise ExternalAPIError(f"Speech recognition failed: {str(e)}", "google_speech")
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            raise ProcessingError(f"Audio transcription failed: {str(e)}")
    
    @with_api_retry("google_speech", max_attempts=3)
    async def _recognize(self, audio: speech.RecognitionAudio, config: speech.RecognitionConfig) -> speech.RecognizeResponse:
        """Perform standard recognition (synchronous)."""
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                self.client.recognize, 
                config, 
                audio
            )
            return response
        except Exception as e:
            logger.error(f"Standard recognition error: {str(e)}")
            raise
    
    @with_api_retry("google_speech_long", max_attempts=2)
    async def _long_running_recognize(self, audio: speech.RecognitionAudio, config: speech.RecognitionConfig) -> speech.RecognizeResponse:
        """Perform long-running recognition (asynchronous)."""
        try:
            # Start long-running operation
            loop = asyncio.get_event_loop()
            operation = await loop.run_in_executor(
                None,
                self.client.long_running_recognize,
                config,
                audio
            )
            
            logger.info(f"Started long-running recognition operation: {operation.name}")
            
            # Poll for completion
            while True:
                await asyncio.sleep(5)  # Check every 5 seconds
                
                operation = await loop.run_in_executor(
                    None,
                    operation.result,
                    0  # Don't block
                )
                
                if operation.done():
                    logger.info("Long-running recognition completed")
                    return operation.result()
                
                logger.debug("Long-running recognition still in progress...")
                
        except Exception as e:
            logger.error(f"Long-running recognition error: {str(e)}")
            raise
    
    def _detect_audio_encoding(self, audio_file_path: Path) -> speech.RecognitionConfig.AudioEncoding:
        """Auto-detect audio file encoding."""
        suffix = audio_file_path.suffix.lower()
        
        encoding_map = {
            '.wav': speech.RecognitionConfig.AudioEncoding.LINEAR16,
            '.flac': speech.RecognitionConfig.AudioEncoding.FLAC,
            '.mp3': speech.RecognitionConfig.AudioEncoding.MP3,
            '.m4a': speech.RecognitionConfig.AudioEncoding.MP3,
            '.aac': speech.RecognitionConfig.AudioEncoding.MP3,
            '.ogg': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            '.opus': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            '.webm': speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        }
        
        return encoding_map.get(suffix, speech.RecognitionConfig.AudioEncoding.LINEAR16)
    
    async def _process_recognition_response(
        self, 
        response: speech.RecognizeResponse, 
        processing_time: float,
        audio_file_path: str
    ) -> Dict[str, Any]:
        """Process Google Speech recognition response."""
        try:
            segments = []
            
            for i, result in enumerate(response.results):
                alternative = result.alternatives[0]  # Take best alternative
                
                # Extract timing information
                words = alternative.words if hasattr(alternative, 'words') else []
                
                if words:
                    # Use word-level timing
                    start_time = float(words[0].start_time.total_seconds())
                    end_time = float(words[-1].end_time.total_seconds())
                else:
                    # Estimate timing based on segment index
                    estimated_duration = processing_time * 0.8  # Rough estimate
                    segment_duration = estimated_duration / max(len(response.results), 1)
                    start_time = i * segment_duration
                    end_time = (i + 1) * segment_duration
                
                # Extract confidence score
                confidence = float(alternative.confidence) if hasattr(alternative, 'confidence') else 0.0
                
                # Create segment
                segment = {
                    'id': i,
                    'start': start_time,
                    'end': end_time,
                    'text': alternative.transcript.strip(),
                    'confidence': confidence,
                    'words': []
                }
                
                # Add word-level information if available
                if words:
                    for word in words:
                        segment['words'].append({
                            'word': word.word,
                            'start': float(word.start_time.total_seconds()),
                            'end': float(word.end_time.total_seconds()),
                            'confidence': float(getattr(word, 'confidence', 0.0))
                        })
                
                # Add speaker information if available
                if hasattr(result, 'channel_tag'):
                    segment['speaker'] = f"Speaker {result.channel_tag}"
                
                segments.append(segment)
            
            # Calculate total duration
            total_duration = max([seg['end'] for seg in segments]) if segments else 0.0
            
            return {
                'segments': segments,
                'metadata': {
                    'service': 'google_speech',
                    'model': 'latest_long',
                    'language': 'yue-Hant-HK',
                    'processing_time': processing_time,
                    'audio_duration': total_duration,
                    'audio_file': audio_file_path,
                    'timestamp': datetime.utcnow().isoformat()
                },
                'statistics': {
                    'total_segments': len(segments),
                    'average_confidence': sum(seg['confidence'] for seg in segments) / len(segments) if segments else 0.0,
                    'total_words': sum(len(seg['words']) for seg in segments),
                    'total_characters': sum(len(seg['text']) for seg in segments)
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing recognition response: {str(e)}")
            raise ProcessingError(f"Failed to process recognition results: {str(e)}")
    
    async def get_supported_languages(self) -> List[str]:
        """Get list of supported languages."""
        return [
            "yue-Hant-HK",  # Cantonese (Traditional Chinese, Hong Kong)
            "zh-HK",        # Chinese (Hong Kong)
            "zh-TW",        # Chinese (Taiwan)
            "zh-CN",        # Chinese (Simplified)
            "en-US",        # English (US)
            "en-GB",        # English (UK)
        ]
    
    async def estimate_cost(self, audio_duration_seconds: float) -> float:
        """Estimate transcription cost based on audio duration."""
        # Google Cloud Speech-to-Text pricing (as of 2024)
        # Standard model: $0.024 per minute (first 60 minutes/month free)
        # Enhanced model: $0.048 per minute
        duration_minutes = audio_duration_seconds / 60
        cost_per_minute = 0.048  # Enhanced model pricing
        return duration_minutes * cost_per_minute
    
    async def health_check(self) -> bool:
        """Check service health."""
        try:
            if not self._client:
                return False
            
            # Try a minimal recognition request
            test_audio = speech.RecognitionAudio(content=b'')  # Empty audio for test
            test_config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code="en-US"
            )
            
            # This should fail gracefully, but confirms the API is accessible
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.client.recognize,
                    test_config,
                    test_audio
                )
            except google_exceptions.InvalidArgument:
                # Expected error for empty audio - API is working
                return True
            except google_exceptions.Unauthenticated:
                # Authentication issue
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Google Speech health check failed: {str(e)}")
            return False


# Global service instance
google_speech_service = GoogleSpeechService()


# Initialize function
async def init_google_speech_service() -> None:
    """Initialize Google Speech service."""
    await google_speech_service.initialize()


# Dependency function for FastAPI
async def get_google_speech_service() -> GoogleSpeechService:
    """Dependency to get Google Speech service."""
    if not google_speech_service._client:
        await google_speech_service.initialize()
    return google_speech_service
"""
Unified transcription service that intelligently chooses between
Google Cloud Speech-to-Text and OpenAI Whisper based on cost, accuracy, and availability.
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

from core.config import get_settings
from core.exceptions import ProcessingError, ExternalAPIError
from services.google_speech_service import GoogleSpeechService, google_speech_service
from services.whisper_service import WhisperService, whisper_service
from services.database_service import DatabaseService

logger = logging.getLogger(__name__)


class TranscriptionProvider(str, Enum):
    """Available transcription providers."""
    GOOGLE_SPEECH = "google_speech"
    WHISPER = "whisper"
    AUTO = "auto"


class ProviderStatus(str, Enum):
    """Provider availability status."""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    ERROR = "error"


class UnifiedTranscriptionService:
    """
    Unified service that intelligently routes transcription requests
    to the best available provider.
    """
    
    def __init__(self):
        self._settings = get_settings()
        self._provider_status: Dict[str, ProviderStatus] = {}
        self._last_health_check = {}
        self._health_check_interval = 300  # 5 minutes
    
    async def initialize(self) -> None:
        """Initialize all transcription providers."""
        try:
            # Initialize Google Speech service
            try:
                await google_speech_service.initialize()
                self._provider_status[TranscriptionProvider.GOOGLE_SPEECH] = ProviderStatus.AVAILABLE
                logger.info("Google Speech service initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Google Speech: {str(e)}")
                self._provider_status[TranscriptionProvider.GOOGLE_SPEECH] = ProviderStatus.ERROR
            
            # Whisper service doesn't need explicit initialization
            self._provider_status[TranscriptionProvider.WHISPER] = ProviderStatus.AVAILABLE
            
            # Perform initial health checks
            await self._check_provider_health()
            
            logger.info("Unified transcription service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize unified transcription service: {str(e)}")
            raise
    
    async def transcribe(
        self,
        audio_file_path: Path,
        language_code: str = "yue-Hant-HK",
        provider: TranscriptionProvider = TranscriptionProvider.AUTO,
        user_id: Optional[str] = None,
        job_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Transcribe audio using the best available provider.
        
        Args:
            audio_file_path: Path to audio file
            language_code: Language code for transcription
            provider: Preferred provider (AUTO for intelligent routing)
            user_id: User ID for cost tracking
            job_id: Job ID for logging
            **kwargs: Additional provider-specific options
            
        Returns:
            Unified transcription result
        """
        try:
            start_time = datetime.utcnow()
            
            # Choose provider
            if provider == TranscriptionProvider.AUTO:
                chosen_provider = await self._choose_best_provider(
                    audio_file_path, language_code, user_id
                )
            else:
                chosen_provider = provider
            
            logger.info(f"Using {chosen_provider} for transcription of {audio_file_path.name}")
            
            # Perform transcription with chosen provider
            try:
                if chosen_provider == TranscriptionProvider.GOOGLE_SPEECH:
                    result = await self._transcribe_with_google_speech(
                        audio_file_path, language_code, **kwargs
                    )
                elif chosen_provider == TranscriptionProvider.WHISPER:
                    result = await self._transcribe_with_whisper(
                        audio_file_path, language_code, **kwargs
                    )
                else:
                    raise ProcessingError(f"Unknown provider: {chosen_provider}")
                
                # Add unified metadata
                processing_time = (datetime.utcnow() - start_time).total_seconds()
                result = await self._unify_transcription_result(
                    result, chosen_provider, processing_time, audio_file_path
                )
                
                # Log usage if database service is available
                if user_id and job_id:
                    await self._log_transcription_usage(
                        user_id, job_id, chosen_provider, result
                    )
                
                return result
                
            except Exception as e:
                # Try fallback provider if primary fails
                if provider == TranscriptionProvider.AUTO and chosen_provider != TranscriptionProvider.WHISPER:
                    logger.warning(f"Primary provider {chosen_provider} failed, trying Whisper fallback: {str(e)}")
                    try:
                        result = await self._transcribe_with_whisper(
                            audio_file_path, language_code, **kwargs
                        )
                        processing_time = (datetime.utcnow() - start_time).total_seconds()
                        result = await self._unify_transcription_result(
                            result, TranscriptionProvider.WHISPER, processing_time, audio_file_path
                        )
                        return result
                    except Exception as fallback_e:
                        logger.error(f"Fallback provider also failed: {str(fallback_e)}")
                        raise ProcessingError(f"All transcription providers failed. Primary: {str(e)}, Fallback: {str(fallback_e)}")
                else:
                    raise
                
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise ProcessingError(f"Transcription failed: {str(e)}")
    
    async def _choose_best_provider(
        self, 
        audio_file_path: Path, 
        language_code: str, 
        user_id: Optional[str]
    ) -> TranscriptionProvider:
        """
        Intelligently choose the best transcription provider based on:
        - Provider availability
        - Cost considerations
        - File characteristics
        - Language support
        """
        try:
            await self._check_provider_health()
            
            file_size = audio_file_path.stat().st_size
            
            # Get audio duration for cost estimation
            from services.audio_service import audio_service
            try:
                metadata = await audio_service.get_audio_metadata(audio_file_path)
                duration = metadata.get("duration", 0)
            except:
                # Estimate duration based on file size (rough approximation)
                duration = file_size / (16000 * 2)  # Assuming 16kHz 16-bit audio
            
            # Cost estimates
            google_cost = await self._estimate_google_cost(duration)
            whisper_cost = await self._estimate_whisper_cost(duration)
            
            logger.info(f"Cost comparison - Google: ${google_cost:.4f}, Whisper: ${whisper_cost:.4f}")
            
            # Decision logic
            
            # 1. If Google Speech is unavailable, use Whisper
            if self._provider_status.get(TranscriptionProvider.GOOGLE_SPEECH) != ProviderStatus.AVAILABLE:
                logger.info("Google Speech unavailable, using Whisper")
                return TranscriptionProvider.WHISPER
            
            # 2. For Cantonese/Chinese, prefer Google Speech for better accuracy
            if language_code.startswith(("yue", "zh")):
                logger.info("Using Google Speech for Cantonese/Chinese content")
                return TranscriptionProvider.GOOGLE_SPEECH
            
            # 3. For large files (>25MB), use Google Speech (Whisper has size limits)
            if file_size > 25 * 1024 * 1024:
                logger.info("Using Google Speech for large file")
                return TranscriptionProvider.GOOGLE_SPEECH
            
            # 4. For very short files (<30 seconds), use Whisper (faster setup)
            if duration < 30:
                logger.info("Using Whisper for short audio")
                return TranscriptionProvider.WHISPER
            
            # 5. Cost optimization for longer files
            if duration > 300:  # 5 minutes
                if whisper_cost < google_cost * 0.8:  # Use Whisper if significantly cheaper
                    logger.info("Using Whisper for cost optimization")
                    return TranscriptionProvider.WHISPER
            
            # 6. Default to Google Speech for quality
            logger.info("Using Google Speech as default choice")
            return TranscriptionProvider.GOOGLE_SPEECH
            
        except Exception as e:
            logger.error(f"Error choosing provider: {str(e)}")
            # Fallback to Whisper if decision logic fails
            return TranscriptionProvider.WHISPER
    
    async def _transcribe_with_google_speech(
        self, 
        audio_file_path: Path, 
        language_code: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Transcribe using Google Cloud Speech-to-Text."""
        return await google_speech_service.transcribe_audio(
            audio_file_path=audio_file_path,
            language_code=language_code,
            **kwargs
        )
    
    async def _transcribe_with_whisper(
        self, 
        audio_file_path: Path, 
        language_code: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Transcribe using OpenAI Whisper."""
        # Map language codes for Whisper
        whisper_lang = self._map_language_for_whisper(language_code)
        
        result = await whisper_service.transcribe_with_cost_tracking(
            audio_path=audio_file_path,
            language=whisper_lang
        )
        
        # Convert Whisper result to unified format
        return {
            'segments': result.get('segments', []),
            'metadata': {
                'service': 'whisper',
                'model': 'whisper-1',
                'language': language_code,
                'original_language': whisper_lang,
                'cost_info': result.get('cost_info', {})
            },
            'text': result.get('text', ''),
            'duration': result.get('duration', 0)
        }
    
    def _map_language_for_whisper(self, language_code: str) -> str:
        """Map unified language codes to Whisper language codes."""
        mapping = {
            "yue-Hant-HK": "zh",
            "zh-HK": "zh", 
            "zh-TW": "zh",
            "zh-CN": "zh",
            "en-US": "en",
            "en-GB": "en"
        }
        return mapping.get(language_code, "zh")
    
    async def _unify_transcription_result(
        self, 
        result: Dict[str, Any], 
        provider: str, 
        processing_time: float,
        audio_file_path: Path
    ) -> Dict[str, Any]:
        """Convert provider-specific results to unified format."""
        try:
            segments = result.get('segments', [])
            
            # Ensure consistent segment format
            unified_segments = []
            for i, segment in enumerate(segments):
                unified_segment = {
                    'id': segment.get('id', i),
                    'start_time': segment.get('start', segment.get('start_time', 0)),
                    'end_time': segment.get('end', segment.get('end_time', 0)),
                    'text': segment.get('text', ''),
                    'confidence': segment.get('confidence', segment.get('avg_logprob', 0.0))
                }
                
                # Add word-level data if available
                if 'words' in segment:
                    unified_segment['words'] = segment['words']
                
                # Add speaker information if available
                if 'speaker' in segment:
                    unified_segment['speaker'] = segment['speaker']
                
                unified_segments.append(unified_segment)
            
            # Calculate statistics
            total_confidence = sum(seg['confidence'] for seg in unified_segments)
            avg_confidence = total_confidence / len(unified_segments) if unified_segments else 0.0
            
            # Get cost information
            cost_info = result.get('metadata', {}).get('cost_info', {})
            if not cost_info and provider == TranscriptionProvider.GOOGLE_SPEECH:
                duration = max([seg['end_time'] for seg in unified_segments]) if unified_segments else 0
                cost_info = {
                    'total_cost': await self._estimate_google_cost(duration),
                    'duration_minutes': duration / 60,
                    'provider': provider
                }
            
            return {
                'segments': unified_segments,
                'metadata': {
                    'provider': provider,
                    'language': result.get('metadata', {}).get('language', 'yue-Hant-HK'),
                    'processing_time': processing_time,
                    'audio_file': str(audio_file_path),
                    'timestamp': datetime.utcnow().isoformat(),
                    'total_segments': len(unified_segments),
                    'cost_info': cost_info
                },
                'statistics': {
                    'total_segments': len(unified_segments),
                    'average_confidence': avg_confidence,
                    'total_characters': sum(len(seg['text']) for seg in unified_segments),
                    'total_words': sum(len(seg.get('words', [])) for seg in unified_segments)
                }
            }
            
        except Exception as e:
            logger.error(f"Error unifying transcription result: {str(e)}")
            # Return minimal result to avoid complete failure
            return {
                'segments': result.get('segments', []),
                'metadata': {
                    'provider': provider,
                    'processing_time': processing_time,
                    'error': f"Result unification failed: {str(e)}"
                },
                'statistics': {'total_segments': 0}
            }
    
    async def _check_provider_health(self) -> None:
        """Check health of all providers."""
        current_time = datetime.utcnow()
        
        for provider in [TranscriptionProvider.GOOGLE_SPEECH, TranscriptionProvider.WHISPER]:
            last_check = self._last_health_check.get(provider)
            
            # Skip if recently checked
            if last_check and (current_time - last_check).total_seconds() < self._health_check_interval:
                continue
            
            try:
                if provider == TranscriptionProvider.GOOGLE_SPEECH:
                    is_healthy = await google_speech_service.health_check()
                elif provider == TranscriptionProvider.WHISPER:
                    is_healthy = await whisper_service.validate_api_key()
                else:
                    is_healthy = False
                
                self._provider_status[provider] = (
                    ProviderStatus.AVAILABLE if is_healthy else ProviderStatus.ERROR
                )
                self._last_health_check[provider] = current_time
                
                logger.debug(f"Provider {provider} health: {self._provider_status[provider]}")
                
            except Exception as e:
                logger.error(f"Health check failed for {provider}: {str(e)}")
                self._provider_status[provider] = ProviderStatus.ERROR
                self._last_health_check[provider] = current_time
    
    async def _estimate_google_cost(self, duration_seconds: float) -> float:
        """Estimate Google Cloud Speech cost."""
        return await google_speech_service.estimate_cost(duration_seconds)
    
    async def _estimate_whisper_cost(self, duration_seconds: float) -> float:
        """Estimate Whisper API cost."""
        cost_info = await whisper_service.estimate_cost(duration_seconds)
        return cost_info['total_cost']
    
    async def _log_transcription_usage(
        self, 
        user_id: str, 
        job_id: str, 
        provider: str, 
        result: Dict[str, Any]
    ) -> None:
        """Log transcription usage for cost tracking."""
        try:
            from services.database_service import database_service
            
            cost_info = result.get('metadata', {}).get('cost_info', {})
            
            usage_data = {
                'user_id': user_id,
                'job_id': job_id,
                'action': 'transcription',
                'service': provider,
                'cost': cost_info.get('total_cost', 0.0),
                'duration': result.get('metadata', {}).get('processing_time', 0),
                'metadata': {
                    'segments_count': len(result.get('segments', [])),
                    'average_confidence': result.get('statistics', {}).get('average_confidence', 0),
                    'provider': provider,
                    'language': result.get('metadata', {}).get('language')
                }
            }
            
            await database_service.log_usage(usage_data)
            
        except Exception as e:
            logger.error(f"Failed to log usage: {str(e)}")
            # Don't fail the transcription for logging errors
    
    async def get_provider_status(self) -> Dict[str, Any]:
        """Get current status of all providers."""
        await self._check_provider_health()
        return {
            'providers': {
                provider: {
                    'status': status,
                    'last_checked': self._last_health_check.get(provider, 'Never')
                }
                for provider, status in self._provider_status.items()
            },
            'default_provider': TranscriptionProvider.AUTO,
            'health_check_interval': self._health_check_interval
        }
    
    async def estimate_costs(self, duration_seconds: float) -> Dict[str, float]:
        """Get cost estimates from all providers."""
        return {
            'google_speech': await self._estimate_google_cost(duration_seconds),
            'whisper': await self._estimate_whisper_cost(duration_seconds),
            'duration_minutes': duration_seconds / 60
        }


# Global service instance
unified_transcription_service = UnifiedTranscriptionService()


# Initialize function
async def init_unified_transcription_service() -> None:
    """Initialize unified transcription service."""
    await unified_transcription_service.initialize()


# Dependency function for FastAPI
async def get_unified_transcription_service() -> UnifiedTranscriptionService:
    """Dependency to get unified transcription service."""
    return unified_transcription_service
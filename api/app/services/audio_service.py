"""
Audio processing service for handling audio/video files and YouTube downloads.
"""

import os
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
import subprocess
import tempfile

from ..core.storage import file_manager
from ..core.config import get_settings
from ..core.logging import get_logger
from ..core.exceptions import ProcessingError

logger = get_logger(__name__)


class AudioService:
    """Service for audio processing operations."""
    
    def __init__(self):
        self.settings = get_settings()
    
    async def download_youtube_audio(self, url: str, user_id: str) -> Path:
        """
        Download audio from YouTube URL.
        
        Args:
            url: YouTube URL
            user_id: User identifier for file organization
            
        Returns:
            Path to downloaded audio file
        """
        try:
            logger.info(f"Downloading YouTube audio: {url}")
            
            # Create temporary directory for download
            temp_dir = Path(self.settings.temp_dir) / user_id
            temp_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate output filename
            output_template = str(temp_dir / "%(title)s.%(ext)s")
            
            # yt-dlp command for audio extraction
            cmd = [
                "yt-dlp",
                "--extract-audio",
                "--audio-format", "mp3",
                "--audio-quality", "192K",
                "--output", output_template,
                "--no-playlist",
                "--prefer-ffmpeg",
                url
            ]
            
            # Run yt-dlp
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode('utf-8') if stderr else "Unknown error"
                logger.error(f"yt-dlp failed: {error_msg}")
                raise ProcessingError(f"Failed to download YouTube audio: {error_msg}")
            
            # Find the downloaded file
            audio_files = list(temp_dir.glob("*.mp3"))
            if not audio_files:
                raise ProcessingError("No audio file found after download")
            
            audio_path = audio_files[0]
            logger.info(f"Downloaded audio file: {audio_path}")
            
            return audio_path
            
        except Exception as e:
            logger.error(f"Error downloading YouTube audio: {str(e)}")
            raise ProcessingError(f"Failed to download YouTube audio: {str(e)}")
    
    async def get_audio_metadata(self, audio_path: Path) -> Dict[str, Any]:
        """
        Extract metadata from audio file using ffprobe.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dictionary with audio metadata
        """
        try:
            cmd = [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                str(audio_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.warning(f"ffprobe failed for {audio_path}: {stderr.decode()}")
                return {"duration": 0, "format": "unknown"}
            
            import json
            metadata = json.loads(stdout.decode())
            
            # Extract relevant information
            format_info = metadata.get("format", {})
            duration = float(format_info.get("duration", 0))
            
            audio_stream = None
            for stream in metadata.get("streams", []):
                if stream.get("codec_type") == "audio":
                    audio_stream = stream
                    break
            
            result = {
                "duration": duration,
                "format": format_info.get("format_name", "unknown"),
                "bitrate": int(format_info.get("bit_rate", 0)),
                "size": int(format_info.get("size", 0))
            }
            
            if audio_stream:
                result.update({
                    "sample_rate": int(audio_stream.get("sample_rate", 0)),
                    "channels": int(audio_stream.get("channels", 0)),
                    "codec": audio_stream.get("codec_name", "unknown")
                })
            
            logger.debug(f"Audio metadata for {audio_path}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting audio metadata: {str(e)}")
            return {"duration": 0, "format": "unknown"}
    
    async def convert_to_wav(self, input_path: Path, output_path: Optional[Path] = None) -> Path:
        """
        Convert audio file to WAV format for better compatibility.
        
        Args:
            input_path: Path to input audio file
            output_path: Optional output path, creates temp file if not provided
            
        Returns:
            Path to converted WAV file
        """
        try:
            if output_path is None:
                # Create temporary WAV file
                fd, temp_path = tempfile.mkstemp(suffix=".wav", dir=self.settings.temp_dir)
                os.close(fd)
                output_path = Path(temp_path)
            
            cmd = [
                "ffmpeg",
                "-i", str(input_path),
                "-ar", "16000",  # 16kHz sample rate for Whisper
                "-ac", "1",      # Mono
                "-c:a", "pcm_s16le",  # 16-bit PCM
                "-y",            # Overwrite output file
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode('utf-8') if stderr else "Unknown error"
                logger.error(f"ffmpeg conversion failed: {error_msg}")
                raise ProcessingError(f"Failed to convert audio: {error_msg}")
            
            logger.debug(f"Converted audio to WAV: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error converting audio: {str(e)}")
            raise ProcessingError(f"Failed to convert audio: {str(e)}")
    
    async def split_audio(self, audio_path: Path, segment_duration: float = 600) -> List[Path]:
        """
        Split large audio files into smaller segments for processing.
        
        Args:
            audio_path: Path to input audio file
            segment_duration: Duration of each segment in seconds (default: 10 minutes)
            
        Returns:
            List of paths to audio segments
        """
        try:
            # Get audio metadata to determine if splitting is needed
            metadata = await self.get_audio_metadata(audio_path)
            duration = metadata.get("duration", 0)
            
            if duration <= segment_duration:
                return [audio_path]
            
            # Create directory for segments
            segments_dir = audio_path.parent / f"{audio_path.stem}_segments"
            segments_dir.mkdir(exist_ok=True)
            
            segments = []
            segment_count = int(duration / segment_duration) + 1
            
            for i in range(segment_count):
                start_time = i * segment_duration
                segment_path = segments_dir / f"segment_{i:03d}.wav"
                
                cmd = [
                    "ffmpeg",
                    "-i", str(audio_path),
                    "-ss", str(start_time),
                    "-t", str(segment_duration),
                    "-ar", "16000",
                    "-ac", "1",
                    "-c:a", "pcm_s16le",
                    "-y",
                    str(segment_path)
                ]
                
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                await process.communicate()
                
                if process.returncode == 0 and segment_path.exists():
                    segments.append(segment_path)
                    logger.debug(f"Created audio segment: {segment_path}")
            
            logger.info(f"Split audio into {len(segments)} segments")
            return segments
            
        except Exception as e:
            logger.error(f"Error splitting audio: {str(e)}")
            raise ProcessingError(f"Failed to split audio: {str(e)}")
    
    async def validate_audio_file(self, file_path: Path) -> bool:
        """
        Validate that the file is a valid audio file.
        
        Args:
            file_path: Path to file to validate
            
        Returns:
            True if file is valid audio, False otherwise
        """
        try:
            metadata = await self.get_audio_metadata(file_path)
            return metadata.get("duration", 0) > 0
        except Exception:
            return False


# Global service instance
audio_service = AudioService()
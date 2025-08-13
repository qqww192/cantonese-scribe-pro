"""
Export service for generating transcription files in various formats.
"""

import json
import csv
from datetime import timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
from io import StringIO

from schemas.transcription import TranscriptionResult, ExportFormat
from core.storage import file_manager
from core.logging import get_logger
from core.exceptions import ProcessingError

logger = get_logger(__name__)


class ExportService:
    """Service for exporting transcription results in various formats."""
    
    def __init__(self):
        pass
    
    async def export_transcription(
        self,
        transcription_result: TranscriptionResult,
        format: ExportFormat,
        job_id: str,
        user_id: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Export transcription in specified format.
        
        Args:
            transcription_result: Transcription result to export
            format: Export format
            job_id: Job ID for file naming
            user_id: User ID for file organization
            options: Export options
            
        Returns:
            Export metadata with download information
        """
        try:
            if options is None:
                options = {}
            
            # Generate content based on format
            content = await self._generate_content(transcription_result, format, options)
            
            # Determine file extension
            extension = f".{format.value}"
            
            # Save the exported file
            file_metadata = await file_manager.save_processed_file(
                content=content,
                file_id=job_id,
                user_id=user_id,
                file_type=f"export_{format.value}",
                extension=extension
            )
            
            logger.info(f"Exported transcription as {format.value}: {file_metadata['filename']}")
            
            return {
                "download_url": f"/api/v1/transcription/download/{job_id}/{format.value}",
                "filename": file_metadata["filename"],
                "file_size": len(content.encode('utf-8')) if isinstance(content, str) else len(content)
            }
            
        except Exception as e:
            logger.error(f"Error exporting transcription: {str(e)}")
            raise ProcessingError(f"Failed to export as {format.value}: {str(e)}")
    
    async def _generate_content(
        self,
        result: TranscriptionResult,
        format: ExportFormat,
        options: Dict[str, Any]
    ) -> str:
        """Generate content for specified format."""
        if format == ExportFormat.SRT:
            return self._generate_srt(result, options)
        elif format == ExportFormat.VTT:
            return self._generate_vtt(result, options)
        elif format == ExportFormat.TXT:
            return self._generate_txt(result, options)
        elif format == ExportFormat.CSV:
            return self._generate_csv(result, options)
        elif format == ExportFormat.JSON:
            return self._generate_json(result, options)
        else:
            raise ProcessingError(f"Unsupported export format: {format}")
    
    def _generate_srt(self, result: TranscriptionResult, options: Dict[str, Any]) -> str:
        """Generate SRT subtitle format."""
        lines = []
        
        for i, item in enumerate(result.items, 1):
            # Format timestamps
            start_time = self._format_srt_timestamp(item.start_time)
            end_time = self._format_srt_timestamp(item.end_time)
            
            # Build subtitle text
            subtitle_lines = []
            subtitle_lines.append(item.chinese)
            
            if options.get("include_romanization", True):
                if item.yale:
                    subtitle_lines.append(f"Yale: {item.yale}")
                if item.jyutping:
                    subtitle_lines.append(f"Jyutping: {item.jyutping}")
            
            if options.get("include_english", True) and item.english:
                subtitle_lines.append(item.english)
            
            # Add SRT entry
            lines.append(str(i))
            lines.append(f"{start_time} --> {end_time}")
            lines.extend(subtitle_lines)
            lines.append("")  # Empty line between entries
        
        return "\n".join(lines)
    
    def _generate_vtt(self, result: TranscriptionResult, options: Dict[str, Any]) -> str:
        """Generate WebVTT subtitle format."""
        lines = ["WEBVTT", ""]
        
        for i, item in enumerate(result.items):
            # Format timestamps
            start_time = self._format_vtt_timestamp(item.start_time)
            end_time = self._format_vtt_timestamp(item.end_time)
            
            # Build subtitle text
            subtitle_lines = []
            subtitle_lines.append(item.chinese)
            
            if options.get("include_romanization", True):
                if item.yale:
                    subtitle_lines.append(f"Yale: {item.yale}")
                if item.jyutping:
                    subtitle_lines.append(f"Jyutping: {item.jyutping}")
            
            if options.get("include_english", True) and item.english:
                subtitle_lines.append(item.english)
            
            # Add VTT entry
            lines.append(f"{start_time} --> {end_time}")
            lines.extend(subtitle_lines)
            lines.append("")  # Empty line between entries
        
        return "\n".join(lines)
    
    def _generate_txt(self, result: TranscriptionResult, options: Dict[str, Any]) -> str:
        """Generate plain text format."""
        lines = []
        include_timestamps = options.get("include_timestamps", False)
        include_speaker = options.get("include_speaker_labels", False)
        
        for item in result.items:
            line_parts = []
            
            # Add timestamp if requested
            if include_timestamps:
                timestamp = self._format_txt_timestamp(item.start_time)
                line_parts.append(f"[{timestamp}]")
            
            # Add speaker if available and requested
            if include_speaker and item.speaker:
                line_parts.append(f"{item.speaker}:")
            
            # Add main text
            line_parts.append(item.chinese)
            
            # Add romanization if requested
            if options.get("include_romanization", True):
                if item.yale:
                    line_parts.append(f"({item.yale})")
                if item.jyutping and not item.yale:
                    line_parts.append(f"({item.jyutping})")
            
            # Add English translation if requested
            if options.get("include_english", True) and item.english:
                line_parts.append(f"- {item.english}")
            
            lines.append(" ".join(line_parts))
        
        return "\n".join(lines)
    
    def _generate_csv(self, result: TranscriptionResult, options: Dict[str, Any]) -> str:
        """Generate CSV format."""
        output = StringIO()
        
        # Determine columns based on available data
        fieldnames = ['id', 'start_time', 'end_time', 'chinese']
        
        if any(item.yale for item in result.items):
            fieldnames.append('yale')
        if any(item.jyutping for item in result.items):
            fieldnames.append('jyutping')
        if any(item.english for item in result.items):
            fieldnames.append('english')
        
        fieldnames.extend(['confidence'])
        
        if any(item.speaker for item in result.items):
            fieldnames.append('speaker')
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for item in result.items:
            row = {
                'id': item.id,
                'start_time': item.start_time,
                'end_time': item.end_time,
                'chinese': item.chinese,
                'confidence': item.confidence
            }
            
            if 'yale' in fieldnames:
                row['yale'] = item.yale or ''
            if 'jyutping' in fieldnames:
                row['jyutping'] = item.jyutping or ''
            if 'english' in fieldnames:
                row['english'] = item.english or ''
            if 'speaker' in fieldnames:
                row['speaker'] = item.speaker or ''
            
            writer.writerow(row)
        
        return output.getvalue()
    
    def _generate_json(self, result: TranscriptionResult, options: Dict[str, Any]) -> str:
        """Generate JSON format."""
        data = {
            "transcription": {
                "items": [item.dict() for item in result.items],
                "metadata": result.metadata,
                "statistics": result.statistics
            },
            "export_options": options,
            "format_version": "1.0"
        }
        
        return json.dumps(data, ensure_ascii=False, indent=2)
    
    def _format_srt_timestamp(self, seconds: float) -> str:
        """Format timestamp for SRT format (HH:MM:SS,mmm)."""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = int((td.total_seconds() - total_seconds) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"
    
    def _format_vtt_timestamp(self, seconds: float) -> str:
        """Format timestamp for VTT format (HH:MM:SS.mmm)."""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = int((td.total_seconds() - total_seconds) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"
    
    def _format_txt_timestamp(self, seconds: float) -> str:
        """Format timestamp for text format (MM:SS)."""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        minutes, seconds = divmod(total_seconds, 60)
        
        return f"{minutes:02d}:{seconds:02d}"
    
    async def get_export_file_path(
        self,
        job_id: str,
        user_id: str,
        format: str
    ) -> Optional[Path]:
        """
        Get path to exported file.
        
        Args:
            job_id: Job ID
            user_id: User ID
            format: Export format
            
        Returns:
            Path to file if it exists, None otherwise
        """
        try:
            # Search for export file in user's processed directory
            user_processed_dir = Path(file_manager.processed_dir) / user_id
            
            if not user_processed_dir.exists():
                return None
            
            # Look for file matching pattern: {job_id}_export_{format}_*.{format}
            pattern = f"{job_id}_export_{format}_*.{format}"
            matching_files = list(user_processed_dir.glob(pattern))
            
            if matching_files:
                # Return the most recent file
                return max(matching_files, key=lambda f: f.stat().st_mtime)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting export file path: {str(e)}")
            return None


# Global service instance
export_service = ExportService()
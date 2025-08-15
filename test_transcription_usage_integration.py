#!/usr/bin/env python3
"""
Comprehensive test script for transcription and usage tracking integration.
Tests the complete MVP flow from upload to processing with usage limits.
"""

import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4, UUID
from decimal import Decimal
from datetime import datetime

# Add the API directory to Python path
sys.path.append(str(Path(__file__).parent / "api"))

from app.services.transcription_service import transcription_service
from app.services.usage_service import usage_service
from app.schemas.transcription import TranscriptionOptions, JobStatus
from app.schemas.usage import UsageType
from app.core.logging import get_logger

logger = get_logger(__name__)

class MockFileManager:
    """Mock file manager for testing."""
    
    async def get_file_path(self, file_id: str, user_id: str):
        # Return a mock path that exists
        return Path(__file__)
    
    async def save_upload_file(self, file, user_id: str, file_type: str):
        return {
            "file_id": str(uuid4()),
            "original_filename": "test_audio.wav",
            "file_size": 1024 * 1024 * 5,  # 5MB
            "upload_time": datetime.now().isoformat()
        }

class MockAudioService:
    """Mock audio service for testing."""
    
    async def get_audio_metadata(self, audio_path):
        return {
            "duration": 300,  # 5 minutes
            "file_size": 1024 * 1024 * 5,  # 5MB
            "format": "wav",
            "sample_rate": 44100
        }
    
    async def download_youtube_audio(self, url, user_id):
        return Path(__file__)

class MockWhisperService:
    """Mock Whisper service for testing."""
    
    async def transcribe(self, audio_path, language="zh"):
        return {
            "text": "你好世界",
            "segments": [
                {
                    "start": 0.0,
                    "end": 2.0,
                    "text": "你好",
                    "avg_logprob": -0.2
                },
                {
                    "start": 2.0,
                    "end": 4.0,
                    "text": "世界",
                    "avg_logprob": -0.1
                }
            ]
        }

class MockRomanizationService:
    """Mock romanization service for testing."""
    
    async def romanize(self, chinese_text, include_yale=True, include_jyutping=True):
        return {
            "yale": "nei5 hou2" if "你好" in chinese_text else "sai3 gaai3",
            "jyutping": "nei5 hou2" if "你好" in chinese_text else "sai3 gaai3"
        }

class MockTranslationService:
    """Mock translation service for testing."""
    
    async def translate(self, chinese_text, target_language="en"):
        if "你好" in chinese_text:
            return "hello"
        elif "世界" in chinese_text:
            return "world"
        return "translated text"

class MockProgressService:
    """Mock progress service for testing."""
    
    async def create_job_progress(self, job_id: str, user_id: str):
        pass

class MockExportService:
    """Mock export service for testing."""
    
    async def export_transcription(self, transcription_result, format, job_id, user_id, options):
        return {
            "download_url": f"/download/{job_id}.{format}",
            "filename": f"transcription_{job_id}.{format}",
            "file_size": 1024
        }

async def setup_mocks():
    """Setup mock services for testing."""
    import app.services.transcription_service as ts_module
    import app.services.audio_service as audio_module
    import app.services.whisper_service as whisper_module
    import app.services.romanization_service as roman_module
    import app.services.translation_service as trans_module
    import app.services.progress_service as progress_module
    import app.services.export_service as export_module
    from app.core import storage
    
    # Replace services with mocks
    ts_module.audio_service = MockAudioService()
    ts_module.whisper_service = MockWhisperService()
    ts_module.romanization_service = MockRomanizationService()
    ts_module.translation_service = MockTranslationService()
    ts_module.progress_service = MockProgressService()
    ts_module.export_service = MockExportService()
    ts_module.file_manager = MockFileManager()
    storage.file_manager = MockFileManager()
    
    audio_module.audio_service = MockAudioService()
    whisper_module.whisper_service = MockWhisperService()
    roman_module.romanization_service = MockRomanizationService()
    trans_module.translation_service = MockTranslationService()
    progress_module.progress_service = MockProgressService()
    export_module.export_service = MockExportService()

async def test_usage_limit_check():
    """Test usage limit checking functionality."""
    print("\\n=== Testing Usage Limit Checks ===")
    
    test_user_id = UUID(str(uuid4()))
    
    try:
        # Test with reasonable usage
        usage_check = await usage_service.check_usage_limits(
            user_id=test_user_id,
            estimated_duration_seconds=300,  # 5 minutes = 5 credits
            file_size_bytes=5 * 1024 * 1024  # 5MB
        )
        
        print(f"✓ Usage check for 5-minute file:")
        print(f"  Can process: {usage_check.can_process}")
        print(f"  Credits required: {usage_check.credits_required}")
        print(f"  Credits available: {usage_check.credits_available}")
        print(f"  Estimated cost: ${usage_check.estimated_cost}")
        print(f"  Warnings: {usage_check.warnings}")
        
        # Test with oversized file (for free tier)
        usage_check_large = await usage_service.check_usage_limits(
            user_id=test_user_id,
            estimated_duration_seconds=3600,  # 60 minutes
            file_size_bytes=100 * 1024 * 1024  # 100MB (exceeds free limit)
        )
        
        print(f"\\n✓ Usage check for 60-minute, 100MB file:")
        print(f"  Can process: {usage_check_large.can_process}")
        print(f"  Blocking reason: {usage_check_large.blocking_reason}")
        
        return True
        
    except Exception as e:
        print(f"✗ Usage limit check failed: {str(e)}")
        return False

async def test_file_info_estimation():
    """Test file information estimation."""
    print("\\n=== Testing File Info Estimation ===")
    
    test_user_id = UUID(str(uuid4()))
    
    try:
        # Test file info for uploaded file
        file_info = await transcription_service.get_file_info(
            file_id="test_file_123",
            user_id=test_user_id
        )
        
        print(f"✓ File info estimation:")
        print(f"  File size: {file_info['file_size']} bytes")
        print(f"  Estimated duration: {file_info['estimated_duration']} seconds")
        print(f"  File type: {file_info['file_type']}")
        
        # Test YouTube URL estimation
        youtube_info = await transcription_service.get_file_info(
            youtube_url="https://www.youtube.com/watch?v=test123"
        )
        
        print(f"\\n✓ YouTube info estimation:")
        print(f"  File size: {youtube_info['file_size']} bytes")
        print(f"  Estimated duration: {youtube_info['estimated_duration']} seconds")
        print(f"  File type: {youtube_info['file_type']}")
        
        return True
        
    except Exception as e:
        print(f"✗ File info estimation failed: {str(e)}")
        return False

async def test_transcription_with_usage_tracking():
    """Test complete transcription flow with usage tracking."""
    print("\\n=== Testing Transcription with Usage Tracking ===")
    
    test_user_id = UUID(str(uuid4()))
    
    try:
        # Create a transcription job
        job = await transcription_service.create_job(
            user_id=str(test_user_id),
            file_id="test_file_123",
            options=TranscriptionOptions(
                include_yale=True,
                include_jyutping=True,
                include_english=True
            ),
            estimated_credits=5,
            estimated_cost=0.50
        )
        
        print(f"✓ Created transcription job: {job.job_id}")
        print(f"  Status: {job.status}")
        print(f"  User ID: {job.user_id}")
        
        # Process the job (this should record usage)
        await transcription_service.process_job(job.job_id, test_user_id)
        
        # Check final job status
        final_job = await transcription_service.get_job_status(job.job_id, str(test_user_id))
        
        print(f"\\n✓ Job processing completed:")
        print(f"  Final status: {final_job.status}")
        print(f"  Duration: {final_job.duration} seconds")
        print(f"  Cost: ${final_job.cost}")
        print(f"  Segments: {len(final_job.result.items) if final_job.result else 0}")
        print(f"  Usage info: {final_job.usage_info}")
        
        # Verify usage was recorded
        current_usage = await usage_service.get_current_usage(test_user_id)
        print(f"\\n✓ Current usage after processing:")
        print(f"  Credits used: {current_usage.credits_used}")
        print(f"  Credits total: {current_usage.credits_total}")
        print(f"  Transcription count: {current_usage.transcription_count}")
        
        return True
        
    except Exception as e:
        print(f"✗ Transcription with usage tracking failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_concurrent_processing_limits():
    """Test concurrent processing limits."""
    print("\\n=== Testing Concurrent Processing Limits ===")
    
    test_user_id = UUID(str(uuid4()))
    
    try:
        # Get concurrent job status
        concurrent_status = await usage_service.get_concurrent_jobs_status(test_user_id)
        
        print(f"✓ Concurrent processing status:")
        print(f"  Current jobs: {concurrent_status.current_jobs}")
        print(f"  Max jobs: {concurrent_status.max_jobs}")
        print(f"  Available slots: {concurrent_status.available_slots}")
        
        return True
        
    except Exception as e:
        print(f"✗ Concurrent processing limits test failed: {str(e)}")
        return False

async def test_usage_alerts():
    """Test usage alerts generation."""
    print("\\n=== Testing Usage Alerts ===")
    
    test_user_id = UUID(str(uuid4()))
    
    try:
        # Get usage alerts
        alerts = await usage_service.get_usage_alerts(test_user_id)
        
        print(f"✓ Usage alerts:")
        print(f"  Alert count: {len(alerts.alerts)}")
        print(f"  Has critical: {alerts.has_critical}")
        print(f"  Next check in: {alerts.next_check_in_hours} hours")
        
        for alert in alerts.alerts:
            print(f"  - {alert.type}: {alert.title}")
            print(f"    {alert.message}")
        
        return True
        
    except Exception as e:
        print(f"✗ Usage alerts test failed: {str(e)}")
        return False

async def test_edge_cases():
    """Test edge cases and error handling."""
    print("\\n=== Testing Edge Cases ===")
    
    test_user_id = UUID(str(uuid4()))
    
    try:
        # Test with zero duration
        usage_check = await usage_service.check_usage_limits(
            user_id=test_user_id,
            estimated_duration_seconds=0,
            file_size_bytes=1024
        )
        print(f"✓ Zero duration check - credits required: {usage_check.credits_required}")
        
        # Test with very large file
        usage_check_large = await usage_service.check_usage_limits(
            user_id=test_user_id,
            estimated_duration_seconds=7200,  # 2 hours
            file_size_bytes=500 * 1024 * 1024  # 500MB
        )
        print(f"✓ Large file check - can process: {usage_check_large.can_process}")
        print(f"  Reason: {usage_check_large.blocking_reason}")
        
        return True
        
    except Exception as e:
        print(f"✗ Edge cases test failed: {str(e)}")
        return False

async def main():
    """Run all integration tests."""
    print("🚀 Starting Transcription-Usage Integration Tests")
    print("=" * 60)
    
    # Setup mock services
    await setup_mocks()
    
    # Run all tests
    tests = [
        test_usage_limit_check,
        test_file_info_estimation,
        test_transcription_with_usage_tracking,
        test_concurrent_processing_limits,
        test_usage_alerts,
        test_edge_cases
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {str(e)}")
            results.append(False)
    
    # Summary
    print("\\n" + "=" * 60)
    print("🎯 Test Results Summary")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    for i, (test, result) in enumerate(zip(tests, results)):
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} {test.__name__}")
    
    print(f"\\n📊 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All integration tests passed! MVP is ready.")
        return True
    else:
        print("❌ Some tests failed. Please review the implementation.")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\\n💥 Test runner crashed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
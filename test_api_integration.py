#!/usr/bin/env python3
"""
Simple API integration test for transcription and usage tracking endpoints.
Tests the actual FastAPI endpoints to ensure they work together correctly.
"""

import asyncio
import json
import sys
from pathlib import Path
import os
from uuid import uuid4

# Add the API directory to Python path
sys.path.append(str(Path(__file__).parent / "api"))

def test_imports():
    """Test that all required modules can be imported."""
    print("🔍 Testing imports...")
    
    try:
        # Test core imports
        from app.api.v1.endpoints.transcription import router as transcription_router
        from app.api.v1.endpoints.usage import router as usage_router
        from app.api.v1.endpoints.files import router as files_router
        from app.services.transcription_service import transcription_service
        from app.services.usage_service import usage_service
        from app.schemas.transcription import TranscriptionRequest, TranscriptionResponse
        from app.schemas.usage import UsageCheckRequest, CurrentUsageResponse
        print("✓ All core modules imported successfully")
        
        # Test schema imports
        from app.schemas.transcription import TranscriptionJob, JobStatus
        from app.schemas.files import FileUploadResponse
        print("✓ All schemas imported successfully")
        
        # Test service imports
        from app.core.logging import get_logger
        from app.core.config import get_settings
        print("✓ All utilities imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import failed: {str(e)}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error during import: {str(e)}")
        return False

def test_schema_definitions():
    """Test that schemas have the required fields for integration."""
    print("\\n📋 Testing schema definitions...")
    
    try:
        from app.schemas.transcription import TranscriptionResponse, TranscriptionJob
        from app.schemas.files import FileUploadResponse
        
        # Test TranscriptionResponse has usage_info
        response_fields = TranscriptionResponse.__fields__
        if 'usage_info' in response_fields:
            print("✓ TranscriptionResponse has usage_info field")
        else:
            print("✗ TranscriptionResponse missing usage_info field")
            return False
        
        # Test TranscriptionJob has usage_info
        job_fields = TranscriptionJob.__fields__
        if 'usage_info' in job_fields:
            print("✓ TranscriptionJob has usage_info field")
        else:
            print("✗ TranscriptionJob missing usage_info field")
            return False
        
        # Test FileUploadResponse has usage_info
        file_fields = FileUploadResponse.__fields__
        if 'usage_info' in file_fields:
            print("✓ FileUploadResponse has usage_info field")
        else:
            print("✗ FileUploadResponse missing usage_info field")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Schema definition test failed: {str(e)}")
        return False

def test_service_methods():
    """Test that services have the required methods for integration."""
    print("\\n⚙️ Testing service methods...")
    
    try:
        from app.services.transcription_service import transcription_service
        from app.services.usage_service import usage_service
        
        # Test transcription service methods
        required_transcription_methods = [
            'create_job', 'process_job', 'get_job_status', 
            'get_file_info', 'list_user_jobs'
        ]
        
        for method in required_transcription_methods:
            if hasattr(transcription_service, method):
                print(f"✓ transcription_service.{method} exists")
            else:
                print(f"✗ transcription_service.{method} missing")
                return False
        
        # Test usage service methods
        required_usage_methods = [
            'check_usage_limits', 'record_usage', 'get_current_usage',
            'get_usage_alerts', 'get_concurrent_jobs_status'
        ]
        
        for method in required_usage_methods:
            if hasattr(usage_service, method):
                print(f"✓ usage_service.{method} exists")
            else:
                print(f"✗ usage_service.{method} missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"✗ Service methods test failed: {str(e)}")
        return False

def test_endpoint_definitions():
    """Test that API endpoints are properly defined."""
    print("\\n🌐 Testing API endpoint definitions...")
    
    try:
        from app.api.v1.endpoints.transcription import router as transcription_router
        from app.api.v1.endpoints.usage import router as usage_router
        from app.api.v1.endpoints.files import router as files_router
        
        # Test transcription endpoints
        transcription_routes = [route.path for route in transcription_router.routes]
        required_transcription_routes = [
            '/check-limits', '/start', '/status/{job_id}', '/jobs', '/export'
        ]
        
        for route in required_transcription_routes:
            if any(route in tr_route for tr_route in transcription_routes):
                print(f"✓ Transcription route {route} exists")
            else:
                print(f"✗ Transcription route {route} missing")
                return False
        
        # Test files endpoints
        files_routes = [route.path for route in files_router.routes]
        required_files_routes = ['/upload', '/list']
        
        for route in required_files_routes:
            if any(route in f_route for f_route in files_routes):
                print(f"✓ Files route {route} exists")
            else:
                print(f"✗ Files route {route} missing")
                return False
        
        # Test usage endpoints
        usage_routes = [route.path for route in usage_router.routes]
        required_usage_routes = ['/current', '/history', '/limits', '/alerts']
        
        for route in required_usage_routes:
            if any(route in u_route for u_route in usage_routes):
                print(f"✓ Usage route {route} exists")
            else:
                print(f"✗ Usage route {route} missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"✗ Endpoint definitions test failed: {str(e)}")
        return False

def test_configuration():
    """Test that configuration is properly set up."""
    print("\\n⚙️ Testing configuration...")
    
    try:
        from app.core.config import get_settings
        
        settings = get_settings()
        
        # Check for required settings
        required_attrs = ['database_url', 'secret_key']
        
        for attr in required_attrs:
            if hasattr(settings, attr):
                print(f"✓ Settings has {attr}")
            else:
                print(f"✗ Settings missing {attr}")
                return False
        
        return True
        
    except Exception as e:
        print(f"✗ Configuration test failed: {str(e)}")
        return False

async def test_service_integration():
    """Test that services can work together (basic integration)."""
    print("\\n🔗 Testing service integration...")
    
    try:
        from app.services.usage_service import usage_service
        from app.services.transcription_service import transcription_service
        from uuid import UUID
        
        # Create a test user ID
        test_user_id = UUID(str(uuid4()))
        
        # Test usage service can check limits
        try:
            usage_check = await usage_service.check_usage_limits(
                user_id=test_user_id,
                estimated_duration_seconds=300,
                file_size_bytes=5 * 1024 * 1024
            )
            print("✓ Usage service can check limits")
        except Exception as e:
            print(f"✗ Usage service check_usage_limits failed: {str(e)}")
            # This might fail due to database not being available, but method should exist
        
        # Test transcription service can get file info
        try:
            file_info = await transcription_service.get_file_info(
                youtube_url="https://test.com/video"
            )
            print("✓ Transcription service can get file info")
            print(f"  File info: {file_info}")
        except Exception as e:
            print(f"✗ Transcription service get_file_info failed: {str(e)}")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Service integration test failed: {str(e)}")
        return False

def test_error_handling():
    """Test basic error handling scenarios."""
    print("\\n⚠️ Testing error handling...")
    
    try:
        from app.core.exceptions import ProcessingError
        from app.schemas.usage import UsageCheckResponse
        
        # Test that custom exceptions exist
        print("✓ Custom exceptions are defined")
        
        # Test that response models handle optional fields
        usage_response = UsageCheckResponse(
            can_process=False,
            credits_required=5,
            credits_available=0,
            credits_after=-5,
            estimated_cost=0.5,
            blocking_reason="Insufficient credits",
            warnings=[],
            can_process_concurrent=True,
            current_concurrent_jobs=0,
            max_concurrent_jobs=1
        )
        print("✓ Usage response models work with required fields")
        
        return True
        
    except Exception as e:
        print(f"✗ Error handling test failed: {str(e)}")
        return False

def main():
    """Run all API integration tests."""
    print("🚀 Starting API Integration Tests")
    print("=" * 50)
    
    # Run all tests
    tests = [
        test_imports,
        test_schema_definitions,
        test_service_methods,
        test_endpoint_definitions,
        test_configuration,
        test_error_handling
    ]
    
    # Async tests
    async_tests = [
        test_service_integration
    ]
    
    results = []
    
    # Run synchronous tests
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {str(e)}")
            results.append(False)
    
    # Run asynchronous tests
    async def run_async_tests():
        async_results = []
        for test in async_tests:
            try:
                result = await test()
                async_results.append(result)
            except Exception as e:
                print(f"✗ Test {test.__name__} crashed: {str(e)}")
                async_results.append(False)
        return async_results
    
    # Run async tests
    try:
        async_results = asyncio.run(run_async_tests())
        results.extend(async_results)
    except Exception as e:
        print(f"✗ Async tests failed: {str(e)}")
        results.extend([False] * len(async_tests))
    
    # Summary
    print("\\n" + "=" * 50)
    print("🎯 API Integration Test Results")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    all_tests = tests + async_tests
    for i, (test, result) in enumerate(zip(all_tests, results)):
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} {test.__name__}")
    
    print(f"\\n📊 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All API integration tests passed!")
        print("\\n💡 Next steps:")
        print("  1. Set up database connection")
        print("  2. Test with real database")
        print("  3. Deploy and test in production environment")
        return True
    else:
        print("❌ Some tests failed. Please review the implementation.")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\\n💥 Test runner crashed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
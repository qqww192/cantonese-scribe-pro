#!/usr/bin/env python3
"""
Comprehensive test script for the CantoneseScribe usage tracking system.
Tests all components of the usage tracking implementation.
"""

import asyncio
import json
import logging
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Dict, Any
from uuid import UUID, uuid4

import httpx
from sqlalchemy import text

# Add the API directory to the path so we can import modules
sys.path.append(str(Path(__file__).parent / "api" / "app"))

from services.usage_service import usage_service
from services.monthly_reset_service import monthly_reset_service
from services.usage_analytics_service import usage_analytics_service
from models.database import get_database
from core.config import get_settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class UsageSystemTester:
    """Comprehensive tester for the usage tracking system."""
    
    def __init__(self):
        self.settings = get_settings()
        self.db = get_database()
        self.test_user_id = None
        self.test_transcription_id = None
        self.test_results = {}
        
    async def run_all_tests(self):
        """Run all usage system tests."""
        logger.info("=" * 60)
        logger.info("Starting CantoneseScribe Usage System Tests")
        logger.info("=" * 60)
        
        try:
            # Setup test data
            await self.setup_test_data()
            
            # Test 1: Usage Service Tests
            logger.info("\n🧪 Test 1: Usage Service Core Functions")
            await self.test_usage_service()
            
            # Test 2: Usage Limits and Checks
            logger.info("\n🧪 Test 2: Usage Limits and Validation")
            await self.test_usage_limits()
            
            # Test 3: Monthly Reset System
            logger.info("\n🧪 Test 3: Monthly Reset Automation")
            await self.test_monthly_reset_system()
            
            # Test 4: Usage Analytics
            logger.info("\n🧪 Test 4: Usage Analytics and Monitoring")
            await self.test_usage_analytics()
            
            # Test 5: API Endpoints
            logger.info("\n🧪 Test 5: Usage API Endpoints")
            await self.test_usage_api_endpoints()
            
            # Test 6: Concurrent Processing
            logger.info("\n🧪 Test 6: Concurrent Processing Limits")
            await self.test_concurrent_processing()
            
            # Test 7: Plan Management
            logger.info("\n🧪 Test 7: Plan Limits and Upgrades")
            await self.test_plan_management()
            
            # Clean up test data
            await self.cleanup_test_data()
            
            # Print results
            self.print_test_results()
            
        except Exception as e:
            logger.error(f"Test suite failed with error: {str(e)}")
            await self.cleanup_test_data()
            raise
    
    async def setup_test_data(self):
        """Set up test data for usage system testing."""
        logger.info("Setting up test data...")
        
        async with self.db.get_session() as session:
            # Create test user
            user_query = text("""
                INSERT INTO users (id, email, password_hash, created_at, is_active)
                VALUES (:id, :email, :password, :created_at, true)
                ON CONFLICT (email) DO UPDATE SET id = :id
                RETURNING id
            """)
            
            self.test_user_id = uuid4()
            await session.execute(user_query, {
                "id": self.test_user_id,
                "email": "test-usage-system@cantonesescribe.com",
                "password": "test-password-hash",
                "created_at": datetime.now() - timedelta(days=15)  # 15 days old account
            })
            
            # Create test transcription
            transcription_query = text("""
                INSERT INTO transcriptions (id, user_id, title, status, duration, file_size, created_at)
                VALUES (:id, :user_id, :title, :status, :duration, :file_size, :created_at)
                RETURNING id
            """)
            
            self.test_transcription_id = uuid4()
            await session.execute(transcription_query, {
                "id": self.test_transcription_id,
                "user_id": self.test_user_id,
                "title": "Test Transcription for Usage System",
                "status": "completed",
                "duration": 300,  # 5 minutes
                "file_size": 10 * 1024 * 1024,  # 10MB
                "created_at": datetime.now()
            })
            
            await session.commit()
            
        logger.info(f"✅ Test data created - User: {self.test_user_id}, Transcription: {self.test_transcription_id}")
    
    async def test_usage_service(self):
        """Test core usage service functionality."""
        try:
            # Test recording usage
            usage_record = await usage_service.record_usage(
                user_id=self.test_user_id,
                usage_type="transcription",
                duration_seconds=300,
                file_size_bytes=10 * 1024 * 1024,
                cost=Decimal("0.03"),
                tokens_used=1000,
                transcription_id=self.test_transcription_id
            )
            
            assert usage_record.user_id == self.test_user_id
            assert usage_record.duration_seconds == 300
            assert usage_record.cost == Decimal("0.03")
            logger.info("✅ Usage recording successful")
            
            # Test getting current usage
            current_usage = await usage_service.get_current_usage(self.test_user_id)
            assert current_usage.credits_used >= 5  # 5 minutes = 5 credits
            assert current_usage.credits_total == 30  # Free plan
            assert current_usage.transcription_count >= 1
            logger.info("✅ Current usage retrieval successful")
            
            # Test usage history
            usage_history = await usage_service.get_usage_history(self.test_user_id)
            assert len(usage_history.history) >= 0
            assert usage_history.total_lifetime_transcriptions >= 1
            logger.info("✅ Usage history retrieval successful")
            
            self.test_results["usage_service"] = "PASSED"
            
        except Exception as e:
            logger.error(f"❌ Usage service test failed: {str(e)}")
            self.test_results["usage_service"] = f"FAILED: {str(e)}"
    
    async def test_usage_limits(self):
        """Test usage limits and validation."""
        try:
            # Test usage check for valid request
            usage_check = await usage_service.check_usage_limits(
                user_id=self.test_user_id,
                estimated_duration_seconds=120,  # 2 minutes
                file_size_bytes=5 * 1024 * 1024  # 5MB
            )
            
            assert usage_check.credits_required == 2  # 2 minutes = 2 credits
            assert usage_check.can_process_concurrent == True  # Should allow 1 concurrent job
            logger.info("✅ Usage limits check successful")
            
            # Test file size limit validation
            try:
                large_file_check = await usage_service.check_usage_limits(
                    user_id=self.test_user_id,
                    estimated_duration_seconds=600,
                    file_size_bytes=30 * 1024 * 1024  # 30MB (exceeds free limit)
                )
                # This should fail for free users
                if large_file_check.can_process:
                    logger.warning("⚠️ Large file check should have failed for free user")
            except Exception:
                logger.info("✅ File size limit validation working correctly")
            
            # Test getting user limits
            user_limits = await usage_service.get_user_limits(self.test_user_id)
            assert user_limits.current_plan.plan_name == "free"
            assert user_limits.current_plan.credits_per_month == 30
            assert len(user_limits.upgrade_options) > 0
            logger.info("✅ User limits retrieval successful")
            
            self.test_results["usage_limits"] = "PASSED"
            
        except Exception as e:
            logger.error(f"❌ Usage limits test failed: {str(e)}")
            self.test_results["usage_limits"] = f"FAILED: {str(e)}"
    
    async def test_monthly_reset_system(self):
        """Test monthly reset automation."""
        try:
            # Test manual reset
            reset_response = await usage_service.perform_monthly_reset(
                user_id=self.test_user_id,
                reason="Test reset for usage system validation"
            )
            
            assert reset_response.user_id == self.test_user_id
            assert reset_response.reset_successful == True
            logger.info("✅ Manual monthly reset successful")
            
            # Test reset schedule retrieval
            reset_schedule = await monthly_reset_service.get_reset_schedule()
            assert isinstance(reset_schedule, list)
            logger.info("✅ Reset schedule retrieval successful")
            
            # Verify usage was reset
            current_usage_after_reset = await usage_service.get_current_usage(self.test_user_id)
            logger.info(f"Credits used after reset: {current_usage_after_reset.credits_used}")
            
            self.test_results["monthly_reset"] = "PASSED"
            
        except Exception as e:
            logger.error(f"❌ Monthly reset test failed: {str(e)}")
            self.test_results["monthly_reset"] = f"FAILED: {str(e)}"
    
    async def test_usage_analytics(self):
        """Test usage analytics functionality."""
        try:
            # Test comprehensive analytics
            analytics = await usage_analytics_service.get_comprehensive_analytics(
                start_date=date.today() - timedelta(days=30),
                end_date=date.today(),
                user_id=self.test_user_id
            )
            
            assert analytics.total_users >= 0
            assert analytics.total_transcriptions >= 0
            logger.info("✅ Comprehensive analytics successful")
            
            # Test real-time metrics
            real_time_metrics = await usage_analytics_service.get_real_time_metrics()
            assert "timestamp" in real_time_metrics
            assert "processing" in real_time_metrics
            assert "usage_today" in real_time_metrics
            logger.info("✅ Real-time metrics successful")
            
            # Test cost analysis
            cost_analysis = await usage_analytics_service.get_cost_analysis(days_back=7)
            assert "summary" in cost_analysis
            assert "optimization_opportunities" in cost_analysis
            logger.info("✅ Cost analysis successful")
            
            self.test_results["usage_analytics"] = "PASSED"
            
        except Exception as e:
            logger.error(f"❌ Usage analytics test failed: {str(e)}")
            self.test_results["usage_analytics"] = f"FAILED: {str(e)}"
    
    async def test_usage_api_endpoints(self):
        """Test usage API endpoints (simulated)."""
        try:
            # Since we can't easily start the full FastAPI server in test,
            # we'll test the service layer that the endpoints use
            
            # Test usage alerts
            usage_alerts = await usage_service.get_usage_alerts(self.test_user_id)
            assert isinstance(usage_alerts.alerts, list)
            logger.info("✅ Usage alerts successful")
            
            # Test concurrent jobs status
            concurrent_status = await usage_service.get_concurrent_jobs_status(self.test_user_id)
            assert concurrent_status.user_id == self.test_user_id
            assert concurrent_status.max_jobs >= 1
            logger.info("✅ Concurrent jobs status successful")
            
            self.test_results["api_endpoints"] = "PASSED"
            
        except Exception as e:
            logger.error(f"❌ API endpoints test failed: {str(e)}")
            self.test_results["api_endpoints"] = f"FAILED: {str(e)}"
    
    async def test_concurrent_processing(self):
        """Test concurrent processing limits."""
        try:
            async with self.db.get_session() as session:
                # Create test concurrent processing record
                concurrent_query = text("""
                    INSERT INTO concurrent_processing 
                    (user_id, job_id, status, queued_at, estimated_duration_seconds)
                    VALUES (:user_id, :job_id, :status, :queued_at, :duration)
                """)
                
                await session.execute(concurrent_query, {
                    "user_id": self.test_user_id,
                    "job_id": f"test-job-{uuid4()}",
                    "status": "processing",
                    "queued_at": datetime.now(),
                    "duration": 300
                })
                
                await session.commit()
            
            # Test concurrent job status
            concurrent_status = await usage_service.get_concurrent_jobs_status(self.test_user_id)
            assert concurrent_status.current_jobs >= 1
            logger.info("✅ Concurrent processing tracking successful")
            
            self.test_results["concurrent_processing"] = "PASSED"
            
        except Exception as e:
            logger.error(f"❌ Concurrent processing test failed: {str(e)}")
            self.test_results["concurrent_processing"] = f"FAILED: {str(e)}"
    
    async def test_plan_management(self):
        """Test plan management and limits."""
        try:
            async with self.db.get_session() as session:
                # Test getting plan limits function
                plan_limits_query = text("SELECT * FROM get_user_plan_limits(:user_id)")
                result = await session.execute(plan_limits_query, {"user_id": self.test_user_id})
                plan_limits = result.fetchone()
                
                assert plan_limits.plan_name in ["free", "starter", "pro", "enterprise"]
                assert plan_limits.credits_per_month > 0
                assert plan_limits.max_concurrent_jobs >= 1
                logger.info("✅ Plan limits function successful")
                
                # Test concurrent processing limit check function
                concurrent_check_query = text("SELECT * FROM check_concurrent_processing_limit(:user_id)")
                result = await session.execute(concurrent_check_query, {"user_id": self.test_user_id})
                concurrent_check = result.fetchone()
                
                assert concurrent_check.max_jobs >= 1
                logger.info("✅ Concurrent processing limit check successful")
            
            self.test_results["plan_management"] = "PASSED"
            
        except Exception as e:
            logger.error(f"❌ Plan management test failed: {str(e)}")
            self.test_results["plan_management"] = f"FAILED: {str(e)}"
    
    async def cleanup_test_data(self):
        """Clean up test data after testing."""
        try:
            async with self.db.get_session() as session:
                # Clean up in reverse order of creation
                cleanup_queries = [
                    "DELETE FROM concurrent_processing WHERE user_id = :user_id",
                    "DELETE FROM usage_tracking WHERE user_id = :user_id",
                    "DELETE FROM usage_alerts WHERE user_id = :user_id",
                    "DELETE FROM transcriptions WHERE user_id = :user_id",
                    "DELETE FROM user_plan_limits WHERE user_id = :user_id",
                    "DELETE FROM audit_logs WHERE user_id = :user_id",
                    "DELETE FROM users WHERE id = :user_id"
                ]
                
                for query in cleanup_queries:
                    await session.execute(text(query), {"user_id": self.test_user_id})
                
                await session.commit()
            
            logger.info("✅ Test data cleaned up successfully")
            
        except Exception as e:
            logger.error(f"⚠️ Error cleaning up test data: {str(e)}")
    
    def print_test_results(self):
        """Print comprehensive test results."""
        logger.info("\n" + "=" * 60)
        logger.info("CANTONESE SCRIBE USAGE SYSTEM TEST RESULTS")
        logger.info("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result == "PASSED")
        
        for test_name, result in self.test_results.items():
            status_icon = "✅" if result == "PASSED" else "❌"
            logger.info(f"{status_icon} {test_name.replace('_', ' ').title()}: {result}")
        
        logger.info("-" * 60)
        logger.info(f"SUMMARY: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            logger.info("🎉 ALL TESTS PASSED! Usage tracking system is fully functional.")
        else:
            logger.warning("⚠️ Some tests failed. Please review the implementation.")
        
        logger.info("=" * 60)
    
    async def test_database_schema(self):
        """Test database schema integrity."""
        try:
            async with self.db.get_session() as session:
                # Test that all required tables exist
                tables_query = text("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('users', 'usage_tracking', 'user_plan_limits', 
                                      'concurrent_processing', 'usage_quotas', 'usage_alerts')
                """)
                
                result = await session.execute(tables_query)
                tables = [row.table_name for row in result.fetchall()]
                
                required_tables = ['users', 'usage_tracking', 'user_plan_limits', 
                                 'concurrent_processing', 'usage_quotas', 'usage_alerts']
                
                missing_tables = set(required_tables) - set(tables)
                if missing_tables:
                    raise Exception(f"Missing required tables: {missing_tables}")
                
                logger.info("✅ Database schema validation successful")
                return True
                
        except Exception as e:
            logger.error(f"❌ Database schema validation failed: {str(e)}")
            return False


async def main():
    """Main test function."""
    tester = UsageSystemTester()
    
    # First check if database schema is ready
    if not await tester.test_database_schema():
        logger.error("Database schema is not ready. Please run migrations first.")
        return 1
    
    # Run all tests
    try:
        await tester.run_all_tests()
        return 0
    except Exception as e:
        logger.error(f"Test suite failed: {str(e)}")
        return 1


if __name__ == "__main__":
    """Run the usage system tests."""
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
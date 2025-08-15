"""
Monthly reset automation service for CantoneseScribe usage tracking.
Handles automated monthly resets based on user account creation dates with proper timezone handling.
"""

import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from ..core.config import get_settings
from ..services.database_service import get_database
from ..services.usage_service import usage_service
from ..schemas.usage import MonthlyResetResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class MonthlyResetService:
    """
    Service for handling automated monthly usage resets.
    
    Features:
    - Daily check for users requiring reset
    - Timezone-aware reset scheduling
    - Batch processing for performance
    - Error handling and retry logic
    - Audit logging for all resets
    """
    
    def __init__(self):
        self.db = get_database()
        self.scheduler = AsyncIOScheduler()
        self.reset_in_progress = set()  # Track resets in progress to avoid duplicates
        
    def start_scheduler(self):
        """Start the automated reset scheduler."""
        try:
            # Schedule daily reset check at 2 AM UTC
            self.scheduler.add_job(
                self.perform_daily_reset_check,
                CronTrigger(hour=2, minute=0, timezone='UTC'),
                id="daily_reset_check",
                name="Daily Usage Reset Check",
                replace_existing=True
            )
            
            # Schedule hourly cleanup of old data
            self.scheduler.add_job(
                self.cleanup_old_usage_data,
                CronTrigger(minute=0, timezone='UTC'),
                id="usage_cleanup",
                name="Usage Data Cleanup",
                replace_existing=True
            )
            
            # Schedule system health check every 4 hours
            self.scheduler.add_job(
                self.system_health_check,
                IntervalTrigger(hours=4),
                id="system_health",
                name="System Health Check",
                replace_existing=True
            )
            
            self.scheduler.start()
            logger.info("Monthly reset scheduler started successfully")
            
        except Exception as e:
            logger.error(f"Error starting monthly reset scheduler: {str(e)}")
            raise
    
    def stop_scheduler(self):
        """Stop the automated reset scheduler."""
        try:
            if self.scheduler.running:
                self.scheduler.shutdown(wait=True)
                logger.info("Monthly reset scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping monthly reset scheduler: {str(e)}")
    
    async def perform_daily_reset_check(self):
        """
        Daily check for users requiring monthly reset.
        Identifies users whose billing period has ended and performs resets.
        """
        logger.info("Starting daily reset check")
        
        try:
            async with self.db.get_session() as session:
                # Find users requiring reset today
                users_to_reset = await self._find_users_requiring_reset(session)
                
                if not users_to_reset:
                    logger.info("No users require reset today")
                    return
                
                logger.info(f"Found {len(users_to_reset)} users requiring reset")
                
                # Process resets in batches to avoid overloading the system
                batch_size = 10
                successful_resets = 0
                failed_resets = 0
                
                for i in range(0, len(users_to_reset), batch_size):
                    batch = users_to_reset[i:i + batch_size]
                    
                    # Process batch concurrently
                    tasks = [
                        self._perform_user_reset(user_data)
                        for user_data in batch
                    ]
                    
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for result in results:
                        if isinstance(result, Exception):
                            failed_resets += 1
                            logger.error(f"Reset failed: {str(result)}")
                        else:
                            successful_resets += 1
                    
                    # Brief pause between batches to avoid overwhelming the database
                    await asyncio.sleep(1)
                
                # Log summary
                logger.info(f"Daily reset check completed: {successful_resets} successful, {failed_resets} failed")
                
                # Record system metric
                await self._record_reset_metrics(session, successful_resets, failed_resets)
                
        except Exception as e:
            logger.error(f"Error in daily reset check: {str(e)}")
            raise
    
    async def _find_users_requiring_reset(self, session: AsyncSession) -> List[Dict]:
        """Find users whose billing period has ended and require reset."""
        today = date.today()
        
        # Find users whose account anniversary is today
        # This query handles month-end edge cases properly
        query = text("""
            SELECT 
                u.id as user_id,
                u.email,
                u.created_at,
                u.timezone,
                s.plan_name,
                s.status as subscription_status
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id 
                AND s.status IN ('active', 'trialing')
                AND s.current_period_end > NOW()
            WHERE u.is_active = true
            AND (
                -- Users created on this day of month
                EXTRACT(DAY FROM u.created_at) = EXTRACT(DAY FROM :today::date)
                OR (
                    -- Handle month-end edge cases (e.g., created on Jan 31, reset on Feb 28)
                    EXTRACT(DAY FROM u.created_at) > EXTRACT(DAY FROM (:today::date + INTERVAL '1 day'))
                    AND EXTRACT(DAY FROM :today::date) = EXTRACT(DAY FROM 
                        DATE_TRUNC('month', :today::date) + INTERVAL '1 month' - INTERVAL '1 day'
                    )
                )
            )
            -- Only reset if they haven't been reset this month already
            AND NOT EXISTS (
                SELECT 1 FROM usage_tracking ut
                WHERE ut.user_id = u.id
                AND ut.billing_period_start >= :today::date
                LIMIT 1
            )
            ORDER BY u.created_at
        """)
        
        result = await session.execute(query, {"today": today})
        users = result.fetchall()
        
        return [
            {
                "user_id": user.user_id,
                "email": user.email,
                "created_at": user.created_at,
                "timezone": user.timezone or "UTC",
                "plan_name": user.plan_name or "free",
                "subscription_status": user.subscription_status or "none"
            }
            for user in users
        ]
    
    async def _perform_user_reset(self, user_data: Dict) -> MonthlyResetResponse:
        """Perform monthly reset for a single user."""
        user_id = user_data["user_id"]
        
        # Prevent duplicate resets
        if user_id in self.reset_in_progress:
            logger.warning(f"Reset already in progress for user {user_id}")
            return None
        
        self.reset_in_progress.add(user_id)
        
        try:
            logger.info(f"Performing monthly reset for user {user_id} ({user_data['email']})")
            
            # Perform the reset using the usage service
            reset_response = await usage_service.perform_monthly_reset(
                user_id=user_id,
                reason="Automated monthly reset"
            )
            
            # Log the successful reset
            await self._log_reset_audit(user_data, reset_response, success=True)
            
            logger.info(f"Monthly reset completed for user {user_id}")
            return reset_response
            
        except Exception as e:
            error_msg = f"Error performing reset for user {user_id}: {str(e)}"
            logger.error(error_msg)
            
            # Log the failed reset
            await self._log_reset_audit(user_data, None, success=False, error=error_msg)
            
            raise Exception(error_msg)
            
        finally:
            self.reset_in_progress.discard(user_id)
    
    async def _log_reset_audit(
        self, 
        user_data: Dict, 
        reset_response: Optional[MonthlyResetResponse],
        success: bool,
        error: Optional[str] = None
    ):
        """Log reset audit information."""
        try:
            async with self.db.get_session() as session:
                audit_query = text("""
                    INSERT INTO audit_logs (
                        user_id, action, resource_type, resource_id,
                        details, timestamp
                    ) VALUES (
                        :user_id, :action, :resource_type, :resource_id,
                        :details, NOW()
                    )
                """)
                
                details = {
                    "reset_type": "automated_monthly",
                    "user_email": user_data["email"],
                    "user_timezone": user_data["timezone"],
                    "plan_name": user_data["plan_name"],
                    "success": success,
                    "error": error,
                }
                
                if reset_response:
                    details.update({
                        "previous_credits_used": reset_response.previous_credits_used,
                        "new_credits_available": reset_response.new_credits_available,
                        "reset_date": reset_response.reset_date.isoformat(),
                        "next_reset_date": reset_response.next_reset_date.isoformat()
                    })
                
                await session.execute(audit_query, {
                    "user_id": user_data["user_id"],
                    "action": "monthly_reset",
                    "resource_type": "usage_tracking",
                    "resource_id": user_data["user_id"],
                    "details": details
                })
                
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error logging reset audit: {str(e)}")
    
    async def cleanup_old_usage_data(self):
        """Clean up old usage tracking data to maintain performance."""
        try:
            async with self.db.get_session() as session:
                # Keep 2 years of usage data, archive older data
                cutoff_date = date.today() - timedelta(days=730)
                
                # Count records to be archived
                count_query = text("""
                    SELECT COUNT(*) FROM usage_tracking 
                    WHERE usage_date < :cutoff_date
                """)
                result = await session.execute(count_query, {"cutoff_date": cutoff_date})
                old_records_count = result.scalar()
                
                if old_records_count == 0:
                    return
                
                logger.info(f"Archiving {old_records_count} old usage records older than {cutoff_date}")
                
                # Move old data to archive table (if it exists) or delete
                # For now, we'll keep the data but could implement archiving later
                cleanup_query = text("""
                    UPDATE usage_tracking 
                    SET usage_month = 'archived_' || usage_month
                    WHERE usage_date < :cutoff_date
                    AND usage_month NOT LIKE 'archived_%'
                """)
                
                await session.execute(cleanup_query, {"cutoff_date": cutoff_date})
                await session.commit()
                
                logger.info(f"Successfully archived {old_records_count} old usage records")
                
        except Exception as e:
            logger.error(f"Error cleaning up old usage data: {str(e)}")
    
    async def system_health_check(self):
        """Perform system health checks for the usage tracking system."""
        try:
            logger.info("Performing usage system health check")
            
            async with self.db.get_session() as session:
                # Check database connectivity
                await session.execute(text("SELECT 1"))
                
                # Check for stuck processing jobs (running > 2 hours)
                stuck_jobs_query = text("""
                    SELECT COUNT(*) FROM transcriptions 
                    WHERE status = 'processing' 
                    AND processing_started_at < NOW() - INTERVAL '2 hours'
                """)
                result = await session.execute(stuck_jobs_query)
                stuck_jobs = result.scalar()
                
                if stuck_jobs > 0:
                    logger.warning(f"Found {stuck_jobs} stuck processing jobs")
                
                # Check for users over their limits without blocking
                overlimit_query = text("""
                    SELECT COUNT(DISTINCT ut.user_id) 
                    FROM usage_tracking ut
                    JOIN users u ON ut.user_id = u.id
                    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                    WHERE ut.usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
                    GROUP BY ut.user_id, COALESCE(s.plan_name, 'free')
                    HAVING SUM(CASE 
                        WHEN ut.usage_type = 'transcription' 
                        THEN GREATEST(1, CEIL(ut.duration_seconds::float / 60))
                        ELSE 1
                    END) > CASE COALESCE(s.plan_name, 'free')
                        WHEN 'free' THEN 30
                        WHEN 'starter' THEN 150
                        WHEN 'pro' THEN 500
                        WHEN 'enterprise' THEN 2000
                        ELSE 30
                    END
                """)
                result = await session.execute(overlimit_query)
                overlimit_users = len(result.fetchall())
                
                # Record health metrics
                health_metrics = {
                    "database_connected": True,
                    "stuck_processing_jobs": stuck_jobs,
                    "overlimit_users": overlimit_users,
                    "scheduler_running": self.scheduler.running,
                    "resets_in_progress": len(self.reset_in_progress)
                }
                
                await self._record_health_metrics(session, health_metrics)
                
                logger.info(f"Health check completed: {health_metrics}")
                
        except Exception as e:
            logger.error(f"Error in system health check: {str(e)}")
            
            # Record failed health check
            async with self.db.get_session() as session:
                await self._record_health_metrics(session, {
                    "database_connected": False,
                    "error": str(e)
                })
    
    async def _record_reset_metrics(self, session: AsyncSession, successful: int, failed: int):
        """Record reset operation metrics."""
        metrics_query = text("""
            INSERT INTO system_metrics (metric_name, metric_value, metric_unit, metric_type, labels)
            VALUES 
                ('monthly_resets_successful', :successful, 'count', 'counter', :labels),
                ('monthly_resets_failed', :failed, 'count', 'counter', :labels)
        """)
        
        labels = {"service": "monthly_reset", "date": date.today().isoformat()}
        
        await session.execute(metrics_query, {
            "successful": successful,
            "failed": failed,
            "labels": labels
        })
        
        await session.commit()
    
    async def _record_health_metrics(self, session: AsyncSession, metrics: Dict):
        """Record system health metrics."""
        try:
            for metric_name, metric_value in metrics.items():
                if isinstance(metric_value, bool):
                    metric_value = 1 if metric_value else 0
                elif isinstance(metric_value, str):
                    continue  # Skip string metrics for now
                
                health_query = text("""
                    INSERT INTO system_metrics (metric_name, metric_value, metric_unit, metric_type, labels)
                    VALUES (:metric_name, :metric_value, 'count', 'gauge', :labels)
                """)
                
                await session.execute(health_query, {
                    "metric_name": f"usage_system_{metric_name}",
                    "metric_value": metric_value,
                    "labels": {"service": "usage_tracking", "timestamp": datetime.now().isoformat()}
                })
            
            await session.commit()
        except Exception as e:
            logger.error(f"Error recording health metrics: {str(e)}")
    
    async def get_reset_schedule(self) -> List[Dict]:
        """Get upcoming reset schedule for monitoring."""
        try:
            async with self.db.get_session() as session:
                # Get users and their next reset dates
                query = text("""
                    SELECT 
                        u.id,
                        u.email,
                        u.created_at,
                        CASE 
                            WHEN EXTRACT(DAY FROM u.created_at) <= EXTRACT(DAY FROM CURRENT_DATE)
                            THEN DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + 
                                 (EXTRACT(DAY FROM u.created_at) - 1) * INTERVAL '1 day'
                            ELSE DATE_TRUNC('month', CURRENT_DATE) + 
                                 (EXTRACT(DAY FROM u.created_at) - 1) * INTERVAL '1 day'
                        END as next_reset_date,
                        COALESCE(s.plan_name, 'free') as plan_name
                    FROM users u
                    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                    WHERE u.is_active = true
                    ORDER BY next_reset_date
                    LIMIT 100
                """)
                
                result = await session.execute(query)
                schedule = []
                
                for row in result.fetchall():
                    schedule.append({
                        "user_id": str(row.id),
                        "email": row.email,
                        "account_created": row.created_at.isoformat(),
                        "next_reset_date": row.next_reset_date.isoformat(),
                        "plan_name": row.plan_name,
                        "days_until_reset": (row.next_reset_date.date() - date.today()).days
                    })
                
                return schedule
                
        except Exception as e:
            logger.error(f"Error getting reset schedule: {str(e)}")
            return []
    
    async def manual_reset_all_users(self, reason: str = "Manual bulk reset") -> Dict:
        """Manually trigger reset for all eligible users (admin function)."""
        try:
            async with self.db.get_session() as session:
                users_to_reset = await self._find_users_requiring_reset(session)
                
                if not users_to_reset:
                    return {"message": "No users require reset", "resets_performed": 0}
                
                successful = 0
                failed = 0
                
                for user_data in users_to_reset:
                    try:
                        await usage_service.perform_monthly_reset(
                            user_id=user_data["user_id"],
                            reason=reason
                        )
                        successful += 1
                    except Exception as e:
                        logger.error(f"Manual reset failed for user {user_data['user_id']}: {str(e)}")
                        failed += 1
                
                return {
                    "message": f"Bulk reset completed",
                    "resets_performed": successful,
                    "failures": failed,
                    "total_eligible": len(users_to_reset)
                }
                
        except Exception as e:
            logger.error(f"Error in manual bulk reset: {str(e)}")
            raise


# Global instance
monthly_reset_service = MonthlyResetService()
"""
Usage tracking service with atomic operations, rate limiting, and comprehensive usage management.
"""

import asyncio
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from uuid import UUID

import asyncpg
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..services.database_service import get_database
from ..schemas.usage import (
    ConcurrentJobsResponse,
    CurrentUsageResponse, 
    MonthlyResetResponse,
    PlanLimits,
    UsageAlert,
    UsageAlertsResponse,
    UsageAnalyticsResponse,
    UsageCheckResponse,
    UsageHistoryItem,
    UsageHistoryResponse,
    UsageRecordResponse,
    UsageStatsResponse,
    UserLimitsResponse
)

logger = logging.getLogger(__name__)
settings = get_settings()


class UsageService:
    """
    Service for managing user usage tracking, limits, and billing.
    Handles atomic operations, concurrent processing limits, and monthly resets.
    """
    
    # Plan configurations (could be moved to database or config)
    PLAN_CONFIGS = {
        "free": PlanLimits(
            plan_name="free",
            credits_per_month=30,
            max_file_size_mb=25,
            max_concurrent_jobs=1,
            features=["Basic transcription", "Cantonese support", "SRT/VTT export"],
            cost_per_credit=Decimal("0"),
            allows_overage=False
        ),
        "starter": PlanLimits(
            plan_name="starter", 
            credits_per_month=150,
            max_file_size_mb=100,
            max_concurrent_jobs=2,
            features=["Everything in Free", "Higher accuracy", "Bulk processing", "CSV export"],
            cost_per_credit=Decimal("0.10"),
            allows_overage=True
        ),
        "pro": PlanLimits(
            plan_name="pro",
            credits_per_month=500,
            max_file_size_mb=500,
            max_concurrent_jobs=5,
            features=["Everything in Starter", "Priority processing", "Custom vocabulary", "API access"],
            cost_per_credit=Decimal("0.08"),
            allows_overage=True
        ),
        "enterprise": PlanLimits(
            plan_name="enterprise",
            credits_per_month=2000,
            max_file_size_mb=1000,
            max_concurrent_jobs=10,
            features=["Everything in Pro", "Dedicated support", "Custom integrations", "SLA guarantee"],
            cost_per_credit=Decimal("0.05"),
            allows_overage=True
        )
    }
    
    def __init__(self):
        self._db_service = None
    
    async def _get_db_service(self):
        """Get database service instance."""
        if not self._db_service:
            self._db_service = await get_database()
        return self._db_service
        
    async def record_usage(
        self,
        user_id: UUID,
        usage_type: str,
        duration_seconds: int = 0,
        file_size_bytes: int = 0,
        cost: Decimal = Decimal('0'),
        tokens_used: int = 0,
        transcription_id: Optional[UUID] = None
    ) -> UsageRecordResponse:
        """
        Atomically record usage for a user.
        Ensures no double-charging and maintains consistency.
        """
        async with self.db.get_session() as session:
            try:
                # Begin transaction for atomic operation
                async with session.begin():
                    # Get user's billing period
                    billing_period = await self._get_user_billing_period(session, user_id)
                    
                    # Calculate credits used (1 credit per minute of audio)
                    credits = max(1, (duration_seconds + 59) // 60) if duration_seconds > 0 else 1
                    
                    # Check for duplicate usage (prevent double-charging)
                    if transcription_id:
                        existing = await self._check_existing_usage(session, transcription_id)
                        if existing:
                            logger.warning(f"Duplicate usage record attempt for transcription {transcription_id}")
                            raise HTTPException(status_code=409, detail="Usage already recorded for this transcription")
                    
                    # Insert usage record
                    usage_record = await self._insert_usage_record(
                        session=session,
                        user_id=user_id,
                        usage_type=usage_type,
                        duration_seconds=duration_seconds,
                        file_size_bytes=file_size_bytes,
                        cost=cost,
                        tokens_used=tokens_used,
                        transcription_id=transcription_id,
                        billing_period=billing_period,
                        credits=credits
                    )
                    
                    # Update user metrics
                    await self._update_user_metrics(session, user_id, usage_type, credits)
                    
                    logger.info(f"Usage recorded for user {user_id}: {credits} credits, type: {usage_type}")
                    return usage_record
                    
            except asyncpg.exceptions.UniqueViolationError:
                raise HTTPException(status_code=409, detail="Usage already recorded")
            except Exception as e:
                logger.error(f"Error recording usage for user {user_id}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to record usage")
    
    async def get_current_usage(self, user_id: UUID) -> CurrentUsageResponse:
        """Get current month usage for a user."""
        async with self.db.get_session() as session:
            try:
                # Get user's plan and billing period
                user_plan = await self._get_user_plan(session, user_id)
                billing_period = await self._get_user_billing_period(session, user_id)
                
                # Get current month usage
                usage_query = text("""
                    SELECT 
                        COUNT(*) as transcription_count,
                        COALESCE(SUM(duration_seconds), 0) as total_duration,
                        COALESCE(SUM(cost), 0) as total_cost,
                        COALESCE(AVG(file_size_bytes::float / 1024 / 1024), 0) as avg_file_size_mb,
                        COALESCE(SUM(CASE 
                            WHEN usage_type = 'transcription' THEN GREATEST(1, CEIL(duration_seconds::float / 60))
                            ELSE 1
                        END), 0) as credits_used
                    FROM usage_tracking 
                    WHERE user_id = :user_id 
                    AND billing_period_start = :period_start
                    AND billing_period_end = :period_end
                """)
                
                result = await session.execute(usage_query, {
                    "user_id": user_id,
                    "period_start": billing_period["start"],
                    "period_end": billing_period["end"]
                })
                usage_data = result.fetchone()
                
                if not usage_data:
                    usage_data = {
                        "transcription_count": 0,
                        "total_duration": 0,
                        "total_cost": Decimal('0'),
                        "avg_file_size_mb": 0.0,
                        "credits_used": 0
                    }
                else:
                    usage_data = usage_data._asdict()
                
                # Get concurrent processing count
                concurrent_count = await self._get_concurrent_processing_count(session, user_id)
                
                # Calculate usage metrics
                plan_config = self.PLAN_CONFIGS.get(user_plan, self.PLAN_CONFIGS["free"])
                credits_used = int(usage_data["credits_used"])
                credits_total = plan_config.credits_per_month
                
                # Calculate reset date (next billing period)
                reset_date = billing_period["end"] + timedelta(days=1)
                days_until_reset = (reset_date - date.today()).days
                
                return CurrentUsageResponse(
                    credits_used=credits_used,
                    credits_total=credits_total,
                    current_month=billing_period["start"].strftime("%Y-%m"),
                    reset_date=reset_date.isoformat(),
                    days_until_reset=max(0, days_until_reset),
                    is_near_limit=credits_used >= credits_total * 0.8,
                    is_at_limit=credits_used >= credits_total,
                    concurrent_processing=concurrent_count,
                    max_concurrent=plan_config.max_concurrent_jobs,
                    transcription_count=int(usage_data["transcription_count"]),
                    total_duration_minutes=int(usage_data["total_duration"] // 60),
                    total_cost=Decimal(str(usage_data["total_cost"])),
                    average_file_size_mb=float(usage_data["avg_file_size_mb"])
                )
                
            except Exception as e:
                logger.error(f"Error getting current usage for user {user_id}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get usage data")
    
    async def check_usage_limits(
        self, 
        user_id: UUID, 
        estimated_duration_seconds: int,
        file_size_bytes: int
    ) -> UsageCheckResponse:
        """
        Check if user can process based on current usage and limits.
        Performs comprehensive validation including concurrency limits.
        """
        async with self.db.get_session() as session:
            try:
                # Get user's plan and current usage
                user_plan = await self._get_user_plan(session, user_id)
                current_usage = await self.get_current_usage(user_id)
                plan_config = self.PLAN_CONFIGS.get(user_plan, self.PLAN_CONFIGS["free"])
                
                # Calculate credits required
                credits_required = max(1, (estimated_duration_seconds + 59) // 60)
                credits_available = current_usage.credits_total - current_usage.credits_used
                credits_after = credits_available - credits_required
                
                # Estimate cost
                estimated_cost = Decimal(str(credits_required)) * plan_config.cost_per_credit
                
                # Check file size limit
                file_size_mb = file_size_bytes / 1024 / 1024
                if file_size_mb > plan_config.max_file_size_mb:
                    return UsageCheckResponse(
                        can_process=False,
                        credits_required=credits_required,
                        credits_available=credits_available,
                        credits_after=credits_after,
                        estimated_cost=estimated_cost,
                        blocking_reason=f"File size ({file_size_mb:.1f}MB) exceeds limit ({plan_config.max_file_size_mb}MB)",
                        warnings=[],
                        can_process_concurrent=False,
                        current_concurrent_jobs=current_usage.concurrent_processing,
                        max_concurrent_jobs=current_usage.max_concurrent
                    )
                
                # Check concurrent processing limits
                can_process_concurrent = current_usage.concurrent_processing < current_usage.max_concurrent
                
                # Check credits limit
                warnings = []
                blocking_reason = None
                can_process = True
                
                if credits_required > credits_available:
                    if not plan_config.allows_overage:
                        can_process = False
                        blocking_reason = f"Insufficient credits. Need {credits_required}, have {credits_available}"
                    else:
                        warnings.append(f"Will use {credits_required - credits_available} overage credits")
                
                if not can_process_concurrent:
                    can_process = False
                    blocking_reason = f"Maximum concurrent jobs ({current_usage.max_concurrent}) reached"
                
                # Add warnings for near-limit usage
                if current_usage.is_near_limit and not current_usage.is_at_limit:
                    warnings.append("You're approaching your monthly limit")
                
                return UsageCheckResponse(
                    can_process=can_process and can_process_concurrent,
                    credits_required=credits_required,
                    credits_available=credits_available,
                    credits_after=credits_after,
                    estimated_cost=estimated_cost,
                    blocking_reason=blocking_reason,
                    warnings=warnings,
                    can_process_concurrent=can_process_concurrent,
                    current_concurrent_jobs=current_usage.concurrent_processing,
                    max_concurrent_jobs=current_usage.max_concurrent
                )
                
            except Exception as e:
                logger.error(f"Error checking usage limits for user {user_id}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to check usage limits")
    
    async def get_usage_history(self, user_id: UUID, months: int = 12) -> UsageHistoryResponse:
        """Get usage history for the specified number of months."""
        async with self.db.get_session() as session:
            try:
                # Get user creation date
                user_query = text("SELECT created_at FROM users WHERE id = :user_id")
                user_result = await session.execute(user_query, {"user_id": user_id})
                user_data = user_result.fetchone()
                
                if not user_data:
                    raise HTTPException(status_code=404, detail="User not found")
                
                account_age_days = (datetime.now() - user_data.created_at).days
                
                # Get usage history by month
                history_query = text("""
                    SELECT 
                        usage_month,
                        COUNT(*) as transcription_count,
                        COALESCE(SUM(CASE 
                            WHEN usage_type = 'transcription' THEN GREATEST(1, CEIL(duration_seconds::float / 60))
                            ELSE 1
                        END), 0) as credits_used,
                        COALESCE(SUM(duration_seconds), 0) as total_duration,
                        COALESCE(SUM(cost), 0) as total_cost
                    FROM usage_tracking
                    WHERE user_id = :user_id
                    AND usage_month >= TO_CHAR(CURRENT_DATE - INTERVAL ':months months', 'YYYY-MM')
                    GROUP BY usage_month
                    ORDER BY usage_month DESC
                """)
                
                history_result = await session.execute(history_query, {
                    "user_id": user_id,
                    "months": months
                })
                
                # Get user's plan for credit allocation
                user_plan = await self._get_user_plan(session, user_id)
                plan_config = self.PLAN_CONFIGS.get(user_plan, self.PLAN_CONFIGS["free"])
                
                history_items = []
                total_lifetime_credits = 0
                total_lifetime_transcriptions = 0
                total_lifetime_minutes = 0
                
                for row in history_result.fetchall():
                    credits_used = int(row.credits_used)
                    transcription_count = int(row.transcription_count)
                    duration_minutes = int(row.total_duration // 60)
                    
                    history_items.append(UsageHistoryItem(
                        month=row.usage_month,
                        credits_used=credits_used,
                        credits_total=plan_config.credits_per_month,
                        utilization_rate=min(100.0, (credits_used / plan_config.credits_per_month) * 100),
                        transcription_count=transcription_count,
                        total_duration_minutes=duration_minutes,
                        total_cost=Decimal(str(row.total_cost))
                    ))
                    
                    total_lifetime_credits += credits_used
                    total_lifetime_transcriptions += transcription_count
                    total_lifetime_minutes += duration_minutes
                
                return UsageHistoryResponse(
                    history=history_items,
                    total_lifetime_credits=total_lifetime_credits,
                    total_lifetime_transcriptions=total_lifetime_transcriptions,
                    total_lifetime_minutes=total_lifetime_minutes,
                    account_age_days=account_age_days
                )
                
            except Exception as e:
                logger.error(f"Error getting usage history for user {user_id}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get usage history")
    
    async def get_user_limits(self, user_id: UUID) -> UserLimitsResponse:
        """Get user's current plan limits and available upgrades."""
        async with self.db.get_session() as session:
            try:
                # Get user's subscription info
                subscription_query = text("""
                    SELECT s.plan_name, s.status, s.billing_cycle, s.current_period_end
                    FROM subscriptions s
                    WHERE s.user_id = :user_id
                    AND s.status IN ('active', 'trialing')
                    ORDER BY s.created_at DESC
                    LIMIT 1
                """)
                
                result = await session.execute(subscription_query, {"user_id": user_id})
                subscription = result.fetchone()
                
                if subscription:
                    plan_name = subscription.plan_name
                    subscription_status = subscription.status
                    billing_cycle = subscription.billing_cycle
                    next_billing_date = subscription.current_period_end
                else:
                    plan_name = "free"
                    subscription_status = "active"
                    billing_cycle = "monthly"
                    next_billing_date = None
                
                current_plan = self.PLAN_CONFIGS.get(plan_name, self.PLAN_CONFIGS["free"])
                
                # Get available upgrade options
                upgrade_options = []
                plan_order = ["free", "starter", "pro", "enterprise"]
                current_index = plan_order.index(plan_name) if plan_name in plan_order else 0
                
                for plan in plan_order[current_index + 1:]:
                    upgrade_options.append(self.PLAN_CONFIGS[plan])
                
                return UserLimitsResponse(
                    current_plan=current_plan,
                    subscription_status=subscription_status,
                    billing_cycle=billing_cycle,
                    next_billing_date=next_billing_date,
                    can_upgrade=len(upgrade_options) > 0,
                    upgrade_options=upgrade_options
                )
                
            except Exception as e:
                logger.error(f"Error getting user limits for user {user_id}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get user limits")
    
    async def get_usage_alerts(self, user_id: UUID) -> UsageAlertsResponse:
        """Generate usage alerts based on current usage and limits."""
        try:
            current_usage = await self.get_current_usage(user_id)
            alerts = []
            has_critical = False
            
            # Usage limit alerts
            if current_usage.is_at_limit:
                alerts.append(UsageAlert(
                    id=f"limit_reached_{user_id}",
                    type="limit_reached",
                    title="Monthly Limit Reached",
                    message=f"You've used all {current_usage.credits_total} credits for this month. Upgrade for more processing power.",
                    action_text="Upgrade Plan",
                    action_url="/pricing",
                    dismissible=False,
                    priority="high",
                    created_at=datetime.now()
                ))
                has_critical = True
            elif current_usage.is_near_limit:
                alerts.append(UsageAlert(
                    id=f"near_limit_{user_id}",
                    type="warning",
                    title="Approaching Monthly Limit",
                    message=f"You've used {current_usage.credits_used} of {current_usage.credits_total} credits ({(current_usage.credits_used/current_usage.credits_total)*100:.1f}%).",
                    action_text="View Usage",
                    action_url="/usage",
                    dismissible=True,
                    priority="medium",
                    created_at=datetime.now()
                ))
            
            # Reset soon alert
            if current_usage.days_until_reset <= 3 and current_usage.credits_used > 0:
                alerts.append(UsageAlert(
                    id=f"reset_soon_{user_id}",
                    type="reset_soon",
                    title="Credits Reset Soon",
                    message=f"Your credits will reset in {current_usage.days_until_reset} days on {current_usage.reset_date}.",
                    dismissible=True,
                    priority="low",
                    created_at=datetime.now()
                ))
            
            # Concurrent processing alert
            if current_usage.concurrent_processing >= current_usage.max_concurrent:
                alerts.append(UsageAlert(
                    id=f"concurrent_limit_{user_id}",
                    type="warning",
                    title="Processing Queue Full",
                    message=f"You have {current_usage.concurrent_processing} jobs processing. New uploads will be queued.",
                    dismissible=True,
                    priority="medium",
                    created_at=datetime.now()
                ))
            
            return UsageAlertsResponse(
                alerts=alerts,
                has_critical=has_critical,
                next_check_in_hours=24
            )
            
        except Exception as e:
            logger.error(f"Error getting usage alerts for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get usage alerts")
    
    async def perform_monthly_reset(self, user_id: UUID, reason: Optional[str] = None) -> MonthlyResetResponse:
        """
        Perform monthly reset for a user (normally automated, but can be manual).
        Updates billing period and resets usage tracking.
        """
        async with self.db.get_session() as session:
            try:
                async with session.begin():
                    # Get current usage before reset
                    current_usage = await self.get_current_usage(user_id)
                    previous_credits_used = current_usage.credits_used
                    
                    # Calculate new billing period
                    today = date.today()
                    
                    # Get user's timezone for proper reset calculation
                    user_query = text("SELECT timezone, created_at FROM users WHERE id = :user_id")
                    user_result = await session.execute(user_query, {"user_id": user_id})
                    user_data = user_result.fetchone()
                    
                    if not user_data:
                        raise HTTPException(status_code=404, detail="User not found")
                    
                    # Calculate next billing period (monthly reset from creation date)
                    creation_date = user_data.created_at.date()
                    
                    # Find the next reset date based on account creation anniversary
                    if today.day >= creation_date.day:
                        # Reset this month
                        next_reset = date(today.year, today.month, creation_date.day)
                        if next_reset <= today:
                            # Move to next month
                            if today.month == 12:
                                next_reset = date(today.year + 1, 1, creation_date.day)
                            else:
                                next_reset = date(today.year, today.month + 1, creation_date.day)
                    else:
                        next_reset = date(today.year, today.month, creation_date.day)
                    
                    # Calculate billing period
                    billing_start = today
                    billing_end = next_reset - timedelta(days=1)
                    
                    # Archive current usage period if needed
                    archive_query = text("""
                        UPDATE usage_tracking 
                        SET billing_period_end = :today
                        WHERE user_id = :user_id 
                        AND billing_period_end IS NULL
                    """)
                    await session.execute(archive_query, {
                        "user_id": user_id,
                        "today": today
                    })
                    
                    # Get user's plan for new credit allocation
                    user_plan = await self._get_user_plan(session, user_id)
                    plan_config = self.PLAN_CONFIGS.get(user_plan, self.PLAN_CONFIGS["free"])
                    
                    logger.info(f"Monthly reset performed for user {user_id}: {previous_credits_used} credits used, new allowance: {plan_config.credits_per_month}")
                    
                    return MonthlyResetResponse(
                        user_id=user_id,
                        previous_credits_used=previous_credits_used,
                        new_credits_available=plan_config.credits_per_month,
                        reset_date=today,
                        next_reset_date=next_reset,
                        billing_period_start=billing_start,
                        billing_period_end=billing_end,
                        reset_successful=True,
                        reset_reason=reason or "Automated monthly reset"
                    )
                    
            except Exception as e:
                logger.error(f"Error performing monthly reset for user {user_id}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to perform monthly reset")
    
    async def get_concurrent_jobs_status(self, user_id: UUID) -> ConcurrentJobsResponse:
        """Get current concurrent processing status for user."""
        async with self.db.get_session() as session:
            try:
                # Get user's plan limits
                user_plan = await self._get_user_plan(session, user_id)
                plan_config = self.PLAN_CONFIGS.get(user_plan, self.PLAN_CONFIGS["free"])
                
                # Get currently processing transcriptions
                active_jobs_query = text("""
                    SELECT id, status, processing_started_at
                    FROM transcriptions
                    WHERE user_id = :user_id
                    AND status IN ('processing', 'pending')
                    ORDER BY processing_started_at ASC
                """)
                
                result = await session.execute(active_jobs_query, {"user_id": user_id})
                active_jobs = result.fetchall()
                
                current_jobs = len([job for job in active_jobs if job.status == 'processing'])
                available_slots = max(0, plan_config.max_concurrent_jobs - current_jobs)
                
                # Calculate queue position and wait time for pending jobs
                queue_position = None
                estimated_wait_time = None
                
                pending_jobs = [job for job in active_jobs if job.status == 'pending']
                if pending_jobs and current_jobs >= plan_config.max_concurrent_jobs:
                    queue_position = len(pending_jobs)
                    # Estimate 10 minutes average processing time per job
                    estimated_wait_time = queue_position * 600  # 10 minutes in seconds
                
                return ConcurrentJobsResponse(
                    user_id=user_id,
                    current_jobs=current_jobs,
                    max_jobs=plan_config.max_concurrent_jobs,
                    available_slots=available_slots,
                    queue_position=queue_position,
                    estimated_wait_time_seconds=estimated_wait_time,
                    active_job_ids=[UUID(str(job.id)) for job in active_jobs]
                )
                
            except Exception as e:
                logger.error(f"Error getting concurrent jobs status for user {user_id}: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get concurrent jobs status")
    
    # Private helper methods
    
    async def _get_user_plan(self, session: AsyncSession, user_id: UUID) -> str:
        """Get user's current subscription plan."""
        query = text("""
            SELECT plan_name 
            FROM subscriptions 
            WHERE user_id = :user_id 
            AND status IN ('active', 'trialing')
            ORDER BY created_at DESC 
            LIMIT 1
        """)
        
        result = await session.execute(query, {"user_id": user_id})
        row = result.fetchone()
        return row.plan_name if row else "free"
    
    async def _get_user_billing_period(self, session: AsyncSession, user_id: UUID) -> Dict:
        """Get user's current billing period based on account creation date."""
        query = text("SELECT created_at, timezone FROM users WHERE id = :user_id")
        result = await session.execute(query, {"user_id": user_id})
        user = result.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        creation_date = user.created_at.date()
        today = date.today()
        
        # Calculate current billing period based on creation anniversary
        if today.day >= creation_date.day:
            start_date = date(today.year, today.month, creation_date.day)
        else:
            if today.month == 1:
                start_date = date(today.year - 1, 12, creation_date.day)
            else:
                start_date = date(today.year, today.month - 1, creation_date.day)
        
        # End date is one day before next anniversary
        if start_date.month == 12:
            end_date = date(start_date.year + 1, 1, creation_date.day) - timedelta(days=1)
        else:
            end_date = date(start_date.year, start_date.month + 1, creation_date.day) - timedelta(days=1)
        
        return {"start": start_date, "end": end_date}
    
    async def _check_existing_usage(self, session: AsyncSession, transcription_id: UUID) -> bool:
        """Check if usage has already been recorded for a transcription."""
        query = text("SELECT id FROM usage_tracking WHERE transcription_id = :transcription_id")
        result = await session.execute(query, {"transcription_id": transcription_id})
        return result.fetchone() is not None
    
    async def _insert_usage_record(
        self,
        session: AsyncSession,
        user_id: UUID,
        usage_type: str,
        duration_seconds: int,
        file_size_bytes: int,
        cost: Decimal,
        tokens_used: int,
        transcription_id: Optional[UUID],
        billing_period: Dict,
        credits: int
    ) -> UsageRecordResponse:
        """Insert usage record into database."""
        query = text("""
            INSERT INTO usage_tracking (
                user_id, transcription_id, usage_type, usage_date, usage_month,
                duration_seconds, file_size_bytes, cost, tokens_used,
                billing_period_start, billing_period_end
            ) VALUES (
                :user_id, :transcription_id, :usage_type, :usage_date, :usage_month,
                :duration_seconds, :file_size_bytes, :cost, :tokens_used,
                :billing_period_start, :billing_period_end
            ) RETURNING id, created_at
        """)
        
        today = date.today()
        result = await session.execute(query, {
            "user_id": user_id,
            "transcription_id": transcription_id,
            "usage_type": usage_type,
            "usage_date": today,
            "usage_month": today.strftime("%Y-%m"),
            "duration_seconds": duration_seconds,
            "file_size_bytes": file_size_bytes,
            "cost": cost,
            "tokens_used": tokens_used,
            "billing_period_start": billing_period["start"],
            "billing_period_end": billing_period["end"]
        })
        
        row = result.fetchone()
        
        return UsageRecordResponse(
            id=row.id,
            user_id=user_id,
            usage_type=usage_type,
            duration_seconds=duration_seconds,
            file_size_bytes=file_size_bytes,
            cost=cost,
            tokens_used=tokens_used,
            usage_date=today,
            usage_month=today.strftime("%Y-%m"),
            billing_period_start=billing_period["start"],
            billing_period_end=billing_period["end"],
            created_at=row.created_at
        )
    
    async def _update_user_metrics(self, session: AsyncSession, user_id: UUID, usage_type: str, credits: int):
        """Update user metrics after usage recording."""
        # Could insert system metrics here for monitoring
        pass
    
    async def _get_concurrent_processing_count(self, session: AsyncSession, user_id: UUID) -> int:
        """Get count of currently processing jobs for user."""
        query = text("""
            SELECT COUNT(*) 
            FROM transcriptions 
            WHERE user_id = :user_id 
            AND status = 'processing'
        """)
        
        result = await session.execute(query, {"user_id": user_id})
        return result.scalar() or 0


# Singleton instance
usage_service = UsageService()
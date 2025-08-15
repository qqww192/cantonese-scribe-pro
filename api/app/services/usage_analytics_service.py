"""
Usage analytics service for admin monitoring and business intelligence.
Provides comprehensive analytics, reports, and monitoring capabilities.
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from ..core.config import get_settings
from ..services.database_service import get_database
from ..schemas.usage import UsageAnalyticsResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class UsageAnalyticsService:
    """
    Service for usage analytics and monitoring.
    
    Features:
    - Comprehensive usage analytics
    - Real-time monitoring dashboards
    - Automated reporting and alerts
    - Business intelligence metrics
    - Performance tracking
    - Cost analysis and optimization
    """
    
    def __init__(self):
        self.db = get_database()
    
    async def get_comprehensive_analytics(
        self,
        start_date: date,
        end_date: date,
        user_id: Optional[UUID] = None,
        plan_type: Optional[str] = None,
        usage_type: Optional[str] = None
    ) -> UsageAnalyticsResponse:
        """Get comprehensive usage analytics for the specified period."""
        async with self.db.get_session() as session:
            try:
                # Build base query with filters
                filters = ["ut.usage_date >= :start_date", "ut.usage_date <= :end_date"]
                params = {"start_date": start_date, "end_date": end_date}
                
                if user_id:
                    filters.append("ut.user_id = :user_id")
                    params["user_id"] = user_id
                
                if plan_type:
                    filters.append("COALESCE(s.plan_name, 'free') = :plan_type")
                    params["plan_type"] = plan_type
                
                if usage_type:
                    filters.append("ut.usage_type = :usage_type")
                    params["usage_type"] = usage_type
                
                filter_clause = " AND " + " AND ".join(filters) if filters else ""
                
                # Main analytics query
                analytics_query = text(f"""
                    WITH usage_summary AS (
                        SELECT 
                            ut.user_id,
                            ut.usage_date,
                            ut.usage_type,
                            COALESCE(s.plan_name, 'free') as plan_name,
                            COUNT(*) as usage_events,
                            SUM(ut.duration_seconds) as total_duration,
                            SUM(ut.cost) as total_cost,
                            SUM(ut.file_size_bytes) as total_file_size,
                            SUM(CASE 
                                WHEN ut.usage_type = 'transcription' 
                                THEN GREATEST(1, CEIL(ut.duration_seconds::float / 60))
                                ELSE 1
                            END) as credits_used,
                            AVG(ut.file_size_bytes::float / 1024 / 1024) as avg_file_size_mb,
                            EXTRACT(HOUR FROM ut.created_at) as hour_of_day
                        FROM usage_tracking ut
                        JOIN users u ON ut.user_id = u.id
                        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                        WHERE 1=1 {filter_clause}
                        GROUP BY ut.user_id, ut.usage_date, ut.usage_type, s.plan_name, 
                                 EXTRACT(HOUR FROM ut.created_at)
                    )
                    SELECT 
                        COUNT(DISTINCT user_id) as total_users,
                        COUNT(DISTINCT CASE WHEN usage_events > 0 THEN user_id END) as active_users,
                        SUM(usage_events) as total_transcriptions,
                        SUM(total_duration) / 3600.0 as total_duration_hours,
                        SUM(total_cost) as total_cost,
                        AVG(total_cost) as average_cost_per_user,
                        SUM(total_file_size) / 1024 / 1024 / 1024.0 as total_file_size_gb
                    FROM usage_summary
                """)
                
                result = await session.execute(analytics_query, params)
                summary = result.fetchone()
                
                if not summary:
                    return self._empty_analytics_response()
                
                # Get plan distribution
                plan_distribution = await self._get_plan_distribution(session, filter_clause, params)
                
                # Get usage by day
                usage_by_day = await self._get_usage_by_day(session, filter_clause, params)
                
                # Get top users
                top_users = await self._get_top_users(session, filter_clause, params)
                
                # Get peak hours
                peak_hours = await self._get_peak_hours(session, filter_clause, params)
                
                # Get file size distribution
                file_size_distribution = await self._get_file_size_distribution(session, filter_clause, params)
                
                return UsageAnalyticsResponse(
                    total_users=int(summary.total_users or 0),
                    active_users=int(summary.active_users or 0),
                    total_transcriptions=int(summary.total_transcriptions or 0),
                    total_duration_hours=float(summary.total_duration_hours or 0),
                    total_cost=Decimal(str(summary.total_cost or 0)),
                    average_cost_per_user=Decimal(str(summary.average_cost_per_user or 0)),
                    plan_distribution=plan_distribution,
                    usage_by_day=usage_by_day,
                    top_users=top_users,
                    peak_hours=peak_hours,
                    file_size_distribution=file_size_distribution
                )
                
            except Exception as e:
                logger.error(f"Error getting comprehensive analytics: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get analytics data")
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """Get real-time system metrics for monitoring dashboard."""
        async with self.db.get_session() as session:
            try:
                # Current processing statistics
                processing_query = text("""
                    SELECT 
                        COUNT(*) FILTER (WHERE status = 'processing') as active_jobs,
                        COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
                        COUNT(*) FILTER (WHERE status = 'completed') as completed_today,
                        COUNT(*) FILTER (WHERE status = 'failed') as failed_today,
                        AVG(actual_duration_seconds) FILTER (WHERE status = 'completed') as avg_processing_time
                    FROM concurrent_processing
                    WHERE queued_at >= CURRENT_DATE
                """)
                
                processing_result = await session.execute(processing_query)
                processing_data = processing_result.fetchone()
                
                # Today's usage statistics
                usage_query = text("""
                    SELECT 
                        COUNT(DISTINCT user_id) as active_users_today,
                        COUNT(*) as total_usage_events,
                        SUM(duration_seconds) as total_duration_seconds,
                        SUM(cost) as total_cost_today,
                        AVG(file_size_bytes / 1024 / 1024) as avg_file_size_mb
                    FROM usage_tracking
                    WHERE usage_date = CURRENT_DATE
                """)
                
                usage_result = await session.execute(usage_query)
                usage_data = usage_result.fetchone()
                
                # System health indicators
                health_query = text("""
                    SELECT 
                        COUNT(*) FILTER (WHERE status = 'processing' AND processing_started_at < NOW() - INTERVAL '1 hour') as stuck_jobs,
                        COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_24h,
                        AVG(retry_count) as avg_retry_count
                    FROM transcriptions
                    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
                """)
                
                health_result = await session.execute(health_query)
                health_data = health_result.fetchone()
                
                # Resource utilization
                resource_query = text("""
                    WITH plan_usage AS (
                        SELECT 
                            COALESCE(s.plan_name, 'free') as plan_name,
                            COUNT(DISTINCT ut.user_id) as active_users,
                            SUM(CASE 
                                WHEN ut.usage_type = 'transcription' 
                                THEN GREATEST(1, CEIL(ut.duration_seconds::float / 60))
                                ELSE 1
                            END) as credits_used
                        FROM usage_tracking ut
                        JOIN users u ON ut.user_id = u.id
                        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                        WHERE ut.usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
                        GROUP BY s.plan_name
                    )
                    SELECT 
                        json_object_agg(plan_name, active_users) as plan_usage,
                        SUM(credits_used) as total_credits_used_month
                    FROM plan_usage
                """)
                
                resource_result = await session.execute(resource_query)
                resource_data = resource_result.fetchone()
                
                return {
                    "timestamp": datetime.now().isoformat(),
                    "processing": {
                        "active_jobs": int(processing_data.active_jobs or 0),
                        "queued_jobs": int(processing_data.queued_jobs or 0),
                        "completed_today": int(processing_data.completed_today or 0),
                        "failed_today": int(processing_data.failed_today or 0),
                        "avg_processing_time_seconds": float(processing_data.avg_processing_time or 0)
                    },
                    "usage_today": {
                        "active_users": int(usage_data.active_users_today or 0),
                        "total_events": int(usage_data.total_usage_events or 0),
                        "total_duration_hours": float((usage_data.total_duration_seconds or 0) / 3600),
                        "total_cost": float(usage_data.total_cost_today or 0),
                        "avg_file_size_mb": float(usage_data.avg_file_size_mb or 0)
                    },
                    "system_health": {
                        "stuck_jobs": int(health_data.stuck_jobs or 0),
                        "new_users_24h": int(health_data.new_users_24h or 0),
                        "avg_retry_count": float(health_data.avg_retry_count or 0),
                        "health_status": "healthy" if (health_data.stuck_jobs or 0) < 5 else "warning"
                    },
                    "resource_utilization": {
                        "plan_usage": dict(resource_data.plan_usage or {}),
                        "total_credits_used_month": int(resource_data.total_credits_used_month or 0)
                    }
                }
                
            except Exception as e:
                logger.error(f"Error getting real-time metrics: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get real-time metrics")
    
    async def get_cost_analysis(self, days_back: int = 30) -> Dict[str, Any]:
        """Get detailed cost analysis and optimization insights."""
        async with self.db.get_session() as session:
            try:
                start_date = date.today() - timedelta(days=days_back)
                
                cost_query = text("""
                    WITH daily_costs AS (
                        SELECT 
                            usage_date,
                            SUM(cost) as daily_cost,
                            COUNT(*) as daily_transcriptions,
                            SUM(duration_seconds) / 60.0 as daily_minutes,
                            AVG(cost / NULLIF(duration_seconds, 0) * 60) as cost_per_minute
                        FROM usage_tracking
                        WHERE usage_date >= :start_date
                        AND usage_type = 'transcription'
                        GROUP BY usage_date
                        ORDER BY usage_date
                    ),
                    cost_by_plan AS (
                        SELECT 
                            COALESCE(s.plan_name, 'free') as plan_name,
                            COUNT(DISTINCT ut.user_id) as users,
                            SUM(ut.cost) as total_cost,
                            AVG(ut.cost) as avg_cost_per_transcription,
                            SUM(ut.duration_seconds) / 60.0 as total_minutes
                        FROM usage_tracking ut
                        JOIN users u ON ut.user_id = u.id
                        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                        WHERE ut.usage_date >= :start_date
                        AND ut.usage_type = 'transcription'
                        GROUP BY s.plan_name
                    )
                    SELECT 
                        (SELECT json_agg(row_to_json(daily_costs.*)) FROM daily_costs) as daily_trends,
                        (SELECT json_agg(row_to_json(cost_by_plan.*)) FROM cost_by_plan) as cost_by_plan,
                        SUM(dc.daily_cost) as total_cost_period,
                        AVG(dc.daily_cost) as avg_daily_cost,
                        MAX(dc.daily_cost) as peak_daily_cost,
                        SUM(dc.daily_transcriptions) as total_transcriptions_period,
                        AVG(dc.cost_per_minute) as avg_cost_per_minute
                    FROM daily_costs dc
                """)
                
                result = await session.execute(cost_query, {"start_date": start_date})
                cost_data = result.fetchone()
                
                # Calculate cost optimization opportunities
                optimization_query = text("""
                    SELECT 
                        COUNT(*) as total_transcriptions,
                        COUNT(*) FILTER (WHERE duration_seconds < 60) as short_transcriptions,
                        COUNT(*) FILTER (WHERE file_size_bytes < 1024 * 1024) as small_files,
                        AVG(duration_seconds) as avg_duration_seconds,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds) as median_duration,
                        SUM(CASE WHEN retry_count > 0 THEN cost ELSE 0 END) as cost_from_retries
                    FROM usage_tracking ut
                    JOIN transcriptions t ON ut.transcription_id = t.id
                    WHERE ut.usage_date >= :start_date
                    AND ut.usage_type = 'transcription'
                """)
                
                optimization_result = await session.execute(optimization_query, {"start_date": start_date})
                optimization_data = optimization_result.fetchone()
                
                return {
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": date.today().isoformat(),
                        "days": days_back
                    },
                    "summary": {
                        "total_cost": float(cost_data.total_cost_period or 0),
                        "avg_daily_cost": float(cost_data.avg_daily_cost or 0),
                        "peak_daily_cost": float(cost_data.peak_daily_cost or 0),
                        "total_transcriptions": int(cost_data.total_transcriptions_period or 0),
                        "avg_cost_per_minute": float(cost_data.avg_cost_per_minute or 0)
                    },
                    "daily_trends": cost_data.daily_trends or [],
                    "cost_by_plan": cost_data.cost_by_plan or [],
                    "optimization_opportunities": {
                        "short_transcriptions_percent": float((optimization_data.short_transcriptions or 0) / max(optimization_data.total_transcriptions or 1, 1) * 100),
                        "small_files_percent": float((optimization_data.small_files or 0) / max(optimization_data.total_transcriptions or 1, 1) * 100),
                        "avg_duration_seconds": float(optimization_data.avg_duration_seconds or 0),
                        "median_duration_seconds": float(optimization_data.median_duration or 0),
                        "cost_from_retries": float(optimization_data.cost_from_retries or 0),
                        "recommendations": self._generate_cost_recommendations(optimization_data, cost_data)
                    }
                }
                
            except Exception as e:
                logger.error(f"Error getting cost analysis: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get cost analysis")
    
    async def get_user_behavior_analytics(self, days_back: int = 30) -> Dict[str, Any]:
        """Get user behavior and engagement analytics."""
        async with self.db.get_session() as session:
            try:
                start_date = date.today() - timedelta(days=days_back)
                
                behavior_query = text("""
                    WITH user_activity AS (
                        SELECT 
                            ut.user_id,
                            u.created_at as user_created_at,
                            COALESCE(s.plan_name, 'free') as plan_name,
                            COUNT(*) as transcription_count,
                            SUM(ut.duration_seconds) as total_duration,
                            MIN(ut.usage_date) as first_usage_date,
                            MAX(ut.usage_date) as last_usage_date,
                            EXTRACT(EPOCH FROM (MAX(ut.usage_date) - MIN(ut.usage_date))) / 86400 as usage_span_days,
                            COUNT(DISTINCT ut.usage_date) as active_days
                        FROM usage_tracking ut
                        JOIN users u ON ut.user_id = u.id
                        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                        WHERE ut.usage_date >= :start_date
                        AND ut.usage_type = 'transcription'
                        GROUP BY ut.user_id, u.created_at, s.plan_name
                    ),
                    activity_segments AS (
                        SELECT 
                            CASE 
                                WHEN transcription_count = 1 THEN 'one_time'
                                WHEN transcription_count <= 5 THEN 'light'
                                WHEN transcription_count <= 15 THEN 'moderate'
                                ELSE 'heavy'
                            END as activity_level,
                            plan_name,
                            COUNT(*) as user_count,
                            AVG(transcription_count) as avg_transcriptions,
                            AVG(active_days) as avg_active_days,
                            AVG(total_duration) as avg_total_duration
                        FROM user_activity
                        GROUP BY 
                            CASE 
                                WHEN transcription_count = 1 THEN 'one_time'
                                WHEN transcription_count <= 5 THEN 'light'
                                WHEN transcription_count <= 15 THEN 'moderate'
                                ELSE 'heavy'
                            END,
                            plan_name
                    )
                    SELECT 
                        json_agg(row_to_json(activity_segments.*)) as activity_segments,
                        COUNT(DISTINCT ua.user_id) as total_active_users,
                        AVG(ua.transcription_count) as avg_transcriptions_per_user,
                        AVG(ua.active_days) as avg_active_days_per_user,
                        COUNT(*) FILTER (WHERE ua.user_created_at >= :start_date) as new_users_activated
                    FROM user_activity ua, activity_segments
                """)
                
                result = await session.execute(behavior_query, {"start_date": start_date})
                behavior_data = result.fetchone()
                
                # Get retention analysis
                retention_query = text("""
                    WITH user_cohorts AS (
                        SELECT 
                            DATE_TRUNC('week', u.created_at)::date as cohort_week,
                            COUNT(*) as cohort_size
                        FROM users u
                        WHERE u.created_at >= :start_date
                        GROUP BY DATE_TRUNC('week', u.created_at)::date
                    ),
                    user_retention AS (
                        SELECT 
                            DATE_TRUNC('week', u.created_at)::date as cohort_week,
                            COUNT(DISTINCT ut.user_id) as retained_users,
                            EXTRACT(WEEK FROM ut.usage_date - u.created_at) as weeks_since_signup
                        FROM users u
                        JOIN usage_tracking ut ON u.id = ut.user_id
                        WHERE u.created_at >= :start_date
                        AND ut.usage_type = 'transcription'
                        GROUP BY DATE_TRUNC('week', u.created_at)::date, 
                                 EXTRACT(WEEK FROM ut.usage_date - u.created_at)
                    )
                    SELECT 
                        json_agg(
                            json_build_object(
                                'cohort_week', cohort_week,
                                'cohort_size', cohort_size,
                                'retention_rate_week_1', 
                                COALESCE(ur1.retained_users::float / cohort_size * 100, 0),
                                'retention_rate_week_4',
                                COALESCE(ur4.retained_users::float / cohort_size * 100, 0)
                            )
                        ) as cohort_analysis
                    FROM user_cohorts uc
                    LEFT JOIN user_retention ur1 ON uc.cohort_week = ur1.cohort_week AND ur1.weeks_since_signup = 1
                    LEFT JOIN user_retention ur4 ON uc.cohort_week = ur4.cohort_week AND ur4.weeks_since_signup = 4
                """)
                
                retention_result = await session.execute(retention_query, {"start_date": start_date})
                retention_data = retention_result.fetchone()
                
                return {
                    "period": {
                        "start_date": start_date.isoformat(),
                        "days": days_back
                    },
                    "summary": {
                        "total_active_users": int(behavior_data.total_active_users or 0),
                        "avg_transcriptions_per_user": float(behavior_data.avg_transcriptions_per_user or 0),
                        "avg_active_days_per_user": float(behavior_data.avg_active_days_per_user or 0),
                        "new_users_activated": int(behavior_data.new_users_activated or 0)
                    },
                    "activity_segments": behavior_data.activity_segments or [],
                    "cohort_analysis": retention_data.cohort_analysis or [],
                    "engagement_insights": self._generate_engagement_insights(behavior_data)
                }
                
            except Exception as e:
                logger.error(f"Error getting user behavior analytics: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to get user behavior analytics")
    
    # Helper methods for analytics queries
    
    async def _get_plan_distribution(self, session: AsyncSession, filter_clause: str, params: Dict) -> Dict[str, int]:
        """Get distribution of users by plan type."""
        query = text(f"""
            SELECT 
                COALESCE(s.plan_name, 'free') as plan_name,
                COUNT(DISTINCT ut.user_id) as user_count
            FROM usage_tracking ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE 1=1 {filter_clause}
            GROUP BY s.plan_name
        """)
        
        result = await session.execute(query, params)
        return {row.plan_name: int(row.user_count) for row in result.fetchall()}
    
    async def _get_usage_by_day(self, session: AsyncSession, filter_clause: str, params: Dict) -> List[Dict]:
        """Get daily usage breakdown."""
        query = text(f"""
            SELECT 
                ut.usage_date::text as date,
                COUNT(DISTINCT ut.user_id) as active_users,
                COUNT(*) as total_events,
                SUM(ut.duration_seconds) / 3600.0 as duration_hours,
                SUM(ut.cost) as cost
            FROM usage_tracking ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE 1=1 {filter_clause}
            GROUP BY ut.usage_date
            ORDER BY ut.usage_date
        """)
        
        result = await session.execute(query, params)
        return [
            {
                "date": row.date,
                "active_users": int(row.active_users),
                "total_events": int(row.total_events),
                "duration_hours": float(row.duration_hours),
                "cost": float(row.cost)
            }
            for row in result.fetchall()
        ]
    
    async def _get_top_users(self, session: AsyncSession, filter_clause: str, params: Dict, limit: int = 10) -> List[Dict]:
        """Get top users by usage."""
        query = text(f"""
            SELECT 
                u.email,
                COALESCE(s.plan_name, 'free') as plan_name,
                COUNT(*) as transcription_count,
                SUM(ut.duration_seconds) / 3600.0 as duration_hours,
                SUM(ut.cost) as total_cost
            FROM usage_tracking ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE 1=1 {filter_clause}
            GROUP BY u.email, s.plan_name
            ORDER BY transcription_count DESC, duration_hours DESC
            LIMIT :limit
        """)
        
        params_with_limit = {**params, "limit": limit}
        result = await session.execute(query, params_with_limit)
        
        return [
            {
                "email": row.email,
                "plan_name": row.plan_name,
                "transcription_count": int(row.transcription_count),
                "duration_hours": float(row.duration_hours),
                "total_cost": float(row.total_cost)
            }
            for row in result.fetchall()
        ]
    
    async def _get_peak_hours(self, session: AsyncSession, filter_clause: str, params: Dict) -> List[int]:
        """Get peak usage hours."""
        query = text(f"""
            SELECT 
                EXTRACT(HOUR FROM ut.created_at) as hour,
                COUNT(*) as usage_count
            FROM usage_tracking ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE 1=1 {filter_clause}
            GROUP BY EXTRACT(HOUR FROM ut.created_at)
            ORDER BY usage_count DESC
            LIMIT 5
        """)
        
        result = await session.execute(query, params)
        return [int(row.hour) for row in result.fetchall()]
    
    async def _get_file_size_distribution(self, session: AsyncSession, filter_clause: str, params: Dict) -> Dict[str, int]:
        """Get file size distribution."""
        query = text(f"""
            SELECT 
                CASE 
                    WHEN ut.file_size_bytes < 1024 * 1024 THEN 'small (<1MB)'
                    WHEN ut.file_size_bytes < 10 * 1024 * 1024 THEN 'medium (1-10MB)'
                    WHEN ut.file_size_bytes < 25 * 1024 * 1024 THEN 'large (10-25MB)'
                    ELSE 'very_large (>25MB)'
                END as size_category,
                COUNT(*) as count
            FROM usage_tracking ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE 1=1 {filter_clause}
            AND ut.file_size_bytes > 0
            GROUP BY 
                CASE 
                    WHEN ut.file_size_bytes < 1024 * 1024 THEN 'small (<1MB)'
                    WHEN ut.file_size_bytes < 10 * 1024 * 1024 THEN 'medium (1-10MB)'
                    WHEN ut.file_size_bytes < 25 * 1024 * 1024 THEN 'large (10-25MB)'
                    ELSE 'very_large (>25MB)'
                END
        """)
        
        result = await session.execute(query, params)
        return {row.size_category: int(row.count) for row in result.fetchall()}
    
    def _empty_analytics_response(self) -> UsageAnalyticsResponse:
        """Return empty analytics response."""
        return UsageAnalyticsResponse(
            total_users=0,
            active_users=0,
            total_transcriptions=0,
            total_duration_hours=0.0,
            total_cost=Decimal('0'),
            average_cost_per_user=Decimal('0'),
            plan_distribution={},
            usage_by_day=[],
            top_users=[],
            peak_hours=[],
            file_size_distribution={}
        )
    
    def _generate_cost_recommendations(self, optimization_data, cost_data) -> List[str]:
        """Generate cost optimization recommendations."""
        recommendations = []
        
        if optimization_data.short_transcriptions / max(optimization_data.total_transcriptions, 1) > 0.3:
            recommendations.append("Consider implementing minimum billing duration to optimize costs for short transcriptions")
        
        if optimization_data.cost_from_retries > 0:
            recommendations.append("Investigate retry causes to reduce processing costs from failed jobs")
        
        if optimization_data.avg_duration_seconds > 1800:  # 30 minutes
            recommendations.append("Consider implementing file size limits to manage processing costs")
        
        return recommendations
    
    def _generate_engagement_insights(self, behavior_data) -> List[str]:
        """Generate user engagement insights."""
        insights = []
        
        avg_transcriptions = float(behavior_data.avg_transcriptions_per_user or 0)
        avg_active_days = float(behavior_data.avg_active_days_per_user or 0)
        
        if avg_transcriptions < 2:
            insights.append("Low average transcriptions per user suggests need for better onboarding")
        
        if avg_active_days < 3:
            insights.append("Users are active for few days - consider retention campaigns")
        
        if behavior_data.new_users_activated and behavior_data.total_active_users:
            activation_rate = behavior_data.new_users_activated / behavior_data.total_active_users
            if activation_rate > 0.5:
                insights.append("High new user activation rate indicates strong product-market fit")
        
        return insights


# Global instance
usage_analytics_service = UsageAnalyticsService()
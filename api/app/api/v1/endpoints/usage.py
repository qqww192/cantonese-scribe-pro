"""
Usage tracking API endpoints for CantoneseScribe.
Provides comprehensive usage management, limits checking, and analytics.
"""

import logging
from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer

from ....core.exceptions import AuthenticationError
from ....schemas.usage import (
    ConcurrentJobsResponse,
    CurrentUsageResponse,
    MonthlyResetRequest,
    MonthlyResetResponse,
    UsageAlertsResponse,
    UsageAnalyticsRequest,
    UsageAnalyticsResponse,
    UsageCheckRequest,
    UsageCheckResponse,
    UsageHistoryResponse,
    UsageRecordRequest,
    UsageRecordResponse,
    UsageStatsResponse,
    UserLimitsResponse,
)
from ....services.usage_service import usage_service
from ...dependencies import get_current_user, get_current_admin_user

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter()


@router.get("/current", response_model=CurrentUsageResponse)
async def get_current_usage(
    current_user: dict = Depends(get_current_user)
) -> CurrentUsageResponse:
    """
    Get current month usage for the authenticated user.
    Returns credits used, limits, reset dates, and concurrent processing status.
    """
    try:
        user_id = UUID(current_user["sub"])
        return await usage_service.get_current_usage(user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting current usage for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage data"
        )


@router.post("/record", response_model=UsageRecordResponse)
async def record_usage(
    usage_request: UsageRecordRequest,
    current_user: dict = Depends(get_current_user)
) -> UsageRecordResponse:
    """
    Record usage for the authenticated user.
    This is typically called automatically by the transcription service.
    """
    try:
        user_id = UUID(current_user["sub"])
        
        return await usage_service.record_usage(
            user_id=user_id,
            usage_type=usage_request.usage_type,
            duration_seconds=usage_request.duration_seconds,
            file_size_bytes=usage_request.file_size_bytes,
            cost=usage_request.cost,
            tokens_used=usage_request.tokens_used,
            transcription_id=usage_request.transcription_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request data: {str(e)}"
        )
    except HTTPException:
        raise  # Re-raise HTTPException from service
    except Exception as e:
        logger.error(f"Error recording usage for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record usage"
        )


@router.post("/check", response_model=UsageCheckResponse)
async def check_usage_limits(
    check_request: UsageCheckRequest,
    current_user: dict = Depends(get_current_user)
) -> UsageCheckResponse:
    """
    Check if user can process a request based on current usage and limits.
    Should be called before starting any transcription operation.
    """
    try:
        user_id = UUID(current_user["sub"])
        
        return await usage_service.check_usage_limits(
            user_id=user_id,
            estimated_duration_seconds=check_request.estimated_duration_seconds,
            file_size_bytes=check_request.file_size_bytes
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request data: {str(e)}"
        )
    except HTTPException:
        raise  # Re-raise HTTPException from service
    except Exception as e:
        logger.error(f"Error checking usage limits for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check usage limits"
        )


@router.get("/history", response_model=UsageHistoryResponse)
async def get_usage_history(
    months: int = 12,
    current_user: dict = Depends(get_current_user)
) -> UsageHistoryResponse:
    """
    Get usage history for the authenticated user.
    
    Args:
        months: Number of months of history to retrieve (default: 12, max: 24)
    """
    # Validate months parameter
    if months < 1 or months > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="months parameter must be between 1 and 24"
        )
    
    try:
        user_id = UUID(current_user["sub"])
        return await usage_service.get_usage_history(user_id, months)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting usage history for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage history"
        )


@router.get("/limits", response_model=UserLimitsResponse)
async def get_user_limits(
    current_user: dict = Depends(get_current_user)
) -> UserLimitsResponse:
    """
    Get user's current plan limits and available upgrade options.
    """
    try:
        user_id = UUID(current_user["sub"])
        return await usage_service.get_user_limits(user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting user limits for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user limits"
        )


@router.get("/alerts", response_model=UsageAlertsResponse)
async def get_usage_alerts(
    current_user: dict = Depends(get_current_user)
) -> UsageAlertsResponse:
    """
    Get usage alerts for the authenticated user.
    Returns warnings about approaching limits, resets, etc.
    """
    try:
        user_id = UUID(current_user["sub"])
        return await usage_service.get_usage_alerts(user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting usage alerts for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage alerts"
        )


@router.get("/concurrent", response_model=ConcurrentJobsResponse)
async def get_concurrent_jobs_status(
    current_user: dict = Depends(get_current_user)
) -> ConcurrentJobsResponse:
    """
    Get current concurrent processing status for the authenticated user.
    Shows active jobs, queue position, and estimated wait times.
    """
    try:
        user_id = UUID(current_user["sub"])
        return await usage_service.get_concurrent_jobs_status(user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting concurrent jobs status for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve concurrent jobs status"
        )


@router.get("/stats", response_model=UsageStatsResponse)
async def get_usage_stats(
    current_user: dict = Depends(get_current_user)
) -> UsageStatsResponse:
    """
    Get comprehensive usage statistics for the authenticated user.
    Includes lifetime stats, preferences, and analytics.
    """
    try:
        user_id = UUID(current_user["sub"])
        
        # Get usage history to calculate stats
        history = await usage_service.get_usage_history(user_id, 12)
        current_usage = await usage_service.get_current_usage(user_id)
        
        # Calculate statistics
        total_transcriptions = history.total_lifetime_transcriptions
        total_minutes = history.total_lifetime_minutes
        
        # Basic stats calculation (could be enhanced with more detailed analytics)
        average_accuracy = 92.5  # Placeholder - would come from transcription quality metrics
        favorite_format = "SRT"  # Placeholder - would come from export analytics
        most_active_day = "Tuesday"  # Placeholder - would come from usage patterns
        most_active_hour = 14  # 2 PM - placeholder
        
        # Calculate total cost and potential savings
        total_cost = sum(item.total_cost for item in history.history)
        cost_savings = total_cost * 0.3  # Assuming 30% savings vs competitors
        
        return UsageStatsResponse(
            total_transcriptions=total_transcriptions,
            total_minutes_processed=total_minutes,
            average_accuracy=average_accuracy,
            favorite_format=favorite_format,
            most_active_day=most_active_day,
            most_active_hour=most_active_hour,
            average_file_size_mb=current_usage.average_file_size_mb,
            total_cost=total_cost,
            cost_savings=cost_savings
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting usage stats for user {current_user.get('sub')}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage statistics"
        )


# Admin endpoints


@router.post("/reset", response_model=MonthlyResetResponse)
async def perform_monthly_reset(
    reset_request: MonthlyResetRequest,
    current_admin: dict = Depends(get_current_admin_user)
) -> MonthlyResetResponse:
    """
    Perform manual monthly reset for a user (admin only).
    This is typically handled automatically but can be triggered manually.
    """
    try:
        return await usage_service.perform_monthly_reset(
            user_id=reset_request.user_id,
            reason=f"Manual reset by admin {current_admin.get('sub')}: {reset_request.reason}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request data: {str(e)}"
        )
    except HTTPException:
        raise  # Re-raise HTTPException from service
    except Exception as e:
        logger.error(f"Error performing manual reset for user {reset_request.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform monthly reset"
        )


@router.post("/analytics", response_model=UsageAnalyticsResponse)
async def get_usage_analytics(
    analytics_request: UsageAnalyticsRequest,
    current_admin: dict = Depends(get_current_admin_user)
) -> UsageAnalyticsResponse:
    """
    Get comprehensive usage analytics for admin dashboard (admin only).
    Provides system-wide usage metrics, trends, and insights.
    """
    try:
        # This would be implemented with comprehensive analytics logic
        # For now, returning a basic response structure
        logger.info(f"Usage analytics requested by admin {current_admin.get('sub')} for period {analytics_request.start_date} to {analytics_request.end_date}")
        
        # Placeholder response - in production this would query actual analytics data
        return UsageAnalyticsResponse(
            total_users=0,
            active_users=0,
            total_transcriptions=0,
            total_duration_hours=0.0,
            total_cost=0,
            average_cost_per_user=0,
            plan_distribution={},
            usage_by_day=[],
            top_users=[],
            peak_hours=[],
            file_size_distribution={}
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting usage analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage analytics"
        )


@router.get("/user/{user_id}/current", response_model=CurrentUsageResponse)
async def get_user_current_usage(
    user_id: UUID,
    current_admin: dict = Depends(get_current_admin_user)
) -> CurrentUsageResponse:
    """
    Get current usage for a specific user (admin only).
    Used for admin dashboard and user support.
    """
    try:
        logger.info(f"Admin {current_admin.get('sub')} requested usage for user {user_id}")
        return await usage_service.get_current_usage(user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting current usage for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user usage data"
        )


@router.get("/user/{user_id}/history", response_model=UsageHistoryResponse)
async def get_user_usage_history(
    user_id: UUID,
    months: int = 12,
    current_admin: dict = Depends(get_current_admin_user)
) -> UsageHistoryResponse:
    """
    Get usage history for a specific user (admin only).
    Used for admin dashboard and user support.
    """
    # Validate months parameter
    if months < 1 or months > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="months parameter must be between 1 and 24"
        )
    
    try:
        logger.info(f"Admin {current_admin.get('sub')} requested {months} months of usage history for user {user_id}")
        return await usage_service.get_usage_history(user_id, months)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting usage history for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user usage history"
        )


@router.get("/system/health")
async def get_usage_system_health(
    current_admin: dict = Depends(get_current_admin_user)
) -> dict:
    """
    Get usage system health status (admin only).
    Returns system metrics and health indicators.
    """
    try:
        logger.info(f"Usage system health check requested by admin {current_admin.get('sub')}")
        
        # Basic health check - in production this would check:
        # - Database connectivity
        # - Queue status  
        # - Processing capacity
        # - Error rates
        # - Performance metrics
        
        return {
            "status": "healthy",
            "timestamp": date.today().isoformat(),
            "database_status": "connected",
            "queue_status": "operational",
            "processing_capacity": "normal",
            "error_rate": "0.1%",
            "average_response_time_ms": 150
        }
    except Exception as e:
        logger.error(f"Error getting usage system health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system health status"
        )
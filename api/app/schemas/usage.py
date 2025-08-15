"""
Usage tracking schemas for request/response validation.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field, validator


class UsageType:
    """Constants for usage types."""
    TRANSCRIPTION = "transcription"
    EXPORT = "export"
    API_CALL = "api_call"


class PlanType:
    """Constants for subscription plan types."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UsageRecordRequest(BaseModel):
    """Request schema for recording usage."""
    usage_type: str = Field(..., description="Type of usage being recorded")
    duration_seconds: int = Field(0, ge=0, description="Duration in seconds for transcription")
    file_size_bytes: int = Field(0, ge=0, description="File size in bytes")
    cost: Decimal = Field(Decimal('0'), ge=0, description="Cost incurred for this usage")
    tokens_used: int = Field(0, ge=0, description="Number of API tokens used")
    transcription_id: Optional[UUID] = Field(None, description="Associated transcription ID")
    
    @validator('usage_type')
    def validate_usage_type(cls, v):
        allowed_types = [UsageType.TRANSCRIPTION, UsageType.EXPORT, UsageType.API_CALL]
        if v not in allowed_types:
            raise ValueError(f"usage_type must be one of: {allowed_types}")
        return v


class UsageRecordResponse(BaseModel):
    """Response schema for usage recording."""
    id: UUID
    user_id: UUID
    usage_type: str
    duration_seconds: int
    file_size_bytes: int
    cost: Decimal
    tokens_used: int
    usage_date: date
    usage_month: str
    billing_period_start: Optional[date]
    billing_period_end: Optional[date]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CurrentUsageResponse(BaseModel):
    """Response schema for current month usage."""
    credits_used: int = Field(..., description="Credits used this billing period")
    credits_total: int = Field(..., description="Total credits available")
    current_month: str = Field(..., description="Current billing month (YYYY-MM)")
    reset_date: str = Field(..., description="Next reset date (ISO format)")
    days_until_reset: int = Field(..., description="Days until next reset")
    is_near_limit: bool = Field(..., description="Whether user is near limit (80%+)")
    is_at_limit: bool = Field(..., description="Whether user has reached limit")
    concurrent_processing: int = Field(0, description="Current concurrent processing jobs")
    max_concurrent: int = Field(1, description="Maximum allowed concurrent jobs")
    
    # Additional usage breakdown
    transcription_count: int = Field(0, description="Number of transcriptions this period")
    total_duration_minutes: int = Field(0, description="Total minutes processed")
    total_cost: Decimal = Field(Decimal('0'), description="Total cost incurred")
    average_file_size_mb: float = Field(0.0, description="Average file size in MB")


class UsageHistoryItem(BaseModel):
    """Schema for usage history item."""
    month: str = Field(..., description="Month in YYYY-MM format")
    credits_used: int = Field(..., description="Credits used in this month")
    credits_total: int = Field(..., description="Total credits available for this month")
    utilization_rate: float = Field(..., description="Usage percentage (0-100)")
    transcription_count: int = Field(0, description="Number of transcriptions")
    total_duration_minutes: int = Field(0, description="Total minutes processed")
    total_cost: Decimal = Field(Decimal('0'), description="Total cost incurred")


class UsageHistoryResponse(BaseModel):
    """Response schema for usage history."""
    history: List[UsageHistoryItem] = Field(..., description="Usage history by month")
    total_lifetime_credits: int = Field(..., description="Total credits used lifetime")
    total_lifetime_transcriptions: int = Field(..., description="Total transcriptions lifetime")
    total_lifetime_minutes: int = Field(..., description="Total minutes processed lifetime")
    account_age_days: int = Field(..., description="Days since account creation")


class PlanLimits(BaseModel):
    """Schema for plan limits and features."""
    plan_name: str = Field(..., description="Name of the plan")
    credits_per_month: int = Field(..., description="Monthly credit allocation")
    max_file_size_mb: int = Field(..., description="Maximum file size in MB")
    max_concurrent_jobs: int = Field(..., description="Maximum concurrent processing jobs")
    features: List[str] = Field(..., description="List of available features")
    cost_per_credit: Decimal = Field(Decimal('0'), description="Cost per credit for overage")
    allows_overage: bool = Field(False, description="Whether overage is allowed")


class UserLimitsResponse(BaseModel):
    """Response schema for user's current plan limits."""
    current_plan: PlanLimits
    subscription_status: str = Field(..., description="Current subscription status")
    billing_cycle: str = Field(..., description="Billing cycle (monthly/yearly)")
    next_billing_date: Optional[datetime] = Field(None, description="Next billing date")
    can_upgrade: bool = Field(True, description="Whether user can upgrade")
    upgrade_options: List[PlanLimits] = Field([], description="Available upgrade options")


class UsageCheckRequest(BaseModel):
    """Request schema for checking if user can process."""
    estimated_duration_seconds: int = Field(..., ge=1, description="Estimated processing duration")
    file_size_bytes: int = Field(..., ge=1, description="File size in bytes")
    
    @validator('file_size_bytes')
    def validate_file_size(cls, v):
        max_size = 25 * 1024 * 1024  # 25MB for free tier
        if v > max_size:
            raise ValueError(f"File size {v} bytes exceeds maximum of {max_size} bytes")
        return v


class UsageCheckResponse(BaseModel):
    """Response schema for usage check."""
    can_process: bool = Field(..., description="Whether user can process this request")
    credits_required: int = Field(..., description="Credits required for this operation")
    credits_available: int = Field(..., description="Credits currently available")
    credits_after: int = Field(..., description="Credits remaining after operation")
    estimated_cost: Decimal = Field(Decimal('0'), description="Estimated cost")
    blocking_reason: Optional[str] = Field(None, description="Reason if cannot process")
    warnings: List[str] = Field([], description="Any warnings about the operation")
    
    # Concurrency check
    can_process_concurrent: bool = Field(..., description="Whether concurrent slot is available")
    current_concurrent_jobs: int = Field(0, description="Current concurrent jobs")
    max_concurrent_jobs: int = Field(1, description="Maximum allowed concurrent jobs")


class UsageStatsResponse(BaseModel):
    """Response schema for usage statistics."""
    total_transcriptions: int = Field(..., description="Total transcriptions ever")
    total_minutes_processed: int = Field(..., description="Total minutes processed")
    average_accuracy: float = Field(..., description="Average transcription accuracy")
    favorite_format: str = Field(..., description="Most used export format")
    most_active_day: str = Field(..., description="Day of week with most activity")
    most_active_hour: int = Field(..., description="Hour of day with most activity (0-23)")
    average_file_size_mb: float = Field(..., description="Average file size in MB")
    total_cost: Decimal = Field(Decimal('0'), description="Total cost incurred")
    cost_savings: Decimal = Field(Decimal('0'), description="Estimated cost savings vs competitors")


class UsageAlert(BaseModel):
    """Schema for usage alerts."""
    id: str = Field(..., description="Alert ID")
    type: str = Field(..., description="Alert type: warning, limit_reached, reset_soon")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    action_text: Optional[str] = Field(None, description="Action button text")
    action_url: Optional[str] = Field(None, description="Action URL")
    dismissible: bool = Field(True, description="Whether alert can be dismissed")
    priority: str = Field("medium", description="Alert priority: low, medium, high")
    created_at: datetime = Field(..., description="When alert was created")
    expires_at: Optional[datetime] = Field(None, description="When alert expires")


class UsageAlertsResponse(BaseModel):
    """Response schema for usage alerts."""
    alerts: List[UsageAlert] = Field(..., description="List of active alerts")
    has_critical: bool = Field(False, description="Whether any critical alerts exist")
    next_check_in_hours: int = Field(24, description="Hours until next alert check")


class MonthlyResetRequest(BaseModel):
    """Request schema for manual monthly reset (admin only)."""
    user_id: UUID = Field(..., description="User ID to reset")
    reset_date: date = Field(..., description="Effective reset date")
    reason: str = Field(..., description="Reason for manual reset")


class MonthlyResetResponse(BaseModel):
    """Response schema for monthly reset."""
    user_id: UUID
    previous_credits_used: int
    new_credits_available: int
    reset_date: date
    next_reset_date: date
    billing_period_start: date
    billing_period_end: date
    reset_successful: bool
    reset_reason: Optional[str] = None


class ConcurrentJobsResponse(BaseModel):
    """Response schema for concurrent jobs status."""
    user_id: UUID
    current_jobs: int = Field(..., description="Currently running jobs")
    max_jobs: int = Field(..., description="Maximum allowed concurrent jobs")
    available_slots: int = Field(..., description="Available processing slots")
    queue_position: Optional[int] = Field(None, description="Position in queue if at limit")
    estimated_wait_time_seconds: Optional[int] = Field(None, description="Estimated wait time")
    active_job_ids: List[UUID] = Field([], description="IDs of currently active jobs")


class UsageAnalyticsRequest(BaseModel):
    """Request schema for usage analytics (admin)."""
    start_date: date = Field(..., description="Start date for analytics")
    end_date: date = Field(..., description="End date for analytics")
    user_id: Optional[UUID] = Field(None, description="Specific user ID (optional)")
    plan_type: Optional[str] = Field(None, description="Filter by plan type")
    usage_type: Optional[str] = Field(None, description="Filter by usage type")
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError("end_date must be after start_date")
        return v


class UsageAnalyticsResponse(BaseModel):
    """Response schema for usage analytics."""
    total_users: int = Field(..., description="Total users in period")
    active_users: int = Field(..., description="Active users in period")
    total_transcriptions: int = Field(..., description="Total transcriptions")
    total_duration_hours: float = Field(..., description="Total duration in hours")
    total_cost: Decimal = Field(Decimal('0'), description="Total cost")
    average_cost_per_user: Decimal = Field(Decimal('0'), description="Average cost per user")
    plan_distribution: Dict[str, int] = Field({}, description="Users by plan type")
    usage_by_day: List[Dict[str, Union[str, int, float]]] = Field([], description="Daily usage breakdown")
    top_users: List[Dict[str, Union[str, int, float]]] = Field([], description="Top users by usage")
    peak_hours: List[int] = Field([], description="Peak usage hours (0-23)")
    file_size_distribution: Dict[str, int] = Field({}, description="File size distribution")
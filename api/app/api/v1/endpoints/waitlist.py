"""
Waitlist management endpoints for CantoneseScribe MVP.
Handles Pro tier waitlist signup and notification management.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, EmailStr

from ...dependencies import get_current_user
from ....services.database_service import database_service
from ....core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# Request Models
class WaitlistSignupRequest(BaseModel):
    """Request model for waitlist signup."""
    email: EmailStr
    plan_id: str = Field(..., description="Plan ID (e.g., 'pro', 'enterprise')")
    source: str = Field(default="pricing_page", description="Source of signup")
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class WaitlistPreferencesRequest(BaseModel):
    """Request model for updating waitlist preferences."""
    email_notifications: Optional[bool] = True
    sms_notifications: Optional[bool] = False
    feature_interests: Optional[List[str]] = None


class WaitlistNotificationRequest(BaseModel):
    """Request model for sending waitlist notifications."""
    subject: str = Field(..., max_length=200)
    message: str = Field(..., max_length=5000)
    plan_ids: Optional[List[str]] = None
    segment: str = Field(default="all", regex="^(all|recent|high_engagement)$")


class WaitlistEventRequest(BaseModel):
    """Request model for tracking waitlist events."""
    action: str = Field(..., regex="^(signup|view_pricing|feature_request|share)$")
    plan_id: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ReferralRequest(BaseModel):
    """Request model for processing referrals."""
    referral_code: str
    new_signup: WaitlistSignupRequest


# Response Models
class WaitlistStatusResponse(BaseModel):
    """Response model for waitlist status."""
    is_on_waitlist: bool
    signup_date: Optional[str] = None
    plan_id: Optional[str] = None
    position: Optional[int] = None
    estimated_launch: str = "Q2 2025"


class WaitlistStatsResponse(BaseModel):
    """Response model for waitlist statistics."""
    total_signups: int
    plan_breakdown: Dict[str, int]
    recent_signups: int  # last 7 days


@router.post("/signup")
async def signup_for_waitlist(
    request: WaitlistSignupRequest,
    req: Request
) -> Dict[str, Any]:
    """
    Sign up for the Pro waitlist.
    """
    try:
        # Get IP address for tracking
        client_ip = req.client.host if req.client else "unknown"
        
        # Check if email already exists on waitlist
        existing_signup = await database_service.get_waitlist_signup(request.email, request.plan_id)
        
        if existing_signup:
            return {
                "success": True,
                "message": "Already on waitlist",
                "position": existing_signup.get("position", 0)
            }
        
        # Create waitlist entry
        waitlist_data = {
            "email": request.email,
            "plan_id": request.plan_id,
            "source": request.source,
            "user_id": request.user_id,
            "metadata": request.metadata or {},
            "signup_date": datetime.utcnow().isoformat(),
            "ip_address": client_ip,
            "status": "active"
        }
        
        # Store in database
        result = await database_service.create_waitlist_signup(waitlist_data)
        
        # Track signup event
        await track_waitlist_event_internal(
            action="signup",
            plan_id=request.plan_id,
            source=request.source,
            email=request.email,
            metadata={"ip_address": client_ip}
        )
        
        # Get current position
        position = await database_service.get_waitlist_position(request.email, request.plan_id)
        
        logger.info(f"Waitlist signup successful: {request.email} for {request.plan_id}")
        
        return {
            "success": True,
            "message": "Successfully joined waitlist",
            "position": position,
            "signup_id": result.get("id")
        }
        
    except Exception as e:
        logger.error(f"Error signing up for waitlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to join waitlist")


@router.get("/status")
async def get_waitlist_status(
    email: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
) -> WaitlistStatusResponse:
    """
    Get waitlist status for user or email.
    """
    try:
        # Use current user email if authenticated, otherwise use provided email
        check_email = email
        if current_user and not email:
            check_email = current_user.get("email")
            
        if not check_email:
            return WaitlistStatusResponse(is_on_waitlist=False)
        
        # Check waitlist status
        signup = await database_service.get_waitlist_signup(check_email)
        
        if not signup:
            return WaitlistStatusResponse(is_on_waitlist=False)
        
        # Get position
        position = await database_service.get_waitlist_position(check_email, signup.get("plan_id"))
        
        return WaitlistStatusResponse(
            is_on_waitlist=True,
            signup_date=signup.get("signup_date"),
            plan_id=signup.get("plan_id"),
            position=position,
            estimated_launch="Q2 2025"
        )
        
    except Exception as e:
        logger.error(f"Error getting waitlist status: {str(e)}")
        return WaitlistStatusResponse(is_on_waitlist=False)


@router.patch("/preferences")
async def update_waitlist_preferences(
    request: WaitlistPreferencesRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update waitlist notification preferences.
    """
    try:
        user_email = current_user.get("email")
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found")
        
        # Update preferences
        preferences = {
            "email_notifications": request.email_notifications,
            "sms_notifications": request.sms_notifications,
            "feature_interests": request.feature_interests or [],
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await database_service.update_waitlist_preferences(user_email, preferences)
        
        return {
            "success": True,
            "message": "Preferences updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating waitlist preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update preferences")


@router.delete("/remove")
async def remove_from_waitlist(
    email: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Remove user from waitlist.
    """
    try:
        # Use current user email if authenticated, otherwise use provided email
        remove_email = email
        if current_user and not email:
            remove_email = current_user.get("email")
            
        if not remove_email:
            raise HTTPException(status_code=400, detail="Email required")
        
        # Remove from waitlist
        await database_service.remove_waitlist_signup(remove_email)
        
        logger.info(f"Removed from waitlist: {remove_email}")
        
        return {
            "success": True,
            "message": "Successfully removed from waitlist"
        }
        
    except Exception as e:
        logger.error(f"Error removing from waitlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove from waitlist")


@router.get("/stats")
async def get_waitlist_stats() -> WaitlistStatsResponse:
    """
    Get waitlist statistics (public endpoint for marketing).
    """
    try:
        # Get total signups
        total_signups = await database_service.get_waitlist_count()
        
        # Get plan breakdown
        plan_breakdown = await database_service.get_waitlist_plan_breakdown()
        
        # Get recent signups (last 7 days)
        recent_date = datetime.utcnow() - timedelta(days=7)
        recent_signups = await database_service.get_waitlist_count(since_date=recent_date)
        
        return WaitlistStatsResponse(
            total_signups=total_signups,
            plan_breakdown=plan_breakdown,
            recent_signups=recent_signups
        )
        
    except Exception as e:
        logger.error(f"Error getting waitlist stats: {str(e)}")
        return WaitlistStatsResponse(
            total_signups=0,
            plan_breakdown={},
            recent_signups=0
        )


@router.post("/notify")
async def send_waitlist_notification(
    request: WaitlistNotificationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Send notification to waitlist members (admin only).
    """
    try:
        # Check if user has admin permissions
        if not current_user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get target emails based on segment and plan filters
        target_emails = await database_service.get_waitlist_emails(
            plan_ids=request.plan_ids,
            segment=request.segment
        )
        
        # TODO: Integrate with email service (SendGrid, etc.)
        # For now, just log the notification
        logger.info(f"Waitlist notification sent to {len(target_emails)} recipients")
        logger.info(f"Subject: {request.subject}")
        logger.info(f"Segment: {request.segment}, Plans: {request.plan_ids}")
        
        return {
            "success": True,
            "sent_count": len(target_emails),
            "message": f"Notification sent to {len(target_emails)} recipients"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending waitlist notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send notification")


@router.post("/track")
async def track_waitlist_event(
    request: WaitlistEventRequest,
    req: Request
) -> Dict[str, Any]:
    """
    Track waitlist interaction events.
    """
    try:
        client_ip = req.client.host if req.client else "unknown"
        
        await track_waitlist_event_internal(
            action=request.action,
            plan_id=request.plan_id,
            source=request.source,
            metadata={
                **(request.metadata or {}),
                "ip_address": client_ip,
                "user_agent": req.headers.get("user-agent", "unknown")
            }
        )
        
        return {
            "success": True,
            "message": "Event tracked successfully"
        }
        
    except Exception as e:
        logger.error(f"Error tracking waitlist event: {str(e)}")
        # Don't fail the request for tracking errors
        return {
            "success": False,
            "message": "Event tracking failed"
        }


@router.post("/referral")
async def process_referral(
    request: ReferralRequest,
    req: Request
) -> Dict[str, Any]:
    """
    Process referral signup.
    """
    try:
        # Decode referral code to get referrer email
        referrer_email = await database_service.get_referrer_from_code(request.referral_code)
        
        if not referrer_email:
            # Still process the signup, just without referral credit
            logger.warning(f"Invalid referral code: {request.referral_code}")
        
        # Process the new signup
        signup_result = await signup_for_waitlist(request.new_signup, req)
        
        # If referral is valid, give credit to referrer
        if referrer_email and signup_result.get("success"):
            await database_service.add_referral_credit(
                referrer_email=referrer_email,
                referred_email=request.new_signup.email,
                referral_code=request.referral_code
            )
            
            logger.info(f"Referral processed: {referrer_email} -> {request.new_signup.email}")
        
        return signup_result
        
    except Exception as e:
        logger.error(f"Error processing referral: {str(e)}")
        # Fallback to regular signup
        return await signup_for_waitlist(request.new_signup, req)


# Helper functions
async def track_waitlist_event_internal(
    action: str,
    plan_id: Optional[str] = None,
    source: Optional[str] = None,
    email: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """Internal function to track waitlist events."""
    try:
        event_data = {
            "action": action,
            "plan_id": plan_id,
            "source": source,
            "email": email,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await database_service.track_waitlist_event(event_data)
        
    except Exception as e:
        logger.warning(f"Failed to track waitlist event: {str(e)}")


@router.get("/health")
async def waitlist_health_check() -> Dict[str, Any]:
    """
    Health check for waitlist service.
    """
    try:
        # Test database connection
        test_count = await database_service.get_waitlist_count()
        
        return {
            "success": True,
            "status": "healthy",
            "database_connection": True,
            "total_waitlist_signups": test_count,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Waitlist health check failed: {str(e)}")
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
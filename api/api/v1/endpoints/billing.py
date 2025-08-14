"""
Billing and subscription management endpoints.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from api.dependencies import get_current_user
from services.billing_service import BillingService, get_billing_service, UsageTier
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


class CreateCustomerRequest(BaseModel):
    """Request model for creating a customer."""
    name: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class CreateSubscriptionRequest(BaseModel):
    """Request model for creating a subscription."""
    price_id: str = Field(..., description="Stripe price ID")
    trial_period_days: Optional[int] = Field(None, ge=0, le=30)


class UsageReportRequest(BaseModel):
    """Request model for usage report."""
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")


class CostEstimateRequest(BaseModel):
    """Request model for cost estimation."""
    duration_minutes: float = Field(..., gt=0, description="Duration in minutes")


@router.post("/customer", response_model=dict)
async def create_customer(
    request: CreateCustomerRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Create a Stripe customer for the current user.
    """
    try:
        result = await billing_svc.create_customer(
            user_id=current_user["id"],
            email=current_user["email"],
            name=request.name or current_user.get("full_name"),
            metadata=request.metadata
        )
        
        return {
            "success": True,
            "customer": result
        }
        
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create customer")


@router.get("/customer", response_model=dict)
async def get_customer(
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Get customer information for the current user.
    """
    try:
        customer = await billing_svc.get_customer(current_user["id"])
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {
            "success": True,
            "customer": customer
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get customer")


@router.post("/subscription", response_model=dict)
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Create a new subscription for the current user.
    """
    try:
        result = await billing_svc.create_subscription(
            user_id=current_user["id"],
            price_id=request.price_id,
            trial_period_days=request.trial_period_days
        )
        
        return {
            "success": True,
            "subscription": result
        }
        
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create subscription")


@router.delete("/subscription", response_model=dict)
async def cancel_subscription(
    at_period_end: bool = True,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Cancel the current user's subscription.
    """
    try:
        result = await billing_svc.cancel_subscription(
            user_id=current_user["id"],
            at_period_end=at_period_end
        )
        
        return {
            "success": True,
            "subscription": result
        }
        
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@router.get("/usage", response_model=dict)
async def get_usage_status(
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Get current usage status and limits for the user.
    """
    try:
        can_use, usage_info = await billing_svc.check_usage_limits(current_user["id"])
        
        return {
            "success": True,
            "can_use": can_use,
            "usage": usage_info
        }
        
    except Exception as e:
        logger.error(f"Error getting usage status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get usage status")


@router.post("/usage/report", response_model=dict)
async def get_usage_report(
    request: UsageReportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Get detailed usage report for the specified period.
    """
    try:
        start_date = None
        end_date = None
        
        if request.start_date:
            start_date = datetime.fromisoformat(request.start_date)
        
        if request.end_date:
            end_date = datetime.fromisoformat(request.end_date)
        
        report = await billing_svc.get_usage_report(
            user_id=current_user["id"],
            start_date=start_date,
            end_date=end_date
        )
        
        return {
            "success": True,
            "report": report
        }
        
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting usage report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get usage report")


@router.post("/estimate", response_model=dict)
async def estimate_cost(
    request: CostEstimateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Estimate cost for transcription of specified duration.
    """
    try:
        estimate = await billing_svc.estimate_cost(
            user_id=current_user["id"],
            duration_minutes=request.duration_minutes
        )
        
        return {
            "success": True,
            "estimate": estimate
        }
        
    except Exception as e:
        logger.error(f"Error estimating cost: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to estimate cost")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Handle Stripe webhook events.
    
    This endpoint processes various Stripe events like subscription updates,
    payment status changes, etc.
    """
    try:
        # Get raw request body and signature
        payload = await request.body()
        signature = request.headers.get("stripe-signature")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing signature header")
        
        # Process webhook
        result = await billing_svc.process_webhook(payload, signature)
        
        return {
            "success": True,
            "processed": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/tiers", response_model=dict)
async def get_pricing_tiers():
    """
    Get available pricing tiers and their limits.
    """
    try:
        return {
            "success": True,
            "tiers": {
                "free": {
                    "name": "Free",
                    "monthly_minutes": 60,
                    "price_per_minute": 0.0,
                    "features": [
                        "60 minutes per month",
                        "Basic transcription",
                        "Standard quality"
                    ]
                },
                "starter": {
                    "name": "Starter",
                    "monthly_minutes": 600,
                    "price_per_minute": 0.10,
                    "features": [
                        "10 hours per month",
                        "High-quality transcription",
                        "Multiple formats",
                        "Email support"
                    ]
                },
                "professional": {
                    "name": "Professional", 
                    "monthly_minutes": 3600,
                    "price_per_minute": 0.08,
                    "features": [
                        "60 hours per month",
                        "Premium transcription",
                        "All export formats",
                        "Priority support",
                        "API access"
                    ]
                },
                "enterprise": {
                    "name": "Enterprise",
                    "monthly_minutes": 36000,
                    "price_per_minute": 0.06,
                    "features": [
                        "600 hours per month",
                        "Enterprise features",
                        "Custom integration",
                        "Dedicated support",
                        "SLA guarantee"
                    ]
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting pricing tiers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get pricing information")


@router.get("/health", response_model=dict)
async def billing_health_check(
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Health check for billing service.
    """
    try:
        # Simple health check - verify Stripe configuration
        import stripe
        
        health_status = {
            "status": "healthy",
            "stripe_configured": bool(stripe.api_key),
            "webhook_configured": bool(billing_svc._settings.stripe_webhook_secret),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "success": True,
            "health": health_status
        }
        
    except Exception as e:
        logger.error(f"Billing health check failed: {str(e)}")
        return {
            "success": False,
            "health": {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
"""
Payment endpoints that match the frontend payment service API expectations.
These endpoints provide the specific API interface expected by the frontend.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ...dependencies import get_current_user
from ....services.billing_service import BillingService, get_billing_service, UsageTier
from ....core.logging import get_logger
from ....core.exceptions import ValidationError, ExternalAPIError

logger = get_logger(__name__)
router = APIRouter()


# Response Models
class SubscriptionPlan(BaseModel):
    """Subscription plan model for frontend."""
    id: str
    name: str
    description: str
    price: int  # in cents
    currency: str = "usd"
    billing_period: str  # "monthly" or "yearly"
    credits_included: int
    features: List[str]
    popular: bool = False
    stripe_price_id: str


class Subscription(BaseModel):
    """Subscription model for frontend."""
    id: str
    user_id: str
    plan: SubscriptionPlan
    status: str
    current_period_start: str
    current_period_end: str
    cancel_at_period_end: bool
    created_at: str
    updated_at: str


class PaymentMethod(BaseModel):
    """Payment method model for frontend."""
    id: str
    type: str = "card"
    card: Dict[str, Any]
    is_default: bool


class Invoice(BaseModel):
    """Invoice model for frontend."""
    id: str
    amount: int  # in cents
    currency: str = "usd"
    status: str
    created_at: str
    due_date: str
    invoice_pdf_url: Optional[str] = None


class UsageRecord(BaseModel):
    """Usage record model for frontend."""
    date: str
    credits_used: int
    credits_remaining: int
    description: str


class PaymentIntent(BaseModel):
    """Payment intent model for frontend."""
    id: str
    client_secret: str
    status: str
    amount: int  # in cents
    currency: str = "usd"


# Request Models
class CreateSubscriptionRequest(BaseModel):
    """Request to create subscription."""
    price_id: str


class UpdateSubscriptionRequest(BaseModel):
    """Request to update subscription."""
    price_id: str


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel subscription."""
    cancel_at_period_end: bool = True


class PurchaseCreditsRequest(BaseModel):
    """Request to purchase additional credits."""
    amount: int = Field(..., gt=0, description="Number of credits to purchase")


@router.get("/plans", response_model=List[SubscriptionPlan])
async def get_subscription_plans():
    """
    Get available subscription plans.
    """
    try:
        # Define the subscription plans that match your pricing
        plans = [
            {
                "id": "free",
                "name": "Free",
                "description": "Perfect for trying out CantoneseScribe",
                "price": 0,
                "currency": "usd",
                "billing_period": "monthly",
                "credits_included": 60,
                "features": [
                    "60 minutes per month",
                    "Basic transcription quality",
                    "Standard export formats",
                    "Community support"
                ],
                "popular": False,
                "stripe_price_id": "free"
            },
            {
                "id": "pro",
                "name": "Pro",
                "description": "For serious Cantonese learners and content creators",
                "price": 999,  # $9.99 in cents
                "currency": "usd", 
                "billing_period": "monthly",
                "credits_included": 500,
                "features": [
                    "500 minutes per month",
                    "High-quality transcription",
                    "All export formats (SRT, VTT, CSV, JSON)",
                    "Yale + Jyutping romanization",
                    "English translations",
                    "Priority processing",
                    "Email support"
                ],
                "popular": True,
                "stripe_price_id": "price_1RwLYuICypWYw6CLcRdEWa8X"  # Replace with your actual Stripe price ID
            }
        ]
        
        return plans
        
    except Exception as e:
        logger.error(f"Error getting subscription plans: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get subscription plans")


@router.get("/subscription", response_model=Optional[Subscription])
async def get_current_subscription(
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Get current user's subscription.
    """
    try:
        # Check if user has a subscription
        user = current_user
        if not user.get("stripe_subscription_id"):
            return None
        
        # This would typically fetch from Stripe/database
        # For now, return a mock subscription if the user has one
        plans = await get_subscription_plans()
        pro_plan = next((p for p in plans if p.id == "pro"), None)
        
        if not pro_plan:
            return None
            
        subscription = {
            "id": user.get("stripe_subscription_id", "sub_mock"),
            "user_id": user["id"],
            "plan": pro_plan.dict(),
            "status": user.get("subscription_status", "active"),
            "current_period_start": datetime.utcnow().isoformat(),
            "current_period_end": datetime.utcnow().replace(day=28).isoformat(),
            "cancel_at_period_end": False,
            "created_at": user.get("created_at", datetime.utcnow().isoformat()),
            "updated_at": user.get("updated_at", datetime.utcnow().isoformat())
        }
        
        return subscription
        
    except Exception as e:
        logger.error(f"Error getting current subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get subscription")


@router.post("/subscription")
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Create a new subscription.
    """
    try:
        result = await billing_svc.create_subscription(
            user_id=current_user["id"],
            price_id=request.price_id
        )
        
        return {
            "client_secret": result.get("client_secret"),
            "subscription_id": result.get("subscription_id")
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ExternalAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create subscription")


@router.patch("/subscription/{subscription_id}")
async def update_subscription(
    subscription_id: str,
    request: UpdateSubscriptionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Update an existing subscription.
    """
    try:
        # This would call Stripe to update the subscription
        # For now, return a success response
        return {
            "success": True,
            "message": "Subscription updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update subscription")


@router.patch("/subscription/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    request: CancelSubscriptionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Cancel a subscription.
    """
    try:
        result = await billing_svc.cancel_subscription(
            user_id=current_user["id"],
            at_period_end=request.cancel_at_period_end
        )
        
        return {
            "success": True,
            "subscription": result
        }
        
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@router.patch("/subscription/{subscription_id}/reactivate")
async def reactivate_subscription(
    subscription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Reactivate a cancelled subscription.
    """
    try:
        # This would call Stripe to reactivate the subscription
        return {
            "success": True,
            "message": "Subscription reactivated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error reactivating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reactivate subscription")


@router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get user's payment methods.
    """
    try:
        # This would fetch from Stripe
        # For now, return empty list
        return []
        
    except Exception as e:
        logger.error(f"Error getting payment methods: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment methods")


@router.post("/payment-methods/setup-intent")
async def create_setup_intent(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a setup intent for adding payment methods.
    """
    try:
        # This would create a Stripe setup intent
        return {
            "client_secret": "seti_mock_client_secret"
        }
        
    except Exception as e:
        logger.error(f"Error creating setup intent: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create setup intent")


@router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a payment method.
    """
    try:
        # This would delete from Stripe
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error deleting payment method: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete payment method")


@router.patch("/payment-methods/{payment_method_id}/default")
async def set_default_payment_method(
    payment_method_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Set a payment method as default.
    """
    try:
        # This would update in Stripe
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error setting default payment method: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to set default payment method")


@router.get("/invoices", response_model=List[Invoice])
async def get_billing_history(
    limit: int = 10,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get billing history (invoices).
    """
    try:
        # This would fetch from Stripe
        return []
        
    except Exception as e:
        logger.error(f"Error getting billing history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get billing history")


@router.get("/usage", response_model=List[UsageRecord])
async def get_usage_history(
    limit: int = 30,
    current_user: Dict[str, Any] = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Get usage history.
    """
    try:
        can_use, usage_info = await billing_svc.check_usage_limits(current_user["id"])
        
        # Convert usage info to usage records format
        return [
            {
                "date": datetime.utcnow().isoformat(),
                "credits_used": int(usage_info.get("current_usage_minutes", 0)),
                "credits_remaining": int(usage_info.get("remaining_minutes", 0)),
                "description": f"Monthly usage ({usage_info.get('tier', 'free')} plan)"
            }
        ]
        
    except Exception as e:
        logger.error(f"Error getting usage history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get usage history")


@router.post("/credits", response_model=PaymentIntent)
async def purchase_credits(
    request: PurchaseCreditsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Purchase additional credits.
    """
    try:
        # This would create a Stripe payment intent for credit purchase
        amount_cents = request.amount * 10  # 10 cents per credit
        
        return {
            "id": "pi_mock_payment_intent",
            "client_secret": "pi_mock_client_secret",
            "status": "requires_payment_method",
            "amount": amount_cents,
            "currency": "usd"
        }
        
    except Exception as e:
        logger.error(f"Error purchasing credits: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to purchase credits")
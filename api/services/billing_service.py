"""
Comprehensive billing service for CantoneseScribe with Stripe integration.

This service handles subscription management, usage tracking, cost monitoring,
and webhook processing for payment events.
"""

import asyncio
import logging
import hmac
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import json

import stripe
from stripe.error import StripeError

from core.config import get_settings
from core.exceptions import ExternalAPIError, ValidationError, ProcessingError
from services.database_service import DatabaseService, database_service
from services.monitoring_service import monitoring_service

logger = logging.getLogger(__name__)


class SubscriptionStatus(str, Enum):
    """Stripe subscription statuses."""
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    PAUSED = "paused"


class UsageTier(str, Enum):
    """Usage tier definitions."""
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class BillingService:
    """Service for handling billing, subscriptions, and usage tracking."""
    
    def __init__(self):
        self._settings = get_settings()
        self._setup_stripe()
        
        # Usage limits by tier (minutes per month)
        self._usage_limits = {
            UsageTier.FREE: 60,          # 1 hour
            UsageTier.STARTER: 600,      # 10 hours
            UsageTier.PROFESSIONAL: 3600, # 60 hours
            UsageTier.ENTERPRISE: 36000   # 600 hours
        }
        
        # Pricing per minute by tier (USD)
        self._pricing = {
            UsageTier.FREE: 0.0,
            UsageTier.STARTER: 0.10,
            UsageTier.PROFESSIONAL: 0.08,
            UsageTier.ENTERPRISE: 0.06
        }
    
    def _setup_stripe(self) -> None:
        """Initialize Stripe configuration."""
        if self._settings.stripe_secret_key:
            stripe.api_key = self._settings.stripe_secret_key
            logger.info("Stripe API configured")
        else:
            logger.warning("Stripe API key not configured")
    
    # Customer Management
    async def create_customer(
        self, 
        user_id: str, 
        email: str, 
        name: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create a new Stripe customer."""
        try:
            customer_metadata = {
                "user_id": user_id,
                "service": "cantonese_scribe"
            }
            if metadata:
                customer_metadata.update(metadata)
            
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=customer_metadata
            )
            
            # Store customer ID in database
            await database_service.update_user(user_id, {
                "stripe_customer_id": customer.id,
                "billing_email": email
            })
            
            logger.info(f"Created Stripe customer {customer.id} for user {user_id}")
            
            return {
                "customer_id": customer.id,
                "email": customer.email,
                "name": customer.name,
                "created": customer.created
            }
            
        except StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise ExternalAPIError(f"Failed to create customer: {str(e)}", "stripe")
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            raise ProcessingError(f"Customer creation failed: {str(e)}")
    
    async def get_customer(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get customer information from Stripe."""
        try:
            # Get user from database to find customer ID
            user = await database_service.get_user_by_id(user_id)
            if not user or not user.get("stripe_customer_id"):
                return None
            
            customer = stripe.Customer.retrieve(user["stripe_customer_id"])
            
            return {
                "customer_id": customer.id,
                "email": customer.email,
                "name": customer.name,
                "created": customer.created,
                "balance": customer.balance,
                "currency": customer.currency or "usd"
            }
            
        except StripeError as e:
            logger.error(f"Stripe error retrieving customer: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving customer: {str(e)}")
            return None
    
    # Subscription Management
    async def create_subscription(
        self, 
        user_id: str, 
        price_id: str,
        trial_period_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create a new subscription for a user."""
        try:
            # Get user and customer
            user = await database_service.get_user_by_id(user_id)
            if not user:
                raise ValidationError("User not found")
            
            customer_id = user.get("stripe_customer_id")
            if not customer_id:
                # Create customer if doesn't exist
                customer_info = await self.create_customer(
                    user_id, user["email"], user.get("full_name")
                )
                customer_id = customer_info["customer_id"]
            
            # Create subscription
            subscription_params = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "payment_behavior": "default_incomplete",
                "payment_settings": {"save_default_payment_method": "on_subscription"},
                "expand": ["latest_invoice.payment_intent"],
                "metadata": {
                    "user_id": user_id,
                    "service": "cantonese_scribe"
                }
            }
            
            if trial_period_days:
                subscription_params["trial_period_days"] = trial_period_days
            
            subscription = stripe.Subscription.create(**subscription_params)
            
            # Update user subscription status in database
            await database_service.update_user(user_id, {
                "stripe_subscription_id": subscription.id,
                "subscription_status": subscription.status,
                "subscription_tier": self._get_tier_from_price_id(price_id)
            })
            
            logger.info(f"Created subscription {subscription.id} for user {user_id}")
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "trial_end": subscription.trial_end,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice.payment_intent else None
            }
            
        except StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise ExternalAPIError(f"Failed to create subscription: {str(e)}", "stripe")
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            raise ProcessingError(f"Subscription creation failed: {str(e)}")
    
    async def cancel_subscription(
        self, 
        user_id: str, 
        at_period_end: bool = True
    ) -> Dict[str, Any]:
        """Cancel a user's subscription."""
        try:
            user = await database_service.get_user_by_id(user_id)
            if not user or not user.get("stripe_subscription_id"):
                raise ValidationError("No active subscription found")
            
            subscription = stripe.Subscription.modify(
                user["stripe_subscription_id"],
                cancel_at_period_end=at_period_end
            )
            
            # Update database
            await database_service.update_user(user_id, {
                "subscription_status": subscription.status,
                "subscription_cancel_at": subscription.cancel_at
            })
            
            logger.info(f"Cancelled subscription for user {user_id}")
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "canceled_at": subscription.canceled_at,
                "current_period_end": subscription.current_period_end
            }
            
        except StripeError as e:
            logger.error(f"Stripe error cancelling subscription: {str(e)}")
            raise ExternalAPIError(f"Failed to cancel subscription: {str(e)}", "stripe")
    
    # Usage Tracking and Limits
    async def check_usage_limits(self, user_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if user has exceeded usage limits.
        
        Returns:
            Tuple of (can_use, usage_info)
        """
        try:
            # Get user subscription tier
            user = await database_service.get_user_by_id(user_id)
            if not user:
                return False, {"error": "User not found"}
            
            tier = user.get("subscription_tier", UsageTier.FREE)
            
            # Get current month usage
            now = datetime.utcnow()
            start_of_month = datetime(now.year, now.month, 1)
            
            # Get usage from database
            usage_stats = await database_service.get_user_usage_stats(
                user_id, 
                days=(now - start_of_month).days + 1
            )
            
            current_usage_minutes = usage_stats.get("period_stats", {}).get("total_processing_time", 0) / 60
            limit_minutes = self._usage_limits.get(tier, 0)
            
            can_use = current_usage_minutes < limit_minutes
            
            usage_info = {
                "tier": tier,
                "current_usage_minutes": current_usage_minutes,
                "limit_minutes": limit_minutes,
                "remaining_minutes": max(0, limit_minutes - current_usage_minutes),
                "usage_percentage": (current_usage_minutes / limit_minutes) * 100 if limit_minutes > 0 else 0,
                "period_start": start_of_month.isoformat(),
                "period_end": (start_of_month.replace(month=start_of_month.month + 1) - timedelta(days=1)).isoformat()
            }
            
            return can_use, usage_info
            
        except Exception as e:
            logger.error(f"Error checking usage limits: {str(e)}")
            return False, {"error": str(e)}
    
    async def record_usage(
        self, 
        user_id: str, 
        job_id: str, 
        duration_seconds: float, 
        service_used: str,
        cost: float
    ) -> None:
        """Record usage for billing purposes."""
        try:
            usage_data = {
                "user_id": user_id,
                "job_id": job_id,
                "action": "transcription",
                "service": service_used,
                "duration": duration_seconds,
                "cost": cost,
                "metadata": {
                    "duration_minutes": duration_seconds / 60,
                    "service_provider": service_used,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            await database_service.log_usage(usage_data)
            
            # Update user totals
            await database_service.update_user_usage(user_id, duration_seconds, cost)
            
            # Check if usage limits exceeded and send alerts
            can_use, usage_info = await self.check_usage_limits(user_id)
            
            if usage_info.get("usage_percentage", 0) > 80:  # 80% threshold
                await self._send_usage_alert(user_id, usage_info)
            
            logger.debug(f"Recorded usage for user {user_id}: {duration_seconds/60:.2f} minutes, ${cost:.4f}")
            
        except Exception as e:
            logger.error(f"Error recording usage: {str(e)}")
            # Don't fail the main operation for usage recording errors
    
    async def get_usage_report(
        self, 
        user_id: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get detailed usage report for a user."""
        try:
            if not start_date:
                # Default to current month
                now = datetime.utcnow()
                start_date = datetime(now.year, now.month, 1)
            
            if not end_date:
                end_date = datetime.utcnow()
            
            days = (end_date - start_date).days + 1
            usage_stats = await database_service.get_user_usage_stats(user_id, days=days)
            
            # Get subscription info
            user = await database_service.get_user_by_id(user_id)
            tier = user.get("subscription_tier", UsageTier.FREE) if user else UsageTier.FREE
            
            return {
                "user_id": user_id,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": days
                },
                "subscription": {
                    "tier": tier,
                    "status": user.get("subscription_status") if user else None
                },
                "usage": usage_stats,
                "limits": {
                    "monthly_minutes": self._usage_limits.get(tier, 0),
                    "price_per_minute": self._pricing.get(tier, 0.0)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting usage report: {str(e)}")
            raise ProcessingError(f"Failed to get usage report: {str(e)}")
    
    # Webhook Processing
    async def process_webhook(
        self, 
        payload: bytes, 
        signature: str
    ) -> Dict[str, Any]:
        """Process Stripe webhook events."""
        try:
            if not self._settings.stripe_webhook_secret:
                raise ValidationError("Webhook secret not configured")
            
            # Verify webhook signature
            try:
                event = stripe.Webhook.construct_event(
                    payload, signature, self._settings.stripe_webhook_secret
                )
            except ValueError:
                raise ValidationError("Invalid payload")
            except stripe.error.SignatureVerificationError:
                raise ValidationError("Invalid signature")
            
            # Process different event types
            event_type = event["type"]
            event_data = event["data"]["object"]
            
            logger.info(f"Processing webhook event: {event_type}")
            
            if event_type == "customer.subscription.created":
                return await self._handle_subscription_created(event_data)
            elif event_type == "customer.subscription.updated":
                return await self._handle_subscription_updated(event_data)
            elif event_type == "customer.subscription.deleted":
                return await self._handle_subscription_deleted(event_data)
            elif event_type == "invoice.payment_succeeded":
                return await self._handle_payment_succeeded(event_data)
            elif event_type == "invoice.payment_failed":
                return await self._handle_payment_failed(event_data)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                return {"status": "ignored", "event_type": event_type}
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            raise ProcessingError(f"Webhook processing failed: {str(e)}")
    
    async def _handle_subscription_created(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        """Handle subscription created webhook."""
        try:
            user_id = subscription.get("metadata", {}).get("user_id")
            if not user_id:
                logger.warning("Subscription created without user_id metadata")
                return {"status": "ignored", "reason": "no_user_id"}
            
            # Update user subscription info
            await database_service.update_user(user_id, {
                "stripe_subscription_id": subscription["id"],
                "subscription_status": subscription["status"],
                "subscription_tier": self._get_tier_from_subscription(subscription),
                "subscription_current_period_start": datetime.fromtimestamp(subscription["current_period_start"]).isoformat(),
                "subscription_current_period_end": datetime.fromtimestamp(subscription["current_period_end"]).isoformat()
            })
            
            logger.info(f"Subscription created for user {user_id}: {subscription['id']}")
            return {"status": "processed", "user_id": user_id}
            
        except Exception as e:
            logger.error(f"Error handling subscription created: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_subscription_updated(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        """Handle subscription updated webhook."""
        try:
            user_id = subscription.get("metadata", {}).get("user_id")
            if not user_id:
                logger.warning("Subscription updated without user_id metadata")
                return {"status": "ignored", "reason": "no_user_id"}
            
            # Update user subscription info
            update_data = {
                "subscription_status": subscription["status"],
                "subscription_current_period_start": datetime.fromtimestamp(subscription["current_period_start"]).isoformat(),
                "subscription_current_period_end": datetime.fromtimestamp(subscription["current_period_end"]).isoformat()
            }
            
            if subscription.get("canceled_at"):
                update_data["subscription_cancel_at"] = datetime.fromtimestamp(subscription["canceled_at"]).isoformat()
            
            await database_service.update_user(user_id, update_data)
            
            logger.info(f"Subscription updated for user {user_id}: {subscription['status']}")
            return {"status": "processed", "user_id": user_id}
            
        except Exception as e:
            logger.error(f"Error handling subscription updated: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_subscription_deleted(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        """Handle subscription deleted webhook."""
        try:
            user_id = subscription.get("metadata", {}).get("user_id")
            if not user_id:
                logger.warning("Subscription deleted without user_id metadata")
                return {"status": "ignored", "reason": "no_user_id"}
            
            # Update user subscription info
            await database_service.update_user(user_id, {
                "subscription_status": "canceled",
                "subscription_tier": UsageTier.FREE,
                "subscription_cancel_at": datetime.utcnow().isoformat()
            })
            
            logger.info(f"Subscription deleted for user {user_id}")
            return {"status": "processed", "user_id": user_id}
            
        except Exception as e:
            logger.error(f"Error handling subscription deleted: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_payment_succeeded(self, invoice: Dict[str, Any]) -> Dict[str, Any]:
        """Handle successful payment webhook."""
        try:
            customer_id = invoice.get("customer")
            if not customer_id:
                return {"status": "ignored", "reason": "no_customer"}
            
            # Find user by customer ID
            # This would require a database query to find user by stripe_customer_id
            # For now, log the successful payment
            
            logger.info(f"Payment succeeded for customer {customer_id}: {invoice.get('amount_paid', 0) / 100} {invoice.get('currency', 'usd')}")
            return {"status": "processed", "customer_id": customer_id}
            
        except Exception as e:
            logger.error(f"Error handling payment succeeded: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_payment_failed(self, invoice: Dict[str, Any]) -> Dict[str, Any]:
        """Handle failed payment webhook."""
        try:
            customer_id = invoice.get("customer")
            if not customer_id:
                return {"status": "ignored", "reason": "no_customer"}
            
            # Log failed payment and potentially send notification
            logger.warning(f"Payment failed for customer {customer_id}: {invoice.get('amount_due', 0) / 100} {invoice.get('currency', 'usd')}")
            
            # Could implement email notification or account suspension logic here
            
            return {"status": "processed", "customer_id": customer_id}
            
        except Exception as e:
            logger.error(f"Error handling payment failed: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    def _get_tier_from_price_id(self, price_id: str) -> UsageTier:
        """Map Stripe price ID to usage tier."""
        # This would map actual Stripe price IDs to tiers
        # For now, return a default
        return UsageTier.STARTER
    
    def _get_tier_from_subscription(self, subscription: Dict[str, Any]) -> UsageTier:
        """Extract tier from subscription object."""
        items = subscription.get("items", {}).get("data", [])
        if items:
            price_id = items[0].get("price", {}).get("id")
            return self._get_tier_from_price_id(price_id)
        return UsageTier.FREE
    
    async def _send_usage_alert(self, user_id: str, usage_info: Dict[str, Any]) -> None:
        """Send usage alert to user."""
        try:
            # This would integrate with email service to send alerts
            logger.info(f"Usage alert for user {user_id}: {usage_info['usage_percentage']:.1f}% of limit used")
        except Exception as e:
            logger.error(f"Error sending usage alert: {str(e)}")
    
    # Pricing and Cost Estimation
    async def estimate_cost(
        self, 
        user_id: str, 
        duration_minutes: float
    ) -> Dict[str, Any]:
        """Estimate cost for transcription duration."""
        try:
            user = await database_service.get_user_by_id(user_id)
            tier = user.get("subscription_tier", UsageTier.FREE) if user else UsageTier.FREE
            
            price_per_minute = self._pricing.get(tier, 0.0)
            estimated_cost = duration_minutes * price_per_minute
            
            # Check usage limits
            can_use, usage_info = await self.check_usage_limits(user_id)
            
            return {
                "duration_minutes": duration_minutes,
                "tier": tier,
                "price_per_minute": price_per_minute,
                "estimated_cost": estimated_cost,
                "currency": "usd",
                "can_process": can_use,
                "usage_info": usage_info
            }
            
        except Exception as e:
            logger.error(f"Error estimating cost: {str(e)}")
            return {
                "duration_minutes": duration_minutes,
                "error": str(e)
            }


# Global service instance
billing_service = BillingService()


# Dependency function for FastAPI
async def get_billing_service() -> BillingService:
    """Dependency to get billing service."""
    return billing_service
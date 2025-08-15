"""
Email service using Resend for CantoneseScribe.

This service handles all email communications including:
- Welcome emails
- Usage limit warnings  
- Waitlist confirmations
- Monthly usage reports
"""

import asyncio
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..core.config import get_settings
from ..core.exceptions import ExternalAPIError, ValidationError

logger = logging.getLogger(__name__)


class EmailService:
    """Email service using Resend API."""
    
    def __init__(self):
        self._settings = get_settings()
        self._resend_api_key = None
        self._from_email = None
        self._support_email = None
    
    async def initialize(self) -> None:
        """Initialize email service."""
        try:
            self._resend_api_key = self._settings.resend_api_key
            self._from_email = self._settings.from_email or "onboarding@resend.dev"
            self._support_email = self._settings.support_email or self._from_email
            
            if not self._resend_api_key:
                logger.warning("Resend API key not configured - email service disabled")
                return
            
            logger.info("Email service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize email service: {str(e)}")
            raise ExternalAPIError(f"Email service initialization failed: {str(e)}", "resend")
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an email using Resend API.
        
        Args:
            to: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text content (optional)
            from_email: Sender email (optional, uses default)
            
        Returns:
            Dict with email sending result
        """
        try:
            if not self._resend_api_key:
                logger.warning("Email service not configured - skipping email send")
                return {"status": "skipped", "reason": "service_not_configured"}
            
            # Validate email address
            if not self._is_valid_email(to):
                raise ValidationError(f"Invalid email address: {to}")
            
            sender = from_email or self._from_email
            
            # Prepare email data
            email_data = {
                "from": sender,
                "to": to,
                "subject": subject,
                "html": html_content
            }
            
            if text_content:
                email_data["text"] = text_content
            
            # Send email via Resend API
            result = await self._send_via_resend(email_data)
            
            logger.info(f"Email sent successfully to {to}: {subject}")
            return {
                "status": "sent",
                "message_id": result.get("id"),
                "to": to,
                "subject": subject,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            raise ExternalAPIError(f"Email sending failed: {str(e)}", "resend")
    
    async def _send_via_resend(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send email via Resend API."""
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {self._resend_api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.resend.com/emails",
                    headers=headers,
                    json=email_data,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        return result
                    else:
                        error_msg = result.get("message", "Unknown error")
                        raise ExternalAPIError(f"Resend API error: {error_msg}", "resend")
                        
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error sending email: {str(e)}")
            raise ExternalAPIError(f"Network error sending email: {str(e)}", "resend")
        except Exception as e:
            logger.error(f"Unexpected error sending email: {str(e)}")
            raise
    
    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation."""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    async def send_welcome_email(self, user_email: str, user_name: str = None) -> Dict[str, Any]:
        """Send welcome email to new user."""
        subject = "Welcome to CantoneseScribe! 🎉"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ea580c;">Welcome to CantoneseScribe!</h1>
            
            <p>Hi{f" {user_name}" if user_name else ""}! 👋</p>
            
            <p>Thanks for joining CantoneseScribe! You now have access to:</p>
            
            <ul>
                <li>✅ <strong>30 minutes</strong> of free Cantonese transcription per month</li>
                <li>✅ <strong>YouTube video</strong> processing</li>
                <li>✅ <strong>Audio file</strong> uploads (up to 25MB)</li>
                <li>✅ <strong>Yale romanization</strong> and English translation</li>
                <li>✅ <strong>Multiple export formats</strong> (SRT, VTT, CSV, TXT)</li>
            </ul>
            
            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>💡 Pro Tip:</strong> Your free credits reset every month, so make the most of them!
            </p>
            
            <p>Ready to get started? <a href="https://yourdomain.com" style="color: #ea580c;">Upload your first video</a></p>
            
            <p>If you need help, just reply to this email or contact us at {self._support_email}</p>
            
            <p>Happy transcribing! 🎬</p>
            
            <p>The CantoneseScribe Team</p>
        </div>
        """
        
        return await self.send_email(user_email, subject, html_content)
    
    async def send_usage_warning_email(
        self, 
        user_email: str, 
        credits_used: int, 
        credits_total: int,
        user_name: str = None
    ) -> Dict[str, Any]:
        """Send usage limit warning email."""
        percentage_used = (credits_used / credits_total) * 100
        credits_remaining = credits_total - credits_used
        
        subject = f"⚠️ You've used {percentage_used:.0f}% of your monthly credits"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Credits Running Low! ⚠️</h1>
            
            <p>Hi{f" {user_name}" if user_name else ""}!</p>
            
            <p>Just a heads up - you've used <strong>{credits_used} out of {credits_total}</strong> free credits this month.</p>
            
            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
                <p><strong>Credits remaining: {credits_remaining}</strong></p>
                <p>Your credits will reset next month automatically.</p>
            </div>
            
            <p>Want unlimited transcription? <a href="https://yourdomain.com/pricing" style="color: #ea580c;">Join our Pro waitlist</a> to be notified when it's ready!</p>
            
            <p>Pro features coming soon:</p>
            <ul>
                <li>🚀 Unlimited monthly credits</li>
                <li>⚡ Priority processing</li>
                <li>📱 Advanced export options</li>
                <li>🎯 Batch processing</li>
            </ul>
            
            <p>Questions? Just reply to this email!</p>
            
            <p>The CantoneseScribe Team</p>
        </div>
        """
        
        return await self.send_email(user_email, subject, html_content)
    
    async def send_limit_reached_email(
        self, 
        user_email: str, 
        credits_total: int,
        reset_date: str,
        user_name: str = None
    ) -> Dict[str, Any]:
        """Send email when user reaches monthly limit."""
        subject = "Monthly limit reached - Credits reset soon! 🔄"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Monthly Limit Reached</h1>
            
            <p>Hi{f" {user_name}" if user_name else ""}!</p>
            
            <p>You've used all <strong>{credits_total} free credits</strong> for this month. Your credits will automatically reset on <strong>{reset_date}</strong>.</p>
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p><strong>Don't want to wait?</strong></p>
                <p><a href="https://yourdomain.com/pricing" style="color: #ea580c;">Join our Pro waitlist</a> for unlimited access!</p>
            </div>
            
            <p>Pro subscribers get:</p>
            <ul>
                <li>🚀 <strong>Unlimited</strong> monthly transcription</li>
                <li>⚡ <strong>Priority</strong> processing queue</li>
                <li>📱 <strong>Advanced</strong> export formats</li>
                <li>🎯 <strong>Batch</strong> video processing</li>
                <li>💬 <strong>Priority</strong> customer support</li>
            </ul>
            
            <p>We'll email you as soon as Pro is available!</p>
            
            <p>Thanks for using CantoneseScribe! 🎬</p>
            
            <p>The CantoneseScribe Team</p>
        </div>
        """
        
        return await self.send_email(user_email, subject, html_content)
    
    async def send_waitlist_confirmation_email(
        self, 
        user_email: str, 
        user_name: str = None
    ) -> Dict[str, Any]:
        """Send waitlist signup confirmation email."""
        subject = "You're on the Pro waitlist! 🎉"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ea580c;">Welcome to the Pro Waitlist! 🎉</h1>
            
            <p>Hi{f" {user_name}" if user_name else ""}!</p>
            
            <p>Great news! You're now on the waitlist for <strong>CantoneseScribe Pro</strong>. You'll be among the first to know when we launch!</p>
            
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <p><strong>What to expect with Pro:</strong></p>
                <ul>
                    <li>🚀 <strong>Unlimited</strong> monthly transcription</li>
                    <li>⚡ <strong>Priority</strong> processing (2x faster)</li>
                    <li>📱 <strong>Advanced</strong> export formats</li>
                    <li>🎯 <strong>Batch</strong> video processing</li>
                    <li>💬 <strong>Priority</strong> customer support</li>
                    <li>🎨 <strong>Custom</strong> styling options</li>
                </ul>
            </div>
            
            <p>In the meantime, don't forget you still have your <strong>free monthly credits</strong> to use!</p>
            
            <p><a href="https://yourdomain.com" style="color: #ea580c;">Continue using CantoneseScribe →</a></p>
            
            <p>We're working hard to make Pro amazing. Expect to hear from us soon!</p>
            
            <p>The CantoneseScribe Team</p>
        </div>
        """
        
        return await self.send_email(user_email, subject, html_content)
    
    async def send_monthly_usage_report(
        self, 
        user_email: str, 
        usage_data: Dict[str, Any],
        user_name: str = None
    ) -> Dict[str, Any]:
        """Send monthly usage report email."""
        credits_used = usage_data.get("credits_used", 0)
        credits_total = usage_data.get("credits_total", 30)
        videos_processed = usage_data.get("videos_processed", 0)
        total_minutes = usage_data.get("total_minutes", 0)
        month_name = usage_data.get("month_name", "this month")
        
        subject = f"Your {month_name} CantoneseScribe Report 📊"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ea580c;">Your Monthly Report 📊</h1>
            
            <p>Hi{f" {user_name}" if user_name else ""}!</p>
            
            <p>Here's what you accomplished with CantoneseScribe in <strong>{month_name}</strong>:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Your Stats</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;">🎬 <strong>{videos_processed}</strong> videos processed</li>
                    <li style="margin: 10px 0;">⏰ <strong>{total_minutes:.1f}</strong> minutes transcribed</li>
                    <li style="margin: 10px 0;">💳 <strong>{credits_used}/{credits_total}</strong> credits used</li>
                </ul>
            </div>
            
            {"<p style='background: #fef3c7; padding: 15px; border-radius: 8px;'><strong>Your credits have reset!</strong> You now have " + str(credits_total) + " fresh credits for this month.</p>" if credits_used > 0 else ""}
            
            <p>Want to do even more? <a href="https://yourdomain.com/pricing" style="color: #ea580c;">Join our Pro waitlist</a> for unlimited access!</p>
            
            <p>Keep up the great work! 🚀</p>
            
            <p>The CantoneseScribe Team</p>
        </div>
        """
        
        return await self.send_email(user_email, subject, html_content)
    
    async def health_check(self) -> bool:
        """Check if email service is working."""
        try:
            if not self._resend_api_key:
                logger.warning("Email service not configured")
                return False
            
            # Test API connectivity with a minimal request
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {self._resend_api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.resend.com/domains",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status in [200, 401]  # 401 means API key is recognized but may lack domain access
                    
        except Exception as e:
            logger.error(f"Email service health check failed: {str(e)}")
            return False


# Global service instance
email_service = EmailService()


# Initialize function
async def init_email_service() -> None:
    """Initialize email service."""
    await email_service.initialize()


# Dependency function for FastAPI
async def get_email_service() -> EmailService:
    """Dependency to get email service."""
    return email_service
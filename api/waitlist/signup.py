"""
Waitlist signup endpoint for CantoneseScribe API with Supabase integration.
"""

import os
import logging
import uuid
from typing import Dict

import httpx
from fastapi import APIRouter, status
from pydantic import BaseModel, EmailStr

from ...core.exceptions import AppException
from ...core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


# =========================
# Models
# =========================

class WaitlistSignupRequest(BaseModel):
    email: EmailStr


class WaitlistSignupResponse(BaseModel):
    message: str


# =========================
# Helpers
# =========================

def _get_supabase_config():
    settings = get_settings()
    supabase_url = getattr(settings, "supabase_url", None) or os.getenv("SUPABASE_URL")
    service_role_key = getattr(settings, "supabase_service_role_key", None) or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise AppException(
            code="config_error",
            message="Supabase URL or service role key not configured",
        )

    return supabase_url.rstrip("/"), service_role_key


async def _insert_user_into_supabase(email: str):
    supabase_url, service_key = _get_supabase_config()
    endpoint = f"{supabase_url}/rest/v1/users"

    # Prepare row data for the insert
    row = {
        "id": str(uuid.uuid4()),
        "email": email,
        "is_active": True,
        "email_verified": False,
        "created_at": None,  # Supabase default (now())
        "updated_at": None,  # Supabase default (now())
        "metadata": {},      # Default empty JSON
    }

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",  # no body in successful insert
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(endpoint, json=row, headers=headers)

    if resp.status_code >= 300:
        try:
            detail = resp.json()
        except Exception:
            detail = {"error": resp.text}
        logger.error("Supabase insert failed: %s", detail)
        if "duplicate key" in str(detail).lower():
            raise AppException(
                code="already_exists",
                message=f"{email} is already on the waitlist",
                status_code=status.HTTP_409_CONFLICT,
            )
        raise AppException(
            code="db_insert_failed",
            message="Failed to add email to the waitlist",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# =========================
# Routes
# =========================

@router.post(
    "/signup",
    response_model=WaitlistSignupResponse,
    status_code=status.HTTP_200_OK,
)
async def signup_for_waitlist(payload: WaitlistSignupRequest) -> Dict[str, str]:
    """
    Adds an email address to the waitlist (users table in Supabase).
    If the email already exists, returns a 409 Conflict.
    """
    email = payload.email.strip().lower()
    logger.info("Received waitlist signup for: %s", email)

    await _insert_user_into_supabase(email)

    return {"message": f"Added {email} to the waitlist"}

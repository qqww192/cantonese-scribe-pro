"""
Auth login endpoints for CantoneseScribe API.
Handles email/password login via Supabase GoTrue and basic session utilities.
"""

import os
import logging
from typing import Optional, Dict, Any

import httpx
from fastapi import APIRouter, Depends, Header, Request, Response, status
from pydantic import BaseModel, EmailStr, Field, validator

from ...core.exceptions import AppException
from ...core.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])

logger = logging.getLogger(__name__)


# =========================
# Models
# =========================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
    remember_me: bool = False

    @validator("password")
    def password_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Password cannot be blank")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: Optional[Dict[str, Any]] = None


class MeResponse(BaseModel):
    user: Dict[str, Any]


# =========================
# Helpers
# =========================

def _get_supabase_env():
    settings = get_settings()
    supabase_url = getattr(settings, "supabase_url", None) or os.getenv("SUPABASE_URL")
    supabase_anon_key = getattr(settings, "supabase_anon_key", None) or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_anon_key:
        raise AppException(
            code="config_error",
            message="Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY."
        )
    return supabase_url.rstrip("/"), supabase_anon_key


def _cookie_params(secure: bool, remember: bool):
    # 7 days if remember_me else session cookie
    max_age = 7 * 24 * 60 * 60 if remember else None
    return {
        "httponly": True,
        "secure": secure,
        "samesite": "lax",
        "max_age": max_age,
        "path": "/",
    }


def _should_set_cookies() -> bool:
    # Allow toggling cookie-based session from settings; default true in production.
    settings = get_settings()
    return bool(getattr(settings, "auth_cookie_enabled", settings.environment == "production"))


def _is_secure_cookies() -> bool:
    settings = get_settings()
    return getattr(settings, "auth_cookie_secure", settings.environment == "production")


async def _supabase_password_grant(email: str, password: str) -> TokenResponse:
    supabase_url, anon_key = _get_supabase_env()
    url = f"{supabase_url}/auth/v1/token?grant_type=password"

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json",
    }
    payload = {"email": email, "password": password}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload, headers=headers)

    if resp.status_code >= 400:
        try:
            detail = resp.json()
        except Exception:
            detail = {"error": "auth_failed", "error_description": resp.text}
        logger.warning("Supabase password grant failed: %s", detail)
        raise AppException(
            code="auth_failed",
            message=detail.get("error_description") or "Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    data = resp.json()
    return TokenResponse(
        access_token=data.get("access_token"),
        refresh_token=data.get("refresh_token"),
        token_type=data.get("token_type", "bearer"),
        expires_in=data.get("expires_in"),
        user=data.get("user"),
    )


async def _supabase_get_user(access_token: str) -> Dict[str, Any]:
    supabase_url, anon_key = _get_supabase_env()
    url = f"{supabase_url}/auth/v1/user"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {access_token}",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code >= 400:
        try:
            detail = resp.json()
        except Exception:
            detail = {"error": "unauthorized", "message": resp.text}
        logger.info("Supabase get user failed: %s", detail)
        raise AppException(
            code="unauthorized",
            message=detail.get("message") or "Invalid or expired access token",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return resp.json()


# =========================
# Routes
# =========================

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest, response: Response) -> TokenResponse:
    """
    Email/password login via Supabase GoTrue. Returns access and refresh tokens.
    Optionally sets secure HttpOnly cookies when enabled.
    """
    tokens = await _supabase_password_grant(payload.email, payload.password)

    if _should_set_cookies():
        params = _cookie_params(secure=_is_secure_cookies(), remember=payload.remember_me)
        # Use distinct cookie names to avoid interfering with client SDK defaults.
        response.set_cookie("cs_access_token", tokens.access_token, **params)
        if tokens.refresh_token:
            response.set_cookie("cs_refresh_token", tokens.refresh_token, **params)

    return tokens


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response) -> Dict[str, str]:
    """
    Clears auth cookies on the client (if cookie-based auth is enabled).
    Note: Supabase sessions live on the client; no server revocation here.
    """
    if _should_set_cookies():
        # Clear cookies by setting expired max_age
        clear_params = _cookie_params(secure=_is_secure_cookies(), remember=False)
        response.delete_cookie("cs_access_token", path=clear_params["path"])
        response.delete_cookie("cs_refresh_token", path=clear_params["path"])
    return {"status": "signed_out"}


@router.get("/me", response_model=MeResponse, status_code=status.HTTP_200_OK)
async def me(
    request: Request,
    authorization: Optional[str] = Header(default=None, convert_underscores=False),
) -> MeResponse:
    """
    Returns the current authenticated user by validating the Supabase access token.
    Token is read from Authorization header (Bearer) or fallback to cookie.
    """
    token: Optional[str] = None

    # Priority: Authorization header
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    # Fallback: cookie
    if not token:
        token = request.cookies.get("cs_access_token")

    if not token:
        raise AppException(
            code="unauthorized",
            message="Missing access token",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    user = await _supabase_get_user(token)
    return MeResponse(user=user)

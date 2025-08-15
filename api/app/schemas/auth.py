"""
Authentication-related Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, validator


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str
    
    @validator('password')
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class UserCreate(BaseModel):
    """User creation model."""
    name: str
    email: EmailStr
    password: str
    
    @validator('password')
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class UserResponse(BaseModel):
    """User response model."""
    user_id: str
    name: str
    email: EmailStr
    subscription_plan: str = "free"
    usage_quota: int = 30
    usage_count: int = 0
    is_active: bool
    created_at: str


class TokenData(BaseModel):
    """Token data model."""
    email: Optional[str] = None
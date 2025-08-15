"""
FastAPI dependencies for authentication, rate limiting, etc.
"""

from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import time
from collections import defaultdict
import asyncio

from ..core.config import get_settings
from ..core.exceptions import AuthenticationError, RateLimitError
from ..services.database_service import DatabaseService, get_database

settings = get_settings()
security = HTTPBearer()

# Rate limiting storage (in production, use Redis)
rate_limit_storage = defaultdict(list)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DatabaseService = Depends(get_database)
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token and verify against database.
    """
    try:
        token = credentials.credentials
        
        # Decode JWT token
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthenticationError("Invalid token")
        
        # Fetch user from database
        user = await db.get_user_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")
        
        if not user.get("is_active", False):
            raise AuthenticationError("User account is disabled")
        
        return user
        
    except JWTError:
        raise AuthenticationError("Invalid token")
    except Exception as e:
        if isinstance(e, AuthenticationError):
            raise
        raise AuthenticationError("Authentication failed")


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: DatabaseService = Depends(get_database)
) -> Optional[Dict[str, Any]]:
    """Get current user if authenticated, otherwise return None."""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except AuthenticationError:
        return None


async def check_rate_limit(
    user_id: str,
    endpoint: str = "default",
    max_requests: int = None,
    window_seconds: int = None
) -> None:
    """Check rate limit for user and endpoint."""
    if max_requests is None:
        max_requests = settings.rate_limit_requests
    if window_seconds is None:
        window_seconds = settings.rate_limit_window
    
    current_time = time.time()
    key = f"{user_id}:{endpoint}"
    
    # Clean old entries
    rate_limit_storage[key] = [
        timestamp for timestamp in rate_limit_storage[key]
        if current_time - timestamp < window_seconds
    ]
    
    # Check if limit exceeded
    if len(rate_limit_storage[key]) >= max_requests:
        raise RateLimitError(f"Rate limit exceeded: {max_requests} requests per {window_seconds} seconds")
    
    # Add current request
    rate_limit_storage[key].append(current_time)


async def get_current_user_with_rate_limit(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DatabaseService = Depends(get_database)
) -> Dict[str, Any]:
    """Get current user and check rate limit."""
    user = await get_current_user(credentials, db)
    await check_rate_limit(user["id"], "api")
    return user


async def check_daily_cost_limit(
    user_id: str,
    db: DatabaseService = Depends(get_database)
) -> None:
    """Check if user has exceeded daily cost limit."""
    daily_cost = await db.get_daily_cost(user_id)
    
    if daily_cost > settings.max_daily_cost:
        raise HTTPException(
            status_code=429,
            detail=f"Daily cost limit exceeded: ${daily_cost:.2f} / ${settings.max_daily_cost:.2f}"
        )


async def get_current_user_with_cost_check(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DatabaseService = Depends(get_database)
) -> Dict[str, Any]:
    """Get current user and check cost limits."""
    user = await get_current_user(credentials, db)
    await check_daily_cost_limit(user["id"], db)
    return user


async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DatabaseService = Depends(get_database)
) -> Dict[str, Any]:
    """Get current user and verify admin permissions."""
    user = await get_current_user(credentials, db)
    
    # Check if user has admin role (this would be based on your user model)
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return user
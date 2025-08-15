"""
Authentication endpoints.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status
from fastapi.security import HTTPBearer
from jose import jwt
from passlib.context import CryptContext

from ....core.config import get_settings
from ....schemas.auth import LoginRequest, LoginResponse, UserCreate, UserResponse
from ....core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """
    Login endpoint.
    
    For demo purposes, this accepts any email/password combination.
    In production, this should verify against a real user database.
    """
    try:
        # Demo authentication - accept any valid email format
        if "@" not in login_data.email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email format"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": login_data.email, "email": login_data.email},
            expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in: {login_data.email}")
        
        # Create user object
        user = UserResponse(
            user_id=f"user_{hash(login_data.email)}",
            name=login_data.email.split('@')[0].title(),  # Use email prefix as name
            email=login_data.email,
            subscription_plan="free",
            usage_quota=30,
            usage_count=0,
            is_active=True,
            created_at=datetime.utcnow().isoformat()
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/register", response_model=LoginResponse)
async def register(user_data: UserCreate):
    """
    User registration endpoint.
    
    For demo purposes, this creates a mock user and logs them in.
    In production, this should create a real user in the database.
    """
    try:
        # Demo registration - create user and return login token
        logger.info(f"User registered: {user_data.email}")
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user_data.email, "email": user_data.email},
            expires_delta=access_token_expires
        )
        
        # Create user object
        user = UserResponse(
            user_id=f"user_{hash(user_data.email)}",
            name=user_data.name,
            email=user_data.email,
            subscription_plan="free",
            usage_quota=30,
            usage_count=0,
            is_active=True,
            created_at=datetime.utcnow().isoformat()
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user
        )
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/logout")
async def logout():
    """
    Logout endpoint.
    
    For demo purposes, this just returns success.
    In production, this should invalidate the token.
    """
    logger.info("User logged out")
    return {"message": "Successfully logged out"}


@router.post("/refresh")
async def refresh_token():
    """
    Token refresh endpoint.
    
    For demo purposes, this returns an error.
    In production, this should validate and refresh the token.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Token refresh not implemented in demo"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user():
    """
    Get current user endpoint.
    
    For demo purposes, this returns a mock user.
    In production, this should return the authenticated user.
    """
    # In demo mode, return a default user
    return UserResponse(
        user_id="demo_user",
        name="Demo User",
        email="demo@example.com",
        subscription_plan="free",
        usage_quota=30,
        usage_count=0,
        is_active=True,
        created_at=datetime.utcnow().isoformat()
    )


@router.patch("/profile", response_model=UserResponse)
async def update_profile(updates: dict):
    """
    Update user profile endpoint.
    
    For demo purposes, this returns a mock updated user.
    """
    return UserResponse(
        user_id="demo_user",
        name=updates.get("name", "Demo User"),
        email=updates.get("email", "demo@example.com"),
        subscription_plan="free",
        usage_quota=30,
        usage_count=0,
        is_active=True,
        created_at=datetime.utcnow().isoformat()
    )


@router.patch("/password")
async def change_password(password_data: dict):
    """
    Change password endpoint.
    
    For demo purposes, this just returns success.
    """
    return {"message": "Password changed successfully"}


@router.post("/password-reset/request")
async def request_password_reset(email_data: dict):
    """
    Request password reset endpoint.
    
    For demo purposes, this just returns success.
    """
    return {"message": "Password reset email sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(reset_data: dict):
    """
    Confirm password reset endpoint.
    
    For demo purposes, this just returns success.
    """
    return {"message": "Password reset successful"}
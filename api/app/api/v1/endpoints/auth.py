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
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """
    User registration endpoint.
    
    For demo purposes, this creates a mock user.
    In production, this should create a real user in the database.
    """
    try:
        # Demo registration - just return success
        logger.info(f"User registered: {user_data.email}")
        
        return UserResponse(
            user_id=f"user_{hash(user_data.email)}",
            email=user_data.email,
            is_active=True,
            created_at=datetime.utcnow().isoformat()
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
    
    Since we're using stateless JWT tokens, logout is handled client-side
    by discarding the token.
    """
    return {"message": "Logged out successfully"}
"""
User management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user
from schemas.auth import UserResponse
from schemas.files import StorageUsage
from core.storage import file_manager
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        is_active=current_user["is_active"],
        created_at="2024-01-01T00:00:00"  # Mock data
    )


@router.get("/usage", response_model=StorageUsage)
async def get_user_usage(
    current_user: dict = Depends(get_current_user)
):
    """Get user's usage statistics."""
    try:
        usage = await file_manager.calculate_storage_usage(current_user["user_id"])
        return StorageUsage(**usage)
    except Exception as e:
        logger.error(f"Error getting user usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get usage statistics")


@router.delete("/account")
async def delete_account(
    current_user: dict = Depends(get_current_user)
):
    """Delete user account and all associated data."""
    try:
        # In a real implementation, this would:
        # 1. Delete user from database
        # 2. Delete all user files
        # 3. Cancel any running jobs
        # 4. Clean up all user data
        
        logger.info(f"Account deletion requested for user: {current_user['user_id']}")
        return {"message": "Account deletion request received"}
        
    except Exception as e:
        logger.error(f"Error deleting account: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete account")
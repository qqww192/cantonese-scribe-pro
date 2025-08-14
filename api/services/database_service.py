"""
Supabase database service for CantoneseScribe.

This service handles all database operations using Supabase PostgreSQL
with proper error handling, connection pooling, and async operations.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from contextlib import asynccontextmanager

from supabase import create_client, Client
from postgrest import APIError
from pydantic import BaseModel, Field

from core.config import get_settings
from core.exceptions import DatabaseError, NotFoundError
from models.database import JobStatus

logger = logging.getLogger(__name__)


class DatabaseService:
    """Main database service for Supabase operations."""
    
    def __init__(self):
        self._client: Optional[Client] = None
        self._settings = get_settings()
    
    async def initialize(self) -> None:
        """Initialize database connection."""
        try:
            if not self._settings.supabase_url or not self._settings.supabase_key:
                raise DatabaseError("Supabase credentials not configured")
            
            self._client = create_client(
                self._settings.supabase_url,
                self._settings.supabase_key
            )
            
            # Test connection
            await self.health_check()
            logger.info("Database service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database service: {str(e)}")
            raise DatabaseError(f"Database initialization failed: {str(e)}")
    
    @property
    def client(self) -> Client:
        """Get Supabase client."""
        if not self._client:
            raise DatabaseError("Database not initialized")
        return self._client
    
    async def health_check(self) -> bool:
        """Check database connection health."""
        try:
            result = self.client.table("users").select("count", count="exact").limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return False
    
    # User Management
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user."""
        try:
            user_data["id"] = str(uuid.uuid4())
            user_data["created_at"] = datetime.utcnow().isoformat()
            user_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.client.table("users").insert(user_data).execute()
            
            if not result.data:
                raise DatabaseError("Failed to create user")
            
            logger.info(f"Created user: {result.data[0]['id']}")
            return result.data[0]
            
        except APIError as e:
            if "duplicate key" in str(e).lower():
                raise DatabaseError("User with this email already exists")
            raise DatabaseError(f"Database error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise DatabaseError(f"Failed to create user: {str(e)}")
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        try:
            result = self.client.table("users").select("*").eq("email", email).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting user by email: {str(e)}")
            raise DatabaseError(f"Failed to get user: {str(e)}")
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        try:
            result = self.client.table("users").select("*").eq("id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting user by ID: {str(e)}")
            raise DatabaseError(f"Failed to get user: {str(e)}")
    
    async def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user data."""
        try:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.client.table("users").update(update_data).eq("id", user_id).execute()
            
            if not result.data:
                raise NotFoundError("User not found")
            
            return result.data[0]
        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            raise DatabaseError(f"Failed to update user: {str(e)}")
    
    async def update_user_usage(self, user_id: str, processing_time: float, cost: float) -> None:
        """Update user usage statistics."""
        try:
            # Get current stats
            user = await self.get_user_by_id(user_id)
            if not user:
                raise NotFoundError("User not found")
            
            update_data = {
                "total_processing_time": (user.get("total_processing_time", 0) + processing_time),
                "total_cost": (user.get("total_cost", 0) + cost),
                "files_processed": (user.get("files_processed", 0) + 1),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            await self.update_user(user_id, update_data)
            logger.info(f"Updated usage for user {user_id}: +{processing_time}s, +${cost:.4f}")
            
        except Exception as e:
            logger.error(f"Error updating user usage: {str(e)}")
            # Don't raise here as this is not critical for the main flow
    
    # File Management
    async def create_user_file(self, file_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a user file record."""
        try:
            file_data["id"] = str(uuid.uuid4())
            file_data["created_at"] = datetime.utcnow().isoformat()
            
            result = self.client.table("user_files").insert(file_data).execute()
            
            if not result.data:
                raise DatabaseError("Failed to create file record")
            
            logger.info(f"Created file record: {result.data[0]['id']}")
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error creating file record: {str(e)}")
            raise DatabaseError(f"Failed to create file record: {str(e)}")
    
    async def get_user_file(self, file_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user file by ID."""
        try:
            result = self.client.table("user_files")\
                .select("*")\
                .eq("id", file_id)\
                .eq("user_id", user_id)\
                .execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting file: {str(e)}")
            raise DatabaseError(f"Failed to get file: {str(e)}")
    
    async def list_user_files(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """List user files."""
        try:
            result = self.client.table("user_files")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .offset(offset)\
                .execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            raise DatabaseError(f"Failed to list files: {str(e)}")
    
    # Transcription Job Management
    async def create_transcription_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new transcription job."""
        try:
            job_data["id"] = str(uuid.uuid4())
            job_data["created_at"] = datetime.utcnow().isoformat()
            job_data["status"] = JobStatus.PENDING.value
            job_data["progress"] = 0.0
            
            result = self.client.table("transcription_jobs").insert(job_data).execute()
            
            if not result.data:
                raise DatabaseError("Failed to create transcription job")
            
            logger.info(f"Created transcription job: {result.data[0]['id']}")
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error creating transcription job: {str(e)}")
            raise DatabaseError(f"Failed to create transcription job: {str(e)}")
    
    async def get_transcription_job(self, job_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get transcription job by ID."""
        try:
            result = self.client.table("transcription_jobs")\
                .select("*")\
                .eq("id", job_id)\
                .eq("user_id", user_id)\
                .execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting transcription job: {str(e)}")
            raise DatabaseError(f"Failed to get transcription job: {str(e)}")
    
    async def update_job_status(
        self, 
        job_id: str, 
        status: str, 
        progress: Optional[float] = None,
        error_message: Optional[str] = None,
        result_data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Update transcription job status."""
        try:
            update_data = {"status": status}
            
            if progress is not None:
                update_data["progress"] = progress
            
            if error_message:
                update_data["error_message"] = error_message
            
            if result_data:
                update_data["result_data"] = result_data
            
            if status == JobStatus.PROCESSING.value and "started_at" not in kwargs:
                update_data["started_at"] = datetime.utcnow().isoformat()
            
            if status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value, JobStatus.CANCELLED.value]:
                update_data["completed_at"] = datetime.utcnow().isoformat()
            
            # Add any additional fields
            update_data.update(kwargs)
            
            result = self.client.table("transcription_jobs").update(update_data).eq("id", job_id).execute()
            
            if not result.data:
                raise NotFoundError("Transcription job not found")
            
            logger.info(f"Updated job {job_id} status to {status}")
            return result.data[0]
            
        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error updating job status: {str(e)}")
            raise DatabaseError(f"Failed to update job status: {str(e)}")
    
    async def list_user_jobs(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        limit: int = 50, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List user transcription jobs."""
        try:
            query = self.client.table("transcription_jobs")\
                .select("*")\
                .eq("user_id", user_id)
            
            if status:
                query = query.eq("status", status)
            
            result = query.order("created_at", desc=True)\
                .limit(limit)\
                .offset(offset)\
                .execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Error listing user jobs: {str(e)}")
            raise DatabaseError(f"Failed to list user jobs: {str(e)}")
    
    async def get_active_jobs(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get active transcription jobs."""
        try:
            query = self.client.table("transcription_jobs")\
                .select("*")\
                .in_("status", [JobStatus.PENDING.value, JobStatus.PROCESSING.value])
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.order("created_at", desc=False).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting active jobs: {str(e)}")
            raise DatabaseError(f"Failed to get active jobs: {str(e)}")
    
    # Export File Management
    async def create_export_file(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create export file record."""
        try:
            export_data["id"] = str(uuid.uuid4())
            export_data["created_at"] = datetime.utcnow().isoformat()
            export_data["download_count"] = 0
            
            result = self.client.table("export_files").insert(export_data).execute()
            
            if not result.data:
                raise DatabaseError("Failed to create export file record")
            
            return result.data[0]
        except Exception as e:
            logger.error(f"Error creating export file: {str(e)}")
            raise DatabaseError(f"Failed to create export file: {str(e)}")
    
    async def get_export_file(self, job_id: str, user_id: str, format: str) -> Optional[Dict[str, Any]]:
        """Get export file record."""
        try:
            result = self.client.table("export_files")\
                .select("*")\
                .eq("job_id", job_id)\
                .eq("user_id", user_id)\
                .eq("format", format)\
                .execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting export file: {str(e)}")
            raise DatabaseError(f"Failed to get export file: {str(e)}")
    
    async def increment_download_count(self, export_file_id: str) -> None:
        """Increment download count for export file."""
        try:
            # Get current count
            result = self.client.table("export_files").select("download_count").eq("id", export_file_id).execute()
            if not result.data:
                return
            
            current_count = result.data[0].get("download_count", 0)
            
            # Update count
            self.client.table("export_files").update({
                "download_count": current_count + 1,
                "last_downloaded": datetime.utcnow().isoformat()
            }).eq("id", export_file_id).execute()
            
        except Exception as e:
            logger.error(f"Error updating download count: {str(e)}")
            # Don't raise as this is not critical
    
    # Usage Logging
    async def log_usage(self, usage_data: Dict[str, Any]) -> None:
        """Log usage for cost tracking."""
        try:
            usage_data["timestamp"] = datetime.utcnow().isoformat()
            
            result = self.client.table("usage_logs").insert(usage_data).execute()
            
            if result.data:
                logger.info(f"Logged usage: {usage_data.get('action')} for user {usage_data.get('user_id')}")
        except Exception as e:
            logger.error(f"Error logging usage: {str(e)}")
            # Don't raise as usage logging shouldn't break the main flow
    
    async def get_user_usage_stats(
        self, 
        user_id: str, 
        days: int = 30
    ) -> Dict[str, Any]:
        """Get user usage statistics."""
        try:
            since_date = datetime.utcnow() - timedelta(days=days)
            
            # Get usage logs for the period
            result = self.client.table("usage_logs")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("timestamp", since_date.isoformat())\
                .execute()
            
            logs = result.data or []
            
            # Calculate stats
            total_cost = sum(log.get("cost", 0) for log in logs if log.get("cost"))
            total_duration = sum(log.get("duration", 0) for log in logs if log.get("duration"))
            total_jobs = len(set(log.get("job_id") for log in logs if log.get("job_id")))
            
            # Get user data for lifetime stats
            user = await self.get_user_by_id(user_id)
            
            return {
                "period_days": days,
                "period_stats": {
                    "total_jobs": total_jobs,
                    "total_cost": total_cost,
                    "total_processing_time": total_duration
                },
                "lifetime_stats": {
                    "total_jobs": user.get("files_processed", 0) if user else 0,
                    "total_cost": user.get("total_cost", 0) if user else 0,
                    "total_processing_time": user.get("total_processing_time", 0) if user else 0
                }
            }
        except Exception as e:
            logger.error(f"Error getting usage stats: {str(e)}")
            raise DatabaseError(f"Failed to get usage stats: {str(e)}")
    
    async def get_daily_cost(self, user_id: Optional[str] = None) -> float:
        """Get daily cost for cost monitoring."""
        try:
            today = datetime.utcnow().date()
            start_of_day = datetime.combine(today, datetime.min.time())
            
            query = self.client.table("usage_logs")\
                .select("cost")\
                .gte("timestamp", start_of_day.isoformat())
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.execute()
            logs = result.data or []
            
            return sum(log.get("cost", 0) for log in logs if log.get("cost"))
        except Exception as e:
            logger.error(f"Error getting daily cost: {str(e)}")
            return 0.0
    
    # Database maintenance
    async def cleanup_old_jobs(self, days: int = 30) -> int:
        """Clean up old completed/failed jobs."""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            result = self.client.table("transcription_jobs")\
                .delete()\
                .in_("status", [JobStatus.COMPLETED.value, JobStatus.FAILED.value, JobStatus.CANCELLED.value])\
                .lt("completed_at", cutoff_date.isoformat())\
                .execute()
            
            count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {count} old jobs")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up jobs: {str(e)}")
            return 0
    
    async def cleanup_old_files(self, days: int = 7) -> int:
        """Clean up old export files."""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            result = self.client.table("export_files")\
                .delete()\
                .lt("created_at", cutoff_date.isoformat())\
                .execute()
            
            count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {count} old export files")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up files: {str(e)}")
            return 0


# Global service instance
database_service = DatabaseService()


# Database initialization function
async def init_database() -> None:
    """Initialize database service."""
    await database_service.initialize()


# Dependency function for FastAPI
async def get_database() -> DatabaseService:
    """Dependency to get database service."""
    if not database_service._client:
        await database_service.initialize()
    return database_service
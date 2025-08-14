"""
Database models and schema management.

This module defines the database models for the CantoneseScribe application.
Currently using Supabase PostgreSQL for production and SQLite for development.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
import sqlalchemy as sa
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, JSON

Base = declarative_base()


class JobStatus(str, Enum):
    """Job status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class User(Base):
    """User model."""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Usage tracking
    total_processing_time = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    files_processed = Column(Integer, default=0)
    
    # Relationships
    files = relationship("UserFile", back_populates="user")
    jobs = relationship("TranscriptionJob", back_populates="user")


class UserFile(Base):
    """User uploaded files model."""
    __tablename__ = "user_files"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)  # audio, video
    mime_type = Column(String, nullable=True)
    file_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="files")
    jobs = relationship("TranscriptionJob", back_populates="file")


class TranscriptionJob(Base):
    """Transcription job model."""
    __tablename__ = "transcription_jobs"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    file_id = Column(String, ForeignKey("user_files.id"), nullable=True)
    youtube_url = Column(String, nullable=True)
    
    # Job configuration
    options = Column(JSON, nullable=False)
    
    # Job status and timing
    status = Column(String, default=JobStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Progress and results
    progress = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    result_data = Column(JSON, nullable=True)
    
    # Cost tracking
    cost = Column(Float, nullable=True)
    duration = Column(Float, nullable=True)  # Audio duration in seconds
    processing_time = Column(Float, nullable=True)  # Processing time in seconds
    
    # Relationships
    user = relationship("User", back_populates="jobs")
    file = relationship("UserFile", back_populates="jobs")
    exports = relationship("ExportFile", back_populates="job")


class ExportFile(Base):
    """Exported transcription files model."""
    __tablename__ = "export_files"
    
    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey("transcription_jobs.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    format = Column(String, nullable=False)  # srt, vtt, txt, csv, json
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    download_count = Column(Integer, default=0)
    last_downloaded = Column(DateTime, nullable=True)
    
    # Relationships
    job = relationship("TranscriptionJob", back_populates="exports")
    user = relationship("User")


class UsageLog(Base):
    """Usage logging for cost tracking and analytics."""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    job_id = Column(String, ForeignKey("transcription_jobs.id"), nullable=True)
    
    # Usage details
    action = Column(String, nullable=False)  # transcription, translation, export
    service = Column(String, nullable=False)  # whisper, google_translate, etc.
    
    # Cost and resource usage
    cost = Column(Float, nullable=True)
    duration = Column(Float, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    
    # Metadata
    log_metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")


# Database configuration and session management
class DatabaseManager:
    """Database connection and session management."""
    
    def __init__(self, database_url: str):
        self.engine = sa.create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def create_tables(self):
        """Create all tables."""
        Base.metadata.create_all(bind=self.engine)
    
    def get_session(self):
        """Get database session."""
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()


# Async database operations (for use with asyncpg/Supabase)
class AsyncDatabaseOperations:
    """Async database operations for Supabase integration."""
    
    @staticmethod
    async def create_user(supabase_client, user_data: dict) -> dict:
        """Create a new user."""
        result = await supabase_client.table("users").insert(user_data).execute()
        return result.data[0] if result.data else None
    
    @staticmethod
    async def get_user_by_email(supabase_client, email: str) -> Optional[dict]:
        """Get user by email."""
        result = await supabase_client.table("users").select("*").eq("email", email).execute()
        return result.data[0] if result.data else None
    
    @staticmethod
    async def create_transcription_job(supabase_client, job_data: dict) -> dict:
        """Create a new transcription job."""
        result = await supabase_client.table("transcription_jobs").insert(job_data).execute()
        return result.data[0] if result.data else None
    
    @staticmethod
    async def update_job_status(supabase_client, job_id: str, status: str, **kwargs) -> dict:
        """Update job status."""
        update_data = {"status": status, **kwargs}
        result = await supabase_client.table("transcription_jobs").update(update_data).eq("id", job_id).execute()
        return result.data[0] if result.data else None
    
    @staticmethod
    async def get_user_jobs(supabase_client, user_id: str, limit: int = 10, offset: int = 0) -> List[dict]:
        """Get user's transcription jobs."""
        result = await supabase_client.table("transcription_jobs")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .offset(offset)\
            .execute()
        return result.data or []
    
    @staticmethod
    async def log_usage(supabase_client, usage_data: dict) -> dict:
        """Log usage for cost tracking."""
        result = await supabase_client.table("usage_logs").insert(usage_data).execute()
        return result.data[0] if result.data else None
    
    @staticmethod
    async def get_user_usage_stats(supabase_client, user_id: str) -> dict:
        """Get user usage statistics."""
        # This would include complex aggregation queries
        # For now, return basic structure
        return {
            "total_jobs": 0,
            "total_cost": 0.0,
            "total_processing_time": 0.0,
            "files_processed": 0
        }


# SQL schema creation scripts
def get_sql_schema() -> str:
    """Get SQL schema for manual database setup."""
    return """
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE NOT NULL,
        full_name VARCHAR,
        hashed_password VARCHAR NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_processing_time FLOAT DEFAULT 0.0,
        total_cost FLOAT DEFAULT 0.0,
        files_processed INTEGER DEFAULT 0
    );
    
    -- User files table
    CREATE TABLE IF NOT EXISTS user_files (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        original_filename VARCHAR NOT NULL,
        file_path VARCHAR NOT NULL,
        file_size INTEGER NOT NULL,
        file_type VARCHAR NOT NULL,
        mime_type VARCHAR,
        file_hash VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Transcription jobs table
    CREATE TABLE IF NOT EXISTS transcription_jobs (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        file_id VARCHAR REFERENCES user_files(id) ON DELETE SET NULL,
        youtube_url VARCHAR,
        options JSONB NOT NULL,
        status VARCHAR DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        progress FLOAT DEFAULT 0.0,
        error_message TEXT,
        result_data JSONB,
        cost FLOAT,
        duration FLOAT,
        processing_time FLOAT
    );
    
    -- Export files table
    CREATE TABLE IF NOT EXISTS export_files (
        id VARCHAR PRIMARY KEY,
        job_id VARCHAR REFERENCES transcription_jobs(id) ON DELETE CASCADE,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        format VARCHAR NOT NULL,
        filename VARCHAR NOT NULL,
        file_path VARCHAR NOT NULL,
        file_size INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        download_count INTEGER DEFAULT 0,
        last_downloaded TIMESTAMP
    );
    
    -- Usage logs table
    CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        job_id VARCHAR REFERENCES transcription_jobs(id) ON DELETE SET NULL,
        action VARCHAR NOT NULL,
        service VARCHAR NOT NULL,
        cost FLOAT,
        duration FLOAT,
        tokens_used INTEGER,
        metadata JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
    CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_id ON transcription_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_export_files_job_id ON export_files(job_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp);
    """
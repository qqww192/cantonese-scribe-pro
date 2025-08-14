"""
Application configuration management.
"""

import os
from functools import lru_cache
from typing import List, Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Application settings."""
    
    # Environment
    environment: str = "development"
    debug: bool = False
    
    # API Configuration
    api_prefix: str = "/api/v1"
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    allowed_hosts: List[str] = ["localhost", "127.0.0.1"]
    
    # Database
    database_url: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    supabase_service_key: Optional[str] = None
    
    # External APIs
    openai_api_key: Optional[str] = None
    google_cloud_credentials: Optional[str] = None
    google_translate_api_key: Optional[str] = None
    google_application_credentials: Optional[str] = None
    
    # Redis/Queue Configuration
    redis_url: Optional[str] = None
    redis_password: Optional[str] = None
    queue_name: str = "transcription_queue"
    
    # Stripe Configuration
    stripe_public_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    
    # File Storage
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    temp_dir: str = "/tmp/cantonese-scribe"
    upload_dir: str = "/tmp/cantonese-scribe/uploads"
    processed_dir: str = "/tmp/cantonese-scribe/processed"
    
    # Processing Configuration
    max_concurrent_jobs: int = 5
    job_timeout: int = 1800  # 30 minutes
    cleanup_interval: int = 3600  # 1 hour
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 3600  # 1 hour
    
    # Cost Management
    max_daily_cost: float = 50.0
    whisper_cost_per_minute: float = 0.006
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"
    
    @validator("allowed_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("allowed_hosts", pre=True)
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience function to get environment variables with defaults
def get_env(key: str, default: str = None) -> str:
    """Get environment variable with optional default."""
    return os.getenv(key, default)
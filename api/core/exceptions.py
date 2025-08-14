"""
Custom exceptions for the application.
"""

from typing import Optional


class AppException(Exception):
    """Base application exception."""
    
    def __init__(
        self,
        detail: str,
        status_code: int = 500,
        error_code: Optional[str] = None
    ):
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code or "GENERAL_ERROR"
        super().__init__(detail)


class AuthenticationError(AppException):
    """Authentication related errors."""
    
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(detail, status_code=401, error_code="AUTH_ERROR")


class AuthorizationError(AppException):
    """Authorization related errors."""
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(detail, status_code=403, error_code="AUTHZ_ERROR")


class ValidationError(AppException):
    """Input validation errors."""
    
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(detail, status_code=422, error_code="VALIDATION_ERROR")


class FileError(AppException):
    """File operation errors."""
    
    def __init__(self, detail: str = "File operation failed"):
        super().__init__(detail, status_code=400, error_code="FILE_ERROR")


class ProcessingError(AppException):
    """Processing/transcription errors."""
    
    def __init__(self, detail: str = "Processing failed"):
        super().__init__(detail, status_code=500, error_code="PROCESSING_ERROR")


class ExternalAPIError(AppException):
    """External API errors."""
    
    def __init__(self, detail: str = "External API error", service: str = None):
        error_code = f"{service.upper()}_API_ERROR" if service else "EXTERNAL_API_ERROR"
        super().__init__(detail, status_code=502, error_code=error_code)


class RateLimitError(AppException):
    """Rate limiting errors."""
    
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(detail, status_code=429, error_code="RATE_LIMIT_ERROR")


class CostLimitError(AppException):
    """Cost limit errors."""
    
    def __init__(self, detail: str = "Cost limit exceeded"):
        super().__init__(detail, status_code=402, error_code="COST_LIMIT_ERROR")


class DatabaseError(AppException):
    """Database operation errors."""
    
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(detail, status_code=500, error_code="DATABASE_ERROR")


class NotFoundError(AppException):
    """Resource not found errors."""
    
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail, status_code=404, error_code="NOT_FOUND_ERROR")
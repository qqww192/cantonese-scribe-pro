"""
Logging configuration for the application.
"""

import logging
import logging.config
import sys
from typing import Dict, Any

from ..core.config import get_settings


def setup_logging() -> None:
    """Setup application logging configuration."""
    settings = get_settings()
    
    # Ensure log directory exists
    import os
    os.makedirs("/tmp/cantonese-scribe", exist_ok=True)
    
    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": "INFO",
                "formatter": "default",
                "stream": sys.stdout,
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "DEBUG" if settings.debug else "INFO",
                "formatter": "detailed",
                "filename": "/tmp/cantonese-scribe/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 3,
            }
        },
        "loggers": {
            "app": {
                "level": "DEBUG" if settings.debug else "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "fastapi": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            }
        },
        "root": {
            "level": "WARNING",
            "handlers": ["console"],
        }
    }
    
    # Apply configuration
    logging.config.dictConfig(logging_config)
    
    # Set logging level based on environment
    if settings.environment == "development":
        logging.getLogger().setLevel(logging.DEBUG)
    elif settings.environment == "production":
        logging.getLogger().setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get logger instance for a module."""
    return logging.getLogger(f"app.{name}")
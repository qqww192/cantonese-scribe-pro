"""
Retry and circuit breaker service for reliable operation.

This service provides exponential backoff retry logic and circuit breaker
patterns for external API calls and critical operations.
"""

import asyncio
import logging
import time
from typing import Any, Callable, Dict, List, Optional, Type, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps

from ..core.config import get_settings
from ..core.exceptions import ExternalAPIError, ProcessingError

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, rejecting requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    
    # Exceptions that should trigger retries
    retryable_exceptions: tuple = (
        ExternalAPIError, 
        ProcessingError,
        asyncio.TimeoutError,
        ConnectionError
    )
    
    # Exceptions that should never be retried
    non_retryable_exceptions: tuple = (
        ValueError,
        TypeError,
        KeyError,
        AttributeError
    )


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5      # Failures to open circuit
    recovery_timeout: int = 60      # Seconds before trying again
    success_threshold: int = 3      # Successes to close circuit
    timeout: float = 30.0           # Operation timeout


@dataclass
class CircuitBreakerState:
    """State tracking for circuit breaker."""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    total_requests: int = 0
    total_failures: int = 0


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass


class RetryService:
    """Service for handling retries and circuit breaking."""
    
    def __init__(self):
        self._settings = get_settings()
        self._circuit_breakers: Dict[str, CircuitBreakerState] = {}
        self._default_retry_config = RetryConfig()
        self._default_circuit_config = CircuitBreakerConfig()
    
    async def with_retry(
        self,
        operation: Callable,
        *args,
        retry_config: Optional[RetryConfig] = None,
        circuit_breaker_name: Optional[str] = None,
        circuit_config: Optional[CircuitBreakerConfig] = None,
        **kwargs
    ) -> Any:
        """
        Execute operation with retry logic and optional circuit breaker.
        
        Args:
            operation: The async function to execute
            *args: Positional arguments for the operation
            retry_config: Retry configuration (uses default if None)
            circuit_breaker_name: Name for circuit breaker tracking
            circuit_config: Circuit breaker configuration
            **kwargs: Keyword arguments for the operation
            
        Returns:
            Result of the successful operation
            
        Raises:
            Exception: The final exception after all retries exhausted
        """
        config = retry_config or self._default_retry_config
        
        # Check circuit breaker if specified
        if circuit_breaker_name:
            await self._check_circuit_breaker(circuit_breaker_name, circuit_config)
        
        last_exception = None
        
        for attempt in range(config.max_attempts):
            try:
                logger.debug(f"Attempt {attempt + 1}/{config.max_attempts} for {operation.__name__}")
                
                # Execute operation with timeout if circuit breaker is configured
                if circuit_breaker_name and circuit_config:
                    try:
                        result = await asyncio.wait_for(
                            operation(*args, **kwargs),
                            timeout=circuit_config.timeout
                        )
                    except asyncio.TimeoutError as e:
                        logger.warning(f"Operation {operation.__name__} timed out after {circuit_config.timeout}s")
                        raise ProcessingError(f"Operation timed out: {str(e)}")
                else:
                    result = await operation(*args, **kwargs)
                
                # Success - record for circuit breaker and return
                if circuit_breaker_name:
                    await self._record_success(circuit_breaker_name)
                
                if attempt > 0:
                    logger.info(f"Operation {operation.__name__} succeeded on attempt {attempt + 1}")
                
                return result
                
            except Exception as e:
                last_exception = e
                
                # Record failure for circuit breaker
                if circuit_breaker_name:
                    await self._record_failure(circuit_breaker_name, e)
                
                # Check if exception is retryable
                if not self._is_retryable_exception(e, config):
                    logger.error(f"Non-retryable exception in {operation.__name__}: {str(e)}")
                    raise e
                
                # Calculate delay for next attempt
                if attempt < config.max_attempts - 1:  # Don't delay after last attempt
                    delay = self._calculate_delay(attempt, config)
                    logger.warning(
                        f"Attempt {attempt + 1} failed for {operation.__name__}: {str(e)}. "
                        f"Retrying in {delay:.2f} seconds..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"All {config.max_attempts} attempts failed for {operation.__name__}: {str(e)}"
                    )
        
        # All attempts exhausted
        raise last_exception
    
    def _is_retryable_exception(self, exception: Exception, config: RetryConfig) -> bool:
        """Check if exception should trigger a retry."""
        # Never retry non-retryable exceptions
        if isinstance(exception, config.non_retryable_exceptions):
            return False
        
        # Always retry retryable exceptions
        if isinstance(exception, config.retryable_exceptions):
            return True
        
        # For other exceptions, be conservative and don't retry
        return False
    
    def _calculate_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate delay for next retry attempt."""
        # Exponential backoff: base_delay * (exponential_base ^ attempt)
        delay = config.base_delay * (config.exponential_base ** attempt)
        
        # Cap at max_delay
        delay = min(delay, config.max_delay)
        
        # Add jitter to avoid thundering herd
        if config.jitter:
            import random
            jitter = random.uniform(0.8, 1.2)
            delay *= jitter
        
        return delay
    
    async def _check_circuit_breaker(
        self, 
        name: str, 
        config: Optional[CircuitBreakerConfig] = None
    ) -> None:
        """Check circuit breaker state and raise if open."""
        config = config or self._default_circuit_config
        state = self._get_circuit_state(name)
        
        state.total_requests += 1
        
        if state.state == CircuitState.OPEN:
            # Check if enough time has passed to try recovery
            if (state.last_failure_time and 
                datetime.utcnow() - state.last_failure_time > timedelta(seconds=config.recovery_timeout)):
                # Move to half-open state
                state.state = CircuitState.HALF_OPEN
                state.success_count = 0
                logger.info(f"Circuit breaker {name} moved to HALF_OPEN state")
            else:
                # Circuit is still open
                raise CircuitBreakerOpenError(f"Circuit breaker {name} is OPEN")
    
    async def _record_success(self, name: str) -> None:
        """Record successful operation for circuit breaker."""
        state = self._get_circuit_state(name)
        state.last_success_time = datetime.utcnow()
        
        if state.state == CircuitState.HALF_OPEN:
            state.success_count += 1
            config = self._default_circuit_config
            
            if state.success_count >= config.success_threshold:
                # Close the circuit
                state.state = CircuitState.CLOSED
                state.failure_count = 0
                state.success_count = 0
                logger.info(f"Circuit breaker {name} moved to CLOSED state")
    
    async def _record_failure(self, name: str, exception: Exception) -> None:
        """Record failed operation for circuit breaker."""
        state = self._get_circuit_state(name)
        state.failure_count += 1
        state.total_failures += 1
        state.last_failure_time = datetime.utcnow()
        
        config = self._default_circuit_config
        
        if state.state in [CircuitState.CLOSED, CircuitState.HALF_OPEN]:
            if state.failure_count >= config.failure_threshold:
                # Open the circuit
                state.state = CircuitState.OPEN
                state.success_count = 0
                logger.error(f"Circuit breaker {name} moved to OPEN state after {state.failure_count} failures")
    
    def _get_circuit_state(self, name: str) -> CircuitBreakerState:
        """Get or create circuit breaker state."""
        if name not in self._circuit_breakers:
            self._circuit_breakers[name] = CircuitBreakerState()
        return self._circuit_breakers[name]
    
    def get_circuit_breaker_status(self, name: str) -> Dict[str, Any]:
        """Get circuit breaker status information."""
        if name not in self._circuit_breakers:
            return {
                "name": name,
                "state": CircuitState.CLOSED,
                "exists": False
            }
        
        state = self._circuit_breakers[name]
        return {
            "name": name,
            "state": state.state,
            "failure_count": state.failure_count,
            "success_count": state.success_count,
            "total_requests": state.total_requests,
            "total_failures": state.total_failures,
            "last_failure_time": state.last_failure_time.isoformat() if state.last_failure_time else None,
            "last_success_time": state.last_success_time.isoformat() if state.last_success_time else None,
            "exists": True
        }
    
    def get_all_circuit_breaker_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all circuit breakers."""
        return {
            name: self.get_circuit_breaker_status(name)
            for name in self._circuit_breakers.keys()
        }
    
    def reset_circuit_breaker(self, name: str) -> bool:
        """Reset circuit breaker to closed state."""
        if name in self._circuit_breakers:
            state = self._circuit_breakers[name]
            state.state = CircuitState.CLOSED
            state.failure_count = 0
            state.success_count = 0
            logger.info(f"Circuit breaker {name} manually reset to CLOSED state")
            return True
        return False
    
    def remove_circuit_breaker(self, name: str) -> bool:
        """Remove circuit breaker tracking."""
        if name in self._circuit_breakers:
            del self._circuit_breakers[name]
            logger.info(f"Circuit breaker {name} removed")
            return True
        return False


# Global service instance
retry_service = RetryService()


def with_retry(
    retry_config: Optional[RetryConfig] = None,
    circuit_breaker_name: Optional[str] = None,
    circuit_config: Optional[CircuitBreakerConfig] = None
):
    """
    Decorator for adding retry logic and circuit breaking to async functions.
    
    Usage:
        @with_retry(
            retry_config=RetryConfig(max_attempts=5),
            circuit_breaker_name="external_api",
            circuit_config=CircuitBreakerConfig(failure_threshold=10)
        )
        async def call_external_api():
            # API call code here
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await retry_service.with_retry(
                func,
                *args,
                retry_config=retry_config,
                circuit_breaker_name=circuit_breaker_name,
                circuit_config=circuit_config,
                **kwargs
            )
        return wrapper
    return decorator


# Convenience decorators for common scenarios
def with_api_retry(service_name: str, max_attempts: int = 3):
    """Decorator for API calls with default retry and circuit breaker."""
    return with_retry(
        retry_config=RetryConfig(
            max_attempts=max_attempts,
            base_delay=2.0,
            max_delay=30.0,
            retryable_exceptions=(
                ExternalAPIError,
                asyncio.TimeoutError,
                ConnectionError
            )
        ),
        circuit_breaker_name=service_name,
        circuit_config=CircuitBreakerConfig(
            failure_threshold=5,
            recovery_timeout=60,
            timeout=30.0
        )
    )


def with_processing_retry(max_attempts: int = 2):
    """Decorator for processing operations with limited retries."""
    return with_retry(
        retry_config=RetryConfig(
            max_attempts=max_attempts,
            base_delay=1.0,
            max_delay=10.0,
            retryable_exceptions=(ProcessingError,)
        )
    )


# Dependency function for FastAPI
async def get_retry_service() -> RetryService:
    """Dependency to get retry service."""
    return retry_service
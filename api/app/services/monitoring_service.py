"""
Comprehensive monitoring service for CantoneseScribe.

This service provides health checks, metrics collection, and system monitoring
for all components of the application.
"""

import asyncio
import logging
import time
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

from ..core.config import get_settings
from ..services.database_service import database_service
from ..services.google_speech_service import google_speech_service
from ..services.whisper_service import whisper_service
from ..services.unified_transcription_service import unified_transcription_service
from ..services.retry_service import retry_service
from ..services.progress_service import progress_service

logger = logging.getLogger(__name__)


@dataclass
class HealthStatus:
    """Health status data structure."""
    service: str
    status: str  # healthy, degraded, unhealthy
    last_check: str
    response_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class SystemMetrics:
    """System metrics data structure."""
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    active_connections: int
    uptime_seconds: float
    timestamp: str


class MonitoringService:
    """Service for comprehensive system monitoring."""
    
    def __init__(self):
        self._settings = get_settings()
        self._start_time = time.time()
        self._last_metrics = {}
        self._health_cache = {}
        self._cache_timeout = 30  # 30 seconds cache
    
    async def get_comprehensive_health(self) -> Dict[str, Any]:
        """Get comprehensive health status of all services."""
        try:
            health_checks = await asyncio.gather(
                self._check_database_health(),
                self._check_transcription_health(),
                self._check_google_speech_health(),
                self._check_whisper_health(),
                self._check_progress_service_health(),
                self._check_retry_service_health(),
                return_exceptions=True
            )
            
            # Process results
            services = {}
            overall_status = "healthy"
            
            service_names = [
                "database", "transcription", "google_speech", 
                "whisper", "progress", "retry_service"
            ]
            
            for i, result in enumerate(health_checks):
                service_name = service_names[i]
                
                if isinstance(result, Exception):
                    services[service_name] = HealthStatus(
                        service=service_name,
                        status="unhealthy",
                        last_check=datetime.utcnow().isoformat(),
                        error_message=str(result)
                    )
                    overall_status = "unhealthy"
                else:
                    services[service_name] = result
                    if result.status == "unhealthy":
                        overall_status = "unhealthy"
                    elif result.status == "degraded" and overall_status == "healthy":
                        overall_status = "degraded"
            
            # Get system metrics
            system_metrics = await self._get_system_metrics()
            
            return {
                "status": overall_status,
                "timestamp": datetime.utcnow().isoformat(),
                "uptime_seconds": time.time() - self._start_time,
                "services": {name: asdict(status) for name, status in services.items()},
                "system": asdict(system_metrics),
                "environment": self._settings.environment
            }
            
        except Exception as e:
            logger.error(f"Error getting comprehensive health: {str(e)}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def _check_database_health(self) -> HealthStatus:
        """Check database service health."""
        start_time = time.time()
        
        try:
            is_healthy = await database_service.health_check()
            response_time = (time.time() - start_time) * 1000
            
            if is_healthy:
                status = "healthy" if response_time < 1000 else "degraded"
                return HealthStatus(
                    service="database",
                    status=status,
                    last_check=datetime.utcnow().isoformat(),
                    response_time_ms=response_time
                )
            else:
                return HealthStatus(
                    service="database",
                    status="unhealthy",
                    last_check=datetime.utcnow().isoformat(),
                    response_time_ms=response_time,
                    error_message="Database health check failed"
                )
                
        except Exception as e:
            return HealthStatus(
                service="database",
                status="unhealthy",
                last_check=datetime.utcnow().isoformat(),
                error_message=str(e)
            )
    
    async def _check_transcription_health(self) -> HealthStatus:
        """Check transcription service health."""
        try:
            provider_status = await unified_transcription_service.get_provider_status()
            
            # Determine overall transcription health
            available_providers = sum(
                1 for provider in provider_status["providers"].values()
                if provider["status"] == "available"
            )
            
            total_providers = len(provider_status["providers"])
            
            if available_providers == total_providers:
                status = "healthy"
            elif available_providers > 0:
                status = "degraded"
            else:
                status = "unhealthy"
            
            return HealthStatus(
                service="transcription",
                status=status,
                last_check=datetime.utcnow().isoformat(),
                details={
                    "available_providers": available_providers,
                    "total_providers": total_providers,
                    "providers": provider_status["providers"]
                }
            )
            
        except Exception as e:
            return HealthStatus(
                service="transcription",
                status="unhealthy",
                last_check=datetime.utcnow().isoformat(),
                error_message=str(e)
            )
    
    async def _check_google_speech_health(self) -> HealthStatus:
        """Check Google Speech service health."""
        start_time = time.time()
        
        try:
            is_healthy = await google_speech_service.health_check()
            response_time = (time.time() - start_time) * 1000
            
            status = "healthy" if is_healthy else "unhealthy"
            if is_healthy and response_time > 5000:  # 5 seconds
                status = "degraded"
            
            return HealthStatus(
                service="google_speech",
                status=status,
                last_check=datetime.utcnow().isoformat(),
                response_time_ms=response_time,
                error_message=None if is_healthy else "Google Speech API unavailable"
            )
            
        except Exception as e:
            return HealthStatus(
                service="google_speech",
                status="unhealthy",
                last_check=datetime.utcnow().isoformat(),
                error_message=str(e)
            )
    
    async def _check_whisper_health(self) -> HealthStatus:
        """Check Whisper service health."""
        start_time = time.time()
        
        try:
            is_healthy = await whisper_service.validate_api_key()
            response_time = (time.time() - start_time) * 1000
            
            status = "healthy" if is_healthy else "unhealthy"
            if is_healthy and response_time > 3000:  # 3 seconds
                status = "degraded"
            
            return HealthStatus(
                service="whisper",
                status=status,
                last_check=datetime.utcnow().isoformat(),
                response_time_ms=response_time,
                error_message=None if is_healthy else "Whisper API key invalid or API unavailable"
            )
            
        except Exception as e:
            return HealthStatus(
                service="whisper",
                status="unhealthy",
                last_check=datetime.utcnow().isoformat(),
                error_message=str(e)
            )
    
    async def _check_progress_service_health(self) -> HealthStatus:
        """Check progress service health."""
        try:
            stats = progress_service.get_stats()
            
            # Consider healthy if service is responsive
            # Could add more sophisticated checks based on connection counts
            status = "healthy"
            
            return HealthStatus(
                service="progress",
                status=status,
                last_check=datetime.utcnow().isoformat(),
                details=stats
            )
            
        except Exception as e:
            return HealthStatus(
                service="progress",
                status="unhealthy",
                last_check=datetime.utcnow().isoformat(),
                error_message=str(e)
            )
    
    async def _check_retry_service_health(self) -> HealthStatus:
        """Check retry service health."""
        try:
            circuit_breakers = retry_service.get_all_circuit_breaker_status()
            
            # Check if any circuit breakers are open
            open_circuits = [
                name for name, status in circuit_breakers.items()
                if status.get("state") == "open"
            ]
            
            if open_circuits:
                status = "degraded"
                error_message = f"Circuit breakers open: {', '.join(open_circuits)}"
            else:
                status = "healthy"
                error_message = None
            
            return HealthStatus(
                service="retry_service",
                status=status,
                last_check=datetime.utcnow().isoformat(),
                error_message=error_message,
                details={
                    "circuit_breakers": len(circuit_breakers),
                    "open_circuits": len(open_circuits)
                }
            )
            
        except Exception as e:
            return HealthStatus(
                service="retry_service",
                status="unhealthy",
                last_check=datetime.utcnow().isoformat(),
                error_message=str(e)
            )
    
    async def _get_system_metrics(self) -> SystemMetrics:
        """Get system performance metrics."""
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Get network connections (approximate active connections)
            connections = len(psutil.net_connections())
            
            return SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_percent=disk.percent,
                active_connections=connections,
                uptime_seconds=time.time() - self._start_time,
                timestamp=datetime.utcnow().isoformat()
            )
            
        except Exception as e:
            logger.warning(f"Error getting system metrics: {str(e)}")
            return SystemMetrics(
                cpu_percent=0.0,
                memory_percent=0.0,
                disk_percent=0.0,
                active_connections=0,
                uptime_seconds=time.time() - self._start_time,
                timestamp=datetime.utcnow().isoformat()
            )
    
    async def get_service_metrics(self) -> Dict[str, Any]:
        """Get application-specific metrics."""
        try:
            # Get database metrics
            db_stats = {}
            try:
                # Get some basic stats from database
                user_stats = await database_service.get_user_usage_stats("system", days=1)
                db_stats = user_stats.get("period_stats", {})
            except Exception as e:
                logger.warning(f"Error getting database stats: {str(e)}")
            
            # Get progress service metrics
            progress_stats = progress_service.get_stats()
            
            # Get circuit breaker metrics
            circuit_breaker_stats = retry_service.get_all_circuit_breaker_status()
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "database": db_stats,
                "progress_service": progress_stats,
                "circuit_breakers": circuit_breaker_stats,
                "uptime_seconds": time.time() - self._start_time
            }
            
        except Exception as e:
            logger.error(f"Error getting service metrics: {str(e)}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def get_cost_metrics(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get cost-related metrics."""
        try:
            if user_id:
                # Get user-specific cost data
                daily_cost = await database_service.get_daily_cost(user_id)
                usage_stats = await database_service.get_user_usage_stats(user_id, days=7)
            else:
                # Get system-wide cost data
                daily_cost = await database_service.get_daily_cost()
                usage_stats = {"period_stats": {"total_cost": daily_cost}}
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "daily_cost": daily_cost,
                "max_daily_cost": self._settings.max_daily_cost,
                "cost_utilization": daily_cost / self._settings.max_daily_cost if self._settings.max_daily_cost > 0 else 0,
                "usage_stats": usage_stats,
                "user_id": user_id
            }
            
        except Exception as e:
            logger.error(f"Error getting cost metrics: {str(e)}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def check_alerts(self) -> List[Dict[str, Any]]:
        """Check for system alerts that need attention."""
        alerts = []
        
        try:
            # Check system resource usage
            system_metrics = await self._get_system_metrics()
            
            if system_metrics.cpu_percent > 90:
                alerts.append({
                    "type": "high_cpu",
                    "severity": "warning",
                    "message": f"High CPU usage: {system_metrics.cpu_percent:.1f}%",
                    "value": system_metrics.cpu_percent,
                    "threshold": 90
                })
            
            if system_metrics.memory_percent > 85:
                alerts.append({
                    "type": "high_memory",
                    "severity": "warning",
                    "message": f"High memory usage: {system_metrics.memory_percent:.1f}%",
                    "value": system_metrics.memory_percent,
                    "threshold": 85
                })
            
            if system_metrics.disk_percent > 90:
                alerts.append({
                    "type": "high_disk",
                    "severity": "critical",
                    "message": f"High disk usage: {system_metrics.disk_percent:.1f}%",
                    "value": system_metrics.disk_percent,
                    "threshold": 90
                })
            
            # Check daily cost
            cost_metrics = await self.get_cost_metrics()
            cost_utilization = cost_metrics.get("cost_utilization", 0)
            
            if cost_utilization > 0.9:
                alerts.append({
                    "type": "high_cost",
                    "severity": "critical",
                    "message": f"Daily cost limit nearly reached: {cost_utilization:.1%}",
                    "value": cost_utilization,
                    "threshold": 0.9
                })
            elif cost_utilization > 0.7:
                alerts.append({
                    "type": "elevated_cost",
                    "severity": "warning",
                    "message": f"Daily cost usage elevated: {cost_utilization:.1%}",
                    "value": cost_utilization,
                    "threshold": 0.7
                })
            
            # Check circuit breakers
            circuit_breakers = retry_service.get_all_circuit_breaker_status()
            open_circuits = [
                name for name, status in circuit_breakers.items()
                if status.get("state") == "open"
            ]
            
            if open_circuits:
                alerts.append({
                    "type": "circuit_breaker_open",
                    "severity": "warning",
                    "message": f"Circuit breakers open: {', '.join(open_circuits)}",
                    "services": open_circuits
                })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking alerts: {str(e)}")
            return [{
                "type": "monitoring_error",
                "severity": "warning",
                "message": f"Error checking system alerts: {str(e)}"
            }]


# Global service instance
monitoring_service = MonitoringService()


# Dependency function for FastAPI
async def get_monitoring_service() -> MonitoringService:
    """Dependency to get monitoring service."""
    return monitoring_service
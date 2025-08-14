"""
Advanced health check endpoint for comprehensive monitoring
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import asyncio
import time
import psutil
from datetime import datetime

from core.config import get_settings
from services.monitoring_service import monitoring_service
from services.database_service import database_service

router = APIRouter()

@router.get("/health/live")
async def liveness_check() -> Dict[str, str]:
    """Simple liveness check for load balancer"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """Readiness check for deployment"""
    try:
        # Quick database connection test
        db_healthy = await database_service.health_check()
        
        if not db_healthy:
            raise HTTPException(status_code=503, detail="Database not ready")
        
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Not ready: {str(e)}")

@router.get("/health/metrics")
async def metrics_endpoint() -> Dict[str, Any]:
    """Prometheus-style metrics endpoint"""
    try:
        # Get comprehensive metrics
        service_metrics = await monitoring_service.get_service_metrics()
        cost_metrics = await monitoring_service.get_cost_metrics()
        alerts = await monitoring_service.check_alerts()
        
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu_usage": cpu_percent / 100,
                "memory_usage": memory.percent / 100,
                "disk_usage": disk.percent / 100,
                "uptime_seconds": service_metrics.get("uptime_seconds", 0)
            },
            "application": {
                "database": service_metrics.get("database", {}),
                "progress_service": service_metrics.get("progress_service", {}),
                "circuit_breakers": service_metrics.get("circuit_breakers", {})
            },
            "cost": {
                "daily_cost": cost_metrics.get("daily_cost", 0),
                "cost_utilization": cost_metrics.get("cost_utilization", 0),
                "max_daily_cost": cost_metrics.get("max_daily_cost", 100)
            },
            "alerts": {
                "active_alerts": len(alerts),
                "critical_alerts": len([a for a in alerts if a.get("severity") == "critical"]),
                "warning_alerts": len([a for a in alerts if a.get("severity") == "warning"])
            }
        }
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics collection failed: {str(e)}")

@router.get("/health/startup")
async def startup_check() -> Dict[str, Any]:
    """Startup health check for container orchestration"""
    settings = get_settings()
    
    # Check critical configuration
    critical_config = {
        "database_url": bool(settings.database_url),
        "openai_api_key": bool(settings.openai_api_key),
        "google_cloud_credentials": bool(settings.google_cloud_credentials),
        "stripe_secret_key": bool(settings.stripe_secret_key)
    }
    
    missing_config = [k for k, v in critical_config.items() if not v]
    
    if missing_config:
        raise HTTPException(
            status_code=503, 
            detail=f"Missing critical configuration: {', '.join(missing_config)}"
        )
    
    return {
        "status": "configured",
        "timestamp": datetime.utcnow().isoformat(),
        "configuration": "complete"
    }

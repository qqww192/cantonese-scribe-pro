"""
Comprehensive health check and monitoring endpoints.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from ...dependencies import get_current_user
from ....services.monitoring_service import MonitoringService, get_monitoring_service
from ....services.retry_service import RetryService, get_retry_service
from ....core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=dict)
async def basic_health_check():
    """
    Basic health check endpoint.
    
    Returns simple status for load balancer health checks.
    """
    return {
        "status": "healthy",
        "service": "cantonese-scribe-api",
        "version": "1.0.0"
    }


@router.get("/detailed", response_model=dict)
async def detailed_health_check(
    monitoring_svc: MonitoringService = Depends(get_monitoring_service)
):
    """
    Comprehensive health check of all services and dependencies.
    
    This endpoint checks the health of:
    - Database connection
    - External APIs (Google Speech, Whisper)
    - Progress tracking service
    - Circuit breakers
    - System resources
    """
    try:
        health_info = await monitoring_svc.get_comprehensive_health()
        
        # Return appropriate HTTP status based on overall health
        if health_info["status"] == "healthy":
            status_code = 200
        elif health_info["status"] == "degraded":
            status_code = 200  # Still operational
        else:
            status_code = 503  # Service unavailable
        
        return JSONResponse(
            status_code=status_code,
            content={
                "success": True,
                "health": health_info
            }
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": str(e),
                "status": "unhealthy"
            }
        )


@router.get("/metrics", response_model=dict)
async def get_service_metrics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    monitoring_svc: MonitoringService = Depends(get_monitoring_service)
):
    """
    Get detailed service metrics and statistics.
    
    Requires authentication for security.
    """
    try:
        metrics = await monitoring_svc.get_service_metrics()
        
        return {
            "success": True,
            "metrics": metrics
        }
        
    except Exception as e:
        logger.error(f"Error getting service metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get service metrics")


@router.get("/alerts", response_model=dict)
async def get_system_alerts(
    current_user: Dict[str, Any] = Depends(get_current_user),
    monitoring_svc: MonitoringService = Depends(get_monitoring_service)
):
    """
    Get current system alerts and warnings.
    
    Requires authentication for security.
    """
    try:
        alerts = await monitoring_svc.check_alerts()
        
        return {
            "success": True,
            "alerts": alerts,
            "alert_count": len(alerts)
        }
        
    except Exception as e:
        logger.error(f"Error getting system alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system alerts")


@router.get("/circuit-breakers", response_model=dict) 
async def get_circuit_breaker_status(
    current_user: Dict[str, Any] = Depends(get_current_user),
    retry_svc: RetryService = Depends(get_retry_service)
):
    """
    Get status of all circuit breakers.
    
    Requires authentication for security.
    """
    try:
        status = retry_svc.get_all_circuit_breaker_status()
        
        return {
            "success": True,
            "circuit_breakers": status
        }
        
    except Exception as e:
        logger.error(f"Error getting circuit breaker status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get circuit breaker status")


@router.post("/circuit-breakers/{name}/reset", response_model=dict)
async def reset_circuit_breaker(
    name: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    retry_svc: RetryService = Depends(get_retry_service)
):
    """
    Reset a specific circuit breaker to closed state.
    
    Requires authentication for security. Use with caution.
    """
    try:
        success = retry_svc.reset_circuit_breaker(name)
        
        if not success:
            raise HTTPException(status_code=404, detail="Circuit breaker not found")
        
        return {
            "success": True,
            "message": f"Circuit breaker '{name}' has been reset"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting circuit breaker: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset circuit breaker")


@router.get("/cost", response_model=dict)
async def get_cost_metrics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    monitoring_svc: MonitoringService = Depends(get_monitoring_service)
):
    """
    Get cost metrics for the current user.
    """
    try:
        cost_metrics = await monitoring_svc.get_cost_metrics(current_user["id"])
        
        return {
            "success": True,
            "cost_metrics": cost_metrics
        }
        
    except Exception as e:
        logger.error(f"Error getting cost metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get cost metrics")


@router.get("/system/cost", response_model=dict)
async def get_system_cost_metrics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    monitoring_svc: MonitoringService = Depends(get_monitoring_service)
):
    """
    Get system-wide cost metrics.
    
    Requires authentication. In production, should require admin role.
    """
    try:
        # In a real implementation, check if user has admin role
        # For now, allow any authenticated user
        
        cost_metrics = await monitoring_svc.get_cost_metrics()
        
        return {
            "success": True,
            "system_cost_metrics": cost_metrics
        }
        
    except Exception as e:
        logger.error(f"Error getting system cost metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system cost metrics")
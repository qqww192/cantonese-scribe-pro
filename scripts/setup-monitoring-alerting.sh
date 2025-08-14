#!/bin/bash

# CantoneseScribe Production Monitoring & Alerting Setup
# This script configures comprehensive monitoring for all system components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
MONITORING_CONFIG_FILE="monitoring-config.json"
ALERTS_CONFIG_FILE="alerts-config.json"
DASHBOARD_CONFIG_FILE="dashboard-config.json"

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_message $BLUE "🔧 Checking monitoring prerequisites..."
    
    local missing_tools=()
    
    # Check for curl for API testing
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    # Check for jq for JSON processing
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_message $RED "❌ Missing required tools: ${missing_tools[*]}"
        print_message $YELLOW "Install missing tools: apt-get install curl jq (Ubuntu) or brew install curl jq (macOS)"
        exit 1
    fi
    
    print_message $GREEN "✅ All monitoring prerequisites are installed"
}

# Function to create comprehensive monitoring configuration
create_monitoring_configuration() {
    print_message $BLUE "📊 Creating monitoring configuration..."
    
    # Create main monitoring configuration
    cat > "$MONITORING_CONFIG_FILE" << 'EOF'
{
  "monitoring": {
    "name": "CantoneseScribe Production Monitoring",
    "version": "1.0",
    "environment": "production",
    "services": {
      "vercel": {
        "enabled": true,
        "analytics": true,
        "functions_monitoring": true,
        "edge_functions": true
      },
      "sentry": {
        "enabled": true,
        "error_tracking": true,
        "performance_monitoring": true,
        "traces_sample_rate": 0.1,
        "profiles_sample_rate": 0.1
      },
      "datadog": {
        "enabled": true,
        "apm": true,
        "logs": true,
        "metrics": true,
        "synthetic_monitoring": true
      },
      "uptime_robot": {
        "enabled": true,
        "monitors": [
          {
            "name": "Main Health Check",
            "url": "https://cantonese-scribe.vercel.app/api/v1/health",
            "type": "HTTP",
            "interval": 300
          },
          {
            "name": "Detailed Health Check",
            "url": "https://cantonese-scribe.vercel.app/api/v1/health/detailed",
            "type": "HTTP",
            "interval": 600
          },
          {
            "name": "Frontend Availability",
            "url": "https://cantonese-scribe.vercel.app/",
            "type": "HTTP",
            "interval": 300
          }
        ]
      },
      "mixpanel": {
        "enabled": true,
        "events_tracking": true,
        "user_analytics": true,
        "conversion_tracking": true
      }
    },
    "health_checks": {
      "endpoints": [
        "/api/v1/health",
        "/api/v1/health/detailed",
        "/api/v1/health/metrics"
      ],
      "intervals": {
        "basic": 60,
        "detailed": 300,
        "metrics": 300
      }
    },
    "metrics": {
      "system": [
        "cpu_usage",
        "memory_usage",
        "disk_usage",
        "network_io",
        "active_connections"
      ],
      "application": [
        "request_count",
        "response_time",
        "error_rate",
        "active_users",
        "transcription_queue_size",
        "daily_cost",
        "api_quota_usage"
      ],
      "business": [
        "user_registrations",
        "transcription_requests",
        "payment_success_rate",
        "subscription_churn",
        "customer_satisfaction"
      ]
    }
  }
}
EOF
    
    print_message $GREEN "✅ Monitoring configuration created: $MONITORING_CONFIG_FILE"
}

# Function to create alerting configuration
create_alerting_configuration() {
    print_message $BLUE "🚨 Creating alerting configuration..."
    
    # Create comprehensive alerts configuration
    cat > "$ALERTS_CONFIG_FILE" << 'EOF'
{
  "alerts": {
    "version": "1.0",
    "global_settings": {
      "escalation_delay": 300,
      "auto_resolve": true,
      "maintenance_mode": false
    },
    "notification_channels": {
      "email": {
        "enabled": true,
        "recipients": ["admin@cantonese-scribe.com", "devops@cantonese-scribe.com"],
        "severity_filter": ["critical", "warning"]
      },
      "slack": {
        "enabled": true,
        "webhook_url": "SLACK_WEBHOOK_URL",
        "channel": "#alerts-production",
        "severity_filter": ["critical", "warning", "info"]
      },
      "pager_duty": {
        "enabled": false,
        "integration_key": "PAGERDUTY_INTEGRATION_KEY",
        "severity_filter": ["critical"]
      }
    },
    "alert_rules": [
      {
        "name": "High Error Rate",
        "description": "API error rate exceeds 5%",
        "condition": "error_rate > 0.05",
        "severity": "critical",
        "duration": "5m",
        "channels": ["email", "slack"],
        "runbook_url": "https://docs.cantonese-scribe.com/runbooks/high-error-rate"
      },
      {
        "name": "High Response Time",
        "description": "API response time P95 exceeds 5 seconds",
        "condition": "response_time_p95 > 5000",
        "severity": "warning",
        "duration": "10m",
        "channels": ["email", "slack"]
      },
      {
        "name": "Database Connection Issues",
        "description": "Database health check failing",
        "condition": "database_health != 'healthy'",
        "severity": "critical",
        "duration": "2m",
        "channels": ["email", "slack", "pager_duty"]
      },
      {
        "name": "High Daily Cost",
        "description": "Daily cost exceeds 80% of limit",
        "condition": "daily_cost > (max_daily_cost * 0.8)",
        "severity": "warning",
        "duration": "0m",
        "channels": ["email", "slack"]
      },
      {
        "name": "Critical Daily Cost",
        "description": "Daily cost exceeds 95% of limit",
        "condition": "daily_cost > (max_daily_cost * 0.95)",
        "severity": "critical",
        "duration": "0m",
        "channels": ["email", "slack"]
      },
      {
        "name": "Queue Backup",
        "description": "Transcription queue has too many pending jobs",
        "condition": "transcription_queue_size > 50",
        "severity": "warning",
        "duration": "15m",
        "channels": ["email", "slack"]
      },
      {
        "name": "Low User Activity",
        "description": "No new user registrations in 24 hours",
        "condition": "new_users_24h == 0",
        "severity": "info",
        "duration": "24h",
        "channels": ["slack"]
      },
      {
        "name": "High Memory Usage",
        "description": "System memory usage exceeds 85%",
        "condition": "memory_usage > 0.85",
        "severity": "warning",
        "duration": "10m",
        "channels": ["email", "slack"]
      },
      {
        "name": "API Quota Warning",
        "description": "Google API quota usage exceeds 80%",
        "condition": "api_quota_usage > 0.8",
        "severity": "warning",
        "duration": "0m",
        "channels": ["email", "slack"]
      },
      {
        "name": "Payment Processing Failure",
        "description": "High rate of payment failures",
        "condition": "payment_failure_rate > 0.1",
        "severity": "critical",
        "duration": "5m",
        "channels": ["email", "slack"]
      }
    ],
    "maintenance_windows": [
      {
        "name": "Weekly Maintenance",
        "schedule": "0 2 * * 0",
        "duration": "2h",
        "suppress_alerts": ["info", "warning"]
      }
    ]
  }
}
EOF
    
    print_message $GREEN "✅ Alerting configuration created: $ALERTS_CONFIG_FILE"
}

# Function to create dashboard configuration
create_dashboard_configuration() {
    print_message $BLUE "📈 Creating dashboard configuration..."
    
    # Create dashboard configuration
    cat > "$DASHBOARD_CONFIG_FILE" << 'EOF'
{
  "dashboards": {
    "production_overview": {
      "name": "CantoneseScribe Production Overview",
      "refresh_interval": "30s",
      "panels": [
        {
          "title": "System Health",
          "type": "stat",
          "metrics": [
            "system_status",
            "uptime_percentage",
            "active_users"
          ],
          "thresholds": {
            "green": [0.99, 1.0],
            "yellow": [0.95, 0.99],
            "red": [0, 0.95]
          }
        },
        {
          "title": "API Performance",
          "type": "graph",
          "metrics": [
            "response_time_p50",
            "response_time_p95",
            "response_time_p99"
          ],
          "time_range": "1h"
        },
        {
          "title": "Error Rates",
          "type": "graph",
          "metrics": [
            "error_rate",
            "4xx_rate",
            "5xx_rate"
          ],
          "time_range": "1h"
        },
        {
          "title": "Transcription Metrics",
          "type": "table",
          "metrics": [
            "transcriptions_processed",
            "transcription_success_rate",
            "avg_processing_time",
            "queue_size"
          ]
        },
        {
          "title": "Cost Tracking",
          "type": "stat",
          "metrics": [
            "daily_cost",
            "monthly_cost",
            "cost_per_transcription",
            "cost_utilization"
          ]
        },
        {
          "title": "User Activity",
          "type": "graph",
          "metrics": [
            "new_users",
            "active_users",
            "user_sessions",
            "conversion_rate"
          ],
          "time_range": "24h"
        }
      ]
    },
    "infrastructure": {
      "name": "Infrastructure Monitoring",
      "panels": [
        {
          "title": "Vercel Functions",
          "type": "graph",
          "metrics": [
            "function_invocations",
            "function_duration",
            "function_errors",
            "cold_starts"
          ]
        },
        {
          "title": "Database Performance",
          "type": "graph",
          "metrics": [
            "db_connections",
            "db_query_time",
            "db_error_rate",
            "db_storage_used"
          ]
        },
        {
          "title": "External APIs",
          "type": "table",
          "metrics": [
            "openai_api_calls",
            "google_speech_calls",
            "google_translate_calls",
            "stripe_api_calls"
          ]
        },
        {
          "title": "Storage Usage",
          "type": "stat",
          "metrics": [
            "r2_storage_used",
            "supabase_storage_used",
            "temp_files_cleanup"
          ]
        }
      ]
    },
    "business_metrics": {
      "name": "Business Metrics",
      "panels": [
        {
          "title": "Revenue Tracking",
          "type": "graph",
          "metrics": [
            "daily_revenue",
            "monthly_revenue",
            "subscription_revenue",
            "pay_per_use_revenue"
          ]
        },
        {
          "title": "User Engagement",
          "type": "table",
          "metrics": [
            "daily_active_users",
            "monthly_active_users",
            "user_retention_rate",
            "feature_adoption"
          ]
        },
        {
          "title": "Conversion Funnel",
          "type": "funnel",
          "metrics": [
            "visitors",
            "signups",
            "first_transcription",
            "paid_conversions"
          ]
        }
      ]
    }
  }
}
EOF
    
    print_message $GREEN "✅ Dashboard configuration created: $DASHBOARD_CONFIG_FILE"
}

# Function to setup Sentry monitoring
setup_sentry_monitoring() {
    print_message $BLUE "🐛 Setting up Sentry error tracking..."
    
    print_message $YELLOW "⚠️  Manual Sentry setup required:"
    echo "1. Create Sentry account and organization"
    echo "2. Create project for CantoneseScribe"
    echo "3. Configure Sentry DSN in environment variables"
    echo "4. Set up alert rules based on alerts-config.json"
    echo "5. Configure Slack/email integrations"
    echo ""
    echo "Recommended Sentry configuration:"
    echo "- Error threshold: > 10 errors in 1 hour"
    echo "- Performance threshold: > 5s response time"
    echo "- Release tracking: Enabled"
    echo "- User context: Enabled (without PII)"
    echo "- Custom tags: environment, version, user_tier"
    echo ""
    
    # Create Sentry configuration template
    cat > "sentry-config.js" << 'EOF'
// Sentry Configuration for CantoneseScribe Production
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || "production",
  
  // Performance Monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  
  // Session Replay
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  
  // Custom configuration
  beforeSend(event) {
    // Filter out development errors
    if (event.exception) {
      const error = event.exception.values[0];
      if (error.value?.includes("Development error")) {
        return null;
      }
    }
    
    // Add custom context
    event.tags = {
      ...event.tags,
      component: "cantonese-scribe",
      version: process.env.npm_package_version
    };
    
    return event;
  },
  
  // Performance monitoring
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || "0.1"),
  
  // Integration configuration
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/cantonese-scribe\.vercel\.app/
      ]
    }),
    new Sentry.Replay()
  ]
});
EOF
    
    print_message $GREEN "✅ Sentry configuration template created: sentry-config.js"
}

# Function to setup UptimeRobot monitoring
setup_uptime_monitoring() {
    print_message $BLUE "⏱️  Setting up uptime monitoring..."
    
    print_message $YELLOW "⚠️  Manual UptimeRobot setup required:"
    echo "1. Create UptimeRobot account"
    echo "2. Create monitors for critical endpoints:"
    echo "   - Main site: https://cantonese-scribe.vercel.app/"
    echo "   - Health check: https://cantonese-scribe.vercel.app/api/v1/health"
    echo "   - Detailed health: https://cantonese-scribe.vercel.app/api/v1/health/detailed"
    echo "3. Configure alert contacts (email, Slack, SMS)"
    echo "4. Set up public status page"
    echo ""
    echo "Recommended monitor settings:"
    echo "- Check interval: 5 minutes for critical endpoints"
    echo "- Timeout: 30 seconds"
    echo "- Alert threshold: 2 consecutive failures"
    echo "- Expected keywords: 'healthy' for health endpoints"
    echo ""
    
    # Create UptimeRobot API configuration
    cat > "uptimerobot-monitors.json" << 'EOF'
{
  "monitors": [
    {
      "friendly_name": "CantoneseScribe Main Site",
      "url": "https://cantonese-scribe.vercel.app/",
      "type": "HTTP",
      "interval": 300,
      "timeout": 30,
      "http_method": "GET",
      "http_status_code": "200"
    },
    {
      "friendly_name": "API Health Check",
      "url": "https://cantonese-scribe.vercel.app/api/v1/health",
      "type": "HTTP",
      "interval": 300,
      "timeout": 30,
      "http_method": "GET",
      "keyword_type": "exists",
      "keyword_value": "healthy"
    },
    {
      "friendly_name": "API Detailed Health",
      "url": "https://cantonese-scribe.vercel.app/api/v1/health/detailed",
      "type": "HTTP",
      "interval": 600,
      "timeout": 30,
      "http_method": "GET",
      "keyword_type": "exists",
      "keyword_value": "healthy"
    },
    {
      "friendly_name": "API Metrics Endpoint",
      "url": "https://cantonese-scribe.vercel.app/api/v1/health/metrics",
      "type": "HTTP",
      "interval": 600,
      "timeout": 30,
      "http_method": "GET"
    }
  ],
  "alert_contacts": [
    {
      "type": "email",
      "value": "admin@cantonese-scribe.com"
    },
    {
      "type": "slack",
      "value": "SLACK_WEBHOOK_URL"
    }
  ],
  "public_status_page": {
    "enabled": true,
    "friendly_name": "CantoneseScribe Status",
    "custom_domain": "status.cantonese-scribe.com"
  }
}
EOF
    
    print_message $GREEN "✅ UptimeRobot configuration created: uptimerobot-monitors.json"
}

# Function to setup DataDog APM monitoring
setup_datadog_monitoring() {
    print_message $BLUE "📊 Setting up DataDog APM monitoring..."
    
    print_message $YELLOW "⚠️  Manual DataDog setup required:"
    echo "1. Create DataDog account and get API/App keys"
    echo "2. Install DataDog integration for Vercel"
    echo "3. Configure APM for serverless functions"
    echo "4. Set up log collection and parsing"
    echo "5. Create custom dashboards based on dashboard-config.json"
    echo "6. Configure alert rules"
    echo ""
    echo "Key DataDog features to enable:"
    echo "- APM traces for API requests"
    echo "- Log aggregation and parsing"
    echo "- Custom metrics collection"
    echo "- Synthetic monitoring for critical user flows"
    echo "- Security monitoring (if needed)"
    echo ""
    
    # Create DataDog configuration
    cat > "datadog-config.json" << 'EOF'
{
  "datadog": {
    "apm": {
      "enabled": true,
      "service_name": "cantonese-scribe",
      "env": "production",
      "sample_rate": 0.1,
      "tracing": {
        "enabled": true,
        "propagation_style": "b3multi"
      }
    },
    "logs": {
      "enabled": true,
      "source": "vercel",
      "service": "cantonese-scribe",
      "parsing_rules": [
        {
          "name": "API requests",
          "pattern": "\\[(?P<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z)\\] (?P<level>INFO|WARN|ERROR) (?P<message>.*)",
          "attributes": ["timestamp", "level", "message"]
        }
      ]
    },
    "metrics": {
      "custom_metrics": [
        {
          "name": "transcription.processing_time",
          "type": "histogram",
          "tags": ["environment", "provider"]
        },
        {
          "name": "api.cost_per_request",
          "type": "gauge",
          "tags": ["endpoint", "user_tier"]
        },
        {
          "name": "user.conversion_rate",
          "type": "gauge",
          "tags": ["signup_source", "plan"]
        }
      ]
    },
    "synthetic_monitoring": {
      "tests": [
        {
          "name": "User Registration Flow",
          "type": "browser",
          "url": "https://cantonese-scribe.vercel.app/register",
          "frequency": "15m",
          "locations": ["us-east-1", "eu-west-1"]
        },
        {
          "name": "Transcription Upload Flow",
          "type": "api",
          "url": "https://cantonese-scribe.vercel.app/api/v1/transcription/upload",
          "method": "POST",
          "frequency": "30m"
        }
      ]
    }
  }
}
EOF
    
    print_message $GREEN "✅ DataDog configuration created: datadog-config.json"
}

# Function to setup Mixpanel analytics
setup_mixpanel_analytics() {
    print_message $BLUE "📈 Setting up Mixpanel analytics..."
    
    print_message $YELLOW "⚠️  Manual Mixpanel setup required:"
    echo "1. Create Mixpanel project"
    echo "2. Get project token and configure in environment"
    echo "3. Set up event tracking for key user actions"
    echo "4. Configure conversion funnels"
    echo "5. Set up cohort analysis for user retention"
    echo ""
    echo "Key events to track:"
    echo "- User registration"
    echo "- First transcription"
    echo "- Payment completion"
    echo "- Feature usage"
    echo "- Error occurrences"
    echo ""
    
    # Create Mixpanel events configuration
    cat > "mixpanel-events.json" << 'EOF'
{
  "mixpanel_events": {
    "user_lifecycle": [
      {
        "event": "User Registered",
        "properties": ["signup_source", "plan_selected", "timestamp"]
      },
      {
        "event": "First Transcription",
        "properties": ["file_type", "duration", "processing_time", "timestamp"]
      },
      {
        "event": "Payment Completed",
        "properties": ["plan", "amount", "payment_method", "timestamp"]
      },
      {
        "event": "Subscription Cancelled",
        "properties": ["plan", "cancellation_reason", "timestamp"]
      }
    ],
    "feature_usage": [
      {
        "event": "Transcription Started",
        "properties": ["provider", "language", "file_size", "user_tier"]
      },
      {
        "event": "Export Downloaded",
        "properties": ["format", "file_size", "user_tier"]
      },
      {
        "event": "Settings Updated",
        "properties": ["settings_changed", "user_tier"]
      }
    ],
    "errors": [
      {
        "event": "Transcription Failed",
        "properties": ["error_type", "provider", "retry_count", "user_tier"]
      },
      {
        "event": "Payment Failed",
        "properties": ["error_code", "payment_method", "amount"]
      }
    ],
    "funnels": [
      {
        "name": "User Conversion",
        "steps": [
          "Page Viewed",
          "User Registered",
          "First Transcription",
          "Payment Completed"
        ]
      },
      {
        "name": "Transcription Success",
        "steps": [
          "Transcription Started",
          "Processing Completed",
          "Export Downloaded"
        ]
      }
    ]
  }
}
EOF
    
    print_message $GREEN "✅ Mixpanel configuration created: mixpanel-events.json"
}

# Function to create monitoring health check endpoints
create_health_check_endpoints() {
    print_message $BLUE "🏥 Creating additional health check endpoints..."
    
    # Create advanced health check endpoint
    cat > "health-check-advanced.py" << 'EOF'
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
EOF
    
    print_message $GREEN "✅ Advanced health check endpoints created: health-check-advanced.py"
}

# Function to test monitoring setup
test_monitoring_setup() {
    print_message $BLUE "🧪 Testing monitoring setup..."
    
    # Test health endpoints if available
    local health_endpoints=(
        "/api/v1/health"
        "/api/v1/health/detailed"
        "/health/live"
        "/health/ready"
    )
    
    print_message $BLUE "Testing local endpoints..."
    for endpoint in "${health_endpoints[@]}"; do
        if curl -s "http://localhost:8000$endpoint" >/dev/null 2>&1; then
            print_message $GREEN "✅ $endpoint responding"
        else
            print_message $YELLOW "⚠️  $endpoint not available (normal if not running locally)"
        fi
    done
    
    # Validate configuration files
    print_message $BLUE "Validating configuration files..."
    
    if command -v jq >/dev/null 2>&1; then
        if jq empty "$MONITORING_CONFIG_FILE" >/dev/null 2>&1; then
            print_message $GREEN "✅ Monitoring configuration valid"
        else
            print_message $RED "❌ Monitoring configuration invalid JSON"
        fi
        
        if jq empty "$ALERTS_CONFIG_FILE" >/dev/null 2>&1; then
            print_message $GREEN "✅ Alerts configuration valid"
        else
            print_message $RED "❌ Alerts configuration invalid JSON"
        fi
        
        if jq empty "$DASHBOARD_CONFIG_FILE" >/dev/null 2>&1; then
            print_message $GREEN "✅ Dashboard configuration valid"
        else
            print_message $RED "❌ Dashboard configuration invalid JSON"
        fi
    fi
    
    print_message $GREEN "✅ Monitoring setup test completed"
}

# Function to show deployment checklist
show_deployment_checklist() {
    print_message $BLUE "📋 Monitoring Deployment Checklist"
    print_message $BLUE "=================================="
    echo ""
    echo "✅ Configuration Files Created:"
    echo "   - monitoring-config.json"
    echo "   - alerts-config.json"
    echo "   - dashboard-config.json"
    echo "   - sentry-config.js"
    echo "   - uptimerobot-monitors.json"
    echo "   - datadog-config.json"
    echo "   - mixpanel-events.json"
    echo ""
    echo "⚠️  Manual Setup Required:"
    echo "1. 🐛 Set up Sentry project and configure DSN"
    echo "2. ⏱️  Create UptimeRobot monitors using uptimerobot-monitors.json"
    echo "3. 📊 Configure DataDog APM and dashboards"
    echo "4. 📈 Set up Mixpanel project and event tracking"
    echo "5. 🔔 Configure Slack webhook for alerts"
    echo "6. 📧 Set up email notification channels"
    echo "7. 📊 Create custom dashboards in monitoring tools"
    echo ""
    echo "🔧 Integration Steps:"
    echo "1. Add monitoring environment variables to Vercel"
    echo "2. Deploy health check endpoints"
    echo "3. Test all monitoring endpoints"
    echo "4. Configure alert routing and escalation"
    echo "5. Set up runbook documentation"
    echo "6. Test alert notifications"
    echo ""
}

# Function to show usage
show_usage() {
    echo "CantoneseScribe Monitoring & Alerting Setup Script"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup-all              - Complete monitoring setup (default)"
    echo "  create-config          - Create monitoring configuration files"
    echo "  setup-sentry           - Set up Sentry error tracking"
    echo "  setup-uptime           - Set up uptime monitoring"
    echo "  setup-datadog          - Set up DataDog APM"
    echo "  setup-mixpanel         - Set up Mixpanel analytics"
    echo "  create-health-checks   - Create health check endpoints"
    echo "  test-setup             - Test monitoring configuration"
    echo "  deployment-checklist   - Show deployment checklist"
    echo ""
    echo "Examples:"
    echo "  $0 setup-all"
    echo "  $0 create-config"
    echo "  $0 test-setup"
}

# Parse command line arguments
COMMAND="${1:-setup-all}"

# Main execution
main() {
    print_message $PURPLE "📊 CantoneseScribe Monitoring & Alerting Setup"
    print_message $PURPLE "=============================================="
    echo ""
    
    case $COMMAND in
        "setup-all")
            check_prerequisites
            create_monitoring_configuration
            create_alerting_configuration
            create_dashboard_configuration
            setup_sentry_monitoring
            setup_uptime_monitoring
            setup_datadog_monitoring
            setup_mixpanel_analytics
            create_health_check_endpoints
            test_monitoring_setup
            show_deployment_checklist
            ;;
            
        "create-config")
            create_monitoring_configuration
            create_alerting_configuration
            create_dashboard_configuration
            ;;
            
        "setup-sentry")
            setup_sentry_monitoring
            ;;
            
        "setup-uptime")
            setup_uptime_monitoring
            ;;
            
        "setup-datadog")
            setup_datadog_monitoring
            ;;
            
        "setup-mixpanel")
            setup_mixpanel_analytics
            ;;
            
        "create-health-checks")
            create_health_check_endpoints
            ;;
            
        "test-setup")
            check_prerequisites
            test_monitoring_setup
            ;;
            
        "deployment-checklist")
            show_deployment_checklist
            ;;
            
        "--help"|"-h")
            show_usage
            exit 0
            ;;
            
        *)
            print_message $RED "❌ Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    print_message $GREEN "🎉 Monitoring & alerting setup completed!"
}

# Execute main function
main
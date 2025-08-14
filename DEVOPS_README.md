# CantoneseScribe DevOps Deployment Guide

This guide covers the Phase 1 DevOps implementation for CantoneseScribe's production-ready serverless infrastructure.

## 🏗️ Architecture Overview

CantoneseScribe uses a modern, cost-efficient serverless stack:

- **Frontend**: React + TypeScript + Vite (Vercel)
- **Backend**: FastAPI + Python (Vercel Serverless Functions) 
- **Database**: Supabase PostgreSQL (production + staging)
- **File Storage**: Cloudflare R2 with CDN
- **Cache**: Upstash Redis
- **Monitoring**: Sentry + UptimeRobot + DataDog + Mixpanel
- **Payments**: Stripe (Live for production, Test for staging)

## 📋 Phase 1 DevOps Tasks (P0 Critical)

### ✅ Implemented Components

1. **Production Environment Variables & Secrets Management**
   - Secure environment configuration for production and staging
   - Automated secrets generation and Vercel integration
   - Configuration validation and deployment readiness checks

2. **Supabase Production Database Configuration**
   - Production database setup with Row Level Security
   - Automated schema migrations and authentication configuration
   - Real-time subscriptions and storage bucket setup

3. **Google Cloud Service Authentication** 
   - GCP project setup with Speech-to-Text and Translation APIs
   - Service account configuration with minimal required permissions
   - API credential management and quota monitoring

4. **Comprehensive Monitoring & Alerting**
   - Multi-tier monitoring stack (Sentry, UptimeRobot, DataDog, Mixpanel)
   - Automated alert rules for critical thresholds
   - Health check endpoints and performance monitoring

5. **CDN & File Storage Configuration**
   - Cloudflare R2 storage with custom domain CDN
   - Optimized caching rules and performance configuration
   - Automated file lifecycle management and cleanup

## 🚀 Quick Start Deployment

### Prerequisites

Ensure you have the following installed:
- Node.js 18+ and npm
- Python 3.9+ and pip
- Vercel CLI (`npm install -g vercel`)
- Supabase CLI (`npm install -g supabase`)
- Cloudflare Wrangler CLI (`npm install -g wrangler`)

### One-Command Deployment

```bash
# Run the complete Phase 1 DevOps deployment
./scripts/deploy-production.sh deploy-full
```

This master script will:
1. ✅ Check all prerequisites
2. ✅ Validate project structure
3. ✅ Install dependencies
4. ✅ Run all Phase 1 DevOps tasks
5. ✅ Build and validate the application
6. ✅ Test API endpoints
7. ✅ Generate deployment summary

## 📜 Individual Scripts

Each Phase 1 task can be run individually:

### 1. Production Secrets Management
```bash
./scripts/setup-production-secrets.sh setup-all
```
- Generates secure JWT secrets
- Validates environment configuration
- Sets up Vercel environment variables
- Creates security checklist

### 2. Supabase Database Setup
```bash
./scripts/setup-supabase-production.sh setup-all
```
- Creates production Supabase project
- Applies database schema and RLS policies
- Configures authentication and storage
- Enables real-time subscriptions

### 3. Google Cloud Authentication
```bash
./scripts/google-cloud-setup.sh setup
```
- Sets up GCP project and enables APIs
- Creates service account with minimal permissions
- Generates and configures API credentials
- Sets up quota monitoring

### 4. Monitoring & Alerting
```bash
./scripts/setup-monitoring-alerting.sh setup-all
```
- Configures comprehensive monitoring stack
- Creates alert rules and notification channels
- Sets up health check endpoints
- Generates monitoring dashboards

### 5. CDN & Storage Configuration
```bash
./scripts/setup-cdn-storage.sh setup-all
```
- Creates Cloudflare R2 storage buckets
- Configures CDN with custom domains
- Sets up CORS policies and lifecycle rules
- Implements performance optimizations

## 🔧 Manual Configuration Required

After running the automated scripts, you'll need to complete these manual steps:

### 1. Vercel Environment Variables
```bash
# Copy variables from generated files to Vercel
vercel env add SUPABASE_URL production
vercel env add OPENAI_API_KEY production
# ... (see generated files for complete list)
```

### 2. External Service Setup
- **Sentry**: Create project and configure DSN
- **UptimeRobot**: Set up monitors using generated JSON config
- **DataDog**: Configure APM and dashboards  
- **Mixpanel**: Create project and set up event tracking
- **Cloudflare**: Configure R2 buckets and custom domains

### 3. DNS Configuration
Apply DNS records from `dns-configuration.txt`:
```
CNAME cdn -> [R2_PRODUCTION_PUBLIC_URL]
CNAME staging-cdn -> [R2_STAGING_PUBLIC_URL] 
CNAME status -> [UPTIME_ROBOT_STATUS_PAGE]
```

## 📊 Cost Management

The infrastructure is optimized for cost-efficiency:

- **Target**: <£0.50 per video transcription
- **Daily Cost Limit**: £100 (configurable)
- **Free Tier Usage**: Maximized for all services
- **Automatic Cleanup**: 7-day file retention
- **Cost Alerts**: 80% and 95% thresholds

### Cost Monitoring
```bash
# Check current costs via API
curl https://cantonese-scribe.vercel.app/api/v1/health/metrics
```

## 🔒 Security Configuration

### Environment Security
- All production secrets use strong, randomly generated values
- Separate staging and production environments
- No test/placeholder values in production
- Regular secret rotation (quarterly)

### API Security  
- JWT tokens with 1-hour expiration
- CORS configured for production domains only
- Rate limiting: 500 requests/hour per user
- Input validation and sanitization

### Database Security
- Row Level Security (RLS) policies enabled
- Separate service accounts for different environments
- Encrypted connections and backups
- Access logging and monitoring

## 📈 Monitoring & Alerting

### Critical Alert Thresholds
- **API Error Rate**: >5% (Critical)
- **Response Time P95**: >5s (Warning) 
- **Database Health**: Not healthy (Critical)
- **Daily Cost**: >80% limit (Warning), >95% (Critical)
- **Queue Size**: >50 pending jobs (Warning)

### Health Check Endpoints
- `/api/v1/health` - Basic health status
- `/api/v1/health/detailed` - Comprehensive service status
- `/api/v1/health/metrics` - Prometheus-style metrics
- `/health/live` - Kubernetes liveness probe
- `/health/ready` - Kubernetes readiness probe

### Monitoring Dashboards
1. **Production Overview**: System health, performance, errors
2. **Infrastructure**: Vercel functions, database, external APIs
3. **Business Metrics**: Revenue, user engagement, conversions

## 🔄 Backup & Disaster Recovery

### Automated Backups
- **Database**: Daily automated backups (90-day retention)
- **User Files**: Lifecycle policies with archival
- **Configuration**: Version controlled deployment configs

### Recovery Procedures
1. **Database Recovery**: Point-in-time restore from Supabase
2. **File Recovery**: Restore from R2 archive storage
3. **Configuration Recovery**: Redeploy from git repository
4. **Service Recovery**: Automatic failover and circuit breakers

## 🧪 Testing & Validation

### Pre-Deployment Testing
```bash
# Run individual test suites
./scripts/deploy-production.sh check-prereqs
./scripts/deploy-production.sh validate-project
./scripts/deploy-production.sh test-build
./scripts/deploy-production.sh test-api
```

### Post-Deployment Validation
```bash
# Test critical endpoints
curl https://cantonese-scribe.vercel.app/api/v1/health
curl https://cantonese-scribe.vercel.app/api/v1/health/detailed

# Verify monitoring
# Check Sentry, UptimeRobot, DataDog dashboards
```

## 📚 Configuration Files Reference

### Generated Scripts
- `scripts/setup-production-secrets.sh` - Environment and secrets management
- `scripts/setup-supabase-production.sh` - Database configuration 
- `scripts/setup-monitoring-alerting.sh` - Monitoring stack setup
- `scripts/setup-cdn-storage.sh` - CDN and storage configuration
- `scripts/deploy-production.sh` - Master deployment orchestrator

### Generated Configuration Files
- `monitoring-config.json` - Comprehensive monitoring configuration
- `alerts-config.json` - Alert rules and notification channels
- `dashboard-config.json` - Monitoring dashboard definitions
- `r2-cors-production.json` - R2 CORS policies
- `cloudflare-caching-rules.json` - CDN caching optimization
- `sentry-config.js` - Frontend error tracking setup

## 🔧 Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Verify variables in Vercel dashboard
vercel env ls --environment production

# Re-run secrets setup
./scripts/setup-production-secrets.sh validate
```

#### Database Connection Issues
```bash
# Test Supabase connection
./scripts/setup-supabase-production.sh test-connection

# Check database configuration
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

#### API Authentication Failures  
```bash
# Verify Google Cloud credentials
./scripts/google-cloud-setup.sh test

# Check service account permissions
gcloud projects get-iam-policy [PROJECT_ID]
```

#### High Costs Alert
1. Check current usage: `/api/v1/health/metrics`
2. Review Whisper API calls in logs
3. Implement additional rate limiting if needed
4. Consider API quota adjustments

### Getting Help

1. **Logs**: Check Vercel function logs and Sentry error reports
2. **Health Checks**: Monitor detailed health endpoint
3. **Documentation**: Refer to service-specific runbooks
4. **Support**: Contact DevOps team at devops@cantonese-scribe.com

## 📈 Performance Optimization

### Current Optimizations
- **CDN Caching**: Long-term caching for static assets
- **Image Optimization**: Auto-format and compression
- **Function Memory**: 1GB allocated for processing functions
- **Database Connection Pooling**: Supabase built-in pooling
- **Circuit Breakers**: Automatic failover for external APIs

### Performance Targets
- **API Response Time P95**: <2s
- **Frontend Load Time**: <3s
- **Transcription Processing**: <1min for 5min audio
- **CDN Cache Hit Rate**: >90%
- **Uptime SLA**: 99.9%

## 🔄 Maintenance

### Regular Tasks
- **Weekly**: Review error reports and performance metrics
- **Monthly**: Update dependencies and security patches  
- **Quarterly**: Rotate secrets and review access permissions
- **Annually**: Architecture review and cost optimization

### Scaling Considerations
- **Vercel**: Automatic scaling with usage-based billing
- **Supabase**: Connection pooling with read replicas if needed
- **R2 Storage**: Unlimited scaling with lifecycle management
- **External APIs**: Monitor quotas and implement intelligent caching

---

## 🎯 Next Steps

After completing Phase 1:

1. **Phase 2**: Advanced features (batch processing, webhooks)
2. **Phase 3**: Performance optimization and scaling
3. **Phase 4**: Advanced analytics and business intelligence

For detailed implementation of subsequent phases, refer to the CantoneseScribe Development Plan.

---

**Last Updated**: August 2024
**Version**: Phase 1 MVP Core
**Maintained by**: CantoneseScribe DevOps Team
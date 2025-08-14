# CantoneseScribe Deployment Guide

This guide provides step-by-step instructions for deploying CantoneseScribe to production and staging environments.

## Overview

CantoneseScribe uses a modern serverless architecture with the following components:

- **Frontend**: React + TypeScript + Vite (deployed to Vercel)
- **Backend**: FastAPI + Python (deployed as Vercel Serverless Functions)
- **Database**: Supabase PostgreSQL
- **File Storage**: Cloudflare R2
- **Caching**: Upstash Redis
- **Payments**: Stripe
- **Monitoring**: Sentry, DataDog APM, UptimeRobot, Mixpanel

## Prerequisites

Before deployment, ensure you have:

1. **Vercel Account** with CLI installed (`npm i -g vercel`)
2. **Supabase Project** (production and staging)
3. **Google Cloud Platform** service account
4. **Stripe Account** with API keys
5. **Cloudflare R2** storage account
6. **Upstash Redis** database
7. **Monitoring Services** (Sentry, DataDog, etc.)

## Environment Setup

### 1. Production Environment Variables

Set these environment variables in Vercel Dashboard for production:

#### Core Application
```bash
ENVIRONMENT=production
DEBUG=false
NODE_ENV=production
```

#### Frontend URLs (adjust to your domain)
```bash
VITE_API_BASE_URL=https://your-domain.vercel.app/api/v1
VITE_WS_BASE_URL=wss://your-domain.vercel.app/ws
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_PAYMENTS=true
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
```

#### Backend Configuration
```bash
API_PREFIX=/api/v1
ALLOWED_ORIGINS=https://your-domain.vercel.app,https://www.your-domain.com
ALLOWED_HOSTS=your-domain.vercel.app,www.your-domain.com
```

#### Database (Supabase)
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_KEY=[SUPABASE_ANON_KEY]
SUPABASE_SERVICE_KEY=[SUPABASE_SERVICE_ROLE_KEY]
```

#### External APIs
```bash
OPENAI_API_KEY=[OPENAI_API_KEY]
GOOGLE_CLOUD_CREDENTIALS=[BASE64_ENCODED_SERVICE_ACCOUNT_JSON]
GOOGLE_TRANSLATE_API_KEY=[GOOGLE_TRANSLATE_API_KEY]
```

#### Redis (Upstash)
```bash
REDIS_URL=redis://default:[PASSWORD]@[UPSTASH_ENDPOINT]:6379
REDIS_PASSWORD=[UPSTASH_PASSWORD]
QUEUE_NAME=transcription_queue_prod
```

#### Stripe Payments (LIVE keys)
```bash
STRIPE_PUBLIC_KEY=pk_live_[STRIPE_LIVE_PUBLISHABLE_KEY]
STRIPE_SECRET_KEY=sk_live_[STRIPE_LIVE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[STRIPE_LIVE_WEBHOOK_SECRET]
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[STRIPE_LIVE_PUBLISHABLE_KEY]
```

#### File Storage (Cloudflare R2)
```bash
R2_ACCOUNT_ID=[R2_ACCOUNT_ID]
R2_ACCESS_KEY_ID=[R2_ACCESS_KEY_ID]
R2_SECRET_ACCESS_KEY=[R2_SECRET_ACCESS_KEY]
R2_BUCKET_NAME=cantonese-scribe-prod
R2_PUBLIC_URL=https://cdn.your-domain.com
```

#### Security
```bash
SECRET_KEY=[STRONG_JWT_SECRET_KEY_256_BITS]
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALGORITHM=HS256
```

#### Monitoring
```bash
SENTRY_DSN=[SENTRY_DSN]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
DATADOG_API_KEY=[DATADOG_API_KEY]
DATADOG_APP_KEY=[DATADOG_APP_KEY]
MIXPANEL_TOKEN=[MIXPANEL_PROJECT_TOKEN]
```

### 2. Staging Environment Variables

For staging, use the same variables but with staging-specific values:
- Different database connections
- Test Stripe keys
- Separate storage buckets
- Lower rate limits and cost thresholds

## Deployment Steps

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/cantonese-scribe-pro.git
cd cantonese-scribe-pro

# Install dependencies
npm install
pip install -r requirements.txt

# Login to Vercel
vercel login
```

### 2. Configure Vercel Project

```bash
# Link project to Vercel
vercel link

# Set up environment variables (production)
vercel env add ENVIRONMENT production
vercel env add DEBUG false
# ... add all other environment variables

# Set up environment variables (staging)  
vercel env add ENVIRONMENT staging --environment preview
vercel env add DEBUG false --environment preview
# ... add all other staging environment variables
```

### 3. Database Setup (Supabase)

#### Production Database
1. Create new Supabase project for production
2. Run database migrations:
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    stripe_customer_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR UNIQUE NOT NULL,
    status VARCHAR NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcriptions table
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    source_url VARCHAR,
    file_path VARCHAR,
    result_data JSONB,
    cost DECIMAL(10,4) DEFAULT 0,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
```

#### Staging Database
Repeat the same process for staging with a separate Supabase project.

### 4. Google Cloud Setup

1. Create service account with Speech-to-Text and Translation API access
2. Download service account JSON
3. Base64 encode the JSON:
```bash
cat service-account.json | base64 -w 0
```
4. Set the encoded JSON as `GOOGLE_CLOUD_CREDENTIALS` environment variable

### 5. Cloudflare R2 Setup

1. Create R2 bucket for production and staging
2. Configure CORS for web access:
```json
[
  {
    "AllowedOrigins": ["https://your-domain.vercel.app"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"]
  }
]
```

### 6. Stripe Setup

#### Production
1. Obtain live API keys from Stripe Dashboard
2. Set up webhooks pointing to: `https://your-domain.vercel.app/api/v1/billing/stripe/webhook`
3. Configure webhook events:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

#### Staging
Use test API keys and webhook endpoints for staging environment.

### 7. Deploy Application

```bash
# Deploy to staging (preview)
vercel --env staging

# Deploy to production
vercel --prod
```

### 8. Post-Deployment Verification

#### Health Checks
```bash
# Basic health check
curl https://your-domain.vercel.app/health

# Detailed health check
curl https://your-domain.vercel.app/api/v1/health/detailed
```

#### Test Core Functionality
1. User registration and login
2. Stripe payment integration
3. File upload and transcription
4. WebSocket real-time updates
5. Export functionality

## Monitoring Setup

### 1. Sentry Error Tracking
- Create Sentry project
- Configure error reporting for both frontend and backend
- Set up alert rules for critical errors

### 2. UptimeRobot Monitoring
- Monitor main health endpoint: `/health`
- Set up alerts for downtime
- Configure status page for public visibility

### 3. Performance Monitoring
- Vercel Analytics (automatic with deployment)
- Custom metrics in `/api/v1/health/metrics` endpoint
- Cost tracking and alerting

## Security Considerations

### 1. Environment Variables
- Never commit real environment variables to git
- Use Vercel's secure environment variable storage
- Rotate secrets regularly

### 2. API Security
- CORS configuration for production domains only
- Rate limiting for all endpoints
- Input validation and sanitization
- JWT token expiration and refresh

### 3. Database Security
- Use Supabase Row Level Security (RLS)
- Separate service account keys for different environments
- Regular backup and recovery testing

## Scaling Considerations

### 1. Vercel Limits
- 100GB bandwidth (free tier)
- 1000 serverless function executions (free tier)
- Monitor usage and upgrade plan as needed

### 2. Database Scaling
- Monitor Supabase connection limits
- Implement connection pooling if needed
- Consider read replicas for heavy read workloads

### 3. Cost Optimization
- Monitor Whisper API usage
- Implement intelligent caching
- Clean up temporary files regularly
- Set up cost alerts and limits

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading
- Verify variables are set in correct Vercel environment
- Check variable names match exactly
- Restart deployment after adding variables

#### 2. Database Connection Issues
- Verify Supabase URLs and keys
- Check connection string format
- Ensure database exists and is accessible

#### 3. Google Cloud API Errors
- Verify service account permissions
- Check base64 encoding of credentials
- Ensure APIs are enabled in GCP project

#### 4. File Upload Issues
- Check Cloudflare R2 bucket permissions
- Verify CORS configuration
- Monitor file size limits

#### 5. Payment Processing Issues
- Verify Stripe webhook URLs
- Check webhook event configurations
- Monitor webhook delivery logs

### Getting Help

1. Check Vercel deployment logs
2. Monitor Sentry error reports
3. Review health check endpoints
4. Check individual service status pages
5. Contact support for third-party services

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error reports in Sentry
   - Check cost metrics and usage
   - Monitor uptime reports

2. **Monthly**
   - Update dependencies
   - Review security scans
   - Analyze performance metrics
   - Backup verification

3. **Quarterly**
   - Rotate secrets and API keys
   - Review and update monitoring thresholds
   - Capacity planning review
   - Security audit

This completes the comprehensive deployment guide for CantoneseScribe. Follow these steps carefully to ensure a secure, scalable, and maintainable production deployment.
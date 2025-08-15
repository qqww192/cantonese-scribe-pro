# External Platform Configuration Checklist

## 🎯 CantoneseScribe MVP Launch Configuration Guide

This checklist covers all external platform configurations needed to deploy your free-first MVP successfully.

---

## 🚀 **Vercel Deployment Configuration**

### Environment Variables to Set in Vercel Dashboard

#### **Core Application**
```bash
# Application Environment
ENVIRONMENT=production
NODE_ENV=production
DEBUG=false

# API Configuration
VITE_API_BASE_URL=https://cantonese-scribe-pro.vercel.app/api/v1
VITE_WS_BASE_URL=wss://cantonese-scribe-pro.vercel.app/ws
API_PREFIX=/api/v1
```

#### **Database (Supabase)**
```bash
# Copy from .env.production
DATABASE_URL=postgresql://postgres:4OS4fI4idpQ6VUXD@db.bpqcsrefrdesewgkwrtl.supabase.co:5432/postgres
SUPABASE_URL=https://bpqcsrefrdesewgkwrtl.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Authentication & Security**
```bash
# JWT Configuration - GENERATE NEW SECURE KEY
SECRET_KEY=[GENERATE_NEW_256_BIT_KEY]
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALGORITHM=HS256
```

#### **Stripe (Dormant for MVP)**
```bash
# Test keys for future Pro launch
STRIPE_PUBLISHABLE_KEY=pk_test_51RwLYuICypWYw6CLcRdEWa8Xoke1TAmB4cUUAdYSQRmbKTbXXoWE2OhAFy4nKkFJE0ffhVDsPPNxDEVSZg4161pI00aFurMf3N
STRIPE_SECRET_KEY=sk_test_***************
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RwLYuICypWYw6CLcRdEWa8Xoke1TAmB4cUUAdYSQRmbKTbXXoWE2OhAFy4nKkFJE0ffhVDsPPNxDEVSZg4161pI00aFurMf3N
STRIPE_WEBHOOK_SECRET=[TO_BE_CONFIGURED_LATER]
```

#### **External APIs**
```bash
# Google Cloud Platform (Speech-to-Text + Gemini AI)
GOOGLE_CLOUD_PROJECT_ID=bobchatbot
GOOGLE_APPLICATION_CREDENTIALS=/var/task/google-credentials.json
GOOGLE_CLOUD_CREDENTIALS=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiYm9iY2hhdGJvdCIsCiAgInByaXZhdGVfa2V5X2lkIjogIjE3OTk2MWFlNmIxMWMxMzdkZjEzOTIzMjdkYTM1MDkxNGNkZjRlOWQiLAogICJwcml2YXRlX2tleSI6ICItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRHBsQlBha2lBRTg2SUVcbmlWZ0dRWVdONFdXZUFGUHo5UjlkM01VY3NzbFhqYTNrelg5L1NUY1NhcWx4ZkFob1I0N01OMGF3elIrL0NqZHhcblM4NjBGRkczNFdYQlo3RWp1dlM2Q3VnUWdYMWRRN1NGT1RVSFQ3ZW5jcmFQU2kzNDI5L0N6eWFaS2NsalhDY0VcbjVnNG94MzlEYndFQkxYbTI5TE81VGRiQStTSEJGdzJUdURIYnhsaUZTWGlLOS80MG9wUnRLZEowMjJnd3h6emRcbnZXY01ZbmpCUW84SmxkcGhYMjcvbzh2UXZzWXZid3hWbnMreTluamZiYk5PWkJPbmpwY01LRFprTS9zYXp4ZDNcbjJ6WDAvd25BdjJNVllRQmpMUE1YbGZzNWxIQThtZEpGY3Z6S2RVai9aTHV0TGZDOTRhVmhYZVVXRnVzYzJpcTBcbjNhREhtU1BUQWdNQkFBRUNnZ0VBY3FZa09KeVE2dDFMSVQ3bzNlazdUTERkMS9nQlBUV0w5OTV0UWZEZnN3SHZcbjRPYWROalVSdXhCdnF5eGVWQkVMbm1GamFWVEZ5RmVUYnlEdWpLV01sdDBqdlJMUWQrRkVUaTBjU3ozRDh3dFFcbmlEUFVPNHA5Y3N0em9GR2d6dzNkZnhsK3NKODZJbk1SRSs1MzlMdzNVem9oSEJyZUsxZGhBQXVjNVl0amJncWFcbmlCRkI3bHZ0MExhVEpvRHFhMFFxU2FJSzZrcld4bWtXMDA0cHl1TlJsaEFITkZ0Q05WL1VjMmJITk9SZHBmRmdcbm5LakFnTGM0amVFMWcvSkx4b0FxalpBaTEzOEpESnpXTnZIc09oRWhUc1hqYThWZFRQSE5xdEF1SGkvejZtY2lcbkl1S3dnc2hoQXpiM2hMK0JybnNMd2N0VzcrN0dXd2krQk5jL3RqbFRBUUtCZ1FEOHVDMStOY3dwanVvYVFXbmNcbjBGalhIZTRMMmNueHZvSzlEQU83YlZGVHpoc0RuZ3BqV21EWWRrbUZ2SnV6MnR1aENCbE9SaCtVdnNHRG9kV1Fcbit1cXAvU3c4MmpJQXZJenhwbzVXUlFIVUtRdEVrT3BaMHVHQUVaRjdnYnRqTnZQY3RCRGJqWFdlbXRPOE9Vb3lcbi9yM0I4cEsyZWFBYzRpZDNWdXJ6bUpQVWd3S0JnUURzbkVxaldsd0JKbGR4YVFtU0xKZCtyZytlaG9XazZaUUtcbk1aRHlpV0ZEaitML2swQ3JTcmYzMnhMaU9MZGtnU1pPdTRacllwZG9BS0o3WlRCWjI3aThmK2ZxdFRqS05UWDNcbkRvdXZ4M0JxNGJDSlZkcVk2N25UTDR0MmYrYW9tamhLYXhUd25pVkRDT05Md2lTQWM5bUNUZEp2SkdpZktuaHdcbko3bjZUWkp5Y1FLQmdCaHJ2OUdyWnpBNDVEeG5SOUNUdlpJRURXWE54T3I4YXV2VHhtU05Pc2VyYWdiZWRjaUdcbkNrZkFubmd5OHFUZHFFMldWOE90bVEycHBVK1FDdkE0bndhUU5YOG40cDhabVZFY3RESjM5cVpHMVJUcUlBdFFcbkNvUnlyaWxPTHdwMlcvaGUyaVl0TkVtQVVxZWtyWnZoNi9wYTgzeDRvbFZJTVdJaDN4QnRGUlA3QW9HQUV4TEtcblJYN01PZCtBWHdrTGwzZjJ3bVIvcDlUS1F5LzlHaEZDMFBwWUY5MHFmRlcvZWM5dEl4TEs0K2VVaVFxTUx2NllcbjZHRXJPVndMdlF5OEtCSTVReURBYmtBcmtzbFZUMVFoMklxb09rVjFPS3p1RVRPM2FCbkdFVWhnTEtrNTdtM1JcblkxQXNTc29Wb0k3RzZIL3VRYjNLUCtGY2ViQXZ3MExBa0RmZW5WRUNnWUVBaTA5M3IwRE9Cb2tHdVpxQWtDemZcbnlhZWJmV2tFZE1ERDZUa2hla0RGQjI0STJUUzlDbCtld3UxczJNcHFiZlhwS0F6cFNxUG0vY1pUTEpqRHlyVE9cbmtmcHNaU2dpa1czN29WMkMyZGRMWlBtZDdIY2xYVndxdVN0N3hLdDdkbHVQWldHQkEwTkw0aVpzQUhvVExCVmdcblBMTmdCOU40eHdyeW42bm1mbUMva3FVPVxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwKICAiY2xpZW50X2VtYWlsIjogImNhbnRvbmVzZS1zY3JpYmUtc2VydmljZUBib2JjaGF0Ym90LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAiY2xpZW50X2lkIjogIjEwNDAyNzQ1MDY3NDE3MzY0MTExNiIsCiAgImF1dGhfdXJpIjogImh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwKICAidG9rZW5fdXJpIjogImh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwKICAiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9jZXJ0cyIsCiAgImNsaWVudF94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvY2FudG9uZXNlLXNjcmliZS1zZXJ2aWNlJTQwYm9iY2hhdGJvdC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQo=
GOOGLE_TRANSLATE_API_KEY=[YOUR_GOOGLE_TRANSLATE_KEY]
GOOGLE_GEMINI_API_KEY=[YOUR_GOOGLE_GEMINI_API_KEY]
```

#### **Feature Flags for MVP**
```bash
# Enable MVP features
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_PAYMENTS=false
VITE_ENABLE_WAITLIST=true
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
```

#### **Usage Limits (MVP)**
```bash
# Free tier configuration
FREE_TIER_CREDITS=30
FREE_TIER_FILE_SIZE_MB=25
FREE_TIER_CONCURRENT_JOBS=1
USAGE_RESET_TIMEZONE=UTC
```

### Vercel Project Settings
- [ ] **Framework**: Vite
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`
- [ ] **Install Command**: `npm install`
- [ ] **Node.js Version**: 18.x or higher

---

## 🗄️ **Supabase Configuration**

### Database Setup
- [ ] **Run migrations** in order:
  ```sql
  \i database/migrations/001_initial_schema.sql
  \i database/migrations/002_usage_tracking_enhancements.sql
  ```

### Required Tables to Verify
- [ ] `users` - User accounts and authentication
- [ ] `user_usage` - Monthly usage tracking  
- [ ] `usage_records` - Individual usage entries
- [ ] `waitlist_signups` - Pro waitlist collection
- [ ] `waitlist_events` - Conversion tracking
- [ ] `transcription_jobs` - Processing jobs
- [ ] `files` - Uploaded file metadata

### Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Configure user-specific access policies
- [ ] Set up admin access for analytics

### Supabase Auth Configuration
- [ ] **Email Provider**: Configure SMTP settings
- [ ] **Confirm Email**: Enable for production
- [ ] **Magic Links**: Configure for passwordless login
- [ ] **Social Providers**: Set up if needed (Google, etc.)

---

## 🔑 **Google Cloud Platform**

### Speech-to-Text API
- [ ] **Enable API** in Google Cloud Console
- [ ] **Create Service Account** with Speech-to-Text permissions
- [ ] **Download JSON key** and encode to base64
- [ ] **Set quotas** appropriate for MVP scale

### Translate API
- [ ] **Enable Translate API**
- [ ] **Configure API key** with domain restrictions
- [ ] **Set usage quotas** and billing alerts

### Cost Management
- [ ] **Set billing alerts** at $50, $100, $200
- [ ] **Configure quotas** to prevent runaway costs
- [ ] **Monitor usage** dashboard setup

---

## 🤖 **Google Gemini AI Configuration**

### Gemini API Setup
- [ ] **API Key**: Add GOOGLE_GEMINI_API_KEY to environment variables
- [ ] **Usage Limits**: Set monthly spending limits in Google Cloud Console
- [ ] **Model Selection**: gemini-pro for enhanced transcription assistance
- [ ] **Billing Alerts**: Configure at $100, $250

### Integration Features
- [ ] **Transcription Enhancement**: Improve accuracy for Cantonese content
- [ ] **Context Understanding**: Better semantic processing
- [ ] **Quality Optimization**: Automated confidence scoring
- [ ] **Usage monitoring**: Track per-user costs through Google Cloud

---

## 💳 **Stripe Configuration (For Future Pro Launch)**

### Dashboard Setup
- [ ] **Test Mode**: Keep enabled for MVP
- [ ] **Webhook Endpoint**: Configure when ready
  ```
  https://cantonese-scribe-pro.vercel.app/api/v1/payments/webhook
  ```
- [ ] **Products**: Create Pro subscription products
- [ ] **Pricing**: Set up monthly/annual pricing

### Events to Monitor
- [ ] `customer.subscription.created`
- [ ] `customer.subscription.updated` 
- [ ] `customer.subscription.deleted`
- [ ] `invoice.payment_succeeded`
- [ ] `invoice.payment_failed`

---

## 📧 **Email Service Configuration**

### Resend Setup (Recommended)
- [ ] **Create account** at [resend.com](https://resend.com)
- [ ] **Verify domain** for sending emails
- [ ] **API Key**: Generate and add to environment
- [ ] **Templates**: Create for:
  - Welcome email
  - Usage limit warnings
  - Waitlist confirmations
  - Monthly usage reports

### Email Configuration
```bash
# Environment variables for email
RESEND_API_KEY=re_bg8PVLKn_3tHAgjF69791KuVPNAsKQnHm
FROM_EMAIL=onboarding@yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com
```

---

## 📊 **Analytics & Monitoring**

### Google Analytics 4
- [ ] **Create property** for your domain
- [ ] **Add tracking code** to frontend
- [ ] **Configure goals**:
  - Waitlist signups
  - Video uploads
  - Usage limit hits
  - User retention

### Error Tracking (Sentry - Optional)
```bash
# Add if you want error monitoring
SENTRY_DSN=[YOUR_SENTRY_DSN]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## 🌐 **Domain & DNS Configuration**

### Domain Setup
- [ ] **Purchase domain** or use existing
- [ ] **Add to Vercel** project settings
- [ ] **Configure DNS** records:
  ```
  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
  
  Type: A
  Name: @
  Value: 76.76.19.61
  ```

### SSL Certificate
- [ ] **Auto-managed** by Vercel (default)
- [ ] **Verify HTTPS** works on all pages

---

## 🔐 **Security Configuration**

### CORS Setup
```bash
# Environment variables
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### Rate Limiting
```bash
# API rate limits
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600
```

---

## 📈 **Business Tools Setup**

### Customer Support
- [ ] **Help Center**: Create FAQ pages
- [ ] **Contact Form**: Implement support requests
- [ ] **Email Support**: Set up support@yourdomain.com

### Marketing Analytics
- [ ] **Waitlist tracking**: Monitor signup sources
- [ ] **Conversion funnels**: Free to waitlist
- [ ] **User behavior**: Video processing patterns

---

## ✅ **MVP Launch Checklist**

### Pre-Launch Testing
- [ ] **Test user registration** flow
- [ ] **Test video upload** and processing
- [ ] **Test usage limits** enforcement
- [ ] **Test waitlist signup** functionality
- [ ] **Test mobile responsiveness**
- [ ] **Test email notifications**

### Launch Day Tasks
- [ ] **Deploy to production** Vercel
- [ ] **Verify all APIs** are responding
- [ ] **Test complete user journey**
- [ ] **Monitor error rates** and performance
- [ ] **Prepare customer support** channels

### Post-Launch Monitoring
- [ ] **Daily usage tracking**
- [ ] **Waitlist conversion rates**
- [ ] **Error rate monitoring**
- [ ] **User feedback collection**
- [ ] **Performance optimization**

---

## 🎯 **MVP Success Metrics to Track**

### User Acquisition
- [ ] Daily new registrations
- [ ] Source attribution (organic, referral, etc.)
- [ ] Geographic distribution

### Engagement  
- [ ] Videos processed per user
- [ ] Average session duration
- [ ] Feature usage patterns

### Conversion
- [ ] Free to waitlist conversion rate
- [ ] Usage limit hit frequency
- [ ] Waitlist engagement rates

---

## 🚨 **Important Security Notes**

### Environment Variables
- [ ] **Never commit** secrets to git
- [ ] **Use strong passwords** for all accounts
- [ ] **Enable 2FA** on all external services
- [ ] **Regular key rotation** schedule

### Monitoring
- [ ] **Set up alerts** for API failures
- [ ] **Monitor usage spikes** for potential abuse
- [ ] **Track error rates** and response times

---

## 📞 **Emergency Contacts & Documentation**

### Service Contacts
- [ ] **Vercel Support**: Document account details
- [ ] **Supabase Support**: Keep project info handy
- [ ] **Google Cloud**: Note project ID and billing
- [ ] **Google AI Studio**: Track Gemini API usage limits

### Internal Documentation
- [ ] **API documentation** for team
- [ ] **Database schema** documentation
- [ ] **Deployment procedures** documented
- [ ] **Rollback procedures** prepared

---

## ✅ **Final Verification**

Before going live, verify:
- [ ] All external services are configured
- [ ] Environment variables are set correctly
- [ ] Database migrations have been run
- [ ] Domain and SSL are working
- [ ] Email delivery is functional
- [ ] Usage limits are properly enforced
- [ ] Waitlist signup is working
- [ ] Error monitoring is active
- [ ] Backup procedures are in place

---

**🎉 Once all items are checked, your CantoneseScribe MVP is ready for production launch!**
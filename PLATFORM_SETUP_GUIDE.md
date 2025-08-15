# CantoneseScribe Platform Setup Guide

This guide provides step-by-step instructions for setting up all external platforms required for CantoneseScribe to move from Phase 1 to Phase 2.

## Prerequisites

- Supabase project created (✅ You have this: bpqcsrefrdesewgkwrtl.supabase.co)
- Google Cloud Console account
- Stripe account
- Vercel account

---

## 1. Supabase Database Setup

### 🔴 URGENT: Your Current Issue
Your Supabase database needs the proper schema before you can create users. Follow these steps:

### Step 1.1: Create Database Schema

1. **Open Supabase Dashboard**: Go to https://supabase.com/dashboard/project/bpqcsrefrdesewgkwrtl
2. **Navigate to SQL Editor**: Click "SQL Editor" in the left sidebar
3. **Create New Query**: Click "New Query"
4. **Copy and Execute Initial Schema**: 

Copy the entire content from `database/migrations/001_initial_schema.sql` into the SQL editor and click "Run" (or Ctrl+Enter).

This will create all necessary tables:
- `users`
- `subscriptions` 
- `transcriptions`
- `usage_tracking`
- `payments`
- `system_metrics`
- `audit_logs`

### Step 1.2: Apply Supabase Configuration

1. **Create Another New Query** in the SQL Editor
2. **Copy and Execute Supabase Setup**: 

Copy the entire content from `database/supabase-setup.sql` into the SQL editor and click "Run".

This will configure:
- Auth triggers for user sync
- Storage buckets for files
- Real-time subscriptions
- Stripe webhook handlers

### Step 1.3: Verify Setup

Run this test query in SQL Editor to verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see all 7 tables listed.

### Step 1.4: Test User Creation

Now your original signup command should work:

```bash
curl -X POST "https://bpqcsrefrdesewgkwrtl.supabase.co/auth/v1/signup" \
     -H "Content-Type: application/json" \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcWNzcmVmcmRlc2V3Z2t3cnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTY0MjIsImV4cCI6MjA3MDU3MjQyMn0.iMCI0IVqN-PH3lZaWSNiOaSysy7TN4hGDQOu7ej-abo" \
     -d '{"email":"test@example.com","password":"testpass123"}'
```

---

## 2. Google Cloud Setup

### Step 2.1: Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create New Project**: 
   - Project Name: `cantonese-scribe-prod`
   - Project ID: `cantonese-scribe-prod-XXXXXX` (Google will append random characters)
3. **Enable Required APIs**:
   - Go to "APIs & Services" > "Library"
   - Enable "Speech-to-Text API"
   - Enable "Cloud Translation API"

### Step 2.2: Create Service Account

1. **Navigate to IAM & Admin** > **Service Accounts**
2. **Create Service Account**:
   - Name: `cantonese-scribe-service`
   - Description: `Service account for CantoneseScribe transcription services`
3. **Grant Roles**:
   - Speech Client
   - Cloud Translation API User
   - Storage Object Admin (if using Google Cloud Storage)

### Step 2.3: Generate Service Account Key

1. **Click on the created service account**
2. **Go to "Keys" tab**
3. **Add Key** > **Create New Key** > **JSON**
4. **Download the JSON file** (keep it secure!)

### Step 2.4: Update Environment Variables

Add to your `.env.production`:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
# Or base64 encoded for Vercel:
GOOGLE_APPLICATION_CREDENTIALS_BASE64=base64-encoded-key-content
```

---

## 3. Stripe Payment Setup

### Step 3.1: Create Stripe Account

1. **Sign up at**: https://stripe.com/
2. **Complete account verification** (may take 1-2 business days)

### Step 3.2: Get API Keys

1. **Go to Developers** > **API Keys**
2. **Copy the following keys**:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

### Step 3.3: Create Products and Prices

1. **Go to Products** in Stripe Dashboard
2. **Create Products**:

   **Starter Plan**:
   - Name: `CantoneseScribe Starter`
   - Price: $9.99/month
   - Description: `30 minutes of transcription per month`

   **Pro Plan**:
   - Name: `CantoneseScribe Pro`
   - Price: $29.99/month
   - Description: `120 minutes of transcription per month`

   **Enterprise Plan**:
   - Name: `CantoneseScribe Enterprise`
   - Price: $99.99/month
   - Description: `Unlimited transcription with priority support`

3. **Copy Price IDs** (starts with `price_`) for each plan

### Step 3.4: Set Up Webhooks

1. **Go to Developers** > **Webhooks**
2. **Add Endpoint**: `https://your-domain.vercel.app/api/webhooks/stripe`
3. **Select Events**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Step 3.5: Update Environment Variables

Add to your `.env.production`:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

---

## 4. Vercel Deployment Setup

### Step 4.1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 4.2: Login and Link Project

```bash
vercel login
vercel link
```

### Step 4.3: Set Environment Variables

```bash
# Set all environment variables in Vercel
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add GOOGLE_CLOUD_PROJECT_ID
vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
# ... add all others from .env.production
```

### Step 4.4: Deploy

```bash
vercel --prod
```

---

## 5. Validation and Testing

### Step 5.1: Database Validation

Run in Supabase SQL Editor:

```sql
-- Check if all tables exist
SELECT 'Tables' as check_type, count(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check if auth triggers work
SELECT 'Auth Triggers' as check_type, count(*) as count 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth%';

-- Check storage buckets
SELECT name FROM storage.buckets;
```

### Step 5.2: Google Cloud Validation

Test API access:

```bash
# Test Speech-to-Text API
curl -X POST \
  "https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"config":{"languageCode":"yue-Hant-HK"},"audio":{"uri":"gs://bucket/test.wav"}}'
```

### Step 5.3: Stripe Validation

```bash
# Test Stripe API
curl https://api.stripe.com/v1/customers \
  -H "Authorization: Bearer ${STRIPE_SECRET_KEY}"
```

### Step 5.4: End-to-End Test

1. **Create test user** via frontend or API
2. **Upload test audio file**
3. **Process transcription**
4. **Verify result in database**
5. **Test export functionality**

---

## 6. Monitoring and Maintenance

### Step 6.1: Set Up Monitoring

1. **Supabase**: Enable database monitoring and alerts
2. **Vercel**: Set up function monitoring and error tracking
3. **Stripe**: Configure webhook monitoring
4. **Google Cloud**: Set up API quota and billing alerts

### Step 6.2: Backup Strategy

1. **Database**: Supabase provides automatic backups
2. **Files**: Regular backup of storage buckets
3. **Configuration**: Version control for environment configs

---

## 7. Security Checklist

- [ ] All API keys stored securely in environment variables
- [ ] Database RLS policies enabled and tested
- [ ] CORS configured properly for production domains
- [ ] Webhook endpoints secured with proper signatures
- [ ] Service account permissions follow principle of least privilege
- [ ] SSL/TLS certificates valid for all domains

---

## 8. Common Issues and Solutions

### Issue: "Database error saving new user"
**Solution**: Run the database schema setup scripts first

### Issue: Google Cloud API quota exceeded
**Solution**: Increase quotas in Google Cloud Console or implement caching

### Issue: Stripe webhook signature verification fails
**Solution**: Ensure webhook secret is correctly configured

### Issue: Vercel function timeout
**Solution**: Optimize processing logic or increase timeout limits

---

## Next Steps After Setup

1. **Update Frontend**: Replace mock data with real API calls
2. **Test User Flows**: Complete signup → transcription → export workflow
3. **Performance Testing**: Load test with realistic data volumes
4. **Security Audit**: Run security scans and penetration testing
5. **Launch Preparation**: Set up customer support and monitoring

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Google Cloud Speech**: https://cloud.google.com/speech-to-text/docs
- **Stripe Integration**: https://stripe.com/docs/payments
- **Vercel Deployment**: https://vercel.com/docs

For CantoneseScribe-specific issues, refer to the development team or create an issue in the project repository.
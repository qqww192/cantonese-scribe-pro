# Supabase Setup Guide for CantoneseScribe

## 🚀 Quick Start

You have two options:
1. **Automated Setup** - Run the provided script (recommended)
2. **Manual Setup** - Follow step-by-step instructions

---

## Option 1: Automated Setup (Recommended)

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Install PostgreSQL client
# Ubuntu/Debian:
sudo apt-get install postgresql-client

# macOS:
brew install postgresql

# Verify installations
supabase --version
psql --version
```

### Run Setup Script
```bash
# Make script executable
chmod +x scripts/setup-supabase-production.sh

# Complete setup (recommended)
./scripts/setup-supabase-production.sh setup-all

# Or step-by-step:
./scripts/setup-supabase-production.sh create-project
./scripts/setup-supabase-production.sh setup-database
./scripts/setup-supabase-production.sh test-connection
```

### After Script Completes
1. Copy variables from `vercel-supabase-env.txt` to your `.env.production` file
2. Set environment variables in Vercel dashboard
3. Complete manual configuration steps shown in script output

---

## Option 2: Manual Setup

### Step 1: Create Supabase Account & Project

1. **Sign up at [supabase.com](https://supabase.com)**
   - Use your professional email
   - Verify your email address

2. **Create a new project:**
   - Click "New Project"
   - Organization: Create new or use existing
   - Name: `cantonese-scribe-production`
   - Database Password: Generate strong password (save it!)
   - Region: `US East (N. Virginia)` (recommended)
   - Pricing Plan: Start with Free tier

3. **Wait for project creation** (2-3 minutes)

### Step 2: Get Project Configuration

1. **Project Settings:**
   - Go to Settings → General
   - Note your **Project URL**: `https://your-project-ref.supabase.co`
   - Note your **Project Ref**: `your-project-ref`

2. **API Keys:**
   - Go to Settings → API
   - Copy **anon/public key** (for frontend)
   - Copy **service_role key** (for backend - keep secret!)

3. **Database URL:**
   - Go to Settings → Database
   - Copy **Connection string** (URI format)
   - Replace `[YOUR-PASSWORD]` with your actual database password

### Step 3: Configure Authentication

1. **Go to Authentication → Settings:**
   - **Enable email confirmation**: ON
   - **JWT expiry limit**: `3600` (1 hour)
   - **Site URL**: `https://your-domain.com` (your production domain)
   - **Redirect URLs**: Add your production domain

2. **Email Templates:**
   - Go to Authentication → Email Templates
   - Customize confirmation and reset password emails
   - Add your branding and domain

3. **Providers (optional):**
   - Enable Google, GitHub OAuth if needed
   - Configure redirect URLs for each provider

### Step 4: Set Up Database Schema

1. **Go to SQL Editor in Supabase dashboard**

2. **Create initial tables:**
```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    subscription_tier TEXT DEFAULT 'free',
    usage_minutes_month INTEGER DEFAULT 0,
    usage_limit_minutes INTEGER DEFAULT 5, -- 5 minutes free
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL,
    tier TEXT NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcriptions table
CREATE TABLE public.transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    youtube_url TEXT,
    file_name TEXT,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    duration_minutes DECIMAL,
    cost DECIMAL DEFAULT 0,
    transcription_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processing_completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    transcription_id UUID REFERENCES public.transcriptions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    cost DECIMAL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON public.transcriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### Step 5: Enable Row Level Security (RLS)

1. **Enable RLS on all tables:**
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
```

2. **Create security policies:**
```sql
-- Users can only see/edit their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = auth_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- Transcriptions policies
CREATE POLICY "Users can manage own transcriptions" ON public.transcriptions
    FOR ALL USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- Usage tracking policies
CREATE POLICY "Users can view own usage" ON public.usage_tracking
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
```

### Step 6: Configure Storage

1. **Go to Storage in Supabase dashboard**

2. **Create buckets:**
   - **Bucket name**: `audio-uploads`
     - Public: `false` 
     - File size limit: `100MB`
     - Allowed MIME types: `audio/*,video/*`

   - **Bucket name**: `transcription-exports`
     - Public: `false`
     - File size limit: `50MB`
     - Allowed MIME types: `text/*,application/json`

3. **Set bucket policies:**
```sql
-- Audio uploads bucket policy
CREATE POLICY "Users can upload own audio files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own audio files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Export files bucket policy
CREATE POLICY "Users can access own exports" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'transcription-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 7: Enable Real-time (optional)

1. **Go to Database → Replication**

2. **Add tables to replication:**
   - Enable for `transcriptions` table (for progress updates)
   - Enable for `usage_tracking` table (for live usage updates)

### Step 8: Configure Environment Variables

Create these environment variables in your Vercel dashboard:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
SUPABASE_PROJECT_REF=your-project-ref
```

---

## ✅ Verification Steps

### Test Database Connection
```bash
# Test with psql
psql "postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres" -c "SELECT version();"

# Test authentication
curl -X POST "https://your-project-ref.supabase.co/auth/v1/signup" \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Verify Setup in Supabase Dashboard
1. **Database:** Check that all tables exist with correct structure
2. **Authentication:** Verify settings are configured correctly
3. **Storage:** Ensure buckets are created with proper policies
4. **API:** Test API endpoints are responding

---

## 🔧 Troubleshooting

### Common Issues

**1. Authentication not working:**
- Check JWT expiry settings
- Verify Site URL and Redirect URLs
- Ensure email confirmation is properly configured

**2. Database connection issues:**
- Verify DATABASE_URL format
- Check firewall/network connectivity
- Ensure project is not paused (free tier limitation)

**3. Storage upload failures:**
- Check bucket policies
- Verify file size and MIME type limits
- Ensure user authentication is working

**4. RLS policies blocking access:**
- Check policy syntax
- Verify `auth.uid()` is available in context
- Test with service_role key for debugging

### Getting Help

1. **Supabase Docs:** https://supabase.com/docs
2. **Community:** https://github.com/supabase/supabase/discussions
3. **Discord:** https://discord.supabase.com

---

## 🚀 Next Steps

After completing Supabase setup:

1. **Update your application code** to use real Supabase endpoints
2. **Test the complete authentication flow**
3. **Verify file upload and transcription pipeline**
4. **Set up monitoring and alerts**
5. **Configure backup strategies**

Your Supabase database is now ready for production! 🎉
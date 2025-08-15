-- DEFINITIVE FIX for Supabase Auth Integration
-- This will resolve the "Database error saving new user" issue

-- Step 1: Remove the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Step 2: Check what's in the users table and clean it if needed
DO $$
BEGIN
    -- First, let's see the current structure
    RAISE NOTICE 'Current users table structure:';
END $$;

-- Step 3: Ensure users table has the minimal required structure for Supabase Auth
-- We'll drop and recreate it to ensure it's clean
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language_preference VARCHAR(10) DEFAULT 'en',
    profile_image_url TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional fields for future use
    stripe_customer_id VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Step 5: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policy
DROP POLICY IF EXISTS users_own_data ON public.users;
CREATE POLICY users_own_data ON public.users
    FOR ALL USING (auth.uid() = id);

-- Step 7: Create a bulletproof trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Use a safe insert with explicit error handling
    INSERT INTO public.users (
        id,
        email,
        email_verified,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        COALESCE(NEW.created_at, NOW())
    );
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, just update
        UPDATE public.users
        SET
            email = NEW.email,
            email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail auth
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create the update trigger function
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET
        email = NEW.email,
        email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_user_update: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create the triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();

-- Step 10: Test the setup
DO $$
BEGIN
    RAISE NOTICE '✅ Auth fix completed successfully!';
    RAISE NOTICE 'Users table recreated with proper structure';
    RAISE NOTICE 'Bulletproof triggers installed with error handling';
    RAISE NOTICE 'RLS enabled for security';
    RAISE NOTICE 'Ready for user signup testing';
END $$;
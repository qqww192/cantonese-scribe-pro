-- Debug and fix Supabase Auth integration issues
-- Run this to diagnose and fix the signup problem

-- First, let's check if the users table exists and its structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Users table exists';
    ELSE
        RAISE NOTICE 'Users table does NOT exist - this is the problem!';
    END IF;
END $$;

-- Check the current structure of users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth%';

-- Alternative approach: Create a simpler trigger that handles errors gracefully
CREATE OR REPLACE FUNCTION handle_new_user_safe()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        -- Try to insert with minimal required fields
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
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the auth process
        RAISE LOG 'Failed to create user record: %', SQLERRM;
        -- Return NEW anyway to allow auth to succeed
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the trigger with the safe version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_safe();

-- If users table doesn't exist, create a minimal version
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to see their own data
DROP POLICY IF EXISTS users_own_data ON users;
CREATE POLICY users_own_data ON users
    FOR ALL USING (auth.uid() = id);

-- Test the setup
DO $$
BEGIN
    RAISE NOTICE 'Debug setup completed. Try signup again.';
    RAISE NOTICE 'If this still fails, check Supabase Auth settings in dashboard.';
END $$;
-- Fix for Supabase Auth Integration
-- This addresses the password_hash issue in the users table

-- First, let's modify the users table to make password_hash optional for Supabase Auth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Update the trigger function to handle Supabase Auth users properly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user into our users table when they sign up via Supabase Auth
    INSERT INTO public.users (
        id,
        email,
        email_verified,
        password_hash,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.email_confirmed_at IS NOT NULL,
        'supabase_auth', -- Placeholder since Supabase handles auth
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Update the user update trigger as well
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user record when auth user is updated
    UPDATE public.users
    SET
        email = NEW.email,
        email_verified = (NEW.email_confirmed_at IS NOT NULL),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the update trigger
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_update();

-- Test message
DO $$
BEGIN
    RAISE NOTICE 'Auth trigger fix applied successfully!';
    RAISE NOTICE 'Users table now accepts Supabase Auth users without password_hash requirement';
END $$;
-- Temporarily disable all auth triggers to test if that's the issue
-- This will help isolate whether the problem is the trigger or something else

-- Remove all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Remove trigger functions  
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();

DO $$
BEGIN
    RAISE NOTICE '🚫 All auth triggers have been DISABLED';
    RAISE NOTICE 'This is for testing only - user records will NOT be created in public.users';
    RAISE NOTICE 'But auth signup should now work if triggers were the issue';
END $$;
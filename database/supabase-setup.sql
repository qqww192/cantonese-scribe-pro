-- Supabase-specific configuration for CantoneseScribe
-- Run this after creating the initial schema

-- =====================================================
-- SUPABASE AUTH INTEGRATION
-- =====================================================

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user into our users table when they sign up via Supabase Auth
    INSERT INTO public.users (
        id,
        email,
        email_verified,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.email_confirmed_at IS NOT NULL,
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create user record when new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to sync user updates from Supabase Auth
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

-- Trigger to sync user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_update();

-- =====================================================
-- SUPABASE STORAGE INTEGRATION
-- =====================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('audio-uploads', 'audio-uploads', false, 104857600, ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'video/mp4', 'video/webm']),
    ('transcription-exports', 'transcription-exports', false, 52428800, ARRAY['text/plain', 'text/csv', 'application/x-subrip', 'text/vtt'])
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for audio uploads
CREATE POLICY "Users can upload audio files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their audio files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audio-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their audio files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for transcription exports
CREATE POLICY "Users can upload export files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'transcription-exports' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their export files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'transcription-exports' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their export files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'transcription-exports' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- SUPABASE EDGE FUNCTIONS INTEGRATION
-- =====================================================

-- Function to log edge function calls
CREATE OR REPLACE FUNCTION log_edge_function_call(
    function_name TEXT,
    user_id UUID DEFAULT auth.uid(),
    execution_time INTEGER DEFAULT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        details,
        timestamp
    ) VALUES (
        user_id,
        'edge_function_call',
        'edge_function',
        json_build_object(
            'function_name', function_name,
            'execution_time_ms', execution_time,
            'success', success,
            'error_message', error_message
        ),
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REAL-TIME SUBSCRIPTIONS
-- =====================================================

-- Enable real-time for transcription progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE transcriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE usage_tracking;

-- =====================================================
-- SUPABASE WEBHOOKS CONFIGURATION
-- =====================================================

-- Function to handle Stripe webhooks via Supabase
CREATE OR REPLACE FUNCTION handle_stripe_webhook(
    event_type TEXT,
    event_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    customer_id TEXT;
    user_record users%ROWTYPE;
    subscription_record subscriptions%ROWTYPE;
BEGIN
    -- Extract customer ID from event data
    customer_id := event_data->>'customer';
    
    -- Find user by Stripe customer ID
    SELECT * INTO user_record FROM users WHERE stripe_customer_id = customer_id;
    
    IF user_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Handle different webhook events
    CASE event_type
        WHEN 'customer.subscription.created' THEN
            INSERT INTO subscriptions (
                user_id,
                stripe_subscription_id,
                stripe_price_id,
                status,
                plan_name,
                billing_cycle,
                current_period_start,
                current_period_end
            ) VALUES (
                user_record.id,
                event_data->>'id',
                (event_data->'items'->'data'->0)->>'price',
                event_data->>'status',
                CASE 
                    WHEN (event_data->'items'->'data'->0)->>'price' LIKE '%starter%' THEN 'starter'
                    WHEN (event_data->'items'->'data'->0)->>'price' LIKE '%pro%' THEN 'pro'
                    ELSE 'enterprise'
                END,
                CASE 
                    WHEN (event_data->'items'->'data'->0->'price')->>'recurring_interval' = 'month' THEN 'monthly'
                    ELSE 'yearly'
                END,
                to_timestamp((event_data->>'current_period_start')::bigint),
                to_timestamp((event_data->>'current_period_end')::bigint)
            );
            
        WHEN 'customer.subscription.updated' THEN
            UPDATE subscriptions SET
                status = event_data->>'status',
                current_period_start = to_timestamp((event_data->>'current_period_start')::bigint),
                current_period_end = to_timestamp((event_data->>'current_period_end')::bigint),
                cancel_at_period_end = (event_data->>'cancel_at_period_end')::boolean,
                updated_at = NOW()
            WHERE stripe_subscription_id = event_data->>'id';
            
        WHEN 'customer.subscription.deleted' THEN
            UPDATE subscriptions SET
                status = 'canceled',
                canceled_at = NOW(),
                updated_at = NOW()
            WHERE stripe_subscription_id = event_data->>'id';
            
        WHEN 'invoice.payment_succeeded' THEN
            INSERT INTO payments (
                user_id,
                stripe_payment_intent_id,
                stripe_invoice_id,
                amount,
                currency,
                status,
                billing_reason,
                invoice_period_start,
                invoice_period_end,
                paid_at
            ) VALUES (
                user_record.id,
                event_data->>'payment_intent',
                event_data->>'id',
                ((event_data->>'amount_paid')::numeric / 100),
                event_data->>'currency',
                'succeeded',
                event_data->>'billing_reason',
                to_timestamp(((event_data->'lines'->'data'->0)->>'period_start')::bigint),
                to_timestamp(((event_data->'lines'->'data'->0)->>'period_end')::bigint),
                to_timestamp((event_data->>'status_transitions'->'paid_at')::bigint)
            );
    END CASE;
    
    -- Log the webhook event
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        details
    ) VALUES (
        user_record.id,
        'stripe_webhook',
        'webhook',
        json_build_object(
            'event_type', event_type,
            'stripe_customer_id', customer_id,
            'processed_successfully', true
        )
    );
    
    RETURN json_build_object('success', true, 'event_type', event_type);
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        details
    ) VALUES (
        COALESCE(user_record.id, uuid_nil()),
        'stripe_webhook_error',
        'webhook',
        json_build_object(
            'event_type', event_type,
            'error', SQLERRM,
            'customer_id', customer_id
        )
    );
    
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Function to clean up old audit logs (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete audit logs older than 1 year
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (action, resource_type, details) VALUES (
        'cleanup_audit_logs',
        'maintenance',
        json_build_object('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old system metrics (run weekly)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete system metrics older than 3 months
    DELETE FROM system_metrics 
    WHERE timestamp < NOW() - INTERVAL '3 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING FUNCTIONS
-- =====================================================

-- Function to get system health status
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    active_users_count INTEGER;
    pending_transcriptions INTEGER;
    failed_transcriptions INTEGER;
    avg_processing_time NUMERIC;
BEGIN
    -- Get active users count
    SELECT COUNT(*) INTO active_users_count
    FROM users
    WHERE is_active = true AND last_login_at > NOW() - INTERVAL '30 days';
    
    -- Get pending transcriptions
    SELECT COUNT(*) INTO pending_transcriptions
    FROM transcriptions
    WHERE status IN ('pending', 'processing');
    
    -- Get failed transcriptions in last 24 hours
    SELECT COUNT(*) INTO failed_transcriptions
    FROM transcriptions
    WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Get average processing time
    SELECT AVG(processing_time) INTO avg_processing_time
    FROM transcriptions
    WHERE processing_completed_at > NOW() - INTERVAL '24 hours'
    AND processing_time IS NOT NULL;
    
    result := json_build_object(
        'status', CASE 
            WHEN failed_transcriptions > 10 THEN 'unhealthy'
            WHEN pending_transcriptions > 50 THEN 'degraded'
            ELSE 'healthy'
        END,
        'active_users_30d', active_users_count,
        'pending_transcriptions', pending_transcriptions,
        'failed_transcriptions_24h', failed_transcriptions,
        'avg_processing_time_24h', COALESCE(avg_processing_time, 0),
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Supabase configuration completed successfully!';
    RAISE NOTICE 'Auth integration: Users table will sync with auth.users';
    RAISE NOTICE 'Storage buckets: audio-uploads and transcription-exports created';
    RAISE NOTICE 'Real-time: Enabled for transcriptions and usage_tracking tables';
    RAISE NOTICE 'Webhooks: Stripe webhook handler function created';
    RAISE NOTICE 'Maintenance: Cleanup functions for logs and metrics created';
END $$;
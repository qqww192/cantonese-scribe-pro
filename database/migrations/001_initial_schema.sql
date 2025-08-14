-- CantoneseScribe Initial Database Schema
-- Production database setup for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language_preference VARCHAR(10) DEFAULT 'en',
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    profile_image_url TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- active, canceled, incomplete, incomplete_expired, past_due, trialing, unpaid
    plan_name VARCHAR(100) NOT NULL, -- starter, pro, enterprise
    billing_cycle VARCHAR(20) NOT NULL, -- monthly, yearly
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRANSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    source_type VARCHAR(50) NOT NULL, -- youtube, file_upload
    source_url TEXT,
    original_filename VARCHAR(255),
    file_path TEXT,
    file_size INTEGER,
    duration INTEGER, -- in seconds
    language_code VARCHAR(10) DEFAULT 'yue', -- Cantonese
    
    -- Processing details
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_time INTEGER, -- processing duration in seconds
    processor_type VARCHAR(50), -- whisper, google_speech
    
    -- Result data
    result_data JSONB, -- Full transcription results with timestamps
    segments_count INTEGER DEFAULT 0,
    confidence_score DECIMAL(4,3), -- Average confidence score (0.000-1.000)
    
    -- Cost tracking
    cost DECIMAL(10,4) DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    
    -- File paths for exports
    srt_file_path TEXT,
    vtt_file_path TEXT,
    txt_file_path TEXT,
    csv_file_path TEXT,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE SET NULL,
    
    -- Usage metrics
    usage_type VARCHAR(50) NOT NULL, -- transcription, export, api_call
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    usage_month VARCHAR(7) NOT NULL, -- YYYY-MM format
    
    -- Resource consumption
    duration_seconds INTEGER DEFAULT 0,
    file_size_bytes INTEGER DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    
    -- Billing period tracking
    billing_period_start DATE,
    billing_period_end DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe identifiers
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_invoice_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL, -- Amount in dollars
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- succeeded, pending, failed, canceled, refunded
    payment_method VARCHAR(50), -- card, paypal, etc
    
    -- Billing details
    billing_reason VARCHAR(100), -- subscription_create, subscription_update, invoice
    invoice_period_start TIMESTAMP WITH TIME ZONE,
    invoice_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SYSTEM METRICS TABLE (for monitoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(20),
    metric_type VARCHAR(50), -- counter, gauge, histogram
    labels JSONB, -- Additional metric labels/tags
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOG TABLE (for security and compliance)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- login, logout, create_transcription, etc
    resource_type VARCHAR(50), -- user, transcription, subscription
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB, -- Additional context about the action
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Transcriptions table indexes
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_transcriptions_source_type ON transcriptions(source_type);
CREATE INDEX IF NOT EXISTS idx_transcriptions_processing ON transcriptions(status, processing_started_at) 
    WHERE status IN ('pending', 'processing');

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_month ON usage_tracking(usage_month);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type ON usage_tracking(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_billing_period ON usage_tracking(user_id, billing_period_start, billing_period_end);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- System metrics indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_timestamp ON system_metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own_data ON users
    FOR ALL USING (auth.uid() = id);

-- Subscriptions policy
CREATE POLICY subscriptions_own_data ON subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Transcriptions policy  
CREATE POLICY transcriptions_own_data ON transcriptions
    FOR ALL USING (user_id = auth.uid());

-- Usage tracking policy
CREATE POLICY usage_tracking_own_data ON usage_tracking
    FOR ALL USING (user_id = auth.uid());

-- Payments policy
CREATE POLICY payments_own_data ON payments
    FOR ALL USING (user_id = auth.uid());

-- Audit logs policy (users can only read their own logs)
CREATE POLICY audit_logs_own_data ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- INITIAL DATA AND CONFIGURATION
-- =====================================================

-- Insert system configuration metrics
INSERT INTO system_metrics (metric_name, metric_value, metric_unit, metric_type, labels) VALUES
    ('system_startup', 1, 'count', 'counter', '{"version": "1.0.0", "environment": "production"}'),
    ('database_version', 1, 'version', 'gauge', '{"database": "postgresql", "schema_version": "001"}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to get user subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid UUID)
RETURNS TABLE(
    subscription_id UUID,
    status VARCHAR,
    plan_name VARCHAR,
    current_period_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.status, s.plan_name, s.current_period_end
    FROM subscriptions s
    WHERE s.user_id = user_uuid
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly usage for a user
CREATE OR REPLACE FUNCTION get_monthly_usage(user_uuid UUID, month_str VARCHAR)
RETURNS TABLE(
    total_transcriptions BIGINT,
    total_duration INTEGER,
    total_cost DECIMAL,
    usage_by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_transcriptions,
        COALESCE(SUM(duration_seconds), 0)::INTEGER as total_duration,
        COALESCE(SUM(cost), 0) as total_cost,
        json_agg(
            json_build_object(
                'usage_type', usage_type,
                'count', count,
                'duration', duration,
                'cost', cost
            )
        ) as usage_by_type
    FROM (
        SELECT 
            usage_type,
            COUNT(*) as count,
            SUM(duration_seconds) as duration,
            SUM(cost) as cost
        FROM usage_tracking 
        WHERE user_id = user_uuid 
        AND usage_month = month_str
        GROUP BY usage_type
    ) grouped;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Active users view
CREATE OR REPLACE VIEW active_users AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_login_at,
    s.plan_name,
    s.status as subscription_status,
    COUNT(t.id) as total_transcriptions,
    SUM(t.duration) as total_duration,
    SUM(t.cost) as total_cost
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN transcriptions t ON u.id = t.user_id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.created_at, u.last_login_at, s.plan_name, s.status;

-- Daily usage summary view
CREATE OR REPLACE VIEW daily_usage_summary AS
SELECT 
    usage_date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_usage_events,
    SUM(duration_seconds) as total_duration,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost_per_event
FROM usage_tracking
GROUP BY usage_date
ORDER BY usage_date DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'CantoneseScribe database schema initialized successfully!';
    RAISE NOTICE 'Schema version: 001';
    RAISE NOTICE 'Tables created: users, subscriptions, transcriptions, usage_tracking, payments, system_metrics, audit_logs';
    RAISE NOTICE 'RLS policies enabled for data security';
    RAISE NOTICE 'Indexes created for optimal performance';
END $$;
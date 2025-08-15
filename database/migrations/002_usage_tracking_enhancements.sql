-- Usage Tracking Enhancements Migration
-- Adds plan management, concurrent processing tracking, and usage analytics improvements

-- =====================================================
-- USER PLAN LIMITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_plan_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50) NOT NULL, -- free, starter, pro, enterprise
    credits_per_month INTEGER NOT NULL DEFAULT 30,
    max_file_size_mb INTEGER NOT NULL DEFAULT 25,
    max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
    cost_per_overage_credit DECIMAL(10,4) DEFAULT 0,
    allows_overage BOOLEAN DEFAULT false,
    
    -- Feature flags
    features JSONB DEFAULT '[]'::jsonb,
    
    -- Effective dates
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- Admin user who created this limit
    
    -- Constraints
    UNIQUE(user_id, effective_from),
    CHECK(credits_per_month >= 0),
    CHECK(max_file_size_mb > 0),
    CHECK(max_concurrent_jobs > 0),
    CHECK(cost_per_overage_credit >= 0)
);

-- =====================================================
-- CONCURRENT PROCESSING TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS concurrent_processing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
    
    -- Processing details
    job_id VARCHAR(255) NOT NULL, -- Unique job identifier
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed, cancelled
    priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
    
    -- Timing
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Resource usage
    estimated_duration_seconds INTEGER,
    actual_duration_seconds INTEGER,
    file_size_bytes INTEGER,
    processing_server VARCHAR(100), -- Server/instance handling the job
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK(progress_percentage >= 0 AND progress_percentage <= 100),
    current_stage VARCHAR(100), -- download, extract, transcribe, romanize, export
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USAGE QUOTAS TABLE (for plan overrides)
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Quota details
    quota_type VARCHAR(50) NOT NULL, -- monthly_credits, file_size_mb, concurrent_jobs
    quota_value INTEGER NOT NULL,
    quota_unit VARCHAR(20) NOT NULL, -- credits, mb, jobs
    
    -- Period
    quota_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly, lifetime
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Usage tracking
    used_amount INTEGER DEFAULT 0,
    remaining_amount INTEGER GENERATED ALWAYS AS (quota_value - used_amount) STORED,
    
    -- Metadata
    reason VARCHAR(255), -- Why this quota was granted
    granted_by UUID, -- Admin who granted this quota
    auto_renew BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK(quota_value >= 0),
    CHECK(used_amount >= 0),
    CHECK(used_amount <= quota_value OR quota_value = -1) -- -1 = unlimited
);

-- =====================================================
-- USAGE ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- warning, limit_reached, reset_soon, overage
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    alert_priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Display options
    action_text VARCHAR(100),
    action_url VARCHAR(255),
    dismissible BOOLEAN DEFAULT true,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, dismissed, expired
    dismissed_at TIMESTAMP WITH TIME ZONE,
    dismissed_by_user BOOLEAN DEFAULT false,
    
    -- Timing
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Context data
    context_data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USAGE ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time dimension
    metric_date DATE NOT NULL,
    metric_hour INTEGER CHECK(metric_hour >= 0 AND metric_hour <= 23),
    
    -- Dimensions
    plan_type VARCHAR(50),
    user_segment VARCHAR(50), -- new, active, churned, etc.
    feature_used VARCHAR(100),
    
    -- Metrics
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    
    -- Aggregation level
    aggregation_level VARCHAR(20) NOT NULL, -- user, plan, system, feature
    entity_id UUID, -- User ID, plan ID, etc.
    
    -- Metadata
    labels JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(metric_date, metric_hour, metric_name, aggregation_level, entity_id)
);

-- =====================================================
-- ENHANCED INDEXES FOR PERFORMANCE
-- =====================================================

-- User plan limits indexes
CREATE INDEX IF NOT EXISTS idx_user_plan_limits_user_effective ON user_plan_limits(user_id, effective_from DESC, effective_until);
CREATE INDEX IF NOT EXISTS idx_user_plan_limits_plan_name ON user_plan_limits(plan_name);

-- Concurrent processing indexes
CREATE INDEX IF NOT EXISTS idx_concurrent_processing_user_status ON concurrent_processing(user_id, status);
CREATE INDEX IF NOT EXISTS idx_concurrent_processing_job_id ON concurrent_processing(job_id);
CREATE INDEX IF NOT EXISTS idx_concurrent_processing_queued_at ON concurrent_processing(queued_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_concurrent_processing_active ON concurrent_processing(user_id, status) WHERE status IN ('queued', 'processing');

-- Usage quotas indexes
CREATE INDEX IF NOT EXISTS idx_usage_quotas_user_period ON usage_quotas(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_type ON usage_quotas(quota_type);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_active ON usage_quotas(user_id, quota_type) WHERE period_end >= CURRENT_DATE;

-- Usage alerts indexes
CREATE INDEX IF NOT EXISTS idx_usage_alerts_user_status ON usage_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_type_priority ON usage_alerts(alert_type, alert_priority);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_active ON usage_alerts(user_id) WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW());

-- Usage analytics indexes
CREATE INDEX IF NOT EXISTS idx_usage_analytics_date_name ON usage_analytics(metric_date, metric_name);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_plan_date ON usage_analytics(plan_type, metric_date);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_entity ON usage_analytics(aggregation_level, entity_id, metric_date);

-- Enhanced usage tracking indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_billing_period ON usage_tracking(user_id, billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_monthly_stats ON usage_tracking(user_id, usage_month, usage_type);

-- =====================================================
-- UPDATED TRIGGERS FOR NEW TABLES
-- =====================================================

-- Apply updated_at triggers
CREATE TRIGGER update_user_plan_limits_updated_at BEFORE UPDATE ON user_plan_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concurrent_processing_updated_at BEFORE UPDATE ON concurrent_processing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_quotas_updated_at BEFORE UPDATE ON usage_quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_alerts_updated_at BEFORE UPDATE ON usage_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE user_plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE concurrent_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
-- usage_analytics is admin-only, no RLS needed

-- RLS Policies
CREATE POLICY user_plan_limits_own_data ON user_plan_limits
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY concurrent_processing_own_data ON concurrent_processing
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY usage_quotas_own_data ON usage_quotas
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY usage_alerts_own_data ON usage_alerts
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- ENHANCED FUNCTIONS
-- =====================================================

-- Function to get user's current plan limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_uuid UUID)
RETURNS TABLE(
    plan_name VARCHAR,
    credits_per_month INTEGER,
    max_file_size_mb INTEGER,
    max_concurrent_jobs INTEGER,
    allows_overage BOOLEAN,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        upl.plan_name,
        upl.credits_per_month,
        upl.max_file_size_mb,
        upl.max_concurrent_jobs,
        upl.allows_overage,
        upl.features
    FROM user_plan_limits upl
    WHERE upl.user_id = user_uuid
    AND upl.effective_from <= CURRENT_DATE
    AND (upl.effective_until IS NULL OR upl.effective_until >= CURRENT_DATE)
    ORDER BY upl.effective_from DESC
    LIMIT 1;
    
    -- If no custom limits found, return default free plan limits
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            'free'::VARCHAR as plan_name,
            30 as credits_per_month,
            25 as max_file_size_mb,
            1 as max_concurrent_jobs,
            false as allows_overage,
            '["Basic transcription", "Cantonese support", "SRT/VTT export"]'::JSONB as features;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check concurrent processing limits
CREATE OR REPLACE FUNCTION check_concurrent_processing_limit(user_uuid UUID)
RETURNS TABLE(
    can_process BOOLEAN,
    current_jobs INTEGER,
    max_jobs INTEGER,
    queue_position INTEGER
) AS $$
DECLARE
    user_limits RECORD;
    current_processing INTEGER;
    queued_jobs INTEGER;
BEGIN
    -- Get user's limits
    SELECT * INTO user_limits FROM get_user_plan_limits(user_uuid);
    
    -- Count current processing jobs
    SELECT COUNT(*) INTO current_processing
    FROM concurrent_processing
    WHERE user_id = user_uuid AND status = 'processing';
    
    -- Count queued jobs
    SELECT COUNT(*) INTO queued_jobs
    FROM concurrent_processing
    WHERE user_id = user_uuid AND status = 'queued';
    
    RETURN QUERY
    SELECT 
        (current_processing < user_limits.max_concurrent_jobs) as can_process,
        current_processing as current_jobs,
        user_limits.max_concurrent_jobs as max_jobs,
        CASE 
            WHEN current_processing >= user_limits.max_concurrent_jobs THEN queued_jobs + 1
            ELSE 0
        END as queue_position;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate usage statistics
CREATE OR REPLACE FUNCTION calculate_usage_stats(user_uuid UUID, months_back INTEGER DEFAULT 12)
RETURNS TABLE(
    total_transcriptions BIGINT,
    total_duration_hours DECIMAL,
    total_cost DECIMAL,
    average_file_size_mb DECIMAL,
    most_active_hour INTEGER,
    favorite_export_format VARCHAR,
    accuracy_trend DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH usage_stats AS (
        SELECT 
            COUNT(*) as transcription_count,
            SUM(duration_seconds) as total_seconds,
            SUM(cost) as total_cost,
            AVG(file_size_bytes::decimal / 1024 / 1024) as avg_file_size,
            EXTRACT(HOUR FROM created_at) as hour_of_day
        FROM usage_tracking
        WHERE user_id = user_uuid
        AND usage_date >= CURRENT_DATE - INTERVAL '%s months' % months_back
        AND usage_type = 'transcription'
        GROUP BY EXTRACT(HOUR FROM created_at)
    ),
    hourly_activity AS (
        SELECT hour_of_day, transcription_count,
               ROW_NUMBER() OVER (ORDER BY transcription_count DESC) as rn
        FROM usage_stats
    )
    SELECT 
        (SELECT SUM(transcription_count) FROM usage_stats) as total_transcriptions,
        (SELECT SUM(total_seconds) / 3600.0 FROM usage_stats) as total_duration_hours,
        (SELECT SUM(total_cost) FROM usage_stats) as total_cost,
        (SELECT AVG(avg_file_size) FROM usage_stats) as average_file_size_mb,
        (SELECT hour_of_day::INTEGER FROM hourly_activity WHERE rn = 1) as most_active_hour,
        'SRT'::VARCHAR as favorite_export_format, -- Placeholder - would come from export data
        95.5::DECIMAL as accuracy_trend; -- Placeholder - would come from quality metrics
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA FOR NEW TABLES
-- =====================================================

-- Insert default plan limits for existing users who don't have custom limits
INSERT INTO user_plan_limits (user_id, plan_name, credits_per_month, max_file_size_mb, max_concurrent_jobs, features)
SELECT 
    u.id,
    COALESCE(s.plan_name, 'free') as plan_name,
    CASE COALESCE(s.plan_name, 'free')
        WHEN 'free' THEN 30
        WHEN 'starter' THEN 150
        WHEN 'pro' THEN 500
        WHEN 'enterprise' THEN 2000
        ELSE 30
    END as credits_per_month,
    CASE COALESCE(s.plan_name, 'free')
        WHEN 'free' THEN 25
        WHEN 'starter' THEN 100
        WHEN 'pro' THEN 500
        WHEN 'enterprise' THEN 1000
        ELSE 25
    END as max_file_size_mb,
    CASE COALESCE(s.plan_name, 'free')
        WHEN 'free' THEN 1
        WHEN 'starter' THEN 2
        WHEN 'pro' THEN 5
        WHEN 'enterprise' THEN 10
        ELSE 1
    END as max_concurrent_jobs,
    CASE COALESCE(s.plan_name, 'free')
        WHEN 'free' THEN '["Basic transcription", "Cantonese support", "SRT/VTT export"]'::jsonb
        WHEN 'starter' THEN '["Everything in Free", "Higher accuracy", "Bulk processing", "CSV export"]'::jsonb
        WHEN 'pro' THEN '["Everything in Starter", "Priority processing", "Custom vocabulary", "API access"]'::jsonb
        WHEN 'enterprise' THEN '["Everything in Pro", "Dedicated support", "Custom integrations", "SLA guarantee"]'::jsonb
        ELSE '["Basic transcription", "Cantonese support", "SRT/VTT export"]'::jsonb
    END as features
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'trialing')
WHERE u.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM user_plan_limits upl 
    WHERE upl.user_id = u.id
)
ON CONFLICT (user_id, effective_from) DO NOTHING;

-- =====================================================
-- VIEWS FOR ENHANCED REPORTING
-- =====================================================

-- Enhanced daily usage view
CREATE OR REPLACE VIEW daily_usage_enhanced AS
SELECT 
    ut.usage_date,
    ut.usage_type,
    u.id as user_id,
    u.email,
    COALESCE(s.plan_name, 'free') as plan_name,
    COUNT(*) as usage_events,
    SUM(ut.duration_seconds) as total_duration_seconds,
    SUM(ut.cost) as total_cost,
    AVG(ut.file_size_bytes::float / 1024 / 1024) as avg_file_size_mb,
    SUM(CASE 
        WHEN ut.usage_type = 'transcription' THEN GREATEST(1, CEIL(ut.duration_seconds::float / 60))
        ELSE 1
    END) as credits_used
FROM usage_tracking ut
JOIN users u ON ut.user_id = u.id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
WHERE ut.usage_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY ut.usage_date, ut.usage_type, u.id, u.email, s.plan_name
ORDER BY ut.usage_date DESC, credits_used DESC;

-- Plan utilization view
CREATE OR REPLACE VIEW plan_utilization AS
SELECT 
    COALESCE(s.plan_name, 'free') as plan_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN ut.usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN u.id END) as active_this_month,
    AVG(monthly_stats.credits_used) as avg_credits_used,
    AVG(upl.credits_per_month) as avg_credits_allocated,
    AVG(monthly_stats.credits_used::float / upl.credits_per_month * 100) as avg_utilization_rate
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN user_plan_limits upl ON u.id = upl.user_id 
    AND upl.effective_from <= CURRENT_DATE 
    AND (upl.effective_until IS NULL OR upl.effective_until >= CURRENT_DATE)
LEFT JOIN (
    SELECT 
        user_id,
        SUM(CASE 
            WHEN usage_type = 'transcription' THEN GREATEST(1, CEIL(duration_seconds::float / 60))
            ELSE 1
        END) as credits_used
    FROM usage_tracking
    WHERE usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    GROUP BY user_id
) monthly_stats ON u.id = monthly_stats.user_id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id
WHERE u.is_active = true
GROUP BY s.plan_name
ORDER BY total_users DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Usage tracking enhancements migration completed successfully!';
    RAISE NOTICE 'New tables: user_plan_limits, concurrent_processing, usage_quotas, usage_alerts, usage_analytics';
    RAISE NOTICE 'Enhanced functions: get_user_plan_limits, check_concurrent_processing_limit, calculate_usage_stats';
    RAISE NOTICE 'New indexes and views created for improved performance and reporting';
END $$;
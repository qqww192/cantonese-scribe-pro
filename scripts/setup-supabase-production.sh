#!/bin/bash

# Supabase Production Setup Script for CantoneseScribe
# This script configures Supabase for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_PROJECT_NAME="${SUPABASE_PROJECT_NAME:-cantonese-scribe-production}"
DATABASE_PASSWORD_LENGTH=32

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_message $BLUE "🔧 Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for Supabase CLI
    if ! command -v supabase &> /dev/null; then
        missing_tools+=("supabase-cli")
    fi
    
    # Check for openssl for password generation
    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi
    
    # Check for psql (PostgreSQL client)
    if ! command -v psql &> /dev/null; then
        missing_tools+=("postgresql-client")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_message $RED "❌ Missing required tools: ${missing_tools[*]}"
        print_message $YELLOW "Install Supabase CLI: npm install -g supabase"
        print_message $YELLOW "Install PostgreSQL client: apt-get install postgresql-client (Ubuntu) or brew install postgresql (macOS)"
        exit 1
    fi
    
    print_message $GREEN "✅ All prerequisites are installed"
}

# Function to authenticate with Supabase
authenticate_supabase() {
    print_message $BLUE "🔐 Checking Supabase authentication..."
    
    # Check if already authenticated
    if supabase projects list > /dev/null 2>&1; then
        print_message $GREEN "✅ Already authenticated with Supabase"
    else
        print_message $YELLOW "⚠️  Not authenticated with Supabase"
        print_message $BLUE "🔐 Starting Supabase authentication..."
        supabase login
    fi
}

# Function to create production project
create_production_project() {
    print_message $BLUE "🏗️  Creating Supabase production project..."
    
    # Check if project already exists
    if supabase projects list | grep -q "$SUPABASE_PROJECT_NAME"; then
        print_message $GREEN "✅ Production project already exists: $SUPABASE_PROJECT_NAME"
        local project_ref=$(supabase projects list | grep "$SUPABASE_PROJECT_NAME" | awk '{print $1}')
        echo "PROJECT_REF=$project_ref" > supabase-production.env
    else
        print_message $BLUE "Creating new project: $SUPABASE_PROJECT_NAME"
        
        # Generate secure database password
        local db_password=$(openssl rand -base64 $DATABASE_PASSWORD_LENGTH | tr -d "=+/" | cut -c1-25)
        
        # Create the project
        local project_ref=$(supabase projects create "$SUPABASE_PROJECT_NAME" --db-password "$db_password" --region us-east-1)
        
        if [ -n "$project_ref" ]; then
            print_message $GREEN "✅ Created production project: $project_ref"
            
            # Save project configuration
            cat > "supabase-production.env" << EOF
# Supabase Production Project Configuration
PROJECT_REF=$project_ref
PROJECT_NAME=$SUPABASE_PROJECT_NAME
DATABASE_PASSWORD=$db_password
REGION=us-east-1
SUPABASE_URL=https://$project_ref.supabase.co
DATABASE_URL=postgresql://postgres:$db_password@db.$project_ref.supabase.co:5432/postgres
EOF
            
            print_message $GREEN "✅ Project configuration saved to supabase-production.env"
        else
            print_message $RED "❌ Failed to create production project"
            exit 1
        fi
    fi
}

# Function to get project API keys
get_project_keys() {
    print_message $BLUE "🔑 Retrieving project API keys..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    # Get API keys
    local anon_key=$(supabase projects api-keys --project-ref "$PROJECT_REF" | grep "anon key" | awk '{print $3}')
    local service_key=$(supabase projects api-keys --project-ref "$PROJECT_REF" | grep "service_role key" | awk '{print $3}')
    
    if [ -n "$anon_key" ] && [ -n "$service_key" ]; then
        # Append keys to configuration
        cat >> "supabase-production.env" << EOF
SUPABASE_ANON_KEY=$anon_key
SUPABASE_SERVICE_KEY=$service_key
EOF
        print_message $GREEN "✅ API keys retrieved and saved"
    else
        print_message $RED "❌ Failed to retrieve API keys"
        exit 1
    fi
}

# Function to setup database schema
setup_database_schema() {
    print_message $BLUE "🗄️  Setting up database schema..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    # Run initial schema migration
    if [ -f "database/migrations/001_initial_schema.sql" ]; then
        print_message $BLUE "Running initial schema migration..."
        
        # Connect and run migration
        PGPASSWORD="$DATABASE_PASSWORD" psql -h "db.$PROJECT_REF.supabase.co" -p 5432 -U postgres -d postgres -f "database/migrations/001_initial_schema.sql" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            print_message $GREEN "✅ Initial schema migration completed"
        else
            print_message $YELLOW "⚠️  Schema migration had warnings (check manually)"
        fi
    else
        print_message $YELLOW "⚠️  Initial schema file not found"
    fi
    
    # Run Supabase-specific configuration
    if [ -f "database/supabase-setup.sql" ]; then
        print_message $BLUE "Running Supabase-specific configuration..."
        
        PGPASSWORD="$DATABASE_PASSWORD" psql -h "db.$PROJECT_REF.supabase.co" -p 5432 -U postgres -d postgres -f "database/supabase-setup.sql" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            print_message $GREEN "✅ Supabase configuration completed"
        else
            print_message $YELLOW "⚠️  Supabase configuration had warnings"
        fi
    else
        print_message $YELLOW "⚠️  Supabase setup file not found"
    fi
}

# Function to configure authentication
configure_authentication() {
    print_message $BLUE "🔐 Configuring authentication settings..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    print_message $BLUE "Authentication configuration:"
    echo "1. Enable email confirmation for new users"
    echo "2. Set JWT expiration to 3600 seconds (1 hour)"
    echo "3. Configure password requirements"
    echo "4. Set up email templates"
    echo ""
    print_message $YELLOW "⚠️  Manual configuration required:"
    echo "1. Go to https://app.supabase.com/project/$PROJECT_REF/auth/settings"
    echo "2. Enable 'Confirm email' under User Signups"
    echo "3. Set 'JWT expiry limit' to 3600 seconds"
    echo "4. Configure 'Site URL' to your production domain"
    echo "5. Add production domain to 'Redirect URLs'"
    echo "6. Configure SMTP settings for production emails"
}

# Function to setup row level security policies
setup_row_level_security() {
    print_message $BLUE "🛡️  Setting up Row Level Security policies..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    # Create RLS policies SQL
    cat > "rls-policies.sql" << 'EOF'
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Subscriptions table policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Transcriptions table policies
CREATE POLICY "Users can view own transcriptions" ON transcriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transcriptions" ON transcriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcriptions" ON transcriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcriptions" ON transcriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Usage tracking policies
CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage data" ON usage_tracking
    FOR INSERT WITH CHECK (true);

-- Payments table policies
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

-- Audit logs policies (read-only for users)
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- System policies for service operations
CREATE POLICY "Service role can manage all data" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage subscriptions" ON subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage transcriptions" ON transcriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage usage" ON usage_tracking
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage payments" ON payments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage audit logs" ON audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EOF
    
    # Apply RLS policies
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "db.$PROJECT_REF.supabase.co" -p 5432 -U postgres -d postgres -f "rls-policies.sql" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Row Level Security policies applied"
        rm "rls-policies.sql"
    else
        print_message $RED "❌ Failed to apply RLS policies"
    fi
}

# Function to configure storage buckets
configure_storage_buckets() {
    print_message $BLUE "🪣 Configuring storage buckets..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    print_message $BLUE "Storage bucket configuration:"
    echo "1. audio-uploads: For user audio/video uploads"
    echo "2. transcription-exports: For generated transcription files"
    echo ""
    print_message $YELLOW "⚠️  Manual configuration required:"
    echo "1. Go to https://app.supabase.com/project/$PROJECT_REF/storage/buckets"
    echo "2. Create 'audio-uploads' bucket with:"
    echo "   - Public: false"
    echo "   - File size limit: 100MB"
    echo "   - Allowed MIME types: audio/*, video/*"
    echo "3. Create 'transcription-exports' bucket with:"
    echo "   - Public: false"
    echo "   - File size limit: 50MB"
    echo "   - Allowed MIME types: text/*, application/json"
    echo "4. Configure bucket policies for user access"
}

# Function to setup real-time subscriptions
setup_realtime() {
    print_message $BLUE "⚡ Setting up real-time subscriptions..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    # Enable real-time for specific tables
    cat > "enable-realtime.sql" << 'EOF'
-- Enable real-time for transcription progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE transcriptions;

-- Enable real-time for usage tracking
ALTER PUBLICATION supabase_realtime ADD TABLE usage_tracking;

-- Create real-time filters for security
-- Users should only receive updates for their own data
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
    SELECT COALESCE(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
$$ LANGUAGE sql STABLE;
EOF
    
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "db.$PROJECT_REF.supabase.co" -p 5432 -U postgres -d postgres -f "enable-realtime.sql" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Real-time subscriptions enabled"
        rm "enable-realtime.sql"
    else
        print_message $YELLOW "⚠️  Real-time setup had warnings"
    fi
}

# Function to configure edge functions
configure_edge_functions() {
    print_message $BLUE "⚡ Configuring Edge Functions..."
    
    print_message $YELLOW "⚠️  Manual Edge Function setup required:"
    echo "1. Create Stripe webhook handler Edge Function"
    echo "2. Create background job processor Edge Function"
    echo "3. Configure function environment variables"
    echo "4. Deploy functions to production"
    echo ""
    echo "Example Edge Function commands:"
    echo "  supabase functions new stripe-webhook"
    echo "  supabase functions new process-transcription"
    echo "  supabase functions deploy --project-ref $PROJECT_REF"
}

# Function to setup monitoring and logging
setup_monitoring() {
    print_message $BLUE "📊 Setting up monitoring and logging..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    # Create monitoring views
    cat > "monitoring-views.sql" << 'EOF'
-- Create view for system health monitoring
CREATE OR REPLACE VIEW system_health_view AS
SELECT 
    'healthy' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 1 END) as active_users_24h,
    COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d
FROM auth.users
WHERE deleted_at IS NULL;

-- Create view for transcription metrics
CREATE OR REPLACE VIEW transcription_metrics_view AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (processing_completed_at - created_at))) as avg_processing_time,
    SUM(cost) as total_cost
FROM transcriptions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Create view for usage metrics
CREATE OR REPLACE VIEW usage_metrics_view AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost_per_request
FROM usage_tracking
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
EOF
    
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "db.$PROJECT_REF.supabase.co" -p 5432 -U postgres -d postgres -f "monitoring-views.sql" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Monitoring views created"
        rm "monitoring-views.sql"
    else
        print_message $YELLOW "⚠️  Monitoring setup had warnings"
    fi
    
    print_message $YELLOW "⚠️  Additional monitoring setup:"
    echo "1. Configure log retention in Supabase dashboard"
    echo "2. Set up alert webhooks for critical events"
    echo "3. Enable database metrics collection"
    echo "4. Configure backup schedules"
}

# Function to test database connection
test_database_connection() {
    print_message $BLUE "🧪 Testing database connection..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    # Test connection
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "db.$PROJECT_REF.supabase.co" -p 5432 -U postgres -d postgres -c "SELECT version();" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Database connection successful"
        
        # Test basic queries
        local user_count=$(PGPASSWORD="$DATABASE_PASSWORD" psql -h "db.$PROJECT_REF.supabase.co" -p 5432 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM auth.users;" 2>/dev/null | xargs)
        
        if [ -n "$user_count" ]; then
            print_message $GREEN "✅ Database queries working (Users: $user_count)"
        else
            print_message $YELLOW "⚠️  Basic queries successful but no user data found"
        fi
    else
        print_message $RED "❌ Database connection failed"
        exit 1
    fi
}

# Function to generate environment variables for Vercel
generate_vercel_env_vars() {
    print_message $BLUE "📝 Generating Vercel environment variables..."
    
    if [ ! -f "supabase-production.env" ]; then
        print_message $RED "❌ Project configuration not found"
        exit 1
    fi
    
    source supabase-production.env
    
    # Create Vercel environment variables file
    cat > "vercel-supabase-env.txt" << EOF
# Supabase Production Environment Variables for Vercel
# Generated on $(date)

# Database Configuration
DATABASE_URL=$DATABASE_URL
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# Project Configuration
SUPABASE_PROJECT_REF=$PROJECT_REF
SUPABASE_REGION=us-east-1

EOF
    
    print_message $GREEN "✅ Vercel environment variables saved to: vercel-supabase-env.txt"
    print_message $BLUE "📋 Next steps:"
    echo "1. Copy variables from vercel-supabase-env.txt to your production .env file"
    echo "2. Set these variables in Vercel dashboard for production environment"
    echo "3. Update ALLOWED_ORIGINS in your API configuration"
    echo "4. Test the connection from your application"
}

# Function to show usage
show_usage() {
    echo "Supabase Production Setup Script for CantoneseScribe"
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup-all            - Complete Supabase production setup (default)"
    echo "  create-project       - Create production project only"
    echo "  setup-database       - Set up database schema and configuration"
    echo "  setup-auth           - Configure authentication settings"
    echo "  setup-storage        - Configure storage buckets"
    echo "  setup-realtime       - Enable real-time subscriptions"
    echo "  setup-monitoring     - Set up monitoring and logging"
    echo "  test-connection      - Test database connection"
    echo "  generate-env         - Generate Vercel environment variables"
    echo ""
    echo "Options:"
    echo "  --project-name NAME  - Supabase project name"
    echo ""
    echo "Examples:"
    echo "  $0 setup-all --project-name cantonese-scribe-prod"
    echo "  $0 test-connection"
    echo "  $0 generate-env"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-name)
            SUPABASE_PROJECT_NAME="$2"
            shift 2
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            COMMAND="$1"
            shift
            ;;
    esac
done

# Set default command
COMMAND="${COMMAND:-setup-all}"

# Main execution
main() {
    print_message $PURPLE "🗄️  CantoneseScribe Supabase Production Setup"
    print_message $PURPLE "============================================="
    echo ""
    
    case $COMMAND in
        "setup-all")
            check_prerequisites
            authenticate_supabase
            create_production_project
            get_project_keys
            setup_database_schema
            setup_row_level_security
            configure_authentication
            configure_storage_buckets
            setup_realtime
            configure_edge_functions
            setup_monitoring
            test_database_connection
            generate_vercel_env_vars
            ;;
            
        "create-project")
            check_prerequisites
            authenticate_supabase
            create_production_project
            get_project_keys
            ;;
            
        "setup-database")
            setup_database_schema
            setup_row_level_security
            ;;
            
        "setup-auth")
            configure_authentication
            ;;
            
        "setup-storage")
            configure_storage_buckets
            ;;
            
        "setup-realtime")
            setup_realtime
            ;;
            
        "setup-monitoring")
            setup_monitoring
            ;;
            
        "test-connection")
            test_database_connection
            ;;
            
        "generate-env")
            generate_vercel_env_vars
            ;;
            
        *)
            print_message $RED "❌ Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    print_message $GREEN "🎉 Supabase production setup completed!"
}

# Execute main function
main
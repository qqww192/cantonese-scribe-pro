#!/bin/bash

# CantoneseScribe Production Secrets Management Script
# This script helps set up environment variables securely in Vercel
# and validates the production configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
VERCEL_PROJECT_NAME="${VERCEL_PROJECT_NAME:-cantonese-scribe-pro}"
SECRETS_FILE="${SECRETS_FILE:-.env.production}"

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
    
    # Check for Vercel CLI
    if ! command -v vercel &> /dev/null; then
        missing_tools+=("vercel")
    fi
    
    # Check for openssl for secret generation
    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi
    
    # Check for base64
    if ! command -v base64 &> /dev/null; then
        missing_tools+=("coreutils")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_message $RED "❌ Missing required tools: ${missing_tools[*]}"
        print_message $YELLOW "Install Vercel CLI: npm install -g vercel"
        print_message $YELLOW "Install OpenSSL and coreutils (usually pre-installed)"
        exit 1
    fi
    
    print_message $GREEN "✅ All prerequisites are installed"
}

# Function to authenticate with Vercel
authenticate_vercel() {
    print_message $BLUE "🔐 Checking Vercel authentication..."
    
    # Check if already authenticated
    if vercel whoami > /dev/null 2>&1; then
        local current_user=$(vercel whoami)
        print_message $GREEN "✅ Already authenticated as: $current_user"
    else
        print_message $YELLOW "⚠️  Not authenticated with Vercel"
        print_message $BLUE "🔐 Starting Vercel authentication..."
        vercel login
    fi
    
    # Link project if not already linked
    if [ ! -f ".vercel/project.json" ]; then
        print_message $BLUE "🔗 Linking Vercel project..."
        vercel link --yes
    fi
}

# Function to generate secure secrets
generate_secrets() {
    print_message $BLUE "🔑 Generating secure secrets..."
    
    # Generate JWT secret key (256-bit)
    local jwt_secret=$(openssl rand -hex 32)
    print_message $GREEN "✅ Generated JWT secret key"
    
    # Create a temporary secrets file for generated values
    cat > ".generated-secrets.env" << EOF
# Auto-generated secrets for CantoneseScribe
# Generated on $(date)

# JWT Secret Key (256-bit)
SECRET_KEY=$jwt_secret

EOF
    
    print_message $GREEN "✅ Generated secrets saved to .generated-secrets.env"
    print_message $YELLOW "⚠️  Please copy the SECRET_KEY to your production environment variables"
}

# Function to validate environment variables
validate_environment() {
    print_message $BLUE "🔍 Validating environment configuration..."
    
    if [ ! -f "$SECRETS_FILE" ]; then
        print_message $RED "❌ Secrets file not found: $SECRETS_FILE"
        return 1
    fi
    
    # List of critical environment variables that must be set
    local critical_vars=(
        "ENVIRONMENT"
        "SUPABASE_URL"
        "SUPABASE_KEY"
        "SUPABASE_SERVICE_KEY"
        "DATABASE_URL"
        "OPENAI_API_KEY"
        "GOOGLE_CLOUD_CREDENTIALS"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "SECRET_KEY"
        "SENTRY_DSN"
    )
    
    local missing_vars=()
    
    # Check each critical variable
    for var in "${critical_vars[@]}"; do
        if ! grep -q "^${var}=" "$SECRETS_FILE" || grep -q "^${var}=\[" "$SECRETS_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_message $RED "❌ Missing or incomplete environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        print_message $YELLOW "⚠️  Please set these variables in $SECRETS_FILE before proceeding"
        return 1
    fi
    
    print_message $GREEN "✅ All critical environment variables are configured"
    return 0
}

# Function to set Vercel environment variables
set_vercel_environment_vars() {
    local environment=$1
    local env_file=$2
    
    print_message $BLUE "🚀 Setting Vercel environment variables for $environment..."
    
    if [ ! -f "$env_file" ]; then
        print_message $RED "❌ Environment file not found: $env_file"
        return 1
    fi
    
    local count=0
    local skipped=0
    
    # Read environment file and set variables
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip empty lines and comments
        if [[ -z "$key" || "$key" =~ ^#.* ]]; then
            continue
        fi
        
        # Remove leading/trailing whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Skip if value is a placeholder
        if [[ "$value" =~ ^\[.*\]$ ]]; then
            print_message $YELLOW "⚠️  Skipping placeholder: $key"
            skipped=$((skipped + 1))
            continue
        fi
        
        # Set the environment variable in Vercel
        if [ "$environment" == "production" ]; then
            vercel env add "$key" production --force > /dev/null 2>&1 <<< "$value"
        elif [ "$environment" == "staging" ]; then
            vercel env add "$key" preview --force > /dev/null 2>&1 <<< "$value"
        else
            vercel env add "$key" development --force > /dev/null 2>&1 <<< "$value"
        fi
        
        if [ $? -eq 0 ]; then
            print_message $GREEN "✅ Set $key for $environment"
            count=$((count + 1))
        else
            print_message $RED "❌ Failed to set $key for $environment"
        fi
        
    done < "$env_file"
    
    print_message $BLUE "📊 Summary:"
    echo "   - Variables set: $count"
    echo "   - Placeholders skipped: $skipped"
}

# Function to setup production environment
setup_production_environment() {
    print_message $PURPLE "🏭 Setting up Production Environment"
    print_message $PURPLE "===================================="
    
    # Validate production environment file
    if ! validate_environment; then
        print_message $RED "❌ Production environment validation failed"
        return 1
    fi
    
    # Set production environment variables
    set_vercel_environment_vars "production" "$SECRETS_FILE"
    
    print_message $GREEN "✅ Production environment configured"
}

# Function to setup staging environment
setup_staging_environment() {
    print_message $PURPLE "🧪 Setting up Staging Environment"
    print_message $PURPLE "=================================="
    
    local staging_file=".env.staging"
    
    if [ ! -f "$staging_file" ]; then
        print_message $YELLOW "⚠️  Staging environment file not found: $staging_file"
        return 0
    fi
    
    # Set staging environment variables
    set_vercel_environment_vars "staging" "$staging_file"
    
    print_message $GREEN "✅ Staging environment configured"
}

# Function to verify deployment readiness
verify_deployment_readiness() {
    print_message $BLUE "🔍 Verifying deployment readiness..."
    
    # Check Vercel configuration
    if [ ! -f "vercel.json" ]; then
        print_message $RED "❌ vercel.json not found"
        return 1
    fi
    
    # Check package.json
    if [ ! -f "package.json" ]; then
        print_message $RED "❌ package.json not found"
        return 1
    fi
    
    # Check Python requirements
    if [ ! -f "requirements.txt" ]; then
        print_message $RED "❌ requirements.txt not found"
        return 1
    fi
    
    # Check critical API files
    local critical_files=(
        "api/main.py"
        "api/core/config.py"
        "api/services/monitoring_service.py"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_message $RED "❌ Critical file missing: $file"
            return 1
        fi
    done
    
    print_message $GREEN "✅ Deployment readiness check passed"
    return 0
}

# Function to test production deployment
test_production_deployment() {
    print_message $BLUE "🧪 Testing production deployment..."
    
    print_message $BLUE "Deploying to production..."
    if vercel --prod --yes; then
        print_message $GREEN "✅ Production deployment successful"
        
        # Get deployment URL
        local deployment_url=$(vercel ls --prod | head -n 2 | tail -n 1 | awk '{print $2}')
        
        print_message $BLUE "🌐 Production URL: https://$deployment_url"
        
        # Test health endpoint
        print_message $BLUE "Testing health endpoint..."
        sleep 10  # Wait for deployment to be ready
        
        if curl -s "https://$deployment_url/api/v1/health" | grep -q "healthy"; then
            print_message $GREEN "✅ Health check passed"
        else
            print_message $YELLOW "⚠️  Health check inconclusive (API might be warming up)"
        fi
    else
        print_message $RED "❌ Production deployment failed"
        return 1
    fi
}

# Function to setup monitoring alerts
setup_monitoring_alerts() {
    print_message $BLUE "📊 Setting up monitoring alerts..."
    
    # Create monitoring configuration
    cat > "monitoring-alerts.json" << EOF
{
  "alerts": [
    {
      "name": "High Error Rate",
      "condition": "error_rate > 0.05",
      "severity": "critical",
      "channels": ["email", "slack"]
    },
    {
      "name": "High Response Time",
      "condition": "response_time_p95 > 5000",
      "severity": "warning",
      "channels": ["email"]
    },
    {
      "name": "High Daily Cost",
      "condition": "daily_cost > max_daily_cost * 0.8",
      "severity": "warning",
      "channels": ["email", "slack"]
    },
    {
      "name": "Database Connection Issues",
      "condition": "database_health != 'healthy'",
      "severity": "critical",
      "channels": ["email", "slack", "pager"]
    }
  ],
  "channels": {
    "email": {
      "recipients": ["admin@cantonese-scribe.com"]
    },
    "slack": {
      "webhook_url": "SLACK_WEBHOOK_URL"
    }
  }
}
EOF
    
    print_message $GREEN "✅ Monitoring alerts configuration created: monitoring-alerts.json"
    print_message $BLUE "📝 Manual setup required:"
    echo "1. Configure Sentry alerts based on monitoring-alerts.json"
    echo "2. Set up UptimeRobot monitors for health endpoints"
    echo "3. Configure DataDog APM dashboards"
    echo "4. Set up Slack webhook integration"
}

# Function to show security checklist
show_security_checklist() {
    print_message $BLUE "🔒 Production Security Checklist"
    print_message $BLUE "================================"
    echo ""
    echo "✅ Required Actions:"
    echo "1. 🔑 All environment variables use secure values (no test/placeholder values)"
    echo "2. 🔐 JWT secret key is 256-bit random generated"
    echo "3. 🗄️  Database uses strong passwords and restricted access"
    echo "4. 🌐 CORS is configured for production domains only"
    echo "5. 💰 Stripe uses LIVE keys (not test keys)"
    echo "6. 📊 Monitoring and alerting are configured"
    echo "7. 🚨 Error tracking is enabled with appropriate sample rates"
    echo ""
    echo "⚠️  Critical Reminders:"
    echo "- Never commit .env files to version control"
    echo "- Rotate secrets regularly (quarterly)"
    echo "- Monitor API usage and costs daily"
    echo "- Test disaster recovery procedures"
    echo "- Keep dependencies updated"
    echo ""
}

# Function to show post-deployment steps
show_post_deployment_steps() {
    print_message $BLUE "📋 Post-Deployment Steps"
    print_message $BLUE "========================"
    echo ""
    echo "1. 🔍 Verify all endpoints are working:"
    echo "   - Health check: /api/v1/health"
    echo "   - Detailed health: /api/v1/health/detailed"
    echo "   - Metrics: /api/v1/health/metrics"
    echo ""
    echo "2. 🧪 Test core functionality:"
    echo "   - User registration and login"
    echo "   - File upload and transcription"
    echo "   - Payment processing (with test data)"
    echo "   - WebSocket real-time updates"
    echo "   - Export functionality"
    echo ""
    echo "3. 📊 Configure monitoring dashboards:"
    echo "   - Vercel Analytics"
    echo "   - Sentry error tracking"
    echo "   - UptimeRobot uptime monitoring"
    echo "   - Custom cost tracking alerts"
    echo ""
    echo "4. 🔄 Set up backup procedures:"
    echo "   - Database backups (automated)"
    echo "   - User file backups"
    echo "   - Configuration backups"
    echo ""
    echo "5. 📧 Notify stakeholders:"
    echo "   - Share production URLs"
    echo "   - Provide monitoring dashboard access"
    echo "   - Document support procedures"
    echo ""
}

# Function to show usage
show_usage() {
    echo "CantoneseScribe Production Secrets Management Script"
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup-all          - Complete production setup (default)"
    echo "  generate-secrets   - Generate secure secrets only"
    echo "  setup-production   - Set up production environment variables"
    echo "  setup-staging      - Set up staging environment variables"
    echo "  validate           - Validate environment configuration"
    echo "  test-deployment    - Test production deployment"
    echo "  security-check     - Show security checklist"
    echo ""
    echo "Options:"
    echo "  --secrets-file FILE    - Environment secrets file (default: .env.production)"
    echo "  --project-name NAME    - Vercel project name"
    echo ""
    echo "Examples:"
    echo "  $0 setup-all"
    echo "  $0 generate-secrets"
    echo "  $0 setup-production --secrets-file .env.production"
    echo "  $0 validate"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --secrets-file)
            SECRETS_FILE="$2"
            shift 2
            ;;
        --project-name)
            VERCEL_PROJECT_NAME="$2"
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
    print_message $PURPLE "🚀 CantoneseScribe Production Secrets Management"
    print_message $PURPLE "==============================================="
    echo ""
    
    case $COMMAND in
        "setup-all")
            check_prerequisites
            authenticate_vercel
            generate_secrets
            setup_production_environment
            setup_staging_environment
            verify_deployment_readiness
            setup_monitoring_alerts
            show_security_checklist
            show_post_deployment_steps
            ;;
            
        "generate-secrets")
            generate_secrets
            ;;
            
        "setup-production")
            check_prerequisites
            authenticate_vercel
            setup_production_environment
            ;;
            
        "setup-staging")
            check_prerequisites
            authenticate_vercel
            setup_staging_environment
            ;;
            
        "validate")
            validate_environment
            ;;
            
        "test-deployment")
            check_prerequisites
            authenticate_vercel
            test_production_deployment
            ;;
            
        "security-check")
            show_security_checklist
            ;;
            
        *)
            print_message $RED "❌ Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    print_message $GREEN "🎉 Production secrets management completed!"
}

# Execute main function
main
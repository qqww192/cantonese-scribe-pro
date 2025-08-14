#!/bin/bash

# CantoneseScribe Environment Setup Script
# This script helps set up environment variables for different deployment environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment options
ENVIRONMENTS=("development" "staging" "production")

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to validate required tools
check_prerequisites() {
    print_message $BLUE "🔧 Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for Vercel CLI
    if ! command -v vercel &> /dev/null; then
        missing_tools+=("vercel")
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    # Check for Python
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        missing_tools+=("python")
    fi
    
    # Check for pip
    if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
        missing_tools+=("pip")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_message $RED "❌ Missing required tools: ${missing_tools[*]}"
        print_message $YELLOW "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_message $GREEN "✅ All prerequisites are installed"
}

# Function to prompt for environment selection
select_environment() {
    print_message $BLUE "🌍 Select deployment environment:"
    select env in "${ENVIRONMENTS[@]}"; do
        if [[ -n $env ]]; then
            SELECTED_ENV=$env
            print_message $GREEN "Selected environment: $SELECTED_ENV"
            break
        else
            print_message $RED "Invalid selection. Please try again."
        fi
    done
}

# Function to verify Vercel project setup
verify_vercel_project() {
    print_message $BLUE "🔗 Verifying Vercel project setup..."
    
    if [ ! -f ".vercel/project.json" ]; then
        print_message $YELLOW "⚠️  Vercel project not linked. Running 'vercel link'..."
        vercel link
    else
        print_message $GREEN "✅ Vercel project is already linked"
    fi
}

# Function to set environment variables in Vercel
set_vercel_env_vars() {
    local env_file=".env.$SELECTED_ENV"
    
    if [ ! -f "$env_file" ]; then
        print_message $RED "❌ Environment file $env_file not found"
        print_message $YELLOW "Please create $env_file with required variables"
        return 1
    fi
    
    print_message $BLUE "📝 Setting environment variables for $SELECTED_ENV..."
    
    # Determine Vercel environment flag
    local vercel_env_flag=""
    case $SELECTED_ENV in
        "production")
            vercel_env_flag="--environment production"
            ;;
        "staging")
            vercel_env_flag="--environment preview"
            ;;
        "development")
            vercel_env_flag="--environment development"
            ;;
    esac
    
    # Read environment file and set variables
    local var_count=0
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
            continue
        fi
        
        # Skip section headers
        if [[ $key =~ ^[[:space:]]*\[.*\][[:space:]]*$ ]]; then
            continue
        fi
        
        # Clean up key and value
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Skip if value is a placeholder
        if [[ $value =~ ^\[.*\]$ ]]; then
            print_message $YELLOW "⚠️  Skipping placeholder variable: $key"
            continue
        fi
        
        # Set the environment variable
        if [[ -n $key && -n $value ]]; then
            echo "Setting $key..."
            echo "$value" | vercel env add "$key" $vercel_env_flag > /dev/null 2>&1 || {
                echo "Updating $key..."
                echo "$value" | vercel env rm "$key" $vercel_env_flag --yes > /dev/null 2>&1 || true
                echo "$value" | vercel env add "$key" $vercel_env_flag > /dev/null 2>&1
            }
            ((var_count++))
        fi
    done < "$env_file"
    
    print_message $GREEN "✅ Set $var_count environment variables for $SELECTED_ENV"
}

# Function to verify environment setup
verify_env_setup() {
    print_message $BLUE "🔍 Verifying environment setup..."
    
    # List environment variables
    local env_flag=""
    case $SELECTED_ENV in
        "production")
            env_flag="--environment production"
            ;;
        "staging")  
            env_flag="--environment preview"
            ;;
        "development")
            env_flag="--environment development"
            ;;
    esac
    
    local env_count=$(vercel env ls $env_flag | grep -c "^[A-Z]" || true)
    print_message $GREEN "✅ Found $env_count environment variables in $SELECTED_ENV"
}

# Function to create local development environment
setup_local_env() {
    if [ "$SELECTED_ENV" == "development" ]; then
        print_message $BLUE "🏠 Setting up local development environment..."
        
        # Copy example environment file if local doesn't exist
        if [ ! -f ".env.local" ]; then
            if [ -f ".env.example" ]; then
                cp ".env.example" ".env.local"
                print_message $GREEN "✅ Created .env.local from example"
                print_message $YELLOW "⚠️  Please update .env.local with your actual values"
            else
                print_message $YELLOW "⚠️  .env.example not found. Please create .env.local manually"
            fi
        else
            print_message $GREEN "✅ .env.local already exists"
        fi
        
        # Install dependencies
        print_message $BLUE "📦 Installing dependencies..."
        npm install
        
        # Check if Python virtual environment exists
        if [ ! -d "venv" ]; then
            print_message $BLUE "🐍 Creating Python virtual environment..."
            python3 -m venv venv || python -m venv venv
        fi
        
        # Install Python dependencies
        print_message $BLUE "🐍 Installing Python dependencies..."
        source venv/bin/activate
        pip install -r requirements.txt
        
        print_message $GREEN "✅ Local development environment setup complete"
    fi
}

# Function to run deployment
deploy_application() {
    print_message $BLUE "🚀 Ready to deploy to $SELECTED_ENV?"
    read -p "Continue with deployment? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        print_message $BLUE "🚀 Deploying to $SELECTED_ENV..."
        
        case $SELECTED_ENV in
            "production")
                vercel --prod
                ;;
            "staging")
                vercel
                ;;
            "development")
                print_message $YELLOW "Development environment uses local server"
                print_message $BLUE "Run 'npm run dev' to start development server"
                return
                ;;
        esac
        
        print_message $GREEN "✅ Deployment to $SELECTED_ENV completed!"
        
        # Show deployment URL
        local deployment_url=$(vercel --prod 2>&1 | grep -o 'https://[^[:space:]]*' | tail -1)
        if [ -n "$deployment_url" ]; then
            print_message $GREEN "🌐 Deployment URL: $deployment_url"
        fi
    else
        print_message $YELLOW "Deployment cancelled"
    fi
}

# Function to run health checks
run_health_checks() {
    if [ "$SELECTED_ENV" != "development" ]; then
        print_message $BLUE "🏥 Running health checks..."
        
        # Get the deployment URL
        local deployment_url
        if [ "$SELECTED_ENV" == "production" ]; then
            deployment_url=$(vercel ls --prod | grep -o 'https://[^[:space:]]*' | head -1)
        else
            deployment_url=$(vercel ls | grep -o 'https://[^[:space:]]*' | head -1)
        fi
        
        if [ -n "$deployment_url" ]; then
            print_message $BLUE "Testing health endpoint: $deployment_url/health"
            
            if curl -f -s "$deployment_url/health" > /dev/null; then
                print_message $GREEN "✅ Health check passed"
            else
                print_message $RED "❌ Health check failed"
                print_message $YELLOW "Check deployment logs with: vercel logs"
            fi
        else
            print_message $YELLOW "⚠️  Could not determine deployment URL for health check"
        fi
    fi
}

# Function to show next steps
show_next_steps() {
    print_message $BLUE "📋 Next Steps:"
    
    case $SELECTED_ENV in
        "production")
            echo "1. Update DNS records to point to Vercel deployment"
            echo "2. Configure Stripe webhooks with production URL" 
            echo "3. Set up monitoring alerts"
            echo "4. Run end-to-end tests"
            echo "5. Monitor error logs and performance metrics"
            ;;
        "staging")
            echo "1. Run integration tests against staging environment"
            echo "2. Test payment flows with Stripe test data"
            echo "3. Verify all features work as expected"
            echo "4. Get stakeholder approval before production deploy"
            ;;
        "development")
            echo "1. Run 'npm run dev' to start development server"
            echo "2. Activate Python virtual environment: source venv/bin/activate"
            echo "3. Update .env.local with your API keys"
            echo "4. Test local functionality before deploying"
            ;;
    esac
    
    print_message $GREEN "🎉 Environment setup complete!"
}

# Main execution flow
main() {
    print_message $BLUE "🚀 CantoneseScribe Environment Setup"
    print_message $BLUE "===================================="
    
    # Check prerequisites
    check_prerequisites
    
    # Select environment
    select_environment
    
    # Verify Vercel project
    verify_vercel_project
    
    # Set up environment variables
    set_vercel_env_vars
    
    # Verify setup
    verify_env_setup
    
    # Setup local environment if development
    setup_local_env
    
    # Optional deployment
    if [ "$SELECTED_ENV" != "development" ]; then
        deploy_application
        run_health_checks
    fi
    
    # Show next steps
    show_next_steps
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "CantoneseScribe Environment Setup Script"
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environments:"
    echo "  development - Set up local development environment"
    echo "  staging     - Deploy to staging environment"  
    echo "  production  - Deploy to production environment"
    echo ""
    echo "Without arguments, the script will prompt for environment selection."
    exit 0
fi

# If environment provided as argument
if [ $# -eq 1 ]; then
    if [[ " ${ENVIRONMENTS[@]} " =~ " $1 " ]]; then
        SELECTED_ENV=$1
        print_message $GREEN "Using environment: $SELECTED_ENV"
    else
        print_message $RED "Invalid environment: $1"
        print_message $YELLOW "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
fi

# Run main function
main
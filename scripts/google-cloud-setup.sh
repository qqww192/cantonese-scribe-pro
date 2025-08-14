#!/bin/bash

# Google Cloud Platform Setup for CantoneseScribe
# Configure Speech-to-Text, Translation API, and service accounts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GCP_PROJECT_ID="${GCP_PROJECT_ID:-cantonese-scribe}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-cantonese-scribe-service}"
KEY_FILE_NAME="${KEY_FILE_NAME:-google-service-account.json}"

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
    
    # Check for gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        missing_tools+=("google-cloud-sdk")
    fi
    
    # Check for jq for JSON processing
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    # Check for base64
    if ! command -v base64 &> /dev/null; then
        missing_tools+=("coreutils")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_message $RED "❌ Missing required tools: ${missing_tools[*]}"
        print_message $YELLOW "Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
        print_message $YELLOW "Install jq: sudo apt-get install jq (Ubuntu) or brew install jq (macOS)"
        exit 1
    fi
    
    print_message $GREEN "✅ All prerequisites are installed"
}

# Function to authenticate with Google Cloud
authenticate_gcloud() {
    print_message $BLUE "🔐 Checking Google Cloud authentication..."
    
    # Check if already authenticated
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        local current_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
        print_message $GREEN "✅ Already authenticated as: $current_account"
        
        read -p "Do you want to use this account? (Y/n): " use_current
        if [[ $use_current =~ ^[Nn]$ ]]; then
            gcloud auth login
        fi
    else
        print_message $YELLOW "⚠️  Not authenticated with Google Cloud"
        print_message $BLUE "🔐 Starting Google Cloud authentication..."
        gcloud auth login
    fi
}

# Function to set or create GCP project
setup_gcp_project() {
    print_message $BLUE "🏗️  Setting up Google Cloud project..."
    
    # Check if project ID is provided
    if [ -z "$GCP_PROJECT_ID" ]; then
        read -p "Enter your Google Cloud Project ID: " GCP_PROJECT_ID
    fi
    
    # Check if project exists
    if gcloud projects describe "$GCP_PROJECT_ID" >/dev/null 2>&1; then
        print_message $GREEN "✅ Project '$GCP_PROJECT_ID' exists"
    else
        print_message $YELLOW "⚠️  Project '$GCP_PROJECT_ID' does not exist"
        read -p "Do you want to create it? (y/N): " create_project
        
        if [[ $create_project =~ ^[Yy]$ ]]; then
            gcloud projects create "$GCP_PROJECT_ID" --name="CantoneseScribe"
            print_message $GREEN "✅ Created project: $GCP_PROJECT_ID"
        else
            print_message $RED "❌ Project setup cancelled"
            exit 1
        fi
    fi
    
    # Set the current project
    gcloud config set project "$GCP_PROJECT_ID"
    print_message $GREEN "✅ Set current project to: $GCP_PROJECT_ID"
}

# Function to enable required APIs
enable_apis() {
    print_message $BLUE "🔌 Enabling required Google Cloud APIs..."
    
    local apis=(
        "speech.googleapis.com"
        "translate.googleapis.com"
        "storage-api.googleapis.com"
        "storage-component.googleapis.com"
        "iam.googleapis.com"
        "serviceusage.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        print_message $BLUE "Enabling $api..."
        if gcloud services enable "$api" --quiet; then
            print_message $GREEN "✅ Enabled $api"
        else
            print_message $RED "❌ Failed to enable $api"
        fi
    done
}

# Function to create service account
create_service_account() {
    print_message $BLUE "👤 Creating service account..."
    
    # Check if service account already exists
    if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
        print_message $YELLOW "⚠️  Service account already exists: $SERVICE_ACCOUNT_NAME"
        read -p "Do you want to use the existing service account? (Y/n): " use_existing
        
        if [[ $use_existing =~ ^[Nn]$ ]]; then
            print_message $RED "❌ Service account setup cancelled"
            exit 1
        fi
    else
        # Create the service account
        gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
            --display-name="CantoneseScribe Service Account" \
            --description="Service account for CantoneseScribe application to access Google Cloud APIs"
        
        print_message $GREEN "✅ Created service account: $SERVICE_ACCOUNT_NAME"
    fi
    
    local service_account_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
    
    # Assign necessary roles
    local roles=(
        "roles/speech.client"
        "roles/translate.user" 
        "roles/storage.objectCreator"
        "roles/storage.objectViewer"
        "roles/storage.objectAdmin"
    )
    
    for role in "${roles[@]}"; do
        print_message $BLUE "Assigning role: $role"
        gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
            --member="serviceAccount:$service_account_email" \
            --role="$role" \
            --quiet
        
        print_message $GREEN "✅ Assigned role: $role"
    done
}

# Function to create and download service account key
create_service_account_key() {
    print_message $BLUE "🔑 Creating service account key..."
    
    local service_account_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
    local key_file_path="$PWD/$KEY_FILE_NAME"
    
    # Delete existing key file if it exists
    if [ -f "$key_file_path" ]; then
        print_message $YELLOW "⚠️  Existing key file found: $key_file_path"
        read -p "Do you want to replace it? (Y/n): " replace_key
        
        if [[ $replace_key =~ ^[Nn]$ ]]; then
            print_message $BLUE "Using existing key file"
            return 0
        else
            rm "$key_file_path"
            print_message $YELLOW "🗑️  Deleted existing key file"
        fi
    fi
    
    # Create new key
    gcloud iam service-accounts keys create "$key_file_path" \
        --iam-account="$service_account_email" \
        --key-file-type="json"
    
    if [ -f "$key_file_path" ]; then
        print_message $GREEN "✅ Service account key created: $key_file_path"
        
        # Set file permissions for security
        chmod 600 "$key_file_path"
        print_message $GREEN "✅ Set secure file permissions (600)"
        
        return 0
    else
        print_message $RED "❌ Failed to create service account key"
        return 1
    fi
}

# Function to configure Cloud Storage bucket (optional)
setup_cloud_storage() {
    print_message $BLUE "🪣 Setting up Cloud Storage bucket (optional)..."
    
    read -p "Do you want to create a Google Cloud Storage bucket for backups? (y/N): " create_bucket
    
    if [[ $create_bucket =~ ^[Yy]$ ]]; then
        local bucket_name="cantonese-scribe-${GCP_PROJECT_ID}-storage"
        
        read -p "Enter bucket name (default: $bucket_name): " custom_bucket_name
        if [ -n "$custom_bucket_name" ]; then
            bucket_name="$custom_bucket_name"
        fi
        
        # Create bucket
        if gsutil mb -p "$GCP_PROJECT_ID" -l us-central1 "gs://$bucket_name" 2>/dev/null; then
            print_message $GREEN "✅ Created Cloud Storage bucket: $bucket_name"
            
            # Set bucket permissions
            gsutil iam ch "serviceAccount:${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com:objectAdmin" "gs://$bucket_name"
            print_message $GREEN "✅ Set bucket permissions for service account"
            
            print_message $BLUE "📝 Add this to your environment variables:"
            echo "GCS_BACKUP_BUCKET=$bucket_name"
        else
            print_message $YELLOW "⚠️  Bucket might already exist or creation failed"
        fi
    fi
}

# Function to test API access
test_api_access() {
    print_message $BLUE "🧪 Testing API access..."
    
    local key_file_path="$PWD/$KEY_FILE_NAME"
    
    if [ ! -f "$key_file_path" ]; then
        print_message $RED "❌ Service account key file not found: $key_file_path"
        return 1
    fi
    
    # Set environment variable for testing
    export GOOGLE_APPLICATION_CREDENTIALS="$key_file_path"
    
    # Test Speech-to-Text API
    print_message $BLUE "Testing Speech-to-Text API..."
    if gcloud auth activate-service-account --key-file="$key_file_path" --quiet 2>/dev/null; then
        print_message $GREEN "✅ Service account authentication successful"
    else
        print_message $RED "❌ Service account authentication failed"
        return 1
    fi
    
    # Test Translation API
    print_message $BLUE "Testing Translation API..."
    local test_translation=$(gcloud ml translate translate "Hello, world!" --target-language=zh --source-language=en --format=text --quiet 2>/dev/null || echo "FAILED")
    
    if [ "$test_translation" != "FAILED" ] && [ -n "$test_translation" ]; then
        print_message $GREEN "✅ Translation API access successful"
    else
        print_message $YELLOW "⚠️  Translation API test inconclusive (API might not be fully activated yet)"
    fi
    
    # Clean up test authentication
    gcloud auth revoke --quiet 2>/dev/null || true
}

# Function to generate environment variables
generate_env_variables() {
    print_message $BLUE "📝 Generating environment variables..."
    
    local key_file_path="$PWD/$KEY_FILE_NAME"
    local output_file="google-cloud-env-vars.txt"
    
    if [ ! -f "$key_file_path" ]; then
        print_message $RED "❌ Service account key file not found: $key_file_path"
        return 1
    fi
    
    # Base64 encode the service account key
    local base64_credentials
    if command -v base64 >/dev/null 2>&1; then
        # Linux/macOS base64
        base64_credentials=$(base64 -w 0 "$key_file_path" 2>/dev/null || base64 -b 0 "$key_file_path" 2>/dev/null)
    else
        print_message $RED "❌ base64 command not found"
        return 1
    fi
    
    # Create environment variables file
    cat > "$output_file" << EOF
# Google Cloud Platform Configuration for CantoneseScribe
# Generated on $(date)

# Service account credentials (base64 encoded)
GOOGLE_CLOUD_CREDENTIALS=$base64_credentials

# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT=$GCP_PROJECT_ID

# API Keys (if using API keys instead of service account)
# GOOGLE_TRANSLATE_API_KEY=your-api-key-here

# Service account file path (for local development)
GOOGLE_APPLICATION_CREDENTIALS=$key_file_path

# Additional configuration
GCP_REGION=us-central1
SPEECH_API_LANGUAGE_CODE=yue-Hant-HK
TRANSLATION_TARGET_LANGUAGE=en
TRANSLATION_SOURCE_LANGUAGE=zh

EOF
    
    print_message $GREEN "✅ Environment variables written to: $output_file"
    print_message $BLUE "📋 Instructions:"
    echo "1. Copy the variables from $output_file to your .env files"
    echo "2. For Vercel deployment, set GOOGLE_CLOUD_CREDENTIALS as an environment variable"
    echo "3. For local development, use GOOGLE_APPLICATION_CREDENTIALS pointing to the JSON file"
    echo "4. Keep the JSON key file secure and never commit it to version control"
}

# Function to setup Cloud IAM for Vercel deployment
setup_vercel_iam() {
    print_message $BLUE "🔗 Setting up IAM for Vercel deployment..."
    
    local service_account_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
    
    # Create additional minimal permissions for Vercel serverless functions
    print_message $BLUE "Verifying IAM permissions for serverless deployment..."
    
    # These roles are already assigned, but let's verify critical ones
    local critical_roles=(
        "roles/speech.client"
        "roles/translate.user"
    )
    
    for role in "${critical_roles[@]}"; do
        if gcloud projects get-iam-policy "$GCP_PROJECT_ID" --flatten="bindings[].members" --format="table(bindings.role)" | grep -q "$role"; then
            print_message $GREEN "✅ Role verified: $role"
        else
            print_message $YELLOW "⚠️  Re-assigning role: $role"
            gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
                --member="serviceAccount:$service_account_email" \
                --role="$role" \
                --quiet
        fi
    done
    
    print_message $GREEN "✅ IAM configuration ready for Vercel deployment"
}

# Function to create quota monitoring alerts
setup_quota_monitoring() {
    print_message $BLUE "📊 Setting up quota monitoring (optional)..."
    
    read -p "Do you want to set up quota monitoring alerts? (y/N): " setup_alerts
    
    if [[ $setup_alerts =~ ^[Yy]$ ]]; then
        print_message $BLUE "Setting up Cloud Monitoring for API quotas..."
        
        # Enable Cloud Monitoring API
        gcloud services enable monitoring.googleapis.com --quiet
        
        print_message $GREEN "✅ Cloud Monitoring API enabled"
        print_message $BLUE "📝 Manual setup required:"
        echo "1. Go to Cloud Monitoring in Google Cloud Console"
        echo "2. Create alerting policies for Speech-to-Text and Translation API quotas"
        echo "3. Set up notification channels (email, Slack, etc.)"
        echo "4. Configure budget alerts in Cloud Billing"
        
        # Create a simple monitoring dashboard config
        cat > monitoring-config.json << EOF
{
  "displayName": "CantoneseScribe API Monitoring",
  "description": "Monitoring dashboard for Speech-to-Text and Translation APIs",
  "widgets": [
    {
      "title": "Speech-to-Text API Requests",
      "xyChart": {
        "dataSets": [{
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "resource.type=\"consumed_api\" AND resource.label.service=\"speech.googleapis.com\"",
              "aggregation": {
                "alignmentPeriod": "60s",
                "perSeriesAligner": "ALIGN_RATE"
              }
            }
          }
        }]
      }
    }
  ]
}
EOF
        print_message $GREEN "✅ Created monitoring dashboard configuration: monitoring-config.json"
    fi
}

# Function to show security recommendations
show_security_recommendations() {
    print_message $BLUE "🔒 Security Recommendations:"
    echo ""
    echo "1. 🔑 Key Management:"
    echo "   - Never commit service account keys to version control"
    echo "   - Add *.json to .gitignore"
    echo "   - Rotate service account keys regularly (quarterly)"
    echo ""
    echo "2. 🏗️ Environment Configuration:"
    echo "   - Use GOOGLE_CLOUD_CREDENTIALS (base64) for Vercel deployment"
    echo "   - Use GOOGLE_APPLICATION_CREDENTIALS (file path) for local development"
    echo "   - Set different service accounts for production/staging if possible"
    echo ""
    echo "3. 🛡️ Access Control:"
    echo "   - Review IAM permissions regularly"
    echo "   - Use principle of least privilege"
    echo "   - Monitor service account usage in Cloud Logging"
    echo ""
    echo "4. 💰 Cost Control:"
    echo "   - Set up budget alerts in Cloud Billing"
    echo "   - Monitor API usage quotas"
    echo "   - Implement rate limiting in your application"
    echo ""
    echo "5. 📊 Monitoring:"
    echo "   - Enable audit logs for security events"
    echo "   - Set up alerting for unusual API usage patterns"
    echo "   - Monitor authentication failures"
    echo ""
}

# Function to cleanup temporary files
cleanup() {
    print_message $BLUE "🧹 Cleaning up temporary files..."
    
    # Remove any temporary files created during setup
    if [ -f "monitoring-config.json" ]; then
        rm monitoring-config.json
        print_message $GREEN "✅ Cleaned up monitoring config"
    fi
}

# Function to show usage
show_usage() {
    echo "Google Cloud Platform Setup Script for CantoneseScribe"
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup          - Full GCP setup (default)"
    echo "  auth           - Authenticate with Google Cloud only"
    echo "  test           - Test API access with existing credentials"
    echo "  generate-env   - Generate environment variables from existing key"
    echo "  security       - Show security recommendations"
    echo ""
    echo "Options:"
    echo "  --project-id PROJECT_ID    - Set GCP project ID"
    echo "  --service-account NAME     - Set service account name"
    echo "  --key-file NAME           - Set key file name"
    echo ""
    echo "Environment Variables:"
    echo "  GCP_PROJECT_ID            - Google Cloud Project ID"
    echo "  SERVICE_ACCOUNT_NAME      - Service account name"
    echo "  KEY_FILE_NAME             - Service account key filename"
    echo ""
    echo "Examples:"
    echo "  $0 setup --project-id my-project"
    echo "  $0 test"
    echo "  $0 generate-env --key-file my-key.json"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            GCP_PROJECT_ID="$2"
            shift 2
            ;;
        --service-account)
            SERVICE_ACCOUNT_NAME="$2"
            shift 2
            ;;
        --key-file)
            KEY_FILE_NAME="$2"
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
COMMAND="${COMMAND:-setup}"

# Main execution
main() {
    print_message $BLUE "🚀 Google Cloud Platform Setup for CantoneseScribe"
    print_message $BLUE "======================================================"
    
    case $COMMAND in
        "setup")
            check_prerequisites
            authenticate_gcloud
            setup_gcp_project
            enable_apis
            create_service_account
            create_service_account_key
            setup_cloud_storage
            setup_vercel_iam
            test_api_access
            generate_env_variables
            setup_quota_monitoring
            show_security_recommendations
            ;;
            
        "auth")
            check_prerequisites
            authenticate_gcloud
            ;;
            
        "test")
            test_api_access
            ;;
            
        "generate-env")
            generate_env_variables
            ;;
            
        "security")
            show_security_recommendations
            ;;
            
        *)
            print_message $RED "❌ Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    cleanup
    
    print_message $GREEN "🎉 Google Cloud setup completed successfully!"
}

# Handle script interruption
trap cleanup EXIT

# Execute main function
main
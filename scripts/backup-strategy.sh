#!/bin/bash

# CantoneseScribe Database Backup and Recovery Strategy
# Automated backup system for Supabase PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

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
    
    # Check for pg_dump
    if ! command -v pg_dump &> /dev/null; then
        missing_tools+=("postgresql-client")
    fi
    
    # Check for psql
    if ! command -v psql &> /dev/null; then
        missing_tools+=("postgresql-client")
    fi
    
    # Check for curl
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    # Check for aws cli (for S3 backups)
    if ! command -v aws &> /dev/null; then
        print_message $YELLOW "⚠️  AWS CLI not found. S3 backup will be skipped."
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_message $RED "❌ Missing required tools: ${missing_tools[*]}"
        print_message $YELLOW "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_message $GREEN "✅ All prerequisites are installed"
}

# Function to load environment variables
load_environment() {
    local env_file="$1"
    
    if [ ! -f "$env_file" ]; then
        print_message $RED "❌ Environment file not found: $env_file"
        exit 1
    fi
    
    print_message $BLUE "📝 Loading environment from: $env_file"
    
    # Source environment variables
    set -a
    source "$env_file"
    set +a
    
    # Validate required variables
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
        print_message $RED "❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY"
        exit 1
    fi
    
    # Extract database connection details from DATABASE_URL if provided
    if [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL: postgresql://user:password@host:port/database
        DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)"
        if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASSWORD="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"
        else
            print_message $RED "❌ Invalid DATABASE_URL format"
            exit 1
        fi
    else
        print_message $RED "❌ DATABASE_URL not found in environment"
        exit 1
    fi
    
    print_message $GREEN "✅ Environment loaded successfully"
}

# Function to create backup directory
ensure_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_message $GREEN "✅ Created backup directory: $BACKUP_DIR"
    fi
}

# Function to create database backup
create_database_backup() {
    local backup_type="$1"
    local backup_filename="cantonese-scribe-${backup_type}-${DATE}.sql"
    local backup_path="$BACKUP_DIR/$backup_filename"
    
    print_message $BLUE "💾 Creating $backup_type database backup..."
    
    # Set PGPASSWORD for authentication
    export PGPASSWORD="$DB_PASSWORD"
    
    case $backup_type in
        "full")
            # Full database backup including schema and data
            pg_dump \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                --verbose \
                --clean \
                --if-exists \
                --create \
                --format=plain \
                --no-password \
                > "$backup_path"
            ;;
        "schema")
            # Schema-only backup
            pg_dump \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                --verbose \
                --schema-only \
                --clean \
                --if-exists \
                --create \
                --format=plain \
                --no-password \
                > "$backup_path"
            ;;
        "data")
            # Data-only backup
            pg_dump \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                --verbose \
                --data-only \
                --disable-triggers \
                --format=plain \
                --no-password \
                > "$backup_path"
            ;;
        *)
            print_message $RED "❌ Invalid backup type: $backup_type"
            return 1
            ;;
    esac
    
    # Unset PGPASSWORD
    unset PGPASSWORD
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ $backup_type backup created: $backup_path"
        
        # Compress backup
        gzip "$backup_path"
        print_message $GREEN "✅ Backup compressed: ${backup_path}.gz"
        
        return 0
    else
        print_message $RED "❌ Failed to create $backup_type backup"
        return 1
    fi
}

# Function to create application data backup (user-specific tables)
create_app_backup() {
    local backup_filename="cantonese-scribe-app-data-${DATE}.sql"
    local backup_path="$BACKUP_DIR/$backup_filename"
    
    print_message $BLUE "📱 Creating application data backup..."
    
    # Set PGPASSWORD for authentication
    export PGPASSWORD="$DB_PASSWORD"
    
    # Backup specific tables with user data
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --data-only \
        --disable-triggers \
        --format=plain \
        --no-password \
        --table=users \
        --table=subscriptions \
        --table=transcriptions \
        --table=usage_tracking \
        --table=payments \
        > "$backup_path"
    
    # Unset PGPASSWORD
    unset PGPASSWORD
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Application data backup created: $backup_path"
        
        # Compress backup
        gzip "$backup_path"
        print_message $GREEN "✅ Application backup compressed: ${backup_path}.gz"
        
        return 0
    else
        print_message $RED "❌ Failed to create application data backup"
        return 1
    fi
}

# Function to upload backup to S3 (if configured)
upload_to_s3() {
    local backup_file="$1"
    
    if ! command -v aws &> /dev/null; then
        print_message $YELLOW "⚠️  AWS CLI not available. Skipping S3 upload."
        return 0
    fi
    
    if [ -z "$S3_BACKUP_BUCKET" ]; then
        print_message $YELLOW "⚠️  S3_BACKUP_BUCKET not configured. Skipping S3 upload."
        return 0
    fi
    
    print_message $BLUE "☁️  Uploading backup to S3..."
    
    local filename=$(basename "$backup_file")
    local s3_path="s3://$S3_BACKUP_BUCKET/cantonese-scribe/$(date +%Y)/$(date +%m)/$filename"
    
    aws s3 cp "$backup_file" "$s3_path" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Backup uploaded to S3: $s3_path"
    else
        print_message $RED "❌ Failed to upload backup to S3"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    local retention_days="${BACKUP_RETENTION_DAYS:-30}"
    
    print_message $BLUE "🧹 Cleaning up backups older than $retention_days days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' backup_file; do
        rm "$backup_file"
        ((deleted_count++))
        print_message $YELLOW "🗑️  Deleted old backup: $(basename "$backup_file")"
    done < <(find "$BACKUP_DIR" -name "cantonese-scribe-*.sql.gz" -mtime +$retention_days -print0)
    
    if [ $deleted_count -gt 0 ]; then
        print_message $GREEN "✅ Cleaned up $deleted_count old backup files"
    else
        print_message $GREEN "✅ No old backup files to clean up"
    fi
}

# Function to verify backup integrity
verify_backup_integrity() {
    local backup_file="$1"
    
    print_message $BLUE "🔍 Verifying backup integrity..."
    
    # Test that the compressed file is valid
    if gzip -t "$backup_file" 2>/dev/null; then
        print_message $GREEN "✅ Backup file compression is valid"
    else
        print_message $RED "❌ Backup file compression is corrupted"
        return 1
    fi
    
    # Test that SQL content is readable
    if zcat "$backup_file" | head -n 10 | grep -q "PostgreSQL database dump" 2>/dev/null; then
        print_message $GREEN "✅ Backup file contains valid SQL dump"
    else
        print_message $RED "❌ Backup file does not contain valid SQL dump"
        return 1
    fi
    
    return 0
}

# Function to restore from backup
restore_from_backup() {
    local backup_file="$1"
    local confirm_restore="$2"
    
    if [ ! -f "$backup_file" ]; then
        print_message $RED "❌ Backup file not found: $backup_file"
        return 1
    fi
    
    if [ "$confirm_restore" != "CONFIRM_RESTORE" ]; then
        print_message $RED "❌ Restore operation requires explicit confirmation"
        print_message $YELLOW "Use: $0 restore <backup_file> CONFIRM_RESTORE"
        return 1
    fi
    
    print_message $YELLOW "⚠️  WARNING: This will overwrite the current database!"
    print_message $YELLOW "⚠️  Make sure you have a recent backup before proceeding!"
    
    read -p "Are you absolutely sure you want to continue? (type 'YES' to confirm): " final_confirm
    
    if [ "$final_confirm" != "YES" ]; then
        print_message $YELLOW "Restore operation cancelled"
        return 1
    fi
    
    print_message $BLUE "🔄 Restoring from backup: $backup_file"
    
    # Set PGPASSWORD for authentication
    export PGPASSWORD="$DB_PASSWORD"
    
    # Restore database
    if [[ $backup_file == *.gz ]]; then
        zcat "$backup_file" | psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --quiet
    else
        psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --quiet \
            -f "$backup_file"
    fi
    
    # Unset PGPASSWORD
    unset PGPASSWORD
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ Database restored successfully from: $backup_file"
    else
        print_message $RED "❌ Failed to restore database from: $backup_file"
        return 1
    fi
}

# Function to list available backups
list_backups() {
    print_message $BLUE "📋 Available backups in $BACKUP_DIR:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_message $YELLOW "⚠️  Backup directory does not exist"
        return 0
    fi
    
    local backup_count=0
    
    for backup_file in "$BACKUP_DIR"/cantonese-scribe-*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local filename=$(basename "$backup_file")
            local filesize=$(ls -lh "$backup_file" | awk '{print $5}')
            local filedate=$(ls -l "$backup_file" | awk '{print $6, $7, $8}')
            
            echo "  📁 $filename ($filesize) - $filedate"
            ((backup_count++))
        fi
    done
    
    if [ $backup_count -eq 0 ]; then
        print_message $YELLOW "⚠️  No backup files found"
    else
        print_message $GREEN "✅ Found $backup_count backup files"
    fi
}

# Function to show usage
show_usage() {
    echo "CantoneseScribe Database Backup and Recovery Script"
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  backup <environment> [type]  - Create database backup"
    echo "    environment: production, staging, development"
    echo "    type: full (default), schema, data, app"
    echo ""
    echo "  restore <backup_file> CONFIRM_RESTORE - Restore from backup"
    echo ""
    echo "  list                          - List available backups"
    echo ""
    echo "  verify <backup_file>          - Verify backup integrity"
    echo ""
    echo "Examples:"
    echo "  $0 backup production full"
    echo "  $0 backup staging app"
    echo "  $0 restore backup.sql.gz CONFIRM_RESTORE"
    echo "  $0 list"
    echo "  $0 verify backup.sql.gz"
    echo ""
    echo "Environment variables (set via .env files):"
    echo "  DATABASE_URL           - PostgreSQL connection URL"
    echo "  SUPABASE_URL          - Supabase project URL" 
    echo "  SUPABASE_SERVICE_KEY  - Supabase service role key"
    echo "  S3_BACKUP_BUCKET      - S3 bucket for backup storage (optional)"
    echo "  BACKUP_RETENTION_DAYS - Days to retain backups (default: 30)"
}

# Main execution
main() {
    local command="$1"
    local environment="$2"
    local backup_type="${3:-full}"
    
    case $command in
        "backup")
            if [ -z "$environment" ]; then
                print_message $RED "❌ Environment required for backup command"
                show_usage
                exit 1
            fi
            
            check_prerequisites
            ensure_backup_directory
            load_environment ".env.$environment"
            
            if [ "$backup_type" == "app" ]; then
                create_app_backup
                local backup_file="$BACKUP_DIR/cantonese-scribe-app-data-${DATE}.sql.gz"
            else
                create_database_backup "$backup_type"
                local backup_file="$BACKUP_DIR/cantonese-scribe-${backup_type}-${DATE}.sql.gz"
            fi
            
            if [ -f "$backup_file" ]; then
                verify_backup_integrity "$backup_file"
                upload_to_s3 "$backup_file"
            fi
            
            cleanup_old_backups
            ;;
            
        "restore")
            local backup_file="$2"
            local confirm="$3"
            
            if [ -z "$backup_file" ]; then
                print_message $RED "❌ Backup file required for restore command"
                show_usage
                exit 1
            fi
            
            check_prerequisites
            
            # Try to determine environment from backup filename
            if [[ $backup_file == *production* ]]; then
                load_environment ".env.production"
            elif [[ $backup_file == *staging* ]]; then
                load_environment ".env.staging"
            else
                print_message $YELLOW "⚠️  Cannot determine environment from filename"
                print_message $BLUE "Please specify environment file manually"
                exit 1
            fi
            
            restore_from_backup "$backup_file" "$confirm"
            ;;
            
        "list")
            list_backups
            ;;
            
        "verify")
            local backup_file="$2"
            
            if [ -z "$backup_file" ]; then
                print_message $RED "❌ Backup file required for verify command"
                show_usage
                exit 1
            fi
            
            verify_backup_integrity "$backup_file"
            ;;
            
        "help"|"--help"|"-h")
            show_usage
            ;;
            
        *)
            print_message $RED "❌ Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
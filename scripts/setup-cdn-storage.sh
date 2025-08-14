#!/bin/bash

# CantoneseScribe CDN & Storage Configuration Script
# This script sets up Cloudflare R2 storage with CDN for optimal file delivery

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
R2_PRODUCTION_BUCKET="cantonese-scribe-prod"
R2_STAGING_BUCKET="cantonese-scribe-staging"
CUSTOM_DOMAIN="cdn.cantonese-scribe.com"
STAGING_DOMAIN="staging-cdn.cantonese-scribe.com"

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_message $BLUE "🔧 Checking CDN setup prerequisites..."
    
    local missing_tools=()
    
    # Check for wrangler (Cloudflare CLI)
    if ! command -v wrangler &> /dev/null; then
        missing_tools+=("wrangler")
    fi
    
    # Check for curl for testing
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    # Check for jq for JSON processing
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_message $RED "❌ Missing required tools: ${missing_tools[*]}"
        print_message $YELLOW "Install Wrangler CLI: npm install -g wrangler"
        print_message $YELLOW "Install curl and jq: apt-get install curl jq (Ubuntu) or brew install curl jq (macOS)"
        exit 1
    fi
    
    print_message $GREEN "✅ All CDN prerequisites are installed"
}

# Function to authenticate with Cloudflare
authenticate_cloudflare() {
    print_message $BLUE "🔐 Checking Cloudflare authentication..."
    
    # Check if already authenticated
    if wrangler whoami > /dev/null 2>&1; then
        local current_user=$(wrangler whoami | grep "logged in as" | cut -d' ' -f4)
        print_message $GREEN "✅ Already authenticated as: $current_user"
    else
        print_message $YELLOW "⚠️  Not authenticated with Cloudflare"
        print_message $BLUE "🔐 Starting Cloudflare authentication..."
        wrangler login
    fi
}

# Function to create R2 buckets
create_r2_buckets() {
    print_message $BLUE "🪣 Creating R2 storage buckets..."
    
    # Create production bucket
    print_message $BLUE "Creating production bucket: $R2_PRODUCTION_BUCKET"
    if wrangler r2 bucket create "$R2_PRODUCTION_BUCKET" 2>/dev/null; then
        print_message $GREEN "✅ Production bucket created: $R2_PRODUCTION_BUCKET"
    else
        print_message $YELLOW "⚠️  Production bucket might already exist or creation failed"
    fi
    
    # Create staging bucket
    print_message $BLUE "Creating staging bucket: $R2_STAGING_BUCKET"
    if wrangler r2 bucket create "$R2_STAGING_BUCKET" 2>/dev/null; then
        print_message $GREEN "✅ Staging bucket created: $R2_STAGING_BUCKET"
    else
        print_message $YELLOW "⚠️  Staging bucket might already exist or creation failed"
    fi
    
    # List buckets to confirm
    print_message $BLUE "Listing R2 buckets..."
    wrangler r2 bucket list | grep -E "(cantonese-scribe|Name)" || true
}

# Function to configure bucket CORS
configure_bucket_cors() {
    print_message $BLUE "🌐 Configuring CORS policies for R2 buckets..."
    
    # Create CORS configuration for production
    cat > "r2-cors-production.json" << EOF
[
  {
    "AllowedOrigins": [
      "https://cantonese-scribe.vercel.app",
      "https://www.cantonese-scribe.com",
      "https://$CUSTOM_DOMAIN"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 86400
  }
]
EOF
    
    # Create CORS configuration for staging
    cat > "r2-cors-staging.json" << EOF
[
  {
    "AllowedOrigins": [
      "https://cantonese-scribe-staging.vercel.app",
      "https://cantonese-scribe-pro-staging.vercel.app",
      "https://$STAGING_DOMAIN",
      "http://localhost:3000",
      "http://localhost:8080"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD",
      "OPTIONS"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
EOF
    
    # Apply CORS configuration (Note: This might require manual setup via Cloudflare dashboard)
    print_message $YELLOW "⚠️  CORS configuration files created:"
    echo "   - r2-cors-production.json"
    echo "   - r2-cors-staging.json"
    echo ""
    print_message $YELLOW "Manual CORS setup required:"
    echo "1. Go to Cloudflare R2 dashboard"
    echo "2. Select each bucket"
    echo "3. Go to Settings > CORS policy"
    echo "4. Apply the corresponding JSON configuration"
    
    print_message $GREEN "✅ CORS configuration files prepared"
}

# Function to setup custom domains
setup_custom_domains() {
    print_message $BLUE "🌐 Setting up custom domains for R2..."
    
    print_message $YELLOW "⚠️  Manual custom domain setup required:"
    echo ""
    echo "Production Domain Setup ($CUSTOM_DOMAIN):"
    echo "1. Go to Cloudflare R2 dashboard"
    echo "2. Select the '$R2_PRODUCTION_BUCKET' bucket"
    echo "3. Go to Settings > Public access"
    echo "4. Enable 'Allow access' for public read"
    echo "5. Add custom domain: $CUSTOM_DOMAIN"
    echo "6. Ensure DNS is configured:"
    echo "   - CNAME: cdn.cantonese-scribe.com -> [R2_PUBLIC_URL]"
    echo ""
    echo "Staging Domain Setup ($STAGING_DOMAIN):"
    echo "1. Repeat the above steps for '$R2_STAGING_BUCKET'"
    echo "2. Add custom domain: $STAGING_DOMAIN"
    echo "3. Configure DNS:"
    echo "   - CNAME: staging-cdn.cantonese-scribe.com -> [R2_STAGING_URL]"
    echo ""
    
    # Create DNS configuration template
    cat > "dns-configuration.txt" << EOF
# DNS Configuration for CantoneseScribe CDN
# Add these records to your DNS provider

# Production CDN
Type: CNAME
Name: cdn
Value: [R2_PRODUCTION_PUBLIC_URL]
TTL: 300

# Staging CDN  
Type: CNAME
Name: staging-cdn
Value: [R2_STAGING_PUBLIC_URL]
TTL: 300

# Optional: Status page subdomain
Type: CNAME
Name: status
Value: [UPTIME_ROBOT_STATUS_PAGE_URL]
TTL: 300

# Note: Replace bracketed values with actual URLs from Cloudflare R2 dashboard
EOF
    
    print_message $GREEN "✅ DNS configuration template created: dns-configuration.txt"
}

# Function to configure bucket lifecycle rules
configure_lifecycle_rules() {
    print_message $BLUE "🔄 Configuring bucket lifecycle rules..."
    
    # Create lifecycle configuration for automatic cleanup
    cat > "r2-lifecycle-production.json" << EOF
{
  "rules": [
    {
      "id": "cleanup-temp-files",
      "status": "Enabled",
      "filter": {
        "prefix": "temp/"
      },
      "expiration": {
        "days": 1
      }
    },
    {
      "id": "cleanup-upload-temp",
      "status": "Enabled", 
      "filter": {
        "prefix": "uploads/temp/"
      },
      "expiration": {
        "days": 7
      }
    },
    {
      "id": "archive-old-transcriptions",
      "status": "Enabled",
      "filter": {
        "prefix": "transcriptions/"
      },
      "transitions": [
        {
          "days": 90,
          "storage_class": "COLD"
        }
      ]
    },
    {
      "id": "cleanup-old-exports",
      "status": "Enabled",
      "filter": {
        "prefix": "exports/"
      },
      "expiration": {
        "days": 30
      }
    }
  ]
}
EOF
    
    # Create staging lifecycle (shorter retention)
    cat > "r2-lifecycle-staging.json" << EOF
{
  "rules": [
    {
      "id": "cleanup-temp-files",
      "status": "Enabled",
      "filter": {
        "prefix": "temp/"
      },
      "expiration": {
        "days": 1
      }
    },
    {
      "id": "cleanup-all-staging-files",
      "status": "Enabled",
      "filter": {
        "prefix": ""
      },
      "expiration": {
        "days": 7
      }
    }
  ]
}
EOF
    
    print_message $GREEN "✅ Lifecycle configuration created"
    print_message $YELLOW "⚠️  Manual lifecycle setup required:"
    echo "1. Apply r2-lifecycle-production.json to production bucket"
    echo "2. Apply r2-lifecycle-staging.json to staging bucket"
    echo "3. Configure via Cloudflare R2 dashboard > Settings > Lifecycle"
}

# Function to setup CDN caching rules
setup_cdn_caching() {
    print_message $BLUE "⚡ Setting up CDN caching rules..."
    
    # Create caching configuration
    cat > "cloudflare-caching-rules.json" << 'EOF'
{
  "caching_rules": [
    {
      "name": "Static Assets Long Cache",
      "match": "*.{jpg,jpeg,png,gif,webp,svg,css,js,woff,woff2,ttf,eot,ico}",
      "cache_ttl": 31536000,
      "edge_cache_ttl": 7776000,
      "browser_cache_ttl": 31536000,
      "cache_by_device_type": false
    },
    {
      "name": "Audio/Video Files Medium Cache", 
      "match": "*.{mp3,mp4,wav,webm,m4a,ogg}",
      "cache_ttl": 86400,
      "edge_cache_ttl": 86400,
      "browser_cache_ttl": 3600,
      "cache_by_device_type": false
    },
    {
      "name": "Transcription Files Short Cache",
      "match": "*.{srt,vtt,txt,csv,json}",
      "cache_ttl": 3600,
      "edge_cache_ttl": 1800,
      "browser_cache_ttl": 300,
      "cache_by_device_type": false
    },
    {
      "name": "API Responses No Cache",
      "match": "/api/*",
      "cache_ttl": 0,
      "edge_cache_ttl": 0,
      "browser_cache_ttl": 0
    }
  ],
  "security_headers": {
    "strict_transport_security": "max-age=31536000; includeSubDomains",
    "x_content_type_options": "nosniff",
    "x_frame_options": "SAMEORIGIN",
    "referrer_policy": "strict-origin-when-cross-origin",
    "permissions_policy": "geolocation=(), camera=(), microphone=()"
  },
  "compression": {
    "gzip": true,
    "brotli": true,
    "algorithms": ["gzip", "brotli"]
  }
}
EOF
    
    print_message $GREEN "✅ CDN caching rules configuration created"
    print_message $YELLOW "⚠️  Manual CDN setup required:"
    echo "1. Apply caching rules via Cloudflare dashboard"
    echo "2. Configure security headers"
    echo "3. Enable compression (Gzip + Brotli)"
    echo "4. Set up custom error pages"
}

# Function to create file organization structure
create_file_structure() {
    print_message $BLUE "📁 Creating file organization structure..."
    
    # Create file structure documentation
    cat > "r2-file-structure.md" << 'EOF'
# CantoneseScribe R2 File Structure

## Production Bucket Structure (`cantonese-scribe-prod`)

```
/
├── uploads/                    # User uploaded files
│   ├── audio/                 # Audio files
│   │   └── {user_id}/         # User-specific folders
│   │       └── {file_id}.{ext} # Original audio files
│   ├── video/                 # Video files  
│   │   └── {user_id}/
│   │       └── {file_id}.{ext}
│   └── temp/                  # Temporary upload files (1 day retention)
│       └── {temp_id}.{ext}
│
├── transcriptions/             # Generated transcription files
│   └── {user_id}/             # User-specific folders
│       ├── {transcription_id}.json  # Full transcription data
│       ├── {transcription_id}.srt   # SRT export
│       ├── {transcription_id}.vtt   # WebVTT export
│       └── {transcription_id}.txt   # Plain text export
│
├── exports/                    # Generated export files (30 day retention)
│   └── {user_id}/
│       └── {export_id}.{format}
│
├── processed/                  # Processed audio files
│   └── {user_id}/
│       └── {file_id}_processed.{ext}
│
├── backups/                    # System backups
│   ├── database/              # Database backups
│   └── user_data/             # User data backups
│
├── static/                     # Static assets served via CDN
│   ├── images/                # UI images, logos
│   ├── fonts/                 # Custom fonts
│   └── assets/                # Other static assets
│
└── temp/                       # Temporary files (1 day retention)
    └── {process_id}/          # Process-specific temp files
```

## File Naming Conventions

### Audio/Video Files
- Format: `{user_id}/{timestamp}_{original_name}.{ext}`
- Example: `uuid123/20240814_150230_my_audio.mp3`

### Transcription Files
- Format: `{user_id}/{transcription_id}_{format}.{ext}`
- Example: `uuid123/trans_456_full.json`

### Export Files
- Format: `{user_id}/export_{timestamp}_{format}.{ext}`
- Example: `uuid123/export_20240814_srt.zip`

### Temporary Files
- Format: `temp/{process_id}_{timestamp}.{ext}`
- Example: `temp/proc_789_20240814.tmp`

## Access Patterns

### Public Access (CDN)
- Static assets: `/static/*` - Public read access
- Export files: `/exports/{user_id}/*` - Signed URL access

### Private Access (API)
- User uploads: `/uploads/{user_id}/*` - User authentication required
- Transcriptions: `/transcriptions/{user_id}/*` - User authentication required
- Processed files: `/processed/{user_id}/*` - System access only

### Temporary Access
- Upload temp: `/uploads/temp/*` - Pre-signed upload URLs
- Processing temp: `/temp/*` - System access only

## Security Notes

1. All user content requires authentication
2. Temporary files use pre-signed URLs with short expiration
3. Static assets are publicly cached
4. Export files use signed URLs with download tracking
5. Backups are system access only with encryption
EOF
    
    print_message $GREEN "✅ File structure documentation created: r2-file-structure.md"
}

# Function to setup R2 API integration
setup_r2_api_integration() {
    print_message $BLUE "🔗 Setting up R2 API integration..."
    
    # Create R2 service configuration
    cat > "r2-service-config.py" << 'EOF'
"""
Cloudflare R2 Storage Service Configuration for CantoneseScribe
"""

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional, Dict, Any
import os
from datetime import datetime, timedelta
import mimetypes
import uuid

class R2StorageService:
    """Cloudflare R2 storage service wrapper"""
    
    def __init__(self):
        self.account_id = os.getenv('R2_ACCOUNT_ID')
        self.access_key_id = os.getenv('R2_ACCESS_KEY_ID')
        self.secret_access_key = os.getenv('R2_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('R2_BUCKET_NAME', 'cantonese-scribe-prod')
        self.public_url = os.getenv('R2_PUBLIC_URL', f'https://pub-{self.account_id}.r2.dev')
        
        # Configure R2 client
        self.client = boto3.client(
            's3',
            endpoint_url=f'https://{self.account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto',  # R2 uses 'auto' region
            config=Config(
                retries={'max_attempts': 3, 'mode': 'adaptive'},
                max_pool_connections=50
            )
        )
    
    def upload_file(self, file_path: str, key: str, metadata: Optional[Dict[str, str]] = None) -> str:
        """Upload file to R2 storage"""
        try:
            # Determine content type
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Prepare metadata
            extra_args = {
                'ContentType': content_type,
                'Metadata': metadata or {}
            }
            
            # Add cache control for different file types
            if any(key.endswith(ext) for ext in ['.jpg', '.png', '.gif', '.webp', '.svg']):
                extra_args['CacheControl'] = 'public, max-age=31536000'  # 1 year
            elif any(key.endswith(ext) for ext in ['.mp3', '.mp4', '.wav', '.webm']):
                extra_args['CacheControl'] = 'public, max-age=86400'     # 1 day
            elif any(key.endswith(ext) for ext in ['.srt', '.vtt', '.txt', '.csv']):
                extra_args['CacheControl'] = 'public, max-age=3600'      # 1 hour
            
            # Upload file
            self.client.upload_file(file_path, self.bucket_name, key, ExtraArgs=extra_args)
            
            return f"{self.public_url}/{key}"
            
        except ClientError as e:
            raise Exception(f"Failed to upload file to R2: {str(e)}")
    
    def upload_bytes(self, data: bytes, key: str, content_type: str = None, metadata: Optional[Dict[str, str]] = None) -> str:
        """Upload bytes data to R2 storage"""
        try:
            extra_args = {
                'ContentType': content_type or 'application/octet-stream',
                'Metadata': metadata or {}
            }
            
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                **extra_args
            )
            
            return f"{self.public_url}/{key}"
            
        except ClientError as e:
            raise Exception(f"Failed to upload bytes to R2: {str(e)}")
    
    def generate_presigned_url(self, key: str, expiration: int = 3600, method: str = 'get_object') -> str:
        """Generate presigned URL for file access"""
        try:
            url = self.client.generate_presigned_url(
                method,
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")
    
    def delete_file(self, key: str) -> bool:
        """Delete file from R2 storage"""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            print(f"Warning: Failed to delete file {key}: {str(e)}")
            return False
    
    def list_files(self, prefix: str = '', max_keys: int = 1000) -> List[Dict[str, Any]]:
        """List files in R2 bucket with given prefix"""
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            return response.get('Contents', [])
        except ClientError as e:
            raise Exception(f"Failed to list files: {str(e)}")
    
    def get_file_info(self, key: str) -> Optional[Dict[str, Any]]:
        """Get file metadata and info"""
        try:
            response = self.client.head_object(Bucket=self.bucket_name, Key=key)
            return {
                'size': response['ContentLength'],
                'last_modified': response['LastModified'],
                'content_type': response['ContentType'],
                'metadata': response.get('Metadata', {}),
                'etag': response['ETag']
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            raise Exception(f"Failed to get file info: {str(e)}")
    
    def cleanup_temp_files(self, max_age_hours: int = 24) -> int:
        """Clean up temporary files older than specified age"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        deleted_count = 0
        
        try:
            # List temp files
            temp_files = self.list_files(prefix='temp/')
            
            for file_obj in temp_files:
                if file_obj['LastModified'].replace(tzinfo=None) < cutoff_time:
                    if self.delete_file(file_obj['Key']):
                        deleted_count += 1
            
            return deleted_count
        except Exception as e:
            print(f"Warning: Temp file cleanup failed: {str(e)}")
            return 0

# Global service instance
r2_storage = R2StorageService()
EOF
    
    print_message $GREEN "✅ R2 API integration service created: r2-service-config.py"
}

# Function to create CDN performance optimization config
create_performance_config() {
    print_message $BLUE "⚡ Creating CDN performance optimization configuration..."
    
    # Create performance optimization configuration
    cat > "cdn-performance-config.json" << 'EOF'
{
  "performance_optimization": {
    "caching": {
      "static_assets": {
        "max_age": 31536000,
        "stale_while_revalidate": 86400,
        "stale_if_error": 259200
      },
      "media_files": {
        "max_age": 86400,
        "stale_while_revalidate": 3600,
        "stale_if_error": 86400
      },
      "dynamic_content": {
        "max_age": 0,
        "no_cache": true,
        "must_revalidate": true
      }
    },
    "compression": {
      "algorithms": ["brotli", "gzip"],
      "minimum_size": 1024,
      "excluded_types": [
        "image/jpeg",
        "image/png", 
        "image/gif",
        "image/webp",
        "audio/*",
        "video/*"
      ]
    },
    "image_optimization": {
      "auto_format": true,
      "auto_quality": true,
      "formats": ["webp", "avif", "jpeg", "png"],
      "responsive_images": true
    },
    "preload_hints": [
      {
        "resource": "/static/fonts/main.woff2",
        "as": "font",
        "type": "font/woff2",
        "crossorigin": "anonymous"
      },
      {
        "resource": "/static/css/main.css", 
        "as": "style"
      },
      {
        "resource": "/static/js/main.js",
        "as": "script"
      }
    ],
    "security_headers": {
      "content_security_policy": "default-src 'self'; script-src 'self' 'unsafe-inline' *.vercel.app; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.cantonese-scribe.com; media-src 'self' *.cantonese-scribe.com; connect-src 'self' *.supabase.co *.vercel.app;",
      "x_content_type_options": "nosniff",
      "x_frame_options": "SAMEORIGIN",
      "x_xss_protection": "1; mode=block",
      "referrer_policy": "strict-origin-when-cross-origin",
      "strict_transport_security": "max-age=31536000; includeSubDomains"
    }
  },
  "monitoring": {
    "real_user_monitoring": true,
    "synthetic_monitoring": {
      "locations": ["us-east", "us-west", "europe", "asia"],
      "frequency": "5m",
      "thresholds": {
        "response_time": 2000,
        "availability": 99.9
      }
    },
    "core_web_vitals": {
      "largest_contentful_paint": 2500,
      "first_input_delay": 100,
      "cumulative_layout_shift": 0.1
    }
  }
}
EOF
    
    print_message $GREEN "✅ CDN performance configuration created: cdn-performance-config.json"
}

# Function to test CDN setup
test_cdn_setup() {
    print_message $BLUE "🧪 Testing CDN and storage setup..."
    
    # Test R2 bucket accessibility (if configured)
    if [ -n "${R2_PUBLIC_URL:-}" ]; then
        print_message $BLUE "Testing R2 bucket accessibility..."
        
        if curl -s --head "$R2_PUBLIC_URL" | head -n 1 | grep -q "200"; then
            print_message $GREEN "✅ R2 bucket publicly accessible"
        else
            print_message $YELLOW "⚠️  R2 bucket not yet publicly accessible (normal for new setup)"
        fi
    else
        print_message $YELLOW "⚠️  R2_PUBLIC_URL not configured"
    fi
    
    # Validate configuration files
    if command -v jq >/dev/null 2>&1; then
        local config_files=(
            "r2-cors-production.json"
            "r2-cors-staging.json"
            "r2-lifecycle-production.json"
            "r2-lifecycle-staging.json"
            "cloudflare-caching-rules.json"
            "cdn-performance-config.json"
        )
        
        for config_file in "${config_files[@]}"; do
            if [ -f "$config_file" ] && jq empty "$config_file" >/dev/null 2>&1; then
                print_message $GREEN "✅ $config_file is valid JSON"
            else
                print_message $YELLOW "⚠️  $config_file not found or invalid"
            fi
        done
    fi
    
    print_message $GREEN "✅ CDN setup test completed"
}

# Function to show deployment checklist
show_deployment_checklist() {
    print_message $BLUE "📋 CDN & Storage Deployment Checklist"
    print_message $BLUE "====================================="
    echo ""
    echo "✅ Configuration Files Created:"
    echo "   - r2-cors-production.json (CORS rules for production)"
    echo "   - r2-cors-staging.json (CORS rules for staging)"  
    echo "   - r2-lifecycle-production.json (Lifecycle rules for production)"
    echo "   - r2-lifecycle-staging.json (Lifecycle rules for staging)"
    echo "   - cloudflare-caching-rules.json (CDN caching configuration)"
    echo "   - cdn-performance-config.json (Performance optimization)"
    echo "   - dns-configuration.txt (DNS setup instructions)"
    echo "   - r2-file-structure.md (File organization documentation)"
    echo "   - r2-service-config.py (API integration service)"
    echo ""
    echo "⚠️  Manual Setup Required:"
    echo "1. 🪣 Configure R2 bucket CORS policies"
    echo "2. 🌐 Set up custom domains for CDN"
    echo "3. 📝 Configure DNS records"
    echo "4. 🔄 Apply lifecycle rules for automatic cleanup"
    echo "5. ⚡ Configure Cloudflare caching rules"
    echo "6. 🔒 Set up security headers"
    echo "7. 📊 Enable performance monitoring"
    echo ""
    echo "🔧 Integration Steps:"
    echo "1. Add R2 environment variables to Vercel"
    echo "2. Update file service to use R2 storage"
    echo "3. Configure CDN URLs in application"
    echo "4. Test file upload and download workflows"
    echo "5. Verify CDN cache behavior"
    echo "6. Set up CDN monitoring and alerting"
    echo ""
    echo "🧪 Testing Checklist:"
    echo "1. Upload test files to both buckets"
    echo "2. Verify CORS headers are applied"
    echo "3. Test CDN cache hit rates"
    echo "4. Verify lifecycle rules trigger cleanup"
    echo "5. Test custom domain access"
    echo "6. Monitor CDN performance metrics"
    echo ""
}

# Function to show usage
show_usage() {
    echo "CantoneseScribe CDN & Storage Setup Script"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup-all              - Complete CDN and storage setup (default)"
    echo "  create-buckets         - Create R2 storage buckets"
    echo "  configure-cors         - Configure CORS policies"
    echo "  setup-domains          - Set up custom domains"
    echo "  configure-lifecycle    - Configure lifecycle rules"
    echo "  setup-caching          - Set up CDN caching rules"
    echo "  create-file-structure  - Create file organization structure"
    echo "  setup-api-integration  - Set up R2 API integration"
    echo "  create-performance     - Create performance optimization config"
    echo "  test-setup             - Test CDN and storage setup"
    echo "  deployment-checklist   - Show deployment checklist"
    echo ""
    echo "Examples:"
    echo "  $0 setup-all"
    echo "  $0 create-buckets"
    echo "  $0 test-setup"
}

# Parse command line arguments
COMMAND="${1:-setup-all}"

# Main execution
main() {
    print_message $PURPLE "🌐 CantoneseScribe CDN & Storage Setup"
    print_message $PURPLE "====================================="
    echo ""
    
    case $COMMAND in
        "setup-all")
            check_prerequisites
            authenticate_cloudflare
            create_r2_buckets
            configure_bucket_cors
            setup_custom_domains
            configure_lifecycle_rules
            setup_cdn_caching
            create_file_structure
            setup_r2_api_integration
            create_performance_config
            test_cdn_setup
            show_deployment_checklist
            ;;
            
        "create-buckets")
            check_prerequisites
            authenticate_cloudflare
            create_r2_buckets
            ;;
            
        "configure-cors")
            configure_bucket_cors
            ;;
            
        "setup-domains")
            setup_custom_domains
            ;;
            
        "configure-lifecycle")
            configure_lifecycle_rules
            ;;
            
        "setup-caching")
            setup_cdn_caching
            ;;
            
        "create-file-structure")
            create_file_structure
            ;;
            
        "setup-api-integration")
            setup_r2_api_integration
            ;;
            
        "create-performance")
            create_performance_config
            ;;
            
        "test-setup")
            check_prerequisites
            test_cdn_setup
            ;;
            
        "deployment-checklist")
            show_deployment_checklist
            ;;
            
        "--help"|"-h")
            show_usage
            exit 0
            ;;
            
        *)
            print_message $RED "❌ Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    print_message $GREEN "🎉 CDN & storage setup completed!"
}

# Execute main function
main
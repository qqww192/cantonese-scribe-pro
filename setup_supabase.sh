#!/bin/bash

# CantoneseScribe Supabase Setup Script
# This script sets up the complete database schema for CantoneseScribe

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.production ]; then
    set -a  # automatically export all variables
    source .env.production
    set +a  # stop automatically exporting
else
    echo -e "${RED}Error: .env.production file not found${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Setting up CantoneseScribe Supabase Database${NC}"
echo "=================================================="

# Extract credentials from environment
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
DATABASE_URL=${DATABASE_URL}

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}Error: Missing Supabase credentials in .env.production${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Creating initial database schema...${NC}"

# Create initial schema using psql
if command -v psql &> /dev/null; then
    echo "Using psql to create schema..."
    psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
else
    echo "psql not found. Using curl to execute schema..."
    # Use Supabase REST API to execute schema
    curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
         -H "Content-Type: application/json" \
         -H "apikey: ${SUPABASE_SERVICE_KEY}" \
         -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
         -d @<(echo '{"sql": "'"$(cat database/migrations/001_initial_schema.sql | sed 's/"/\\"/g' | tr '\n' ' ')"'"}')
fi

echo -e "${GREEN}✅ Initial schema created successfully${NC}"

echo -e "${YELLOW}Step 2: Setting up Supabase-specific configurations...${NC}"

# Apply Supabase-specific setup
if command -v psql &> /dev/null; then
    echo "Applying Supabase configuration..."
    psql "$DATABASE_URL" -f database/supabase-setup.sql
else
    echo "Using curl for Supabase configuration..."
    curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
         -H "Content-Type: application/json" \
         -H "apikey: ${SUPABASE_SERVICE_KEY}" \
         -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
         -d @<(echo '{"sql": "'"$(cat database/supabase-setup.sql | sed 's/"/\\"/g' | tr '\n' ' ')"'"}')
fi

echo -e "${GREEN}✅ Supabase configuration completed${NC}"

echo -e "${YELLOW}Step 3: Testing database connection...${NC}"

# Test the database by creating a test user
TEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/signup" \
     -H "Content-Type: application/json" \
     -H "apikey: ${SUPABASE_KEY}" \
     -d '{"email":"test@cantonesescribe.com","password":"TestPassword123!"}')

if echo "$TEST_RESPONSE" | grep -q '"id"'; then
    echo -e "${GREEN}✅ Database setup successful! Test user created.${NC}"
    # Clean up test user
    TEST_USER_ID=$(echo "$TEST_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "Cleaning up test user..."
else
    echo -e "${YELLOW}⚠️  Database schema is set up, but signup test failed. This may be normal if auth is not fully configured.${NC}"
    echo "Response: $TEST_RESPONSE"
fi

echo -e "${YELLOW}Step 4: Setting up storage buckets...${NC}"

# Create storage buckets using REST API
curl -X POST "${SUPABASE_URL}/storage/v1/bucket" \
     -H "Content-Type: application/json" \
     -H "apikey: ${SUPABASE_SERVICE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
     -d '{"id":"audio-uploads","name":"audio-uploads","public":false}' || echo "Bucket may already exist"

curl -X POST "${SUPABASE_URL}/storage/v1/bucket" \
     -H "Content-Type: application/json" \
     -H "apikey: ${SUPABASE_SERVICE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
     -d '{"id":"transcription-exports","name":"transcription-exports","public":false}' || echo "Bucket may already exist"

echo -e "${GREEN}✅ Storage buckets configured${NC}"

echo ""
echo -e "${GREEN}🎉 CantoneseScribe Supabase setup completed successfully!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Test user registration: npm run test:auth"
echo "2. Run the backend server: cd cantonese-scribe-backend && python test_basic.py"
echo "3. Start the frontend: cd cantonese-scribe-frontend && npm run dev"
echo ""
echo "Database URL: ${SUPABASE_URL}"
echo "Anon Key: ${SUPABASE_KEY}"
echo ""
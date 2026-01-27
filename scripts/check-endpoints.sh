#!/bin/bash
# BlackRoad Docker Manager - Endpoint Health Checker
# Checks connectivity to all configured integration endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TIMEOUT=10
RETRY_COUNT=3
RETRY_DELAY=2

echo "========================================"
echo "   BlackRoad Endpoint Health Check"
echo "========================================"
echo ""

# Track results
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Function to check an endpoint
check_endpoint() {
    local name="$1"
    local url="$2"
    local auth_header="$3"

    TOTAL=$((TOTAL + 1))

    if [ -z "$url" ] || [ "$url" == "null" ]; then
        echo -e "${YELLOW}⏭️  $name: Skipped (not configured)${NC}"
        SKIPPED=$((SKIPPED + 1))
        return
    fi

    echo -n "Checking $name... "

    for i in $(seq 1 $RETRY_COUNT); do
        if [ -n "$auth_header" ]; then
            response=$(curl -s -o /dev/null -w "%{http_code}" \
                --connect-timeout $TIMEOUT \
                -H "$auth_header" \
                "$url" 2>/dev/null) || response="000"
        else
            response=$(curl -s -o /dev/null -w "%{http_code}" \
                --connect-timeout $TIMEOUT \
                "$url" 2>/dev/null) || response="000"
        fi

        if [ "$response" -ge 200 ] && [ "$response" -lt 400 ]; then
            echo -e "${GREEN}✅ OK ($response)${NC}"
            PASSED=$((PASSED + 1))
            return
        fi

        if [ $i -lt $RETRY_COUNT ]; then
            sleep $RETRY_DELAY
        fi
    done

    echo -e "${RED}❌ FAILED ($response)${NC}"
    FAILED=$((FAILED + 1))
}

# Function to check if environment variable is set
check_env() {
    local var_name="$1"
    if [ -n "${!var_name}" ]; then
        return 0
    else
        return 1
    fi
}

echo "Checking environment variables..."
echo ""

# GitHub
echo "--- GitHub ---"
if check_env "GITHUB_TOKEN"; then
    check_endpoint "GitHub API" "https://api.github.com/user" "Authorization: Bearer $GITHUB_TOKEN"
else
    check_endpoint "GitHub API (unauthenticated)" "https://api.github.com/zen" ""
fi

# Cloudflare
echo ""
echo "--- Cloudflare ---"
if check_env "CLOUDFLARE_API_TOKEN"; then
    check_endpoint "Cloudflare API" "https://api.cloudflare.com/client/v4/user/tokens/verify" "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
else
    check_endpoint "Cloudflare" "" ""
fi

# Vercel
echo ""
echo "--- Vercel ---"
if check_env "VERCEL_TOKEN"; then
    check_endpoint "Vercel API" "https://api.vercel.com/v2/user" "Authorization: Bearer $VERCEL_TOKEN"
else
    check_endpoint "Vercel" "" ""
fi

# DigitalOcean
echo ""
echo "--- DigitalOcean ---"
if check_env "DIGITALOCEAN_TOKEN"; then
    check_endpoint "DigitalOcean API" "https://api.digitalocean.com/v2/account" "Authorization: Bearer $DIGITALOCEAN_TOKEN"
else
    check_endpoint "DigitalOcean" "" ""
fi

# Anthropic (Claude)
echo ""
echo "--- Claude API ---"
if check_env "ANTHROPIC_API_KEY"; then
    # Note: Claude API requires POST, so we just check connectivity
    check_endpoint "Anthropic API" "https://api.anthropic.com" ""
else
    check_endpoint "Claude" "" ""
fi

# Salesforce
echo ""
echo "--- Salesforce ---"
if check_env "SALESFORCE_INSTANCE_URL"; then
    check_endpoint "Salesforce" "$SALESFORCE_INSTANCE_URL/services/data" ""
else
    check_endpoint "Salesforce" "" ""
fi

# Raspberry Pi (custom endpoint)
echo ""
echo "--- Raspberry Pi ---"
if check_env "RPI_MANAGER_URL"; then
    check_endpoint "Pi Manager" "$RPI_MANAGER_URL/api/v1/health" ""
else
    check_endpoint "Raspberry Pi" "" ""
fi

# Custom Cloudflare Worker
echo ""
echo "--- Custom Workers ---"
if check_env "CLOUDFLARE_WORKER_URL"; then
    check_endpoint "Kanban Worker" "$CLOUDFLARE_WORKER_URL/api/health" ""
else
    check_endpoint "Kanban Worker" "" ""
fi

# Summary
echo ""
echo "========================================"
echo "             SUMMARY"
echo "========================================"
echo ""
echo -e "Total Endpoints: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Some endpoints failed. Check configuration.${NC}"
    exit 1
else
    echo -e "${GREEN}All configured endpoints are healthy!${NC}"
    exit 0
fi

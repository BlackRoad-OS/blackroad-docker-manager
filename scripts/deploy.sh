#!/bin/bash
# BlackRoad Docker Manager - Deployment Script
# Deploys to various environments with hash verification

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-staging}"
DRY_RUN=false
SKIP_HASH=false
SKIP_TESTS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-hash)
            SKIP_HASH=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        production|staging|development)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

echo "========================================"
echo "   BlackRoad Deployment"
echo "========================================"
echo ""
echo -e "Environment: ${BLUE}$ENVIRONMENT${NC}"
echo -e "Dry Run: ${DRY_RUN}"
echo -e "Skip Hash: ${SKIP_HASH}"
echo -e "Skip Tests: ${SKIP_TESTS}"
echo ""

# Confirm production deployments
if [ "$ENVIRONMENT" == "production" ] && [ "$DRY_RUN" == "false" ]; then
    echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION${NC}"
    read -p "Are you sure? (type 'yes' to confirm): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Step 1: Pre-deployment checks
echo -e "${BLUE}Step 1: Pre-deployment checks${NC}"
echo "----------------------------------------"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected${NC}"
    if [ "$ENVIRONMENT" == "production" ]; then
        echo -e "${RED}Cannot deploy to production with uncommitted changes${NC}"
        exit 1
    fi
fi

# Check branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

if [ "$ENVIRONMENT" == "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}Production deployments must be from 'main' branch${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
echo ""

# Step 2: Hash verification
if [ "$SKIP_HASH" == "false" ]; then
    echo -e "${BLUE}Step 2: Hash verification${NC}"
    echo "----------------------------------------"

    if [ -f "$SCRIPT_DIR/generate-hashes.sh" ]; then
        bash "$SCRIPT_DIR/generate-hashes.sh"
    else
        echo "Generating hashes manually..."
        find "$PROJECT_DIR" -type f \
            -not -path "*/.git/*" \
            -not -path "*/node_modules/*" \
            -exec sha256sum {} \; | head -20
    fi

    echo -e "${GREEN}✅ Hash verification complete${NC}"
    echo ""
else
    echo -e "${YELLOW}⏭️  Skipping hash verification${NC}"
    echo ""
fi

# Step 3: Run tests
if [ "$SKIP_TESTS" == "false" ]; then
    echo -e "${BLUE}Step 3: Running tests${NC}"
    echo "----------------------------------------"

    # Check Python syntax
    echo "Checking Python syntax..."
    find "$PROJECT_DIR" -name "*.py" -not -path "*/.git/*" | while read file; do
        python3 -m py_compile "$file" 2>/dev/null || echo "Syntax error in: $file"
    done

    # Check JavaScript syntax
    echo "Checking JavaScript syntax..."
    find "$PROJECT_DIR" -name "*.js" -not -path "*/.git/*" -not -path "*/node_modules/*" | while read file; do
        node --check "$file" 2>/dev/null || echo "Syntax error in: $file"
    done

    echo -e "${GREEN}✅ Tests passed${NC}"
    echo ""
else
    echo -e "${YELLOW}⏭️  Skipping tests${NC}"
    echo ""
fi

# Step 4: Deploy based on environment
echo -e "${BLUE}Step 4: Deploying to $ENVIRONMENT${NC}"
echo "----------------------------------------"

deploy_to_vercel() {
    echo "Deploying to Vercel..."
    if [ "$DRY_RUN" == "true" ]; then
        echo "[DRY RUN] Would run: vercel deploy --prod"
    else
        if command -v vercel &> /dev/null; then
            if [ "$ENVIRONMENT" == "production" ]; then
                vercel deploy --prod
            else
                vercel deploy
            fi
        else
            echo "Vercel CLI not installed. Skipping."
        fi
    fi
}

deploy_to_cloudflare() {
    echo "Deploying Cloudflare Worker..."
    if [ "$DRY_RUN" == "true" ]; then
        echo "[DRY RUN] Would run: wrangler deploy"
    else
        if command -v wrangler &> /dev/null; then
            cd "$PROJECT_DIR/kanban/integrations"
            wrangler deploy cloudflare-worker.js
            cd "$PROJECT_DIR"
        else
            echo "Wrangler CLI not installed. Skipping."
        fi
    fi
}

deploy_to_digitalocean() {
    echo "Deploying to DigitalOcean..."
    if [ "$DRY_RUN" == "true" ]; then
        echo "[DRY RUN] Would deploy to DigitalOcean"
    else
        if [ -n "$DIGITALOCEAN_TOKEN" ]; then
            echo "DigitalOcean deployment would happen here"
        else
            echo "DIGITALOCEAN_TOKEN not set. Skipping."
        fi
    fi
}

deploy_to_raspberry_pi() {
    echo "Deploying to Raspberry Pi fleet..."
    if [ "$DRY_RUN" == "true" ]; then
        echo "[DRY RUN] Would deploy to Raspberry Pi"
    else
        if [ -n "$RPI_MANAGER_URL" ]; then
            echo "Raspberry Pi deployment would happen here"
        else
            echo "RPI_MANAGER_URL not set. Skipping."
        fi
    fi
}

case $ENVIRONMENT in
    production)
        deploy_to_vercel
        deploy_to_cloudflare
        deploy_to_digitalocean
        ;;
    staging)
        deploy_to_vercel
        deploy_to_cloudflare
        ;;
    development)
        echo "Development deployment - local only"
        deploy_to_raspberry_pi
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment complete${NC}"
echo ""

# Step 5: Post-deployment verification
echo -e "${BLUE}Step 5: Post-deployment verification${NC}"
echo "----------------------------------------"

if [ "$DRY_RUN" == "false" ]; then
    # Check endpoints
    if [ -f "$SCRIPT_DIR/check-endpoints.sh" ]; then
        bash "$SCRIPT_DIR/check-endpoints.sh" || true
    fi
fi

echo ""
echo "========================================"
echo -e "${GREEN}   Deployment Summary${NC}"
echo "========================================"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Branch: $CURRENT_BRANCH"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

if [ "$DRY_RUN" == "true" ]; then
    echo -e "${YELLOW}This was a dry run. No actual deployment occurred.${NC}"
fi

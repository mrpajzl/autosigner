#!/bin/bash

# FastSigner - Fix File Permissions Script
# This script fixes ownership issues on build directories that may have been created with sudo

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  FastSigner - Permission Fix Utility${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}\n"

cd "$PROJECT_ROOT"

echo -e "${BLUE}→ Checking for permission issues...${NC}\n"

# List of directories that commonly have permission issues
DIRS_TO_FIX=(
    ".nuxt"
    ".output"
    "node_modules/.cache"
    "logs"
    "data"
)

FOUND_ISSUES=false

# Check each directory
for dir in "${DIRS_TO_FIX[@]}"; do
    if [ -d "$dir" ]; then
        # Check if any files are owned by root
        if sudo find "$dir" -user root -print -quit 2>/dev/null | grep -q .; then
            echo -e "${YELLOW}⚠️  Found root-owned files in: $dir${NC}"
            FOUND_ISSUES=true
        fi
    fi
done

if [ "$FOUND_ISSUES" = false ]; then
    echo -e "${GREEN}✓ No permission issues found!${NC}"
    echo -e "${CYAN}All files are owned by the current user.${NC}\n"
    exit 0
fi

echo ""
echo -e "${CYAN}This script will fix ownership of the following directories:${NC}"
for dir in "${DIRS_TO_FIX[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "  ${GREEN}• $dir${NC}"
    fi
done

echo ""
echo -e "${YELLOW}This requires sudo access. You may be prompted for your password.${NC}"
echo -n -e "${CYAN}Continue? (y/n): ${NC}"
read -r response

if [ "$response" != "y" ]; then
    echo -e "${RED}Cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}→ Fixing permissions...${NC}\n"

# Fix ownership of each directory
for dir in "${DIRS_TO_FIX[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${BLUE}  Fixing: $dir${NC}"
        sudo chown -R $(whoami):staff "$dir" 2>/dev/null || true
        sudo chmod -R u+w "$dir" 2>/dev/null || true
    fi
done

echo ""
echo -e "${GREEN}✓ Permissions fixed successfully!${NC}"
echo -e "${CYAN}You can now run builds and updates without permission errors.${NC}\n"

# Offer to clean build directories
echo -e "${YELLOW}Would you like to clean build directories for a fresh start?${NC}"
echo -e "${GRAY}This will remove .nuxt, .output, and node_modules/.cache${NC}"
echo -n -e "${CYAN}Clean build directories? (y/n): ${NC}"
read -r clean_response

if [ "$clean_response" = "y" ]; then
    echo ""
    echo -e "${BLUE}→ Cleaning build directories...${NC}"
    rm -rf .nuxt .output node_modules/.cache
    echo -e "${GREEN}✓ Build directories cleaned${NC}"
    echo -e "${CYAN}Run 'pnpm install' to regenerate them.${NC}\n"
fi

echo -e "${GREEN}Done!${NC}\n"

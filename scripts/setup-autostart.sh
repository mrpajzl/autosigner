#!/bin/bash

# Setup script for FastSigner auto-start on macOS

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Setting up FastSigner Auto-Start..."
echo ""

# Make scripts executable
echo "→ Making scripts executable..."
chmod +x "$PROJECT_ROOT/scripts/fastsigner-manager.sh"
chmod +x "$PROJECT_ROOT/scripts/auto-update.sh"
chmod +x "$PROJECT_ROOT/scripts/setup-autostart.sh"

# Create logs directory
echo "→ Creating logs directory..."
mkdir -p "$PROJECT_ROOT/logs"

# Create backups directory
echo "→ Creating backups directory..."
mkdir -p "$PROJECT_ROOT/backups"

# Update plist files with correct paths
echo "→ Updating launch agent configurations..."

# Get username
USERNAME=$(whoami)
HOME_DIR=$(eval echo ~$USERNAME)

# Update manager plist
sed -i '' "s|/Users/ondrejzraly|$HOME_DIR|g" "$PROJECT_ROOT/com.fastsigner.manager.plist"

# Update auto-update plist
sed -i '' "s|/Users/ondrejzraly|$HOME_DIR|g" "$PROJECT_ROOT/com.fastsigner.autoupdate.plist"

# Copy plist files to LaunchAgents
echo "→ Installing launch agents..."
LAUNCH_AGENTS="$HOME_DIR/Library/LaunchAgents"
mkdir -p "$LAUNCH_AGENTS"

cp "$PROJECT_ROOT/com.fastsigner.manager.plist" "$LAUNCH_AGENTS/"
cp "$PROJECT_ROOT/com.fastsigner.autoupdate.plist" "$LAUNCH_AGENTS/"

# Load launch agents
echo "→ Loading launch agents..."

# Unload if already loaded
launchctl unload "$LAUNCH_AGENTS/com.fastsigner.manager.plist" 2>/dev/null || true
launchctl unload "$LAUNCH_AGENTS/com.fastsigner.autoupdate.plist" 2>/dev/null || true

# Load the agents
launchctl load "$LAUNCH_AGENTS/com.fastsigner.manager.plist"
launchctl load "$LAUNCH_AGENTS/com.fastsigner.autoupdate.plist"

echo ""
echo "✅ Setup complete!"
echo ""
echo "The FastSigner Manager will now:"
echo "  • Open automatically on system startup"
echo "  • Check for updates daily at 3:00 AM"
echo ""
echo "To start the manager now, run:"
echo "  $PROJECT_ROOT/scripts/fastsigner-manager.sh"
echo ""
echo "To disable auto-start:"
echo "  launchctl unload ~/Library/LaunchAgents/com.fastsigner.manager.plist"
echo ""
echo "To disable auto-updates:"
echo "  launchctl unload ~/Library/LaunchAgents/com.fastsigner.autoupdate.plist"
echo ""

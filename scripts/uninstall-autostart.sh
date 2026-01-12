#!/bin/bash

# Uninstall script for FastSigner auto-start

set -e

USERNAME=$(whoami)
HOME_DIR=$(eval echo ~$USERNAME)
LAUNCH_AGENTS="$HOME_DIR/Library/LaunchAgents"

echo "🗑️  Uninstalling FastSigner Auto-Start..."
echo ""

# Unload launch agents
echo "→ Unloading launch agents..."
launchctl unload "$LAUNCH_AGENTS/com.fastsigner.manager.plist" 2>/dev/null || true
launchctl unload "$LAUNCH_AGENTS/com.fastsigner.autoupdate.plist" 2>/dev/null || true

# Remove plist files
echo "→ Removing launch agent files..."
rm -f "$LAUNCH_AGENTS/com.fastsigner.manager.plist"
rm -f "$LAUNCH_AGENTS/com.fastsigner.autoupdate.plist"

echo ""
echo "✅ Auto-start uninstalled successfully!"
echo ""

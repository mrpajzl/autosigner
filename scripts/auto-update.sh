#!/bin/bash

# FastSigner Auto-Update Script
# Runs automatically to check and apply updates

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/auto-update.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

log "Auto-update check started"

cd "$PROJECT_ROOT"

# Fetch latest changes
git fetch origin main --quiet 2>&1 | tee -a "$LOG_FILE"

# Check if update is available
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main)

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    log "No updates available"
    exit 0
fi

log "Update available, applying..."

# Pull changes
git pull origin main 2>&1 | tee -a "$LOG_FILE"

# Install dependencies
pnpm install 2>&1 | tee -a "$LOG_FILE"

# Build application
pnpm run build 2>&1 | tee -a "$LOG_FILE"

# Run migrations
npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"

# Zero-downtime restart
PID_FILE="/tmp/fastsigner-app.pid"
APP_PORT=3000

if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    log "Performing zero-downtime restart (old PID: $OLD_PID)"
    
    # Start new instance on temporary port
    NEW_PORT=$((APP_PORT + 1))
    PORT=$NEW_PORT NODE_ENV=production pnpm run start >> "$PROJECT_ROOT/logs/app-new.log" 2>&1 &
    NEW_PID=$!
    
    # Wait for new instance
    sleep 10
    
    # Check if new instance is ready
    if lsof -i :$NEW_PORT -sTCP:LISTEN > /dev/null 2>&1; then
        log "New instance ready, stopping old instance"
        kill $OLD_PID 2>/dev/null
        sleep 2
        kill -9 $OLD_PID 2>/dev/null
        
        # Stop new instance on temp port and start on main port
        kill $NEW_PID 2>/dev/null
        sleep 2
        
        NODE_ENV=production pnpm run start >> "$PROJECT_ROOT/logs/app.log" 2>&1 &
        FINAL_PID=$!
        echo "$FINAL_PID" > "$PID_FILE"
        
        log "Restarted with PID: $FINAL_PID"
    else
        log "ERROR: New instance failed to start, keeping old instance"
        kill $NEW_PID 2>/dev/null
    fi
else
    log "No PID file found, starting application"
    NODE_ENV=production pnpm run start >> "$PROJECT_ROOT/logs/app.log" 2>&1 &
    NEW_PID=$!
    echo "$NEW_PID" > "$PID_FILE"
    log "Started with PID: $NEW_PID"
fi

log "Auto-update completed successfully"

# Send notification (optional - can use macOS notifications)
osascript -e 'display notification "FastSigner has been updated and restarted" with title "FastSigner Auto-Update"' 2>/dev/null

exit 0

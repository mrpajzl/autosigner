#!/bin/bash

# Health Monitor - Continuous health checking and auto-recovery

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/health-monitor.log"
CHECK_INTERVAL=300  # 5 minutes

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

check_and_restart() {
    cd "$PROJECT_ROOT"
    
    PID_FILE="/tmp/fastsigner-app.pid"
    APP_PORT=3000
    
    # Check if application is running
    local is_running=false
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1 && lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
            is_running=true
        fi
    elif lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
        is_running=true
    fi
    
    if [ "$is_running" = "false" ]; then
        log "WARNING: Application is not running, attempting restart..."
        
        # Clean up stale PID file
        rm -f "$PID_FILE"
        
        # Try to restart
        NODE_ENV=production pnpm run start >> "$LOG_FILE" 2>&1 &
        local new_pid=$!
        echo "$new_pid" > "$PID_FILE"
        
        sleep 10
        
        # Check if restart was successful
        if ps -p "$new_pid" > /dev/null 2>&1 && lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
            log "SUCCESS: Application restarted successfully (PID: $new_pid)"
            osascript -e 'display notification "FastSigner was automatically restarted" with title "FastSigner Health Monitor"' 2>/dev/null
        else
            log "ERROR: Failed to restart application"
            osascript -e 'display notification "FastSigner failed to restart - manual intervention required" with title "FastSigner Health Monitor"' 2>/dev/null
        fi
    fi
    
    # Check if port is responding
    if ! curl -s http://localhost:$APP_PORT > /dev/null 2>&1; then
        log "WARNING: Application not responding on port $APP_PORT"
    fi
}

log "Health monitor started"

while true; do
    check_and_restart
    sleep $CHECK_INTERVAL
done

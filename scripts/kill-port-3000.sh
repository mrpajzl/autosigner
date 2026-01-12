#!/bin/bash

# Helper script to kill all processes on port 3000 and related Node processes

PORT=3000
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔍 Deep Cleaning Port $PORT and FastSigner Processes..."
echo ""

# Step 1: Kill processes using the port
echo "Step 1: Finding processes on port $PORT..."
PIDS=$(lsof -ti :$PORT 2>/dev/null)

if [ -n "$PIDS" ]; then
    echo "Found process(es) on port:"
    for PID in $PIDS; do
        echo "  PID: $PID"
        ps -fp $PID 2>/dev/null || echo "    (process details unavailable)"
    done
    
    echo ""
    echo "Killing port processes..."
    for PID in $PIDS; do
        echo "  Stopping PID: $PID"
        kill $PID 2>/dev/null
        sleep 1
        if ps -p $PID > /dev/null 2>&1; then
            echo "  Force killing PID: $PID"
            kill -9 $PID 2>/dev/null
        fi
    done
else
    echo "  No processes found on port $PORT"
fi

# Step 2: Kill any fastsigner related Node processes
echo ""
echo "Step 2: Finding FastSigner Node processes..."
FASTSIGNER_PIDS=$(pgrep -f "fastsigner" 2>/dev/null)

if [ -n "$FASTSIGNER_PIDS" ]; then
    echo "Found FastSigner processes:"
    for PID in $FASTSIGNER_PIDS; do
        # Skip this script's own process
        if [ $PID -ne $$ ] && [ $PID -ne $PPID ]; then
            echo "  PID: $PID"
            ps -fp $PID 2>/dev/null || true
            echo "  Stopping PID: $PID"
            kill $PID 2>/dev/null
            sleep 1
            if ps -p $PID > /dev/null 2>&1; then
                echo "  Force killing PID: $PID"
                kill -9 $PID 2>/dev/null
            fi
        fi
    done
else
    echo "  No FastSigner processes found"
fi

# Step 3: Kill any node processes in the fastsigner directory
echo ""
echo "Step 3: Finding Node processes in project directory..."
PROJECT_PIDS=$(ps aux | grep "node.*$PROJECT_ROOT" | grep -v grep | awk '{print $2}')

if [ -n "$PROJECT_PIDS" ]; then
    echo "Found project-related Node processes:"
    for PID in $PROJECT_PIDS; do
        if [ $PID -ne $$ ] && [ $PID -ne $PPID ]; then
            echo "  PID: $PID"
            ps -fp $PID 2>/dev/null || true
            kill -9 $PID 2>/dev/null
        fi
    done
else
    echo "  No project-related Node processes found"
fi

# Step 4: Clean up files
echo ""
echo "Step 4: Cleaning up stale files..."
rm -f /tmp/fastsigner-app.pid
rm -f /tmp/fastsigner-*.lock
rm -f "$PROJECT_ROOT/.output/server/.lock"
echo "  Cleaned up PID and lock files"

# Step 5: Verify port is free
echo ""
echo "Step 5: Verifying port is free..."
sleep 2

REMAINING=$(lsof -ti :$PORT 2>/dev/null)
if [ -z "$REMAINING" ]; then
    echo "✅ Port $PORT is now FREE!"
else
    echo "⚠️  Warning: Port $PORT is still in use by:"
    for PID in $REMAINING; do
        ps -fp $PID 2>/dev/null
    done
    echo ""
    echo "Run this script again or manually kill these processes:"
    echo "  kill -9 $REMAINING"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Cleanup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You can now start the application:"
echo "  ./scripts/fastsigner-manager.sh"
echo "  Then press 3 to start"
echo ""

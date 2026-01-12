#!/bin/bash

# Quick port check script

PORT=${1:-3000}

echo "🔍 Checking port $PORT..."
echo ""

PIDS=$(lsof -ti :$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ Port $PORT is FREE and available!"
    echo ""
    echo "You can start the application now."
else
    echo "❌ Port $PORT is IN USE by:"
    echo ""
    for PID in $PIDS; do
        ps -fp $PID 2>/dev/null
    done
    echo ""
    echo "To free the port, run:"
    echo "  ./scripts/kill-port-3000.sh"
fi

echo ""

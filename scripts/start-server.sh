#!/bin/bash
# AutoSigner production server startup script

cd "$(dirname "$0")/.."

# Load environment variables from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Ensure logs directory exists
mkdir -p logs

# Find node (homebrew on ARM, /usr/local on Intel, or in PATH)
if [ -x "/opt/homebrew/bin/node" ]; then
    NODE="/opt/homebrew/bin/node"
elif [ -x "/usr/local/bin/node" ]; then
    NODE="/usr/local/bin/node"
else
    NODE="node"
fi

# Start the server
exec $NODE .output/server/index.mjs


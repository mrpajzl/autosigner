#!/bin/bash
# AutoSigner production server startup script

cd "$(dirname "$0")/.."

# Load environment variables from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Ensure logs directory exists
mkdir -p logs

# Start the server
exec /opt/homebrew/bin/node .output/server/index.mjs


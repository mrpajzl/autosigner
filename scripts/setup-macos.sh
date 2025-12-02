#!/bin/bash
#
# AutoSigner M4 Mac Setup Script
# Run this script to set up AutoSigner on a fresh macOS server
#

set -e

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/opt/autosigner}"
APP_USER="${APP_USER:-_autosigner}"
APP_GROUP="${APP_GROUP:-_autosigner}"
NODE_VERSION="${NODE_VERSION:-22}"

echo "=== AutoSigner M4 Mac Setup ==="
echo ""

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo "This script must be run as root (sudo)"
    exit 1
fi

# Check macOS
if [ "$(uname)" != "Darwin" ]; then
    echo "This script is designed for macOS only"
    exit 1
fi

# Check Xcode CLI tools
if ! xcode-select -p &>/dev/null; then
    echo "Installing Xcode Command Line Tools..."
    xcode-select --install
    echo "Please wait for Xcode CLI tools to install, then run this script again"
    exit 1
fi

echo "1. Checking Node.js..."
if ! command -v node &>/dev/null; then
    echo "   Installing Node.js via Homebrew..."
    if ! command -v brew &>/dev/null; then
        echo "   Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install node@${NODE_VERSION}
    brew link node@${NODE_VERSION} --force
fi
echo "   Node.js $(node --version) installed"

echo ""
echo "2. Creating application user and directories..."
# Create service user (if not exists)
if ! dscl . -read /Users/${APP_USER} &>/dev/null; then
    # Find next available UID below 500 (service accounts)
    LAST_UID=$(dscl . -list /Users UniqueID | awk '$2 < 500 { print $2 }' | sort -n | tail -1)
    NEXT_UID=$((LAST_UID + 1))
    
    # Create group
    dscl . -create /Groups/${APP_GROUP}
    dscl . -create /Groups/${APP_GROUP} PrimaryGroupID ${NEXT_UID}
    dscl . -create /Groups/${APP_GROUP} RealName "AutoSigner Service"
    
    # Create user
    dscl . -create /Users/${APP_USER}
    dscl . -create /Users/${APP_USER} UniqueID ${NEXT_UID}
    dscl . -create /Users/${APP_USER} PrimaryGroupID ${NEXT_UID}
    dscl . -create /Users/${APP_USER} UserShell /usr/bin/false
    dscl . -create /Users/${APP_USER} RealName "AutoSigner Service"
    dscl . -create /Users/${APP_USER} NFSHomeDirectory ${INSTALL_DIR}
    
    echo "   Created user ${APP_USER} (UID: ${NEXT_UID})"
else
    echo "   User ${APP_USER} already exists"
fi

# Create directories
mkdir -p ${INSTALL_DIR}/{data,logs,public/uploads}
chown -R ${APP_USER}:${APP_GROUP} ${INSTALL_DIR}

echo ""
echo "3. Installing AutoSigner..."
# Copy application files
if [ -d "$(dirname "$0")/.." ]; then
    SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
    
    # Build first if not already built
    if [ ! -d "${SOURCE_DIR}/.output" ]; then
        echo "   Building application..."
        cd "${SOURCE_DIR}"
        npm ci
        npm run build
    fi
    
    # Copy built output
    cp -R "${SOURCE_DIR}/.output" "${INSTALL_DIR}/"
    cp -R "${SOURCE_DIR}/prisma" "${INSTALL_DIR}/"
    cp "${SOURCE_DIR}/package.json" "${INSTALL_DIR}/"
    
    # Install production dependencies
    cd ${INSTALL_DIR}
    npm ci --omit=dev
    
    chown -R ${APP_USER}:${APP_GROUP} ${INSTALL_DIR}
fi

echo ""
echo "4. Setting up database..."
cd ${INSTALL_DIR}
# Initialize database
npx prisma db push --skip-generate

echo ""
echo "5. Configuring launchd service..."
# Create environment config
cat > ${INSTALL_DIR}/.env << 'ENVEOF'
# AutoSigner Environment Configuration
# Edit these values before starting the service

NODE_ENV=production
DATABASE_URL=file:/opt/autosigner/data/autosigner.db

# IMPORTANT: Generate a random secret (at least 32 characters)
# Example: openssl rand -base64 32
CRYPTO_SECRET=REPLACE_WITH_YOUR_32_CHAR_SECRET

# Public URL where this server is accessible
PUBLIC_BASE_URL=https://your-domain.com
ENVEOF

chown ${APP_USER}:${APP_GROUP} ${INSTALL_DIR}/.env
chmod 600 ${INSTALL_DIR}/.env

# Copy launchd plist
if [ -f "${SOURCE_DIR}/com.autosigner.plist" ]; then
    cp "${SOURCE_DIR}/com.autosigner.plist" /Library/LaunchDaemons/
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit the configuration file:"
echo "   sudo nano ${INSTALL_DIR}/.env"
echo "   - Set CRYPTO_SECRET to a random 32+ character string"
echo "   - Set PUBLIC_BASE_URL to your domain"
echo ""
echo "2. Create the first superadmin user:"
echo "   cd ${INSTALL_DIR}"
echo "   sudo -u ${APP_USER} node -e \"require('./.output/server/index.mjs')\""
echo "   # Then call POST /api/bootstrap.superadmin with your credentials"
echo ""
echo "3. Load and start the service:"
echo "   sudo launchctl load /Library/LaunchDaemons/com.autosigner.plist"
echo ""
echo "4. Check logs:"
echo "   tail -f ${INSTALL_DIR}/logs/stdout.log"
echo ""
echo "5. Access the web UI at your PUBLIC_BASE_URL"
echo ""


# FastSigner

FastSigner is a Nuxt app for signing iOS/tvOS applications on an M4 Mac server. Managers upload `.ipa` files with their provisioning profile and P12 certificate; the server signs them locally using macOS native `codesign` and generates OTA installation manifests.

## Features

- **Native macOS Signing**: Uses Apple's `codesign` tool for proper iOS/tvOS code signing
- **Certificate Management**: Upload P12 certificates, automatically imported into a temporary keychain for signing
- **Provisioning Profiles**: Manage iOS and tvOS provisioning profiles per user
- **OTA Installation**: Generates `manifest.plist` for over-the-air installation
- **Multi-user**: Supports multiple managers with separate signing credentials

## Requirements

- **macOS** (tested on M4 Mac with Apple Silicon)
- **Node.js** >= 22.12.0
- **pnpm** (install with `npm install -g pnpm`)
- **Xcode Command Line Tools** (for `codesign`, `security`, `plutil`)
- **Valid Apple Developer Certificate** (.p12 format)
- **Provisioning Profiles** (.mobileprovision)

> **Note**: FastSigner runs **natively on macOS** (not in Docker) to access macOS code signing tools.

## Environment Variables

```bash
# Required
DATABASE_URL="file:./prisma/dev.db"     # SQLite database path
CRYPTO_SECRET="your-32-char-secret"      # Encryption key (32+ chars)
PUBLIC_BASE_URL="https://your.domain"    # Public URL for OTA manifests

# Optional
NODE_ENV="production"                     # Set to production for secure cookies
```

## Roles

- **Superadmin**: Approves manager accounts, manages all users
- **Manager**: Uploads apps, certificates, and provisioning profiles

## API Endpoints

### Authentication
- `POST /api/auth/register` – Create manager account (pending approval)
- `POST /api/auth/login` – Login and get session cookie
- `POST /api/auth/signout` – Sign out

### Apps
- `GET /api/apps` – List user's apps
- `POST /api/apps/upload` – Upload & sign IPA
- `POST /api/apps/:id/resign` – Re-sign app with current certificates
- `DELETE /api/apps/:id` – Delete app

### Profile (Certificates & Profiles)
- `GET /api/profile/certificates` – List certificates
- `POST /api/profile/certificates` – Upload P12 certificate
- `POST /api/profile/certificates/:id/activate` – Activate certificate
- `DELETE /api/profile/certificates/:id` – Delete certificate
- `GET /api/profile/profiles` – List provisioning profiles
- `POST /api/profile/profiles` – Upload provisioning profile
- `POST /api/profile/profiles/:id/activate` – Activate profile
- `DELETE /api/profile/profiles/:id` – Delete profile

### Admin
- `GET /api/admin/approvals` – List pending approvals
- `POST /api/admin/approvals/:id` – Approve/reject user

## Installation

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
CRYPTO_SECRET="your-super-secret-key-at-least-32-chars"
PUBLIC_BASE_URL="https://your-domain.com"
EOF
```

### File Storage / MinIO

Uploads are no longer committed into the repository. Set the following env vars to store IPA artifacts inside a MinIO bucket (or any S3-compatible endpoint):

```bash
MINIO_PUBLIC="http://127.0.0.1"
MINIO_PORT="9000"
MINIO_USER="fastsigner"
MINIO_PASSWORD="super-secret-pass"
# Optional overrides
MINIO_BUCKET="fastsigner"
MINIO_REGION="us-east-1"
# MINIO_ENDPOINT can be provided if PUBLIC/PORT should not be combined
```

When the `MINIO_*` variables are present the server streams uploads directly into the bucket; otherwise it falls back to the local `public/uploads` directory (which is now gitignored). All signing work directories live under `.workdirs/` and are cleaned up automatically.

### Migrating Existing Uploads

Run the migration script **on the production host** after configuring the env vars and before cleaning up the old files:

```bash
cd /path/to/fastsigner
node scripts/migrate-uploads-to-minio.mjs
```

The script walks `public/uploads`, copies every file to the configured bucket via the S3 API, and leaves the originals untouched so you can verify the data in MinIO before deleting the local directory.

## Development

```bash
# Start development server
pnpm run dev:local
```

## Production (Automated)

**Use the Management Console for production deployment:**

```bash
# Setup and start the manager
./scripts/setup-autostart.sh
./scripts/fastsigner-manager.sh
```

The manager provides:
- **Automated builds** with `pnpm run build`
- **Zero-downtime updates** from main branch
- **Background process management**
- **Auto-start on system boot**
- **Health monitoring and recovery**

## Production (Manual)

```bash
# Build for production
pnpm run build

# Start production server in background
NODE_ENV=production pnpm run start &
```

## 🚀 Management Console

FastSigner includes a comprehensive terminal-based management console with keyboard navigation for easy deployment and maintenance on macOS systems.

### Features

- **🎮 Keyboard Navigation**: Arrow keys, Enter, or direct number input - smooth, flicker-free
- **📊 Real-time Status**: Live dashboard showing app health, git status, and system resources
- **🔄 Zero-Downtime Updates**: Automatic updates from main branch with no service interruption
- **🏗️ Native macOS Build**: Uses `pnpm run build` for production-ready builds
- **🔄 Background Process**: App runs independently in the background
- **💾 Backup System**: Full backup and restore capabilities
- **🗄️ Database Tools**: Migrations, reset, and status checking
- **🧹 Maintenance**: Cleanup tools for logs and dependencies
- **🏁 Auto-Start**: Opens automatically on macOS startup
- **🛡️ Protected Console**: Ctrl+C trapped to prevent accidental exits
- **📈 Health Monitoring**: Auto-recovery if app crashes

### Quick Start

```bash
# Setup auto-start and launch agents
./scripts/setup-autostart.sh

# Run the manager
./scripts/fastsigner-manager.sh
```

### Navigation

- Use **↑↓ arrow keys** to navigate menus
- Press **Enter** to select the highlighted option
- Navigation is **arrow-key only** - no typing required
- All submenus support the same consistent navigation
- Smooth, flicker-free interface

For detailed deployment and management documentation, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [KEYBOARD_NAVIGATION.md](./KEYBOARD_NAVIGATION.md) - Navigation tips and tricks
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [ZERO_DOWNTIME_DEPLOYMENT.md](./ZERO_DOWNTIME_DEPLOYMENT.md) - Zero-downtime deployment guide

### Helper Scripts

If you encounter issues, these utility scripts can help:

```bash
# Fix permission issues (EACCES errors)
./scripts/fix-permissions.sh

# Kill any process using port 3000
./scripts/kill-port-3000.sh

# Check if port 3000 is free
./scripts/check-port.sh
```

These utilities are also accessible through the **Diagnostics** menu in the manager.

## How Signing Works

1. **Certificate Upload**: User uploads a P12 certificate with password
2. **Profile Upload**: User uploads a `.mobileprovision` file for iOS or tvOS
3. **App Upload**: User uploads an IPA file
4. **Signing Process**:
   - Server imports P12 into a temporary macOS keychain
   - Extracts entitlements from provisioning profile
   - Unpacks the IPA and removes old signatures
   - Signs all frameworks, plugins, and the main app bundle using `codesign`
   - Repacks the signed IPA
   - Generates OTA manifest for installation
   - Cleans up temporary keychain

## OTA Installation

Once an app is signed, users can install it via Safari on iOS/tvOS using:

```
itms-services://?action=download-manifest&url=<PUBLIC_BASE_URL>/api/download/uploads/<userId>/<appId>/manifest.plist
```

## Security Notes

- P12 passwords are encrypted at rest using AES-256-GCM
- Certificates are imported into temporary keychains that are deleted after signing
- Session cookies are HTTP-only and secure in production
- Each user can only access their own apps and credentials

## Troubleshooting

### "No valid signing identity found"
Ensure your P12 contains a valid Apple Distribution or Development certificate.

### "Missing provisioning profile"
Upload and activate a provisioning profile that matches your certificate's team ID.

### "codesign failed"
- Check that Xcode Command Line Tools are installed: `xcode-select --install`
- Verify the certificate hasn't expired
- Ensure the provisioning profile includes the device UDIDs (for Ad Hoc distribution)

## License

MIT

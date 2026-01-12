# FastSigner Deployment Guide

This guide covers the deployment and management of FastSigner on macOS systems.

## 🚀 Quick Start

### Initial Setup

1. **Install Prerequisites:**
   ```bash
   # Ensure Node.js >= 22.12.0 is installed
   node --version
   
   # Install pnpm if not already installed
   npm install -g pnpm
   
   # Ensure Xcode Command Line Tools are installed (required for code signing)
   xcode-select --install
   ```

2. **Build the Application:**
   ```bash
   cd /Users/ondrejzraly/Projects/fastsigner
   pnpm install
   pnpm run build
   npx prisma generate
   npx prisma migrate deploy
   ```

3. **Run Setup Script:**
   ```bash
   cd /Users/ondrejzraly/Projects/fastsigner
   ./scripts/setup-autostart.sh
   ```

4. **Start the Manager:**
   ```bash
   ./scripts/fastsigner-manager.sh
   ```
   
   The manager will:
   - Automatically start the application if it's not running
   - Run the app in the background as a Node.js process
   - Keep the management console always available
   - Never exit unless you explicitly choose 'q' from the menu

### First Time Usage

When you first open the manager:

1. You'll see a beautiful dashboard with real-time status information
2. The main menu will display with the first option highlighted (reverse video)
3. Use **↑/↓ arrow keys** to move through options
4. Press **Enter** to select the highlighted option
5. Navigate submenus the same way
6. Use arrows to select "Back to Main Menu" when done

**Navigation is arrow-key only** - simply highlight what you want and press Enter. Clean and simple!

## 🏗️ Architecture

FastSigner runs **natively on macOS** (not in Docker) to access macOS-specific code signing tools:

- **Application Process**: Runs as a background Node.js process on port 3000
- **Management Console**: Interactive terminal UI that runs in the foreground
- **Zero-Downtime Updates**: Blue-green deployment strategy for seamless updates
- **Auto-Recovery**: Health monitoring with automatic restart on failures
- **Build System**: Uses `pnpm` for fast, efficient package management

### Why Native macOS?

The application **must** run natively on macOS because:
- It requires `codesign` for iOS/tvOS app signing
- It needs access to macOS keychains for certificate management
- It uses macOS-specific security tools (`security`, `plutil`)
- Docker containers cannot access these macOS system tools

## 📋 Management Console Features

The FastSigner Manager provides a comprehensive terminal-based UI for managing your application with full keyboard navigation support.

### 🎮 Navigation Controls

- **Arrow Keys (↑/↓)**: Navigate through menu options
- **Enter**: Select the highlighted option

**Navigation is exclusively arrow-key based** - simply move the highlight to the desired option and press Enter. No typing required!

### User Interface

The management console features a beautiful, intuitive interface with:
- **Reverse video highlighting** for the selected menu item
- **Real-time status updates** showing application health
- **Color-coded indicators** (🟢 green = good, 🔴 red = error, 🟡 yellow = warning)
- **Smooth, flicker-free navigation** using arrow keys or direct key input
- **Smart partial redraws** - only the menu updates during navigation, no screen flashing
- **Instant response** to keypresses with zero latency
- **Consistent experience** across all menus and submenus

### Main Features

#### 1. 🔄 Pull Latest & Update (Zero Downtime)
- Fetches the latest code from the main branch
- Stashes local changes if needed
- Installs dependencies with `pnpm`
- Builds the application with `pnpm run build`
- Runs database migrations automatically
- Performs zero-downtime restart:
  1. Starts new instance on temporary port
  2. Waits for new instance to be ready
  3. Switches traffic to new instance
  4. Gracefully stops old instance
  5. Finalizes on main port
- **No service interruption during updates!**

#### 2. 🏗️ Build Application
- Installs dependencies with `pnpm install`
- Generates Prisma client
- Builds application with `pnpm run build`
- Validates build before deployment
- Does not restart the application (use Restart for that)

#### 3. ▶️ Start Application
- Starts the application as a background Node.js process
- Runs on port 3000 by default
- Waits for application to be ready
- Validates successful startup
- Shows PID (Process ID) for tracking
- Won't start if already running

#### 4. ⏸️ Stop Application
- Gracefully stops the running application
- Attempts graceful shutdown first (SIGTERM)
- Force kills if needed (SIGKILL after 10 seconds)
- Cleans up PID file
- Frees port 3000

#### 5. 🔃 Restart Application
- Stops the current application instance
- Starts a new instance
- **Brief downtime** during restart (2-5 seconds)
- Use "Pull Latest & Update" for zero-downtime restarts

#### 6. 📊 View Logs
- **Application Logs (Live)**: Real-time tail of app.log with last 100 lines
  - **Press Ctrl+C once** to stop viewing and return to menu
  - The manager stays running and returns you to the log menu
  - Safe to use - won't exit the entire manager
- **Manager Logs**: View management console activity
- **Auto-Update Logs**: See automatic update history
- **Health Monitor Logs**: Check health monitoring events
- **Migration Logs**: View database migration output
- **View All Logs**: Summary of all log files with recent entries

#### 7. 🗄️ Database Management
- **Run Migrations**: Apply pending database migrations
- **Reset Database**: Complete database reset (destructive!)
- **Backup Database**: Create a timestamped backup
- **Restore Database**: Restore from a previous backup
- **View Database Status**: Check migration status

#### 8. 💾 Backup & Restore
- **Create Full Backup**: Database + uploads archive
- **Restore from Backup**: Choose from available backups
- **List Backups**: View all backup files with sizes
- **Clean Old Backups**: Remove old backups, keep N recent

#### 9. 🧹 Cleanup & Maintenance
- **Clean Build Cache**: Remove `.nuxt` and `.output` directories
- **Clean Old Logs**: Remove logs older than 30 days
- **Clean Node Modules**: Fresh dependency install with pnpm
- **Clean Temp Files**: Remove signing work directories and temp files
- **Full Cleanup**: All of the above (keeps logs from last 7 days)

#### 0. 📈 Health Check
- Verifies all system dependencies
- Checks Node.js, pnpm, Git installations
- Validates application status
- Checks port availability
- Comprehensive system diagnostics

#### d. 🔍 Diagnostics
- **Port Status**: Check what's using port 3000
- **PID File Status**: Verify PID file and process state
- **HTTP Accessibility**: Test if app responds to requests
- **Log Files**: Check log existence and size
- **Node.js Processes**: List all running Node processes
- **Recommendations**: Smart suggestions to fix issues
- **Quick Actions**: One-click fixes for common problems

## 🤖 Automatic Features

### Process Management

The management console is designed to **never exit accidentally**:

- **Ctrl+C is trapped**: Shows a warning instead of exiting
- **Background app**: The FastSigner app runs independently in the background
- **PID tracking**: Process ID is stored in `/tmp/fastsigner-app.pid`
- **Persistent console**: The manager stays open for monitoring and control
- **Proper exit**: Only exits when you select 'q' from the main menu

### Auto-Start on System Boot

The manager automatically opens in a Terminal window on system startup.

**To disable:**
```bash
launchctl bootout gui/$(id -u)/com.fastsigner.manager
```

**To enable:**
```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.fastsigner.manager.plist
```

### Auto-Updates

The system automatically checks for updates daily at 3:00 AM and applies them if available.

**To disable auto-updates:**
```bash
launchctl bootout gui/$(id -u)/com.fastsigner.autoupdate
```

**To change update schedule:**
Edit `~/Library/LaunchAgents/com.fastsigner.autoupdate.plist` and modify the `StartCalendarInterval` section.

### Health Monitoring (Optional)

For continuous health monitoring with auto-recovery:

```bash
# Run in a separate terminal or as a background service
./scripts/health-monitor.sh
```

This monitors the application every 5 minutes and automatically restarts it if down.

## 📊 Status Dashboard

The manager displays real-time status information:

- **Application Status**: Running or Stopped
- **Git Branch**: Current branch and commit hash
- **Local Changes**: Number of uncommitted files
- **Updates Available**: Indicates if updates are ready
- **CPU Usage**: Current CPU utilization
- **Memory Usage**: RAM consumption
- **Disk Usage**: Storage space used
- **Recent Activity**: Last 3 log entries

## 📁 File Locations

```
/Users/ondrejzraly/Projects/fastsigner/
├── scripts/
│   ├── fastsigner-manager.sh      # Main management console
│   ├── auto-update.sh             # Automatic update script
│   ├── health-monitor.sh          # Health monitoring daemon
│   ├── setup-autostart.sh         # Setup script
│   └── uninstall-autostart.sh     # Removal script
├── logs/
│   ├── manager.log                # Manager activity log
│   ├── auto-update.log            # Auto-update log
│   └── health-monitor.log         # Health check log
├── backups/
│   ├── db_backup_*.db             # Database backups
│   └── full_backup_*.tar.gz       # Full system backups
├── com.fastsigner.manager.plist   # Launch agent config
└── com.fastsigner.autoupdate.plist # Auto-update config
```

## 🔧 Troubleshooting

### Manager Won't Start

```bash
# Check if already running
ps aux | grep fastsigner-manager

# Remove lock file if stuck
rm -f /tmp/fastsigner-manager.lock

# Check launch agent status
launchctl list | grep fastsigner
```

### Application Won't Start

```bash
# Check Docker is running
docker ps

# Check Docker Compose file
cd /Users/ondrejzraly/Projects/fastsigner
docker-compose -f docker-compose.dev.yml config

# View detailed logs
docker-compose -f docker-compose.dev.yml logs
```

### Auto-Updates Not Working

```bash
# Check auto-update log
tail -f /Users/ondrejzraly/Projects/fastsigner/logs/auto-update.log

# Check launch agent status
launchctl list | grep autoupdate

# Manually trigger update
./scripts/auto-update.sh
```

### Database Issues

```bash
# Check database file exists
ls -lh /Users/ondrejzraly/Projects/fastsigner/prisma/dev.db

# Run migrations manually
cd /Users/ondrejzraly/Projects/fastsigner
npx prisma migrate deploy

# Check database status
npx prisma db status
```

## 🔐 Security Considerations

1. **Backup Before Updates**: Auto-updates run at 3 AM - ensure backups are configured
2. **Git Credentials**: Ensure Git has proper authentication for pulling updates
3. **File Permissions**: Scripts require execute permissions
4. **Port Security**: Port 3000 should be firewalled if exposed

## 📝 Logs and Monitoring

### View Logs

```bash
# Manager logs
tail -f /Users/ondrejzraly/Projects/fastsigner/logs/manager.log

# Auto-update logs
tail -f /Users/ondrejzraly/Projects/fastsigner/logs/auto-update.log

# Application logs (via manager or directly)
docker-compose -f docker-compose.dev.yml logs -f
```

### Log Rotation

Logs older than 30 days are automatically cleaned via the "Clean Old Logs" option in the Cleanup menu.

## 🎯 Best Practices

1. **Regular Backups**: Create backups before major changes
2. **Test Updates**: Review update logs after auto-updates
3. **Monitor Resources**: Keep an eye on CPU/Memory usage
4. **Clean Regularly**: Use cleanup tools to free space
5. **Health Checks**: Run health checks after system changes

## 🚫 Uninstalling

To completely remove auto-start and auto-update:

```bash
./scripts/uninstall-autostart.sh
```

To remove all data:

```bash
./scripts/uninstall-autostart.sh
rm -rf /Users/ondrejzraly/Projects/fastsigner/logs
rm -rf /Users/ondrejzraly/Projects/fastsigner/backups
```

## 📞 Support

For issues or questions:
1. Check the logs first
2. Run health check for diagnostics
3. Review error messages in the manager console
4. Check Docker Desktop is running

## 🔄 Manual Operations

If you prefer manual control, you can always use Docker Compose directly:

```bash
cd /Users/ondrejzraly/Projects/fastsigner

# Start
docker-compose -f docker-compose.dev.yml up -d

# Stop
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild
docker-compose -f docker-compose.dev.yml build
```

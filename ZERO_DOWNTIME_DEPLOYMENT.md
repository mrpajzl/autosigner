# Zero-Downtime Deployment Guide

FastSigner now supports **zero-downtime deployments** using a blue-green deployment strategy. The application runs natively on macOS as a background Node.js process, managed by an interactive terminal console.

## 🎯 Key Features

### 1. Native macOS Execution
- **No Docker**: Runs directly on macOS to access code signing tools
- **Background Process**: App runs as a Node.js process on port 3000
- **PID Tracking**: Process ID stored in `/tmp/fastsigner-app.pid`
- **Independent Operation**: App and manager run independently

### 2. Zero-Downtime Updates
- **Blue-Green Deployment**: New instance starts before old one stops
- **Automatic Migrations**: Database migrations run before restart
- **Build Integration**: Uses `pnpm run build` for production builds
- **Fallback Safety**: Keeps old instance if new one fails to start

### 3. Protected Management Console
- **Ctrl+C Trapped**: Prevents accidental exits
- **Always Running**: Console stays open for monitoring
- **Background App**: App continues running even if console closes
- **Proper Exit**: Only exits when you select 'q' from menu

## 🔄 How Zero-Downtime Works

### Update Process Flow

```
1. Git Pull → Pull latest code from main branch
2. pnpm install → Install/update dependencies
3. pnpm run build → Build production bundle
4. Database Migrations → Apply pending migrations
5. Start New Instance → Launch on temporary port (3001)
6. Health Check → Wait for new instance to be ready
7. Stop Old Instance → Gracefully terminate old process
8. Port Switch → Stop temp instance, start on main port
9. Verify → Confirm application is running on port 3000
```

### Deployment Strategy

```
┌─────────────────────────────────────────────────────┐
│                   ZERO DOWNTIME                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Old Instance (Port 3000)                          │
│  ████████████████ ← Serving Traffic                │
│                                                     │
│  New Instance (Port 3001)                          │
│  ░░░░░░░░░░░░░░░░ ← Starting Up                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│              ⬇️  New Instance Ready                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Old Instance (Port 3000)                          │
│  ░░░░░░░░░░░░░░░░ ← Stopping                       │
│                                                     │
│  New Instance (Port 3001)                          │
│  ████████████████ ← Serving Traffic                │
│                                                     │
├─────────────────────────────────────────────────────┤
│            ⬇️  Switch to Main Port                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  New Instance (Port 3000)                          │
│  ████████████████ ← Serving Traffic                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🚀 Usage

### Initial Setup

```bash
# Ensure pnpm is installed
npm install -g pnpm

# Build the application
cd /Users/ondrejzraly/Projects/fastsigner
pnpm install
pnpm run build
npx prisma migrate deploy

# Setup auto-start
./scripts/setup-autostart.sh

# Start the manager
./scripts/fastsigner-manager.sh
```

### Performing Updates

#### Option 1: Via Management Console (Recommended)

1. Open the management console (auto-opens on boot)
2. Press `1` or navigate to "Pull Latest & Update"
3. Confirm if you have local changes
4. Wait for zero-downtime update to complete
5. Application remains accessible throughout!

#### Option 2: Automatic Daily Updates

- Configured to run at 3:00 AM daily
- Automatically pulls, builds, and deploys
- No manual intervention needed
- Sends macOS notification on completion

#### Option 3: Manual Script

```bash
./scripts/auto-update.sh
```

## 📊 Process Management

### Application Status

The app status is displayed in the management console dashboard:

```
📊 System Status
═══════════════════════════════════════════════════════
  ● Application: RUNNING (port 3000)
  ● Branch: main (abc123f)
  ● Changes: Clean working directory
  ● Updates: Up to date
```

### Process Control

| Command | Action | Downtime |
|---------|--------|----------|
| Start | Launch application | None (if not running) |
| Stop | Gracefully stop app | Yes |
| Restart | Stop and start | 2-5 seconds |
| Pull & Update | Zero-downtime restart | **None!** |

### Process Lifecycle

```bash
# Check if app is running
lsof -i :3000 -sTCP:LISTEN

# View PID
cat /tmp/fastsigner-app.pid

# View logs
tail -f /Users/ondrejzraly/Projects/fastsigner/logs/app.log

# Manual start (if needed)
cd /Users/ondrejzraly/Projects/fastsigner
NODE_ENV=production pnpm run start >> logs/app.log 2>&1 &
echo $! > /tmp/fastsigner-app.pid
```

## 🛡️ Safety Features

### 1. Automatic Application Start
- Manager checks if app is running on startup
- Auto-starts if not running
- Shows status in dashboard

### 2. Protected Console
```bash
# Ctrl+C is trapped
^C
⚠️  Use 'q' from the menu to exit properly

# Manager keeps running
# App keeps running in background
```

### 3. Health Monitoring

Optional continuous monitoring:

```bash
./scripts/health-monitor.sh &
```

Features:
- Checks every 5 minutes
- Auto-restarts if app crashes
- Sends macOS notifications
- Logs all events

### 4. Rollback on Failure

If deployment fails:
- Old instance continues running
- Error logged
- User notified
- Manual intervention available

## 📝 Configuration

### Environment Variables

Create `.env` file:

```bash
DATABASE_URL="file:./prisma/dev.db"
CRYPTO_SECRET="your-32-char-secret-key-minimum"
PUBLIC_BASE_URL="https://your-domain.com"
NODE_ENV="production"

# Optional MinIO/S3 configuration
MINIO_PUBLIC="http://127.0.0.1"
MINIO_PORT="9000"
MINIO_USER="fastsigner"
MINIO_PASSWORD="secret"
```

### Port Configuration

Default: 3000

To change:

```bash
# In fastsigner-manager.sh
APP_PORT=3000  # Change this value
```

### Auto-Update Schedule

Default: Daily at 3:00 AM

To change:

```bash
# Edit ~/Library/LaunchAgents/com.fastsigner.autoupdate.plist
<key>StartCalendarInterval</key>
<dict>
    <key>Hour</key>
    <integer>3</integer>   <!-- Change hour -->
    <key>Minute</key>
    <integer>0</integer>   <!-- Change minute -->
</dict>
```

Then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.fastsigner.autoupdate.plist
launchctl load ~/Library/LaunchAgents/com.fastsigner.autoupdate.plist
```

## 🔧 Troubleshooting

### App Won't Start

```bash
# Check if port is in use
lsof -i :3000

# Check logs
tail -50 /Users/ondrejzraly/Projects/fastsigner/logs/app.log

# Check PID file
cat /tmp/fastsigner-app.pid
ps -p $(cat /tmp/fastsigner-app.pid)

# Clean start
rm -f /tmp/fastsigner-app.pid
cd /Users/ondrejzraly/Projects/fastsigner
NODE_ENV=production pnpm run start
```

### Zero-Downtime Restart Fails

```bash
# Check logs
tail -50 /Users/ondrejzraly/Projects/fastsigner/logs/app-new.log

# Check if temp port is blocked
lsof -i :3001

# Fallback to regular restart
# Use option 5 from management console
```

### Build Failures

```bash
# Clear node_modules
cd /Users/ondrejzraly/Projects/fastsigner
rm -rf node_modules .nuxt .output

# Fresh install
pnpm install
pnpm run build
```

### Database Migration Issues

```bash
# Check migration status
npx prisma migrate status

# View migration logs
cat /Users/ondrejzraly/Projects/fastsigner/logs/migration.log

# Manual migration
npx prisma migrate deploy
```

## 📈 Monitoring

### Application Health

```bash
# HTTP health check
curl http://localhost:3000

# Process health
ps aux | grep "pnpm.*start"

# Port status
netstat -an | grep 3000
```

### Logs

All logs are stored in the `logs/` directory:

| Log File | Purpose | View in Console |
|----------|---------|-----------------|
| `logs/app.log` | Main application output | Option 6 → 1 |
| `logs/manager.log` | Management console actions | Option 6 → 2 |
| `logs/auto-update.log` | Automatic update events | Option 6 → 3 |
| `logs/health-monitor.log` | Health check events | Option 6 → 4 |
| `logs/migration.log` | Database migrations | Option 6 → 5 |

**View logs via console:**
- Press `6` from main menu to access log viewer
- Choose specific log or view all logs summary
- Live tail available for application logs

### Metrics

Available in management console:
- CPU usage
- Memory usage
- Disk usage
- Git status
- Update availability
- Application status

## 🎯 Best Practices

### 1. Regular Backups

```bash
# Before major updates
# Use management console → Backup & Restore → Create Full Backup
```

### 2. Test Updates

```bash
# Pull changes first
git fetch origin main

# Review changes
git log HEAD..origin/main

# Then update via console
```

### 3. Monitor During Updates

Watch the management console output during updates to ensure:
- New instance starts successfully
- Health checks pass
- Old instance stops cleanly
- Port switch completes

### 4. Keep Logs Clean

```bash
# Use cleanup menu option 2
# Or manually:
find logs/ -name "*.log" -mtime +30 -delete
```

### 5. Health Monitoring

Enable continuous monitoring for production:

```bash
./scripts/health-monitor.sh &
```

## 🚦 Production Checklist

Before going live:

- [ ] pnpm installed globally
- [ ] Application builds successfully
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Auto-start configured
- [ ] Health monitoring enabled
- [ ] Backup schedule configured
- [ ] Logs directory created
- [ ] Firewall configured (if needed)
- [ ] SSL/TLS certificates configured (if needed)

## 📚 Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [KEYBOARD_NAVIGATION.md](./KEYBOARD_NAVIGATION.md) - Console navigation
- [README.md](./README.md) - General documentation

## 🎉 Summary

FastSigner now provides:

✅ **Zero-downtime deployments**
✅ **Native macOS execution** 
✅ **Background process management**
✅ **Protected management console**
✅ **Automatic updates**
✅ **Health monitoring**
✅ **Easy rollback**
✅ **Production-ready**

Deploy with confidence! 🚀

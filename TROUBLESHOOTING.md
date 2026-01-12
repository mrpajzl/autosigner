# FastSigner Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue 0: Git Remote Not Found

**Symptoms:**
- "Pull Latest & Update" fails
- Error: "fatal: 'origin' does not appear to be a git repository"
- Can't fetch updates

**Cause:**
The git repository doesn't have a remote named 'origin', or has a different remote name.

**Solution:**

The scripts now auto-detect your git remote name! But if you see this error on an older version:

```bash
# Check your current remotes
git remote -v

# If you have no remotes, add one:
git remote add origin https://github.com/your-repo/fastsigner.git

# If your remote has a different name (e.g., 'autosigner'), either:

# Option 1: Let the script auto-detect it (recommended - now built-in)
# Just use the latest version of the manager

# Option 2: Add an 'origin' alias
git remote add origin $(git remote get-url autosigner)
```

The manager will automatically detect and use whatever remote name you have configured.

---

### Issue 1: Can't Exit Live Log Viewer

**Symptoms:**
- Viewing live logs (option 6 → 1)
- Press Ctrl+C but nothing happens
- Have to kill the entire terminal

**Cause:**
The Ctrl+C trap was preventing interruption of the log viewer.

**Solution:**
This is now fixed! The log viewer temporarily allows Ctrl+C to work:
- Press **Ctrl+C** once to stop viewing logs
- You'll return to the menu automatically
- The manager continues running normally

If you're on an older version, update the manager script.

---

### Issue 2: Multiple Processes on Port 3000

**Symptoms:**
- "Application is already running" but you can't access it
- Stop command shows multiple PIDs
- Error: "arguments must be process or job IDs"

**Cause:**
Multiple Node.js processes are occupying port 3000, possibly from:
- Previous failed starts
- Manual starts without the manager
- Crashed processes that didn't clean up

**Solution 1: Use the Quick Helper Script** ⚡ (Fastest)

```bash
cd /Users/ondrejzraly/Projects/fastsigner
./scripts/kill-port-3000.sh
```

This will:
- Find all processes on port 3000
- Stop them gracefully
- Force kill if needed
- Clean up PID files
- Prepare for fresh start

**Solution 2: Use the Management Console**

```bash
./scripts/fastsigner-manager.sh

# Then:
# 1. Press 'd' for Diagnostics
# 2. Choose option 1: "Clean up stale files and start fresh"
```

**Solution 3: Manual Cleanup**

```bash
# Find all processes on port 3000
lsof -ti :3000

# Kill them (replace with actual PIDs shown)
kill -9 20432 46923 89452

# Clean up
rm -f /tmp/fastsigner-app.pid

# Start fresh
cd /Users/ondrejzraly/Projects/fastsigner
./scripts/fastsigner-manager.sh
# Press 3 to start
```

---

### Issue 3: No Application Logs

**Symptoms:**
- "No application logs found yet"
- Can't see application output
- Log file doesn't exist

**Cause:**
Application was started without log redirection or outside the manager.

**Solution:**

From the logs viewer menu:
```bash
# Press 6 from main menu
# Press 1 for Application Logs
# Choose option 1: "Restart the app with proper logging"
```

Or restart manually:
```bash
cd /Users/ondrejzraly/Projects/fastsigner
mkdir -p logs

# Kill any existing processes
./scripts/kill-port-3000.sh

# Start with logging
NODE_ENV=production pnpm run start >> logs/app.log 2>&1 &
echo $! > /tmp/fastsigner-app.pid
```

---

### Issue 4: Application Won't Start

**Symptoms:**
- Timeout waiting for port
- Process starts but dies immediately
- "Failed to start application"

**Solution:**

1. **Check the logs:**
```bash
tail -50 /Users/ondrejzraly/Projects/fastsigner/logs/app.log
```

2. **Check for errors:**
- Missing dependencies: Run `pnpm install`
- Database issues: Run `npx prisma migrate deploy`
- Port in use: Run `./scripts/kill-port-3000.sh`
- Build errors: Run `pnpm run build`

3. **Try diagnostics:**
```bash
# In manager, press 'd'
# Review the diagnostics output
# Follow the recommendations
```

---

### Issue 5: Stale PID File

**Symptoms:**
- "Process not running (stale PID file)"
- Manager thinks app is running but it's not
- Can't start because PID file exists

**Solution:**

```bash
# Remove stale PID file
rm -f /tmp/fastsigner-app.pid

# Clean up lock files
rm -f /tmp/fastsigner-*.lock

# Start fresh from manager
./scripts/fastsigner-manager.sh
# Press 3 to start
```

---

### Issue 6: Build Failures

**Symptoms:**
- "Build failed"
- TypeScript errors
- Module not found errors

**Solution:**

```bash
cd /Users/ondrejzraly/Projects/fastsigner

# Clean everything
rm -rf node_modules .nuxt .output

# Fresh install
pnpm install

# Regenerate Prisma client
npx prisma generate

# Build
pnpm run build
```

---

### Issue 7: Database Migration Errors

**Symptoms:**
- "Migration failed"
- "Database is not in sync"
- SQL errors

**Solution:**

```bash
cd /Users/ondrejzraly/Projects/fastsigner

# Check migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy

# If migrations are broken, reset (⚠️ deletes data):
npx prisma migrate reset --force
```

---

### Issue 8: Zero-Downtime Update Failed

**Symptoms:**
- New instance failed to start
- Update rolled back
- Old version still running

**Solution:**

1. **Check the logs:**
```bash
tail -50 /Users/ondrejzraly/Projects/fastsigner/logs/app-new.log
```

2. **Manual update:**
```bash
cd /Users/ondrejzraly/Projects/fastsigner

# Pull updates
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm run build

# Run migrations
npx prisma migrate deploy

# Restart (not zero-downtime but reliable)
# From manager: Press 5
```

---

### Issue 9: Port Permission Denied

**Symptoms:**
- "Permission denied" when binding to port
- "EADDRINUSE" error

**Solution:**

```bash
# Check if running as correct user
whoami

# Make sure nothing system-level is on port 3000
sudo lsof -i :3000

# If needed, change port in .env:
# Edit .env and add:
PORT=3001

# Then update manager script APP_PORT variable
```

---

## 🔧 Diagnostic Commands

### Check Application Status
```bash
# Is port 3000 in use?
lsof -i :3000

# What processes are running?
ps aux | grep -E "(node|pnpm)" | grep -v grep

# Check PID file
cat /tmp/fastsigner-app.pid
ps -p $(cat /tmp/fastsigner-app.pid 2>/dev/null) 2>/dev/null

# Test HTTP
curl -I http://localhost:3000
```

### Check Logs
```bash
# Application logs
tail -f /Users/ondrejzraly/Projects/fastsigner/logs/app.log

# Manager logs
tail -f /Users/ondrejzraly/Projects/fastsigner/logs/manager.log

# All logs
ls -lh /Users/ondrejzraly/Projects/fastsigner/logs/
```

### Check Build Status
```bash
# Check if built
ls -la /Users/ondrejzraly/Projects/fastsigner/.output

# Check Prisma client
ls -la /Users/ondrejzraly/Projects/fastsigner/node_modules/.prisma/client
```

---

## 🆘 Emergency Reset

If nothing else works, complete reset:

```bash
cd /Users/ondrejzraly/Projects/fastsigner

# 1. Stop everything
./scripts/kill-port-3000.sh

# 2. Clean build artifacts
rm -rf .nuxt .output node_modules

# 3. Fresh install
pnpm install

# 4. Regenerate Prisma
npx prisma generate

# 5. Build
pnpm run build

# 6. Apply migrations
npx prisma migrate deploy

# 7. Start fresh
./scripts/fastsigner-manager.sh
# Press 3 to start
```

---

## 📞 Getting Help

### Before Asking for Help

1. Run diagnostics: Press `d` in the manager
2. Check logs: `tail -50 logs/app.log`
3. Try the emergency reset above
4. Note any error messages

### Include This Information

```bash
# System info
sw_vers
node --version
pnpm --version

# Process status
lsof -i :3000
ps aux | grep node | grep -v grep

# Recent logs
tail -20 logs/app.log
tail -20 logs/manager.log

# File status
ls -la /tmp/fastsigner-*
ls -la .output/
```

---

## ✅ Preventive Maintenance

### Daily
- Check logs for errors
- Monitor system resources (memory, disk)

### Weekly
- Clean old logs: Use cleanup menu (option 9 → 2)
- Check for updates: Use pull & update (option 1)

### Monthly
- Full backup: Use backup menu (option 8 → 1)
- Clean build cache: Use cleanup menu (option 9 → 1)

---

## 🎯 Quick Reference

| Problem | Quick Fix |
|---------|-----------|
| Multiple processes | `./scripts/kill-port-3000.sh` |
| Stale PID | `rm -f /tmp/fastsigner-app.pid` |
| No logs | Restart from logs viewer (6 → 1 → 1) |
| Won't start | Run diagnostics (d → 1) |
| Build error | Clean & rebuild (9 → 3) |
| Database error | Run migrations (7 → 1) |

---

**Remember:** The diagnostics tool (`d` from main menu) can automatically detect and fix most issues!

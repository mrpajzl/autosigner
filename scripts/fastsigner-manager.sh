#!/bin/bash

# FastSigner Manager - Terminal UI for managing the FastSigner application
# This script provides a menu-driven interface for updates, monitoring, and maintenance

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOCK_FILE="/tmp/fastsigner-manager.lock"
STATUS_FILE="/tmp/fastsigner-status.json"
PID_FILE="/tmp/fastsigner-app.pid"
APP_PORT=3000

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color
CLEAR='\033[2J'
HOME_CURSOR='\033[H'
REVERSE='\033[7m' # Reverse video
NORMAL='\033[27m' # Normal video

# Create necessary directories
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" >> "$LOG_DIR/manager.log"
}

# Display header
show_header() {
    echo -e "${CLEAR}${HOME_CURSOR}"
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${BOLD}              🚀 FastSigner Management Console 🚀               ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Get application status
get_app_status() {
    # Check if PID file exists and process is running
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            # Verify it's actually listening on the port
            if lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
                echo "running"
                return 0
            fi
        fi
    fi
    
    # Check if something is listening on the port (even without PID file)
    if lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
        echo "running"
        return 0
    fi
    
    echo "stopped"
}

# Get current git branch and status
get_git_status() {
    cd "$PROJECT_ROOT"
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    local hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local status=$(git status --porcelain 2>/dev/null | wc -l | xargs)
    echo "$branch|$hash|$status"
}

# Check for available updates
check_updates() {
    cd "$PROJECT_ROOT"
    git fetch origin main --quiet 2>/dev/null || return 1
    local local_hash=$(git rev-parse HEAD)
    local remote_hash=$(git rev-parse origin/main)
    
    if [ "$local_hash" != "$remote_hash" ]; then
        echo "available"
    else
        echo "up-to-date"
    fi
}

# Get system resources
get_system_resources() {
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    local mem_usage=$(vm_stat | awk '/Pages active/ {active=$3} /Pages wired/ {wired=$4} END {printf "%.1f", (active+wired)*4096/1024/1024/1024}')
    local disk_usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    echo "$cpu_usage|$mem_usage|$disk_usage"
}

# Display status dashboard
show_status() {
    local app_status=$(get_app_status)
    local git_info=$(get_git_status)
    local update_status=$(check_updates)
    local resources=$(get_system_resources)
    
    IFS='|' read -r branch hash changes <<< "$git_info"
    IFS='|' read -r cpu mem disk <<< "$resources"
    
    echo -e "${WHITE}${BOLD}📊 System Status${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    # Application status
    if [ "$app_status" = "running" ]; then
        echo -e "  ${GREEN}●${NC} Application: ${GREEN}${BOLD}RUNNING${NC} (port $APP_PORT)"
    else
        echo -e "  ${RED}●${NC} Application: ${RED}${BOLD}STOPPED${NC}"
    fi
    
    # Git status
    echo -e "  ${BLUE}●${NC} Branch: ${CYAN}$branch${NC} (${GRAY}$hash${NC})"
    if [ "$changes" -gt 0 ]; then
        echo -e "  ${YELLOW}●${NC} Changes: ${YELLOW}$changes uncommitted files${NC}"
    else
        echo -e "  ${GREEN}●${NC} Changes: ${GREEN}Clean working directory${NC}"
    fi
    
    # Update status
    if [ "$update_status" = "available" ]; then
        echo -e "  ${YELLOW}●${NC} Updates: ${YELLOW}${BOLD}AVAILABLE${NC}"
    else
        echo -e "  ${GREEN}●${NC} Updates: ${GREEN}Up to date${NC}"
    fi
    
    # System resources
    echo ""
    echo -e "${WHITE}${BOLD}💻 System Resources${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${CYAN}●${NC} CPU Usage: ${cpu}%"
    echo -e "  ${CYAN}●${NC} Memory: ${mem} GB"
    echo -e "  ${CYAN}●${NC} Disk Usage: ${disk}%"
    
    # Recent logs
    echo ""
    echo -e "${WHITE}${BOLD}📝 Recent Activity${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    if [ -f "$LOG_DIR/manager.log" ]; then
        tail -n 3 "$LOG_DIR/manager.log" | while read -r line; do
            echo -e "  ${DIM}$line${NC}"
        done
    else
        echo -e "  ${DIM}No recent activity${NC}"
    fi
    echo ""
}

# Menu items array
MENU_ITEMS=(
    "1:🔄 Pull Latest & Update"
    "2:🏗️  Build Application"
    "3:▶️  Start Application"
    "4:⏸️  Stop Application"
    "5:🔃 Restart Application"
    "6:📊 View Logs"
    "7:🗄️  Database Management"
    "8:💾 Backup & Restore"
    "9:🧹 Cleanup & Maintenance"
    "0:📈 Health Check"
    "d:🔍 Diagnostics"
    "q:🚪 Exit"
)

# Show main menu with keyboard navigation
show_menu() {
    local selected=$1
    local clear_before=${2:-true}
    
    # Save cursor position for menu area
    local menu_start_line=20
    
    if [ "$clear_before" = "true" ]; then
        echo ""
    else
        # Move cursor to menu position and clear from there
        tput cup $menu_start_line 0 2>/dev/null || echo ""
        tput ed 2>/dev/null || echo ""
    fi
    
    echo -e "${WHITE}${BOLD}🎯 Main Menu${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    local idx=0
    for item in "${MENU_ITEMS[@]}"; do
        IFS=':' read -r key label <<< "$item"
        
        if [ $idx -eq $selected ]; then
            # Highlighted item
            if [ "$key" = "q" ]; then
                echo -e "${REVERSE}  ${RED}${key}${NC}${REVERSE}) ${label}  ${NORMAL}"
            else
                echo -e "${REVERSE}  ${GREEN}${key}${NC}${REVERSE}) ${label}  ${NORMAL}"
            fi
        else
            # Normal item
            if [ "$key" = "q" ]; then
                echo -e "  ${RED}${key}${NC}) ${label}"
            else
                echo -e "  ${GREEN}${key}${NC}) ${label}"
            fi
        fi
        ((idx++))
    done
    
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${DIM}Use ↑↓ arrows to navigate, Enter to select${NC}"
}

# Read single keypress including arrow keys
read_key() {
    local key
    IFS= read -rsn1 key 2>/dev/null
    
    # Check for escape sequence (arrow keys)
    if [[ $key == $'\x1b' ]]; then
        read -rsn2 key 2>/dev/null
        case $key in
            '[A') echo "UP" ;;
            '[B') echo "DOWN" ;;
            *) echo "ESC" ;;
        esac
    elif [[ $key == "" ]]; then
        echo "ENTER"
    else
        echo "$key"
    fi
}

# Get the choice key for the selected index
get_choice_from_index() {
    local idx=$1
    local item="${MENU_ITEMS[$idx]}"
    IFS=':' read -r key label <<< "$item"
    echo "$key"
}

# Generic submenu display with keyboard navigation
show_submenu() {
    local title=$1
    local selected=$2
    local clear_before=${3:-true}
    shift 3
    local items=("$@")
    
    if [ "$clear_before" = "true" ]; then
        echo ""
    else
        # Clear from current position down
        tput cup 2 0 2>/dev/null || echo ""
        tput ed 2>/dev/null || echo ""
    fi
    
    echo -e "${WHITE}${BOLD}${title}${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    local idx=0
    for item in "${items[@]}"; do
        IFS=':' read -r key label <<< "$item"
        
        if [ $idx -eq $selected ]; then
            # Highlighted item
            if [ "$key" = "b" ] || [ "$key" = "B" ]; then
                echo -e "${REVERSE}  ${RED}${key}${NC}${REVERSE}) ${label}  ${NORMAL}"
            else
                echo -e "${REVERSE}  ${GREEN}${key}${NC}${REVERSE}) ${label}  ${NORMAL}"
            fi
        else
            # Normal item
            if [ "$key" = "b" ] || [ "$key" = "B" ]; then
                echo -e "  ${RED}${key}${NC}) ${label}"
            else
                echo -e "  ${GREEN}${key}${NC}) ${label}"
            fi
        fi
        ((idx++))
    done
    
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${DIM}Use ↑↓ arrows to navigate, Enter to select${NC}"
}

# Generic submenu navigation handler
handle_submenu_navigation() {
    shift  # Skip the title
    local items=("$@")
    local selected_index=0
    local menu_size=${#items[@]}
    local choice=""
    
    while true; do
        # Read key input
        local key=$(read_key)
        
        case $key in
            UP)
                ((selected_index--))
                if [ $selected_index -lt 0 ]; then
                    selected_index=$((menu_size - 1))
                fi
                return $selected_index
                ;;
            DOWN)
                ((selected_index++))
                if [ $selected_index -ge $menu_size ]; then
                    selected_index=0
                fi
                return $selected_index
                ;;
            ENTER)
                # Get choice from selected index
                local item="${items[$selected_index]}"
                IFS=':' read -r choice label <<< "$item"
                echo "$choice|$selected_index"
                return 0
                ;;
            *)
                # Direct key input
                local idx=0
                for item in "${items[@]}"; do
                    IFS=':' read -r item_key label <<< "$item"
                    if [ "$item_key" = "$key" ] || [ "$item_key" = "$(echo $key | tr '[:upper:]' '[:lower:]')" ]; then
                        echo "$item_key|$idx"
                        return 0
                    fi
                    ((idx++))
                done
                # Invalid key - return current state
                return $selected_index
                ;;
        esac
    done
}

# Pull and update with zero downtime
pull_update() {
    echo -e "\n${CYAN}${BOLD}🔄 Updating FastSigner (Zero Downtime)...${NC}\n"
    log "INFO" "Starting zero-downtime update process"
    
    cd "$PROJECT_ROOT"
    
    # Check for uncommitted changes
    if [ "$(git status --porcelain | wc -l)" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
        echo -n "Stash changes and continue? (y/n): "
        read -r stash_choice
        if [ "$stash_choice" = "y" ]; then
            git stash
            log "INFO" "Stashed local changes"
        else
            echo -e "${RED}Update cancelled${NC}"
            return 1
        fi
    fi
    
    echo -e "${BLUE}→ Fetching latest changes...${NC}"
    git fetch origin main
    
    echo -e "${BLUE}→ Pulling main branch...${NC}"
    git pull origin main
    
    echo -e "${BLUE}→ Installing dependencies with pnpm...${NC}"
    pnpm install
    
    echo -e "${BLUE}→ Building application...${NC}"
    pnpm run build
    
    echo -e "${BLUE}→ Running database migrations...${NC}"
    npx prisma migrate deploy 2>&1 | tee -a "$LOG_DIR/migration.log" || echo "  ${YELLOW}No migrations to apply${NC}"
    
    # Zero-downtime restart
    if [ "$(get_app_status)" = "running" ]; then
        echo -e "${BLUE}→ Performing zero-downtime restart...${NC}"
        restart_app_zero_downtime
    else
        echo -e "${YELLOW}→ Application not running, starting now...${NC}"
        start_app
    fi
    
    echo -e "${GREEN}✓ Update completed successfully with zero downtime!${NC}"
    log "INFO" "Zero-downtime update completed successfully"
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Build application
build_app() {
    echo -e "\n${CYAN}${BOLD}🏗️  Building FastSigner...${NC}\n"
    log "INFO" "Starting build process"
    
    cd "$PROJECT_ROOT"
    
    echo -e "${BLUE}→ Installing dependencies with pnpm...${NC}"
    pnpm install
    
    echo -e "${BLUE}→ Generating Prisma client...${NC}"
    npx prisma generate
    
    echo -e "${BLUE}→ Building application with pnpm...${NC}"
    pnpm run build
    
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    log "INFO" "Build completed successfully"
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Start application
start_app() {
    echo -e "\n${CYAN}${BOLD}▶️  Starting FastSigner...${NC}\n"
    log "INFO" "Starting application"
    
    cd "$PROJECT_ROOT"
    
    # Check if something is already on the port
    if lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
        local existing_pid=$(lsof -ti :$APP_PORT 2>/dev/null | head -1)
        echo -e "${YELLOW}⚠️  Something is already running on port $APP_PORT${NC}"
        echo -e "${GRAY}Process PID: $existing_pid${NC}"
        
        # Check if it's our managed process
        if [ -f "$PID_FILE" ]; then
            local our_pid=$(cat "$PID_FILE")
            if [ "$existing_pid" = "$our_pid" ]; then
                echo -e "${GREEN}This is our managed application process${NC}"
            else
                echo -e "${YELLOW}This is NOT our managed process${NC}"
                echo -e "${GRAY}Our PID file says: $our_pid, but port is used by: $existing_pid${NC}"
            fi
        else
            echo -e "${YELLOW}No PID file found - this process is not managed by us${NC}"
        fi
        
        echo ""
        echo -e "${CYAN}What would you like to do?${NC}"
        echo -e "  ${GREEN}1${NC}) Stop the existing process and start fresh"
        echo -e "  ${GREEN}2${NC}) Adopt the existing process (update PID file)"
        echo -e "  ${GREEN}3${NC}) Cancel"
        echo -n -e "\n${WHITE}Select option: ${NC}"
        read -r choice
        
        case $choice in
            1)
                echo -e "\n${BLUE}→ Stopping existing process...${NC}"
                kill "$existing_pid" 2>/dev/null
                sleep 2
                if ps -p "$existing_pid" > /dev/null 2>&1; then
                    kill -9 "$existing_pid" 2>/dev/null
                fi
                echo -e "${GREEN}✓ Process stopped${NC}"
                # Continue to start new process below
                ;;
            2)
                echo -e "\n${BLUE}→ Adopting existing process...${NC}"
                echo "$existing_pid" > "$PID_FILE"
                echo -e "${GREEN}✓ Process adopted (PID: $existing_pid)${NC}"
                log "INFO" "Adopted existing process with PID: $existing_pid"
                echo -n -e "\nPress Enter to continue..."
                read -r
                return 0
                ;;
            *)
                echo -e "\n${YELLOW}Cancelled${NC}"
                echo -n -e "\nPress Enter to continue..."
                read -r
                return 0
                ;;
        esac
    fi
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    echo -e "${BLUE}→ Starting application in background...${NC}"
    echo -e "${GRAY}Logs will be written to: $LOG_DIR/app.log${NC}"
    
    # Start the app in the background and capture PID
    NODE_ENV=production pnpm run start >> "$LOG_DIR/app.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    echo -e "${BLUE}→ Waiting for application to be ready...${NC}"
    local max_wait=30
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Application started successfully! (PID: $pid)${NC}"
            echo -e "${GRAY}View logs with option 6 from the main menu${NC}"
            log "INFO" "Application started successfully with PID: $pid"
            echo -n -e "\nPress Enter to continue..."
            read -r
            return 0
        fi
        
        # Check if process died
        if ! ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${RED}✗ Application process died${NC}"
            if [ -f "$LOG_DIR/app.log" ]; then
                echo -e "${YELLOW}Last log entries:${NC}"
                tail -20 "$LOG_DIR/app.log"
            fi
            log "ERROR" "Application process died during startup"
            echo -n -e "\nPress Enter to continue..."
            read -r
            return 1
        fi
        
        sleep 1
        ((waited++))
    done
    
    echo -e "${RED}✗ Failed to start application (timeout)${NC}"
    echo -e "${YELLOW}Process is running but not listening on port $APP_PORT${NC}"
    if [ -f "$LOG_DIR/app.log" ]; then
        echo -e "${YELLOW}Last log entries:${NC}"
        tail -20 "$LOG_DIR/app.log"
    fi
    log "ERROR" "Failed to start application - timeout waiting for port"
    echo -n -e "\nPress Enter to continue..."
    read -r
    return 1
}

# Stop application
stop_app() {
    echo -e "\n${CYAN}${BOLD}⏸️  Stopping FastSigner...${NC}\n"
    log "INFO" "Stopping application"
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}⚠️  No PID file found, checking for running process...${NC}"
        # Try to find and kill processes on the port
        local port_pids=$(lsof -ti :$APP_PORT 2>/dev/null)
        if [ -n "$port_pids" ]; then
            echo -e "${BLUE}→ Found process(es) on port $APP_PORT${NC}"
            # Kill each PID
            for pid in $port_pids; do
                echo -e "${GRAY}  Stopping PID: $pid${NC}"
                kill "$pid" 2>/dev/null
            done
            sleep 2
            
            # Check if any are still running and force kill
            for pid in $port_pids; do
                if ps -p "$pid" > /dev/null 2>&1; then
                    echo -e "${YELLOW}  Force killing PID: $pid${NC}"
                    kill -9 "$pid" 2>/dev/null
                fi
            done
            
            echo -e "${GREEN}✓ All processes stopped${NC}"
            log "INFO" "Application stopped (found by port)"
        else
            echo -e "${YELLOW}No application running on port $APP_PORT${NC}"
        fi
        echo -n -e "\nPress Enter to continue..."
        read -r
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    echo -e "${BLUE}→ Stopping application (PID: $pid)...${NC}"
    
    if ps -p "$pid" > /dev/null 2>&1; then
        kill "$pid"
        
        # Wait for graceful shutdown
        local max_wait=10
        local waited=0
        while [ $waited -lt $max_wait ] && ps -p "$pid" > /dev/null 2>&1; do
            sleep 1
            ((waited++))
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}→ Force stopping...${NC}"
            kill -9 "$pid"
            sleep 1
        fi
        
        echo -e "${GREEN}✓ Application stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Process $pid not running (PID file was stale)${NC}"
    fi
    
    # Also check if anything else is on the port
    local port_pids=$(lsof -ti :$APP_PORT 2>/dev/null)
    if [ -n "$port_pids" ]; then
        echo -e "${YELLOW}⚠️  Other processes still on port $APP_PORT${NC}"
        for pid in $port_pids; do
            echo -e "${GRAY}  Stopping PID: $pid${NC}"
            kill -9 "$pid" 2>/dev/null
        done
    fi
    
    rm -f "$PID_FILE"
    echo -e "${GREEN}✓ Application stopped and cleaned up${NC}"
    log "INFO" "Application stopped"
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Restart application (with brief downtime)
restart_app() {
    echo -e "\n${CYAN}${BOLD}🔃 Restarting FastSigner...${NC}\n"
    log "INFO" "Restarting application"
    
    cd "$PROJECT_ROOT"
    
    echo -e "${BLUE}→ Stopping application...${NC}"
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid"
            sleep 2
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid"
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    echo -e "${BLUE}→ Starting application...${NC}"
    NODE_ENV=production pnpm run start >> "$LOG_DIR/app.log" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "$PID_FILE"
    
    echo -e "${BLUE}→ Waiting for application to be ready...${NC}"
    local max_wait=30
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Application restarted successfully! (PID: $new_pid)${NC}"
            log "INFO" "Application restarted successfully"
            echo -n -e "\nPress Enter to continue..."
            read -r
            return 0
        fi
        sleep 1
        ((waited++))
    done
    
    echo -e "${RED}✗ Failed to restart application${NC}"
    log "ERROR" "Failed to restart application"
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Zero-downtime restart (blue-green deployment)
restart_app_zero_downtime() {
    echo -e "\n${CYAN}${BOLD}🔃 Zero-Downtime Restart...${NC}\n"
    log "INFO" "Starting zero-downtime restart"
    
    cd "$PROJECT_ROOT"
    
    # Find an available port for the new instance
    local new_port=$((APP_PORT + 1))
    while lsof -i :$new_port -sTCP:LISTEN > /dev/null 2>&1; do
        ((new_port++))
    done
    
    echo -e "${BLUE}→ Starting new instance on port $new_port...${NC}"
    PORT=$new_port NODE_ENV=production pnpm run start >> "$LOG_DIR/app-new.log" 2>&1 &
    local new_pid=$!
    
    echo -e "${BLUE}→ Waiting for new instance to be ready...${NC}"
    local max_wait=30
    local waited=0
    local new_ready=false
    
    while [ $waited -lt $max_wait ]; do
        if lsof -i :$new_port -sTCP:LISTEN > /dev/null 2>&1; then
            new_ready=true
            break
        fi
        sleep 1
        ((waited++))
    done
    
    if [ "$new_ready" = "false" ]; then
        echo -e "${RED}✗ New instance failed to start${NC}"
        kill "$new_pid" 2>/dev/null
        log "ERROR" "Zero-downtime restart failed - new instance didn't start"
        return 1
    fi
    
    echo -e "${GREEN}✓ New instance ready on port $new_port${NC}"
    
    # Stop old instance
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        echo -e "${BLUE}→ Stopping old instance (PID: $old_pid)...${NC}"
        if ps -p "$old_pid" > /dev/null 2>&1; then
            kill "$old_pid"
            sleep 2
            if ps -p "$old_pid" > /dev/null 2>&1; then
                kill -9 "$old_pid"
            fi
        fi
    fi
    
    echo -e "${BLUE}→ Switching to port $APP_PORT...${NC}"
    
    # Kill the new instance temporarily
    kill "$new_pid"
    sleep 2
    
    # Start final instance on correct port
    NODE_ENV=production pnpm run start >> "$LOG_DIR/app.log" 2>&1 &
    local final_pid=$!
    echo "$final_pid" > "$PID_FILE"
    
    # Wait for final instance
    waited=0
    while [ $waited -lt $max_wait ]; do
        if lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Zero-downtime restart completed! (PID: $final_pid)${NC}"
            log "INFO" "Zero-downtime restart completed successfully"
            return 0
        fi
        sleep 1
        ((waited++))
    done
    
    echo -e "${RED}✗ Failed to complete zero-downtime restart${NC}"
    log "ERROR" "Zero-downtime restart failed at final step"
    return 1
}

# View logs submenu
view_logs() {
    local log_menu_items=(
        "1:Application Logs (Live)"
        "2:Manager Logs"
        "3:Auto-Update Logs"
        "4:Health Monitor Logs"
        "5:Migration Logs"
        "6:View All Logs"
        "b:Back to Main Menu"
    )
    
    local selected_index=0
    local menu_size=${#log_menu_items[@]}
    local need_full_refresh=true
    
    while true; do
        if [ "$need_full_refresh" = "true" ]; then
            show_header
            show_submenu "📊 View Logs" $selected_index true "${log_menu_items[@]}"
            need_full_refresh=false
        else
            show_submenu "📊 View Logs" $selected_index false "${log_menu_items[@]}"
        fi
        
        local key=$(read_key)
        local log_choice=""
        
        case $key in
            UP)
                ((selected_index--))
                if [ $selected_index -lt 0 ]; then
                    selected_index=$((menu_size - 1))
                fi
                continue
                ;;
            DOWN)
                ((selected_index++))
                if [ $selected_index -ge $menu_size ]; then
                    selected_index=0
                fi
                continue
                ;;
            ENTER)
                local item="${log_menu_items[$selected_index]}"
                IFS=':' read -r log_choice label <<< "$item"
                need_full_refresh=true
                ;;
            *)
                # Ignore all other keys
                continue
                ;;
        esac
        
        case $log_choice in
            1)
                view_application_logs
                need_full_refresh=true
                ;;
            2)
                view_specific_log "manager.log" "Manager Logs"
                need_full_refresh=true
                ;;
            3)
                view_specific_log "auto-update.log" "Auto-Update Logs"
                need_full_refresh=true
                ;;
            4)
                view_specific_log "health-monitor.log" "Health Monitor Logs"
                need_full_refresh=true
                ;;
            5)
                view_specific_log "migration.log" "Migration Logs"
                need_full_refresh=true
                ;;
            6)
                view_all_logs
                need_full_refresh=true
                ;;
            b|B)
                break
                ;;
        esac
    done
}

# View application logs (live tail)
view_application_logs() {
    clear
    echo -e "${CYAN}${BOLD}📊 Live Application Logs${NC}"
    echo -e "${YELLOW}${BOLD}Press Ctrl+C to stop and return to menu${NC}"
    echo -e "${GRAY}(You may need to press it twice)${NC}\n"
    log "INFO" "Viewing application logs"
    
    # Check if app is running
    local app_running=$(get_app_status)
    
    if [ "$app_running" = "running" ]; then
        echo -e "${GREEN}✓ Application is running on port $APP_PORT${NC}"
        
        # Find the actual process
        local app_pid_from_port=$(lsof -ti :$APP_PORT 2>/dev/null | head -1)
        echo -e "${GRAY}Process PID: $app_pid_from_port${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  Application is not running${NC}"
        echo -e "${GRAY}Start the application first to see live logs${NC}\n"
    fi
    
    if [ ! -f "$LOG_DIR/app.log" ]; then
        echo -e "${YELLOW}Log file not found at: $LOG_DIR/app.log${NC}"
        echo -e "${GRAY}This might mean:${NC}"
        echo -e "${GRAY}  • The app was started manually without log redirection${NC}"
        echo -e "${GRAY}  • The app hasn't started yet${NC}"
        echo -e "${GRAY}  • The app is logging to stdout/stderr instead${NC}"
        echo ""
        echo -e "${CYAN}Would you like to:${NC}"
        echo -e "  ${GREEN}1${NC}) Restart the app with proper logging"
        echo -e "  ${GREEN}2${NC}) Try to capture current process output"
        echo -e "  ${GREEN}3${NC}) Return to menu"
        echo -n -e "\n${WHITE}Select option: ${NC}"
        read -r choice
        
        case $choice in
            1)
                echo -e "\n${BLUE}→ Restarting application with logging...${NC}"
                # Stop current app
                if [ "$app_running" = "running" ]; then
                    local pid_to_kill=$(lsof -ti :$APP_PORT 2>/dev/null | head -1)
                    if [ -n "$pid_to_kill" ]; then
                        kill "$pid_to_kill" 2>/dev/null
                        sleep 2
                        kill -9 "$pid_to_kill" 2>/dev/null
                    fi
                fi
                
                # Create log directory if needed
                mkdir -p "$LOG_DIR"
                
                # Start with proper logging
                cd "$PROJECT_ROOT"
                NODE_ENV=production pnpm run start >> "$LOG_DIR/app.log" 2>&1 &
                local new_pid=$!
                echo "$new_pid" > "$PID_FILE"
                
                echo -e "${BLUE}→ Waiting for application to start...${NC}"
                sleep 5
                
                if [ -f "$LOG_DIR/app.log" ]; then
                    echo -e "${GREEN}✓ Application restarted with logging${NC}"
                    echo -e "${YELLOW}Streaming logs... (Press Ctrl+C to exit)${NC}\n"
                    
                    # Set flag that we're viewing logs
                    LOG_VIEWING=true
                    
                    # Start tail in background
                    tail -n 100 -f "$LOG_DIR/app.log" 2>/dev/null &
                    local tail_pid=$!
                    
                    # Temporarily disable 'exit on error' for wait
                    set +e
                    # Wait for tail process
                    wait $tail_pid 2>/dev/null
                    # Re-enable 'exit on error'
                    set -e
                    
                    # Kill tail if still running
                    kill $tail_pid 2>/dev/null
                    
                    # Reset flag
                    LOG_VIEWING=false
                    
                    echo ""
                    echo -e "${CYAN}Returning to menu...${NC}"
                    sleep 1
                else
                    echo -e "${RED}✗ Failed to create log file${NC}"
                    echo -n -e "\nPress Enter to continue..."
                    read -r
                fi
                ;;
            2)
                echo -e "\n${BLUE}Attempting to show process output...${NC}\n"
                # Try to find node process and show what we can
                local node_pid=$(pgrep -f "node.*3000" | head -1)
                if [ -n "$node_pid" ]; then
                    echo -e "${GRAY}Found Node.js process: $node_pid${NC}"
                    echo -e "${GRAY}Process info:${NC}"
                    ps -fp "$node_pid"
                else
                    echo -e "${YELLOW}Could not find Node.js process${NC}"
                fi
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            *)
                return
                ;;
        esac
        return
    fi
    
    echo -e "${GREEN}Showing logs from: $LOG_DIR/app.log${NC}"
    echo -e "${YELLOW}Streaming logs... (Press Ctrl+C to exit)${NC}\n"
    
    # Set flag that we're viewing logs
    LOG_VIEWING=true
    
    # Start tail in background
    tail -n 100 -f "$LOG_DIR/app.log" 2>/dev/null &
    local tail_pid=$!
    
    # Temporarily disable 'exit on error' for wait
    set +e
    # Wait for tail process (will be interrupted by Ctrl+C)
    wait $tail_pid 2>/dev/null
    # Re-enable 'exit on error'
    set -e
    
    # If we get here, either tail exited or Ctrl+C was pressed
    # Kill tail if still running
    kill $tail_pid 2>/dev/null
    
    # Reset flag
    LOG_VIEWING=false
    
    # Return to menu
    echo ""
    echo -e "${CYAN}Returning to menu...${NC}"
    sleep 1
    
    return 0
}

# View specific log file
view_specific_log() {
    local log_file=$1
    local log_title=$2
    
    echo -e "\n${CYAN}${BOLD}📊 ${log_title}${NC}"
    echo -e "${GRAY}Showing last 50 lines - Press Enter to continue${NC}\n"
    
    if [ ! -f "$LOG_DIR/$log_file" ]; then
        echo -e "${YELLOW}No $log_file found yet.${NC}"
    else
        tail -n 50 "$LOG_DIR/$log_file"
    fi
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# View all logs summary
view_all_logs() {
    echo -e "\n${CYAN}${BOLD}📊 All Logs Summary${NC}\n"
    
    for log_file in app.log manager.log auto-update.log health-monitor.log migration.log; do
        if [ -f "$LOG_DIR/$log_file" ]; then
            local line_count=$(wc -l < "$LOG_DIR/$log_file")
            local file_size=$(du -h "$LOG_DIR/$log_file" | cut -f1)
            echo -e "${WHITE}${BOLD}$log_file${NC} (${line_count} lines, ${file_size})"
            echo -e "${GRAY}Last 5 entries:${NC}"
            tail -n 5 "$LOG_DIR/$log_file" | while read -r line; do
                echo -e "  ${DIM}$line${NC}"
            done
            echo ""
        fi
    done
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Database management
database_menu() {
    local db_menu_items=(
        "1:Run Migrations"
        "2:Reset Database"
        "3:Backup Database"
        "4:Restore Database"
        "5:View Database Status"
        "b:Back to Main Menu"
    )
    
    local selected_index=0
    local menu_size=${#db_menu_items[@]}
    local need_full_refresh=true
    
    while true; do
        if [ "$need_full_refresh" = "true" ]; then
            show_header
            show_submenu "🗄️  Database Management" $selected_index true "${db_menu_items[@]}"
            need_full_refresh=false
        else
            show_submenu "🗄️  Database Management" $selected_index false "${db_menu_items[@]}"
        fi
        
        # Read key input
        local key=$(read_key)
        local db_choice=""
        
        case $key in
            UP)
                ((selected_index--))
                if [ $selected_index -lt 0 ]; then
                    selected_index=$((menu_size - 1))
                fi
                continue
                ;;
            DOWN)
                ((selected_index++))
                if [ $selected_index -ge $menu_size ]; then
                    selected_index=0
                fi
                continue
                ;;
            ENTER)
                local item="${db_menu_items[$selected_index]}"
                IFS=':' read -r db_choice label <<< "$item"
                need_full_refresh=true
                ;;
            *)
                # Ignore all other keys
                continue
                ;;
        esac
        
        case $db_choice in
            1)
                echo -e "\n${BLUE}→ Running migrations...${NC}"
                cd "$PROJECT_ROOT"
                npx prisma migrate deploy
                log "INFO" "Database migrations completed"
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            2)
                echo -e "\n${RED}⚠️  WARNING: This will delete all data!${NC}"
                echo -n "Are you sure? (type 'yes' to confirm): "
                read -r confirm
                if [ "$confirm" = "yes" ]; then
                    cd "$PROJECT_ROOT"
                    npx prisma migrate reset --force
                    log "WARN" "Database reset"
                    echo -e "${GREEN}✓ Database reset complete${NC}"
                else
                    echo -e "${YELLOW}Cancelled${NC}"
                fi
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            3)
                backup_database
                ;;
            4)
                restore_database
                ;;
            5)
                cd "$PROJECT_ROOT"
                echo -e "\n${CYAN}Database Status:${NC}"
                npx prisma db status || true
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            b|B)
                break
                ;;
        esac
    done
}

# Backup database
backup_database() {
    echo -e "\n${CYAN}${BOLD}💾 Creating Database Backup...${NC}\n"
    local backup_file="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).db"
    
    cp "$PROJECT_ROOT/prisma/dev.db" "$backup_file"
    
    echo -e "${GREEN}✓ Backup created: ${backup_file}${NC}"
    log "INFO" "Database backup created: $backup_file"
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Restore database
restore_database() {
    echo -e "\n${CYAN}${BOLD}💾 Available Backups:${NC}\n"
    
    local backups=($(ls -t "$BACKUP_DIR"/db_backup_*.db 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        echo -e "${YELLOW}No backups found${NC}"
        echo -n -e "\nPress Enter to continue..."
        read -r
        return
    fi
    
    local i=1
    for backup in "${backups[@]}"; do
        echo -e "  ${GREEN}$i${NC}) $(basename "$backup")"
        ((i++))
    done
    echo -e "  ${RED}c${NC}) Cancel"
    
    echo -n -e "\nSelect backup to restore: "
    read -r restore_choice
    
    if [ "$restore_choice" = "c" ]; then
        return
    fi
    
    if [ "$restore_choice" -ge 1 ] && [ "$restore_choice" -le ${#backups[@]} ]; then
        local selected_backup="${backups[$((restore_choice-1))]}"
        echo -e "\n${RED}⚠️  This will overwrite the current database!${NC}"
        echo -n "Continue? (y/n): "
        read -r confirm
        
        if [ "$confirm" = "y" ]; then
            cp "$selected_backup" "$PROJECT_ROOT/prisma/dev.db"
            echo -e "${GREEN}✓ Database restored from backup${NC}"
            log "INFO" "Database restored from: $selected_backup"
        fi
    fi
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Backup and restore menu
backup_menu() {
    local backup_menu_items=(
        "1:Create Full Backup"
        "2:Restore from Backup"
        "3:List Backups"
        "4:Clean Old Backups"
        "b:Back to Main Menu"
    )
    
    local selected_index=0
    local menu_size=${#backup_menu_items[@]}
    local need_full_refresh=true
    
    while true; do
        if [ "$need_full_refresh" = "true" ]; then
            show_header
            show_submenu "💾 Backup & Restore" $selected_index true "${backup_menu_items[@]}"
            need_full_refresh=false
        else
            show_submenu "💾 Backup & Restore" $selected_index false "${backup_menu_items[@]}"
        fi
        
        local key=$(read_key)
        local backup_choice=""
        
        case $key in
            UP)
                ((selected_index--))
                if [ $selected_index -lt 0 ]; then
                    selected_index=$((menu_size - 1))
                fi
                continue
                ;;
            DOWN)
                ((selected_index++))
                if [ $selected_index -ge $menu_size ]; then
                    selected_index=0
                fi
                continue
                ;;
            ENTER)
                local item="${backup_menu_items[$selected_index]}"
                IFS=':' read -r backup_choice label <<< "$item"
                need_full_refresh=true
                ;;
            *)
                # Ignore all other keys
                continue
                ;;
        esac
        
        case $backup_choice in
            1)
                create_full_backup
                ;;
            2)
                restore_database
                ;;
            3)
                list_backups
                ;;
            4)
                clean_old_backups
                ;;
            b|B)
                break
                ;;
        esac
    done
}

# Create full backup
create_full_backup() {
    echo -e "\n${CYAN}${BOLD}💾 Creating Full Backup...${NC}\n"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="full_backup_$timestamp"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    echo -e "${BLUE}→ Backing up database...${NC}"
    cp "$PROJECT_ROOT/prisma/dev.db" "$backup_path/"
    
    echo -e "${BLUE}→ Backing up uploads...${NC}"
    if [ -d "$PROJECT_ROOT/uploads" ]; then
        cp -r "$PROJECT_ROOT/uploads" "$backup_path/" 2>/dev/null || true
    fi
    
    echo -e "${BLUE}→ Creating archive...${NC}"
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_path"
    
    echo -e "${GREEN}✓ Full backup created: ${backup_name}.tar.gz${NC}"
    log "INFO" "Full backup created: $backup_name"
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# List backups
list_backups() {
    echo -e "\n${CYAN}${BOLD}💾 Available Backups:${NC}\n"
    
    cd "$BACKUP_DIR"
    ls -lh *.tar.gz *.db 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Clean old backups
clean_old_backups() {
    echo -e "\n${CYAN}${BOLD}🧹 Cleaning Old Backups...${NC}\n"
    echo -n "Keep how many recent backups? (default: 5): "
    read -r keep_count
    keep_count=${keep_count:-5}
    
    cd "$BACKUP_DIR"
    local backup_count=$(ls -1 *.tar.gz 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt "$keep_count" ]; then
        ls -t *.tar.gz | tail -n +$((keep_count + 1)) | xargs rm -f
        echo -e "${GREEN}✓ Cleaned old backups, kept $keep_count most recent${NC}"
        log "INFO" "Cleaned old backups"
    else
        echo -e "${YELLOW}No backups to clean${NC}"
    fi
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Cleanup and maintenance
cleanup_menu() {
    local cleanup_menu_items=(
        "1:Clean Build Cache"
        "2:Clean Old Logs"
        "3:Clean Node Modules"
        "4:Clean Temp Files"
        "5:Full Cleanup"
        "b:Back to Main Menu"
    )
    
    local selected_index=0
    local menu_size=${#cleanup_menu_items[@]}
    local need_full_refresh=true
    
    while true; do
        if [ "$need_full_refresh" = "true" ]; then
            show_header
            show_submenu "🧹 Cleanup & Maintenance" $selected_index true "${cleanup_menu_items[@]}"
            need_full_refresh=false
        else
            show_submenu "🧹 Cleanup & Maintenance" $selected_index false "${cleanup_menu_items[@]}"
        fi
        
        local key=$(read_key)
        local cleanup_choice=""
        
        case $key in
            UP)
                ((selected_index--))
                if [ $selected_index -lt 0 ]; then
                    selected_index=$((menu_size - 1))
                fi
                continue
                ;;
            DOWN)
                ((selected_index++))
                if [ $selected_index -ge $menu_size ]; then
                    selected_index=0
                fi
                continue
                ;;
            ENTER)
                local item="${cleanup_menu_items[$selected_index]}"
                IFS=':' read -r cleanup_choice label <<< "$item"
                need_full_refresh=true
                ;;
            *)
                # Ignore all other keys
                continue
                ;;
        esac
        
        case $cleanup_choice in
            1)
                echo -e "\n${BLUE}→ Cleaning build cache...${NC}"
                cd "$PROJECT_ROOT"
                rm -rf .nuxt .output
                echo -e "${GREEN}✓ Build cache cleaned${NC}"
                log "INFO" "Build cache cleaned"
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            2)
                echo -e "\n${BLUE}→ Cleaning old logs...${NC}"
                find "$LOG_DIR" -name "*.log" -mtime +30 -delete
                echo -e "${GREEN}✓ Old logs cleaned${NC}"
                log "INFO" "Old logs cleaned"
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            3)
                echo -e "\n${BLUE}→ Removing node_modules...${NC}"
                cd "$PROJECT_ROOT"
                rm -rf node_modules
                echo -e "${BLUE}→ Reinstalling dependencies...${NC}"
                pnpm install
                echo -e "${GREEN}✓ Node modules refreshed${NC}"
                log "INFO" "Node modules refreshed"
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            4)
                echo -e "\n${BLUE}→ Cleaning temporary files...${NC}"
                cd "$PROJECT_ROOT"
                rm -rf .workdirs/* 2>/dev/null
                rm -f /tmp/fastsigner-*.tmp 2>/dev/null
                echo -e "${GREEN}✓ Temporary files cleaned${NC}"
                log "INFO" "Temporary files cleaned"
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            5)
                echo -e "\n${RED}⚠️  This will clean everything (build cache, logs, temp files)${NC}"
                echo -n "Continue? (y/n): "
                read -r confirm
                if [ "$confirm" = "y" ]; then
                    cd "$PROJECT_ROOT"
                    rm -rf .nuxt .output
                    rm -rf .workdirs/* 2>/dev/null
                    find "$LOG_DIR" -name "*.log" -mtime +7 -delete
                    rm -f /tmp/fastsigner-*.tmp 2>/dev/null
                    echo -e "${GREEN}✓ Full cleanup completed${NC}"
                    log "INFO" "Full cleanup completed"
                fi
                echo -n -e "\nPress Enter to continue..."
                read -r
                ;;
            b|B)
                break
                ;;
        esac
    done
}

# Diagnostics tool
diagnostics() {
    echo -e "\n${CYAN}${BOLD}🔍 System Diagnostics${NC}\n"
    log "INFO" "Running diagnostics"
    
    echo -e "${WHITE}${BOLD}1. Port Status${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    # Check port 3000
    echo -n -e "${BLUE}→ Checking port $APP_PORT... ${NC}"
    local port_pid=$(lsof -ti :$APP_PORT 2>/dev/null | head -1)
    if [ -n "$port_pid" ]; then
        echo -e "${YELLOW}IN USE by PID: $port_pid${NC}"
        echo -e "${GRAY}Process details:${NC}"
        ps -fp "$port_pid" 2>/dev/null || echo "  Could not get process details"
        echo ""
        echo -e "${GRAY}Full command:${NC}"
        ps -o command= -p "$port_pid" 2>/dev/null || echo "  Unknown"
    else
        echo -e "${RED}NOT IN USE${NC}"
    fi
    echo ""
    
    echo -e "${WHITE}${BOLD}2. PID File Status${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    if [ -f "$PID_FILE" ]; then
        local stored_pid=$(cat "$PID_FILE")
        echo -e "${GREEN}✓ PID file exists: $PID_FILE${NC}"
        echo -e "${GRAY}Stored PID: $stored_pid${NC}"
        
        if ps -p "$stored_pid" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Process $stored_pid is running${NC}"
            ps -fp "$stored_pid"
        else
            echo -e "${RED}✗ Process $stored_pid is NOT running (stale PID file)${NC}"
        fi
    else
        echo -e "${RED}✗ No PID file found at: $PID_FILE${NC}"
    fi
    echo ""
    
    echo -e "${WHITE}${BOLD}3. HTTP Accessibility${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    echo -n -e "${BLUE}→ Testing HTTP on port $APP_PORT... ${NC}"
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost:$APP_PORT" > /tmp/curl_result.txt 2>&1; then
        local http_code=$(cat /tmp/curl_result.txt)
        if [ "$http_code" != "000" ]; then
            echo -e "${GREEN}✓ Accessible (HTTP $http_code)${NC}"
        else
            echo -e "${RED}✗ Connection refused${NC}"
        fi
    else
        echo -e "${RED}✗ Not accessible${NC}"
    fi
    rm -f /tmp/curl_result.txt
    echo ""
    
    echo -e "${WHITE}${BOLD}4. Log Files${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    if [ -f "$LOG_DIR/app.log" ]; then
        local log_size=$(du -h "$LOG_DIR/app.log" | cut -f1)
        local log_lines=$(wc -l < "$LOG_DIR/app.log")
        echo -e "${GREEN}✓ Application log exists${NC}"
        echo -e "${GRAY}  Size: $log_size, Lines: $log_lines${NC}"
        echo -e "${GRAY}  Last modified: $(stat -f "%Sm" "$LOG_DIR/app.log")${NC}"
    else
        echo -e "${RED}✗ No application log found at: $LOG_DIR/app.log${NC}"
    fi
    echo ""
    
    echo -e "${WHITE}${BOLD}5. Node.js Processes${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    local node_procs=$(pgrep -f "node" 2>/dev/null)
    if [ -n "$node_procs" ]; then
        echo -e "${GREEN}Found Node.js processes:${NC}"
        ps -fp $node_procs 2>/dev/null | head -20
    else
        echo -e "${YELLOW}No Node.js processes found${NC}"
    fi
    echo ""
    
    echo -e "${WHITE}${BOLD}6. Recommendations${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    # Determine what's wrong and suggest fixes
    local has_port=$([ -n "$port_pid" ] && echo "yes" || echo "no")
    local has_pid_file=$([ -f "$PID_FILE" ] && echo "yes" || echo "no")
    local pid_running="no"
    if [ "$has_pid_file" = "yes" ]; then
        local stored_pid=$(cat "$PID_FILE")
        pid_running=$(ps -p "$stored_pid" > /dev/null 2>&1 && echo "yes" || echo "no")
    fi
    
    if [ "$has_port" = "yes" ] && [ "$has_pid_file" = "yes" ] && [ "$pid_running" = "yes" ]; then
        echo -e "${GREEN}✓ Everything looks good - app should be running${NC}"
    elif [ "$has_port" = "yes" ] && [ "$has_pid_file" = "no" ]; then
        echo -e "${YELLOW}⚠️  Something is on port $APP_PORT but no PID file${NC}"
        echo -e "${GRAY}  Recommendation: Use 'Start Application' and choose 'Adopt'${NC}"
    elif [ "$has_port" = "yes" ] && [ "$pid_running" = "no" ]; then
        echo -e "${YELLOW}⚠️  Port is in use by different process${NC}"
        echo -e "${GRAY}  Recommendation: Stop the process and start fresh${NC}"
    elif [ "$has_pid_file" = "yes" ] && [ "$pid_running" = "no" ]; then
        echo -e "${YELLOW}⚠️  Stale PID file (process not running)${NC}"
        echo -e "${GRAY}  Recommendation: Clean up and start application${NC}"
    else
        echo -e "${YELLOW}⚠️  Application is not running${NC}"
        echo -e "${GRAY}  Recommendation: Use 'Start Application' from main menu${NC}"
    fi
    echo ""
    
    echo -e "${CYAN}${BOLD}Quick Actions:${NC}"
    echo -e "  ${GREEN}1${NC}) Clean up stale files and start fresh"
    echo -e "  ${GREEN}2${NC}) Kill process on port $APP_PORT and start"
    echo -e "  ${GREEN}3${NC}) Show full process tree"
    echo -e "  ${GREEN}4${NC}) Return to main menu"
    echo -n -e "\n${WHITE}Select option: ${NC}"
    read -r diag_choice
    
    case $diag_choice in
        1)
            echo -e "\n${BLUE}→ Cleaning up...${NC}"
            rm -f "$PID_FILE"
            rm -f /tmp/fastsigner-*.lock
            echo -e "${GREEN}✓ Cleanup complete${NC}"
            echo -e "\n${BLUE}→ Starting application...${NC}"
            cd "$PROJECT_ROOT"
            mkdir -p "$LOG_DIR"
            NODE_ENV=production pnpm run start >> "$LOG_DIR/app.log" 2>&1 &
            local new_pid=$!
            echo "$new_pid" > "$PID_FILE"
            echo -e "${GREEN}✓ Started with PID: $new_pid${NC}"
            sleep 3
            echo -n -e "\nPress Enter to continue..."
            read -r
            ;;
        2)
            if [ -n "$port_pid" ]; then
                echo -e "\n${BLUE}→ Killing process $port_pid...${NC}"
                kill "$port_pid" 2>/dev/null
                sleep 2
                kill -9 "$port_pid" 2>/dev/null
                echo -e "${GREEN}✓ Process killed${NC}"
                
                echo -e "\n${BLUE}→ Starting application...${NC}"
                cd "$PROJECT_ROOT"
                mkdir -p "$LOG_DIR"
                NODE_ENV=production pnpm run start >> "$LOG_DIR/app.log" 2>&1 &
                local new_pid=$!
                echo "$new_pid" > "$PID_FILE"
                echo -e "${GREEN}✓ Started with PID: $new_pid${NC}"
            else
                echo -e "\n${YELLOW}No process to kill${NC}"
            fi
            sleep 3
            echo -n -e "\nPress Enter to continue..."
            read -r
            ;;
        3)
            echo -e "\n${CYAN}Full Process Tree:${NC}\n"
            ps aux | grep -E "(node|pnpm|fastsigner)" | grep -v grep
            echo -n -e "\nPress Enter to continue..."
            read -r
            ;;
        *)
            return
            ;;
    esac
}

# Health check
health_check() {
    echo -e "\n${CYAN}${BOLD}📈 Running Health Check...${NC}\n"
    log "INFO" "Running health check"
    
    local issues=0
    
    # Check Node
    echo -n -e "${BLUE}→ Checking Node.js... ${NC}"
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✓ $(node --version)${NC}"
    else
        echo -e "${RED}✗ Node.js not installed${NC}"
        ((issues++))
    fi
    
    # Check pnpm
    echo -n -e "${BLUE}→ Checking pnpm... ${NC}"
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✓ $(pnpm --version)${NC}"
    else
        echo -e "${RED}✗ pnpm not installed${NC}"
        ((issues++))
    fi
    
    # Check Xcode Command Line Tools (required for signing)
    echo -n -e "${BLUE}→ Checking Xcode CLI Tools... ${NC}"
    if xcode-select -p &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Xcode CLI Tools not installed${NC}"
        ((issues++))
    fi
    
    # Check codesign availability
    echo -n -e "${BLUE}→ Checking codesign... ${NC}"
    if command -v codesign &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ codesign not available${NC}"
        ((issues++))
    fi
    
    # Check Git
    echo -n -e "${BLUE}→ Checking Git... ${NC}"
    if command -v git &> /dev/null; then
        echo -e "${GREEN}✓ $(git --version | cut -d' ' -f3)${NC}"
    else
        echo -e "${RED}✗ Git not installed${NC}"
        ((issues++))
    fi
    
    # Check database
    echo -n -e "${BLUE}→ Checking Database... ${NC}"
    if [ -f "$PROJECT_ROOT/prisma/dev.db" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Database file not found${NC}"
    fi
    
    # Check application status
    echo -n -e "${BLUE}→ Checking Application... ${NC}"
    if [ "$(get_app_status)" = "running" ]; then
        if [ -f "$PID_FILE" ]; then
            local app_pid=$(cat "$PID_FILE")
            echo -e "${GREEN}✓ Running (PID: $app_pid)${NC}"
        else
            echo -e "${GREEN}✓ Running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Not running${NC}"
    fi
    
    # Check ports
    echo -n -e "${BLUE}→ Checking Port 3000... ${NC}"
    if lsof -i :3000 &> /dev/null; then
        echo -e "${GREEN}✓ In use${NC}"
    else
        echo -e "${YELLOW}⚠ Not in use${NC}"
    fi
    
    # Summary
    echo ""
    if [ $issues -eq 0 ]; then
        echo -e "${GREEN}${BOLD}✓ Health check passed! All systems operational.${NC}"
    else
        echo -e "${RED}${BOLD}✗ Health check found $issues issue(s)${NC}"
    fi
    
    log "INFO" "Health check completed with $issues issues"
    
    echo -n -e "\nPress Enter to continue..."
    read -r
}

# Ensure application is running
ensure_app_running() {
    if [ "$(get_app_status)" != "running" ]; then
        echo -e "${YELLOW}→ Application is not running, starting automatically...${NC}"
        log "INFO" "Auto-starting application"
        
        cd "$PROJECT_ROOT"
        NODE_ENV=production pnpm run start >> "$LOG_DIR/app.log" 2>&1 &
        local pid=$!
        echo "$pid" > "$PID_FILE"
        
        # Wait for it to start
        local max_wait=30
        local waited=0
        while [ $waited -lt $max_wait ]; do
            if lsof -i :$APP_PORT -sTCP:LISTEN > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Application auto-started (PID: $pid)${NC}"
                log "INFO" "Application auto-started successfully"
                sleep 2
                return 0
            fi
            sleep 1
            ((waited++))
        done
        
        echo -e "${RED}⚠️  Failed to auto-start application${NC}"
        log "ERROR" "Failed to auto-start application"
        sleep 2
    fi
}

# Global flag for log viewing mode
LOG_VIEWING=false

# Signal handler to prevent accidental exits
handle_signal() {
    if [ "$LOG_VIEWING" = "true" ]; then
        # During log viewing, Ctrl+C should exit the viewer
        LOG_VIEWING=false
        echo -e "\n${CYAN}Stopped viewing logs${NC}"
        return 0
    else
        # During menu navigation, show warning
        echo -e "\n${YELLOW}⚠️  Use arrow keys to navigate to Exit${NC}"
        sleep 1
    fi
}

# Main loop
main() {
    # Check if we're already running
    if [ -f "$LOCK_FILE" ]; then
        echo -e "${YELLOW}FastSigner Manager is already running${NC}"
        exit 1
    fi
    
    # Create lock file
    echo $$ > "$LOCK_FILE"
    trap "rm -f $LOCK_FILE" EXIT
    
    # Trap Ctrl+C to prevent accidental exits
    trap handle_signal INT
    
    # Ensure application is running on startup
    ensure_app_running
    
    local selected_index=0
    local menu_size=${#MENU_ITEMS[@]}
    local need_full_refresh=true
    
    while true; do
        # Only do full refresh when needed (initial load or after action)
        if [ "$need_full_refresh" = "true" ]; then
            show_header
            show_status
            show_menu $selected_index true
            need_full_refresh=false
        else
            # Just redraw the menu for navigation
            show_menu $selected_index false
        fi
        
        # Read key input
        local key=$(read_key)
        local choice=""
        
        case $key in
            UP)
                # Move selection up
                ((selected_index--))
                if [ $selected_index -lt 0 ]; then
                    selected_index=$((menu_size - 1))
                fi
                continue
                ;;
            DOWN)
                # Move selection down
                ((selected_index++))
                if [ $selected_index -ge $menu_size ]; then
                    selected_index=0
                fi
                continue
                ;;
            ENTER)
                # Select current item
                choice=$(get_choice_from_index $selected_index)
                need_full_refresh=true
                ;;
            *)
                # Ignore all other keys
                continue
                ;;
        esac
        
        # Process the choice
        case $choice in
            1) pull_update ;;
            2) build_app ;;
            3) start_app ;;
            4) stop_app ;;
            5) restart_app ;;
            6) view_logs ;;
            7) database_menu ;;
            8) backup_menu ;;
            9) cleanup_menu ;;
            0) health_check ;;
            d|D) diagnostics ;;
            q|Q)
                echo -e "\n${CYAN}👋 Goodbye!${NC}\n"
                log "INFO" "Manager exited"
                exit 0
                ;;
            "")
                # No action for empty choice (from arrow keys)
                ;;
            *)
                # Invalid key - do nothing, just redraw
                ;;
        esac
    done
}

# Run main
main

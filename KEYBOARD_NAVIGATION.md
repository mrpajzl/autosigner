# Keyboard Navigation Guide

The FastSigner Management Console features intuitive, **arrow-key only** navigation that makes managing your application fast and efficient.

## 🎮 Navigation Method

The console uses **exclusive arrow-key navigation**:

### Arrow Key Navigation
- Press **↑** (Up Arrow) to move selection up
- Press **↓** (Down Arrow) to move selection down  
- Press **Enter** to execute the highlighted option
- The selected option is shown with reverse video (inverted colors)
- All other keys are ignored for clean, distraction-free navigation

**No typing required!** Simply navigate with arrows and confirm with Enter.

## 📺 Visual Example

Here's what you'll see when navigating:

```
🎯 Main Menu
═══════════════════════════════════════════════════════════════════
  1) 🔄 Pull Latest & Update
  2) 🏗️  Build Application
█ 3) ▶️  Start Application  █  ← Selected with arrow keys
  4) ⏸️  Stop Application
  5) 🔃 Restart Application
  6) 📊 View Live Logs
  7) 🗄️  Database Management
  8) 💾 Backup & Restore
  9) 🧹 Cleanup & Maintenance
  0) 📈 Health Check
  q) 🚪 Exit
═══════════════════════════════════════════════════════════════════
Use ↑↓ arrows to navigate, Enter to select, or type number
```

## 🚀 Usage Examples

### Example 1: Basic Navigation
```
1. Press ↓ three times to highlight "Start Application"
2. Press Enter to start the application
3. Wait for completion
4. Automatically returns to main menu
```

### Example 2: Accessing Submenus
```
1. Press ↓ seven times to highlight "Database Management"
2. Press Enter to open the submenu
3. Press ↓ to highlight "Run Migrations"
4. Press Enter to execute
5. Automatically returns to submenu
6. Navigate to "Back to Main Menu" and press Enter
```

### Example 3: Quick Navigation with Wrapping
```
1. At the top of menu, press ↑ once
2. Wraps to bottom - "Exit" is now highlighted
3. Press ↑ again to move up to "Diagnostics"
4. Press ↑ again to move up to "Health Check"
5. Press Enter to run health check
```

## 💡 Pro Tips

### Tip 1: Wrapping Navigation
- Pressing ↓ on the last item wraps to the first item
- Pressing ↑ on the first item wraps to the last item
- Makes it easy to quickly jump from top to bottom
- Example: From "Exit" press ↑ once to get to "Diagnostics"

### Tip 2: Visual Feedback
- The highlighted option uses **reverse video** (inverted colors)
- Red highlighting for exit/back options
- Green highlighting for action options
- Clear visual distinction makes navigation obvious
- Easy to see exactly what you're about to select

### Tip 3: Consistent Navigation
Every menu and submenu works the same way:
- Arrow keys work everywhere
- Enter always confirms
- Wrapping always works
- No surprises, no context switching

### Tip 4: Flicker-Free Experience
- Only the menu portion refreshes during navigation
- Status dashboard stays visible while navigating
- Smooth, professional interface
- No screen flashing or clearing

## 🎯 Navigation Reference

### All Menus
| Key | Action |
|-----|--------|
| ↑ | Move selection up (wraps to bottom) |
| ↓ | Move selection down (wraps to top) |
| Enter | Execute highlighted option |
| Ctrl+C | Exit log viewer (when viewing logs) |

### Main Menu Options (Navigate with ↑/↓, confirm with Enter)
| Option | Description |
|--------|-------------|
| 🔄 Pull Latest & Update | Zero-downtime update from main branch |
| 🏗️ Build Application | Build with pnpm |
| ▶️ Start Application | Start in background |
| ⏸️ Stop Application | Gracefully stop app |
| 🔃 Restart Application | Stop and start |
| 📊 View Logs | Access log viewer submenu |
| 🗄️ Database Management | Database operations submenu |
| 💾 Backup & Restore | Backup tools submenu |
| 🧹 Cleanup & Maintenance | Cleanup tools submenu |
| 📈 Health Check | System diagnostics |
| 🔍 Diagnostics | Detailed troubleshooting |
| 🚪 Exit | Quit the manager |

### Submenu Examples

All submenus work identically - navigate with arrows, confirm with Enter:

**Database Management**
- Run Migrations
- Reset Database
- Backup Database
- Restore Database
- View Database Status
- Back to Main Menu

**Backup & Restore**
- Create Full Backup
- Restore from Backup
- List Backups
- Clean Old Backups
- Back to Main Menu

**View Logs**
- Application Logs (Live) ← Press Ctrl+C to exit
- Manager Logs
- Auto-Update Logs
- Health Monitor Logs
- Migration Logs
- View All Logs
- Back to Main Menu

**Cleanup & Maintenance**
- Clean Build Cache
- Clean Old Logs
- Clean Node Modules
- Clean Temp Files
- Full Cleanup
- Back to Main Menu

## 🔧 Technical Details

### How It Works
The script uses raw input mode to capture individual keystrokes:
- `read -rsn1` captures single characters without echo
- Escape sequences are detected for arrow keys
- `\x1b[A` = Up Arrow
- `\x1b[B` = Down Arrow
- Selection state is maintained across redraws

### Terminal Compatibility
Tested and working on:
- ✅ macOS Terminal.app
- ✅ iTerm2
- ✅ Alacritty
- ✅ Hyper
- ✅ Any ANSI-compatible terminal

### Performance
- Zero latency between keypress and visual update
- Smart partial redraws - only the menu updates when navigating
- No screen flickering or full refreshes on arrow keys
- Smooth, responsive navigation experience
- Full refresh only after executing actions
- No delays or buffering

## 🎨 Visual Indicators

### Colors Used
- **🟢 Green**: Action items and numbers
- **🔴 Red**: Exit and back options
- **🔵 Blue**: Operation progress messages
- **🟡 Yellow**: Warnings and important notices
- **⚪ White**: Headings and status
- **⚫ Gray**: Borders and secondary info

### Highlighting
- **Reverse Video**: Selected item
  - Background and foreground colors swapped
  - Easy to spot at a glance
  - Consistent across all menus

### Status Symbols
- **●** Colored dots for status indicators
- **→** Progress arrows
- **✓** Success checkmarks
- **✗** Error crosses
- **⚠️** Warning signs

## 📖 Learning Path

### Beginner
1. Start with arrow keys
2. Get familiar with the visual feedback
3. Practice navigating up and down
4. Use Enter to select

### Intermediate
5. Start using number keys for common actions
6. Learn `b` for back, `q` for quit
7. Combine arrow keys with numbers

### Advanced
8. Memorize number shortcuts for frequent tasks
9. Use numbers exclusively for speed
10. Navigate blindingly fast! ⚡

---

**Remember:** There's no wrong way to navigate - use whatever method feels most comfortable for you!

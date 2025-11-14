# Simple Tiling - Improvement Suggestions

This document contains suggestions for improvements and bug fixes for the Simple Tiling GNOME extension.

## 🐛 Critical Bugs

### ~~1. Memory Leak - Untracked Signal Connections~~ ✅
**Location:** `tilingManager.js:144`, `tilingManager.js:679`

**Issue:**
- ~~The `unmanaged` signal connections are not stored in `windowSignals` Map~~
- ~~These won't be cleaned up on disable, causing memory leaks~~

**Fix:**
~~Track all signal connections properly in the `windowSignals` Map for cleanup.~~
**Status:** Fixed - unmanaged signal now properly tracked in windowSignals Map at tilingManager.js:255-258

### 2. Windows Added to Tree When Tiling Disabled
**Location:** `tilingManager.js:154-161`

**Issue:**
- `_insertWindow` doesn't check if tiling is enabled for the workspace
- Windows are added to tree even when tiling is disabled

**Fix:**
Check `workspaceEnabled` before inserting windows into the tree.

---

## ⚠️ Important Issues

### ~~3. No Window Movement Between Workspaces~~ ✅
**Issue:**
- ~~When a window moves to another workspace, it's not tracked~~
- ~~Could cause stale references or incorrect layouts~~

**Fix:**
~~Listen to `workspace-changed` signal on windows to handle workspace transitions.~~
**Status:** Fixed - now listening to `workspace-changed` signal in tilingManager.js:260-350

### 4. No Multi-Monitor Support
**Location:** `tilingManager.js:487`

**Issue:**
- Only tiles on primary monitor
- Windows on secondary monitors are ignored

**Fix:**
Track trees per-workspace-per-monitor instead of just per-workspace.

### 5. No Minimize/Maximize Handling
**Issue:**
- When user minimizes a window, it stays in tree occupying space
- When user maximizes a window, geometry monitoring fights it

**Fix:**
Temporarily remove minimized windows from layout and handle maximize states properly.

### ~~6. Missing Metadata Fields~~ ✅
**Location:** `metadata.json`

**Issue:**
- ~~No version number, URL, or settings-schema~~
- ~~Won't validate properly for GNOME Extensions website~~

**Fix:**
~~Add the following fields:~~
- ~~`"version": 1`~~
- ~~`"url": "https://..."`~~
- ~~`"settings-schema": "org.gnome.shell.extensions.simple-tiling"`~~
**Status:** Fixed - Added version, url, and settings-schema fields to metadata.json

---

## 🔧 Code Quality Improvements

### 7. Excessive Console Logging
**Issue:**
- 70+ console.log statements in production code
- Performance impact and clutters journal logs

**Fix:**
Use a debug flag or implement logging levels (DEBUG, INFO, WARN, ERROR).

### 8. Hardcoded Constants
**Location:** `tilingManager.js:10`

**Issue:**
- `GAP_SIZE` should be configurable via preferences
- Split ratio (0.5) could be made adjustable

**Fix:**
Add GSettings keys for these configuration options.

### 9. Error Handling Could Be Improved
**Location:** `tilingManager.js:325-329`, `tilingManager.js:609-614`

**Issue:**
- Many try/catch blocks silently ignore errors
- Makes debugging harder

**Fix:**
At least log warnings for unexpected errors instead of silently ignoring them.

---

## 🎨 Missing Features

### 10. No Manual Window Resizing
**Issue:**
- Users can't adjust split ratios with keyboard/mouse
- Common feature in tiling WMs

**Suggestion:**
Add keybindings to adjust split ratio of focused window (e.g., Super+Shift+H/L to adjust horizontal split).

### 11. No Window Swapping
**Issue:**
- Can't swap positions of two windows

**Suggestion:**
Add keybinding to swap with adjacent window (e.g., Super+Shift+Arrow keys).

### 12. No Focus Navigation
**Issue:**
- No keyboard shortcuts to move focus between tiled windows

**Suggestion:**
Add Super+Arrow keys to change focus directionally.

### 13. No Layout Persistence
**Issue:**
- Tree is lost when extension reloads or GNOME restarts

**Suggestion:**
Save/restore tree state to disk for session persistence.

### 14. Limited Split Type Control
**Issue:**
- Split direction is automatic based on aspect ratio
- Users can't manually choose split direction

**Suggestion:**
Add keybinding to force horizontal/vertical split on next window insertion.

---

## 📊 Performance Optimizations

### 15. Geometry Monitoring Inefficiency
**Location:** `tilingManager.js:243-259`

**Issue:**
- Listens to every position/size change
- Fires frequently during window animations

**Fix:**
Add debouncing or use idle callbacks to reduce frequency of geometry corrections.

### 16. Unnecessary Retiling
**Issue:**
- Every window insertion retiles entire workspace
- Could be optimized for large numbers of windows

**Fix:**
Only recalculate affected subtree instead of entire workspace tree.

---

## 🏗️ Architecture Suggestions

### 17. Workspace Manager Abstraction
**Issue:**
- All workspace logic is in TilingManager
- Would be cleaner as separate class

**Suggestion:**
Create `WorkspaceManager` class to handle workspace-specific operations.

### 18. Settings/Preferences Object
**Issue:**
- Settings accessed via getSettings calls throughout
- Could be centralized

**Suggestion:**
Create Settings singleton for easier settings management.

### 19. Tree Serialization Methods
**Issue:**
- TreeNode has no way to serialize/deserialize
- Would help with persistence feature

**Suggestion:**
Add `toJSON()` and `fromJSON()` methods to TreeNode class.

---

## 🧪 Testing & Documentation

### 20. No Error Recovery Tests
**Issue:**
- What happens if a window becomes null during operations?
- Missing defensive checks throughout

**Suggestion:**
Add more null checks and defensive programming patterns.

### 21. GNOME Shell Version Support
**Location:** `metadata.json:5`

**Issue:**
- Only supports version 49
- Should support wider range for better compatibility

**Suggestion:**
Update to: `"shell-version": ["45", "46", "47", "48", "49"]`

---

## Priority Recommendations

**Immediate (Critical Bugs):**
1. ~~Fix memory leak from untracked signal connections~~ ✅
2. Prevent window insertion when tiling is disabled

**Short-term (Important Issues):**
3. ~~Add window workspace movement tracking~~ ✅
4. Handle minimize/maximize states
5. ~~Complete metadata.json fields~~ ✅

**Medium-term (Features):**
6. Add manual resizing capability
7. Implement focus navigation
8. Add window swapping

**Long-term (Polish):**
9. Reduce console logging
10. Make constants configurable
11. Optimize performance for many windows
12. Add layout persistence

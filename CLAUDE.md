# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple tiling window manager for GNOME Shell. The core concept is to automatically divide windows into tiles without allowing any window to be behind another (no overlapping windows).

## GNOME Extension Architecture

This project is a GNOME Shell extension. GNOME Shell extensions require:

1. **metadata.json** - Extension metadata (uuid, name, description, shell-versions, url)
2. **extension.js** - Main extension file with `init()`, `enable()`, and `disable()` functions
3. **prefs.js** (optional) - Preferences/settings UI
4. **schemas/** (optional) - GSettings schemas for storing preferences

### Key GNOME Shell Extension Lifecycle

- `init()` - Called when extension is loaded (setup only, no modifications)
- `enable()` - Called when extension is enabled (perform all window management)
- `disable()` - Called when extension is disabled (cleanup and restore state)

## Development Commands

### Installation
Extensions are installed to `~/.local/share/gnome-shell/extensions/<uuid>/`

### Testing
- Restart GNOME Shell: Log out and back in, or use nested session
- Enable extension: `gnome-extensions enable <uuid>`
- Disable extension: `gnome-extensions disable <uuid>`
- View logs: `journalctl -f -o cat /usr/bin/gnome-shell`

## Tiling Window Manager Concepts

For a simple automatic tiling system:

1. **Window Signals** - Listen to `window-created`, `window-demands-attention`, `focus` on `global.display`
2. **Workspace Management** - Access via `global.workspace_manager`
3. **Window Positioning** - Use `Meta.Window.move_resize_frame()` for positioning/sizing
4. **Work Area** - Get usable screen space via `workspace.get_work_area_for_monitor()`
5. **Tiling Algorithm** - Divide work area into non-overlapping rectangles based on number of windows

### Critical GNOME Shell APIs

- `global.display` - Display manager (access windows, workspaces)
- `global.workspace_manager` - Workspace operations
- `Meta.Window` - Individual window object with position/size methods
- `Mtk.Rectangle` - Geometry representation (replaces deprecated Meta.Rectangle)

## Project Structure

- `extension.js` - Main entry point, instantiates TilingManager on enable/disable, sets up keybindings
- `metadata.json` - Extension metadata with UUID `simple-tiling@tubbe`
- `tilingManager.js` - Core tiling engine using BSP tree algorithm, panel button UI
- `treeNode.js` - BSP tree node class (containers and window leaves)
- `prefs.js` - Preferences UI for configuring keybindings
- `schemas/org.gnome.shell.extensions.simple-tiling.gschema.xml` - GSettings schema for storing preferences

## Implementation Details

### Binary Space Partitioning (BSP) Algorithm

The extension uses a **Binary Space Partitioning tree** to manage window layouts:

- Each workspace has its own independent BSP tree
- **Leaf nodes** represent actual windows (Meta.Window objects)
- **Container nodes** represent split areas (either HORIZONTAL or VERTICAL)
- When a new window is created, it splits the focused window's space in half
- Split direction is determined by aspect ratio:
  - Width > Height → VERTICAL split (side-by-side)
  - Height > Width → HORIZONTAL split (top-bottom)

### Window Management Flow

**New Window Insertion** (tilingManager.js:86):
1. Listen to `window-created` signal
2. Filter: only tile `Meta.WindowType.NORMAL` windows
3. Wait for `shown` signal before inserting
4. Find focused window's node (or first leaf if no focus)
5. Create container node with `splitType` based on aspect ratio
6. Replace focused node with container having two children:
   - firstChild = old focused window
   - secondChild = new window
7. Recalculate geometries recursively from root
8. Apply geometries with 2px gaps using `move_resize_frame()`

**Window Removal** (tilingManager.js:166):
1. Listen to `unmanaged` signal
2. Find window's node in tree
3. Get sibling node
4. Promote sibling to parent's position (collapse the container)
5. If was only window, delete workspace tree
6. Recalculate and apply geometries

### User Interface Features

**Panel Button** (tilingManager.js:733):
- Icon displayed in top-left of GNOME Shell panel
- Shows grid icon (view-grid-symbolic)
- Styled with green overlay when tiling is enabled on current workspace
- Styled with red overlay when tiling is disabled on current workspace
- Click to toggle tiling on/off for current workspace

**Keybinding** (extension.js:60):
- Default: Super+t (configurable via preferences)
- Toggles tiling on/off for current workspace
- Uses GNOME Shell's keybinding system (Main.wm.addKeybinding)
- Stored in GSettings: 'org.gnome.shell.extensions.simple-tiling'

**Preferences UI** (prefs.js):
- Accessible via GNOME Extensions app
- Configure keybinding for toggle action
- Uses Adw.PreferencesWindow with custom keybinding dialog
- Supports clearing keybinding (Backspace) or canceling (Escape)

**Per-Workspace Toggle** (tilingManager.js:805):
- Each workspace can independently enable/disable tiling
- When disabled, windows remain in place (not restored to floating)
- When enabled, applies current BSP tree layout
- State tracked in `workspaceEnabled` Map (default: enabled)

### Key Configuration

- **Gap size**: 2px between windows (GAP_SIZE constant in tilingManager.js:10)
- **Workspace scope**: Each workspace has independent tree, primary monitor only
- **Split ratio**: 50/50 (TreeNode.splitRatio = 0.5)
- **Default keybinding**: Super+t to toggle tiling per workspace
- **GNOME Shell version**: 49

### Testing the Extension

```bash
# Copy to extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe
cp *.js metadata.json stylesheet.css ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe/
cp -r schemas/ ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe/

# Compile GSettings schemas
glib-compile-schemas ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe/schemas/

# Enable the extension
gnome-extensions enable simple-tiling@tubbe

# View logs in real-time
journalctl -f -o cat /usr/bin/gnome-shell

# Test the keybinding
# Press Super+t to toggle tiling on current workspace

# Test the panel button
# Click the grid icon in top-left panel to toggle tiling

# Open preferences
gnome-extensions prefs simple-tiling@tubbe

# Disable when done testing
gnome-extensions disable simple-tiling@tubbe
```

You need to log out and back in after installing/updating the extension.

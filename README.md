# Simple Tiling GNOME Extension

A simple automatic tiling window manager for GNOME Shell that uses Binary Space Partitioning.

## How It Works

The extension uses a Binary Space Partitioning (BSP) tree algorithm:

- When you open the first window, it takes the full screen
- When you open a second window, it splits the focused window in half
- Split direction is smart: wider windows split vertically (side-by-side), taller windows split horizontally (stacked)
- Each window gets 2px gaps for visual separation
- When a window closes, its sibling expands to fill the space
- Each workspace has its own independent tiling tree
- Toggle tiling on/off per workspace with Super+t or panel button

## Quick Start

### 1. Install the Extension

```bash
# Copy files to GNOME extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe
cp *.js metadata.json stylesheet.css ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe/
cp -r schemas/ ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe/schemas/
```

Or use npm:
```bash
npm run install
```

### 2. Enable the Extension

```bash
gnome-extensions enable simple-tiling@tubbe
# Log out and log back in for changes to take effect
```

Or use npm:
```bash
npm run enable
```

### 3. Watch Logs (Optional but Recommended)

Open a separate terminal to monitor the extension:
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

Or use npm:
```bash
npm run logs
```

### 4. Test the Tiling

1. **Open first window** - Should tile to full screen with 2px gaps
2. **Open second window** - Both windows split 50/50
3. **Open third window** - Splits the currently focused window
4. **Close a window** - Sibling window expands to fill space
5. **Switch workspaces** - Each workspace has independent tiling
6. **Press Super+t** - Toggle tiling on/off for current workspace
7. **Click panel button** - Grid icon in top-left toggles tiling (green=on, red=off)
8. **Open preferences** - Run `gnome-extensions prefs simple-tiling@tubbe` to configure keybinding

### 5. Disable When Done

```bash
gnome-extensions disable simple-tiling@tubbe
```

Or use npm:
```bash
npm run disable
```

## Testing Checklist

- [ ] Single window takes full screen (with 2px gaps)
- [ ] Two windows split 50/50
- [ ] Wide windows split vertically (side-by-side)
- [ ] Tall windows split horizontally (stacked)
- [ ] Closing a window makes sibling expand
- [ ] Each workspace tiles independently
- [ ] Super+t keybinding toggles tiling on current workspace
- [ ] Panel button (grid icon) appears in top-left panel
- [ ] Panel button shows green when tiling enabled, red when disabled
- [ ] Clicking panel button toggles tiling
- [ ] Preferences UI opens and allows keybinding configuration
- [ ] No errors in logs

## Troubleshooting

### Extension not working after enable?
- Log out and log back in

### Check if extension is enabled:
```bash
gnome-extensions list --enabled | grep simple-tiling
```

### View extension info:
```bash
gnome-extensions info simple-tiling@tubbe
```

### Check for errors:
```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep -i error
```

### Reset and reinstall:
```bash
npm run disable
rm -rf ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe
npm run install
npm run enable
# Log out and back in
```

## Features

- **Automatic tiling** - No manual window positioning needed
- **Smart split direction** - Based on window aspect ratio
- **2px gaps** - Minimal visual separation between windows
- **Per-workspace tiling** - Each workspace tiles independently
- **Toggle on/off** - Keybinding (Super+t) or panel button to toggle tiling per workspace
- **Panel indicator** - Visual feedback in top panel (green=enabled, red=disabled)
- **Configurable keybinding** - Customize via GNOME Extensions preferences
- **Primary monitor only** - Other monitors unaffected
- **Respects window types** - Only tiles normal windows, ignores dialogs/popups

## Technical Details

See [CLAUDE.md](CLAUDE.md) for detailed implementation documentation.

### Files

- `metadata.json` - Extension metadata with UUID simple-tiling@tubbe
- `extension.js` - Main entry point with enable/disable lifecycle, keybinding setup
- `tilingManager.js` - Core tiling engine with BSP tree algorithm, panel button UI
- `treeNode.js` - BSP tree node class (containers and window leaves)
- `prefs.js` - Preferences UI for configuring keybindings
- `schemas/` - GSettings schemas for storing extension preferences
- `stylesheet.css` - UI styling for panel button
- `CLAUDE.md` - Detailed implementation documentation

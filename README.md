# Simple Tiling GNOME Extension

A simple automatic tiling window manager for GNOME Shell that uses Binary Space Partitioning.

## How It Works

The extension uses a Binary Space Partitioning (BSP) tree algorithm:

- When you open the first window, it takes the full screen
- When you open a second window, it splits the focused window in half
- Split direction is smart: wider windows split vertically (side-by-side), taller windows split horizontally (stacked)
- Each window gets 8px gaps for visual separation
- When a window closes, its sibling expands to fill the space
- Each workspace has its own independent tiling tree

## Quick Start

### 1. Install the Extension

```bash
# Copy files to GNOME extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe
cp -r *.js* metadata.json ~/.local/share/gnome-shell/extensions/simple-tiling@tubbe/
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

1. **Open first window** - Should tile to full screen with 8px gaps
2. **Open second window** - Both windows split 50/50
3. **Open third window** - Splits the currently focused window
4. **Close a window** - Sibling window expands to fill space
5. **Switch workspaces** - Each workspace has independent tiling

### 5. Disable When Done

```bash
gnome-extensions disable simple-tiling@tubbe
```

Or use npm:
```bash
npm run disable
```

## Testing Checklist

- [ ] Single window takes full screen (with gaps)
- [ ] Two windows split 50/50
- [ ] Wide windows split vertically (side-by-side)
- [ ] Tall windows split horizontally (stacked)
- [ ] Closing a window makes sibling expand
- [ ] Each workspace tiles independently
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
- **8px gaps** - Visual separation between windows
- **Per-workspace** - Each workspace tiles independently
- **Primary monitor only** - Other monitors unaffected
- **Respects window types** - Only tiles normal windows, ignores dialogs/popups

## Technical Details

See [CLAUDE.md](CLAUDE.md) for detailed implementation documentation.

### Files

- `metadata.json` - Extension metadata with UUID simple-tiling@tubbe
- `extension.js` - Main entry point with enable/disable lifecycle
- `tilingManager.js` - Core tiling engine with BSP tree algorithm
- `treeNode.js` - BSP tree node class (containers and window leaves)
- `CLAUDE.md` - Detailed implementation documentation

// extension.js - Main entry point for Simple Tiling GNOME extension

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { TilingManager } from './tilingManager.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

/**
 * Simple Tiling Extension
 *
 * Automatically tiles windows using binary space partitioning (BSP).
 * When a new window is created, it splits the focused window's space in half.
 */
export default class SimpleTilingExtension extends Extension {
    /**
     * Called when the extension is enabled
     */
    enable() {
        console.log('[Simple Tiling] Enabling extension');

        try {
            console.log('[Simple Tiling] Creating TilingManager...');
            this._tilingManager = new TilingManager();
            console.log('[Simple Tiling] TilingManager created, calling enable()...');
            this._tilingManager.enable();
            console.log('[Simple Tiling] TilingManager.enable() completed');

            // Set up keybinding
            console.log('[Simple Tiling] Loading settings...');
            this._settings = this.getSettings('org.gnome.shell.extensions.simple-tiling');
            console.log('[Simple Tiling] Settings loaded, setting up keybinding...');
            this._setupKeybinding();
            console.log('[Simple Tiling] Keybinding setup completed');
        } catch (e) {
            console.error(`[Simple Tiling] ERROR enabling extension: ${e.message}`);
            console.error(`[Simple Tiling] Stack trace: ${e.stack}`);
        }
    }

    /**
     * Called when the extension is disabled
     */
    disable() {
        console.log('[Simple Tiling] Disabling extension');

        // Remove keybinding
        this._removeKeybinding();
        this._settings = null;

        if (this._tilingManager) {
            this._tilingManager.disable();
            this._tilingManager = null;
        }
    }

    /**
     * Set up keybinding for toggling tiling
     */
    _setupKeybinding() {
        console.log('[Simple Tiling] Setting up keybinding');

        Main.wm.addKeybinding(
            'toggle-tiling',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => {
                console.log('[Simple Tiling] Keybinding activated');
                if (this._tilingManager) {
                    this._tilingManager.toggleCurrentWorkspace();
                }
            }
        );
    }

    /**
     * Remove keybinding
     */
    _removeKeybinding() {
        console.log('[Simple Tiling] Removing keybinding');
        Main.wm.removeKeybinding('toggle-tiling');
    }
}

// extension.js - Main entry point for Simple Tiling GNOME extension

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { TilingManager } from './tilingManager.js';

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

        if (this._tilingManager) {
            this._tilingManager.disable();
            this._tilingManager = null;
        }
    }
}

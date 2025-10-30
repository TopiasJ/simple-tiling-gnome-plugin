// tilingManager.js - Core tiling window manager using BSP tree

import { TreeNode, NodeType, SplitType } from './treeNode.js';
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';

const GAP_SIZE = 2; // 2px gaps between windows

export class TilingManager {
    constructor() {
        this.workspaceTrees = new Map(); // workspace index -> root TreeNode
        this.windowNodes = new Map(); // Meta.Window -> TreeNode
        this.windowSignals = new Map(); // Meta.Window -> array of signal IDs
        this.signals = [];
        this.focusedWindow = null;
        this.isApplyingGeometry = false; // Flag to prevent recursive geometry applications
    }

    /**
     * Enable the tiling manager
     */
    enable() {
        console.log('[Simple Tiling] TilingManager.enable() called');
        this._connectSignals();
        this._tileExistingWindows();
        console.log('[Simple Tiling] TilingManager enabled successfully');
    }

    /**
     * Disable the tiling manager and cleanup
     */
    disable() {
        this._disconnectSignals();

        // Disconnect all window monitoring signals
        for (const [window, signals] of this.windowSignals.entries()) {
            signals.forEach(signal => {
                signal.object.disconnect(signal.id);
            });
        }

        this.workspaceTrees.clear();
        this.windowNodes.clear();
        this.windowSignals.clear();
        this.focusedWindow = null;
    }

    /**
     * Connect to GNOME Shell signals
     */
    _connectSignals() {
        console.log('[Simple Tiling] Connecting signals...');
        // Listen for new windows
        let id = global.display.connect('window-created', (display, metaWindow) => {
            console.log('[Simple Tiling] window-created signal received');
            this._onWindowCreated(metaWindow);
        });
        this.signals.push({ object: global.display, id });
        console.log(`[Simple Tiling] Connected window-created signal (id: ${id})`);

        // Track focused window
        id = global.display.connect('notify::focus-window', () => {
            this.focusedWindow = global.display.focus_window;
        });
        this.signals.push({ object: global.display, id });
        console.log(`[Simple Tiling] Connected focus-window signal (id: ${id})`);
    }

    /**
     * Disconnect all signals
     */
    _disconnectSignals() {
        this.signals.forEach(signal => {
            signal.object.disconnect(signal.id);
        });
        this.signals = [];
    }

    /**
     * Check if a window should be tiled
     */
    _shouldTileWindow(metaWindow) {
        // Only tile normal windows
        if (metaWindow.window_type !== Meta.WindowType.NORMAL) {
            return false;
        }

        // Skip windows that should be hidden from taskbar
        if (metaWindow.is_skip_taskbar()) {
            return false;
        }

        // Skip transient windows (dialogs, popups, etc.)
        if (metaWindow.is_attached_dialog() || metaWindow.get_transient_for()) {
            return false;
        }

        return true;
    }

    /**
     * Handle new window creation
     */
    _onWindowCreated(metaWindow) {
        console.log(`[Simple Tiling] _onWindowCreated called for window: ${metaWindow.get_title()}`);
        if (!this._shouldTileWindow(metaWindow)) {
            console.log(`[Simple Tiling] Window ${metaWindow.get_title()} should not be tiled`);
            return;
        }

        console.log(`[Simple Tiling] Window ${metaWindow.get_title()} will be tiled`);

        // Capture the currently focused window BEFORE the new window takes focus
        const targetWindow = this.focusedWindow;
        if (targetWindow) {
            console.log(`[Simple Tiling] Previously focused window: ${targetWindow.get_title()} (id: ${targetWindow.get_id()})`);
        }

        // Wait for window to be shown before tiling
        const shownId = metaWindow.connect('shown', () => {
            console.log(`[Simple Tiling] Window ${metaWindow.get_title()} shown signal received`);
            metaWindow.disconnect(shownId);
            this._insertWindow(metaWindow, targetWindow);
        });

        // Handle window removal
        metaWindow.connect('unmanaged', () => {
            this._removeWindow(metaWindow);
        });
    }

    /**
     * Insert a window into the tiling tree
     * @param {Meta.Window} metaWindow - The window to insert
     * @param {Meta.Window} targetWindow - The previously focused window to split (optional)
     */
    _insertWindow(metaWindow, targetWindow = null) {
        console.log(`[Simple Tiling] _insertWindow called for: ${metaWindow.get_title()} (id: ${metaWindow.get_id()})`);

        // Check if window is already in the tree
        if (this.windowNodes.has(metaWindow)) {
            console.log(`[Simple Tiling] Window ${metaWindow.get_title()} (id: ${metaWindow.get_id()}) already in tree, skipping`);
            return;
        }

        const workspace = metaWindow.get_workspace();
        if (!workspace) {
            console.log('[Simple Tiling] Window has no workspace, skipping');
            return; // Window has no workspace
        }

        const workspaceIndex = workspace.index();
        console.log(`[Simple Tiling] Window workspace index: ${workspaceIndex}`);

        const newNode = new TreeNode(NodeType.WINDOW, metaWindow);
        this.windowNodes.set(metaWindow, newNode);

        // Monitor this window's geometry to correct misbehaving applications
        this._monitorWindowGeometry(metaWindow);

        let root = this.workspaceTrees.get(workspaceIndex);

        if (!root) {
            // First window on this workspace
            console.log(`[Simple Tiling] First window on workspace ${workspaceIndex}, setting as root`);
            this.workspaceTrees.set(workspaceIndex, newNode);
            this._retile(workspaceIndex);
            return;
        }

        console.log(`[Simple Tiling] Adding window to existing tree`);

        // Find target node to split (use the previously focused window)
        let targetNode = null;
        if (targetWindow &&
            this.windowNodes.has(targetWindow) &&
            targetWindow.get_workspace() === workspace) {
            targetNode = this.windowNodes.get(targetWindow);
            console.log(`[Simple Tiling] Target is previously focused window: ${targetWindow.get_title()} (id: ${targetWindow.get_id()})`);
        } else {
            // Fallback: use last leaf in tree
            const leaves = root.getLeaves();
            if (leaves.length > 0) {
                targetNode = leaves[leaves.length - 1];
                if (targetNode.metaWindow) {
                    console.log(`[Simple Tiling] Target is last leaf: ${targetNode.metaWindow.get_title()} (id: ${targetNode.metaWindow.get_id()})`);
                }
            }
        }

        if (!targetNode) {
            // Fallback: make new window the only window
            this.workspaceTrees.set(workspaceIndex, newNode);
            this._retile(workspaceIndex);
            return;
        }

        // Determine split direction based on target's current geometry
        const splitType = this._determineSplitType(targetNode.geometry);

        // Create container to replace target
        const container = new TreeNode(NodeType.CONTAINER);
        container.splitType = splitType;

        // Replace target with container in tree
        if (targetNode.parent) {
            targetNode.replaceWith(container);
        } else {
            // Target is root
            this.workspaceTrees.set(workspaceIndex, container);
        }

        // Set up parent-child relationships
        container.firstChild = targetNode;
        container.secondChild = newNode;
        targetNode.parent = container;
        newNode.parent = container;

        // Retile the workspace
        this._retile(workspaceIndex);
    }

    /**
     * Start monitoring a window's geometry and correct it if it misbehaves
     */
    _monitorWindowGeometry(metaWindow) {
        const signals = [];

        // Listen to position changes
        const posId = metaWindow.connect('position-changed', () => {
            this._onWindowGeometryChanged(metaWindow);
        });
        signals.push({ object: metaWindow, id: posId });

        // Listen to size changes
        const sizeId = metaWindow.connect('size-changed', () => {
            this._onWindowGeometryChanged(metaWindow);
        });
        signals.push({ object: metaWindow, id: sizeId });

        this.windowSignals.set(metaWindow, signals);
        console.log(`[Simple Tiling] Monitoring geometry changes for ${metaWindow.get_title()}`);
    }

    /**
     * Called when a window's geometry changes - verify it's in the correct position
     */
    _onWindowGeometryChanged(metaWindow) {
        // Avoid recursive calls while we're applying geometry
        if (this.isApplyingGeometry) {
            return;
        }

        const node = this.windowNodes.get(metaWindow);
        if (!node || !node.geometry) {
            return;
        }

        // Check if window is where it should be
        const actualFrame = metaWindow.get_frame_rect();
        if (!actualFrame) {
            return;
        }

        const expected = node.geometry;
        const expectedX = expected.x + GAP_SIZE;
        const expectedY = expected.y + GAP_SIZE;
        const expectedW = expected.width - (GAP_SIZE * 2);
        const expectedH = expected.height - (GAP_SIZE * 2);

        // Allow small tolerance (5px) for minor differences
        const tolerance = 5;
        if (Math.abs(actualFrame.x - expectedX) > tolerance ||
            Math.abs(actualFrame.y - expectedY) > tolerance ||
            Math.abs(actualFrame.width - expectedW) > tolerance ||
            Math.abs(actualFrame.height - expectedH) > tolerance) {

            console.log(`[Simple Tiling] Window ${metaWindow.get_title()} moved itself! Expected (${expectedX},${expectedY},${expectedW}x${expectedH}) but got (${actualFrame.x},${actualFrame.y},${actualFrame.width}x${actualFrame.height})`);

            // Reapply correct geometry
            this._applyWindowGeometry(metaWindow, node.geometry);
        }
    }

    /**
     * Apply geometry to a single window
     */
    _applyWindowGeometry(metaWindow, geometry) {
        this.isApplyingGeometry = true;

        try {
            // Unmaximize first
            try {
                metaWindow.unmaximize();
            } catch (e) {
                // Ignore
            }

            const rect = new Mtk.Rectangle({
                x: geometry.x + GAP_SIZE,
                y: geometry.y + GAP_SIZE,
                width: geometry.width - (GAP_SIZE * 2),
                height: geometry.height - (GAP_SIZE * 2)
            });

            console.log(`[Simple Tiling] Correcting ${metaWindow.get_title()} to x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);
            metaWindow.move_resize_frame(false, rect.x, rect.y, rect.width, rect.height);
        } finally {
            this.isApplyingGeometry = false;
        }
    }

    /**
     * Stop monitoring a window's geometry
     */
    _stopMonitoringWindow(metaWindow) {
        const signals = this.windowSignals.get(metaWindow);
        if (signals) {
            signals.forEach(signal => {
                signal.object.disconnect(signal.id);
            });
            this.windowSignals.delete(metaWindow);
        }
    }

    /**
     * Remove a window from the tiling tree
     */
    _removeWindow(metaWindow) {
        console.log(`[Simple Tiling] _removeWindow called for: ${metaWindow.get_title()} (id: ${metaWindow.get_id()})`);

        const node = this.windowNodes.get(metaWindow);
        if (!node) {
            console.log(`[Simple Tiling] Window not in tree, ignoring removal`);
            return;
        }

        // Stop monitoring this window's geometry
        this._stopMonitoringWindow(metaWindow);

        // Find which workspace this window's tree belongs to
        let workspaceIndex = null;
        for (const [wsIndex, root] of this.workspaceTrees.entries()) {
            if (this._nodeInTree(node, root)) {
                workspaceIndex = wsIndex;
                break;
            }
        }

        if (workspaceIndex === null) {
            console.log(`[Simple Tiling] Could not find workspace for window, removing from map only`);
            this.windowNodes.delete(metaWindow);
            return;
        }

        console.log(`[Simple Tiling] Removing window from workspace ${workspaceIndex}`);
        this.windowNodes.delete(metaWindow);

        if (!node.parent) {
            // Was the only window on workspace
            console.log(`[Simple Tiling] Window was only window on workspace, clearing tree`);
            this.workspaceTrees.delete(workspaceIndex);
            return;
        }

        const parent = node.parent;
        const sibling = node.getSibling();

        if (!sibling) {
            // No sibling, remove parent too
            console.log(`[Simple Tiling] No sibling found, removing parent`);
            if (parent.parent) {
                parent.detach();
            } else {
                this.workspaceTrees.delete(workspaceIndex);
            }
            this._retile(workspaceIndex);
            return;
        }

        console.log(`[Simple Tiling] Promoting sibling to parent's position`);
        if (parent.parent) {
            // Promote sibling to parent's position
            parent.replaceWith(sibling);
        } else {
            // Parent was root, sibling becomes new root
            this.workspaceTrees.set(workspaceIndex, sibling);
            sibling.parent = null;
        }

        console.log(`[Simple Tiling] Retiling workspace ${workspaceIndex} after window removal`);
        this._retile(workspaceIndex);
    }

    /**
     * Check if a node is in a tree
     */
    _nodeInTree(node, root) {
        if (node === root) {
            return true;
        }
        let current = node;
        while (current.parent) {
            current = current.parent;
            if (current === root) {
                return true;
            }
        }
        return false;
    }

    /**
     * Determine split direction based on geometry aspect ratio
     */
    _determineSplitType(geometry) {
        if (!geometry) {
            return SplitType.VERTICAL; // Default
        }
        // Wider than tall -> split vertically (side-by-side)
        // Taller than wide -> split horizontally (stacked)
        return geometry.width > geometry.height
            ? SplitType.VERTICAL
            : SplitType.HORIZONTAL;
    }

    /**
     * Retile all windows on a workspace
     */
    _retile(workspaceIndex) {
        console.log(`[Simple Tiling] _retile called for workspace ${workspaceIndex}`);
        const root = this.workspaceTrees.get(workspaceIndex);
        if (!root) {
            console.log(`[Simple Tiling] No root node for workspace ${workspaceIndex}`);
            return;
        }

        const workspaceManager = global.workspace_manager;
        const workspace = workspaceManager.get_workspace_by_index(workspaceIndex);
        if (!workspace) {
            return;
        }

        // Get work area for primary monitor
        const primaryMonitor = global.display.get_primary_monitor();
        const workArea = workspace.get_work_area_for_monitor(primaryMonitor);
        console.log(`[Simple Tiling] Work area for monitor ${primaryMonitor}: x=${workArea.x}, y=${workArea.y}, w=${workArea.width}, h=${workArea.height}`);

        // Calculate geometries for all nodes in tree
        console.log('[Simple Tiling] Calculating geometries...');
        this._calculateGeometry(root, workArea);

        // Apply calculated geometries to actual windows
        console.log('[Simple Tiling] Applying geometries...');
        this._applyGeometries(root);
        console.log('[Simple Tiling] _retile completed');
    }

    /**
     * Recursively calculate geometry for tree nodes
     */
    _calculateGeometry(node, geometry) {
        node.geometry = {
            x: geometry.x,
            y: geometry.y,
            width: geometry.width,
            height: geometry.height
        };

        if (node.isLeaf()) {
            if (node.metaWindow) {
                console.log(`[Simple Tiling] Geometry for ${node.metaWindow.get_title()} (id: ${node.metaWindow.get_id()}): x=${geometry.x}, y=${geometry.y}, w=${geometry.width}, h=${geometry.height}`);
            }
            return;
        }

        // Split geometry for children based on split type
        if (node.splitType === SplitType.VERTICAL) {
            // Split left-right
            const halfWidth = Math.floor(geometry.width * node.splitRatio);

            const firstGeo = {
                x: geometry.x,
                y: geometry.y,
                width: halfWidth,
                height: geometry.height
            };

            const secondGeo = {
                x: geometry.x + halfWidth,
                y: geometry.y,
                width: geometry.width - halfWidth,
                height: geometry.height
            };

            if (node.firstChild) {
                this._calculateGeometry(node.firstChild, firstGeo);
            }
            if (node.secondChild) {
                this._calculateGeometry(node.secondChild, secondGeo);
            }
        } else { // HORIZONTAL
            // Split top-bottom
            const halfHeight = Math.floor(geometry.height * node.splitRatio);

            const firstGeo = {
                x: geometry.x,
                y: geometry.y,
                width: geometry.width,
                height: halfHeight
            };

            const secondGeo = {
                x: geometry.x,
                y: geometry.y + halfHeight,
                width: geometry.width,
                height: geometry.height - halfHeight
            };

            if (node.firstChild) {
                this._calculateGeometry(node.firstChild, firstGeo);
            }
            if (node.secondChild) {
                this._calculateGeometry(node.secondChild, secondGeo);
            }
        }
    }

    /**
     * Recursively apply geometries to windows
     */
    _applyGeometries(node) {
        if (node.isLeaf() && node.metaWindow) {
            // Validate window is in a state where it can be manipulated
            const win = node.metaWindow;

            console.log(`[Simple Tiling] Applying geometry to window: ${win.get_title()} (id: ${win.get_id()})`);

            // Skip if window is being destroyed or not ready
            try {
                if (!win.get_compositor_private()) {
                    console.log(`[Simple Tiling] Window ${win.get_title()} (id: ${win.get_id()}) not ready (no compositor)`);
                    return;
                }

                // Skip if window doesn't have a frame (not fully initialized)
                const frameRect = win.get_frame_rect();
                if (!frameRect || frameRect.width === 0 || frameRect.height === 0) {
                    console.log(`[Simple Tiling] Window ${win.get_title()} (id: ${win.get_id()}) has no valid frame rect`);
                    return;
                }
            } catch (e) {
                console.log(`[Simple Tiling] Window ${win.get_title()} (id: ${win.get_id()}) check failed: ${e.message}`);
                return;
            }

            // Unmaximize window first (GNOME 49+ compatible)
            try {
                // GNOME 49+ unmaximize() takes no arguments
                win.unmaximize();
            } catch (e) {
                // Silently ignore - window might not be maximized or in a state to unmaximize
            }

            // Apply geometry with gap insets
            const geo = node.geometry;
            const rect = new Mtk.Rectangle({
                x: geo.x + GAP_SIZE,
                y: geo.y + GAP_SIZE,
                width: geo.width - (GAP_SIZE * 2),
                height: geo.height - (GAP_SIZE * 2)
            });

            console.log(`[Simple Tiling] Moving ${win.get_title()} (id: ${win.get_id()}) to x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);

            // Move and resize the window with error handling
            try {
                win.move_resize_frame(false, rect.x, rect.y, rect.width, rect.height);
                console.log(`[Simple Tiling] Successfully moved/resized ${win.get_title()}`);
            } catch (e) {
                console.warn(`[Simple Tiling] Failed to move/resize window ${win.get_title()}: ${e.message}`);
            }
        } else if (node.isContainer()) {
            if (node.firstChild) {
                this._applyGeometries(node.firstChild);
            }
            if (node.secondChild) {
                this._applyGeometries(node.secondChild);
            }
        }
    }

    /**
     * Tile existing windows on current workspace
     */
    _tileExistingWindows() {
        console.log('[Simple Tiling] _tileExistingWindows called');
        const workspaceManager = global.workspace_manager;
        const activeWorkspace = workspaceManager.get_active_workspace();

        const windows = activeWorkspace.list_windows();
        console.log(`[Simple Tiling] Found ${windows.length} windows on active workspace`);

        const validWindows = [];
        windows.forEach(metaWindow => {
            console.log(`[Simple Tiling] Checking window: ${metaWindow.get_title()}, type: ${metaWindow.window_type}`);
            if (this._shouldTileWindow(metaWindow)) {
                // Only add windows that are actually ready
                try {
                    if (!metaWindow.get_compositor_private()) {
                        console.log(`[Simple Tiling] Skipping window without compositor: ${metaWindow.get_title()}`);
                        return;
                    }

                    const frameRect = metaWindow.get_frame_rect();
                    if (!frameRect || frameRect.width === 0 || frameRect.height === 0) {
                        console.log(`[Simple Tiling] Skipping window with invalid frame: ${metaWindow.get_title()}`);
                        return;
                    }

                    console.log(`[Simple Tiling] Adding existing window to tree: ${metaWindow.get_title()}`);
                    const newNode = new TreeNode(NodeType.WINDOW, metaWindow);
                    this.windowNodes.set(metaWindow, newNode);
                    validWindows.push(metaWindow);

                    // Handle window removal
                    metaWindow.connect('unmanaged', () => {
                        this._removeWindow(metaWindow);
                    });
                } catch (e) {
                    console.log(`[Simple Tiling] Error checking window ${metaWindow.get_title()}: ${e.message}`);
                }
            }
        });

        if (validWindows.length === 0) {
            console.log('[Simple Tiling] No valid windows to tile');
            return;
        }

        // Build initial tree
        const workspaceIndex = activeWorkspace.index();
        const windowArray = Array.from(this.windowNodes.values());

        // Start with first window as root
        let root = windowArray[0];
        this.workspaceTrees.set(workspaceIndex, root);

        // Insert remaining windows one by one
        for (let i = 1; i < windowArray.length; i++) {
            const node = windowArray[i];

            // Find a leaf to split
            const leaves = root.getLeaves();
            const targetNode = leaves[leaves.length - 1]; // Use last leaf

            const splitType = this._determineSplitType(targetNode.geometry || {width: 1920, height: 1080});

            const container = new TreeNode(NodeType.CONTAINER);
            container.splitType = splitType;

            if (targetNode.parent) {
                targetNode.replaceWith(container);
            } else {
                root = container;
                this.workspaceTrees.set(workspaceIndex, container);
            }

            container.firstChild = targetNode;
            container.secondChild = node;
            targetNode.parent = container;
            node.parent = container;
        }

        this._retile(workspaceIndex);
    }
}

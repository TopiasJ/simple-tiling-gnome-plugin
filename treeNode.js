// treeNode.js - BSP tree node for window tiling

export const NodeType = {
    WINDOW: 'window',
    CONTAINER: 'container'
};

export const SplitType = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};

export class TreeNode {
    constructor(type, metaWindow = null) {
        this.type = type;
        this.metaWindow = metaWindow;
        this.parent = null;
        this.geometry = null;

        // For containers
        this.firstChild = null;
        this.secondChild = null;
        this.splitType = null;
        this.splitRatio = 0.5; // Default 50/50 split
    }

    /**
     * Check if this node is a leaf (window) node
     */
    isLeaf() {
        return this.type === NodeType.WINDOW;
    }

    /**
     * Check if this node is a container node
     */
    isContainer() {
        return this.type === NodeType.CONTAINER;
    }

    /**
     * Detach this node from its parent
     */
    detach() {
        if (this.parent) {
            if (this.parent.firstChild === this) {
                this.parent.firstChild = null;
            } else {
                this.parent.secondChild = null;
            }
            this.parent = null;
        }
    }

    /**
     * Get the sibling node (if any)
     */
    getSibling() {
        if (!this.parent) {
            return null;
        }
        return this.parent.firstChild === this
            ? this.parent.secondChild
            : this.parent.firstChild;
    }

    /**
     * Replace this node with another node in the tree
     */
    replaceWith(otherNode) {
        if (this.parent) {
            if (this.parent.firstChild === this) {
                this.parent.firstChild = otherNode;
            } else {
                this.parent.secondChild = otherNode;
            }
            otherNode.parent = this.parent;
        }
        this.parent = null;
    }

    /**
     * Get all leaf (window) nodes in this subtree
     */
    getLeaves() {
        if (this.isLeaf()) {
            return [this];
        }

        const leaves = [];
        if (this.firstChild) {
            leaves.push(...this.firstChild.getLeaves());
        }
        if (this.secondChild) {
            leaves.push(...this.secondChild.getLeaves());
        }
        return leaves;
    }
}

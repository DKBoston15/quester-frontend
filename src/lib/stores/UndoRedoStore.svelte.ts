
  import type { Node, Edge } from "@xyflow/svelte";

  interface ModelState {
    nodes: Node[];
    edges: Edge[];
    timestamp: number;
  }

  const MAX_HISTORY_SIZE = 50;

  let history = $state<ModelState[]>([]);
  let currentIndex = $state(-1);
  let isApplyingHistoryChange = $state(false);

  export const undoRedoStore = {
    get canUndo() {
      return currentIndex > 0;
    },
    get canRedo() {
      return currentIndex < history.length - 1;
    },
    get isApplyingChange() {
      return isApplyingHistoryChange;
    },

    // Save current state to history
    saveState(nodes: Node[], edges: Edge[]) {
      if (isApplyingHistoryChange) return;

      const newState: ModelState = {
        nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
        edges: JSON.parse(JSON.stringify(edges)), // Deep clone
        timestamp: Date.now(),
      };

      // Remove any states after current index (when adding new state after undo)
      if (currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
      }

      // Add new state
      history.push(newState);
      currentIndex = history.length - 1;

      // Limit history size
      if (history.length > MAX_HISTORY_SIZE) {
        history = history.slice(1);
        currentIndex = history.length - 1;
      }
    },

    // Undo last change
    undo(): { nodes: Node[]; edges: Edge[] } | null {
      if (!this.canUndo) return null;

      currentIndex--;
      const state = history[currentIndex];
      
      isApplyingHistoryChange = true;
      return {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
    },

    // Redo next change
    redo(): { nodes: Node[]; edges: Edge[] } | null {
      if (!this.canRedo) return null;

      currentIndex++;
      const state = history[currentIndex];
      
      isApplyingHistoryChange = true;
      return {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
    },

    // Complete history change application
    completeHistoryChange() {
      isApplyingHistoryChange = false;
    },

    // Initialize with initial state
    initialize(nodes: Node[], edges: Edge[]) {
      history = [];
      currentIndex = -1;
      this.saveState(nodes, edges);
    },

    // Clear history
    clear() {
      history = [];
      currentIndex = -1;
      isApplyingHistoryChange = false;
    },

    // Get current state info for debugging
    getInfo() {
      return {
        historyLength: history.length,
        currentIndex,
        canUndo: this.canUndo,
        canRedo: this.canRedo,
      };
    },
  };

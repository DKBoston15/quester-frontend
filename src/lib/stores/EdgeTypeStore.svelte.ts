export type EdgeType = "straight" | "step" | "smoothstep" | "bezier";

let currentEdgeTypeState = $state<EdgeType>("bezier");

export const edgeTypeStore = {
  get currentEdgeType() {
    return currentEdgeTypeState;
  },

  setEdgeType(type: EdgeType) {
    currentEdgeTypeState = type;
  },

  resetToDefault() {
    currentEdgeTypeState = "bezier";
  },
};

// Legacy export for backward compatibility during migration
export const currentEdgeType = {
  subscribe: (callback: (value: EdgeType) => void) => {
    const unsubscribe = $effect(() => {
      callback(currentEdgeTypeState);
    });
    return { unsubscribe };
  },
  set: (value: EdgeType) => {
    currentEdgeTypeState = value;
  },
  update: (updater: (value: EdgeType) => EdgeType) => {
    currentEdgeTypeState = updater(currentEdgeTypeState);
  },
};
import { MarkerType } from "@xyflow/svelte";

export type EdgeType = "straight" | "step" | "smoothstep" | "bezier";

export interface EdgeSettings {
  type: EdgeType;
  color: string;
  width: number;
  animated: boolean;
  markerStart: boolean;
  markerEnd: boolean;
}

const defaultSettings: EdgeSettings = {
  type: "bezier",
  color: "#374151",
  width: 3,
  animated: false,
  markerStart: false,
  markerEnd: true,
};

let edgeSettingsState = $state<EdgeSettings>({ ...defaultSettings });

// Derived value for edge options that can be used directly with SvelteFlow
const derivedDefaultEdgeOptions = $derived(() => {
  return {
    type: edgeSettingsState.type,
    animated: edgeSettingsState.animated,
    style: `stroke: ${edgeSettingsState.color}; stroke-width: ${edgeSettingsState.width}px;`,
    markerEnd: edgeSettingsState.markerEnd
      ? { type: MarkerType.ArrowClosed }
      : undefined,
    markerStart: edgeSettingsState.markerStart
      ? { type: MarkerType.ArrowClosed }
      : undefined,
  };
});

export const edgeSettingsStore = {
  get edgeSettings() {
    return edgeSettingsState;
  },
  
  get defaultEdgeOptions() {
    return derivedDefaultEdgeOptions;
  },

  updateSettings(newSettings: Partial<EdgeSettings>) {
    edgeSettingsState = { ...edgeSettingsState, ...newSettings };
  },

  resetToDefaults() {
    edgeSettingsState = { ...defaultSettings };
  },

  setType(type: EdgeType) {
    edgeSettingsState.type = type;
  },

  setColor(color: string) {
    edgeSettingsState.color = color;
  },

  setWidth(width: number) {
    edgeSettingsState.width = width;
  },

  setAnimated(animated: boolean) {
    edgeSettingsState.animated = animated;
  },

  setMarkerStart(markerStart: boolean) {
    edgeSettingsState.markerStart = markerStart;
  },

  setMarkerEnd(markerEnd: boolean) {
    edgeSettingsState.markerEnd = markerEnd;
  },
};

// Legacy exports for backward compatibility during migration
export const edgeSettings = {
  subscribe: (callback: (value: EdgeSettings) => void) => {
    const unsubscribe = $effect(() => {
      callback(edgeSettingsState);
    });
    return { unsubscribe };
  },
  set: (value: EdgeSettings) => {
    edgeSettingsState = value;
  },
  update: (updater: (value: EdgeSettings) => EdgeSettings) => {
    edgeSettingsState = updater(edgeSettingsState);
  },
};

export const defaultEdgeOptions = {
  subscribe: (callback: (value: any) => void) => {
    const unsubscribe = $effect(() => {
      callback(derivedDefaultEdgeOptions);
    });
    return { unsubscribe };
  },
};
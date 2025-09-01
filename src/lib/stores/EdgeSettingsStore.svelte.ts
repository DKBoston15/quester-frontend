import { MarkerType } from "@xyflow/svelte";
import { derived, get, writable } from "svelte/store";

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

// Core writable store for edge settings
const edgeSettingsWritable = writable<EdgeSettings>({ ...defaultSettings });

// Derived value for edge options that can be used directly with SvelteFlow
const defaultEdgeOptionsDerived = derived(edgeSettingsWritable, (state) => ({
  type: state.type,
  animated: state.animated,
  style: `stroke: ${state.color}; stroke-width: ${state.width}px;`,
  markerEnd: state.markerEnd ? { type: MarkerType.ArrowClosed } : undefined,
  markerStart: state.markerStart ? { type: MarkerType.ArrowClosed } : undefined,
}));

export const edgeSettingsStore = {
  get edgeSettings() {
    return get(edgeSettingsWritable);
  },

  get defaultEdgeOptions() {
    return get(defaultEdgeOptionsDerived);
  },

  updateSettings(newSettings: Partial<EdgeSettings>) {
    edgeSettingsWritable.update((s) => ({ ...s, ...newSettings }));
  },

  resetToDefaults() {
    edgeSettingsWritable.set({ ...defaultSettings });
  },

  setType(type: EdgeType) {
    edgeSettingsWritable.update((s) => ({ ...s, type }));
  },

  setColor(color: string) {
    edgeSettingsWritable.update((s) => ({ ...s, color }));
  },

  setWidth(width: number) {
    edgeSettingsWritable.update((s) => ({ ...s, width }));
  },

  setAnimated(animated: boolean) {
    edgeSettingsWritable.update((s) => ({ ...s, animated }));
  },

  setMarkerStart(markerStart: boolean) {
    edgeSettingsWritable.update((s) => ({ ...s, markerStart }));
  },

  setMarkerEnd(markerEnd: boolean) {
    edgeSettingsWritable.update((s) => ({ ...s, markerEnd }));
  },
};

// Legacy exports for backward compatibility during migration
export const edgeSettings = {
  subscribe: edgeSettingsWritable.subscribe,
  set: edgeSettingsWritable.set,
  update: edgeSettingsWritable.update,
};

export const defaultEdgeOptions = {
  subscribe: defaultEdgeOptionsDerived.subscribe,
};

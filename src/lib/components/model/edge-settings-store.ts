import { writable, derived } from "svelte/store";
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

export const edgeSettings = writable<EdgeSettings>(defaultSettings);

// Derived store for edge options that can be used directly with SvelteFlow
export const defaultEdgeOptions = derived(edgeSettings, ($settings) => {
  return {
    type: $settings.type,
    animated: $settings.animated,
    style: `stroke: ${$settings.color}; stroke-width: ${$settings.width}px;`,
    markerEnd: $settings.markerEnd
      ? { type: MarkerType.ArrowClosed }
      : undefined,
    markerStart: $settings.markerStart
      ? { type: MarkerType.ArrowClosed }
      : undefined,
  };
});

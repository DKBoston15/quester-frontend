import { writable } from "svelte/store";

export type EdgeType = "straight" | "step" | "smoothstep" | "bezier";

export const currentEdgeType = writable<EdgeType>("bezier");

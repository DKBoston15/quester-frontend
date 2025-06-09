export { default as Timeline } from "./Timeline.svelte";
export { default as TimelineControls } from "./TimelineControls.svelte";

import type { CustomEventType } from "$lib/types/custom-events";

export type TimelineEvent = {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  type:
    | "project"
    | "literature"
    | "notes"
    | "models"
    | "outcomes"
    | "status"
    | "design"
    | "insights"
    | "custom";
  data?: any;
  details?: string[];
  isCustom?: boolean;
  customEventType?: CustomEventType;
  creator?: any;
  tags?: string[];
  canEdit?: boolean;
  canDelete?: boolean;
};

export interface FilterOptions {
  types: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery: string;
  customEventTypes?: string[];
  createdBy?: string[];
  tags?: string[];
}

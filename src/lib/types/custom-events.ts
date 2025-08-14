export enum CustomEventType {
  MILESTONE = "milestone",
  DEADLINE = "deadline",
  MEETING = "meeting",
  INSIGHT = "insight",
  DECISION = "decision",
  ADMINISTRATION = "administration",
  OTHER = "other",
}

export interface CustomEventCreator {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface CustomTimelineEvent {
  id: number;
  projectId: string;
  userId: string;
  title: string;
  description?: string | null;
  eventType: CustomEventType;
  eventTimestamp: string; // ISO string from backend
  details?: string[] | null;
  tags?: string[] | null;
  creator?: CustomEventCreator | null;
  createdAt: string;
  updatedAt: string;
  isCustom: true; // Flag to distinguish from system events
}

// Extended TimelineEvent interface that includes custom events
export interface EnhancedTimelineEvent {
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
    | "custom"; // Added custom type
  data?: any;
  details?: string[];
  // Custom event specific fields
  isCustom?: boolean;
  customEventType?: CustomEventType;
  creator?: CustomEventCreator;
  tags?: string[];
  canEdit?: boolean; // User permission to edit this event
  canDelete?: boolean; // User permission to delete this event
}

// Form interfaces for creating and editing custom events
export interface CreateCustomEventForm {
  title: string;
  description?: string;
  eventType: CustomEventType;
  eventTimestamp: Date;
  details?: string[];
  tags?: string[];
}

export interface UpdateCustomEventForm {
  title?: string;
  description?: string;
  eventType?: CustomEventType;
  eventTimestamp?: Date;
  details?: string[];
  tags?: string[];
}

// API response interfaces
export interface CustomEventListResponse {
  data: CustomTimelineEvent[];
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
    firstPageUrl: string;
    lastPageUrl: string;
    nextPageUrl?: string | null;
    previousPageUrl?: string | null;
  };
}

export interface CustomEventResponse {
  message: string;
  event: CustomTimelineEvent;
}

// Filter and search interfaces
export interface CustomEventFilters {
  eventType?: CustomEventType;
  userId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
  sortBy?: "eventTimestamp" | "createdAt" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CustomEventSearchParams extends CustomEventFilters {
  query: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

// Store state interfaces
export interface CustomEventsState {
  events: CustomTimelineEvent[];
  loading: boolean;
  error: string | null;
  filters: CustomEventFilters;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalEvents: number;
    perPage: number;
  };
}

export interface CustomEventFormState {
  isOpen: boolean;
  mode: "create" | "edit";
  eventId?: number;
  data: CreateCustomEventForm;
  loading: boolean;
  errors: Record<string, string>;
}

// Event type configuration for UI
export interface EventTypeConfig {
  type: CustomEventType;
  label: string;
  description: string;
  icon: string; // Icon component name
  color: {
    bg: string;
    border: string;
    icon: string;
    text: string;
    tag: string;
  };
  examples: string[];
}

// Context menu interfaces
export interface CustomEventMenuOption {
  id: string;
  label: string;
  icon: string;
  action: (event: CustomTimelineEvent) => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

export interface CustomEventMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  targetEvent: CustomTimelineEvent | null;
  options: CustomEventMenuOption[];
}

// Error interfaces
export interface CustomEventError {
  field?: string;
  message: string;
  code?: string;
}

export interface CustomEventValidationErrors {
  title?: string[];
  description?: string[];
  eventType?: string[];
  eventTimestamp?: string[];
  details?: string[];
  tags?: string[];
}

// Utility types
export type CustomEventAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_EVENTS"; payload: CustomTimelineEvent[] }
  | { type: "ADD_EVENT"; payload: CustomTimelineEvent }
  | { type: "UPDATE_EVENT"; payload: CustomTimelineEvent }
  | { type: "REMOVE_EVENT"; payload: number }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_FILTERS"; payload: CustomEventFilters }
  | {
      type: "SET_PAGINATION";
      payload: Partial<CustomEventsState["pagination"]>;
    };

// Permission types
export type CustomEventPermission =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "restore";

export interface CustomEventPermissions {
  [key: string]: boolean;
}

// Integration with existing timeline
export function isCustomEvent(
  event: EnhancedTimelineEvent
): event is EnhancedTimelineEvent & { isCustom: true } {
  return event.isCustom === true;
}

export function convertCustomEventToTimelineEvent(
  customEvent: CustomTimelineEvent
): EnhancedTimelineEvent {
  return {
    id: `custom_${customEvent.id}`,
    title: customEvent.title,
    description: customEvent.description || undefined,
    timestamp: new Date(customEvent.eventTimestamp),
    type: "custom",
    data: customEvent,
    details: customEvent.details || undefined,
    isCustom: true,
    customEventType: customEvent.eventType,
    creator: customEvent.creator || undefined,
    tags: customEvent.tags || undefined,
    canEdit: true, // Will be determined by actual permissions
    canDelete: true, // Will be determined by actual permissions
  };
}

export function convertTimelineEventToCustomEvent(
  timelineEvent: EnhancedTimelineEvent
): CustomTimelineEvent | null {
  if (!isCustomEvent(timelineEvent) || !timelineEvent.data) {
    return null;
  }
  return timelineEvent.data as CustomTimelineEvent;
}

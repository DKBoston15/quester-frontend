// Event Type Configuration for Custom Timeline Events

import { CustomEventType, type EventTypeConfig } from "../types/custom-events";
import {
  Trophy,
  Clock,
  Users,
  Lightbulb,
  Gavel,
  Briefcase,
  Star,
  Calendar,
  Target,
  Coffee,
  BookOpen,
  Zap,
  CheckCircle,
} from "lucide-svelte";

// Event type configurations with icons, colors, and metadata
export const eventTypeConfigs: Record<CustomEventType, EventTypeConfig> = {
  [CustomEventType.MILESTONE]: {
    type: CustomEventType.MILESTONE,
    label: "Milestone",
    description: "Important project achievements and key deliverables",
    icon: "Trophy",
    color: {
      bg: "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-900/20",
      border: "border-l-amber-500 border-amber-200 dark:border-amber-800",
      icon: "bg-gradient-to-br from-amber-500 to-yellow-600",
      text: "text-amber-900 dark:text-amber-100",
      tag: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    },
    examples: [
      "Project phase completion",
      "First prototype ready",
      "Research milestone achieved",
      "Grant submission completed",
      "Publication accepted",
    ],
  },

  [CustomEventType.DEADLINE]: {
    type: CustomEventType.DEADLINE,
    label: "Deadline",
    description: "Important dates and time-sensitive commitments",
    icon: "Clock",
    color: {
      bg: "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/30 dark:to-rose-900/20",
      border: "border-l-red-500 border-red-200 dark:border-red-800",
      icon: "bg-gradient-to-br from-red-500 to-rose-600",
      text: "text-red-900 dark:text-red-100",
      tag: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    },
    examples: [
      "Grant application due",
      "Conference submission deadline",
      "Report submission",
      "Ethics approval deadline",
      "Final presentation due",
    ],
  },

  [CustomEventType.MEETING]: {
    type: CustomEventType.MEETING,
    label: "Meeting",
    description:
      "Scheduled meetings, presentations, and collaborative sessions",
    icon: "Users",
    color: {
      bg: "bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950/30 dark:to-sky-900/20",
      border: "border-l-blue-500 border-blue-200 dark:border-blue-800",
      icon: "bg-gradient-to-br from-blue-500 to-sky-600",
      text: "text-blue-900 dark:text-blue-100",
      tag: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    },
    examples: [
      "Team sync meeting",
      "Advisor consultation",
      "Conference presentation",
      "Review committee meeting",
      "Collaborative workshop",
    ],
  },

  [CustomEventType.INSIGHT]: {
    type: CustomEventType.INSIGHT,
    label: "Insight",
    description: "Key discoveries, breakthroughs, and important realizations",
    icon: "Lightbulb",
    color: {
      bg: "bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/30 dark:to-violet-900/20",
      border: "border-l-purple-500 border-purple-200 dark:border-purple-800",
      icon: "bg-gradient-to-br from-purple-500 to-violet-600",
      text: "text-purple-900 dark:text-purple-100",
      tag: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
    },
    examples: [
      "Research breakthrough",
      "New methodology discovered",
      "Pattern identified in data",
      "Theoretical insight",
      "Problem solution found",
    ],
  },

  [CustomEventType.DECISION]: {
    type: CustomEventType.DECISION,
    label: "Decision",
    description:
      "Important decisions and strategic choices that shape the project",
    icon: "Gavel",
    color: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20",
      border: "border-l-green-500 border-green-200 dark:border-green-800",
      icon: "bg-gradient-to-br from-green-500 to-emerald-600",
      text: "text-green-900 dark:text-green-100",
      tag: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    },
    examples: [
      "Methodology selection",
      "Technology choice",
      "Scope adjustment",
      "Timeline revision",
      "Resource allocation",
    ],
  },

  [CustomEventType.ADMINISTRATION]: {
    type: CustomEventType.ADMINISTRATION,
    label: "Administration",
    description:
      "Administrative tasks, documentation, and project management activities",
    icon: "Briefcase",
    color: {
      bg: "bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-950/30 dark:to-blue-900/20",
      border: "border-l-indigo-500 border-indigo-200 dark:border-indigo-800",
      icon: "bg-gradient-to-br from-indigo-500 to-blue-600",
      text: "text-indigo-900 dark:text-indigo-100",
      tag: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200",
    },
    examples: [
      "Budget review",
      "Progress report",
      "Compliance check",
      "Documentation update",
      "Administrative approval",
    ],
  },

  [CustomEventType.OTHER]: {
    type: CustomEventType.OTHER,
    label: "Other",
    description:
      "General events and activities not covered by other categories",
    icon: "Star",
    color: {
      bg: "bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950/30 dark:to-slate-900/20",
      border: "border-l-gray-500 border-gray-200 dark:border-gray-800",
      icon: "bg-gradient-to-br from-gray-500 to-slate-600",
      text: "text-gray-900 dark:text-gray-100",
      tag: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200",
    },
    examples: [
      "Field work",
      "Training session",
      "Equipment purchase",
      "Travel for research",
      "General project activity",
    ],
  },
};

// Icon component mapping for dynamic icon rendering
export const eventTypeIcons = {
  Trophy,
  Clock,
  Users,
  Lightbulb,
  Gavel,
  Briefcase,
  Star,
  Calendar,
  Target,
  Coffee,
  BookOpen,
  Zap,
  CheckCircle,
} as const;

// Helper functions
export function getEventTypeConfig(
  eventType: CustomEventType
): EventTypeConfig {
  return eventTypeConfigs[eventType];
}

export function getAllEventTypes(): EventTypeConfig[] {
  return Object.values(eventTypeConfigs);
}

export function getEventTypeOptions() {
  return getAllEventTypes().map((config) => ({
    value: config.type,
    label: config.label,
    description: config.description,
    icon: config.icon,
  }));
}

// Event type priority for sorting (higher priority = more important)
export const eventTypePriority: Record<CustomEventType, number> = {
  [CustomEventType.DEADLINE]: 5,
  [CustomEventType.MILESTONE]: 4,
  [CustomEventType.MEETING]: 3,
  [CustomEventType.DECISION]: 2,
  [CustomEventType.INSIGHT]: 2,
  [CustomEventType.ADMINISTRATION]: 2,
  [CustomEventType.OTHER]: 1,
};

// Default event type for new events
export const DEFAULT_EVENT_TYPE = CustomEventType.OTHER;

// Event type statistics helper
export interface EventTypeStats {
  type: CustomEventType;
  count: number;
  percentage: number;
  config: EventTypeConfig;
}

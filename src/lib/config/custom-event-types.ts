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
import { _ } from "svelte-i18n";
import { get } from "svelte/store";

// Helper function for imperative access to translations
const t = (key: string, options?: object) => get(_)(key, options);

// Function to get event type configurations with translations
export function getEventTypeConfigs(): Record<CustomEventType, EventTypeConfig> {
  return {
    [CustomEventType.MILESTONE]: {
      type: CustomEventType.MILESTONE,
      label: t("customEvents.types.research_milestone.label"),
      description: t("customEvents.types.research_milestone.description"),
      icon: "Trophy",
      color: {
        bg: "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-900/20",
        border: "border-l-amber-500 border-amber-200 dark:border-amber-800",
        icon: "bg-gradient-to-br from-amber-500 to-yellow-600",
        text: "text-amber-900 dark:text-amber-100",
        tag: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
      },
      examples: [t("customEvents.types.research_milestone.example")],
    },

    [CustomEventType.DEADLINE]: {
      type: CustomEventType.DEADLINE,
      label: t("customEvents.types.grant_application.label"),
      description: t("customEvents.types.grant_application.description"),
      icon: "Clock",
      color: {
        bg: "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/30 dark:to-rose-900/20",
        border: "border-l-red-500 border-red-200 dark:border-red-800",
        icon: "bg-gradient-to-br from-red-500 to-rose-600",
        text: "text-red-900 dark:text-red-100",
        tag: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
      },
      examples: [t("customEvents.types.grant_application.example")],
    },

    [CustomEventType.MEETING]: {
      type: CustomEventType.MEETING,
      label: t("customEvents.types.collaboration.label"),
      description: t("customEvents.types.collaboration.description"),
      icon: "Users",
      color: {
        bg: "bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950/30 dark:to-sky-900/20",
        border: "border-l-blue-500 border-blue-200 dark:border-blue-800",
        icon: "bg-gradient-to-br from-blue-500 to-sky-600",
        text: "text-blue-900 dark:text-blue-100",
        tag: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
      },
      examples: [t("customEvents.types.collaboration.example")],
    },

    [CustomEventType.INSIGHT]: {
      type: CustomEventType.INSIGHT,
      label: t("customEvents.types.insight.label"),
      description: t("customEvents.types.insight.description"),
      icon: "Lightbulb",
      color: {
        bg: "bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/30 dark:to-violet-900/20",
        border: "border-l-purple-500 border-purple-200 dark:border-purple-800",
        icon: "bg-gradient-to-br from-purple-500 to-violet-600",
        text: "text-purple-900 dark:text-purple-100",
        tag: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
      },
      examples: [t("customEvents.types.insight.example")],
    },

    [CustomEventType.DECISION]: {
      type: CustomEventType.DECISION,
      label: t("customEvents.types.decision.label"),
      description: t("customEvents.types.decision.description"),
      icon: "Gavel",
      color: {
        bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20",
        border: "border-l-green-500 border-green-200 dark:border-green-800",
        icon: "bg-gradient-to-br from-green-500 to-emerald-600",
        text: "text-green-900 dark:text-green-100",
        tag: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
      },
      examples: [t("customEvents.types.decision.example")],
    },

    [CustomEventType.ADMINISTRATION]: {
      type: CustomEventType.ADMINISTRATION,
      label: t("customEvents.types.data_collection.label"),
      description: t("customEvents.types.data_collection.description"),
      icon: "Briefcase",
      color: {
        bg: "bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-950/30 dark:to-blue-900/20",
        border: "border-l-indigo-500 border-indigo-200 dark:border-indigo-800",
        icon: "bg-gradient-to-br from-indigo-500 to-blue-600",
        text: "text-indigo-900 dark:text-indigo-100",
        tag: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200",
      },
      examples: [t("customEvents.types.data_collection.example")],
    },

    [CustomEventType.OTHER]: {
      type: CustomEventType.OTHER,
      label: t("customEvents.types.other.label"),
      description: t("customEvents.types.other.description"),
      icon: "Star",
      color: {
        bg: "bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950/30 dark:to-slate-900/20",
        border: "border-l-gray-500 border-gray-200 dark:border-gray-800",
        icon: "bg-gradient-to-br from-gray-500 to-slate-600",
        text: "text-gray-900 dark:text-gray-100",
        tag: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200",
      },
      examples: [t("customEvents.types.other.example")],
    },
  };
}

// Backwards compatibility: expose as a constant but evaluate it lazily
export const eventTypeConfigs: Record<CustomEventType, EventTypeConfig> = new Proxy({} as Record<CustomEventType, EventTypeConfig>, {
  get(target, prop: string | symbol) {
    // Lazy evaluation: get fresh configs each time
    const configs = getEventTypeConfigs();
    return configs[prop as CustomEventType];
  },
  ownKeys() {
    return Object.values(CustomEventType);
  },
  has(target, prop) {
    return Object.values(CustomEventType).includes(prop as CustomEventType);
  },
});

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
  const configs = getEventTypeConfigs();
  return configs[eventType];
}

export function getAllEventTypes(): EventTypeConfig[] {
  return Object.values(getEventTypeConfigs());
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

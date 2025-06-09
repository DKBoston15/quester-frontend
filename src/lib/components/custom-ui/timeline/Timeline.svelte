<!-- Timeline.svelte -->
<script lang="ts">
  import {
    Calendar,
    Book,
    PenTool,
    FolderOpen,
    Brain,
    Target,
    ChevronDown,
    ChevronRight,
    Clock,
    Activity,
    Palette,
    Sparkles,
    Search,
    Trophy,
    Users,
    Lightbulb,
    Gavel,
    Star,
    Coffee,
    MoreHorizontal,
    Plus,
  } from "lucide-svelte";
  import { fade, slide, scale } from "svelte/transition";
  import { quintOut, elasticOut } from "svelte/easing";

  // Import custom events components and utilities
  import CustomEventContextMenu from "../custom-events/CustomEventContextMenu.svelte";
  import CustomEventForm from "../custom-events/CustomEventForm.svelte";
  import {
    convertTimelineEventToCustomEvent,
    isCustomEvent,
    type EnhancedTimelineEvent,
    type CustomEventType,
  } from "$lib/types/custom-events";
  import { getEventTypeConfig } from "$lib/config/custom-event-types";
  import { customEventsStore } from "$lib/stores/custom-events-store.svelte";

  interface TimelineEvent {
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
    creator?: any;
    tags?: string[];
    canEdit?: boolean;
    canDelete?: boolean;
  }

  interface TimelineGroup {
    date: string;
    events: TimelineEvent[];
    isExpanded?: boolean;
    groupingKey?: string; // For internal grouping logic
  }

  type GroupingMode = "days" | "weeks" | "months";

  let {
    events = [],
    isLoading = false,
    onEventClick = undefined,
    onCustomEventAction = undefined,
    onEventAdded = undefined,
    groupingMode = "days",
    onGroupingModeChange = undefined,
  } = $props<{
    events: TimelineEvent[];
    isLoading?: boolean;
    onEventClick?: (event: TimelineEvent) => void;
    onCustomEventAction?: (action: string, event: any) => void;
    onEventAdded?: () => void;
    groupingMode?: GroupingMode;
    onGroupingModeChange?: (mode: GroupingMode) => void;
  }>();

  // Context menu state
  let contextMenuOpen = $state(false);
  let contextMenuPosition = $state({ x: 0, y: 0 });
  let contextMenuEvent = $state<any>(null);
  let contextMenuPermissions = $state({});

  // Get form state from store instead of local state
  let customEventFormState = $derived(customEventsStore.formState);

  // Helper functions for date grouping
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // First day is Sunday
    return new Date(d.setDate(diff));
  }

  function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function getGroupingKey(date: Date, mode: GroupingMode): string {
    switch (mode) {
      case "days":
        return date.toDateString();
      case "weeks":
        const weekStart = getWeekStart(date);
        return `week-${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
      case "months":
        return `month-${date.getFullYear()}-${date.getMonth()}`;
      default:
        return date.toDateString();
    }
  }

  function getGroupDisplayDate(
    groupingKey: string,
    mode: GroupingMode
  ): string {
    switch (mode) {
      case "days":
        return groupingKey;
      case "weeks":
        const [, year, month, day] = groupingKey.split("-");
        const weekStart = new Date(
          parseInt(year),
          parseInt(month),
          parseInt(day)
        );
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      case "months":
        const [, yearStr, monthStr] = groupingKey.split("-");
        const monthDate = new Date(parseInt(yearStr), parseInt(monthStr));
        return monthDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      default:
        return groupingKey;
    }
  }

  // Group events by date/week/month based on groupingMode
  let groupedEvents = $derived(() => {
    // Sort events first
    const sortedEvents = [...events].sort(
      (a: TimelineEvent, b: TimelineEvent) =>
        b.timestamp.getTime() - a.timestamp.getTime()
    );

    // Group events by the selected grouping mode
    const groupsArray = sortedEvents.reduce(
      (
        acc: { date: string; events: TimelineEvent[]; groupingKey: string }[],
        event: TimelineEvent
      ) => {
        const groupingKey = getGroupingKey(event.timestamp, groupingMode);
        const displayDate = getGroupDisplayDate(groupingKey, groupingMode);

        // Find existing group or create new one
        const existingGroup = acc.find(
          (group) => group.groupingKey === groupingKey
        );
        if (existingGroup) {
          return acc.map((group) =>
            group.groupingKey === groupingKey
              ? { ...group, events: [...group.events, event] }
              : group
          );
        } else {
          return [
            ...acc,
            {
              date: displayDate,
              events: [event],
              groupingKey,
            },
          ];
        }
      },
      []
    );

    // Sort groups by their grouping key (newest first) and events within each group
    return groupsArray
      .sort(
        (
          a: { date: string; events: TimelineEvent[]; groupingKey: string },
          b: { date: string; events: TimelineEvent[]; groupingKey: string }
        ) => {
          // Extract sortable values from grouping keys
          if (groupingMode === "days") {
            return (
              new Date(b.groupingKey).getTime() -
              new Date(a.groupingKey).getTime()
            );
          } else if (groupingMode === "weeks") {
            const [, aYear, aMonth, aDay] = a.groupingKey.split("-");
            const [, bYear, bMonth, bDay] = b.groupingKey.split("-");
            const aDate = new Date(
              parseInt(aYear),
              parseInt(aMonth),
              parseInt(aDay)
            );
            const bDate = new Date(
              parseInt(bYear),
              parseInt(bMonth),
              parseInt(bDay)
            );
            return bDate.getTime() - aDate.getTime();
          } else if (groupingMode === "months") {
            const [, aYear, aMonth] = a.groupingKey.split("-");
            const [, bYear, bMonth] = b.groupingKey.split("-");
            const aDate = new Date(parseInt(aYear), parseInt(aMonth));
            const bDate = new Date(parseInt(bYear), parseInt(bMonth));
            return bDate.getTime() - aDate.getTime();
          }
          return 0;
        }
      )
      .map(
        ({
          date,
          events,
          groupingKey,
        }: {
          date: string;
          events: TimelineEvent[];
          groupingKey: string;
        }) => ({
          date,
          events: [...events].sort(
            (a: TimelineEvent, b: TimelineEvent) =>
              b.timestamp.getTime() - a.timestamp.getTime()
          ),
          isExpanded: true, // Start expanded for better initial UX
          groupingKey,
        })
      );
  });

  // Enhanced icon mapping for different event types including custom events
  const eventIcons = {
    project: FolderOpen,
    literature: Book,
    notes: PenTool,
    models: Brain,
    outcomes: Target,
    status: Activity,
    design: Palette,
    insights: Search,
    custom: Star, // Default icon for custom events
    // Custom event type specific icons
    milestone: Trophy,
    deadline: Clock,
    meeting: Users,
    insight: Lightbulb,
    decision: Gavel,
    other: Star,
  };

  // Enhanced color mapping with gradients and better contrast including custom events
  const eventColors = {
    project: {
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20",
      border: "border-l-emerald-500 border-emerald-200 dark:border-emerald-800",
      icon: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      text: "text-emerald-900 dark:text-emerald-100",
    },
    literature: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20",
      border: "border-l-blue-500 border-blue-200 dark:border-blue-800",
      icon: "bg-gradient-to-br from-blue-500 to-blue-600",
      text: "text-blue-900 dark:text-blue-100",
    },
    notes: {
      bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20",
      border: "border-l-amber-500 border-amber-200 dark:border-amber-800",
      icon: "bg-gradient-to-br from-amber-500 to-amber-600",
      text: "text-amber-900 dark:text-amber-100",
    },
    models: {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20",
      border: "border-l-purple-500 border-purple-200 dark:border-purple-800",
      icon: "bg-gradient-to-br from-purple-500 to-purple-600",
      text: "text-purple-900 dark:text-purple-100",
    },
    outcomes: {
      bg: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20",
      border: "border-l-rose-500 border-rose-200 dark:border-rose-800",
      icon: "bg-gradient-to-br from-rose-500 to-rose-600",
      text: "text-rose-900 dark:text-rose-100",
    },
    status: {
      bg: "bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/20",
      border: "border-l-cyan-500 border-cyan-200 dark:border-cyan-800",
      icon: "bg-gradient-to-br from-cyan-500 to-cyan-600",
      text: "text-cyan-900 dark:text-cyan-100",
    },
    design: {
      bg: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20",
      border: "border-l-indigo-500 border-indigo-200 dark:border-indigo-800",
      icon: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      text: "text-indigo-900 dark:text-indigo-100",
    },
    insights: {
      bg: "bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20",
      border: "border-l-violet-500 border-violet-200 dark:border-violet-800",
      icon: "bg-gradient-to-br from-violet-500 to-violet-600",
      text: "text-violet-900 dark:text-violet-100",
    },
    // Custom event default styling
    custom: {
      bg: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20",
      border: "border-l-gray-500 border-gray-200 dark:border-gray-800",
      icon: "bg-gradient-to-br from-gray-500 to-gray-600",
      text: "text-gray-900 dark:text-gray-100",
    },
    // Custom event type specific styling
    milestone: {
      bg: "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-900/20",
      border: "border-l-amber-500 border-amber-200 dark:border-amber-800",
      icon: "bg-gradient-to-br from-amber-500 to-yellow-600",
      text: "text-amber-900 dark:text-amber-100",
    },
    deadline: {
      bg: "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/30 dark:to-rose-900/20",
      border: "border-l-red-500 border-red-200 dark:border-red-800",
      icon: "bg-gradient-to-br from-red-500 to-rose-600",
      text: "text-red-900 dark:text-red-100",
    },
    meeting: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20",
      border: "border-l-blue-500 border-blue-200 dark:border-blue-800",
      icon: "bg-gradient-to-br from-blue-500 to-blue-600",
      text: "text-blue-900 dark:text-blue-100",
    },
    insight: {
      bg: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20",
      border: "border-l-yellow-500 border-yellow-200 dark:border-yellow-800",
      icon: "bg-gradient-to-br from-yellow-500 to-yellow-600",
      text: "text-yellow-900 dark:text-yellow-100",
    },
    decision: {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20",
      border: "border-l-purple-500 border-purple-200 dark:border-purple-800",
      icon: "bg-gradient-to-br from-purple-500 to-purple-600",
      text: "text-purple-900 dark:text-purple-100",
    },
    other: {
      bg: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20",
      border: "border-l-gray-500 border-gray-200 dark:border-gray-800",
      icon: "bg-gradient-to-br from-gray-500 to-gray-600",
      text: "text-gray-900 dark:text-gray-100",
    },
  };

  let expandedEvents = $state(new Set<string>());

  function toggleEventExpansion(eventId: string) {
    if (expandedEvents.has(eventId)) {
      expandedEvents.delete(eventId);
    } else {
      expandedEvents.add(eventId);
    }
    expandedEvents = new Set(expandedEvents);
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatRelativeDate(dateString: string, mode: GroupingMode = "days") {
    if (mode === "weeks" || mode === "months") {
      // For weeks and months, the dateString is already formatted
      return dateString;
    }

    // Original logic for days
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  }

  function handleEventClick(event: TimelineEvent) {
    if (onEventClick) {
      onEventClick(event);
    } else {
      toggleEventExpansion(event.id);
    }
  }

  function handleContextMenu(event: MouseEvent, timelineEvent: TimelineEvent) {
    // Only show context menu for custom events
    if (!timelineEvent.isCustom) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent = convertTimelineEventToCustomEvent(timelineEvent);
    if (!customEvent) return;

    contextMenuPosition = { x: event.clientX, y: event.clientY };
    contextMenuEvent = customEvent;
    contextMenuPermissions = {
      edit: timelineEvent.canEdit !== false,
      delete: timelineEvent.canDelete !== false,
    };
    contextMenuOpen = true;
  }

  function handleContextMenuAction(event: CustomEvent) {
    const { action, event: customEvent } = event.detail;

    if (action === "delete") {
      // Remove the deleted event from the events array
      events = events.filter((e: any) => e.id !== customEvent.id);
    }

    if (onCustomEventAction) {
      onCustomEventAction(action, customEvent);
    }

    contextMenuOpen = false;
  }

  function handleContextMenuClose() {
    contextMenuOpen = false;
    contextMenuEvent = null;
  }

  // Get appropriate styling for event
  function getEventStyling(event: TimelineEvent) {
    if (event.isCustom && event.customEventType) {
      const typeConfig = getEventTypeConfig(event.customEventType);
      if (
        typeConfig &&
        eventColors[event.customEventType as keyof typeof eventColors]
      ) {
        return {
          colors:
            eventColors[event.customEventType as keyof typeof eventColors],
          icon:
            eventIcons[event.customEventType as keyof typeof eventIcons] ||
            eventIcons.custom,
        };
      }
    }

    const colors =
      eventColors[event.type as keyof typeof eventColors] || eventColors.custom;
    const icon =
      eventIcons[event.type as keyof typeof eventIcons] || eventIcons.custom;

    return { colors, icon };
  }

  // Custom event form handlers
  function handleCustomEventFormClose() {
    customEventsStore.closeForm();
  }

  function handleCustomEventFormSuccess() {
    customEventsStore.closeForm();
    if (onEventAdded) {
      onEventAdded();
    }
  }
</script>

<div class="timeline-container">
  {#if isLoading}
    <!-- Enhanced Loading skeleton -->
    <div class="space-y-8">
      {#each Array(3) as _, i}
        <div
          class="timeline-skeleton"
          in:fade={{ duration: 300, delay: i * 100 }}
        >
          <div class="flex items-center gap-6 mb-6">
            <div
              class="w-24 h-8 bg-gradient-to-r from-muted to-muted/50 rounded-full animate-pulse"
            ></div>
            <div
              class="flex-1 h-px bg-gradient-to-r from-border to-transparent"
            ></div>
          </div>
          <div class="ml-8 space-y-4">
            {#each Array(2) as _, j}
              <div class="timeline-event-skeleton">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-muted to-muted/50 rounded-xl animate-pulse"
                ></div>
                <div class="flex-1 space-y-3">
                  <div
                    class="w-3/4 h-6 bg-gradient-to-r from-muted to-muted/50 rounded-lg animate-pulse"
                  ></div>
                  <div
                    class="w-1/2 h-4 bg-gradient-to-r from-muted to-muted/50 rounded animate-pulse"
                  ></div>
                  <div
                    class="w-24 h-3 bg-gradient-to-r from-muted to-muted/50 rounded animate-pulse"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else if groupedEvents().length === 0}
    <!-- Enhanced Empty state -->
    <div
      class="timeline-empty"
      in:scale={{ duration: 400, easing: elasticOut, start: 0.8 }}
    >
      <div class="empty-icon-container">
        <Calendar class="w-16 h-16 text-muted-foreground/60" />
        <Sparkles
          class="w-6 h-6 text-primary/40 animate-pulse absolute -top-2 -right-2"
        />
      </div>
      <h3 class="text-xl font-semibold text-foreground mt-6">
        Your Research Journey Awaits
      </h3>
      <p
        class="text-muted-foreground mt-3 max-w-md text-center leading-relaxed"
      >
        Start working on your project to see your research timeline come to
        life. Every action you take will be beautifully documented here.
      </p>
      <div class="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <span>Ready to capture your first milestone</span>
      </div>
    </div>
  {:else}
    <!-- Enhanced Timeline content -->
    <div class="timeline-content space-y-10">
      {#each groupedEvents() as group, groupIndex (group.date)}
        <div
          class="timeline-group"
          in:fade={{ duration: 400, delay: groupIndex * 80 }}
          out:fade={{ duration: 200, easing: quintOut }}
        >
          <!-- Enhanced Date header -->
          <div class="timeline-date-header">
            <div class="date-badge">
              <div class="date-icon">
                <Calendar class="w-4 h-4" />
              </div>
              <div class="date-content">
                <span class="date-text"
                  >{formatRelativeDate(group.date, groupingMode)}</span
                >
                <span class="event-count">
                  {group.events.length}
                  {group.events.length === 1 ? "event" : "events"}
                </span>
              </div>
            </div>
            <div class="timeline-line"></div>
          </div>

          <!-- Enhanced Events for this date -->
          <div class="timeline-events">
            {#each group.events as event, eventIndex (event.id)}
              {@const styling = getEventStyling(event)}
              {@const IconComponent = styling.icon}
              {@const colors = styling.colors}
              <div
                class="timeline-event {colors.bg} {colors.border} {colors.text} {event.isCustom
                  ? 'custom-event'
                  : ''}"
                in:slide={{
                  duration: 400,
                  delay: eventIndex * 100,
                  easing: quintOut,
                }}
                out:fade={{
                  duration: 250,
                  easing: quintOut,
                }}
                oncontextmenu={(e) => handleContextMenu(e, event)}
              >
                <!-- Enhanced Event content -->
                <button
                  class="event-button group"
                  onclick={() => handleEventClick(event)}
                >
                  <!-- Event icon and main content -->
                  <div class="event-header">
                    <div class="event-icon {colors.icon}">
                      <IconComponent class="w-5 h-5 text-white" />
                    </div>

                    <div class="event-content">
                      <div class="event-title-row">
                        <h4 class="event-title">
                          {event.title}
                          {#if event.isCustom}
                            <span class="custom-badge">Custom</span>
                            {#if event.customEventType}
                              <span class="custom-type-badge"
                                >{event.customEventType
                                  .charAt(0)
                                  .toUpperCase() +
                                  event.customEventType.slice(1)}</span
                              >
                            {/if}
                          {/if}
                        </h4>
                        <div class="event-meta">
                          <span class="event-time">
                            <Clock class="w-3 h-3" />
                            {formatTime(event.timestamp)}
                          </span>
                          {#if event.isCustom}
                            <button
                              class="context-menu-trigger"
                              onclick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, event);
                              }}
                              title="More options"
                              aria-label="Open event options menu"
                            >
                              <MoreHorizontal class="w-4 h-4" />
                            </button>
                          {/if}
                        </div>
                      </div>

                      {#if event.description}
                        <p class="event-description">{event.description}</p>
                      {/if}

                      {#if event.tags && event.tags.length > 0}
                        <div class="event-tags">
                          {#each event.tags as tag}
                            <span class="event-tag">#{tag}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>

                    <!-- Enhanced Expand indicator -->
                    {#if event.details && event.details.length > 0}
                      <div class="expand-indicator">
                        {#if expandedEvents.has(event.id)}
                          <ChevronDown
                            class="w-4 h-4 transition-transform duration-200"
                          />
                        {:else}
                          <ChevronRight
                            class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                          />
                        {/if}
                      </div>
                    {/if}
                  </div>
                </button>

                <!-- Enhanced Expanded details -->
                {#if expandedEvents.has(event.id) && event.details && event.details.length > 0}
                  <div
                    class="event-details"
                    in:slide={{ duration: 300, easing: quintOut }}
                    out:slide={{ duration: 200, easing: quintOut }}
                  >
                    <div class="details-content">
                      <div class="details-header">
                        <Sparkles class="w-4 h-4 text-current opacity-60" />
                        <span class="details-title">Details</span>
                      </div>
                      <div class="details-list">
                        {#each event.details as detail, index}
                          <div
                            class="detail-item"
                            in:fade={{ duration: 200, delay: index * 50 }}
                          >
                            <div class="detail-bullet"></div>
                            <span class="detail-text">{detail}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Context Menu for Custom Events -->
<CustomEventContextMenu
  open={contextMenuOpen}
  event={contextMenuEvent}
  position={contextMenuPosition}
  permissions={contextMenuPermissions}
  on:close={handleContextMenuClose}
  on:action={handleContextMenuAction}
/>

<!-- Custom Event Form Modal -->
<CustomEventForm
  open={customEventFormState.isOpen}
  on:close={handleCustomEventFormClose}
  on:success={handleCustomEventFormSuccess}
/>

<style>
  .timeline-container {
    @apply relative w-full;
  }

  /* Enhanced Loading Skeletons */
  .timeline-skeleton {
    @apply relative overflow-hidden rounded-xl bg-card/30 backdrop-blur-sm border border-border/50 p-6;
  }

  .timeline-event-skeleton {
    @apply flex items-start gap-4 p-4 rounded-lg border border-border/30 bg-background/50;
  }

  /* Enhanced Empty State */
  .timeline-empty {
    @apply flex flex-col items-center justify-center text-center py-20 px-6;
  }

  .empty-icon-container {
    @apply relative;
  }

  /* Timeline Content */
  .timeline-content {
    @apply relative;
  }

  /* Enhanced Date Headers */
  .timeline-date-header {
    @apply flex items-center gap-6 mb-8;
  }

  .date-badge {
    @apply flex items-center gap-3 px-3 py-1.5 rounded-xl
           bg-background/80 border border-border/30 shadow-sm
           backdrop-blur-sm;
  }

  .date-icon {
    @apply flex items-center justify-center w-6 h-6 rounded-md
           bg-muted/50 text-muted-foreground;
  }

  .date-content {
    @apply flex flex-col;
  }

  .date-text {
    @apply text-sm;
  }

  .event-count {
    @apply text-xs text-muted-foreground mt-0.5;
  }

  .timeline-line {
    @apply flex-1 h-px bg-gradient-to-r from-border via-border/50 to-transparent;
  }

  /* Enhanced Timeline Events */
  .timeline-events {
    @apply ml-12 space-y-6;
  }

  .timeline-event {
    @apply relative rounded-2xl border-l-4 border-2 p-6
           shadow-lg shadow-black/5 backdrop-blur-sm
           transition-all duration-300 hover:shadow-xl hover:shadow-black/10
           hover:scale-[1.01] hover:-translate-y-1;
  }

  .timeline-event.custom-event {
    @apply ring-1 ring-primary/20 hover:ring-primary/30;
  }

  /* Enhanced Event Buttons */
  .event-button {
    @apply w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-xl
           transition-all duration-200;
  }

  .event-header {
    @apply flex items-start gap-4;
  }

  /* Enhanced Event Icons */
  .event-icon {
    @apply flex items-center justify-center w-12 h-12 rounded-xl
           shadow-lg shadow-black/20 flex-shrink-0
           transition-all duration-300 group-hover:scale-110 group-hover:rotate-3;
  }

  /* Enhanced Event Content */
  .event-content {
    @apply flex-1 min-w-0;
  }

  .event-title-row {
    @apply flex items-start justify-between gap-3;
  }

  .event-title {
    @apply text-lg font-semibold leading-tight flex-1 flex items-center gap-2;
  }

  .custom-badge {
    @apply inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full;
  }

  .custom-type-badge {
    @apply inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full;
  }

  .event-meta {
    @apply flex items-center gap-2 text-xs opacity-70 font-medium;
  }

  .event-time {
    @apply flex items-center gap-1 px-2 py-1 rounded-full
           bg-black/5 dark:bg-white/5;
  }

  .context-menu-trigger {
    @apply flex items-center justify-center w-8 h-8 rounded-lg
           bg-background/60 border border-border/40 shadow-sm
           hover:bg-background/80 hover:border-border/60 hover:shadow-md
           active:scale-95 transition-all duration-200
           text-muted-foreground hover:text-foreground
           focus:outline-none focus:ring-2 focus:ring-primary/20;
  }

  .event-description {
    @apply text-sm opacity-80 mt-2 leading-relaxed break-words overflow-hidden text-ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .event-tags {
    @apply flex items-center gap-1 mt-2 flex-wrap;
  }

  .event-tag {
    @apply inline-flex items-center px-2 py-1 text-xs font-medium
           bg-black/5 dark:bg-white/5 rounded-full;
  }

  .event-tag-more {
    @apply inline-flex items-center px-2 py-1 text-xs font-medium
           bg-black/10 dark:bg-white/10 rounded-full opacity-60;
  }

  /* Enhanced Expand Indicator */
  .expand-indicator {
    @apply flex items-center justify-center w-8 h-8 rounded-lg
           opacity-60 transition-all duration-200
           group-hover:opacity-100 group-hover:bg-black/5 dark:group-hover:bg-white/5;
  }

  /* Enhanced Event Details */
  .event-details {
    @apply mt-6 pt-6 border-t border-border/20;
  }

  .details-content {
    @apply space-y-4;
  }

  .details-header {
    @apply flex items-center gap-2 text-sm font-medium opacity-80;
  }

  .details-title {
    @apply uppercase tracking-wider;
  }

  .details-list {
    @apply space-y-3;
  }

  .detail-item {
    @apply flex items-start gap-3 text-sm leading-relaxed;
  }

  .detail-bullet {
    @apply w-1.5 h-1.5 rounded-full bg-current opacity-60 mt-2 flex-shrink-0;
  }

  .detail-text {
    @apply flex-1 opacity-90;
  }

  /* Responsive Design */
  @media (max-width: 640px) {
    .timeline-events {
      @apply ml-6;
    }

    .timeline-event {
      @apply p-4;
    }

    .event-icon {
      @apply w-10 h-10;
    }

    .event-title {
      @apply text-base;
    }

    .date-badge {
      @apply px-3 py-1.5;
    }

    .date-text {
      @apply text-sm;
    }
  }

  /* Enhanced Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    .timeline-event {
      @apply shadow-lg shadow-black/20;
    }

    .timeline-event:hover {
      @apply shadow-xl shadow-black/30;
    }

    .date-badge {
      @apply shadow-lg shadow-black/20;
    }
  }

  /* Custom scrollbar for details */
  .details-content {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground)) transparent;
  }

  .details-content::-webkit-scrollbar {
    width: 6px;
  }

  .details-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .details-content::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }

  .details-content::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .timeline-event,
    .event-icon,
    .expand-indicator {
      transition: none;
    }

    .timeline-event:hover {
      transform: none;
    }

    .event-icon {
      transform: none;
    }
  }

  /* Focus states */
  .event-button:focus-visible {
    @apply ring-2 ring-primary/50 ring-offset-2 ring-offset-background;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .timeline-event {
      @apply border-2 border-current;
    }

    .event-icon {
      @apply border border-current;
    }
  }
</style>

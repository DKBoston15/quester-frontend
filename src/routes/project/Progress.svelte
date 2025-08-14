<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import * as Progress from "$lib/components/ui/progress";
  import * as Dialog from "$lib/components/ui/dialog";
  import {
    Trophy,
    PenTool,
    Book,
    Calendar,
    Search,
    Network,
    Star,
    Expand,
    Plus,
    Minus,
    Info,
    GraduationCap,
    Clock,
    Tag,
    Activity,
    FileText,
    Target,
    Brain,
    FolderOpen,
    Palette,
    ChevronRight,
    Users,
    Lightbulb,
    Gavel,
  } from "lucide-svelte";
  import { onDestroy, onMount } from "svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import { customEventsStore } from "$lib/stores/custom-events-store.svelte";
  import { convertCustomEventToTimelineEvent } from "$lib/types/custom-events";
  import { fade } from "svelte/transition";
  import { api } from "$lib/services/api-client";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import {
    Timeline,
    TimelineControls,
    type TimelineEvent,
    type FilterOptions,
  } from "$lib/components/custom-ui/timeline";

  // Level definitions with colors
  const levels = [
    {
      name: "Spark of Curiosity",
      minXP: 0,
      maxXP: 1000,
      color: "from-amber-500 to-orange-600",
      description:
        "The beginning of your research journey, where questions start to form.",
    },
    {
      name: "Illuminator",
      minXP: 1001,
      maxXP: 2000,
      color: "from-blue-500 to-indigo-600",
      description:
        "Shedding light on new ideas and connections within your research.",
    },
    {
      name: "Knowledge Weaver",
      minXP: 2001,
      maxXP: 3000,
      color: "from-purple-500 to-fuchsia-600",
      description:
        "Connecting threads of information into a cohesive understanding.",
    },
    {
      name: "Insight Architect",
      minXP: 3001,
      maxXP: 4000,
      color: "from-emerald-500 to-teal-600",
      description:
        "Building frameworks of understanding from collected knowledge.",
    },
    {
      name: "Wisdom Sculptor",
      minXP: 4001,
      maxXP: 5000,
      color: "from-rose-500 to-pink-600",
      description:
        "Shaping raw information into refined insights and theories.",
    },
    {
      name: "Enlightenment Explorer",
      minXP: 5001,
      maxXP: 6000,
      color: "from-cyan-500 to-blue-600",
      description: "Venturing beyond established knowledge into new territory.",
    },
    {
      name: "Sage of Scholars",
      minXP: 6001,
      maxXP: Infinity,
      color: "from-violet-500 to-purple-600",
      description:
        "The pinnacle of research mastery, where expertise guides others.",
    },
  ];

  // Function to get current level info
  function getCurrentLevel(points: number) {
    const level =
      levels.find((l) => points >= l.minXP && points <= l.maxXP) || levels[0];
    const levelIndex = levels.indexOf(level);
    const nextLevel = levels[levelIndex + 1];
    const progress = nextLevel
      ? ((points - level.minXP) / (nextLevel.minXP - level.minXP)) * 100
      : 100;

    return {
      current: level,
      next: nextLevel,
      progress,
      index: levelIndex + 1,
    };
  }

  // Timeline related state
  let timelineEvents = $state<TimelineEvent[]>([]);
  let isTimelineLoading = $state(true);
  let timelineFilters = $state<FilterOptions>({ types: [], searchQuery: "" });
  let selectedEvents = $state<string[]>([]);
  let showDialog = $state(false);
  let dialogTitle = $state("");
  let dialogContent = $state<string[]>([]);
  let selectedEvent = $state<TimelineEvent | null>(null);
  let showLevelsDialog = $state(false);
  let timelineGroupingMode = $state<"days" | "weeks" | "months">("days");

  // Achievement related state and types
  let achievements = $state<Achievement[]>([]);
  let newlyAwarded = $state<Achievement[]>([]);
  let isAchievementsLoading = $state(true);
  let activeTab = $state("timeline");
  let error = $state<string | null>(null);

  interface Achievement {
    id: string;
    code: string;
    name: string;
    category: string;
    points: number;
    completed: boolean;
    progress?: {
      current: number;
      required: number;
    };
    count?: number;
  }

  type AchievementGroup = {
    name: string;
    icon: any;
    achievements: Achievement[];
  };

  // Achievement categories for grouping with colors
  const achievementGroups: Record<
    string,
    AchievementGroup & { color: string }
  > = {
    "Note-Taking Master": {
      name: "Note Taking",
      icon: PenTool,
      achievements: [],
      color: "from-blue-500 to-blue-600",
    },
    Collector: {
      name: "Literature Collection",
      icon: Book,
      achievements: [],
      color: "from-purple-500 to-purple-600",
    },
    Consistency: {
      name: "Consistency",
      icon: Calendar,
      achievements: [],
      color: "from-green-500 to-green-600",
    },
    "Keyword Researcher": {
      name: "Keyword Research",
      icon: Search,
      achievements: [],
      color: "from-amber-500 to-amber-600",
    },
    Explorer: {
      name: "Research Design",
      icon: Expand,
      achievements: [],
      color: "from-rose-500 to-rose-600",
    },
    "Expanding Horizons": {
      name: "Custom Designs",
      icon: Star,
      achievements: [],
      color: "from-indigo-500 to-indigo-600",
    },
    "Visualization Expert": {
      name: "Visualization",
      icon: Network,
      achievements: [],
      color: "from-cyan-500 to-cyan-600",
    },
  };

  // Timeline event types for filtering
  let availableEventTypes = $derived(() => {
    const typeCounts = new Map<string, number>();

    timelineEvents.forEach((event) => {
      typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
    });

    return [
      {
        id: "project",
        label: "Project",
        count: typeCounts.get("project") || 0,
      },
      {
        id: "literature",
        label: "Literature",
        count: typeCounts.get("literature") || 0,
      },
      { id: "notes", label: "Notes", count: typeCounts.get("notes") || 0 },
      { id: "models", label: "Models", count: typeCounts.get("models") || 0 },
      {
        id: "outcomes",
        label: "Outcomes",
        count: typeCounts.get("outcomes") || 0,
      },
      {
        id: "status",
        label: "Status Changes",
        count: typeCounts.get("status") || 0,
      },
      {
        id: "design",
        label: "Design Changes",
        count: typeCounts.get("design") || 0,
      },
      {
        id: "insights",
        label: "Insights",
        count: typeCounts.get("insights") || 0,
      },
      {
        id: "custom",
        label: "Custom Events",
        count: typeCounts.get("custom") || 0,
      },
    ].filter((type) => type.count > 0);
  });

  // Filter timeline events
  let filteredTimelineEvents = $derived(() => {
    let filtered = timelineEvents;

    // Filter by type
    if (timelineFilters.types.length > 0) {
      filtered = filtered.filter((event) =>
        timelineFilters.types.includes(event.type)
      );
    }

    // Filter by custom event types
    if (
      timelineFilters.customEventTypes &&
      timelineFilters.customEventTypes.length > 0
    ) {
      filtered = filtered.filter((event) => {
        const isNotCustom = !event.isCustom;
        const isMatchingCustom =
          event.isCustom &&
          event.customEventType &&
          timelineFilters.customEventTypes!.includes(event.customEventType);
        const shouldInclude = isNotCustom || isMatchingCustom;

        return shouldInclude;
      });
    }

    // Filter by creators
    if (timelineFilters.createdBy && timelineFilters.createdBy.length > 0) {
      filtered = filtered.filter(
        (event) =>
          !event.creator ||
          timelineFilters.createdBy!.includes(event.creator.id)
      );
    }

    // Filter by tags
    if (timelineFilters.tags && timelineFilters.tags.length > 0) {
      filtered = filtered.filter(
        (event) =>
          event.tags &&
          event.tags.some((tag) => timelineFilters.tags!.includes(tag))
      );
    }

    // Filter by date range
    if (timelineFilters.dateRange) {
      const { start, end } = timelineFilters.dateRange;
      filtered = filtered.filter((event) => {
        const eventDate = event.timestamp;
        return eventDate >= start && eventDate <= end;
      });
    }

    // Filter by search query
    if (timelineFilters.searchQuery) {
      const query = timelineFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.details?.some((detail) =>
            detail.toLowerCase().includes(query)
          ) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          event.creator?.fullName?.toLowerCase().includes(query) ||
          event.creator?.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  onMount(async () => {
    await loadTimelineData();
    await loadAchievements();
  });

  onDestroy(() => {
    // Clean up modal state when leaving the page
    customEventsStore.cleanup();
  });

  async function loadTimelineData() {
    if (!projectStore.currentProject?.id) return;

    isTimelineLoading = true;
    try {
      // Load data from stores if needed
      if (!literatureStore.data.length) {
        await literatureStore.loadLiterature(projectStore.currentProject.id);
      }
      if (!notesStore.notes.length) {
        await notesStore.loadNotes(projectStore.currentProject.id);
      }

      const events: TimelineEvent[] = [];
      const currentProject = projectStore.currentProject;

      // Add project creation
      const projectDate = new Date(currentProject.createdAt || Date.now());
      events.push({
        id: "project_creation",
        title: `Project Created: ${currentProject.name}`,
        timestamp: projectDate,
        type: "project",
        description: "Project was initialized",
      });

      // Fetch and add status changes
      try {
        const statusChanges = await api.get(
          `/events?type=project.status.changed&subjectId=${currentProject.id}`
        );
        statusChanges.forEach((change: any) => {
          events.push({
            id: `status_${change.id}`,
            title: "Project Status Changed",
            description: `${change.data.previousStatus || "None"} → ${change.data.newStatus}`,
            timestamp: new Date(change.createdAt),
            type: "project",
            data: change.data,
            details: [
              `Previous Status: ${change.data.previousStatus || "None"}`,
              `New Status: ${change.data.newStatus}`,
            ],
          });
        });
      } catch (error) {
        console.error("Error fetching status changes:", error);
      }

      // Fetch and add design changes
      try {
        const designChanges = await api.get(
          `/events?type=project.design.changed&subjectId=${currentProject.id}`
        );
        designChanges.forEach((change: any) => {
          const fieldName = change.data.field
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str: string) => str.toUpperCase());

          events.push({
            id: `design_${change.id}`,
            title: "Design Updated",
            description: `${fieldName}: ${change.data.previousValue || "None"} → ${change.data.newValue}`,
            timestamp: new Date(change.createdAt),
            type: "design",
            data: { ...change.data, fieldName },
            details: [
              `Design Type: ${fieldName}`,
              `Previous: ${change.data.previousValue || "None"}`,
              `New: ${change.data.newValue}`,
            ],
          });
        });
      } catch (error) {
        console.error("Error fetching design changes:", error);
      }

      // Fetch and group all model events (created and updated) by date and model
      try {
        const [createdEvents, updatedEvents] = await Promise.all([
          api.get(`/events?type=model.created&subjectId=${currentProject.id}`),
          api.get(`/events?type=model.updated&subjectId=${currentProject.id}`),
        ]);

        const allModelEvents = [
          ...createdEvents.map((event: any) => ({
            ...event,
            eventType: "created",
          })),
          ...updatedEvents.map((event: any) => ({
            ...event,
            eventType: "updated",
          })),
        ];

        // Group model events by date and model name/ID
        const modelsByDateAndName = new Map<string, any[]>();
        allModelEvents.forEach((event: any) => {
          const date = new Date(event.createdAt);
          const modelName = event.data.name || "Unknown Model";
          const dateKey = date.toDateString();
          const groupKey = `${dateKey}_${modelName}`;

          if (!modelsByDateAndName.has(groupKey)) {
            modelsByDateAndName.set(groupKey, []);
          }
          modelsByDateAndName
            .get(groupKey)
            ?.push({ ...event, exactDate: date });
        });

        // Add grouped model events
        modelsByDateAndName.forEach((modelEvents, groupKey) => {
          // Sort events by timestamp to get the chronological order
          const sortedEvents = modelEvents.sort(
            (a, b) => a.exactDate.getTime() - b.exactDate.getTime()
          );
          const firstEvent = sortedEvents[0];
          const lastEvent = sortedEvents[sortedEvents.length - 1];

          // Determine if this is a creation, update, or both
          const hasCreated = sortedEvents.some(
            (e) => e.eventType === "created"
          );
          const hasUpdated = sortedEvents.some(
            (e) => e.eventType === "updated"
          );

          let title: string;
          let description: string;

          if (hasCreated && hasUpdated) {
            if (sortedEvents.length === 2) {
              title = "Model Created & Updated";
              description = `Created and updated model: ${firstEvent.data.name}`;
            } else {
              title = `Model Activity (${sortedEvents.length} events)`;
              description = `Created and updated model: ${firstEvent.data.name}`;
            }
          } else if (hasCreated) {
            title =
              sortedEvents.length === 1
                ? "Model Created"
                : `Model Created (${sortedEvents.length} events)`;
            description = `Created model: ${firstEvent.data.name}`;
          } else {
            title =
              sortedEvents.length === 1
                ? "Model Updated"
                : `Model Updated (${sortedEvents.length} times)`;
            description = `Updated model: ${firstEvent.data.name}`;
          }

          events.push({
            id: `model_group_${groupKey}`,
            title,
            description,
            timestamp: firstEvent.exactDate, // Use earliest timestamp
            type: "models",
            data: {
              ...lastEvent.data, // Use latest data
              events: sortedEvents,
            },
            details: [
              `Model Name: ${lastEvent.data.name}`,
              `Events: ${sortedEvents.map((e) => e.eventType).join(", ")}`,
            ],
          });
        });
      } catch (error) {
        console.error("Error fetching model events:", error);
      }

      // Fetch and group all outcome events (created and updated) by date and outcome
      try {
        const [createdEvents, updatedEvents] = await Promise.all([
          api.get(
            `/events?type=outcome.created&subjectId=${currentProject.id}`
          ),
          api.get(
            `/events?type=outcome.updated&subjectId=${currentProject.id}`
          ),
        ]);

        const allOutcomeEvents = [
          ...createdEvents.map((event: any) => ({
            ...event,
            eventType: "created",
          })),
          ...updatedEvents.map((event: any) => ({
            ...event,
            eventType: "updated",
          })),
        ];

        // Group outcome events by date and outcome ID
        const outcomesByDateAndId = new Map<string, any[]>();
        allOutcomeEvents.forEach((event: any) => {
          const date = new Date(event.createdAt);
          const outcomeId = event.data.outcomeId;
          const dateKey = date.toDateString();
          const groupKey = `${dateKey}_${outcomeId}`;

          if (!outcomesByDateAndId.has(groupKey)) {
            outcomesByDateAndId.set(groupKey, []);
          }
          outcomesByDateAndId
            .get(groupKey)
            ?.push({ ...event, exactDate: date });
        });

        // Add grouped outcome events
        outcomesByDateAndId.forEach((outcomeEvents, groupKey) => {
          // Sort events by timestamp to get the chronological order
          const sortedEvents = outcomeEvents.sort(
            (a, b) => a.exactDate.getTime() - b.exactDate.getTime()
          );
          const firstEvent = sortedEvents[0];
          const lastEvent = sortedEvents[sortedEvents.length - 1];

          // Determine if this is a creation, update, or both
          const hasCreated = sortedEvents.some(
            (e) => e.eventType === "created"
          );
          const hasUpdated = sortedEvents.some(
            (e) => e.eventType === "updated"
          );

          let title: string;
          let description: string;

          if (hasCreated && hasUpdated) {
            if (sortedEvents.length === 2) {
              title = "Outcome Created & Updated";
              description = `Created and updated ${firstEvent.data.type} outcome: ${firstEvent.data.name}`;
            } else {
              title = `Outcome Activity (${sortedEvents.length} events)`;
              description = `Created and updated ${firstEvent.data.type} outcome: ${firstEvent.data.name}`;
            }
          } else if (hasCreated) {
            title =
              sortedEvents.length === 1
                ? "Outcome Created"
                : `Outcome Created (${sortedEvents.length} events)`;
            description = `Created ${firstEvent.data.type} outcome: ${firstEvent.data.name}`;
          } else {
            title =
              sortedEvents.length === 1
                ? "Outcome Updated"
                : `Outcome Updated (${sortedEvents.length} times)`;
            description = `Updated ${firstEvent.data.type} outcome: ${firstEvent.data.name}`;
          }

          events.push({
            id: `outcome_group_${groupKey}`,
            title,
            description,
            timestamp: firstEvent.exactDate, // Use earliest timestamp
            type: "outcomes",
            data: {
              ...lastEvent.data, // Use latest data
              events: sortedEvents,
            },
            details: [
              `Name: ${lastEvent.data.name}`,
              `Type: ${lastEvent.data.type}`,
              ...(lastEvent.data.sectionType
                ? [`Section: ${lastEvent.data.sectionType}`]
                : []),
              `Events: ${sortedEvents.map((e) => e.eventType).join(", ")}`,
            ],
          });
        });
      } catch (error) {
        console.error("Error fetching outcome events:", error);
      }

      // Fetch and group keyword analyses by date
      try {
        const keywordAnalyses = await api.get(
          `/keyword_analysis/project/${currentProject.id}`
        );

        // Group keyword analyses by date
        const insightsByDate = new Map<string, any[]>();
        keywordAnalyses.forEach((insight: any) => {
          const date = new Date(insight.createdAt || Date.now());
          const dateKey = date.toDateString();
          if (!insightsByDate.has(dateKey)) {
            insightsByDate.set(dateKey, []);
          }
          insightsByDate.get(dateKey)?.push({ ...insight, exactDate: date });
        });

        // Add grouped insight items
        insightsByDate.forEach((insights, dateKey) => {
          const count = insights.length;
          const earliestTime = new Date(
            Math.min(...insights.map((insight) => insight.exactDate.getTime()))
          );

          events.push({
            id: `insight_${dateKey}`,
            title:
              count === 1 ? "Created Insight" : `Created ${count} Insights`,
            description: `${count} keyword analysis insight${count !== 1 ? "s" : ""} created`,
            timestamp: earliestTime,
            type: "insights",
            data: insights,
            details: insights.map((insight: any) => {
              return `Keywords: ${insight.keywords}`;
            }),
          });
        });
      } catch (error) {
        console.error("Error fetching keyword analyses:", error);
      }

      // Group literature items by date
      const litByDate = new Map<string, any[]>();
      literatureStore.data.forEach((lit) => {
        const date = new Date(lit.createdAt || Date.now());
        const dateKey = date.toDateString();
        if (!litByDate.has(dateKey)) {
          litByDate.set(dateKey, []);
        }
        litByDate.get(dateKey)?.push({ ...lit, exactDate: date });
      });

      // Add grouped literature items
      litByDate.forEach((lits, dateKey) => {
        const count = lits.length;
        const earliestTime = new Date(
          Math.min(...lits.map((lit) => lit.exactDate.getTime()))
        );

        events.push({
          id: `lit_${dateKey}`,
          title:
            count === 1
              ? "Added Literature Item"
              : `Added ${count} Literature Items`,
          description: `${count} literature item${count !== 1 ? "s" : ""} added to the project`,
          timestamp: earliestTime,
          type: "literature",
          data: lits,
          details: lits.map((lit: any) => {
            const title = lit.title || lit.name || "Untitled";
            let authorText = "No authors";
            if (lit.authors) {
              if (Array.isArray(lit.authors)) {
                authorText = lit.authors.join(", ");
              } else if (typeof lit.authors === "string") {
                authorText = lit.authors;
              }
            }
            return `${title} (${authorText})`;
          }),
        });
      });

      // Group notes by date
      const notesByDate = new Map<string, any[]>();
      notesStore.notes.forEach((note) => {
        const date = new Date(note.createdAt || Date.now());
        const dateKey = date.toDateString();
        if (!notesByDate.has(dateKey)) {
          notesByDate.set(dateKey, []);
        }
        notesByDate.get(dateKey)?.push({ ...note, exactDate: date });
      });

      // Add grouped note items
      notesByDate.forEach((notes, dateKey) => {
        const count = notes.length;
        const earliestTime = new Date(
          Math.min(...notes.map((note) => note.exactDate.getTime()))
        );

        events.push({
          id: `note_${dateKey}`,
          title: count === 1 ? "Created Note" : `Created ${count} Notes`,
          description: `${count} note${count !== 1 ? "s" : ""} created`,
          timestamp: earliestTime,
          type: "notes",
          data: notes,
          details: notes.map((note: any) => {
            const type = note.type?.toLowerCase() || "research";
            return `${note.name || "Untitled Note"} (${type})`;
          }),
        });
      });

      // Fetch and convert custom events
      try {
        // Only try to load custom events if we have a valid project
        if (currentProject?.id) {
          await customEventsStore.loadEvents(currentProject.id);
          const customEvents = customEventsStore.events;

          if (Array.isArray(customEvents)) {
            customEvents.forEach((customEvent) => {
              const timelineEvent =
                convertCustomEventToTimelineEvent(customEvent);
              if (timelineEvent) {
                events.push(timelineEvent);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching custom events:", error);
        // Don't fail the entire timeline loading if custom events fail
        // Just log the error and continue
      }

      timelineEvents = events;
    } catch (error) {
      console.error("Error loading timeline data:", error);
    } finally {
      isTimelineLoading = false;
    }
  }

  function handleTimelineEventClick(event: TimelineEvent) {
    selectedEvent = event;
    dialogTitle = event.title;
    dialogContent = event.details || [
      event.description || "No additional details",
    ];
    showDialog = true;
  }

  function handleFiltersChange(newFilters: FilterOptions) {
    // Update each property individually to maintain reactivity
    timelineFilters.types = newFilters.types;
    timelineFilters.searchQuery = newFilters.searchQuery;
    if (newFilters.customEventTypes !== undefined) {
      timelineFilters.customEventTypes = newFilters.customEventTypes;
    }
    if (newFilters.createdBy !== undefined) {
      timelineFilters.createdBy = newFilters.createdBy;
    }
    if (newFilters.tags !== undefined) {
      timelineFilters.tags = newFilters.tags;
    }
    if (newFilters.dateRange !== undefined) {
      timelineFilters.dateRange = newFilters.dateRange;
    }
  }

  function handleTimelineGroupingModeChange(mode: "days" | "weeks" | "months") {
    timelineGroupingMode = mode;
  }

  async function handleCustomEventAction(action: string, customEvent: any) {
    try {
      switch (action) {
        case "edit":
          customEventsStore.openEditForm(customEvent.id);
          break;
        case "delete":
          // Perform the actual deletion - the store handles optimistic updates
          await customEventsStore.deleteEvent(customEvent.id);

          // Instead of reloading everything, just sync timeline with current store state
          syncTimelineWithStore();
          break;
        case "view":
          // Show in dialog
          selectedEvent = convertCustomEventToTimelineEvent(customEvent);
          if (selectedEvent) {
            dialogTitle = selectedEvent.title;
            dialogContent = selectedEvent.details || [
              selectedEvent.description || "No additional details",
            ];
            showDialog = true;
          }
          break;
        default:
          console.warn("Unknown custom event action:", action);
      }
    } catch (error) {
      console.error("Error handling custom event action:", error);
      // If delete failed, sync timeline to restore correct state
      if (action === "delete") {
        syncTimelineWithStore();
      }
    }
  }

  // New function to sync timeline with store state without full reload
  function syncTimelineWithStore() {
    // Remove all custom events from timeline
    const nonCustomEvents = timelineEvents.filter((event) => !event.isCustom);

    // Add current custom events from store
    const storeCustomEvents = customEventsStore.events;
    const timelineCustomEvents = storeCustomEvents
      .map((customEvent) => convertCustomEventToTimelineEvent(customEvent))
      .filter(Boolean);

    // Update timeline with synced events
    timelineEvents = [...nonCustomEvents, ...timelineCustomEvents];
  }

  // Bulk action handler for timeline controls
  async function handleBulkAction(action: string, eventIds: string[]) {
    try {
      // Filter events to only include custom events (non-custom events can't be bulk edited)
      const customEventIds = eventIds.filter((id) => {
        const event = timelineEvents.find((e) => e.id === id);
        return event?.isCustom;
      });

      if (customEventIds.length === 0) {
        return {
          action,
          eventIds,
          success: false,
          message: "No custom events selected for bulk action",
        };
      }

      switch (action) {
        case "delete":
          for (const eventId of customEventIds) {
            await customEventsStore.deleteEvent(parseInt(eventId));
          }
          selectedEvents = [];
          // Sync timeline with current store state instead of full reload
          syncTimelineWithStore();
          return {
            action,
            eventIds: customEventIds,
            success: true,
            message: `Deleted ${customEventIds.length} events`,
          };

        case "archive":
          // For now, we'll treat archive as a status update
          // This would need backend support for archiving
          return {
            action,
            eventIds: customEventIds,
            success: false,
            message: "Archive functionality not yet implemented",
          };

        case "export":
          handleExport("json", timelineFilters);
          return {
            action,
            eventIds: customEventIds,
            success: true,
            message: "Export initiated",
          };

        default:
          return {
            action,
            eventIds,
            success: false,
            message: `Unknown bulk action: ${action}`,
          };
      }
    } catch (error) {
      console.error("Error in bulk action:", error);
      return {
        action,
        eventIds,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Export handler for timeline data
  function handleExport(format: string, filters: FilterOptions) {
    try {
      const eventsToExport = filteredTimelineEvents();

      switch (format) {
        case "csv":
          exportAsCSV(eventsToExport);
          break;
        case "json":
          exportAsJSON(eventsToExport);
          break;
        case "pdf":
          exportAsPDF(eventsToExport);
          break;
        case "share":
          generateShareLink(filters);
          break;
        default:
          console.warn("Unknown export format:", format);
      }
    } catch (error) {
      console.error("Error exporting timeline data:", error);
    }
  }

  function exportAsCSV(events: TimelineEvent[]) {
    const headers = ["Date", "Type", "Title", "Description", "Tags"];
    const rows = events.map((event) => [
      event.timestamp.toISOString(),
      event.type,
      event.title,
      event.description || "",
      event.tags?.join("; ") || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timeline-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportAsJSON(events: TimelineEvent[]) {
    const exportData = {
      project: projectStore.currentProject?.name,
      exportDate: new Date().toISOString(),
      filters: timelineFilters,
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        customEventType: event.customEventType,
        tags: event.tags,
        creator: event.creator?.fullName || event.creator?.email,
        details: event.details,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timeline-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportAsPDF(events: TimelineEvent[]) {
    // This would require a PDF library like jsPDF
  }

  function generateShareLink(filters: FilterOptions) {
    const params = new URLSearchParams();
    if (filters.types.length > 0) params.set("types", filters.types.join(","));
    if (filters.searchQuery) params.set("search", filters.searchQuery);
    if (filters.dateRange) {
      params.set("dateStart", filters.dateRange.start.toISOString());
      params.set("dateEnd", filters.dateRange.end.toISOString());
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {});
  }

  // Sort function for achievements
  function sortAchievements(achievements: Achievement[]): Achievement[] {
    return [...achievements].sort((a, b) => {
      // First sort by completion status
      if (a.completed !== b.completed) {
        return a.completed ? -1 : 1;
      }

      // Then sort by required count if available
      const aRequired = a.progress?.required || 0;
      const bRequired = b.progress?.required || 0;
      return aRequired - bRequired;
    });
  }

  async function loadAchievements() {
    if (!projectStore.currentProject?.id) return;

    try {
      const data = await api.get(
        `/achievement/project/${projectStore.currentProject.id}/status`
      );
      achievements = data.statuses;
      newlyAwarded = data.newlyAwarded;

      // Reset achievement groups
      Object.values(achievementGroups).forEach((group) => {
        group.achievements = [];
      });

      // Group and sort achievements
      achievements.forEach((achievement) => {
        if (achievementGroups[achievement.category]) {
          achievementGroups[achievement.category].achievements.push(
            achievement
          );
        }
      });

      // Sort achievements in each group
      Object.values(achievementGroups).forEach((group) => {
        group.achievements = sortAchievements(group.achievements);
      });

      error = null;
    } catch (err) {
      console.error("Error loading achievements:", err);
      error = "Failed to load achievements. Please try again later.";
    } finally {
      isAchievementsLoading = false;
    }
  }

  function formatNumber(num: number) {
    return new Intl.NumberFormat().format(num);
  }

  // Define driverObj for the guided tour
  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#progress-header",
        popover: {
          title: "Track Your Research Journey",
          description:
            "This page visualizes your project's activity, milestones, and achievements, helping you understand your progress over time.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#research-level-card",
        popover: {
          title: "Your Research Level",
          description:
            "Gain Experience Points (XP) by completing research activities and achievements. Level up to unlock new titles reflecting your mastery!",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#view-levels-button",
        popover: {
          title: "Explore All Levels",
          description:
            "Click here to see all the available research levels, their XP requirements, and descriptions.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#progress-tabs",
        popover: {
          title: "Navigate Progress Views",
          description:
            "Switch between the 'Project Timeline' view, showing chronological events, and the 'Achievements' view, tracking specific milestones.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#timeline-content",
        popover: {
          title: "Project Timeline",
          description:
            "See key project events like creation, status changes, literature additions, and note creation laid out chronologically. Click items for more details.",
          side: "top",
          align: "start",
        },
        onHighlighted: () => {
          if (activeTab !== "timeline") activeTab = "timeline";
        },
      },
      {
        element: "#progress-tabs",
        popover: {
          title: "Switch to Achievements",
          description:
            "Now let's look at the specific achievements you can unlock.",
          side: "bottom",
          align: "center",
        },
        onHighlighted: () => {
          if (activeTab !== "achievements") activeTab = "achievements";
        },
      },
      {
        element: "#achievements-content",
        popover: {
          title: "Achievements",
          description:
            "Unlock achievements by performing specific actions like adding literature, writing notes, or using features consistently. Completed achievements award XP towards your Research Level.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#progress-header",
        popover: {
          title: "Monitor Your Momentum",
          description:
            "Check this page regularly to visualize your research activity, celebrate milestones, and stay motivated on your journey!",
          side: "bottom",
          align: "start",
        },
      },
    ],
  });

  // Calculate total XP from achievements
  let totalXP = $derived(
    achievements
      .filter((achievement) => achievement.completed)
      .reduce((total, achievement) => total + achievement.points, 0)
  );

  let currentLevel = $derived(getCurrentLevel(totalXP));

  // Timeline event colors and icons (matching Timeline.svelte)
  const eventIcons = {
    project: FolderOpen,
    literature: Book,
    notes: PenTool,
    models: Brain,
    outcomes: Target,
    status: Activity,
    design: Palette,
    insights: Search,
    custom: Star,
    // Custom event type specific icons
    milestone: Trophy,
    deadline: Clock,
    meeting: Users,
    insight: Lightbulb,
    decision: Gavel,
    other: Star,
  };

  const eventColors = {
    project: {
      icon: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    },
    literature: {
      icon: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    notes: {
      icon: "bg-gradient-to-br from-amber-500 to-amber-600",
    },
    models: {
      icon: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
    outcomes: {
      icon: "bg-gradient-to-br from-rose-500 to-rose-600",
    },
    status: {
      icon: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    },
    design: {
      icon: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    },
    insights: {
      icon: "bg-gradient-to-br from-violet-500 to-violet-600",
    },
    custom: {
      icon: "bg-gradient-to-br from-gray-500 to-gray-600",
    },
    // Custom event type specific styling
    milestone: {
      icon: "bg-gradient-to-br from-amber-500 to-yellow-600",
    },
    deadline: {
      icon: "bg-gradient-to-br from-red-500 to-rose-600",
    },
    meeting: {
      icon: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    insight: {
      icon: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    },
    decision: {
      icon: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
    other: {
      icon: "bg-gradient-to-br from-gray-500 to-gray-600",
    },
  };

  // Function to get appropriate styling for event (matching Timeline.svelte logic)
  function getEventStyling(event: TimelineEvent) {
    if (event.isCustom && event.customEventType) {
      const customColors =
        eventColors[event.customEventType as keyof typeof eventColors];
      const customIcon =
        eventIcons[event.customEventType as keyof typeof eventIcons];
      if (customColors && customIcon) {
        return {
          colors: customColors,
          icon: customIcon,
        };
      }
    }

    const colors =
      eventColors[event.type as keyof typeof eventColors] || eventColors.custom;
    const icon =
      eventIcons[event.type as keyof typeof eventIcons] || eventIcons.custom;

    return { colors, icon };
  }

  // Function to capitalize event tags properly
  function capitalizeTag(tag: string): string {
    return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
  }

  // Function to format time consistently with Timeline component
  function formatTime(date: Date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
</script>

<div class="container mx-auto py-8 space-y-8" id="progress-header">
  <!-- Research Level Card -->
  <Card
    class="research-level-card border-0 shadow-xl shadow-black/10 dark:shadow-black/20"
    id="research-level-card"
  >
    <CardHeader class="pb-4 relative overflow-hidden">
      <div
        class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
      ></div>
      <div class="relative z-10 flex items-center justify-between">
        <CardTitle class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-background/80 border border-border/30 shadow-sm backdrop-blur-sm flex items-center justify-center p-2"
          >
            <GraduationCap class="h-6 w-6 text-foreground" />
          </div>
          <span class="text-xl font-semibold">Research Level</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onclick={() => (showLevelsDialog = true)}
          id="view-levels-button"
          class="view-all-button"
        >
          <Info class="h-4 w-4 mr-2" />
          View All
        </Button>
      </div>
    </CardHeader>
    <CardContent class="space-y-4 pb-6">
      <div class="level-display">
        <div class="level-badge-container">
          <div
            class="level-badge bg-gradient-to-br {currentLevel.current.color}"
          >
            <span class="level-number">{currentLevel.index}</span>
          </div>
          <div
            class="level-glow bg-gradient-to-br {currentLevel.current.color}"
          ></div>
        </div>
        <div class="level-info">
          <h3
            class="level-name bg-gradient-to-r {currentLevel.current
              .color} bg-clip-text text-transparent"
          >
            {currentLevel.current.name}
          </h3>
          <p class="level-description">
            {currentLevel.current.description}
          </p>
          <div class="xp-info">
            <span class="current-xp">{formatNumber(totalXP)}</span>
            <span class="xp-separator">XP</span>
            {#if currentLevel.next}
              <span class="xp-next"
                >/ {formatNumber(currentLevel.next.minXP)} XP</span
              >
            {/if}
          </div>
        </div>
      </div>

      {#if currentLevel.next}
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label"
              >Progress to {currentLevel.next.name}</span
            >
            <div class="progress-percentage">
              <span class="percentage-value"
                >{Math.round(currentLevel.progress)}</span
              >
              <span class="percentage-symbol">%</span>
            </div>
          </div>
          <div class="progress-container">
            <Progress.Root
              value={currentLevel.progress}
              class="research-progress"
            />
          </div>
          <div class="progress-footer">
            <span class="points-needed">
              {formatNumber(currentLevel.next.minXP - totalXP)} points until next
              level
            </span>
          </div>
        </div>
      {:else}
        <div class="max-level-achievement">
          <div class="achievement-icon">
            <GraduationCap class="h-6 w-6 text-yellow-500" />
          </div>
          <div class="achievement-content">
            <h4
              class="achievement-title bg-gradient-to-r {currentLevel.current
                .color} bg-clip-text text-transparent"
            >
              Maximum Level Achieved!
            </h4>
            <p class="achievement-description">
              You've reached the pinnacle of research mastery
            </p>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Main Content Tabs -->
  <Tabs.Root
    value={activeTab}
    onValueChange={(value: string) => (activeTab = value)}
    class="space-y-6"
  >
    <Tabs.List
      id="progress-tabs"
      class="inline-flex h-10 items-center justify-center gap-4"
    >
      <Tabs.Trigger value="timeline" class="tab-button">
        <Calendar class="h-4 w-4 mr-2" />
        Project Timeline
      </Tabs.Trigger>
      <Tabs.Trigger value="achievements" class="tab-button">
        <Trophy class="h-4 w-4 mr-2" />
        Achievements
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="timeline" class="space-y-4" id="timeline-content">
      <Card class="border-2">
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineControls
            filters={timelineFilters}
            onFiltersChange={handleFiltersChange}
            availableTypes={availableEventTypes()}
            {selectedEvents}
            onBulkAction={handleBulkAction}
            onExport={handleExport}
            customEvents={customEventsStore.events}
            groupingMode={timelineGroupingMode}
            onGroupingModeChange={handleTimelineGroupingModeChange}
          />

          <Timeline
            events={filteredTimelineEvents()}
            isLoading={isTimelineLoading}
            onEventClick={handleTimelineEventClick}
            onCustomEventAction={handleCustomEventAction}
            onEventAdded={syncTimelineWithStore}
            groupingMode={timelineGroupingMode}
            onGroupingModeChange={handleTimelineGroupingModeChange}
          />
        </CardContent>
      </Card>
    </Tabs.Content>

    <Tabs.Content
      value="achievements"
      class="space-y-6"
      id="achievements-content"
    >
      {#if isAchievementsLoading}
        <div class="flex justify-center items-center min-h-[400px]">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          ></div>
        </div>
      {:else if error}
        <Card class="border-destructive">
          <CardContent class="pt-6">
            <div class="text-destructive text-center">{error}</div>
          </CardContent>
        </Card>
      {:else}
        {#each Object.entries(achievementGroups).sort( ([, a], [, b]) => a.name.localeCompare(b.name) ) as [category, { name, icon: Icon, achievements, color }]}
          {#if achievements.length > 0}
            <div class="achievement-group" in:fade={{ duration: 300 }}>
              <div class="flex items-center gap-3 mb-4">
                <div
                  class={`h-8 w-8 rounded-lg bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg`}
                >
                  <Icon class="h-5 w-5" />
                </div>
                <h2 class="text-xl font-semibold">{name}</h2>
                <div class="text-sm text-muted-foreground ml-auto">
                  {achievements.filter((a) => a.completed)
                    .length}/{achievements.length} Complete
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each achievements as achievement (achievement.id)}
                  <div in:fade={{ duration: 300 }}>
                    <Card
                      class={`achievement-card ${achievement.completed ? "completed" : ""} hover:shadow-${color.split("-")[1]}/20`}
                    >
                      {#if achievement.completed}
                        <div
                          class={`achievement-badge bg-gradient-to-br ${color}`}
                        >
                          <Trophy class="h-4 w-4" />
                        </div>
                      {/if}
                      <CardHeader class="pb-2">
                        <CardTitle
                          class="flex justify-between items-start gap-4"
                        >
                          <span class="text-base">{achievement.name}</span>
                          <span
                            class={`achievement-points ${achievement.completed ? `bg-gradient-to-br ${color} text-white` : ""}`}
                          >
                            {achievement.points}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {#if achievement.progress}
                          <div class="space-y-3">
                            <Progress.Root
                              value={(achievement.progress.current /
                                achievement.progress.required) *
                                100}
                              class={`h-2 achievement-progress ${achievement.completed ? "completed" : color}`}
                            />
                            <div class="flex justify-between text-sm">
                              <span class="text-muted-foreground">Progress</span
                              >
                              <span class="font-medium">
                                {achievement.progress.current}/{achievement
                                  .progress.required}
                                {#if achievement.count && achievement.count > achievement.progress.required}
                                  <span
                                    class={`text-${color.split(" ")[0]} ml-1`}
                                  >
                                    (+{achievement.count -
                                      achievement.progress.required})
                                  </span>
                                {/if}
                              </span>
                            </div>
                          </div>
                        {/if}
                      </CardContent>
                    </Card>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>

<Dialog.Root bind:open={showDialog}>
  <Dialog.Content class="sm:max-w-[600px] max-h-[85vh] overflow-hidden">
    {#if selectedEvent}
      {@const eventStyling = getEventStyling(selectedEvent)}
      <!-- Enhanced Header -->
      <div class="event-modal-header">
        <div class="header-content">
          <div class="event-icon-container {eventStyling.colors.icon}">
            <svelte:component
              this={eventStyling.icon}
              class="w-5 h-5 text-white"
            />
          </div>
          <div class="header-text">
            <div class="title-and-badges">
              <Dialog.Title class="event-title"
                >{selectedEvent.title}</Dialog.Title
              >
              {#if selectedEvent.isCustom}
                <div class="custom-badges">
                  <span class="custom-badge">Custom</span>
                  {#if selectedEvent.customEventType}
                    <span class="custom-type-badge"
                      >{selectedEvent.customEventType.charAt(0).toUpperCase() +
                        selectedEvent.customEventType.slice(1)}</span
                    >
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Content -->
      <div class="event-modal-content">
        {#if selectedEvent.details && selectedEvent.details.length > 0}
          <!-- Special handling for custom events -->
          {#if selectedEvent.isCustom && selectedEvent.data}
            <div class="custom-event-details">
              <h4 class="custom-event-section-title">
                <svelte:component this={eventStyling.icon} class="w-4 h-4" />
                Event Details
              </h4>

              <!-- Event metadata -->
              <div class="event-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Type</span>
                  <span class="meta-value"
                    >{selectedEvent.customEventType
                      ? selectedEvent.customEventType.charAt(0).toUpperCase() +
                        selectedEvent.customEventType.slice(1)
                      : "Custom"}</span
                  >
                </div>
                <div class="meta-item">
                  <span class="meta-label">Created</span>
                  <span class="meta-value"
                    >{new Date(
                      selectedEvent.data.createdAt
                    ).toLocaleDateString()}</span
                  >
                </div>
                {#if selectedEvent.data.creator}
                  <div class="meta-item">
                    <span class="meta-label">Created by</span>
                    <span class="meta-value"
                      >{selectedEvent.data.creator.name ||
                        selectedEvent.data.creator.email}</span
                    >
                  </div>
                {/if}
                <div class="meta-item">
                  <span class="meta-label">Event Time</span>
                  <span class="meta-value"
                    >{formatTime(selectedEvent.timestamp)}</span
                  >
                </div>
              </div>

              <!-- Description -->
              {#if selectedEvent.description}
                <div class="custom-detail-section">
                  <h5 class="detail-section-title">Description</h5>
                  <p class="detail-text">{selectedEvent.description}</p>
                </div>
              {/if}

              <!-- Details -->
              {#if selectedEvent.details && selectedEvent.details.length > 0}
                <div class="custom-detail-section">
                  <h5 class="detail-section-title">Additional Details</h5>
                  <ul class="detail-list">
                    {#each selectedEvent.details as detail}
                      <li class="detail-list-item">{detail}</li>
                    {/each}
                  </ul>
                </div>
              {/if}

              <!-- Tags -->
              {#if selectedEvent.tags && selectedEvent.tags.length > 0}
                <div class="custom-detail-section">
                  <h5 class="detail-section-title">Tags</h5>
                  <div class="tag-container">
                    {#each selectedEvent.tags as tag}
                      <span class="custom-event-tag">#{tag}</span>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
            <!-- Special handling for literature events -->
          {:else if selectedEvent.type === "literature" && selectedEvent.data}
            <div class="literature-items-container">
              <h4 class="literature-section-title">
                <Book class="w-4 h-4" />
                Literature Added ({selectedEvent.data.length} items)
              </h4>
              <div class="literature-items-grid">
                {#each selectedEvent.data as item, index}
                  <div
                    class="literature-item-card"
                    in:fade={{ duration: 200, delay: index * 50 }}
                  >
                    <div class="literature-item-header">
                      <h5 class="literature-title">
                        {item.title || item.name || "Untitled"}
                      </h5>
                      {#if item.type}
                        <span class="literature-type-badge">{item.type}</span>
                      {/if}
                    </div>
                    {#if item.authors}
                      <div class="literature-authors">
                        <span class="authors-label">Authors:</span>
                        <span class="authors-text">
                          {Array.isArray(item.authors)
                            ? item.authors.join(", ")
                            : item.authors}
                        </span>
                      </div>
                    {/if}
                    {#if item.publishYear}
                      <div class="literature-year">
                        <span class="year-label">Year:</span>
                        <span class="year-text">{item.publishYear}</span>
                      </div>
                    {/if}
                    {#if item.publisherName}
                      <div class="literature-publisher">
                        <span class="publisher-label">Publisher:</span>
                        <span class="publisher-text">{item.publisherName}</span>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <!-- Regular event details -->
            <div class="event-details-grid">
              {#each selectedEvent.details as detail}
                <div class="detail-item">
                  {#if detail.includes(":")}
                    {@const [label, value] = detail.split(":", 2)}
                    <div class="detail-label">
                      <span class="label-text">{label.trim()}</span>
                    </div>
                    <div class="detail-value">
                      {#if label.toLowerCase().includes("events")}
                        <!-- Event types as tags -->
                        <div class="tag-container">
                          {#each value.includes(",") ? value
                                .split(",")
                                .map( (v) => v.trim() ) : [value.trim()] as eventType}
                            <span class="event-type-tag {eventType}"
                              >{capitalizeTag(eventType)}</span
                            >
                          {/each}
                        </div>
                      {:else if label
                        .toLowerCase()
                        .includes("keywords") && value.includes(",")}
                        <!-- Keywords as tags -->
                        <div class="tag-container">
                          {#each value
                            .split(",")
                            .map((v) => v.trim()) as keyword}
                            <span class="keyword-tag">
                              <Tag class="w-3 h-3" />
                              {capitalizeTag(keyword)}
                            </span>
                          {/each}
                        </div>
                      {:else if label
                        .toLowerCase()
                        .includes("fields") && value.includes(",")}
                        <!-- Updated fields as tags -->
                        <div class="tag-container">
                          {#each value.split(",").map((v) => v.trim()) as field}
                            <span class="field-tag">{capitalizeTag(field)}</span
                            >
                          {/each}
                        </div>
                      {:else if label.toLowerCase().includes("time range")}
                        <!-- Time range with special formatting -->
                        <div class="time-range">
                          <Clock class="w-4 h-4 text-muted-foreground" />
                          <span class="time-text">{value.trim()}</span>
                        </div>
                      {:else if value.includes("→")}
                        <!-- Status changes with arrow -->
                        <div class="status-change">
                          {#each value
                            .split("→")
                            .map((v) => v.trim()) as statusValue, index}
                            {#if index === 0}
                              <span class="status-from">{statusValue}</span>
                            {:else}
                              <ChevronRight
                                class="w-4 h-4 text-muted-foreground"
                              />
                              <span class="status-to">{statusValue}</span>
                            {/if}
                          {/each}
                        </div>
                      {:else}
                        <!-- Regular text value -->
                        <span class="text-value">{value.trim()}</span>
                      {/if}
                    </div>
                  {:else}
                    <!-- Simple detail without colon -->
                    <div class="simple-detail">
                      <span class="simple-detail-text">{detail}</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <div class="no-details">
            <FileText class="w-8 h-8 text-muted-foreground/60" />
            <p class="text-sm text-muted-foreground">
              No additional details available
            </p>
          </div>
        {/if}

        <!-- Enhanced Data Section (if available) -->
        {#if selectedEvent?.data && Object.keys(selectedEvent.data).some((key) => key === "nodeCount" || key === "edgeCount" || (key === "updatedFields" && selectedEvent?.data?.updatedFields?.length > 0))}
          <div class="data-section">
            <h4 class="data-section-title">
              <Info class="w-4 h-4" />
              Additional Information
            </h4>
            <div class="data-grid">
              {#if selectedEvent.data.nodeCount !== undefined}
                <div class="data-item">
                  <span class="data-label">Nodes</span>
                  <span class="data-value numeric"
                    >{selectedEvent.data.nodeCount}</span
                  >
                </div>
              {/if}
              {#if selectedEvent.data.edgeCount !== undefined}
                <div class="data-item">
                  <span class="data-label">Edges</span>
                  <span class="data-value numeric"
                    >{selectedEvent.data.edgeCount}</span
                  >
                </div>
              {/if}
              {#if selectedEvent.data.updatedFields && selectedEvent.data.updatedFields.length > 0}
                <div class="data-item span-full">
                  <span class="data-label">Updated Fields</span>
                  <div class="tag-container">
                    {#each selectedEvent.data.updatedFields as field}
                      <span class="field-tag">{capitalizeTag(field)}</span>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- New Levels Info Dialog -->
<Dialog.Root bind:open={showLevelsDialog}>
  <Dialog.Content class="sm:max-w-[800px]">
    <div class="flex flex-col space-y-1.5 p-4">
      <Dialog.Title class="text-2xl">Research Levels</Dialog.Title>
      <Dialog.Description class="text-muted-foreground">
        Your journey through research mastery
      </Dialog.Description>
    </div>
    <div class="px-4 pb-4 pt-3 max-h-[70vh] overflow-y-auto">
      <div class="grid gap-4 md:grid-cols-2">
        {#each levels as level, index}
          <div
            class="level-card relative overflow-hidden p-3 rounded-lg border backdrop-blur-sm"
          >
            <div
              class="absolute inset-0 opacity-10 bg-gradient-to-br {level.color}"
            ></div>
            <div class="relative z-10 flex gap-3 items-start">
              <div class={`level-badge-small bg-gradient-to-br ${level.color}`}>
                <span class="text-base font-bold">{index + 1}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h3
                  class={`text-base font-semibold bg-gradient-to-r ${level.color} bg-clip-text text-transparent truncate`}
                >
                  {level.name}
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {level.description}
                </p>
                <div class="flex justify-between items-center mt-1.5 text-xs">
                  <span
                    class={`font-medium bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}
                  >
                    {formatNumber(level.minXP)} XP
                  </span>
                  {#if level.maxXP !== Infinity}
                    <span class="text-muted-foreground mx-1">→</span>
                    <span
                      class={`font-medium bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}
                    >
                      {formatNumber(level.maxXP)} XP
                    </span>
                  {:else}
                    <span
                      class={`font-medium bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}
                    >
                      and beyond
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    <div class="flex justify-end p-4 pt-0">
      <Button variant="outline" onclick={() => (showLevelsDialog = false)}
        >Close</Button
      >
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .achievement-group {
    @apply bg-card/50 backdrop-blur-sm rounded-lg p-6 border-2;
    border-image: linear-gradient(
        to right,
        hsl(var(--primary) / 0.2),
        transparent
      )
      1;
  }

  .achievement-card {
    @apply relative border-2 transition-all duration-300 hover:scale-[1.02] bg-card/50 backdrop-blur-sm;
    border-image: linear-gradient(
        to bottom right,
        transparent,
        hsl(var(--muted-foreground) / 0.2)
      )
      1;
  }

  .achievement-card.completed {
    @apply bg-gradient-to-br from-background to-background/50;
    border-image: linear-gradient(
        to bottom right,
        hsl(var(--primary)),
        hsl(var(--primary) / 0.2)
      )
      1;
  }

  .achievement-badge {
    @apply absolute -top-2 -right-2 h-8 w-8 text-white rounded-full 
           flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300;
  }

  .achievement-points {
    @apply text-sm font-normal px-2 py-0.5 rounded-full transition-colors duration-300;
  }

  .tab-button {
    @apply inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold;
  }

  :global([role="dialog"]) {
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  :global([role="dialog"] > div) {
    margin: 0 !important;
  }

  :global(.achievement-progress) {
    @apply h-2 rounded-full overflow-hidden bg-muted;
  }

  :global(.achievement-progress[data-state="complete"]) > div {
    @apply bg-gradient-to-r;
  }

  :global(.achievement-progress.completed > div) {
    @apply bg-gradient-to-r from-emerald-500 to-emerald-600 !important;
  }

  :global(.level-progress) {
    @apply rounded-full overflow-hidden bg-muted/50 backdrop-blur-sm;
  }

  :global(.level-progress > div) {
    @apply bg-gradient-to-r transition-all duration-500 shadow-lg;
  }

  .level-card {
    @apply transition-all duration-300 hover:shadow-lg rounded-xl border border-border/50 relative;
    background:
      linear-gradient(
          to bottom right,
          hsl(var(--background)),
          hsl(var(--background))
        )
        padding-box,
      linear-gradient(
          to bottom right,
          hsl(var(--muted-foreground) / 0.2),
          transparent
        )
        border-box;
  }

  .level-card:hover {
    @apply transform -translate-y-0.5;
    background:
      linear-gradient(
          to bottom right,
          hsl(var(--background)),
          hsl(var(--background))
        )
        padding-box,
      linear-gradient(
          to bottom right,
          hsl(var(--primary)),
          hsl(var(--primary) / 0.2)
        )
        border-box;
  }

  .level-badge-small {
    @apply h-6 w-6 rounded-lg text-primary-foreground
           flex items-center justify-center shadow-md
           ring-1 ring-white/10 backdrop-blur-sm shrink-0;
  }

  /* Enhanced Research Level Card */
  .research-level-card {
    @apply relative overflow-hidden rounded-xl bg-gradient-to-br from-background to-background/80 backdrop-blur-sm;
    background-image: radial-gradient(
        at 40% 20%,
        rgba(120, 119, 198, 0.05) 0px,
        transparent 50%
      ),
      radial-gradient(at 80% 0%, rgba(255, 255, 255, 0.02) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(255, 255, 255, 0.02) 0px, transparent 50%);
  }

  .view-all-button {
    @apply bg-background/60 backdrop-blur-sm border border-border/50 
           hover:bg-background/80 hover:border-border transition-all duration-200
           text-sm font-medium flex items-center h-8;
  }

  .level-display {
    @apply flex items-center gap-4;
  }

  .level-badge-container {
    @apply relative flex-shrink-0;
  }

  .level-badge {
    @apply w-16 h-16 rounded-xl text-white flex items-center justify-center 
           shadow-lg shadow-black/20 backdrop-blur-sm relative z-10
           ring-2 ring-white/10 transition-all duration-300;
  }

  .level-glow {
    @apply absolute inset-0 w-16 h-16 rounded-xl opacity-20 blur-lg scale-110 -z-10;
  }

  .level-number {
    @apply text-xl font-bold tracking-tight;
  }

  .level-info {
    @apply flex-1 space-y-2;
  }

  .level-name {
    @apply text-xl font-bold leading-tight;
  }

  .level-description {
    @apply text-sm text-muted-foreground leading-relaxed;
  }

  .xp-info {
    @apply flex items-baseline gap-2 text-base font-semibold;
  }

  .current-xp {
    @apply text-foreground;
  }

  .xp-separator {
    @apply text-sm text-muted-foreground font-medium;
  }

  .xp-next {
    @apply text-sm text-muted-foreground;
  }

  .progress-section {
    @apply space-y-3 p-4 rounded-lg bg-muted/20 backdrop-blur-sm border border-border/30;
  }

  .progress-header {
    @apply flex items-center justify-between;
  }

  .progress-label {
    @apply text-sm font-medium text-muted-foreground;
  }

  .progress-percentage {
    @apply flex items-baseline gap-1;
  }

  .percentage-value {
    @apply text-lg font-bold text-foreground;
  }

  .percentage-symbol {
    @apply text-sm font-medium text-muted-foreground;
  }

  .progress-container {
    @apply relative w-full;
  }

  :global(.research-progress) {
    @apply h-2 w-full rounded-full overflow-hidden bg-muted/50 backdrop-blur-sm;
  }

  :global(.research-progress > div) {
    @apply transition-all duration-700 ease-out;
  }

  .progress-footer {
    @apply text-center pt-1;
  }

  .points-needed {
    @apply text-xs text-muted-foreground;
  }

  .max-level-achievement {
    @apply flex items-center gap-3 p-4 rounded-lg 
           bg-gradient-to-r from-yellow-50 to-amber-50 
           dark:from-yellow-950/20 dark:to-amber-950/20
           border border-yellow-200 dark:border-yellow-800;
  }

  .achievement-icon {
    @apply w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500
           flex items-center justify-center shadow-lg shadow-yellow-500/20
           animate-pulse flex-shrink-0;
  }

  .achievement-content {
    @apply space-y-1;
  }

  .achievement-title {
    @apply text-xl font-semibold text-foreground leading-tight mb-1;
  }

  .achievement-description {
    @apply text-sm text-muted-foreground;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .level-display {
      @apply flex-col items-start gap-3;
    }

    .level-badge {
      @apply w-14 h-14;
    }

    .level-glow {
      @apply w-14 h-14;
    }

    .level-number {
      @apply text-lg;
    }

    .level-name {
      @apply text-lg;
    }

    .progress-section {
      @apply p-3;
    }

    .max-level-achievement {
      @apply flex-col text-center gap-2 p-3;
    }
  }

  /* Enhanced Event Modal Styles */
  .event-modal-header {
    @apply p-6 pb-4 border-b border-border/20;
  }

  .header-content {
    @apply flex items-start gap-4;
  }

  .event-icon-container {
    @apply w-12 h-12 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm flex-shrink-0;
  }

  .header-text {
    @apply flex-1 min-w-0;
  }

  .title-and-badges {
    @apply flex items-center gap-3 flex-wrap;
  }

  .event-title {
    @apply text-xl font-semibold text-foreground leading-tight;
  }

  .event-modal-content {
    @apply p-6 pt-4 max-h-[55vh] overflow-y-auto space-y-6;
  }

  .event-details-grid {
    @apply space-y-4;
  }

  .detail-item {
    @apply grid grid-cols-[120px_1fr] gap-4 items-start py-3 border-b border-border/10 last:border-b-0;
  }

  .detail-label {
    @apply flex items-center gap-2;
  }

  .label-text {
    @apply text-sm font-medium text-muted-foreground uppercase tracking-wide;
  }

  .detail-value {
    @apply flex flex-wrap items-center gap-2;
  }

  .text-value {
    @apply text-sm text-foreground font-medium;
  }

  /* Tag Styles */
  .tag-container {
    @apply flex flex-wrap gap-1.5;
  }

  .event-type-tag {
    @apply inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-colors;
    /* Default styling for any event type */
    @apply bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800;
  }

  .event-type-tag.created {
    @apply bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800;
  }

  .event-type-tag.updated {
    @apply bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800;
  }

  .event-type-tag.modified {
    @apply bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800;
  }

  .keyword-tag {
    @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
           bg-violet-50 text-violet-700 border border-violet-200
           dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800;
  }

  .field-tag {
    @apply inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium
           bg-amber-50 text-amber-700 border border-amber-200
           dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800;
  }

  /* Time Range Styles */
  .time-range {
    @apply flex items-center gap-2 text-sm text-foreground;
  }

  .time-text {
    @apply font-mono text-xs bg-muted/50 px-2 py-1 rounded;
  }

  /* Status Change Styles */
  .status-change {
    @apply flex items-center gap-2 text-sm;
  }

  .status-from {
    @apply px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 text-xs font-medium
           dark:bg-red-950/30 dark:text-red-400 dark:border-red-800;
  }

  .status-to {
    @apply px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 text-xs font-medium
           dark:bg-green-950/30 dark:text-green-400 dark:border-green-800;
  }

  /* No Details State */
  .no-details {
    @apply flex flex-col items-center justify-center py-8 text-center space-y-3;
  }

  /* Data Section */
  .data-section {
    @apply border-t border-border/20 pt-6;
  }

  .data-section-title {
    @apply flex items-center gap-2 text-sm font-semibold text-foreground mb-4 uppercase tracking-wide;
  }

  .data-grid {
    @apply grid grid-cols-2 gap-3;
  }

  .data-item {
    @apply flex flex-col gap-1 p-3 rounded-lg bg-muted/30 border border-border/20;
  }

  .data-item.span-full {
    @apply col-span-2;
  }

  .data-label {
    @apply text-xs font-medium text-muted-foreground uppercase tracking-wide;
  }

  .data-value {
    @apply text-sm font-semibold text-foreground;
  }

  .data-value.numeric {
    @apply text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent;
  }

  .close-button {
    @apply hover:bg-accent hover:text-accent-foreground transition-colors;
  }

  /* Responsive Modal */
  @media (max-width: 640px) {
    .detail-item {
      @apply grid-cols-1 gap-2;
    }

    .header-content {
      @apply flex-col gap-3;
    }

    .event-icon-container {
      @apply w-10 h-10;
    }

    .event-title {
      @apply text-lg;
    }

    .data-grid {
      @apply grid-cols-1;
    }

    .data-item.span-full {
      @apply col-span-1;
    }

    .header-text {
      @apply space-y-2;
    }
  }

  /* Custom Scrollbar for Modal Content */
  .event-modal-content {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  }

  .event-modal-content::-webkit-scrollbar {
    width: 6px;
  }

  .event-modal-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .event-modal-content::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }

  .event-modal-content::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }

  /* Literature Items Display */
  .literature-items-container {
    @apply space-y-4;
  }

  .literature-section-title {
    @apply flex items-center gap-2 text-lg font-semibold text-foreground pb-3 border-b border-border/20;
  }

  .literature-items-grid {
    @apply space-y-3 max-h-96 overflow-y-auto;
  }

  .literature-item-card {
    @apply p-4 rounded-lg border border-border/20 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors space-y-3;
  }

  .literature-item-header {
    @apply flex items-start justify-between gap-3;
  }

  .literature-title {
    @apply text-sm font-semibold text-foreground line-clamp-2 flex-1;
  }

  .literature-type-badge {
    @apply inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 flex-shrink-0;
  }

  .literature-authors {
    @apply flex flex-col gap-1;
  }

  .authors-label {
    @apply text-xs font-medium text-muted-foreground uppercase tracking-wide;
  }

  .authors-text {
    @apply text-sm text-foreground;
  }

  .literature-year {
    @apply flex items-center gap-2;
  }

  .year-label {
    @apply text-xs font-medium text-muted-foreground uppercase tracking-wide;
  }

  .year-text {
    @apply text-sm text-foreground font-medium;
  }

  .literature-publisher {
    @apply flex flex-col gap-1;
  }

  .publisher-label {
    @apply text-xs font-medium text-muted-foreground uppercase tracking-wide;
  }

  .publisher-text {
    @apply text-sm text-foreground;
  }

  /* Simple detail styling for non-colon items */
  .simple-detail {
    @apply col-span-2 py-2;
  }

  .simple-detail-text {
    @apply text-sm text-foreground;
  }

  /* Custom scrollbar for literature items */
  .literature-items-grid {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  }

  .literature-items-grid::-webkit-scrollbar {
    width: 6px;
  }

  .literature-items-grid::-webkit-scrollbar-track {
    background: transparent;
  }

  .literature-items-grid::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }

  .literature-items-grid::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }

  /* Custom badges in modal header */
  .custom-badges {
    @apply flex items-center gap-2;
  }

  .custom-badges .custom-badge {
    @apply inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full;
  }

  .custom-badges .custom-type-badge {
    @apply inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full;
  }

  /* Custom event details styling */
  .custom-event-details {
    @apply space-y-4;
  }

  .custom-event-section-title {
    @apply flex items-center gap-2 text-lg font-semibold text-foreground pb-3 border-b border-border/20;
  }

  .event-meta-grid {
    @apply grid grid-cols-2 gap-3;
  }

  .meta-item {
    @apply flex flex-col gap-1;
  }

  .meta-label {
    @apply text-xs font-medium text-muted-foreground uppercase tracking-wide;
  }

  .meta-value {
    @apply text-sm text-foreground font-medium;
  }

  .custom-detail-section {
    @apply space-y-2;
  }

  .detail-section-title {
    @apply text-sm font-medium text-muted-foreground uppercase tracking-wide;
  }

  .detail-text {
    @apply text-sm text-foreground leading-relaxed break-words whitespace-normal;
  }

  .detail-list {
    @apply space-y-1 pl-0;
  }

  .detail-list-item {
    @apply text-sm text-foreground leading-relaxed flex items-start gap-2;
  }

  .detail-list-item::before {
    content: "•";
    @apply text-muted-foreground font-bold flex-shrink-0;
    line-height: 1.5; /* Match the line-height of the text */
  }

  .custom-event-tag {
    @apply inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium
           bg-primary/10 text-primary border border-primary/20;
  }
</style>

<!-- src/routes/project/Progress.svelte -->
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
  } from "lucide-svelte";
  import { onDestroy, onMount } from "svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import { fade } from "svelte/transition";
  import { API_BASE_URL } from "$lib/config";

  // Level definitions with colors
  const levels = [
    {
      name: "Spark of Curiosity",
      minXP: 0,
      maxXP: 1000,
      color: "from-amber-500 to-orange-600",
    },
    {
      name: "Illuminator",
      minXP: 1001,
      maxXP: 2000,
      color: "from-blue-500 to-indigo-600",
    },
    {
      name: "Knowledge Weaver",
      minXP: 2001,
      maxXP: 3000,
      color: "from-purple-500 to-fuchsia-600",
    },
    {
      name: "Insight Architect",
      minXP: 3001,
      maxXP: 4000,
      color: "from-emerald-500 to-teal-600",
    },
    {
      name: "Wisdom Sculptor",
      minXP: 4001,
      maxXP: 5000,
      color: "from-rose-500 to-pink-600",
    },
    {
      name: "Enlightenment Explorer",
      minXP: 5001,
      maxXP: 6000,
      color: "from-cyan-500 to-blue-600",
    },
    {
      name: "Sage of Scholars",
      minXP: 6001,
      maxXP: Infinity,
      color: "from-violet-500 to-purple-600",
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

  // Timeline related state and types
  type TimelineItem = {
    id: string;
    group: string;
    content: string;
    start: Date;
    type: string;
    className: string;
    itemData?: any;
  };

  let timelineContainer: HTMLElement;
  let timeline = $state<any>(null);
  let isTimelineLoading = $state(true);
  let isInitialized = $state(false);
  let showDialog = $state(false);
  let dialogTitle = $state("");
  let dialogContent = $state<string[]>([]);

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

  // Timeline groups
  const timelineGroups = [
    { id: "project", content: "Project", order: 1 },
    { id: "literature", content: "Literature", order: 2 },
    { id: "notes", content: "Notes", order: 3 },
    { id: "models", content: "Models", order: 4 },
    { id: "outcomes", content: "Outcomes", order: 5 },
  ];

  onMount(async () => {
    if (
      timelineContainer &&
      projectStore.currentProject?.id &&
      !isInitialized
    ) {
      initializeTimeline();
    }
    await loadAchievements();
  });

  $effect(() => {
    if (
      timelineContainer &&
      projectStore.currentProject?.id &&
      !isInitialized
    ) {
      initializeTimeline();
    }
  });

  async function initializeTimeline() {
    if (!timelineContainer || !projectStore.currentProject) return;
    isInitialized = true;

    try {
      // Add vis-timeline CSS if not already added
      if (!document.querySelector('link[href*="vis-timeline"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href =
          "https://unpkg.com/vis-timeline/standalone/umd/vis-timeline-graph2d.min.css";
        document.head.appendChild(link);
      }

      // Load vis-timeline script if not already loaded
      if (!(window as any).vis) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://unpkg.com/vis-timeline/standalone/umd/vis-timeline-graph2d.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Load data from stores if needed
      if (!literatureStore.data.length) {
        await literatureStore.loadLiterature(projectStore.currentProject.id);
      }
      if (!notesStore.notes.length) {
        await notesStore.loadNotes(projectStore.currentProject.id);
      }

      // Helper function to get date key (YYYY-MM-DD)
      function getDateKey(date: Date): string {
        return date.toLocaleDateString("en-CA"); // Returns YYYY-MM-DD in local timezone
      }

      // Create timeline items with groups
      const timelineItems: TimelineItem[] = [];

      const currentProject = projectStore.currentProject;

      // Add project creation
      const projectDate = new Date(currentProject.createdAt || Date.now());
      timelineItems.push({
        id: "project_creation",
        group: "project",
        content: `Project Created: ${currentProject.name}`,
        start: projectDate,
        type: "point",
        className: "project-item",
      });

      // Fetch and add status changes
      try {
        const response = await fetch(
          `${API_BASE_URL}/events?type=project.status.changed&subjectId=${currentProject.id}`,
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const statusChanges = await response.json();
          statusChanges.forEach((change: any) => {
            const changeDate = new Date(change.createdAt);
            timelineItems.push({
              id: `status_${change.id}`,
              group: "project",
              content: `Status Changed: ${change.data.previousStatus || "None"} → ${change.data.newStatus}`,
              start: changeDate,
              type: "point",
              className: "status-change-item",
              itemData: change.data,
            });
          });
        }
      } catch (error) {
        console.error("Error fetching status changes:", error);
      }

      // Fetch and add design changes
      try {
        const response = await fetch(
          `${API_BASE_URL}/events?type=project.design.changed&subjectId=${currentProject.id}`,
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const designChanges = await response.json();
          designChanges.forEach((change: any) => {
            const changeDate = new Date(change.createdAt);
            const fieldName = change.data.field
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str: string) => str.toUpperCase())
              .replace(/\s(.)/g, (str: string) => " " + str.toUpperCase());
            timelineItems.push({
              id: `design_${change.id}`,
              group: "project",
              content: `${fieldName}: ${change.data.previousValue || "None"} → ${change.data.newValue}`,
              start: changeDate,
              type: "point",
              className: "design-change-item",
              itemData: { ...change.data, fieldName },
            });
          });
        }
      } catch (error) {
        console.error("Error fetching design changes:", error);
      }

      // Fetch and add model creations
      try {
        const response = await fetch(
          `${API_BASE_URL}/events?type=model.created&subjectId=${currentProject.id}`,
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const modelEvents = await response.json();
          modelEvents.forEach((event: any) => {
            const changeDate = new Date(event.createdAt);
            timelineItems.push({
              id: `model_${event.id}`,
              group: "models",
              content: `Created Model: ${event.data.name}`,
              start: changeDate,
              type: "point",
              className: "model-item",
              itemData: event.data,
            });
          });
        }
      } catch (error) {
        console.error("Error fetching model events:", error);
      }

      // Fetch and add outcome creations
      try {
        const response = await fetch(
          `${API_BASE_URL}/events?type=outcome.created&subjectId=${currentProject.id}`,
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const outcomeEvents = await response.json();
          outcomeEvents.forEach((event: any) => {
            const changeDate = new Date(event.createdAt);
            timelineItems.push({
              id: `outcome_${event.id}`,
              group: "outcomes",
              content: `Created ${event.data.type} Outcome: ${event.data.name}`,
              start: changeDate,
              type: "point",
              className: "outcome-item",
              itemData: event.data,
            });
          });
        }
      } catch (error) {
        console.error("Error fetching outcome events:", error);
      }

      // Group literature items by date
      const litByDate = new Map<string, any[]>();
      literatureStore.data.forEach((lit) => {
        const date = new Date(lit.createdAt || Date.now());
        const dateKey = getDateKey(date);
        if (!litByDate.has(dateKey)) {
          litByDate.set(dateKey, []);
        }
        litByDate.get(dateKey)?.push({ ...lit, exactDate: date }); // Store exact date
      });

      // Add grouped literature items
      litByDate.forEach((lits, dateKey) => {
        const count = lits.length;
        const content =
          count === 1
            ? "Added 1 Literature Item"
            : `Added ${count} Literature Items`;

        // Use the earliest timestamp from the group
        const earliestTime = new Date(
          Math.min(...lits.map((lit) => lit.exactDate.getTime()))
        );

        timelineItems.push({
          id: `lit_${dateKey}`,
          group: "literature",
          content,
          start: earliestTime, // Use exact timestamp
          type: "point",
          className: "literature-item",
          itemData: lits,
        });
      });

      // Group notes by date
      const notesByDate = new Map<string, any[]>();
      notesStore.notes.forEach((note) => {
        const date = new Date(note.createdAt || Date.now());
        const dateKey = getDateKey(date);
        if (!notesByDate.has(dateKey)) {
          notesByDate.set(dateKey, []);
        }
        notesByDate.get(dateKey)?.push({ ...note, exactDate: date }); // Store exact date
      });

      // Add grouped note items
      notesByDate.forEach((notes, dateKey) => {
        const count = notes.length;
        const content =
          count === 1 ? "Created 1 Note" : `Created ${count} Notes`;

        // Use the earliest timestamp from the group
        const earliestTime = new Date(
          Math.min(...notes.map((note) => note.exactDate.getTime()))
        );

        timelineItems.push({
          id: `note_${dateKey}`,
          group: "notes",
          content,
          start: earliestTime, // Use exact timestamp
          type: "point",
          className: "note-item",
          itemData: notes,
        });
      });

      // Sort items by date
      timelineItems.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Initialize timeline with proper typing
      const options = {
        min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
        zoomMin: 1000 * 60 * 60 * 24, // One day
        zoomMax: 1000 * 60 * 60 * 24 * 31 * 3, // Three months
        showCurrentTime: true,
        stack: true,
        orientation: "top",
        tooltip: {
          followMouse: true,
          overflowMethod: "cap",
        },
        groupOrder: "order",
      };

      // Create DataSet for items and groups
      // @ts-ignore - vis is loaded dynamically
      const itemsDataset = new vis.DataSet(timelineItems);
      // @ts-ignore - vis is loaded dynamically
      const groupsDataset = new vis.DataSet(timelineGroups);

      // Initialize timeline
      // @ts-ignore - vis is loaded dynamically
      timeline = new vis.Timeline(
        timelineContainer,
        itemsDataset,
        groupsDataset,
        options
      );

      // Add click handler
      timeline.on("select", (properties: { items: string[] }) => {
        if (!properties.items?.length) return;

        const selectedId = properties.items[0];
        const selectedItem = timelineItems.find(
          (item) => item.id === selectedId
        );

        if (!selectedItem) return;

        // Handle different item types
        if (selectedId.startsWith("lit_")) {
          dialogTitle = `Literature Added on ${new Date(selectedItem.start).toLocaleDateString()}`;
          dialogContent = (selectedItem.itemData ?? []).map((lit: any) => {
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
          });
          showDialog = true;
        } else if (selectedId.startsWith("note_")) {
          dialogTitle = `Notes Created on ${new Date(selectedItem.start).toLocaleDateString()}`;
          dialogContent = (selectedItem.itemData ?? []).map((note: any) => {
            const type = note.type?.toLowerCase() || "research";
            return `${note.name || "Untitled Note"} (${type})`;
          });
          showDialog = true;
        } else if (selectedId.startsWith("status_")) {
          dialogTitle = "Project Status Change";
          const time = new Date(selectedItem.start).toLocaleString();
          const { previousStatus, newStatus } = selectedItem.itemData;
          dialogContent = [
            `Time: ${time}`,
            `Previous Status: ${previousStatus || "None"}`,
            `New Status: ${newStatus}`,
          ];
          showDialog = true;
        } else if (selectedId.startsWith("design_")) {
          dialogTitle = "Project Design Change";
          const time = new Date(selectedItem.start).toLocaleString();
          const { fieldName, previousValue, newValue } = selectedItem.itemData;
          dialogContent = [
            `Time: ${time}`,
            `Design Type: ${fieldName}`,
            `Previous Design: ${previousValue || "None"}`,
            `New Design: ${newValue}`,
          ];
          showDialog = true;
        } else if (selectedId.startsWith("model_")) {
          dialogTitle = "Model Created";
          const time = new Date(selectedItem.start).toLocaleString();
          const { name } = selectedItem.itemData;
          dialogContent = [`Time: ${time}`, `Model Name: ${name}`];
          showDialog = true;
        } else if (selectedId.startsWith("outcome_")) {
          dialogTitle = "Outcome Created";
          const time = new Date(selectedItem.start).toLocaleString();
          const { name, type, sectionType } = selectedItem.itemData;
          dialogContent = [
            `Time: ${time}`,
            `Name: ${name}`,
            `Type: ${type}`,
            ...(sectionType ? [`Section: ${sectionType}`] : []),
          ];
          showDialog = true;
        }
      });

      // Prevent default wheel scroll behavior (for zooming)
      timelineContainer.addEventListener(
        "wheel",
        (event) => {
          event.preventDefault();
        },
        { passive: false }
      );
    } catch (error) {
      console.error("Error initializing timeline:", error);
      isInitialized = false;
    } finally {
      isTimelineLoading = false;
    }
  }

  function zoomTimeline(factor: number) {
    console.log("Zooming timeline with factor:", factor);
    if (timeline) {
      if (factor > 0) {
        timeline.zoomIn(factor);
      } else {
        // Use zoomOut for negative factors (adjust magnitude if needed)
        timeline.zoomOut(Math.abs(factor));
      }
    }
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
      const response = await fetch(
        `${API_BASE_URL}/achievement/project/${projectStore.currentProject.id}/status`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch achievements");

      const data = await response.json();
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

  onDestroy(() => {
    if (timeline) {
      timeline.destroy();
    }
  });
</script>

<div class="container mx-auto py-6 px-4 space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold">Research Progress</h1>
  </div>

  {#if !isAchievementsLoading && !error}
    {@const totalPoints = achievements.reduce(
      (sum, a) => sum + (a.completed ? a.points : 0),
      0
    )}
    {@const levelInfo = getCurrentLevel(totalPoints)}
    <div in:fade={{ duration: 300 }}>
      <Card class="border-2">
        <CardHeader>
          <CardTitle>Research Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="level-progress-container">
            <div class="flex items-center gap-4 mb-2">
              <div
                class={`level-badge bg-gradient-to-br ${levelInfo.current.color}`}
              >
                <span class="text-xl font-bold">{levelInfo.index}</span>
              </div>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <h3
                    class={`text-lg font-semibold bg-gradient-to-r ${levelInfo.current.color} bg-clip-text text-transparent`}
                  >
                    {levelInfo.current.name}
                  </h3>
                  <span
                    class={`text-lg font-bold bg-gradient-to-r ${levelInfo.current.color} bg-clip-text text-transparent`}
                  >
                    {formatNumber(totalPoints)} Points
                  </span>
                </div>
                <div class="relative">
                  <Progress.Root
                    value={levelInfo.progress}
                    class={`h-2.5 level-progress ${levelInfo.current.color}`}
                  />
                  {#if levelInfo.next}
                    <div class="flex justify-between text-sm mt-1">
                      <span
                        class={`bg-gradient-to-r ${levelInfo.current.color} bg-clip-text text-transparent font-medium`}
                      >
                        {formatNumber(levelInfo.current.minXP)}
                      </span>
                      <span
                        class={`bg-gradient-to-r ${levelInfo.next.color} bg-clip-text text-transparent font-medium`}
                      >
                        {formatNumber(levelInfo.next.minXP)}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
            {#if levelInfo.next}
              <p class="text-sm text-center mt-3">
                <span class="text-muted-foreground"
                  >{formatNumber(levelInfo.next.minXP - totalPoints)} points until</span
                >
                <span
                  class={`ml-1 font-medium bg-gradient-to-r ${levelInfo.next.color} bg-clip-text text-transparent`}
                >
                  {levelInfo.next.name}
                </span>
              </p>
            {:else}
              <p
                class={`text-sm font-medium text-center mt-3 bg-gradient-to-r ${levelInfo.current.color} bg-clip-text text-transparent`}
              >
                Maximum Level Achieved!
              </p>
            {/if}
          </div>
        </CardContent>
      </Card>
    </div>
  {/if}

  <Tabs.Root
    value={activeTab}
    onValueChange={(value: string) => (activeTab = value)}
    class="space-y-6"
  >
    <Tabs.List class="inline-flex h-10 items-center justify-center gap-4">
      <Tabs.Trigger value="timeline" class="tab-button">
        <Calendar class="h-4 w-4 mr-2" />
        Project Timeline
      </Tabs.Trigger>
      <Tabs.Trigger value="achievements" class="tab-button">
        <Trophy class="h-4 w-4 mr-2" />
        Achievements
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="timeline" class="space-y-4">
      <Card class="border-2">
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex justify-end gap-2 mb-2">
            <Button
              variant="outline"
              size="icon"
              onclick={() => zoomTimeline(0.2)}
            >
              <Plus class="h-4 w-4" />
              <span class="sr-only">Zoom In</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onclick={() => zoomTimeline(-0.2)}
            >
              <Minus class="h-4 w-4" />
              <span class="sr-only">Zoom Out</span>
            </Button>
          </div>
          <div bind:this={timelineContainer} class="w-full timeline-container">
            {#if isTimelineLoading}
              <div class="flex justify-center items-center min-h-[400px]">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
                ></div>
              </div>
            {/if}
          </div>
        </CardContent>
      </Card>
    </Tabs.Content>

    <Tabs.Content value="achievements" class="space-y-6">
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
  <Dialog.Content class="sm:max-w-[425px]">
    <div class="flex flex-col space-y-1.5 p-6">
      <Dialog.Title>{dialogTitle}</Dialog.Title>
    </div>
    <div class="py-4 max-h-[60vh] overflow-y-auto px-6">
      <ul class="list-disc pl-6 space-y-2">
        {#each dialogContent as item}
          <li class="text-sm">{item}</li>
        {/each}
      </ul>
    </div>
    <div class="flex justify-end p-6 pt-0">
      <Button variant="outline" onclick={() => (showDialog = false)}
        >Close</Button
      >
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.timeline-container) {
    background: var(--background);
    border-radius: 0.5rem;
    padding: 1rem;
    min-height: 200px; /* Keep a minimum height */
    overflow-x: hidden; /* Keep horizontal scroll prevention */
  }

  :global(.vis-timeline) {
    border: none !important;
    font-family: inherit !important;
  }

  :global(.vis-item) {
    border-radius: 4px;
    border-width: 2px !important;
    cursor: pointer;
    font-size: 0.875rem !important;
  }

  :global(.vis-item.vis-selected) {
    box-shadow: 0 0 0 2px var(--primary) !important;
  }

  :global(.project-item) {
    background-color: #22c55e !important;
    border-color: #16a34a !important;
    color: white;
  }

  :global(.literature-item) {
    background-color: #3b82f6 !important;
    border-color: #2563eb !important;
    color: white;
  }

  :global(.note-item) {
    background-color: #f59e0b !important;
    border-color: #d97706 !important;
    color: white;
  }

  :global(.status-change-item) {
    background-color: #ec4899 !important;
    border-color: #db2777 !important;
    color: white;
  }

  :global(.design-change-item) {
    background-color: #8b5cf6 !important;
    border-color: #7c3aed !important;
    color: white;
  }

  :global(.vis-time-axis .vis-text) {
    color: var(--foreground);
  }

  :global(.vis-panel.vis-center),
  :global(.vis-panel.vis-left),
  :global(.vis-panel.vis-right) {
    border-color: var(--border);
  }

  :global(.vis-current-time) {
    background-color: var(--primary) !important;
  }

  :global(.vis-left .vis-group) {
    display: flex !important;
    align-items: center !important;
    height: 100% !important; /* Ensure it takes full height of its row */
    text-align: left !important;
    padding-left: 10px !important; /* Adjust padding as needed */
  }

  /* Style the container for labels in the left panel */
  :global(.vis-panel.vis-left .vis-label) {
    display: flex !important; /* Use flexbox to align children */
    align-items: center !important; /* Vertically center the .vis-inner child */
    padding-left: 10px !important; /* Add some padding */
  }

  /* Style the actual text inside the label */
  :global(.vis-panel.vis-left .vis-label .vis-inner) {
    font-weight: 600 !important; /* Bolder text */
    color: hsl(
      var(--muted-foreground)
    ) !important; /* Brighter color for contrast */
    line-height: normal !important; /* Ensure line height doesn't interfere */
  }

  /* Style the time axis labels (top) */
  :global(.vis-panel.vis-top .vis-time-axis .vis-text) {
    color: var(--foreground) !important; /* Ensure good contrast */
    font-weight: 500; /* Slightly bolder than default */
  }

  :global(.vis-panel.vis-top .vis-time-axis .vis-text.vis-major) {
    font-weight: 600; /* Make major labels (month/year) even bolder */
  }

  :global(.vis-group) {
    /* font-weight: 500; */ /* Moved weight to label */
    color: var(--foreground);
  }

  :global(.vis-label) {
    padding: 0.5rem !important;
  }

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

  .level-progress-container {
    /* @apply bg-background rounded-lg relative overflow-hidden; */
  }

  .level-progress-container::before {
    content: "";
    @apply absolute inset-0 opacity-5;
    background: radial-gradient(
      circle at top left,
      currentColor,
      transparent 70%
    );
  }

  .level-badge {
    @apply h-14 w-14 rounded-xl text-primary-foreground
           flex items-center justify-center shadow-lg
           ring-2 ring-white/10 backdrop-blur-sm;
  }

  :global(.level-progress) {
    @apply rounded-full overflow-hidden bg-muted/50 backdrop-blur-sm;
  }

  :global(.level-progress > div) {
    @apply bg-gradient-to-r transition-all duration-500 shadow-lg;
  }

  :global(.model-item) {
    background-color: #06b6d4 !important;
    border-color: #0891b2 !important;
    color: white;
  }

  :global(.outcome-item) {
    background-color: #10b981 !important;
    border-color: #059669 !important;
    color: white;
  }
</style>

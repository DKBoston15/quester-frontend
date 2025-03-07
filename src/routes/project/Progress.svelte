<!-- src/routes/project/Progress.svelte -->
<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "lucide-svelte";
  import { onDestroy, onMount } from "svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import * as Dialog from "$lib/components/ui/dialog";

  let timelineContainer: HTMLElement;
  let timeline = $state<any>(null);
  let isLoading = $state(true);
  let isInitialized = $state(false);
  let showDialog = $state(false);
  let dialogTitle = $state("");
  let dialogContent = $state<string[]>([]);

  // Define timeline item type
  type TimelineItem = {
    id: string;
    group: string;
    content: string;
    start: Date;
    type: string;
    className: string;
    itemData?: any;
  };

  // Define timeline groups
  const groups = [
    { id: "project", content: "Project", order: 1 },
    { id: "literature", content: "Literature", order: 2 },
    { id: "notes", content: "Notes", order: 3 },
  ];

  onMount(() => {
    if (
      timelineContainer &&
      projectStore.currentProject?.id &&
      !isInitialized
    ) {
      initializeTimeline();
    }
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
      console.log("Project", currentProject.createdAt);

      // Add project creation
      const projectDate = new Date(currentProject.createdAt || Date.now());
      console.log("Project creation time:", projectDate.toLocaleString());
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
          `http://localhost:3333/events?type=project.status.changed&subjectId=${currentProject.id}`,
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

      // Group literature items by date
      const litByDate = new Map<string, any[]>();
      literatureStore.data.forEach((lit) => {
        const date = new Date(lit.createdAt || Date.now());
        console.log("Literature time:", date.toLocaleString());
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
        console.log("Literature group time:", earliestTime.toLocaleString());

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
        console.log("Note time:", date.toLocaleString());
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
        console.log("Notes group time:", earliestTime.toLocaleString());

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
        height: "400px",
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
      const groupsDataset = new vis.DataSet(groups);

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
        }
      });
    } catch (error) {
      console.error("Error initializing timeline:", error);
      isInitialized = false;
    } finally {
      isLoading = false;
    }
  }

  onDestroy(() => {
    if (timeline) {
      timeline.destroy();
    }
  });
</script>

<div class="container mx-auto py-6 px-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold">Research Progress</h1>
    <Button>
      <Plus class="h-4 w-4 mr-2" />
      Add Milestone
    </Button>
  </div>

  <div class="grid gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div bind:this={timelineContainer} class="w-full timeline-container">
          {#if isLoading}
            <div class="flex justify-center items-center min-h-[400px]">
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
              ></div>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  </div>
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
      <Button variant="outline" onclick={() => (showDialog = false)}>
        Close
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.timeline-container) {
    background: var(--background);
    border-radius: 0.5rem;
    padding: 1rem;
    min-height: 400px;
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

  :global(.vis-group) {
    font-weight: 500;
    color: var(--foreground);
  }

  :global(.vis-label) {
    padding: 0.5rem !important;
  }

  :global([role="dialog"]) {
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  :global([role="dialog"] > div) {
    margin: 0 !important;
  }
</style>

<!-- src/routes/project/Literature.svelte -->
<script lang="ts">
  import { onDestroy } from "svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import LiteratureTable from "$lib/components/custom-ui/literature/LiteratureTable.svelte";
  import AddLiterature from "$lib/components/custom-ui/literature/AddLiterature.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Plus, GraduationCap } from "lucide-svelte";
  import type { Literature } from "$lib/types/literature";
  import type { GridApi } from "@ag-grid-community/core";
  import { navigate } from "svelte-routing";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";

  let searchQuery = $state("");
  let gridApi = $state<GridApi<Literature>>();
  let isAddLiteratureOpen = $state(false);
  let selectedLiterature = $state<Literature | null>(null);

  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#literature-header",
        popover: {
          title: "Manage Your Literature",
          description:
            "This page is your central hub for organizing all the articles, books, and other sources for your project. Keep everything in one place!",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#add-literature-button",
        popover: {
          title: "Add New Sources Easily",
          description:
            "Click here to add new literature items. You can paste formatted references or enter details manually.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#literature-search",
        popover: {
          title: "Find Literature Quickly",
          description:
            "Use this search bar to instantly filter your literature list by title, author, year, or keyword.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#literature-table-card",
        popover: {
          title: "Your Literature Library",
          description:
            "All your added literature appears here. Click column headers to sort, or click a row to view/edit details.",
          side: "top",
          align: "start",
        },
      },
      {
        // Step to trigger opening the modal
        element: "#add-literature-button",
        popover: {
          title: "Adding Literature: Two Ways",
          description:
            "Let's look at how to add literature. Quester can automatically parse pasted references or you can enter details by hand.",
          side: "bottom",
          align: "end",
        },
        onHighlighted: () => {
          // Open the modal when this step is highlighted
          // Add a small delay to ensure highlight animation finishes before modal opens
          setTimeout(() => {
            isAddLiteratureOpen = true;
          }, 100); // 100ms delay
        },
      },
      {
        // Target element *inside* the modal (dialog role)
        element:
          '[role="dialog"] [role="tabpanel"][data-state="active"] textarea',
        popover: {
          title: "Add Via Reference (Pasting)",
          description:
            "Paste one or more references here (like APA, MLA). Quester will try to extract the details automatically. Saves a lot of typing!",
          side: "bottom",
          align: "center",
        },
      },
      {
        // Target the other tab trigger first
        element: '[role="dialog"] [value="manual"]',
        popover: {
          title: "Switch to Manual Entry",
          description:
            "Alternatively, click here to add details field-by-field.",
          side: "bottom",
          align: "center",
        },
      },
      {
        // Target element inside the *manual* tab (the input we added an ID to)
        element:
          '[role="dialog"] [role="tabpanel"][data-state="active"] #manual-entry-name',
        popover: {
          title: "Add Manually",
          description:
            "Fill in the necessary fields like Title, Authors, Year, etc. This gives you full control over the entry.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[role='dialog']",
        popover: {
          title: "Finish Adding",
          description:
            "Once you've added your reference(s), confirm or save them. That's how you build your literature library!",
          side: "top",
          align: "center",
        },
        onDeselected: () => {
          // Close the modal when leaving this step
          isAddLiteratureOpen = false;
        },
      },
      {
        element: ".container", // Target a stable element on the main page
        popover: {
          title: "Ready to Organize?",
          description:
            "Use this page to efficiently manage your literature review. Keep sources organized, track reading status, and easily find what you need.",
          side: "top",
          align: "center",
        },
      },
    ],
  });

  function handleSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    searchQuery = input.value;
    if (gridApi) {
      gridApi.setGridOption("quickFilterText", searchQuery);
    }
  }

  // Load literature data when project changes
  $effect(() => {
    const project = projectStore.currentProject;
    if (!project?.id) {
      console.warn("No project available");
      return;
    }

    literatureStore.loadLiterature(project.id).catch((err) => {
      console.error("Failed to load literature:", err);
    });
  });

  // Clear literature data when component is destroyed
  onDestroy(() => {
    literatureStore.clearLiterature();
  });

  function handleAddLiterature() {
    isAddLiteratureOpen = true;
  }

  function handleLiteratureSelect(event: CustomEvent<Literature>) {
    selectedLiterature = event.detail;
    const literatureId = event.detail.id;
    const projectId = projectStore.currentProject?.id;
    if (projectId && literatureId) {
      navigate(`/project/${projectId}/literature/${literatureId}`);
    }
  }

  function handleGridReady(event: CustomEvent<{ api: GridApi<Literature> }>) {
    gridApi = event.detail.api;
  }
</script>

<div class="flex-1 w-full">
  <div class="container mx-auto py-6 px-4">
    <div class="mb-8">
      <div class="flex items-center justify-between" id="literature-header">
        <h1 class="text-3xl font-bold">Literature</h1>
        <div class="flex items-center space-x-2">
          <Button
            onclick={handleAddLiterature}
            id="add-literature-button"
            class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
          >
            <Plus class="h-4 w-4 mr-2" />
            Add Literature
          </Button>
          <Button
            variant="outline"
            size="icon"
            onclick={() => driverObj.drive()}
          >
            <GraduationCap class="h-4 w-4" />
            <span class="sr-only">Learn about Literature Management</span>
          </Button>
        </div>
      </div>
      <p class="text-muted-foreground mt-2">
        Manage and organize your project literature
      </p>
    </div>

    <Card.Root
      class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <Card.Content class="space-y-6">
        <div class="flex flex-col space-y-4">
          <div class="flex items-center space-x-2">
            <input
              id="literature-search"
              type="text"
              placeholder="Search literature..."
              value={searchQuery}
              oninput={handleSearch}
              class="flex h-10 w-full md:w-[350px] rounded-md border dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <!-- {#if import.meta.env.DEV}
        <pre
          class="text-xs text-muted-foreground">Debug: projectId = {projectStore
            .currentProject
            ?.id}, isLoading = {literatureStore.isLoading}, hasError = {!!literatureStore.error}, searchQuery = {searchQuery}, rowCount = {gridApi?.getDisplayedRowCount() ??
            0}</pre>
      {/if} -->

          {#if literatureStore.isLoading}
            <div class="flex justify-center items-center h-[400px]">
              <p class="text-lg text-muted-foreground">Loading literature...</p>
            </div>
          {:else if literatureStore.error}
            <div class="flex justify-center items-center h-[400px]">
              <p class="text-lg text-destructive">{literatureStore.error}</p>
            </div>
          {:else if !literatureStore.data?.length}
            <div class="flex justify-center items-center h-[400px]">
              <p class="text-lg text-muted-foreground">
                No literature added yet
              </p>
            </div>
          {:else}
            <div
              class="border dark:border-dark-border rounded-lg overflow-hidden"
            >
              <LiteratureTable
                data={literatureStore.data}
                on:literatureSelect={handleLiteratureSelect}
                on:gridReady={handleGridReady}
              />
            </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>

<AddLiterature
  isOpen={isAddLiteratureOpen}
  onOpenChange={(open: boolean) => (isAddLiteratureOpen = open)}
  projectId={projectStore.currentProject?.id}
/>

<style>
  :global(.ag-theme-alpine) {
    --ag-alpine-active-color: var(--primary);
    --ag-selected-row-background-color: var(--muted);
    --ag-row-hover-color: var(--muted);
    --ag-header-background-color: var(--muted);
    --ag-border-color: var(--border);
    --ag-header-foreground-color: var(--foreground);
    --ag-background-color: var(--background);
    --ag-foreground-color: var(--foreground);
    --ag-header-column-separator-display: none;
    --ag-header-column-resize-handle-display: none;
  }
</style>

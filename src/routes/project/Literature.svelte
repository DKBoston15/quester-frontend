<!-- src/routes/project/Literature.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import LiteratureTable from "$lib/components/custom-ui/literature/LiteratureTable.svelte";
  import AddLiterature from "$lib/components/custom-ui/literature/AddLiterature.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Plus } from "lucide-svelte";
  import type { Literature } from "$lib/types/literature";
  import type { GridApi } from "@ag-grid-community/core";

  let searchQuery = $state("");
  let gridApi: GridApi<Literature>;
  let isAddLiteratureOpen = $state(false);

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

  function handleLiteratureSelect(event: Event) {
    const customEvent = event as CustomEvent<Literature>;
    const literature = customEvent.detail;
  }

  function handleGridReady(event: CustomEvent<{ api: GridApi<Literature> }>) {
    gridApi = event.detail.api;
  }
</script>

<div class="flex-1 w-full">
  <div class="w-full py-6 px-4">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold mb-6 ml-1">Literature</h1>
      <Button
        variant="outline"
        size="sm"
        onclick={() => {
          handleAddLiterature();
        }}
      >
        <Plus class="h-4 w-4 mr-2" />
        Add Literature
      </Button>
    </div>
    <Card.Root
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <Card.Content class="space-y-6">
        <div class="flex flex-col space-y-4">
          <div class="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search literature..."
              value={searchQuery}
              oninput={handleSearch}
              class="flex h-10 w-full md:w-[350px] rounded-md border border-black dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              class="border border-black dark:border-dark-border rounded-lg overflow-hidden"
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

<!-- src/lib/components/custom-ui/project/NextBestActions.svelte -->
<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
  } from "$lib/components/ui/select";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { navigate } from "svelte-routing";
  import { createEventDispatcher } from "svelte";
  import {
    AlertCircle,
    CheckCircle2,
    Filter,
    ChevronRight,
  } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import type { Literature } from "$lib/types/literature";

  const dispatch = createEventDispatcher<{
    literatureSelect: Literature;
  }>();

  interface LiteratureInsight {
    field: keyof Literature;
    severity: "error" | "warning";
    message: string;
    description: string;
  }

  interface RankedLiterature {
    literature: Literature;
    missingFields: LiteratureInsight[];
    score: number;
    errorCount: number;
    warningCount: number;
  }

  let nextActions = $state<RankedLiterature[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let filteredActions = $state<RankedLiterature[]>([]);
  let activeTab = $state("needs-attention");

  // Recent literature state
  let recentLiterature = $state<Literature[]>([]);

  // Filter states
  let statusFilter = $state<string>("all");
  let severityFilter = $state<string>("all");

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Note Taking", label: "Note Taking" },
    { value: "Reading", label: "Reading" },
    { value: "Not Started", label: "Not Started" },
  ];

  const severityOptions = [
    { value: "all", label: "All Severities" },
    { value: "error", label: "Errors Only" },
    { value: "warning", label: "Warnings Only" },
  ];

  async function fetchNextActions() {
    if (!projectStore.currentProject?.id) return;

    isLoading = true;
    error = null;

    try {
      const response = await fetch(
        `http://localhost:3333/projects/${projectStore.currentProject.id}/next-actions`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch next actions");
      }

      nextActions = await response.json();
    } catch (err) {
      console.error("Error fetching next actions:", err);
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isLoading = false;
    }
  }

  function updateRecentLiterature() {
    // Get literature from store and filter out completed/archived items
    const allLiterature = literatureStore.data.filter(
      (lit) => !["Completed", "Archived"].includes(lit.status)
    );

    // Sort by updatedAt and take top 3
    recentLiterature = allLiterature
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 3);
  }

  function filterActions(actions: RankedLiterature[]): RankedLiterature[] {
    return actions.filter((action) => {
      // Status filter
      const statusMatch =
        statusFilter === "all" || action.literature.status === statusFilter;

      // Severity filter
      const severityMatch =
        severityFilter === "all" ||
        (severityFilter === "error" && action.errorCount > 0) ||
        (severityFilter === "warning" && action.warningCount > 0);

      return statusMatch && severityMatch;
    });
  }

  function getSeverityColor(severity: "error" | "warning"): string {
    return severity === "error"
      ? "text-red-500 dark:text-red-400"
      : "text-yellow-500 dark:text-yellow-400";
  }

  function getSeverityBgColor(severity: "error" | "warning"): string {
    return severity === "error"
      ? "bg-red-100 dark:bg-red-900/20"
      : "bg-yellow-100 dark:bg-yellow-900/20";
  }

  function handleLiteratureClick(literature: Literature) {
    if (!projectStore.currentProject?.id) return;
    navigate(
      `/project/${projectStore.currentProject.id}/literature/${literature.id}`
    );
    dispatch("literatureSelect", literature);
  }

  function handleButtonClick(e: Event, literature: Literature) {
    e.stopPropagation();
    handleLiteratureClick(literature);
  }

  // Watch for project changes
  $effect(() => {
    if (projectStore.currentProject) {
      fetchNextActions();
    }
  });

  // Watch for literature store changes
  $effect(() => {
    updateRecentLiterature();
  });

  // Update filtered actions whenever filters or nextActions change
  $effect(() => {
    filteredActions = filterActions(nextActions);
  });
</script>

<Card.Root
  class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] min-w-0"
>
  <Card.Header class="space-y-1.5 p-4 sm:p-6">
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <Card.Title class="text-xl sm:text-2xl truncate py-2">
        {activeTab === "needs-attention" ? "Up Next" : "Recent Updates"}
      </Card.Title>
      {#if activeTab === "needs-attention"}
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <Popover.Root>
            <Popover.Trigger class="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                class="gap-2 w-full sm:w-auto"
              >
                <Filter class="h-4 w-4 flex-shrink-0" />
                <span class="truncate">Filter</span>
              </Button>
            </Popover.Trigger>
            <Popover.Content
              class="w-[calc(100vw-2rem)] sm:w-80 max-w-[calc(100vw-2rem)]"
            >
              <Card.Header>
                <Card.Title class="truncate">Filter Actions</Card.Title>
                <Card.Description class="truncate">
                  Filter literature by status and severity
                </Card.Description>
              </Card.Header>
              <Card.Content class="space-y-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Status</label>
                  <Select
                    type="single"
                    value={statusFilter}
                    onValueChange={(value: string) => {
                      statusFilter = value;
                    }}
                  >
                    <SelectTrigger class="w-full">
                      <span class="truncate">
                        {statusOptions.find((opt) => opt.value === statusFilter)
                          ?.label}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {#each statusOptions as option}
                        <SelectItem value={option.value}>
                          <span class="truncate">{option.label}</span>
                        </SelectItem>
                      {/each}
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Severity</label>
                  <Select
                    type="single"
                    value={severityFilter}
                    onValueChange={(value: string) => {
                      severityFilter = value;
                    }}
                  >
                    <SelectTrigger class="w-full">
                      <span class="truncate">
                        {severityOptions.find(
                          (opt) => opt.value === severityFilter
                        )?.label}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {#each severityOptions as option}
                        <SelectItem value={option.value}>
                          <span class="truncate">{option.label}</span>
                        </SelectItem>
                      {/each}
                    </SelectContent>
                  </Select>
                </div>
              </Card.Content>
            </Popover.Content>
          </Popover.Root>
        </div>
      {/if}
    </div>
  </Card.Header>

  <Tabs.Root value={activeTab} onValueChange={(value) => (activeTab = value)}>
    <Tabs.List
      class="grid grid-cols-2 mx-8 border dark:bg-background border-black dark:border-dark-border rounded-lg overflow-hidden"
    >
      <Tabs.Trigger
        value="needs-attention"
        class="capitalize px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-dark-border data-[state=active]:font-medium"
      >
        Needs Attention
      </Tabs.Trigger>
      <Tabs.Trigger
        value="recent"
        class="capitalize px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-dark-border data-[state=active]:font-medium"
      >
        Recently Updated
      </Tabs.Trigger>
    </Tabs.List>

    <Card.Content class="p-4 sm:p-6 pt-4 min-h-[400px]">
      <Tabs.Content value="needs-attention">
        {#if isLoading}
          <div class="flex items-center justify-center py-8">
            <div
              class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
            />
          </div>
        {:else if error}
          <div
            class="flex items-center gap-2 text-red-500 dark:text-red-400 p-4 rounded-lg bg-red-100 dark:bg-red-900/20"
          >
            <AlertCircle class="h-5 w-5 flex-shrink-0" />
            <p class="break-words">{error}</p>
          </div>
        {:else if nextActions.length === 0}
          <div
            class="text-center py-8"
            transition:slide={{ duration: 300, easing: quintOut }}
          >
            <CheckCircle2 class="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p class="text-lg">All caught up!</p>
            <p class="text-sm text-muted-foreground mt-2 break-words">
              No literature needs attention right now.
            </p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each filteredActions as action (action.literature.id)}
              <div
                class="group border-2 border-black dark:border-dark-border p-3 sm:p-4 rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] transition-all duration-300 cursor-pointer min-w-0"
                transition:slide={{ duration: 300 }}
                on:click={() => handleLiteratureClick(action.literature)}
              >
                <div
                  class="flex flex-col sm:flex-row items-start gap-4 min-w-0"
                >
                  <div class="flex-grow space-y-2 w-full min-w-0">
                    <div class="flex flex-col gap-2 min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="font-bold text-lg truncate">
                          {action.literature.name || "Untitled Literature"}
                        </h3>
                        {#if action.errorCount > 0}
                          <span
                            class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 whitespace-nowrap"
                          >
                            {action.errorCount}
                            {action.errorCount === 1 ? "Error" : "Errors"}
                          </span>
                        {/if}
                        {#if action.warningCount > 0}
                          <span
                            class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 whitespace-nowrap"
                          >
                            {action.warningCount}
                            {action.warningCount === 1 ? "Warning" : "Warnings"}
                          </span>
                        {/if}
                      </div>
                      <div class="space-y-1">
                        {#each action.missingFields as field}
                          <div class="flex items-center gap-2 text-sm min-w-0">
                            <AlertCircle
                              class="h-4 w-4 flex-shrink-0 {getSeverityColor(
                                field.severity
                              )}"
                            />
                            <span class="truncate">{field.message}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto flex-shrink-0 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-300"
                    on:click={(e) => handleButtonClick(e, action.literature)}
                  >
                    <span class="truncate">View Details</span>
                    <ChevronRight class="h-4 w-4 ml-2 flex-shrink-0" />
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="recent">
        {#if recentLiterature.length === 0}
          <div
            class="text-center py-8"
            transition:slide={{ duration: 300, easing: quintOut }}
          >
            <p class="text-lg">No Recent Updates</p>
            <p class="text-sm text-muted-foreground mt-2 break-words">
              No literature has been updated recently.
            </p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each recentLiterature as literature (literature.id)}
              <div
                class="group border-2 border-black dark:border-dark-border p-3 sm:p-4 rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] transition-all duration-300 cursor-pointer min-w-0"
                transition:slide={{ duration: 300 }}
                on:click={() => handleLiteratureClick(literature)}
              >
                <div
                  class="flex flex-col sm:flex-row items-start gap-4 min-w-0"
                >
                  <div class="flex-grow space-y-2 w-full min-w-0">
                    <div class="flex flex-col gap-2 min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="font-bold text-lg truncate">
                          {literature.name || "Untitled Literature"}
                        </h3>
                        <span
                          class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 whitespace-nowrap"
                        >
                          {literature.status}
                        </span>
                      </div>
                      <div class="text-sm text-muted-foreground">
                        Last updated {new Date(
                          literature.updatedAt
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto flex-shrink-0 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-300"
                    on:click={(e) => handleButtonClick(e, literature)}
                  >
                    <span class="truncate">View Details</span>
                    <ChevronRight class="h-4 w-4 ml-2 flex-shrink-0" />
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Tabs.Content>
    </Card.Content>
  </Tabs.Root>
</Card.Root>

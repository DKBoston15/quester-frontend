<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Badge } from "$lib/components/ui/badge";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Switch } from "$lib/components/ui/switch";
  import { navigate } from "svelte-routing";
  import { _ } from "svelte-i18n";

  // Icons
  import Search from "lucide-svelte/icons/search";
  import CommandIcon from "lucide-svelte/icons/command";
  import Loader from "lucide-svelte/icons/loader";
  import FileText from "lucide-svelte/icons/file-text";
  import BookOpen from "lucide-svelte/icons/book-open";
  import Folder from "lucide-svelte/icons/folder";
  import Target from "lucide-svelte/icons/target";
  import Clock from "lucide-svelte/icons/clock";
  import Globe from "lucide-svelte/icons/globe";
  import Network from "lucide-svelte/icons/network";
  import BarChart from "lucide-svelte/icons/bar-chart";

  // Reactive bindings to store state
  let isOpen = $derived(globalSearchStore.isOpen);
  let searchScope = $derived(globalSearchStore.scope);
  let query = $derived(globalSearchStore.query);
  let isLoading = $derived(globalSearchStore.isLoading);
  let error = $derived(globalSearchStore.error);
  let searchResults = $derived(globalSearchStore.results);
  let recentSearches = $derived(globalSearchStore.recentSearches);

  // Create derived searchMetadata from results
  let searchMetadata = $derived({
    total_results: searchResults.length,
    search_time: 0, // This would come from the API response
  });

  // Local state for UI
  let searchInputRef: HTMLInputElement | null = null;
  let debounceTimer: NodeJS.Timeout | null = null;

  // Keyboard shortcut handling
  function handleKeydown(event: KeyboardEvent) {
    // Global Cmd+K / Ctrl+K shortcut
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      globalSearchStore.open();
    }

    // Escape key to close
    if (event.key === "Escape" && isOpen) {
      globalSearchStore.close();
    }
  }

  // Mount and unmount keyboard listeners
  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", handleKeydown);
    // Clean up debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  // Focus input when dialog opens
  $effect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchInputRef) {
          searchInputRef.focus();
        }
      }, 100);
    }
  });

  // Handle search input changes
  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const newQuery = target.value;

    // Clear previous timer to avoid duplicate searches
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Update query immediately for UI responsiveness
    // The store already handles debouncing and clearing results for short queries
    globalSearchStore.setQuery(newQuery);
  }

  // Handle search submission
  function handleSearchSubmit() {
    if (query.trim()) {
      globalSearchStore.performSearch();
    }
  }

  // Handle recent search selection
  function selectRecentSearch(searchQuery: string) {
    globalSearchStore.setQuery(searchQuery);
  }

  // Handle scope toggle
  function handleScopeToggle() {
    const newScope = searchScope === "current" ? "all" : "current";
    globalSearchStore.setScope(newScope);
  }

  // Get icon for result type
  function getResultIcon(type: string) {
    switch (type) {
      case "note":
        return FileText;
      case "literature":
        return BookOpen;
      case "project":
        return Folder;
      case "outcome":
        return Target;
      case "model":
        return Network;
      case "keyword_analysis":
        return BarChart;
      default:
        return FileText;
    }
  }

  // Format date
  function formatDate(dateString: string | undefined) {
    if (!dateString) return "No date";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "No date";
      }
      return date.toLocaleDateString();
    } catch {
      return "No date";
    }
  }

  // Get placeholder text for search mode
  const placeholderText =
    "Search across all your projects, notes, and literature...";

  // Handle search result navigation
  function handleResultClick(result: any) {
    // Extract project ID based on result type and available fields
    let projectId;

    if (result.type === "project") {
      // For project results, use the result ID as the project ID
      projectId = result.id;
    } else {
      // For other content types, try multiple possible locations for project ID
      projectId =
        result.projectId ||
        result.content?.projectId ||
        result.content?.project_id ||
        result.metadata?.project_id ||
        result.project_id;
    }

    if (!projectId) {
      console.warn("No project ID found for result:", $state.snapshot(result));
      return;
    }

    let path = "";

  switch (result.type) {
      case "literature":
        path = `/project/${projectId}/literature/${result.id}`;
        break;
      case "note":
        // Notes don't have detail views, navigate to notes list
        path = `/project/${projectId}/notes`;
        break;
      case "project":
        path = `/project/${projectId}`;
        break;
      case "outcome":
        path = `/project/${projectId}/outcomes/${result.id}`;
        break;
      case "model":
        path = `/project/${projectId}/models/${result.id}`;
        break;
      case "document_chunk":
        if (result.metadata?.literature_id) {
          const qp = new URLSearchParams();
          if (result.metadata?.start_page) qp.set('p', String(result.metadata.start_page));
          path = `/project/${projectId}/literature/${result.metadata.literature_id}?${qp.toString()}`;
        } else {
          path = `/project/${projectId}/literature`;
        }
        break;
      case "keyword_analysis":
        // Navigate to insights page - keyword analyses don't have individual detail views
        path = `/project/${projectId}/insights`;
        break;
      default:
        console.warn("Unknown result type:", result.type);
        return;
    }

    // Close the search dialog and navigate
    globalSearchStore.close();
    navigate(path);
  }
</script>

<!-- Dialog -->
<Dialog.Root
  open={isOpen}
  onOpenChange={(open) => {
    if (!open) globalSearchStore.close();
  }}
>
  <Dialog.Content class="max-w-7xl p-0">
    <div class="flex flex-col max-h-[90vh]">
      <!-- Header with mode toggle -->
      <div class="border-b p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">{$_("globalSearchDialog.search")}</h2>
        </div>

        <!-- Scope Toggle -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <Globe class="size-4 text-muted-foreground" />
            <span class="text-sm font-medium">{$_('globalSearch.searchScope')}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">{$_('globalSearch.currentProject')}</span>
            <Switch
              pressed={searchScope === "all"}
              onPressedChange={handleScopeToggle}
              class="data-[state=checked]:bg-primary"
            />
            <span class="text-xs text-muted-foreground">{$_('globalSearch.allProjects')}</span>
          </div>
        </div>

        <!-- Search Input -->
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            bind:this={searchInputRef}
            type="text"
            placeholder={placeholderText}
            value={query}
            oninput={handleSearchInput}
            onkeydown={(e) => e.key === "Enter" && handleSearchSubmit()}
            class="w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          {#if isLoading}
            <Loader
              class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          {/if}
        </div>

        <!-- Error Display -->
        {#if error}
          <div class="mt-2 text-sm text-destructive">
            {error}
          </div>
        {/if}
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-hidden">
        <!-- Search Results -->
        <div class="h-[75vh] overflow-hidden">
          <ScrollArea class="h-full">
            <div class="p-4">
              {#if query.trim() === ""}
                <!-- Recent Searches -->
                {#if recentSearches.length > 0}
                  <div class="space-y-2">
                    <h3 class="text-sm font-medium text-muted-foreground">
                      Recent Searches
                    </h3>
                    {#each recentSearches.slice(0, 5) as recentSearch}
                      <button
                        class="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm hover:bg-muted"
                        onclick={() => selectRecentSearch(recentSearch)}
                      >
                        <Clock class="size-4 text-muted-foreground" />
                        <span class="flex-1">{recentSearch}</span>
                      </button>
                    {/each}
                  </div>
                {:else}
                  <!-- Empty State for Search -->
                  <div class="text-center py-8">
                    <Search
                      class="size-12 mx-auto text-muted-foreground/50 mb-4"
                    />
                    <h3 class="font-medium mb-2">{$_('globalSearchDialog.searchYourResearch')}</h3>
                    <p class="text-sm text-muted-foreground mb-4">
                      {$_('globalSearch.searchDescription')}
                    </p>
                    <div class="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline">{$_('globalSearch.categories.notes')}</Badge>
                      <Badge variant="outline">{$_('globalSearch.categories.literature')}</Badge>
                      <Badge variant="outline">{$_('globalSearch.categories.projects')}</Badge>
                      <Badge variant="outline">{$_('globalSearch.categories.outcomes')}</Badge>
                      <Badge variant="outline">{$_('globalSearch.categories.models')}</Badge>
                      <Badge variant="outline">{$_('globalSearch.categories.keywordAnalyses')}</Badge>
                    </div>
                  </div>
                {/if}
              {:else if isLoading}
                <!-- Loading State -->
                <div class="text-center py-8">
                  <Loader
                    class="size-8 mx-auto animate-spin text-muted-foreground mb-4"
                  />
                  <p class="text-sm text-muted-foreground">{$_('globalSearchDialog.searching')}</p>
                </div>
              {:else if searchResults.length === 0}
                <!-- No Results -->
                <div class="text-center py-8">
                  <Search
                    class="size-12 mx-auto text-muted-foreground/50 mb-4"
                  />
                  <h3 class="font-medium mb-2">{$_("globalSearchDialog.noResultsFound")}</h3>
                  <p class="text-sm text-muted-foreground">
                    Try adjusting your search terms or check your spelling
                  </p>
                </div>
              {:else}
                <!-- Search Results -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm font-medium">
                        {$_('globalSearch.resultsFound', { values: { count: searchMetadata.total_results } })}
                      </h3>
                      <Badge variant="secondary" class="text-xs">
                        {searchScope === "current"
                          ? $_('globalSearch.currentProject')
                          : $_('globalSearch.allProjects')}
                      </Badge>
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {searchMetadata.search_time}ms
                    </div>
                  </div>

                  {#each searchResults as result}
                    {@const Icon = getResultIcon(result.type)}
                    <div
                      class="rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                      onclick={() => handleResultClick(result)}
                    >
                      <div class="flex items-start gap-3">
                        <Icon class="size-4 mt-0.5 text-muted-foreground" />
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-medium text-sm truncate">
                              {result.title}
                            </h4>
                            <Badge variant="outline" class="text-xs capitalize">
                              {result.type}
                            </Badge>
                            {#if searchScope === "all" && result.projectInfo}
                              <Badge
                                variant="secondary"
                                class="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                              >
                                {result.projectInfo.name}
                              </Badge>
                            {/if}
                          </div>
                          <p
                            class="text-sm text-muted-foreground mb-2 line-clamp-2"
                          >
                            {result.snippet}
                          </p>
                          <div
                            class="flex items-center gap-4 text-xs text-muted-foreground"
                          >
                            <span
                              >Updated {formatDate(
                                result.content?.updated_at ||
                                  result.content?.createdAt ||
                                  result.metadata?.updated_at ||
                                  result.metadata?.created_at
                              )}</span
                            >
                            {#if result.similarity}
                              <span
                                >Relevance: {Math.round(
                                  result.similarity * 100
                                )}%</span
                              >
                            {/if}
                          </div>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </ScrollArea>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t px-4 py-3">
        <div
          class="flex items-center justify-between text-xs text-muted-foreground"
        >
          <div class="flex items-center gap-4">
            <kbd
              class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono"
            >
              <CommandIcon class="size-3" />
              K
            </kbd>
            <span>to search</span>
            <kbd
              class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono"
            >
              Esc
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

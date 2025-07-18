<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Command from "$lib/components/ui/command";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Switch } from "$lib/components/ui/switch";
  import { cn } from "$lib/utils";
  import { AIChat } from "$lib/components/global-search";
  import { navigate } from "svelte-routing";
  
  // Icons
  import Search from "lucide-svelte/icons/search";
  import MessageSquare from "lucide-svelte/icons/message-square";
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
  let searchMode = $derived(globalSearchStore.mode);
  let searchScope = $derived(globalSearchStore.scope);
  let query = $derived(globalSearchStore.query);
  let isLoading = $derived(globalSearchStore.isLoading);
  let error = $derived(globalSearchStore.error);
  let searchResults = $derived(globalSearchStore.results);
  let recentSearches = $derived(globalSearchStore.recentSearches);
  let hasResults = $derived(globalSearchStore.hasResults);

  // Create derived searchMetadata from results
  let searchMetadata = $derived({
    total_results: searchResults.length,
    search_time: 0 // This would come from the API response
  });

  // Local state for UI
  let searchInputRef: HTMLInputElement | null = null;

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
  });

  // Focus input when dialog opens
  $effect(() => {
    if (isOpen && searchMode === "search") {
      setTimeout(() => {
        if (searchInputRef) {
          searchInputRef.focus();
        }
      }, 100);
    }
  });

  // Handle mode switching
  function switchMode(mode: "search" | "chat") {
    globalSearchStore.setMode(mode);
  }

  // Handle search input changes
  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    globalSearchStore.setQuery(target.value);
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
    const newScope = searchScope === 'current' ? 'all' : 'current';
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
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'No date';
      }
      return date.toLocaleDateString();
    } catch {
      return 'No date';
    }
  }

  // Get placeholder text for search mode
  const placeholderText = "Search across all your projects, notes, and literature...";

  // Handle search result navigation
  function handleResultClick(result: any) {
    // Extract project ID based on result type and available fields
    let projectId;
    
    if (result.type === 'project') {
      // For project results, use the result ID as the project ID
      projectId = result.id;
    } else {
      // For other content types, try multiple possible locations for project ID
      projectId = result.projectId || 
                  result.content?.projectId || 
                  result.content?.project_id || 
                  result.metadata?.project_id ||
                  result.project_id;
    }
    
    if (!projectId) {
      console.warn('No project ID found for result:', $state.snapshot(result));
      return;
    }

    let path = '';
    
    switch (result.type) {
      case 'literature':
        path = `/project/${projectId}/literature/${result.id}`;
        break;
      case 'note':
        // Notes don't have detail views, navigate to notes list
        path = `/project/${projectId}/notes`;
        break;
      case 'project':
        path = `/project/${projectId}`;
        break;
      case 'outcome':
        path = `/project/${projectId}/outcomes/${result.id}`;
        break;
      case 'model':
        path = `/project/${projectId}/models/${result.id}`;
        break;
      case 'keyword_analysis':
        // Navigate to insights page - keyword analyses don't have individual detail views
        path = `/project/${projectId}/insights`;
        break;
      default:
        console.warn('Unknown result type:', result.type);
        return;
    }
    
    // Close the search dialog and navigate
    globalSearchStore.close();
    navigate(path);
  }
</script>

<!-- Global Search Button Trigger -->
<Button
  variant="outline"
  size="sm"
  class="fixed top-4 right-4 z-40 gap-2 bg-background/80 backdrop-blur-sm"
  onclick={() => globalSearchStore.open()}
>
  <Search class="size-4" />
  <span class="hidden sm:inline">Search</span>
  <kbd class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
    <CommandIcon class="size-3" />
    K
  </kbd>
</Button>

<!-- Dialog -->
<Dialog.Root open={isOpen} onOpenChange={(open) => {
  if (!open) globalSearchStore.close();
}}>
  <Dialog.Content class="max-w-7xl p-0">
    <div class="flex flex-col max-h-[90vh]">
      <!-- Header with mode toggle -->
      <div class="border-b p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">Global Search</h2>
          <div class="flex gap-1 rounded-lg bg-muted p-1">
            <Button
              variant={searchMode === "search" ? "default" : "ghost"}
              size="sm"
              class="h-8 px-3 text-xs"
              onclick={() => switchMode("search")}
            >
              <Search class="size-3 mr-1" />
              Search
            </Button>
            <Button
              variant={searchMode === "chat" ? "default" : "ghost"}
              size="sm"
              class="h-8 px-3 text-xs"
              onclick={() => switchMode("chat")}
            >
              <MessageSquare class="size-3 mr-1" />
              Ask AI
            </Button>
          </div>
        </div>

        <!-- Scope Toggle -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <Globe class="size-4 text-muted-foreground" />
            <span class="text-sm font-medium">Search Scope</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">Current Project</span>
            <Switch
              pressed={searchScope === 'all'}
              onPressedChange={handleScopeToggle}
              class="data-[state=checked]:bg-primary"
            />
            <span class="text-xs text-muted-foreground">All Projects</span>
          </div>
        </div>

        <!-- Search Input for Search Mode -->
        {#if searchMode === "search"}
          <div class="relative">
            <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
              <Loader class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            {/if}
          </div>
        {/if}


        <!-- Error Display -->
        {#if error}
          <div class="mt-2 text-sm text-destructive">
            {error}
          </div>
        {/if}
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-hidden">
        {#if searchMode === "search"}
          <!-- Search Results -->
          <div class="h-[75vh] overflow-hidden">
            <ScrollArea class="h-full">
              <div class="p-4">
              {#if query.trim() === ""}
                <!-- Recent Searches -->
                {#if recentSearches.length > 0}
                  <div class="space-y-2">
                    <h3 class="text-sm font-medium text-muted-foreground">Recent Searches</h3>
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
                    <Search class="size-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 class="font-medium mb-2">Search your research</h3>
                    <p class="text-sm text-muted-foreground mb-4">
                      Find notes, literature, projects, outcomes, models, and keyword analyses across your entire workspace
                    </p>
                    <div class="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline">Notes</Badge>
                      <Badge variant="outline">Literature</Badge>
                      <Badge variant="outline">Projects</Badge>
                      <Badge variant="outline">Outcomes</Badge>
                      <Badge variant="outline">Models</Badge>
                      <Badge variant="outline">Keyword Analyses</Badge>
                    </div>
                  </div>
                {/if}
              {:else if isLoading}
                <!-- Loading State -->
                <div class="text-center py-8">
                  <Loader class="size-8 mx-auto animate-spin text-muted-foreground mb-4" />
                  <p class="text-sm text-muted-foreground">Searching...</p>
                </div>
              {:else if searchResults.length === 0}
                <!-- No Results -->
                <div class="text-center py-8">
                  <Search class="size-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 class="font-medium mb-2">No results found</h3>
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
                        {searchMetadata.total_results} results found
                      </h3>
                      <Badge variant="secondary" class="text-xs">
                        {searchScope === 'current' ? 'Current Project' : 'All Projects'}
                      </Badge>
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {searchMetadata.search_time}ms
                    </div>
                  </div>
                  
                  {#each searchResults as result}
                    {@const Icon = getResultIcon(result.type)}
                    <div class="rounded-md border p-3 hover:bg-muted/50 cursor-pointer" onclick={() => handleResultClick(result)}>
                      <div class="flex items-start gap-3">
                        <Icon class="size-4 mt-0.5 text-muted-foreground" />
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-medium text-sm truncate">{result.title}</h4>
                            <Badge variant="outline" class="text-xs capitalize">
                              {result.type}
                            </Badge>
                          </div>
                          <p class="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {result.snippet}
                          </p>
                          <div class="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Updated {formatDate(result.content?.updated_at || result.content?.createdAt || result.metadata?.updated_at || result.metadata?.created_at)}</span>
                            {#if result.similarity}
                              <span>Relevance: {Math.round(result.similarity * 100)}%</span>
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
        {:else}
          <!-- AI Chat Interface -->
          <div class="h-[75vh] overflow-hidden">
            <AIChat />
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t px-4 py-3">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <div class="flex items-center gap-4">
            <kbd class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono">
              <CommandIcon class="size-3" />
              K
            </kbd>
            <span>to search</span>
            <kbd class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
            <span>to close</span>
          </div>
          {#if searchMode === "chat"}
            <div class="flex items-center gap-2">
              <kbd class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono">
                Enter
              </kbd>
              <span>to send</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
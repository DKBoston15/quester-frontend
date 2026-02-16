<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore";
  import type { SearchResult } from "$lib/stores/GlobalSearchStore";
  import * as Command from "$lib/components/ui/command";
  import { Badge } from "$lib/components/ui/badge";
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
  import LayoutDashboard from "lucide-svelte/icons/layout-dashboard";
  import Settings from "lucide-svelte/icons/settings";
  import Users from "lucide-svelte/icons/users";
  import Home from "lucide-svelte/icons/home";
  import Library from "lucide-svelte/icons/library";
  import Pencil from "lucide-svelte/icons/pencil";
  import Microscope from "lucide-svelte/icons/microscope";
  import ChartNetwork from "lucide-svelte/icons/chart-network";
  import TextSearch from "lucide-svelte/icons/text-search";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import MessageCircle from "lucide-svelte/icons/message-circle";
  import Send from "lucide-svelte/icons/send";

  // Reactive bindings to store state
  let isOpen = $derived(globalSearchStore.isOpen);
  let searchScope = $derived(globalSearchStore.scope);
  let searchQuery = $derived(globalSearchStore.query);
  let isLoading = $derived(globalSearchStore.isLoading);
  let isAutocompleting = $derived(globalSearchStore.isAutocompleting);
  let error = $derived(globalSearchStore.error);
  let searchResults = $derived(globalSearchStore.results);
  let autocompleteResults = $derived(globalSearchStore.autocompleteResults);
  let recentSearches = $derived(globalSearchStore.recentSearches);
  let paletteMode = $derived(globalSearchStore.paletteMode);
  let projectContext = $derived(globalSearchStore.projectContext);
  let isStreaming = $derived(globalSearchStore.isStreaming);
  let chatMessages = $derived(globalSearchStore.chatMessages);

  // Local state
  let inputValue = $state("");
  let chatInput = $state("");
  let hasSubmittedSearch = $state(false);

  // Detect palette mode from input prefix
  let effectiveMode = $derived.by(() => {
    if (inputValue.startsWith(">")) return "actions" as const;
    if (inputValue.startsWith("@") || inputValue.startsWith("?")) return "chat" as const;
    if (inputValue.trim().length > 0) return "search" as const;
    return "default" as const;
  });

  // Stripped query (without prefix)
  let strippedQuery = $derived.by(() => {
    if (inputValue.startsWith(">") || inputValue.startsWith("@") || inputValue.startsWith("?")) {
      return inputValue.slice(1).trim();
    }
    return inputValue.trim();
  });

  // Keyboard shortcut handling
  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      if (isOpen) {
        globalSearchStore.close();
      } else {
        globalSearchStore.open();
      }
    }

    if (event.key === "Escape" && isOpen) {
      globalSearchStore.close();
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", handleKeydown);
  });

  // Reset state when dialog opens
  $effect(() => {
    if (isOpen) {
      inputValue = "";
      hasSubmittedSearch = false;
      globalSearchStore.setPaletteMode("default");
    }
  });

  // Trigger autocomplete as user types (for search mode)
  $effect(() => {
    if (effectiveMode === "search" && strippedQuery.length >= 2) {
      globalSearchStore.performAutocomplete(strippedQuery);
    }
  });

  // Get icon component for result type
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

  // Group autocomplete results by type
  let groupedAutocomplete = $derived.by(() => {
    const groups: Record<string, typeof autocompleteResults> = {};
    for (const result of autocompleteResults) {
      const key = result.type || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
    }
    return groups;
  });

  // Group search results by type
  let groupedSearchResults = $derived.by(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const result of searchResults) {
      const key = result.type || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
    }
    return groups;
  });

  // Type label mapping
  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      literature: "Literature",
      note: "Notes",
      project: "Projects",
      outcome: "Outcomes",
      model: "Models",
      keyword_analysis: "Keyword Analyses",
    };
    return labels[type] || type;
  }

  // Quick actions
  const quickActions = [
    { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: () => navigate("/dashboard") },
    { id: "settings", label: "Go to Settings", icon: Settings, action: () => navigate("/settings") },
    { id: "team", label: "Team Management", icon: Users, action: () => navigate("/team-management") },
  ];

  // Project-specific section routes
  let projectSections = $derived.by(() => {
    if (!projectContext) return [];
    const pid = projectContext.projectId;
    return [
      { id: "overview", label: "Overview", icon: Home, path: `/project/${pid}/overview` },
      { id: "literature", label: "Literature", icon: Library, path: `/project/${pid}/literature` },
      { id: "notes", label: "Notes", icon: Pencil, path: `/project/${pid}/notes` },
      { id: "analyst", label: "Research Analyst", icon: Microscope, path: `/project/${pid}/analyst` },
      { id: "insights", label: "Insights", icon: TextSearch, path: `/project/${pid}/insights` },
      { id: "models", label: "Models", icon: ChartNetwork, path: `/project/${pid}/models` },
      { id: "outcomes", label: "Outcomes", icon: Target, path: `/project/${pid}/outcomes` },
      { id: "analytics", label: "Analytics", icon: BarChart, path: `/project/${pid}/analytics` },
    ];
  });

  // Filtered quick actions (for actions mode)
  let filteredActions = $derived.by(() => {
    if (!strippedQuery) return quickActions;
    const lower = strippedQuery.toLowerCase();
    return quickActions.filter((a) => a.label.toLowerCase().includes(lower));
  });

  // Handle search submission (Enter key)
  function handleSearchSubmit() {
    if (effectiveMode === "chat") {
      handleChatSubmit();
      return;
    }
    if (strippedQuery.trim()) {
      globalSearchStore.setQuery(strippedQuery);
      globalSearchStore.performSearch();
      hasSubmittedSearch = true;
    }
  }

  // Handle chat submission
  function handleChatSubmit() {
    const msg = effectiveMode === "chat" ? strippedQuery : chatInput;
    if (msg.trim()) {
      globalSearchStore.sendChatMessage(msg);
      if (effectiveMode === "chat") {
        inputValue = inputValue.charAt(0); // keep prefix
      } else {
        chatInput = "";
      }
    }
  }

  // Handle recent search selection
  function selectRecentSearch(q: string) {
    inputValue = q;
    globalSearchStore.setQuery(q);
    globalSearchStore.performSearch();
    hasSubmittedSearch = true;
  }

  // Handle scope toggle
  function handleScopeToggle() {
    const newScope = searchScope === "current" ? "all" : "current";
    globalSearchStore.setScope(newScope);
  }

  // Handle result click navigation
  function handleResultClick(result: any) {
    let projectId;

    if (result.type === "project") {
      projectId = result.id;
    } else {
      projectId =
        result.projectId ||
        result.content?.projectId ||
        result.content?.project_id ||
        result.metadata?.project_id ||
        result.project_id;
    }

    if (!projectId) {
      console.warn("No project ID found for result:", result);
      return;
    }

    let path = "";
    switch (result.type) {
      case "literature":
        path = `/project/${projectId}/literature/${result.id}`;
        break;
      case "note":
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
          if (result.metadata?.start_page) qp.set("p", String(result.metadata.start_page));
          path = `/project/${projectId}/literature/${result.metadata.literature_id}?${qp.toString()}`;
        } else {
          path = `/project/${projectId}/literature`;
        }
        break;
      case "keyword_analysis":
        path = `/project/${projectId}/insights`;
        break;
      default:
        console.warn("Unknown result type:", result.type);
        return;
    }

    globalSearchStore.close();
    navigate(path);
  }

  // Handle autocomplete result click
  function handleAutocompleteClick(result: { type: string; id: string; title: string; metadata?: Record<string, unknown> }) {
    // Use the result to navigate, treating it similarly to a search result
    const pid = (result.metadata?.project_id as string) || (result.metadata?.projectId as string) || projectContext?.projectId;
    if (!pid) return;

    let path = "";
    switch (result.type) {
      case "literature":
        path = `/project/${pid}/literature/${result.id}`;
        break;
      case "note":
        path = `/project/${pid}/notes`;
        break;
      case "project":
        path = `/project/${result.id}`;
        break;
      case "outcome":
        path = `/project/${pid}/outcomes/${result.id}`;
        break;
      case "model":
        path = `/project/${pid}/models/${result.id}`;
        break;
      case "keyword_analysis":
        path = `/project/${pid}/insights`;
        break;
      default:
        path = `/project/${pid}`;
    }

    globalSearchStore.close();
    navigate(path);
  }

  // Format date helper
  function formatDate(dateString: string | undefined) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  }
</script>

<Command.Dialog
  open={isOpen}
  onOpenChange={(open) => {
    if (!open) globalSearchStore.close();
  }}
>
  <Command.Input
    placeholder={effectiveMode === "actions"
      ? "Type a command..."
      : effectiveMode === "chat"
        ? "Ask AI a question..."
        : "Search or type > for commands, ? for AI..."}
    bind:value={inputValue}
    onkeydown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchSubmit();
      }
    }}
  />

  <Command.List class="max-h-[400px]">
    {#if effectiveMode === "chat"}
      <!-- AI Chat Mode -->
      <Command.Group heading="AI Chat">
        {#if chatMessages.length > 0}
          {#each chatMessages.slice(-4) as msg}
            <div class="px-3 py-2">
              <div class="flex items-start gap-2">
                <span class="text-xs font-medium text-muted-foreground min-w-[3rem]">
                  {msg.role === "user" ? "You" : "AI"}
                </span>
                <p class="text-sm flex-1 {msg.role === 'assistant' ? 'text-muted-foreground' : ''}">
                  {#if msg.streaming && !msg.content}
                    <span class="italic text-muted-foreground">Thinking...</span>
                  {:else}
                    {msg.content}
                  {/if}
                </p>
              </div>
            </div>
          {/each}
        {:else}
          <div class="px-3 py-4 text-center text-sm text-muted-foreground">
            <MessageCircle class="size-8 mx-auto mb-2 opacity-50" />
            <p>Ask a question about your research</p>
          </div>
        {/if}
        {#if isStreaming}
          <div class="px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader class="size-3 animate-spin" />
            <span>AI is responding...</span>
          </div>
        {/if}
      </Command.Group>

    {:else if effectiveMode === "actions"}
      <!-- Actions Mode -->
      <Command.Group heading="Quick Actions">
        {#each filteredActions as action}
          <Command.Item
            value={action.label}
            onSelect={() => {
              action.action();
              globalSearchStore.close();
            }}
          >
            <action.icon class="size-4 mr-2 text-muted-foreground" />
            <span>{action.label}</span>
          </Command.Item>
        {/each}
      </Command.Group>

      {#if projectSections.length > 0}
        <Command.Separator />
        <Command.Group heading="Go to Section ({projectContext?.projectName})">
          {#each projectSections as section}
            <Command.Item
              value={section.label}
              onSelect={() => {
                navigate(section.path);
                globalSearchStore.close();
              }}
            >
              <section.icon class="size-4 mr-2 text-muted-foreground" />
              <span>{section.label}</span>
            </Command.Item>
          {/each}
        </Command.Group>
      {/if}

      {#if filteredActions.length === 0 && projectSections.length === 0}
        <Command.Empty>No commands found.</Command.Empty>
      {/if}

    {:else if effectiveMode === "search" && hasSubmittedSearch}
      <!-- Full Search Results -->
      {#if isLoading}
        <div class="py-6 text-center">
          <Loader class="size-6 mx-auto animate-spin text-muted-foreground mb-2" />
          <p class="text-sm text-muted-foreground">Searching...</p>
        </div>
      {:else if searchResults.length === 0}
        <Command.Empty>No results found for "{strippedQuery}"</Command.Empty>
      {:else}
        {#each Object.entries(groupedSearchResults) as [type, results]}
          <Command.Group heading={getTypeLabel(type)}>
            {#each results as result}
              {@const Icon = getResultIcon(result.type)}
              <Command.Item
                value={result.title}
                onSelect={() => handleResultClick(result)}
              >
                <Icon class="size-4 mr-2 text-muted-foreground flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="truncate text-sm">{result.title}</span>
                    {#if result.similarity}
                      <Badge variant="outline" class="text-[10px] px-1 py-0 flex-shrink-0">
                        {Math.round(result.similarity * 100)}%
                      </Badge>
                    {/if}
                    {#if searchScope === "all" && result.projectInfo}
                      <Badge
                        variant="secondary"
                        class="text-[10px] px-1 py-0 flex-shrink-0 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      >
                        {result.projectInfo.name}
                      </Badge>
                    {/if}
                  </div>
                  {#if result.snippet}
                    <p class="text-xs text-muted-foreground truncate mt-0.5">{result.snippet}</p>
                  {/if}
                </div>
              </Command.Item>
            {/each}
          </Command.Group>
        {/each}
      {/if}

    {:else if effectiveMode === "search" && !hasSubmittedSearch}
      <!-- Autocomplete Results -->
      {#if isAutocompleting}
        <div class="py-4 text-center">
          <Loader class="size-4 mx-auto animate-spin text-muted-foreground" />
        </div>
      {:else if autocompleteResults.length > 0}
        {#each Object.entries(groupedAutocomplete) as [type, results]}
          <Command.Group heading={getTypeLabel(type)}>
            {#each results as result}
              {@const Icon = getResultIcon(result.type)}
              <Command.Item
                value={result.title}
                onSelect={() => handleAutocompleteClick(result)}
              >
                <Icon class="size-4 mr-2 text-muted-foreground flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <span class="truncate text-sm">{result.title}</span>
                  {#if result.subtitle}
                    <span class="text-xs text-muted-foreground ml-2">{result.subtitle}</span>
                  {/if}
                </div>
              </Command.Item>
            {/each}
          </Command.Group>
        {/each}
      {:else if strippedQuery.length >= 2}
        <Command.Empty>No suggestions. Press Enter to search.</Command.Empty>
      {/if}

    {:else}
      <!-- Default State: Quick Actions, Sections, Recent Searches -->
      <Command.Group heading="Quick Actions">
        {#each quickActions as action}
          <Command.Item
            value={action.label}
            onSelect={() => {
              action.action();
              globalSearchStore.close();
            }}
          >
            <action.icon class="size-4 mr-2 text-muted-foreground" />
            <span>{action.label}</span>
          </Command.Item>
        {/each}
      </Command.Group>

      {#if projectSections.length > 0}
        <Command.Separator />
        <Command.Group heading="Go to Section">
          {#each projectSections as section}
            <Command.Item
              value={section.label}
              onSelect={() => {
                navigate(section.path);
                globalSearchStore.close();
              }}
            >
              <section.icon class="size-4 mr-2 text-muted-foreground" />
              <span>{section.label}</span>
              <ArrowRight class="size-3 ml-auto text-muted-foreground" />
            </Command.Item>
          {/each}
        </Command.Group>
      {/if}

      {#if recentSearches.length > 0}
        <Command.Separator />
        <Command.Group heading="Recent Searches">
          {#each recentSearches.slice(0, 5) as recent}
            <Command.Item
              value={recent}
              onSelect={() => selectRecentSearch(recent)}
            >
              <Clock class="size-4 mr-2 text-muted-foreground" />
              <span>{recent}</span>
            </Command.Item>
          {/each}
        </Command.Group>
      {/if}
    {/if}
  </Command.List>

  <!-- Footer -->
  <div class="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
    <div class="flex items-center gap-2">
      <span class="text-xs">{searchScope === "current" ? "Current project" : "All projects"}</span>
      <Switch
        pressed={searchScope === "all"}
        onPressedChange={handleScopeToggle}
        class="scale-75"
      />
    </div>
    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1">
        <kbd class="inline-flex items-center rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
          <CommandIcon class="size-2.5" />K
        </kbd>
        open
      </span>
      <span class="flex items-center gap-1">
        <kbd class="inline-flex items-center rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
          Esc
        </kbd>
        close
      </span>
      <span class="flex items-center gap-1">
        <kbd class="inline-flex items-center rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
          &gt;
        </kbd>
        commands
      </span>
      <span class="flex items-center gap-1">
        <kbd class="inline-flex items-center rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
          ?
        </kbd>
        AI
      </span>
    </div>
  </div>
</Command.Dialog>

<script lang="ts">
  import { onMount } from "svelte";
  import { slide, fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Input } from "$lib/components/ui/input";
  import { cn } from "$lib/utils";
  
  // Icons
  import Search from "lucide-svelte/icons/search";
  import Star from "lucide-svelte/icons/star";
  import MessageCircle from "lucide-svelte/icons/message-circle";
  import Calendar from "lucide-svelte/icons/calendar";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import Plus from "lucide-svelte/icons/plus";
  import Clock from "lucide-svelte/icons/clock";
  import Folder from "lucide-svelte/icons/folder";
  import Loader from "lucide-svelte/icons/loader";
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import X from "lucide-svelte/icons/x";
  import Filter from "lucide-svelte/icons/filter";
  import RefreshCw from "lucide-svelte/icons/refresh-cw";

  // Props
  interface Props {
    class?: string;
    onSessionSelect?: (sessionId: string) => void;
    onNewSession?: () => void;
  }

  let { class: className = "", onSessionSelect, onNewSession }: Props = $props();

  // Reactive bindings to store state
  let sessions = $derived(globalSearchStore.chatHistorySessions);
  let currentSession = $derived(globalSearchStore.currentSession);
  let isLoading = $derived(globalSearchStore.isLoadingHistory);
  let error = $derived(globalSearchStore.chatHistoryError);
  let isSaving = $derived(globalSearchStore.isSavingSession);

  // Local state
  let searchQuery = $state("");
  let showStarredOnly = $state(false);
  let showProjectFilter = $state(false);
  let selectedProjectId = $state<string | null>(null);
  let hoveredSessionId = $state<string | null>(null);

  // Manual filtered sessions using $state and $effect
  let filteredSessions = $state([]);

  // Update filtered sessions when dependencies change
  $effect(() => {
    let filtered = sessions;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session => {
        const titleMatch = session.title?.toLowerCase().includes(query);
        
        // Handle messages that might be a string
        let messages = session.messages;
        if (typeof messages === 'string') {
          try {
            messages = JSON.parse(messages);
          } catch {
            messages = [];
          }
        }
        
        const messagesMatch = Array.isArray(messages) && messages.some(msg => msg.content?.toLowerCase().includes(query));
        return titleMatch || messagesMatch;
      });
    }

    // Filter by starred status
    if (showStarredOnly) {
      filtered = filtered.filter(session => session.metadata?.isStarred === true);
    }

    // Filter by project
    if (selectedProjectId) {
      filtered = filtered.filter(session => session.projectId === selectedProjectId);
    }

    filteredSessions = filtered;
  });

  const starredSessions = $derived(() => 
    sessions.filter(session => session.metadata?.isStarred === true)
  );

  const projects = $derived(() => {
    const projectMap = new Map();
    sessions.forEach(session => {
      if (session.project) {
        projectMap.set(session.project.id, session.project);
      }
    });
    return Array.from(projectMap.values());
  });

  const hasFilters = $derived(
    searchQuery.trim() !== "" || showStarredOnly || selectedProjectId !== null
  );

  // Load chat history on mount
  onMount(async () => {
    if (sessions.length === 0) {
      await globalSearchStore.loadChatHistory();
    }
  });

  // Handle session selection
  function handleSessionSelect(sessionId: string) {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
    globalSearchStore.loadSession(sessionId);
  }

  // Handle new session creation
  function handleNewSession() {
    if (onNewSession) {
      onNewSession();
    }
    globalSearchStore.createNewSession();
  }

  // Handle session deletion
  async function handleDeleteSession(sessionId: string, event: Event) {
    event.stopPropagation();
    
    if (confirm("Are you sure you want to delete this chat session?")) {
      await globalSearchStore.deleteSession(sessionId);
    }
  }

  // Handle star toggle
  async function handleToggleStar(sessionId: string, event: Event) {
    event.stopPropagation();
    await globalSearchStore.toggleStarSession(sessionId);
  }

  // Handle search
  async function handleSearch() {
    if (searchQuery.trim()) {
      await globalSearchStore.searchChatHistory(searchQuery);
    } else {
      await globalSearchStore.loadChatHistory();
    }
  }

  // Handle refresh
  async function handleRefresh() {
    await globalSearchStore.loadChatHistory();
  }

  // Clear filters
  function clearFilters() {
    searchQuery = "";
    showStarredOnly = false;
    selectedProjectId = null;
  }

  // Format timestamp
  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  // Get session preview (first user message)
  function getSessionPreview(session: any): string {
    // Handle case where messages might be a string (not yet parsed)
    let messages = session.messages;
    if (typeof messages === 'string') {
      try {
        messages = JSON.parse(messages);
      } catch {
        return "No messages yet";
      }
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return "No messages yet";
    }
    
    const firstUserMessage = messages.find((msg: any) => msg.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.length > 60 
        ? firstUserMessage.content.slice(0, 60) + "..."
        : firstUserMessage.content;
    }
    
    return "No messages yet";
  }

  // Get message count
  function getMessageCount(session: any): number {
    // Handle case where messages might be a string (not yet parsed)
    let messages = session.messages;
    if (typeof messages === 'string') {
      try {
        messages = JSON.parse(messages);
      } catch {
        return 0;
      }
    }
    
    return Array.isArray(messages) ? messages.length : 0;
  }
</script>

<div class={cn("flex flex-col h-full bg-background", className)}>
  <!-- Header -->
  <div class="px-4 py-3 border-b">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <MessageCircle class="size-4 text-muted-foreground" />
        <h2 class="font-semibold text-sm">Chat History</h2>
        {#if isSaving}
          <Loader class="size-3 animate-spin text-muted-foreground" />
        {/if}
      </div>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onclick={handleRefresh}
          disabled={isLoading}
          class="h-7 w-7 p-0"
        >
          <RefreshCw class="size-3 {isLoading ? 'animate-spin' : ''}" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onclick={handleNewSession}
          class="h-7 w-7 p-0"
        >
          <Plus class="size-3" />
        </Button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative mb-3">
      <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 size-3 text-muted-foreground" />
      <Input
        bind:value={searchQuery}
        placeholder="Search chat history..."
        class="pl-9 h-8 text-xs"
        oninput={handleSearch}
      />
      {#if searchQuery}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => { searchQuery = ""; handleSearch(); }}
          class="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
        >
          <X class="size-3" />
        </Button>
      {/if}
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2 mb-2">
      <Button
        variant={showStarredOnly ? "default" : "outline"}
        size="sm"
        onclick={() => { showStarredOnly = !showStarredOnly; }}
        class="h-7 text-xs"
      >
        <Star class="size-3 mr-1 {showStarredOnly ? 'fill-current' : ''}" />
        Starred
        {#if starredSessions.length > 0}
          <Badge variant="secondary" class="ml-2 h-4 px-1 text-xs">
            {starredSessions.length}
          </Badge>
        {/if}
      </Button>
      
      {#if hasFilters}
        <Button
          variant="ghost"
          size="sm"
          onclick={clearFilters}
          class="h-7 text-xs text-muted-foreground"
        >
          <X class="size-3 mr-1" />
          Clear
        </Button>
      {/if}
    </div>

    <!-- Stats -->
    <div class="text-xs text-muted-foreground">
      {filteredSessions.length} of {sessions.length} sessions
    </div>
  </div>

  <!-- Session List -->
  <ScrollArea class="flex-1">
    <div class="p-2 space-y-1">
      {#if error}
        <div class="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md" transition:slide>
          <AlertCircle class="size-4" />
          <span>{error}</span>
        </div>
      {/if}

      {#if isLoading}
        <div class="flex items-center justify-center p-8">
          <Loader class="size-4 animate-spin text-muted-foreground" />
        </div>
      {:else if filteredSessions.length === 0}
        <div class="text-center py-8 text-muted-foreground">
          <MessageCircle class="size-8 mx-auto mb-3 opacity-50" />
          <p class="text-sm">
            {hasFilters ? "No matching sessions found" : "No chat sessions yet"}
          </p>
          {#if !hasFilters}
            <p class="text-xs mt-1">Start a conversation to see your chat history</p>
          {/if}
        </div>
      {:else}
        {#each filteredSessions as session (session.id)}
          <div
            class="group relative p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 {
              currentSession?.id === session.id ? 'bg-muted border-primary' : 'hover:border-muted-foreground/20'
            }"
            onclick={() => handleSessionSelect(session.id)}
            onmouseenter={() => hoveredSessionId = session.id}
            onmouseleave={() => hoveredSessionId = null}
            animate:flip={{ duration: 300, easing: quintOut }}
            transition:slide|local={{ duration: 200 }}
          >
            <!-- Session Header -->
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm truncate">
                  {session.title || "Untitled Chat"}
                </h3>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock class="size-3" />
                    {formatTimestamp(session.updatedAt)}
                  </div>
                  {#if session.project}
                    <div class="flex items-center gap-1 text-xs text-muted-foreground">
                      <Folder class="size-3" />
                      {session.project.name}
                    </div>
                  {/if}
                </div>
              </div>
              
              <!-- Actions -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e) => handleToggleStar(session.id, e)}
                  class="h-6 w-6 p-0"
                >
                  <Star 
                    class="size-3 {session.metadata?.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}" 
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e) => handleDeleteSession(session.id, e)}
                  class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 class="size-3" />
                </Button>
              </div>
            </div>

            <!-- Session Preview -->
            <p class="text-xs text-muted-foreground line-clamp-2 mb-2">
              {getSessionPreview(session)}
            </p>

            <!-- Session Stats -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1 text-muted-foreground">
                  <MessageCircle class="size-3" />
                  {getMessageCount(session)} messages
                </div>
                {#if session.metadata?.isStarred}
                  <Badge variant="secondary" class="h-4 px-1">
                    <Star class="size-2 mr-1 fill-current" />
                    Starred
                  </Badge>
                {/if}
              </div>
              
              {#if hoveredSessionId === session.id}
                <div class="text-xs text-muted-foreground" transition:fade>
                  Click to open
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </ScrollArea>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
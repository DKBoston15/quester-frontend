<script lang="ts">
  import { onMount } from "svelte";
  import { slide, fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Input } from "$lib/components/ui/input";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { cn } from "$lib/utils";
  import type { ChatSession } from "$lib/services/chat-history-api";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  // Icons
  import Search from "lucide-svelte/icons/search";
  import Star from "lucide-svelte/icons/star";
  import MessageCircle from "lucide-svelte/icons/message-circle";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import Plus from "lucide-svelte/icons/plus";
  import Clock from "lucide-svelte/icons/clock";
  import Folder from "lucide-svelte/icons/folder";
  import Loader from "lucide-svelte/icons/loader";
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import X from "lucide-svelte/icons/x";
  import RefreshCw from "lucide-svelte/icons/refresh-cw";
  import Loader2 from "lucide-svelte/icons/loader-2";

  // Props
  interface Props {
    class?: string;
    onSessionSelect?: (sessionId: string) => void;
    onNewSession?: () => void;
  }

  let {
    class: className = "",
    onSessionSelect,
    onNewSession,
  }: Props = $props();

  // Reactive bindings to store state
  let sessions = $derived(globalSearchStore.chatHistorySessions);
  let currentSession = $derived(globalSearchStore.currentSession);
  let isLoading = $derived(globalSearchStore.isLoadingHistory);
  let error = $derived(globalSearchStore.chatHistoryError);
  let isSaving = $derived(globalSearchStore.isSavingSession);

  // Local state
  let searchQuery = $state("");
  let showStarredOnly = $state(false);
  let selectedProjectId = $state<string | null>(null);
  let hoveredSessionId = $state<string | null>(null);
  let showDeleteDialog = $state(false);
  let sessionToDelete = $state<string | null>(null);
  let isDeleting = $state(false);

  // Manual filtered sessions using $state and $effect
  let filteredSessions = $state<ChatSession[]>([]);

  // Update filtered sessions when dependencies change
  $effect(() => {
    let filtered = sessions;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((session) => {
        const titleMatch = session.title?.toLowerCase().includes(query);

        // Handle messages that might be a string
        let messages = session.messages;
        if (typeof messages === "string") {
          try {
            messages = JSON.parse(messages);
          } catch (error) {
            console.error(
              "Failed to parse chat history messages for filtering:",
              {
                sessionId: session.id,
                error: error instanceof Error ? error.message : t("common.unknown"),
              }
            );
            messages = [];
          }
        }

        const messagesMatch =
          Array.isArray(messages) &&
          messages.some((msg) => msg.content?.toLowerCase().includes(query));
        return titleMatch || messagesMatch;
      });
    }

    // Filter by starred status
    if (showStarredOnly) {
      filtered = filtered.filter(
        (session) => session.metadata?.isStarred === true
      );
    }

    // Filter by project
    if (selectedProjectId) {
      filtered = filtered.filter(
        (session) => session.projectId === selectedProjectId
      );
    }

    filteredSessions = filtered;
  });

  const starredSessions = $derived(() =>
    sessions.filter((session) => session.metadata?.isStarred === true)
  );


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
  function handleDeleteSession(sessionId: string, event: Event) {
    event.stopPropagation();
    sessionToDelete = sessionId;
    showDeleteDialog = true;
  }

  // Confirm session deletion
  async function confirmDeleteSession() {
    if (!sessionToDelete) return;

    isDeleting = true;
    try {
      await globalSearchStore.deleteSession(sessionToDelete);
      showDeleteDialog = false;
      sessionToDelete = null;
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      isDeleting = false;
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

    if (diffMins < 1) return get(_)('keyInsightsExtra.justNow');
    if (diffMins < 60) return get(_)('keyInsightsExtra.minutesAgo', { values: { minutes: diffMins } });
    if (diffHours < 24) return get(_)('keyInsightsExtra.hoursAgo', { values: { hours: diffHours } });
    if (diffDays < 7) return get(_)('keyInsightsExtra.daysAgoShort', { values: { days: diffDays } });

    return date.toLocaleDateString();
  }

  // Get session preview (first user message)
  function getSessionPreview(session: any): string {
    // Handle case where messages might be a string (not yet parsed)
    let messages = session.messages;
    if (typeof messages === "string") {
      try {
        messages = JSON.parse(messages);
      } catch (error) {
        console.error("Failed to parse chat history messages for preview:", {
          sessionId: session.id,
          error: error instanceof Error ? error.message : t("common.unknown"),
        });
        return get(_)('chatHistory.noMessagesYet');
      }
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return get(_)('chatHistory.noMessagesYet');
    }

    const firstUserMessage = messages.find((msg: any) => msg.role === "user");
    if (firstUserMessage) {
      return firstUserMessage.content.length > 60
        ? firstUserMessage.content.slice(0, 60) + "..."
        : firstUserMessage.content;
    }

    return get(_)('chatHistory.noMessagesYet');
  }

  // Get message count
  function getMessageCount(session: any): number {
    // Handle case where messages might be a string (not yet parsed)
    let messages = session.messages;
    if (typeof messages === "string") {
      try {
        messages = JSON.parse(messages);
      } catch (error) {
        console.error("Failed to parse chat history messages for count:", {
          sessionId: session.id,
          error: error instanceof Error ? error.message : t("common.unknown"),
        });
        return 0;
      }
    }

    if (!Array.isArray(messages)) {
      console.warn("Chat history messages is not an array:", {
        sessionId: session.id,
        messageType: typeof messages,
      });
      return 0;
    }

    return messages.length;
  }
</script>

<div class={cn("flex flex-col h-full bg-background", className)}>
  <!-- Header -->
  <div class="px-4 py-3 border-b">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <MessageCircle class="size-4 text-muted-foreground" />
        <h2 class="font-semibold text-sm">{$_('globalSearch.chatHistory')}</h2>
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
      <Search
        class="absolute left-3 top-1/2 transform -translate-y-1/2 size-3 text-muted-foreground"
      />
      <Input
        bind:value={searchQuery}
        placeholder={$_('globalSearch.searchPlaceholder')}
        class="pl-9 h-8 text-xs"
        oninput={handleSearch}
      />
      {#if searchQuery}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => {
            searchQuery = "";
            handleSearch();
          }}
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
        onclick={() => {
          showStarredOnly = !showStarredOnly;
        }}
        class="h-7 text-xs"
      >
        <Star class="size-3 mr-1 {showStarredOnly ? 'fill-current' : ''}" />
        {$_('globalSearch.starred')}
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
          {$_('globalSearch.clear')}
        </Button>
      {/if}
    </div>

    <!-- Stats -->
    <div class="text-xs text-muted-foreground">
      {$_('globalSearch.sessionsCount', { values: { count: filteredSessions.length, total: sessions.length } })}
    </div>
  </div>

  <!-- Session List -->
  <ScrollArea class="flex-1">
    <div class="p-2 space-y-1">
      {#if error}
        <div
          class="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md"
          transition:slide
        >
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
            {hasFilters ? $_('globalSearch.noMatchingSessions') : $_('globalSearch.noChatSessions')}
          </p>
          {#if !hasFilters}
            <p class="text-xs mt-1">
              {$_('globalSearch.startConversation')}
            </p>
          {/if}
        </div>
      {:else}
        {#each filteredSessions as session (session.id)}
          <div
            class="group relative p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 {currentSession?.id ===
            session.id
              ? 'bg-muted border-primary'
              : 'hover:border-muted-foreground/20'}"
            role="button"
            tabindex="0"
            onclick={() => handleSessionSelect(session.id)}
            onkeydown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSessionSelect(session.id);
              }
            }}
            onmouseenter={() => (hoveredSessionId = session.id)}
            onmouseleave={() => (hoveredSessionId = null)}
            animate:flip={{ duration: 300, easing: quintOut }}
            transition:slide|local={{ duration: 200 }}
          >
            <!-- Session Header -->
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm truncate">
                  {session.title || $_('globalSearch.untitledChat')}
                </h3>
                <div class="flex items-center gap-2 mt-1">
                  <div
                    class="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Clock class="size-3" />
                    {formatTimestamp(session.updatedAt)}
                  </div>
                  {#if session.project}
                    <div
                      class="flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <Folder class="size-3" />
                      {session.project.name}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Actions -->
              <div
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e: MouseEvent) => handleToggleStar(session.id, e)}
                  class="h-6 w-6 p-0"
                >
                  <Star
                    class="size-3 {session.metadata?.isStarred
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'}"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e: MouseEvent) => handleDeleteSession(session.id, e)}
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
                  {$_('globalSearch.messages', { values: { count: getMessageCount(session) } })}
                </div>
                {#if session.metadata?.isStarred}
                  <Badge variant="secondary" class="h-4 px-1">
                    <Star class="size-2 mr-1 fill-current" />
                    {$_('globalSearch.starred')}
                  </Badge>
                {/if}
              </div>

              {#if hoveredSessionId === session.id}
                <div class="text-xs text-muted-foreground" transition:fade>
                  {$_('globalSearch.clickToOpen')}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </ScrollArea>
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{$_('globalSearch.deleteChatSession')}</AlertDialog.Title>
      <AlertDialog.Description>
        {$_('globalSearch.deleteConfirmation')}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>{$_('globalSearch.cancel')}</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteSession}
        disabled={isDeleting}
        class="bg-destructive dark:text-white hover:bg-destructive/90"
      >
        {#if isDeleting}
          <Loader2 class="h-4 w-4 animate-spin mr-2" />
        {/if}
        {$_('globalSearch.deleteChatSession')}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import { slide, fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { ChatHistory } from "$lib/components/global-search";
  import { navigate } from "svelte-routing";
  import { API_BASE_URL } from "$lib/config";
  import MarkdownIt from "markdown-it";
  import ContextSelector from "$lib/components/ai/ContextSelector.svelte";
  import type { ContextSelectionItem } from "$lib/types/context";
  import { toast } from "svelte-sonner";

  // Icons
  import Send from "lucide-svelte/icons/send";
  import Loader from "lucide-svelte/icons/loader";
  import Sparkles from "lucide-svelte/icons/sparkles";
  import User from "lucide-svelte/icons/user";
  import Bot from "lucide-svelte/icons/bot";
  import Clock from "lucide-svelte/icons/clock";
  import ExternalLink from "lucide-svelte/icons/external-link";
  import FileText from "lucide-svelte/icons/file-text";
  import BookOpen from "lucide-svelte/icons/book-open";
  import Folder from "lucide-svelte/icons/folder";
  import Target from "lucide-svelte/icons/target";
  import Lightbulb from "lucide-svelte/icons/lightbulb";
  import Search from "lucide-svelte/icons/search";
  import TrendingUp from "lucide-svelte/icons/trending-up";
  import ArrowLeft from "lucide-svelte/icons/arrow-left";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import History from "lucide-svelte/icons/history";
  import PanelLeft from "lucide-svelte/icons/panel-left";
  import PanelLeftClose from "lucide-svelte/icons/panel-left-close";
  import Save from "lucide-svelte/icons/save";
  import CheckCircle from "lucide-svelte/icons/check-circle";
  import ChevronDown from "lucide-svelte/icons/chevron-down";

  // Reactive bindings to store state
  let chatMessages = $derived(globalSearchStore.chatMessages);
  let isStreaming = $derived(globalSearchStore.isStreaming);
  let error = $derived(globalSearchStore.error);
  let searchResults = $derived(globalSearchStore.results);
  let hasResults = $derived(globalSearchStore.hasResults);
  let contextSelection = $derived(globalSearchStore.contextSelection);

  // Chat history reactive bindings
  let currentSession = $derived(globalSearchStore.currentSession);
  let showChatHistory = $derived(globalSearchStore.showChatHistory);
  let isSavingSession = $derived(globalSearchStore.isSavingSession);
  let hasUnsavedChanges = $derived(globalSearchStore.hasUnsavedChanges);
  let sessionTitle = $derived(globalSearchStore.sessionTitle);
  let lastSaveTime = $derived(globalSearchStore.lastSaveTime);
  let currentProjectId = $derived(projectStore.currentProject?.id || null);

  // Local state for UI
  let chatInput = $state("");
  let chatInputRef: HTMLTextAreaElement | null = null;
  let chatContainer: HTMLDivElement | null = null;
  let isTyping = $state(false);
  let typingTimeout: NodeJS.Timeout;

  // Initialize markdown renderer
  const md: MarkdownIt = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
    highlight: function (str: string, lang: string): string {
      // Basic code highlighting - you can enhance this later
      return `<pre class="language-${lang}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });

  // Research question suggestions
  const researchSuggestions = [
    {
      icon: Search,
      title: "Summarize my recent research findings",
      description: "Get an overview of your latest research progress",
    },
    {
      icon: TrendingUp,
      title: "What are the key themes in my literature?",
      description: "Identify patterns and trends across your sources",
    },
    {
      icon: Lightbulb,
      title: "Help me find research gaps",
      description: "Discover unexplored areas in your field",
    },
    {
      icon: Target,
      title: "What are my next research steps?",
      description: "Get recommendations for continuing your work",
    },
  ];

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    if (chatMessages.length > 0 && chatContainer) {
      tick().then(() => {
        chatContainer?.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  });

  // Focus input when component mounts
  onMount(() => {
    if (chatInputRef) {
      chatInputRef.focus();
    }
  });

  // Handle typing indicator
  function handleInput() {
    clearTimeout(typingTimeout);
    isTyping = true;
    typingTimeout = setTimeout(() => {
      isTyping = false;
    }, 1000);
  }

  // Safe message count getter with proper error handling
  function getSessionMessageCount(session: any): number {
    if (!session?.messages) return 0;

    let messages = session.messages;
    if (typeof messages === "string") {
      try {
        messages = JSON.parse(messages);
      } catch (error) {
        console.error("Failed to parse chat session messages JSON:", {
          sessionId: session.id,
          error: error instanceof Error ? error.message : "Unknown error",
          rawMessages: messages?.substring(0, 100) + "...", // Log first 100 chars for debugging
        });
        // Return 0 but notify user that data might be corrupted
        // This prevents the UI from breaking while alerting about data issues
        return 0;
      }
    }

    if (!Array.isArray(messages)) {
      console.warn("Chat session messages is not an array:", {
        sessionId: session.id,
        messageType: typeof messages,
        messages,
      });
      return 0;
    }

    return messages.length;
  }

  // Handle chat input keydown
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  // Handle message submission
  async function handleSubmit() {
    if (chatInput.trim() && !isStreaming) {
      const message = chatInput.trim();
      chatInput = "";
      isTyping = false;
      clearTimeout(typingTimeout);

      await globalSearchStore.sendChatMessage(message);

      // Refocus input after submission
      if (chatInputRef) {
        chatInputRef.focus();
      }
    }
  }

  // Handle suggestion selection
  function selectSuggestion(suggestion: string) {
    chatInput = suggestion;
    if (chatInputRef) {
      chatInputRef.focus();
    }
  }

  function addContextItem(event: CustomEvent<ContextSelectionItem>) {
    globalSearchStore.addContextSelection(event.detail);
  }

  function removeContextItem(event: CustomEvent<ContextSelectionItem>) {
    globalSearchStore.removeContextSelection(event.detail);
  }

  function clearContextItems() {
    globalSearchStore.clearContextSelection();
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
      default:
        return FileText;
    }
  }

  // Source type used for clicks
  interface Source {
    type: string;
    id: string;
    title: string;
    similarity: number;
    snippet?: string;
    metadata?: any;
  }

  function getTypeLabel(type: string): string {
    return type === "document_chunk"
      ? "Literature Page"
      : type?.[0]?.toUpperCase() + type?.slice(1);
  }

  function formatContextItemLabel(item: ContextSelectionItem): string {
    if (item.title && item.title.trim().length > 0) {
      return item.title;
    }
    const shortId = item.id ? `${item.id.slice(0, 6)}…` : "";
    const typeLabel = getTypeLabel(item.type);
    return shortId ? `${typeLabel} (${shortId})` : typeLabel;
  }

  async function openDocumentPreview(fileId: string, page?: number) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/documents/${fileId}/download?preview=true`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      const baseUrl: unknown = data?.downloadUrl;
      if (typeof baseUrl !== "string" || baseUrl.length === 0) {
        toast.error("Unable to preview document", { description: "Missing download URL" });
        return;
      }
      const url = page ? `${baseUrl}#page=${page}` : baseUrl;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        window.location.assign(url);
      }
    } catch (e) {
      console.error("Preview open failed", e);
    }
  }

  function handleSourceClick(source: Source) {
    const projectId = source?.metadata?.project_id;
    if (!projectId) return;
    let path = "";
    switch (source.type) {
      case "literature":
        path = `/project/${projectId}/literature/${source.id}`;
        break;
      case "document_chunk":
        if (source.metadata?.literature_id) {
          const qp = new URLSearchParams();
          if (source.metadata?.start_page)
            qp.set("p", String(source.metadata.start_page));
          path = `/project/${projectId}/literature/${source.metadata.literature_id}?${qp.toString()}`;
        } else {
          path = `/project/${projectId}/literature`;
        }
        break;
      case "note":
        path = `/project/${projectId}/notes`;
        break;
      case "outcome":
        path = `/project/${projectId}/outcomes/${source.id}`;
        break;
      case "project":
        path = `/project/${projectId}`;
        break;
      default:
        path = `/project/${projectId}`;
        break;
    }
    if (path) navigate(path);
  }

  // Transform tool names to friendly display names
  function getFriendlyToolName(toolName: string): string {
    const toolNames: Record<string, string> = {
      get_literature_count: "Literature Counter",
      get_relevant_content: "Content Search",
      semantic_search: "Semantic Search",
      analyze_literature_gaps: "Gap Analysis",
      suggest_research_directions: "Research Suggestions",
      summarize_search_results: "Search Summarizer",
      compare_methodologies: "Methodology Comparison",
    };
    return (
      toolNames[toolName] ||
      toolName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }

  // Format timestamp
  function formatTimestamp(timestamp: Date | string): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
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

  // Should show timestamp for message
  function shouldShowTimestamp(index: number): boolean {
    if (index === 0) return true;

    const prevMessage = chatMessages[index - 1];
    const currentMessage = chatMessages[index];

    // Show timestamp if messages are more than 5 minutes apart
    const prevTime = new Date(prevMessage.timestamp).getTime();
    const currentTime = new Date(currentMessage.timestamp).getTime();

    return currentTime - prevTime > 5 * 60 * 1000;
  }

  // Render markdown content for AI messages
  function renderMarkdown(content: string): string {
    return md.render(content);
  }

  // Parse source citations from AI responses
  function parseSourceCitations(content: string): {
    content: string;
    sources: Array<{ id: string; title: string; type: string }>;
  } {
    const sourcePattern = /\[Source: ([^\]]+)\]/g;
    const sources: Array<{ id: string; title: string; type: string }> = [];
    let match;

    while ((match = sourcePattern.exec(content)) !== null) {
      const sourceInfo = match[1].split(" - ");
      if (sourceInfo.length >= 2) {
        sources.push({
          id: sourceInfo[0],
          title: sourceInfo[1],
          type: sourceInfo[2] || "unknown",
        });
      }
    }

    // Remove source citations from content for display
    const cleanContent = content.replace(sourcePattern, "").trim();

    return { content: cleanContent, sources };
  }

  // Chat history functions
  function toggleChatHistory() {
    globalSearchStore.toggleChatHistory();
  }

  async function handleSessionSelect(sessionId: string) {
    await globalSearchStore.loadSession(sessionId);
    // Optionally hide the sidebar after selection on mobile
    if (window.innerWidth < 768) {
      globalSearchStore.setChatHistoryVisibility(false);
    }
  }

  async function handleNewSession() {
    await globalSearchStore.createNewSession();
    // Optionally hide the sidebar after creation on mobile
    if (window.innerWidth < 768) {
      globalSearchStore.setChatHistoryVisibility(false);
    }
  }

  async function handleSaveSession() {
    await globalSearchStore.saveCurrentSession();
  }

  function getLastSaveText(): string {
    if (!lastSaveTime) return "Not saved";

    const now = new Date();
    const diffMs = now.getTime() - lastSaveTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Saved just now";
    if (diffMins < 60) return `Saved ${diffMins}m ago`;

    return `Saved ${lastSaveTime.toLocaleTimeString()}`;
  }
</script>

<div class="flex h-full">
  <!-- Chat History Sidebar -->
  {#if showChatHistory}
    <div
      class="w-80 border-r bg-background flex-shrink-0"
      transition:slide={{ axis: "x" }}
    >
      <ChatHistory
        class="h-full"
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
      />
    </div>
  {/if}

  <!-- Main Chat Area -->
  <div class="flex flex-col flex-1 min-w-0">
    <!-- Chat Header -->
    <div class="border-b px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Toggle Chat History Button -->
        <Button
          variant="ghost"
          size="sm"
          onclick={toggleChatHistory}
          class="text-muted-foreground hover:text-foreground"
        >
          {#if showChatHistory}
            <PanelLeftClose class="size-4 mr-1" />
          {:else}
            <PanelLeft class="size-4 mr-1" />
          {/if}
          History
        </Button>

        <!-- Session Title -->
        <div class="flex items-center gap-2">
          <h2 class="font-semibold text-sm truncate">{sessionTitle}</h2>
          {#if hasUnsavedChanges}
            <div
              class="w-2 h-2 bg-orange-500 rounded-full"
              title="Unsaved changes"
            ></div>
          {/if}
          {#if currentSession}
            <Badge variant="secondary" class="text-xs">
              {getSessionMessageCount(currentSession)} messages
            </Badge>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Save Status -->
        {#if isSavingSession}
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader class="size-3 animate-spin" />
            Saving...
          </div>
        {:else if lastSaveTime}
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle class="size-3" />
            {getLastSaveText()}
          </div>
        {/if}

        <!-- Manual Save Button -->
        {#if hasUnsavedChanges}
          <Button
            variant="outline"
            size="sm"
            onclick={handleSaveSession}
            disabled={isSavingSession}
            class="h-7"
          >
            <Save class="size-3 mr-1" />
            Save
          </Button>
        {/if}

        <!-- Clear Chat Button -->
        {#if chatMessages.length > 0}
          <Button
            variant="ghost"
            size="sm"
            onclick={() => globalSearchStore.clearChatHistory()}
            class="text-muted-foreground hover:text-destructive h-7"
          >
            <Trash2 class="size-3 mr-1" />
            Clear
          </Button>
        {/if}

        <!-- Back to Search Button -->
        <Button
          variant="ghost"
          size="sm"
          onclick={() => globalSearchStore.setMode("search")}
          class="text-muted-foreground hover:text-foreground h-7"
        >
          <ArrowLeft class="size-3 mr-1" />
          Search
        </Button>
      </div>
    </div>

    <!-- Chat Messages Area -->
    <div class="flex-1 overflow-y-auto">
      <div bind:this={chatContainer} class="p-4 pt-12 space-y-4">
        {#if chatMessages.length === 0}
          <!-- Empty State with Suggestions -->
          <div class="text-center py-4">
            <div class="mb-6">
              <div
                class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4"
              >
                <Sparkles class="size-8 text-white" />
              </div>
              <h3 class="font-semibold text-lg mb-2">AI Research Assistant</h3>
              <p class="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Ask questions about your research, get insights from your
                literature, or explore patterns in your data. I'm here to help
                accelerate your research process.
              </p>
            </div>

            <!-- Research Question Suggestions -->
            <div class="grid gap-3 max-w-2xl mx-auto">
              {#each researchSuggestions as suggestion}
                {@const Icon = suggestion.icon}
                <Button
                  variant="outline"
                  size="sm"
                  class="text-left justify-start p-4 h-auto hover:bg-muted/50 group"
                  onclick={() => selectSuggestion(suggestion.title)}
                >
                  <div class="flex items-start gap-3 w-full">
                    <div
                      class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors"
                    >
                      <Icon class="size-4 text-primary" />
                    </div>
                    <div class="flex-1 text-left">
                      <div class="font-medium text-sm">{suggestion.title}</div>
                      <div class="text-xs text-muted-foreground mt-1">
                        {suggestion.description}
                      </div>
                    </div>
                  </div>
                </Button>
              {/each}
            </div>

            <!-- Context from Search Results -->
            {#if hasResults}
              <div class="mt-6 p-4 border rounded-lg bg-muted/30">
                <div class="flex items-center gap-2 mb-2">
                  <Search class="size-4 text-muted-foreground" />
                  <span class="text-sm font-medium"
                    >Search context available</span
                  >
                </div>
                <p class="text-xs text-muted-foreground">
                  I can reference {searchResults.length} search results in our conversation
                </p>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Chat Messages -->
          <div class="space-y-4">
            {#each chatMessages as message, i (message.id)}
              {@const showTimestamp = shouldShowTimestamp(i)}
              {@const isUser = message.role === "user"}
              {@const isAssistant = message.role === "assistant"}
              {@const sources = message.sources || []}
              {@const content = message.content}
              {@const toolsUsed = message.metadata?.tools_used ?? []}
              {@const hasTools = toolsUsed.length > 0}
              {@const focusedItems = message.metadata?.context_selection ?? []}
              {@const focusCount = focusedItems.length}
              {@const hasContextFocus = focusCount > 0}
              {@const hasSources = sources.length > 0}
              {@const hasProjectContext = Boolean(
                message.metadata?.project_context
              )}

              <div
                class="message-container"
                animate:flip={{ duration: 300, easing: quintOut }}
                transition:slide|local={{ duration: 200 }}
              >
                {#if showTimestamp}
                  <div
                    class="flex items-center justify-center my-4"
                    transition:fade
                  >
                    <div
                      class="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground"
                    >
                      <Clock class="size-3" />
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                {/if}

                <div
                  class="flex gap-3 {isUser ? 'flex-row-reverse' : 'flex-row'}"
                >
                  <!-- Avatar -->
                  <div class="flex-shrink-0">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center {isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'}"
                    >
                      {#if isUser}
                        <User class="size-4" />
                      {:else}
                        <Bot class="size-4" />
                      {/if}
                    </div>
                  </div>

                  <!-- Message Content -->
                  <div
                    class="flex-1 max-w-[85%] {isUser
                      ? 'text-right'
                      : 'text-left'}"
                  >
                    <div
                      class="inline-block rounded-2xl px-4 py-3 bg-muted border border-border relative group dark:bg-muted/60 dark:border-border/70"
                    >
                      <!-- Message Content -->
                      {#if isAssistant}
                        <div class="prose-chat text-sm leading-relaxed">
                          {@html renderMarkdown(content || message.content)}
                        </div>
                      {:else}
                        <div
                          class="prose-chat text-sm leading-relaxed whitespace-pre-wrap"
                        >
                          {content || message.content}
                        </div>
                      {/if}

                      <!-- Streaming Indicator -->
                      {#if message.streaming}
                        <div
                          class="flex items-center gap-1 mt-2 text-xs opacity-70"
                          transition:fade
                        >
                          <div class="flex gap-1">
                            <div
                              class="w-1 h-1 bg-current rounded-full animate-pulse typing-dot"
                            ></div>
                            <div
                              class="w-1 h-1 bg-current rounded-full animate-pulse typing-dot"
                              style="animation-delay: 0.2s;"
                            ></div>
                            <div
                              class="w-1 h-1 bg-current rounded-full animate-pulse typing-dot"
                              style="animation-delay: 0.4s;"
                            ></div>
                          </div>
                          <span class="ml-2">AI is thinking...</span>
                        </div>
                      {/if}

                      {#if hasSources || hasTools || hasContextFocus || hasProjectContext}
                        <details
                          class="mt-3 border border-border/50 dark:border-border/70 rounded-md bg-muted/30 dark:bg-muted/50 references-panel"
                          transition:slide|local
                        >
                          <summary
                            class="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground cursor-pointer px-3 py-2"
                          >
                            <span class="flex items-center gap-2">
                              <BookOpen class="size-3" />
                              <span>Referenced context</span>
                              <span
                                class="text-[10px] uppercase tracking-wide text-muted-foreground/80"
                              >
                                {#if hasSources}
                                  {sources.length} source{sources.length !== 1
                                    ? "s"
                                    : ""}
                                {/if}
                                {#if hasProjectContext && !hasSources && !hasContextFocus}
                                  project context
                                {/if}
                              </span>
                            </span>
                            <ChevronDown
                              class="size-4 references-chevron"
                              aria-hidden="true"
                            />
                          </summary>
                          <div class="px-3 pb-3 pt-2 space-y-3">
                            {#if hasContextFocus}
                              <div>
                                <div
                                  class="text-xs text-muted-foreground mb-2 font-medium"
                                >
                                  Focused context:
                                </div>
                                <div class="flex flex-wrap gap-2">
                                  {#each focusedItems as item (item.type + item.id)}
                                    <Badge variant="outline" class="text-xs">
                                      {formatContextItemLabel(item)}
                                    </Badge>
                                  {/each}
                                </div>
                              </div>
                            {/if}

                            {#if hasTools}
                              <div>
                                <div
                                  class="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1"
                                >
                                  <Sparkles class="size-3" />
                                  AI Analysis Tools Used:
                                </div>
                                <div class="flex flex-wrap gap-2">
                                  {#each toolsUsed as tool}
                                    <Badge variant="secondary" class="text-xs">
                                      {getFriendlyToolName(tool)}
                                    </Badge>
                                  {/each}
                                </div>
                              </div>
                            {/if}

                            {#if hasSources}
                              <div class="space-y-2">
                                {#each sources as source}
                                  {@const Icon = getResultIcon(source.type)}
                                  <button
                                    class="w-full border rounded-md p-2 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group text-left"
                                    onclick={() =>
                                      handleSourceClick(
                                        source as unknown as Source
                                      )}
                                  >
                                    <div class="flex items-start gap-2">
                                      <Icon
                                        class="size-3 mt-0.5 text-muted-foreground"
                                      />
                                      <div class="flex-1 min-w-0">
                                        <div
                                          class="text-xs font-medium truncate"
                                        >
                                          {source.title}
                                        </div>
                                        {#if source.snippet}
                                          <div
                                            class="text-xs text-muted-foreground mt-1 line-clamp-2"
                                          >
                                            {source.snippet}
                                          </div>
                                        {/if}
                                        <div
                                          class="flex items-center gap-2 mt-1"
                                        >
                                          <Badge
                                            variant="outline"
                                            class="text-xs"
                                            >{getTypeLabel(source.type)}</Badge
                                          >
                                          {#if source.similarity}
                                            <span
                                              class="text-xs text-muted-foreground"
                                            >
                                              {Math.round(
                                                source.similarity * 100
                                              )}% relevance
                                            </span>
                                          {/if}
                                        </div>
                                      </div>
                                      {#if source.type === "document_chunk" && source.metadata?.document_file_id}
                                        <ExternalLink
                                          class="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                          onclick={(e) => {
                                            e.stopPropagation();
                                            openDocumentPreview(
                                              source.metadata.document_file_id,
                                              source.metadata?.start_page
                                            );
                                          }}
                                        />
                                      {/if}
                                    </div>
                                  </button>
                                {/each}
                              </div>
                              <div
                                class="flex items-center gap-2 text-xs text-muted-foreground"
                              >
                                <Search class="size-3" />
                                <span
                                  >Used {sources.length} source{sources.length !==
                                  1
                                    ? "s"
                                    : ""} from your research</span
                                >
                              </div>
                            {/if}

                            {#if hasProjectContext}
                              <div
                                class="flex items-center gap-2 text-xs text-muted-foreground"
                              >
                                <Folder class="size-3" />
                                <span>Using current project context</span>
                              </div>
                            {/if}
                          </div>
                        </details>
                      {/if}
                    </div>

                    <!-- Message Timestamp -->
                    <div
                      class="text-xs text-muted-foreground mt-1 {isUser
                        ? 'text-right'
                        : 'text-left'}"
                    >
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Error Display -->
        {#if error}
          <div
            class="flex items-center gap-3 p-4 border border-destructive/20 bg-destructive/5 rounded-lg text-destructive"
            transition:slide|local
          >
            <div
              class="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0"
            >
              <span class="text-xs">!</span>
            </div>
            <div class="flex-1">
              <div class="font-medium text-sm">Error</div>
              <div class="text-xs opacity-80">{error}</div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Input Area -->
    <div class="border-t bg-background p-4">
      <div class="space-y-4">
        <ContextSelector
          selectedItems={contextSelection}
          projectId={currentProjectId}
          scope="current"
          disabled={isStreaming}
          on:select={addContextItem}
          on:remove={removeContextItem}
          on:clear={clearContextItems}
        />

        <div class="relative">
          <!-- Input Container -->
          <div class="flex gap-3 items-stretch">
            <!-- Text Area -->
            <div class="flex-1 relative">
              <textarea
                bind:this={chatInputRef}
                bind:value={chatInput}
                onkeydown={handleKeydown}
                oninput={handleInput}
                placeholder="Ask questions about your research, get insights, or explore your data..."
                disabled={isStreaming}
                rows="1"
                class="w-full resize-none rounded-lg border-2 dark:border-dark-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] max-h-32 overflow-y-auto transition-all duration-200"
                style="field-sizing: content;"
              ></textarea>

              <!-- Character count for long messages -->
              {#if chatInput.length > 200}
                <div
                  class="absolute -top-6 right-0 text-xs text-muted-foreground"
                >
                  {chatInput.length}/1000
                </div>
              {/if}
            </div>

            <!-- Send Button -->
            <Button
              onclick={handleSubmit}
              disabled={!chatInput.trim() || isStreaming}
              size="sm"
              class="px-4 py-3 h-full min-w-[48px] border-2 dark:border-dark-border"
              aria-label="Send message"
            >
              {#if isStreaming}
                <Loader class="size-4 animate-spin" />
              {:else}
                <Send class="size-4" />
              {/if}
            </Button>
          </div>

          <!-- Input Help Text -->
          <div
            class="flex items-center justify-between mt-2 text-xs text-muted-foreground"
          >
            <div class="flex items-center gap-4">
              <kbd
                class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono"
              >
                Enter
              </kbd>
              <span>to send</span>
              <kbd
                class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono"
              >
                Shift + Enter
              </kbd>
              <span>for new line</span>
            </div>
            {#if hasResults}
              <div class="flex items-center gap-1">
                <Search class="size-3" />
                <span
                  >{searchResults.length} search results available as context</span
                >
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Typing animation for dots */
  @keyframes typingDot {
    0%,
    60%,
    100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    30% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .typing-dot {
    animation: typingDot 1.4s infinite ease-in-out;
  }

  .typing-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  /* Message container animations */
  .message-container {
    opacity: 0;
    animation: messageSlideIn 0.3s ease-out forwards;
  }

  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Auto-resize textarea */
  textarea {
    field-sizing: content;
  }

  /* Custom scrollbar for chat container */
  :global(.chat-scroll) {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground)) transparent;
  }

  :global(.chat-scroll::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.chat-scroll::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.chat-scroll::-webkit-scrollbar-thumb) {
    background-color: hsl(var(--muted-foreground));
    border-radius: 3px;
  }

  /* Focus styles for accessibility */
  textarea:focus {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  /* Message bubble hover effects */
  .message-container:hover .group {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  details.references-panel summary::-webkit-details-marker {
    display: none;
  }

  .references-panel .references-chevron {
    transition: transform 0.2s ease;
  }

  .references-panel[open] .references-chevron {
    transform: rotate(180deg);
  }
</style>

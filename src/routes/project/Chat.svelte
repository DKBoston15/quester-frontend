<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { slide, fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import { projectStore } from "$lib/stores/ProjectStore";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import Loader2 from "lucide-svelte/icons/loader-2";
  import { api, processSSEStream } from "$lib/services/api-client";
  import { API_BASE_URL } from "$lib/config";
  import MarkdownIt from "markdown-it";
  import { navigate } from "svelte-routing";
  
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
  import History from "lucide-svelte/icons/history";
  import RefreshCcw from "lucide-svelte/icons/refresh-ccw";
  import Trash2 from "lucide-svelte/icons/trash-2";

  // Types
  interface Source {
    type: string;
    id: string;
    title: string;
    similarity: number;
    snippet?: string;
    metadata?: any;
  }

  interface Message {
    id?: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    sources?: Source[];
    timestamp: Date;
    streaming?: boolean;
    metadata?: any;
  }

  interface ChatSession {
    chatSessionId: string;
    createdAt: string;
    messages?: Message[];
  }

  // State
  let messages = $state<Message[]>([]);
  let chatInput = $state("");
  let isLoading = $state(false);
  let isStreaming = $state(false);
  let error = $state<string | null>(null);
  let chatContainer: HTMLDivElement | null = null;
  let chatInputRef: HTMLTextAreaElement | null = null;
  let isTyping = $state(false);
  let typingTimeout: NodeJS.Timeout;
  let streamingContent = $state("");
  let currentChatSession = $state<string | undefined>(undefined);
  let recentSessions = $state<ChatSession[]>([]);
  let isLoadingHistory = $state(false);
  let showHistory = $state(false);
  let searchTerm = $state("");
  let filteredSessions = $state<ChatSession[]>([]);
  let isDeleting = $state(false);
  let showDeleteDialog = $state(false);
  let sessionToDelete = $state<string | null>(null);

  // Research question suggestions
  const researchSuggestions = [
    {
      icon: Search,
      title: "Summarize my recent research findings",
      description: "Get an overview of your latest research progress"
    },
    {
      icon: TrendingUp,
      title: "What are the key themes in my literature?",
      description: "Identify patterns and trends across your sources"
    },
    {
      icon: Lightbulb,
      title: "Help me find research gaps",
      description: "Discover unexplored areas in your field"
    },
    {
      icon: Target,
      title: "What are my next research steps?",
      description: "Get recommendations for continuing your work"
    }
  ];

  // Initialize markdown renderer
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
    highlight: function (str, lang) {
      // Basic code highlighting - you can enhance this later
      return `<pre class="language-${lang}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
  });

  // Render markdown content for AI messages
  function renderMarkdown(content: string): string {
    return md.render(content);
  }

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    if (messages.length > 0 && chatContainer) {
      tick().then(() => {
        chatContainer?.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  });

  // Filter sessions based on search term
  $effect(() => {
    filteredSessions = !searchTerm.trim()
      ? recentSessions
      : recentSessions.filter(
          (session) =>
            session.messages?.[0]?.content
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ?? false
        );
  });

  // Load recent chat sessions on mount
  $effect(() => {
    if (projectStore.currentProject?.id) {
      loadRecentSessions();
    }
  });

  // Focus input when component mounts
  onMount(() => {
    if (chatInputRef) {
      chatInputRef.focus();
    }
  });

  // Clean up active streams when component is destroyed
  onDestroy(() => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  });

  async function loadRecentSessions() {
    if (!projectStore.currentProject?.id) return;

    try {
      isLoadingHistory = true;
      const data = await api.get(`/chat/history/${projectStore.currentProject.id}`);

      // Load first message for each session
      const sessionsWithMessages = await Promise.all(
        data.sessions.map(async (session: ChatSession) => {
          try {
            const messageData = await api.get(
              `/chat/history/${projectStore.currentProject?.id}?sessionId=${session.chatSessionId}`
            );
            return {
              ...session,
              messages: messageData.messages.filter(
                (msg: Message) =>
                  msg.role === "user" || msg.role === "assistant"
              ),
            };
          } catch (e) {
            console.error(
              `Failed to load messages for session ${session.chatSessionId}:`,
              e
            );
          }
          return session;
        })
      );

      // Sort sessions by most recent first
      recentSessions = sessionsWithMessages.sort(
        (a: ChatSession, b: ChatSession) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
    } catch (e) {
      console.error("Failed to load chat history:", e);
    } finally {
      isLoadingHistory = false;
    }
  }

  // Delete session functions
  function handleDeleteSession(sessionId: string, event: Event) {
    event.stopPropagation();
    sessionToDelete = sessionId;
    showDeleteDialog = true;
  }

  async function confirmDeleteSession() {
    if (!sessionToDelete) return;

    try {
      isDeleting = true;
      await api.delete(`/chat/sessions/${sessionToDelete}`);

      // Remove from local state
      recentSessions = recentSessions.filter(
        session => session.chatSessionId !== sessionToDelete
      );

      // If we deleted the current session, clear the chat
      if (currentChatSession === sessionToDelete) {
        messages = [];
        currentChatSession = undefined;
      }

      showDeleteDialog = false;
      sessionToDelete = null;
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session: ' + (error as Error).message);
    } finally {
      isDeleting = false;
    }
  }

  async function loadChatSession(sessionId: string) {
    if (!projectStore.currentProject?.id) return;

    try {
      isLoading = true;
      const data = await api.get(
        `/chat/history/${projectStore.currentProject.id}?sessionId=${sessionId}`
      );
      messages = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.createdAt),
        sources: msg.metadata?.sources || msg.sources,
      }));
      currentChatSession = sessionId;
      showHistory = false;
    } catch (e) {
      console.error("Failed to load chat session:", e);
      error = "Failed to load chat session";
    } finally {
      isLoading = false;
    }
  }

  function startNewChat() {
    messages = [];
    currentChatSession = undefined;
    showHistory = false;
    error = null;
  }

  // Handle typing indicator
  function handleInput() {
    clearTimeout(typingTimeout);
    isTyping = true;
    typingTimeout = setTimeout(() => {
      isTyping = false;
    }, 1000);
  }

  // Handle chat input keydown
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  // Store current abort controller for cancellation
  let currentAbortController: AbortController | null = null;

  // Handle message submission
  async function handleSubmit() {
    if (!chatInput.trim() || !projectStore.currentProject?.id) return;

    // Cancel any existing stream
    if (currentAbortController) {
      currentAbortController.abort();
    }

    // Create new abort controller for this request
    currentAbortController = new AbortController();

    isLoading = true;
    isStreaming = true;
    error = null;
    isTyping = false;
    streamingContent = "";

    const sessionToUse = currentChatSession;
    const userMessage = chatInput;
    chatInput = "";

    try {
      // Add user message immediately to local state
      const userMsg: Message = {
        role: "user" as const,
        content: userMessage,
        timestamp: new Date(),
      };
      messages = [...messages, userMsg];

      const response = await api.stream(
        `/chat${sessionToUse ? `?chatSessionId=${sessionToUse}` : ""}`,
        {
          method: "POST",
          body: {
            projectId: projectStore.currentProject.id,
            message: userMessage,
            provider: "openai",
          },
          signal: currentAbortController.signal, // Add abort signal
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get response (${response.status})`);
      }

      // Add an empty assistant message that we'll stream content into
      messages = [
        ...messages,
        {
          role: "assistant",
          content: "",
          timestamp: new Date(),
          streaming: true,
        },
      ];

      let receivedSessionId = false;

      // Use the built-in SSE stream processor for better reliability
      await processSSEStream(response, {
        onMessage: (data) => {
          try {
            if (data.type === "metadata") {
              if (data.chatSessionId && !receivedSessionId) {
                if (!currentChatSession) {
                  currentChatSession = data.chatSessionId;
                }
                receivedSessionId = true;
              }
              
              // Attach sources to the last message (assistant message)
              if (data.sources && data.sources.length > 0) {
                messages = messages.map((msg, i) => {
                  if (i === messages.length - 1) {
                    return {
                      ...msg,
                      sources: data.sources,
                      metadata: { ...msg.metadata, sources: data.sources }
                    };
                  }
                  return msg;
                });
              }
            } else if (data.type === "content") {
              streamingContent += data.content;

              // Update the last message with the new content
              messages = messages.map((msg, i) => {
                if (i === messages.length - 1) {
                  return {
                    ...msg,
                    content: streamingContent,
                  };
                }
                return msg;
              });
            }
          } catch (e) {
            console.error("Failed to process message:", e);
          }
        },
        onError: (error) => {
          console.error("Stream error:", error);
          throw error; // Re-throw to be caught by outer try-catch
        },
        onComplete: () => {
          console.log("Stream completed successfully");
        }
      });

      // After streaming is complete, remove streaming state
      messages = messages.map((msg, i) =>
        i === messages.length - 1 ? { ...msg, streaming: false } : msg
      );

      // Refresh recent sessions after completion
      await loadRecentSessions();
    } catch (e) {
      // Don't show error for aborted requests
      if (e instanceof Error && e.name === 'AbortError') {
        console.log("Chat request was cancelled");
        return;
      }
      
      error = e instanceof Error ? e.message : "Failed to get response";
      console.error("Chat error:", e);
      
      // Remove the failed assistant message if it was added
      if (messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].streaming) {
        messages = messages.slice(0, -1);
      }
    } finally {
      isLoading = false;
      isStreaming = false;
      streamingContent = "";
      currentAbortController = null; // Clean up abort controller
      
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


  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(dateStr));
  }

  function shouldShowTimestamp(index: number): boolean {
    if (index === 0) return true;

    const prevMessage = messages[index - 1];
    const currentMessage = messages[index];

    // Show timestamp if messages are more than 5 minutes apart
    return (
      currentMessage.timestamp.getTime() - prevMessage.timestamp.getTime() >
      5 * 60 * 1000
    );
  }

  // Format timestamp for display
  function formatTimestamp(timestamp: Date | string): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
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
      case "document_chunk":
        return FileText; // Use FileText icon for document chunks
      default:
        return FileText;
    }
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'document_chunk':
        return 'Literature Page';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  // Transform tool names to friendly display names
  function getFriendlyToolName(toolName: string): string {
    const toolNames: Record<string, string> = {
      'get_literature_count': 'Literature Counter',
      'get_relevant_content': 'Content Search',
      'semantic_search': 'Semantic Search',
      'analyze_literature_gaps': 'Gap Analysis',
      'suggest_research_directions': 'Research Suggestions',
      'summarize_search_results': 'Search Summarizer',
      'compare_methodologies': 'Methodology Comparison'
    };
    return toolNames[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Handle source navigation based on type
  function handleSourceClick(source: Source) {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    let path = '';
    
    switch (source.type) {
      case 'literature':
        path = `/project/${projectId}/literature/${source.id}`;
        break;
      case 'document_chunk':
        // Prefer deep linking to the literature item that was created for this document
        if (source.metadata?.literature_id) {
          const qp = new URLSearchParams();
          if (source.metadata?.start_page) qp.set('p', String(source.metadata.start_page));
          path = `/project/${projectId}/literature/${source.metadata.literature_id}?${qp.toString()}`;
        } else if (source.metadata?.document_file_id) {
          path = `/project/${projectId}/literature`;
        } else {
          path = `/project/${projectId}/literature`;
        }
        break;
      case 'note':
        // Notes don't have detail views, navigate to notes list
        path = `/project/${projectId}/notes`;
        break;
      case 'outcome':
        path = `/project/${projectId}/outcomes/${source.id}`;
        break;
      case 'project':
        path = `/project/${projectId}`;
        break;
      default:
        // Fallback to project overview for unknown types
        path = `/project/${projectId}`;
        break;
    }
    
    if (path) {
      navigate(path);
    }
  }

  async function openDocumentPreview(fileId: string, page?: number) {
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${fileId}/download?preview=true`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      const url = page ? `${data.downloadUrl}#page=${page}` : data.downloadUrl;
      window.open(url, '_blank');
    } catch (e) {
      console.error('Preview open failed', e);
    }
  }

  // Parse source citations from AI responses
  function parseSourceCitations(content: string): { content: string; sources: Array<{ id: string; title: string; type: string }> } {
    const sourcePattern = /\[Source: ([^\]]+)\]/g;
    const sources: Array<{ id: string; title: string; type: string }> = [];
    let match;

    while ((match = sourcePattern.exec(content)) !== null) {
      const sourceInfo = match[1].split(' - ');
      if (sourceInfo.length >= 2) {
        sources.push({
          id: sourceInfo[0],
          title: sourceInfo[1],
          type: sourceInfo[2] || 'unknown'
        });
      }
    }

    // Remove source citations from content for display
    const cleanContent = content.replace(sourcePattern, '').trim();
    
    return { content: cleanContent, sources };
  }
</script>

<Card.Root class="flex flex-col h-full border-2 dark:border-dark-border">
  <Card.Header class="px-6 py-4 flex w-full justify-between border-b-2 dark:border-dark-border bg-background">
    <div class="flex justify-between items-center gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <Bot class="h-6 w-6 text-white" />
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold">AI Research Assistant</span>
          <span class="text-sm text-muted-foreground hidden sm:inline">
            · Chat with your research data
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          onclick={() => (showHistory = !showHistory)}
          class="border-2 dark:border-dark-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(44,46,51,0.1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all {showHistory
            ? 'bg-secondary'
            : ''}"
        >
          <History class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">History</span>
        </Button>
        <Button
          variant="outline"
          onclick={startNewChat}
          class="border-2 dark:border-dark-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(44,46,51,0.1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
        >
          <RefreshCcw class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">New Chat</span>
        </Button>
      </div>
    </div>
  </Card.Header>

  <div class="flex-1 overflow-hidden relative">
    <div class="flex h-full">
      <!-- Chat History Sidebar -->
      {#if showHistory}
        <div class="w-80 border-r bg-background flex-shrink-0 p-4 overflow-y-auto" transition:slide={{ axis: 'x' }}>
          <div class="space-y-4">
            <div class="flex flex-col gap-2">
              <h3 class="font-semibold text-lg flex items-center gap-2">
                <Folder class="h-5 w-5" />
                Chat History
              </h3>
              <div class="relative">
                <Search
                  class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  bind:value={searchTerm}
                  class="w-full pl-9 p-2 text-sm rounded-lg border-2 dark:border-dark-border bg-background focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] transition-all duration-200"
                />
              </div>
            </div>

            {#if isLoadingHistory}
              <div class="flex justify-center py-4">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"
                ></div>
              </div>
            {:else if filteredSessions.length === 0}
              <div class="text-center py-8">
                <p class="text-sm text-muted-foreground">
                  {searchTerm ? "No matching conversations" : "No previous conversations"}
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  {searchTerm ? "Try adjusting your search terms" : "Start a new conversation to begin"}
                </p>
              </div>
            {:else}
              <div class="space-y-2">
                {#each filteredSessions as session}
                  <button
                    transition:fade={{ duration: 200 }}
                    class="w-full p-3 text-left rounded-lg border-2 dark:border-dark-border hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] {currentChatSession ===
                    session.chatSessionId
                      ? 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]'
                      : ''}"
                    onclick={() => loadChatSession(session.chatSessionId)}
                  >
                    <div class="flex items-start gap-3 group">
                      <div
                        class="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0"
                      >
                        <Bot class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">
                          {session.messages?.[0]?.content?.slice(0, 50) ||
                            "Chat Session"}
                          {(session.messages?.[0]?.content?.length ?? 0) > 50
                            ? "..."
                            : ""}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          {formatDate(session.createdAt)}
                        </div>
                      </div>
                      <div
                        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onclick={(e) => handleDeleteSession(session.chatSessionId, e)}
                          class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 class="size-3" />
                        </Button>
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <div class="flex-1 overflow-y-auto">
          <div bind:this={chatContainer} class="p-4 pt-12 space-y-4">
            {#if messages.length === 0}
              <!-- Empty State with Suggestions -->
              <div class="text-center py-4">
                <div class="mb-6">
                  <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                    <Sparkles class="size-8 text-white" />
                  </div>
                  <h3 class="font-semibold text-lg mb-2">AI Research Assistant</h3>
                  <p class="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Ask questions about your research, get insights from your literature, or explore patterns in your data. I'm here to help accelerate your research process.
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
                        <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Icon class="size-4 text-primary" />
                        </div>
                        <div class="flex-1 text-left">
                          <div class="font-medium text-sm">{suggestion.title}</div>
                          <div class="text-xs text-muted-foreground mt-1">{suggestion.description}</div>
                        </div>
                      </div>
                    </Button>
                  {/each}
                </div>
              </div>
            {:else}
              <!-- Chat Messages -->
              <div class="space-y-4">
                {#each messages.filter((msg) => msg.role === "user" || msg.role === "assistant") as message, i (message.id || i)}
                  {@const originalIndex = messages.findIndex(m => m === message)}
                  {@const showTimestamp = shouldShowTimestamp(originalIndex)}
                  {@const isUser = message.role === "user"}
                  {@const isAssistant = message.role === "assistant"}
                  {@const sources = message.sources || message.metadata?.sources || []}
                  {@const content = message.content}
                  
                  <div
                    class="message-container"
                    animate:flip={{ duration: 300, easing: quintOut }}
                    transition:slide|local={{ duration: 200 }}
                  >
                    {#if showTimestamp}
                      <div class="flex items-center justify-center my-4" transition:fade>
                        <div class="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                          <Clock class="size-3" />
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    {/if}

                    <div class="flex gap-3 {isUser ? 'flex-row-reverse' : 'flex-row'}">
                      <!-- Avatar -->
                      <div class="flex-shrink-0">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center {
                          isUser 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                        }">
                          {#if isUser}
                            <User class="size-4" />
                          {:else}
                            <Bot class="size-4" />
                          {/if}
                        </div>
                      </div>

                      <!-- Message Content -->
                      <div class="flex-1 max-w-[85%] {isUser ? 'text-right' : 'text-left'}">
                        <div class="inline-block rounded-2xl px-4 py-3 {
                          isUser 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted border border-border'
                        } relative group">
                          <!-- Message Content -->
                          {#if isAssistant}
                            <div class="prose-chat text-sm leading-relaxed">
                              {@html renderMarkdown(content || message.content)}
                            </div>
                          {:else}
                            <div class="whitespace-pre-wrap text-sm leading-relaxed">
                              {content || message.content}
                            </div>
                          {/if}

                          <!-- Streaming Indicator -->
                          {#if message.streaming}
                            <div class="flex items-center gap-1 mt-2 text-xs opacity-70" transition:fade>
                              <div class="flex gap-1">
                                <div class="w-1 h-1 bg-current rounded-full animate-pulse typing-dot"></div>
                                <div class="w-1 h-1 bg-current rounded-full animate-pulse typing-dot" style="animation-delay: 0.2s;"></div>
                                <div class="w-1 h-1 bg-current rounded-full animate-pulse typing-dot" style="animation-delay: 0.4s;"></div>
                              </div>
                              <span class="ml-2">AI is thinking...</span>
                            </div>
                          {/if}

                          <!-- Enhanced Source Citations & Context -->
                          {#if sources.length > 0 || (message.sources && message.sources.length > 0) || message.metadata?.tools_used}
                            <div class="mt-3 pt-3 border-t border-border/50" transition:slide|local>
                              <!-- Tools Used -->
                              {#if message.metadata?.tools_used && message.metadata.tools_used.length > 0}
                                <div class="mb-3">
                                  <div class="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                                    <Sparkles class="size-3" />
                                    AI Analysis Tools Used:
                                  </div>
                                  <div class="flex flex-wrap gap-2">
                                    {#each message.metadata.tools_used as tool}
                                      <Badge variant="secondary" class="text-xs">
                                        {getFriendlyToolName(tool)}
                                      </Badge>
                                    {/each}
                                  </div>
                                </div>
                              {/if}

                              <!-- Referenced sources -->
                              {#if message.sources && message.sources.length > 0}
                                <div class="mb-2">
                                  <div class="text-xs text-muted-foreground mb-2 font-medium">
                                    Referenced sources:
                                  </div>
                                  <div class="space-y-2">
                                    {#each message.sources as source}
                                      {@const Icon = getResultIcon(source.type)}
                                      <button 
                                        class="w-full border rounded-md p-2 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group text-left"
                                        onclick={() => handleSourceClick(source)}
                                      >
                                        <div class="flex items-start gap-2">
                                          <Icon class="size-3 mt-0.5 text-muted-foreground" />
                                          <div class="flex-1 min-w-0">
                                            <div class="text-xs font-medium truncate">{source.title}</div>
                                            {#if source.snippet}
                                              <div class="text-xs text-muted-foreground mt-1 line-clamp-2">{source.snippet}</div>
                                            {/if}
                                            <div class="flex items-center gap-2 mt-1">
                                              <Badge variant="outline" class="text-xs">
                                                {getTypeLabel(source.type)}
                                              </Badge>
                                              {#if source.similarity}
                                                <span class="text-xs text-muted-foreground">
                                                  {Math.round(source.similarity * 100)}% relevance
                                                </span>
                                              {/if}
                                            </div>
                                          </div>
                                          {#if source.type === 'document_chunk' && source.metadata?.document_file_id}
                                            <ExternalLink 
                                              class="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                              onclick={(e) => { e.stopPropagation(); openDocumentPreview(source.metadata.document_file_id, source.metadata?.start_page); }}
                                            />
                                          {/if}
                                        </div>
                                      </button>
                                    {/each}
                                  </div>
                                </div>
                              {/if}

                              <!-- Search Context Indicator -->
                              {#if message.sources && message.sources.length > 0}
                                <div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Search class="size-3" />
                                  <span>Used {message.sources.length} sources from your research</span>
                                </div>
                              {/if}

                              <!-- Project Context Indicator -->
                              {#if message.metadata?.project_context}
                                <div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Folder class="size-3" />
                                  <span>Using current project context</span>
                                </div>
                              {/if}
                            </div>
                          {/if}
                        </div>

                        <!-- Message Timestamp -->
                        <div class="text-xs text-muted-foreground mt-1 {isUser ? 'text-right' : 'text-left'}">
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            {#if isLoading}
              <div class="flex items-center gap-2 text-gray-500" transition:fade>
                <div
                  class="flex items-center gap-2 border-2 dark:border-dark-border px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
                >
                  <div
                    class="w-2 h-2 bg-current rounded-full loading-spinner"
                  ></div>
                  <div
                    class="w-2 h-2 bg-current rounded-full loading-spinner"
                  ></div>
                  <div
                    class="w-2 h-2 bg-current rounded-full loading-spinner"
                  ></div>
                </div>
              </div>
            {/if}

            {#if error}
              <div
                class="text-red-500 text-center p-4 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/20"
                transition:slide|local
              >
                {error}
              </div>
            {/if}
          </div>
        </div>

        <!-- Input Area -->
        <Card.Footer class="p-0 border-t border-border bg-card">
          <div class="p-4 w-full">
            <div class="relative">
              <!-- Typing Indicator -->
              {#if isTyping}
                <div 
                  class="absolute -top-8 left-0 text-xs text-muted-foreground"
                  transition:fade={{ duration: 200 }}
                >
                  You are typing...
                </div>
              {/if}

              <!-- Input Container -->
              <div class="flex gap-3 items-center">
                <!-- Text Area -->
                <div class="flex-1 relative">
                  <textarea
                    bind:this={chatInputRef}
                    bind:value={chatInput}
                    onkeydown={handleKeydown}
                    oninput={handleInput}
                    placeholder="Ask questions about your research, get insights, or explore your data..."
                    disabled={isLoading || isStreaming}
                    rows="1"
                    class="w-full resize-none rounded-lg border-2 dark:border-dark-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] max-h-32 overflow-y-auto transition-all duration-200"
                    style="field-sizing: content;"
                  ></textarea>
                  
                  <!-- Character count for long messages -->
                  {#if chatInput.length > 200}
                    <div class="absolute -top-6 right-0 text-xs text-muted-foreground">
                      {chatInput.length}/1000
                    </div>
                  {/if}
                </div>

                <!-- Send Button -->
                <button
                  onclick={handleSubmit}
                  disabled={!chatInput.trim() || isLoading || isStreaming}
                  class="flex items-center justify-center px-4 py-3 h-[44px] min-w-[44px] border-2 dark:border-dark-border bg-blue-500 text-white rounded-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200"
                  aria-label="Send message"
                >
                  {#if isLoading || isStreaming}
                    <Loader class="size-4 animate-spin" />
                  {:else}
                    <Send class="size-4" />
                  {/if}
                </button>
              </div>

              <!-- Input Help Text -->
              <div class="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <div class="flex items-center gap-4">
                  <kbd class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono">
                    Enter
                  </kbd>
                  <span>to send</span>
                  <kbd class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono">
                    Shift + Enter
                  </kbd>
                  <span>for new line</span>
                </div>
              </div>
            </div>
          </div>
        </Card.Footer>
      </div>
    </div>
  </div>
</Card.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Chat Session</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this chat session? This action cannot be
        undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteSession}
        disabled={isDeleting}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {#if isDeleting}
          <Loader2 class="h-4 w-4 animate-spin mr-2" />
        {/if}
        Delete Session
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style lang="postcss">
  /* Typing animation for dots */
  @keyframes typingDot {
    0%, 60%, 100% {
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
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: theme(colors.gray.400) transparent;
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: theme(colors.gray.400);
    border-radius: 3px;
  }

  /* Dark mode scrollbar */
  :global(.dark) .overflow-y-auto {
    scrollbar-color: theme(colors.gray.600) transparent;
  }

  :global(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: theme(colors.gray.600);
  }

  /* Smooth content transitions */
  p {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Button hover effects */
  button:not(:disabled) {
    transform: translate(0, 0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  button:not(:disabled):hover {
    transform: translate(-2px, -2px);
  }

  /* Loading spinner animation */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
  }

  /* Focus styles for accessibility */
  textarea:focus,
  button:focus {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  /* Message bubble hover effects */
  .message-container:hover .group {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
</style>

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
  import ContextSelector from "$lib/components/ai/ContextSelector.svelte";
  import type { ContextSelectionItem } from "$lib/types/context";
  import { toast } from "svelte-sonner";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  // Icons
  import Send from "lucide-svelte/icons/send";
  import Loader from "lucide-svelte/icons/loader";
  import Sparkles from "lucide-svelte/icons/sparkles";
  import User from "lucide-svelte/icons/user";
  import Bot from "lucide-svelte/icons/bot";
  import Clock from "lucide-svelte/icons/clock";
  import ExternalLink from "lucide-svelte/icons/external-link";
  import FileText from "lucide-svelte/icons/file-text";
  import FilePlus from "lucide-svelte/icons/file-plus";
  import BookOpen from "lucide-svelte/icons/book-open";
  import Folder from "lucide-svelte/icons/folder";
  import Target from "lucide-svelte/icons/target";
  import Lightbulb from "lucide-svelte/icons/lightbulb";
  import Search from "lucide-svelte/icons/search";
  import TrendingUp from "lucide-svelte/icons/trending-up";
  import History from "lucide-svelte/icons/history";
  import RefreshCcw from "lucide-svelte/icons/refresh-ccw";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import { notesStore } from "$lib/stores/NotesStore";
  import * as Tooltip from "$lib/components/ui/tooltip";

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
    metadata?: {
      sources?: Source[];
      tools_used?: string[];
      project_context?: boolean;
      context_selection?: ContextSelectionItem[];
      [key: string]: any;
    };
  }

  interface ChatSession {
    chatSessionId: string;
    createdAt: string;
    messages?: Message[];
  }

  type MessageMetadata = NonNullable<Message["metadata"]>;

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
  let selectedContextItems = $state<ContextSelectionItem[]>([]);

  // Research question suggestions - use getter to get translated values
  function getResearchSuggestions() {
    return [
      {
        icon: Search,
        title: t("chat.summarizeResearch"),
        description: t("chat.summarizeDescription"),
      },
      {
        icon: TrendingUp,
        title: t("chat.keyThemes"),
        description: t("chat.keyThemesDescription"),
      },
      {
        icon: Lightbulb,
        title: t("chat.findGaps"),
        description: t("chat.findGapsDescription"),
      },
      {
        icon: Target,
        title: t("chat.nextSteps"),
        description: t("chat.nextStepsDescription"),
      },
    ];
  }

  // Initialize markdown renderer
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
  });

  md.set({
    highlight(str: string, lang: string): string {
      const language = lang || "plaintext";
      // Basic code highlighting - you can enhance this later
      return `<pre class="language-${language}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });

  // Render markdown content for AI messages
  function renderMarkdown(content: string): string {
    return md.render(content);
  }

  // Convert message markdown to plain text for note content/title
  function toPlainText(markdown: string): string {
    try {
      const html = renderMarkdown(markdown || "");
      const div = document.createElement("div");
      div.innerHTML = html;
      return (div.textContent || div.innerText || "").trim();
    } catch {
      console.warn("Failed to parse markdown to plain text:", markdown);
      return (markdown || "").trim();
    }
  }

  async function createNoteFromMessage(message: Message) {
    if (!projectStore.currentProject?.id) return;

    try {
      const plain = toPlainText(message.content || "");
      const lines = (plain ?? "").split(/\r?\n/);
      const firstLine =
        lines.find((line) => line.trim().length > 0) || "Chat Note";
      const title =
        firstLine.length > 50 ? firstLine.slice(0, 47) + "..." : firstLine;

      const paragraphs =
        lines.length > 0
          ? lines.map((line) => ({
              type: "paragraph",
              content: line ? [{ type: "text", text: line }] : [],
            }))
          : [{ type: "paragraph", content: [] }];

      const tiptapDoc = {
        type: "doc",
        content: paragraphs,
      } as const;

      const newNote = await notesStore.createNote({
        name: title,
        content: JSON.stringify(tiptapDoc),
        projectId: projectStore.currentProject.id,
        type: "RESEARCH",
        section_type: { value: "Other", label: "Other" },
      });

      if (newNote) {
        navigate(
          `/project/${projectStore.currentProject.id}/notes?tab=research&noteId=${newNote.id}`
        );
      }
    } catch (e) {
      console.error("Failed to create note from message:", e);
      toast.error("Failed to create note", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
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
      const data = await api.get(
        `/chat/history/${projectStore.currentProject.id}`
      );

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
  function handleDeleteSession(sessionId: string, event: MouseEvent) {
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
        (session) => session.chatSessionId !== sessionToDelete
      );

      // If we deleted the current session, clear the chat
      if (currentChatSession === sessionToDelete) {
        messages = [];
        currentChatSession = undefined;
        selectedContextItems = [];
      }

      showDeleteDialog = false;
      sessionToDelete = null;
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session", {
        description: (error as Error).message ?? "Unknown error",
      });
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
      const mappedMessages = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.createdAt),
        sources: msg.metadata?.sources || msg.sources,
      }));
      messages = mappedMessages;
      selectedContextItems = deriveLatestContextSelection(mappedMessages);
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
    selectedContextItems = [];
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
      const userMetadata =
        selectedContextItems.length > 0
          ? { context_selection: selectedContextItems }
          : undefined;
      const userMsg: Message = {
        role: "user" as const,
        content: userMessage,
        timestamp: new Date(),
        ...(userMetadata ? { metadata: userMetadata } : {}),
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
            contextSelection: selectedContextItems.map(
              ({ id, type, title, subtitle, projectId }) => ({
                id,
                type,
                ...(title ? { title } : {}),
                ...(subtitle ? { subtitle } : {}),
                ...(projectId ? { projectId } : {}),
              })
            ),
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
          metadata: {
            project_context: true,
            ...(selectedContextItems.length > 0
              ? { context_selection: selectedContextItems }
              : {}),
          },
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

              let nextSelectedItems: ContextSelectionItem[] | undefined;
              let shouldClearSelection = false;

              messages = messages.map((msg, i) => {
                if (i !== messages.length - 1) {
                  return msg;
                }

                const existingMetadata = msg.metadata || {};
                const mergedSelection = mergeContextSelections(
                  existingMetadata.context_selection,
                  data.context_selection
                );

                const nextMetadata: MessageMetadata = {
                  ...existingMetadata,
                  ...(data.sources ? { sources: data.sources } : {}),
                  ...(Array.isArray(data.tools_used)
                    ? { tools_used: data.tools_used }
                    : {}),
                };

                if (data.project_context !== undefined) {
                  nextMetadata.project_context = data.project_context;
                }

                if (Array.isArray(data.context_selection)) {
                  if (data.context_selection.length === 0) {
                    delete nextMetadata.context_selection;
                    shouldClearSelection = true;
                    nextSelectedItems = [];
                  } else {
                    nextMetadata.context_selection = mergedSelection;
                    nextSelectedItems = mergedSelection;
                  }
                } else if (mergedSelection.length > 0) {
                  nextMetadata.context_selection = mergedSelection;
                }

                return {
                  ...msg,
                  sources: data.sources ?? msg.sources,
                  metadata: nextMetadata,
                };
              });

              if (shouldClearSelection) {
                selectedContextItems = [];
              } else if (nextSelectedItems) {
                selectedContextItems = nextSelectedItems;
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
        },
      });

      // After streaming is complete, remove streaming state
      messages = messages.map((msg, i) =>
        i === messages.length - 1 ? { ...msg, streaming: false } : msg
      );

      // Refresh recent sessions after completion
      await loadRecentSessions();
    } catch (e) {
      // Don't show error for aborted requests
      if (e instanceof Error && e.name === "AbortError") {
        console.log("Chat request was cancelled");
        return;
      }

      error = e instanceof Error ? e.message : "Failed to get response";
      console.error("Chat error:", e);

      // Remove the failed assistant message if it was added
      if (
        messages.length > 0 &&
        messages[messages.length - 1].role === "assistant" &&
        messages[messages.length - 1].streaming
      ) {
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

  function addContextItem(item: ContextSelectionItem) {
    const exists = selectedContextItems.some(
      (existing) => existing.id === item.id && existing.type === item.type
    );
    if (exists) return;
    selectedContextItems = [...selectedContextItems, item];
  }

  function removeContextItem(item: ContextSelectionItem) {
    selectedContextItems = selectedContextItems.filter(
      (existing) => !(existing.id === item.id && existing.type === item.type)
    );
  }

  function clearContextItems() {
    selectedContextItems = [];
  }

  function deriveLatestContextSelection(
    items: Message[] | undefined | null
  ): ContextSelectionItem[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    for (let index = items.length - 1; index >= 0; index -= 1) {
      const selection = items[index]?.metadata?.context_selection;
      if (Array.isArray(selection)) {
        if (selection.length === 0) {
          return [];
        }
        return selection;
      }
    }

    return [];
  }

  function mergeContextSelections(
    existing?: ContextSelectionItem[],
    incoming?: ContextSelectionItem[]
  ): ContextSelectionItem[] {
    const merged = new Map<string, ContextSelectionItem>();

    if (Array.isArray(existing)) {
      for (const item of existing) {
        if (!item?.id || !item?.type) continue;
        merged.set(`${item.type}:${item.id}`, { ...item });
      }
    }

    if (Array.isArray(incoming)) {
      for (const item of incoming) {
        if (!item?.id || !item?.type) continue;
        const key = `${item.type}:${item.id}`;
        const current = merged.get(key);
        if (current) {
          merged.set(key, {
            ...current,
            ...item,
            title: item.title || current.title,
            subtitle: item.subtitle || current.subtitle,
          });
        } else {
          merged.set(key, { ...item });
        }
      }
    }

    return Array.from(merged.values());
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
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("chat.justNow");
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
      case "document_chunk":
        return t("chat.literaturePage");
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  function formatContextItemLabel(item: ContextSelectionItem): string {
    if (item.title && item.title.trim().length > 0) {
      return item.title;
    }
    const shortId = item.id ? `${item.id.slice(0, 6)}…` : "";
    const typeLabel = getTypeLabel(item.type);
    return shortId ? `${typeLabel} (${shortId})` : typeLabel;
  }

  // Transform tool names to friendly display names
  function getFriendlyToolName(toolName: string): string {
    const translatedName = t(`chat.toolNames.${toolName}`);
    // If translation key doesn't exist, fall back to formatted tool name
    if (translatedName === `chat.toolNames.${toolName}`) {
      return toolName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return translatedName;
  }

  // Handle source navigation based on type
  function handleSourceClick(source: Source) {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    let path = "";

    switch (source.type) {
      case "literature":
        path = `/project/${projectId}/literature/${source.id}`;
        break;
      case "document_chunk":
        // Prefer deep linking to the literature item that was created for this document
        if (source.metadata?.literature_id) {
          const qp = new URLSearchParams();
          if (source.metadata?.start_page)
            qp.set("p", String(source.metadata.start_page));
          path = `/project/${projectId}/literature/${source.metadata.literature_id}?${qp.toString()}`;
        } else if (source.metadata?.document_file_id) {
          path = `/project/${projectId}/literature`;
        } else {
          path = `/project/${projectId}/literature`;
        }
        break;
      case "note":
        // Notes don't have detail views, navigate to notes list
        path = `/project/${projectId}/notes`;
        break;
      case "outcome":
        path = `/project/${projectId}/outcomes/${source.id}`;
        break;
      case "project":
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

  function handleSourceKeydown(event: KeyboardEvent, handler: () => void) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
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
</script>

<Card.Root class="flex flex-col h-full border-2 dark:border-dark-border">
  <Card.Header
    class="px-6 py-4 flex w-full justify-between border-b-2 dark:border-dark-border bg-background"
  >
    <div class="flex justify-between items-center gap-3">
      <div class="flex items-center gap-3">
        <div
          class="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
        >
          <Bot class="h-6 w-6 text-white" />
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold">{$_("chat.aiAssistant")}</span>
          <span class="text-sm text-muted-foreground hidden sm:inline">
            · {$_("chat.chatWithResearchData")}
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
          <span class="hidden sm:inline">{$_("chat.history")}</span>
        </Button>
        <Button
          variant="outline"
          onclick={startNewChat}
          class="border-2 dark:border-dark-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(44,46,51,0.1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
        >
          <RefreshCcw class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">{$_("chat.newChat")}</span>
        </Button>
      </div>
    </div>
  </Card.Header>

  <div class="flex-1 overflow-hidden relative">
    <div class="flex h-full">
      <!-- Chat History Sidebar -->
      {#if showHistory}
        <div
          class="w-80 border-r bg-background flex-shrink-0 p-4 overflow-y-auto"
          transition:slide={{ axis: "x" }}
        >
          <div class="space-y-4">
            <div class="flex flex-col gap-2">
              <h3 class="font-semibold text-lg flex items-center gap-2">
                <Folder class="h-5 w-5" />
                {$_("chat.chatHistory")}
              </h3>
              <div class="relative">
                <Search
                  class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder={$_("chat.searchConversations")}
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
                  {searchTerm
                    ? $_("chat.noMatchingConversations")
                    : $_("chat.noPreviousConversations")}
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  {searchTerm
                    ? $_("chat.tryAdjustingSearch")
                    : $_("chat.startNewConversation")}
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
                            $_("chat.chatSession")}
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
                          onclick={(e: MouseEvent) =>
                            handleDeleteSession(session.chatSessionId, e)}
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
                  <div
                    class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4"
                  >
                    <Sparkles class="size-8 text-white" />
                  </div>
                  <h3 class="font-semibold text-lg mb-2">
                    {$_("chat.aiAssistant")}
                  </h3>
                  <p
                    class="text-sm text-muted-foreground mb-6 max-w-md mx-auto"
                  >
                    {$_("chat.welcomeDescription")}
                  </p>
                </div>

                <!-- Research Question Suggestions -->
                <div class="grid gap-3 max-w-2xl mx-auto">
                  {#each getResearchSuggestions() as suggestion}
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
                          <div class="font-medium text-sm">
                            {suggestion.title}
                          </div>
                          <div class="text-xs text-muted-foreground mt-1">
                            {suggestion.description}
                          </div>
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
                  {@const originalIndex = messages.findIndex(
                    (m) => m === message
                  )}
                  {@const showTimestamp = shouldShowTimestamp(originalIndex)}
                  {@const isUser = message.role === "user"}
                  {@const isAssistant = message.role === "assistant"}
                  {@const sources =
                    message.sources || message.metadata?.sources || []}
                  {@const content = message.content}
                  {@const toolsUsed = message.metadata?.tools_used ?? []}
                  {@const hasTools = toolsUsed.length > 0}
                  {@const focusedItems =
                    message.metadata?.context_selection ?? []}
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
                      class="flex gap-3 {isUser
                        ? 'flex-row-reverse'
                        : 'flex-row'}"
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
                          : 'text-left'} group"
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
                                      {sources.length} source{sources.length !==
                                      1
                                        ? "s"
                                        : ""}
                                    {/if}
                                    {#if hasProjectContext && !hasSources && !hasContextFocus}
                                      project context
                                    {/if}
                                  </span>
                                </span>
                                <span class="references-chevron">
                                  <ChevronDown
                                    class="size-4"
                                    aria-hidden="true"
                                  />
                                </span>
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
                                        <Badge
                                          variant="outline"
                                          class="text-xs"
                                        >
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
                                        <Badge
                                          variant="secondary"
                                          class="text-xs"
                                        >
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
                                      <div
                                        role="button"
                                        tabindex="0"
                                        class="w-full border rounded-md p-2 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group text-left"
                                        onclick={() =>
                                          handleSourceClick(source)}
                                        onkeydown={(event) =>
                                          handleSourceKeydown(event, () =>
                                            handleSourceClick(source)
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
                                              >
                                                {getTypeLabel(source.type)}
                                              </Badge>
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
                                            <button
                                              type="button"
                                              class="opacity-0 group-hover:opacity-100 transition-opacity"
                                              onclick={(e: MouseEvent) => {
                                                e.stopPropagation();
                                                openDocumentPreview(
                                                  source.metadata
                                                    .document_file_id,
                                                  source.metadata?.start_page
                                                );
                                              }}
                                              aria-label="Preview document"
                                            >
                                              <ExternalLink
                                                class="size-3 text-muted-foreground"
                                              />
                                            </button>
                                          {/if}
                                        </div>
                                      </div>
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

                        <!-- Hover Actions Below Message -->
                        <div
                          class="mt-1 {isUser
                            ? 'text-right'
                            : 'text-left'} opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              <button
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted"
                                onclick={() => createNoteFromMessage(message)}
                                aria-label="Create as note"
                              >
                                <FilePlus class="h-4 w-4" />
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Create as note</Tooltip.Content>
                          </Tooltip.Root>
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

            {#if isLoading}
              <div
                class="flex items-center gap-2 text-gray-500"
                transition:fade
              >
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
          <div class="p-4 w-full space-y-4">
            <ContextSelector
              selectedItems={selectedContextItems}
              projectId={projectStore.currentProject?.id || null}
              scope="current"
              disabled={isStreaming}
              on:select={(event) => addContextItem(event.detail)}
              on:remove={(event) => removeContextItem(event.detail)}
              on:clear={clearContextItems}
            />

            <div class="relative">
              <!-- Input Container -->
              <div class="flex gap-3">
                <!-- Text Area -->
                <div class="flex-1 relative">
                  <textarea
                    bind:this={chatInputRef}
                    bind:value={chatInput}
                    onkeydown={handleKeydown}
                    oninput={handleInput}
                    placeholder={$_("chat.askAboutResearch")}
                    disabled={isLoading || isStreaming}
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
                <button
                  onclick={handleSubmit}
                  disabled={!chatInput.trim() || isLoading || isStreaming}
                  class="flex items-center justify-center px-4 py-3 h-[48px] min-w-[48px] border-2 dark:border-dark-border bg-blue-500 text-white rounded-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200"
                  aria-label={$_("chat.sendMessage")}
                >
                  {#if isLoading || isStreaming}
                    <Loader class="size-4 animate-spin" />
                  {:else}
                    <Send class="size-4" />
                  {/if}
                </button>
              </div>

              <!-- Input Help Text -->
              <div
                class="flex items-center justify-between mt-2 text-xs text-muted-foreground"
              >
                <div class="flex items-center gap-4">
                  <kbd
                    class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono"
                  >
                    {$_("chat.enter")}
                  </kbd>
                  <span>{$_("chat.enterToSend")}</span>
                  <kbd
                    class="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono"
                  >
                    {$_("chat.shiftEnter")}
                  </kbd>
                  <span>{$_("chat.shiftEnterNewLine")}</span>
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
      <AlertDialog.Title>{$_("chat.deleteChatSession")}</AlertDialog.Title>
      <AlertDialog.Description>
        {$_("chat.deleteChatSessionConfirm")}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>{$_("common.cancel")}</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteSession}
        disabled={isDeleting}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {#if isDeleting}
          <Loader2 class="h-4 w-4 animate-spin mr-2" />
        {/if}
        {$_("chat.deleteSession")}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style lang="postcss">
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

  details.references-panel summary::-webkit-details-marker {
    display: none;
  }

  .references-panel .references-chevron {
    display: inline-flex;
    align-items: center;
    transition: transform 0.2s ease;
  }

  .references-panel[open] .references-chevron {
    transform: rotate(180deg);
  }
</style>

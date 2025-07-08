<script lang="ts">
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { slide, fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import * as Card from "$lib/components/ui/card";
  import {
    MessageSquare,
    History,
    RefreshCcw,
    Bot,
    BookOpen,
    ChevronRight,
    Search,
    Folder,
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { API_BASE_URL } from "$lib/config";

  interface Source {
    type: string;
    id: string;
    title: string;
    similarity: number;
  }

  interface Message {
    id?: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    // sources?: Source[];
    timestamp: Date;
    isStreaming?: boolean;
    metadata?: any;
  }

  interface ChatSession {
    chatSessionId: string;
    createdAt: string;
    messages?: Message[];
  }

  // State
  let messages = $state<Message[]>([]);
  let inputMessage = $state("");
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let chatContainer: HTMLDivElement;
  let isTyping = $state(false);
  let typingTimeout: NodeJS.Timeout;
  let streamingContent = $state("");
  let currentChatSession = $state<string | undefined>(undefined);
  let recentSessions = $state<ChatSession[]>([]);
  let isLoadingHistory = $state(false);
  let showHistory = $state(false);
  let searchTerm = $state("");
  let filteredSessions = $state<ChatSession[]>([]);

  // Load recent chat sessions on mount
  $effect(() => {
    if (projectStore.currentProject?.id) {
      loadRecentSessions();
    }
  });

  // Scroll to bottom when new messages arrive
  $effect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        chatContainer?.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  });

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

  async function loadRecentSessions() {
    if (!projectStore.currentProject?.id) return;

    try {
      isLoadingHistory = true;
      const response = await fetch(
        `${API_BASE_URL}/chat/history/${projectStore.currentProject.id}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to load chat history");

      const data = await response.json();

      // Load first message for each session
      const sessionsWithMessages = await Promise.all(
        data.sessions.map(async (session: ChatSession) => {
          try {
            const messageResponse = await fetch(
              `${API_BASE_URL}/chat/history/${projectStore.currentProject?.id}?sessionId=${session.chatSessionId}`,
              {
                credentials: "include",
              }
            );

            if (messageResponse.ok) {
              const messageData = await messageResponse.json();
              return {
                ...session,
                // Filter out tool messages from history
                messages: messageData.messages.filter(
                  (msg: Message) =>
                    msg.role === "user" || msg.role === "assistant"
                ),
              };
            }
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

  async function loadChatSession(sessionId: string) {
    if (!projectStore.currentProject?.id) return;

    try {
      isLoading = true;
      const response = await fetch(
        `${API_BASE_URL}/chat/history/${projectStore.currentProject.id}?sessionId=${sessionId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to load chat session");

      const data = await response.json();
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

  function formatTime(date: Date): string {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
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

  function handleInput() {
    clearTimeout(typingTimeout);
    isTyping = true;
    typingTimeout = setTimeout(() => {
      isTyping = false;
    }, 1000);
  }

  // Send message and get response
  async function sendMessage(e: Event) {
    e.preventDefault(); // Prevent form submission from refreshing the page
    if (!inputMessage.trim() || !projectStore.currentProject?.id) return;

    isLoading = true;
    error = null;
    isTyping = false;
    streamingContent = "";

    const sessionToUse = currentChatSession;

    // Store the message we're about to send
    const userMessage = inputMessage;
    inputMessage = ""; // Clear input

    try {
      // Add user message immediately to local state
      const userMsg: Message = {
        role: "user" as const,
        content: userMessage,
        timestamp: new Date(),
      };
      messages = [...messages, userMsg];

      const response = await fetch(
        `${API_BASE_URL}/chat${sessionToUse ? `?chatSessionId=${sessionToUse}` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            projectId: projectStore.currentProject.id,
            message: userMessage,
            provider: "openai",
          }),
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
          isStreaming: true,
        },
      ];

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let receivedSessionId = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const content = line.slice(6);
            if (content === "[DONE]") continue;

            try {
              const parsed = JSON.parse(content);

              if (parsed.type === "metadata") {
                if (parsed.chatSessionId && !receivedSessionId) {
                  if (!currentChatSession) {
                    currentChatSession = parsed.chatSessionId;
                  }
                  receivedSessionId = true;
                }
              } else if (parsed.type === "content") {
                streamingContent += parsed.content;

                // Update the last message with the new content and sources
                messages = messages.map((msg, i) => {
                  if (i === messages.length - 1) {
                    // Try to parse any tool response data from the message
                    let toolResults: any[] = [];
                    if (msg.metadata?.tool_call_id) {
                      try {
                        const content = JSON.parse(msg.content);
                        if (content.results && Array.isArray(content.results)) {
                          toolResults = content.results;
                        }
                      } catch (e) {
                      }
                    }

                    return {
                      ...msg,
                      content: streamingContent,
                    };
                  }
                  return msg;
                });
              }
            } catch (e) {
              console.error("Failed to parse chunk:", e);
            }
          }
        }
      }

      // After streaming is complete, add the sources and remove streaming state
      messages = messages.map((msg, i) =>
        i === messages.length - 1 ? { ...msg, isStreaming: false } : msg
      );

      // Refresh recent sessions after completion
      await loadRecentSessions();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to get response";
      console.error("Chat error:", e);
    } finally {
      isLoading = false;
      streamingContent = "";
    }
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
</script>

<Card.Root class="flex flex-col h-full border-2  dark:border-dark-border">
  <Card.Header
    class="px-6 py-4 flex w-full justify-between border-b-2  dark:border-dark-border bg-background"
  >
    <div class="flex justify-between items-center gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
          <Bot class="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold">Dr. Quester</span>
          <span class="text-sm text-muted-foreground hidden sm:inline">
            · Your Research Assistant
          </span>
        </div>
      </div>
      <div>
        <Button
          variant="outline"
          onclick={() => (showHistory = !showHistory)}
          class="border-2  dark:border-dark-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(44,46,51,0.1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all {showHistory
            ? 'bg-secondary'
            : ''}"
        >
          <History class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">History</span>
        </Button>
        <Button
          variant="outline"
          onclick={startNewChat}
          class="border-2  dark:border-dark-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(44,46,51,0.1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
        >
          <RefreshCcw class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">New Chat</span>
        </Button>
      </div>
    </div>
  </Card.Header>

  <div class="flex-1 overflow-hidden relative">
    <div class="flex-1 h-full">
      <div
        bind:this={chatContainer}
        class="chat-container h-full overflow-y-auto space-y-4 scroll-smooth px-4 pt-6 pb-4 relative"
      >
        {#if messages.length === 0}
          <div class="text-center text-gray-500 mt-8" transition:fade>
            <div class="flex flex-col items-center gap-4">
              <div class="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Bot class="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="max-w-sm">
                <h3 class="font-semibold mb-2">Welcome to Dr. Quester!</h3>
                <p class="text-sm">
                  Start a conversation by asking a question about your project.
                  I'm here to help with your research.
                </p>
              </div>
            </div>
          </div>
        {/if}

        {#each messages.filter((msg) => msg.role === "user" || msg.role === "assistant") as message, i (i)}
          {@const showTimestamp = shouldShowTimestamp(i)}
          <div
            class="message-enter message-enter-active"
            animate:flip={{ duration: 300, easing: quintOut }}
            transition:slide|local={{ duration: 200 }}
          >
            {#if showTimestamp}
              <div
                class="text-center text-xs text-gray-500 mb-2"
                transition:fade
              >
                {formatTime(message.timestamp)}
              </div>
            {/if}

            <div
              class="flex flex-col {message.role === 'user'
                ? 'items-end'
                : 'items-start'}"
            >
              <div
                class="group max-w-[80%] rounded-lg p-4 border-2 {message.role ===
                'user'
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : ' dark:border-dark-border bg-background'} transition-all duration-200 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)]"
              >
                <div class="relative">
                  <p class="whitespace-pre-wrap min-h-[1.5em]">
                    {message.content}
                  </p>
                  {#if message.isStreaming}
                    <div
                      class="absolute -right-2 bottom-0 flex gap-1 items-center"
                    >
                      <div
                        class="w-1 h-1 bg-current rounded-full typing-indicator"
                      ></div>
                      <div
                        class="w-1 h-1 bg-current rounded-full typing-indicator"
                      ></div>
                      <div
                        class="w-1 h-1 bg-current rounded-full typing-indicator"
                      ></div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}

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

    {#if showHistory}
      <div
        class="absolute top-0 right-0 h-full w-80 p-4 border-l border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-y-auto z-10 shadow-[-4px_0_16px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_16px_rgba(0,0,0,0.2)]"
        transition:slide|local={{ duration: 200 }}
      >
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
            <div class="text-center text-gray-500 py-4">
              {searchTerm
                ? "No matching conversations"
                : "No previous conversations"}
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
                  <div class="flex items-start gap-3">
                    <div
                      class="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0"
                    >
                      <MessageSquare
                        class="h-4 w-4 text-blue-600 dark:text-blue-400"
                      />
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
                    <ChevronRight class="h-4 w-4 text-gray-500 flex-shrink-0" />
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <Card.Footer class="p-0 border-t border-border bg-card">
    <form
      class="flex gap-2 p-4 w-full"
      onsubmit={(e) => {
        e.preventDefault();
        sendMessage(e);
      }}
    >
      <div class="flex-1 relative">
        <input
          type="text"
          bind:value={inputMessage}
          oninput={handleInput}
          placeholder="Ask a question about your project..."
          class="w-full p-2 pr-16 rounded-lg border-2 dark:border-dark-border bg-background focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-200"
          disabled={isLoading}
        />
        {#if isTyping}
          <div
            class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            transition:fade
          >
            typing...
          </div>
        {/if}
      </div>
      <button
        type="submit"
        disabled={isLoading || !inputMessage.trim()}
        class="px-4 py-2 border-2 dark:border-dark-border bg-blue-500 text-white rounded-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200"
      >
        Send
      </button>
    </form>
  </Card.Footer>
</Card.Root>

<style lang="postcss">
  /* Custom scrollbar */
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

  /* Message animations */
  .message-enter {
    opacity: 0;
    transform: translateY(20px);
  }

  .message-enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Sources drawer animations */
  :global(.sources-drawer-enter) {
    transform: translateX(100%);
  }

  :global(.sources-drawer-enter-active) {
    transform: translateX(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(.sources-drawer-exit) {
    transform: translateX(0);
  }

  :global(.sources-drawer-exit-active) {
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Typing indicator animation */
  @keyframes blink {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(0.8);
    }
    50% {
      opacity: 0.8;
      transform: scale(1);
    }
  }

  .typing-indicator {
    animation: blink 1s infinite;
  }

  .typing-indicator:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator:nth-child(3) {
    animation-delay: 0.4s;
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
</style>

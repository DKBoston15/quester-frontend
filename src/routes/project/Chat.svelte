<script lang="ts">
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { slide, fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import * as Card from "$lib/components/ui/card";
  import { MessageSquare } from "lucide-svelte";

  interface Source {
    type: string;
    id: string;
    title: string;
    similarity: number;
  }

  interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    timestamp: Date;
    isStreaming?: boolean;
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
  let currentSources = $state<Source[] | undefined>(undefined);

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

  function formatTime(date: Date): string {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
  }

  function handleInput() {
    clearTimeout(typingTimeout);
    isTyping = true;
    typingTimeout = setTimeout(() => {
      isTyping = false;
    }, 1000);
  }

  // Send message and get response
  async function sendMessage() {
    if (!inputMessage.trim() || !projectStore.currentProject?.id) return;

    isLoading = true;
    error = null;
    isTyping = false;
    streamingContent = "";
    currentSources = undefined;

    // Add user message immediately
    messages = [
      ...messages,
      {
        role: "user",
        content: inputMessage,
        timestamp: new Date(),
      },
    ];

    const userMessage = inputMessage;
    inputMessage = ""; // Clear input

    try {
      const response = await fetch("http://localhost:3333/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          projectId: projectStore.currentProject.id,
          message: userMessage,
        }),
      });

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

              if (parsed.type === "sources") {
                currentSources = parsed.sources;
              } else if (parsed.type === "content") {
                streamingContent += parsed.content;
                // Update the last message with the new content
                messages = messages.map((msg, i) =>
                  i === messages.length - 1
                    ? { ...msg, content: streamingContent }
                    : msg
                );
              }
            } catch (e) {
              console.error("Failed to parse chunk:", e);
            }
          }
        }
      }

      // After streaming is complete, add the sources and remove streaming state
      messages = messages.map((msg, i) =>
        i === messages.length - 1
          ? { ...msg, sources: currentSources, isStreaming: false }
          : msg
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to get response";
      console.error("Chat error:", e);
    } finally {
      isLoading = false;
      streamingContent = "";
      currentSources = undefined;
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

<Card.Root
  class="flex flex-col h-full border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <Card.Header class="px-6 py-4">
    <Card.Title class="text-xl flex items-center gap-2">
      <MessageSquare class="h-5 w-5" />
      Project Chat
    </Card.Title>
  </Card.Header>

  <div class="flex-1 overflow-hidden p-4">
    <div
      bind:this={chatContainer}
      class="flex-1 overflow-y-auto space-y-4 h-full scroll-smooth pr-2"
    >
      {#if messages.length === 0}
        <div class="text-center text-gray-500 mt-8" transition:fade>
          Start a conversation by asking a question about your project
        </div>
      {/if}

      {#each messages as message, i (i)}
        {@const showTimestamp = shouldShowTimestamp(i)}
        <div
          animate:flip={{ duration: 300, easing: quintOut }}
          transition:slide|local={{ duration: 200 }}
        >
          {#if showTimestamp}
            <div class="text-center text-xs text-gray-500 mb-2" transition:fade>
              {formatTime(message.timestamp)}
            </div>
          {/if}

          <div
            class="flex flex-col {message.role === 'user'
              ? 'items-end'
              : 'items-start'}"
          >
            <div
              class="max-w-[80%] rounded-lg p-4 border-2 {message.role ===
              'user'
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-black dark:border-dark-border bg-background'} transition-all duration-200 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
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
                      class="w-1 h-1 bg-current rounded-full animate-bounce opacity-40"
                    ></div>
                    <div
                      class="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s] opacity-40"
                    ></div>
                    <div
                      class="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s] opacity-40"
                    ></div>
                  </div>
                {/if}
              </div>

              {#if message.sources}
                <div
                  class="mt-2 text-sm border-t pt-2 {message.role === 'user'
                    ? 'border-blue-400'
                    : 'border-gray-300 dark:border-gray-700'}"
                  transition:slide|local={{ duration: 150 }}
                >
                  <p class="font-semibold mb-1">Sources:</p>
                  <ul class="space-y-1">
                    {#each message.sources as source}
                      <li
                        class="flex items-center gap-2 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 rounded p-1 -mx-1"
                        transition:slide|local={{ duration: 150 }}
                      >
                        <span class="capitalize">{source.type}:</span>
                        {#if source.type === "literature"}
                          <a
                            href="/project/{projectStore.currentProject
                              ?.id}/literature/{source.id}"
                            class="truncate hover:underline text-blue-500 dark:text-blue-400 transition-colors {message.role ===
                            'user'
                              ? '!text-white hover:text-blue-100'
                              : ''}"
                          >
                            {source.title}
                          </a>
                        {:else}
                          <span class="truncate">{source.title}</span>
                        {/if}
                        <!-- <span class="text-xs opacity-75">
                          ({Math.round(source.similarity * 100)}% match)
                        </span> -->
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}

      {#if isLoading}
        <div class="flex items-center gap-2 text-gray-500" transition:fade>
          <div
            class="flex items-center gap-2 border-2 border-black dark:border-dark-border px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <div class="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            <div
              class="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]"
            ></div>
            <div
              class="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]"
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

  <Card.Footer class="p-0 border-t border-border bg-card">
    <form
      class="flex gap-2 p-4 w-full"
      onsubmit={(e) => {
        e.preventDefault();
        sendMessage();
      }}
    >
      <div class="flex-1 relative">
        <input
          type="text"
          bind:value={inputMessage}
          oninput={handleInput}
          placeholder="Ask a question about your project..."
          class="w-full p-2 pr-16 rounded-lg border-2 border-black dark:border-dark-border bg-background focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-200"
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
        class="px-4 py-2 border-2 border-black dark:border-dark-border bg-blue-500 text-white rounded-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200"
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
    transition: all 0.1s ease-out;
  }

  /* Typing indicator animation */
  @keyframes blink {
    0%,
    100% {
      opacity: 0.2;
    }
    50% {
      opacity: 0.8;
    }
  }
</style>

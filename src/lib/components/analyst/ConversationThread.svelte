<script lang="ts">
  import { tick } from "svelte";
  import { fade } from "svelte/transition";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import NarrativeBlock from "./blocks/NarrativeBlock.svelte";
  import StepsBlock from "./blocks/StepsBlock.svelte";
  import BlockRenderer from "./BlockRenderer.svelte";
  import SuggestionsBlock from "./blocks/SuggestionsBlock.svelte";
  import User from "lucide-svelte/icons/user";
  import Microscope from "lucide-svelte/icons/microscope";
  import Sparkles from "lucide-svelte/icons/sparkles";
  import Search from "lucide-svelte/icons/search";
  import TrendingUp from "lucide-svelte/icons/trending-up";
  import Lightbulb from "lucide-svelte/icons/lightbulb";
  import Target from "lucide-svelte/icons/target";
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import FilterIcon from "lucide-svelte/icons/filter";
  import { Button } from "$lib/components/ui/button";

  interface Props {
    projectId?: string;
    onSuggestionClick?: (text: string) => void;
  }

  const { projectId, onSuggestionClick }: Props = $props();

  let chatContainer: HTMLDivElement | null = null;

  let messages = $derived(analystStore.messages);
  let isStreaming = $derived(analystStore.isStreaming);
  let streamingNarrative = $derived(analystStore.streamingNarrative);
  let streamingBlocks = $derived(analystStore.streamingBlocks);
  let currentSteps = $derived(analystStore.currentSteps);
  let suggestions = $derived(analystStore.suggestions);
  let hasMoreMessages = $derived(analystStore.hasMoreMessages);
  let isLoadingMore = $derived(analystStore.isLoadingMore);
  let error = $derived(analystStore.error);

  // Auto-scroll on new messages or streaming content
  $effect(() => {
    // Track dependencies
    messages.length;
    streamingNarrative;
    streamingBlocks.length;
    currentSteps.length;

    if (chatContainer) {
      tick().then(() => {
        chatContainer?.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  });

  function handleLoadMore() {
    analystStore.loadMoreMessages();
  }

  const starterSuggestions = [
    {
      icon: Search,
      title: "Summarize my research collection",
      description: "Get an overview of your literature and key themes",
    },
    {
      icon: TrendingUp,
      title: "What are the publication trends by year?",
      description: "Analyze how your research spans across time",
    },
    {
      icon: Lightbulb,
      title: "Which authors appear most frequently?",
      description: "Identify the most cited researchers in your project",
    },
    {
      icon: Target,
      title: "Break down my research by methodology",
      description: "Analyze the research designs used across studies",
    },
  ];
</script>

<div class="flex-1 overflow-y-auto" bind:this={chatContainer}>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
    {#if messages.length === 0 && !isStreaming}
      <!-- Empty State -->
      <div class="text-center py-12">
        <div class="mb-6">
          <div
            class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-4"
          >
            <Sparkles class="size-8 text-white" />
          </div>
          <h3 class="font-semibold text-lg mb-2">Research Analyst</h3>
          <p class="text-sm text-muted-foreground max-w-md mx-auto">
            Ask questions about your research data. I can analyze your
            literature, create charts and tables, and uncover patterns.
          </p>
        </div>

        <div class="grid gap-3 max-w-2xl mx-auto">
          {#each starterSuggestions as suggestion}
            {@const Icon = suggestion.icon}
            <Button
              variant="outline"
              size="sm"
              class="text-left justify-start p-4 h-auto hover:bg-muted/50 group"
              onclick={() => onSuggestionClick?.(suggestion.title)}
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
      </div>
    {:else}
      <!-- Load More -->
      {#if hasMoreMessages}
        <div class="text-center">
          <Button
            variant="ghost"
            size="sm"
            onclick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load older messages"}
          </Button>
        </div>
      {/if}

      <!-- Message List -->
      {#each messages as message (message.id)}
        <div
          class="message-entry"
          id={`analysis-message-${message.id}`}
          data-analysis-message-id={message.id}
          transition:fade={{ duration: 150 }}
        >
          {#if message.role === "user"}
            <!-- User Message -->
            <div class="flex gap-3 justify-end">
              <div class="max-w-[80%]">
                <div
                  class="inline-block rounded-2xl px-4 py-3 bg-primary text-primary-foreground"
                >
                  <p class="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {#if message.metadata?.literatureScope && message.metadata.literatureScope.length > 0}
                  <div class="flex justify-end mt-1">
                    <span class="text-[10px] text-muted-foreground flex items-center gap-1">
                      <FilterIcon class="h-2.5 w-2.5" />
                      Focused on {message.metadata.literatureScope.length} article{message.metadata.literatureScope.length === 1 ? "" : "s"}
                    </span>
                  </div>
                {/if}
              </div>
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground"
                >
                  <User class="size-4" />
                </div>
              </div>
            </div>
          {:else}
            <!-- Assistant Message -->
            <div class="flex gap-3">
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                >
                  <Microscope class="size-4" />
                </div>
              </div>
              <div class="flex-1 min-w-0 space-y-3">
                <!-- Persisted steps -->
                {#if message.metadata?.steps && message.metadata.steps.length > 0}
                  <StepsBlock steps={message.metadata.steps} collapsed={true} />
                {/if}

                <!-- Narrative -->
                {#if message.content}
                  <NarrativeBlock content={message.content} streaming={false} />
                {/if}

                <!-- Blocks -->
                {#each message.blocks as block (block.id)}
                  <BlockRenderer {block} {projectId} messageId={message.id} />
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}

      <!-- Streaming Assistant Message -->
      {#if isStreaming}
        <div class="flex gap-3" transition:fade={{ duration: 150 }}>
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            >
              <Microscope class="size-4" />
            </div>
          </div>
          <div class="flex-1 min-w-0 space-y-3">
            <!-- Live steps -->
            {#if currentSteps.length > 0}
              <StepsBlock steps={currentSteps} collapsed={false} />
            {/if}

            <!-- Streaming narrative -->
            {#if streamingNarrative}
              <NarrativeBlock
                content={streamingNarrative}
                streaming={true}
              />
            {/if}

            <!-- Streaming blocks -->
            {#each streamingBlocks as block (block.id)}
              <BlockRenderer {block} />
            {/each}

            <!-- Streaming indicator when no content yet -->
            {#if !streamingNarrative && currentSteps.length === 0}
              <div class="flex items-center gap-2 text-muted-foreground text-sm">
                <div class="flex gap-1">
                  <span class="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>
                  <span class="w-1.5 h-1.5 bg-current rounded-full animate-pulse" style="animation-delay: 0.2s;"></span>
                  <span class="w-1.5 h-1.5 bg-current rounded-full animate-pulse" style="animation-delay: 0.4s;"></span>
                </div>
                <span>Analyzing...</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Error -->
      {#if error && !isStreaming}
        <div class="flex gap-3" transition:fade={{ duration: 150 }}>
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/10 text-destructive"
            >
              <AlertCircle class="size-4" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p class="text-sm text-destructive">{error}</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Suggestions -->
      {#if suggestions.length > 0 && !isStreaming}
        <SuggestionsBlock
          items={suggestions}
          onClick={(text) => onSuggestionClick?.(text)}
        />
      {/if}
    {/if}
  </div>
</div>

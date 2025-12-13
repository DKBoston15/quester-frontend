<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Badge } from '$lib/components/ui/badge';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { DiscussionMessage, SourceUsed } from '$lib/stores/CommandCenterStore.svelte';
  import { MessageSquare, Send, FileOutput, X, ChevronRight, Loader2 } from 'lucide-svelte';

  interface Props {
    messages: DiscussionMessage[];
    isStreaming: boolean;
    isExtracting?: boolean;
    streamingContent: string;
    sourcesUsed: SourceUsed[];
    projectId: string;
    onSendFollowup: (query: string) => void;
    onExtractArtifact: () => void;
    onClose: () => void;
  }

  let {
    messages,
    isStreaming,
    isExtracting = false,
    streamingContent,
    sourcesUsed,
    projectId,
    onSendFollowup,
    onExtractArtifact,
    onClose,
  }: Props = $props();

  let followUpQuery = $state('');

  function handleFollowUp() {
    if (!followUpQuery.trim() || isStreaming) return;
    onSendFollowup(followUpQuery.trim());
    followUpQuery = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  }

  // Get the last assistant message's sources
  let lastSources = $derived(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    return lastAssistant?.sourcesUsed || sourcesUsed || [];
  });

  // Check if we have enough content to potentially extract an artifact
  let canExtract = $derived(messages.filter(m => m.role === 'assistant').length > 0);
</script>

<Card.Root class="mb-6 border-violet-500/30">
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-violet-500/10">
          <MessageSquare class="h-4 w-4 text-violet-500" />
        </div>
        <Card.Title class="text-lg">Discussion</Card.Title>
        {#if messages.length > 0}
          <Badge variant="secondary" class="text-xs">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Badge>
        {/if}
      </div>
      <Button variant="ghost" size="sm" onclick={onClose} class="h-8 w-8 p-0">
        <X class="h-4 w-4" />
      </Button>
    </div>
  </Card.Header>

  <Card.Content>
    <!-- Message History -->
    <div class="max-h-96 overflow-y-auto pr-2">
      <div class="space-y-4 mb-4">
        {#each messages as message (message.id)}
          <div class={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              class={`max-w-[85%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p class="text-sm whitespace-pre-wrap">{message.content}</p>
              {#if message.role === 'assistant' && message.sourcesUsed && message.sourcesUsed.length > 0}
                <div class="mt-2 pt-2 border-t border-border/50">
                  <p class="text-xs text-muted-foreground mb-1">Sources used:</p>
                  <div class="flex flex-wrap gap-1">
                    {#each message.sourcesUsed.slice(0, 5) as source}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <Badge variant="outline" class="text-[10px] cursor-help">
                            {source.title.substring(0, 20)}{source.title.length > 20 ? '...' : ''}
                          </Badge>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <p class="font-medium">{source.title}</p>
                          {#if source.authors}
                            <p class="text-xs text-muted-foreground">{source.authors}</p>
                          {/if}
                        </Tooltip.Content>
                      </Tooltip.Root>
                    {/each}
                    {#if message.sourcesUsed.length > 5}
                      <Badge variant="outline" class="text-[10px]">
                        +{message.sourcesUsed.length - 5} more
                      </Badge>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}

        <!-- Streaming indicator -->
        {#if isStreaming}
          <div class="flex justify-start">
            <div class="max-w-[85%] p-3 rounded-lg bg-muted">
              {#if streamingContent}
                <p class="text-sm whitespace-pre-wrap">{streamingContent}</p>
              {:else}
                <div class="flex items-center gap-2 text-muted-foreground">
                  <Loader2 class="h-4 w-4 animate-spin" />
                  <span class="text-sm">Thinking...</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Follow-up Input -->
    <div class="flex gap-2 mb-4">
      <Input
        bind:value={followUpQuery}
        placeholder="Ask a follow-up question..."
        disabled={isStreaming}
        onkeydown={handleKeydown}
        class="flex-1"
      />
      <Button
        onclick={handleFollowUp}
        disabled={!followUpQuery.trim() || isStreaming}
        size="sm"
      >
        <Send class="h-4 w-4" />
      </Button>
    </div>

    <!-- Footer Actions -->
    <div class="flex items-center justify-between pt-3 border-t">
      <div class="text-xs text-muted-foreground">
        {#if lastSources().length > 0}
          {lastSources().length} source{lastSources().length !== 1 ? 's' : ''} referenced
        {:else}
          No sources referenced yet
        {/if}
      </div>

      {#if canExtract}
        <Button
          variant="outline"
          size="sm"
          onclick={onExtractArtifact}
          disabled={isStreaming || isExtracting}
          class="gap-2"
        >
          {#if isExtracting}
            <Loader2 class="h-4 w-4 animate-spin" />
            Extracting...
          {:else}
            <FileOutput class="h-4 w-4" />
            Extract as Artifact
          {/if}
        </Button>
      {/if}
    </div>
  </Card.Content>
</Card.Root>

<script lang="ts">
  import { onMount } from "svelte";
  import Send from "lucide-svelte/icons/send";
  import Square from "lucide-svelte/icons/square";

  interface Props {
    onSend: (message: string) => void;
    onAbort: () => void;
    isStreaming: boolean;
  }

  const { onSend, onAbort, isStreaming }: Props = $props();
  const MAX_MESSAGE_LENGTH = 4000;

  let input = $state("");
  let textareaRef: HTMLTextAreaElement | null = null;
  let isTooLong = $derived(input.length > MAX_MESSAGE_LENGTH);

  onMount(() => {
    textareaRef?.focus();
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || isTooLong) return;
    input = "";
    onSend(trimmed);
    textareaRef?.focus();
  }
</script>

<div class="max-w-3xl mx-auto w-full">
  <div class="flex gap-3">
    <div class="flex-1 relative">
      <textarea
        bind:this={textareaRef}
        bind:value={input}
        onkeydown={handleKeydown}
        placeholder="Ask about your research data..."
        disabled={isStreaming}
        maxlength={MAX_MESSAGE_LENGTH}
        rows="1"
        class="w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] max-h-32 overflow-y-auto"
        style="field-sizing: content;"
      ></textarea>

      {#if input.length > 500 || isTooLong}
        <div class="absolute -top-5 right-0 text-xs {isTooLong ? 'text-destructive' : 'text-muted-foreground'}">
          {input.length}/4000
        </div>
      {/if}
    </div>

    {#if isStreaming}
      <button
        onclick={onAbort}
        class="flex items-center justify-center px-4 py-3 h-[48px] min-w-[48px] bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
        aria-label="Stop generation"
      >
        <Square class="size-4" />
      </button>
    {:else}
      <button
        onclick={handleSubmit}
        disabled={!input.trim() || isTooLong}
        class="flex items-center justify-center px-4 py-3 h-[48px] min-w-[48px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Send message"
      >
        <Send class="size-4" />
      </button>
    {/if}
  </div>

  <div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
    <span>
      <kbd class="inline-flex rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
      to send
    </span>
    <span>
      <kbd class="inline-flex rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Shift+Enter</kbd>
      new line
    </span>
  </div>
</div>

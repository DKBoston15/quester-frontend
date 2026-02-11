<script lang="ts">
  import type { SuggestionItem } from "$lib/types/analysis";
  import Sparkles from "lucide-svelte/icons/sparkles";

  interface Props {
    items: SuggestionItem[];
    onClick?: (text: string) => void;
  }

  const { items, onClick }: Props = $props();
</script>

<div class="flex flex-wrap gap-2 pt-2">
  {#each items as suggestion}
    <button
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background text-sm hover:bg-muted/50 transition-colors"
      onclick={() => onClick?.(suggestion.text)}
    >
      <Sparkles class="size-3 text-muted-foreground" />
      {suggestion.text}
    </button>
  {/each}
</div>

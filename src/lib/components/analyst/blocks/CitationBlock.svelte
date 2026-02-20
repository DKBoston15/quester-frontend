<script lang="ts">
  import type { CitationBlock as CitationBlockType } from "$lib/types/analysis";
  import BookOpen from "lucide-svelte/icons/book-open";
  import Copy from "lucide-svelte/icons/copy";
  import Check from "lucide-svelte/icons/check";
  import ExternalLink from "lucide-svelte/icons/external-link";

  interface Props {
    block: CitationBlockType;
  }

  const { block }: Props = $props();

  let copiedIndex = $state<number | null>(null);

  async function copyToClipboard(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      copiedIndex = index;
      setTimeout(() => {
        copiedIndex = null;
      }, 2000);
    } catch {
      // Clipboard API may not be available
    }
  }
</script>

<div class="rounded-lg border bg-card overflow-hidden">
  <div class="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
    <BookOpen class="size-4 text-muted-foreground" />
    <h4 class="text-sm font-medium">Citations</h4>
    <span class="text-xs text-muted-foreground ml-auto">
      {block.citations.length} reference{block.citations.length !== 1
        ? "s"
        : ""}
    </span>
  </div>

  <ul class="divide-y">
    {#each block.citations as citation, i}
      <li class="px-4 py-3 flex items-start gap-3 group">
        <div class="flex-1 text-sm leading-relaxed">
          <p>{citation.formatted}</p>
          {#if citation.style}
            <span
              class="text-xs text-muted-foreground mt-1 inline-block"
            >
              {citation.style}
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            onclick={() => copyToClipboard(citation.formatted, i)}
            title="Copy citation"
          >
            {#if copiedIndex === i}
              <Check class="size-3.5 text-green-500" />
            {:else}
              <Copy class="size-3.5" />
            {/if}
          </button>
          {#if citation.literatureId}
            <a
              href="/project/{citation.literatureId}/literature"
              class="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              title="View in library"
            >
              <ExternalLink class="size-3.5" />
            </a>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</div>

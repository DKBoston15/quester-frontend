<!-- src/lib/components/custom-ui/literature/export/ReferencePreview.svelte -->
<script lang="ts">
  import type { Literature } from "$lib/types/literature";
  import type { CitationStyle } from "$lib/utils/citationFormatters";
  import { formatCitation } from "$lib/utils/citationFormatters";
  import {
    compileBibliography,
    estimatePageCount,
  } from "$lib/utils/bibliographyUtils";
  import { Card } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { FileText, Clock } from "lucide-svelte";

  interface Props {
    literature: Literature[];
    citationStyle: CitationStyle;
    internalSelectedIds?: Set<string>;
    onToggleReference?: (literature: Literature) => void;
  }

  let {
    literature,
    citationStyle,
    internalSelectedIds,
    onToggleReference,
  }: Props = $props();

  // Simple state-based approach
  let formattedCitations = $state<
    Array<{ literature: Literature; formatted: string }>
  >([]);
  let pageCount = $state(0);
  let wordCount = $state(0);

  // Update citations when literature or style changes
  function updateCitations() {
    if (!literature || !Array.isArray(literature) || literature.length === 0) {
      formattedCitations = [];
      pageCount = 0;
      wordCount = 0;
      return;
    }

    try {
      // Compile and sort literature
      const compiledLiterature = compileBibliography(literature, {
        sortBy: "author",
        sortOrder: "asc",
      });

      // Format citations with the current style
      const citations = compiledLiterature.map((item) => ({
        literature: item,
        formatted: formatCitation(item, citationStyle),
      }));

      formattedCitations = citations;
      pageCount = estimatePageCount(literature.length, 3, 25);

      // Calculate word count
      if (citations.length > 0) {
        const text = citations
          .map((c) => c.formatted.replace(/<[^>]*>/g, ""))
          .join(" ");
        wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
      } else {
        wordCount = 0;
      }
    } catch (error) {
      console.error("Error in processing literature:", error);
      formattedCitations = [];
      pageCount = 0;
      wordCount = 0;
    }
  }

  // Single effect that watches both literature and citationStyle
  $effect(() => {
    // Read both dependencies
    const currentLiterature = literature;
    const currentStyle = citationStyle;

    // Update citations when either changes
    updateCitations();
  });
</script>

<Card class="h-full flex flex-col">
  <div class="p-4 border-b">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Bibliography Preview</h3>
      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <div class="flex items-center gap-1">
          <FileText class="h-4 w-4" />
          <span>~{pageCount} page{pageCount !== 1 ? "s" : ""}</span>
        </div>
        <div class="flex items-center gap-1">
          <Clock class="h-4 w-4" />
          <span>{wordCount} words</span>
        </div>
        <Badge variant="outline">{citationStyle} Style</Badge>
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto p-6 min-h-0">
    <div id="reference-preview-content" class="space-y-4">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold mb-2">Bibliography</h1>
        <p class="text-muted-foreground">
          Generated on {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {#if formattedCitations.length === 0}
        <div class="text-center py-12 text-muted-foreground">
          <FileText class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p class="text-lg font-medium">No references selected</p>
          <p class="text-sm">
            Select some literature items to see the bibliography preview
          </p>
        </div>
      {:else}
        <div class="prose prose-sm max-w-none">
          <div class="space-y-6">
            {#each formattedCitations as citationItem, index}
              {@const isSelected =
                !internalSelectedIds ||
                !citationItem.literature.id ||
                internalSelectedIds.has(citationItem.literature.id)}
              <div
                class="reference-item border-l-2 border-muted pl-4 py-2 flex items-center"
              >
                <!-- Checkbox and citation -->
                <div class="flex items-start gap-3">
                  {#if internalSelectedIds && onToggleReference && citationItem.literature.id}
                    <label
                      class="flex items-center mt-1 cursor-pointer text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onchange={() =>
                          onToggleReference?.(citationItem.literature)}
                        class="h-4 w-4 text-primary border-2 border-input rounded focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer bg-background"
                      />
                    </label>
                  {/if}

                  <div
                    class="flex-1 transition-opacity duration-200 {isSelected
                      ? 'opacity-100'
                      : 'opacity-40'}"
                  >
                    <div
                      class="citation-text leading-relaxed text-black dark:text-white"
                    >
                      {@html citationItem.formatted}
                    </div>
                    {#if citationItem.literature.doi}
                      <div class="text-xs text-muted-foreground mt-1">
                        DOI: {citationItem.literature.doi}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if formattedCitations.length > 0}
    <div class="p-4 border-t bg-muted/30">
      <div
        class="flex items-center justify-between text-sm text-muted-foreground"
      >
        <span
          >Total: {formattedCitations.length} reference{formattedCitations.length !==
          1
            ? "s"
            : ""}</span
        >
        <span>Sorted alphabetically by author</span>
      </div>
    </div>
  {/if}
</Card>

<style>
  :global(.reference-item .citation-text) {
    line-height: 1.6;
    text-align: justify;
  }

  :global(.reference-item .citation-text a) {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-decoration-color: hsl(var(--primary) / 0.5);
  }

  :global(.reference-item .citation-text a:hover) {
    text-decoration-color: hsl(var(--primary));
  }

  :global(.reference-item .citation-text i) {
    font-style: italic;
  }

  :global(.reference-item .citation-text em) {
    font-style: italic;
  }

  /* Print styles for when this gets exported */
  @media print {
    :global(.reference-item) {
      break-inside: avoid;
      margin-bottom: 1rem;
    }

    :global(.reference-item .citation-text) {
      line-height: 1.5;
    }
  }
</style>

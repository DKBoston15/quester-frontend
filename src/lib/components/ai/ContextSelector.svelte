<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { onDestroy } from "svelte";
  import { debounce } from "$lib/utils/debounce";
  import { api } from "$lib/services/api-client";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import Loader2 from "lucide-svelte/icons/loader-2";
  import PlusCircle from "lucide-svelte/icons/plus-circle";
  import XCircle from "lucide-svelte/icons/x-circle";
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import type {
    ContextSelectionItem,
    ContextResourceType,
  } from "$lib/types/context";

  interface RawSearchResult {
    id: string;
    type: string;
    title: string;
    snippet?: string;
    metadata?: Record<string, any>;
    projectInfo?: {
      id: string;
      name: string;
    } | null;
    content?: {
      id?: string;
      documentFileId?: string | null;
      documentFile?: {
        id?: string;
      } | null;
      literatureId?: string | null;
    } | null;
  }

  const MIN_QUERY_LENGTH = 2;
  const SEARCH_DEBOUNCE_MS = 300;

  export let selectedItems: ContextSelectionItem[] = [];
  export let projectId: string | null = null;
  export let scope: "current" | "all" = "current";
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    select: ContextSelectionItem;
    remove: ContextSelectionItem;
    clear: void;
  }>();

  let query = "";
  let lastExecutedQuery = "";
  let isSearching = false;
  let searchError: string | null = null;
  let results: ContextSelectionItem[] = [];

  const abortController = new AbortController();

  function getDedupKey(item: ContextSelectionItem): string {
    const normalize = (value: unknown) =>
      typeof value === "string" ? value.toLowerCase().trim() : value ? String(value) : "";

    // Helper function to clean titles by removing chunk count information
    const cleanTitle = (title: string): string => {
      return title.replace(/\s*\(\d+\s+(chunks?|sections?)\)\s*$/i, "").trim();
    };

    if (item.type === "literature") {
      // For literature, ALWAYS use cleaned title for deduplication
      // This ensures same literature with different IDs gets merged
      const title = item.metadata?.literature_name || item.metadata?.document_name || item.title;
      return `literature:${normalize(cleanTitle(String(title)))}`;
    }

    if (item.type === "document") {
      // For documents, prefer title-based deduplication as well
      // since same document might have different IDs from different contexts
      const title = item.metadata?.document_name || item.title;
      return `document:${normalize(cleanTitle(String(title)))}`;
    }

    if (item.type === "project") {
      return `project:${item.id}`;
    }

    // For other types, use type and ID
    return `${item.type}:${item.id}`;
  }

  function extractProjectId(item: ContextSelectionItem): string | null {
    const meta = item.metadata || {};
    const direct = item.projectId || meta.projectId || meta.project_id;
    if (direct) return String(direct);

    const fromInfo =
      meta.projectInfo?.id ||
      meta.project_info?.id ||
      meta.project?.id ||
      meta.projectId;

    if (fromInfo) return String(fromInfo);

    return null;
  }

  function isInCurrentProject(item: ContextSelectionItem, currentProjectId: string) {
    if (item.type === "project") {
      return item.id === currentProjectId;
    }

    const inferredId = extractProjectId(item);
    if (!inferredId) {
      return true;
    }

    return inferredId === currentProjectId;
  }

  const performSearch = debounce(async (value: string) => {
    if (disabled) return;

    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      results = [];
      searchError = null;
      return;
    }

    if (scope === "current" && !projectId) {
      searchError = "Select a project to target the assistant context.";
      results = [];
      return;
    }

    lastExecutedQuery = trimmed;
    isSearching = true;
    searchError = null;

    try {
      const response = await api.post<{ results: RawSearchResult[] }>(
        "/search",
        {
          query: trimmed,
          mode: "search",
          projectId,
          scope,
          contentTypes: [
            "literature",
            "note",
            "outcome",
            "model",
            "keyword_analysis",
            "project",
            "document_chunk",
          ],
          limit: 15,
        },
        {
          signal: abortController.signal,
          expectedContentType: "json",
        }
      );

      const mapped = (response?.results || [])
        .map(mapResultToContextItem)
        .filter((item): item is ContextSelectionItem => Boolean(item));

      // Enhanced deduplication that merges entries with same key
      const dedupMap = new Map<string, ContextSelectionItem>();

      for (const item of mapped) {
        const key = getDedupKey(item);
        const existing = dedupMap.get(key);

        if (existing) {
          // Extract chunk counts for aggregation
          const getChunkCount = (title: string, metadata: any): number => {
            // Try to get chunk count from metadata first
            if (metadata?.chunkCount && typeof metadata.chunkCount === 'number') {
              return metadata.chunkCount;
            }
            // Extract from title as fallback
            const match = title.match(/\((\d+)\s+chunks?\)/i);
            return match ? parseInt(match[1], 10) : 0;
          };

          const existingChunks = getChunkCount(existing.title, existing.metadata);
          const newChunks = getChunkCount(item.title, item.metadata);
          const totalChunks = existingChunks + newChunks;

          // Get clean title for merging
          const cleanTitle = (title: string): string => {
            return title.replace(/\s*\(\d+\s+(chunks?|sections?)\)\s*$/i, "").trim();
          };

          const baseTitle = cleanTitle(existing.title) || cleanTitle(item.title);
          const finalTitle = totalChunks > 0 ? `${baseTitle} (${totalChunks} chunks)` : baseTitle;

          // Merge items intelligently
          const merged: ContextSelectionItem = {
            ...existing,
            // Use merged title with aggregated chunk count
            title: finalTitle,
            // Merge metadata, preferring non-empty values and aggregating chunk counts
            metadata: {
              ...existing.metadata,
              ...item.metadata,
              chunkCount: totalChunks || item.metadata?.chunkCount || existing.metadata?.chunkCount,
              // Preserve citation from whichever item has it
              citation: item.metadata?.citation || existing.metadata?.citation,
            },
            // Use the better subtitle (prefer the one with citation info)
            subtitle: (item.subtitle && item.subtitle.includes('('))
              ? item.subtitle
              : existing.subtitle
              ? existing.subtitle
              : item.subtitle,
            // Keep the first valid ID encountered
            id: existing.id || item.id,
          };
          dedupMap.set(key, merged);
        } else {
          dedupMap.set(key, item);
        }
      }

      const deduped = Array.from(dedupMap.values());

      const scopedResults =
        scope === "current" && projectId
          ? deduped.filter((item) => isInCurrentProject(item, projectId))
          : deduped;

      results = scopedResults.filter((item) => item.type !== "document_chunk");
    } catch (error) {
      console.error("Context search failed", error);
      searchError =
        error instanceof Error
          ? error.message
          : "Failed to load context suggestions";
      results = [];
    } finally {
      isSearching = false;
    }
  }, SEARCH_DEBOUNCE_MS);

  onDestroy(() => {
    abortController.abort();
  });

  $: if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    if (query.length === 0) {
      results = [];
      searchError = null;
    }
  } else if (query.trim() !== lastExecutedQuery) {
    performSearch(query);
  }

  function mapResultToContextItem(
    result: RawSearchResult
  ): ContextSelectionItem | null {
    const baseMetadata = {
      ...result.metadata,
      projectInfo: result.projectInfo || undefined,
    };

    switch (result.type) {
      case "literature":
        // Check if this is a grouped document result
        const chunkInfo = result.metadata?.chunkCount
          ? ` (${result.metadata.chunkCount} chunks)`
          : "";
        return {
          id: result.id,
          type: "literature",
          title: result.title + chunkInfo,
          subtitle: result.metadata?.citation || result.snippet,
          projectId: result.projectInfo?.id,
          metadata: baseMetadata,
        };
      case "document":
        // Handle grouped document chunks
        const docChunkInfo = result.metadata?.chunkCount
          ? ` (${result.metadata.chunkCount} sections)`
          : "";
        return {
          id: result.id,
          type: "document",
          title: result.title + docChunkInfo,
          subtitle: result.snippet || "Document",
          projectId: result.projectInfo?.id,
          metadata: baseMetadata,
        };
      case "note":
      case "outcome":
      case "model":
      case "keyword_analysis":
        return {
          id: result.id,
          type: result.type as ContextResourceType,
          title: result.title,
          subtitle: result.snippet,
          projectId: result.projectInfo?.id,
          metadata: baseMetadata,
        };
      case "project":
        return {
          id: result.id,
          type: "project",
          title: result.title,
          subtitle: result.projectInfo?.name || "Project context",
          projectId: result.id,
          metadata: baseMetadata,
        };
      case "document_chunk": {
        // This case should be rare now that backend groups chunks
        // But handle it for backwards compatibility
        const rawMetadata = result.metadata || {};
        const rawContent = result.content || {};

        const literatureId = rawMetadata.literature_id || rawContent.literatureId;
        if (literatureId) {
          return {
            id: literatureId,
            type: "literature",
            title:
              rawMetadata.literature_name ||
              rawMetadata.document_name ||
              result.title,
            subtitle: rawMetadata.pages
              ? `Pages ${rawMetadata.pages}`
              : "Document section",
            projectId: result.projectInfo?.id,
            metadata: baseMetadata,
          };
        }

        const resolvedDocumentId =
          rawMetadata.document_file_id ||
          rawMetadata.document_id ||
          rawMetadata.documentFileId ||
          rawMetadata.documentFile_id ||
          rawContent.documentFileId ||
          rawContent.documentFile?.id;
        if (resolvedDocumentId) {
          return {
            id: String(resolvedDocumentId),
            type: "document",
            title:
              rawMetadata.document_name ||
              rawMetadata.literature_name ||
              result.title,
            subtitle: rawMetadata.pages
              ? `Pages ${rawMetadata.pages}`
              : "Document section",
            projectId: result.projectInfo?.id,
            metadata: baseMetadata,
          };
        }

        // If no parent found, skip this chunk
        return null;
      }
      default:
        return null;
    }
  }

  function isSelected(item: ContextSelectionItem) {
    return selectedItems.some(
      (existing) => existing.id === item.id && existing.type === item.type
    );
  }

  function handleSelect(item: ContextSelectionItem) {
    if (disabled || isSelected(item)) return;
    dispatch("select", item);
    query = "";
    results = [];
  }

  function handleRemove(item: ContextSelectionItem) {
    if (disabled) return;
    dispatch("remove", item);
  }

  function handleClear() {
    if (disabled) return;
    dispatch("clear");
  }

  function getTypeLabel(type: ContextResourceType): string {
    switch (type) {
      case "literature":
        return "Literature";
      case "note":
        return "Note";
      case "outcome":
        return "Outcome";
      case "model":
        return "Model";
      case "keyword_analysis":
        return "Keyword Analysis";
      case "document":
        return "Document";
      case "document_chunk":
        return "Document Chunk";
      case "project":
        return "Project";
      default:
        return type;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm font-semibold">Context Focus</p>
      <p class="text-xs text-muted-foreground">
        Select specific items to anchor the assistant's context. The assistant will
        still keep lightweight project metadata.
      </p>
    </div>
    {#if selectedItems.length > 0}
      <Button
        variant="ghost"
        size="sm"
        class="text-xs"
        onclick={handleClear}
        disabled={disabled}
      >
        Clear
      </Button>
    {/if}
  </div>

  <div class="flex flex-wrap gap-2">
    {#if selectedItems.length === 0}
      <span class="text-xs text-muted-foreground">
        No context items selected. The assistant will consider the broader project content.
      </span>
    {:else}
      {#each selectedItems as item (item.type + item.id)}
        <Badge
          variant="secondary"
          class="flex items-center gap-1 text-xs">
          <span class="font-medium">{item.title}</span>
          <span class="text-muted-foreground">· {getTypeLabel(item.type)}</span>
          <button
            class="ml-1 inline-flex items-center"
            onclick={() => handleRemove(item)}
            disabled={disabled}
            aria-label={`Remove ${item.title} from context`}
          >
            <XCircle class="size-3" />
          </button>
        </Badge>
      {/each}
    {/if}
  </div>

  <div class="space-y-2">
    <input
      type="text"
      class="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      placeholder={scope === "all"
        ? "Search items across accessible projects"
        : "Search this project for notes, literature, outcomes..."}
      bind:value={query}
      disabled={disabled || (scope === "current" && !projectId)}
    />

    {#if scope === "current" && !projectId}
      <div class="flex items-center gap-2 rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        <AlertCircle class="size-3" />
        Choose a project to target context selections.
      </div>
    {/if}

    {#if isSearching}
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 class="size-3 animate-spin" />
        Searching…
      </div>
    {:else if searchError}
      <div class="flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle class="size-3" />
        {searchError}
      </div>
    {:else if query.trim().length >= MIN_QUERY_LENGTH && results.length === 0}
      <div class="text-xs text-muted-foreground">
        No matching items yet. Try another search term.
      </div>
    {:else if results.length > 0}
      <div class="space-y-2">
        {#each results as item (item.type + item.id)}
          <button
            class="w-full rounded border border-border px-3 py-2 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            onclick={() => handleSelect(item)}
            disabled={disabled || isSelected(item)}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <p class="text-sm font-semibold">{item.title}</p>
                {#if item.subtitle}
                  <p class="text-xs text-muted-foreground">{item.subtitle}</p>
                {/if}
              </div>
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="text-[10px]">
                  {getTypeLabel(item.type)}
                </Badge>
                {#if isSelected(item)}
                  <Badge variant="secondary" class="text-[10px]">Selected</Badge>
                {:else}
                  <PlusCircle class="size-4 text-muted-foreground" />
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  button[disabled] svg {
    opacity: 0.5;
  }
</style>

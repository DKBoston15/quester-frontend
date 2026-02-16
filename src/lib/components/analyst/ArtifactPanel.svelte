<script lang="ts">
  import { tick } from "svelte";
  import { slide } from "svelte/transition";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import {
    listArtifacts,
    deleteArtifact,
    updateArtifact,
  } from "$lib/services/analysis-api";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import type { AnalysisArtifact } from "$lib/types/analysis";
  import BookmarkCheck from "lucide-svelte/icons/bookmark-check";
  import Pin from "lucide-svelte/icons/pin";
  import PinOff from "lucide-svelte/icons/pin-off";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import Search from "lucide-svelte/icons/search";
  import Table2 from "lucide-svelte/icons/table-2";
  import BarChart3 from "lucide-svelte/icons/bar-chart-3";
  import Hash from "lucide-svelte/icons/hash";
  import BookOpen from "lucide-svelte/icons/book-open";
  import ArrowLeftRight from "lucide-svelte/icons/arrow-left-right";
  import Loader2 from "lucide-svelte/icons/loader-2";
  import X from "lucide-svelte/icons/x";

  interface Props {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  const { projectId, open, onOpenChange }: Props = $props();

  let artifacts = $state<AnalysisArtifact[]>([]);
  let loading = $state(false);
  let searchQuery = $state("");
  let filterType = $state<string | null>(null);

  const typeIcons: Record<string, any> = {
    table: Table2,
    chart: BarChart3,
    metric: Hash,
    citation: BookOpen,
    comparison: ArrowLeftRight,
  };

  let filteredArtifacts = $derived.by(() => {
    let result = artifacts;
    if (filterType) {
      result = result.filter((a) => a.blockType === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  });

  let groupedArtifacts = $derived.by(() => {
    const pinned = filteredArtifacts.filter((a) => a.isPinned);
    const rest = filteredArtifacts.filter((a) => !a.isPinned);
    return { pinned, rest };
  });

  async function loadArtifacts() {
    loading = true;
    try {
      const res = await listArtifacts(projectId, { limit: 100 });
      artifacts = res.artifacts;
    } catch (err) {
      console.error("Failed to load artifacts:", err);
    } finally {
      loading = false;
    }
  }

  async function togglePin(artifact: AnalysisArtifact) {
    try {
      const updated = await updateArtifact(artifact.id, {
        isPinned: !artifact.isPinned,
      });
      artifacts = artifacts.map((a) => (a.id === updated.id ? updated : a));
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  }

  async function handleDelete(artifactId: string) {
    try {
      await deleteArtifact(artifactId);
      artifacts = artifacts.filter((a) => a.id !== artifactId);
    } catch (err) {
      console.error("Failed to delete artifact:", err);
    }
  }

  async function openArtifact(artifact: AnalysisArtifact) {
    if (!artifact.sessionId) return;
    try {
      await analystStore.loadSession(artifact.sessionId);
      onOpenChange(false);
      await tick();
      scrollToArtifactTarget(artifact);
    } catch (err) {
      console.error("Failed to open artifact session:", err);
    }
  }

  function scrollToArtifactTarget(artifact: AnalysisArtifact) {
    const blockId = getArtifactBlockId(artifact);
    const candidates = [
      blockId ? `analysis-block-${blockId}` : null,
      artifact.messageId ? `analysis-message-${artifact.messageId}` : null,
    ].filter(Boolean) as string[];

    if (candidates.length === 0) return;

    const attemptScroll = (retriesLeft: number) => {
      for (const targetId of candidates) {
        const element = document.getElementById(targetId);
        if (!element) continue;

        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add(
          "ring-2",
          "ring-emerald-500/70",
          "ring-offset-2",
          "ring-offset-background",
          "rounded-md",
        );
        setTimeout(() => {
          element.classList.remove(
            "ring-2",
            "ring-emerald-500/70",
            "ring-offset-2",
            "ring-offset-background",
            "rounded-md",
          );
        }, 1800);
        return;
      }

      if (retriesLeft > 0) {
        setTimeout(() => attemptScroll(retriesLeft - 1), 100);
      }
    };

    attemptScroll(8);
  }

  function getArtifactBlockId(artifact: AnalysisArtifact): string | null {
    const fromContext = artifact.queryContext?.blockId;
    if (typeof fromContext === "string" && fromContext.length > 0)
      return fromContext;

    const fromBlockData = artifact.blockData?.id;
    if (typeof fromBlockData === "string" && fromBlockData.length > 0)
      return fromBlockData;

    return null;
  }

  $effect(() => {
    const saveCount = analystStore.artifactSaveCount;
    if (!open) return;
    void saveCount;
    void loadArtifacts();
  });

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(new Date(dateStr));
  }

  const blockTypeLabels: Record<string, string> = {
    table: "Tables",
    chart: "Charts",
    metric: "Metrics",
    citation: "Citations",
    comparison: "Comparisons",
  };
</script>

<div
  class="w-96 border-l bg-background flex-shrink-0 flex flex-col overflow-hidden"
  transition:slide={{ axis: "x", duration: 200 }}
>
  <!-- Header -->
  <div class="p-4 border-b space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-sm flex items-center gap-2">
        <BookmarkCheck class="size-4" />
        Saved Artifacts
      </h3>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => onOpenChange(false)}
        title="Close"
      >
        <X class="size-4" />
      </Button>
    </div>
    <p class="text-xs text-muted-foreground">
      Your saved analysis blocks for quick reference.
    </p>

    <!-- Search -->
    <div class="relative">
      <Search
        class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
      />
      <Input
        class="h-8 text-xs pl-8"
        placeholder="Search artifacts..."
        bind:value={searchQuery}
      />
    </div>

    <!-- Type filters -->
    <div class="flex gap-1.5 flex-wrap">
      <Button
        variant={filterType === null ? "secondary" : "ghost"}
        size="sm"
        class="h-7 text-xs"
        onclick={() => (filterType = null)}
      >
        All
      </Button>
      {#each Object.entries(blockTypeLabels) as [type, label]}
        <Button
          variant={filterType === type ? "secondary" : "ghost"}
          size="sm"
          class="h-7 text-xs"
          onclick={() => (filterType = filterType === type ? null : type)}
        >
          {label}
        </Button>
      {/each}
    </div>
  </div>

  <!-- Artifact list -->
  <div class="flex-1 overflow-y-auto p-2 space-y-2">
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <Loader2 class="size-5 animate-spin text-muted-foreground" />
      </div>
    {:else if filteredArtifacts.length === 0}
      <p class="text-sm text-muted-foreground text-center py-8">
        {searchQuery || filterType
          ? "No artifacts match your filters."
          : "No saved artifacts yet. Use the bookmark button on analysis blocks to save them."}
      </p>
    {:else}
      <!-- Pinned -->
      {#if groupedArtifacts.pinned.length > 0}
        <div>
          <h4
            class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1"
          >
            Pinned
          </h4>
          <div class="space-y-1.5">
            {#each groupedArtifacts.pinned as artifact (artifact.id)}
              {@const Icon = typeIcons[artifact.blockType] || Hash}
              <div
                class="rounded-lg border p-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                role="button"
                tabindex="0"
                onclick={() => openArtifact(artifact)}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openArtifact(artifact);
                  }
                }}
              >
                <div class="flex items-start gap-2">
                  <Icon class="size-4 text-muted-foreground mt-0.5" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">
                      {artifact.title}
                    </div>
                    <div
                      class="text-xs text-muted-foreground mt-0.5 flex items-center gap-2"
                    >
                      <span>{artifact.blockType}</span>
                      <span>·</span>
                      <span>{formatDate(artifact.createdAt)}</span>
                    </div>
                    {#if artifact.tags.length > 0}
                      <div class="flex gap-1 mt-1.5 flex-wrap">
                        {#each artifact.tags as tag}
                          <span
                            class="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  <div
                    class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      class="p-1 rounded hover:bg-muted text-amber-500"
                      title="Unpin"
                      onclick={(e) => {
                        e.stopPropagation();
                        togglePin(artifact);
                      }}
                    >
                      <PinOff class="size-3.5" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                      title="Delete"
                      onclick={(e) => {
                        e.stopPropagation();
                        handleDelete(artifact.id);
                      }}
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Rest -->
      {#if groupedArtifacts.rest.length > 0}
        <div>
          {#if groupedArtifacts.pinned.length > 0}
            <h4
              class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1"
            >
              All Artifacts
            </h4>
          {/if}
          <div class="space-y-1.5">
            {#each groupedArtifacts.rest as artifact (artifact.id)}
              {@const Icon = typeIcons[artifact.blockType] || Hash}
              <div
                class="rounded-lg border p-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                role="button"
                tabindex="0"
                onclick={() => openArtifact(artifact)}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openArtifact(artifact);
                  }
                }}
              >
                <div class="flex items-start gap-2">
                  <Icon class="size-4 text-muted-foreground mt-0.5" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">
                      {artifact.title}
                    </div>
                    <div
                      class="text-xs text-muted-foreground mt-0.5 flex items-center gap-2"
                    >
                      <span>{artifact.blockType}</span>
                      <span>·</span>
                      <span>{formatDate(artifact.createdAt)}</span>
                    </div>
                    {#if artifact.tags.length > 0}
                      <div class="flex gap-1 mt-1.5 flex-wrap">
                        {#each artifact.tags as tag}
                          <span
                            class="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  <div
                    class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      class="p-1 rounded hover:bg-muted text-muted-foreground"
                      title="Pin"
                      onclick={(e) => {
                        e.stopPropagation();
                        togglePin(artifact);
                      }}
                    >
                      <Pin class="size-3.5" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                      title="Delete"
                      onclick={(e) => {
                        e.stopPropagation();
                        handleDelete(artifact.id);
                      }}
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

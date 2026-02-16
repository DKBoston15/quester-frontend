<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
    type ResearchQuestionVersion,
    type DesignAlignmentScore,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    History,
    RotateCcw,
    GitCompareArrows,
    X,
    Target,
    Circle,
    FileText,
    Sparkles,
    RefreshCw,
  } from "lucide-svelte";

  let {
    question,
  }: {
    question: ResearchQuestion;
  } = $props();

  let isLoading = $derived(researchQuestionsStore.isLoading);
  let versions = $derived(researchQuestionsStore.versions);

  // Restore state
  let showRestoreDialog = $state(false);
  let versionToRestore = $state<ResearchQuestionVersion | null>(null);
  let isRestoring = $state(false);

  // Compare mode state
  let compareMode = $state(false);
  let compareLeft = $state<ResearchQuestionVersion | null>(null);
  let compareRight = $state<ResearchQuestionVersion | null>(null);

  const designTypes = [
    { key: "researchDesign" as const, label: "Research", icon: Target },
    { key: "samplingDesign" as const, label: "Sampling", icon: Circle },
    { key: "measurementDesign" as const, label: "Measurement", icon: FileText },
    { key: "analyticDesign" as const, label: "Analytic", icon: Sparkles },
  ];

  // Sort versions descending by version number
  let sortedVersions = $derived(
    [...versions].sort((a, b) => b.version - a.version),
  );

  function formatTimestamp(dateStr: string): string {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getAlignmentColor(score: number): string {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getAlignmentTextColor(score: number): string {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  function getAverageAlignment(scores: DesignAlignmentScore | null): number {
    if (!scores) return 0;
    return Math.round(
      (scores.researchDesign +
        scores.samplingDesign +
        scores.measurementDesign +
        scores.analyticDesign) /
        4,
    );
  }

  // Simple word-level diff for highlighting changes
  function computeDiff(
    oldText: string,
    newText: string,
  ): { removed: string[]; added: string[] } {
    const oldWords = oldText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);

    const removed: string[] = [];
    const added: string[] = [];

    // Find words in old not in new
    const newSet = new Set(newWords);
    const oldSet = new Set(oldWords);

    for (const word of oldWords) {
      if (!newSet.has(word)) {
        removed.push(word);
      }
    }

    for (const word of newWords) {
      if (!oldSet.has(word)) {
        added.push(word);
      }
    }

    return { removed, added };
  }

  // Build highlighted text showing diffs between two versions
  function highlightChanges(
    text: string,
    changedWords: string[],
    type: "added" | "removed",
  ): Array<{ text: string; highlighted: boolean }> {
    if (changedWords.length === 0) {
      return [{ text, highlighted: false }];
    }

    const changedSet = new Set(changedWords);
    const words = text.split(/(\s+)/);
    const segments: Array<{ text: string; highlighted: boolean }> = [];

    for (const word of words) {
      if (changedSet.has(word.trim()) && word.trim().length > 0) {
        segments.push({ text: word, highlighted: true });
      } else {
        segments.push({ text: word, highlighted: false });
      }
    }

    return segments;
  }

  // Get previous version for diff comparison
  function getPreviousVersion(
    version: ResearchQuestionVersion,
  ): ResearchQuestionVersion | null {
    const idx = sortedVersions.findIndex((v) => v.id === version.id);
    if (idx < sortedVersions.length - 1) {
      return sortedVersions[idx + 1];
    }
    return null;
  }

  function confirmRestore(version: ResearchQuestionVersion) {
    versionToRestore = version;
    showRestoreDialog = true;
  }

  async function executeRestore() {
    if (!versionToRestore) return;

    isRestoring = true;
    try {
      await researchQuestionsStore.updateQuestion(question.id, {
        question: versionToRestore.question,
        description: versionToRestore.description,
      });
      // Reload version history after restore
      await researchQuestionsStore.loadVersionHistory(question.id);
    } catch (err) {
      console.error("Error restoring version:", err);
    } finally {
      isRestoring = false;
      showRestoreDialog = false;
      versionToRestore = null;
    }
  }

  function toggleCompareMode() {
    compareMode = !compareMode;
    if (!compareMode) {
      compareLeft = null;
      compareRight = null;
    }
  }

  function handleCompareSelect(version: ResearchQuestionVersion) {
    if (!compareMode) return;

    if (!compareLeft) {
      compareLeft = version;
    } else if (!compareRight) {
      // Ensure left is older (higher version = newer, so left should have lower version)
      if (version.version < compareLeft.version) {
        compareRight = compareLeft;
        compareLeft = version;
      } else {
        compareRight = version;
      }
    } else {
      // Reset and start over
      compareLeft = version;
      compareRight = null;
    }
  }

  function isCompareSelected(version: ResearchQuestionVersion): boolean {
    return compareLeft?.id === version.id || compareRight?.id === version.id;
  }

  let compareDiff = $derived.by(() => {
    if (!compareLeft || !compareRight) return null;
    return {
      question: computeDiff(compareLeft.question, compareRight.question),
      description: computeDiff(
        compareLeft.description || "",
        compareRight.description || "",
      ),
      leftAvgScore: getAverageAlignment(compareLeft.designAlignmentScore),
      rightAvgScore: getAverageAlignment(compareRight.designAlignmentScore),
    };
  });

  // Check if this is the current version (matches the question's current version number)
  function isCurrentVersion(version: ResearchQuestionVersion): boolean {
    return version.version === question.version;
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Version History</h3>
    <div class="flex items-center gap-2">
      {#if sortedVersions.length >= 2}
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onclick={toggleCompareMode}
        >
          {#if compareMode}
            <X class="h-3.5 w-3.5 mr-1.5" />
            Exit Compare
          {:else}
            <GitCompareArrows class="h-3.5 w-3.5 mr-1.5" />
            Compare Versions
          {/if}
        </Button>
      {/if}
    </div>
  </div>

  {#if compareMode}
    <p class="text-xs text-muted-foreground">
      {#if !compareLeft}
        Select the first version to compare.
      {:else if !compareRight}
        Now select the second version to compare.
      {:else}
        Comparing v{compareLeft.version} with v{compareRight.version}.
      {/if}
    </p>
  {/if}

  <!-- Side-by-Side Compare View -->
  {#if compareMode && compareLeft && compareRight && compareDiff}
    <Card.Root class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
      <Card.Header class="pb-2">
        <Card.Title class="text-sm flex items-center gap-2">
          <GitCompareArrows class="h-4 w-4" />
          Version Comparison
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-2 gap-4">
          <!-- Left (older) -->
          <div class="space-y-2">
            <div class="flex items-center gap-2 mb-2">
              <Badge variant="outline">v{compareLeft.version}</Badge>
              <span class="text-xs text-muted-foreground">
                {formatTimestamp(compareLeft.createdAt)}
              </span>
            </div>
            <div class="p-3 rounded-lg border bg-card text-sm">
              <p class="font-medium text-xs text-muted-foreground mb-1">Question</p>
              <p class="leading-relaxed">
                {#each highlightChanges(compareLeft.question, compareDiff.question.removed, "removed") as segment}
                  {#if segment.highlighted}
                    <span class="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded px-0.5">{segment.text}</span>
                  {:else}
                    {segment.text}
                  {/if}
                {/each}
              </p>
              {#if compareLeft.description}
                <p class="font-medium text-xs text-muted-foreground mb-1 mt-3">Description</p>
                <p class="text-muted-foreground text-sm leading-relaxed">
                  {#each highlightChanges(compareLeft.description, compareDiff.description.removed, "removed") as segment}
                    {#if segment.highlighted}
                      <span class="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded px-0.5">{segment.text}</span>
                    {:else}
                      {segment.text}
                    {/if}
                  {/each}
                </p>
              {/if}
              {#if compareLeft.designAlignmentScore}
                <div class="flex items-center gap-2 mt-3">
                  <span class="text-xs text-muted-foreground">Alignment:</span>
                  <span class="text-xs font-medium {getAlignmentTextColor(compareDiff.leftAvgScore)}">
                    {compareDiff.leftAvgScore}%
                  </span>
                  <div class="flex gap-1">
                    {#each designTypes as dt}
                      {@const score = compareLeft.designAlignmentScore[dt.key]}
                      <div
                        class="w-2 h-2 rounded-full {getAlignmentColor(score)}"
                        title="{dt.label}: {score}%"
                      ></div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Right (newer) -->
          <div class="space-y-2">
            <div class="flex items-center gap-2 mb-2">
              <Badge variant="outline">v{compareRight.version}</Badge>
              <span class="text-xs text-muted-foreground">
                {formatTimestamp(compareRight.createdAt)}
              </span>
            </div>
            <div class="p-3 rounded-lg border bg-card text-sm">
              <p class="font-medium text-xs text-muted-foreground mb-1">Question</p>
              <p class="leading-relaxed">
                {#each highlightChanges(compareRight.question, compareDiff.question.added, "added") as segment}
                  {#if segment.highlighted}
                    <span class="bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded px-0.5">{segment.text}</span>
                  {:else}
                    {segment.text}
                  {/if}
                {/each}
              </p>
              {#if compareRight.description}
                <p class="font-medium text-xs text-muted-foreground mb-1 mt-3">Description</p>
                <p class="text-muted-foreground text-sm leading-relaxed">
                  {#each highlightChanges(compareRight.description, compareDiff.description.added, "added") as segment}
                    {#if segment.highlighted}
                      <span class="bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded px-0.5">{segment.text}</span>
                    {:else}
                      {segment.text}
                    {/if}
                  {/each}
                </p>
              {/if}
              {#if compareRight.designAlignmentScore}
                {@const scoreDelta = compareDiff.rightAvgScore - compareDiff.leftAvgScore}
                <div class="flex items-center gap-2 mt-3">
                  <span class="text-xs text-muted-foreground">Alignment:</span>
                  <span class="text-xs font-medium {getAlignmentTextColor(compareDiff.rightAvgScore)}">
                    {compareDiff.rightAvgScore}%
                  </span>
                  {#if scoreDelta !== 0}
                    <span class="text-xs {scoreDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                      ({scoreDelta > 0 ? "+" : ""}{scoreDelta}%)
                    </span>
                  {/if}
                  <div class="flex gap-1">
                    {#each designTypes as dt}
                      {@const score = compareRight.designAlignmentScore[dt.key]}
                      <div
                        class="w-2 h-2 rounded-full {getAlignmentColor(score)}"
                        title="{dt.label}: {score}%"
                      ></div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Version Timeline -->
  {#if sortedVersions.length > 0}
    <div class="space-y-0 relative">
      <!-- Timeline line -->
      <div class="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border"></div>

      {#each sortedVersions as version (version.id)}
        {@const prevVersion = getPreviousVersion(version)}
        {@const diff = prevVersion ? computeDiff(prevVersion.question, version.question) : null}
        {@const isCurrent = isCurrentVersion(version)}
        {@const isSelected = isCompareSelected(version)}

        <button
          class="flex gap-3 pb-4 relative w-full text-left {compareMode ? 'cursor-pointer' : 'cursor-default'} {isSelected ? 'opacity-100' : compareMode ? 'opacity-70 hover:opacity-100' : 'opacity-100'}"
          onclick={() => handleCompareSelect(version)}
          disabled={!compareMode}
          type="button"
        >
          <!-- Timeline dot -->
          <div
            class="w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center {isCurrent
              ? 'border-primary bg-primary text-primary-foreground'
              : isSelected
                ? 'border-primary bg-background ring-2 ring-primary ring-offset-2 ring-offset-background'
                : 'border-primary bg-background'}"
          >
            <span class="text-[8px] font-bold {isCurrent ? '' : 'text-primary'}">
              {version.version}
            </span>
          </div>

          <!-- Version content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span class="font-medium">v{version.version}</span>
              {#if isCurrent}
                <Badge variant="success" class="text-[10px] px-1.5 py-0">Current</Badge>
              {/if}
              <span>&middot;</span>
              <span>{formatTimestamp(version.createdAt)}</span>
            </div>

            <div class="p-3 rounded-lg border bg-card text-sm {isSelected ? 'ring-2 ring-primary' : ''}">
              <!-- Question text with diff highlighting -->
              {#if diff && (diff.added.length > 0 || diff.removed.length > 0)}
                <div class="space-y-1">
                  <p class="font-medium text-xs text-muted-foreground">Question</p>
                  <p class="leading-relaxed">
                    {#each highlightChanges(version.question, diff.added, "added") as segment}
                      {#if segment.highlighted}
                        <span class="bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded px-0.5">{segment.text}</span>
                      {:else}
                        {segment.text}
                      {/if}
                    {/each}
                  </p>
                </div>
              {:else}
                <p class="font-medium mb-1">{version.question}</p>
              {/if}

              {#if version.description}
                <p class="text-muted-foreground text-xs mt-1">
                  {version.description}
                </p>
              {/if}

              <!-- Design alignment score changes -->
              {#if version.designAlignmentScore}
                {@const currentAvg = getAverageAlignment(version.designAlignmentScore)}
                {@const prevAvg = prevVersion ? getAverageAlignment(prevVersion.designAlignmentScore) : null}
                <div class="flex items-center gap-2 mt-2">
                  <div class="flex gap-1">
                    {#each designTypes as dt}
                      {@const score = version.designAlignmentScore[dt.key]}
                      {@const prevScore = prevVersion?.designAlignmentScore?.[dt.key]}
                      <div class="flex items-center gap-0.5" title="{dt.label}: {score}%{prevScore !== undefined && prevScore !== score ? ` (was ${prevScore}%)` : ''}">
                        <div class="w-2 h-2 rounded-full {getAlignmentColor(score)}"></div>
                        {#if prevScore !== undefined && prevScore !== score}
                          <span class="text-[9px] {score > prevScore ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                            {score > prevScore ? "+" : ""}{score - prevScore}
                          </span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                  <span class="text-xs text-muted-foreground">
                    Avg: {currentAvg}%
                    {#if prevAvg !== null && prevAvg !== currentAvg}
                      <span class="{currentAvg > prevAvg ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                        ({currentAvg > prevAvg ? "+" : ""}{currentAvg - prevAvg}%)
                      </span>
                    {/if}
                  </span>
                </div>
              {/if}

              <!-- Restore button (only for past versions, not compare mode) -->
              {#if !isCurrent && !compareMode}
                <div class="mt-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    class="text-xs h-7 px-2"
                    onclick={(e: Event) => {
                      e.stopPropagation();
                      confirmRestore(version);
                    }}
                    disabled={isRestoring}
                  >
                    <RotateCcw class="h-3 w-3 mr-1" />
                    Restore Version
                  </Button>
                </div>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {:else if isLoading}
    <div class="text-center text-sm text-muted-foreground py-8">
      <RefreshCw class="h-4 w-4 animate-spin mx-auto mb-2" />
      Loading version history...
    </div>
  {:else}
    <EmptyState
      title="No version history"
      description="Version history will appear here as you make changes to this question."
      variant="data-empty"
      height="h-[200px]"
    />
  {/if}
</div>

<!-- Restore Confirmation Dialog -->
<AlertDialog.Root bind:open={showRestoreDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Restore Version</AlertDialog.Title>
      <AlertDialog.Description>
        {#if versionToRestore}
          Are you sure you want to restore version {versionToRestore.version}? This will create a new version with the restored content.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={executeRestore} disabled={isRestoring}>
        {isRestoring ? "Restoring..." : "Restore"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

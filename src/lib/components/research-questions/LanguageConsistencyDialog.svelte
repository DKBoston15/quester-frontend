<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    Languages,
    Check,
    X,
    CheckCheck,
    RefreshCw,
    ArrowRight,
    AlertTriangle,
    BookOpen,
    Replace,
  } from "lucide-svelte";

  let {
    open = $bindable(false),
  }: {
    open: boolean;
  } = $props();

  interface SynonymGroup {
    terms: string[];
    suggestion: string;
    occurrences: { questionId: string; term: string; questionText: string }[];
  }

  interface TerminologyInconsistency {
    description: string;
    affectedQuestionIds: string[];
  }

  interface LanguageAnalysis {
    type: "descriptive" | "predictive" | "mixed";
    questionId: string;
    questionText: string;
  }

  interface StandardizationSuggestion {
    id: string;
    type: "synonym" | "inconsistency" | "language";
    description: string;
    action: string;
    fromTerm?: string;
    toTerm?: string;
    affectedQuestionIds: string[];
    status: "pending" | "accepted" | "rejected";
  }

  let isAnalyzing = $state(false);
  let analysisError = $state<string | null>(null);
  let synonymGroups = $state<SynonymGroup[]>([]);
  let inconsistencies = $state<TerminologyInconsistency[]>([]);
  let languageAnalysis = $state<LanguageAnalysis[]>([]);
  let suggestions = $state<StandardizationSuggestion[]>([]);
  let isApplyingAll = $state(false);
  let applyingIds = $state<Set<string>>(new Set());

  let questions = $derived(researchQuestionsStore.questions);
  let streamingAnalysis = $derived(researchQuestionsStore.streamingAnalysis);

  let pendingSuggestions = $derived(
    suggestions.filter((s) => s.status === "pending"),
  );
  let acceptedSuggestions = $derived(
    suggestions.filter((s) => s.status === "accepted"),
  );

  let descriptiveCount = $derived(
    languageAnalysis.filter((l) => l.type === "descriptive").length,
  );
  let predictiveCount = $derived(
    languageAnalysis.filter((l) => l.type === "predictive").length,
  );
  let mixedCount = $derived(
    languageAnalysis.filter((l) => l.type === "mixed").length,
  );

  function handleOpenChange(value: boolean) {
    open = value;
    if (value && questions.length > 0 && synonymGroups.length === 0) {
      runAnalysis();
    }
    if (!value) {
      researchQuestionsStore.cancelAnalysis();
    }
  }

  async function runAnalysis() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId || questions.length < 2) return;

    isAnalyzing = true;
    analysisError = null;
    synonymGroups = [];
    inconsistencies = [];
    languageAnalysis = [];
    suggestions = [];

    try {
      const result = await researchQuestionsStore.analyzeConsistency(projectId);

      if (result) {
        parseAnalysisResult(result);
      }
    } catch (err) {
      analysisError =
        err instanceof Error ? err.message : "Failed to analyze consistency";
    } finally {
      isAnalyzing = false;
    }
  }

  function parseAnalysisResult(result: string) {
    try {
      const parsed = JSON.parse(result);

      if (parsed.synonymGroups) {
        synonymGroups = parsed.synonymGroups.map(
          (g: { terms: string[]; suggestion: string; occurrences?: { questionId: string; term: string; questionText: string }[] }) => ({
            terms: g.terms || [],
            suggestion: g.suggestion || g.terms[0] || "",
            occurrences: g.occurrences || [],
          }),
        );
      }

      if (parsed.inconsistencies) {
        inconsistencies = parsed.inconsistencies.map(
          (inc: { description: string; affectedQuestionIds?: string[] }) => ({
            description: inc.description || "",
            affectedQuestionIds: inc.affectedQuestionIds || [],
          }),
        );
      }

      if (parsed.languageAnalysis) {
        languageAnalysis = parsed.languageAnalysis.map(
          (la: { type: string; questionId: string; questionText: string }) => ({
            type: la.type || "mixed",
            questionId: la.questionId || "",
            questionText: la.questionText || "",
          }),
        );
      }

      if (parsed.suggestions) {
        suggestions = parsed.suggestions.map(
          (s: { id?: string; type?: string; description: string; action: string; fromTerm?: string; toTerm?: string; affectedQuestionIds?: string[] }, i: number) => ({
            id: s.id || `suggestion-${i}`,
            type: s.type || "synonym",
            description: s.description || "",
            action: s.action || "",
            fromTerm: s.fromTerm,
            toTerm: s.toTerm,
            affectedQuestionIds: s.affectedQuestionIds || [],
            status: "pending" as const,
          }),
        );
      }
    } catch {
      // If the result is not JSON, generate suggestions from raw text analysis
      generateFallbackAnalysis();
    }
  }

  function generateFallbackAnalysis() {
    // Perform basic client-side analysis as fallback
    const allText = questions.map((q) => q.question.toLowerCase());
    const termPairs: [string, string][] = [
      ["participant", "subject"],
      ["quantitative", "numerical"],
      ["qualitative", "descriptive"],
      ["impact", "effect"],
      ["examine", "investigate"],
      ["determine", "assess"],
      ["relationship", "correlation"],
      ["method", "approach"],
      ["outcome", "result"],
      ["significant", "meaningful"],
    ];

    const detectedGroups: SynonymGroup[] = [];
    const detectedSuggestions: StandardizationSuggestion[] = [];
    let suggestionIdx = 0;

    for (const [termA, termB] of termPairs) {
      const hasA = allText.some((t) => t.includes(termA));
      const hasB = allText.some((t) => t.includes(termB));

      if (hasA && hasB) {
        const occurrences: SynonymGroup["occurrences"] = [];
        for (const q of questions) {
          const lower = q.question.toLowerCase();
          if (lower.includes(termA)) {
            occurrences.push({
              questionId: q.id,
              term: termA,
              questionText: q.question,
            });
          }
          if (lower.includes(termB)) {
            occurrences.push({
              questionId: q.id,
              term: termB,
              questionText: q.question,
            });
          }
        }

        detectedGroups.push({
          terms: [termA, termB],
          suggestion: termA,
          occurrences,
        });

        detectedSuggestions.push({
          id: `suggestion-${suggestionIdx++}`,
          type: "synonym",
          description: `Both '${termA}' and '${termB}' are used across your questions`,
          action: `Replace all instances of '${termB}' with '${termA}'`,
          fromTerm: termB,
          toTerm: termA,
          affectedQuestionIds: occurrences
            .filter((o) => o.term === termB)
            .map((o) => o.questionId),
          status: "pending",
        });
      }
    }

    // Language type analysis
    const descriptiveKeywords = [
      "what",
      "how many",
      "describe",
      "what is",
      "how does",
    ];
    const predictiveKeywords = [
      "will",
      "predict",
      "affect",
      "influence",
      "cause",
      "impact",
      "effect on",
    ];

    languageAnalysis = questions.map((q) => {
      const lower = q.question.toLowerCase();
      const isDescriptive = descriptiveKeywords.some((k) =>
        lower.includes(k),
      );
      const isPredictive = predictiveKeywords.some((k) =>
        lower.includes(k),
      );

      let type: "descriptive" | "predictive" | "mixed" = "mixed";
      if (isDescriptive && !isPredictive) type = "descriptive";
      else if (isPredictive && !isDescriptive) type = "predictive";

      return {
        type,
        questionId: q.id,
        questionText: q.question,
      };
    });

    synonymGroups = detectedGroups;
    suggestions = detectedSuggestions;
  }

  async function acceptSuggestion(suggestion: StandardizationSuggestion) {
    if (!suggestion.fromTerm || !suggestion.toTerm) {
      suggestions = suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, status: "accepted" as const } : s,
      );
      return;
    }

    applyingIds = new Set([...applyingIds, suggestion.id]);

    try {
      for (const questionId of suggestion.affectedQuestionIds) {
        const question = questions.find((q) => q.id === questionId);
        if (!question) continue;

        const updatedText = replaceTermInText(
          question.question,
          suggestion.fromTerm,
          suggestion.toTerm,
        );

        if (updatedText !== question.question) {
          await researchQuestionsStore.updateQuestion(questionId, {
            question: updatedText,
          });
        }
      }

      suggestions = suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, status: "accepted" as const } : s,
      );
    } catch (err) {
      console.error("Error applying suggestion:", err);
    } finally {
      const next = new Set(applyingIds);
      next.delete(suggestion.id);
      applyingIds = next;
    }
  }

  function rejectSuggestion(suggestion: StandardizationSuggestion) {
    suggestions = suggestions.map((s) =>
      s.id === suggestion.id ? { ...s, status: "rejected" as const } : s,
    );
  }

  async function applyAll() {
    isApplyingAll = true;
    try {
      for (const suggestion of pendingSuggestions) {
        await acceptSuggestion(suggestion);
      }
    } finally {
      isApplyingAll = false;
    }
  }

  function replaceTermInText(
    text: string,
    fromTerm: string,
    toTerm: string,
  ): string {
    const regex = new RegExp(`\\b${escapeRegex(fromTerm)}\\b`, "gi");
    return text.replace(regex, (match) => {
      // Preserve original casing
      if (match[0] === match[0].toUpperCase()) {
        return toTerm.charAt(0).toUpperCase() + toTerm.slice(1);
      }
      return toTerm;
    });
  }

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getLanguageTypeBadgeVariant(
    type: string,
  ): "default" | "success" | "warning" {
    switch (type) {
      case "descriptive":
        return "default";
      case "predictive":
        return "success";
      default:
        return "warning";
    }
  }

  function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Languages class="h-5 w-5" />
        Language Consistency Check
      </Dialog.Title>
      <Dialog.Description>
        Analyze terminology usage across all research questions to detect
        synonyms, inconsistencies, and language patterns.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
      {#if isAnalyzing}
        <div class="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw class="h-6 w-6 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">
            Analyzing language consistency across {questions.length} questions...
          </p>
          {#if streamingAnalysis?.content}
            <div class="max-w-md text-xs text-muted-foreground text-center mt-2">
              <p class="whitespace-pre-wrap line-clamp-3">
                {streamingAnalysis.content}
              </p>
            </div>
          {/if}
        </div>
      {:else if analysisError}
        <div class="flex flex-col items-center justify-center py-12 gap-3">
          <AlertTriangle class="h-6 w-6 text-destructive" />
          <p class="text-sm text-destructive">{analysisError}</p>
          <Button variant="outline" size="sm" onclick={runAnalysis}>
            <RefreshCw class="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      {:else if questions.length < 2}
        <EmptyState
          title="Not enough questions"
          description="You need at least 2 research questions to check for language consistency."
          variant="data-empty"
          height="h-[200px]"
        />
      {:else if synonymGroups.length === 0 && inconsistencies.length === 0 && languageAnalysis.length === 0 && suggestions.length === 0}
        <EmptyState
          title="No analysis results"
          description="Run the analysis to check for language consistency across your questions."
          variant="data-empty"
          ctaText="Run Analysis"
          ctaAction={runAnalysis}
          height="h-[200px]"
        />
      {:else}
        <!-- Synonym Groups -->
        {#if synonymGroups.length > 0}
          <section>
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <Replace class="h-4 w-4 text-muted-foreground" />
              Detected Synonym Groups
              <Badge variant="outline" class="ml-auto">{synonymGroups.length}</Badge>
            </h3>
            <div class="space-y-2">
              {#each synonymGroups as group, i}
                <Card.Root class="border dark:border-dark-border">
                  <Card.Content class="p-3">
                    <div class="flex items-center gap-2 flex-wrap mb-2">
                      {#each group.terms as term, termIdx}
                        <Badge variant="outline">{term}</Badge>
                        {#if termIdx < group.terms.length - 1}
                          <span class="text-xs text-muted-foreground">vs</span>
                        {/if}
                      {/each}
                    </div>
                    <p class="text-xs text-muted-foreground">
                      Suggested standard term:
                      <span class="font-medium text-foreground">{group.suggestion}</span>
                    </p>
                    {#if group.occurrences.length > 0}
                      <div class="mt-2 space-y-1">
                        {#each group.occurrences.slice(0, 3) as occ}
                          <p class="text-xs text-muted-foreground truncate">
                            <span class="font-medium">{occ.term}</span>
                            in: "{truncateText(occ.questionText, 60)}"
                          </p>
                        {/each}
                        {#if group.occurrences.length > 3}
                          <p class="text-xs text-muted-foreground">
                            ...and {group.occurrences.length - 3} more occurrences
                          </p>
                        {/if}
                      </div>
                    {/if}
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Inconsistencies -->
        {#if inconsistencies.length > 0}
          <section>
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle class="h-4 w-4 text-yellow-500" />
              Inconsistent Terminology
              <Badge variant="warning" class="ml-auto">{inconsistencies.length}</Badge>
            </h3>
            <div class="space-y-2">
              {#each inconsistencies as inc}
                <div class="p-3 rounded-lg border bg-yellow-50/50 dark:bg-yellow-950/10 text-sm">
                  <p>{inc.description}</p>
                  {#if inc.affectedQuestionIds.length > 0}
                    <p class="text-xs text-muted-foreground mt-1">
                      Affects {inc.affectedQuestionIds.length} question{inc.affectedQuestionIds.length !== 1 ? "s" : ""}
                    </p>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Language Analysis -->
        {#if languageAnalysis.length > 0}
          <section>
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <BookOpen class="h-4 w-4 text-muted-foreground" />
              Language Type Analysis
            </h3>

            <!-- Summary bar -->
            <div class="flex items-center gap-3 mb-3">
              {#if descriptiveCount > 0}
                <div class="flex items-center gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span class="text-xs text-muted-foreground">
                    Descriptive ({descriptiveCount})
                  </span>
                </div>
              {/if}
              {#if predictiveCount > 0}
                <div class="flex items-center gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span class="text-xs text-muted-foreground">
                    Predictive ({predictiveCount})
                  </span>
                </div>
              {/if}
              {#if mixedCount > 0}
                <div class="flex items-center gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <span class="text-xs text-muted-foreground">
                    Mixed ({mixedCount})
                  </span>
                </div>
              {/if}
            </div>

            <div class="space-y-1.5">
              {#each languageAnalysis as la}
                <div class="flex items-center gap-2 p-2 rounded-lg border text-sm">
                  <Badge variant={getLanguageTypeBadgeVariant(la.type)} class="text-[10px] shrink-0">
                    {la.type}
                  </Badge>
                  <p class="truncate text-muted-foreground flex-1 min-w-0">
                    {truncateText(la.questionText, 80)}
                  </p>
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Standardization Suggestions -->
        {#if suggestions.length > 0}
          <section>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold flex items-center gap-2">
                <ArrowRight class="h-4 w-4 text-muted-foreground" />
                Suggested Standardizations
                <Badge variant="outline">{pendingSuggestions.length} pending</Badge>
              </h3>
              {#if pendingSuggestions.length > 1}
                <Button
                  variant="default"
                  size="sm"
                  onclick={applyAll}
                  disabled={isApplyingAll || pendingSuggestions.length === 0}
                >
                  <CheckCheck class="h-3.5 w-3.5 mr-1.5" />
                  {isApplyingAll ? "Applying..." : "Apply All"}
                </Button>
              {/if}
            </div>

            <div class="space-y-2">
              {#each suggestions as suggestion (suggestion.id)}
                {@const isApplying = applyingIds.has(suggestion.id)}
                <Card.Root
                  class="border dark:border-dark-border {suggestion.status === 'accepted'
                    ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10'
                    : suggestion.status === 'rejected'
                      ? 'border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 opacity-60'
                      : ''}"
                >
                  <Card.Content class="p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm">{suggestion.description}</p>
                        <div class="flex items-center gap-1.5 mt-1.5">
                          <ArrowRight class="h-3 w-3 text-muted-foreground shrink-0" />
                          <p class="text-xs font-medium text-primary">
                            {suggestion.action}
                          </p>
                        </div>
                        {#if suggestion.affectedQuestionIds.length > 0}
                          <p class="text-xs text-muted-foreground mt-1">
                            {suggestion.affectedQuestionIds.length} question{suggestion.affectedQuestionIds.length !== 1 ? "s" : ""} affected
                          </p>
                        {/if}
                      </div>

                      {#if suggestion.status === "pending"}
                        <div class="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            class="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                            onclick={() => acceptSuggestion(suggestion)}
                            disabled={isApplying || isApplyingAll}
                          >
                            {#if isApplying}
                              <RefreshCw class="h-3 w-3 animate-spin" />
                            {:else}
                              <Check class="h-3 w-3 mr-1" />
                              Accept
                            {/if}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            class="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            onclick={() => rejectSuggestion(suggestion)}
                            disabled={isApplying || isApplyingAll}
                          >
                            <X class="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      {:else if suggestion.status === "accepted"}
                        <Badge variant="success" class="shrink-0 text-[10px]">
                          <Check class="h-3 w-3 mr-0.5" />
                          Applied
                        </Badge>
                      {:else}
                        <Badge variant="outline" class="shrink-0 text-[10px] opacity-60">
                          Rejected
                        </Badge>
                      {/if}
                    </div>
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Re-analyze button -->
        <div class="flex justify-center pt-2">
          <Button variant="outline" size="sm" onclick={runAnalysis}>
            <RefreshCw class="h-3.5 w-3.5 mr-1.5" />
            Re-analyze
          </Button>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => handleOpenChange(false)}>
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

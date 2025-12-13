<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import {
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Lightbulb,
    ClipboardCopy,
  } from 'lucide-svelte';
  import { researchQuestionsStore } from '$lib/stores/ResearchQuestionsStore.svelte';
  import type { DesignAlignmentResult } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';
  import { toast } from 'svelte-sonner';

  interface Props {
    questionId: string;
  }

  let { questionId }: Props = $props();

  let analysis = $state<DesignAlignmentResult | null>(null);
  let isAnalyzing = $state(false);
  let hasTriggeredAnalysis = false; // Non-reactive flag to prevent multiple triggers

  // Load existing analysis on mount
  $effect(() => {
    const existing = researchQuestionsStore.getDesignAnalysis(questionId);
    if (existing) {
      analysis = existing;
      hasTriggeredAnalysis = true; // Already have analysis, don't auto-trigger
    }
  });

  // Auto-analyze only once on first mount if no existing analysis
  $effect(() => {
    // Only run once, and only if no existing analysis was found
    if (!hasTriggeredAnalysis && !analysis && !isAnalyzing) {
      hasTriggeredAnalysis = true;
      handleAnalyze();
    }
  });

  const handleAnalyze = async () => {
    if (isAnalyzing) return; // Prevent double-clicks
    isAnalyzing = true;
    analysis = await researchQuestionsStore.analyzeDesignAlignment(questionId);
    isAnalyzing = false;
  };

  const copyRewrite = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success($_('researchQuestions.rewriteCopied'));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 70) return 'bg-emerald-400/10';
    if (score >= 40) return 'bg-amber-400/10';
    return 'bg-red-400/10';
  };

  const questionTypeLabels: Record<string, string> = {
    descriptive: 'Descriptive',
    predictive: 'Predictive',
    exploratory: 'Exploratory',
    explanatory: 'Explanatory',
    evaluative: 'Evaluative',
  };

  const designTypeLabels: Record<string, string> = {
    research: 'Research Design',
    analytic: 'Analytic Design',
    sampling: 'Sampling Design',
    measurement: 'Measurement Design',
  };
</script>

<div class="space-y-4">
  {#if !analysis && !isAnalyzing}
    <!-- No analysis yet -->
    <div class="text-center py-6">
      <AlertTriangle class="h-8 w-8 text-zinc-500 mx-auto mb-2" />
      <p class="text-sm text-zinc-400">{$_('researchQuestions.noAnalysisYet')}</p>
      <Button variant="outline" size="sm" class="mt-4" onclick={handleAnalyze}>
        <RefreshCw class="h-4 w-4 mr-2" />
        {$_('researchQuestions.analyzeAlignment')}
      </Button>
    </div>
  {:else if isAnalyzing}
    <!-- Loading state -->
    <div class="space-y-4">
      <Skeleton class="h-20 w-full" />
      <Skeleton class="h-32 w-full" />
      <Skeleton class="h-24 w-full" />
    </div>
  {:else if analysis}
    <!-- Overall Score -->
    <div class="bg-white/[0.02] rounded-lg p-4 {getScoreBg(analysis.overallScore)}">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-medium text-zinc-100">
            {$_('researchQuestions.overallAlignment')}
          </h4>
          <p class="text-xs text-zinc-500 mt-1">
            {analysis.overallScore >= 70
              ? $_('researchQuestions.alignmentGood')
              : analysis.overallScore >= 40
                ? $_('researchQuestions.alignmentModerate')
                : $_('researchQuestions.alignmentPoor')}
          </p>
        </div>
        <div class="text-3xl font-bold {getScoreColor(analysis.overallScore)}">
          {analysis.overallScore}%
        </div>
      </div>
    </div>

    <!-- Question Type -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-zinc-400">{$_('researchQuestions.questionType')}:</span>
      <Badge variant="outline">
        {questionTypeLabels[analysis.questionType] || analysis.questionType}
      </Badge>
    </div>

    <!-- Individual Design Scores -->
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-zinc-100">
        {$_('researchQuestions.designScores')}
      </h4>
      <div class="grid grid-cols-2 gap-2">
        {#each Object.entries(analysis.scores) as [type, score]}
          <div class="p-3 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <div class="flex items-center justify-between">
              <span class="text-xs text-zinc-400">{designTypeLabels[type] || type}</span>
              <span class="text-sm font-medium {getScoreColor(score)}">{score}%</span>
            </div>
            <div class="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all {score >= 70
                  ? 'bg-emerald-400'
                  : score >= 40
                    ? 'bg-amber-400'
                    : 'bg-red-400'}"
                style="width: {score}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Mismatches -->
    {#if analysis.mismatches.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
          <AlertTriangle class="h-4 w-4 text-amber-400" />
          {$_('researchQuestions.identifiedIssues')}
        </h4>
        <div class="space-y-2">
          {#each analysis.mismatches as mismatch}
            <div class="p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
              <div class="flex items-start gap-2">
                <AlertTriangle class="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <Badge variant="outline" class="text-xs">
                      {designTypeLabels[mismatch.designType] || mismatch.designType}
                    </Badge>
                    <span class="text-xs text-zinc-500">{mismatch.designValue}</span>
                  </div>
                  <p class="text-sm text-zinc-300">{mismatch.issue}</p>
                  <p class="text-xs text-zinc-500 mt-1">
                    <span class="text-amber-400">{$_('researchQuestions.suggestion')}:</span>
                    {mismatch.suggestion}
                  </p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="p-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5">
        <div class="flex items-center gap-2">
          <CheckCircle class="h-5 w-5 text-emerald-400" />
          <p class="text-sm text-zinc-300">{$_('researchQuestions.noMismatchesFound')}</p>
        </div>
      </div>
    {/if}

    <!-- Suggested Rewrites -->
    {#if analysis.suggestedRewrites.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
          <Lightbulb class="h-4 w-4 text-blue-400" />
          {$_('researchQuestions.suggestedRewrites')}
        </h4>
        <div class="space-y-2">
          {#each analysis.suggestedRewrites as rewrite, index}
            <div class="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm text-zinc-300 flex-1">{rewrite}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0 flex-shrink-0"
                  onclick={() => copyRewrite(rewrite)}
                >
                  <ClipboardCopy class="h-4 w-4" />
                </Button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Explanation -->
    {#if analysis.explanation}
      <div class="pt-4 border-t border-white/[0.06]">
        <p class="text-sm text-zinc-400 leading-relaxed">{analysis.explanation}</p>
      </div>
    {/if}

    <!-- Re-analyze button -->
    <div class="flex justify-end">
      <Button variant="outline" size="sm" onclick={handleAnalyze} disabled={isAnalyzing}>
        <RefreshCw class="h-4 w-4 mr-2 {isAnalyzing ? 'animate-spin' : ''}" />
        {$_('researchQuestions.reanalyze')}
      </Button>
    </div>
  {/if}
</div>

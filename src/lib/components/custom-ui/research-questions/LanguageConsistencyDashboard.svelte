<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Card from '$lib/components/ui/card';
  import {
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Lightbulb,
    BookOpen,
    BarChart3,
  } from 'lucide-svelte';
  import { researchQuestionsStore } from '$lib/stores/ResearchQuestionsStore.svelte';
  import type { LanguageConsistencyResult, QuestionType } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';

  interface Props {
    projectId: string;
  }

  let { projectId }: Props = $props();

  let analysis = $state<LanguageConsistencyResult | null>(null);
  let isAnalyzing = $state(false);

  // Load existing analysis on mount
  $effect(() => {
    const existing = researchQuestionsStore.languageConsistency;
    if (existing) {
      analysis = existing;
    }
  });

  const handleAnalyze = async () => {
    isAnalyzing = true;
    analysis = await researchQuestionsStore.analyzeLanguageConsistency(projectId);
    isAnalyzing = false;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 70) return 'bg-emerald-400/10 border-emerald-400/20';
    if (score >= 40) return 'bg-amber-400/10 border-amber-400/20';
    return 'bg-red-400/10 border-red-400/20';
  };

  const questionTypeLabels: Record<QuestionType, string> = {
    descriptive: 'Descriptive',
    predictive: 'Predictive',
    exploratory: 'Exploratory',
    explanatory: 'Explanatory',
    evaluative: 'Evaluative',
  };

  const questionTypeColors: Record<QuestionType, string> = {
    descriptive: 'bg-blue-400',
    predictive: 'bg-purple-400',
    exploratory: 'bg-cyan-400',
    explanatory: 'bg-amber-400',
    evaluative: 'bg-emerald-400',
  };

  // Calculate distribution for visualization
  const typeDistribution = $derived(() => {
    if (!analysis?.questionTypes) return [];
    const entries = Object.entries(analysis.questionTypes) as [QuestionType, string[]][];
    const total = entries.reduce((sum, [, ids]) => sum + ids.length, 0);
    return entries
      .filter(([, ids]) => ids.length > 0)
      .map(([type, ids]) => ({
        type,
        count: ids.length,
        percentage: total > 0 ? Math.round((ids.length / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  });
</script>

<Card.Root class="border-white/[0.06] bg-white/[0.02]">
  <Card.Header>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <BookOpen class="h-5 w-5 text-purple-400" />
        <Card.Title class="text-lg">{$_('researchQuestions.languageConsistency')}</Card.Title>
      </div>
      <Button variant="outline" size="sm" onclick={handleAnalyze} disabled={isAnalyzing}>
        <RefreshCw class="h-4 w-4 mr-2 {isAnalyzing ? 'animate-spin' : ''}" />
        {analysis ? $_('researchQuestions.reanalyze') : $_('researchQuestions.analyze')}
      </Button>
    </div>
    <Card.Description>
      {$_('researchQuestions.languageConsistencyDescription')}
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-6">
    {#if isAnalyzing}
      <div class="space-y-4">
        <Skeleton class="h-20 w-full" />
        <Skeleton class="h-32 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>
    {:else if !analysis}
      <div class="text-center py-8">
        <BarChart3 class="h-10 w-10 text-zinc-500 mx-auto mb-3" />
        <p class="text-sm text-zinc-400">{$_('researchQuestions.noConsistencyAnalysis')}</p>
        <p class="text-xs text-zinc-500 mt-1">{$_('researchQuestions.clickAnalyzeToStart')}</p>
      </div>
    {:else}
      <!-- Overall Score -->
      <div class="rounded-lg p-4 border {getScoreBg(analysis.overallScore)}">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-medium text-zinc-100">
              {$_('researchQuestions.consistencyScore')}
            </h4>
            <p class="text-xs text-zinc-500 mt-1">
              {analysis.overallScore >= 70
                ? $_('researchQuestions.consistencyGood')
                : analysis.overallScore >= 40
                  ? $_('researchQuestions.consistencyModerate')
                  : $_('researchQuestions.consistencyPoor')}
            </p>
          </div>
          <div class="text-3xl font-bold {getScoreColor(analysis.overallScore)}">
            {analysis.overallScore}%
          </div>
        </div>
      </div>

      <!-- Question Type Distribution -->
      {#if typeDistribution().length > 0}
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <BarChart3 class="h-4 w-4 text-blue-400" />
            {$_('researchQuestions.questionTypeDistribution')}
          </h4>
          <div class="space-y-2">
            {#each typeDistribution() as dist}
              <div class="flex items-center gap-3">
                <span class="text-xs text-zinc-400 w-24 flex-shrink-0">
                  {questionTypeLabels[dist.type]}
                </span>
                <div class="flex-1 h-4 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all {questionTypeColors[dist.type]}"
                    style="width: {dist.percentage}%"
                  ></div>
                </div>
                <span class="text-xs text-zinc-300 w-16 text-right">
                  {dist.count} ({dist.percentage}%)
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Term Analysis -->
      {#if analysis.termAnalysis.length > 0}
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <BookOpen class="h-4 w-4 text-purple-400" />
            {$_('researchQuestions.termAnalysis')}
          </h4>
          <div class="space-y-2">
            {#each analysis.termAnalysis.slice(0, 10) as term}
              <div class="p-3 rounded-lg border border-white/[0.06] bg-white/[0.01]">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-zinc-200">{term.term}</span>
                    <Badge variant="outline" class="text-xs">
                      {term.count}x
                    </Badge>
                  </div>
                </div>
                {#if term.synonyms.length > 0}
                  <div class="flex flex-wrap gap-1 mb-2">
                    <span class="text-xs text-zinc-500">{$_('researchQuestions.synonymsDetected')}:</span>
                    {#each term.synonyms as synonym}
                      <Badge variant="secondary" class="text-xs bg-amber-400/10 text-amber-400">
                        {synonym}
                      </Badge>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Inconsistencies -->
      {#if analysis.inconsistencies.length > 0}
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-amber-400" />
            {$_('researchQuestions.inconsistenciesFound')}
            <span class="text-zinc-500">({analysis.inconsistencies.length})</span>
          </h4>
          <div class="space-y-2">
            {#each analysis.inconsistencies as inconsistency}
              <div class="p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                <div class="flex items-center gap-2 mb-2">
                  <Badge variant="outline" class="text-xs">{inconsistency.term1}</Badge>
                  <span class="text-xs text-zinc-500">vs</span>
                  <Badge variant="outline" class="text-xs">{inconsistency.term2}</Badge>
                </div>
                <p class="text-sm text-zinc-300">{inconsistency.recommendation}</p>
                <p class="text-xs text-zinc-500 mt-1">
                  {$_('researchQuestions.affectsQuestions', { values: { count: inconsistency.questionIds.length } })}
                </p>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="p-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5">
          <div class="flex items-center gap-2">
            <CheckCircle class="h-5 w-5 text-emerald-400" />
            <p class="text-sm text-zinc-300">{$_('researchQuestions.noInconsistenciesFound')}</p>
          </div>
        </div>
      {/if}

      <!-- Recommendations -->
      {#if analysis.recommendations.length > 0}
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <Lightbulb class="h-4 w-4 text-blue-400" />
            {$_('researchQuestions.recommendations')}
          </h4>
          <div class="space-y-2">
            {#each analysis.recommendations as recommendation}
              <div class="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <p class="text-sm text-zinc-300">{recommendation}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>

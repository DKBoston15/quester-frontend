<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Badge } from '$lib/components/ui/badge';
  import * as ScrollArea from '$lib/components/ui/scroll-area';
  import {
    FileText,
    BookOpen,
    RefreshCw,
    Pencil,
    CheckCircle,
    AlertTriangle,
    ExternalLink,
    Trash2,
    Sparkles,
    Lightbulb,
    Clock,
  } from 'lucide-svelte';
  import CoverageBar from './CoverageBar.svelte';
  import DesignAlignmentPanel from './DesignAlignmentPanel.svelte';
  import SuggestedSourcesList from './SuggestedSourcesList.svelte';
  import QuestionHistoryTimeline from './QuestionHistoryTimeline.svelte';
  import { researchQuestionsStore } from '$lib/stores/ResearchQuestionsStore.svelte';
  import type { ResearchQuestionWithSources, ResearchQuestionSource } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';
  import { navigate } from 'svelte-routing';
  import { projectStore } from '$lib/stores/ProjectStore.svelte';

  interface Props {
    open: boolean;
    questionId: string | null;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }

  let { open = $bindable(), questionId, onClose, onEdit, onDelete }: Props = $props();

  let question = $state<ResearchQuestionWithSources | null>(null);
  let isLoading = $state(false);
  let isRecalculating = $state(false);
  let activeTab = $state('coverage');

  // Load question when ID changes
  $effect(() => {
    if (open && questionId) {
      loadQuestion(questionId);
      activeTab = 'coverage'; // Reset to first tab
    }
  });

  const loadQuestion = async (id: string) => {
    isLoading = true;
    question = await researchQuestionsStore.loadQuestionWithSources(id);
    isLoading = false;
  };

  const handleRecalculate = async () => {
    if (!questionId) return;
    isRecalculating = true;
    await researchQuestionsStore.recalculateCoverage(questionId);
    // Reload to get updated sources
    await loadQuestion(questionId);
    isRecalculating = false;
  };

  const handleMarkAsAddressed = async () => {
    if (!questionId) return;
    await researchQuestionsStore.updateQuestion(questionId, { status: 'addressed' });
    // Reload to show updated status
    await loadQuestion(questionId);
  };

  const handleClose = () => {
    open = false;
    onClose();
  };

  // Group sources by relevance type
  const directSources = $derived(
    question?.sources?.filter((s) => s.relevanceType === 'direct_evidence') || []
  );
  const relatedSources = $derived(
    question?.sources?.filter((s) => s.relevanceType === 'related_discussion') || []
  );

  const navigateToSource = (source: ResearchQuestionSource) => {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    if (source.sourceType === 'literature') {
      navigate(`/project/${projectId}/literature/${source.sourceId}`);
    } else if (source.sourceType === 'note') {
      navigate(`/project/${projectId}/notes/${source.sourceId}`);
    }
    handleClose();
  };
</script>

<Sheet.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
  <Sheet.Content side="right" class="w-[500px] sm:max-w-[500px] p-0 flex flex-col h-full">
    <Sheet.Header class="px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
      <Sheet.Title class="text-lg font-semibold">
        {$_('researchQuestions.questionDetails')}
      </Sheet.Title>
    </Sheet.Header>

    {#if isLoading}
      <div class="p-6 space-y-4">
        <Skeleton class="h-20 w-full" />
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-32 w-full" />
      </div>
    {:else if question}
      <div class="flex flex-col flex-1 min-h-0">
        <!-- Question Text (Always visible at top) -->
        <div class="px-6 pt-6 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <p class="text-zinc-100 leading-relaxed">{question.questionText}</p>
          {#if question.description}
            <p class="text-sm text-zinc-400 mt-2">{question.description}</p>
          {/if}

          <!-- Status & Priority -->
          <div class="flex items-center gap-2 flex-wrap mt-3">
            <Badge variant={question.status === 'addressed' ? 'default' : 'secondary'}>
              {$_(`researchQuestions.status.${question.status}`)}
            </Badge>
            {#if question.priority > 0}
              <Badge variant="outline">
                {$_(`researchQuestions.priority.${['low', 'medium', 'high'][question.priority]}`)}
              </Badge>
            {/if}
          </div>
        </div>

        <!-- Tabs -->
        <Tabs.Root bind:value={activeTab} class="flex-1 flex flex-col min-h-0">
          <Tabs.List class="px-6 py-2 border-b border-white/[0.06] flex gap-1 bg-white/[0.01]">
            <Tabs.Trigger value="coverage" class="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white/[0.08] data-[state=active]:text-zinc-100 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5">
              <FileText class="h-3.5 w-3.5" />
              {$_('researchQuestions.tabs.coverage')}
            </Tabs.Trigger>
            <Tabs.Trigger value="alignment" class="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white/[0.08] data-[state=active]:text-zinc-100 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5">
              <Sparkles class="h-3.5 w-3.5" />
              {$_('researchQuestions.tabs.alignment')}
            </Tabs.Trigger>
            <Tabs.Trigger value="suggestions" class="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white/[0.08] data-[state=active]:text-zinc-100 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5">
              <Lightbulb class="h-3.5 w-3.5" />
              {$_('researchQuestions.tabs.suggestions')}
            </Tabs.Trigger>
            <Tabs.Trigger value="history" class="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white/[0.08] data-[state=active]:text-zinc-100 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5" />
              {$_('researchQuestions.tabs.history')}
            </Tabs.Trigger>
          </Tabs.List>

          <!-- Coverage Tab -->
          <Tabs.Content value="coverage" class="flex-1 min-h-0">
            <ScrollArea.Root class="h-full">
              <div class="p-6 space-y-6">
                <!-- Coverage Analysis -->
                <div class="bg-white/[0.02] rounded-lg p-4 space-y-3">
                  <h4 class="text-sm font-medium text-zinc-100">
                    {$_('researchQuestions.coverageAnalysis')}
                  </h4>
                  <CoverageBar
                    coverage={question.coveragePct}
                    breakdown={question.coverageBreakdown}
                    size="md"
                  />

                  <div class="grid grid-cols-3 gap-3 pt-2">
                    <div class="text-center p-2 bg-white/[0.02] rounded">
                      <p class="text-lg font-semibold text-emerald-400">
                        {question.coverageBreakdown?.direct || 0}%
                      </p>
                      <p class="text-xs text-zinc-500">{$_('researchQuestions.direct')}</p>
                    </div>
                    <div class="text-center p-2 bg-white/[0.02] rounded">
                      <p class="text-lg font-semibold text-amber-400">
                        {question.coverageBreakdown?.related || 0}%
                      </p>
                      <p class="text-xs text-zinc-500">{$_('researchQuestions.related')}</p>
                    </div>
                    <div class="text-center p-2 bg-white/[0.02] rounded">
                      <p class="text-lg font-semibold text-zinc-400">
                        {question.coverageBreakdown?.gap || 100}%
                      </p>
                      <p class="text-xs text-zinc-500">{$_('researchQuestions.gap')}</p>
                    </div>
                  </div>

                  <!-- AI Explanation -->
                  <div class="mt-3 pt-3 border-t border-white/[0.06]">
                    {#if question.coverageExplanation}
                      <p class="text-sm text-zinc-300 leading-relaxed">
                        {question.coverageExplanation}
                      </p>
                    {:else if question.coveragePct === 0}
                      <div class="space-y-2">
                        <p class="text-sm text-amber-400 font-medium">{$_('researchQuestions.zeroCoverageTitle')}</p>
                        <ul class="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                          <li>{$_('researchQuestions.zeroCoverageReason1')}</li>
                          <li>{$_('researchQuestions.zeroCoverageReason2')}</li>
                          <li>{$_('researchQuestions.zeroCoverageReason3')}</li>
                        </ul>
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Direct Evidence Sources -->
                {#if directSources.length > 0}
                  <div>
                    <h4 class="text-sm font-medium text-zinc-100 mb-3 flex items-center gap-2">
                      <FileText class="h-4 w-4 text-emerald-400" />
                      {$_('researchQuestions.directEvidence')}
                      <span class="text-zinc-500">({directSources.length})</span>
                    </h4>
                    <div class="space-y-2">
                      {#each directSources as source}
                        <button
                          type="button"
                          class="w-full text-left p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] transition-colors"
                          onclick={() => navigateToSource(source)}
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-2">
                                {#if source.sourceType === 'literature'}
                                  <BookOpen class="h-3 w-3 text-zinc-400 flex-shrink-0" />
                                {:else}
                                  <FileText class="h-3 w-3 text-zinc-400 flex-shrink-0" />
                                {/if}
                                {#if source.sourceType === 'literature'}
                                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-amber-400/10 text-amber-300 border-amber-400/20">
                                    {$_('researchQuestions.sourceTypeLiterature')}
                                  </Badge>
                                {:else if source.noteCategory === 'literature_note'}
                                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-violet-400/10 text-violet-300 border-violet-400/20">
                                    {$_('researchQuestions.sourceTypeLiteratureNote')}
                                  </Badge>
                                {:else}
                                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-cyan-400/10 text-cyan-300 border-cyan-400/20">
                                    {$_('researchQuestions.sourceTypeResearchNote')}
                                  </Badge>
                                {/if}
                                <span class="text-sm text-zinc-200 truncate">
                                  {source.sourceTitle || source.sourceId}
                                </span>
                              </div>
                              {#if source.excerpt}
                                <p class="text-xs text-zinc-500 mt-1 line-clamp-2">{source.excerpt}</p>
                              {/if}
                            </div>
                            <div class="flex items-center gap-2">
                              <span class="text-xs text-emerald-400">
                                {Math.round((source.relevanceScore || 0) * 100)}%
                              </span>
                              <ExternalLink class="h-3 w-3 text-zinc-500" />
                            </div>
                          </div>
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Related Discussion Sources -->
                {#if relatedSources.length > 0}
                  <div>
                    <h4 class="text-sm font-medium text-zinc-100 mb-3 flex items-center gap-2">
                      <FileText class="h-4 w-4 text-amber-400" />
                      {$_('researchQuestions.relatedDiscussion')}
                      <span class="text-zinc-500">({relatedSources.length})</span>
                    </h4>
                    <div class="space-y-2">
                      {#each relatedSources as source}
                        <button
                          type="button"
                          class="w-full text-left p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] transition-colors"
                          onclick={() => navigateToSource(source)}
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-2">
                                {#if source.sourceType === 'literature'}
                                  <BookOpen class="h-3 w-3 text-zinc-400 flex-shrink-0" />
                                {:else}
                                  <FileText class="h-3 w-3 text-zinc-400 flex-shrink-0" />
                                {/if}
                                {#if source.sourceType === 'literature'}
                                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-amber-400/10 text-amber-300 border-amber-400/20">
                                    {$_('researchQuestions.sourceTypeLiterature')}
                                  </Badge>
                                {:else if source.noteCategory === 'literature_note'}
                                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-violet-400/10 text-violet-300 border-violet-400/20">
                                    {$_('researchQuestions.sourceTypeLiteratureNote')}
                                  </Badge>
                                {:else}
                                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-cyan-400/10 text-cyan-300 border-cyan-400/20">
                                    {$_('researchQuestions.sourceTypeResearchNote')}
                                  </Badge>
                                {/if}
                                <span class="text-sm text-zinc-200 truncate">
                                  {source.sourceTitle || source.sourceId}
                                </span>
                              </div>
                              {#if source.excerpt}
                                <p class="text-xs text-zinc-500 mt-1 line-clamp-2">{source.excerpt}</p>
                              {/if}
                            </div>
                            <div class="flex items-center gap-2">
                              <span class="text-xs text-amber-400">
                                {Math.round((source.relevanceScore || 0) * 100)}%
                              </span>
                              <ExternalLink class="h-3 w-3 text-zinc-500" />
                            </div>
                          </div>
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- No Sources -->
                {#if directSources.length === 0 && relatedSources.length === 0}
                  <div class="text-center py-8">
                    <AlertTriangle class="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                    <p class="text-sm text-zinc-400">{$_('researchQuestions.noSourcesFound')}</p>
                    <p class="text-xs text-zinc-500 mt-1">{$_('researchQuestions.tryRecalculating')}</p>
                  </div>
                {/if}
              </div>
            </ScrollArea.Root>
          </Tabs.Content>

          <!-- Design Alignment Tab -->
          <Tabs.Content value="alignment" class="flex-1 min-h-0">
            <ScrollArea.Root class="h-full">
              <div class="p-6">
                <DesignAlignmentPanel questionId={question.id} />
              </div>
            </ScrollArea.Root>
          </Tabs.Content>

          <!-- Suggested Sources Tab -->
          <Tabs.Content value="suggestions" class="flex-1 min-h-0">
            <ScrollArea.Root class="h-full">
              <div class="p-6">
                <SuggestedSourcesList
                  questionId={question.id}
                  onSourceAccepted={() => questionId && loadQuestion(questionId)}
                />
              </div>
            </ScrollArea.Root>
          </Tabs.Content>

          <!-- History Tab -->
          <Tabs.Content value="history" class="flex-1 min-h-0">
            <ScrollArea.Root class="h-full">
              <div class="p-6">
                <QuestionHistoryTimeline questionId={question.id} />
              </div>
            </ScrollArea.Root>
          </Tabs.Content>
        </Tabs.Root>

        <!-- Footer Actions -->
        <div class="px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
          <div class="flex flex-col gap-3 w-full">
            {#if question.status !== 'addressed'}
              <Button variant="default" class="w-full" onclick={handleMarkAsAddressed}>
                <CheckCircle class="h-4 w-4 mr-2" />
                {$_('researchQuestions.markAddressed')}
              </Button>
            {/if}
            <div class="flex gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                class="flex-1"
                onclick={handleRecalculate}
                disabled={isRecalculating}
              >
                <RefreshCw class="h-4 w-4 mr-2 {isRecalculating ? 'animate-spin' : ''}" />
                {$_('researchQuestions.recalculate')}
              </Button>
              <Button variant="outline" size="sm" class="flex-1" onclick={onEdit}>
                <Pencil class="h-4 w-4 mr-2" />
                {$_('researchQuestions.edit')}
              </Button>
              <Button variant="outline" size="sm" class="flex-1 text-red-400 hover:text-red-400 hover:bg-red-400/10" onclick={onDelete}>
                <Trash2 class="h-4 w-4 mr-2" />
                {$_('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </Sheet.Content>
</Sheet.Root>

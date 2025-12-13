<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import {
    BookOpen,
    FileText,
    Check,
    X,
    RefreshCw,
    Sparkles,
    Lightbulb,
  } from 'lucide-svelte';
  import { researchQuestionsStore } from '$lib/stores/ResearchQuestionsStore.svelte';
  import type { SuggestedSource } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';
  import { toast } from 'svelte-sonner';

  interface Props {
    questionId: string;
    onSourceAccepted?: () => void;
  }

  let { questionId, onSourceAccepted }: Props = $props();

  let suggestions = $state<SuggestedSource[]>([]);
  let isLoading = $state(false);
  let processingIds = $state<Set<string>>(new Set());

  // Load suggestions on mount
  $effect(() => {
    loadSuggestions();
  });

  const loadSuggestions = async () => {
    isLoading = true;
    suggestions = await researchQuestionsStore.loadSuggestedSources(questionId);
    isLoading = false;
  };

  const regenerateSuggestions = async () => {
    isLoading = true;
    suggestions = await researchQuestionsStore.regenerateSuggestions(questionId);
    isLoading = false;
  };

  const handleAccept = async (suggestionId: string) => {
    processingIds.add(suggestionId);
    processingIds = new Set(processingIds);

    const success = await researchQuestionsStore.acceptSuggestion(questionId, suggestionId);
    if (success) {
      toast.success($_('researchQuestions.suggestionAccepted'));
      // Update local state
      suggestions = suggestions.map((s) =>
        s.id === suggestionId ? { ...s, status: 'accepted' } : s
      );
      // Notify parent to reload question data (for Coverage tab)
      onSourceAccepted?.();
    }

    processingIds.delete(suggestionId);
    processingIds = new Set(processingIds);
  };

  const handleDismiss = async (suggestionId: string) => {
    processingIds.add(suggestionId);
    processingIds = new Set(processingIds);

    const success = await researchQuestionsStore.dismissSuggestion(questionId, suggestionId);
    if (success) {
      toast.success($_('researchQuestions.suggestionDismissed'));
      // Update local state
      suggestions = suggestions.map((s) =>
        s.id === suggestionId ? { ...s, status: 'dismissed' } : s
      );
    }

    processingIds.delete(suggestionId);
    processingIds = new Set(processingIds);
  };

  // Filter to show only pending suggestions
  const pendingSuggestions = $derived(
    suggestions.filter((s) => s.status === 'suggested')
  );

  const acceptedSuggestions = $derived(
    suggestions.filter((s) => s.status === 'accepted')
  );

  const getSimilarityColor = (score: number): string => {
    if (score >= 0.7) return 'text-emerald-400';
    if (score >= 0.5) return 'text-amber-400';
    return 'text-zinc-400';
  };

  const formatSimilarity = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };
</script>

<div class="space-y-4">
  {#if isLoading}
    <div class="space-y-3">
      {#each Array(3) as _}
        <Skeleton class="h-20 w-full" />
      {/each}
    </div>
  {:else if suggestions.length === 0}
    <div class="text-center py-6">
      <Lightbulb class="h-8 w-8 text-zinc-500 mx-auto mb-2" />
      <p class="text-sm text-zinc-400">{$_('researchQuestions.noSuggestionsYet')}</p>
      <p class="text-xs text-zinc-500 mt-1">{$_('researchQuestions.suggestionsWillAppear')}</p>
    </div>
  {:else}
    <!-- Pending Suggestions -->
    {#if pendingSuggestions.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
          <Sparkles class="h-4 w-4 text-purple-400" />
          {$_('researchQuestions.suggestedSources')}
          <span class="text-zinc-500">({pendingSuggestions.length})</span>
        </h4>
        <div class="space-y-2">
          {#each pendingSuggestions as suggestion}
            {@const isProcessing = processingIds.has(suggestion.id)}
            <div
              class="p-3 rounded-lg border border-purple-400/20 bg-purple-400/5 transition-opacity {isProcessing
                ? 'opacity-50'
                : ''}"
            >
              <div class="flex items-start gap-3">
                <!-- Icon -->
                <div
                  class="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0"
                >
                  {#if suggestion.sourceType === 'literature'}
                    <BookOpen class="h-4 w-4 text-zinc-400" />
                  {:else}
                    <FileText class="h-4 w-4 text-zinc-400" />
                  {/if}
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    {#if suggestion.sourceType === 'literature'}
                      <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-amber-400/10 text-amber-300 border-amber-400/20">
                        {$_('researchQuestions.sourceTypeLiterature')}
                      </Badge>
                    {:else if suggestion.noteCategory === 'literature_note'}
                      <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-violet-400/10 text-violet-300 border-violet-400/20">
                        {$_('researchQuestions.sourceTypeLiteratureNote')}
                      </Badge>
                    {:else}
                      <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-cyan-400/10 text-cyan-300 border-cyan-400/20">
                        {$_('researchQuestions.sourceTypeResearchNote')}
                      </Badge>
                    {/if}
                    <span class="text-sm text-zinc-200 truncate">
                      {suggestion.sourceTitle || 'Untitled'}
                    </span>
                    <Badge variant="outline" class="text-xs {getSimilarityColor(suggestion.similarityScore)}">
                      {formatSimilarity(suggestion.similarityScore)} match
                    </Badge>
                  </div>

                  {#if suggestion.excerpt}
                    <p class="text-xs text-zinc-500 line-clamp-2 mb-2">{suggestion.excerpt}</p>
                  {/if}

                  <div class="mt-2 pt-2 border-t border-white/[0.06]">
                    {#if suggestion.matchingTerms && suggestion.matchingTerms.length > 0}
                      <span class="text-[10px] text-zinc-500 uppercase tracking-wider">{$_('researchQuestions.matchedBecause')}:</span>
                      <div class="flex flex-wrap gap-1 mt-1">
                        {#each suggestion.matchingTerms.slice(0, 5) as term}
                          <span class="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-300 border border-purple-400/20">
                            {term}
                          </span>
                        {/each}
                        {#if suggestion.matchingTerms.length > 5}
                          <span class="text-xs px-2 py-0.5 text-zinc-500">
                            +{suggestion.matchingTerms.length - 5} more
                          </span>
                        {/if}
                      </div>
                    {:else}
                      <span class="text-[10px] text-zinc-500 uppercase tracking-wider">{$_('researchQuestions.matchedBecause')}:</span>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <span class="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-300 border border-blue-400/20">
                          {$_('researchQuestions.semanticSimilarity')}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-400 hover:bg-emerald-400/10"
                    onclick={() => handleAccept(suggestion.id)}
                    disabled={isProcessing}
                    title={$_('researchQuestions.acceptSuggestion')}
                  >
                    <Check class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0 text-red-400 hover:text-red-400 hover:bg-red-400/10"
                    onclick={() => handleDismiss(suggestion.id)}
                    disabled={isProcessing}
                    title={$_('researchQuestions.dismissSuggestion')}
                  >
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Accepted Suggestions -->
    {#if acceptedSuggestions.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-zinc-100 flex items-center gap-2">
          <Check class="h-4 w-4 text-emerald-400" />
          {$_('researchQuestions.acceptedSuggestions')}
          <span class="text-zinc-500">({acceptedSuggestions.length})</span>
        </h4>
        <div class="space-y-2">
          {#each acceptedSuggestions as suggestion}
            <div
              class="p-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5"
            >
              <div class="flex items-center gap-2">
                {#if suggestion.sourceType === 'literature'}
                  <BookOpen class="h-4 w-4 text-emerald-400" />
                {:else}
                  <FileText class="h-4 w-4 text-emerald-400" />
                {/if}
                {#if suggestion.sourceType === 'literature'}
                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-amber-400/10 text-amber-300 border-amber-400/20">
                    {$_('researchQuestions.sourceTypeLiterature')}
                  </Badge>
                {:else if suggestion.noteCategory === 'literature_note'}
                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-violet-400/10 text-violet-300 border-violet-400/20">
                    {$_('researchQuestions.sourceTypeLiteratureNote')}
                  </Badge>
                {:else}
                  <Badge variant="secondary" class="text-[10px] px-1.5 py-0 h-4 bg-cyan-400/10 text-cyan-300 border-cyan-400/20">
                    {$_('researchQuestions.sourceTypeResearchNote')}
                  </Badge>
                {/if}
                <span class="text-sm text-zinc-200 truncate flex-1">
                  {suggestion.sourceTitle || 'Untitled'}
                </span>
                <Badge variant="outline" class="text-xs text-emerald-400">
                  {$_('researchQuestions.linked')}
                </Badge>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Refresh button -->
    <div class="flex justify-end pt-2">
      <Button variant="outline" size="sm" onclick={regenerateSuggestions} disabled={isLoading}>
        <RefreshCw class="h-4 w-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
        {$_('researchQuestions.refreshSuggestions')}
      </Button>
    </div>
  {/if}
</div>

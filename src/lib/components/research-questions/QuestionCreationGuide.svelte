<script lang="ts">
  import { researchQuestionsStore } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import {
    Target,
    Sparkles,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    List,
    ArrowRight,
    AlertCircle,
  } from "lucide-svelte";

  let {
    projectPurpose,
    existingQuestions,
    onUseSuggestion,
  }: {
    projectPurpose: string | null;
    existingQuestions: Array<{ question: string }>;
    onUseSuggestion: (question: string) => void;
  } = $props();

  let showExistingQuestions = $state(false);
  let isLoadingSuggestions = $state(false);
  let suggestions = $state<Array<{ question: string; rationale: string }>>([]);
  let suggestionError = $state<string | null>(null);
  let hasFetchedSuggestions = $state(false);

  async function fetchSuggestions() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    isLoadingSuggestions = true;
    suggestionError = null;

    try {
      suggestions = await researchQuestionsStore.suggestQuestions(projectId);
      hasFetchedSuggestions = true;
    } catch (err) {
      suggestionError = "Couldn't generate suggestions. Try again.";
      console.error("Error fetching suggestions:", err);
    } finally {
      isLoadingSuggestions = false;
    }
  }

  function handleUseSuggestion(question: string) {
    onUseSuggestion(question);
  }
</script>

<div class="space-y-4 mt-6 border-t pt-6">
  <!-- Section A: Project Context -->
  <div class="space-y-2">
    {#if projectPurpose}
      <div class="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <Target class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div class="min-w-0">
          <p class="text-xs font-medium text-muted-foreground mb-0.5">Project Purpose</p>
          <p class="text-sm">{projectPurpose}</p>
        </div>
      </div>
    {:else}
      <div class="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <Target class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p class="text-xs text-muted-foreground">
          Set a project purpose to get better AI suggestions.
        </p>
      </div>
    {/if}

    {#if existingQuestions.length > 0}
      <button
        class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onclick={() => (showExistingQuestions = !showExistingQuestions)}
      >
        <List class="h-3.5 w-3.5" />
        {existingQuestions.length} existing question{existingQuestions.length === 1 ? "" : "s"}
        {#if showExistingQuestions}
          <ChevronUp class="h-3 w-3" />
        {:else}
          <ChevronDown class="h-3 w-3" />
        {/if}
      </button>

      {#if showExistingQuestions}
        <ul class="pl-5 space-y-1">
          {#each existingQuestions as q}
            <li class="text-xs text-muted-foreground list-disc">{q.question}</li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>

  <!-- Section B: Quick Tips -->
  <div class="p-3 rounded-lg bg-muted/50">
    <div class="flex items-center gap-1.5 mb-2">
      <Lightbulb class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-xs font-medium text-muted-foreground">Quick Tips</span>
    </div>
    <ul class="space-y-1 text-xs text-muted-foreground">
      <li>Start with <span class="font-medium">How</span>, <span class="font-medium">What</span>, or <span class="font-medium">To what extent</span> — avoid yes/no questions</li>
      <li>Be specific about who, what, and where</li>
      <li>Make sure it's answerable within your project's scope</li>
      <li>Don't aim for perfection — refine with Quester's analysis tools after creating</li>
    </ul>
  </div>

  <!-- Section C: AI Suggestions -->
  <div class="space-y-3">
    {#if !hasFetchedSuggestions}
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={fetchSuggestions}
          disabled={isLoadingSuggestions}
        >
          {#if isLoadingSuggestions}
            <RefreshCw class="h-3.5 w-3.5 mr-1.5 animate-spin" />
            Generating...
          {:else}
            <Sparkles class="h-3.5 w-3.5 mr-1.5" />
            Suggest questions
          {/if}
        </Button>
        {#if !projectPurpose}
          <span class="text-xs text-muted-foreground">
            Suggestions improve with more project context
          </span>
        {/if}
      </div>
    {/if}

    {#if suggestionError}
      <div class="flex items-center gap-2 text-xs text-destructive">
        <AlertCircle class="h-3.5 w-3.5" />
        {suggestionError}
        <button
          class="underline hover:no-underline"
          onclick={fetchSuggestions}
        >
          Try again
        </button>
      </div>
    {/if}

    {#if hasFetchedSuggestions && suggestions.length > 0}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <Sparkles class="h-3.5 w-3.5 text-primary" />
            <span class="text-xs font-medium">AI Suggestions</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 text-xs"
            onclick={fetchSuggestions}
            disabled={isLoadingSuggestions}
          >
            {#if isLoadingSuggestions}
              <RefreshCw class="h-3 w-3 mr-1 animate-spin" />
            {/if}
            Regenerate
          </Button>
        </div>

        {#each suggestions as suggestion}
          <Card.Root class="border">
            <Card.Content class="p-3 space-y-2">
              <p class="text-sm">{suggestion.question}</p>
              <p class="text-xs text-muted-foreground italic">{suggestion.rationale}</p>
              <Button
                variant="ghost"
                size="sm"
                class="h-7 text-xs"
                onclick={() => handleUseSuggestion(suggestion.question)}
              >
                <ArrowRight class="h-3 w-3 mr-1" />
                Use as starting point
              </Button>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    {/if}
  </div>
</div>

<script lang="ts">
  import {
    researchQuestionsStore,
    type ResearchQuestion,
    type ResearchQuestionStatus,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Badge } from "$lib/components/ui/badge";
  import * as Select from "$lib/components/ui/select";
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import {
    Save,
    X,
    Sparkles,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Check,
    Trash2,
  } from "lucide-svelte";

  let {
    question,
    ondelete,
  }: {
    question: ResearchQuestion;
    ondelete?: (id: string) => void;
  } = $props();

  // Edit form state
  let isEditing = $state(false);
  let editQuestion = $state("");
  let editDescription = $state("");
  let editStatus = $state<ResearchQuestionStatus>("draft");

  // Save status
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);
  let lastSavedAt = $state<number | null>(null);

  // Validation
  let validationErrors = $state<Record<string, string>>({});

  // AI suggestions
  let suggestionsOpen = $state(false);

  // Derived
  let streamingAnalysis = $derived(researchQuestionsStore.streamingAnalysis);
  let isLoading = $derived(researchQuestionsStore.isLoading);
  let hasChanges = $derived.by(() => {
    if (!isEditing) return false;
    return (
      editQuestion !== question.question ||
      editDescription !== question.description ||
      editStatus !== question.status
    );
  });

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
  ] as const;

  function startEditing() {
    editQuestion = question.question;
    editDescription = question.description;
    editStatus = question.status;
    validationErrors = {};
    saveError = null;
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
    validationErrors = {};
    saveError = null;
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!editQuestion.trim()) {
      errors.question = "Question text is required.";
    }
    validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function saveEdit() {
    if (!validate()) return;

    isSaving = true;
    saveError = null;

    try {
      await researchQuestionsStore.updateQuestion(question.id, {
        question: editQuestion.trim(),
        description: editDescription.trim(),
        status: editStatus,
      });
      lastSavedAt = Date.now();
      isEditing = false;
    } catch (err) {
      saveError =
        err instanceof Error ? err.message : "Failed to save changes.";
    } finally {
      isSaving = false;
    }
  }

  async function handleAnalyzeAlignment() {
    suggestionsOpen = true;
    await researchQuestionsStore.analyzeAlignment(question.id);
  }

  function acceptSuggestion() {
    if (streamingAnalysis?.content) {
      // Apply the AI suggestion as the new question text if in edit mode
      if (isEditing) {
        editQuestion = streamingAnalysis.content;
      }
    }
    researchQuestionsStore.cancelAnalysis();
    suggestionsOpen = false;
  }

  function dismissSuggestion() {
    researchQuestionsStore.cancelAnalysis();
    suggestionsOpen = false;
  }

  function getStatusBadgeVariant(
    status: ResearchQuestionStatus,
  ): "default" | "active" | "archived" {
    switch (status) {
      case "draft":
        return "default";
      case "active":
        return "active";
      case "archived":
        return "archived";
      default:
        return "default";
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
</script>

<div class="space-y-4">
  {#if isEditing}
    <!-- Edit Mode -->
    <div class="space-y-3">
      <div>
        <label for="edit-question-text" class="text-sm font-medium mb-1 block">
          Question
        </label>
        <Textarea
          id="edit-question-text"
          bind:value={editQuestion}
          class="min-h-[80px] {validationErrors.question ? 'border-destructive' : ''}"
          placeholder="Enter your research question..."
        />
        {#if validationErrors.question}
          <p class="text-xs text-destructive mt-1">{validationErrors.question}</p>
        {/if}
      </div>

      <div>
        <label for="edit-question-desc" class="text-sm font-medium mb-1 block">
          Description
        </label>
        <Textarea
          id="edit-question-desc"
          bind:value={editDescription}
          class="min-h-[60px]"
          placeholder="Add context or details about this question..."
        />
      </div>

      <div>
        <span class="text-sm font-medium mb-1 block">Status</span>
        <Select.Root
          type="single"
          value={editStatus}
          onValueChange={(value) => {
            if (value) editStatus = value as ResearchQuestionStatus;
          }}
        >
          <Select.Trigger class="w-48">
            <span class="truncate">
              {statusOptions.find((o) => o.value === editStatus)?.label ?? editStatus}
            </span>
          </Select.Trigger>
          <Select.Content>
            {#each statusOptions as option}
              <Select.Item value={option.value} label={option.label} />
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <!-- Save Status -->
    <div class="flex items-center gap-2">
      {#if isSaving}
        <span class="text-sm text-muted-foreground flex items-center gap-1">
          <RefreshCw class="h-3 w-3 animate-spin" />
          Saving...
        </span>
      {:else if lastSavedAt}
        <span class="text-sm text-muted-foreground">
          Saved at {new Date(lastSavedAt).toLocaleTimeString()}
        </span>
      {/if}
      {#if saveError}
        <span class="text-sm text-destructive">{saveError}</span>
      {/if}
    </div>

    <!-- Save/Cancel Buttons -->
    <div class="flex gap-2">
      <Button onclick={saveEdit} disabled={isSaving || !hasChanges}>
        <Save class="h-4 w-4 mr-2" />
        Save Changes
      </Button>
      <Button variant="outline" onclick={cancelEditing} disabled={isSaving}>
        Cancel
      </Button>
    </div>
  {:else}
    <!-- View Mode -->
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-xl font-semibold leading-tight">
          {question.question}
        </h2>
        <Badge variant={getStatusBadgeVariant(question.status)}>
          {question.status}
        </Badge>
      </div>

      {#if question.description}
        <p class="text-muted-foreground">{question.description}</p>
      {/if}

      <div class="text-xs text-muted-foreground">
        Version {question.version} &middot; Updated {formatDate(question.updatedAt)}
      </div>

      <div class="flex gap-2">
        <Button variant="outline" size="sm" onclick={startEditing}>
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onclick={handleAnalyzeAlignment}
          disabled={isLoading}
        >
          <Sparkles class="h-3.5 w-3.5 mr-1.5" />
          {isLoading ? "Analyzing..." : "Analyze with AI"}
        </Button>
        {#if ondelete}
          <Button
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            onclick={() => ondelete?.(question.id)}
          >
            <Trash2 class="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- AI-Suggested Improvements (Collapsible) -->
  {#if streamingAnalysis}
    <Collapsible.Root bind:open={suggestionsOpen}>
      <Card.Root class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <Collapsible.Trigger class="w-full text-left">
          <Card.Header class="pb-2">
            <Card.Title class="text-sm flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-primary" />
              AI-Suggested Improvements
              {#if !streamingAnalysis.isComplete}
                <RefreshCw class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              {/if}
              <span class="ml-auto">
                {#if suggestionsOpen}
                  <ChevronUp class="h-4 w-4 text-muted-foreground" />
                {:else}
                  <ChevronDown class="h-4 w-4 text-muted-foreground" />
                {/if}
              </span>
            </Card.Title>
          </Card.Header>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <Card.Content class="pt-0">
            <p class="text-sm whitespace-pre-wrap mb-3">
              {streamingAnalysis.content}
            </p>

            {#if streamingAnalysis.isComplete}
              <div class="flex gap-2">
                <Button size="sm" onclick={acceptSuggestion}>
                  <Check class="h-3.5 w-3.5 mr-1.5" />
                  Accept
                </Button>
                <Button variant="outline" size="sm" onclick={dismissSuggestion}>
                  <X class="h-3.5 w-3.5 mr-1.5" />
                  Dismiss
                </Button>
              </div>
            {/if}
          </Card.Content>
        </Collapsible.Content>
      </Card.Root>
    </Collapsible.Root>
  {/if}
</div>

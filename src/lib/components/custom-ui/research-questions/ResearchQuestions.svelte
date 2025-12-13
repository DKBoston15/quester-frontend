<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import * as Collapsible from '$lib/components/ui/collapsible';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import EmptyState from '$lib/components/ui/empty-state/EmptyState.svelte';
  import { Plus, ChevronDown, ChevronRight, HelpCircle, RefreshCw, Loader2 } from 'lucide-svelte';
  import QuestionCard from './QuestionCard.svelte';
  import AddEditModal from './AddEditModal.svelte';
  import DetailDrawer from './DetailDrawer.svelte';
  import { researchQuestionsStore } from '$lib/stores/ResearchQuestionsStore.svelte';
  import type { ResearchQuestion } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';
  import { toast } from 'svelte-sonner';

  interface Props {
    projectId: string;
    variant?: 'card' | 'panel';
    maxVisible?: number;
  }

  let { projectId, variant = 'card', maxVisible = 3 }: Props = $props();

  // Modal/drawer state
  let isAddModalOpen = $state(false);
  let editingQuestion = $state<ResearchQuestion | null>(null);
  let isDetailDrawerOpen = $state(false);
  let selectedQuestionId = $state<string | null>(null);

  // Collapsible state for panel variant
  let isExpanded = $state(true);

  // Delete confirmation state
  let showDeleteDialog = $state(false);
  let pendingDeleteQuestion = $state<ResearchQuestion | null>(null);
  let isDeleting = $state(false);

  // Load questions when projectId changes
  $effect(() => {
    if (projectId) {
      researchQuestionsStore.loadQuestions(projectId);
    }
  });

  const questions = $derived(researchQuestionsStore.questions);
  const summary = $derived(researchQuestionsStore.summary);
  const isLoading = $derived(researchQuestionsStore.isLoading);
  const displayQuestions = $derived(
    variant === 'card' ? questions.slice(0, maxVisible) : questions
  );
  const hasMore = $derived(variant === 'card' && questions.length > maxVisible);

  const handleAddClick = () => {
    editingQuestion = null;
    isAddModalOpen = true;
  };

  const handleEditClick = (question: ResearchQuestion) => {
    editingQuestion = question;
    isAddModalOpen = true;
  };

  const handleQuestionClick = (question: ResearchQuestion) => {
    selectedQuestionId = question.id;
    isDetailDrawerOpen = true;
  };

  const handleDeleteClick = (question: ResearchQuestion) => {
    pendingDeleteQuestion = question;
    showDeleteDialog = true;
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteQuestion) return;

    isDeleting = true;
    try {
      const success = await researchQuestionsStore.deleteQuestion(pendingDeleteQuestion.id);
      if (success) {
        toast.success($_('researchQuestions.questionDeleted'));
      } else {
        toast.error($_('researchQuestions.deleteFailed'));
      }
    } finally {
      isDeleting = false;
      showDeleteDialog = false;
      pendingDeleteQuestion = null;
    }
  };

  const handleRecalculateClick = async (question: ResearchQuestion) => {
    const result = await researchQuestionsStore.recalculateCoverage(question.id);
    if (result) {
      toast.success($_('researchQuestions.coverageUpdated'));
    } else {
      toast.error($_('researchQuestions.recalculateFailed'));
    }
  };

  const handleModalClose = () => {
    isAddModalOpen = false;
    editingQuestion = null;
  };

  const handleDrawerClose = () => {
    isDetailDrawerOpen = false;
    selectedQuestionId = null;
  };

  const handleDrawerEdit = () => {
    if (selectedQuestionId) {
      const question = questions.find((q) => q.id === selectedQuestionId);
      if (question) {
        isDetailDrawerOpen = false;
        handleEditClick(question);
      }
    }
  };

  const handleDrawerDelete = async () => {
    if (selectedQuestionId) {
      const question = questions.find((q) => q.id === selectedQuestionId);
      if (question) {
        isDetailDrawerOpen = false;
        await handleDeleteClick(question);
      }
    }
  };
</script>

{#if variant === 'card'}
  <!-- Card Variant for Project Overview -->
  <Card.Root>
    <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-4">
      <Card.Title class="text-xl flex items-center gap-2">
        <HelpCircle class="h-5 w-5 text-zinc-400" />
        {$_('researchQuestions.title')}
      </Card.Title>
      <Button variant="outline" size="sm" onclick={handleAddClick}>
        <Plus class="h-4 w-4 mr-1" />
        {$_('researchQuestions.add')}
      </Button>
    </Card.Header>

    <Card.Content class="space-y-3">
      {#if isLoading}
        <div class="space-y-3">
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
        </div>
      {:else if questions.length === 0}
        <EmptyState
          title={$_('researchQuestions.noQuestions')}
          description={$_('researchQuestions.noQuestionsDescription')}
          variant="data-empty"
          height="h-auto"
        />
      {:else}
        {#each displayQuestions as question (question.id)}
          <QuestionCard
            {question}
            variant="compact"
            isRecalculating={researchQuestionsStore.isRecalculating(question.id)}
            onclick={() => handleQuestionClick(question)}
            onEdit={() => handleEditClick(question)}
            onDelete={() => handleDeleteClick(question)}
            onRecalculate={() => handleRecalculateClick(question)}
          />
        {/each}
      {/if}
    </Card.Content>

    {#if questions.length > 0}
      <Card.Footer class="pt-0">
        <div class="flex items-center justify-between w-full text-sm text-zinc-400">
          <span>
            {questions.length} {$_('researchQuestions.questions')} ·
            {summary?.avgCoverage || 0}% {$_('researchQuestions.avgCoverage')}
          </span>
          {#if hasMore}
            <Button variant="link" size="sm" class="text-zinc-400 hover:text-zinc-200 p-0 h-auto">
              {$_('researchQuestions.viewAll')}
              <ChevronRight class="h-4 w-4 ml-1" />
            </Button>
          {/if}
        </div>
      </Card.Footer>
    {/if}
  </Card.Root>
{:else}
  <!-- Panel Variant for Command Center Sidebar -->
  <Collapsible.Root bind:open={isExpanded}>
    <div class="border-b border-white/[0.06]">
      <Collapsible.Trigger class="w-full">
        <div class="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
          <div class="flex items-center gap-2">
            <HelpCircle class="h-5 w-5 text-zinc-400" />
            <span class="font-medium text-zinc-100">{$_('researchQuestions.title')}</span>
            <span class="text-xs text-zinc-500">({questions.length})</span>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              onclick={(e: MouseEvent) => {
                e.stopPropagation();
                handleAddClick();
              }}
            >
              <Plus class="h-4 w-4" />
            </Button>
            <ChevronDown
              class="h-4 w-4 text-zinc-400 transition-transform {isExpanded
                ? ''
                : '-rotate-90'}"
            />
          </div>
        </div>
      </Collapsible.Trigger>
    </div>

    <Collapsible.Content>
      <div class="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {#if isLoading}
          <div class="space-y-3">
            <Skeleton class="h-24 w-full" />
            <Skeleton class="h-24 w-full" />
          </div>
        {:else if questions.length === 0}
          <EmptyState
            title={$_('researchQuestions.noQuestions')}
            description={$_('researchQuestions.noQuestionsDescription')}
            variant="data-empty"
            height="h-[200px]"
          />
        {:else}
          {#each questions as question (question.id)}
            <QuestionCard
              {question}
              variant="standard"
              isRecalculating={researchQuestionsStore.isRecalculating(question.id)}
              onclick={() => handleQuestionClick(question)}
              onEdit={() => handleEditClick(question)}
              onDelete={() => handleDeleteClick(question)}
              onRecalculate={() => handleRecalculateClick(question)}
            />
          {/each}
        {/if}
      </div>

      {#if questions.length > 0 && summary}
        <div class="px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
          <div class="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {summary.goodCoverageCount} of {summary.total} {$_('researchQuestions.goodCoverage')}
            </span>
            <span>{summary.avgCoverage}% {$_('researchQuestions.avgCoverage')}</span>
          </div>
        </div>
      {/if}
    </Collapsible.Content>
  </Collapsible.Root>
{/if}

<!-- Add/Edit Modal -->
<AddEditModal
  bind:open={isAddModalOpen}
  question={editingQuestion}
  {projectId}
  onClose={handleModalClose}
/>

<!-- Detail Drawer -->
<DetailDrawer
  bind:open={isDetailDrawerOpen}
  questionId={selectedQuestionId}
  onClose={handleDrawerClose}
  onEdit={handleDrawerEdit}
  onDelete={handleDrawerDelete}
/>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{$_('researchQuestions.deleteQuestion')}</AlertDialog.Title>
      <AlertDialog.Description>
        {$_('researchQuestions.confirmDelete')}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>{$_('common.cancel')}</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleConfirmDelete}
        disabled={isDeleting}
        class="bg-destructive hover:bg-destructive/90"
      >
        {#if isDeleting}
          <Loader2 class="h-4 w-4 animate-spin mr-2" />
        {/if}
        {$_('common.delete')}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

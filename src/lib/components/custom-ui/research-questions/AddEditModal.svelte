<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as RadioGroup from '$lib/components/ui/radio-group';
  import { researchQuestionsStore } from '$lib/stores/ResearchQuestionsStore.svelte';
  import type { ResearchQuestion } from '$lib/types/research-question';
  import { _ } from 'svelte-i18n';
  import { toast } from 'svelte-sonner';

  interface Props {
    open: boolean;
    question?: ResearchQuestion | null;
    projectId: string;
    onClose: () => void;
  }

  let { open = $bindable(), question = null, projectId, onClose }: Props = $props();

  let questionText = $state('');
  let description = $state('');
  let priority = $state('0');
  let isSaving = $state(false);
  let errors = $state<{ questionText?: string }>({});

  // Initialize form when question changes
  $effect(() => {
    if (open) {
      if (question) {
        questionText = question.questionText;
        description = question.description || '';
        priority = String(question.priority);
      } else {
        questionText = '';
        description = '';
        priority = '0';
      }
      errors = {};
    }
  });

  const isEditing = $derived(!!question);
  const title = $derived(
    isEditing
      ? $_('researchQuestions.editQuestion')
      : $_('researchQuestions.addQuestion')
  );

  const validate = (): boolean => {
    const newErrors: { questionText?: string } = {};

    if (!questionText.trim()) {
      newErrors.questionText = $_('researchQuestions.validation.questionRequired');
    } else if (questionText.length < 10) {
      newErrors.questionText = $_('researchQuestions.validation.questionTooShort');
    } else if (questionText.length > 500) {
      newErrors.questionText = $_('researchQuestions.validation.questionTooLong');
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    isSaving = true;

    try {
      if (isEditing && question) {
        const success = await researchQuestionsStore.updateQuestion(question.id, {
          questionText: questionText.trim(),
          description: description.trim() || null,
          priority: parseInt(priority),
        });

        if (success) {
          toast.success($_('researchQuestions.questionUpdated'));
          handleClose();
        } else {
          toast.error($_('researchQuestions.failedToUpdate'));
        }
      } else {
        const newQuestion = await researchQuestionsStore.createQuestion(projectId, {
          questionText: questionText.trim(),
          description: description.trim() || undefined,
          priority: parseInt(priority),
        });

        if (newQuestion) {
          toast.success($_('researchQuestions.questionAdded'));
          handleClose();
        } else {
          toast.error($_('researchQuestions.failedToCreate'));
        }
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error($_('researchQuestions.saveFailed'));
    } finally {
      isSaving = false;
    }
  };

  const handleClose = () => {
    open = false;
    onClose();
  };
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>
        {$_('researchQuestions.modalDescription')}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Question Text -->
      <div class="space-y-2">
        <Label for="questionText" class="text-sm font-medium">
          {$_('researchQuestions.questionLabel')} <span class="text-red-400">*</span>
        </Label>
        <Textarea
          id="questionText"
          bind:value={questionText}
          placeholder={$_('researchQuestions.questionPlaceholder')}
          rows={3}
          class="resize-none {errors.questionText ? 'border-red-400' : ''}"
        />
        {#if errors.questionText}
          <p class="text-xs text-red-400">{errors.questionText}</p>
        {:else}
          <p class="text-xs text-zinc-500">
            {$_('researchQuestions.questionHelp')}
          </p>
        {/if}
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <Label for="description" class="text-sm font-medium">
          {$_('researchQuestions.descriptionLabel')}
        </Label>
        <Textarea
          id="description"
          bind:value={description}
          placeholder={$_('researchQuestions.descriptionPlaceholder')}
          rows={2}
          class="resize-none"
        />
        <p class="text-xs text-zinc-500">
          {$_('researchQuestions.descriptionHelp')}
        </p>
      </div>

      <!-- Priority -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">{$_('researchQuestions.priorityLabel')}</Label>
        <RadioGroup.Root bind:value={priority} class="flex gap-4">
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="0" id="priority-low" />
            <Label for="priority-low" class="cursor-pointer text-sm text-zinc-300">
              {$_('researchQuestions.priority.low')}
            </Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="1" id="priority-medium" />
            <Label for="priority-medium" class="cursor-pointer text-sm text-zinc-300">
              {$_('researchQuestions.priority.medium')}
            </Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="2" id="priority-high" />
            <Label for="priority-high" class="cursor-pointer text-sm text-zinc-300">
              {$_('researchQuestions.priority.high')}
            </Label>
          </div>
        </RadioGroup.Root>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={handleClose} disabled={isSaving}>
        {$_('common.cancel')}
      </Button>
      <Button onclick={handleSave} disabled={isSaving}>
        {#if isSaving}
          {$_('common.saving')}...
        {:else}
          {$_('common.save')}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

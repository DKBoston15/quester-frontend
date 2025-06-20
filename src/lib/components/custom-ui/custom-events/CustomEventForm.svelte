<!-- Custom Event Form Modal -->
<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import {
    X,
    Calendar,
    Clock,
    Plus,
    Minus,
    Save,
    Loader2,
    AlertCircle,
    Trophy,
    Users,
    Lightbulb,
    Gavel,
    Star,
    Target,
    Coffee,
    BookOpen,
    Zap,
    CheckCircle,
  } from "lucide-svelte";

  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";

  import { customEventsStore } from "$lib/stores/custom-events-store.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import type { CreateCustomEventForm } from "$lib/types/custom-events";
  import {
    getEventTypeOptions,
    getEventTypeConfig,
  } from "$lib/config/custom-event-types";

  const dispatch = createEventDispatcher<{
    close: void;
    success: { eventId?: number; mode: "create" | "edit" };
  }>();

  // Icon mapping for event types
  const eventTypeIcons = {
    Trophy,
    Clock,
    Users,
    Lightbulb,
    Gavel,
    Star,
    Calendar,
    Target,
    Coffee,
    BookOpen,
    Zap,
    CheckCircle,
  } as const;

  // Props
  let { open = false } = $props<{
    open?: boolean;
  }>();

  // Reactive state from store
  let formState = $derived(customEventsStore.formState);
  let currentProject = $derived(projectStore.currentProject);

  // SIMPLIFIED: Direct close handler without complex logic
  function handleClose() {
    if (!formState.loading) {
      customEventsStore.closeForm();
      dispatch("close");
    }
  }

  // Track when the modal was opened to prevent immediate closing
  let modalOpenTime = $state(0);
  let isOpening = $state(false);

  // Watch for modal opening
  $effect(() => {
    if (formState.isOpen && modalOpenTime === 0) {
      modalOpenTime = Date.now();
      isOpening = true;
      // Reset opening flag after a short delay
      setTimeout(() => {
        isOpening = false;
      }, 200);
    } else if (!formState.isOpen) {
      modalOpenTime = 0;
      isOpening = false;
    }
  });

  // Handle dialog open/close through the store
  function handleDialogOpenChange(open: boolean) {
    // Don't process close events while opening or within 200ms of opening
    if (!open && formState.isOpen) {
      const timeSinceOpen = Date.now() - modalOpenTime;
      if (isOpening || timeSinceOpen < 200) {
        // Too soon, ignore this close event
        return;
      }
      handleClose();
    }
  }

  // Local form state
  let formElement: HTMLFormElement;
  let isSubmitting = false;
  let showAdvanced = $state(false);
  let newDetail = $state("");
  let newTag = $state("");

  // Form validation state
  let fieldErrors = $derived(formState.errors);
  let hasErrors = $derived(Object.keys(fieldErrors).length > 0);
  let localErrors = $state<Record<string, string>>({});

  // Combined errors (from store + local validation)
  let allErrors = $derived({
    ...fieldErrors,
    ...localErrors,
  });

  // Event type options
  const eventTypeOptions = getEventTypeOptions();

  // Local validation function
  function validateForm() {
    localErrors = {};

    if (!formState.data.title.trim()) {
      localErrors.title = "Event title is required";
    }

    if (formState.data.title.trim().length > 200) {
      localErrors.title = "Title must be 200 characters or less";
    }

    if (
      formState.data.description &&
      formState.data.description.length > 1000
    ) {
      localErrors.description = "Description must be 1000 characters or less";
    }

    return Object.keys(localErrors).length === 0;
  }

  // Computed values
  let selectedEventTypeConfig = $derived(() => {
    return getEventTypeConfig(formState.data.eventType);
  });

  let isFormValid = $derived(() => {
    return (
      formState.data.title.trim().length > 0 &&
      formState.data.title.trim().length <= 200 &&
      formState.data.eventTimestamp &&
      (!formState.data.description ||
        formState.data.description.length <= 1000) &&
      (!formState.data.details ||
        formState.data.details.every((d: string) => d.length <= 500)) &&
      (!formState.data.tags ||
        formState.data.tags.every((t: string) => t.length <= 50)) &&
      Object.keys(allErrors).length === 0
    );
  });

  // Lifecycle
  onMount(() => {
    // Focus management
    if (open && formElement) {
      const firstInput = formElement.querySelector(
        "input, textarea, select"
      ) as HTMLElement;
      firstInput?.focus();
    }
  });

  $effect(() => {
    if (formState.isOpen) {
      // Lock body scroll when modal opens
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = "";
    }

    // Cleanup on component unmount
    return () => {
      document.body.style.overflow = "";
      // Ensure modal is closed when component unmounts
      if (formState.isOpen) {
        customEventsStore.closeForm();
      }
    };
  });

  // Event handlers
  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!validateForm() || !isFormValid || isSubmitting || !currentProject?.id)
      return;

    isSubmitting = true;

    try {
      if (formState.mode === "create") {
        const newEvent = await customEventsStore.createEvent(
          currentProject.id,
          formState.data
        );
        dispatch("success", { eventId: newEvent.id, mode: "create" });
      } else if (formState.mode === "edit" && formState.eventId) {
        const updatedEvent = await customEventsStore.updateEvent(
          formState.eventId,
          formState.data
        );
        dispatch("success", { eventId: updatedEvent.id, mode: "edit" });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      // Error handling is managed by the store
    } finally {
      isSubmitting = false;
    }
  }

  function updateField(field: keyof CreateCustomEventForm, value: any) {
    customEventsStore.updateFormData({ [field]: value });
  }

  function addDetail() {
    if (
      newDetail.trim() &&
      formState.data.details &&
      formState.data.details.length < 5
    ) {
      const updatedDetails = [
        ...(formState.data.details || []),
        newDetail.trim(),
      ];
      updateField("details", updatedDetails);
      newDetail = "";
    }
  }

  function removeDetail(index: number) {
    if (formState.data.details) {
      const updatedDetails = formState.data.details.filter(
        (_: string, i: number) => i !== index
      );
      updateField("details", updatedDetails);
    }
  }

  function addTag() {
    if (
      newTag.trim() &&
      formState.data.tags &&
      formState.data.tags.length < 10
    ) {
      const trimmedTag = newTag.trim().toLowerCase();
      if (!formState.data.tags.includes(trimmedTag)) {
        const updatedTags = [...(formState.data.tags || []), trimmedTag];
        updateField("tags", updatedTags);
      }
      newTag = "";
    }
  }

  function removeTag(index: number) {
    if (formState.data.tags) {
      const updatedTags = formState.data.tags.filter(
        (_: string, i: number) => i !== index
      );
      updateField("tags", updatedTags);
    }
  }

  function handleTagKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  function handleDetailKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDetail();
    }
  }

  function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function parseDateTimeLocal(value: string): Date {
    return new Date(value);
  }
</script>

<!-- Modal using shadcn Dialog -->
<!-- SIMPLIFIED: Use formState.isOpen directly, with onOpenChange handler -->
<Dialog.Root open={formState.isOpen} onOpenChange={handleDialogOpenChange}>
  <Dialog.Content class="max-w-4xl max-h-[90vh] overflow-hidden">
    <!-- Modal header -->
    <div class="flex flex-col space-y-1.5 text-center sm:text-left">
      <Dialog.Title class="text-lg font-semibold leading-none tracking-tight">
        {formState.mode === "create"
          ? "Create Custom Event"
          : "Edit Custom Event"}
      </Dialog.Title>
      <Dialog.Description class="text-muted-foreground text-sm">
        {#if formState.mode === "create"}
          Add a new custom event to your project timeline
        {:else}
          Update the details of this custom event
        {/if}
      </Dialog.Description>
    </div>

    <!-- Modal body -->
    <div class="modal-body">
      <form
        bind:this={formElement}
        onsubmit={handleSubmit}
        class="form-container"
      >
        <!-- Basic Information -->
        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">Basic Information</h3>
            <p class="section-description">Core details about your event</p>
          </div>

          <!-- Title -->
          <div class="form-field">
            <Label for="event-title" class="field-label">Event Title *</Label>
            <Input
              id="event-title"
              type="text"
              bind:value={formState.data.title}
              placeholder="Enter a descriptive title for your event"
              maxlength={200}
              required
              disabled={formState.loading}
              class="field-input {allErrors.title ? 'error' : ''}"
              aria-describedby={allErrors.title ? "title-error" : undefined}
              oninput={() => {
                // Clear local errors on input to provide real-time feedback
                if (localErrors.title) {
                  const { title, ...rest } = localErrors;
                  localErrors = rest;
                }
              }}
            />
            {#if allErrors.title}
              <div id="title-error" class="field-error">
                <AlertCircle class="w-4 h-4" />
                {allErrors.title}
              </div>
            {/if}
            <div class="field-hint">
              {formState.data.title.length}/200 characters
            </div>
          </div>

          <!-- Description -->
          <div class="form-field">
            <Label for="event-description" class="field-label">
              Description
            </Label>
            <Textarea
              id="event-description"
              bind:value={formState.data.description}
              placeholder="Provide additional context or details about this event"
              maxlength={1000}
              disabled={formState.loading}
              class="field-textarea {allErrors.description ? 'error' : ''}"
              aria-describedby={allErrors.description
                ? "description-error"
                : undefined}
              rows={3}
              oninput={() => {
                // Clear local errors on input to provide real-time feedback
                if (localErrors.description) {
                  const { description, ...rest } = localErrors;
                  localErrors = rest;
                }
              }}
            />
            {#if allErrors.description}
              <div id="description-error" class="field-error">
                <AlertCircle class="w-4 h-4" />
                {allErrors.description}
              </div>
            {/if}
            <div class="field-hint">
              {(formState.data.description || "").length}/1000 characters
            </div>
          </div>
        </div>

        <!-- Event Type & DateTime -->
        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">Event Details</h3>
            <p class="section-description">Classification and timing</p>
          </div>

          <div class="form-row">
            <!-- Event Type -->
            <div class="form-field flex-1">
              <Label for="event-type" class="field-label">Event Type *</Label>
              <div class="event-type-selector">
                {#each eventTypeOptions as option}
                  {@const IconComponent =
                    eventTypeIcons[option.icon as keyof typeof eventTypeIcons]}
                  {@const isSelected =
                    formState.data.eventType === option.value}
                  <button
                    type="button"
                    class="event-type-option {isSelected ? 'selected' : ''}"
                    onclick={() => updateField("eventType", option.value)}
                    disabled={formState.loading}
                    aria-pressed={isSelected}
                  >
                    <div class="option-icon">
                      <IconComponent class="w-4 h-4" />
                    </div>
                    <div class="option-content">
                      <div class="option-label">{option.label}</div>
                      <div class="option-description">
                        {option.description}
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
              {#if fieldErrors.eventType}
                <div class="field-error">
                  <AlertCircle class="w-4 h-4" />
                  {fieldErrors.eventType}
                </div>
              {/if}
            </div>

            <!-- DateTime -->
            <div class="form-field flex-1">
              <Label for="event-datetime" class="field-label">
                Event Date & Time *
              </Label>
              <div class="datetime-input-group">
                <input
                  id="event-datetime"
                  type="datetime-local"
                  value={formatDateTimeLocal(formState.data.eventTimestamp)}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    if (target) {
                      updateField(
                        "eventTimestamp",
                        parseDateTimeLocal(target.value)
                      );
                    }
                  }}
                  required
                  disabled={formState.loading}
                  class="datetime-input {fieldErrors.eventTimestamp
                    ? 'error'
                    : ''}"
                  aria-describedby={fieldErrors.eventTimestamp
                    ? "datetime-error"
                    : undefined}
                />
              </div>
              {#if fieldErrors.eventTimestamp}
                <div id="datetime-error" class="field-error">
                  <AlertCircle class="w-4 h-4" />
                  {fieldErrors.eventTimestamp}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Advanced Section -->
        <div class="form-section">
          <button
            type="button"
            class="section-toggle"
            onclick={() => (showAdvanced = !showAdvanced)}
            aria-expanded={showAdvanced}
          >
            <span class="toggle-text">
              Advanced Options
              <Badge variant="secondary" class="ml-2">Optional</Badge>
            </span>
            <span class="toggle-icon {showAdvanced ? 'rotated' : ''}">
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </button>

          {#if showAdvanced}
            <div class="advanced-content" transition:fade={{ duration: 200 }}>
              <!-- Details -->
              <div class="form-field">
                <Label class="field-label">
                  Additional Details
                  <span class="field-optional">(up to 5 items)</span>
                </Label>

                {#if formState.data.details && formState.data.details.length > 0}
                  <div class="details-list">
                    {#each formState.data.details as detail, index}
                      <div class="detail-item">
                        <span class="detail-text">{detail}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onclick={() => removeDetail(index)}
                          disabled={formState.loading}
                          aria-label="Remove detail"
                          class="detail-remove"
                        >
                          <Minus class="w-3 h-3" />
                        </Button>
                      </div>
                    {/each}
                  </div>
                {/if}

                {#if !formState.data.details || formState.data.details.length < 5}
                  <div class="detail-input-group">
                    <Input
                      bind:value={newDetail}
                      placeholder="Add implementation note or detail"
                      maxlength={500}
                      disabled={formState.loading}
                      onkeydown={handleDetailKeydown}
                      class="detail-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onclick={addDetail}
                      disabled={formState.loading || !newDetail.trim()}
                      class="detail-add"
                    >
                      <Plus class="w-3 h-3" />
                    </Button>
                  </div>
                {/if}

                {#if fieldErrors.details}
                  <div class="field-error">
                    <AlertCircle class="w-4 h-4" />
                    {fieldErrors.details}
                  </div>
                {/if}
              </div>

              <!-- Tags -->
              <div class="form-field">
                <Label class="field-label">
                  Tags
                  <span class="field-optional">(up to 10 tags)</span>
                </Label>

                {#if formState.data.tags && formState.data.tags.length > 0}
                  <div class="tags-list">
                    {#each formState.data.tags as tag, index}
                      <Badge variant="secondary" class="tag-item">
                        {tag}
                        <button
                          type="button"
                          onclick={() => removeTag(index)}
                          disabled={formState.loading}
                          aria-label="Remove tag"
                          class="tag-remove"
                        >
                          <X class="w-3 h-3" />
                        </button>
                      </Badge>
                    {/each}
                  </div>
                {/if}

                {#if !formState.data.tags || formState.data.tags.length < 10}
                  <div class="tag-input-group">
                    <Input
                      bind:value={newTag}
                      placeholder="Add tags for categorization"
                      maxlength={50}
                      disabled={formState.loading}
                      onkeydown={handleTagKeydown}
                      class="tag-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onclick={addTag}
                      disabled={formState.loading || !newTag.trim()}
                      class="tag-add"
                    >
                      <Plus class="w-3 h-3" />
                    </Button>
                  </div>
                {/if}

                {#if fieldErrors.tags}
                  <div class="field-error">
                    <AlertCircle class="w-4 h-4" />
                    {fieldErrors.tags}
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>

        <!-- General Error -->
        {#if fieldErrors.general}
          <div class="general-error">
            <AlertCircle class="w-4 h-4" />
            {fieldErrors.general}
          </div>
        {/if}
      </form>
    </div>

    <!-- Modal footer -->
    <div
      class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 pt-4 border-t"
    >
      <Button
        variant="outline"
        onclick={handleClose}
        disabled={formState.loading}
      >
        Cancel
      </Button>

      <Button
        type="submit"
        onclick={handleSubmit}
        disabled={!isFormValid || formState.loading || isSubmitting}
        class="submit-button"
      >
        {#if formState.loading || isSubmitting}
          <Loader2 class="w-4 h-4 animate-spin mr-2" />
        {:else}
          <Save class="w-4 h-4 mr-2" />
        {/if}
        {formState.mode === "create" ? "Create Event" : "Update Event"}
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  /* Modal body and form styles */
  .modal-body {
    @apply flex-1 overflow-y-auto px-6;
    max-height: calc(90vh - 120px); /* Account for header and footer */
  }

  /* Form styles */
  .form-container {
    @apply space-y-6;
  }

  .form-section {
    @apply space-y-4;
  }

  .section-header {
    @apply space-y-1;
  }

  .section-title {
    @apply text-lg font-medium text-foreground;
  }

  .section-description {
    @apply text-sm text-muted-foreground;
  }

  .section-toggle {
    @apply flex items-center justify-between w-full py-2 text-left
           text-base font-medium text-foreground hover:text-primary
           transition-colors;
  }

  .toggle-text {
    @apply flex items-center;
  }

  .toggle-icon {
    @apply transition-transform duration-200;
  }

  .toggle-icon.rotated {
    @apply rotate-180;
  }

  .advanced-content {
    @apply space-y-4 pt-4;
  }

  .form-row {
    @apply flex gap-4;
  }

  .form-field {
    @apply space-y-2;
  }

  .field-label {
    @apply text-sm font-medium text-foreground;
  }

  .field-optional {
    @apply text-xs text-muted-foreground font-normal;
  }

  .field-input {
    @apply w-full;
  }

  .field-input.error {
    @apply border-destructive;
  }

  .field-textarea {
    @apply w-full min-h-[80px] resize-y;
  }

  .field-textarea.error {
    @apply border-destructive;
  }

  .field-error {
    @apply flex items-center gap-2 text-sm text-destructive;
  }

  .field-hint {
    @apply text-xs text-muted-foreground;
  }

  .general-error {
    @apply flex items-center gap-2 p-3 bg-destructive/10 
           text-destructive rounded-md text-sm;
  }

  /* Event type selector */
  .event-type-selector {
    @apply grid grid-cols-1 gap-2;
  }

  .event-type-option {
    @apply flex items-center gap-3 p-3 border rounded-lg
           text-left hover:bg-muted/50 transition-colors
           focus:outline-none focus:ring-2 focus:ring-ring;
  }

  .event-type-option.selected {
    @apply border-primary bg-primary/5;
  }

  .option-icon {
    @apply flex-shrink-0 w-8 h-8 rounded-md bg-muted
           flex items-center justify-center;
  }

  .event-type-option.selected .option-icon {
    @apply bg-primary/10 text-primary;
  }

  .option-content {
    @apply flex-1 min-w-0;
  }

  .option-label {
    @apply text-sm font-medium;
  }

  .option-description {
    @apply text-xs text-muted-foreground line-clamp-1;
  }

  /* DateTime input */
  .datetime-input-group {
    @apply relative;
  }

  .input-icon {
    @apply absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground
           pointer-events-none;
  }

  .datetime-input {
    @apply w-full pl-10 pr-3 py-2 border border-input rounded-md
           bg-background text-foreground
           focus:outline-none focus:ring-2 focus:ring-ring
           disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .datetime-input.error {
    @apply border-destructive;
  }

  /* Details list */
  .details-list {
    @apply space-y-2 mb-3;
  }

  .detail-item {
    @apply flex items-center justify-between gap-2 p-2
           bg-muted/50 rounded-md;
  }

  .detail-text {
    @apply flex-1 text-sm;
  }

  .detail-remove {
    @apply flex-shrink-0;
  }

  .detail-input-group {
    @apply flex gap-2;
  }

  .detail-input {
    @apply flex-1;
  }

  .detail-add {
    @apply flex-shrink-0;
  }

  /* Tags */
  .tags-list {
    @apply flex flex-wrap gap-2 mb-3;
  }

  .tag-item {
    @apply flex items-center gap-1;
  }

  .tag-remove {
    @apply ml-1 hover:bg-destructive/20 rounded-full p-0.5
           transition-colors;
  }

  .tag-input-group {
    @apply flex gap-2;
  }

  .tag-input {
    @apply flex-1;
  }

  .tag-add {
    @apply flex-shrink-0;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .modal-content {
      @apply max-w-full max-h-[95vh] m-2;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      @apply px-4;
    }

    .form-row {
      @apply flex-col;
    }

    .event-type-selector {
      @apply grid-cols-1;
    }

    .modal-footer {
      @apply flex-col-reverse gap-2;
    }

    .modal-footer button {
      @apply w-full;
    }
  }
</style>

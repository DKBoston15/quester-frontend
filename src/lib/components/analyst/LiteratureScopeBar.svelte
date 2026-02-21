<script lang="ts">
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Portal } from "bits-ui";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import type { ResearchQuestionScopeItem } from "$lib/stores/AnalystStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import Filter from "lucide-svelte/icons/filter";
  import HelpCircle from "lucide-svelte/icons/help-circle";
  import StickyNote from "lucide-svelte/icons/sticky-note";
  import X from "lucide-svelte/icons/x";
  import Check from "lucide-svelte/icons/check";
  import type { LiteratureScopeItem, NoteScopeItem } from "$lib/types/analysis";

  interface Props {
    projectId?: string;
    disabled?: boolean;
  }

  const { projectId, disabled = false }: Props = $props();

  let open = $state(false);
  let questionsOpen = $state(false);
  let searchValue = $state("");
  let questionsSearchValue = $state("");

  // Ensure literature data is loaded for this project
  $effect(() => {
    if (projectId && literatureStore.loadedProjectId !== projectId) {
      literatureStore.loadLiterature(projectId);
    }
  });

  let selectedIds = $derived(analystStore.selectedLiteratureIds);
  let selectedItems = $derived(analystStore.selectedLiteratureItems);
  let selectedSet = $derived(new Set(selectedIds));

  let allLiterature = $derived(literatureStore.data);

  let filteredLiterature = $derived(
    searchValue
      ? allLiterature.filter((item) => {
          const q = searchValue.toLowerCase();
          const name = (item.name || "").toLowerCase();
          const authors =
            typeof item.authors === "string"
              ? item.authors.toLowerCase()
              : Array.isArray(item.authors)
                ? item.authors.join(", ").toLowerCase()
                : "";
          const year = String(item.publishYear || "");
          return name.includes(q) || authors.includes(q) || year.includes(q);
        })
      : allLiterature,
  );

  // Show max 3 badge pills, collapse the rest
  const MAX_VISIBLE_BADGES = 3;
  let showAllBadges = $state(false);
  let visibleItems = $derived(
    showAllBadges
      ? selectedItems
      : selectedItems.slice(0, MAX_VISIBLE_BADGES),
  );
  let hiddenCount = $derived(
    Math.max(0, selectedItems.length - MAX_VISIBLE_BADGES),
  );

  function toggleItem(item: any) {
    const scopeItem: LiteratureScopeItem = {
      id: item.id,
      name: item.name,
      publishYear: item.publishYear,
      type: item.type,
      authors:
        typeof item.authors === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(item.authors);
                return Array.isArray(parsed) ? parsed : [item.authors];
              } catch {
                return [item.authors];
              }
            })()
          : Array.isArray(item.authors)
            ? item.authors
            : undefined,
    };
    analystStore.toggleLiteratureItem(scopeItem);
  }

  function removeItem(id: string) {
    const item = selectedItems.find((i) => i.id === id);
    if (item) analystStore.toggleLiteratureItem(item);
  }

  function clearAll() {
    analystStore.clearLiteratureScope();
    showAllBadges = false;
  }

  function selectAllFiltered() {
    const items: LiteratureScopeItem[] = filteredLiterature.map((item) => ({
      id: item.id,
      name: item.name,
      publishYear: item.publishYear,
      type: item.type,
      authors:
        typeof item.authors === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(item.authors);
                return Array.isArray(parsed) ? parsed : [item.authors];
              } catch {
                return [item.authors];
              }
            })()
          : Array.isArray(item.authors)
            ? item.authors
            : undefined,
    }));
    // Merge with existing selection (add any not already selected)
    const existingIds = new Set(selectedIds);
    const newItems = items.filter((i) => !existingIds.has(i.id));
    if (newItems.length > 0) {
      analystStore.setLiteratureScope([...selectedItems, ...newItems]);
    }
  }

  function formatAuthors(authors: any): string {
    if (!authors) return "";
    if (typeof authors === "string") {
      try {
        const parsed = JSON.parse(authors);
        if (Array.isArray(parsed)) return parsed.slice(0, 2).join(", ");
        return authors;
      } catch {
        return authors;
      }
    }
    if (Array.isArray(authors)) return authors.slice(0, 2).join(", ");
    return "";
  }

  // Research Questions scope
  let selectedQuestionIds = $derived(analystStore.selectedResearchQuestionIds);
  let selectedQuestionItems = $derived(analystStore.selectedResearchQuestionItems);
  let selectedQuestionSet = $derived(new Set(selectedQuestionIds));
  let allQuestions = $derived(analystStore.availableResearchQuestions);

  let selectableQuestions = $derived(allQuestions);

  let filteredQuestions = $derived(
    questionsSearchValue
      ? selectableQuestions.filter((q) => {
          const query = questionsSearchValue.toLowerCase();
          return q.question.toLowerCase().includes(query);
        })
      : selectableQuestions,
  );

  const MAX_VISIBLE_QUESTION_BADGES = 2;
  let showAllQuestionBadges = $state(false);
  let visibleQuestionItems = $derived(
    showAllQuestionBadges
      ? selectedQuestionItems
      : selectedQuestionItems.slice(0, MAX_VISIBLE_QUESTION_BADGES),
  );
  let hiddenQuestionCount = $derived(
    Math.max(0, selectedQuestionItems.length - MAX_VISIBLE_QUESTION_BADGES),
  );

  function toggleQuestion(item: ResearchQuestionScopeItem) {
    analystStore.toggleResearchQuestionItem(item);
  }

  function removeQuestion(id: string) {
    const item = selectedQuestionItems.find((i) => i.id === id);
    if (item) analystStore.toggleResearchQuestionItem(item);
  }

  function clearAllQuestions() {
    analystStore.clearResearchQuestionScope();
    showAllQuestionBadges = false;
  }

  function selectAllFilteredQuestions() {
    const existingIds = new Set(selectedQuestionIds);
    const newItems = filteredQuestions.filter((i) => !existingIds.has(i.id));
    if (newItems.length > 0) {
      analystStore.setResearchQuestionScope([...selectedQuestionItems, ...newItems]);
    }
  }

  // Notes scope
  let notesOpen = $state(false);
  let notesSearchValue = $state("");

  let selectedNoteIds = $derived(analystStore.selectedNoteIds);
  let selectedNoteItems = $derived(analystStore.selectedNoteItems);
  let selectedNoteSet = $derived(new Set(selectedNoteIds));
  let allNotes = $derived(analystStore.availableNotes);

  let filteredNotes = $derived(
    notesSearchValue
      ? allNotes.filter((n) => {
          const query = notesSearchValue.toLowerCase();
          return n.name.toLowerCase().includes(query);
        })
      : allNotes,
  );

  const MAX_VISIBLE_NOTE_BADGES = 2;
  let showAllNoteBadges = $state(false);
  let visibleNoteItems = $derived(
    showAllNoteBadges
      ? selectedNoteItems
      : selectedNoteItems.slice(0, MAX_VISIBLE_NOTE_BADGES),
  );
  let hiddenNoteCount = $derived(
    Math.max(0, selectedNoteItems.length - MAX_VISIBLE_NOTE_BADGES),
  );

  function toggleNote(item: NoteScopeItem) {
    analystStore.toggleNoteItem(item);
  }

  function removeNote(id: string) {
    const item = selectedNoteItems.find((i) => i.id === id);
    if (item) analystStore.toggleNoteItem(item);
  }

  function clearAllNotes() {
    analystStore.clearNoteScope();
    showAllNoteBadges = false;
  }

  function selectAllFilteredNotes() {
    const existingIds = new Set(selectedNoteIds);
    const newItems = filteredNotes.filter((i) => !existingIds.has(i.id));
    if (newItems.length > 0) {
      analystStore.setNoteScope([...selectedNoteItems, ...newItems]);
    }
  }
</script>

<div class="flex items-center gap-2 flex-wrap min-h-[32px]">
  <Popover.Root bind:open>
    <Popover.Trigger disabled={disabled}>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 gap-1.5 text-xs {selectedItems.length > 0
          ? 'text-foreground'
          : 'text-muted-foreground'}"
        {disabled}
      >
        <Filter class="h-3 w-3" />
        {#if selectedItems.length === 0}
          All literature
        {:else}
          {selectedItems.length} selected
        {/if}
      </Button>
    </Popover.Trigger>
    <Portal>
      <Popover.Content
        class="w-[340px] p-0 z-[9999]"
        side="top"
        align="start"
      >
        <Command.Root shouldFilter={false}>
          <Command.Input
            placeholder="Search literature..."
            bind:value={searchValue}
          />
          <Command.List class="max-h-[240px]">
            <Command.Empty>No literature found.</Command.Empty>
            <Command.Group>
              {#each filteredLiterature as item (item.id)}
                <Command.Item
                  value={`${item.name}___${item.id}`}
                  onSelect={() => toggleItem(item)}
                  class="cursor-pointer"
                >
                  <div class="flex items-center gap-2 w-full">
                    <div
                      class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border {selectedSet.has(
                        item.id,
                      )
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40'}"
                    >
                      {#if selectedSet.has(item.id)}
                        <Check class="h-3 w-3 text-primary-foreground" />
                      {/if}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm truncate">{item.name}</div>
                      <div
                        class="text-[10px] text-muted-foreground flex items-center gap-1.5"
                      >
                        {#if item.publishYear}
                          <span>{item.publishYear}</span>
                        {/if}
                        {#if formatAuthors(item.authors)}
                          <span class="truncate"
                            >{formatAuthors(item.authors)}</span
                          >
                        {/if}
                      </div>
                    </div>
                    {#if item.type}
                      <Badge variant="outline" class="text-[9px] h-4 px-1">
                        {item.type}
                      </Badge>
                    {/if}
                  </div>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
          <!-- Footer -->
          <div
            class="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground"
          >
            <span>
              {selectedItems.length} of {allLiterature.length} selected
            </span>
            <div class="flex gap-2">
              <button
                class="hover:text-foreground transition-colors"
                onclick={selectAllFiltered}
              >
                Select all
              </button>
              {#if selectedItems.length > 0}
                <button
                  class="hover:text-foreground transition-colors"
                  onclick={clearAll}
                >
                  Clear
                </button>
              {/if}
            </div>
          </div>
        </Command.Root>
      </Popover.Content>
    </Portal>
  </Popover.Root>

  <!-- Selected item badges -->
  {#if selectedItems.length > 0}
    {#each visibleItems as item (item.id)}
      <Badge
        variant="secondary"
        class="h-6 gap-1 pl-2 pr-1 text-xs max-w-[180px]"
      >
        <span class="truncate">{item.name}</span>
        <button
          class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
          onclick={() => removeItem(item.id)}
          {disabled}
        >
          <X class="h-3 w-3" />
        </button>
      </Badge>
    {/each}
    {#if hiddenCount > 0 && !showAllBadges}
      <button
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onclick={() => (showAllBadges = true)}
      >
        +{hiddenCount} more
      </button>
    {/if}
    {#if showAllBadges && selectedItems.length > MAX_VISIBLE_BADGES}
      <button
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onclick={() => (showAllBadges = false)}
      >
        Show less
      </button>
    {/if}
    <button
      class="text-xs text-muted-foreground hover:text-foreground transition-colors"
      onclick={clearAll}
      {disabled}
    >
      Clear all
    </button>
  {/if}

  <!-- Research Questions Scope Filter -->
  {#if allQuestions.length > 0}
    <span class="text-muted-foreground/40 select-none">|</span>
    <Popover.Root bind:open={questionsOpen}>
      <Popover.Trigger disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 gap-1.5 text-xs {selectedQuestionItems.length > 0
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          {disabled}
        >
          <HelpCircle class="h-3 w-3" />
          {#if selectedQuestionItems.length === 0}
            Research Questions
          {:else}
            {selectedQuestionItems.length} question{selectedQuestionItems.length === 1 ? "" : "s"}
          {/if}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Content
          class="w-[480px] p-0 z-[9999]"
          side="top"
          align="start"
        >
          <Command.Root shouldFilter={false}>
            <Command.Input
              placeholder="Search questions..."
              bind:value={questionsSearchValue}
            />
            <Command.List class="max-h-[240px]">
              <Command.Empty>No research questions found.</Command.Empty>
              <Command.Group>
                {#each filteredQuestions as question (question.id)}
                  <Command.Item
                    value={`${question.question}___${question.id}`}
                    onSelect={() => toggleQuestion(question)}
                    class="cursor-pointer"
                  >
                    <div class="flex items-center gap-2 w-full {question.parentQuestionId ? 'pl-3' : ''}">
                      <div
                        class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border {selectedQuestionSet.has(
                          question.id,
                        )
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/40'}"
                      >
                        {#if selectedQuestionSet.has(question.id)}
                          <Check class="h-3 w-3 text-primary-foreground" />
                        {/if}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm truncate {question.isParent ? 'font-semibold' : ''}">{question.question}</div>
                      </div>
                      <Badge variant="outline" class="text-[9px] h-4 px-1 capitalize">
                        {question.status}
                      </Badge>
                    </div>
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.List>
            <div
              class="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground"
            >
              <span>
                {selectedQuestionItems.length} of {selectableQuestions.length} selected
              </span>
              <div class="flex gap-2">
                <button
                  class="hover:text-foreground transition-colors"
                  onclick={selectAllFilteredQuestions}
                >
                  Select all
                </button>
                {#if selectedQuestionItems.length > 0}
                  <button
                    class="hover:text-foreground transition-colors"
                    onclick={clearAllQuestions}
                  >
                    Clear
                  </button>
                {/if}
              </div>
            </div>
          </Command.Root>
        </Popover.Content>
      </Portal>
    </Popover.Root>

    {#if selectedQuestionItems.length > 0}
      {#each visibleQuestionItems as item (item.id)}
        <Badge
          variant="secondary"
          class="h-6 gap-1 pl-2 pr-1 text-xs max-w-[200px] bg-violet-100 dark:bg-violet-900/30"
        >
          <HelpCircle class="h-2.5 w-2.5 shrink-0" />
          <span class="truncate">{item.question}</span>
          <button
            class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            onclick={() => removeQuestion(item.id)}
            {disabled}
          >
            <X class="h-3 w-3" />
          </button>
        </Badge>
      {/each}
      {#if hiddenQuestionCount > 0 && !showAllQuestionBadges}
        <button
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onclick={() => (showAllQuestionBadges = true)}
        >
          +{hiddenQuestionCount} more
        </button>
      {/if}
      {#if showAllQuestionBadges && selectedQuestionItems.length > MAX_VISIBLE_QUESTION_BADGES}
        <button
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onclick={() => (showAllQuestionBadges = false)}
        >
          Show less
        </button>
      {/if}
      <button
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onclick={clearAllQuestions}
        {disabled}
      >
        Clear
      </button>
    {/if}
  {/if}

  <!-- Notes Scope Filter -->
  {#if allNotes.length > 0}
    <span class="text-muted-foreground/40 select-none">|</span>
    <Popover.Root bind:open={notesOpen}>
      <Popover.Trigger disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 gap-1.5 text-xs {selectedNoteItems.length > 0
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          {disabled}
        >
          <StickyNote class="h-3 w-3" />
          {#if selectedNoteItems.length === 0}
            Notes
          {:else}
            {selectedNoteItems.length} note{selectedNoteItems.length === 1 ? "" : "s"}
          {/if}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Content
          class="w-[340px] p-0 z-[9999]"
          side="top"
          align="start"
        >
          <Command.Root shouldFilter={false}>
            <Command.Input
              placeholder="Search notes..."
              bind:value={notesSearchValue}
            />
            <Command.List class="max-h-[240px]">
              <Command.Empty>No notes found.</Command.Empty>
              <Command.Group>
                {#each filteredNotes as note (note.id)}
                  <Command.Item
                    value={`${note.name}___${note.id}`}
                    onSelect={() => toggleNote(note)}
                    class="cursor-pointer"
                  >
                    <div class="flex items-center gap-2 w-full">
                      <div
                        class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border {selectedNoteSet.has(
                          note.id,
                        )
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/40'}"
                      >
                        {#if selectedNoteSet.has(note.id)}
                          <Check class="h-3 w-3 text-primary-foreground" />
                        {/if}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm truncate">{note.name}</div>
                      </div>
                      <Badge variant="outline" class="text-[9px] h-4 px-1 capitalize">
                        {note.type.toLowerCase()}
                      </Badge>
                    </div>
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.List>
            <div
              class="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground"
            >
              <span>
                {selectedNoteItems.length} of {allNotes.length} selected
              </span>
              <div class="flex gap-2">
                <button
                  class="hover:text-foreground transition-colors"
                  onclick={selectAllFilteredNotes}
                >
                  Select all
                </button>
                {#if selectedNoteItems.length > 0}
                  <button
                    class="hover:text-foreground transition-colors"
                    onclick={clearAllNotes}
                  >
                    Clear
                  </button>
                {/if}
              </div>
            </div>
          </Command.Root>
        </Popover.Content>
      </Portal>
    </Popover.Root>

    {#if selectedNoteItems.length > 0}
      {#each visibleNoteItems as item (item.id)}
        <Badge
          variant="secondary"
          class="h-6 gap-1 pl-2 pr-1 text-xs max-w-[200px] bg-amber-100 dark:bg-amber-900/30"
        >
          <StickyNote class="h-2.5 w-2.5 shrink-0" />
          <span class="truncate">{item.name}</span>
          <button
            class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            onclick={() => removeNote(item.id)}
            {disabled}
          >
            <X class="h-3 w-3" />
          </button>
        </Badge>
      {/each}
      {#if hiddenNoteCount > 0 && !showAllNoteBadges}
        <button
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onclick={() => (showAllNoteBadges = true)}
        >
          +{hiddenNoteCount} more
        </button>
      {/if}
      {#if showAllNoteBadges && selectedNoteItems.length > MAX_VISIBLE_NOTE_BADGES}
        <button
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onclick={() => (showAllNoteBadges = false)}
        >
          Show less
        </button>
      {/if}
      <button
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onclick={clearAllNotes}
        {disabled}
      >
        Clear
      </button>
    {/if}
  {/if}
</div>

<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { notesStore } from "$lib/stores/NotesStore";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import type { Note } from "$lib/types";
  import ShadEditor from "$lib/components/shad-editor/shad-editor.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Save, Trash2, Pencil } from "lucide-svelte";
  import type { Content } from "@tiptap/core";
  // Removed fade transition (no floating save chip anymore)
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import LiteratureSelector from "$lib/components/custom-ui/literature/LiteratureSelector.svelte";
  import { isAuthError, api } from "$lib/services/api-client";

  // Props
  const { note, onDelete } = $props<{
    note: Note;
    onDelete: () => void;
  }>();

  // Local state
  let title = $state(note.name);
  let content = $state(parseNoteContent(note.content));
  let previousContent = JSON.stringify(content);
  let isSaving = $state(false);
  let saveTimeout: NodeJS.Timeout;
  let isUnmounting = false;
  let contentChanged = $state(false);
  let lastSaveTime = Date.now();
  let lastSavedAt = $state<number | null>(null); // display of last successful save
  let currentNoteId = note.id;
  let originalTitle = $state(note.name);
  let lastKnownUpdatedAt = $state(note.updated_at);
  let titleChanged = $state(false);
  let isTitleFocused = $state(false);
  let isUserEditingTitle = $state(false);
  let isEditingTitle = $state(false);
  let isCancellingTitle = false;
  // Initialize to null to avoid passing undefined to bind:ref
  let titleInputRef: HTMLInputElement | null = null;

  // Track section type locally to avoid remounting
  let currentSectionType = $state(
    typeof note.section_type === "object"
      ? { ...note.section_type }
      : {
          value: note.section_type || "Other",
          label: note.section_type || "Other",
        }
  );

  const SAVE_DEBOUNCE = 2000; // 2 seconds between saves

  // Track auth errors to stop auto-save when session expires
  let authErrorOccurred = $state(false);

  // Add section type options
  const sectionTypeOptions = [
    { value: "Introduction", label: "Introduction" },
    { value: "Methods", label: "Methods" },
    { value: "Results", label: "Results" },
    { value: "Discussion", label: "Discussion" },
    { value: "Conclusion", label: "Conclusion" },
    { value: "References", label: "References" },
    { value: "Other", label: "Other" },
  ];

  // Ensure literature data is loaded
  onMount(async () => {
    // For new notes, switch to edit mode and focus title to encourage renaming
    if (note.name === "Untitled Note" && title === "Untitled Note") {
      isEditingTitle = true;
      setTimeout(() => titleInputRef?.focus(), 0);
    }

    // Load literature data if needed
    if (literatureStore.data.length === 0 && note.projectId) {
      await literatureStore.loadLiterature(note.projectId);
    }
  });

  // Keyboard shortcut: Cmd/Ctrl + S to force save
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNote(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Direct function to save title
  async function saveTitle() {
    // If the title is still the default and hasn't been changed, don't save
    if (title === "Untitled Note" && originalTitle === "Untitled Note") {
      return;
    }

    if (!isUnmounting && note) {
      isSaving = true;

      try {
        // Store the current title in case it changes during the save operation
        const titleToSave = title;

        // Use centralized API client with proper auth error handling
        await api.put(`/note/${note.id}`, { name: titleToSave });

        // Do not mutate the incoming note prop; parent/store will propagate updates

        // Update the note in the store's notes array
        const storeNotes = notesStore.notes;
        for (let i = 0; i < storeNotes.length; i++) {
          if (storeNotes[i].id === note.id) {
            storeNotes[i].name = titleToSave;
            storeNotes[i].updated_at = new Date().toISOString();
            break;
          }
        }

        // Update original title to match current title
        originalTitle = titleToSave;
        titleChanged = false; // Reset the title changed flag
        lastSavedAt = Date.now();

        // Trigger reactivity update through search query refresh
        const currentQuery = notesStore.searchQuery;
        if (currentQuery) {
          notesStore.setSearchQuery(currentQuery);
        }
      } catch (error) {
        console.error("Error updating title:", error);
        // Auth errors are handled automatically by the API client
        if (isAuthError(error)) {
          authErrorOccurred = true;
        }
      } finally {
        isSaving = false;
      }
    }
  }

  function confirmDelete() {
    if (confirm("Delete this note? This action cannot be undone.")) {
      onDelete();
    }
  }

  // Handle literature selection
  async function handleLiteratureSelect(literatureId: string | undefined) {
    if (!isUnmounting && note) {
      isSaving = true;

      try {
        // Use centralized API client with proper auth error handling
        await api.put(`/note/${note.id}`, {
          literatureId: literatureId || null,
        });

        // Do not mutate the incoming note prop; parent/store will propagate updates

        // Update the note in the store's notes array
        const storeNotes = notesStore.notes;
        for (let i = 0; i < storeNotes.length; i++) {
          if (storeNotes[i].id === note.id) {
            storeNotes[i].literatureId = literatureId;
            storeNotes[i].updated_at = new Date().toISOString();
            break;
          }
        }

        // Update last saved time for status UI
        lastSavedAt = Date.now();

        // Refresh the notes list via search query to trigger reactivity
        const currentQuery = notesStore.searchQuery;
        if (currentQuery) {
          notesStore.setSearchQuery(currentQuery);
        }
      } catch (error) {
        console.error("Error updating literature connection:", error);
        // Auth errors are handled automatically by the API client
        if (isAuthError(error)) {
          authErrorOccurred = true;
        }
      } finally {
        isSaving = false;
      }
    }
  }

  // Reactive block to update local state when the note prop changes
  $effect(() => {
    const isNewNote = currentNoteId !== note.id;
    
    // Update note ID tracking
    currentNoteId = note.id;

    // Update title if not actively editing or if switching notes
    if (!isUserEditingTitle || isNewNote) {
      title = note.name;
      originalTitle = note.name;
    }

    // Only update content if switching to a new note or if we're not currently editing
    // This prevents interference with user typing
    if (isNewNote || !contentChanged) {
      const newContent = parseNoteContent(note.content);
      content = newContent;
      previousContent = JSON.stringify(newContent);
    }

    // Update section type
    if (note.section_type) {
      currentSectionType =
        typeof note.section_type === "object"
          ? { ...note.section_type }
          : { value: note.section_type, label: note.section_type };
    }

    // Reset change flags when switching notes
    if (isNewNote) {
      contentChanged = false;
      titleChanged = false;
    }
  });

  // Monitor content changes using $effect
  $effect(() => {
    // Skip processing if we're unmounting to avoid state mutation errors
    if (isUnmounting) {
      return;
    }

    const currentContentStr = JSON.stringify(content);

    if (currentContentStr !== previousContent) {
      // Store the new content as previous content
      previousContent = currentContentStr;

      // Only mark as changed if we're not in the middle of a note switch
      // This prevents unnecessary saves during note switching
      if (currentNoteId === note.id) {
        contentChanged = true;
        scheduleSave();
      }
    }
  });

  // Add an effect to track title changes
  $effect(() => {
    // Check if title has changed from original
    if (!isUnmounting) {
      titleChanged = title !== originalTitle;
    }
  });

  // Auto-save functionality
  function scheduleSave() {
    // Don't schedule save if auth error occurred
    if (authErrorOccurred) {
      return;
    }

    clearTimeout(saveTimeout);

    // If we recently saved, wait the full debounce period
    const timeSinceLastSave = Date.now() - lastSaveTime;
    const delay =
      timeSinceLastSave < SAVE_DEBOUNCE
        ? SAVE_DEBOUNCE
        : Math.max(500, SAVE_DEBOUNCE - timeSinceLastSave);

    saveTimeout = setTimeout(saveNote, delay);
  }

  async function saveNote(forceSave = false): Promise<void> {
    if (isSaving || isUnmounting || (!contentChanged && !forceSave) || !note) {
      return;
    }

    // Store current values to check if they change during save
    const currentTitle = title;
    const currentContentStr = JSON.stringify(content);

    lastSaveTime = Date.now();

    // Only reset contentChanged if we're actually going to save
    if (!isUnmounting) {
      contentChanged = false;
    }

    isSaving = true;
    try {
      const contentToSave = JSON.stringify(content);

      // Use the store's update method to ensure the note list updates
      const updatedNote = await notesStore.updateNote(note.id, {
        name: currentTitle,
        content: contentToSave,
      });

      // Update our conflict detection timestamp
      lastKnownUpdatedAt = updatedNote.updated_at || new Date().toISOString();

      // Mark time of successful save for status UI
      lastSavedAt = Date.now();

      // Update originalTitle and reset change flags after successful save
      originalTitle = currentTitle;
      titleChanged = false;
      contentChanged = false; // Reset content changed flag after successful save

      // Update previousContent to match what was just saved to prevent duplicate saves
      previousContent = JSON.stringify(content);

      // Trigger reactivity update through search query refresh
      const currentQuery = notesStore.searchQuery;
      if (currentQuery) {
        notesStore.setSearchQuery(currentQuery);
      }

      return; // Return successfully
    } catch (error) {
      console.error("Failed to save note:", error);

      // Check if this is an authentication error
      if (isAuthError(error)) {
        console.warn(
          "Authentication error during save - stopping auto-save to prevent half-logout state"
        );
        authErrorOccurred = true;
        // Don't mark content as changed - let the user re-authenticate to save
        // The API client will trigger logout automatically
        throw error;
      }

      if (!isUnmounting) {
        contentChanged = true; // Mark as still needing save, but only if not unmounting
      }
      throw error; // Re-throw the error
    } finally {
      isSaving = false;

      // Check if content changed during save operation
      // Don't schedule another save if auth error occurred to prevent infinite failed requests
      if (
        !isUnmounting &&
        !authErrorOccurred &&
        (currentTitle !== title ||
          currentContentStr !== JSON.stringify(content))
      ) {
        contentChanged = true;
        scheduleSave();
      }
    }
  }

  // Add function to handle section type change
  async function handleSectionTypeChange(value: string) {
    const selectedType = sectionTypeOptions.find(
      (option) => option.value === value
    );

    if (selectedType) {
      // Update our local state first
      currentSectionType = selectedType;
      isSaving = true;

      try {
        // Use centralized API client with proper auth error handling
        await api.put(`/note/${note.id}`, { sectionType: selectedType.value });

        // Update the note in the store's notes array
        const storeNotes = notesStore.notes;
        for (let i = 0; i < storeNotes.length; i++) {
          if (storeNotes[i].id === note.id) {
            storeNotes[i].section_type = selectedType.value;
            storeNotes[i].updated_at = new Date().toISOString();
            break;
          }
        }

        // Trigger reactivity update through search query refresh
        const currentQuery = notesStore.searchQuery;
        if (currentQuery) {
          notesStore.setSearchQuery(currentQuery);
        }
      } catch (error) {
        console.error("Error updating section type:", error);
        // Auth errors are handled automatically by the API client
        if (isAuthError(error)) {
          authErrorOccurred = true;
        }
        // Revert local state on error
        currentSectionType =
          typeof note.section_type === "object"
            ? { ...note.section_type }
            : {
                value: note.section_type || "Other",
                label: note.section_type || "Other",
              };
      } finally {
        isSaving = false;
      }
    }
  }

  // Helper function to parse note content
  function parseNoteContent(rawContent: any): Content {
    if (!rawContent) {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };
    }

    try {
      if (typeof rawContent === "string") {
        return JSON.parse(rawContent);
      } else {
        return rawContent;
      }
    } catch (e) {
      console.error("Error parsing note content:", e);
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };
    }
  }

  onDestroy(() => {
    try {
      // Set isUnmounting to prevent any further state updates
      isUnmounting = true;

      // Clear any pending save timeout
      clearTimeout(saveTimeout);

      // Save any pending changes before unmounting
      if (document.visibilityState !== "hidden" && note && contentChanged) {
        // Use the store's update method to ensure the note list updates
        const contentToSave = JSON.stringify(content);

        // We need to use a setTimeout to ensure this runs after the current execution context
        // This helps avoid state mutation errors during unmounting
        setTimeout(() => {
          notesStore.updateNote(note.id, {
            name: title,
            content: contentToSave,
          });
        }, 0);
      }
    } catch (error) {
      console.error("Error during editor unmounting:", error);
    }
  });
</script>

<div class="flex flex-col">
  <!-- Editor Header -->
  <header class="sticky top-0 z-10 border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <!-- Row 1: Title and save status -->
    <div class="flex items-center justify-between gap-3">
      {#if isEditingTitle}
        <div class="flex-1 min-w-0 flex items-center gap-2">
          <Input
            bind:ref={titleInputRef}
            type="text"
            placeholder="Untitled note"
            class="w-full bg-transparent cursor-text border-0 border-b border-border/50 px-0 py-1 h-auto text-2xl font-semibold rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-ring/60"
            bind:value={title}
            onfocus={(e) => {
              isUserEditingTitle = true;
              isTitleFocused = true;
              if (title === "Untitled Note" || title === "Untitled note") {
                const target = e.target as HTMLInputElement;
                setTimeout(() => target.select(), 0);
              }
            }}
            onblur={() => {
              if (isCancellingTitle) {
                // Skip saving on cancel flow
              } else if (title !== originalTitle) {
                saveTitle();
              }
              setTimeout(() => {
                isUserEditingTitle = false;
                isTitleFocused = false;
                // Stay in or exit edit mode based on cancel flag
                if (!isCancellingTitle) {
                  isEditingTitle = false;
                }
                isCancellingTitle = false;
              }, 0);
            }}
            onkeydown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (title !== originalTitle) {
                  await saveTitle();
                }
                isEditingTitle = false;
              } else if (e.key === "Escape") {
                e.preventDefault();
                isCancellingTitle = true;
                title = originalTitle;
                isEditingTitle = false;
                setTimeout(() => (isCancellingTitle = false), 0);
              }
            }}
            aria-label="Note title"
          />
          <Button size="sm" onclick={async () => { if (title !== originalTitle) { await saveTitle(); } isEditingTitle = false; }} aria-label="Save title" disabled={isSaving}>
            Save
          </Button>
          <Button variant="ghost" size="sm" onclick={() => { isCancellingTitle = true; title = originalTitle; isEditingTitle = false; setTimeout(() => (isCancellingTitle = false), 0); }} aria-label="Cancel rename">
            Cancel
          </Button>
        </div>
      {:else}
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-semibold truncate" title={title}>{title || "Untitled note"}</h1>
        </div>
      {/if}
      <div class="flex items-center gap-2 shrink-0">
        {#if authErrorOccurred}
          <span class="text-sm text-destructive">Session expired — not saving</span>
        {:else if isSaving}
          <span class="text-sm text-muted-foreground flex items-center gap-1"><Save class="h-3 w-3 animate-spin" /> Saving…</span>
        {:else}
          <span class="text-sm text-muted-foreground">{lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ""}</span>
        {/if}
        {#if (titleChanged || contentChanged) && !authErrorOccurred && !isEditingTitle}
          <Button size="sm" class="min-w-[96px] justify-center" onclick={() => saveNote(true)} aria-label="Save changes" disabled={isSaving}>
            Save
          </Button>
        {/if}
        {#if !isEditingTitle}
          <Button variant="outline" size="sm" class="min-w-[96px] justify-center" aria-label="Rename title" title="Rename title" onclick={() => { isEditingTitle = true; setTimeout(() => titleInputRef?.focus(), 0); }}>
            <Pencil class="h-4 w-4 mr-1" /> Rename
          </Button>
        {/if}
      </div>
    </div>

    <!-- Row 2: Metadata and actions -->
    <div class="mt-2 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        {#if note && note.projectId && note.type === "LITERATURE"}
          <LiteratureSelector
            noteId={note.id}
            projectId={note.projectId}
            selectedLiteratureId={note.literatureId}
            onLiteratureSelect={handleLiteratureSelect}
          />
          <div class="flex items-center gap-2">
            <label for="section-type-select" class="text-sm text-muted-foreground">Section</label>
            <Select type="single" value={currentSectionType.value} onValueChange={handleSectionTypeChange}>
              <SelectTrigger id="section-type-select" class="h-8 w-[180px]">
                <span>{currentSectionType.label}</span>
              </SelectTrigger>
              <SelectContent>
                {#each sectionTypeOptions as option}
                  <SelectItem value={option.value}>{option.label}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
          </div>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <Button variant="destructive" size="sm" class="min-w-[96px] justify-center" onclick={() => confirmDelete()} aria-label="Delete note">
          <Trash2 class="h-4 w-4 mr-1" /> Delete
        </Button>
      </div>
    </div>
  </header>

  <!-- Editor Content -->
  {#if note}
    <div class="flex-1">
      <ShadEditor
        {content}
on:contentChange={(e) => {
          content = e.detail;
        }}
        placeholder="Start writing..."
      />
    </div>
  {/if}
</div>

<style>
  :global(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--muted-foreground);
    pointer-events: none;
    height: 0;
  }
</style>

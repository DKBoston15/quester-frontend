<!-- src/routes/project/Notes.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import type { Note } from "$lib/types";
  import NoteList from "$lib/components/notes/NoteList.svelte";
  import NoteEditor from "$lib/components/notes/NoteEditor.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Tabs, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  import { Layout, Maximize2, Minimize2, Plus, Info } from "lucide-svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  // Props
  const { literatureId = undefined } = $props();

  // State
  let focusMode = $state(false);
  let selectedView = $state(""); // Default to split view
  let selectedTab = $state("literature"); // Default to literature notes
  let rightPanelNote = $state<Note | null>(null);

  // Effect to sync rightPanelNote with store updates
  $effect(() => {
    // Only run this effect if we have a rightPanelNote
    if (rightPanelNote && rightPanelNote.id) {
      // Find the updated note in the store
      const updatedNote = notesStore.notes.find(
        (n) => n.id === rightPanelNote?.id
      );

      if (updatedNote) {
        // Only update if there's an actual difference to avoid infinite loops
        // Compare the stringified versions to check for deep equality
        const currentStr = JSON.stringify(rightPanelNote);
        const updatedStr = JSON.stringify(updatedNote);

        if (currentStr !== updatedStr) {
          // Create a deep copy to ensure reactivity
          rightPanelNote = JSON.parse(JSON.stringify(updatedNote));
        }
      }
    }
  });

  async function loadNotes() {
    if (!projectStore.currentProject?.id) return;
    await notesStore.loadNotes(projectStore.currentProject.id, literatureId);
  }

  onMount(() => {
    loadNotes();
    return () => notesStore.reset();
  });

  // Handle note selection
  function handleNoteSelect(note: Note, targetPanel = "left") {
    // Handle selection based on target panel
    if (targetPanel === "left") {
      // If this note is already in the right panel, we need to handle it carefully
      if (rightPanelNote && rightPanelNote.id === note.id) {
        // First set the active note ID
        notesStore.setActiveNote(note.id);

        // Then clear the right panel note in the next tick to avoid unmounting issues
        setTimeout(() => {
          rightPanelNote = null;
        }, 0);
      } else {
        // Normal case - just set the active note
        notesStore.setActiveNote(note.id);
      }
    } else if (targetPanel === "right") {
      // If this note is already the active note, don't set it in the right panel
      if (notesStore.activeNoteId === note.id) {
        return;
      }
      // Set the right panel note - use a deep copy to ensure reactivity
      rightPanelNote = JSON.parse(JSON.stringify(note));
    }
  }

  // Handle note deletion
  async function handleNoteDelete() {
    if (notesStore.activeNoteId) {
      await notesStore.deleteNote(notesStore.activeNoteId);

      // Clear right panel note if it was deleted
      if (rightPanelNote && rightPanelNote.id === notesStore.activeNoteId) {
        rightPanelNote = null;
      }
    }
  }

  // Create new note
  async function createNote() {
    if (!projectStore.currentProject?.id) return;

    const newNote = await notesStore.createNote({
      name: "Untitled Note",
      content: "",
      user_id: auth.user?.id,
      projectId: projectStore.currentProject.id,
      literatureId: selectedTab === "literature" ? literatureId : undefined,
      type: selectedTab === "literature" ? "LITERATURE" : "RESEARCH",
      section_type: { value: "Other", label: "Other" },
    });
    if (newNote) {
      notesStore.setActiveNote(newNote.id);

      // If in split view and right panel is empty, load the new note there
      if (selectedView === "split" && rightPanelNote === null) {
        // Create a deep copy to ensure reactivity
        rightPanelNote = JSON.parse(JSON.stringify(newNote));
      }
    }
  }

  // Handle view changes
  function handleViewChange(view: string) {
    selectedView = view;

    // If switching to split view, check for duplicate notes
    if (view === "split") {
      // If the right panel note is the same as the active note, clear it
      if (rightPanelNote && notesStore.activeNoteId === rightPanelNote.id) {
        rightPanelNote = null;
      }
    }
  }

  // Handle tab changes
  function handleTabChange(value: string) {
    selectedTab = value as "literature" | "research";
    notesStore.setFilter({ type: value as "literature" | "research" });

    // Clear the selected note
    notesStore.setActiveNote(null);
    // Also clear the right panel note if in split view
    rightPanelNote = null;
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      focusMode = !focusMode;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col h-screen">
  <!-- Combined Page Header and Control Bar -->
  <div
    class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10"
  >
    <div class="container mx-auto py-4 px-4">
      <div class="flex items-center justify-between">
        <!-- Left Side: Title & Description -->
        <div class="flex-1 min-w-0 mr-4">
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-3xl font-bold truncate">Notes</h1>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                <Info class="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p class="text-sm max-w-xs">
                  Create, manage, and organize your research and literature
                  notes. Use split view and focus mode for enhanced
                  productivity. (Toggle focus mode: Cmd/Ctrl+B)
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <p class="text-muted-foreground text-sm truncate">
            Create, manage, and organize your research and literature notes.
          </p>
        </div>

        <!-- Right Side: Controls -->
        <div class="flex items-center gap-4 flex-shrink-0">
          <!-- View Toggle Buttons -->
          <Button
            variant="ghost"
            size="sm"
            onclick={() =>
              handleViewChange(selectedView === "split" ? "single" : "split")}
            class={selectedView === "split" ? "bg-secondary h-8" : "h-8"}
            title="Toggle split view"
          >
            <Layout class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class={focusMode ? "bg-secondary h-8" : "h-8"}
            onclick={() => {
              focusMode = !focusMode;
            }}
            title="Toggle focus mode (Cmd/Ctrl+B)"
          >
            {#if focusMode}
              <Minimize2 class="h-4 w-4" />
            {:else}
              <Maximize2 class="h-4 w-4" />
            {/if}
          </Button>

          <!-- Tabs -->
          <Tabs value={selectedTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="literature">Literature Notes</TabsTrigger>
              <TabsTrigger value="research">Research Notes</TabsTrigger>
            </TabsList>
          </Tabs>

          <!-- New Note Button -->
          <Button onclick={createNote} disabled={!projectStore.currentProject}>
            <Plus class="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  {#if notesStore.isLoading}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">Loading notes...</div>
    </div>
  {:else}
    <div class="flex-1 flex overflow-hidden">
      {#if !focusMode}
        <!-- Sidebar -->
        <aside
          class="w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-[calc(77px)] h-[calc(100vh-77px)] overflow-y-auto"
        >
          <NoteList
            onNoteSelect={handleNoteSelect}
            showSecondPanelOption={selectedView === "split"}
          />
        </aside>
      {/if}

      <!-- Editor Area -->
      <main
        class="{selectedView === 'split'
          ? 'flex-1 flex'
          : 'flex-1 bg-background'} overflow-hidden"
      >
        {#if selectedView === "split"}
          <!-- Left Panel -->
          <div class="flex-1 border-r overflow-y-auto">
            {#if notesStore.activeNoteId && notesStore.notes.length > 0}
              {#each notesStore.notes.filter((n) => n.id === notesStore.activeNoteId) as activeNote (activeNote.id)}
                <NoteEditor note={activeNote} onDelete={handleNoteDelete} />
              {/each}
            {:else}
              <div class="h-full flex items-center justify-center">
                <div class="text-center">
                  <h3 class="text-lg font-medium mb-2">No Note Selected</h3>
                  <p class="text-muted-foreground mb-4">
                    Select a note from the sidebar or create a new one
                  </p>
                  <Button
                    onclick={createNote}
                    disabled={!projectStore.currentProject}
                  >
                    <Plus class="h-4 w-4 mr-2" />
                    Create New Note
                  </Button>
                </div>
              </div>
            {/if}
          </div>

          <!-- Right Panel -->
          <div class="flex-1 overflow-y-auto">
            {#if rightPanelNote}
              <NoteEditor
                note={rightPanelNote}
                onDelete={() => {
                  handleNoteDelete();
                  rightPanelNote = null;
                }}
              />
            {:else}
              <div class="h-full flex items-center justify-center">
                <div class="text-center">
                  <h3 class="text-lg font-medium mb-2">No Note Selected</h3>
                  <p class="text-muted-foreground mb-4">
                    Select a note from the sidebar or create a new one
                  </p>
                  <Button
                    onclick={createNote}
                    disabled={!projectStore.currentProject}
                  >
                    <Plus class="h-4 w-4 mr-2" />
                    Create New Note
                  </Button>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Single Panel View -->
          <div class="flex-1 h-full overflow-y-auto">
            {#if notesStore.activeNoteId && notesStore.notes.length > 0}
              {#each notesStore.notes.filter((n) => n.id === notesStore.activeNoteId) as activeNote (activeNote.id)}
                <NoteEditor note={activeNote} onDelete={handleNoteDelete} />
              {/each}
            {:else}
              <div class="h-full flex items-center justify-center">
                <div class="text-center">
                  <h3 class="text-lg font-medium mb-2">No Note Selected</h3>
                  <p class="text-muted-foreground mb-4">
                    Select a note from the sidebar or create a new one
                  </p>
                  <Button
                    onclick={createNote}
                    disabled={!projectStore.currentProject}
                  >
                    <Plus class="h-4 w-4 mr-2" />
                    Create New Note
                  </Button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </main>
    </div>
  {/if}
</div>

<style>
  /* Add styles for the mark tag to highlight search results */
  :global(mark) {
    background-color: #ffd700;
    color: black;
    padding: 0 2px;
    border-radius: 2px;
  }

  /* Focus mode styles */
  .focus-mode :global(aside) {
    display: none !important;
  }

  .focus-mode header {
    padding: 0.5rem !important;
  }
</style>

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
  import {
    ChevronDown,
    Layout,
    Maximize2,
    Minimize2,
    Plus,
    Command as CommandIcon,
  } from "lucide-svelte";

  // Props
  const { literatureId = undefined } = $props();

  // State
  let focusMode = $state(false);
  let selectedView = $state(""); // Default to split view
  let selectedTab = "all";
  let note: Note;
  let rightPanelNote = $state<Note | null>(null);

  // For debugging
  $effect(() => {
    console.log("rightPanelNote updated:", rightPanelNote?.id);
  });

  $effect(() => {
    console.log("Focus mode is now:", focusMode);
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
    console.log("Note selected:", note.id, "Target panel:", targetPanel);

    // Create a deep copy of the note to ensure reactivity
    const noteCopy = JSON.parse(JSON.stringify(note));

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
        console.log(
          "Note is already active in left panel, not setting in right panel"
        );
        return;
      }
      // Set the right panel note
      rightPanelNote = noteCopy;
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
      user_id: "current-user-id", // Replace with actual user ID
      project_id: projectStore.currentProject.id,
      literature_id: literatureId,
      type: literatureId ? "BASE" : "QUICK",
      section_type: { value: "Other", label: "Other" },
    });
    if (newNote) {
      notesStore.setActiveNote(newNote.id);

      // If in split view and right panel is empty, load the new note there
      if (selectedView === "split" && rightPanelNote === null) {
        // Create a new reference to ensure reactivity
        rightPanelNote = JSON.parse(JSON.stringify(newNote));
      }
    }
  }

  // Handle tab changes
  function handleTabChange(value: string) {
    selectedTab = value;
    notesStore.setFilter({
      type: value as "all" | "unlinked" | "literature" | "recent",
      literatureId: literatureId,
    });
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

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      focusMode = !focusMode;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-screen flex flex-col overflow-hidden">
  <!-- Top Bar -->
  <header
    class="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onclick={() =>
              handleViewChange(selectedView === "split" ? "single" : "split")}
            class={selectedView === "split" ? "bg-secondary h-8" : "h-8"}
          >
            <Layout class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class={focusMode ? "bg-secondary h-8" : "h-8"}
            onclick={() => {
              console.log("Focus mode toggled:", !focusMode);
              focusMode = !focusMode;
            }}
          >
            {#if focusMode}
              <Minimize2 class="h-4 w-4" />
            {:else}
              <Maximize2 class="h-4 w-4" />
            {/if}
          </Button>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Button onclick={createNote} disabled={!projectStore.currentProject}>
          <Plus class="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>
    </div>

    <div class="mt-4">
      <Tabs value={selectedTab} class="w-full" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All Notes</TabsTrigger>
          <TabsTrigger value="unlinked">Unlinked</TabsTrigger>
          <TabsTrigger value="literature">Literature Notes</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  </header>

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
          class="w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <NoteList
            onNoteSelect={handleNoteSelect}
            showSecondPanelOption={selectedView === "split"}
          />
        </aside>
      {/if}

      <!-- Editor Area -->
      <main
        class={selectedView === "split"
          ? "flex-1 flex overflow-hidden"
          : "flex-1 overflow-hidden bg-background"}
      >
        {#if selectedView === "split"}
          <!-- Left Panel -->
          <div class="flex-1 border-r overflow-hidden">
            {#if notesStore.activeNoteId && notesStore.notes.length > 0}
              {#each notesStore.notes.filter((n) => n.id === notesStore.activeNoteId) as activeNote (activeNote.id + "-" + Date.now())}
                <NoteEditor
                  note={JSON.parse(JSON.stringify(activeNote))}
                  onDelete={handleNoteDelete}
                />
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
          <div class="flex-1 overflow-hidden">
            {#if rightPanelNote}
              <NoteEditor
                note={JSON.parse(JSON.stringify(rightPanelNote))}
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
          {#if notesStore.activeNoteId && notesStore.notes.length > 0}
            {#each notesStore.notes.filter((n) => n.id === notesStore.activeNoteId) as activeNote (activeNote.id + "-" + Date.now())}
              <NoteEditor
                note={JSON.parse(JSON.stringify(activeNote))}
                onDelete={handleNoteDelete}
              />
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

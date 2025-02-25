<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import type { Note } from "$lib/types";
  import ShadEditor from "$lib/components/shad-editor/shad-editor.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Save, Trash2 } from "lucide-svelte";
  import type { Content } from "@tiptap/core";
  import { fade } from "svelte/transition";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import LiteratureSelector from "$lib/components/custom-ui/literature/LiteratureSelector.svelte";

  // Props
  const { note, onDelete } = $props<{
    note: Note;
    onDelete: () => void;
  }>();

  // Local state
  let title = $state(note.name);
  let content = parseNoteContent(note.content);
  let previousContent = JSON.stringify(content);
  let isSaving = $state(false);
  let saveTimeout: NodeJS.Timeout;
  let isUnmounting = false;
  let contentChanged = false;
  let lastSaveTime = Date.now();
  let currentNoteId = note.id;
  let originalTitle = $state(note.name); // Track original title to detect changes
  let titleChanged = $state(false); // Track if title has changed
  let isTitleFocused = $state(false); // Track if title is currently focused
  let isUserEditingTitle = $state(false); // Track if user is actively editing title

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
    console.log(`Editor mounted for note: ${note.id}`);

    // For new notes (with "Untitled Note"), we want to make the title editable immediately
    if (note.name === "Untitled Note" && title === "Untitled Note") {
      console.log("New note detected, enabling title editing");
      titleChanged = true;
    }

    // Load literature data if needed
    if (literatureStore.data.length === 0 && note.project_id) {
      await literatureStore.loadLiterature(note.project_id);
    }
  });

  // Direct function to save title
  function saveTitle() {
    console.log(`Saving title: "${title}"`);

    // If the title is still the default and hasn't been changed, don't save
    if (title === "Untitled Note" && originalTitle === "Untitled Note") {
      console.log("Title unchanged from default, not saving");
      return;
    }

    if (!isUnmounting && note) {
      isSaving = true;

      // Store the current title in case it changes during the save operation
      const titleToSave = title;

      // Make a direct API call to update just the title
      fetch(`http://localhost:3333/note/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: titleToSave }),
      })
        .then((response) => {
          if (!response.ok) {
            console.error("Failed to update title");
            return;
          }
          console.log("Title updated successfully");

          // Update the note object directly to prevent future effect runs from resetting
          note.name = titleToSave;

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

          // Try to update the note title in the NoteList directly
          setTimeout(() => {
            try {
              // Find the note item in the DOM
              const noteElements = document.querySelectorAll(
                `[data-note-id="${note.id}"]`
              );
              if (noteElements.length > 0) {
                // Update the title in each found element
                noteElements.forEach((noteEl) => {
                  // Find the title heading
                  const titleEl = noteEl.querySelector(
                    ".font-medium.leading-none"
                  );
                  if (titleEl) {
                    titleEl.textContent = titleToSave || "Untitled Note";
                    console.log(`Updated title for note ${note.id} in the DOM`);
                  }
                });
              }
            } catch (e) {
              console.warn("Error updating note title in DOM:", e);
            }
          }, 50);

          // Also try the search query approach as a fallback
          const currentQuery = notesStore.searchQuery;
          if (currentQuery) {
            notesStore.setSearchQuery(currentQuery);
          }
        })
        .catch((error) => {
          console.error("Error updating title:", error);
        })
        .finally(() => {
          isSaving = false;
        });
    }
  }

  // Handle literature selection
  async function handleLiteratureSelect(literatureId: string | undefined) {
    console.log(
      `Updating literature connection for note ${note.id} to ${literatureId}`
    );

    if (!isUnmounting && note) {
      isSaving = true;

      try {
        // Make a direct API call to update the literature connection
        const response = await fetch(`http://localhost:3333/note/${note.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ literatureId: literatureId || null }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to update literature connection (${response.status})`
          );
        }

        console.log("Literature connection updated successfully");

        // Update the note object directly
        note.literatureId = literatureId;

        // Update the note in the store's notes array
        const storeNotes = notesStore.notes;
        for (let i = 0; i < storeNotes.length; i++) {
          if (storeNotes[i].id === note.id) {
            storeNotes[i].literatureId = literatureId;
            storeNotes[i].updated_at = new Date().toISOString();
            break;
          }
        }

        // Try to update the literature badge in the NoteList
        setTimeout(() => {
          try {
            // Find the note item in the DOM
            const noteElements = document.querySelectorAll(
              `[data-note-id="${note.id}"]`
            );

            if (noteElements.length > 0) {
              noteElements.forEach((noteEl) => {
                // Find the badges container
                const badgesContainer = noteEl.querySelector(
                  ".flex.items-center.gap-2.mt-2"
                );

                if (badgesContainer) {
                  // Check if literature badge exists
                  const existingLitBadge =
                    noteEl.querySelector(".badge-literature");

                  if (literatureId && !existingLitBadge) {
                    // Add literature badge if it doesn't exist
                    const newBadge = document.createElement("div");
                    newBadge.className =
                      "badge-literature text-xs flex items-center gap-1 border rounded-full px-2 py-1";
                    newBadge.innerHTML =
                      '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg> Literature';
                    badgesContainer.appendChild(newBadge);
                  } else if (!literatureId && existingLitBadge) {
                    // Remove literature badge if it exists
                    existingLitBadge.remove();
                  }
                }
              });
            }
          } catch (e) {
            console.warn("Error updating literature badge in DOM:", e);
          }
        }, 50);

        // Refresh the notes list via search query as a fallback
        const currentQuery = notesStore.searchQuery;
        if (currentQuery) {
          notesStore.setSearchQuery(currentQuery);
        }
      } catch (error) {
        console.error("Error updating literature connection:", error);
      } finally {
        isSaving = false;
      }
    }
  }

  // Reactive block to update local state when the note prop changes
  $effect(() => {
    console.log(`Note effect triggered for: ${note.id}`);

    // Always update content when note changes
    const noteContentStr =
      typeof note.content === "string"
        ? note.content
        : JSON.stringify(note.content);
    const currentContentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    // Force immediate update of all state when note changes
    if (currentNoteId !== note.id || noteContentStr !== currentContentStr) {
      console.log(`Note content or ID changed - updating editor state`);

      // Only reset contentChanged if the note ID has changed
      // This preserves unsaved changes when content is updated externally
      const isNewNote = currentNoteId !== note.id;

      currentNoteId = note.id;

      // Only update title if user is not actively editing it or if we're switching notes
      if (!isUserEditingTitle || isNewNote) {
        title = note.name; // Update title when note changes
        originalTitle = note.name; // Update original title reference
      } else {
        console.log("Preserving user's title edits during note effect");
      }

      titleChanged = false; // Reset title changed flag when note changes
      const newContent = parseNoteContent(note.content);

      // Only update content and previousContent if this is a new note
      // or if the content has actually changed from the server
      if (isNewNote || noteContentStr !== currentContentStr) {
        console.log("Updating content from note prop");
        content = newContent;
        previousContent = JSON.stringify(newContent);

        // Only reset contentChanged flag if we're switching to a new note
        if (isNewNote) {
          contentChanged = false;
        }
      }

      if (note.section_type) {
        currentSectionType =
          typeof note.section_type === "object"
            ? { ...note.section_type }
            : { value: note.section_type, label: note.section_type };
      }
      console.log(
        `Note state fully updated for: ${note.id}, title: ${title}, contentChanged: ${contentChanged}`
      );
    }
  });

  // Monitor content changes using $effect instead of afterUpdate
  $effect(() => {
    // Skip processing if we're unmounting to avoid state mutation errors
    if (isUnmounting) {
      console.log("Skipping content effect during unmount");
      return;
    }

    const currentContentStr = JSON.stringify(content);
    console.log("Content effect triggered, checking for changes");

    if (currentContentStr !== previousContent) {
      console.log(
        "Content changed in effect, from:",
        previousContent.substring(0, 50) + "...",
        "to:",
        currentContentStr.substring(0, 50) + "..."
      );

      // Store the new content as previous content
      previousContent = currentContentStr;

      // Only mark as changed if we're not in the middle of a note switch
      // This prevents unnecessary saves during note switching
      if (currentNoteId === note.id) {
        console.log(`Setting contentChanged=true for note ${note.id}`);
        contentChanged = true;
        scheduleSave();
      } else {
        console.log(
          `Skipping contentChanged flag for note ${currentNoteId} vs ${note.id}`
        );
      }
    } else {
      console.log("Content unchanged in effect, not scheduling save");
    }
  });

  // Add an effect to track title changes
  $effect(() => {
    // Check if title has changed from original
    if (!isUnmounting) {
      titleChanged = title !== originalTitle;
      console.log(
        `Title changed: ${titleChanged}, title: "${title}", originalTitle: "${originalTitle}"`
      );
    }
  });

  // Auto-save functionality
  function scheduleSave() {
    clearTimeout(saveTimeout);

    // If we recently saved, wait the full debounce period
    const timeSinceLastSave = Date.now() - lastSaveTime;
    const delay =
      timeSinceLastSave < SAVE_DEBOUNCE
        ? SAVE_DEBOUNCE
        : Math.max(500, SAVE_DEBOUNCE - timeSinceLastSave);

    saveTimeout = setTimeout(saveNote, delay);
  }

  async function saveNote(forceSave = false) {
    if (isSaving || isUnmounting || (!contentChanged && !forceSave) || !note) {
      console.log("Not saving note because:", {
        isSaving,
        isUnmounting,
        contentChanged,
        forceSave,
        hasNote: !!note,
        noteId: note?.id,
        currentNoteId,
      });
      return Promise.resolve(); // Return a resolved promise
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
      console.log("Saving note to database:", {
        id: note.id,
        name: currentTitle,
        contentLength: contentToSave.length,
        contentPreview: contentToSave.substring(0, 100) + "...",
        forceSave,
      });

      // Use the store's update method to ensure the note list updates
      await notesStore.updateNote(note.id, {
        name: currentTitle,
        content: contentToSave,
      });

      // Update the note in the store's notes array to ensure NoteList updates
      const storeNotes = notesStore.notes;
      for (let i = 0; i < storeNotes.length; i++) {
        if (storeNotes[i].id === note.id) {
          // Update the note in place
          storeNotes[i].name = currentTitle;
          storeNotes[i].content = contentToSave;
          storeNotes[i].updated_at = new Date().toISOString();
          break;
        }
      }

      // Try to update the note preview in the NoteList directly
      // This is a more direct approach that should work even if the store reactivity fails
      setTimeout(() => {
        try {
          // Find the note item in the DOM
          const noteElements = document.querySelectorAll(
            `[data-note-id="${note.id}"]`
          );
          if (noteElements.length > 0) {
            // Update the preview text in each found element
            noteElements.forEach((noteEl) => {
              // Find the preview paragraph
              const previewEl = noteEl.querySelector(
                ".text-sm.text-muted-foreground.line-clamp-2"
              );
              if (previewEl) {
                // Extract a preview from the content
                let previewText = "";
                try {
                  const parsedContent = JSON.parse(contentToSave);
                  if (parsedContent.type === "doc" && parsedContent.content) {
                    for (const node of parsedContent.content) {
                      if (node.content) {
                        for (const contentNode of node.content) {
                          if (contentNode.type === "text" && contentNode.text) {
                            previewText += contentNode.text + " ";
                          }
                        }
                      }
                    }
                    // Limit preview length
                    previewText = previewText.trim().substring(0, 100);
                    if (previewText.length === 100) previewText += "...";
                  }
                } catch (e) {
                  console.warn("Error parsing content for preview:", e);
                }

                if (previewText) {
                  previewEl.textContent = previewText;
                  console.log(`Updated preview for note ${note.id} in the DOM`);
                }
              }
            });
          }
        } catch (e) {
          console.warn("Error updating note preview in DOM:", e);
        }
      }, 50);

      // Also try the search query approach as a fallback
      const currentQuery = notesStore.searchQuery;
      if (currentQuery) {
        notesStore.setSearchQuery(currentQuery);
      }

      console.log("Note saved successfully");
      return Promise.resolve(); // Return a resolved promise
    } catch (error) {
      console.error("Failed to save note:", error);
      if (!isUnmounting) {
        contentChanged = true; // Mark as still needing save, but only if not unmounting
      }
      return Promise.reject(error); // Return a rejected promise
    } finally {
      isSaving = false;

      // Check if content changed during save operation
      if (
        !isUnmounting &&
        (currentTitle !== title ||
          currentContentStr !== JSON.stringify(content))
      ) {
        console.log("Content changed during save, scheduling another save");
        contentChanged = true;
        scheduleSave();
      }
    }
  }

  // Add function to handle section type change
  function handleSectionTypeChange(value: string) {
    console.log("Section type changed to:", value);

    const selectedType = sectionTypeOptions.find(
      (option) => option.value === value
    );

    console.log("Selected type object:", selectedType);

    if (selectedType) {
      // Update our local state first
      currentSectionType = selectedType;

      // Make a direct API call to update the section type without going through the store's update mechanism
      // This avoids the remounting issue while ensuring the data is saved to the database
      fetch(`http://localhost:3333/note/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sectionType: selectedType.value }),
      })
        .then(async (response) => {
          if (!response.ok) {
            console.error("Failed to update section type");
          } else {
            console.log("Section type updated successfully");

            // Update the note in the store's notes array
            // This is a hack but it's the only way to update the UI without remounting
            const storeNotes = notesStore.notes;
            for (let i = 0; i < storeNotes.length; i++) {
              if (storeNotes[i].id === note.id) {
                // Create a new object to ensure reactivity
                const updatedNote = {
                  ...storeNotes[i],
                  section_type: selectedType,
                };

                // Use a direct DOM update to change the badge text
                // This is a last resort since we can't update the store directly
                setTimeout(() => {
                  const badgeElements = document.querySelectorAll(
                    `[data-note-id="${note.id}"] .badge-section-type`
                  );
                  if (badgeElements.length > 0) {
                    badgeElements.forEach((badge) => {
                      badge.textContent = selectedType.label;
                    });
                    console.log(
                      `Updated ${badgeElements.length} badge elements in the DOM`
                    );
                  } else {
                    console.log("No badge elements found in the DOM");
                  }
                }, 100);

                break;
              }
            }
          }
        })
        .catch((error) => {
          console.error("Error updating section type:", error);
        });
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
      if (note) {
        console.log(`Editor unmounting for note: ${note.id}`);
      } else {
        console.log(`Editor unmounting for unknown note`);
      }

      // Set isUnmounting to prevent any further state updates
      isUnmounting = true;

      // Clear any pending save timeout
      clearTimeout(saveTimeout);

      // Save any pending changes before unmounting
      if (document.visibilityState !== "hidden" && note && contentChanged) {
        console.log("Forcing save on unmount due to unsaved changes");

        // Use the store's update method to ensure the note list updates
        const contentToSave = JSON.stringify(content);

        // We need to use a setTimeout to ensure this runs after the current execution context
        // This helps avoid state mutation errors during unmounting
        setTimeout(() => {
          notesStore
            .updateNote(note.id, {
              name: title,
              content: contentToSave,
            })
            .then(() => {
              console.log("Note saved successfully on unmount via store");
            })
            .catch((error) => {
              console.error("Error saving note on unmount via store:", error);
            });
        }, 0);
      }
    } catch (error) {
      console.error("Error during editor unmounting:", error);
    }
  });
</script>

<div class="flex flex-col h-full relative">
  <!-- Saving Indicator (Absolute Position) -->
  {#if isSaving}
    <div
      class="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-background/80 backdrop-blur border shadow-sm flex items-center gap-2 text-sm text-muted-foreground"
      transition:fade={{ duration: 200 }}
    >
      <Save class="h-3 w-3 animate-spin" />
      Saving...
    </div>
  {/if}

  <!-- Editor Header -->
  <header
    class="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="flex items-center justify-between">
      <div class="flex-1 mr-4 flex items-center">
        <div class="relative flex-1">
          <Input
            type="text"
            placeholder="Untitled Note"
            class="text-lg font-medium bg-transparent border-none shadow-none h-auto px-0 focus-visible:ring-0"
            bind:value={title}
            onfocus={() => {
              // When the input is focused, mark as editing and ensure save button is visible
              isUserEditingTitle = true;
              isTitleFocused = true;
              titleChanged = true;
            }}
            onblur={() => {
              // When input loses focus, save if changed
              if (title !== originalTitle) {
                saveTitle();
              }

              // Small delay to allow for save operations to complete
              setTimeout(() => {
                isUserEditingTitle = false;
                isTitleFocused = false;
              }, 100);
            }}
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // Prevent form submission
                if (title !== originalTitle) {
                  saveTitle();
                }
              }
            }}
          />
        </div>
        {#if titleChanged}
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 ml-1"
            onclick={saveTitle}
            title="Save title"
          >
            <Save class="h-3 w-3" />
          </Button>
        {/if}
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <!-- Literature Selector Component -->
        {console.log(note)}
        {#if note && note.projectId}
          <LiteratureSelector
            noteId={note.id}
            projectId={note.projectId}
            selectedLiteratureId={note.literatureId}
            onLiteratureSelect={handleLiteratureSelect}
          />
        {/if}

        <Select
          type="single"
          value={currentSectionType.value}
          onValueChange={handleSectionTypeChange}
        >
          <SelectTrigger class="h-8 w-[180px]">
            <span>{currentSectionType.label}</span>
          </SelectTrigger>
          <SelectContent>
            {#each sectionTypeOptions as option}
              <SelectItem value={option.value}>{option.label}</SelectItem>
            {/each}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          onclick={() => saveNote(true)}
          title="Save note"
          disabled={isSaving}
        >
          <Save class={isSaving ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          onclick={() => onDelete()}
          title="Delete note"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>

  <!-- Editor Content -->
  {#if note}
    <div class="flex-1 overflow-hidden">
      <!-- Use a key block with just the note ID to force remounting when the note changes -->
      {#key note.id}
        <ShadEditor
          {content}
          on:contentChange={(e) => {
            console.log("Content change detected in editor");
            const newContent = e.detail;
            // Check if content has actually changed
            if (JSON.stringify(newContent) !== JSON.stringify(content)) {
              console.log("Content has changed, updating and scheduling save");
              content = newContent;
              contentChanged = true;
              scheduleSave();
            } else {
              console.log("Content unchanged, not scheduling save");
            }
          }}
          placeholder="Start writing..."
        />
      {/key}
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


  import type { Note } from "$lib/types";
  import { auth } from "$lib/stores/AuthStore";
  import { api, isAuthError } from "../services/api-client";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  type FilterType = "literature" | "research" | "all" | "unlinked" | "recent";
  type FilterState = {
    type: FilterType;
    literatureId?: string;
  };

  let notes = $state<Note[]>([]);
  // Track which project the current notes are loaded for
  let loadedProjectId = $state<string | null>(null);
  let activeNoteId = $state<string | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let searchQuery = $state("");
  let filter = $state<FilterState>({
    type: "literature",
  });
  let localSearchResults = $state<Note[]>([]);
  let activeLiteratureFilter = $state<string | undefined>(undefined);

  // Search highlighting functionality
  let highlightedNotes = $state<Note[]>([]);

  // Strip HTML tags from content
  function stripHtmlTags(content: string | any): string {
    if (!content) return "";

    if (typeof content === "object") {
      try {
        // Extract text from JSON content
        return extractTextFromJson(content);
      } catch (e) {
        return "";
      }
    }

    if (typeof content !== "string") return String(content);

    const tmp = document.createElement("DIV");
    tmp.innerHTML = content;
    return tmp.textContent || tmp.innerText || "";
  }

  // Extract text from JSON content
  function extractTextFromJson(json: any): string {
    if (!json) return "";
    let text = "";

    try {
      // Handle string JSON
      if (typeof json === "string") {
        try {
          json = JSON.parse(json);
        } catch (e) {
          return json;
        }
      }

      // Handle TipTap document format
      if (json.type === "doc" && json.content && Array.isArray(json.content)) {
        // Process each node in the document
        json.content.forEach((node: any) => {
          if (node.type === "paragraph" || node.type === "heading") {
            // Extract text from paragraph or heading content
            if (node.content && Array.isArray(node.content)) {
              node.content.forEach((textNode: any) => {
                if (textNode.type === "text" && textNode.text) {
                  text += textNode.text + " ";
                }
              });
              text += "\n";
            }
          } else if (node.type === "text" && node.text) {
            // Direct text node
            text += node.text + " ";
          } else if (node.content && Array.isArray(node.content)) {
            // Other node types with content
            node.content.forEach((child: any) => {
              if (child.type === "text" && child.text) {
                text += child.text + " ";
              }
            });
          }
        });
        return text.trim();
      }

      // Fallback for other JSON structures
      if (json.content && Array.isArray(json.content)) {
        json.content.forEach((node: any) => {
          // Handle text nodes
          if (node.text) {
            text += node.text + " ";
          }
          // Handle paragraph/headings with text content
          else if (node.content && Array.isArray(node.content)) {
            node.content.forEach((child: any) => {
              if (child.text) {
                text += child.text + " ";
              }
            });
            text += " ";
          }
        });
      } else if (json.text) {
        text += json.text + " ";
      }

      return text.trim();
    } catch (e) {
      console.error("Error extracting text from JSON:", e);
      return "";
    }
  }

  // Highlight search terms in text
  function highlightText(text: string, query: string): string {
    if (!query || !text) return text;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  // Create a snippet of text around the search term
  function getSnippet(
    content: string,
    query: string,
    snippetLength: number = 150
  ): string {
    if (!query || !content) return content;

    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return content.slice(0, snippetLength);

    const start = Math.max(0, index - snippetLength / 2);
    const end = Math.min(content.length, start + snippetLength);
    let snippet = content.slice(start, end);

    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet += "...";

    return highlightText(snippet, query);
  }

  // Process notes for highlighting based on search query
  function processNotesForHighlighting(
    notesToProcess: Note[],
    query: string
  ): Note[] {
    if (!query) return notesToProcess;

    // Only process notes that actually match the query
    return (
      notesToProcess
        .filter((note) => {
          // Extract text from content using improved logic
          let contentText = "";
          try {
            const content = note.content;

            if (typeof content === "string") {
              try {
                // Try to parse as JSON
                const parsed = JSON.parse(content) as any;

                // If it's a TipTap document
                if (
                  parsed.type === "doc" &&
                  parsed.content &&
                  Array.isArray(parsed.content)
                ) {
                  for (const node of parsed.content) {
                    if (node.content && Array.isArray(node.content)) {
                      for (const contentNode of node.content) {
                        if (contentNode.type === "text" && contentNode.text) {
                          contentText += contentNode.text + " ";
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Not valid JSON, treat as text
                const tmp = document.createElement("DIV");
                tmp.innerHTML = content;
                contentText = tmp.textContent || tmp.innerText || content;
              }
            } else if (typeof content === "object" && content !== null) {
              const typedContent = content as any;
              if (
                typedContent.type === "doc" &&
                typedContent.content &&
                Array.isArray(typedContent.content)
              ) {
                for (const node of typedContent.content) {
                  if (node.content && Array.isArray(node.content)) {
                    for (const contentNode of node.content) {
                      if (contentNode.type === "text" && contentNode.text) {
                        contentText += contentNode.text + " ";
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn("Error extracting text for search highlighting:", err);
          }

          const nameMatch = (note.name || "")
            .toLowerCase()
            .includes(query.toLowerCase());
          const contentMatch = contentText
            .toLowerCase()
            .includes(query.toLowerCase());

          // Handle section_type which could be a string or an object
          let sectionTypeLabel = t('stores.notes.other');
          if (
            typeof note.section_type === "object" &&
            note.section_type !== null
          ) {
            sectionTypeLabel =
              (note.section_type as { value: string; label: string }).label ||
              t('stores.notes.other');
          } else if (typeof note.section_type === "string") {
            sectionTypeLabel = note.section_type;
          }

          const sectionMatch = sectionTypeLabel
            .toLowerCase()
            .includes(query.toLowerCase());

          // Format date in a friendly way for consistent searching
          const friendlyDate = note.updated_at
            ? formatFriendlyDate(new Date(note.updated_at))
            : "";
          const dateMatch = friendlyDate
            .toLowerCase()
            .includes(query.toLowerCase());

          return nameMatch || contentMatch || sectionMatch || dateMatch;
        })
        .map((note) => {
          // Extract text from content for snippet
          let contentText = "";
          try {
            const content = note.content;

            if (typeof content === "string") {
              try {
                // Try to parse as JSON
                const parsed = JSON.parse(content) as any;

                // If it's a TipTap document
                if (
                  parsed.type === "doc" &&
                  parsed.content &&
                  Array.isArray(parsed.content)
                ) {
                  for (const node of parsed.content) {
                    if (node.content && Array.isArray(node.content)) {
                      for (const contentNode of node.content) {
                        if (contentNode.type === "text" && contentNode.text) {
                          contentText += contentNode.text + " ";
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Not valid JSON, treat as text
                const tmp = document.createElement("DIV");
                tmp.innerHTML = content;
                contentText = tmp.textContent || tmp.innerText || content;
              }
            } else if (typeof content === "object" && content !== null) {
              const typedContent = content as any;
              if (
                typedContent.type === "doc" &&
                typedContent.content &&
                Array.isArray(typedContent.content)
              ) {
                for (const node of typedContent.content) {
                  if (node.content && Array.isArray(node.content)) {
                    for (const contentNode of node.content) {
                      if (contentNode.type === "text" && contentNode.text) {
                        contentText += contentNode.text + " ";
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn("Error extracting text for search snippet:", err);
          }

          const highlightedName = highlightText(
            note.name || t('stores.notes.untitledNote'),
            query
          );
          const contentSnippet = getSnippet(contentText, query);

          // Handle section_type which could be a string or an object
          let sectionTypeLabel = t('stores.notes.other');
          if (
            typeof note.section_type === "object" &&
            note.section_type !== null
          ) {
            sectionTypeLabel =
              (note.section_type as { value: string; label: string }).label ||
              t('stores.notes.other');
          } else if (typeof note.section_type === "string") {
            sectionTypeLabel = note.section_type;
          }

          const sectionMatch = sectionTypeLabel
            .toLowerCase()
            .includes(query.toLowerCase());

          const highlightedSectionType = highlightText(sectionTypeLabel, query);

          // Use friendly date format for highlighting
          const friendlyDate = note.updated_at
            ? formatFriendlyDate(new Date(note.updated_at))
            : "";
          
          // Only highlight date if it actually matches the query
          const dateMatch = friendlyDate
            .toLowerCase()
            .includes(query.toLowerCase());
          const highlightedDate = dateMatch ? highlightText(friendlyDate, query) : friendlyDate;
          return {
            ...note,
            highlightedName,
            contentSnippet,
            highlightedSectionType,
            highlightedDate,
            isHighlighted: true,
          };
        })
        // Sort by updated_at date (most recent first)
        .sort(
          (a, b) =>
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
        )
    );
  }

  // Format date in a friendly way (e.g., "Feb 25, 2024")
  function formatFriendlyDate(date: Date): string {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  export const notesStore = {
    get notes() {
      return notes;
    },
    get loadedProjectId() {
      return loadedProjectId;
    },
    get activeNoteId() {
      return activeNoteId;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get searchQuery() {
      return searchQuery;
    },
    get filter() {
      return filter;
    },
    get highlightedNotes() {
      return highlightedNotes;
    },

    async loadNotes(projectId: string, literatureId?: string) {
      if (!projectId) {
        error = t("stores.notes.noProjectId");
        isLoading = false;
        return;
      }

      isLoading = true;
      error = null;

      try {
        // Use centralized API client which handles auth errors automatically
        const fetchedData = await api.get<any[]>(
          `/note/project/${projectId}${
            literatureId ? `?literatureId=${literatureId}` : ""
          }`
        );

        let processedNotes: Note[] = [];

        // Handle the special structure returned by the backend
        fetchedData.forEach((item: any) => {
          // Check if this is a regular note or a grouped literature note
          if (item.notes) {
            // This is a grouped literature note
            item.notes.forEach((note: any) => {
              processedNotes.push(processNoteData(note));
            });
          } else {
            // This is a regular note
            processedNotes.push(processNoteData(item));
          }
        });

        notes = processedNotes;
        loadedProjectId = projectId;

        // If there's an active search query, update highlighted notes
        if (searchQuery) {
          this.setSearchQuery(searchQuery);
        }

        filter = {
          ...filter,
          literatureId,
        };
      } catch (err) {
        console.error("Error loading notes:", err);
        error = err instanceof Error ? err.message : t("common.anErrorOccurred");
        notes = [];
        loadedProjectId = null;
      } finally {
        isLoading = false;
      }
    },

    async createNote(data: Partial<Note>, options?: { setActive?: boolean }) {
      isLoading = true;
      error = null;

      try {
        if (!auth.user?.id) {
          throw new Error(t("common.notesStore.userNotAuthenticated"));
        }

        const now = new Date().toISOString();
        // For the frontend we use an object, but for the API we send just the value
        const sectionType =
          data.section_type && typeof data.section_type === "object"
            ? data.section_type.value
            : data.section_type || t('stores.notes.other');

        // Use type assertion to avoid TypeScript errors with camelCase backend fields
        const payload = {
          name: data.name || t('stores.notes.untitledNote'),
          content: data.content || "",
          type: data.type || "RESEARCH",
          sectionType: sectionType, // Use camelCase for backend
          projectId: data.projectId,
          userId: auth.user.id,
          literatureId: data.literatureId,
        } as any; // Type assertion to avoid linter errors

        // Use centralized API client which handles auth errors automatically
        const newNote = await api.post<Note>(`/note`, payload);

        // Create a new object with the correct structure before processing
        const noteWithCorrectTypes = {
          ...newNote,
          // Note: API already returns data in correct format matching Note interface
        };

        // Process the note data to ensure correct formatting
        const processedNote: Note = processNoteData(noteWithCorrectTypes);

        notes = [processedNote, ...notes];
        // Only set active note if setActive is not explicitly false (defaults to true)
        if (options?.setActive !== false) {
          activeNoteId = processedNote.id;
        }
        return processedNote;
      } catch (err) {
        console.error("Error creating note:", err);
        error = err instanceof Error ? err.message : t("common.anErrorOccurred");
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async updateNote(
      id: string,
      data: Partial<Note>,
      uiOnlyUpdate: boolean = false
    ): Promise<Note> {
      // Don't set loading state for content updates to avoid UI flicker
      const isContentUpdate =
        Object.keys(data).length === 2 && "name" in data && "content" in data;

      if (!isContentUpdate && !uiOnlyUpdate) {
        isLoading = true;
      }
      error = null;

      try {
        // Make sure content is a string when sending to server
        const payload: any = { ...data }; // Use type assertion to avoid TypeScript errors

        // Handle section_type specially - backend expects a string, not an object
        // Also convert section_type to sectionType for the backend
        if (payload.section_type && typeof payload.section_type === "object") {
          // Use sectionType (camelCase) for the backend
          payload.sectionType = payload.section_type.value;
          // Remove the snake_case version to avoid confusion
          delete payload.section_type;
        } else if (
          payload.section_type &&
          typeof payload.section_type === "string"
        ) {
          // Use sectionType (camelCase) for the backend
          payload.sectionType = payload.section_type;
          // Remove the snake_case version to avoid confusion
          delete payload.section_type;
        }

        // For UI-only updates, update the local state first
        if (uiOnlyUpdate) {
          // Update the note in the local state without causing full array replacement
          const updatedNote = notes.find(n => n.id === id);
          if (!updatedNote) {
            throw new Error(t("common.notesStore.noteNotFound"));
          }
          
          const newNote = { ...updatedNote, ...data };
          newNote.updated_at = new Date().toISOString();
          
          notes = notes.map((note) => {
            if (note.id === id) {
              return newNote;
            }
            return note;
          });

          // If there's an active search query, update highlighted notes
          if (searchQuery) {
            this.setSearchQuery(searchQuery);
          }
          
          return newNote;
        }

        // Make the API call for non-UI-only updates
        // Use centralized API client which handles auth errors automatically
        const response = await api.put<{note: Note} | Note>(`/note/${id}`, payload);

        const processedUpdatedNote = processNoteData(
          'note' in response ? response.note : response
        );

          // Update the note in the local state without causing full array replacement
          notes = notes.map((note) => {
            if (note.id === id) {
              // For content updates, just update the specific fields that changed
              // rather than replacing the entire note
              if (isContentUpdate) {
                const updatedNote = { ...note };
                updatedNote.name = data.name as string;
                if (typeof data.content === "string") {
                  updatedNote.content = data.content;
                }
                // Update updated_at to current time
                updatedNote.updated_at = new Date().toISOString();
                return updatedNote;
              } else if (data.section_type) {
                // For section_type updates, update just that property
                const updatedNote = { ...note };
                if (typeof data.section_type === "object") {
                  if (typeof updatedNote.section_type === "object") {
                    // Update existing object properties
                    updatedNote.section_type = {
                      ...updatedNote.section_type,
                      value: data.section_type.value,
                      label: data.section_type.label,
                    };
                  } else {
                    // Replace with new object
                    updatedNote.section_type = data.section_type;
                  }
                } else {
                  updatedNote.section_type = data.section_type;
                }
                // Update updated_at to current time
                updatedNote.updated_at = new Date().toISOString();
                return updatedNote;
              } else {
                // For other updates, use the server response
                return { ...note, ...processedUpdatedNote };
              }
            }
            return note;
          });

          // If there's an active search query, update highlighted notes
          if (searchQuery) {
            this.setSearchQuery(searchQuery);
          }
          
          // Return the updated note
          const finalNote = notes.find(n => n.id === id);
          if (!finalNote) {
            throw new Error(t("common.notesStore.failedToUpdateNote"));
          }
          return finalNote;

      } catch (err) {
        console.error("Error updating note:", err);
        error = err instanceof Error ? err.message : t("common.anErrorOccurred");
        throw err;
      } finally {
        if (!isContentUpdate && !uiOnlyUpdate) {
          isLoading = false;
        }
      }
    },

    async deleteNote(id: string) {
      isLoading = true;
      error = null;

      try {
        // Use centralized API client which handles auth errors automatically
        await api.delete<void>(`/note/${id}`);

        notes = notes.filter((note) => note.id !== id);
        activeNoteId = activeNoteId === id ? null : activeNoteId;

        // If there's an active search query, update highlighted notes
        if (searchQuery) {
          this.setSearchQuery(searchQuery);
        }
      } catch (err) {
        console.error("Error deleting note:", err);
        error = err instanceof Error ? err.message : t("common.anErrorOccurred");
        throw err;
      } finally {
        isLoading = false;
      }
    },

    setActiveNote(id: string | null) {
      activeNoteId = id;
    },

    setSearchQuery(query: string) {
      searchQuery = query;

      if (!query) {
        highlightedNotes = [];
        return;
      }

      // Filter notes based on search query
      const filteredNotes = notes.filter((note) => {
        // Check name match
        const nameMatch = note.name
          ?.toLowerCase()
          .includes(query.toLowerCase());

        // Extract text from content using improved logic
        let contentText = "";
        try {
          const content = note.content;

          if (typeof content === "string") {
            try {
              // Try to parse as JSON
              const parsed = JSON.parse(content) as any;

              // If it's a TipTap document
              if (
                parsed.type === "doc" &&
                parsed.content &&
                Array.isArray(parsed.content)
              ) {
                for (const node of parsed.content) {
                  if (node.content && Array.isArray(node.content)) {
                    for (const contentNode of node.content) {
                      if (contentNode.type === "text" && contentNode.text) {
                        contentText += contentNode.text + " ";
                      }
                    }
                  }
                }
              }
            } catch (e) {
              // Not valid JSON, treat as text
              const tmp = document.createElement("DIV");
              tmp.innerHTML = content;
              contentText = tmp.textContent || tmp.innerText || content;
            }
          } else if (typeof content === "object" && content !== null) {
            const typedContent = content as any;
            if (
              typedContent.type === "doc" &&
              typedContent.content &&
              Array.isArray(typedContent.content)
            ) {
              for (const node of typedContent.content) {
                if (node.content && Array.isArray(node.content)) {
                  for (const contentNode of node.content) {
                    if (contentNode.type === "text" && contentNode.text) {
                      contentText += contentNode.text + " ";
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Error extracting text for search:", err);
        }

        const contentMatch = contentText
          .toLowerCase()
          .includes(query.toLowerCase());

        // Handle section_type which could be a string or an object
        let sectionTypeLabel = "Other";
        if (
          typeof note.section_type === "object" &&
          note.section_type !== null
        ) {
          sectionTypeLabel =
            (note.section_type as { value: string; label: string }).label ||
            "Other";
        } else if (typeof note.section_type === "string") {
          sectionTypeLabel = note.section_type;
        }

        const sectionMatch = sectionTypeLabel
          .toLowerCase()
          .includes(query.toLowerCase());

        // Use friendly date format for consistent searching
        const friendlyDate = note.updated_at
          ? formatFriendlyDate(new Date(note.updated_at))
          : "";
        const dateMatch = friendlyDate
          .toLowerCase()
          .includes(query.toLowerCase());

        return nameMatch || contentMatch || sectionMatch || dateMatch;
      });

      // Process filtered notes for highlighting
      highlightedNotes = processNotesForHighlighting(filteredNotes, query);
    },

    setFilter(newFilter: FilterState) {
      filter = { ...newFilter }; // Create a new object to ensure reactivity

      // If there's an active search query, update highlighted notes
      if (searchQuery) {
        this.setSearchQuery(searchQuery);
      }
    },

    reset() {
      notes = [];
      activeNoteId = null;
      error = null;
      isLoading = false;
      searchQuery = "";
      filter = { type: "literature" };
      highlightedNotes = [];
      loadedProjectId = null;
    },
  };

  // Helper function to process note data and ensure dates are properly formatted
  function processNoteData(note: any): Note {
    // Convert snake_case to camelCase if needed
    const processedNote: any = { ...note };
    
    // Handle date field mapping - API might send camelCase, frontend expects snake_case
    if (note.updatedAt && !note.updated_at) {
      processedNote.updated_at = note.updatedAt;
    }
    if (note.createdAt && !note.created_at) {
      processedNote.created_at = note.createdAt;
    }

    // Handle section_type - it might be a string in the database but needs to be an object in the frontend
    // First check if we have sectionType from the backend (camelCase)
    if (processedNote.sectionType !== undefined) {
      // Handle null sectionType from backend
      if (processedNote.sectionType === null) {
        processedNote.section_type = { value: t('stores.notes.other'), label: t('stores.notes.other') };
      } else {
        // Convert backend's sectionType to frontend's section_type
        processedNote.section_type =
          typeof processedNote.sectionType === "string"
            ? {
                value: processedNote.sectionType,
                label: processedNote.sectionType,
              }
            : processedNote.sectionType;
      }

      // Remove the camelCase version to avoid confusion
      delete processedNote.sectionType;
    }
    // Then handle the frontend's section_type field
    else if (
      typeof processedNote.section_type === "string" &&
      processedNote.section_type
    ) {
      processedNote.section_type = {
        value: processedNote.section_type,
        label: processedNote.section_type,
      };
    } else if (!processedNote.section_type) {
      processedNote.section_type = { value: "Other", label: "Other" };
    } else if (
      typeof processedNote.section_type === "object" &&
      !processedNote.section_type.label
    ) {
      // Handle case where we have an object but it's missing the label
      processedNote.section_type = {
        value: processedNote.section_type.value || t('stores.notes.other'),
        label: processedNote.section_type.value || t('stores.notes.other'),
      };
    }

    // Ensure created_at and updated_at are valid ISO strings
    const now = new Date().toISOString();
    processedNote.created_at = processedNote.created_at
      ? new Date(processedNote.created_at).toISOString()
      : now;
    processedNote.updated_at = processedNote.updated_at
      ? new Date(processedNote.updated_at).toISOString()
      : now;

    return processedNote as Note;
  }

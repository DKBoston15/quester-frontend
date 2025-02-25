<script lang="ts">
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import type { Note } from "$lib/types";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { Search, Tag, PanelRight, PanelLeft, Clock } from "lucide-svelte";
  import { format } from "date-fns";
  import { fade } from "svelte/transition";

  // Props
  export let onNoteSelect: (note: Note, targetPanel?: string) => void;
  export let showSecondPanelOption = false;

  // Local state
  let searchInput = "";
  let localSearchResults: Note[] = [];
  let debouncedSearchTimeout: NodeJS.Timeout;

  // Reactive declarations
  $: {
    // Immediately update local search results and store query
    if (searchInput.trim()) {
      localSearchResults = performLocalSearch(
        notesStore.notes,
        searchInput.trim()
      );
      // Update store immediately for better responsiveness
      notesStore.setSearchQuery(searchInput.trim());
    } else {
      localSearchResults = [];
      notesStore.setSearchQuery("");
    }
  }

  $: filteredNotes = filterNotes(
    notesStore.notes,
    searchInput,
    notesStore.filter
  );
  $: groupedNotes = groupNotesByDate(filteredNotes);
  $: isSearchActive = searchInput.trim().length > 0;

  // Perform a quick local search for immediate feedback
  function performLocalSearch(notes: Note[], query: string): Note[] {
    const lowerQuery = query.toLowerCase();
    return (
      notes
        .filter((note) => {
          // Search only in title, content text (not raw JSON), and date
          const nameMatch = (note.name || "")
            .toLowerCase()
            .includes(lowerQuery);

          // Extract text from content using the same logic as getPreview
          let contentText = "";
          try {
            const content = note.content;

            if (typeof content === "string") {
              try {
                // Try to parse as JSON
                const parsed = JSON.parse(content);

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

          const contentMatch = contentText.toLowerCase().includes(lowerQuery);

          // Check section_type match
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
            .includes(lowerQuery);

          // Use friendly date format for consistent searching
          const friendlyDate = note.updated_at
            ? formatFriendlyDate(new Date(note.updated_at))
            : "";
          const dateMatch = friendlyDate.toLowerCase().includes(lowerQuery);

          return nameMatch || contentMatch || sectionMatch || dateMatch;
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

  // Update search input
  function handleSearchInput(e: Event) {
    // The binding will update searchInput, and the reactive statement will handle the search
  }

  // Filter notes based on search and filter criteria
  function filterNotes(
    notes: Note[],
    search: string,
    filter: typeof notesStore.filter
  ) {
    // First sort all notes by updated_at (most recent first)
    let filtered = [...notes].sort(
      (a, b) =>
        new Date(b.updated_at || 0).getTime() -
        new Date(a.updated_at || 0).getTime()
    );

    // Apply search filter
    if (search.trim()) {
      // Use highlighted notes from store if available, otherwise use local results
      return notesStore.highlightedNotes.length > 0
        ? notesStore.highlightedNotes
        : localSearchResults;
    }

    // Apply type filter
    switch (filter.type) {
      case "unlinked":
        filtered = filtered.filter((note) => !note.literature_id);
        break;
      case "literature":
        filtered = filtered.filter((note) => !!note.literature_id);
        break;
      case "recent":
        filtered = filtered.slice(0, 10);
        break;
    }

    // Apply literature filter if specified
    if (filter.literatureId) {
      filtered = filtered.filter(
        (note) => note.literature_id === filter.literatureId
      );
    }

    return filtered;
  }

  // Get formatted time
  function getFormattedTime(dateStr: string | undefined) {
    try {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return format(date, "h:mm a");
    } catch (err) {
      console.warn("Error formatting time:", err);
      return "";
    }
  }

  // Get formatted date
  function getFormattedDate(dateStr: string | undefined) {
    try {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return formatFriendlyDate(date);
    } catch (err) {
      console.warn("Error formatting date:", err);
      return "";
    }
  }

  // Group notes by date
  function groupNotesByDate(notes: Note[]): [string, Note[]][] {
    // If search is active, don't group by date
    if (isSearchActive) {
      return [["Search Results", notes]];
    }

    const groups: Record<string, Note[]> = {};

    notes.forEach((note) => {
      try {
        const date = note.updated_at ? new Date(note.updated_at) : new Date();
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for note ${note.id}:`, note.updated_at);
          return; // Skip this note
        }
        const dateStr = format(date, "MMM d, yyyy");
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(note);
      } catch (err) {
        console.warn(`Error processing note ${note.id}:`, err);
      }
    });

    // Sort each group by updated_at date (most recent first)
    for (const dateStr in groups) {
      groups[dateStr].sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
      );
    }

    return Object.entries(groups).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }

  // Strip HTML tags from content for preview
  function stripHtml(html: string | any) {
    if (!html) return "";

    // If it's an object, try to extract text
    if (typeof html === "object") {
      return extractTextFromJson(html);
    }

    // If it looks like JSON, try to extract text
    if (
      typeof html === "string" &&
      (html.trim().startsWith("{") || html.trim().startsWith("["))
    ) {
      try {
        const parsed = JSON.parse(html);
        return extractTextFromJson(parsed);
      } catch (e) {
        // If parsing fails, treat as HTML
        console.warn("Failed to parse JSON:", e);
      }
    }

    // Handle as HTML
    if (typeof html !== "string") {
      return String(html);
    }

    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // Extract text from TipTap JSON content
  function extractTextFromJson(json: any): string {
    if (!json) return "";

    // For debugging
    console.log(
      "Extracting text from:",
      typeof json === "string" ? json : JSON.stringify(json).slice(0, 100)
    );

    let text = "";

    try {
      // Handle string JSON
      if (typeof json === "string") {
        try {
          json = JSON.parse(json);
        } catch (e) {
          console.warn("Failed to parse JSON string:", e);
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

        console.log("Extracted text:", text.trim());
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

      console.log("Extracted text (fallback):", text.trim());
      return text.trim();
    } catch (e) {
      console.warn("Error extracting text from JSON:", e);
      return "";
    }
  }

  // Get preview text
  function getPreview(content: string | any) {
    try {
      if (!content) return "";

      // For debugging
      console.log("Content type:", typeof content);
      if (typeof content === "string") {
        console.log("Content preview:", content.substring(0, 50));
      }

      // Handle string content that might be JSON
      if (typeof content === "string") {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(content);

          // If it's a TipTap document
          if (
            parsed.type === "doc" &&
            parsed.content &&
            Array.isArray(parsed.content)
          ) {
            let text = "";

            // Process each node in the document
            for (const node of parsed.content) {
              if (node.content && Array.isArray(node.content)) {
                for (const contentNode of node.content) {
                  if (contentNode.type === "text" && contentNode.text) {
                    text += contentNode.text + " ";
                  }
                }
              }
            }

            if (text.trim()) {
              return text.slice(0, 100) + (text.length > 100 ? "..." : "");
            }
          }
        } catch (e) {
          // Not valid JSON, treat as text
          console.log("Not valid JSON:", e);

          // Handle as plain text or HTML
          const tmp = document.createElement("DIV");
          tmp.innerHTML = content;
          const plainText = tmp.textContent || tmp.innerText || content;
          return (
            plainText.slice(0, 100) + (plainText.length > 100 ? "..." : "")
          );
        }
      }

      // Handle direct object content (already parsed JSON)
      if (typeof content === "object" && content !== null) {
        if (
          content.type === "doc" &&
          content.content &&
          Array.isArray(content.content)
        ) {
          let text = "";

          // Process each node in the document
          for (const node of content.content) {
            if (node.content && Array.isArray(node.content)) {
              for (const contentNode of node.content) {
                if (contentNode.type === "text" && contentNode.text) {
                  text += contentNode.text + " ";
                }
              }
            }
          }

          if (text.trim()) {
            return text.slice(0, 100) + (text.length > 100 ? "..." : "");
          }
        }
      }

      // If we couldn't extract any text, return a default message
      return "No preview available";
    } catch (err) {
      console.warn("Error getting preview:", err);
      return "Error extracting preview";
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Search Bar -->
  <div class="p-4 border-b">
    <div class="relative">
      <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search notes..."
        class="pl-8"
        bind:value={searchInput}
        oninput={handleSearchInput}
      />
    </div>
  </div>

  <!-- Note List -->
  <ScrollArea class="flex-1">
    <div class="p-4 space-y-6">
      {#each groupedNotes as [date, notes]}
        <div>
          <h3 class="mb-2 px-2 text-sm font-medium text-muted-foreground">
            {date}
          </h3>
          <div class="space-y-2">
            {#each notes as note (note.id)}
              <div
                class="w-full text-left rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                class:bg-accent={note.id === notesStore.activeNoteId}
                transition:fade
                onclick={() => onNoteSelect(note, "left")}
                onkeydown={(e) =>
                  e.key === "Enter" && onNoteSelect(note, "left")}
                tabindex="0"
                role="button"
                data-note-id={note.id}
              >
                <div class="p-3">
                  <div class="flex items-start justify-between">
                    <div class="space-y-1 flex-1 mr-2">
                      <h4 class="font-medium leading-none">
                        {#if isSearchActive && "highlightedName" in note}
                          {@html note.highlightedName}
                        {:else}
                          {note.name || "Untitled Note"}
                        {/if}
                      </h4>
                      <p class="text-sm text-muted-foreground line-clamp-2">
                        {#if isSearchActive && "contentSnippet" in note}
                          {@html note.contentSnippet}
                        {:else}
                          {getPreview(note.content)}
                        {/if}
                      </p>
                    </div>

                    <div class="flex-shrink-0">
                      {#if showSecondPanelOption}
                        <div class="flex gap-1">
                          <button
                            class="p-1 rounded hover:bg-secondary"
                            title="Open in left panel"
                            onclick={(e) => {
                              e.stopPropagation();
                              onNoteSelect(note, "left");
                            }}
                            onkeydown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                onNoteSelect(note, "left");
                              }
                            }}
                          >
                            <PanelLeft class="h-4 w-4" />
                          </button>
                          <button
                            class="p-1 rounded hover:bg-secondary"
                            title="Open in right panel"
                            onclick={(e) => {
                              e.stopPropagation();
                              onNoteSelect(note, "right");
                            }}
                            onkeydown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                onNoteSelect(note, "right");
                              }
                            }}
                          >
                            <PanelRight class="h-4 w-4" />
                          </button>
                        </div>
                      {:else}
                        <button
                          class="p-1 rounded hover:bg-secondary"
                          title="Open note"
                          onclick={(e) => {
                            e.stopPropagation();
                            onNoteSelect(note);
                          }}
                          onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              onNoteSelect(note);
                            }
                          }}
                        >
                          <PanelLeft class="h-4 w-4" />
                        </button>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-2 mt-2">
                    {#if note.section_type}
                      <Badge
                        variant="outline"
                        class="text-xs badge-section-type"
                      >
                        {#if isSearchActive && "highlightedSectionType" in note}
                          {@html note.highlightedSectionType}
                        {:else}
                          {typeof note.section_type === "object"
                            ? note.section_type.label
                            : note.section_type}
                        {/if}
                      </Badge>
                    {/if}
                    {#if note.literature_id}
                      <Badge
                        variant="outline"
                        class="text-xs flex items-center gap-1"
                      >
                        <Tag class="h-3 w-3" />
                        Literature
                      </Badge>
                    {/if}
                    <span
                      class="text-xs text-muted-foreground ml-auto flex items-center gap-1"
                    >
                      <Clock class="h-3 w-3" />
                      {#if isSearchActive && "highlightedDate" in note}
                        {@html note.highlightedDate}
                      {:else}
                        {getFormattedDate(note.updated_at)}
                      {/if}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}

      {#if filteredNotes.length === 0}
        <div class="text-center py-8 text-muted-foreground">
          <p>No notes found</p>
          {#if searchInput}
            <p class="text-sm mt-1">Try adjusting your search terms</p>
          {/if}
        </div>
      {/if}
    </div>
  </ScrollArea>
</div>

<style>
  :global(mark) {
    background-color: #ffd700;
    color: black;
    padding: 0 2px;
    border-radius: 2px;
  }
</style>

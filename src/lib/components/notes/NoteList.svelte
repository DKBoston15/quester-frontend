<script lang="ts">
  import { notesStore } from "$lib/stores/NotesStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import type { Note } from "$lib/types";
  import type { Literature } from "$lib/types/literature";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import {
    Search,
    PanelRight,
    PanelLeft,
    Clock,
    Book,
    X,
    Filter,
  } from "lucide-svelte";
  import { format } from "date-fns";
  import { fade } from "svelte/transition";
  import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
  import { Button } from "$lib/components/ui/button";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Portal } from "bits-ui";
  import { tick } from "svelte";
  import { EmptyState } from "$lib/components/ui/empty-state";

  // Props
  const { onNoteSelect, showSecondPanelOption = false } = $props<{
    onNoteSelect: (note: Note, targetPanel?: string) => void;
    showSecondPanelOption?: boolean;
  }>();

  // Local state
  let searchInput = $state("");
  let filteredNotes = $state<Note[]>([]);
  let groupedNotes = $state<[string, Note[]][]>([]);
  let isSearchActive = $state(false);
  let localSearchResults = $state<Note[]>([]);
  let activeLiteratureFilter = $state<string | undefined>(undefined);
  let filterSearchValue = $state("");
  let literatureMap = $state<Record<string, Literature>>({});
  let filterOpen = $state(false);
  let triggerRef = $state<HTMLButtonElement>(null!);

  // Filtered literature based on search
  let filteredLiterature = $derived(
    filterSearchValue
      ? literatureStore.data.filter(
          (item) =>
            item.name
              ?.toLowerCase()
              .includes(filterSearchValue.toLowerCase()) ||
            (typeof item.authors === "string"
              ? item.authors.toLowerCase()
              : ""
            ).includes(filterSearchValue.toLowerCase()) ||
            item.doi?.toLowerCase().includes(filterSearchValue.toLowerCase())
        )
      : literatureStore.data
  );

  // Load literature data for display
  async function loadLiteratureData() {
    // Only load if we have notes with literature connections
    const hasLiteratureConnections = notesStore.notes.some(
      (note) => note.literatureId
    );

    if (hasLiteratureConnections && literatureStore.data.length === 0) {
      // Find a project_id from the notes
      const projectId = notesStore.notes.find((n) => n.projectId)?.projectId;
      if (projectId) {
        await literatureStore.loadLiterature(projectId);
      }
    }

    // Create a map of literature items by ID for easy lookup
    literatureMap = literatureStore.data.reduce(
      (map, item) => {
        map[item.id] = item;
        return map;
      },
      {} as Record<string, Literature>
    );
  }

  // Call this on component mount
  import { onMount } from "svelte";
  onMount(loadLiteratureData);

  // Also update when notes change
  $effect(() => {
    if (notesStore.notes.length > 0) {
      loadLiteratureData();
    }
  });

  // Get literature title for a note
  function getLiteratureTitle(literatureId: string | undefined) {
    if (!literatureId) return "Literature";
    const literature = literatureMap[literatureId];
    return literature?.title || "Literature";
  }

  // Get complete literature details for tooltip
  function getLiteratureDetails(literatureId: string | undefined) {
    if (!literatureId) return "No literature connected";
    const literature = literatureMap[literatureId];
    if (!literature) return "Literature data not found";

    let details = literature.name;
    if (literature.authors) {
      details += `\nAuthors: ${literature.authors}`;
    }
    if (literature.publishYear) {
      details += `\nYear: ${literature.publishYear}`;
    }
    if (literature.publisherName) {
      details += `\nPublication: ${literature.publisherName}`;
    }
    return details;
  }

  // Update search state
  $effect(() => {
    isSearchActive = searchInput.trim().length > 0;
  });

  // Update filtered notes
  $effect(() => {
    // Get base filtered notes
    let filtered = [...notesStore.notes];

    // Apply type filter - ALWAYS do this first
    if (notesStore.filter.type !== "all") {
      filtered = filtered.filter((note) => {
        if (notesStore.filter.type === "literature") {
          return note.type === "LITERATURE";
        } else if (notesStore.filter.type === "research") {
          return note.type === "RESEARCH";
        }
        return true;
      });
    }

    // Then apply search filter if active
    if (isSearchActive) {
      // Get search results but ensure they respect the current type filter
      const searchResults =
        notesStore.highlightedNotes.length > 0
          ? notesStore.highlightedNotes.filter((note) => {
              if (notesStore.filter.type === "literature") {
                return note.type === "LITERATURE";
              } else if (notesStore.filter.type === "research") {
                return note.type === "RESEARCH";
              }
              return true;
            })
          : localSearchResults;

      filteredNotes = searchResults;
    } else {
      // Apply literature filter if specified
      if (activeLiteratureFilter) {
        filtered = filtered.filter(
          (note) => note.literatureId === activeLiteratureFilter
        );
      }

      // Sort by date
      filteredNotes = filtered.sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
      );
    }
  });

  // Update search results
  $effect(() => {
    if (searchInput.trim()) {
      localSearchResults = performLocalSearch(
        notesStore.notes,
        searchInput.trim()
      );
      notesStore.setSearchQuery(searchInput.trim());
    } else {
      localSearchResults = [];
      notesStore.setSearchQuery("");
    }
  });

  // Update grouped notes
  $effect(() => {
    groupedNotes = groupNotesByDate(filteredNotes);
  });

  // Group notes by date
  function groupNotesByDate(notes: Note[]): [string, Note[]][] {
    // If search is active, don't group by date
    if (isSearchActive) {
      return [["Search Results", notes]];
    }

    const groups: Record<string, Note[]> = {};

    if (!Array.isArray(notes)) {
      console.warn("Notes is not an array:", notes);
      return [];
    }

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

    // Convert groups object to array of [date, notes] pairs
    return Object.entries(groups).sort((a, b) => {
      // Sort groups by date (most recent first)
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateB.getTime() - dateA.getTime();
    });
  }

  // Perform a quick local search for immediate feedback
  function performLocalSearch(notes: Note[], query: string): Note[] {
    const lowerQuery = query.toLowerCase();

    // First filter by type based on the current filter
    let filteredByType = notes;
    if (notesStore.filter.type !== "all") {
      filteredByType = notes.filter((note) => {
        if (notesStore.filter.type === "literature") {
          return note.type === "LITERATURE";
        } else if (notesStore.filter.type === "research") {
          return note.type === "RESEARCH";
        }
        return true;
      });
    }

    return (
      filteredByType
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

  // Get preview text
  function getPreview(content: string | any) {
    try {
      if (!content) return "";

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

  // Close popover and refocus trigger
  function closeAndFocusTrigger() {
    filterOpen = false;
    tick().then(() => {
      triggerRef?.focus();
    });
  }

  // Handle literature selection
  function handleLiteratureSelect(literature: Literature | undefined) {
    if (literature?.id === activeLiteratureFilter) {
      activeLiteratureFilter = undefined;
    } else {
      activeLiteratureFilter = literature?.id;
    }
    closeAndFocusTrigger();
  }
</script>

<div class="flex flex-col h-full">
  <!-- Search Bar and Literature Filter -->
  <div class="p-4 border-b space-y-2">
    <div class="flex gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes..."
          class="pl-8"
          bind:value={searchInput}
        />
      </div>

      {#if notesStore.filter.type === "literature"}
        <Popover.Root bind:open={filterOpen}>
          <Popover.Trigger bind:ref={triggerRef}>
            <Button
              variant="outline"
              size="icon"
              class="shrink-0"
              role="combobox"
              aria-expanded={filterOpen}
            >
              <Filter class="h-4 w-4" />
            </Button>
          </Popover.Trigger>
          <Portal>
            <Popover.Content class="w-[300px] p-0" align="end">
              <Command.Root>
                <Command.Input
                  placeholder="Search literature..."
                  bind:value={filterSearchValue}
                />
                <Command.List>
                  <Command.Empty>No literature found.</Command.Empty>
                  <Command.Group>
                    {#each filteredLiterature as literature (literature.id)}
                      <Command.Item
                        onSelect={() => handleLiteratureSelect(literature)}
                        class="cursor-pointer"
                      >
                        <div class="flex items-center gap-2">
                          <Book class="h-4 w-4" />
                          <div class="flex flex-col">
                            <span>{literature.name}</span>
                            {#if literature.authors}
                              <span
                                class="text-xs text-muted-foreground truncate"
                              >
                                {literature.authors}
                              </span>
                            {/if}
                          </div>
                          {#if activeLiteratureFilter === literature.id}
                            <span class="ml-auto">✓</span>
                          {/if}
                        </div>
                      </Command.Item>
                    {/each}
                  </Command.Group>
                </Command.List>
              </Command.Root>
            </Popover.Content>
          </Portal>
        </Popover.Root>
      {/if}
    </div>

    <!-- Active Literature Filter Badge -->
    {#if activeLiteratureFilter}
      <div class="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" class="flex items-center gap-1">
              <Book class="h-3 w-3" />
              <span class="truncate max-w-[200px]">
                {getLiteratureTitle(activeLiteratureFilter)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                class="h-4 w-4 ml-1 hover:bg-destructive/10"
                onclick={() => {
                  activeLiteratureFilter = undefined;
                }}
              >
                <X class="h-3 w-3" />
              </Button>
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={5}
            class="max-w-[500px] whitespace-pre-line"
          >
            {getLiteratureDetails(activeLiteratureFilter)}
          </TooltipContent>
        </Tooltip>
      </div>
    {/if}
  </div>

  <!-- Note List -->
  <ScrollArea class="flex-1">
    <div class="p-4 space-y-6">
      {#each groupedNotes as [date, notes]}
        {#if notes.length > 0}
          <div>
            <h3 class="mb-2 px-2 text-sm font-medium text-muted-foreground">
              {date}
            </h3>
            <div class="space-y-2">
              {#each notes as note (note.id)}
                <div
                  class="w-full text-left rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  class:bg-accent={note.id === notesStore.activeNoteId}
                  transition:fade={{ duration: 150 }}
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
                    <div class="flex flex-col gap-2 mt-2">
                      <div class="flex flex-wrap gap-1.5">
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
                        {#if note.literatureId}
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                class="text-xs flex items-center gap-1 badge-literature cursor-pointer hover:bg-accent"
                                onclick={(e) => {
                                  e.stopPropagation();
                                  activeLiteratureFilter =
                                    activeLiteratureFilter === note.literatureId
                                      ? undefined
                                      : note.literatureId;
                                }}
                              >
                                <Book class="h-3 w-3" />
                                <span class="truncate max-w-[120px]">
                                  {getLiteratureTitle(note.literatureId)}
                                </span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              sideOffset={5}
                              class="max-w-[500px] whitespace-pre-line"
                            >
                              {getLiteratureDetails(note.literatureId)}
                            </TooltipContent>
                          </Tooltip>
                        {/if}
                      </div>
                      <span
                        class="text-xs text-muted-foreground flex items-center gap-1"
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
        {/if}
      {/each}

      {#if filteredNotes.length === 0}
        <EmptyState
          title="No notes found"
          description={searchInput ? "Try adjusting your search terms" : undefined}
          variant="search-empty"
          height="py-8"
        />
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

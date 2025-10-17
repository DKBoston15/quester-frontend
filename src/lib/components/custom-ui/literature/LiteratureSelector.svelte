<script lang="ts">
  import { onMount } from "svelte";
  import { tick } from "svelte";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { Check, ChevronsUpDown, X, Book } from "lucide-svelte";
  import { cn } from "$lib/utils";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import type { Literature } from "$lib/types/literature";
  import { Badge } from "$lib/components/ui/badge";
  import { Portal } from "bits-ui";

  // Add type for highlighted literature
  type HighlightedLiterature = Literature & {
    highlightedName: string;
    highlightedAuthors?: string;
  };

  const {
    projectId,
    selectedLiteratureId = undefined,
    onLiteratureSelect,
  } = $props<{
    noteId: string;
    projectId: string;
    selectedLiteratureId?: string;
    onLiteratureSelect: (literatureId: string | undefined) => Promise<void>;
  }>();

  // Local state
  let open = $state(false);
  let searchValue = $state("");
  let selectedLiterature = $state<Literature | undefined>(undefined);
  let triggerRef = $state<HTMLButtonElement>(null!);

  // Filtered literature based on search
  let filteredLiterature = $derived<HighlightedLiterature[]>(
    searchValue
      ? literatureStore.data
          .filter(
            (item) =>
              item.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
              (typeof item.authors === "string"
                ? item.authors.toLowerCase()
                : ""
              ).includes(searchValue.toLowerCase()) ||
              item.doi?.toLowerCase().includes(searchValue.toLowerCase())
          )
          .map((item) => ({
            ...item,
            highlightedName: highlightText(item.name || "", searchValue),
            highlightedAuthors: item.authors
              ? highlightText(String(item.authors), searchValue)
              : undefined,
          }))
      : (literatureStore.data as HighlightedLiterature[])
  );

  // Highlight search terms in text
  function highlightText(text: string, query: string): string {
    if (!query || !text) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  // Load literature data and set initial selection
  onMount(() => {
    void (async () => {
      if (literatureStore.data.length === 0) {
        await literatureStore.loadLiterature(projectId);
      }

      if (selectedLiteratureId) {
        selectedLiterature = literatureStore.data.find(
          (item) => item.id === selectedLiteratureId
        );
      }
    })();
  });

  // Update selected literature when selectedLiteratureId prop changes
  $effect(() => {
    if (selectedLiteratureId) {
      selectedLiterature = literatureStore.data.find(
        (item) => item.id === selectedLiteratureId
      );
    } else {
      selectedLiterature = undefined;
    }
  });

  // Handle literature selection
  async function handleSelect(literature: Literature | undefined) {
    if (literature?.id === selectedLiterature?.id) {
      closeAndFocusTrigger();
      return;
    }

    selectedLiterature = literature;
    closeAndFocusTrigger();
    await onLiteratureSelect(literature?.id);
  }

  // Handle clearing the selection
  async function clearSelection() {
    selectedLiterature = undefined;
    await onLiteratureSelect(undefined);
  }

  // Close popover and refocus trigger
  function closeAndFocusTrigger() {
    open = false;
    tick().then(() => {
      triggerRef?.focus();
    });
  }
</script>

<div class="flex items-center gap-2">
  {#if selectedLiterature}
    <Badge variant="outline" class="flex items-center gap-1 pl-2 pr-1 py-1">
      <Book class="h-3 w-3 mr-1" />
      <span class="truncate max-w-[200px]">{selectedLiterature.name}</span>
      <Button
        variant="ghost"
        size="icon"
        class="h-4 w-4 ml-1 hover:bg-destructive/10"
        onclick={clearSelection}
      >
        <X class="h-3 w-3" />
      </Button>
    </Badge>
  {:else}
    <Popover.Root bind:open>
      <Popover.Trigger bind:ref={triggerRef}>
        <Button
          variant="outline"
          size="sm"
          class="flex justify-between items-center w-[200px]"
          role="combobox"
          aria-expanded={open}
        >
          <span class="truncate text-muted-foreground">
            {selectedLiterature
              ? (selectedLiterature as Literature).name
              : "Link literature..."}
          </span>
          <ChevronsUpDown class="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Content class="w-[300px] p-0 z-[9999]" align="start">
          <Command.Root>
            <Command.Input
              placeholder="Search literature..."
              bind:value={searchValue}
            />
            <Command.List>
              <Command.Empty>No literature found.</Command.Empty>
              <Command.Group>
                {#each filteredLiterature as literature (literature.id)}
                  <Command.Item
                    value={`${literature.name}___${literature.id}`}
                    onSelect={() => handleSelect(literature)}
                    class="cursor-pointer"
                  >
                    <Check
                      class={cn(
                        "mr-2 h-4 w-4",
                        (selectedLiterature as Literature | undefined)?.id ===
                          literature.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div class="flex flex-col">
                      <span>
                        {#if searchValue}
                          {@html literature.highlightedName}
                        {:else}
                          {literature.name}
                        {/if}
                      </span>
                      {#if literature.authors}
                        <span class="text-xs text-muted-foreground truncate">
                          {#if searchValue}
                            {@html literature.highlightedAuthors}
                          {:else}
                            {literature.authors}
                          {/if}
                        </span>
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

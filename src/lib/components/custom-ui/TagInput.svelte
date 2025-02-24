<!-- src/lib/components/custom-ui/TagInput.svelte -->
<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { X } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";

  export let tags: string[] = [];
  export let placeholder = "Add tag...";

  let inputValue = "";
  const dispatch = createEventDispatcher();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    } else if (
      event.key === "Backspace" &&
      inputValue === "" &&
      tags.length > 0
    ) {
      removeTag(tags.length - 1);
    }
  }

  function addTag() {
    const tag = inputValue.trim();
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      tags = newTags;
      dispatch("change", newTags);
    }
    inputValue = "";
  }

  function removeTag(index: number) {
    const newTags = tags.filter((_, i) => i !== index);
    tags = newTags;
    dispatch("change", newTags);
  }
</script>

<div
  class="flex flex-wrap gap-2 p-2 min-h-[42px] rounded-md border border-input bg-background"
>
  {#each tags as tag, index}
    <Badge variant="secondary" class="gap-1">
      {tag}
      <button
        type="button"
        class="rounded-full hover:bg-destructive/20"
        on:click={() => removeTag(index)}
      >
        <X class="h-3 w-3" />
        <span class="sr-only">Remove {tag}</span>
      </button>
    </Badge>
  {/each}
  <Input
    type="text"
    bind:value={inputValue}
    {placeholder}
    onkeydown={handleKeydown}
    class="flex-1 !border-0 focus-visible:ring-0 focus-visible:ring-offset-0 !px-0"
  />
</div>

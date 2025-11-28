<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { X } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import { _ } from "svelte-i18n";

  const dispatch = createEventDispatcher();
  const { tags, placeholder = "" } = $props<{
    tags: string[];
    placeholder?: string;
  }>();

  let localTags = $state<string[]>([...tags]);
  let inputValue = $state("");

  // Keep localTags in sync with props
  $effect(() => {
    localTags = [...tags];
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && inputValue.trim()) {
      event.preventDefault();
      if (!localTags.includes(inputValue.trim())) {
        localTags = [...localTags, inputValue.trim()];
        dispatch("change", { tags: localTags });
      }
      inputValue = "";
    } else if (
      event.key === "Backspace" &&
      !inputValue &&
      localTags.length > 0
    ) {
      localTags = localTags.slice(0, -1);
      dispatch("change", { tags: localTags });
    }
  }

  function removeTag(index: number) {
    localTags = localTags.filter((_, i) => i !== index);
    dispatch("change", { tags: localTags });
  }
</script>

<div
  class="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[40px]"
>
  {#each localTags as tag, index}
    <Badge
      class="flex items-center h-[24px] px-2 gap-1 text-xs font-normal"
      variant="secondary"
    >
      {tag}
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white"
        onclick={() => removeTag(index)}
      >
        <X class="h-3 w-3" />
        <span class="sr-only">{$_('srOnly.removeTag', { values: { tag } })}</span>
      </button>
    </Badge>
  {/each}
  <Input
    type="text"
    {placeholder}
    bind:value={inputValue}
    onkeydown={handleKeydown}
    class="flex-1 !border-none !ring-0 !shadow-none min-w-[120px] h-[24px] !p-0"
  />
</div>

<!-- KeywordInput.svelte -->
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { X } from "lucide-svelte";

  const dispatch = createEventDispatcher<{ submit: string[] }>();

  let keywords = $state<string[]>([]);
  let currentInput = $state("");
  let error = $state("");

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addCurrentKeyword();
    }
  }

  function addCurrentKeyword() {
    const keyword = currentInput.trim();
    if (!keyword) return;

    if (keywords.includes(keyword)) {
      error = "Keyword already added";
      return;
    }

    if (keywords.length >= 10) {
      error = "Maximum 10 keywords allowed";
      return;
    }

    keywords = [...keywords, keyword];
    currentInput = "";
    error = "";
  }

  function removeKeyword(index: number) {
    keywords = keywords.filter((_, i) => i !== index);
    error = "";
  }

  function handleSubmit() {
    if (keywords.length === 0) {
      error = "Please add at least one keyword";
      return;
    }
    dispatch("submit", keywords);
  }
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md">
    {#each keywords as keyword, i}
      <Badge variant="secondary" class="gap-1">
        {keyword}
        <button
          class="ml-1 hover:text-destructive"
          onclick={() => removeKeyword(i)}
          aria-label="Remove keyword"
        >
          <X class="w-3 h-3" />
        </button>
      </Badge>
    {/each}
    <Input
      type="text"
      placeholder="Type a keyword and press Enter..."
      class="border-none !outline-none flex-1 min-w-[200px]"
      bind:value={currentInput}
      onkeydown={handleKeydown}
    />
  </div>

  {#if error}
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  {/if}

  <div class="flex justify-end gap-2">
    <Button
      variant="default"
      disabled={keywords.length === 0}
      onclick={handleSubmit}
    >
      Analyze Keywords
    </Button>
  </div>

  <div class="text-sm text-muted-foreground">
    <p>Tips:</p>
    <ul class="list-disc list-inside">
      <li>Press Enter or comma to add a keyword</li>
      <li>Add up to 10 keywords for best results</li>
      <li>Use specific, research-focused terms</li>
    </ul>
  </div>
</div>

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { X } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

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
      error = t("keywordAnalysis.keywordAlreadyAdded");
      return;
    }

    if (keywords.length >= 7) {
      error = t("keywordAnalysis.maxKeywords");
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
    if (keywords.length < 2) {
      error = t("keywordAnalysis.minKeywords");
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
          aria-label={$_('keywords.removeKeyword')}
        >
          <X class="w-3 h-3" />
        </button>
      </Badge>
    {/each}
    <Input
      type="text"
      placeholder={$_("keywordAnalysis.keywordPlaceholder")}
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
      disabled={keywords.length < 2}
      onclick={handleSubmit}
    >
      {$_("keywordAnalysis.analyzeKeywords")}
    </Button>
  </div>

  <div class="text-sm text-muted-foreground">
    <p>{$_("keywordAnalysis.tips")}</p>
    <ul class="list-disc list-inside">
      <li>{$_("keywordAnalysis.tipPressEnter")}</li>
      <li>{$_("keywordAnalysis.tipMaxKeywords")}</li>
      <li>{$_("keywordAnalysis.tipSpecificTerms")}</li>
    </ul>
  </div>
</div>

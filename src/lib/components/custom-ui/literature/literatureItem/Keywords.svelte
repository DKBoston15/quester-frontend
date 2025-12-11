<script lang="ts">
  import TagInput from "../../TagInput.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import type { Literature } from "$lib/types/literature";
  import { _ } from "svelte-i18n";

  const { literature } = $props<{ literature: Literature }>();
  let keywords = $state<string[]>(
    literature?.keywords ? [...(literature.keywords as string[])] : []
  );

  async function updateKeywords(event: CustomEvent<{ tags: string[] }>) {
    try {
      if (literature?.id) {
        keywords = event.detail.tags;
        await literatureStore.updateLiterature(literature.id, {
          keywords: JSON.stringify(keywords),
        });
      }
    } catch (error) {
      console.error("Error updating keywords:", error);
    }
  }
</script>

<div id="lit-keywords-input">
  <TagInput tags={keywords} placeholder={$_('literatureKeywords.placeholder')} on:change={updateKeywords} />
</div>

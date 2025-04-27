<!-- src/lib/components/custom-ui/literature/literatureItem/Keywords.svelte -->
<script lang="ts">
  import TagInput from "../../TagInput.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import type { Literature } from "$lib/types/literature";

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
  <TagInput tags={keywords} placeholder="Keywords" on:change={updateKeywords} />
</div>

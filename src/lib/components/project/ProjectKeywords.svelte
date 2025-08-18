<script lang="ts">
  import TagInput from "../custom-ui/TagInput.svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import type { Project } from "$lib/types/auth";

  const { project } = $props<{ project: Project }>();
  let keywords = $state<string[]>(
    (() => {
      if (!project.keywords) return [];
      if (typeof project.keywords === "string") {
        try {
          const parsed = JSON.parse(project.keywords);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(project.keywords) ? project.keywords : [];
    })()
  );

  async function updateKeywords(event: CustomEvent<{ tags: string[] }>) {
    try {
      if (project?.id) {
        const newKeywords = event.detail.tags;
        keywords = newKeywords;
        await projectStore.updateProject(project.id, {
          keywords: newKeywords,
        });
      }
    } catch (error) {
      console.error("Error updating keywords:", error);
    }
  }
</script>

<TagInput tags={keywords} placeholder="Keywords" on:change={updateKeywords} />

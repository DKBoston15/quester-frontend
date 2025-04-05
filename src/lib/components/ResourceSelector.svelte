<!-- src/routes/components/ResourceSelector.svelte -->
<script lang="ts">
  import type { Organization, Department, Project } from "$lib/types/auth";

  type ResourceType = "organization" | "department" | "project";

  const props = $props<{
    resources: {
      organizations?: Organization[];
      departments?: Department[];
      projects?: Project[];
    };
    selectedType: ResourceType;
    selectedId: string | null;
    onSelect: (type: ResourceType, id: string) => void;
  }>();

  let selectedItem = $derived(`${props.selectedType}:${props.selectedId}`);

  function handleSelectionChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const [type, id] = value.split(":");
    if (type && id) {
      props.onSelect(type as ResourceType, id);
    }
  }
</script>

<div class="space-y-4">
  <p class="text-sm text-muted-foreground mb-2">
    Select which team you want to manage:
  </p>

  <div class="relative">
    <select
      value={selectedItem}
      onchange={handleSelectionChange}
      class="w-full rounded-md border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2"
    >
      <option value="" disabled>Select a resource</option>

      {#if props.resources.organizations?.length}
        <optgroup label="Organizations">
          {#each props.resources.organizations as org}
            <option
              value={`organization:${org.id}`}
              class="whitespace-normal min-w-full">{org.name}</option
            >
          {/each}
        </optgroup>
      {/if}

      {#if props.resources.departments?.length}
        <optgroup label="Departments">
          {#each props.resources.departments as dept}
            <option
              value={`department:${dept.id}`}
              class="whitespace-normal min-w-full">{dept.name}</option
            >
          {/each}
        </optgroup>
      {/if}

      {#if props.resources.projects?.length}
        <optgroup label="Projects">
          {#each props.resources.projects as project}
            <option
              value={`project:${project.id}`}
              class="whitespace-normal min-w-full">{project.name}</option
            >
          {/each}
        </optgroup>
      {/if}
    </select>
  </div>
</div>

<style>
  select option {
    width: 100%;
    min-width: 100%;
    padding-right: 1rem;
  }

  select optgroup {
    max-width: none;
  }
</style>

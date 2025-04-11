<!-- src/routes/components/ResourceSelector.svelte -->
<script lang="ts">
  import type { Organization, Department, Project } from "$lib/types/auth";
  import { tick } from "svelte";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import Check from "@lucide/svelte/icons/check";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";

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

  let open = $state(false);
  let selectedValue = $state<string | null>(
    props.selectedId ? `${props.selectedType}:${props.selectedId}` : null
  );
  let triggerRef = $state<HTMLButtonElement>(null!);

  // Helper function to compute the flat list of resources
  function computeAllResources(resources: typeof props.resources) {
    const items: {
      value: string;
      label: string;
      group: string;
      type: ResourceType;
      id: string;
    }[] = [];
    if (resources.organizations) {
      items.push(
        ...resources.organizations.map((org: Organization) => ({
          value: `organization:${org.id}`,
          label: org.name,
          group: "Organizations",
          type: "organization",
          id: org.id,
        }))
      );
    }
    if (resources.departments) {
      items.push(
        ...resources.departments.map((dept: Department) => ({
          value: `department:${dept.id}`,
          label: dept.name,
          group: "Departments",
          type: "department",
          id: dept.id,
        }))
      );
    }
    if (resources.projects) {
      items.push(
        ...resources.projects.map((proj: Project) => ({
          value: `project:${proj.id}`,
          label: proj.name,
          group: "Projects",
          type: "project",
          id: proj.id,
        }))
      );
    }
    return items;
  }

  const groupedResources = $derived(() => {
    const all = computeAllResources(props.resources); // Call helper function
    const groups: Record<
      string,
      { value: string; label: string; type: ResourceType; id: string }[]
    > = {};
    for (const item of all) {
      // Iterate over the computed array
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push({
        value: item.value,
        label: item.label,
        type: item.type,
        id: item.id,
      });
    }
    return Object.entries(groups);
  });

  const selectedLabel = $derived(() => {
    const all = computeAllResources(props.resources); // Call helper function
    return (
      all.find((r) => r.value === selectedValue)?.label ?? // Find on the computed array
      "Select a resource..."
    );
  });

  // Custom filter function for Command
  function filterResources(value: string, search: string): number {
    const all = computeAllResources(props.resources);
    const item = all.find((r) => r.value === value);
    if (!item) return 0;
    // Perform case-insensitive search on the label
    return item.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
  }

  // Sync internal state if props change externally
  $effect(() => {
    const externalValue = props.selectedId
      ? `${props.selectedType}:${props.selectedId}`
      : null;
    if (externalValue !== selectedValue) {
      selectedValue = externalValue;
    }
  });

  function closeAndFocusTrigger() {
    open = false;
    tick().then(() => {
      triggerRef?.focus(); // Use optional chaining in case ref is not yet set
    });
  }
</script>

<div class="space-y-4">
  <p class="text-sm text-muted-foreground mb-1">
    Select which team you want to manage:
  </p>

  <Popover.Root bind:open>
    <Popover.Trigger bind:ref={triggerRef} class="w-full">
      {#snippet child({ props: popoverProps })}
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          class="w-full flex items-center justify-start text-left border-2 dark:border-dark-border bg-card dark:bg-dark-card py-2 px-3"
          {...popoverProps}
        >
          <span class="truncate flex-1 text-left">{selectedLabel()}</span>
          <ChevronsUpDown class="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="w-full md:min-w-[40rem] p-0"
      align="start"
      sideOffset={4}
    >
      <Command.Root filter={filterResources}>
        <Command.Input placeholder="Search resource..." />
        <Command.List class="max-h-[300px] overflow-auto">
          <Command.Empty>No resource found.</Command.Empty>
          {#each groupedResources() as [groupName, items]}
            <Command.Group heading={groupName}>
              {#each items as item}
                <Command.Item
                  value={item.value}
                  class="text-left"
                  onSelect={() => {
                    selectedValue = item.value;
                    props.onSelect(item.type, item.id);
                    closeAndFocusTrigger();
                  }}
                >
                  <Check
                    class={cn(
                      "mr-2 size-4",
                      selectedValue !== item.value && "text-transparent"
                    )}
                  />
                  <span class="truncate">{item.label}</span>
                </Command.Item>
              {/each}
            </Command.Group>
          {/each}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
</div>

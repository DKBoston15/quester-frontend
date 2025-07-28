<!-- src/routes/components/ResourceSelector.svelte -->
<script lang="ts">
  import type { Organization, Department, Project } from "$lib/types/auth";
  import { tick } from "svelte";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { cn } from "$lib/utils.js";
  import Check from "@lucide/svelte/icons/check";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import { Building, FolderKanban, Folder } from "lucide-svelte";

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

  // Helper function to get icon for resource type
  function getResourceIcon(type: ResourceType) {
    switch (type) {
      case "organization": return Building;
      case "department": return FolderKanban;
      case "project": return Folder;
      default: return Building;
    }
  }

  // Helper function to get hierarchy breadcrumb
  function getHierarchyBreadcrumb(item: any, type: ResourceType): string {
    // For now, return basic info - could be enhanced with parent relationships
    switch (type) {
      case "organization": return "Organization";
      case "department": return item.organizationName ? `${item.organizationName} › Department` : "Department";
      case "project": return item.organizationName && item.departmentName ? 
        `${item.organizationName} › ${item.departmentName} › Project` : "Project";
      default: return "Resource";
    }
  }

  // Helper function to compute the flat list of resources
  function computeAllResources(resources: typeof props.resources) {
    const items: {
      value: string;
      label: string;
      group: string;
      type: ResourceType;
      id: string;
      hierarchy: string;
      icon: any;
    }[] = [];
    if (resources.organizations) {
      items.push(
        ...resources.organizations.map((org: Organization) => ({
          value: `organization:${org.id}`,
          label: org.name,
          group: "Organizations",
          type: "organization" as ResourceType,
          id: org.id,
          hierarchy: getHierarchyBreadcrumb(org, "organization"),
          icon: Building,
        }))
      );
    }
    if (resources.departments) {
      items.push(
        ...resources.departments.map((dept: Department) => ({
          value: `department:${dept.id}`,
          label: dept.name,
          group: "Departments",
          type: "department" as ResourceType,
          id: dept.id,
          hierarchy: getHierarchyBreadcrumb(dept, "department"),
          icon: FolderKanban,
        }))
      );
    }
    if (resources.projects) {
      items.push(
        ...resources.projects.map((proj: Project) => ({
          value: `project:${proj.id}`,
          label: proj.name,
          group: "Projects",
          type: "project" as ResourceType,
          id: proj.id,
          hierarchy: getHierarchyBreadcrumb(proj, "project"),
          icon: Folder,
        }))
      );
    }
    return items;
  }

  const groupedResources = $derived(() => {
    const all = computeAllResources(props.resources); // Call helper function
    const groups: Record<
      string,
      { value: string; label: string; type: ResourceType; id: string; hierarchy: string; icon: any }[]
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
        hierarchy: item.hierarchy,
        icon: item.icon,
      });
    }
    return Object.entries(groups);
  });

  const selectedResource = $derived(() => {
    const all = computeAllResources(props.resources); // Call helper function
    return all.find((r) => r.value === selectedValue);
  });

  const selectedLabel = $derived(() => {
    return selectedResource()?.label ?? "Select a resource...";
  });

  const selectedIcon = $derived(() => {
    return selectedResource()?.icon ?? Building;
  });

  const selectedHierarchy = $derived(() => {
    return selectedResource()?.hierarchy ?? "";
  });

  // Custom filter function for Command
  function filterResources(value: string, search: string): number {
    const all = computeAllResources(props.resources);
    const item = all.find((r) => r.value === value);
    if (!item) return 0;
    // Perform case-insensitive search on the label
    return item.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
  }

  // Sync internal state if props change externally (with guard to prevent loops)
  let lastSyncedPropsValue = $state<string | null>(null);
  $effect(() => {
    const externalValue = props.selectedId
      ? `${props.selectedType}:${props.selectedId}`
      : null;
    
    // Only update if external value changed and it's different from our internal state
    if (externalValue !== lastSyncedPropsValue && externalValue !== selectedValue) {
      lastSyncedPropsValue = externalValue;
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
  <div class="flex items-center gap-2">
    <p class="text-sm text-muted-foreground">
      Select which team you want to manage:
    </p>
    <Badge variant="outline" class="text-xs">
      {props.resources.organizations?.length || 0} orgs,
      {props.resources.departments?.length || 0} depts,
      {props.resources.projects?.length || 0} projects
    </Badge>
  </div>

  <Popover.Root bind:open>
    <Popover.Trigger bind:ref={triggerRef} class="w-full">
      {#snippet child({ props: popoverProps })}
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          class="w-full flex items-center justify-start text-left py-3 px-4 h-auto"
          {...popoverProps}
        >
          <div class="flex items-center gap-2 flex-1">
            {#if selectedResource()}
              <svelte:component this={selectedIcon()} class="h-4 w-4 text-muted-foreground" />
              <div class="flex flex-col items-start">
                <span class="font-medium">{selectedLabel()}</span>
                <span class="text-xs text-muted-foreground">{selectedHierarchy()}</span>
              </div>
            {:else}
              <Building class="h-4 w-4 text-muted-foreground" />
              <span class="text-muted-foreground">Select organization, department, or project...</span>
            {/if}
          </div>
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
        <Command.Input placeholder="Search organizations, departments, or projects..." />
        <Command.List class="max-h-[300px] overflow-auto">
          <Command.Empty>
            <div class="flex flex-col items-center gap-2 py-6">
              <Building class="h-8 w-8 text-muted-foreground" />
              <p class="text-sm text-muted-foreground">No resources found</p>
              <p class="text-xs text-muted-foreground">Try adjusting your search terms</p>
            </div>
          </Command.Empty>
          {#each groupedResources() as [groupName, items]}
            <Command.Group heading={groupName}>
              {#each items as item}
                <Command.Item
                  value={item.value}
                  class="text-left flex items-center gap-2 py-3"
                  onSelect={() => {
                    selectedValue = item.value;
                    lastSyncedPropsValue = item.value; // Update sync tracker
                    props.onSelect(item.type, item.id);
                    closeAndFocusTrigger();
                  }}
                >
                  <Check
                    class={cn(
                      "size-4",
                      selectedValue !== item.value && "text-transparent"
                    )}
                  />
                  <svelte:component this={item.icon} class="h-4 w-4 text-muted-foreground" />
                  <div class="flex flex-col flex-1">
                    <span class="font-medium">{item.label}</span>
                    <span class="text-xs text-muted-foreground">{item.hierarchy}</span>
                  </div>
                </Command.Item>
              {/each}
            </Command.Group>
          {/each}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
</div>

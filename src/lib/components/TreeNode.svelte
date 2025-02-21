<!-- TreeNode.svelte -->
<script lang="ts">
  import {
    ChevronRight,
    Plus,
    Building2,
    FolderKanban,
    FileText,
  } from "lucide-svelte";
  import type { Organization, Department, Project } from "$lib/types/auth";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { navigate } from "svelte-routing";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import Self from "./TreeNode.svelte";

  const props = $props<{
    item: Organization | Department | Project;
    level?: number;
    expanded?: boolean;
    parentOrg?: Organization | null;
    onSelect?: (item: Organization | Department | Project) => void;
  }>();

  let departments = $state<Department[]>([]);
  let projects = $state<Project[]>([]);
  let isLoading = $state(false);
  let isExpanded = $state(props.expanded || true);
  let showNewProjectForm = $state(false);
  let newProjectName = $state("");
  let prevItemId = $state<string | null>(null);

  $effect(() => {
    if (!props.item) return;

    const itemId = props.item.id;
    if (itemId === prevItemId) return;

    prevItemId = itemId;
    departments = [];
    projects = [];
    isLoading = false;

    if (isExpanded) {
      loadChildren();
    }
  });

  function isOrganization(item: any): item is Organization {
    return "slug" in item;
  }

  function isDepartment(item: any): item is Department {
    return "organizationId" in item && !("projectRoles" in item);
  }

  function handleProjectClick(project: Project) {
    const org =
      props.parentOrg || (isOrganization(props.item) ? props.item : null);
    if (!org) return;

    const projectSlug = project.name.toLowerCase().replace(/\s+/g, "-");
    navigate(`/org/${org.slug}/project/${projectSlug}`);
  }

  async function createProject(e: Event) {
    e.preventDefault();
    if (!newProjectName || !auth.user) return;

    const org =
      props.parentOrg || (isOrganization(props.item) ? props.item : null);
    if (!org) return;

    try {
      const response = await fetch(
        "http://localhost:3333/projects/createProjectWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newProjectName,
            organizationId: org.id,
            departmentId: isDepartment(props.item) ? props.item.id : null,
            userId: auth.user.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create project");

      const data = await response.json();
      newProjectName = "";
      showNewProjectForm = false;

      // Refresh the projects list
      await loadChildren();

      // Navigate to the new project
      const projectSlug = data.project.name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/org/${org.slug}/project/${projectSlug}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  }

  async function loadChildren() {
    if (!props.item || isLoading || !auth.user) return;
    isLoading = true;

    try {
      if (isOrganization(props.item)) {
        // Load departments for this organization
        const deptResponse = await fetch(
          `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
          { credentials: "include" }
        );
        const deptData = await deptResponse.json();
        departments = deptData.data.filter(
          (d: Department) => d.organizationId === props.item.id
        );

        // Load projects directly under organization (no department)
        const projectsResponse = await fetch(
          `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
          { credentials: "include" }
        );
        const projectsData = await projectsResponse.json();
        projects = projectsData.data.filter(
          (p: Project) => p.organizationId === props.item.id && !p.departmentId
        );
      } else if (isDepartment(props.item)) {
        // Load only projects that belong to this department
        const projectsResponse = await fetch(
          `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
          { credentials: "include" }
        );
        const projectsData = await projectsResponse.json();
        projects = projectsData.data.filter(
          (p: Project) => p.departmentId === props.item.id
        );
      }
    } catch (error) {
      console.error("Failed to load children:", error);
    } finally {
      isLoading = false;
    }
  }

  function toggleExpand(event: MouseEvent) {
    event.stopPropagation();
    isExpanded = !isExpanded;
    if (isExpanded && departments.length === 0 && projects.length === 0) {
      loadChildren();
    }
  }

  function toggleNewProjectForm(event: MouseEvent) {
    event.stopPropagation();
    showNewProjectForm = !showNewProjectForm;
  }

  function handleSelect() {
    if (props.onSelect) {
      props.onSelect(props.item);
    }
  }
</script>

<div
  role="button"
  tabindex="0"
  class={props.level === 0 ? "" : props.level === 1 ? "pl-6" : "pl-12"}
  onclick={handleSelect}
  onkeydown={handleSelect}
>
  <div
    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer group transition-colors"
  >
    <div class="flex items-center gap-2 flex-1">
      {#if isOrganization(props.item) || isDepartment(props.item)}
        <button
          class="p-1 hover:bg-accent hover:text-accent-foreground rounded-full transform transition-transform opacity-0 group-hover:opacity-100"
          class:rotate-90={isExpanded}
          class:opacity-100={isExpanded}
          onclick={toggleExpand}
          type="button"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      {:else}
        <div class="w-[32px]"></div>
      {/if}

      <span class="font-mono flex items-center gap-2">
        {#if isOrganization(props.item)}
          <Building2 class="h-4 w-4" />
        {:else if isDepartment(props.item)}
          <FolderKanban class="h-4 w-4" />
        {:else}
          <FileText class="h-4 w-4" />
        {/if}
        {props.item.name}
      </span>

      {#if isOrganization(props.item) || isDepartment(props.item)}
        <button
          class="p-1 hover:bg-accent hover:text-accent-foreground rounded-full opacity-0 group-hover:opacity-100 ml-2"
          onclick={toggleNewProjectForm}
          type="button"
        >
          <Plus class="h-4 w-4" />
        </button>
      {/if}
    </div>
  </div>

  {#if showNewProjectForm}
    <div class="pl-9 pt-2">
      <form onsubmit={createProject} class="flex gap-2">
        <Input
          type="text"
          placeholder="New project name"
          bind:value={newProjectName}
          required
          class="text-sm"
        />
        <Button type="submit" size="sm">Create</Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => (showNewProjectForm = false)}
        >
          Cancel
        </Button>
      </form>
    </div>
  {/if}

  {#if isExpanded}
    {#if isLoading}
      <div class="pl-9 text-sm text-muted-foreground">Loading...</div>
    {:else}
      {#if departments.length > 0}
        {#each departments as department}
          <Self
            item={department}
            level={props.level + 1}
            parentOrg={isOrganization(props.item)
              ? props.item
              : props.parentOrg}
            onSelect={props.onSelect}
          />
        {/each}
      {/if}

      {#if projects.length > 0}
        <div class="pl-9">
          {#each projects as project}
            <div
              role="button"
              tabindex="0"
              class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer transition-colors"
              onclick={() => handleProjectClick(project)}
              onkeydown={() => handleProjectClick(project)}
            >
              <div class="w-[32px]"></div>
              <span class="font-mono flex items-center gap-2">
                <FileText class="h-4 w-4" />
                {project.name}
              </span>
            </div>
          {/each}
        </div>
      {/if}

      {#if departments.length === 0 && projects.length === 0}
        <div class="pl-9 text-sm text-muted-foreground">No items</div>
      {/if}
    {/if}
  {/if}
</div>

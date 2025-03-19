<!-- TreeNode.svelte -->
<script lang="ts">
  import {
    ChevronRight,
    Plus,
    Building2,
    FolderKanban,
    FileText,
    UserPlus,
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
  let isJoining = $state<Record<string, boolean>>({});
  let joinError = $state<Record<string, string>>({});
  let isExpanded = $state(props.expanded || true);
  let showNewProjectForm = $state(false);
  let newProjectName = $state("");
  let prevItemId = $state<string | null>(null);
  let canCreateProject = $state(false);

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
      checkSubscription();
    }
  });

  async function checkSubscription() {
    const org =
      props.parentOrg || (isOrganization(props.item) ? props.item : null);
    if (!org) return;

    try {
      const subscription = org.subscription;
      if (!subscription) {
        canCreateProject = false;
        return;
      }

      const projectCount = projects.length;
      // If there's no project limit or we're under the limit, allow project creation
      canCreateProject =
        subscription.status === "active" &&
        (!subscription.seatsCount || projectCount < subscription.seatsCount);
    } catch (error) {
      console.error("Failed to check subscription:", error);
      canCreateProject = false;
    }
  }

  function isOrganization(item: any): item is Organization {
    return "slug" in item;
  }

  function isDepartment(item: any): item is Department {
    return "organizationId" in item && !("projectRoles" in item);
  }

  // Check if the current user is a direct member of the project
  function isUserDirectMember(project: Project): boolean {
    if (!auth.user) return false;

    // If the project has a projectRoles array with an entry for this user, they're a direct member
    if (project.projectRoles && Array.isArray(project.projectRoles)) {
      return project.projectRoles.some(
        (role: any) => role.userId === auth.user?.id
      );
    }

    // Fallback: check if user is in the users array
    if (project.users && Array.isArray(project.users)) {
      return project.users.some((user: any) => user.id === auth.user?.id);
    }

    return false;
  }

  function handleProjectClick(project: Project) {
    navigate(`/project/${project.id}`);
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

      // Navigate to the new project using its ID
      navigate(`/project/${data.project.id}`);
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

        // Load all projects the user has access to (including through org admin role)
        const projectsResponse = await fetch(
          `http://localhost:3333/team-management/resources`,
          { credentials: "include" }
        );

        const teamManagementData = await projectsResponse.json();
        console.log(
          "TreeNode - Team Management Resources:",
          teamManagementData
        );

        // Get all projects from the organization, regardless of department
        // (we'll filter department-specific projects out later)
        if (teamManagementData.projects?.length > 0) {
          projects = teamManagementData.projects.filter(
            (p: Project) =>
              p.organizationId === props.item.id && !p.departmentId // Only include projects not in a department here
          );
          console.log("TreeNode - Projects for organization:", projects);
        } else {
          // Fallback to the old method if team management API doesn't return projects
          const oldProjectsResponse = await fetch(
            `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
            { credentials: "include" }
          );
          const projectsData = await oldProjectsResponse.json();
          projects = projectsData.data.filter(
            (p: Project) =>
              p.organizationId === props.item.id && !p.departmentId
          );
        }
      } else if (isDepartment(props.item)) {
        // For departments, use the team management API first
        try {
          const teamManagementResponse = await fetch(
            `http://localhost:3333/team-management/resources`,
            { credentials: "include" }
          );

          const teamManagementData = await teamManagementResponse.json();

          // Filter projects for this specific department
          if (teamManagementData.projects?.length > 0) {
            projects = teamManagementData.projects.filter(
              (p: Project) => p.departmentId === props.item.id
            );
            console.log("TreeNode - Projects for department:", projects);
          } else {
            throw new Error("No projects in team management data"); // Trigger fallback
          }
        } catch (error) {
          console.log(
            "Falling back to projects/by-user for department projects"
          );
          // Fallback to direct project loading
          const projectsResponse = await fetch(
            `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
            { credentials: "include" }
          );
          const projectsData = await projectsResponse.json();
          projects = projectsData.data.filter(
            (p: Project) => p.departmentId === props.item.id
          );
        }
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

  async function joinProject(event: MouseEvent, project: Project) {
    event.stopPropagation();

    if (!auth.user) return;
    if (isUserDirectMember(project)) return;

    // Set the loading state for this specific project
    isJoining = { ...isJoining, [project.id]: true };
    joinError = { ...joinError, [project.id]: "" };

    try {
      const response = await fetch(
        `http://localhost:3333/team-management/project/${project.id}/self-assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ roleId: "member" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to join project");
      }

      console.log(`Successfully joined project: ${project.name}`);

      // Refresh the child data
      await loadChildren();
    } catch (error) {
      console.error("Error joining project:", error);
      joinError = {
        ...joinError,
        [project.id]: error instanceof Error ? error.message : "Failed to join",
      };
    } finally {
      isJoining = { ...isJoining, [project.id]: false };
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

      <span class=" flex items-center gap-2">
        {#if isOrganization(props.item)}
          <Building2 class="h-4 w-4" />
        {:else if isDepartment(props.item)}
          <FolderKanban class="h-4 w-4" />
        {:else}
          <FileText class="h-4 w-4" />
        {/if}
        {props.item.name}
      </span>

      {#if (isOrganization(props.item) || isDepartment(props.item)) && canCreateProject}
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
              class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer transition-colors group"
              onclick={() => handleProjectClick(project)}
              onkeydown={() => handleProjectClick(project)}
            >
              <div class="w-[32px]"></div>
              <span class="flex items-center gap-2 flex-1">
                <FileText class="h-4 w-4" />
                {project.name}
                {#if !isUserDirectMember(project)}
                  <span
                    class="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground"
                  >
                    admin access
                  </span>
                {/if}
              </span>

              {#if !isUserDirectMember(project)}
                <button
                  class="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-1 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1"
                  onclick={(e) => joinProject(e, project)}
                  disabled={isJoining[project.id]}
                >
                  {#if isJoining[project.id]}
                    <div
                      class="h-3 w-3 border-t-2 border-primary animate-spin rounded-full"
                    ></div>
                    Joining...
                  {:else}
                    <UserPlus class="h-3 w-3" />
                    Join
                  {/if}
                </button>
              {/if}
            </div>
            {#if joinError[project.id]}
              <div class="pl-9 text-xs text-red-500 mt-1">
                {joinError[project.id]}
              </div>
            {/if}
          {/each}
        </div>
      {/if}

      {#if departments.length === 0 && projects.length === 0}
        <div class="pl-9 text-sm text-muted-foreground">No items</div>
      {/if}
    {/if}
  {/if}
</div>

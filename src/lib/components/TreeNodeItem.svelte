<!-- src/lib/components/TreeNodeItem.svelte -->
<script lang="ts">
  import {
    ChevronRight,
    Plus,
    FileText,
    UserPlus,
    FolderKanban,
    MoreVertical,
    FolderInput,
  } from "lucide-svelte";
  import type { Department, Project } from "$lib/types/auth";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { navigate } from "svelte-routing";
  import { API_BASE_URL } from "$lib/config";

  // Props
  const props = $props<{
    item: Department | Project;
    depth: number;
    isUserMember: boolean;
    onNewProject?: () => void;
    onJoinDepartment?: () => void;
    onMoveProject?: (project: Project) => void;
    filteredProjects?: Project[];
    isFiltering?: boolean;
  }>();

  // Component state
  let isExpanded = $state(false);
  let projects = $state<Project[]>([]);
  let isLoading = $state(false);

  // Load projects when department is expanded
  $effect(() => {
    if (isExpanded && isDepartment(props.item)) {
      if (props.isFiltering && props.filteredProjects) {
        // Use the filtered projects passed from parent
        projects = props.filteredProjects;
        isLoading = false;
      } else {
        loadProjects(props.item.id);
      }
    }
  });

  // Auto-expand departments when filtering is active
  $effect(() => {
    if (
      props.isFiltering &&
      props.filteredProjects &&
      props.filteredProjects.length > 0
    ) {
      isExpanded = true;
    }
  });

  // Type guards
  function isDepartment(item: Department | Project): item is Department {
    return "departmentRoles" in item;
  }

  function isProject(item: Department | Project): item is Project {
    return "projectRoles" in item;
  }

  // Check if the user is an admin of the department
  function isUserDepartmentAdmin(department: Department): boolean {
    if (!auth.user) return false;

    // Check department roles
    if (
      department.departmentRoles &&
      Array.isArray(department.departmentRoles)
    ) {
      return department.departmentRoles.some((role) => {
        // Use string comparison for user IDs
        const isUserRole = role.userId.toString() === auth.user?.id.toString();
        // Check if role is admin or owner
        const isAdminRole =
          role.roleId === "7dcb0af2-2338-4c03-a797-955925405f90" || // owner
          role.roleId === "8f3352ae-3144-473b-a795-059ea1fcc910"; // admin
        return isUserRole && isAdminRole;
      });
    }

    return false;
  }

  // Load projects for a department
  async function loadProjects(departmentId: string) {
    if (!auth.user) return;

    isLoading = true;

    const isDeptAdmin =
      isDepartment(props.item) && isUserDepartmentAdmin(props.item);

    try {
      // Always use the dedicated endpoint for by-department which handles permissions correctly
      const projectsResponse = await fetch(
        `${API_BASE_URL}/projects/by-department?departmentId=${departmentId}`,
        { credentials: "include" }
      );

      if (projectsResponse.ok) {
        const data = await projectsResponse.json();
        // Extract the projects array from the paginated response
        projects = data.data || [];
        return;
      } else {
        // If the request fails, log the status
        console.error(
          `Failed to load projects for department. Status: ${projectsResponse.status}`
        );

        // Fall back to filtering projects from team-management resources
        const resourcesResponse = await fetch(
          `${API_BASE_URL}/team-management/resources`,
          { credentials: "include" }
        );

        if (resourcesResponse.ok) {
          const data = await resourcesResponse.json();

          if (data.projects) {
            // Filter projects by department ID client-side
            const filteredProjects = data.projects.filter(
              (p: Project) => p.departmentId === departmentId
            );
            projects = filteredProjects;
          }
        } else {
          projects = [];
        }
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      projects = [];
    } finally {
      isLoading = false;
    }
  }

  // Check if user is a member of a project
  function isUserProjectMember(project: Project): boolean {
    if (!auth.user) return false;

    // Check project roles
    if (project.projectRoles && Array.isArray(project.projectRoles)) {
      return project.projectRoles.some((role) => {
        // Use string comparison for user IDs
        return role.userId.toString() === auth.user?.id.toString();
      });
    }

    // Check users array as fallback
    if (project.users && Array.isArray(project.users)) {
      return project.users.some(
        (user) => user.id.toString() === auth.user?.id.toString()
      );
    }

    return false;
  }

  // Toggle expanded state for departments
  function toggleExpanded(e: MouseEvent) {
    if (isDepartment(props.item)) {
      e.stopPropagation();
      isExpanded = !isExpanded;
    }
  }

  // Handle click on a project item
  function handleProjectClick(project: Project, e: MouseEvent) {
    e.stopPropagation();

    if (isUserProjectMember(project)) {
      navigate(`/project/${project.id}`);
    }
  }

  // Join a project (self-assign)
  async function joinProject(project: Project, e: MouseEvent) {
    if (!auth.user) return;

    e.stopPropagation();

    try {
      const response = await fetch(
        `${API_BASE_URL}/team-management/project/${project.id}/self-assign`,
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

      // Refresh projects if in a department
      if (isDepartment(props.item)) {
        loadProjects(props.item.id);
      }
    } catch (error) {
      console.error("Error joining project:", error);
    }
  }
</script>

{#if isDepartment(props.item)}
  <!-- Department Item -->
  <div
    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer ml-2 my-1 transition-colors"
    onclick={toggleExpanded}
    role="button"
    tabindex="0"
  >
    <div class="flex-shrink-0 text-amber-500">
      <ChevronRight
        class="h-4 w-4 transition-transform {isExpanded ? 'rotate-90' : ''}"
      />
    </div>

    <FolderKanban class="h-4 w-4 text-amber-500" />
    <span class="font-medium">{props.item.name}</span>

    <div class="ml-auto flex gap-2">
      {#if !props.isUserMember}
        <Button
          variant="outline"
          size="sm"
          class="flex items-center gap-1"
          onclick={(e: MouseEvent) => {
            e.stopPropagation();
            if (props.onJoinDepartment) props.onJoinDepartment();
          }}
        >
          <UserPlus class="h-3 w-3" />
          Join
        </Button>
      {:else}
        <Badge variant="outline" class="bg-primary/10 text-primary"
          >Member</Badge
        >
      {/if}

      <Button
        variant="outline"
        size="sm"
        class="flex items-center gap-1"
        onclick={(e: MouseEvent) => {
          e.stopPropagation();
          if (props.onNewProject) props.onNewProject();
        }}
      >
        <Plus class="h-4 w-4" />
        New Project
      </Button>
    </div>
  </div>

  <!-- Projects in Department (when expanded) -->
  {#if isExpanded}
    <div class="ml-6 border-l pl-4">
      {#if isLoading}
        <div class="flex items-center justify-center p-4">
          <div
            class="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
      {:else if projects.length === 0}
        <div class="text-sm text-muted-foreground py-2 px-4">
          No projects in this department
        </div>
      {:else}
        {#each projects as project}
          <div
            class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer my-1 transition-colors"
            onclick={(e: MouseEvent) => {
              handleProjectClick(project, e);
            }}
          >
            <FileText class="h-4 w-4 text-primary" />
            <span>{project.name}</span>

            <div class="ml-auto flex gap-2">
              {#if !isUserProjectMember(project)}
                <Button
                  variant="outline"
                  size="sm"
                  class="flex items-center gap-1"
                  onclick={(e: MouseEvent) => joinProject(project, e)}
                >
                  <UserPlus class="h-3 w-3" />
                  Join
                </Button>
              {:else}
                <Badge variant="outline" class="bg-primary/10 text-primary"
                  >Member</Badge
                >
              {/if}

              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={(e: MouseEvent) => e.stopPropagation()}
                  >
                    <MoreVertical class="h-4 w-4" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Label>Actions</DropdownMenu.Label>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      if (props.onMoveProject) props.onMoveProject(project);
                    }}
                  >
                    <FolderInput class="h-4 w-4 mr-2" />
                    Move to Department
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
{:else if isProject(props.item)}
  <!-- Project Item (direct, outside a department) -->
  <button
    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer ml-2 my-1 transition-colors"
    onclick={(e: MouseEvent) => handleProjectClick(props.item, e)}
    role="button"
    tabindex="0"
  >
    <FileText class="h-4 w-4 text-primary" />
    <span>{props.item.name}</span>

    <div class="ml-auto flex gap-2">
      {#if !props.isUserMember}
        <Button
          variant="outline"
          size="sm"
          class="flex items-center gap-1"
          onclick={(e: MouseEvent) => joinProject(props.item, e)}
        >
          <UserPlus class="h-3 w-3" />
          Join
        </Button>
      {:else}
        <Badge variant="outline" class="bg-primary/10 text-primary"
          >Member</Badge
        >
      {/if}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button
            variant="ghost"
            size="icon"
            onclick={(e: MouseEvent) => e.stopPropagation()}
          >
            <MoreVertical class="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              if (props.onMoveProject) props.onMoveProject(props.item);
            }}
          >
            <FolderInput class="h-4 w-4 mr-2" />
            Move to Department
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </button>
{/if}

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
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { navigate } from "svelte-routing";
  import { API_BASE_URL } from "$lib/config";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";

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
  let showDeleteConfirmDialog = $state(false);

  // Auto-expand departments when filtering is active and has results
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

  // Helper function to check if user *might* have delete permissions (client-side check)
  // Actual permission is enforced by the backend.
  function canPotentiallyDeleteDepartment(department: Department): boolean {
    if (!auth.user || !teamManagement.userResources) return false;

    // Check if user is Department Owner
    const deptResource = teamManagement.userResources.departments?.find(
      (d: any) => d.id === department.id
    );
    if (deptResource?.$extras?.roleName === "Owner") {
      return true;
    }

    // Check if user is Org Admin or Org Owner
    const orgResource = teamManagement.userResources.organizations?.find(
      (o: any) => o.id === department.organizationId
    );
    if (
      orgResource?.$extras?.roleName === "Admin" ||
      orgResource?.$extras?.roleName === "Owner"
    ) {
      return true;
    }

    return false;
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

  // Helper function to get user's role for the current item
  function getUserRoleNameForCurrentItem(): string {
    if (!auth.user) return "Unknown";
    const resources = teamManagement.userResources;
    if (!resources) return "Unknown";

    let resourceList;
    let itemType: "organization" | "department" | "project";

    if (isDepartment(props.item)) {
      resourceList = resources.departments;
      itemType = "department";
    } else if (isProject(props.item)) {
      resourceList = resources.projects;
      itemType = "project";
    } else {
      return "Unknown"; // Should not happen for this component
    }

    if (!resourceList) return "Unknown";

    const resource = resourceList.find((r: any) => r.id === props.item.id);
    return resource?.$extras?.roleName || "Unknown";
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
        // loadProjects(props.item.id);
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
          >{getUserRoleNameForCurrentItem()}</Badge
        >
      {/if}

      <!-- Add dropdown menu for department actions -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger onclick={(e: MouseEvent) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" class="relative z-10">
            <MoreVertical class="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          onclick={(e: MouseEvent) => e.stopPropagation()}
          class="relative z-20"
        >
          <DropdownMenu.Label>Department Actions</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              if (props.onNewProject) props.onNewProject();
            }}
          >
            <Plus class="h-4 w-4 mr-2" />
            New Project
          </DropdownMenu.Item>

          <!-- Delete Department Item -->
          {#if isDepartment(props.item) && canPotentiallyDeleteDepartment(props.item)}
            {@const departmentIsEmpty =
              !props.filteredProjects || props.filteredProjects.length === 0}
            <span
              title={departmentIsEmpty
                ? ""
                : "Move or delete all projects in this department first"}
            >
              <DropdownMenu.Item
                class="text-destructive focus:bg-destructive/10 focus:text-destructive"
                disabled={!departmentIsEmpty}
                onclick={async (e: MouseEvent) => {
                  e.stopPropagation();
                  if (departmentIsEmpty) {
                    showDeleteConfirmDialog = true;
                  }
                }}
              >
                Delete Department
              </DropdownMenu.Item>
            </span>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>

  <!-- Delete Confirmation Dialog -->
  {#if isDepartment(props.item)}
    <AlertDialog.Root bind:open={showDeleteConfirmDialog}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
          <AlertDialog.Description>
            This action cannot be undone. This will permanently delete the
            department "<strong>{props.item.name}</strong>".
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel onclick={() => (showDeleteConfirmDialog = false)}
            >Cancel</AlertDialog.Cancel
          >
          <AlertDialog.Action
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onclick={async () => {
              const success = await teamManagement.deleteDepartment(
                props.item.id
              );
              if (!success) {
                alert(
                  `Failed to delete department: ${teamManagement.error || "Unknown error"}`
                );
              }
              showDeleteConfirmDialog = false; // Close dialog regardless of success/failure
            }}
          >
            Delete
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {/if}

  <!-- Projects in Department (when expanded) -->
  {#if isExpanded}
    <div class="ml-6 border-l pl-4">
      {#if props.filteredProjects && props.filteredProjects.length > 0}
        {#each props.filteredProjects as project}
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
                  >{getUserRoleNameForCurrentItem()}</Badge
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
      {:else}
        <div class="text-sm text-muted-foreground py-2 px-4">
          No projects in this department
        </div>
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
          >{getUserRoleNameForCurrentItem()}</Badge
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

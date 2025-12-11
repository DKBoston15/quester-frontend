<script lang="ts">
  import {
    ChevronRight,
    Plus,
    FileText,
    UserPlus,
    FolderKanban,
    MoreVertical,
    FolderInput,
    AlertTriangle,
    Edit3,
    Check,
    X,
  } from "lucide-svelte";
  import type { Department, Project } from "$lib/types/auth";
  import { auth } from "$lib/stores/AuthStore";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { navigate } from "svelte-routing";
  import { api } from "$lib/services/api-client";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { _ } from "svelte-i18n";

  // Props
  const props = $props();

  // Component state
  let isExpanded = $state(false);
  let showDeleteConfirmDialog = $state(false);

  // State for error dialog
  let showErrorDialog = $state(false);
  let dialogErrorTitle = $state($_('treeNodeItem.actionFailed'));
  let dialogErrorMessage = $state($_('common.unexpectedError'));

  // State for renaming
  let isRenaming = $state(false);
  let newName = $state("");
  let isRenameLoading = $state(false);

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
    if (isDepartment(props.item) && !isRenaming) {
      e.stopPropagation();
      isExpanded = !isExpanded;
    }
  }

  // Handle keyboard events for department toggle
  function handleKeydown(e: KeyboardEvent) {
    if (
      (e.key === "Enter" || e.key === " ") &&
      isDepartment(props.item) &&
      !isRenaming
    ) {
      e.preventDefault();
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
    if (!auth.user) return $_('common.unknown');

    // 1. Try to read the role name from the cached user resources
    const resources = teamManagement.userResources;
    if (resources) {
      let resourceList: any[] | undefined;

      if (isDepartment(props.item)) {
        resourceList = resources.departments;
      } else if (isProject(props.item)) {
        resourceList = resources.projects;
      }

      if (resourceList && resourceList.length) {
        // Use string comparison for IDs because backend sometimes returns integers
        const resource = resourceList.find(
          (r: any) => String(r.id) === String(props.item.id)
        );
        if (resource?.$extras?.roleName) {
          return resource.$extras.roleName;
        }
      }
    }

    // 2. Fallback: derive the role name directly from the item's attached roles
    const ROLE_ID_TO_NAME: Record<string, string> = {
      // Organization roles are not used here, but kept for completeness
      "e820de49-d7bd-42d7-8b05-49279cee686f": "Owner", // Org Owner
      "0c0e5bcc-cd87-462c-8610-ba8fc8f101d2": "Admin", // Org Admin
      "65449b75-feb3-49c1-b88e-ec59f2083d95": "Member", // Org Member

      "7dcb0af2-2338-4c03-a797-955925405f90": "Owner", // Dept Owner
      "8f3352ae-3144-473b-a795-059ea1fcc910": "Admin", // Dept Admin
      "1f783597-8c81-4fd2-9181-097eef1bb13d": "Member", // Dept Member

      "5495973d-882a-4e54-9e11-7b696a2d2553": "Owner", // Project Owner
      "acea871e-aef9-4e90-a001-6305ff8cdac8": "Admin", // Project Admin
      "4111310e-a3c4-4880-aba2-4c8efd405f7a": "Member", // Project Member
    };

    if (isDepartment(props.item) && props.item.departmentRoles) {
      const userRole = props.item.departmentRoles.find(
        (role: any) => String(role.userId) === String(auth.user?.id)
      );
      if (userRole) {
        const unknownText = $_('common.unknown');
        const name =
          userRole.role?.name || ROLE_ID_TO_NAME[userRole.roleId] || unknownText;
        if (name === unknownText) {
          console.debug(
            "[TreeNodeItem] Derived department role returned Unknown",
            {
              departmentId: props.item.id,
              userId: auth.user?.id,
              userRole,
            }
          );
        }
        return name;
      }
    }

    if (isProject(props.item) && props.item.projectRoles) {
      const userRole = props.item.projectRoles.find(
        (role: any) => String(role.userId) === String(auth.user?.id)
      );
      if (userRole) {
        const unknownText = $_('common.unknown');
        const name =
          userRole.role?.name || ROLE_ID_TO_NAME[userRole.roleId] || unknownText;
        if (name === unknownText) {
          console.debug(
            "[TreeNodeItem] Derived project role returned Unknown",
            {
              projectId: props.item.id,
              userId: auth.user?.id,
              userRole,
            }
          );
        }
        return name;
      }
    }

    console.debug(
      "[TreeNodeItem] getUserRoleNameForCurrentItem() fell through to Unknown",
      {
        itemId: props.item.id,
        itemType: isDepartment(props.item)
          ? "department"
          : isProject(props.item)
            ? "project"
            : "unknown",
        resourcesPresent: !!resources,
        userResourcesSnapshot: resources,
      }
    );

    return $_('common.unknown');
  }

  // Start renaming a department
  function startRename(e: MouseEvent) {
    if (!isDepartment(props.item)) return;
    e.stopPropagation();

    newName = props.item.name;
    isRenaming = true;

    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      const input = document.querySelector(
        `input[placeholder="${$_('organizationDialogs.treeNode.departmentName')}"]`
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }

  // Cancel renaming
  function cancelRename() {
    isRenaming = false;
    newName = "";
  }

  // Save the new department name
  async function saveRename() {
    if (
      !isDepartment(props.item) ||
      !newName.trim() ||
      newName.trim() === props.item.name
    ) {
      cancelRename();
      return;
    }

    isRenameLoading = true;

    try {
      await api.put(`/departments/${props.item.id}`, {
        name: newName.trim(),
        organizationId: props.item.organizationId,
      });

      // Update was successful, refresh data
      await teamManagement.loadUserResources();
      isRenaming = false;
      newName = "";
    } catch (error) {
      console.error("Error renaming department:", error);
      dialogErrorTitle = "Rename Failed";
      dialogErrorMessage =
        error instanceof Error
          ? error.message
          : "Could not rename department. Please try again.";
      showErrorDialog = true;
    } finally {
      isRenameLoading = false;
    }
  }

  // Handle Enter and Escape keys in rename input
  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  }

  // Check if user can rename department
  function canRenameDepartment(department: Department): boolean {
    if (!auth.user || !teamManagement.userResources) return false;

    // Check if user is Department Owner or Admin
    const deptResource = teamManagement.userResources.departments?.find(
      (d: any) => d.id === department.id
    );
    if (
      deptResource?.$extras?.roleName === "Owner" ||
      deptResource?.$extras?.roleName === "Admin"
    ) {
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

  // Join a project (self-assign)
  async function joinProject(project: Project, e: MouseEvent) {
    if (!auth.user) return;

    e.stopPropagation();

    try {
      await api.post(
        `/team-management/project/${project.id}/join-with-department`
      );

      await teamManagement.loadUserResources();
    } catch (error) {
      console.error("Error joining project:", error);
      dialogErrorTitle = "Join Failed";
      dialogErrorMessage =
        error instanceof Error
          ? error.message
          : "Could not join the project. Please try again or contact support.";
      showErrorDialog = true;
    }
  }
</script>

<!-- Add the Error Alert Dialog -->
<AlertDialog.Root bind:open={showErrorDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title class="flex items-center gap-2">
        <AlertTriangle class="h-5 w-5 text-destructive" />
        {dialogErrorTitle}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {dialogErrorMessage}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={() => (showErrorDialog = false)}
        >OK</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

{#if isDepartment(props.item)}
  <!-- Department Item -->
  <div
    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer ml-2 my-1 transition-colors"
    onclick={toggleExpanded}
    onkeydown={handleKeydown}
    role="button"
    tabindex="0"
  >
    <div class="flex-shrink-0 text-amber-500">
      <ChevronRight
        class="h-4 w-4 transition-transform {isExpanded ? 'rotate-90' : ''}"
      />
    </div>

    <FolderKanban class="h-4 w-4 text-amber-500" />

    {#if isRenaming}
      <!-- Rename input mode -->
      <div class="flex items-center gap-2 flex-1">
        <Input
          bind:value={newName}
          onkeydown={handleRenameKeydown}
          class="h-8 text-sm font-medium"
          placeholder={$_('organizationDialogs.treeNode.departmentName')}
          disabled={isRenameLoading}
        />
        <Button
          size="icon"
          variant="ghost"
          class="h-6 w-6"
          onclick={saveRename}
          disabled={isRenameLoading || !newName.trim()}
        >
          {#if isRenameLoading}
            <div
              class="w-3 h-3 border border-t-transparent rounded-full animate-spin"
            ></div>
          {:else}
            <Check class="h-3 w-3" />
          {/if}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          class="h-6 w-6"
          onclick={cancelRename}
          disabled={isRenameLoading}
        >
          <X class="h-3 w-3" />
        </Button>
      </div>
    {:else}
      <!-- Normal display mode -->
      <span class="font-medium">{props.item.name}</span>
    {/if}

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
          {$_('organizationDialogs.treeView.join')}
        </Button>
      {:else}
        <Badge variant="outline" class="bg-primary/10 text-primary"
          >{getUserRoleNameForCurrentItem()}</Badge
        >
      {/if}

      <!-- Add dropdown menu for department actions -->
      {#if !isRenaming}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            onclick={(e: MouseEvent) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" class="relative z-10">
              <MoreVertical class="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            onclick={(e: MouseEvent) => e.stopPropagation()}
            class="relative z-20"
          >
            <DropdownMenu.Label>{$_('organizationDialogs.treeNode.departmentActions')}</DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onclick={(e: MouseEvent) => {
                e.stopPropagation();
                if (props.onNewProject) props.onNewProject();
              }}
            >
              <Plus class="h-4 w-4 mr-2" />
              {$_('organizationDialogs.treeNode.newProject')}
            </DropdownMenu.Item>

            {#if isDepartment(props.item) && canRenameDepartment(props.item)}
              <DropdownMenu.Item
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  startRename(e);
                }}
              >
                <Edit3 class="h-4 w-4 mr-2" />
                {$_('organizationDialogs.treeNode.renameDepartment')}
              </DropdownMenu.Item>
            {/if}

            <!-- Delete Department Item -->
            {#if isDepartment(props.item) && canPotentiallyDeleteDepartment(props.item)}
              {@const departmentIsEmpty =
                !props.filteredProjects || props.filteredProjects.length === 0}

              {#if !departmentIsEmpty}
                <!-- DISABLED: Show with Tooltip -->
                <Tooltip.Root>
                  <Tooltip.Trigger class="w-full">
                    <span
                      class="w-full flex cursor-not-allowed"
                      aria-label={"Delete Department (disabled, cannot delete non-empty department)"}
                    >
                      <DropdownMenu.Item
                        class="w-full text-red-600 dark:text-red-500 focus:bg-red-100 dark:focus:bg-red-900/50 focus:text-red-700 dark:focus:text-red-400 data-[disabled]:text-muted-foreground data-[disabled]:opacity-70 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed"
                        disabled={true}
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                        }}
                      >
                        {$_('organizationDialogs.treeNode.deleteDepartment')}
                      </DropdownMenu.Item>
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    side="right"
                    class="bg-background text-foreground border rounded-md shadow-md p-2 text-sm"
                  >
                    <p>{$_('organizationDialogs.treeNode.moveTooltip')}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              {:else}
                <!-- ENABLED: Show without Tooltip -->
                <DropdownMenu.Item
                  class="w-full text-red-600 dark:text-red-500 focus:bg-red-100 dark:focus:bg-red-900/50 focus:text-red-700 dark:focus:text-red-400"
                  disabled={false}
                  onclick={async (e: MouseEvent) => {
                    e.stopPropagation();
                    showDeleteConfirmDialog = true;
                  }}
                  aria-label={$_('ariaLabels.deleteDepartment')}
                >
                  {$_('organizationDialogs.treeNode.deleteDepartment')}
                </DropdownMenu.Item>
              {/if}
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
    </div>
  </div>

  <!-- Delete Confirmation Dialog -->
  {#if isDepartment(props.item)}
    <AlertDialog.Root bind:open={showDeleteConfirmDialog}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>{$_('organizationDialogs.deleteConfirm.areYouSure')}</AlertDialog.Title>
          <AlertDialog.Description>
            {$_('organizationDialogs.deleteConfirm.departmentWarning', { values: { name: props.item.name } })}
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel onclick={() => (showDeleteConfirmDialog = false)}
            >{$_('organizationDialogs.deleteConfirm.cancel')}</AlertDialog.Cancel
          >
          <AlertDialog.Action
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onclick={async () => {
              const success = await teamManagement.deleteDepartment(
                props.item.id
              );
              if (!success) {
                alert(
                  $_('treeNodeItem.failedToDeleteDepartment', { values: { error: teamManagement.error || $_('common.unknown') } })
                );
              }
              showDeleteConfirmDialog = false; // Close dialog regardless of success/failure
            }}
          >
            {$_('organizationDialogs.deleteConfirm.delete')}
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
                  {$_('organizationDialogs.treeView.join')}
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
                  <DropdownMenu.Label>{$_('organizationDialogs.treeNode.actions')}</DropdownMenu.Label>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      if (props.onMoveProject) props.onMoveProject(project);
                    }}
                  >
                    <FolderInput class="h-4 w-4 mr-2" />
                    {$_('organizationDialogs.treeNode.moveToDepartment')}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-sm text-muted-foreground py-2 px-4">
          {$_('organizationDialogs.treeNode.noProjectsInDepartment')}
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
          {$_('organizationDialogs.treeView.join')}
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
          <DropdownMenu.Label>{$_('organizationDialogs.treeNode.actions')}</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              if (props.onMoveProject) props.onMoveProject(props.item);
            }}
          >
            <FolderInput class="h-4 w-4 mr-2" />
            {$_('organizationDialogs.treeNode.moveToDepartment')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </button>
{/if}

<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { auth } from "$lib/stores/AuthStore";
  import { UserCog, X, Info } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { api } from "$lib/services/api-client";

  const props = $props<{
    userId: string;
    resourceType: "organization" | "department" | "project";
    resourceId: string;
    onClose: () => void;
    onRoleUpdated: () => void;
  }>();

  let isOpen = $state(true);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let selectedRoleId = $state("");
  let userName = $state("");
  let isOwner = $state(false); // Track if user is an Owner
  let isProjectOwner = $state(false); // Track if user is a Project Owner
  let isUsingElevatedPermissions = $state(false); // Track if using org admin permissions

  // We'll extract available roles from the team management structure
  // based on the current resource type
  let availableRoles = $state<{ id: string; name: string }[]>([]);

  // When the component mounts, get roles from the current structure
  onMount(async () => {
    // Try to fetch roles from the backend first
    await fetchRolesFromBackend();

    // If we couldn't get roles from the backend, fall back to the current structure
    if (availableRoles.length === 0) {
      // Get roles from the appropriate structure based on resource type
      updateAvailableRoles();
    }

    // Check if we're using elevated permissions
    checkForElevatedPermissions();
  });

  // Try to fetch the roles directly from the backend
  async function fetchRolesFromBackend() {
    try {
      const data = await api.get(`/roles?scope=${props.resourceType}`);

      if (data && Array.isArray(data) && data.length > 0) {
        availableRoles = data;
        return true;
      }
    } catch (error) {
      console.error("Error fetching roles from backend:", error);
    }

    return false;
  }

  function updateAvailableRoles() {
    // Get roles from the existing data in the team management store
    if (
      props.resourceType === "organization" &&
      teamManagement.organizationStructure
    ) {
      // If the structure has available roles use them, otherwise extract from users
      if (teamManagement.organizationStructure.availableRoles) {
        availableRoles = teamManagement.organizationStructure.availableRoles;
      } else if (teamManagement.organizationStructure.users) {
        // Check if users have role information
        const usersWithRoles =
          teamManagement.organizationStructure.users.filter(
            (user: any) => user.role && user.role.id && user.role.name
          );

        // Extract unique roles from user data
        const uniqueRoles = new Map<string, { id: string; name: string }>();
        teamManagement.organizationStructure.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });

        const extractedRoles = Array.from(uniqueRoles.values());

        if (extractedRoles.length > 0) {
          availableRoles = extractedRoles;
        } else {
          // If we couldn't extract roles, use hardcoded ones as a last resort
          availableRoles = [
            { id: "admin", name: "Admin" },
            { id: "member", name: "Member" },
          ];
        }
      }
    } else if (
      props.resourceType === "department" &&
      teamManagement.departmentStructure
    ) {
      if (teamManagement.departmentStructure.availableRoles) {
        availableRoles = teamManagement.departmentStructure.availableRoles;
      } else if (teamManagement.departmentStructure.users) {
        const uniqueRoles = new Map<string, { id: string; name: string }>();
        teamManagement.departmentStructure.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });

        const extractedRoles = Array.from(uniqueRoles.values());
        if (extractedRoles.length > 0) {
          availableRoles = extractedRoles;
        } else {
          // If we couldn't extract roles, use hardcoded ones as a last resort
          availableRoles = [
            { id: "manager", name: "Manager" },
            { id: "member", name: "Member" },
          ];
        }
      }
    } else if (props.resourceType === "project" && teamManagement.projectTeam) {
      if (teamManagement.projectTeam.availableRoles) {
        availableRoles = teamManagement.projectTeam.availableRoles;
      } else if (teamManagement.projectTeam.users) {
        const uniqueRoles = new Map<string, { id: string; name: string }>();
        teamManagement.projectTeam.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });

        const extractedRoles = Array.from(uniqueRoles.values());
        if (extractedRoles.length > 0) {
          availableRoles = extractedRoles;
        } else {
          // If we couldn't extract roles, use correct hardcoded roles as a last resort
          availableRoles = [
            { id: "owner", name: "Owner" },
            { id: "admin", name: "Admin" },
            { id: "member", name: "Member" },
          ];
        }
      }
    }
  }

  // Check if current user is using org admin permissions on a project
  function checkForElevatedPermissions() {
    // Only applies to projects
    if (props.resourceType !== "project") return;

    const currentUserId = auth.user?.id;
    if (!currentUserId) return;

    // Get project info
    const projectTeam = teamManagement.projectTeam;
    if (!projectTeam || !projectTeam.organization) return;

    const organizationId = projectTeam.organization.id;

    // Check user's organization role
    const orgResources = teamManagement.userResources?.organizations || [];
    const userOrg = orgResources.find((org: any) => org.id === organizationId);

    if (
      !userOrg ||
      !userOrg.organizationRoles ||
      !userOrg.organizationRoles.length
    )
      return;

    const userOrgRole = userOrg.organizationRoles[0];
    const isOrgAdmin =
      userOrgRole.role?.name === "Admin" || userOrgRole.role?.name === "Owner";

    if (!isOrgAdmin) return;

    // Check user's project role
    const projectUser = projectTeam.users?.find(
      (u: any) => String(u.id) === String(currentUserId)
    );
    if (!projectUser) return;

    let projectRoleName = "";
    if (projectUser.$extras?.roleName) {
      projectRoleName = projectUser.$extras.roleName;
    } else if (
      projectUser.projectRoles?.length &&
      projectUser.projectRoles[0].role?.name
    ) {
      projectRoleName = projectUser.projectRoles[0].role.name;
    } else if (projectUser.role?.name) {
      projectRoleName = projectUser.role.name;
    }

    // If not a project owner, but is org admin, they're using elevated permissions
    isUsingElevatedPermissions = projectRoleName !== "Owner" && isOrgAdmin;
  }

  // Find the user and their current role
  $effect(() => {
    let users: any[] = [];

    if (
      props.resourceType === "organization" &&
      teamManagement.organizationStructure
    ) {
      users = teamManagement.organizationStructure.users || [];
    } else if (
      props.resourceType === "department" &&
      teamManagement.departmentStructure
    ) {
      users = teamManagement.departmentStructure.users || [];
    } else if (props.resourceType === "project" && teamManagement.projectTeam) {
      users = teamManagement.projectTeam.users || [];
    }

    const user = users.find((u: any) => u.id === props.userId);
    if (user) {
      userName = `${user.firstName} ${user.lastName}`;

      // Get the user's current role ID
      if (user.role && user.role.id) {
        selectedRoleId = user.role.id;

        // Check if the user is an organization owner
        if (
          props.resourceType === "organization" &&
          user.role.name === "Owner"
        ) {
          isOwner = true;
        }

        // Check if they're a project owner
        if (props.resourceType === "project" && user.role.name === "Owner") {
          isProjectOwner = true;
        }
      } else if (user.$extras?.roleId) {
        selectedRoleId = user.$extras.roleId;

        // Also check for owner in extras
        if (
          props.resourceType === "organization" &&
          (user.$extras?.roleName === "Owner" ||
            user.organizationRoles?.some((r: any) => r.role?.name === "Owner"))
        ) {
          isOwner = true;
        }

        // Check if they're a project owner
        if (
          props.resourceType === "project" &&
          user.$extras?.roleName === "Owner"
        ) {
          isProjectOwner = true;
        }
      }

      // Check organization roles array if available
      if (
        props.resourceType === "organization" &&
        user.organizationRoles &&
        user.organizationRoles.length > 0
      ) {
        const ownerRole = user.organizationRoles.find(
          (r: any) => r.role?.name === "Owner"
        );
        if (ownerRole) {
          isOwner = true;
        }
      }

      // Check project roles array if available
      if (
        props.resourceType === "project" &&
        user.projectRoles &&
        user.projectRoles.length > 0
      ) {
        const ownerRole = user.projectRoles.find(
          (r: any) => r.role?.name === "Owner"
        );
        if (ownerRole) {
          isProjectOwner = true;
        }
      }

      // DO NOT call updateAvailableRoles() here - it causes an infinite loop
    }
  });

  async function updateRole() {
    // Only prevent changing the role if this is the last owner
    if (isOwner && props.resourceType === "organization") {
      // Get the current number of owners
      const users = teamManagement.organizationStructure?.users || [];
      const ownerCount = users.filter(
        (user: any) =>
          user.organizationRoles?.some((r: any) => r.role?.name === "Owner") ||
          user.role?.name === "Owner" ||
          user.$extras?.roleName === "Owner"
      ).length;

      if (ownerCount <= 1) {
        error = $_('errors.lastOwnerCannotChange');
        return;
      }
    }

    if (!selectedRoleId) {
      error = $_('errors.pleaseSelectRole');
      return;
    }

    // Confirm when using elevated permissions to change a project owner's role
    if (
      props.resourceType === "project" &&
      isProjectOwner &&
      isUsingElevatedPermissions
    ) {
      const confirmMessage = $_('roleManagerExtra.confirmElevatedPermissions');

      if (!confirm(confirmMessage)) {
        return; // User cancelled the action
      }
    }

    isLoading = true;
    error = null;

    try {
      // The backend now handles role names directly, so we can pass selectedRoleId as is
      const success = await teamManagement.updateUserRole(
        props.userId,
        selectedRoleId
      );

      if (success) {
        props.onRoleUpdated();
        closeDialog();
      } else {
        error = teamManagement.error || $_('errors.failedToUpdateRole');
      }
    } catch (err) {
      error =
        err instanceof Error ? err.message : $_('errors.anUnexpectedErrorOccurred');
    } finally {
      isLoading = false;
    }
  }

  function closeDialog() {
    isOpen = false;
    props.onClose();
  }

  // Handle ESC key to close the modal
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      closeDialog();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Modal backdrop -->
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={closeDialog}
  >
    <!-- Modal content -->
    <div
      class="bg-card dark:bg-dark-card border-2 dark:border-dark-border rounded-lg shadow-lg w-full max-w-md p-6"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UserCog class="h-5 w-5" />
          Manage User Role
        </h2>
        <button
          onclick={closeDialog}
          class="text-muted-foreground hover:text-foreground"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <p class="text-muted-foreground mb-4">
        {$_('roleManager.updateRoleFor', { values: { userName } })}
      </p>

      <!-- Elevated permissions notice -->
      {#if props.resourceType === "project" && isProjectOwner && isUsingElevatedPermissions}
        <div
          class="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-900/20 dark:border-amber-800"
        >
          <div class="flex items-start">
            <Info
              class="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0"
            />
            <div>
              <p class="text-sm font-medium text-amber-800 dark:text-amber-400">
                Using Organization Privileges
              </p>
              <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">
                You're changing a Project Owner's role using your organization
                permissions.
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Content -->
      <div class="py-4">
        <label for="role-select" class="block text-sm font-medium mb-2">
          Select Role
        </label>

        {#if isOwner && props.resourceType === "organization"}
          {#if teamManagement.organizationStructure?.users?.filter((user: any) => user.organizationRoles?.some((r: any) => r.role?.name === "Owner") || user.role?.name === "Owner" || user.$extras?.roleName === "Owner").length <= 1}
            <!-- Disabled select for last owner -->
            <div class="text-muted-foreground py-2">
              Owner (cannot be changed)
            </div>
            <p class="text-sm text-red-500 mt-1">
              Organization Owner's role cannot be changed while they are the
              last owner
            </p>
          {:else}
            <select
              id="role-select"
              bind:value={selectedRoleId}
              class="w-full rounded-md border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2"
            >
              <option value="" disabled>{$_('roleManager.chooseRole')}</option>
              {#each availableRoles as role}
                {#if !(isOwner && role.name === "Owner")}
                  <option value={role.id} selected={role.id === selectedRoleId}
                    >{role.name}</option
                  >
                {/if}
              {/each}
            </select>
          {/if}
        {:else if availableRoles.length === 0}
          <div class="text-muted-foreground py-2">
            {$_('roles.noRolesAvailable')}
          </div>
          <select
            id="role-select"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2"
          >
            <option value="" disabled>{$_('roleManager.chooseRole')}</option>
            {#each ["admin", "member"].filter((r) => r !== selectedRoleId) as role}
              <option value={role}
                >{role.charAt(0).toUpperCase() + role.slice(1)}</option
              >
            {/each}
          </select>
        {:else}
          <select
            id="role-select"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2"
          >
            <option value="" disabled>{$_('roleManager.chooseRole')}</option>
            {#each availableRoles as role}
              {#if !(isOwner && role.name === "Owner")}
                <option value={role.id} selected={role.id === selectedRoleId}
                  >{role.name}</option
                >
              {/if}
            {/each}
          </select>
        {/if}

        {#if error}
          <div class="mt-2 text-red-500 text-sm">{error}</div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" onclick={closeDialog} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onclick={updateRole}
          disabled={isLoading ||
            (isOwner &&
              props.resourceType === "organization" &&
              teamManagement.organizationStructure?.users?.filter(
                (user: any) =>
                  user.organizationRoles?.some(
                    (r: any) => r.role?.name === "Owner"
                  ) ||
                  user.role?.name === "Owner" ||
                  user.$extras?.roleName === "Owner"
              ).length <= 1)}
        >
          {isLoading ? $_('roleManager.updating') : $_('roleManager.updateRole')}
        </Button>
      </div>
    </div>
  </div>
{/if}

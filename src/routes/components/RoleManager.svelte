<!-- src/routes/components/RoleManager.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { UserCog, X, Info } from "lucide-svelte";

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

    // Debug what data we actually have
    if (props.resourceType === "organization") {
      console.log(
        "Organization Structure:",
        teamManagement.organizationStructure
      );
    } else if (props.resourceType === "department") {
      console.log("Department Structure:", teamManagement.departmentStructure);
    } else if (props.resourceType === "project") {
      console.log("Project Team:", teamManagement.projectTeam);
    }
  });

  // Try to fetch the roles directly from the backend
  async function fetchRolesFromBackend() {
    try {
      const response = await fetch(
        `http://localhost:3333/roles?scope=${props.resourceType}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${props.resourceType} roles from backend:`, data);

        if (data && Array.isArray(data) && data.length > 0) {
          availableRoles = data;
          return true;
        }
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
      console.log(
        "Examining organization structure:",
        teamManagement.organizationStructure
      );

      // If the structure has available roles use them, otherwise extract from users
      if (teamManagement.organizationStructure.availableRoles) {
        console.log(
          "Found availableRoles in organization structure:",
          teamManagement.organizationStructure.availableRoles
        );
        availableRoles = teamManagement.organizationStructure.availableRoles;
      } else if (teamManagement.organizationStructure.users) {
        console.log(
          "Organization users:",
          teamManagement.organizationStructure.users
        );

        // Check if users have role information
        const usersWithRoles =
          teamManagement.organizationStructure.users.filter(
            (user: any) => user.role && user.role.id && user.role.name
          );

        console.log("Users with roles:", usersWithRoles);

        // Extract unique roles from user data
        const uniqueRoles = new Map<string, { id: string; name: string }>();
        teamManagement.organizationStructure.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });

        const extractedRoles = Array.from(uniqueRoles.values());
        console.log("Extracted roles from users:", extractedRoles);

        if (extractedRoles.length > 0) {
          availableRoles = extractedRoles;
        } else {
          // If we couldn't extract roles, use hardcoded ones as a last resort
          availableRoles = [
            { id: "admin", name: "Admin" },
            { id: "member", name: "Member" },
          ];
          console.log("Using hardcoded roles as fallback:", availableRoles);
        }
      }
    } else if (
      props.resourceType === "department" &&
      teamManagement.departmentStructure
    ) {
      console.log(
        "Examining department structure:",
        teamManagement.departmentStructure
      );

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
      console.log("Examining project team:", teamManagement.projectTeam);

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

    // If we couldn't find any roles, log an error
    if (availableRoles.length === 0) {
      console.error("No roles found for", props.resourceType);
    } else {
      console.log("Available roles:", availableRoles);
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
      console.log("Found user:", user);

      // Get the user's current role ID
      if (user.role && user.role.id) {
        console.log("User has role:", user.role);
        selectedRoleId = user.role.id;

        // Check if the user is an organization owner
        if (
          props.resourceType === "organization" &&
          user.role.name === "Owner"
        ) {
          isOwner = true;
          console.log(
            "This user is an organization Owner and their role cannot be changed"
          );
        }

        // Check if they're a project owner
        if (props.resourceType === "project" && user.role.name === "Owner") {
          isProjectOwner = true;
        }
      } else if (user.$extras?.roleId) {
        console.log("User has roleId in $extras:", user.$extras.roleId);
        selectedRoleId = user.$extras.roleId;

        // Also check for owner in extras
        if (
          props.resourceType === "organization" &&
          (user.$extras?.roleName === "Owner" ||
            user.organizationRoles?.some((r: any) => r.role?.name === "Owner"))
        ) {
          isOwner = true;
          console.log(
            "This user is an organization Owner and their role cannot be changed"
          );
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
          console.log(
            "This user is an organization Owner (from organizationRoles) and their role cannot be changed"
          );
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
    // Prevent changing the role of an organization owner
    if (isOwner) {
      error = "Organization Owners cannot have their role changed";
      return;
    }

    if (!selectedRoleId) {
      error = "Please select a role";
      return;
    }

    // Confirm when using elevated permissions to change a project owner's role
    if (
      props.resourceType === "project" &&
      isProjectOwner &&
      isUsingElevatedPermissions
    ) {
      const confirmMessage =
        "You are about to change a Project Owner's role using your Organization privileges. " +
        "Are you sure you want to proceed?";

      if (!confirm(confirmMessage)) {
        return; // User cancelled the action
      }
    }

    isLoading = true;
    error = null;

    try {
      console.log(`Updating user ${props.userId} to role ${selectedRoleId}`);

      // The backend now handles role names directly, so we can pass selectedRoleId as is
      const success = await teamManagement.updateUserRole(
        props.userId,
        selectedRoleId
      );

      if (success) {
        props.onRoleUpdated();
        closeDialog();
      } else {
        error = teamManagement.error || "Failed to update role";
      }
    } catch (err) {
      error =
        err instanceof Error ? err.message : "An unexpected error occurred";
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
      class="bg-card dark:bg-dark-card border-2 border-black dark:border-dark-border rounded-lg shadow-lg w-full max-w-md p-6"
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
        Update the role for {userName}
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

        {#if isOwner}
          <!-- Disabled select for owners -->
          <div class="text-muted-foreground py-2">
            Owner (cannot be changed)
          </div>
          <p class="text-sm text-red-500 mt-1">
            Organization Owners cannot have their role changed for security
            reasons
          </p>
        {:else if availableRoles.length === 0}
          <div class="text-muted-foreground py-2">
            No roles available. Using hardcoded fallback roles.
          </div>
          <select
            id="role-select"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-2"
          >
            <option value="" disabled>Choose a role</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        {:else}
          <select
            id="role-select"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-2"
          >
            <option value="" disabled>Choose a role</option>
            {#each availableRoles as role}
              <option value={role.id}>{role.name}</option>
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
        <Button onclick={updateRole} disabled={isLoading || isOwner}>
          {isLoading ? "Updating..." : "Update Role"}
        </Button>
      </div>
    </div>
  </div>
{/if}

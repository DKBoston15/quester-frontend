<!-- src/routes/components/UserRoleForm.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";

  // Props
  const props = $props<{
    userId: string;
    onCancel: () => void;
    resourceType: "organization" | "department" | "project";
  }>();

  let isLoading = $state(false);
  let selectedRoleId = $state<string | undefined>(undefined);
  let error = $state<string | null>(null);

  // Get current user details
  let user = $state<any | null>(null);
  let availableRoles = $state<any[]>([]);

  $effect(() => {
    loadUserData();
  });

  function loadUserData() {
    if (!props.userId) return;

    // Get the appropriate resource data based on type
    const resourceData =
      props.resourceType === "organization"
        ? teamManagement.organizationStructure
        : props.resourceType === "department"
          ? teamManagement.departmentStructure
          : teamManagement.projectTeam;

    if (!resourceData) return;

    // Find the user in the resource's user list
    user = resourceData.users?.find(
      (u: any) => String(u.id) === String(props.userId)
    );

    // Get available roles
    availableRoles = resourceData.availableRoles || [];

    // Get the user's current role
    if (user) {
      // First try to get it from $extras.roleName
      if (user.$extras?.roleName) {
        const matchedRole = availableRoles.find(
          (r) => r.name === user.$extras.roleName
        );
        if (matchedRole) {
          selectedRoleId = matchedRole.id;
        }
      }
      // Then try from organization/department/projectRoles
      else if (
        props.resourceType === "organization" &&
        user.organizationRoles?.length > 0
      ) {
        selectedRoleId = user.organizationRoles[0].role?.id;
      } else if (
        props.resourceType === "department" &&
        user.departmentRoles?.length > 0
      ) {
        selectedRoleId = user.departmentRoles[0].role?.id;
      } else if (
        props.resourceType === "project" &&
        user.projectRoles?.length > 0
      ) {
        selectedRoleId = user.projectRoles[0].role?.id;
      }
      // Finally, try direct role property
      else if (user.role?.id) {
        selectedRoleId = user.role.id;
      }
    }
  }

  async function updateUserRole() {
    if (!selectedRoleId || !props.userId) {
      error = "No role selected";
      return;
    }

    isLoading = true;
    error = null;

    try {
      const success = await teamManagement.updateUserRole(
        props.userId,
        selectedRoleId
      );

      if (success) {
        // Use browser alert instead of toast since toast is not available
        alert("User role updated successfully");
        props.onCancel();
      } else {
        throw new Error(teamManagement.error || "Failed to update user role");
      }
    } catch (err) {
      error =
        err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Error updating user role:", error);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="space-y-4">
  {#if user}
    <div class="space-y-2">
      <p class="text-sm text-muted-foreground">
        Change role for <strong>{user.firstName} {user.lastName}</strong>
        ({user.email})
      </p>

      <div class="space-y-4">
        <div class="space-y-2">
          <label for="role" class="text-sm font-medium">Role</label>
          <select
            id="role"
            bind:value={selectedRoleId}
            disabled={isLoading}
            class="w-full border-2 dark:border-dark-border rounded-md p-2"
          >
            <option value={undefined}>Select a role</option>
            {#each availableRoles as role}
              <option value={role.id}>{role.name}</option>
            {/each}
          </select>
        </div>

        {#if error}
          <p class="text-sm text-destructive">{error}</p>
        {/if}

        <div class="flex justify-end gap-2">
          <Button
            variant="outline"
            onclick={props.onCancel}
            disabled={isLoading}
            class="border-2  dark:border-dark-border"
          >
            Cancel
          </Button>
          <Button
            onclick={updateUserRole}
            disabled={isLoading || !selectedRoleId}
            class="border-2 border-primary dark:border-primary"
          >
            {#if isLoading}
              <div
                class="h-4 w-4 border-t-2 border-primary-foreground animate-spin rounded-full mr-2"
              ></div>
              Updating...
            {:else}
              Update Role
            {/if}
          </Button>
        </div>
      </div>
    </div>
  {:else}
    <p class="text-muted-foreground">User data not found</p>
    <Button
      variant="outline"
      onclick={props.onCancel}
      class="border-2  dark:border-dark-border"
    >
      Cancel
    </Button>
  {/if}
</div>

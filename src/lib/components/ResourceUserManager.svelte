<!-- src/lib/components/ResourceUserManager.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import * as Table from "$lib/components/ui/table";
  import { toast } from "svelte-sonner";
  import { Search, UserPlus } from "lucide-svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { API_BASE_URL } from "$lib/config";

  // Props with Svelte 5 runes
  const { resourceType, resourceId, organizationId, onUserAdded } = $props<{
    resourceType: "department" | "project";
    resourceId: string;
    organizationId: string;
    onUserAdded: () => void;
  }>();

  // State
  let searchTerm = $state("");
  let availableUsers = $state<any[]>([]);
  let filteredUsers = $derived(filterUsers(availableUsers, searchTerm));
  let isLoading = $state(false);
  let isAdding = $state(false);
  let selectedRoleId = $state("");
  let availableRoles = $state<{ id: string; name: string }[]>([]);
  let selectedUserId = $state("");

  // Lifecycle
  $effect(() => {
    loadAvailableUsers();
    loadRoles();
  });

  // Methods
  async function loadAvailableUsers() {
    if (!organizationId) return;

    isLoading = true;
    try {
      // Get users from organization structure via team management
      const response = await fetch(
        `${API_BASE_URL}/team-management/organization/${organizationId}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const orgData = await response.json();

        // Extract users correctly - they're nested under organization.users
        const orgUsers = orgData.organization?.users || [];

        // Get current resource users to filter them out
        const currentUsers = getCurrentResourceUsers();
        const currentUserIds = currentUsers.map((u) => String(u.id));

        // Filter out users who are already in the resource
        availableUsers = orgUsers.filter(
          (user: any) => !currentUserIds.includes(String(user.id))
        );
      } else {
        console.error(
          "Failed to load organization users:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("Error loading available users:", error);
    } finally {
      isLoading = false;
    }
  }

  function getCurrentResourceUsers(): any[] {
    if (resourceType === "department" && teamManagement.departmentStructure) {
      return teamManagement.departmentStructure.users || [];
    } else if (resourceType === "project" && teamManagement.projectTeam) {
      return teamManagement.projectTeam.users || [];
    }
    return [];
  }

  async function loadRoles() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/roles?scope=${resourceType}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const rolesData = await response.json();
        availableRoles = rolesData;

        // Set default role to Member if available
        const memberRole = rolesData.find(
          (role: any) => role.name.toLowerCase() === "member"
        );
        if (memberRole) {
          selectedRoleId = memberRole.id;
        } else if (rolesData.length > 0) {
          selectedRoleId = rolesData[0].id;
        }
      } else {
        console.error("Failed to load roles:", await response.text());
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  }

  function filterUsers(users: any[], term: string) {
    if (!term) return users;

    const lowerTerm = term.toLowerCase();
    return users.filter(
      (user) =>
        ((user.firstName || user.lastName) &&
          (user.firstName?.toLowerCase().includes(lowerTerm) ||
            user.lastName?.toLowerCase().includes(lowerTerm))) ||
        (user.email && user.email.toLowerCase().includes(lowerTerm))
    );
  }

  // Helper function to get display name
  function getDisplayName(user: any): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    } else {
      return "Unknown";
    }
  }

  // Helper to get initials
  function getInitials(user: any): string {
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    } else if (user.lastName) {
      return user.lastName.charAt(0).toUpperCase();
    }
    return "U";
  }

  async function addUserToResource(userId: string | number) {
    if (!userId || !selectedRoleId) {
      toast.error("Please select a user and role");
      return;
    }

    isAdding = true;
    selectedUserId = String(userId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/team-management/${resourceType}/${resourceId}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId,
            roleId: selectedRoleId,
          }),
        }
      );

      if (response.ok) {
        toast.success(`User added to ${resourceType} successfully`);
        // Refresh the list of available users
        loadAvailableUsers();
        // Notify parent
        onUserAdded();
        // Reset selection
        selectedUserId = "";
      } else {
        const errorText = await response.text();
        let errorMessage;
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message;
        } catch {
          errorMessage = errorText;
        }
        toast.error(errorMessage || `Failed to add user to ${resourceType}`);
        console.error("Failed to add user:", errorText);
      }
    } catch (error) {
      console.error(`Error adding user to ${resourceType}:`, error);
      toast.error(`Error adding user to ${resourceType}`);
    } finally {
      isAdding = false;
    }
  }

  function handleRoleChange(value: string | undefined) {
    if (value) {
      selectedRoleId = value;
    }
  }
</script>

<Card class="p-6">
  <h3 class="text-lg font-medium mb-4">
    Add Existing Users to {resourceType === "department"
      ? "Department"
      : "Project"}
  </h3>

  <div class="mb-6">
    <div class="flex items-center gap-2 mb-4">
      <div class="relative w-full">
        <Search
          class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Search users by name or email..."
          class="pl-9"
          bind:value={searchTerm}
        />
      </div>
    </div>

    <div class="border rounded-md">
      {#if isLoading}
        <div class="p-8 flex justify-center items-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          ></div>
          <span class="ml-3">Loading available users...</span>
        </div>
      {:else if filteredUsers.length === 0}
        <div class="p-8 text-center text-muted-foreground">
          {searchTerm
            ? "No users found matching your search"
            : "No more organization users available to add"}
        </div>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>User</Table.Head>
              <Table.Head>Role</Table.Head>
              <Table.Head class="w-[100px]">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each filteredUsers as user}
              <Table.Row>
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium"
                    >
                      {getInitials(user)}
                    </div>
                    <div>
                      <div class="font-medium">{getDisplayName(user)}</div>
                      <div class="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Select
                    type="single"
                    value={selectedRoleId}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger class="w-[180px]">
                      <span>
                        {availableRoles.find((r) => r.id === selectedRoleId)
                          ?.name || "Select role"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {#each availableRoles as role}
                        <SelectItem value={role.id}>{role.name}</SelectItem>
                      {/each}
                    </SelectContent>
                  </Select>
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => addUserToResource(user.id)}
                    disabled={isAdding}
                  >
                    {#if isAdding && selectedUserId === String(user.id)}
                      <div
                        class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"
                      ></div>
                      Adding...
                    {:else}
                      <UserPlus class="h-4 w-4 mr-2" />
                      Add
                    {/if}
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </div>
  </div>
</Card>

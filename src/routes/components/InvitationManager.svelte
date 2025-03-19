<!-- src/routes/components/InvitationManager.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Badge } from "$lib/components/ui/badge";
  import { Mail, Send, X } from "lucide-svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";

  const props = $props<{
    resourceType: "organization" | "department" | "project";
    resourceId: string | null;
    onInviteSent: () => void;
  }>();

  // Form state
  let email = $state("");
  let selectedRoleId = $state("");
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);

  // API response state
  let pendingInvitations = $state<any[]>([]);
  let invitationsLoading = $state(false);
  let invitationsError = $state<string | null>(null);

  type Role = { id: string; name: string };
  let availableRoles = $state<Role[]>([]);

  // When props change, update the available roles
  $effect(() => {
    updateAvailableRoles();
  });

  // Function to extract available roles from the current team management data
  function updateAvailableRoles() {
    if (
      props.resourceType === "organization" &&
      teamManagement.organizationStructure
    ) {
      if (teamManagement.organizationStructure.availableRoles) {
        availableRoles = teamManagement.organizationStructure.availableRoles;
      } else if (teamManagement.organizationStructure.users) {
        // Extract unique roles from user data if available roles not present
        const uniqueRoles = new Map<string, Role>();
        teamManagement.organizationStructure.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });
        availableRoles = Array.from(uniqueRoles.values());
      }
    } else if (
      props.resourceType === "department" &&
      teamManagement.departmentStructure
    ) {
      if (teamManagement.departmentStructure.availableRoles) {
        availableRoles = teamManagement.departmentStructure.availableRoles;
      } else if (teamManagement.departmentStructure.users) {
        const uniqueRoles = new Map<string, Role>();
        teamManagement.departmentStructure.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });
        availableRoles = Array.from(uniqueRoles.values());
      }
    } else if (props.resourceType === "project" && teamManagement.projectTeam) {
      if (teamManagement.projectTeam.availableRoles) {
        availableRoles = teamManagement.projectTeam.availableRoles;
      } else if (teamManagement.projectTeam.users) {
        const uniqueRoles = new Map<string, Role>();
        teamManagement.projectTeam.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });
        availableRoles = Array.from(uniqueRoles.values());
      }
    }

    // Select default role if we have roles
    if (availableRoles.length > 0 && !selectedRoleId) {
      // Try to find a "Member" role as default
      const memberRole = availableRoles.find(
        (r) => r.name.toLowerCase() === "member"
      );
      selectedRoleId = memberRole ? memberRole.id : availableRoles[0].id;
    }

    // Log what we found
    if (availableRoles.length === 0) {
      console.warn("No roles found for", props.resourceType);
    } else {
      console.log("Available roles for invitations:", availableRoles);
    }
  }

  async function sendInvitation() {
    if (!email || !selectedRoleId || !props.resourceId) {
      error = "Please fill in all required fields";
      return;
    }

    isLoading = true;
    error = null;
    success = null;

    try {
      // Build the payload based on resource type
      const payload: any = {
        email,
      };

      // Set appropriate resource ID based on resource type
      switch (props.resourceType) {
        case "organization":
          payload.organizationId = props.resourceId;
          payload.organizationRoleId = selectedRoleId;
          break;
        case "department":
          payload.departmentId = props.resourceId;
          payload.departmentRoleId = selectedRoleId;
          break;
        case "project":
          payload.projectId = props.resourceId;
          payload.projectRoleId = selectedRoleId;
          break;
      }

      console.log("Sending invitation with payload:", payload);

      const response = await fetch("http://localhost:3333/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send invitation");
      }

      // On success
      success = `Invitation sent to ${email}`;
      email = "";
      selectedRoleId = "";
      props.onInviteSent();

      // Refresh the invitations list
      await loadPendingInvitations();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to send invitation";
    } finally {
      isLoading = false;
    }
  }

  async function loadPendingInvitations() {
    if (!props.resourceId) return;

    invitationsLoading = true;
    invitationsError = null;

    try {
      // Use the generic invitations endpoint with query params to filter
      // Since the backend doesn't have a specific route for filtering by resource
      let endpoint = `http://localhost:3333/invitations?${props.resourceType}Id=${props.resourceId}`;

      const response = await fetch(endpoint, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to load invitations (${response.status})`);
      }

      const data = await response.json();

      // Filter for pending invitations only - exclude both acceptedAt and status "accepted"
      pendingInvitations = data.filter(
        (inv: any) =>
          !inv.acceptedAt &&
          inv.status !== "accepted" &&
          inv.status !== "revoked"
      );
    } catch (err) {
      invitationsError =
        err instanceof Error
          ? err.message
          : "Failed to load pending invitations";
      pendingInvitations = [];
    } finally {
      invitationsLoading = false;
    }
  }

  async function revokeInvitation(invitationId: string) {
    try {
      // Backend uses POST to revoke, not DELETE
      const response = await fetch(
        `http://localhost:3333/invitations/${invitationId}/revoke`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to revoke invitation");
      }

      // Filter out the revoked invitation from local state
      pendingInvitations = pendingInvitations.filter(
        (inv) => inv.id !== invitationId
      );

      // Show success message
      success = "Invitation revoked successfully";
      setTimeout(() => {
        success = null;
      }, 3000);
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to revoke invitation";
    }
  }

  // Load pending invitations when component mounts or resourceId changes
  $effect(() => {
    if (props.resourceId) {
      loadPendingInvitations();
    }
  });
</script>

<div class="space-y-8">
  <!-- Send invitation form -->
  <div>
    <h3 class="text-lg font-medium mb-4">Send New Invitation</h3>
    <form
      class="space-y-4 border-2 border-black dark:border-dark-border p-4 rounded-md"
      onsubmit={(e) => {
        e.preventDefault();
        sendInvitation();
      }}
    >
      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <Label for="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            bind:value={email}
            class="border-2 border-black dark:border-dark-border"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="role">Role</Label>
          <select
            id="role"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-2"
            required
          >
            <option value="" disabled>Select role...</option>
            {#each availableRoles as role}
              <option value={role.id}>{role.name}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2 flex items-end">
          <Button type="submit" disabled={isLoading} class="w-full">
            {#if isLoading}
              <div
                class="h-4 w-4 mr-2 border-2 border-t-transparent rounded-full animate-spin"
              ></div>
              Sending...
            {:else}
              <Send class="h-4 w-4 mr-2" />
              Send Invitation
            {/if}
          </Button>
        </div>
      </div>

      {#if error}
        <div class="text-red-500 text-sm">{error}</div>
      {/if}
      {#if success}
        <div class="text-green-500 text-sm">{success}</div>
      {/if}
    </form>
  </div>

  <!-- Pending invitations -->
  <div>
    <h3 class="text-lg font-medium mb-4">Pending Invitations</h3>
    {#if invitationsLoading}
      <div
        class="text-center p-6 border-2 border-black dark:border-dark-border rounded-md"
      >
        <div
          class="animate-spin inline-block h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
        ></div>
        <p class="mt-2 text-muted-foreground">Loading invitations...</p>
      </div>
    {:else if invitationsError}
      <div
        class="text-center p-6 border-2 border-red-500 dark:border-red-500/70 rounded-md text-red-500"
      >
        {invitationsError}
        <Button variant="outline" onclick={loadPendingInvitations} class="mt-2">
          Try Again
        </Button>
      </div>
    {:else if pendingInvitations.length === 0}
      <div
        class="text-center p-6 border-2 border-black dark:border-dark-border rounded-md text-muted-foreground"
      >
        No pending invitations
      </div>
    {:else}
      <div
        class="border-2 border-black dark:border-dark-border rounded-md overflow-hidden"
      >
        <table class="w-full">
          <thead class="bg-accent text-accent-foreground">
            <tr>
              <th class="text-left p-3">Email</th>
              <th class="text-left p-3">Role</th>
              <th class="text-left p-3">Sent</th>
              <th class="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each pendingInvitations as invitation (invitation.id)}
              <tr
                class="border-t border-black dark:border-dark-border hover:bg-accent/20"
              >
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <Mail class="h-4 w-4 text-muted-foreground" />
                    {invitation.email}
                  </div>
                </td>
                <td class="p-3">
                  <Badge variant="secondary">
                    {invitation.role?.name || invitation.roleId || "Member"}
                  </Badge>
                </td>
                <td class="p-3 text-muted-foreground">
                  {new Date(invitation.createdAt).toLocaleDateString()}
                </td>
                <td class="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => revokeInvitation(invitation.id)}
                    class="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    <X class="h-4 w-4" />
                    <span class="sr-only">Revoke invitation</span>
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

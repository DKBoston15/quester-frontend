<!-- src/routes/components/InvitationManager.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Badge } from "$lib/components/ui/badge";
  import * as Table from "$lib/components/ui/table";
  import { Mail, Send, X, Info } from "lucide-svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { API_BASE_URL } from "$lib/config";

  const props = $props<{
    resourceType: "organization" | "department" | "project";
    resourceId: string | null;
    onInviteSent: () => void;
    subscriptionLimits?: {
      canInviteUsers: boolean;
      maxUsers: number;
      currentUserCount: number;
      subscriptionPlan: string;
    };
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

  // Change from $derived to $state for subscription limit calculations
  let remainingInvitations = $state<number>(Infinity);
  let canSendInvitations = $state(true);

  // Calculate remaining invitations and permission when relevant data changes
  $effect(() => {
    // Calculate remaining invitations
    if (!props.subscriptionLimits || props.subscriptionLimits.maxUsers === 0) {
      remainingInvitations = Infinity;
    } else {
      const pendingCount = pendingInvitations.length;
      remainingInvitations = Math.max(
        0,
        props.subscriptionLimits.maxUsers -
          props.subscriptionLimits.currentUserCount -
          pendingCount
      );
    }

    // Calculate if invitations can be sent
    if (!props.subscriptionLimits) {
      canSendInvitations = true;
    } else {
      // Check if user has invitation capability from subscription
      if (!props.subscriptionLimits.canInviteUsers) {
        canSendInvitations = false;
      } else {
        // Check if user hasn't reached their limit
        if (props.subscriptionLimits.maxUsers > 0) {
          canSendInvitations = remainingInvitations > 0;
        } else {
          canSendInvitations = true;
        }
      }
    }
  });

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
  }

  async function sendInvitation() {
    if (!email || !selectedRoleId || !props.resourceId) {
      error = "Please fill in all required fields";
      return;
    }

    if (!canSendInvitations) {
      error = props.subscriptionLimits?.maxUsers
        ? `You've reached the maximum number of users (${props.subscriptionLimits.maxUsers}) for your subscription plan.`
        : "Your subscription doesn't allow sending invitations.";
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

      const response = await fetch(`${API_BASE_URL}/invitations`, {
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
      let endpoint = `${API_BASE_URL}/invitations?${props.resourceType}Id=${props.resourceId}`;

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
        `${API_BASE_URL}/invitations/${invitationId}/revoke`,
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

    {#if props.subscriptionLimits && props.subscriptionLimits.maxUsers > 0}
      <!-- Apply styling from TeamMembersList -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h4 class="text-sm font-medium">Available Invitations</h4>
          <p class="text-sm text-muted-foreground">
            {props.subscriptionLimits.currentUserCount +
              pendingInvitations.length} of {props.subscriptionLimits.maxUsers} seats
            used
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="w-32 bg-muted rounded-full h-2">
            <div
              class="h-2 rounded-full {remainingInvitations === 0
                ? 'bg-red-500'
                : remainingInvitations <= 1
                  ? 'text-amber-500'
                  : 'bg-green-500'}"
              style="width: {Math.min(
                100,
                ((props.subscriptionLimits.currentUserCount +
                  pendingInvitations.length) /
                  props.subscriptionLimits.maxUsers) *
                  100
              )}%"
            ></div>
          </div>

          <span
            class="text-xs font-medium {remainingInvitations === 0
              ? 'text-red-500'
              : remainingInvitations <= 1
                ? 'text-amber-500'
                : 'text-green-500'}"
          >
            {remainingInvitations}
            {remainingInvitations === 1 ? "seat" : "seats"} remaining
          </span>
        </div>
      </div>
    {/if}

    <form
      class="space-y-4 border-2 dark:border-dark-border p-4 rounded-md"
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
            class="border-2  dark:border-dark-border"
            required
            disabled={!canSendInvitations}
          />
        </div>

        <div class="space-y-2">
          <Label for="role">Role</Label>
          <select
            id="role"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2"
            required
            disabled={!canSendInvitations}
          >
            <option value="" disabled>Select role...</option>
            {#each availableRoles as role}
              <option value={role.id}>{role.name}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2 flex items-end">
          <Button
            type="submit"
            disabled={isLoading || !canSendInvitations}
            class="w-full"
          >
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

      {#if !canSendInvitations && props.subscriptionLimits?.maxUsers > 0}
        <div
          class="flex items-start gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md"
        >
          <Info class="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span class="text-sm">
            You've reached your maximum of {props.subscriptionLimits.maxUsers} users
            for the {props.subscriptionLimits.subscriptionPlan} plan.
            {#if props.subscriptionLimits.subscriptionPlan === "Enterprise"}
              Please contact support to adjust your seat count.
            {:else if props.subscriptionLimits.subscriptionPlan === "Quester Pro"}
              Upgrade to Quester Team for up to 5 users.
            {:else if props.subscriptionLimits.subscriptionPlan === "Quester Team"}
              Please contact support to discuss enterprise options for larger
              teams.
            {:else}
              // Default / Research Explorer Upgrade to Quester Pro for up to 2
              users or Quester Team for up to 5 users.
            {/if}
          </span>
        </div>
      {/if}

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
      <div class="text-center p-6 border-2 dark:border-dark-border rounded-md">
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
        class="text-center p-6 border-2 dark:border-dark-border rounded-md text-muted-foreground"
      >
        No pending invitations
      </div>
    {:else}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Email</Table.Head>
            <Table.Head>Role</Table.Head>
            <Table.Head>Sent</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each pendingInvitations as invitation (invitation.id)}
            <Table.Row>
              <Table.Cell>
                <div class="flex items-center gap-2">
                  <Mail class="h-4 w-4 text-muted-foreground" />
                  {invitation.email}
                </div>
              </Table.Cell>
              <Table.Cell>
                <Badge variant="secondary">
                  {(props.resourceType === "organization"
                    ? invitation.accessMapping?.organization?.roleName
                    : props.resourceType === "department"
                      ? invitation.accessMapping?.departments?.find(
                          (d: any) => d.id === props.resourceId
                        )?.roleName
                      : props.resourceType === "project"
                        ? invitation.accessMapping?.projects?.find(
                            (p: any) => p.id === props.resourceId
                          )?.roleName
                        : undefined) || "Member"}
                </Badge>
              </Table.Cell>
              <Table.Cell class="text-muted-foreground">
                {new Date(invitation.createdAt).toLocaleDateString()}
              </Table.Cell>
              <Table.Cell class="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => revokeInvitation(invitation.id)}
                  class="h-8 px-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                >
                  <X class="h-4 w-4" />
                  <span class="sr-only">Revoke invitation</span>
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </div>
</div>

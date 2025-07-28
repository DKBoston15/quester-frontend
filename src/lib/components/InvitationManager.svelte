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
  import { api } from "$lib/services/api-client";
  import TeamSizeIndicator from "$lib/components/TeamSizeIndicator/TeamSizeIndicator.svelte";
  import { toast } from "svelte-sonner";

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
  
  // Use derived for validation instead of effects to prevent loops
  const emailError = $derived(() => {
    if (!email || email.length === 0) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : "Please enter a valid email address";
  });

  const roleError = $derived(() => {
    if (selectedRoleId === "" && availableRoles().length > 0) {
      return "Please select a role";
    }
    return null;
  });

  // API response state
  let pendingInvitations = $state<any[]>([]);
  let invitationsLoading = $state(false);
  let invitationsError = $state<string | null>(null);

  // Use $derived for computed values to avoid race conditions
  const remainingInvitations = $derived(() => {
    if (!props.subscriptionLimits || props.subscriptionLimits.maxUsers === 0) {
      return Infinity;
    }
    const pendingCount = pendingInvitations.length;
    return Math.max(
      0,
      props.subscriptionLimits.maxUsers -
        props.subscriptionLimits.currentUserCount -
        pendingCount
    );
  });

  const canSendInvitations = $derived(() => {
    if (!props.subscriptionLimits) {
      return true;
    }
    
    // Check if user has invitation capability from subscription
    if (!props.subscriptionLimits.canInviteUsers) {
      return false;
    }
    
    // Check if user hasn't reached their limit
    if (props.subscriptionLimits.maxUsers > 0) {
      return remainingInvitations > 0;
    }
    
    return true;
  });

  type Role = { id: string; name: string };
  
  // Use $derived for available roles to prevent infinite loops
  const availableRoles = $derived(() => {
    if (
      props.resourceType === "organization" &&
      teamManagement.organizationStructure
    ) {
      if (teamManagement.organizationStructure.availableRoles) {
        return teamManagement.organizationStructure.availableRoles;
      } else if (teamManagement.organizationStructure.users) {
        // Extract unique roles from user data if available roles not present
        const uniqueRoles = new Map<string, Role>();
        teamManagement.organizationStructure.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });
        return Array.from(uniqueRoles.values());
      }
    } else if (
      props.resourceType === "department" &&
      teamManagement.departmentStructure
    ) {
      if (teamManagement.departmentStructure.availableRoles) {
        return teamManagement.departmentStructure.availableRoles;
      } else if (teamManagement.departmentStructure.users) {
        const uniqueRoles = new Map<string, Role>();
        teamManagement.departmentStructure.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });
        return Array.from(uniqueRoles.values());
      }
    } else if (props.resourceType === "project" && teamManagement.projectTeam) {
      if (teamManagement.projectTeam.availableRoles) {
        return teamManagement.projectTeam.availableRoles;
      } else if (teamManagement.projectTeam.users) {
        const uniqueRoles = new Map<string, Role>();
        teamManagement.projectTeam.users.forEach((user: any) => {
          if (user.role && user.role.id && user.role.name) {
            uniqueRoles.set(user.role.id, user.role);
          }
        });
        return Array.from(uniqueRoles.values());
      }
    }
    
    return [];
  });

  // Auto-select default role when available roles change (with guard to prevent loops)
  let hasAutoSelectedRole = $state(false);
  $effect(() => {
    const roles = availableRoles(); // Call the derived function
    // Only auto-select once and when we have roles but no selection
    if (roles.length > 0 && !selectedRoleId && !hasAutoSelectedRole) {
      // Try to find a "Member" role as default
      const memberRole = roles.find(
        (r) => r.name.toLowerCase() === "member"
      );
      selectedRoleId = memberRole ? memberRole.id : roles[0].id;
      hasAutoSelectedRole = true;
    }
    
    // Reset the guard when roles change completely
    if (roles.length === 0 && hasAutoSelectedRole) {
      hasAutoSelectedRole = false;
    }
  });

  async function sendInvitation() {
    // Clear previous states
    error = null;
    success = null;

    // Validate form
    if (!email || !selectedRoleId || !props.resourceId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (emailError() || roleError()) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    if (!canSendInvitations) {
      const message = props.subscriptionLimits?.maxUsers
        ? `You've reached the maximum number of users (${props.subscriptionLimits.maxUsers}) for your subscription plan.`
        : "Your subscription doesn't allow sending invitations.";
      toast.error(message);
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

      // Use centralized API client
      const response = await api.post(`/invitations`, payload);

      // Response from api client is already parsed JSON

      // On success
      toast.success(`Invitation sent to ${email}`);
      email = "";
      selectedRoleId = "";
      props.onInviteSent();

      // Refresh the invitations list
      await loadPendingInvitations();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      isLoading = false;
    }
  }

  async function loadPendingInvitations() {
    if (!props.resourceId) return;

    invitationsLoading = true;
    invitationsError = null;

    try {
      // Use centralized API client with query params
      const endpoint = `/invitations?${props.resourceType}Id=${props.resourceId}`;
      const data = await api.get(endpoint);
      
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
      // Use centralized API client for revoke
      await api.post(`/invitations/${invitationId}/revoke`);

      // Filter out the revoked invitation from local state
      pendingInvitations = pendingInvitations.filter(
        (inv) => inv.id !== invitationId
      );

      // Show success message
      toast.success("Invitation revoked successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke invitation";
      toast.error(message);
    }
  }

  // Load pending invitations when component mounts or resourceId changes
  // Use a guard to prevent infinite loops
  let lastLoadedResourceId = $state<string | null>(null);
  $effect(() => {
    if (props.resourceId && props.resourceId !== lastLoadedResourceId) {
      lastLoadedResourceId = props.resourceId;
      loadPendingInvitations();
    }
  });
</script>

<div class="space-y-8">
  <!-- Send invitation form -->
  <div>
    <h3 class="text-lg font-medium mb-4">Send New Invitation</h3>

    {#if props.subscriptionLimits && props.subscriptionLimits.maxUsers > 0}
      <div class="mb-4">
        <TeamSizeIndicator 
          currentCount={props.subscriptionLimits.currentUserCount + pendingInvitations.length}
          maxUsers={props.subscriptionLimits.maxUsers}
          subscriptionPlan={props.subscriptionLimits.subscriptionPlan}
          showAlerts={false}
        />
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
            class="border-2 dark:border-dark-border {emailError() ? 'border-destructive' : ''}"
            required
            disabled={!canSendInvitations}
          />
          {#if emailError()}
            <p class="text-sm text-destructive">{emailError()}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="role">Role</Label>
          <select
            id="role"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2 {roleError() ? 'border-destructive' : ''}"
            required
            disabled={!canSendInvitations}
          >
            <option value="" disabled>Select role...</option>
            {#each availableRoles() as role}
              <option value={role.id}>{role.name}</option>
            {/each}
          </select>
          {#if roleError()}
            <p class="text-sm text-destructive">{roleError()}</p>
          {/if}
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

    </form>
  </div>

  <!-- Pending invitations -->
  <div>
    <h3 class="text-lg font-medium mb-4">Pending Invitations</h3>
    {#if invitationsLoading}
      <div class="text-center p-6 border-2 dark:border-dark-border rounded-md">
        <div class="space-y-3">
          <div
            class="animate-spin inline-block h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
          ></div>
          <div class="space-y-1">
            <p class="font-medium">Loading Pending Invitations</p>
            <p class="text-sm text-muted-foreground">Fetching invitation status from server...</p>
          </div>
        </div>
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

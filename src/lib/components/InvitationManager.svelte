<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Badge } from "$lib/components/ui/badge";
  import * as Table from "$lib/components/ui/table";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Mail, Send, X, Info } from "lucide-svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { api } from "$lib/services/api-client";
  import TeamSizeIndicator from "$lib/components/TeamSizeIndicator/TeamSizeIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, values?: Record<string, any>) => {
    const translate = get(_);
    return values ? translate(key, { values }) : translate(key);
  };

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

  // Revoke confirmation dialog state
  let revokeDialogOpen = $state(false);
  let invitationToRevoke = $state<string | null>(null);
  let revokeEmail = $state<string | null>(null);

  // Use derived for validation instead of effects to prevent loops
  const emailError = $derived(() => {
    if (!email || email.length === 0) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : t("invitations.enterValidEmail");
  });

  const roleError = $derived(() => {
    if (selectedRoleId === "" && availableRoles().length > 0) {
      return t("invitations.selectRole");
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
      return remainingInvitations() > 0;
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

  // Derived users list for current resource
  const resourceUsers = $derived(() => {
    if (props.resourceType === "organization") {
      return teamManagement.organizationStructure?.users || [];
    }
    if (props.resourceType === "department") {
      return teamManagement.departmentStructure?.users || [];
    }
    if (props.resourceType === "project") {
      return teamManagement.projectTeam?.users || [];
    }
    return [];
  });

  // Normalize email for comparisons
  const normalizedEmail = $derived(() => (email || "").trim().toLowerCase());

  // Prevent inviting users already invited or already members
  const isAlreadyInvited = $derived(() => {
    if (!normalizedEmail()) return false;
    return pendingInvitations.some(
      (inv: any) => String(inv.email || "").toLowerCase() === normalizedEmail()
    );
  });

  const isAlreadyMember = $derived(() => {
    if (!normalizedEmail()) return false;
    const users = resourceUsers();
    return users.some(
      (u: any) => String(u?.email || "").toLowerCase() === normalizedEmail()
    );
  });

  const duplicateInviteError = $derived(() => {
    if (!normalizedEmail() || emailError()) return null;
    if (isAlreadyMember())
      return t("invitations.alreadyMember");
    if (isAlreadyInvited())
      return t("invitations.alreadyInvited");
    return null;
  });

  // Auto-select default role when available roles change (with guard to prevent loops)
  let hasAutoSelectedRole = $state(false);
  $effect(() => {
    const roles = availableRoles(); // Call the derived function
    // Only auto-select once and when we have roles but no selection
    if (roles.length > 0 && !selectedRoleId && !hasAutoSelectedRole) {
      // Try to find a "Member" role as default
      const memberRole = roles.find(
        (r: Role) => r.name.toLowerCase() === "member"
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
      toast.error(t("invitations.fillRequiredFields"));
      return;
    }

    if (emailError() || roleError()) {
      toast.error(t("invitations.fixValidationErrors"));
      return;
    }

    if (duplicateInviteError()) {
      toast.error(duplicateInviteError() as string);
      return;
    }

    if (!canSendInvitations) {
      const message = props.subscriptionLimits?.maxUsers
        ? t("invitations.maxUsersReached", { max: props.subscriptionLimits.maxUsers })
        : t("invitations.subscriptionNoInvites");
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
      toast.success(t("invitations.invitationSentTo", { email }));
      email = "";
      selectedRoleId = "";
      props.onInviteSent();

      // Refresh the invitations list
      await loadPendingInvitations();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("invitations.sendFailed");
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
          : t("invitations.loadFailed");
      pendingInvitations = [];
    } finally {
      invitationsLoading = false;
    }
  }

  function openRevokeDialog(invitationId: string, invitationEmail: string) {
    invitationToRevoke = invitationId;
    revokeEmail = invitationEmail;
    revokeDialogOpen = true;
  }

  function closeRevokeDialog() {
    revokeDialogOpen = false;
    invitationToRevoke = null;
    revokeEmail = null;
  }

  async function confirmRevoke() {
    if (!invitationToRevoke) return;

    try {
      // Use centralized API client for revoke
      await api.post(`/invitations/${invitationToRevoke}/revoke`);

      // Filter out the revoked invitation from local state
      pendingInvitations = pendingInvitations.filter(
        (inv) => inv.id !== invitationToRevoke
      );

      // Show success message
      toast.success(t("invitations.revokedSuccess"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("invitations.revokeFailed");
      toast.error(message);
    } finally {
      closeRevokeDialog();
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
    <h3 class="text-lg font-medium mb-4">{$_("invitations.sendNewInvitation")}</h3>

    {#if props.subscriptionLimits && props.subscriptionLimits.maxUsers > 0}
      <div class="mb-4">
        <TeamSizeIndicator
          currentCount={props.subscriptionLimits.currentUserCount +
            pendingInvitations.length}
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
          <Label for="email">{$_("invitations.emailAddress")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={$_("invitations.emailPlaceholder")}
            bind:value={email}
            class="border-2 dark:border-dark-border {emailError() ||
            duplicateInviteError()
              ? 'border-destructive'
              : ''}"
            required
            disabled={!canSendInvitations}
          />
          {#if emailError()}
            <p class="text-sm text-destructive">{emailError()}</p>
          {/if}
          {#if !emailError() && duplicateInviteError()}
            <p class="text-sm text-destructive">{duplicateInviteError()}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="role">{$_("invitations.role")}</Label>
          <select
            id="role"
            bind:value={selectedRoleId}
            class="w-full rounded-md border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2 {roleError()
              ? 'border-destructive'
              : ''}"
            required
            disabled={!canSendInvitations}
          >
            <option value="" disabled>{$_("invitations.selectRolePlaceholder")}</option>
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
            disabled={isLoading ||
              !canSendInvitations ||
              !!emailError() ||
              !!roleError() ||
              !!duplicateInviteError()}
            class="w-full"
          >
            {#if isLoading}
              <div
                class="h-4 w-4 mr-2 border-2 border-t-transparent rounded-full animate-spin"
              ></div>
              {$_("invitations.sending")}
            {:else}
              <Send class="h-4 w-4 mr-2" />
              {$_("invitations.sendInvitation")}
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
            {$_("invitations.maxUsersForPlan", { max: props.subscriptionLimits.maxUsers, plan: props.subscriptionLimits.subscriptionPlan })}
            {#if props.subscriptionLimits.subscriptionPlan === "Enterprise"}
              {$_("invitations.contactSupportSeats")}
            {:else if props.subscriptionLimits.subscriptionPlan === "Quester Pro"}
              {$_("invitations.upgradeToTeam")}
            {:else if props.subscriptionLimits.subscriptionPlan === "Quester Team"}
              {$_("invitations.contactSupportEnterprise")}
            {:else}
              {$_("invitations.upgradeOptions")}
            {/if}
          </span>
        </div>
      {/if}
    </form>
  </div>

  <!-- Pending invitations -->
  <div>
    <h3 class="text-lg font-medium mb-4">{$_("invitations.pendingInvitations")}</h3>
    {#if invitationsLoading}
      <div class="text-center p-6 border-2 dark:border-dark-border rounded-md">
        <div class="space-y-3">
          <div
            class="animate-spin inline-block h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
          ></div>
          <div class="space-y-1">
            <p class="font-medium">{$_("invitations.loadingPending")}</p>
            <p class="text-sm text-muted-foreground">
              {$_("invitations.fetchingStatus")}
            </p>
          </div>
        </div>
      </div>
    {:else if invitationsError}
      <div
        class="text-center p-6 border-2 border-red-500 dark:border-red-500/70 rounded-md text-red-500"
      >
        {invitationsError}
        <Button variant="outline" onclick={loadPendingInvitations} class="mt-2">
          {$_("common.retry")}
        </Button>
      </div>
    {:else if pendingInvitations.length === 0}
      <div
        class="text-center p-6 border-2 dark:border-dark-border rounded-md text-muted-foreground"
      >
        {$_("invitations.noPending")}
      </div>
    {:else}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>{$_("invitations.tableEmail")}</Table.Head>
            <Table.Head>{$_("invitations.tableRole")}</Table.Head>
            <Table.Head>{$_("invitations.tableSent")}</Table.Head>
            <Table.Head class="text-right">{$_("invitations.tableActions")}</Table.Head>
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
                        : undefined) || $_('invitationManager.member')}
                </Badge>
              </Table.Cell>
              <Table.Cell class="text-muted-foreground">
                {new Date(invitation.createdAt).toLocaleDateString()}
              </Table.Cell>
              <Table.Cell class="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => openRevokeDialog(invitation.id, invitation.email)}
                  class="h-8 px-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                >
                  <X class="h-4 w-4" />
                  <span class="sr-only">{$_('srOnly.revokeInvitation')}</span>
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </div>
</div>

<!-- Revoke Confirmation Dialog -->
<AlertDialog.Root bind:open={revokeDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{$_('invitations.revokeConfirmTitle')}</AlertDialog.Title>
      <AlertDialog.Description>
        {$_('invitations.revokeConfirmMessage', { values: { email: revokeEmail || '' } })}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeRevokeDialog}>
        {$_('common.cancel')}
      </AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmRevoke} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {$_('invitations.revokeConfirmButton')}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

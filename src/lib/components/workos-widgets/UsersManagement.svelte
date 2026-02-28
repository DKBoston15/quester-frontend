<script lang="ts">
  import type { ResourcePermissions } from "$lib/types/auth";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Table from "$lib/components/ui/table";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Select from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Trash2, Send, X, RefreshCw, AlertCircle } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import {
    fetchOrganizationTeam,
    fetchInvitations,
    sendInvitation,
    revokeInvitation,
    updateMemberRole,
    removeMember,
    fetchAvailableRoles,
    fetchInvitationLimits,
    type TeamMember,
    type PendingInvitation,
    type AvailableRole,
  } from "$lib/services/workos-widget-api";
  import { toast } from "svelte-sonner";

  const {
    organizationId,
    permissions,
    currentUserId,
    onMembershipChange,
  }: {
    organizationId: string;
    permissions: ResourcePermissions;
    currentUserId?: string;
    onMembershipChange?: () => void;
  } = $props();

  // State
  let members = $state<TeamMember[]>([]);
  let invitations = $state<PendingInvitation[]>([]);
  let availableRoles = $state<AvailableRole[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Invitation form state
  let inviteEmail = $state("");
  let inviteRoleId = $state("");
  let isSending = $state(false);
  let emailError = $state<string | null>(null);

  // Limits
  let inviteLimits = $state({ canInvite: false, used: 0, limit: 0, remaining: 0 });

  // Remove confirmation
  let memberToRemove = $state<TeamMember | null>(null);
  let isRemoving = $state(false);

  // Role change tracking
  let changingRoleFor = $state<string | null>(null);

  // Search
  let searchQuery = $state("");

  const filteredMembers = $derived(
    searchQuery
      ? members.filter(
          (m) =>
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : members
  );

  const pendingInvitations = $derived(
    invitations.filter((inv) => inv.status === "pending")
  );

  async function loadData() {
    isLoading = true;
    error = null;
    try {
      const [teamData, invData, roles, limits] = await Promise.all([
        fetchOrganizationTeam(organizationId),
        fetchInvitations(organizationId),
        fetchAvailableRoles("organization"),
        fetchInvitationLimits(),
      ]);

      members = teamData.organization?.users ?? [];
      invitations = invData ?? [];
      availableRoles = roles ?? [];
      inviteLimits = limits;

      // Set default invite role to first available role
      if (availableRoles.length > 0 && !inviteRoleId) {
        const memberRole = availableRoles.find((r) => r.name.toLowerCase() === "member");
        inviteRoleId = memberRole?.id ?? availableRoles[0].id;
      }
    } catch (err: any) {
      error = err.message || $_("errors.failedToLoadTeam");
    } finally {
      isLoading = false;
    }
  }

  // Load data when organizationId changes
  $effect(() => {
    if (organizationId) {
      loadData();
    }
  });

  function getMemberRole(member: TeamMember): string {
    return member.$extras?.roleName || member.role?.name || $_("common.unknown");
  }

  function getMemberRoleId(member: TeamMember): string {
    return member.$extras?.roleId || member.role?.id || member.roleId || "";
  }

  function isCurrentUser(member: TeamMember): boolean {
    return currentUserId ? String(member.id) === currentUserId : false;
  }

  function validateEmail(email: string): boolean {
    emailError = null;
    if (!email) {
      emailError = $_("validation.emailRequired");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailError = $_("validation.invalidEmail");
      return false;
    }
    // Check duplicate
    const existingMember = members.find(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    );
    if (existingMember) {
      emailError = $_("teamManagement.userAlreadyMember");
      return false;
    }
    const existingInvite = pendingInvitations.find(
      (inv) => inv.email.toLowerCase() === email.toLowerCase()
    );
    if (existingInvite) {
      emailError = $_("teamManagement.userAlreadyInvited");
      return false;
    }
    return true;
  }

  async function handleSendInvitation() {
    if (!validateEmail(inviteEmail)) return;
    if (!inviteRoleId) return;

    isSending = true;
    try {
      await sendInvitation({
        email: inviteEmail,
        organizationId,
        organizationRoleId: inviteRoleId,
      });
      toast.success($_("teamManagement.invitationSent"));
      inviteEmail = "";
      await loadData();
      onMembershipChange?.();
    } catch (err: any) {
      toast.error(err.message || $_("errors.failedToSendInvitation"));
    } finally {
      isSending = false;
    }
  }

  async function handleRevokeInvitation(invitation: PendingInvitation) {
    try {
      await revokeInvitation(invitation.id);
      toast.success($_("teamManagement.invitationRevoked"));
      await loadData();
    } catch (err: any) {
      toast.error(err.message || $_("errors.failedToRevokeInvitation"));
    }
  }

  async function handleRoleChange(member: TeamMember, newRoleId: string) {
    changingRoleFor = member.id;
    try {
      await updateMemberRole(organizationId, member.id, newRoleId);
      toast.success($_("teamManagement.roleUpdated"));
      await loadData();
      onMembershipChange?.();
    } catch (err: any) {
      toast.error(err.message || $_("errors.failedToUpdateRole"));
    } finally {
      changingRoleFor = null;
    }
  }

  async function confirmRemoveMember() {
    if (!memberToRemove) return;
    isRemoving = true;
    try {
      await removeMember(organizationId, memberToRemove.id);
      toast.success($_("teamManagement.memberRemoved"));
      memberToRemove = null;
      await loadData();
      onMembershipChange?.();
    } catch (err: any) {
      toast.error(err.message || $_("errors.failedToRemoveMember"));
    } finally {
      isRemoving = false;
    }
  }
</script>

{#if error}
  <Alert variant="destructive">
    <AlertCircle class="h-4 w-4" />
    <AlertDescription>{error}</AlertDescription>
    <Button variant="outline" size="sm" class="ml-auto" onclick={loadData}>
      <RefreshCw class="h-3 w-3 mr-1" />
      {$_("common.retry")}
    </Button>
  </Alert>
{:else if isLoading}
  <div class="space-y-3">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-48 w-full" />
  </div>
{:else}
  <Tabs.Root value="members">
    <Tabs.List class="w-full">
      <Tabs.Trigger value="members" class="flex-1">
        {$_("teamManagement.members")} ({members.length})
      </Tabs.Trigger>
      <Tabs.Trigger value="invitations" class="flex-1">
        {$_("teamManagement.invitations")} ({pendingInvitations.length})
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Members Tab -->
    <Tabs.Content value="members" class="mt-4 space-y-4">
      <!-- Search -->
      <Input
        placeholder={$_("teamManagement.searchMembers")}
        bind:value={searchQuery}
        class="max-w-sm"
      />

      <div class="rounded-md border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>{$_("teamManagement.name")}</Table.Head>
              <Table.Head>{$_("teamManagement.email")}</Table.Head>
              <Table.Head>{$_("teamManagement.role")}</Table.Head>
              {#if permissions.canChangeRoles || permissions.canManage}
                <Table.Head class="w-[80px]"></Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each filteredMembers as member (member.id)}
              <Table.Row>
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">
                      {member.firstName} {member.lastName}
                    </span>
                    {#if isCurrentUser(member)}
                      <Badge variant="secondary" class="text-[10px]">
                        {$_("teamManagement.you")}
                      </Badge>
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-muted-foreground">
                  {member.email}
                </Table.Cell>
                <Table.Cell>
                  {#if permissions.canChangeRoles && !isCurrentUser(member)}
                    <Select.Root
                      type="single"
                      value={getMemberRoleId(member)}
                      onValueChange={(val) => {
                        if (val) handleRoleChange(member, val);
                      }}
                      disabled={changingRoleFor === member.id}
                    >
                      <Select.Trigger class="h-8 w-32">
                        {#if changingRoleFor === member.id}
                          <span class="text-xs">{$_("common.saving")}</span>
                        {:else}
                          {getMemberRole(member)}
                        {/if}
                      </Select.Trigger>
                      <Select.Content>
                        {#each availableRoles as role (role.id)}
                          <Select.Item value={role.id}>
                            {role.name}
                          </Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  {:else}
                    <Badge variant="outline">{getMemberRole(member)}</Badge>
                  {/if}
                </Table.Cell>
                {#if permissions.canChangeRoles || permissions.canManage}
                  <Table.Cell>
                    {#if permissions.canManage && !isCurrentUser(member)}
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive hover:text-destructive"
                        onclick={() => (memberToRemove = member)}
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    {/if}
                  </Table.Cell>
                {/if}
              </Table.Row>
            {/each}

            {#if filteredMembers.length === 0}
              <Table.Row>
                <Table.Cell colspan={4} class="text-center text-muted-foreground py-8">
                  {searchQuery ? $_("teamManagement.noMatchingMembers") : $_("teamManagement.noMembers")}
                </Table.Cell>
              </Table.Row>
            {/if}
          </Table.Body>
        </Table.Root>
      </div>
    </Tabs.Content>

    <!-- Invitations Tab -->
    <Tabs.Content value="invitations" class="mt-4 space-y-4">
      {#if permissions.canInviteUsers}
        <!-- Invite Form -->
        <div class="flex items-end gap-2">
          <div class="flex-1 space-y-1">
            <label for="invite-email" class="text-sm font-medium">
              {$_("teamManagement.inviteByEmail")}
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder={$_("teamManagement.emailPlaceholder")}
              bind:value={inviteEmail}
              oninput={() => (emailError = null)}
              class={emailError ? "border-destructive" : ""}
            />
            {#if emailError}
              <p class="text-xs text-destructive">{emailError}</p>
            {/if}
          </div>
          <div class="space-y-1">
            <label for="invite-role" class="text-sm font-medium">
              {$_("teamManagement.role")}
            </label>
            <Select.Root
              type="single"
              value={inviteRoleId}
              onValueChange={(val) => {
                if (val) inviteRoleId = val;
              }}
            >
              <Select.Trigger class="w-32" id="invite-role">
                {availableRoles.find((r) => r.id === inviteRoleId)?.name || $_("teamManagement.selectRole")}
              </Select.Trigger>
              <Select.Content>
                {#each availableRoles as role (role.id)}
                  <Select.Item value={role.id}>{role.name}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
          <Button
            onclick={handleSendInvitation}
            disabled={isSending || !inviteLimits.canInvite || inviteLimits.remaining <= 0}
          >
            <Send class="h-4 w-4 mr-1" />
            {isSending ? $_("common.sending") : $_("teamManagement.sendInvite")}
          </Button>
        </div>

        {#if inviteLimits.limit !== Infinity && inviteLimits.limit > 0}
          <p class="text-xs text-muted-foreground">
            {$_("teamManagement.seatsUsed", {
              values: { used: inviteLimits.used, limit: inviteLimits.limit },
            })}
          </p>
        {/if}
      {/if}

      <!-- Pending Invitations Table -->
      <div class="rounded-md border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>{$_("teamManagement.email")}</Table.Head>
              <Table.Head>{$_("teamManagement.role")}</Table.Head>
              <Table.Head>{$_("teamManagement.sentAt")}</Table.Head>
              {#if permissions.canInviteUsers}
                <Table.Head class="w-[80px]"></Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each pendingInvitations as invitation (invitation.id)}
              <Table.Row>
                <Table.Cell class="font-medium">{invitation.email}</Table.Cell>
                <Table.Cell>
                  <Badge variant="outline">
                    {invitation.accessMapping?.organization?.roleName || $_("common.unknown")}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-muted-foreground">
                  {new Date(invitation.createdAt).toLocaleDateString()}
                </Table.Cell>
                {#if permissions.canInviteUsers}
                  <Table.Cell>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-destructive hover:text-destructive"
                      onclick={() => handleRevokeInvitation(invitation)}
                    >
                      <X class="h-4 w-4" />
                    </Button>
                  </Table.Cell>
                {/if}
              </Table.Row>
            {/each}

            {#if pendingInvitations.length === 0}
              <Table.Row>
                <Table.Cell colspan={4} class="text-center text-muted-foreground py-8">
                  {$_("teamManagement.noPendingInvitations")}
                </Table.Cell>
              </Table.Row>
            {/if}
          </Table.Body>
        </Table.Root>
      </div>
    </Tabs.Content>
  </Tabs.Root>

  <!-- Remove Member Confirmation Dialog -->
  <AlertDialog.Root open={!!memberToRemove} onOpenChange={(open) => { if (!open) memberToRemove = null; }}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>{$_("teamManagement.removeMemberTitle")}</AlertDialog.Title>
        <AlertDialog.Description>
          {$_("teamManagement.removeMemberConfirm", {
            values: {
              name: memberToRemove
                ? `${memberToRemove.firstName} ${memberToRemove.lastName}`
                : "",
            },
          })}
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>{$_("common.cancel")}</AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={confirmRemoveMember}
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isRemoving ? $_("common.removing") : $_("teamManagement.remove")}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}

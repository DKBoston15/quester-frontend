<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Table from "$lib/components/ui/table";
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import {
    UserCog,
    Search,
    UserMinus,
    MoreHorizontal,
    Building,
    Loader2,
  } from "lucide-svelte";
  import type { User } from "$lib/types/auth";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { auth } from "$lib/stores/AuthStore";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import { toast } from "svelte-sonner";
  import { fly } from "svelte/transition";
  import { onDestroy } from "svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, values?: Record<string, any>) => {
    const translate = get(_);
    return values ? translate(key, { values }) : translate(key);
  };

  // Define a type for team members that includes role information
  type TeamMember = User & {
    role?: { id: string; name: string };
    // Support for direct roleId property
    roleId?: string;
    // Support for pivot table data
    pivot?: {
      role_id?: string;
      roleId?: string;
    };
    // Support for role relations arrays
    organizationRoles?: Array<{
      role?: {
        id: string;
        name: string;
      };
    }>;
    departmentRoles?: Array<{
      role?: {
        id: string;
        name: string;
      };
    }>;
    projectRoles?: Array<{
      role?: {
        id: string;
        name: string;
      };
    }>;
    // Support for extras added by the backend
    $extras?: {
      roleName?: string;
    };
  };

  const props = $props<{
    users: TeamMember[]; // Using our defined type for team members
    resourceType: "organization" | "department" | "project";
    canChangeRoles: boolean;
    onUserSelect: (userId: string) => void;
    subscriptionLimits?: {
      canInviteUsers: boolean;
      maxUsers: number;
      currentUserCount: number;
      subscriptionPlan: string;
    };
  }>();

  let searchTerm = $state("");
  let debouncedSearchTerm = $state("");
  let isSearching = $state(false);
  let isRemoving = $state<string | null>(null);
  let showDeleteDialog = $state(false);
  let userToRemove = $state<TeamMember | null>(null);
  let searchDebounceTimeout: NodeJS.Timeout | null = null;

  // Function to handle search input changes
  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const newSearchTerm = target.value;

    searchTerm = newSearchTerm;
    isSearching = true;

    // Clear previous timeout
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }

    // Set new timeout
    searchDebounceTimeout = setTimeout(() => {
      debouncedSearchTerm = newSearchTerm;
      isSearching = false;
    }, 300);
  }

  // Cleanup timeout on destroy
  onDestroy(() => {
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }
  });

  // Map of role IDs to readable names (fallback)
  // Note: In production, roleIds should be UUIDs that match the database
  const roleNames: Record<string, string> = {
    // Organization roles
    admin: "Admin",
    member: "Member",
    owner: "Owner",
    // Department roles
    manager: "Manager",
    // Project roles
  };

  // Filter users based on debounced search term
  let filteredUsers = $derived(
    props.users.filter((user: TeamMember) => {
      if (!debouncedSearchTerm) return true;
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const searchLower = debouncedSearchTerm.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    })
  );

  function getRoleName(user: TeamMember): string {
    // Prioritize the roleName from $extras provided by the backend
    if (user.$extras?.roleName) {
      return user.$extras.roleName;
    }

    // Fallback if $extras.roleName is somehow missing (shouldn't happen with backend changes)
    console.warn("Missing $extras.roleName for user:", user);
    return $_('common.unknown');
  }

  function isCurrentUser(user: TeamMember): boolean {
    if (!auth.user) return false;
    // Convert both IDs to strings to ensure comparison works regardless of type
    return String(user.id) === String(auth.user.id);
  }

  // Check if the user is an organization owner
  function isOrganizationOwner(user: TeamMember): boolean {
    if (props.resourceType !== "organization") return false;

    // Check all the places the owner role might be stored

    // 1. Check $extras.roleName
    if (user.$extras?.roleName === "Owner") return true;

    // 2. Check organizationRoles array
    if (user.organizationRoles?.some((role) => role.role?.name === "Owner")) {
      return true;
    }

    // 3. Check direct role property
    if (user.role?.name === "Owner") return true;

    return false;
  }

  // Check if user has org admin privileges but is not a project owner
  function isUsingElevatedPermissions(): boolean {
    // Only relevant for project context
    if (props.resourceType !== "project") return false;

    // Get project info
    const projectTeam = teamManagement.projectTeam;
    if (!projectTeam || !projectTeam.organization) return false;

    const currentUserId = auth.user?.id;
    if (!currentUserId) return false;

    // Check if user is a project member
    const projectUser = projectTeam.users?.find(
      (u: any) => String(u.id) === String(currentUserId)
    );
    if (!projectUser) return false;

    // Get user's project role
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

    // If user is already a project owner, they're not using elevated permissions
    if (projectRoleName === "Owner") return false;

    // Get organization info
    const organizationId = projectTeam.organization.id;
    const orgResources = teamManagement.userResources?.organizations || [];
    const userOrg = orgResources.find((org: any) => org.id === organizationId);

    // Check if user has admin/owner role in the parent organization
    if (
      userOrg &&
      userOrg.organizationRoles &&
      userOrg.organizationRoles.length > 0
    ) {
      const userRole = userOrg.organizationRoles[0];
      return userRole.role?.name === "Admin" || userRole.role?.name === "Owner";
    }

    return false;
  }

  // Check if a user is a project owner
  function isProjectOwner(user: TeamMember): boolean {
    if (props.resourceType !== "project") return false;

    // Check all places role might be stored
    if (user.$extras?.roleName === "Owner") return true;

    if (user.projectRoles?.some((role) => role.role?.name === "Owner")) {
      return true;
    }

    if (user.role?.name === "Owner") return true;

    return false;
  }

  // Check if a user has organization admin/owner role when viewing a project
  function getOrgPrivilegeLevel(user: TeamMember): "Owner" | "Admin" | null {
    // Only relevant for project context
    if (props.resourceType !== "project") return null;

    // Get the parent organization ID from the current project context
    const parentOrganizationId = teamManagement.projectTeam?.organization?.id;
    if (!parentOrganizationId) {
      return null; // Cannot determine without parent org ID
    }

    // First check if the user has organizationRoles property with the parent org's role
    if (user.organizationRoles && Array.isArray(user.organizationRoles)) {
      const orgRole = user.organizationRoles.find((roleRelation: any) => {
        // The organizationRoles array contains the user's roles across all organizations
        // We need to match this with the parent organization
        // Since we're viewing a project, we need to check if this user has a role
        // in the parent organization of the current project
        return (
          roleRelation.role?.name === "Owner" ||
          roleRelation.role?.name === "Admin"
        );
      });

      if (orgRole) {
        return orgRole.role?.name as "Owner" | "Admin";
      }
    }

    // Check if the project team data includes organization role information for users
    // The backend might include this information in the project team response
    if (teamManagement.projectTeam?.users) {
      const projectUser = teamManagement.projectTeam.users.find(
        (u: any) => String(u.id) === String(user.id)
      );

      if (projectUser && projectUser.organizationRole) {
        if (projectUser.organizationRole === "Owner") return "Owner";
        if (projectUser.organizationRole === "Admin") return "Admin";
      }
    }

    // User doesn't have admin/owner role in the parent org
    return null;
  }

  // Count the number of owners in the team
  function countOwners(): number {
    if (props.resourceType !== "organization") return 0;

    return props.users.filter((user: TeamMember) => isOrganizationOwner(user))
      .length;
  }

  async function handleRemoveUser(userId: string) {
    const user = props.users.find((u: TeamMember) => String(u.id) === userId);

    if (!user) return;

    if (props.resourceType === "organization" && isOrganizationOwner(user)) {
      // Only prevent removal if this is the last owner
      if (countOwners() <= 1) {
        toast.error(t("teamMembers.cannotRemoveLastOwner"));
        return;
      }
    }

    // Set the user to remove and show the dialog
    userToRemove = user;
    showDeleteDialog = true;
  }

  async function confirmRemoveUser() {
    if (!userToRemove) return;

    isRemoving = String(userToRemove.id);
    showDeleteDialog = false;

    const success = await teamManagement.removeUser(String(userToRemove.id));
    isRemoving = null;

    if (success) {
      toast.success(
        t("teamMembers.memberRemovedSuccess", { name: `${userToRemove.firstName} ${userToRemove.lastName}` })
      );
    } else {
      toast.error(t("teamMembers.removeFailed") + ": " + teamManagement.error);
    }

    userToRemove = null;
  }
</script>

<div class="space-y-6">
  <!-- Search and header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-medium">{$_("teamMembers.title")}</h3>
    <div class="relative w-64">
      <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={$_("teamMembers.searchPlaceholder")}
        class="pl-8 pr-8"
        value={searchTerm}
        oninput={handleSearchInput}
      />
      {#if isSearching}
        <Loader2
          class="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground"
        />
      {/if}
    </div>
  </div>

  <!-- Members list -->
  <!-- Desktop view -->
  <div class="hidden md:block">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>{$_("teamMembers.tableName")}</Table.Head>
          <Table.Head>{$_("teamMembers.tableEmail")}</Table.Head>
          <Table.Head>{$_("teamMembers.tableRole")}</Table.Head>
          <Table.Head class="text-right">{$_("teamMembers.tableActions")}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if filteredUsers.length === 0}
          <Table.Row>
            <Table.Cell colspan={4} class="p-0">
              <EmptyState
                title={debouncedSearchTerm
                  ? $_("teamMembers.noUsersMatchingSearch")
                  : $_("teamMembers.noMembersYet")}
                description={debouncedSearchTerm
                  ? $_("teamMembers.tryAdjustingSearch")
                  : $_("teamMembers.membersWillAppear")}
                variant={debouncedSearchTerm ? "search-empty" : "data-empty"}
                height="h-[400px]"
              />
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each filteredUsers as user (user.id)}
            <Table.Row>
              <Table.Cell>
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
                  >
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="font-medium">
                      {user.firstName}
                      {user.lastName}
                    </div>
                    {#if isCurrentUser(user)}
                      <Badge variant="outline" class="text-xs">{$_("teamMembers.you")}</Badge>
                    {/if}
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell>{user.email}</Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-1">
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Badge variant="secondary" class="font-medium">
                        {getRoleName(user)}
                      </Badge>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p class="text-xs max-w-xs">
                        {#if getRoleName(user) === "Owner"}
                          {$_("teamMembers.roleOwnerDescription", { values: { resourceType: props.resourceType } })}
                        {:else if getRoleName(user) === "Admin"}
                          {$_("teamMembers.roleAdminDescription", { values: { resourceType: props.resourceType } })}
                        {:else if getRoleName(user) === "Member"}
                          {$_("teamMembers.roleMemberDescription", { values: { resourceType: props.resourceType } })}
                        {:else}
                          {$_("teamMembers.roleGenericDescription", { values: { role: getRoleName(user), resourceType: props.resourceType } })}
                        {/if}
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                  {#if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Owner"}
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Badge
                          variant="outline"
                          class="font-medium text-xs px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                        >
                          <Building class="h-3 w-3 mr-1" />
                          {$_("teamMembers.organizationOwner")}
                        </Badge>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p class="text-xs max-w-xs">
                          {$_("teamMembers.orgOwnerAccessDescription")}
                        </p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {:else if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Admin"}
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Badge
                          variant="outline"
                          class="font-medium text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                        >
                          <Building class="h-3 w-3 mr-1" />
                          {$_("teamMembers.organizationAdmin")}
                        </Badge>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p class="text-xs max-w-xs">
                          {$_("teamMembers.orgAdminAccessDescription")}
                        </p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {/if}
                </div>
              </Table.Cell>
              <Table.Cell class="text-right">
                <div class="flex items-center justify-end gap-2">
                  {#if props.canChangeRoles && !isCurrentUser(user) && (!isOrganizationOwner(user) || (props.resourceType === "organization" && countOwners() > 1))}
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => props.onUserSelect(user.id)}
                      class="h-8 px-2"
                    >
                      <UserCog class="h-4 w-4 mr-1" />
                      {$_("teamMembers.manage")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onclick={() => handleRemoveUser(user.id)}
                      disabled={isRemoving === user.id}
                      class="h-8 px-2"
                    >
                      {#if isRemoving === user.id}
                        <div
                          class="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin"
                        ></div>
                      {:else}
                        <UserMinus class="h-4 w-4" />
                      {/if}
                    </Button>
                  {/if}
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Mobile view -->
  <div class="md:hidden space-y-4">
    {#if filteredUsers.length === 0}
      <EmptyState
        title={debouncedSearchTerm
          ? $_("teamMembers.noUsersMatchingSearch")
          : $_("teamMembers.noMembersYet")}
        description={debouncedSearchTerm
          ? $_("teamMembers.tryAdjustingSearch")
          : $_("teamMembers.membersWillAppear")}
        variant={debouncedSearchTerm ? "search-empty" : "data-empty"}
        height="h-[400px]"
      />
    {:else}
      {#each filteredUsers as user, index (user.id)}
        <div in:fly={{ y: 20, duration: 300, delay: index * 50 }}>
          <Card>
            <CardHeader class="pb-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
                >
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="font-medium">
                      {user.firstName}
                      {user.lastName}
                    </h3>
                    {#if isCurrentUser(user)}
                      <Badge variant="outline" class="text-xs">{$_("teamMembers.you")}</Badge>
                    {/if}
                  </div>
                  <p class="text-sm text-muted-foreground">{user.email}</p>
                </div>
                {#if props.canChangeRoles && !isCurrentUser(user) && (!isOrganizationOwner(user) || (props.resourceType === "organization" && countOwners() > 1))}
                  <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
            </CardHeader>
            <CardContent class="pt-0">
              <div class="grid grid-cols-1 gap-4 text-sm">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{$_("teamMembers.roleLabel")}:</span>
                  <div class="flex items-center gap-1">
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Badge variant="secondary" class="font-medium">
                          {getRoleName(user)}
                        </Badge>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p class="text-xs max-w-xs">
                          {#if getRoleName(user) === "Owner"}
                            {$_("teamMembers.roleOwnerDescription", { values: { resourceType: props.resourceType } })}
                          {:else if getRoleName(user) === "Admin"}
                            {$_("teamMembers.roleAdminDescription", { values: { resourceType: props.resourceType } })}
                          {:else if getRoleName(user) === "Member"}
                            {$_("teamMembers.roleMemberDescription", { values: { resourceType: props.resourceType } })}
                          {:else}
                            {$_("teamMembers.roleGenericDescription", { values: { role: getRoleName(user), resourceType: props.resourceType } })}
                          {/if}
                        </p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                    {#if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Owner"}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <Badge
                            variant="outline"
                            class="font-medium text-xs px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                          >
                            <Building class="h-3 w-3 mr-1" />
                            {$_("teamMembers.organizationOwner")}
                          </Badge>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <p class="text-xs max-w-xs">
                            {$_("teamMembers.orgOwnerAccessDescription")}
                          </p>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    {:else if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Admin"}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <Badge
                            variant="outline"
                            class="font-medium text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                          >
                            <Building class="h-3 w-3 mr-1" />
                            {$_("teamMembers.organizationAdmin")}
                          </Badge>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <p class="text-xs max-w-xs">
                            {$_("teamMembers.orgAdminAccessDescription")}
                          </p>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    {/if}
                  </div>
                </div>
                {#if props.canChangeRoles && !isCurrentUser(user) && (!isOrganizationOwner(user) || (props.resourceType === "organization" && countOwners() > 1))}
                  <div class="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => props.onUserSelect(user.id)}
                      class="flex-1"
                    >
                      <UserCog class="h-4 w-4 mr-1" />
                      {$_("teamMembers.manage")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onclick={() => handleRemoveUser(user.id)}
                      disabled={isRemoving === user.id}
                      class="flex-1"
                    >
                      {#if isRemoving === user.id}
                        <div
                          class="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin"
                        ></div>
                      {:else}
                        <UserMinus class="h-4 w-4 mr-1" />
                        {$_("teamMembers.remove")}
                      {/if}
                    </Button>
                  </div>
                {/if}
              </div>
            </CardContent>
          </Card>
        </div>
      {/each}
    {/if}
  </div>
</div>

<!-- Delete Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{$_("teamMembers.removeDialogTitle")}</AlertDialog.Title>
      <AlertDialog.Description>
        {#if userToRemove && props.resourceType === "project" && isProjectOwner(userToRemove) && isUsingElevatedPermissions()}
          {$_("teamMembers.removeOwnerElevatedWarning")}
        {:else}
          {$_("teamMembers.removeConfirmMessage", { values: { name: `${userToRemove?.firstName} ${userToRemove?.lastName}`, resourceType: props.resourceType } })}
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <div class="flex justify-end gap-2">
        <Button
          variant="outline"
          onclick={() => {
            showDeleteDialog = false;
            userToRemove = null;
          }}
        >
          {$_("common.cancel")}
        </Button>
        <Button variant="destructive" onclick={confirmRemoveUser}>
          {$_("teamMembers.remove")}
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

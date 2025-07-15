<!-- src/routes/components/TeamMembersList.svelte -->
<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Table from "$lib/components/ui/table";
  import { Progress } from "$lib/components/ui/progress";
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import { UserCog, Search, UserMinus, Info, MoreHorizontal, ChevronDown } from "lucide-svelte";
  import type { User } from "$lib/types/auth";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { EmptyState } from "$lib/components/ui/empty-state";

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
  let isRemoving = $state<string | null>(null);
  let showDeleteDialog = $state(false);
  let userToRemove = $state<TeamMember | null>(null);

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

  // Filter users based on search term
  let filteredUsers = $derived(
    props.users.filter((user: TeamMember) => {
      if (!searchTerm) return true;
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    })
  );

  // Calculate users limit information
  let usersRemaining = $state(0);
  let isFull = $state(false);
  let isNearLimit = $state(false);

  $effect(() => {
    if (props.subscriptionLimits && props.subscriptionLimits.maxUsers > 0) {
      usersRemaining = Math.max(
        0,
        props.subscriptionLimits.maxUsers - props.users.length
      );
      isFull = usersRemaining === 0;
      isNearLimit = usersRemaining <= 1;
    } else {
      usersRemaining = Infinity;
      isFull = false;
      isNearLimit = false;
    }
  });

  function getRoleName(user: TeamMember): string {
    // Prioritize the roleName from $extras provided by the backend
    if (user.$extras?.roleName) {
      return user.$extras.roleName;
    }

    // Fallback if $extras.roleName is somehow missing (shouldn't happen with backend changes)
    console.warn("Missing $extras.roleName for user:", user);
    return "Unknown";
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
      // console.warn('Could not determine parent organization ID for project context.');
      return null; // Cannot determine without parent org ID
    }

    // Find the user's role information within the parent organization
    // Check the userResources which contains roles for all accessible resources
    const userOrgResource = teamManagement.userResources?.organizations?.find(
      (org: { id: string; [key: string]: any }) =>
        org.id === parentOrganizationId
    );

    if (!userOrgResource) {
      // This can happen if the current user (e.g., org admin) can see the project,
      // but the specific user being rendered doesn't belong to the parent org
      // in a way that's listed in the current user's own userResources.
      // Or, the user simply isn't in the parent org at all.
      // console.log(`User ${user.id} not found in userResources for org ${parentOrganizationId}`);
      return null;
    }

    // Check the role name attached via $extras from the /resources endpoint
    const orgRoleName = userOrgResource.$extras?.roleName;

    if (orgRoleName === "Owner") {
      return "Owner";
    }
    if (orgRoleName === "Admin") {
      return "Admin";
    }

    // User has a role in the parent org, but it's not Admin or Owner
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
        alert("Cannot remove the last organization owner");
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

    if (!success) {
      alert("Failed to remove user: " + teamManagement.error);
    }

    userToRemove = null;
  }
</script>

<div class="space-y-6">
  <!-- Search and header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-medium">Team Members</h3>
    <div class="relative w-64">
      <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search members..."
        class="pl-8"
        bind:value={searchTerm}
      />
    </div>
  </div>

  <!-- Subscription Limits -->
  {#if props.subscriptionLimits && props.subscriptionLimits.maxUsers > 0}
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-medium">Team Members</h4>
        <p class="text-sm text-muted-foreground">
          {props.users.length} of {props.subscriptionLimits.maxUsers} seats used
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Progress 
          value={Math.min(100, (props.users.length / props.subscriptionLimits.maxUsers) * 100)}
          class="w-32"
        />
        <span class="text-xs font-medium text-muted-foreground">
          {usersRemaining}
          {usersRemaining === 1 ? "seat" : "seats"} remaining
        </span>
      </div>
    </div>

    {#if isFull}
      <Alert variant="destructive">
        <Info class="h-4 w-4" />
        <AlertTitle>User Limit Reached</AlertTitle>
        <AlertDescription>
          You've reached the maximum of {props.subscriptionLimits.maxUsers} users
          for your {props.subscriptionLimits.subscriptionPlan} plan.
          {#if props.subscriptionLimits.subscriptionPlan === "Enterprise"}
            Please contact support to adjust your seat count.
          {:else if props.subscriptionLimits.subscriptionPlan === "Quester Pro"}
            Upgrade to Quester Team to add more team members.
          {:else if props.subscriptionLimits.subscriptionPlan === "Quester Team"}
            Please contact support to discuss enterprise options for larger teams.
          {:else}
            Upgrade your plan to invite users.
          {/if}
        </AlertDescription>
      </Alert>
    {:else if isNearLimit}
      <Alert>
        <Info class="h-4 w-4" />
        <AlertTitle>Almost at User Limit</AlertTitle>
        <AlertDescription>
          You have {usersRemaining}
          {usersRemaining === 1 ? "seat" : "seats"} remaining on your {props
            .subscriptionLimits.subscriptionPlan} plan.
          {#if props.subscriptionLimits.subscriptionPlan === "Enterprise"}
            <!-- No specific message needed when near limit for Enterprise -->
          {:else if props.subscriptionLimits.subscriptionPlan === "Quester Pro"}
            Consider upgrading to Quester Team for up to 5 team members.
          {/if}
        </AlertDescription>
      </Alert>
    {/if}
  {/if}

  <!-- Members list -->
  <!-- Desktop view -->
  <div class="hidden md:block">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head>Email</Table.Head>
          <Table.Head>Role</Table.Head>
          <Table.Head class="text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if filteredUsers.length === 0}
          <Table.Row>
            <Table.Cell colspan="4" class="p-0">
              <EmptyState
                title={searchTerm ? "No users matching your search" : "No team members yet"}
                description={searchTerm ? "Try adjusting your search terms" : "Team members will appear here once added"}
                variant={searchTerm ? "search-empty" : "data-empty"}
                height="h-[400px]"
              />
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each filteredUsers as user (user.id)}
            <Table.Row>
              <Table.Cell>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="font-medium">
                      {user.firstName}
                      {user.lastName}
                    </div>
                    {#if isCurrentUser(user)}
                      <Badge variant="outline" class="text-xs">You</Badge>
                    {/if}
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell>{user.email}</Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-1">
                  <Badge variant="secondary" class="font-medium">
                    {getRoleName(user)}
                  </Badge>
                  {#if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Owner"}
                    <Badge
                      variant="outline"
                      title="Organization Owner"
                      class="font-medium text-xs px-1.5 py-0.5"
                    >
                      Org. Owner
                    </Badge>
                  {:else if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Admin"}
                    <Badge
                      variant="outline"
                      title="Organization Admin"
                      class="font-medium text-xs px-1.5 py-0.5"
                    >
                      Org. Admin
                    </Badge>
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
                      Manage
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onclick={() => handleRemoveUser(user.id)}
                      disabled={isRemoving === user.id}
                      class="h-8 px-2"
                    >
                      {#if isRemoving === user.id}
                        <div class="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin"></div>
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
        title={searchTerm ? "No users matching your search" : "No team members yet"}
        description={searchTerm ? "Try adjusting your search terms" : "Team members will appear here once added"}
        variant={searchTerm ? "search-empty" : "data-empty"}
        height="h-[400px]"
      />
    {:else}
      {#each filteredUsers as user (user.id)}
        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-medium">
                    {user.firstName} {user.lastName}
                  </h3>
                  {#if isCurrentUser(user)}
                    <Badge variant="outline" class="text-xs">You</Badge>
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
                <span class="font-medium">Role:</span>
                <div class="flex items-center gap-1">
                  <Badge variant="secondary" class="font-medium">
                    {getRoleName(user)}
                  </Badge>
                  {#if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Owner"}
                    <Badge variant="outline" title="Organization Owner" class="font-medium text-xs px-1.5 py-0.5">
                      Org. Owner
                    </Badge>
                  {:else if props.resourceType === "project" && getOrgPrivilegeLevel(user) === "Admin"}
                    <Badge variant="outline" title="Organization Admin" class="font-medium text-xs px-1.5 py-0.5">
                      Org. Admin
                    </Badge>
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
                    Manage
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onclick={() => handleRemoveUser(user.id)}
                    disabled={isRemoving === user.id}
                    class="flex-1"
                  >
                    {#if isRemoving === user.id}
                      <div class="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin"></div>
                    {:else}
                      <UserMinus class="h-4 w-4 mr-1" />
                      Remove
                    {/if}
                  </Button>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      {/each}
    {/if}
  </div>
</div>

<!-- Delete Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove Team Member</AlertDialog.Title>
      <AlertDialog.Description>
        {#if userToRemove && props.resourceType === "project" && isProjectOwner(userToRemove) && isUsingElevatedPermissions()}
          You are about to remove a Project Owner using your Organization
          privileges. Are you sure you want to proceed?
        {:else}
          Are you sure you want to remove {userToRemove?.firstName}
          {userToRemove?.lastName} from this {props.resourceType}?
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
          Cancel
        </Button>
        <Button
          variant="destructive"
          onclick={confirmRemoveUser}
        >
          Remove
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

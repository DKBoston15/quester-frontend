<!-- src/routes/components/TeamMembersList.svelte -->
<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { UserCog, Search, UserMinus, Info } from "lucide-svelte";
  import type { User } from "$lib/types/auth";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";

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
  function getOrgPrivilegeLevel(user: TeamMember): string | null {
    // Only relevant for project context
    if (props.resourceType !== "project") return null;

    // APPROACH 1: Direct org role check
    if (user.organizationRoles && user.organizationRoles.length > 0) {
      // Check all organization roles
      for (const orgRole of user.organizationRoles) {
        if (orgRole.role) {
          if (orgRole.role.name === "Owner") {
            // Found an Owner role in any organization
            return "Owner";
          }
          if (orgRole.role.name === "Admin") {
            // Found an Admin role in any organization
            return "Admin";
          }
        }
      }
    }

    // APPROACH 2: Check if this user is specifically one of the organization admins we know about
    // This is a special case for the org admin who is the current user
    if (isCurrentUser(user) && isUsingElevatedPermissions()) {
      // The current user is using elevated permissions, which means they must be an org admin or owner
      // We can get their exact org role from the team management store
      const projectTeam = teamManagement.projectTeam;
      if (projectTeam && projectTeam.organization) {
        const organizationId = projectTeam.organization.id;
        const orgResources = teamManagement.userResources?.organizations || [];
        const userOrg = orgResources.find(
          (org: any) => org.id === organizationId
        );

        if (
          userOrg &&
          userOrg.organizationRoles &&
          userOrg.organizationRoles.length > 0
        ) {
          const userRole = userOrg.organizationRoles[0];
          return userRole.role?.name === "Owner" ? "Owner" : "Admin";
        }
      }
    }

    // APPROACH 3: Additional checks for non-current users
    // Check if there's any indication in $extras that this user has an org role
    if (user.$extras?.roleName === "Owner" && user.role?.name !== "Owner") {
      return "Owner";
    } else if (
      user.$extras?.roleName === "Admin" &&
      user.role?.name !== "Admin"
    ) {
      return "Admin";
    }

    // APPROACH 4: For non-current users, find them in the organization's user list
    const projectTeam = teamManagement.projectTeam;
    if (projectTeam && projectTeam.organization) {
      const organizationId = projectTeam.organization.id;

      // Check if we have this organization's structure loaded
      const orgStructure = teamManagement.organizationStructure;
      if (
        orgStructure &&
        orgStructure.id === organizationId &&
        orgStructure.users
      ) {
        // Find this user in the organization's user list
        const orgUser = orgStructure.users.find(
          (u: any) => String(u.id) === String(user.id)
        );
        if (orgUser) {
          // Check their role in the organization
          let orgRoleName = "";
          if (orgUser.$extras?.roleName) {
            orgRoleName = orgUser.$extras.roleName;
          } else if (orgUser.role?.name) {
            orgRoleName = orgUser.role.name;
          } else if (
            orgUser.organizationRoles?.length &&
            orgUser.organizationRoles[0].role?.name
          ) {
            orgRoleName = orgUser.organizationRoles[0].role.name;
          }

          if (orgRoleName === "Owner") return "Owner";
          if (orgRoleName === "Admin") return "Admin";
        }
      }
    }

    // APPROACH 5: Check if the current user (who we know is an org admin) has the same email as this user
    if (
      auth.user &&
      isUsingElevatedPermissions() &&
      user.email === auth.user.email
    ) {
      // This is the current user who we know is an org admin/owner from isUsingElevatedPermissions()
      // Let's determine whether they're an Admin or Owner
      const projectTeam = teamManagement.projectTeam;
      if (projectTeam && projectTeam.organization) {
        const organizationId = projectTeam.organization.id;
        const orgResources = teamManagement.userResources?.organizations || [];
        const userOrg = orgResources.find(
          (org: any) => org.id === organizationId
        );

        if (
          userOrg &&
          userOrg.organizationRoles &&
          userOrg.organizationRoles.length > 0
        ) {
          const userRole = userOrg.organizationRoles[0];
          return userRole.role?.name === "Owner" ? "Owner" : "Admin";
        }

        // If we can't determine from the store, default to Admin
        return "Admin";
      }
    }

    // No clear indication of organization admin/owner privilege
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
        class="pl-8 border-2  dark:border-dark-border"
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
        <div class="w-32 bg-muted rounded-full h-2">
          <div
            class="h-2 rounded-full {isFull
              ? 'bg-red-500'
              : isNearLimit
                ? 'bg-amber-500'
                : 'bg-green-500'}"
            style="width: {Math.min(
              100,
              (props.users.length / props.subscriptionLimits.maxUsers) * 100
            )}%"
          ></div>
        </div>

        <span
          class="text-xs font-medium {isFull
            ? 'text-red-500'
            : isNearLimit
              ? 'text-amber-500'
              : 'text-green-500'}"
        >
          {usersRemaining}
          {usersRemaining === 1 ? "seat" : "seats"} remaining
        </span>
      </div>
    </div>

    {#if isFull}
      <div
        class="p-3 border-2 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 rounded-md"
      >
        <div class="flex items-start gap-2">
          <Info
            class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
          />
          <div>
            <h4 class="font-medium text-amber-800 dark:text-amber-300">
              User Limit Reached
            </h4>
            <p class="text-sm text-amber-700 dark:text-amber-400 mt-1">
              You've reached the maximum of {props.subscriptionLimits.maxUsers} users
              for your {props.subscriptionLimits.subscriptionPlan} plan.
              {#if props.subscriptionLimits.subscriptionPlan === "Enterprise"}
                Please contact support to adjust your seat count.
              {:else if props.subscriptionLimits.subscriptionPlan === "Quester Pro"}
                Upgrade to Quester Team to add more team members.
              {:else if props.subscriptionLimits.subscriptionPlan === "Quester Team"}
                Please contact support to discuss enterprise options for larger
                teams.
              {:else}
                <!-- Default / Research Explorer -->
                Upgrade your plan to invite users.
              {/if}
            </p>
          </div>
        </div>
      </div>
    {:else if isNearLimit}
      <div
        class="p-3 border-2 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 rounded-md"
      >
        <div class="flex items-start gap-2">
          <Info
            class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
          />
          <div>
            <h4 class="font-medium text-amber-800 dark:text-amber-300">
              Almost at User Limit
            </h4>
            <p class="text-sm text-amber-700 dark:text-amber-400 mt-1">
              You have {usersRemaining}
              {usersRemaining === 1 ? "seat" : "seats"} remaining on your {props
                .subscriptionLimits.subscriptionPlan} plan.
              {#if props.subscriptionLimits.subscriptionPlan === "Enterprise"}
                <!-- No specific message needed when near limit for Enterprise, maybe contact support if concerned -->
              {:else if props.subscriptionLimits.subscriptionPlan === "Quester Pro"}
                Consider upgrading to Quester Team for up to 5 team members.
              {/if}
            </p>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Members list -->
  <div class="border-2 dark:border-dark-border rounded-md overflow-hidden">
    <table class="w-full">
      <thead class="bg-accent text-accent-foreground">
        <tr>
          <th class="text-left p-3">Name</th>
          <th class="text-left p-3">Email</th>
          <th class="text-left p-3">Role</th>
          <th class="text-right p-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredUsers.length === 0}
          <tr>
            <td colspan="4" class="p-4 text-center text-muted-foreground">
              {searchTerm
                ? "No users matching your search"
                : "No team members yet"}
            </td>
          </tr>
        {:else}
          {#each filteredUsers as user (user.id)}
            <tr class="border-t dark:border-dark-border hover:bg-accent/20">
              <td class="p-3">
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
                      <Badge variant="outline" class="text-xs">You</Badge>
                    {/if}
                  </div>
                </div>
              </td>
              <td class="p-3">{user.email}</td>
              <td class="p-3">
                {#if props.resourceType === "organization"}
                  <!-- Organization level: Show single role badge -->
                  <Badge variant="secondary" class="font-medium">
                    {getRoleName(user)}
                  </Badge>
                {:else if props.resourceType === "project"}
                  <!-- Project level: Show org privilege or project role -->
                  {#if getOrgPrivilegeLevel(user) === "Owner"}
                    <Badge
                      variant="outline"
                      class="font-medium bg-primary/10 text-primary border-primary/25"
                    >
                      Org Owner
                    </Badge>
                  {:else if getOrgPrivilegeLevel(user) === "Admin"}
                    <Badge
                      variant="outline"
                      class="font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      Org Admin
                    </Badge>
                  {:else}
                    <!-- Regular project member - show their project role -->
                    <Badge variant="secondary" class="font-medium">
                      {getRoleName(user)}
                    </Badge>
                  {/if}
                {:else}
                  <!-- Department level: Show role badge -->
                  <Badge variant="secondary" class="font-medium">
                    {getRoleName(user)}
                  </Badge>
                {/if}
              </td>
              <td class="p-3 text-right">
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
                        <div
                          class="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin"
                        ></div>
                      {:else}
                        <UserMinus class="h-4 w-4" />
                      {/if}
                    </Button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<!-- Delete Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content
    class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
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
          class="border-2  dark:border-dark-border"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onclick={confirmRemoveUser}
          class="border-2 border-destructive dark:border-destructive"
        >
          Remove
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

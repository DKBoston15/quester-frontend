<!-- src/routes/TeamManagement.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Tabs, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  import {
    Building2,
    FolderKanban,
    FileText,
    Users,
    UserPlus,
    RefreshCw,
    Info,
    UserCog,
  } from "lucide-svelte";
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
  } from "$lib/components/ui/card";
  import {
    Alert,
    AlertTitle,
    AlertDescription,
  } from "$lib/components/ui/alert";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import type { User } from "$lib/types/auth";
  import { Badge } from "$lib/components/ui/badge";
  import ResourceSelector from "$lib/components/ResourceSelector.svelte";
  import ResourceUserManager from "$lib/components/ResourceUserManager.svelte";
  import TeamMembersList from "$lib/components/TeamMembersList.svelte";
  import InvitationManager from "$lib/components/InvitationManager.svelte";
  import RoleManager from "$lib/components/RoleManager.svelte";

  // Reactive state
  let activeTab = $state("members");
  let showRoleManager = $state(false);
  let selectedUserId = $state<string | null>(null);
  let resourceName = $derived(getResourceName());
  let resourceIcon = $derived(getResourceIcon());
  let isLoading = $state(true);
  let isSelfAssigning = $state(false);
  let selfAssignError = $state<string | null>(null);
  let hasElevatedPermissions = $derived(determineElevatedPermissions());
  let organizationId = $derived(getOrganizationId());

  // Add subscription capability tracking
  let subscriptionLimits = $state({
    canInviteUsers: false,
    maxUsers: 0,
    currentUserCount: 0,
    subscriptionPlan: "Research Explorer",
  });
  let checkingSubscription = $state(false);

  // Load data on mount
  onMount(async () => {
    try {
      // Check URL parameters for resource selection
      const urlParams = new URLSearchParams(window.location.search);
      const resourceType = urlParams.get("type");
      const resourceId = urlParams.get("id");

      // Initialize team management store
      await teamManagement.initialize();

      // Check subscription limits
      await checkSubscriptionLimits();

      // If URL contains valid resource parameters, select that resource
      if (
        resourceType &&
        ["organization", "department", "project"].includes(resourceType) &&
        resourceId
      ) {
        teamManagement.setSelectedResource(
          resourceType as "organization" | "department" | "project",
          resourceId
        );
      }
    } catch (error) {
      console.error("Error initializing team management:", error);
    } finally {
      isLoading = false;
    }
  });

  // Add function to check subscription limits
  async function checkSubscriptionLimits() {
    if (!auth.user) return;

    checkingSubscription = true;

    try {
      // Get user invitation capability
      const inviteResponse = await fetch(
        "http://localhost:3333/capabilities/user_invite",
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json();
        subscriptionLimits.canInviteUsers = inviteData.allowed;

        // Get plan name from capability check if available
        if (inviteData.planName) {
          subscriptionLimits.subscriptionPlan = inviteData.planName;
        }
      }

      // Get usage limits to determine max users and current count
      const limitsResponse = await fetch("http://localhost:3333/limits", {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        if (limitsData.users) {
          subscriptionLimits.maxUsers = limitsData.users.limit || 0;
          subscriptionLimits.currentUserCount = limitsData.users.current || 0;
        }

        // Get subscription plan name if available from limits endpoint
        if (limitsData.plan) {
          subscriptionLimits.subscriptionPlan = limitsData.plan;
        }
      }
    } catch (error) {
      console.error("Error checking subscription limits:", error);
    } finally {
      checkingSubscription = false;
    }
  }

  function getResourceName() {
    if (
      teamManagement.selectedResourceType === "organization" &&
      teamManagement.organizationStructure
    ) {
      return teamManagement.organizationStructure.name || "Organization";
    } else if (
      teamManagement.selectedResourceType === "department" &&
      teamManagement.departmentStructure
    ) {
      return teamManagement.departmentStructure.name || "Department";
    } else if (
      teamManagement.selectedResourceType === "project" &&
      teamManagement.projectTeam
    ) {
      return teamManagement.projectTeam.name || "Project";
    }
    return "Team Management";
  }

  function getResourceIcon() {
    switch (teamManagement.selectedResourceType) {
      case "organization":
        return Building2;
      case "department":
        return FolderKanban;
      case "project":
        return FileText;
      default:
        return Users;
    }
  }

  // Helper to get the organization ID for the current context
  function getOrganizationId() {
    if (
      teamManagement.selectedResourceType === "organization" &&
      teamManagement.organizationStructure
    ) {
      return teamManagement.organizationStructure.id;
    } else if (
      teamManagement.selectedResourceType === "department" &&
      teamManagement.departmentStructure?.organization
    ) {
      return teamManagement.departmentStructure.organization.id;
    } else if (
      teamManagement.selectedResourceType === "project" &&
      teamManagement.projectTeam?.organization
    ) {
      return teamManagement.projectTeam.organization.id;
    }
    return "";
  }

  function refreshData() {
    teamManagement.refreshCurrentResource();
  }

  function handleUserSelect(userId: string) {
    selectedUserId = userId;
    showRoleManager = true;
  }

  function closeRoleManager() {
    showRoleManager = false;
    selectedUserId = null;
  }

  // Check if the current user is a member of the selected resource
  function isCurrentUserMember() {
    const currentUserId = auth.user?.id;
    if (!currentUserId) return false;

    const users = getUsersForCurrentResource();
    return users.some((user: User) => user.id === currentUserId);
  }

  // Check if the current user can join the selected resource
  function canJoinResource() {
    // Only allow joining projects and departments, not organizations
    if (teamManagement.selectedResourceType === "organization") return false;

    // Don't show the join button if the user is already a member
    if (isCurrentUserMember()) return false;

    // For projects: Organization admins/owners can add themselves to any project
    if (teamManagement.selectedResourceType === "project") {
      // Check if user is an admin/owner of the organization this project belongs to
      const projectTeam = teamManagement.projectTeam;
      if (projectTeam && projectTeam.organization) {
        const organizationId = projectTeam.organization.id;
        const orgResources = teamManagement.userResources?.organizations || [];

        // Find the user's role in this organization
        const userOrg = orgResources.find(
          (org: any) => org.id === organizationId
        );
        if (
          userOrg &&
          userOrg.organizationRoles &&
          userOrg.organizationRoles.length > 0
        ) {
          const userRole = userOrg.organizationRoles[0];
          // Admin or Owner roles can join any project
          return (
            userRole.role?.name === "Admin" || userRole.role?.name === "Owner"
          );
        }
      }
    }

    // For departments: Similar logic for departments
    if (teamManagement.selectedResourceType === "department") {
      // Organization admins/owners can add themselves to any department
      const departmentStructure = teamManagement.departmentStructure;
      if (departmentStructure && departmentStructure.organization) {
        const organizationId = departmentStructure.organization.id;
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
          return (
            userRole.role?.name === "Admin" || userRole.role?.name === "Owner"
          );
        }
      }
    }

    return false;
  }

  // Handle self-assignment
  async function handleSelfAssign() {
    if (!teamManagement.selectedResourceId) return;

    isSelfAssigning = true;
    selfAssignError = null;

    // Use the friendly role name 'member' for all resource types
    const roleId = "member";

    try {
      // Use the teamManagement store to handle the self-assignment
      const success = await teamManagement.selfAssign(roleId);

      if (success) {
        // Refresh the data to show the updated team
        refreshData();
      } else {
        selfAssignError =
          teamManagement.error || "Failed to join. Please try again.";
      }
    } catch (err) {
      selfAssignError =
        err instanceof Error ? err.message : "An unexpected error occurred";
    } finally {
      isSelfAssigning = false;
    }
  }

  function getUsersForCurrentResource() {
    if (
      teamManagement.selectedResourceType === "organization" &&
      teamManagement.organizationStructure
    ) {
      return teamManagement.organizationStructure.users || [];
    } else if (
      teamManagement.selectedResourceType === "department" &&
      teamManagement.departmentStructure
    ) {
      return teamManagement.departmentStructure.users || [];
    } else if (
      teamManagement.selectedResourceType === "project" &&
      teamManagement.projectTeam
    ) {
      return teamManagement.projectTeam.users || [];
    }
    return [];
  }

  // Function to determine if the current user has elevated permissions
  // (i.e., is an org admin viewing a project they don't own)
  function determineElevatedPermissions(): boolean {
    // Only relevant for project context
    if (teamManagement.selectedResourceType !== "project") return false;

    // If the user is already a project owner, they're not using elevated permissions
    const projectTeam = teamManagement.projectTeam;
    if (!projectTeam) return false;

    const currentUserId = auth.user?.id;
    if (!currentUserId) return false;

    // Check if user is a project member
    const projectUser = projectTeam.users?.find(
      (u: any) => String(u.id) === String(currentUserId)
    );
    if (!projectUser) return false;

    // Get user's project role
    const projectRoleName = getUserRoleName(projectUser);

    // If they're a Project Owner, they're not using elevated permissions
    if (projectRoleName === "Owner") return false;

    // If we're here, check if they're an org admin
    const organizationId = projectTeam.organization?.id;
    if (!organizationId) return false;

    // Find the user's role in the organization
    const orgResources = teamManagement.userResources?.organizations || [];
    const userOrg = orgResources.find((org: any) => org.id === organizationId);

    if (
      userOrg &&
      userOrg.organizationRoles &&
      userOrg.organizationRoles.length > 0
    ) {
      const userRole = userOrg.organizationRoles[0];
      // Admin or Owner roles have elevated permissions
      return userRole.role?.name === "Admin" || userRole.role?.name === "Owner";
    }

    return false;
  }

  // Helper function to get role name from user object
  function getUserRoleName(user: any): string {
    // Check if we have the roleName from $extras (set by the backend)
    if (user.$extras?.roleName) {
      return user.$extras.roleName;
    }

    // Check the project roles array
    if (user.projectRoles && user.projectRoles.length > 0) {
      const role = user.projectRoles[0].role;
      if (role && role.name) {
        return role.name;
      }
    }

    // If the role object is present with a name property
    if (user.role?.name) {
      return user.role.name;
    }

    return "Unknown";
  }

  // Check if user is an owner of the current organization
  function isOrganizationOwner() {
    // Only relevant for organization context or when using organization privileges
    if (!teamManagement.organizationStructure) return false;

    const currentUserId = auth.user?.id;
    if (!currentUserId) return false;

    // Find the current user in the organization
    const orgUsers = teamManagement.organizationStructure.users || [];
    const currentUser = orgUsers.find(
      (u: any) => String(u.id) === String(currentUserId)
    );

    if (!currentUser) return false;

    // Check if the user has the owner role
    if (currentUser.$extras?.roleName === "Owner") return true;

    // Check organization roles array as a fallback
    if (
      currentUser.organizationRoles &&
      currentUser.organizationRoles.length > 0
    ) {
      return currentUser.organizationRoles.some(
        (role: any) => role.role?.name === "Owner" || role.roleName === "Owner"
      );
    }

    return false;
  }

  // Determines if the "Add Users" tab should be shown
  function canShowAddUsersTab() {
    // Don't show for organizations (handled through invitations)
    if (teamManagement.selectedResourceType === "organization") return false;

    // Check if user has permissions to manage the resource
    // The API provides a general 'canManage' permission instead of specific ones
    return (
      teamManagement.permissions?.canManage ||
      isOrganizationOwner() ||
      hasElevatedPermissions
    );
  }
</script>

<Sidebar.Provider>
  <div class="flex h-screen bg-background w-full">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      {#if isLoading}
        <div class="flex items-center justify-center h-full">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
          ></div>
          <p class="ml-4 text-muted-foreground">Loading team management...</p>
        </div>
      {:else}
        <div class="container mx-auto py-6 px-4">
          <!-- Header with Resource Selector -->
          <div class="mb-8">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <h1 class="text-3xl font-bold">Team Management</h1>
                {#if teamManagement.isLoading}
                  <RefreshCw class="h-5 w-5 animate-spin" />
                {/if}
              </div>

              <div class="flex items-center gap-2">
                {#if canJoinResource()}
                  <Button
                    variant="outline"
                    onclick={handleSelfAssign}
                    disabled={isSelfAssigning}
                  >
                    {#if isSelfAssigning}
                      <div
                        class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"
                      ></div>
                      Joining...
                    {:else}
                      <UserPlus class="h-4 w-4 mr-2" />
                      Join {teamManagement.selectedResourceType === "project"
                        ? "Project"
                        : "Department"}
                    {/if}
                  </Button>
                {/if}
                <Button variant="outline" onclick={refreshData}>
                  <RefreshCw class="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            <p class="text-muted-foreground">
              Manage team members, roles, and permissions for your organization.
            </p>
          </div>

          <!-- Resource Selector -->
          {#if !teamManagement.isLoading && teamManagement.userResources}
            <Card class="mb-6">
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <svelte:component this={resourceIcon} class="h-5 w-5" />
                  {resourceName}
                </CardTitle>
                {#if hasElevatedPermissions}
                  <div class="flex items-center mt-1 mb-1">
                    <Badge
                      variant="outline"
                      class="bg-primary/10 text-primary border-primary/25"
                    >
                      <Info class="h-3 w-3 mr-1" />
                      Access via Organization Privileges
                    </Badge>
                    <span class="text-xs text-muted-foreground ml-2">
                      You can manage this project due to your organization role
                    </span>
                  </div>
                {/if}
                <CardDescription>
                  Manage team members and their roles for this {teamManagement.selectedResourceType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResourceSelector
                  resources={teamManagement.userResources}
                  selectedType={teamManagement.selectedResourceType}
                  selectedId={teamManagement.selectedResourceId}
                  onSelect={(
                    type: "organization" | "department" | "project",
                    id: string
                  ) => teamManagement.setSelectedResource(type, id)}
                />
              </CardContent>
            </Card>
          {/if}

          <!-- Error Display - Only show errors that aren't settings-related -->
          {#if teamManagement.error && teamManagement.error !== teamManagement.settingsError}
            <Alert variant="destructive" class="mb-6">
              <Info class="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{teamManagement.error}</AlertDescription>
            </Alert>
          {/if}

          <!-- Main Content -->
          {#if !teamManagement.isLoading && (teamManagement.organizationStructure || teamManagement.departmentStructure || teamManagement.projectTeam)}
            <Card>
              <CardHeader class="pb-0">
                <Tabs value={activeTab} class="w-full">
                  <TabsList
                    class="grid w-full {canShowAddUsersTab()
                      ? 'grid-cols-3'
                      : 'grid-cols-2'}"
                  >
                    <TabsTrigger
                      value="members"
                      onclick={() => (activeTab = "members")}
                    >
                      <Users class="h-4 w-4 mr-2" />
                      Team Members
                    </TabsTrigger>

                    {#if canShowAddUsersTab()}
                      <TabsTrigger
                        value="add-users"
                        onclick={() => (activeTab = "add-users")}
                      >
                        <UserCog class="h-4 w-4 mr-2" />
                        Add Users
                      </TabsTrigger>
                    {/if}

                    <TabsTrigger
                      value="invitations"
                      onclick={() => (activeTab = "invitations")}
                      disabled={!teamManagement.permissions.canInviteUsers &&
                        !isOrganizationOwner() &&
                        !teamManagement.settings?.allowMemberInvitations}
                    >
                      <UserPlus class="h-4 w-4 mr-2" />
                      Invitations
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent>
                <!-- Team Members Tab -->
                {#if activeTab === "members"}
                  <div class="py-4">
                    {#if canJoinResource()}
                      <div
                        class="mb-6 p-4 border-2 border-dashed rounded-lg bg-card/50"
                      >
                        <div
                          class="flex flex-col sm:flex-row justify-between items-center gap-4"
                        >
                          <div>
                            <h3 class="text-lg font-medium mb-1">
                              You're not a member of this {teamManagement.selectedResourceType}
                            </h3>
                            <p class="text-muted-foreground">
                              You can see this {teamManagement.selectedResourceType}
                              because of your organization admin privileges. Join
                              to collaborate with other members.
                            </p>
                            {#if selfAssignError}
                              <p class="text-red-500 mt-2 text-sm">
                                {selfAssignError}
                              </p>
                            {/if}
                          </div>
                          <Button
                            onclick={handleSelfAssign}
                            class="whitespace-nowrap"
                            disabled={isSelfAssigning}
                          >
                            {#if isSelfAssigning}
                              <div
                                class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"
                              ></div>
                              Joining...
                            {:else}
                              <UserPlus class="h-4 w-4 mr-2" />
                              Join {teamManagement.selectedResourceType ===
                              "project"
                                ? "Project"
                                : "Department"}
                            {/if}
                          </Button>
                        </div>
                      </div>
                    {/if}
                    <TeamMembersList
                      users={getUsersForCurrentResource()}
                      resourceType={teamManagement.selectedResourceType}
                      canChangeRoles={teamManagement.permissions.canChangeRoles}
                      onUserSelect={handleUserSelect}
                    />
                  </div>
                {/if}

                <!-- Add Users Tab - NEW -->
                {#if activeTab === "add-users" && canShowAddUsersTab()}
                  <div class="py-4">
                    <ResourceUserManager
                      resourceType={teamManagement.selectedResourceType ===
                      "department"
                        ? "department"
                        : "project"}
                      resourceId={teamManagement.selectedResourceId || ""}
                      {organizationId}
                      onUserAdded={refreshData}
                    />
                  </div>
                {/if}

                <!-- Invitations Tab -->
                {#if activeTab === "invitations"}
                  <div class="py-4">
                    {#if teamManagement.permissions.canInviteUsers || isOrganizationOwner() || teamManagement.settings?.allowMemberInvitations}
                      {#if !subscriptionLimits.canInviteUsers}
                        <div
                          class="p-4 mb-6 border-2 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 rounded-md"
                        >
                          <div class="flex items-start gap-3">
                            <Info
                              class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5"
                            />
                            <div>
                              <h3
                                class="font-medium text-amber-800 dark:text-amber-300"
                              >
                                Subscription Required
                              </h3>
                              <p
                                class="text-amber-700 dark:text-amber-400 mt-1"
                              >
                                Your current plan ({subscriptionLimits.subscriptionPlan})
                                does not include the ability to invite team
                                members. Upgrade to {subscriptionLimits.subscriptionPlan ===
                                "Research Explorer"
                                  ? "Quester Pro or Quester Team"
                                  : "Quester Team"} to invite collaborators.
                              </p>
                            </div>
                          </div>
                        </div>
                      {:else if subscriptionLimits.currentUserCount >= subscriptionLimits.maxUsers && subscriptionLimits.maxUsers > 0}
                        <div
                          class="p-4 mb-6 border-2 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 rounded-md"
                        >
                          <div class="flex items-start gap-3">
                            <Info
                              class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5"
                            />
                            <div>
                              <h3
                                class="font-medium text-amber-800 dark:text-amber-300"
                              >
                                User Limit Reached
                              </h3>
                              <p
                                class="text-amber-700 dark:text-amber-400 mt-1"
                              >
                                You've reached the maximum of {subscriptionLimits.maxUsers}
                                users for your {subscriptionLimits.subscriptionPlan}
                                plan.
                                {#if subscriptionLimits.subscriptionPlan === "Quester Pro"}
                                  Upgrade to Quester Team to add more team
                                  members.
                                {:else}
                                  Please contact support to discuss custom team
                                  sizes.
                                {/if}
                              </p>
                            </div>
                          </div>
                        </div>
                      {/if}
                      <InvitationManager
                        resourceType={teamManagement.selectedResourceType}
                        resourceId={teamManagement.selectedResourceId}
                        onInviteSent={refreshData}
                        {subscriptionLimits}
                      />
                    {:else}
                      <div class="text-center py-8 text-muted-foreground">
                        <p>
                          You don't have permission to manage invitations for
                          this {teamManagement.selectedResourceType}
                        </p>
                      </div>
                    {/if}
                  </div>
                {/if}
              </CardContent>
            </Card>
          {/if}

          <!-- Role Manager Modal -->
          {#if showRoleManager && selectedUserId}
            <RoleManager
              userId={selectedUserId}
              resourceType={teamManagement.selectedResourceType}
              resourceId={teamManagement.selectedResourceId || ""}
              onClose={closeRoleManager}
              onRoleUpdated={refreshData}
            />
          {/if}
        </div>
      {/if}
    </main>
  </div>
</Sidebar.Provider>

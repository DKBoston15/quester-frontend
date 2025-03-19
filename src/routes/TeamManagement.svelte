<!-- src/routes/TeamManagement.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
  } from "$lib/components/ui/tabs";
  import {
    Building2,
    FolderKanban,
    FileText,
    Users,
    UserPlus,
    UserMinus,
    Settings,
    RefreshCw,
    Info,
  } from "lucide-svelte";
  import ResourceSelector from "./components/ResourceSelector.svelte";
  import TeamMembersList from "./components/TeamMembersList.svelte";
  import RoleManager from "./components/RoleManager.svelte";
  import InvitationManager from "./components/InvitationManager.svelte";
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
  import TeamSettings from "./components/TeamSettings.svelte";

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

  // Load data on mount
  onMount(async () => {
    try {
      // Check URL parameters for resource selection
      const urlParams = new URLSearchParams(window.location.search);
      const resourceType = urlParams.get("type");
      const resourceId = urlParams.get("id");

      // Initialize team management store
      await teamManagement.initialize();

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

          <!-- Error Display -->
          {#if teamManagement.error}
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
                  <TabsList class="grid grid-cols-3">
                    <TabsTrigger
                      value="members"
                      onclick={() => (activeTab = "members")}
                    >
                      <Users class="h-4 w-4 mr-2" />
                      Team Members
                    </TabsTrigger>
                    <TabsTrigger
                      value="invitations"
                      onclick={() => (activeTab = "invitations")}
                      disabled={!teamManagement.permissions.canInviteUsers}
                    >
                      <UserPlus class="h-4 w-4 mr-2" />
                      Invitations
                    </TabsTrigger>
                    <TabsTrigger
                      value="settings"
                      onclick={() => (activeTab = "settings")}
                      disabled={!teamManagement.permissions.canManage}
                    >
                      <Settings class="h-4 w-4 mr-2" />
                      Settings
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

                <!-- Invitations Tab -->
                {#if activeTab === "invitations" && teamManagement.permissions.canInviteUsers}
                  <div class="py-4">
                    <InvitationManager
                      resourceType={teamManagement.selectedResourceType}
                      resourceId={teamManagement.selectedResourceId}
                      onInviteSent={refreshData}
                    />
                  </div>
                {/if}

                {console.log(teamManagement.permissions)}

                <!-- Settings Tab -->
                {#if activeTab === "settings" && teamManagement.permissions.canManage}
                  <div class="py-4">
                    <TeamSettings
                      resourceType={teamManagement.selectedResourceType}
                    />
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

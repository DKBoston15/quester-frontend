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
    GraduationCap,
    Mail,
    X,
    Building,
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
  import { Progress } from "$lib/components/ui/progress";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import type { User } from "$lib/types/auth";
  import { Badge } from "$lib/components/ui/badge";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import ResourceSelector from "$lib/components/ResourceSelector.svelte";
  import ResourceUserManager from "$lib/components/ResourceUserManager.svelte";
  import TeamMembersList from "$lib/components/TeamMembersList.svelte";
  import InvitationManager from "$lib/components/InvitationManager.svelte";
  import RoleManager from "$lib/components/RoleManager.svelte";
  import { API_BASE_URL } from "$lib/config";
  import { driver, type DriveStep } from "driver.js";
  import "driver.js/dist/driver.css";

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

  let showInvitationsTab = $derived(
    teamManagement.selectedResourceType === "organization"
  );

  // Add subscription capability tracking
  let subscriptionLimits = $state({
    canInviteUsers: false,
    maxUsers: 0,
    currentUserCount: 0,
    subscriptionPlan: "Research Explorer",
  });
  let checkingSubscription = $state(false);

  // Driver.js instance
  let driveSteps: DriveStep[] = $state([]);

  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: driveSteps,
  });

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

      // Update driver steps dynamically based on conditional rendering
      await Promise.resolve();

      // Build steps array dynamically
      const steps: DriveStep[] = [
        {
          element: "#team-management-header",
          popover: {
            title: "Welcome to Team Management",
            description:
              "This is where you manage access and roles for your organizations, departments, and projects. Let's explore!",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#resource-selector-card",
          popover: {
            title: "Select Your Team Context",
            description:
              "Use this dropdown to choose which Organization, Department, or Project team you want to manage. Your selection here updates the members and options below.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#team-tabs",
          popover: {
            title: "Manage Your Team",
            description:
              "Use these tabs to navigate between viewing members, adding users (for Departments/Projects), and managing invitations (for Organizations).",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#team-members-tab-trigger",
          popover: {
            title: "View Team Members",
            description:
              "See who is currently part of this team. You can view their roles and, if you have permission, manage roles or remove members.",
            side: "bottom",
            align: "start",
          },
        },
      ];

      if (canShowAddUsersTab()) {
        steps.push({
          element: "#add-users-tab-trigger",
          popover: {
            title: "Add Existing Users",
            description:
              "For Departments and Projects, you can add users who are already part of the parent Organization directly to this team.",
            side: "bottom",
            align: "start",
          },
        });
      }

      if (showInvitationsTab) {
        steps.push({
          element: "#invitations-tab-trigger",
          popover: {
            title: "Manage Invitations",
            description:
              "For Organizations, invite new users via email and manage pending invitations here. Note: Invitations might be limited by your subscription plan.",
            side: "bottom",
            align: "start",
          },
        });
      }

      steps.push({
        element: "#refresh-button",
        popover: {
          title: "Refresh Data",
          description:
            "Click here anytime to load the latest team information.",
          side: "left",
          align: "start",
        },
      });

      if (canJoinResource()) {
        steps.push({
          element: "#join-button",
          popover: {
            title: "Join This Team",
            description:
              "If you have organization privileges (like Admin/Owner) but aren't a member of this specific Department or Project, you can add yourself here.",
            side: "left",
            align: "start",
          },
        });
      }

      steps.push({
        element: ".container",
        popover: {
          title: "Ready to Collaborate?",
          description:
            "Use these tools to build and manage your research teams effectively. Select a resource to begin!",
          side: "top",
          align: "center",
        },
      });

      // Update the state variable and the driver instance
      driveSteps = steps;
      driverObj.setSteps(driveSteps);
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
        `${API_BASE_URL}/capabilities/user_invite`,
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
      const limitsResponse = await fetch(`${API_BASE_URL}/limits`, {
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
    <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-background">
      {#if isLoading}
        <div class="flex items-center justify-center h-full">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
          ></div>
          <p class="ml-4 text-muted-foreground">Loading team management...</p>
        </div>
      {:else}
        <div class="flex h-full">
          <!-- Left Sidebar - Resource Navigator -->
          <div class="w-80 border-r bg-card p-6 overflow-y-auto">
            <div class="mb-6">
              <div class="flex items-center gap-2 mb-2">
                <h2 class="text-xl font-semibold">Team Management</h2>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Info class="h-4 w-4 text-muted-foreground" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="text-sm max-w-xs">
                      Select a resource to manage its team members, roles, and permissions.
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
              <p class="text-sm text-muted-foreground">
                Select a resource to manage its team
              </p>
            </div>

            <!-- Resource Navigation Tree -->
            <div class="space-y-2">
              {#if teamManagement.userResources}
                <!-- Organizations -->
                {#if teamManagement.userResources.organizations && teamManagement.userResources.organizations.length > 0}
                  <div class="space-y-1">
                    <h3 class="text-sm font-medium text-muted-foreground px-2 py-1">Organizations</h3>
                    {#each teamManagement.userResources.organizations as org}
                      <button
                        class="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors {teamManagement.selectedResourceType === 'organization' && teamManagement.selectedResourceId === org.id ? 'bg-accent text-accent-foreground' : ''}"
                        onclick={() => teamManagement.setSelectedResource('organization', org.id)}
                      >
                        <div class="flex items-center gap-2">
                          <Building class="h-4 w-4" />
                          <span class="font-medium">{org.name}</span>
                        </div>
                      </button>
                    {/each}
                  </div>
                {/if}

                <!-- Departments -->
                {#if teamManagement.userResources.departments && teamManagement.userResources.departments.length > 0}
                  <div class="space-y-1">
                    <h3 class="text-sm font-medium text-muted-foreground px-2 py-1">Departments</h3>
                    {#each teamManagement.userResources.departments as dept}
                      <button
                        class="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors {teamManagement.selectedResourceType === 'department' && teamManagement.selectedResourceId === dept.id ? 'bg-accent text-accent-foreground' : ''}"
                        onclick={() => teamManagement.setSelectedResource('department', dept.id)}
                      >
                        <div class="flex items-center gap-2">
                          <FolderKanban class="h-4 w-4" />
                          <span class="font-medium">{dept.name}</span>
                        </div>
                      </button>
                    {/each}
                  </div>
                {/if}

                <!-- Projects -->
                {#if teamManagement.userResources.projects && teamManagement.userResources.projects.length > 0}
                  <div class="space-y-1">
                    <h3 class="text-sm font-medium text-muted-foreground px-2 py-1">Projects</h3>
                    {#each teamManagement.userResources.projects as project}
                      <button
                        class="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors {teamManagement.selectedResourceType === 'project' && teamManagement.selectedResourceId === project.id ? 'bg-accent text-accent-foreground' : ''}"
                        onclick={() => teamManagement.setSelectedResource('project', project.id)}
                      >
                        <div class="flex items-center gap-2">
                          <FileText class="h-4 w-4" />
                          <span class="font-medium">{project.name}</span>
                        </div>
                      </button>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>
          </div>

          <!-- Right Content Area -->
          <div class="flex-1 p-6 overflow-y-auto">
            {#if !teamManagement.selectedResourceId}
              <!-- Empty State -->
              <div class="flex items-center justify-center h-full">
                <div class="text-center">
                  <Users class="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 class="text-lg font-medium mb-2">Select a Resource</h3>
                  <p class="text-muted-foreground max-w-md">
                    Choose an organization, department, or project from the sidebar to manage its team members and permissions.
                  </p>
                </div>
              </div>
            {:else}
              <!-- Resource Header -->
              <div class="mb-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <svelte:component this={resourceIcon} class="h-6 w-6" />
                    <h1 class="text-2xl font-bold">{resourceName}</h1>
                    {#if hasElevatedPermissions}
                      <Badge variant="outline" class="bg-primary/10 text-primary border-primary/25">
                        <Info class="h-3 w-3 mr-1" />
                        Organization Access
                      </Badge>
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
                          <div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                          Joining...
                        {:else}
                          <UserPlus class="h-4 w-4 mr-2" />
                          Join {teamManagement.selectedResourceType === "project" ? "Project" : "Department"}
                        {/if}
                      </Button>
                    {/if}
                    <Button variant="outline" onclick={refreshData}>
                      <RefreshCw class="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p class="text-muted-foreground mt-1">
                  Manage team members and their roles for this {teamManagement.selectedResourceType}
                </p>
              </div>
              <!-- Error Display -->
              {#if teamManagement.error && teamManagement.error !== teamManagement.settingsError}
                <Alert variant="destructive" class="mb-6">
                  <Info class="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{teamManagement.error}</AlertDescription>
                </Alert>
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
                <!-- Team Members Section -->
                <Card class="mb-6">
                  <CardHeader>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <Users class="h-5 w-5" />
                        <CardTitle>Team Members ({getUsersForCurrentResource().length})</CardTitle>
                      </div>
                      {#if teamManagement.permissions.canInviteUsers || isOrganizationOwner() || teamManagement.settings?.allowMemberInvitations}
                        <Button onclick={() => (showInviteModal = true)}>
                          <UserPlus class="h-4 w-4 mr-2" />
                          Invite Team
                        </Button>
                      {/if}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {#if subscriptionLimits && subscriptionLimits.maxUsers > 0}
                      <div class="mb-4 p-3 bg-muted rounded-lg">
                        <div class="flex items-center justify-between text-sm">
                          <span>Team size: {getUsersForCurrentResource().length} of {subscriptionLimits.maxUsers}</span>
                          <Progress value={Math.min(100, (getUsersForCurrentResource().length / subscriptionLimits.maxUsers) * 100)} class="w-32" />
                        </div>
                      </div>
                    {/if}
                    
                    <TeamMembersList
                      users={getUsersForCurrentResource()}
                      resourceType={teamManagement.selectedResourceType}
                      canChangeRoles={teamManagement.permissions.canChangeRoles}
                      onUserSelect={handleUserSelect}
                      {subscriptionLimits}
                    />
                  </CardContent>
                </Card>

                <!-- Pending Invitations Section -->
                {#if showInvitationsTab && pendingInvitations.length > 0}
                  <Card class="mb-6">
                    <CardHeader>
                      <div class="flex items-center gap-2">
                        <Mail class="h-5 w-5" />
                        <CardTitle>Pending Invitations ({pendingInvitations.length})</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div class="space-y-2">
                        {#each pendingInvitations as invitation}
                          <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div class="flex items-center gap-2">
                              <Mail class="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p class="font-medium">{invitation.email}</p>
                                <p class="text-sm text-muted-foreground">
                                  {invitation.roleName || 'Member'} • Sent {new Date(invitation.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onclick={() => revokeInvitation(invitation.id)}>
                              <X class="h-4 w-4" />
                            </Button>
                          </div>
                        {/each}
                      </div>
                    </CardContent>
                  </Card>
                {/if}

                <!-- Add Users Section (for departments/projects) -->
                {#if canShowAddUsersTab()}
                  <Card>
                    <CardHeader>
                      <div class="flex items-center gap-2">
                        <UserCog class="h-5 w-5" />
                        <CardTitle>Add Existing Users</CardTitle>
                      </div>
                      <CardDescription>
                        Add users who are already members of the parent organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResourceUserManager
                        resourceType={teamManagement.selectedResourceType === "department" ? "department" : "project"}
                        resourceId={teamManagement.selectedResourceId || ""}
                        {organizationId}
                        onUserAdded={refreshData}
                      />
                    </CardContent>
                  </Card>
                {/if}
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
            {/if}
          </div>
        </div>
      {/if}
    </main>
  </div>
</Sidebar.Provider>

<script lang="ts">
  import { onMount } from "svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { Button } from "$lib/components/ui/button";
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
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import type { User } from "$lib/types/auth";
  import { Badge } from "$lib/components/ui/badge";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import ResourceUserManager from "$lib/components/ResourceUserManager.svelte";
  import TeamMembersList from "$lib/components/TeamMembersList.svelte";
  import InvitationManager from "$lib/components/InvitationManager.svelte";
  import RoleManager from "$lib/components/RoleManager.svelte";
  import TeamSizeIndicator from "$lib/components/TeamSizeIndicator/TeamSizeIndicator.svelte";
  import { api } from "$lib/services/api-client";
  import { driver, type DriveStep } from "driver.js";
  import "driver.js/dist/driver.css";
  import { toast } from "svelte-sonner";
  import { fly, fade, scale } from "svelte/transition";

  // Reactive state
  let showRoleManager = $state(false);
  let selectedUserId = $state<string | null>(null);
  let showInviteModal = $state(false);
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

  // Driver.js instance and tour state
  let driveSteps: DriveStep[] = $state([]);
  let showTourPrompt = $state(false);
  let tourCompleted = $state(false);

  const driverObj = driver({
    showProgress: true,
    showButtons: ["next", "previous", "close"],
    popoverClass: "quester-driver-theme",
    steps: driveSteps,
    onDestroyed: () => {
      tourCompleted = true;
      toast.success("Tour completed! You're ready to manage your teams.");
    },
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

      // Check if user should see tour prompt (first time or no resource selected)
      const hasSeenTour = localStorage.getItem("teamManagement-tour-completed");
      if (!hasSeenTour && !teamManagement.selectedResourceId) {
        showTourPrompt = true;
      }

      // Build simplified tour steps
      buildTourSteps();
    } catch (error) {
      console.error("Error initializing team management:", error);
    } finally {
      isLoading = false;
    }
  });

  // Rebuild tour when resource selection changes (with guard to prevent infinite loops)
  let lastResourceId = $state<string | null>(null);
  $effect(() => {
    const currentResourceId = teamManagement.selectedResourceId;
    if (
      currentResourceId &&
      !isLoading &&
      currentResourceId !== lastResourceId
    ) {
      lastResourceId = currentResourceId;
      buildTourSteps();
    }
  });

  // Build contextual tour steps based on current state
  function buildTourSteps() {
    const steps: DriveStep[] = [];

    // Always start with the resource navigation
    steps.push({
      element: ".w-80.border-r",
      popover: {
        title: "Choose Your Team",
        description:
          "Select an organization, department, or project from the sidebar to start managing its team members.",
        side: "right",
        align: "start",
      },
    });

    // If a resource is selected, show relevant next steps
    if (teamManagement.selectedResourceId) {
      steps.push({
        element: "[data-tour='team-members']",
        popover: {
          title: "Your Team Members",
          description:
            "Here you can see all team members, their roles, and manage their access permissions.",
          side: "top",
          align: "start",
        },
      });

      // Context-specific steps
      if (showInvitationsTab) {
        steps.push({
          element: "[data-tour='invitations']",
          popover: {
            title: "Invite New Members",
            description:
              "Send email invitations to add new people to your organization.",
            side: "top",
            align: "start",
          },
        });
      }

      if (canShowAddUsersTab()) {
        steps.push({
          element: "[data-tour='add-users']",
          popover: {
            title: "Add Existing Users",
            description:
              "Add people who are already in your organization to this specific project or department.",
            side: "top",
            align: "start",
          },
        });
      }
    }

    driveSteps = steps;
    driverObj.setSteps(driveSteps);
  }

  // Start tour function
  function startTour() {
    showTourPrompt = false;
    buildTourSteps();
    driverObj.drive();
  }

  // Dismiss tour function
  function dismissTour() {
    showTourPrompt = false;
    localStorage.setItem("teamManagement-tour-completed", "true");
    toast.info("You can always restart the tour from the help menu");
  }

  // Public function to restart tour
  function restartTour() {
    buildTourSteps();
    driverObj.drive();
  }

  // Add function to check subscription limits
  async function checkSubscriptionLimits() {
    if (!auth.user) return;

    checkingSubscription = true;

    try {
      // Get user invitation capability
      try {
        const inviteData = await api.get(`/capabilities/user_invite`);
        subscriptionLimits.canInviteUsers = inviteData.allowed;

        // Get plan name from capability check if available
        if (inviteData.planName) {
          subscriptionLimits.subscriptionPlan = inviteData.planName;
        }
      } catch (error) {
        console.error("Error checking invite capability:", error);
      }

      // Get usage limits to determine max users and current count
      try {
        const limitsData = await api.get(`/limits`);
        if (limitsData.users) {
          subscriptionLimits.maxUsers = limitsData.users.limit || 0;
          subscriptionLimits.currentUserCount = limitsData.users.current || 0;
        }

        // Get subscription plan name if available from limits endpoint
        if (limitsData.plan) {
          subscriptionLimits.subscriptionPlan = limitsData.plan;
        }
      } catch (error) {
        console.error("Error checking usage limits:", error);
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
        toast.success(
          `Successfully joined ${teamManagement.selectedResourceType}`
        );
      } else {
        const errorMessage =
          teamManagement.error || "Failed to join. Please try again.";
        toast.error(errorMessage);
        selfAssignError = errorMessage;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(errorMessage);
      selfAssignError = errorMessage;
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
          <div class="text-center space-y-4">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
            ></div>
            <div class="space-y-2">
              <p class="text-lg font-medium">Setting up Team Management</p>
              <p class="text-sm text-muted-foreground">
                Loading your resources and permissions...
              </p>
            </div>
          </div>
        </div>
      {:else}
        <div class="flex h-full">
          <!-- Left Sidebar - Resource Navigator -->
          <div
            class="w-80 border-r bg-card p-6 overflow-y-auto custom-scrollbar"
          >
            <div class="mb-6">
              <div class="flex items-center gap-2 mb-2">
                <h2 class="text-xl font-semibold">Team Management</h2>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Info class="h-4 w-4 text-muted-foreground" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="text-sm max-w-xs">
                      Select a resource to manage its team members, roles, and
                      permissions.
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
                    <h3
                      class="text-sm font-medium text-muted-foreground px-2 py-1"
                    >
                      Organizations
                    </h3>
                    {#each teamManagement.userResources.organizations as org}
                      <button
                        class="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:translate-x-1 {teamManagement.selectedResourceType ===
                          'organization' &&
                        teamManagement.selectedResourceId === org.id
                          ? 'bg-accent text-accent-foreground scale-105'
                          : ''}"
                        onclick={() =>
                          teamManagement.setSelectedResource(
                            "organization",
                            org.id
                          )}
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
                    <h3
                      class="text-sm font-medium text-muted-foreground px-2 py-1"
                    >
                      Departments
                    </h3>
                    {#each teamManagement.userResources.departments as dept}
                      <button
                        class="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:translate-x-1 {teamManagement.selectedResourceType ===
                          'department' &&
                        teamManagement.selectedResourceId === dept.id
                          ? 'bg-accent text-accent-foreground scale-105'
                          : ''}"
                        onclick={() =>
                          teamManagement.setSelectedResource(
                            "department",
                            dept.id
                          )}
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
                    <h3
                      class="text-sm font-medium text-muted-foreground px-2 py-1"
                    >
                      Projects
                    </h3>
                    {#each teamManagement.userResources.projects as project}
                      <button
                        class="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:translate-x-1 {teamManagement.selectedResourceType ===
                          'project' &&
                        teamManagement.selectedResourceId === project.id
                          ? 'bg-accent text-accent-foreground scale-105'
                          : ''}"
                        onclick={() =>
                          teamManagement.setSelectedResource(
                            "project",
                            project.id
                          )}
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
                <div
                  class="text-center"
                  in:fly={{ y: 20, duration: 400, delay: 100 }}
                >
                  <Users class="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 class="text-lg font-medium mb-2">Select a Resource</h3>
                  <p class="text-muted-foreground max-w-md">
                    Choose an organization, department, or project from the
                    sidebar to manage its team members and permissions.
                  </p>
                </div>
              </div>
            {:else}
              <!-- Resource Header -->
              <div class="mb-6" in:fly={{ y: -20, duration: 300 }}>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <svelte:component this={resourceIcon} class="h-6 w-6" />
                    <h1 class="text-2xl font-bold">{resourceName}</h1>
                    {#if hasElevatedPermissions}
                      <Badge
                        variant="outline"
                        class="bg-primary/10 text-primary border-primary/25"
                      >
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
                    {/if}
                    <Button variant="outline" onclick={refreshData}>
                      <RefreshCw class="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" onclick={restartTour}>
                      <GraduationCap class="h-4 w-4 mr-2" />
                      Tour
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
                <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                  <Card class="mb-6 hover-lift" data-tour="team-members">
                    <CardHeader>
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <Users class="h-5 w-5" />
                          <CardTitle
                            >Team Members ({getUsersForCurrentResource()
                              .length})</CardTitle
                          >
                        </div>
                        {#if !showInvitationsTab && (teamManagement.permissions.canInviteUsers || isOrganizationOwner() || teamManagement.settings?.allowMemberInvitations)}
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
                          <TeamSizeIndicator
                            currentCount={getUsersForCurrentResource().length}
                            maxUsers={subscriptionLimits.maxUsers}
                            subscriptionPlan={subscriptionLimits.subscriptionPlan}
                            showAlerts={false}
                          />
                        </div>
                      {/if}

                      <TeamMembersList
                        users={getUsersForCurrentResource()}
                        resourceType={teamManagement.selectedResourceType}
                        canChangeRoles={teamManagement.permissions
                          .canChangeRoles}
                        onUserSelect={handleUserSelect}
                        {subscriptionLimits}
                      />
                    </CardContent>
                  </Card>
                </div>

                <!-- Invitations Section -->
                {#if showInvitationsTab}
                  <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                    <Card
                      class="mb-6 hover-lift"
                      id="invitation-section"
                      data-tour="invitations"
                    >
                      <CardHeader>
                        <div class="flex items-center gap-2">
                          <Mail class="h-5 w-5" />
                          <CardTitle>Team Invitations</CardTitle>
                        </div>
                        <CardDescription>
                          Send invitations to add new team members to this
                          organization
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <InvitationManager
                          resourceType={teamManagement.selectedResourceType}
                          resourceId={teamManagement.selectedResourceId}
                          onInviteSent={refreshData}
                          {subscriptionLimits}
                        />
                      </CardContent>
                    </Card>
                  </div>
                {/if}

                <!-- Add Users Section (for departments/projects) -->
                {#if canShowAddUsersTab()}
                  <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                    <Card
                      class="hover-lift"
                      id="add-users-section"
                      data-tour="add-users"
                    >
                      <CardHeader>
                        <div class="flex items-center gap-2">
                          <UserCog class="h-5 w-5" />
                          <CardTitle>Add Existing Users</CardTitle>
                        </div>
                        <CardDescription>
                          Add users who are already members of the parent
                          organization
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResourceUserManager
                          resourceType={teamManagement.selectedResourceType ===
                          "department"
                            ? "department"
                            : "project"}
                          resourceId={teamManagement.selectedResourceId || ""}
                          {organizationId}
                          onUserAdded={refreshData}
                        />
                      </CardContent>
                    </Card>
                  </div>
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

              <!-- Invite Modal for Departments/Projects -->
              {#if showInviteModal && !showInvitationsTab}
                <div
                  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                >
                  <div
                    class="bg-background border rounded-lg p-6 max-w-md w-full mx-4"
                  >
                    <div class="flex items-center justify-between mb-4">
                      <h2 class="text-lg font-semibold">Invite Team Members</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => (showInviteModal = false)}
                      >
                        <X class="h-4 w-4" />
                      </Button>
                    </div>
                    <p class="text-sm text-muted-foreground mb-4">
                      For {teamManagement.selectedResourceType}s, you can add
                      existing organization members or use the main organization
                      invitation feature.
                    </p>
                    <div class="flex gap-2">
                      <Button
                        variant="outline"
                        onclick={() => {
                          showInviteModal = false;
                          // Scroll to add users section if it exists
                          const addUsersSection =
                            document.getElementById("add-users-section");
                          if (addUsersSection) {
                            addUsersSection.scrollIntoView({
                              behavior: "smooth",
                            });
                          }
                        }}
                      >
                        Add Existing Users
                      </Button>
                      <Button onclick={() => (showInviteModal = false)}
                        >Close</Button
                      >
                    </div>
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      {/if}
    </main>
  </div>
</Sidebar.Provider>

<!-- Tour Prompt Modal -->
{#if showTourPrompt}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    in:fade={{ duration: 200 }}
  >
    <div in:scale={{ duration: 300, delay: 100 }}>
      <Card class="max-w-md mx-4">
        <CardHeader>
          <div class="flex items-center gap-2">
            <GraduationCap class="h-5 w-5 text-primary" />
            <CardTitle>Welcome to Team Management!</CardTitle>
          </div>
          <CardDescription>
            Would you like a quick tour to learn how to manage your teams
            effectively?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex gap-2">
            <Button onclick={startTour} class="flex-1">
              <GraduationCap class="h-4 w-4 mr-2" />
              Start Tour
            </Button>
            <Button variant="outline" onclick={dismissTour} class="flex-1">
              Skip for now
            </Button>
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            You can restart the tour anytime using the "Tour" button in the
            header.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
{/if}

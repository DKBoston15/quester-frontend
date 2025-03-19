<!-- src/routes/Dashboard.svelte -->
<script lang="ts">
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { auth } from "../lib/stores/AuthStore.svelte";
  import { notifyDepartmentUpdate } from "../lib/stores/DepartmentStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import type { Department, Organization, Project } from "../lib/types/auth";
  import TreeNode from "$lib/components/TreeNode.svelte";
  // import InviteUserForm from "$lib/components/InviteUserForm.svelte";
  import ManageSubscription from "$lib/components/ManageSubscription.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import { Plus, Users, CreditCard, FolderTree } from "lucide-svelte";

  let organizations = $state<Organization[]>([]);
  let currentOrg = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);
  let projects = $state<Project[]>([]);
  let newProjectName = $state("");
  let newDepartmentName = $state("");
  let isLoading = $state(true);
  let selectedOrgId = $state<string | null>(null);
  let error = $state<string | null>(null);
  let isCreatingDepartment = $state(false);

  // Organization owner role ID
  const ORGANIZATION_OWNER_ROLE_ID = "e820de49-d7bd-42d7-8b05-49279cee686f";

  // Helper function to check if user is organization owner
  function isOrganizationOwner() {
    if (!currentOrg?.organizationRoles?.length) return false;
    return currentOrg.organizationRoles.some(
      (role) => role.roleId === ORGANIZATION_OWNER_ROLE_ID
    );
  }

  // Helper function to check if user has pro features
  function hasProFeatures() {
    const planName = currentOrg?.subscription?.plan?.name;
    return planName && planName !== "Research Explorer";
  }

  // Helper function to check if user has research explorer subscription and has reached project limit
  function hasReachedResearchExplorerLimit() {
    return (
      currentOrg?.subscription?.plan?.name === "Research Explorer" &&
      projects.length >= 1
    );
  }

  // Anyone can create departments regardless of subscription
  function canCreateDepartment() {
    return currentOrg !== null;
  }

  onMount(async () => {
    try {
      // Wait for auth store to finish loading
      if (auth.isLoading) {
        // Wait for auth to complete loading
      }

      if (!auth.isAuthenticated) {
        navigate("/");
        return;
      }

      await loadOrganizations();
    } catch (error) {
      error =
        error instanceof Error
          ? error.message
          : "Failed to initialize dashboard";
    } finally {
      isLoading = false;
    }
  });

  async function loadOrganizations() {
    try {
      if (!auth.user?.id) return;

      const response = await fetch(
        `http://localhost:3333/organizations/by-user?userId=${auth.user.id}`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load organizations");
      }

      const data = await response.json();
      organizations = data.data || [];

      if (organizations.length > 0) {
        let orgToUse: Organization;
        const currentOrgId = currentOrg?.id;

        if (!currentOrgId) {
          // If no current org is selected, use the first one
          orgToUse = organizations[0];
        } else {
          // Otherwise, try to find the current org in the updated list
          const updatedCurrentOrg = organizations.find(
            (org) => org.id === currentOrgId
          );
          orgToUse = updatedCurrentOrg || organizations[0];
        }

        // Load organization details including roles
        const orgDetailsResponse = await fetch(
          `http://localhost:3333/team-management/organization-structure/${orgToUse.id}`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (orgDetailsResponse.ok) {
          const orgDetails = await orgDetailsResponse.json();
          orgToUse = { ...orgToUse, ...orgDetails.organization };
        }

        // Update both local state and auth store
        currentOrg = orgToUse;
        selectedOrgId = orgToUse.id;
        await auth.setCurrentOrganization(orgToUse);

        // If we have an org but no billing provider, redirect to onboarding
        if (!orgToUse.billingProviderId) {
          navigate("/onboarding");
          return;
        }

        await loadDepartmentsAndProjects();
      } else {
        // If no organizations found, clear the current org
        currentOrg = null;
        selectedOrgId = null;
        await auth.setCurrentOrganization(null);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
      throw err;
    }
  }

  async function loadDepartmentsAndProjects() {
    if (!currentOrg || !auth.user) return;

    try {
      const deptResponse = await fetch(
        `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
        { credentials: "include" }
      );

      if (!deptResponse.ok) {
        throw new Error("Failed to fetch departments");
      }

      const deptData = await deptResponse.json();

      // Filter for current organization
      departments = deptData.data.filter(
        (d: Department) => d.organizationId === currentOrg?.id
      );

      const projectsResponse = await fetch(
        `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
        { credentials: "include" }
      );

      if (!projectsResponse.ok) {
        throw new Error("Failed to fetch projects");
      }

      const projectsData = await projectsResponse.json();

      // Filter for current organization
      projects = projectsData.data.filter(
        (p: Project) => p.organizationId === currentOrg?.id
      );
    } catch (error) {
      console.error("Error loading departments and projects:", error);
      // We continue even if there's an error to avoid blocking the dashboard
    }
  }

  async function createProject(e: Event) {
    e.preventDefault();
    if (!newProjectName || !currentOrg) return;

    try {
      const response = await fetch(
        "http://localhost:3333/projects/createProjectWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newProjectName,
            organizationId: currentOrg.id,
            userId: auth.user?.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create project");

      const data = await response.json();
      newProjectName = "";

      // Reload projects
      await loadDepartmentsAndProjects();

      // Navigate to the new project
      const projectSlug = data.project.name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/project/${data.project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  }

  async function createDepartment(e: Event) {
    e.preventDefault();
    if (!newDepartmentName || !currentOrg) return;

    isCreatingDepartment = true;

    try {
      const response = await fetch(
        "http://localhost:3333/departments/createDepartmentWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newDepartmentName,
            organizationId: currentOrg.id,
            userId: auth.user?.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create department");

      const data = await response.json();
      newDepartmentName = "";

      // Reload departments and projects
      await loadDepartmentsAndProjects();

      // Use the store to notify components about department update
      notifyDepartmentUpdate();
    } catch (error) {
      console.error("Failed to create department:", error);
    } finally {
      isCreatingDepartment = false;
    }
  }

  async function handleOrgChange(value: string) {
    selectedOrgId = value;
    currentOrg = organizations.find((org) => org.id === value) || null;

    if (currentOrg) {
      // Check if the selected org has a billing provider
      if (!currentOrg.billingProviderId) {
        navigate("/onboarding");
        return;
      }

      auth.setCurrentOrganization(currentOrg);
      await loadDepartmentsAndProjects();
    }
  }

  function handleTreeNodeSelect(item: Organization | Department | Project) {
    if ("slug" in item) {
      // Organization
      currentOrg = item;
      loadDepartmentsAndProjects();
    } else if (!("departmentId" in item)) {
      // Project
      if (!currentOrg) return;
      const projectSlug = item.name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/org/${currentOrg.slug}/project/${projectSlug}`);
    }
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
          <p class="ml-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      {:else}
        <div class="container mx-auto py-6 px-4">
          <!-- Welcome Section -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold mb-2">
              Welcome back, {auth.user?.firstName}!
            </h1>
            <p class="text-muted-foreground">
              Here's what's happening in your workspace.
            </p>
          </div>

          {#if error}
            <div class="mb-6">
              <Card class="border-red-500">
                <CardContent class="text-red-500 py-4">
                  {error}
                </CardContent>
              </Card>
            </div>
          {/if}

          <!-- Quick Stats -->
          <div
            class="grid grid-cols-1 md:grid-cols-{currentOrg?.subscriptionType ===
            'organization'
              ? '3'
              : '2'} gap-4 mb-8"
          >
            <Card>
              <CardContent class="flex flex-col items-center justify-center">
                <CardTitle class="text-lg ">Projects</CardTitle>
                <CardDescription
                  >{projects.length} total projects</CardDescription
                >
              </CardContent>
            </Card>
            {#if hasProFeatures()}
              <Card>
                <CardContent class="flex flex-col items-center justify-center">
                  <CardTitle class="text-lg ">Team Members</CardTitle>
                  <CardDescription
                    >{currentOrg?.members?.length || 0} members</CardDescription
                  >
                </CardContent>
              </Card>
            {/if}
            {#if currentOrg?.subscriptionType === "organization"}
              <Card>
                <CardHeader class="text-center">
                  <CardTitle class="text-lg ">Departments</CardTitle>
                  <CardDescription
                    >{departments.length} departments</CardDescription
                  >
                </CardHeader>
              </Card>
            {/if}
          </div>

          <!-- Main Actions Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-6">
              <!-- Create Project -->
              <Card
                class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all {hasReachedResearchExplorerLimit()
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : ''}"
              >
                <CardHeader>
                  <div class="flex items-center gap-2">
                    <Plus class="h-5 w-5" />
                    <CardTitle class="">
                      {#if hasReachedResearchExplorerLimit()}
                        Project Limit Reached
                      {:else}
                        Create Project
                      {/if}
                    </CardTitle>
                  </div>
                  <CardDescription
                    >{#if hasReachedResearchExplorerLimit()}
                      Upgrade your plan to create more projects
                    {:else}
                      Start a new project in your workspace
                    {/if}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {#if hasReachedResearchExplorerLimit()}
                    {#if currentOrg?.id}
                      <ManageSubscription
                        organizationId={currentOrg.id}
                        isUpgradeCta={true}
                      />
                    {/if}
                  {:else}
                    <form onsubmit={createProject} class="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Project name"
                        bind:value={newProjectName}
                        required
                        class=""
                      />
                      <Button type="submit" class="">Create</Button>
                    </form>
                  {/if}
                </CardContent>
              </Card>

              <!-- Create Department (only if pro features and organization subscription) -->
              {#if canCreateDepartment()}
                <Card
                  class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
                >
                  <CardHeader>
                    <div class="flex items-center gap-2">
                      <FolderTree class="h-5 w-5" />
                      <CardTitle class="">Create Department</CardTitle>
                    </div>
                    <CardDescription>
                      Create a new department to organize projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onsubmit={createDepartment} class="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Department name"
                        bind:value={newDepartmentName}
                        required
                        class=""
                      />
                      <Button
                        type="submit"
                        disabled={isCreatingDepartment}
                        class=""
                      >
                        {#if isCreatingDepartment}
                          <div
                            class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
                          ></div>
                          Creating...
                        {:else}
                          Create
                        {/if}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              {/if}
            </div>

            <!-- Right Column -->
            <div class="space-y-6">
              {#if currentOrg && isOrganizationOwner()}
                <!-- Subscription Management -->
                {#if currentOrg.billingProviderId}
                  <Card
                    class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
                  >
                    <CardHeader>
                      <div class="flex items-center gap-2">
                        <CreditCard class="h-5 w-5" />
                        <CardTitle class="">Subscription</CardTitle>
                      </div>
                      <CardDescription>
                        Current Plan: {currentOrg.subscription?.plan?.name ||
                          "No plan"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ManageSubscription organizationId={currentOrg.id} />
                    </CardContent>
                  </Card>
                {:else}
                  <Card
                    class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
                  >
                    <CardHeader>
                      <div class="flex items-center gap-2">
                        <CreditCard class="h-5 w-5" />
                        <CardTitle class="">Subscribe to a Plan</CardTitle>
                      </div>
                      <CardDescription
                        >Choose a subscription plan to continue using Quester</CardDescription
                      >
                    </CardHeader>
                    <CardContent>
                      <Button
                        onclick={() => navigate("/onboarding")}
                        class="w-full "
                      >
                        View Plans
                      </Button>
                    </CardContent>
                  </Card>
                {/if}
              {/if}
            </div>
          </div>
          <!-- Workspace Overview -->
          {#if currentOrg}
            <Card
              class="mt-6 border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
            >
              <CardHeader>
                <div class="flex items-center gap-2">
                  <Users class="h-5 w-5" />
                  <CardTitle class="">Workspace Overview</CardTitle>
                </div>
                <CardDescription>View your workspace structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div class="border rounded-lg p-4">
                  <TreeNode item={currentOrg} onSelect={handleTreeNodeSelect} />
                </div>
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}
    </main>
  </div>
</Sidebar.Provider>

<!-- src/routes/Dashboard.svelte -->
<script lang="ts">
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { auth } from "../lib/stores/AuthStore.svelte";
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
  import InviteUserForm from "$lib/components/InviteUserForm.svelte";
  import ManageSubscription from "$lib/components/ManageSubscription.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { Plus, Users, CreditCard } from "lucide-svelte";

  let organizations = $state<Organization[]>([]);
  let currentOrg = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);
  let projects = $state<Project[]>([]);
  let newProjectName = $state("");
  let isLoading = $state(true);
  let selectedOrgId = $state<string | null>(null);
  let error = $state<string | null>(null);

  // Helper function to check if user has pro features
  function hasProFeatures() {
    return (
      currentOrg?.subscriptionType === "organization" ||
      currentOrg?.name?.toLowerCase().includes("pro")
    );
  }

  onMount(async () => {
    try {
      // Wait for auth store to finish loading
      if (auth.isLoading) {
        await new Promise((resolve) => {
          const checkLoading = () => {
            if (!auth.isLoading) {
              resolve(true);
            } else {
              setTimeout(checkLoading, 100);
            }
          };
          checkLoading();
        });
      }

      // If we already have organizations in the auth store, use those
      if (auth.currentOrganization) {
        currentOrg = auth.currentOrganization;
        selectedOrgId = currentOrg.id;
        await loadDepartmentsAndProjects();
      }

      // Load fresh data
      await loadOrganizations();
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to load organizations";
      console.error("Error loading organizations:", err);
    } finally {
      isLoading = false;
    }
  });

  async function loadOrganizations() {
    try {
      if (!auth.user?.id) return;

      const response = await fetch(
        `http://localhost:3333/organizations/by-user?userId=${auth.user.id}`,
        { credentials: "include" }
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

    const deptResponse = await fetch(
      `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
      { credentials: "include" }
    );
    const deptData = await deptResponse.json();
    departments = deptData.data.filter(
      (d: Department) => d.organizationId === currentOrg?.id
    );

    const projectsResponse = await fetch(
      `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
      { credentials: "include" }
    );
    const projectsData = await projectsResponse.json();
    projects = projectsData.data.filter(
      (p: Project) => p.organizationId === currentOrg?.id
    );
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
      navigate(`/org/${currentOrg.slug}/project/${projectSlug}`);
    } catch (error) {
      console.error("Failed to create project:", error);
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
  <div class="flex h-screen bg-background">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      <div class="container mx-auto py-6 px-4">
        <!-- Welcome Section -->
        <div class="mb-8">
          <h1 class="text-3xl font-mono font-bold mb-2">
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
              <CardTitle class="text-lg font-mono">Projects</CardTitle>
              <CardDescription>{projects.length} total projects</CardDescription
              >
            </CardContent>
          </Card>
          {#if hasProFeatures()}
            <Card>
              <CardContent class="flex flex-col items-center justify-center">
                <CardTitle class="text-lg font-mono">Team Members</CardTitle>
                <CardDescription
                  >{currentOrg?.members?.length || 0} members</CardDescription
                >
              </CardContent>
            </Card>
          {/if}
          {#if currentOrg?.subscriptionType === "organization"}
            <Card>
              <CardHeader class="text-center">
                <CardTitle class="text-lg font-mono">Departments</CardTitle>
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
              class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
            >
              <CardHeader>
                <div class="flex items-center gap-2">
                  <Plus class="h-5 w-5" />
                  <CardTitle class="font-mono">Create Project</CardTitle>
                </div>
                <CardDescription
                  >Start a new project in your workspace</CardDescription
                >
              </CardHeader>
              <CardContent>
                <form onsubmit={createProject} class="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Project name"
                    bind:value={newProjectName}
                    required
                    class="font-mono"
                  />
                  <Button type="submit" class="font-mono">Create</Button>
                </form>
              </CardContent>
            </Card>

            <!-- Workspace Overview -->
            {#if currentOrg}
              <Card
                class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
              >
                <CardHeader>
                  <div class="flex items-center gap-2">
                    <Users class="h-5 w-5" />
                    <CardTitle class="font-mono">Workspace Overview</CardTitle>
                  </div>
                  <CardDescription
                    >View your workspace structure</CardDescription
                  >
                </CardHeader>
                <CardContent>
                  <div class="border rounded-lg p-4">
                    <TreeNode
                      item={currentOrg}
                      onSelect={handleTreeNodeSelect}
                    />
                  </div>
                </CardContent>
              </Card>
            {/if}
          </div>

          <!-- Right Column -->
          <div class="space-y-6">
            {#if currentOrg}
              {#if hasProFeatures()}
                <!-- Team Management -->
                <Card
                  class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
                >
                  <CardHeader>
                    <div class="flex items-center gap-2">
                      <Users class="h-5 w-5" />
                      <CardTitle class="font-mono">Team Management</CardTitle>
                    </div>
                    <CardDescription
                      >Invite and manage team members</CardDescription
                    >
                  </CardHeader>
                  <CardContent>
                    <InviteUserForm
                      organization={currentOrg}
                      {departments}
                      {projects}
                    />
                  </CardContent>
                </Card>
              {:else}
                <!-- Upgrade CTA -->
                <Card
                  class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
                >
                  <CardHeader>
                    <div class="flex items-center gap-2">
                      <Users class="h-5 w-5" />
                      <CardTitle class="font-mono">Team Features</CardTitle>
                    </div>
                    <CardDescription
                      >Upgrade your plan to invite team members and collaborate</CardDescription
                    >
                  </CardHeader>
                  <CardContent>
                    <ManageSubscription
                      organizationId={currentOrg.id}
                      isUpgradeCta={true}
                    />
                  </CardContent>
                </Card>
              {/if}

              <!-- Subscription Management -->
              {#if currentOrg.billingProviderId}
                <Card
                  class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
                >
                  <CardHeader>
                    <div class="flex items-center gap-2">
                      <CreditCard class="h-5 w-5" />
                      <CardTitle class="font-mono">Subscription</CardTitle>
                    </div>
                    <CardDescription
                      >Manage your subscription and billing</CardDescription
                    >
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
                      <CardTitle class="font-mono"
                        >Subscribe to a Plan</CardTitle
                      >
                    </div>
                    <CardDescription
                      >Choose a subscription plan to continue using Quester</CardDescription
                    >
                  </CardHeader>
                  <CardContent>
                    <Button
                      onclick={() => navigate("/onboarding")}
                      class="w-full font-mono"
                    >
                      View Plans
                    </Button>
                  </CardContent>
                </Card>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </main>
  </div>
</Sidebar.Provider>

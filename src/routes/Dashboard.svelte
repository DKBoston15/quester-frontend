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
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import type { Department, Organization, Project } from "../lib/types/auth";
  import TreeNode from "$lib/components/TreeNode.svelte";
  import InviteUserForm from "$lib/components/InviteUserForm.svelte";
  import ManageSubscription from "$lib/components/ManageSubscription.svelte";

  let organizations = $state<Organization[]>([]);
  let currentOrg = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);
  let projects = $state<Project[]>([]);
  let newProjectName = $state("");
  let isLoading = $state(true);

  onMount(async () => {
    await loadOrganizations();
  });

  async function loadOrganizations() {
    const response = await fetch(
      `http://localhost:3333/organizations/by-user?userId=${auth.user?.id}`,
      { credentials: "include" }
    );
    const data = await response.json();
    organizations = data.data;

    if (organizations.length > 0) {
      currentOrg = organizations[0];
      await loadDepartmentsAndProjects();
    }

    isLoading = false;
  }

  async function loadDepartmentsAndProjects() {
    if (!currentOrg || !auth.user) return;

    // Load departments
    const deptResponse = await fetch(
      `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
      { credentials: "include" }
    );
    const deptData = await deptResponse.json();
    departments = deptData.data.filter(
      (d) => d.organizationId === currentOrg.id
    );

    // Load projects
    const projectsResponse = await fetch(
      `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
      { credentials: "include" }
    );
    const projectsData = await projectsResponse.json();
    projects = projectsData.data.filter(
      (p) => p.organizationId === currentOrg.id
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

  function handleItemSelect(item: Organization | Department | Project) {
    if ("slug" in item) {
      // Organization
      currentOrg = item;
      loadDepartmentsAndProjects(); // Load new departments and projects when org changes
    } else if (!("departmentId" in item)) {
      // Project
      if (!currentOrg) return;
      const projectSlug = item.name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/org/${currentOrg.slug}/project/${projectSlug}`);
    }
    // For departments, we just expand/collapse in the tree view
  }

  async function checkSubscription() {
    if (!currentOrg) return false;
    const response = await fetch(
      `http://localhost:3333/organizations/${currentOrg.id}/subscription`,
      { credentials: "include" }
    );
    return response.ok;
  }
</script>

<div class="container mx-auto py-6">
  <div class="grid gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Your Workspace</CardTitle>
      </CardHeader>
      <CardContent>
        {#if isLoading}
          <div>Loading...</div>
        {:else if organizations.length === 0}
          <div>
            No organizations found. <a href="/onboarding" class="text-blue-500"
              >Create one</a
            >
          </div>
        {:else}
          <div class="space-y-6">
            <!-- Tree View -->
            <div class="border rounded-lg p-4">
              {#each organizations as org}
                <TreeNode item={org} onSelect={handleItemSelect} />
              {/each}
            </div>

            <!-- Quick Project Creation -->
            {#if currentOrg}
              <div class="mt-6">
                <h3 class="font-medium mb-4">Create New Project</h3>
                <form onsubmit={createProject} class="flex gap-2">
                  <Input
                    type="text"
                    placeholder="New project name"
                    bind:value={newProjectName}
                    required
                  />
                  <Button type="submit">Create Project</Button>
                </form>
              </div>
            {/if}
          </div>
        {/if}
      </CardContent>
    </Card>

    {#if currentOrg}
      <div class="mt-6">
        <InviteUserForm organization={currentOrg} {departments} {projects} />
      </div>
    {/if}

    {#if currentOrg}
      <ManageSubscription organizationId={currentOrg.id} />
    {/if}

    {#if currentOrg}
      {#await checkSubscription()}
        <div>Loading subscription status...</div>
      {:then hasSubscription}
        {#if !hasSubscription}
          <Card>
            <CardHeader>
              <CardTitle>Subscribe to a Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Choose a subscription plan to continue using Quester.</p>
              <Button onclick={() => navigate("/pricing")}>View Plans</Button>
            </CardContent>
          </Card>
        {/if}
      {/await}
    {/if}
  </div>
</div>

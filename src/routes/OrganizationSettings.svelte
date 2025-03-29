<!-- src/routes/OrganizationSettings.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Building2, RefreshCw } from "lucide-svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
  } from "$lib/components/ui/card";
  import TeamSettings from "./components/TeamSettings.svelte";
  import ResourceSelector from "./components/ResourceSelector.svelte";

  // Reactive state
  let isLoading = $state(true);

  // Load data on mount
  onMount(async () => {
    try {
      // Initialize team management store
      await teamManagement.initialize();

      // If no resource is selected, select the first organization
      if (
        !teamManagement.selectedResourceId &&
        teamManagement.userResources?.organizations?.length > 0
      ) {
        const firstOrg = teamManagement.userResources.organizations[0];
        teamManagement.setSelectedResource("organization", firstOrg.id);
      }
    } catch (error) {
      console.error("Error initializing settings:", error);
    } finally {
      isLoading = false;
    }
  });

  function refreshData() {
    teamManagement.refreshCurrentResource();
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
          <p class="ml-4 text-muted-foreground">Loading settings...</p>
        </div>
      {:else}
        <div class="container mx-auto py-6 px-4">
          <!-- Header -->
          <div class="mb-8">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <h1 class="text-3xl font-bold">Organization Settings</h1>
                {#if teamManagement.isLoading}
                  <RefreshCw class="h-5 w-5 animate-spin" />
                {/if}
              </div>

              <div class="flex items-center gap-2">
                <Button variant="outline" onclick={refreshData}>
                  <RefreshCw class="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            <p class="text-muted-foreground">
              Manage settings and permissions for your organization.
            </p>
          </div>

          <!-- Resource Selector -->
          {#if !teamManagement.isLoading && teamManagement.userResources}
            <Card class="mb-6">
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <Building2 class="h-5 w-5" />
                  {teamManagement.organizationStructure?.name ||
                    "Select Organization"}
                </CardTitle>
                <CardDescription>
                  Select an organization to manage its settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResourceSelector
                  resources={teamManagement.userResources}
                  selectedType="organization"
                  selectedId={teamManagement.selectedResourceId}
                  onSelect={(
                    type: "organization" | "department" | "project",
                    id: string
                  ) => teamManagement.setSelectedResource(type, id)}
                />
              </CardContent>
            </Card>
          {/if}

          <!-- Settings Content -->
          {#if !teamManagement.isLoading && teamManagement.organizationStructure}
            <Card>
              <CardContent class="pt-6">
                <TeamSettings resourceType="organization" />
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}
    </main>
  </div>
</Sidebar.Provider>

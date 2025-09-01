<script lang="ts">
  import { onMount } from "svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { Button } from "$lib/components/ui/button";
  import { Building2, RefreshCw, Info } from "lucide-svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
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
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";

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

  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#org-settings-header",
        popover: {
          title: "Organization Settings Hub",
          description:
            "This page allows administrators and owners to manage settings specific to the selected organization.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#org-selector-card",
        popover: {
          title: "Select Your Organization",
          description:
            "If you belong to multiple organizations, use this selector to switch between them and manage their specific settings.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#refresh-org-button",
        popover: {
          title: "Refresh Data",
          description:
            "Click here to reload the latest settings and team information for the selected organization.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#team-settings-card",
        popover: {
          title: "Team & Permission Settings",
          description:
            "This section contains controls for managing how users interact within the organization, including invitations and content creation permissions.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#setting-disable-invitations",
        popover: {
          title: "Control Invitations",
          description:
            "(Owner Only) Enable or disable the ability for anyone to invite new members to this organization.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#setting-allow-member-invites",
        popover: {
          title: "Delegate Invitations",
          description:
            "(Owner Only) If invitations are enabled, choose whether regular members and admins (not just owners) can invite others.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#setting-members-create-projects",
        popover: {
          title: "Project Creation Permission",
          description:
            "(Admin/Owner) Decide if regular members should be allowed to create new projects within this organization.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#setting-members-create-departments",
        popover: {
          title: "Department Creation (Members)",
          description:
            "(Owner Only) Control whether regular members can create new departments.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#setting-admins-create-departments",
        popover: {
          title: "Department Creation (Admins)",
          description:
            "(Owner Only) Control whether administrators can create new departments.",
          side: "top",
          align: "start",
        },
      },
      {
        element: ".container", // General overview
        popover: {
          title: "Manage Your Organization",
          description:
            "Use these settings to configure how your team collaborates and manages research within Quester.",
          side: "top",
          align: "center",
        },
      },
    ],
  });
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
          <div class="mb-8" id="org-settings-header">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-2">
                  <h1 class="text-3xl font-bold">Organization Settings</h1>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Info class="h-5 w-5 text-muted-foreground" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p class="text-sm max-w-xs">
                        Configure and manage settings for your organization,
                        including team permissions, invitation controls, and
                        project creation policies.
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
                {#if teamManagement.isLoading}
                  <RefreshCw class="h-5 w-5 animate-spin" />
                {/if}
              </div>

              <div class="flex items-center gap-2">
                <Button
                  id="refresh-org-button"
                  variant="outline"
                  onclick={refreshData}
                >
                  <RefreshCw class="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <!-- Add Learn Button -->
                <Button
                  variant="outline"
                  onclick={() => driverObj.drive()}
                  aria-label="Learn about Organization Settings"
                >
                  <GraduationCap class="h-4 w-4 mr-2" />
                  Tour
                </Button>
              </div>
            </div>
            <p class="text-muted-foreground">
              Manage settings and permissions for your organization.
            </p>
          </div>

          <!-- Resource Selector -->
          {#if !teamManagement.isLoading && teamManagement.userResources}
            <Card class="mb-6" id="org-selector-card">
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
            <Card id="team-settings-card">
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

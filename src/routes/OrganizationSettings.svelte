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
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  // Reactive state
  let isLoading = $state(true);

  // Load data on mount
  onMount(() => {
    void (async () => {
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
      } catch (err) {
        console.error("Error initializing settings:", err);
      } finally {
        isLoading = false;
      }
    })();
  });

  function refreshData() {
    teamManagement.refreshCurrentResource();
  }

  // Create organization settings tour with translated steps
  function createOrganizationSettingsTour() {
    return driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#org-settings-header",
          popover: {
            title: t("organizationSettings.tour.header.title"),
            description: t("organizationSettings.tour.header.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#org-selector-card",
          popover: {
            title: t("organizationSettings.tour.selector.title"),
            description: t("organizationSettings.tour.selector.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#refresh-org-button",
          popover: {
            title: t("organizationSettings.tour.refresh.title"),
            description: t("organizationSettings.tour.refresh.description"),
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#team-settings-card",
          popover: {
            title: t("organizationSettings.tour.teamSettings.title"),
            description: t("organizationSettings.tour.teamSettings.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#setting-disable-invitations",
          popover: {
            title: t("organizationSettings.tour.disableInvitations.title"),
            description: t("organizationSettings.tour.disableInvitations.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#setting-allow-member-invites",
          popover: {
            title: t("organizationSettings.tour.allowMemberInvites.title"),
            description: t("organizationSettings.tour.allowMemberInvites.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#setting-members-create-projects",
          popover: {
            title: t("organizationSettings.tour.membersCreateProjects.title"),
            description: t("organizationSettings.tour.membersCreateProjects.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#setting-members-create-departments",
          popover: {
            title: t("organizationSettings.tour.membersCreateDepartments.title"),
            description: t("organizationSettings.tour.membersCreateDepartments.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#setting-admins-create-departments",
          popover: {
            title: t("organizationSettings.tour.adminsCreateDepartments.title"),
            description: t("organizationSettings.tour.adminsCreateDepartments.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: ".container",
          popover: {
            title: t("organizationSettings.tour.overview.title"),
            description: t("organizationSettings.tour.overview.description"),
            side: "top",
            align: "center",
          },
        },
      ],
    });
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
          <p class="ml-4 text-muted-foreground">{t("organizationSettings.loadingSettings")}</p>
        </div>
      {:else}
        <div class="container mx-auto py-6 px-4">
          <!-- Header -->
          <div class="mb-8" id="org-settings-header">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-2">
                  <h1 class="text-3xl font-bold">{t("organizationSettings.title")}</h1>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Info class="h-5 w-5 text-muted-foreground" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p class="text-sm max-w-xs">
                        {t("organizationSettings.tooltip")}
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
                  {t("organizationSettings.refresh")}
                </Button>
                <!-- Add Learn Button -->
                <Button
                  variant="outline"
                  onclick={() => createOrganizationSettingsTour().drive()}
                  aria-label={t("organizationSettings.tourAriaLabel")}
                >
                  <GraduationCap class="h-4 w-4 mr-2" />
                  {t("organizationSettings.tourButton")}
                </Button>
              </div>
            </div>
            <p class="text-muted-foreground">
              {t("organizationSettings.subtitle")}
            </p>
          </div>

          <!-- Resource Selector -->
          {#if !teamManagement.isLoading && teamManagement.userResources}
            <Card class="mb-6" id="org-selector-card">
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <Building2 class="h-5 w-5" />
                  {teamManagement.organizationStructure?.name ||
                    t("organizationSettings.selectOrganization")}
                </CardTitle>
                <CardDescription>
                  {t("organizationSettings.selectOrganizationDescription")}
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

<script lang="ts">
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { auth } from "$lib/stores/AuthStore";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from "$lib/components/ui/card";
  import type { Department, Organization, Project } from "../lib/types/auth";
  import OrganizationStructure from "$lib/components/OrganizationStructure.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import AnnouncementBar from "$lib/components/announcements/AnnouncementBar.svelte";
  import { FolderTree, GraduationCap } from "lucide-svelte";
  import { api } from "$lib/services/api-client";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper to get translation value imperatively for driver.js
  const t = (key: string) => get(_)(key);

  let organizations = $state<Organization[]>([]);
  let currentOrg = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);
  let projects = $state<Project[]>([]);
  let isLoading = $state(true);
  let selectedOrgId = $state<string | null>(null);
  let error = $state<string | null>(null);

  // Organization owner role ID
  const ORGANIZATION_OWNER_ROLE_ID = "e820de49-d7bd-42d7-8b05-49279cee686f";

  // Helper function to check if user is organization owner
  function isOrganizationOwner() {
    if (!currentOrg?.organizationRoles?.length) return false;
    return currentOrg.organizationRoles.some(
      (role) => role.roleId === ORGANIZATION_OWNER_ROLE_ID
    );
  }

  // Create dashboard tour with translated steps
  function createDashboardTour() {
    return driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#dashboard-welcome",
          popover: {
            title: t("tours.dashboard.welcome.title"),
            description: t("tours.dashboard.welcome.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#organization-structure-card",
          popover: {
            title: t("tours.dashboard.organizationStructure.title"),
            description: t("tours.dashboard.organizationStructure.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#org-view-mode-toggle",
          popover: {
            title: t("tours.dashboard.viewModeToggle.title"),
            description: t("tours.dashboard.viewModeToggle.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#org-new-department-button",
          popover: {
            title: t("tours.dashboard.newDepartment.title"),
            description: t("tours.dashboard.newDepartment.description"),
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#org-new-project-button",
          popover: {
            title: t("tours.dashboard.newProject.title"),
            description: t("tours.dashboard.newProject.description"),
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#org-search-input",
          popover: {
            title: t("tours.dashboard.search.title"),
            description: t("tours.dashboard.search.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#org-filter-toggle",
          popover: {
            title: t("tours.dashboard.filter.title"),
            description: t("tours.dashboard.filter.description"),
            side: "bottom",
            align: "start",
          },
        },
      ],
    });
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
          : t("dashboard.failedToInitialize");
    } finally {
      isLoading = false;
    }
  });

  async function loadOrganizations() {
    try {
      if (!auth.user?.id) return;

      const data = await api.get(
        `/organizations/by-user?userId=${auth.user.id}`
      );
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
        try {
          const resourcesData = await api.get(`/team-management/resources`);
          // Use the organization data from team-management/resources if available
          if (
            resourcesData.organizations &&
            resourcesData.organizations.length > 0
          ) {
            const foundOrg = resourcesData.organizations.find(
              (o: Organization) => o.id === orgToUse.id
            );
            if (foundOrg) {
              orgToUse = { ...orgToUse, ...foundOrg };
            }
          }
        } catch (error) {
          console.error("Error loading organization details:", error);
          // Continue even if there's an error to avoid blocking the dashboard
        }

        // Update both local state and auth store
        currentOrg = orgToUse;
        selectedOrgId = orgToUse.id;
        await auth.setCurrentOrganization(orgToUse);

        // If we have an org but no billing provider, redirect to onboarding
        // Also redirect if we have billing provider but no active subscription
        if (!orgToUse.billingProviderId || !orgToUse.subscription) {
          navigate("/onboarding");
          return;
        }

        await loadDepartmentsAndProjects();
      } else {
        // If no organizations found, clear the current org and redirect to onboarding
        currentOrg = null;
        selectedOrgId = null;
        await auth.setCurrentOrganization(null);
        navigate("/onboarding");
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
      throw err;
    }
  }

  async function loadDepartmentsAndProjects() {
    if (!currentOrg || !auth.user) return;

    try {
      const deptData = await api.get(
        `/departments/by-user?userId=${auth.user.id}`
      );

      // Filter for current organization
      departments = deptData.data.filter(
        (d: Department) => d.organizationId === currentOrg?.id
      );

      const projectsData = await api.get(
        `/projects/by-user?userId=${auth.user.id}`
      );

      // Filter for current organization
      projects = projectsData.data.filter(
        (p: Project) => p.organizationId === currentOrg?.id
      );

      // Check if user has projects after loading
      // Only redirect the OWNER to create the first project if none exist
      if (projects.length === 0 && isOrganizationOwner()) {
        // Determine the correct onboarding step based on subscription type
        const step = currentOrg.subscriptionType === "organization" ? 4 : 3;
        navigate("/onboarding", { state: { step: step } });
        return; // Prevent dashboard from rendering further
      }
    } catch (error) {
      console.error("Error loading departments and projects:", error);
      // We continue even if there's an error to avoid blocking the dashboard
    }
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
          <p class="ml-4 text-muted-foreground">{$_('dashboard.loadingDashboard')}</p>
        </div>
      {:else}
        <div class="container mx-auto py-6 px-4">
          <!-- Welcome Section -->
          <div class="mb-8" id="dashboard-welcome">
            <div class="flex justify-between items-center">
              <h1 class="text-3xl font-bold">
                {$_('dashboard.welcome', { values: { name: auth.user?.firstName || '' } })}
              </h1>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Button
                      variant="outline"
                      onclick={() => createDashboardTour().drive()}
                      aria-label={$_('dashboard.tour')}
                    >
                      <GraduationCap class="h-4 w-4 mr-2" />
                      {$_('dashboard.tour')}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>{$_('dashboard.tutorial')}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
            <p class="text-muted-foreground mt-1">
              {$_('dashboard.workspaceOverview')}
            </p>
          </div>

          <!-- Announcement Bar -->
          <AnnouncementBar />

          {#if error}
            <div class="mb-6">
              <Card class="border border-red-400">
                <CardContent class="text-red-600 py-4">
                  {error}
                </CardContent>
              </Card>
            </div>
          {/if}

          <!-- Quick Stats -->
          <!-- <div
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
            </Card> -->
          <!-- {#if hasProFeatures()}
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
            {/if} -->
          <!-- </div> -->

          <!-- Main Actions Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Right Column -->
            <div class="space-y-6"></div>
          </div>
          <!-- Workspace Overview -->
          {#if currentOrg}
            <Card
              id="organization-structure-card"
              class="mt-6 border dark:border-dark-border shadow-md dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-lg dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all"
            >
              <CardHeader>
                <div class="flex items-center gap-2">
                  <FolderTree class="h-5 w-5" />
                  <CardTitle class="">{$_('dashboard.organizationStructure')}</CardTitle>
                </div>
                <CardDescription>
                  {$_('dashboard.organizationStructureDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="border rounded-lg p-4">
                  <OrganizationStructure initialOrganization={currentOrg} />
                </div>
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}
    </main>
  </div>
</Sidebar.Provider>

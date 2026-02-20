<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import {
    Home,
    Settings,
    LogOut,
    ChevronDown,
    ChevronUp,
    FolderKanban,
    UserPlus,
    ChartBar,
  } from "lucide-svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { auth } from "$lib/stores/AuthStore";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { navigate, Link, useLocation } from "svelte-routing";
  import { DarkmodeToggle } from "$lib/components/ui/darkmode-toggle";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { api } from "$lib/services/api-client";
  import { _ } from "svelte-i18n";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore";

  // Clear project context when AppSidebar is shown (navigating away from a project)
  $effect(() => {
    globalSearchStore.clearProjectContext();
  });

  // Location for active route detection
  const location = useLocation();

  // Helper to check if route is active
  function isRouteActive(url: string): boolean {
    return $location.pathname === url;
  }

  // Define MenuItem type
  interface MenuItem {
    titleKey: string;
    url: string;
    icon: typeof Home | typeof UserPlus | typeof ChartBar | typeof Settings;
    requiresAdmin?: boolean;
  }

  // Menu items for the main navigation
  const mainNavItems: MenuItem[] = [
    {
      titleKey: "navigation.dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      titleKey: "navigation.teamManagement",
      url: "/team-management",
      icon: UserPlus,
    },
    {
      titleKey: "navigation.organizationAnalytics",
      url: "/organization-analytics",
      icon: ChartBar,
      requiresAdmin: true,
    },
    {
      titleKey: "navigation.settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  let projects = $state<any[]>([]);
  let isProjectsOpen = $state<string | undefined>("projects");

  let canViewOrgAnalytics = $state(false);

  // Function to check admin roles
  function checkAdminRoles() {
    const userId = auth.user?.id;
    const orgId = auth.currentOrganization?.id;
    const resources = teamManagement.userResources;

    if (!userId || !orgId || !resources) {
      return false;
    }

    const ADMIN_ROLES = new Set(["admin", "owner", "manager"]);

    // Check organization roles
    const currentOrg = resources.organizations?.find(
      (org: any) => org.id === orgId
    );
    if (currentOrg) {
      const hasOrgAdminRole = currentOrg.organizationRoles?.some(
        (roleInfo: any) =>
          roleInfo.userId === userId &&
          ADMIN_ROLES.has(roleInfo.role?.name?.toLowerCase())
      );
      if (hasOrgAdminRole) {
        return true;
      }
    }

    // Check department roles
    const relevantDepartments = resources.departments?.filter(
      (dept: any) => dept.organizationId === orgId
    );

    if (relevantDepartments?.length > 0) {
      const hasDeptAdminRole = relevantDepartments.some((dept: any) =>
        dept.departmentRoles?.some(
          (roleInfo: any) =>
            roleInfo.userId === userId &&
            ADMIN_ROLES.has(roleInfo.role?.name?.toLowerCase())
        )
      );
      if (hasDeptAdminRole) {
        return true;
      }
    }

    return false;
  }

  // Calculate visible nav items based on permissions
  function getVisibleNavItems(): MenuItem[] {
    return mainNavItems.filter((item) => {
      // If an item requires admin privileges, only show it if the user has those privileges
      if (item.requiresAdmin) {
        return canViewOrgAnalytics;
      }
      // Show all other items
      return true;
    });
  }

  // Array to store the filtered nav items
  let visibleNavItems = $state<MenuItem[]>([]);

  function toggleProjects() {
    isProjectsOpen = isProjectsOpen === "projects" ? undefined : "projects";
  }

  $effect(() => {
    if (auth.currentOrganization) {
      teamManagement.loadUserResources();
      loadProjects();

      // Wait for resources to be loaded before checking roles
      setTimeout(() => {
        canViewOrgAnalytics = checkAdminRoles();
        visibleNavItems = getVisibleNavItems();
      }, 300);
    }
  });

  // Update visible items when permissions change
  $effect(() => {
    visibleNavItems = getVisibleNavItems();
  });

  // Update permissions when resources change
  $effect(() => {
    if (teamManagement.userResources) {
      canViewOrgAnalytics = checkAdminRoles();
    }
  });

  async function loadProjects() {
    if (!auth.user?.id || !auth.currentOrganization?.id) return;

    try {
      let allProjects: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const data = await api.get(
          `/projects/by-user?userId=${auth.user.id}&page=${currentPage}&limit=50&sort=lastViewedAt&order=desc`
        );
        const pageProjects = data.data || [];

        // Filter for the current organization *after* fetching
        const orgProjects = pageProjects.filter(
          (p: any) => p.organizationId === auth.currentOrganization?.id
        );
        allProjects = [...allProjects, ...orgProjects];

        // Check pagination meta data
        if (data.meta && data.meta.lastPage > data.meta.currentPage) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
      projects = allProjects;
    } catch (error) {
      console.error("Failed to load projects:", error);
      projects = []; // Ensure projects is empty on error
    }
  }

  function handleLogout() {
    auth.logout();
  }
</script>

<Sidebar.Root
  collapsible="icon"
  class="border-r-2 dark:border-dark-border bg-gradient-to-b from-card to-background shadow-[4px_0px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_0px_0px_0px_rgba(44,46,51,0.1)]"
>
  <Sidebar.Header class="border-b-2 dark:border-dark-border">
    <div class="flex items-center gap-2 py-2">
      <Sidebar.Trigger
        class="h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 p-2 rounded-sm"
      />
      <Tooltip.Root>
        <Tooltip.Trigger class="overflow-hidden">
          <span
            class="block font-bold text-lg truncate group-data-[collapsible=icon]:hidden pr-2"
          >
            {auth.currentOrganization?.name || $_('sidebar.selectWorkspace')}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content side="right" sideOffset={10} class="z-[9999]">
          <span>{auth.currentOrganization?.name || $_('sidebar.selectWorkspace')}</span>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <!-- Main Navigation -->
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each visibleNavItems as item (item.titleKey)}
            <Link to={item.url} class="block">
              <Sidebar.MenuItem class="relative">
                {#if isRouteActive(item.url)}
                  <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-primary to-primary/70"></div>
                {/if}
                <Sidebar.MenuButton isActive={isRouteActive(item.url)}>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div
                        class="flex items-center gap-3 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <svelte:component
                          this={item.icon}
                          class="h-4 w-4 flex-shrink-0"
                        />
                        <span class="group-data-[collapsible=icon]:hidden"
                          >{$_(item.titleKey)}</span
                        >
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="right"
                      sideOffset={10}
                      class="group-data-[collapsible=icon]:block hidden z-[9999]"
                    >
                      <span>{$_(item.titleKey)}</span>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Link>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <!-- Projects Section -->
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <div
                    class="flex items-center gap-3 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                    onclick={(e) => {
                      e.stopPropagation();
                      toggleProjects();
                    }}
                  >
                    <FolderKanban class="h-4 w-4 flex-shrink-0" />
                    <span class="group-data-[collapsible=icon]:hidden"
                      >{$_('navigation.projects')}</span
                    >
                    {#if isProjectsOpen === "projects"}
                      <ChevronUp
                        class="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden"
                      />
                    {:else}
                      <ChevronDown
                        class="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden"
                      />
                    {/if}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content
                  side="right"
                  sideOffset={10}
                  class="group-data-[collapsible=icon]:block hidden z-[9999]"
                >
                  <span class="">{$_('navigation.projects')}</span>
                </Tooltip.Content>
              </Tooltip.Root>
            </Sidebar.MenuButton>

            <Accordion.Root
              type="single"
              value={isProjectsOpen}
              class="group-data-[collapsible=icon]:hidden"
            >
              <Accordion.Item value="projects">
                <Accordion.Content>
                  <Sidebar.Menu
                    class="max-h-[calc(100vh-400px)] overflow-y-auto pr-2"
                  >
                    {#if projects.length > 0}
                      {#each projects as project}
                        <Tooltip.Root>
                          <Tooltip.Trigger class="block w-full text-left">
                            <a
                              href={`/project/${project.id}`}
                              class="block"
                              onclick={async (e) => {
                                e.preventDefault();
                                try {
                                  api.post(
                                    `/projects/${project.id}/view`
                                  );
                                } catch (fetchError) {
                                  console.error(
                                    "Error recording project view:",
                                    fetchError
                                  );
                                }
                                navigate(`/project/${project.id}`);
                              }}
                            >
                              <Sidebar.MenuItem>
                                <Sidebar.MenuButton>
                                  <div
                                    class="flex ml-4 items-center px-4 py-2 overflow-hidden"
                                  >
                                    <div
                                      class="w-2 h-2 rounded-full bg-foreground/70 flex-shrink-0"
                                    ></div>
                                    <span
                                      class="ml-4 truncate pr-2 text-ellipsis"
                                      >{project.name}</span
                                    >
                                  </div>
                                </Sidebar.MenuButton>
                              </Sidebar.MenuItem>
                            </a>
                          </Tooltip.Trigger>
                          <Tooltip.Content side="right" sideOffset={10}>
                            <span>{project.name}</span>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      {/each}
                    {:else}
                      <div class="px-4 py-2 text-sm text-muted-foreground">
                        {$_('projects.noProjects')}
                      </div>
                    {/if}
                  </Sidebar.Menu>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

  </Sidebar.Content>

  <Sidebar.Footer class="border-t-2 dark:border-dark-border">
    <div
      class="flex items-center gap-2 group-data-[collapsible=icon]:flex-col-reverse group-data-[collapsible=icon]:items-center"
    >
      <div class="w-[75%] group-data-[collapsible=icon]:w-full">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <div
              class="flex items-center gap-3 hover:bg-accent rounded-md hover:text-accent-foreground transition-colors duration-300 px-4 py-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
            >
              <!-- Avatar Circle -->
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                {auth.user?.firstName?.[0] || ''}{auth.user?.lastName?.[0] || ''}
              </div>

              <!-- User Info (hidden when collapsed) -->
              <div
                class="flex-1 text-left group-data-[collapsible=icon]:hidden whitespace-nowrap"
              >
                <div class="font-medium text-sm">
                  {auth.user?.firstName}
                  {auth.user?.lastName}
                </div>
              </div>
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            side="top"
            class="w-[--bits-dropdown-menu-anchor-width]"
          >
            <DropdownMenu.Item
              onclick={handleLogout}
              class="flex items-center gap-3"
            >
              <LogOut class="h-4 w-4" />
              <span>{$_('auth.signOut')}</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
      <div
        class="w-[25%] flex justify-end group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center"
      >
        <div class="group-data-[collapsible=icon]:p-2">
          <DarkmodeToggle />
        </div>
      </div>
    </div>
  </Sidebar.Footer>

  <!-- Decorative corners -->
  <div
    class="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-dark-accent-blue border dark:border-dark-border"
  ></div>
  <div
    class="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 dark:bg-dark-accent-yellow border dark:border-dark-border"
  ></div>
</Sidebar.Root>

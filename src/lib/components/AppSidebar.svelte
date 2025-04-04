<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import {
    Home,
    Users,
    Settings,
    LogOut,
    ChevronDown,
    ChevronUp,
    FolderKanban,
    UserPlus,
    ChartBar,
  } from "lucide-svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { navigate, Link } from "svelte-routing";
  import { DarkmodeToggle } from "$lib/components/ui/darkmode-toggle";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { API_BASE_URL } from "$lib/config";

  // Define MenuItem type
  interface MenuItem {
    title: string;
    url: string;
    icon: typeof Home | typeof UserPlus | typeof ChartBar | typeof Settings;
    requiresAdmin?: boolean;
  }

  // Menu items for the main navigation
  const mainNavItems: MenuItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Team Management",
      url: "/team-management",
      icon: UserPlus,
    },
    {
      title: "Organization Analytics",
      url: "/organization-analytics",
      icon: ChartBar,
      requiresAdmin: true,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  let projects = $state<any[]>([]);
  let isProjectsOpen = $state<string | undefined>("projects");

  let canViewOrgAnalytics = $state(false);

  // Function to check admin roles
  function checkAdminRoles() {
    console.log("[Sidebar Check] Starting canViewOrgAnalytics check");

    const userId = auth.user?.id;
    const orgId = auth.currentOrganization?.id;
    const resources = teamManagement.userResources;

    console.log("[Sidebar Check] User ID:", userId);
    console.log("[Sidebar Check] Org ID:", orgId);
    console.log("[Sidebar Check] Resources available:", !!resources);

    if (!userId || !orgId || !resources) {
      console.log(
        "[Sidebar Check] Exiting early: Missing userId, orgId, or resources."
      );
      return false;
    }

    const ADMIN_ROLES = new Set(["admin", "owner", "manager"]);
    console.log("[Sidebar Check] Admin roles required:", ADMIN_ROLES);

    // Check organization roles
    const currentOrg = resources.organizations?.find(
      (org: any) => org.id === orgId
    );
    console.log("[Sidebar Check] Found currentOrg:", currentOrg);
    if (currentOrg) {
      const hasOrgAdminRole = currentOrg.organizationRoles?.some(
        (roleInfo: any) =>
          roleInfo.userId === userId &&
          ADMIN_ROLES.has(roleInfo.role?.name?.toLowerCase())
      );
      console.log("[Sidebar Check] User has Org Admin Role:", hasOrgAdminRole);
      if (hasOrgAdminRole) {
        console.log(
          "[Sidebar Check] Granting access based on Organization role."
        );
        return true;
      }
    } else {
      console.log(
        "[Sidebar Check] Current organization not found in resources."
      );
    }

    // Check department roles
    const relevantDepartments = resources.departments?.filter(
      (dept: any) => dept.organizationId === orgId
    );
    console.log(
      "[Sidebar Check] Found relevantDepartments:",
      relevantDepartments
    );

    if (relevantDepartments?.length > 0) {
      const hasDeptAdminRole = relevantDepartments.some((dept: any) =>
        dept.departmentRoles?.some(
          (roleInfo: any) =>
            roleInfo.userId === userId &&
            ADMIN_ROLES.has(roleInfo.role?.name?.toLowerCase())
        )
      );
      console.log(
        "[Sidebar Check] User has Dept Admin Role in any relevant department:",
        hasDeptAdminRole
      );
      if (hasDeptAdminRole) {
        console.log(
          "[Sidebar Check] Granting access based on Department role."
        );
        return true;
      }
    } else {
      console.log(
        "[Sidebar Check] No relevant departments found or user has no roles in them."
      );
    }

    console.log("[Sidebar Check] No qualifying roles found. Denying access.");
    return false;
  }

  // Calculate visible nav items based on permissions
  function getVisibleNavItems(): MenuItem[] {
    console.log(
      "[Sidebar] Calculating visible items, canViewOrgAnalytics =",
      canViewOrgAnalytics
    );
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
    console.log("[Sidebar] Component initialized");
    console.log("[Sidebar] Current organization:", auth.currentOrganization);

    if (auth.currentOrganization) {
      console.log("[Sidebar] Loading resources...");
      teamManagement.loadUserResources();
      loadProjects();

      // Wait for resources to be loaded before checking roles
      setTimeout(() => {
        canViewOrgAnalytics = checkAdminRoles();
        visibleNavItems = getVisibleNavItems();
        console.log(
          "[Sidebar] Visible nav items updated:",
          visibleNavItems.map((i) => i.title)
        );
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
      const response = await fetch(
        `${API_BASE_URL}/projects/by-user?userId=${auth.user.id}`,
        { credentials: "include" }
      );
      const data = await response.json();
      projects = data.data.filter(
        (p: any) => p.organizationId === auth.currentOrganization?.id
      );
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }

  function handleLogout() {
    auth.logout();
    navigate("https://app.quester.tech");
  }
</script>

<Sidebar.Root
  collapsible="icon"
  class="border-r-2 border-black dark:border-dark-border bg-card dark:bg-dark-card shadow-[4px_0px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_0px_0px_0px_rgba(44,46,51,0.1)]"
>
  <Sidebar.Header class="border-b-2 border-black dark:border-dark-border">
    <div class="flex items-center gap-2 py-2">
      <Sidebar.Trigger
        class="h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 p-2 rounded-sm"
      />
      <Tooltip.Root>
        <Tooltip.Trigger class="overflow-hidden">
          <span
            class="block font-bold text-lg truncate group-data-[collapsible=icon]:hidden pr-2"
          >
            {auth.currentOrganization?.name || "Select Workspace"}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content side="right" sideOffset={10} class="z-[9999]">
          <span>{auth.currentOrganization?.name || "Select Workspace"}</span>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <!-- Main Navigation -->
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each visibleNavItems as item (item.title)}
            <Link to={item.url} class="block">
              <Sidebar.MenuItem>
                <Sidebar.MenuButton>
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
                          >{item.title}</span
                        >
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="right"
                      sideOffset={10}
                      class="group-data-[collapsible=icon]:block hidden z-[9999]"
                    >
                      <span class="">{item.title}</span>
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
                      >Projects</span
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
                  <span class="">Projects</span>
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
                  <Sidebar.Menu>
                    {#if projects.length > 0}
                      {#each projects as project}
                        <Tooltip.Root>
                          <Tooltip.Trigger class="block w-full text-left">
                            <a
                              href={`/project/${project.id}`}
                              class="block"
                              onclick={(e) => {
                                e.preventDefault();
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
                        No projects yet
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

  <Sidebar.Footer class="border-t-2 border-black dark:border-dark-border">
    <div
      class="flex items-center gap-2 group-data-[collapsible=icon]:flex-col-reverse group-data-[collapsible=icon]:items-center"
    >
      <div class="w-[75%] group-data-[collapsible=icon]:w-full">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <div
              class="flex items-center gap-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors duration-300 px-4 py-2 group-data-[collapsible=icon]:p-2"
            >
              <div
                class="flex-1 text-left group-data-[collapsible=icon]:hidden whitespace-nowrap"
              >
                <div class="font-medium">
                  {auth.user?.firstName}
                  {auth.user?.lastName}
                </div>
                <!-- <div class="text-sm text-muted-foreground">View profile</div> -->
              </div>
              <Users
                class="h-4 w-4 hidden group-data-[collapsible=icon]:block"
              />
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            side="top"
            class="w-[--bits-dropdown-menu-anchor-width]"
          >
            <!-- <DropdownMenu.Item class="flex items-center gap-3">
              <span class="">Profile</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item class="flex items-center gap-3">
              <span class="">Settings</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator /> -->
            <DropdownMenu.Item
              onclick={handleLogout}
              class="flex items-center gap-3"
            >
              <LogOut class="h-4 w-4" />
              <span class="">Sign out</span>
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
    class="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-dark-accent-blue border border-black dark:border-dark-border"
  ></div>
  <div
    class="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 dark:bg-dark-accent-yellow border border-black dark:border-dark-border"
  ></div>
</Sidebar.Root>

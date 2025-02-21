<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import {
    Home,
    Users,
    Calendar,
    Settings,
    LogOut,
    ChevronDown,
    ChevronUp,
    Plus,
    FolderKanban,
    Sun,
    Moon,
  } from "lucide-svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { navigate } from "svelte-routing";
  import { DarkmodeToggle } from "$lib/components/ui/darkmode-toggle";
  import * as Tooltip from "$lib/components/ui/tooltip";

  // Menu items for the main navigation
  const mainNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Team",
      url: "/team",
      icon: Users,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  let projects = $state<any[]>([]);
  let isProjectsOpen = $state<string | undefined>("projects");

  $effect(() => {
    if (auth.currentOrganization) {
      loadProjects();
    }
  });

  async function loadProjects() {
    if (!auth.user?.id || !auth.currentOrganization?.id) return;

    try {
      const response = await fetch(
        `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
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
    navigate("/login");
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
        <Tooltip.Trigger>
          <span
            class="font-mono font-bold text-lg truncate group-data-[collapsible=icon]:hidden"
          >
            {auth.currentOrganization?.name || "Select Workspace"}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content side="right">
          <span class="font-mono"
            >{auth.currentOrganization?.name || "Select Workspace"}</span
          >
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <!-- Main Navigation -->
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each mainNavItems as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet tooltipContent()}
                  {item.title}
                {/snippet}
                {#snippet child({ props })}
                  <a
                    href={item.url}
                    {...props}
                    class="flex items-center gap-3 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                  >
                    {#if item.icon}
                      <item.icon class="h-4 w-4 flex-shrink-0" />
                    {/if}
                    <span class="font-mono group-data-[collapsible=icon]:hidden"
                      >{item.title}</span
                    >
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
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
              {#snippet tooltipContent()}
                <span>Projects</span>
              {/snippet}
              {#snippet child({ props })}
                <a
                  href="/dashboard"
                  {...props}
                  class="flex items-center gap-3 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                >
                  <FolderKanban class="h-4 w-4 flex-shrink-0" />
                  <span class="font-mono group-data-[collapsible=icon]:hidden"
                    >Projects</span
                  >
                  <ChevronDown
                    class="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden"
                  />
                </a>
              {/snippet}
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
                        <Sidebar.MenuItem>
                          <Sidebar.MenuButton>
                            {#snippet child({ props })}
                              <a
                                href={`/project/${project.id}`}
                                {...props}
                                class="flex ml-4 items-center gap-3 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 px-4 py-2"
                                onclick={(e) => {
                                  e.preventDefault();
                                  navigate(`/project/${project.id}`);
                                }}
                              >
                                <div
                                  class="w-2 h-2 rounded-full bg-foreground/70 flex-shrink-0"
                                ></div>
                                <span class="font-mono">{project.name}</span>
                              </a>
                            {/snippet}
                          </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
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
              class="flex items-center gap-3 font-mono rounded-md hover:bg-accent hover:text-accent-foreground transition-colors duration-300 px-4 py-2 group-data-[collapsible=icon]:p-2"
            >
              <div
                class="flex-1 text-left group-data-[collapsible=icon]:hidden whitespace-nowrap"
              >
                <div class="font-medium">
                  {auth.user?.firstName}
                  {auth.user?.lastName}
                </div>
                <div class="text-sm text-muted-foreground">View profile</div>
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
            <DropdownMenu.Item class="flex items-center gap-3">
              <span class="font-mono">Profile</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item class="flex items-center gap-3">
              <span class="font-mono">Settings</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onclick={handleLogout}
              class="flex items-center gap-3"
            >
              <LogOut class="h-4 w-4" />
              <span class="font-mono">Sign out</span>
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

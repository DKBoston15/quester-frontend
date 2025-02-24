<!-- src/lib/components/ProjectSidebar.svelte -->
<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { DarkmodeToggle } from "$lib/components/ui/darkmode-toggle";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { navigate, Link } from "svelte-routing";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import {
    LogOut,
    Users,
    Settings,
    Home,
    Library,
    Pencil,
    Microscope,
    BarChartHorizontal,
    Workflow,
    Trophy,
    Building2,
  } from "lucide-svelte";

  type Route = {
    title: string;
    icon: any;
    link: string;
  };

  const props = $props<{ project: any }>();

  let primaryRoutes = $state<Route[]>([]);
  let secondaryRoutes = $state<Route[]>([]);
  let tertiaryRoutes = $state<Route[]>([]);

  $effect(() => {
    if (!props.project?.id) return;

    primaryRoutes = [
      {
        title: "Dashboard",
        icon: Home,
        link: `/project/${props.project.id}/dashboard`,
      },
      {
        title: "Literature",
        icon: Library,
        link: `/project/${props.project.id}/literature`,
      },
      {
        title: "Notes",
        icon: Pencil,
        link: `/project/${props.project.id}/notes`,
      },
      {
        title: "Outcomes",
        icon: Microscope,
        link: `/project/${props.project.id}/outcomes`,
      },
    ];

    secondaryRoutes = [
      {
        title: "Analytics",
        icon: BarChartHorizontal,
        link: `/project/${props.project.id}/analytics`,
      },
      {
        title: "Connections",
        icon: Workflow,
        link: `/project/${props.project.id}/connections`,
      },
      {
        title: "Progress",
        icon: Trophy,
        link: `/project/${props.project.id}/progress`,
      },
    ];

    tertiaryRoutes = [
      {
        title: "Project Team",
        icon: Users,
        link: `/project/${props.project.id}/team`,
      },
      {
        title: "Project Settings",
        icon: Settings,
        link: `/project/${props.project.id}/project_settings`,
      },
    ];
  });

  async function handleLogout() {
    auth.logout();
    navigate("/login");
  }
</script>

<Tooltip.Provider delayDuration={0}>
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
              class=" font-bold text-lg truncate group-data-[collapsible=icon]:hidden"
            >
              {props.project?.name || "Project"}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side="right">
            <span class="">{props.project?.name || "Project"}</span>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    </Sidebar.Header>

    <Sidebar.Content>
      <!-- Primary Navigation -->
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each primaryRoutes as item (item.title)}
              <Link to={item.link} class="block">
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <div
                          class="flex items-center gap-3 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                        >
                          {#if item.icon}
                            <item.icon class="h-4 w-4 flex-shrink-0" />
                          {/if}
                          <span class="group-data-[collapsible=icon]:hidden"
                            >{item.title}</span
                          >
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side="right"
                        class="group-data-[collapsible=icon]:block hidden"
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

      <Sidebar.Separator />

      <!-- Secondary Navigation -->
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each secondaryRoutes as item (item.title)}
              <Link to={item.link} class="block">
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <div
                          class="flex items-center gap-3 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                        >
                          {#if item.icon}
                            <item.icon class="h-4 w-4 flex-shrink-0" />
                          {/if}
                          <span class="group-data-[collapsible=icon]:hidden"
                            >{item.title}</span
                          >
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side="right"
                        class="group-data-[collapsible=icon]:block hidden"
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

      <Sidebar.Separator />

      <!-- Tertiary Navigation -->
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each tertiaryRoutes as item (item.title)}
              <Link to={item.link} class="block">
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <div
                          class="flex items-center gap-3 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                        >
                          {#if item.icon}
                            <item.icon class="h-4 w-4 flex-shrink-0" />
                          {/if}
                          <span class="group-data-[collapsible=icon]:hidden"
                            >{item.title}</span
                          >
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side="right"
                        class="group-data-[collapsible=icon]:block hidden"
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
    </Sidebar.Content>

    <div class="mt-auto">
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Link to="/dashboard" class="block">
              <Sidebar.MenuItem>
                <Sidebar.MenuButton>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div
                        class="flex items-center gap-3 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <Building2 class="h-4 w-4 flex-shrink-0" />
                        <span class="group-data-[collapsible=icon]:hidden"
                          >Organization</span
                        >
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="right"
                      class="group-data-[collapsible=icon]:block hidden"
                    >
                      <span class="">Organization</span>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Link>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </div>

    <Sidebar.Footer class="border-t-2 border-black dark:border-dark-border">
      <div
        class="flex items-center gap-2 group-data-[collapsible=icon]:flex-col-reverse group-data-[collapsible=icon]:items-center"
      >
        <div class="w-[75%] group-data-[collapsible=icon]:w-full">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <div
                class="flex items-center gap-3 hover:bg-accent rounded-md hover:text-accent-foreground transition-colors duration-300 px-4 py-2 group-data-[collapsible=icon]:p-2"
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
                  class="h-4 w-4 hidden group-data-[collapsible=icon]:block group-data-[collapsible=icon]:mx-auto"
                />
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              side="top"
              class="w-[--bits-dropdown-menu-anchor-width]"
            >
              <DropdownMenu.Item class="flex items-center gap-3">
                <span class="">Profile</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item class="flex items-center gap-3">
                <span class="">Settings</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
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
</Tooltip.Provider>

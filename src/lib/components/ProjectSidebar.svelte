<!-- src/lib/components/ProjectSidebar.svelte -->
<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { DarkmodeToggle } from "$lib/components/ui/darkmode-toggle";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { navigate, Link } from "svelte-routing";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button";
  import { globalSearchStore } from "$lib/stores/GlobalSearchStore.svelte";
  import {
    LogOut,
    Users,
    Settings,
    Home,
    Library,
    Pencil,
    MessageCircle,
    Microscope,
    BarChartHorizontal,
    Workflow,
    Trophy,
    Building2,
    ChartNetwork,
    TextSearch,
    Lock,
    Search,
    Command as CommandIcon,
  } from "lucide-svelte";
  import { API_BASE_URL } from "$lib/config";
  import { DateTime } from "luxon"; // Import DateTime

  type Route = {
    title: string;
    icon: any;
    link: string;
    requiresSubscription?: boolean;
    subscriptionFeature?: string;
    disabled?: boolean;
  };

  const props = $props<{ project: any }>();

  let primaryRoutes = $state<Route[]>([]);
  let secondaryRoutes = $state<Route[]>([]);
  let tertiaryRoutes = $state<Route[]>([]);

  // Add subscription capability state
  let canAccessModels = $state(false);
  let canAccessGraph = $state(false);
  let canAccessAnalysis = $state(false);
  let checkingSubscription = $state(false);
  let planName = $state("");
  let subscriptionChecked = $state(false);

  // Load subscription data from session storage on component initialization
  function loadSubscriptionFromSession() {
    if (typeof window === "undefined") return; // Skip on SSR

    try {
      const stored = sessionStorage.getItem("quester_subscription_data");
      if (stored) {
        const data = JSON.parse(stored);
        // Check if data is still valid (within 30 minutes)
        const now = new Date().getTime();
        const thirtyMinutes = 30 * 60 * 1000;
        if (data.timestamp && now - data.timestamp < thirtyMinutes) {
          canAccessModels = data.canAccessModels;
          canAccessGraph = data.canAccessGraph;
          canAccessAnalysis = data.canAccessAnalysis;
          planName = data.planName;
          subscriptionChecked = true;
          return true;
        }
      }
    } catch (e) {
      console.error("Error loading subscription data from session storage:", e);
    }
    return false;
  }

  // Save subscription data to session storage
  function saveSubscriptionToSession() {
    if (typeof window === "undefined") return; // Skip on SSR

    try {
      const data = {
        canAccessModels,
        canAccessGraph,
        canAccessAnalysis,
        planName,
        timestamp: new Date().getTime(),
      };
      sessionStorage.setItem("quester_subscription_data", JSON.stringify(data));
      subscriptionChecked = true;
    } catch (e) {
      console.error("Error saving subscription data to session storage:", e);
    }
  }

  // Clear subscription data from session storage
  function clearSubscriptionFromSession() {
    if (typeof window === "undefined") return; // Skip on SSR

    try {
      sessionStorage.removeItem("quester_subscription_data");
      subscriptionChecked = false;
    } catch (e) {
      console.error(
        "Error clearing subscription data from session storage:",
        e
      );
    }
  }

  async function checkAchievements() {
    if (!props.project?.id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/achievement/project/${props.project.id}/status`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
    } catch (error) {
      console.error("Error checking achievements:", error);
    }
  }

  // Add function to check subscription capabilities
  async function checkSubscriptionCapabilities() {
    if (!auth.user) {
      // Reset capabilities if user is not logged in
      canAccessModels = false;
      canAccessGraph = false;
      canAccessAnalysis = false;
      planName = "";
      checkingSubscription = false;
      clearSubscriptionFromSession();
      return;
    }

    // Skip check if already loaded from session storage
    if (subscriptionChecked) return;

    checkingSubscription = true;

    try {
      // First check if user can access model builder
      const modelResponse = await fetch(
        `${API_BASE_URL}/capabilities/model_access`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        canAccessModels = modelData.allowed;
        // Get plan name if available
        if (modelData.planName) {
          planName = modelData.planName;
        }
      } else {
        canAccessModels = false; // Default to false on error
      }

      // Then check if user can access graph visualization
      const graphResponse = await fetch(
        `${API_BASE_URL}/capabilities/graph_access`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (graphResponse.ok) {
        const graphData = await graphResponse.json();
        canAccessGraph = graphData.allowed;
        // Get plan name if not already set
        if (graphData.planName && !planName) {
          planName = graphData.planName;
        }
      } else {
        canAccessGraph = false; // Default to false on error
      }

      // Check if user can access analysis features
      const analysisResponse = await fetch(
        `${API_BASE_URL}/capabilities/analysis_access`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        canAccessAnalysis = analysisData.allowed;
        // Get plan name if not already set
        if (analysisData.planName && !planName) {
          planName = analysisData.planName;
        }
      } else {
        canAccessAnalysis = false; // Default to false on error
      }

      // Save to session storage when we have all data
      saveSubscriptionToSession();
    } catch (error) {
      console.error("Error checking subscription capabilities:", error);
      canAccessModels = false;
      canAccessGraph = false;
      canAccessAnalysis = false;
      planName = ""; // Reset plan name on error
      clearSubscriptionFromSession();
    } finally {
      checkingSubscription = false;
    }
  }

  // Effect to check subscription capabilities when auth state changes or on initial load
  $effect(() => {
    // First try to load from session storage
    if (!loadSubscriptionFromSession()) {
      // If not found in session storage, check capabilities
      checkSubscriptionCapabilities();
    }
  });

  // Clear subscription data when user logs out
  $effect(() => {
    if (!auth.user) {
      // Reset local state
      canAccessModels = false;
      canAccessGraph = false;
      canAccessAnalysis = false;
      planName = "";
      // Clear session storage
      clearSubscriptionFromSession();
    }
  });

  // Function to get current date as YYYY-MM-DD string
  function getCurrentDateString(): string {
    return DateTime.now().toISODate();
  }

  // Function to record project view (once per day)
  async function recordProjectView() {
    const userId = auth.user?.id;
    const projectId = props.project?.id;

    if (!userId || !projectId || typeof window === "undefined") {
      // Need user, project, and window context (for localStorage)
      return;
    }

    const currentDate = getCurrentDateString();
    const storageKey = `projectView_${userId}_${projectId}`;

    try {
      const lastViewDate = localStorage.getItem(storageKey);

      if (lastViewDate === currentDate) {
        // Already viewed today, do nothing.
        // console.log(`Project ${projectId} already viewed today by user ${userId}.`);
        return;
      }

      // Not viewed today, call backend
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/view`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json", // Important even for empty body sometimes
          },
          // No body needed for this request
        }
      );

      if (response.ok) {
        // Successfully recorded on backend, update localStorage
        localStorage.setItem(storageKey, currentDate);
      } else {
        // Handle potential errors like 401 Unauthorized, 404 Not Found, 500 Server Error
        console.error(
          `Failed to record project view. Status: ${response.status}`
        );
        // Optional: Implement retry logic or user notification
      }
    } catch (error) {
      console.error("Error recording project view:", error);
      // Handle network errors etc.
    }
  }

  // Effect to record project view when user or project changes
  $effect(() => {
    if (auth.user?.id && props.project?.id) {
      recordProjectView();
    }
  });

  // Effect to update routes when project ID changes or capabilities are checked
  $effect(() => {
    // Access reactive state inside the effect for automatic dependency tracking
    const projectId = props.project?.id;
    const isLoading = checkingSubscription;
    const hasModelAccess = canAccessModels;
    const hasGraphAccess = canAccessGraph;
    const hasAnalysisAccess = canAccessAnalysis;

    if (!projectId) {
      // Clear routes if no project ID
      primaryRoutes = [];
      secondaryRoutes = [];
      tertiaryRoutes = [];
      return;
    }

    primaryRoutes = [
      {
        title: "Overview",
        icon: Home,
        link: `/project/${projectId}/overview`,
      },
      {
        title: "Literature",
        icon: Library,
        link: `/project/${projectId}/literature`,
      },
      {
        title: "Notes",
        icon: Pencil,
        link: `/project/${projectId}/notes`,
      },
      {
        title: "Research Assistant",
        icon: MessageCircle,
        link: `/project/${projectId}/chat`,
      },
      {
        title: "Insights",
        icon: TextSearch,
        link: `/project/${projectId}/insights`,
        requiresSubscription: true,
        subscriptionFeature: "analysis features",
        disabled: isLoading || !hasAnalysisAccess, // Use local constants
      },
      {
        title: "Models",
        icon: ChartNetwork,
        link: `/project/${projectId}/models`,
        requiresSubscription: true,
        subscriptionFeature: "model builder",
        disabled: isLoading || !hasModelAccess, // Use local constants
      },
      {
        title: "Outcomes",
        icon: Microscope,
        link: `/project/${projectId}/outcomes`,
      },
    ];

    secondaryRoutes = [
      {
        title: "Analytics",
        icon: BarChartHorizontal,
        link: `/project/${projectId}/analytics`,
      },
      {
        title: "Connections",
        icon: Workflow,
        link: `/project/${projectId}/connections`,
        requiresSubscription: true,
        subscriptionFeature: "graph visualization",
        disabled: isLoading || !hasGraphAccess, // Use local constants
      },
      {
        title: "Progress",
        icon: Trophy,
        link: `/project/${projectId}/progress`,
      },
    ];

    tertiaryRoutes = [
      {
        title: "Settings",
        icon: Settings,
        link: `/project/${projectId}/project_settings`,
      },
    ];
  }); // No dependency array needed

  async function handleLogout() {
    auth.logout();
    navigate("https://app.quester.tech");
  }

  // Function to handle sidebar link clicks
  function handleSidebarLinkClick() {
    // Check achievements on navigation
    checkAchievements();

    // Don't refresh subscription checks - just refresh the timestamp
    refreshSubscriptionTimestamp();
  }

  // Just update the timestamp without fetching new data
  function refreshSubscriptionTimestamp() {
    if (typeof window === "undefined" || !subscriptionChecked) return;

    try {
      const stored = sessionStorage.getItem("quester_subscription_data");
      if (stored) {
        const data = JSON.parse(stored);
        data.timestamp = new Date().getTime();
        sessionStorage.setItem(
          "quester_subscription_data",
          JSON.stringify(data)
        );
      }
    } catch (e) {
      console.error("Error refreshing subscription timestamp:", e);
    }
  }
</script>

<Tooltip.Provider delayDuration={0}>
  <Sidebar.Root
    collapsible="icon"
    class="border-r-2  dark:border-dark-border bg-card dark:bg-dark-card shadow-[4px_0px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_0px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <Sidebar.Header class="border-b-2  dark:border-dark-border">
      <div class="flex items-center gap-2 py-2">
        <Sidebar.Trigger
          class="h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 p-2 rounded-sm"
        />
        <Tooltip.Root>
          <Tooltip.Trigger class="overflow-hidden">
            <span
              class="block font-bold text-lg truncate group-data-[collapsible=icon]:hidden pr-2"
            >
              {props.project?.name || "Project"}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side="right" sideOffset={10} class="z-[9999]">
            <span class="">{props.project?.name || "Project"}</span>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    </Sidebar.Header>

    <Sidebar.Content>
      <!-- Search Button -->
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Button
                variant="outline"
                size="sm"
                class="w-full justify-start gap-2"
                onclick={() => globalSearchStore.open()}
              >
                <Search class="size-4" />
                <span class="group-data-[collapsible=icon]:hidden">Search</span>
                <kbd class="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                  <CommandIcon class="size-3" />
                  K
                </kbd>
              </Button>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
      
      <Sidebar.Separator />

      <!-- Primary Navigation -->
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each primaryRoutes as item (item.title)}
              {#if !item.disabled}
                <Link
                  to={item.link}
                  class="block"
                  on:click={handleSidebarLinkClick}
                >
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
                          sideOffset={10}
                          class="group-data-[collapsible=icon]:block hidden z-[9999]"
                        >
                          <span class="">{item.title}</span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                </Link>
              {:else}
                <!-- Disabled item with subscription tooltip -->
                <Sidebar.MenuItem class="opacity-60">
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
                          <Lock class="h-3 w-3 ml-1" />
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side="right"
                        sideOffset={10}
                        class="w-64 z-[9999]"
                      >
                        {#if item.subscriptionFeature === "model builder"}
                          Custom model builder is not available on your {planName ||
                            "current"} plan. Upgrade to {planName ===
                          "Research Explorer"
                            ? "Quester Pro or Quester Team"
                            : "Quester Team"} to access this feature.
                        {:else if item.subscriptionFeature === "graph visualization"}
                          Graph visualization is not available on your {planName ||
                            "current"} plan. Upgrade to {planName ===
                          "Research Explorer"
                            ? "Quester Pro or Quester Team"
                            : "Quester Team"} to access this feature.
                        {:else if item.subscriptionFeature === "analysis features"}
                          Insight features are not available on your {planName ||
                            "current"} plan. Upgrade to {planName ===
                          "Research Explorer"
                            ? "Quester Pro or Quester Team"
                            : "Quester Team"} to access this feature.
                        {:else}
                          {item.title} requires a subscription with {item.subscriptionFeature}
                          access.
                        {/if}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/if}
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
              {#if !item.disabled}
                <Link
                  to={item.link}
                  class="block"
                  on:click={handleSidebarLinkClick}
                >
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
                          sideOffset={10}
                          class="group-data-[collapsible=icon]:block hidden z-[9999]"
                        >
                          <span class="">{item.title}</span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                </Link>
              {:else}
                <!-- Disabled item with subscription tooltip -->
                <Sidebar.MenuItem class="opacity-60">
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
                          <Lock class="h-3 w-3 ml-1" />
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side="right"
                        sideOffset={10}
                        class="w-64 z-[9999]"
                      >
                        {#if item.subscriptionFeature === "model builder"}
                          Custom model builder is not available on your {planName ||
                            "current"} plan. Upgrade to {planName ===
                          "Research Explorer"
                            ? "Quester Pro or Quester Team"
                            : "Quester Team"} to access this feature.
                        {:else if item.subscriptionFeature === "graph visualization"}
                          Graph visualization is not available on your {planName ||
                            "current"} plan. Upgrade to {planName ===
                          "Research Explorer"
                            ? "Quester Pro or Quester Team"
                            : "Quester Team"} to access this feature.
                        {:else if item.subscriptionFeature === "analysis features"}
                          Insight features are not available on your {planName ||
                            "current"} plan. Upgrade to {planName ===
                          "Research Explorer"
                            ? "Quester Pro or Quester Team"
                            : "Quester Team"} to access this feature.
                        {:else}
                          {item.title} requires a subscription with {item.subscriptionFeature}
                          access.
                        {/if}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/if}
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
              <Link
                to={item.link}
                class="block"
                on:click={handleSidebarLinkClick}
              >
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
    </Sidebar.Content>

    <div class="mt-auto">
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Link
              to="/dashboard"
              class="block"
              on:click={handleSidebarLinkClick}
            >
              <Sidebar.MenuItem>
                <Sidebar.MenuButton>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div
                        class="flex items-center gap-3 px-4 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <Building2 class="h-4 w-4 flex-shrink-0" />
                        <span class="group-data-[collapsible=icon]:hidden"
                          >Workspace</span
                        >
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="right"
                      sideOffset={10}
                      class="group-data-[collapsible=icon]:block hidden z-[9999]"
                    >
                      <span class="">Workspace</span>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Link>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </div>

    <Sidebar.Footer class="border-t-2  dark:border-dark-border">
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
                  <!-- <div class="text-sm text-muted-foreground">View profile</div> -->
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
      class="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-dark-accent-blue border dark:border-dark-border"
    ></div>
    <div
      class="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 dark:bg-dark-accent-yellow border dark:border-dark-border"
    ></div>
  </Sidebar.Root>
</Tooltip.Provider>

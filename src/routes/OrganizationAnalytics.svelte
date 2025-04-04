<script lang="ts">
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import ProjectActivityChart from "$lib/components/ProjectActivityChart.svelte";
  import { onMount } from "svelte";
  // Runes are globally available in Svelte 5
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Label } from "$lib/components/ui/label";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import { DateTime } from "luxon";
  import { writable } from "svelte/store"; // Needed for sorting state if not using runes for everything
  import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-svelte"; // Import sorting icons

  // Define the structure for the daily activity counts
  interface DailyActivityCount {
    literature: number;
    notes: number;
    models: number;
    outcomes: number;
  }

  // Define the structure for user login stats from the backend
  interface UserLoginStats {
    lastLoginDate: string | null; // Comes as ISO string
    distinctLoginDaysLast7: number;
    distinctLoginDaysLast14: number;
    distinctLoginDaysLast30: number;
    distinctLoginDaysAllTime: number;
  }

  // Define the user details structure locally
  interface LoginStatUserJson {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }

  // Combined data structure for the table
  interface UserLoginTableRow {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    stats: UserLoginStats;
  }

  // State for selected date range
  let selectedRange = $state<"7" | "14" | "30" | "all">("all");

  // Sorting State
  type SortColumn =
    | "user"
    | "lastLogin"
    | "days7"
    | "days14"
    | "days30"
    | "daysAll";
  let sortColumn = $state<SortColumn>("user"); // Default sort by user name
  let sortDirection = $state<"asc" | "desc">("asc"); // Default ascending

  // Initialize data loading only once at component mount
  teamManagement.loadUserResources(true, true);
  teamManagement.loadSettings();

  // Helper function to safely clone reactive objects
  function safeClone(obj: any) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.error("Failed to clone object:", e);
      return obj;
    }
  }

  // Helper function to check if a project has activity
  function hasActivity(project: any) {
    if (!project?.$extras?.dailyActivityCounts) {
      // console.log(`[DEBUG] Project ${project.name} has no dailyActivityCounts property`);
      return false;
    }

    // Use safeClone to handle Svelte proxies
    const counts = safeClone(project.$extras.dailyActivityCounts);
    // console.log(`[DEBUG] Project ${project.name} activity counts:`, counts);

    // Check if the counts object is empty
    if (Object.keys(counts).length === 0) {
      // console.log(`[DEBUG] Project ${project.name} has empty dailyActivityCounts object`);
      return false;
    }

    // Check if any day has any non-zero activity
    const hasAnyActivity = Object.entries(counts).some(([date, dayCount]) => {
      const typedCounts = dayCount as {
        literature: number;
        notes: number;
        models: number;
        outcomes: number;
      };

      const activityExists =
        (typedCounts.literature || 0) > 0 ||
        (typedCounts.notes || 0) > 0 ||
        (typedCounts.models || 0) > 0 ||
        (typedCounts.outcomes || 0) > 0;

      // console.log(`[DEBUG] Project ${project.name}, Date ${date}: ${JSON.stringify(dayCount)} - Has activity: ${activityExists}`);
      return activityExists;
    });

    // console.log(`[DEBUG] Project ${project.name} final hasActivity result: ${hasAnyActivity}`);
    return hasAnyActivity;
  }

  // Derived state to prepare user login data for the table
  let userLoginTableData = $derived.by(() => {
    const statsMap = teamManagement.userLoginStatsMap;
    const usersWithDetails = teamManagement.loginStatUsers;
    // Add detailed logs at the start
    console.log("[Derived Start] statsMap:", safeClone(statsMap)); // Use safeClone for logging proxies
    console.log(
      "[Derived Start] usersWithDetails:",
      safeClone(usersWithDetails)
    );

    // Strict check including checking if usersWithDetails is an array and has length
    if (
      !statsMap ||
      !Array.isArray(usersWithDetails) ||
      usersWithDetails.length === 0
    ) {
      console.log(
        "[Derived] Exiting early - missing statsMap or usersWithDetails is not a non-empty array."
      );
      return [];
    }

    // 1. Create map from usersWithDetails
    const userDetailsMap = new Map<string, LoginStatUserJson>();
    usersWithDetails.forEach((user) => {
      // Add check for valid user object before setting
      if (user && user.id) {
        userDetailsMap.set(user.id, user);
      } else {
        console.warn(
          "[Derived] Skipping invalid user object in usersWithDetails:",
          user
        );
      }
    });
    console.log("[Derived] Populated userDetailsMap:", userDetailsMap); // Log the created map

    // 2. Iterate through the statsMap and combine with user details
    let tableData: UserLoginTableRow[] = [];
    for (const [userId, stats] of Object.entries(statsMap)) {
      console.log(`[Derived Loop] Processing userId from statsMap: ${userId}`); // Log current key from statsMap
      const userDetails = userDetailsMap.get(userId); // THE LOOKUP
      // Log the specific result of the lookup
      console.log(
        `[Derived Loop] Result of userDetailsMap.get(${userId}):`,
        userDetails
      );

      if (userDetails) {
        // User details found, combine with stats
        tableData.push({
          id: userDetails.id,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          email: userDetails.email,
          stats: stats as UserLoginStats, // Cast stats to the correct type
        });
      } else {
        // User details not found (edge case), use ID/email from statsMap key if possible
        console.warn(
          `[Derived] User details not found for userId: ${userId}. Using default.`
        );
        tableData.push({
          id: userId,
          firstName: "Unknown",
          lastName: "User",
          email: `ID: ${userId}`,
          stats: stats as UserLoginStats, // Cast stats to the correct type
        });
      }
    }
    console.log("[Derived] Combined tableData (before sort):", tableData);

    // 3. Apply Sorting based on component state
    const sortCol = sortColumn;
    const sortDir = sortDirection;

    tableData.sort((a, b) => {
      let valA: any, valB: any;

      switch (sortCol) {
        case "user":
          valA = `${a.lastName || ""} ${a.firstName || ""}`
            .toLowerCase()
            .trim();
          valB = `${b.lastName || ""} ${b.firstName || ""}`
            .toLowerCase()
            .trim();
          // Handle N/A users
          if (a.firstName === "N/A" && b.firstName !== "N/A") return 1;
          if (a.firstName !== "N/A" && b.firstName === "N/A") return -1;
          break;
        case "lastLogin":
          // Handle null dates - sort nulls last when ascending
          valA = a.stats.lastLoginDate
            ? DateTime.fromISO(a.stats.lastLoginDate).toMillis()
            : Infinity;
          valB = b.stats.lastLoginDate
            ? DateTime.fromISO(b.stats.lastLoginDate).toMillis()
            : Infinity;
          break;
        case "days7":
          valA = a.stats.distinctLoginDaysLast7;
          valB = b.stats.distinctLoginDaysLast7;
          break;
        case "days14":
          valA = a.stats.distinctLoginDaysLast14;
          valB = b.stats.distinctLoginDaysLast14;
          break;
        case "days30":
          valA = a.stats.distinctLoginDaysLast30;
          valB = b.stats.distinctLoginDaysLast30;
          break;
        case "daysAll":
          valA = a.stats.distinctLoginDaysAllTime;
          valB = b.stats.distinctLoginDaysAllTime;
          break;
        default:
          return 0; // Should not happen
      }

      // Comparison logic
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    console.log("[Derived] Sorted tableData:", tableData);

    return tableData;
  });

  // Helper to format dates nicely, handling null
  function formatDateTime(isoString: string | null): string {
    if (!isoString) return "Never";
    try {
      return DateTime.fromISO(isoString).toLocaleString(DateTime.DATETIME_MED);
    } catch (e) {
      console.error("Error formatting date:", isoString, e);
      return "Invalid Date";
    }
  }

  // Event Handlers
  function handleSortClick(column: SortColumn) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
  }

  // Log state changes for debugging
  $effect(() => {
    console.log("Selected range changed to:", selectedRange);
    // Log when user login data is derived
    console.log("User login table data derived:", userLoginTableData);
  });

  // Add debug logging
  // onMount(() => {
  //   const checkProjects = () => {
  //     if (teamManagement?.userResources?.projects) {
  //       // Use safeClone to avoid Svelte 5 proxy warnings
  //       const projectsSnapshot = safeClone(teamManagement.userResources.projects);
  //       console.log("[DEBUG] All projects data:", projectsSnapshot);

  //       const projectsWithActivity =
  //         teamManagement.userResources.projects.filter(hasActivity);
  //       // Create a clean snapshot of projects with activity
  //       const projectsWithActivitySnapshot = safeClone(projectsWithActivity);
  //       console.log(
  //         "[DEBUG] Projects with activity:",
  //         projectsWithActivitySnapshot.map((p: any) => p.name)
  //       );
  //       console.log(
  //         "[DEBUG] Projects with activity count:",
  //         projectsWithActivity.length
  //       );

  //       if (projectsWithActivity.length > 0) {
  //         const firstProject = projectsWithActivity[0];
  //         const firstProjectSnapshot = safeClone(firstProject);
  //         const extras = firstProjectSnapshot.$extras || {};
  //         const dailyCounts = extras.dailyActivityCounts || {};

  //         console.log("[DEBUG] First project with activity details:", {
  //           name: firstProjectSnapshot.name,
  //           dailyActivityCountsKeys: Object.keys(dailyCounts),
  //           rawData: dailyCounts,
  //         });
  //       }
  //     }
  //   };

  //   // Initial check
  //   setTimeout(checkProjects, 1000);

  //   // Check again after data might have loaded
  //   setTimeout(checkProjects, 3000);
  // });
</script>

<Sidebar.Provider>
  <div class="flex h-screen bg-background w-full">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4">
      <div class="container mx-auto py-6 px-4">
        <!-- Header Section -->
        <div class="mb-8 flex items-center justify-between">
          <div>
            <!-- Wrapper for title and description -->
            <h1 class="text-3xl font-bold mb-2">Organization Analytics</h1>
            <p class="text-muted-foreground">
              Activity overview across your projects.
            </p>
          </div>
          <!-- Date Range Selector Moved Here -->
          <div class="flex">
            <RadioGroup.Root
              bind:value={selectedRange}
              class="flex gap-2 rounded-md bg-card p-1"
            >
              <RadioGroup.Item value="7" id="r7" class="peer sr-only" />
              {console.log("selectedRange", selectedRange)}
              <Label
                for="r7"
                class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "7" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
              >
                7 Days
              </Label>
              <RadioGroup.Item value="14" id="r14" class="peer sr-only" />
              <Label
                for="r14"
                class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "14" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
              >
                14 Days
              </Label>
              <RadioGroup.Item value="30" id="r30" class="peer sr-only" />
              <Label
                for="r30"
                class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "30" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
              >
                30 Days
              </Label>
              <RadioGroup.Item value="all" id="rAll" class="peer sr-only" />
              <Label
                for="rAll"
                class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "all" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
              >
                All Time
              </Label>
            </RadioGroup.Root>
          </div>
        </div>

        <!-- Loading State -->
        {#if teamManagement?.isLoading}
          <div class="text-center p-8">
            <p>Loading analytics data...</p>
          </div>
        {:else if teamManagement?.error}
          <div
            class="text-center p-8 text-destructive bg-destructive/10 border border-destructive rounded-md"
          >
            <h3 class="font-semibold mb-2">Error Loading Data</h3>
            <p>{teamManagement.error}</p>
          </div>
        {:else}
          <div class="p-4">
            {#if !teamManagement?.userResources?.projects?.length}
              <div
                class="text-center p-8 bg-muted/50 border border-border rounded-md"
              >
                <p class="text-muted-foreground">No projects available.</p>
              </div>
            {:else}
              <!-- Date Range Selector Removed From Here -->

              <div class="mb-6">
                <h2 class="text-xl font-bold mb-2">
                  Projects with Activity (Content Added)
                </h2>

                {#if !teamManagement.userResources.projects.filter(hasActivity)?.length}
                  <div
                    class="text-center p-8 bg-muted/50 border border-border rounded-md"
                  >
                    <p class="text-muted-foreground">
                      No projects with activity data found for this
                      organization.
                    </p>
                    <p class="text-sm text-muted-foreground mt-2">
                      Activity data is collected when team members create or
                      modify resources in a project.
                    </p>
                  </div>
                {:else}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {#each teamManagement.userResources.projects.filter(hasActivity) as project (project.id)}
                      <div class="bg-card rounded-lg border shadow-sm p-4">
                        <Tooltip.Root>
                          <Tooltip.Trigger class="w-full text-left">
                            <h3 class="text-lg font-semibold mb-2 truncate">
                              {project.name}
                            </h3>
                          </Tooltip.Trigger>
                          <Tooltip.Content side="top">
                            <span>{project.name}</span>
                          </Tooltip.Content>
                        </Tooltip.Root>
                        <ProjectActivityChart
                          dailyActivityCounts={project.$extras
                            ?.dailyActivityCounts || {}}
                          projectName={project.name}
                          dateRange={selectedRange}
                        />
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- New User Login Activity Section -->
              <div class="mb-6">
                <h2 class="text-xl font-bold mb-4">User Login Activity</h2>
                {#if !userLoginTableData?.length}
                  <div
                    class="text-center p-8 bg-muted/50 border border-border rounded-md"
                  >
                    <p class="text-muted-foreground">
                      No user login data available.
                    </p>
                  </div>
                {:else}
                  <div class="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            class="cursor-pointer hover:bg-muted/50"
                            onclick={() => handleSortClick("user")}
                          >
                            <div class="flex items-center gap-1">
                              User
                              {#if sortColumn === "user"}
                                {#if sortDirection === "asc"}<ChevronUp
                                    class="h-4 w-4"
                                  />{:else}<ChevronDown class="h-4 w-4" />{/if}
                              {:else}
                                <ChevronsUpDown
                                  class="h-4 w-4 text-muted-foreground/50"
                                />
                              {/if}
                            </div>
                          </TableHead>
                          <TableHead
                            class="cursor-pointer hover:bg-muted/50"
                            onclick={() => handleSortClick("lastLogin")}
                          >
                            <div class="flex items-center gap-1">
                              Last Login
                              {#if sortColumn === "lastLogin"}
                                {#if sortDirection === "asc"}<ChevronUp
                                    class="h-4 w-4"
                                  />{:else}<ChevronDown class="h-4 w-4" />{/if}
                              {:else}
                                <ChevronsUpDown
                                  class="h-4 w-4 text-muted-foreground/50"
                                />
                              {/if}
                            </div>
                          </TableHead>
                          <TableHead
                            class="text-right cursor-pointer hover:bg-muted/50"
                            onclick={() => handleSortClick("days7")}
                          >
                            <div class="flex items-center justify-end gap-1">
                              Active Days (7d)
                              {#if sortColumn === "days7"}
                                {#if sortDirection === "asc"}<ChevronUp
                                    class="h-4 w-4"
                                  />{:else}<ChevronDown class="h-4 w-4" />{/if}
                              {:else}
                                <ChevronsUpDown
                                  class="h-4 w-4 text-muted-foreground/50"
                                />
                              {/if}
                            </div>
                          </TableHead>
                          <TableHead
                            class="text-right cursor-pointer hover:bg-muted/50"
                            onclick={() => handleSortClick("days14")}
                          >
                            <div class="flex items-center justify-end gap-1">
                              Active Days (14d)
                              {#if sortColumn === "days14"}
                                {#if sortDirection === "asc"}<ChevronUp
                                    class="h-4 w-4"
                                  />{:else}<ChevronDown class="h-4 w-4" />{/if}
                              {:else}
                                <ChevronsUpDown
                                  class="h-4 w-4 text-muted-foreground/50"
                                />
                              {/if}
                            </div>
                          </TableHead>
                          <TableHead
                            class="text-right cursor-pointer hover:bg-muted/50"
                            onclick={() => handleSortClick("days30")}
                          >
                            <div class="flex items-center justify-end gap-1">
                              Active Days (30d)
                              {#if sortColumn === "days30"}
                                {#if sortDirection === "asc"}<ChevronUp
                                    class="h-4 w-4"
                                  />{:else}<ChevronDown class="h-4 w-4" />{/if}
                              {:else}
                                <ChevronsUpDown
                                  class="h-4 w-4 text-muted-foreground/50"
                                />
                              {/if}
                            </div>
                          </TableHead>
                          <TableHead
                            class="text-right cursor-pointer hover:bg-muted/50"
                            onclick={() => handleSortClick("daysAll")}
                          >
                            <div class="flex items-center justify-end gap-1">
                              Active Days (All)
                              {#if sortColumn === "daysAll"}
                                {#if sortDirection === "asc"}<ChevronUp
                                    class="h-4 w-4"
                                  />{:else}<ChevronDown class="h-4 w-4" />{/if}
                              {:else}
                                <ChevronsUpDown
                                  class="h-4 w-4 text-muted-foreground/50"
                                />
                              {/if}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {#each userLoginTableData as row (row.id)}
                          <TableRow>
                            <TableCell>
                              <div class="font-medium">
                                {row.firstName || ""}
                                {row.lastName || ""}
                              </div>
                              <div class="text-sm text-muted-foreground">
                                {row.email}
                              </div>
                            </TableCell>
                            <TableCell
                              >{formatDateTime(
                                row.stats.lastLoginDate
                              )}</TableCell
                            >
                            <TableCell class="text-right"
                              >{row.stats.distinctLoginDaysLast7}</TableCell
                            >
                            <TableCell class="text-right"
                              >{row.stats.distinctLoginDaysLast14}</TableCell
                            >
                            <TableCell class="text-right"
                              >{row.stats.distinctLoginDaysLast30}</TableCell
                            >
                            <TableCell class="text-right"
                              >{row.stats.distinctLoginDaysAllTime}</TableCell
                            >
                          </TableRow>
                        {/each}
                      </TableBody>
                    </Table>
                  </div>
                {/if}
              </div>
              <!-- End New User Login Activity Section -->
            {/if}
          </div>
        {/if}
      </div>
    </main>
  </div>
</Sidebar.Provider>

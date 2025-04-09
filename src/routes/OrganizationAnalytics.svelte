<script lang="ts">
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import ProjectActivityChart from "$lib/components/ProjectActivityChart.svelte";
  import { onMount } from "svelte";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
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
  import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Users,
    LineChart,
    CalendarClock,
    Calendar,
    ShieldAlert,
    Library,
    NotebookText,
    Boxes,
    Target,
  } from "lucide-svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import ProjectUsersModal from "$lib/components/ProjectUsersModal.svelte";
  import * as Pagination from "$lib/components/ui/pagination/index.js";

  // Define the structure for the daily activity counts
  interface DailyActivityCount {
    literature: number;
    notes: number;
    models: number;
    outcomes: number;
  }

  // Define the structure for aggregated project activity for the table
  interface AggregatedProjectActivity {
    projectId: string;
    projectName: string;
    literature: number;
    notes: number;
    models: number;
    outcomes: number;
    // Include raw daily counts for the selected chart
    dailyActivityCounts: Record<string, DailyActivityCount>;
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

  // Access control state
  let hasAccess = $state(false);
  let accessChecked = $state(false);
  let isCheckingAccess = $state(true);

  // State for selected project in the activity table
  let selectedProjectIds = $state<Set<string>>(new Set());

  // Sorting state for Project Activity table
  type ProjectSortColumn =
    | "projectName"
    | "literature"
    | "notes"
    | "models"
    | "outcomes";
  let projectSortColumn = $state<ProjectSortColumn>("projectName");
  let projectSortDirection = $state<"asc" | "desc">("asc");

  // State for project search filter
  let projectSearchTerm = $state("");

  // State for user search filter
  let userSearchTerm = $state("");

  // State for viewing project users modal
  let viewingProjectUsersId = $state<string | null>(null);

  // State for Project Activity Table Pagination
  let projectCurrentPage = $state(1);
  const projectItemsPerPage = 10;

  // Function to check if user has admin access
  function checkAdminAccess() {
    console.log("[Analytics] Checking admin access");
    isCheckingAccess = true;

    const userId = auth.user?.id;
    const orgId = auth.currentOrganization?.id;
    const resources = teamManagement.userResources;

    if (!userId || !orgId || !resources) {
      console.log(
        "[Analytics] Missing userId, orgId, or resources, denying access"
      );
      isCheckingAccess = false;
      accessChecked = true;
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
        console.log("[Analytics] User has org admin role, granting access");
        isCheckingAccess = false;
        accessChecked = true;
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
        console.log("[Analytics] User has dept admin role, granting access");
        isCheckingAccess = false;
        accessChecked = true;
        return true;
      }
    }

    console.log(
      "[Analytics] User does not have required admin roles, denying access"
    );
    isCheckingAccess = false;
    accessChecked = true;
    return false;
  }

  // Initialize data loading only once at component mount
  onMount(() => {
    console.log("[Analytics] Component mounted, loading resources");
    teamManagement.loadUserResources(true, true).then(() => {
      console.log("[Analytics] Resources loaded, checking access");
      hasAccess = checkAdminAccess();
      console.log(`[Analytics] Access check result: hasAccess = ${hasAccess}`);

      if (hasAccess) {
        console.log("[Analytics] User has access, loading settings");
        teamManagement.loadSettings();
      } else {
        console.log("[Analytics] User does not have access, redirecting");
        // You can choose to redirect or just show an access denied message
        // navigate("/dashboard");
      }
    });
  });

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

  // Helper function to aggregate project activity based on date range
  function aggregateProjectActivity(
    dailyCounts: Record<string, DailyActivityCount> | undefined | null,
    range: "7" | "14" | "30" | "all"
  ): { literature: number; notes: number; models: number; outcomes: number } {
    const aggregated = { literature: 0, notes: 0, models: 0, outcomes: 0 };
    if (!dailyCounts || typeof dailyCounts !== "object") {
      return aggregated;
    }

    const now = DateTime.now();
    let startDate: DateTime | null = null;

    switch (range) {
      case "7":
        startDate = now.minus({ days: 7 });
        break;
      case "14":
        startDate = now.minus({ days: 14 });
        break;
      case "30":
        startDate = now.minus({ days: 30 });
        break;
      case "all":
        // No start date needed, include all
        break;
    }

    // Use safeClone to avoid issues with Svelte proxies during iteration
    const safeDailyCounts = safeClone(dailyCounts);

    for (const [dateStr, counts] of Object.entries(safeDailyCounts)) {
      try {
        const activityDate = DateTime.fromISO(dateStr);
        if (
          !activityDate.isValid || // Skip invalid dates
          (startDate && activityDate < startDate) // Skip if before start date for ranges other than 'all'
        ) {
          continue;
        }

        // Cast counts to the expected type
        const typedCounts = counts as DailyActivityCount;

        aggregated.literature += typedCounts?.literature || 0;
        aggregated.notes += typedCounts?.notes || 0;
        aggregated.models += typedCounts?.models || 0;
        aggregated.outcomes += typedCounts?.outcomes || 0;
      } catch (e) {
        console.error(`Error processing date ${dateStr}:`, e);
        // Optionally skip this entry or handle differently
      }
    }

    return aggregated;
  }

  // Derived state to prepare user login data for the table
  let userLoginTableData = $derived.by(() => {
    // Don't attempt to process data if user doesn't have access
    if (!hasAccess || !accessChecked) {
      return [];
    }

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
      Object.keys(statsMap).length === 0 || // Also check if statsMap is empty
      !Array.isArray(usersWithDetails) ||
      usersWithDetails.length === 0
    ) {
      console.log(
        "[User Derived] Exiting early - missing or empty statsMap or usersWithDetails."
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

    // 2. Iterate through the statsMap, combine with user details
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

    // 3. Filter by user search term (case-insensitive)
    const lowerUserSearch = userSearchTerm.toLowerCase();
    console.log(
      "[User Derived] Combined tableData (before search filter):",
      safeClone(tableData)
    ); // Log before search filter
    const filteredUserData = lowerUserSearch
      ? tableData.filter((user) => {
          const fullName =
            `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
          const email = user.email.toLowerCase();
          return (
            fullName.includes(lowerUserSearch) ||
            email.includes(lowerUserSearch)
          );
        })
      : tableData;
    console.log(
      "[User Derived] User data after search filter:",
      safeClone(filteredUserData)
    ); // Log after search filter

    // 4. Apply Sorting based on component state
    const sortCol = sortColumn;
    const sortDir = sortDirection;

    filteredUserData.sort((a, b) => {
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
    console.log("[Derived] Sorted tableData:", filteredUserData);
    console.log(
      "[User Derived] Final sorted user data:",
      safeClone(filteredUserData)
    ); // Log final result

    return filteredUserData;
  });

  // Derived state for the project activity table
  let projectActivityTableData = $derived.by(() => {
    if (!hasAccess || !teamManagement.userResources?.projects) {
      return [];
    }

    // 1. Filter projects that have activity
    console.log(
      "[Project Derived] Raw projects from store:",
      safeClone(teamManagement.userResources?.projects)
    ); // Log raw projects
    const projectsWithActivity = teamManagement.userResources.projects.filter(
      (p: any) => hasActivity(p)
    );
    console.log(
      "[Project Derived] Projects after hasActivity filter:",
      safeClone(projectsWithActivity)
    ); // Log after activity filter

    // Map to aggregated data structure
    let tableData: AggregatedProjectActivity[] = projectsWithActivity.map(
      (project: any) => {
        const dailyCounts = project.$extras?.dailyActivityCounts || {};
        const aggregatedCounts = aggregateProjectActivity(
          dailyCounts,
          selectedRange
        );
        return {
          projectId: project.id,
          projectName: project.name || "Unnamed Project",
          literature: aggregatedCounts.literature,
          notes: aggregatedCounts.notes,
          models: aggregatedCounts.models,
          outcomes: aggregatedCounts.outcomes,
          dailyActivityCounts: dailyCounts, // Keep raw counts for the chart
        };
      }
    );

    // Apply Sorting
    const sortCol = projectSortColumn;
    const sortDir = projectSortDirection;

    tableData.sort((a, b) => {
      let valA: any, valB: any;

      switch (sortCol) {
        case "projectName":
          valA = a.projectName.toLowerCase();
          valB = b.projectName.toLowerCase();
          break;
        case "literature":
          valA = a.literature;
          valB = b.literature;
          break;
        case "notes":
          valA = a.notes;
          valB = b.notes;
          break;
        case "models":
          valA = a.models;
          valB = b.models;
          break;
        case "outcomes":
          valA = a.outcomes;
          valB = b.outcomes;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return tableData;
  });

  // Separate derived store for filtered table data
  let filteredProjectTableData = $derived.by(() => {
    // Filter by search term (case-insensitive)
    const lowerSearchTerm = projectSearchTerm.toLowerCase();
    return lowerSearchTerm
      ? projectActivityTableData.filter((project) =>
          project.projectName.toLowerCase().includes(lowerSearchTerm)
        )
      : projectActivityTableData;
  });

  // Derived state to get the full project object for the user view modal
  let selectedProjectForUserView = $derived.by(() => {
    if (!viewingProjectUsersId || !teamManagement.userResources?.projects)
      return null;
    // Find the project from the original userResources list, as it contains projectRoles
    return (
      teamManagement.userResources.projects.find(
        (p: any) => p.id === viewingProjectUsersId
      ) || null
    );
  });

  // Derived state for summary metrics
  let summaryMetrics = $derived.by(() => {
    // Return early if no data
    if (!userLoginTableData?.length) {
      return {
        totalUsers: 0,
        activeUsersLast7Days: 0,
        activeUsersLast30Days: 0,
        averageActivePercentage: 0,
      };
    }

    const totalUsers = userLoginTableData.length;
    const activeUsersLast7Days = userLoginTableData.filter(
      (user) => user.stats.distinctLoginDaysLast7 > 0
    ).length;
    const activeUsersLast30Days = userLoginTableData.filter(
      (user) => user.stats.distinctLoginDaysLast30 > 0
    ).length;

    // Calculate average active percentage (active days / total possible days)
    const totalPossibleDays = totalUsers * 7;
    const totalActiveDaysLast7 = userLoginTableData.reduce(
      (sum, user) => sum + user.stats.distinctLoginDaysLast7,
      0
    );
    const averageActivePercentage =
      totalPossibleDays > 0
        ? Math.round((totalActiveDaysLast7 / totalPossibleDays) * 100)
        : 0;

    return {
      totalUsers,
      activeUsersLast7Days,
      activeUsersLast30Days,
      averageActivePercentage,
    };
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

  // Event handler for project activity table sort
  function handleProjectSortClick(column: ProjectSortColumn) {
    if (projectSortColumn === column) {
      projectSortDirection = projectSortDirection === "asc" ? "desc" : "asc";
    } else {
      projectSortColumn = column;
      projectSortDirection = "asc";
    }
    // Deselect project when sorting changes
    selectedProjectIds = new Set();
  }

  // Handler to toggle project selection
  function toggleProjectSelection(projectId: string) {
    const newSet = new Set(selectedProjectIds);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    selectedProjectIds = newSet;
  }

  // Log state changes for debugging
  $effect(() => {
    console.log("Selected range changed to:", selectedRange);
    // Log when user login data is derived
    console.log("User login table data derived:", userLoginTableData);
    console.log("Selected project IDs changed:", selectedProjectIds);
    console.log("Project search term:", projectSearchTerm);
    console.log("User search term:", userSearchTerm);
  });

  function openProjectUsersModal(projectId: string) {
    viewingProjectUsersId = projectId;
    // Trigger loading the specific project details in the store
    teamManagement.loadProjectDetailsForModal(projectId);
  }

  function closeProjectUsersModal() {
    viewingProjectUsersId = null;
  }

  // --- Project Activity Table Pagination Logic ---
  let projectTotalPages = $derived(
    Math.ceil(projectActivityTableData.length / projectItemsPerPage)
  );

  // Effect to reset page number when filters/sort change
  $effect(() => {
    // Watching these dependencies will trigger a reset
    const _searchTerm = projectSearchTerm;
    const _sortCol = projectSortColumn;
    const _sortDir = projectSortDirection;
    const _range = selectedRange;

    console.log("[Pagination Effect] Filters changed, resetting page to 1");
    projectCurrentPage = 1;
  });

  // Explicitly type the event here
  function handleProjectPageChange(page: number) {
    if (page >= 1 && page <= projectTotalPages) {
      projectCurrentPage = page;
    }
  }

  function handleNextPage() {
    if (projectCurrentPage < projectTotalPages) {
      handleProjectPageChange(projectCurrentPage + 1);
    }
  }

  function handlePrevPage() {
    if (projectCurrentPage > 1) {
      handleProjectPageChange(projectCurrentPage - 1);
    }
  }
  // --- End Project Activity Table Pagination Logic ---
</script>

<Sidebar.Provider>
  <div class="flex h-screen bg-background w-full">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4">
      <div class="container mx-auto py-6 px-4">
        <!-- Header Section with Date Range Selector -->
        <div
          class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 class="text-3xl font-bold mb-2">Organization Analytics</h1>
            <p class="text-muted-foreground">
              Activity overview across your projects and users.
            </p>
          </div>
          <!-- Date Range Selector (moved to Project Activity section) -->
        </div>

        <!-- Access Denied State -->
        {#if accessChecked && !hasAccess}
          <div
            class="text-center p-8 bg-destructive/10 border border-destructive rounded-md"
          >
            <ShieldAlert class="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 class="text-xl font-bold mb-2">Access Denied</h2>
            <p class="mb-4">
              You don't have permission to view organization analytics. This
              page requires organization admin, owner, or department admin
              privileges.
            </p>
            <a
              href="/dashboard"
              class="inline-flex items-center justify-center text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
            >
              Return to Dashboard
            </a>
          </div>

          <!-- Loading State -->
        {:else if isCheckingAccess || teamManagement?.isLoading}
          <div class="text-center p-8">
            <div
              class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-4"
            ></div>
            <p>Loading analytics data...</p>
          </div>
        {:else if teamManagement?.error}
          <div
            class="text-center p-8 text-destructive bg-destructive/10 border border-destructive rounded-md"
          >
            <h3 class="font-semibold mb-2">Error Loading Data</h3>
            <p>{teamManagement.error}</p>
          </div>
        {:else if hasAccess}
          <!-- Summary Metrics Cards -->
          {#if userLoginTableData?.length}
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              <!-- Total Users Card -->
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <div
                    class="bg-card rounded-lg border shadow-sm p-6 flex items-start gap-4 cursor-help"
                  >
                    <div class="p-3 rounded-full bg-primary/10">
                      <Users class="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p class="text-muted-foreground text-sm font-medium">
                        Total Users
                      </p>
                      <h3 class="text-left text-2xl font-bold">
                        {summaryMetrics.totalUsers}
                      </h3>
                    </div>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" class="max-w-xs">
                  <p>Total number of all users in your organization.</p>
                </Tooltip.Content>
              </Tooltip.Root>

              <!-- Active Last 7 Days Card -->
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <div
                    class="bg-card rounded-lg border shadow-sm p-6 flex items-start gap-4"
                  >
                    <div class="p-3 rounded-full bg-green-500/10">
                      <Calendar class="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p class="text-muted-foreground text-sm font-medium">
                        Active Users (7 Days)
                      </p>
                      <h3 class="text-left text-2xl font-bold">
                        {summaryMetrics.activeUsersLast7Days}
                      </h3>
                    </div>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" class="max-w-xs">
                  <p>
                    Number of users who logged in at least once during the past
                    7 days.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>

              <!-- Active Last 30 Days Card -->
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <div
                    class="bg-card rounded-lg border shadow-sm p-6 flex items-start gap-4 cursor-help"
                  >
                    <div class="p-3 rounded-full bg-blue-500/10">
                      <CalendarClock class="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p class="text-muted-foreground text-sm font-medium">
                        Active Users (30 Days)
                      </p>
                      <h3 class="text-left text-2xl font-bold">
                        {summaryMetrics.activeUsersLast30Days}
                      </h3>
                    </div>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" class="max-w-xs">
                  <p>
                    Number of users who logged in at least once during the past
                    30 days.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>

              <!-- Activity Rate Card -->
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <div
                    class="bg-card rounded-lg border shadow-sm p-6 flex items-start gap-4 cursor-help"
                  >
                    <div class="p-3 rounded-full bg-purple-500/10">
                      <LineChart class="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p class="text-muted-foreground text-sm font-medium">
                        Activity Rate (7d)
                      </p>
                      <h3 class="text-left text-2xl font-bold">
                        {summaryMetrics.averageActivePercentage}%
                      </h3>
                    </div>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" class="max-w-xs">
                  <p>
                    Percentage of total possible user-days with login activity
                    in the last 7 days. Calculated as: (total active days /
                    (total users × 7 days)) × 100%.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          {/if}

          <div>
            {#if !teamManagement?.userResources?.projects?.length}
              <div
                class="text-center p-8 bg-muted/50 border border-border rounded-md"
              >
                <p class="text-muted-foreground">No projects available.</p>
              </div>
            {:else}
              <div class="space-y-8">
                <!-- Projects with Activity Section -->
                <div class="space-y-6">
                  <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4"
                  >
                    <h2 class="text-xl font-bold flex items-center gap-2">
                      <LineChart class="w-5 h-5 text-primary" />
                      <span>Project Activity (Content Added)</span>
                    </h2>

                    <!-- Date Range Selector (moved here) -->
                    <div class="flex">
                      <RadioGroup.Root
                        bind:value={selectedRange}
                        class="flex gap-2 rounded-md bg-card p-1 shadow-sm"
                      >
                        <RadioGroup.Item
                          value="7"
                          id="r7"
                          class="peer sr-only"
                        />
                        <Label
                          for="r7"
                          class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "7" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
                        >
                          7 Days
                        </Label>
                        <RadioGroup.Item
                          value="14"
                          id="r14"
                          class="peer sr-only"
                        />
                        <Label
                          for="r14"
                          class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "14" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
                        >
                          14 Days
                        </Label>
                        <RadioGroup.Item
                          value="30"
                          id="r30"
                          class="peer sr-only"
                        />
                        <Label
                          for="r30"
                          class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "30" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
                        >
                          30 Days
                        </Label>
                        <RadioGroup.Item
                          value="all"
                          id="rAll"
                          class="peer sr-only"
                        />
                        <Label
                          for="rAll"
                          class={`flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${selectedRange === "all" ? "bg-primary text-white dark:text-black" : "bg-card text-card-foreground"}`}
                        >
                          All Time
                        </Label>
                      </RadioGroup.Root>
                    </div>
                  </div>

                  <!-- Project Search Input -->
                  <div class="mb-4">
                    <Input
                      type="search"
                      placeholder="Search projects by name..."
                      bind:value={projectSearchTerm}
                      class="max-w-sm"
                    />
                  </div>

                  {#if !projectActivityTableData?.length}
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
                    <!-- Project Activity Table -->
                    <div class="border rounded-lg overflow-hidden shadow-sm">
                      <div class="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead class="w-[50px]">
                                <span class="sr-only">Select</span>
                              </TableHead>
                              <TableHead
                                class="cursor-pointer hover:bg-muted/50 transition-colors"
                                onclick={() =>
                                  handleProjectSortClick("projectName")}
                              >
                                <div class="flex items-center gap-1">
                                  Project
                                  {#if projectSortColumn === "projectName"}
                                    {#if projectSortDirection === "asc"}<ChevronUp
                                        class="h-4 w-4"
                                      />{:else}<ChevronDown
                                        class="h-4 w-4"
                                      />{/if}
                                  {:else}
                                    <ChevronsUpDown
                                      class="h-4 w-4 text-muted-foreground/50"
                                    />
                                  {/if}
                                </div>
                              </TableHead>
                              <TableHead
                                class="text-right cursor-pointer hover:bg-muted/50"
                                onclick={() =>
                                  handleProjectSortClick("literature")}
                              >
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  <Tooltip.Root>
                                    <Tooltip.Trigger
                                      class="flex items-center gap-1"
                                    >
                                      <Library class="h-4 w-4" /> Lit
                                      {#if projectSortColumn === "literature"}
                                        {#if projectSortDirection === "asc"}<ChevronUp
                                            class="h-4 w-4"
                                          />{:else}<ChevronDown
                                            class="h-4 w-4"
                                          />{/if}
                                      {:else}
                                        <ChevronsUpDown
                                          class="h-4 w-4 text-muted-foreground/50"
                                        />
                                      {/if}
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Literature</Tooltip.Content
                                    >
                                  </Tooltip.Root>
                                </div>
                              </TableHead>
                              <TableHead
                                class="text-right cursor-pointer hover:bg-muted/50"
                                onclick={() => handleProjectSortClick("notes")}
                              >
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  <Tooltip.Root>
                                    <Tooltip.Trigger
                                      class="flex items-center gap-1"
                                    >
                                      <NotebookText class="h-4 w-4" /> Notes
                                      {#if projectSortColumn === "notes"}
                                        {#if projectSortDirection === "asc"}<ChevronUp
                                            class="h-4 w-4"
                                          />{:else}<ChevronDown
                                            class="h-4 w-4"
                                          />{/if}
                                      {:else}
                                        <ChevronsUpDown
                                          class="h-4 w-4 text-muted-foreground/50"
                                        />
                                      {/if}
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Notes</Tooltip.Content>
                                  </Tooltip.Root>
                                </div>
                              </TableHead>
                              <TableHead
                                class="text-right cursor-pointer hover:bg-muted/50"
                                onclick={() => handleProjectSortClick("models")}
                              >
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  <Tooltip.Root>
                                    <Tooltip.Trigger
                                      class="flex items-center gap-1"
                                    >
                                      <Boxes class="h-4 w-4" /> Models
                                      {#if projectSortColumn === "models"}
                                        {#if projectSortDirection === "asc"}<ChevronUp
                                            class="h-4 w-4"
                                          />{:else}<ChevronDown
                                            class="h-4 w-4"
                                          />{/if}
                                      {:else}
                                        <ChevronsUpDown
                                          class="h-4 w-4 text-muted-foreground/50"
                                        />
                                      {/if}
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Models</Tooltip.Content>
                                  </Tooltip.Root>
                                </div>
                              </TableHead>
                              <TableHead
                                class="text-right cursor-pointer hover:bg-muted/50"
                                onclick={() =>
                                  handleProjectSortClick("outcomes")}
                              >
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  <Tooltip.Root>
                                    <Tooltip.Trigger
                                      class="flex items-center gap-1"
                                    >
                                      <Target class="h-4 w-4" /> Outcomes
                                      {#if projectSortColumn === "outcomes"}
                                        {#if projectSortDirection === "asc"}<ChevronUp
                                            class="h-4 w-4"
                                          />{:else}<ChevronDown
                                            class="h-4 w-4"
                                          />{/if}
                                      {:else}
                                        <ChevronsUpDown
                                          class="h-4 w-4 text-muted-foreground/50"
                                        />
                                      {/if}
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Outcomes</Tooltip.Content>
                                  </Tooltip.Root>
                                </div>
                              </TableHead>
                              <TableHead class="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {#each filteredProjectTableData as project, index (project.projectId)}
                              {#if index >= (projectCurrentPage - 1) * projectItemsPerPage && index < projectCurrentPage * projectItemsPerPage}
                                <TableRow
                                  class="transition-colors data-[state=selected]:bg-muted/50 hover:bg-muted/20"
                                  data-state={selectedProjectIds.has(
                                    project.projectId
                                  )
                                    ? "selected"
                                    : "unselected"}
                                  onclick={(event) => {
                                    // Check if the click target is inside the checkbox cell
                                    // We identify the cell by adding a specific data attribute
                                    const checkboxCell = (
                                      event.target as Element
                                    )?.closest('[data-checkbox-cell="true"]');
                                    // If the click was NOT inside the checkbox cell, toggle selection
                                    if (!checkboxCell) {
                                      toggleProjectSelection(project.projectId);
                                    }
                                  }}
                                >
                                  <TableCell
                                    class="cursor-pointer"
                                    data-checkbox-cell="true"
                                  >
                                    <Checkbox
                                      checked={selectedProjectIds.has(
                                        project.projectId
                                      )}
                                      onCheckedChange={() => {
                                        toggleProjectSelection(
                                          project.projectId
                                        );
                                      }}
                                      aria-label={`Select project ${project.projectName}`}
                                    />
                                  </TableCell>
                                  <TableCell
                                    class="font-medium truncate max-w-xs cursor-pointer"
                                  >
                                    <Tooltip.Provider>
                                      <Tooltip.Root>
                                        <Tooltip.Trigger>
                                          {project.projectName}
                                        </Tooltip.Trigger>
                                        <Tooltip.Content>
                                          {project.projectName}
                                        </Tooltip.Content>
                                      </Tooltip.Root>
                                    </Tooltip.Provider>
                                  </TableCell>
                                  <TableCell class="text-right">
                                    {project.literature}
                                  </TableCell>
                                  <TableCell class="text-right">
                                    {project.notes}
                                  </TableCell>
                                  <TableCell class="text-right">
                                    {project.models}
                                  </TableCell>
                                  <TableCell class="text-right">
                                    {project.outcomes}
                                  </TableCell>
                                  <TableCell class="text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      class="h-8 px-2"
                                      onclick={() =>
                                        openProjectUsersModal(
                                          project.projectId
                                        )}
                                    >
                                      View Users
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              {/if}
                            {/each}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <!-- Project Activity Pagination -->
                    {#if projectTotalPages > 1}
                      <div class="mt-4 flex justify-center">
                        <Pagination.Root
                          count={projectActivityTableData.length}
                          page={projectCurrentPage}
                          perPage={projectItemsPerPage}
                          onPageChange={handleProjectPageChange}
                          showFirstLastButtons
                          siblingCount={1}
                        >
                          {#snippet children({ pages, currentPage }: any)}
                            <Pagination.Content>
                              <Pagination.Item>
                                <Pagination.PrevButton />
                              </Pagination.Item>
                              {#each pages as page (page.key)}
                                {#if page.type === "ellipsis"}
                                  <Pagination.Item>
                                    <Pagination.Ellipsis />
                                  </Pagination.Item>
                                {:else}
                                  <Pagination.Item>
                                    <Pagination.Link
                                      {page}
                                      isActive={currentPage === page.value}
                                      on:click={() =>
                                        handleProjectPageChange(page.value)}
                                    >
                                      {page.value}
                                    </Pagination.Link>
                                  </Pagination.Item>
                                {/if}
                              {/each}
                              <Pagination.Item>
                                <Pagination.NextButton />
                              </Pagination.Item>
                            </Pagination.Content>
                          {/snippet}
                        </Pagination.Root>
                      </div>
                    {/if}

                    <!-- Selected Project Chart -->
                    <!-- Use unfiltered data for charts -->
                    {@const selectedProjectsData =
                      projectActivityTableData.filter((p) =>
                        selectedProjectIds.has(p.projectId)
                      )}
                    {#if selectedProjectsData.length > 0}
                      <div class="mt-6 space-y-6">
                        <h3 class="text-lg font-semibold">
                          Selected Project Activity Details
                        </h3>
                        <div
                          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                          {#each selectedProjectsData as project (project.projectId)}
                            <div
                              class="bg-card rounded-lg border shadow-sm p-3 animate-in fade-in-50"
                              role="region"
                              aria-live="polite"
                              aria-atomic="false"
                            >
                              <h4 class="text-md font-semibold mb-2 truncate">
                                {project.projectName}
                              </h4>
                              <ProjectActivityChart
                                dailyActivityCounts={project.dailyActivityCounts ||
                                  {}}
                                projectName={project.projectName}
                                dateRange={selectedRange}
                              />
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  {/if}
                </div>

                <!-- User Login Activity Section -->
                <div>
                  <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users class="w-5 h-5 text-primary" />
                    <span>User Login Activity</span>
                  </h2>

                  <!-- User Search Input -->
                  <div class="mb-4">
                    <Input
                      type="search"
                      placeholder="Search users by name or email..."
                      bind:value={userSearchTerm}
                      class="max-w-sm"
                    />
                  </div>

                  {#if !userLoginTableData?.length}
                    <div
                      class="text-center p-8 bg-muted/50 border border-border rounded-md"
                    >
                      <p class="text-muted-foreground">
                        No user login data available.
                      </p>
                    </div>
                  {:else}
                    <div class="border rounded-lg overflow-hidden shadow-sm">
                      <div class="overflow-x-auto">
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
                                      />{:else}<ChevronDown
                                        class="h-4 w-4"
                                      />{/if}
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
                                      />{:else}<ChevronDown
                                        class="h-4 w-4"
                                      />{/if}
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
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  Active Days (7d)
                                  {#if sortColumn === "days7"}
                                    {#if sortDirection === "asc"}<ChevronUp
                                        class="h-4 w-4"
                                      />{:else}<ChevronDown
                                        class="h-4 w-4"
                                      />{/if}
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
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  Active Days (14d)
                                  {#if sortColumn === "days14"}
                                    {#if sortDirection === "asc"}<ChevronUp
                                        class="h-4 w-4"
                                      />{:else}<ChevronDown
                                        class="h-4 w-4"
                                      />{/if}
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
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  Active Days (30d)
                                  {#if sortColumn === "days30"}
                                    {#if sortDirection === "asc"}<ChevronUp
                                        class="h-4 w-4"
                                      />{:else}<ChevronDown
                                        class="h-4 w-4"
                                      />{/if}
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
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  Active Days (All)
                                  {#if sortColumn === "daysAll"}
                                    {#if sortDirection === "asc"}<ChevronUp
                                        class="h-4 w-4"
                                      />{:else}<ChevronDown
                                        class="h-4 w-4"
                                      />{/if}
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
                                  >{row.stats
                                    .distinctLoginDaysLast14}</TableCell
                                >
                                <TableCell class="text-right"
                                  >{row.stats
                                    .distinctLoginDaysLast30}</TableCell
                                >
                                <TableCell class="text-right"
                                  >{row.stats
                                    .distinctLoginDaysAllTime}</TableCell
                                >
                              </TableRow>
                            {/each}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </main>
  </div>

  <!-- Project Users Modal -->
  {#if viewingProjectUsersId}
    <ProjectUsersModal onClose={closeProjectUsersModal} />
  {/if}
</Sidebar.Provider>

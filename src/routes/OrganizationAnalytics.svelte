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

  // Define the structure for the daily activity counts
  interface DailyActivityCount {
    literature: number;
    notes: number;
    models: number;
    outcomes: number;
  }

  // State for selected date range
  let selectedRange = $state<"7" | "14" | "30" | "all">("all");

  // Initialize data loading only once at component mount
  teamManagement.loadUserResources(true);
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

  // Log state changes for debugging
  $effect(() => {
    console.log("Selected range changed to:", selectedRange);
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
            {/if}
          </div>
        {/if}
      </div>
    </main>
  </div>
</Sidebar.Provider>

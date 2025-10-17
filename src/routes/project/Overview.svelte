<script lang="ts">
  import ProjectInsights from "$lib/components/ProjectInsights.svelte";
  import ResearchProducts from "$lib/components/ResearchProducts.svelte";
  import ProjectOverview from "$lib/components/project/ProjectOverview.svelte";
  import ResearchDesigns from "$lib/components/project/ResearchDesigns.svelte";
  import ProjectKeywords from "$lib/components/project/ProjectKeywords.svelte";
  import * as Card from "$lib/components/ui/card";
  import { projectStore } from "$lib/stores/ProjectStore";
  import NextBestActions from "$lib/components/custom-ui/project/NextBestActions.svelte";
  import { Button } from "$lib/components/ui/button";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap, Plus } from "lucide-svelte";
  import { customEventsStore } from "$lib/stores/CustomEventsStore";
  import CustomEventForm from "$lib/components/custom-ui/custom-events/CustomEventForm.svelte";
  import GrantDetails from "$lib/components/project/GrantDetails.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";

  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#project-overview",
        popover: {
          title: "Welcome to Your Project Overview",
          description:
            "This is your central hub for managing your research project. Let's explore the key sections that help you stay organized and focused.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#project-overview-card",
        popover: {
          title: "Define Your Project's Core",
          description:
            "Start here by clearly defining your project's purpose and setting its current status. A clear purpose keeps your research focused, while the status helps track progress and funding. Use the AI rewrite tool to refine your statement!",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#project-keywords-card",
        popover: {
          title: "Tag Your Research Themes",
          description:
            "Add relevant keywords to categorize your project. This makes it easier to find later and helps Quester connect related ideas across your research. Aim for 3-7 core terms.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#research-designs-card",
        popover: {
          title: "Outline Your Methodology",
          description:
            "Document your research, sampling, measurement, and analytic designs. Clearly defining your methodology ensures consistency and rigor throughout your project.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#research-products-card",
        popover: {
          title: "Track Your Deliverables",
          description:
            "Manage your research outputs like papers, reports, or presentations. Keep track of their status and deadlines to stay on top of your publication goals.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#project-insights-card",
        popover: {
          title: "Check Your Project's Health",
          description:
            "This card highlights missing setup steps or areas needing attention, ensuring your project is well-structured. Regularly reviewing insights helps maintain momentum.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#next-best-actions-card",
        popover: {
          title: "Focus Your Next Steps",
          description:
            "See prioritized literature items needing review and recent updates here. This helps you tackle the most important tasks first and stay informed about progress.",
          side: "left",
          align: "start",
        },
      },
      {
        element: ".container",
        popover: {
          title: "Ready to Get Started?",
          description:
            "Use this Overview page regularly to keep your research organized, focused, and on track from conception to publication. Explore each section to make the most of Quester!",
          side: "top",
          align: "center",
        },
      },
    ],
  });
</script>

<div class="flex-1 w-full overflow-x-hidden">
  <div class="container mx-auto py-6 px-4">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold ml-1" id="project-overview">
        Project Overview
      </h1>
      <div class="flex gap-2">
        <Button
          variant="outline"
          onclick={() => customEventsStore.openCreateForm()}
          class="h-10 px-3"
        >
          <Plus class="h-4 w-4 mr-2" />
          Add Event
        </Button>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button variant="outline" onclick={() => driverObj.drive()}>
                <GraduationCap class="h-4 w-4 mr-2" />
                Tour
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Tutorial</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
    <p class="text-muted-foreground mt-2 mb-6 ml-1">
      Get a high-level view of your project's status and key components.
    </p>

    <div class="grid grid-cols-2 gap-6 w-full">
      <!-- Left Column -->
      <div class="space-y-6">
        <div id="project-overview-card">
          <ProjectOverview />
        </div>

        <!-- Keywords -->
        {#if projectStore.currentProject}
          <Card.Root id="project-keywords-card">
            <Card.Header>
              <Card.Title>Project Keywords</Card.Title>
            </Card.Header>
            <Card.Content>
              <ProjectKeywords project={projectStore.currentProject} />
            </Card.Content>
          </Card.Root>
        {/if}

        <div class="w-full min-w-0" id="research-designs-card">
          <ResearchDesigns />
        </div>

        <div class="w-full min-w-0" id="grant-details-card">
          <GrantDetails />
        </div>
      </div>

      <!-- Right Column -->
      <div class="space-y-6">
        <div class="w-full min-w-0" id="project-insights-card">
          <ProjectInsights />
        </div>
        <div class="w-full min-w-0" id="next-best-actions-card">
          <NextBestActions />
        </div>
        <div class="w-full min-w-0" id="research-products-card">
          <ResearchProducts />
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Event Form Modal -->
<CustomEventForm />

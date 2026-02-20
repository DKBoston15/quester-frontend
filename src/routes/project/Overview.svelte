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
  import ResearchQuestionsOverview from "$lib/components/project/ResearchQuestionsOverview.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  // Factory function for driver.js tour with i18n
  function createDriverObj() {
    return driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#project-overview",
          popover: {
            title: t("tours.overview.welcome.title"),
            description: t("tours.overview.welcome.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#project-overview-card",
          popover: {
            title: t("tours.overview.projectCore.title"),
            description: t("tours.overview.projectCore.description"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#project-keywords-card",
          popover: {
            title: t("tours.overview.keywords.title"),
            description: t("tours.overview.keywords.description"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#research-designs-card",
          popover: {
            title: t("tours.overview.methodology.title"),
            description: t("tours.overview.methodology.description"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#research-products-card",
          popover: {
            title: t("tours.overview.deliverables.title"),
            description: t("tours.overview.deliverables.description"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#project-insights-card",
          popover: {
            title: t("tours.overview.health.title"),
            description: t("tours.overview.health.description"),
            side: "left",
            align: "start",
          },
        },
        {
          element: "#next-best-actions-card",
          popover: {
            title: t("tours.overview.nextSteps.title"),
            description: t("tours.overview.nextSteps.description"),
            side: "left",
            align: "start",
          },
        },
        {
          element: ".container",
          popover: {
            title: t("tours.overview.ready.title"),
            description: t("tours.overview.ready.description"),
            side: "top",
            align: "center",
          },
        },
      ],
    });
  }
</script>

<div class="flex-1 w-full overflow-x-hidden">
  <div class="container mx-auto py-6 px-4">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold ml-1" id="project-overview">
        {$_("overview.title")}
      </h1>
      <div class="flex gap-2">
        <Button
          variant="outline"
          onclick={() => customEventsStore.openCreateForm()}
          class="h-10 px-3"
        >
          <Plus class="h-4 w-4 mr-2" />
          {$_("overview.addEvent")}
        </Button>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button variant="outline" onclick={() => createDriverObj().drive()}>
                <GraduationCap class="h-4 w-4 mr-2" />
                {$_("dashboard.tour")}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>{$_("common.tutorial")}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
    <p class="text-muted-foreground mt-2 mb-6 ml-1">
      {$_("overview.description")}
    </p>

    <div class="grid grid-cols-2 gap-6 w-full">
      <!-- Left Column -->
      <div class="space-y-6">
        <div id="project-overview-card">
          <ProjectOverview />
        </div>

        <!-- Research Questions -->
        <ResearchQuestionsOverview />

        <!-- Keywords -->
        {#if projectStore.currentProject}
          <Card.Root id="project-keywords-card">
            <Card.Header>
              <Card.Title>{$_("overview.projectKeywords")}</Card.Title>
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

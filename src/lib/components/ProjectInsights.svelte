<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Progress from "$lib/components/ui/progress";
  import * as Accordion from "$lib/components/ui/accordion";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { grantStore } from "$lib/stores/GrantStore";
  import { AlertCircle, CheckCircle2, Sparkles } from "lucide-svelte";
  import EmptyState from "$lib/components/ui/empty-state/EmptyState.svelte";
  import { navigate } from "svelte-routing";
  import { slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import type { Project } from "$lib/types/auth";
  import { _ } from "svelte-i18n";

  type InsightRule = {
    field: keyof Project | string;
    severity: "error" | "warning";
    message: string;
    description: string;
    action?: {
      label: string;
      route: string;
    };
    checkFn?: (project: Project) => boolean;
  };

  const insightRules = $derived<InsightRule[]>([
    {
      field: "name",
      severity: "error",
      message: $_('projectInsights.missingProjectName'),
      description: $_('projectInsights.giveProjectName'),
      // action: {
      //   label: "Add Name",
      //   route: "project_settings",
      // },
    },
    {
      field: "purpose",
      severity: "error",
      message: $_('projectInsights.missingPurposeStatement'),
      description: $_('projectInsights.createPurposeStatement'),
      // action: {
      //   label: "Add Description",
      //   route: "project_settings",
      // },
    },
    {
      field: "grants",
      severity: "warning",
      message: $_('projectInsights.missingGrantInfo'),
      description: $_('projectInsights.addGrantInfo'),
      checkFn: (project) => grantStore.grants.length === 0,
      // action: {
      //   label: "Add Grant Info",
      //   route: "project_settings",
      // },
    },
    {
      field: "researchDesign",
      severity: "warning",
      message: $_('projectInsights.missingProjectDesigns'),
      description: $_('projectInsights.addDesigns'),
      checkFn: (project) =>
        !project.researchDesign?.trim() &&
        !project.samplingDesign?.trim() &&
        !project.measurementDesign?.trim() &&
        !project.analyticDesign?.trim(),
      // action: {
      //   label: "Add Designs",
      //   route: "project_settings",
      // },
    },
    {
      field: "keywords",
      severity: "warning",
      message: $_('projectInsights.missingProjectKeywords'),
      description: $_('projectInsights.addKeywords'),
      checkFn: (project) => !project.keywords || project.keywords.length === 0,
      // action: {
      //   label: "Add Keywords",
      //   route: "project_settings",
      // },
    },
    {
      field: "status",
      severity: "error",
      message: $_('projectInsights.projectStatusNotSet'),
      description: $_('projectInsights.setStatus'),
      // action: {
      //   label: "Set Status",
      //   route: "project_settings",
      // },
    },
  ]);

  let insights = $state<InsightRule[]>([]);
  let completionPercentage = $state(0);
  let accordionValue = $state<string[]>([]);

  function checkInsights(project: Project | null, rules: InsightRule[]) {
    if (!project) return [];
    return rules.filter((rule) => {
      if (rule.checkFn) {
        return rule.checkFn(project);
      }
      const fieldValue = project[rule.field as keyof Project];
      return (
        !fieldValue ||
        (typeof fieldValue === "string" && fieldValue.trim() === "")
      );
    });
  }

  function getCompletionPercentage(
    project: Project | null,
    rules: InsightRule[]
  ) {
    if (!project) return 0;
    const completedRules = rules.filter((rule) => {
      if (rule.checkFn) {
        return !rule.checkFn(project);
      }
      const fieldValue = project[rule.field as keyof Project];
      return (
        fieldValue &&
        (typeof fieldValue !== "string" || fieldValue.trim() !== "")
      );
    });
    return Math.round((completedRules.length / rules.length) * 100);
  }

  function handleActionClick(route: string) {
    if (!projectStore.currentProject?.id) return;
    navigate(`/project/${projectStore.currentProject.id}/${route}`);
  }

  $effect(() => {
    // Load grants when project changes
    if (projectStore.currentProject?.id) {
      grantStore.loadGrants(projectStore.currentProject.id);
    }
  });

  $effect(() => {
    insights = checkInsights(projectStore.currentProject, insightRules);
    completionPercentage = getCompletionPercentage(
      projectStore.currentProject,
      insightRules
    );
  });
</script>

<Card.Root
  class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <Accordion.Root value={accordionValue} type="multiple" class="w-full">
    <Accordion.Item value="insights">
      <div class="flex items-center justify-between px-6 pt-6">
        <div class="flex items-center gap-2">
          <Card.Title class="text-xl flex items-center gap-2">
            {$_('projectInsights.projectHealth')}
            {#if completionPercentage === 100}
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Sparkles class="h-5 w-5 text-yellow-500" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class=" text-sm">{$_("projectInsights.allTasksCompleted")}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
            {/if}
          </Card.Title>
          <span class="text-sm text-muted-foreground">
            ({insights.length}
            {insights.length === 1 ? $_('projectInsights.task') : $_('projectInsights.tasks')} {$_('projectInsights.remaining')})
          </span>
        </div>
        <Accordion.Trigger class="hover:opacity-70 transition-opacity group"
        ></Accordion.Trigger>
      </div>

      <Card.Header class="pt-4 px-6 pb-12">
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger
                  class="hover:text-foreground/70 transition-colors"
                >
                  <span>{$_('projectInsights.projectSetupProgress')}</span>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p class=" text-sm max-w-xs">
                    {$_('projectInsights.progressTooltip')}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
            <span class="font-bold">{completionPercentage}%</span>
          </div>
          <div class="relative">
            <Progress.Root
              value={completionPercentage}
              class="h-2 bg-secondary relative overflow-hidden rounded-full"
            />
            {#if completionPercentage > 0 && completionPercentage < 100}
              <div
                class="absolute top-3 left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={`transform: translateX(${completionPercentage}%)`}
              >
                <div
                  class="bg-black dark:bg-white text-white dark:text-black text-xs px-2 py-1 rounded-full"
                >
                  {$_('projectInsights.percentComplete', { values: { percent: completionPercentage } })}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </Card.Header>

      <Accordion.Content>
        <Card.Content class="space-y-6 pt-2">
          <!-- Insights List -->
          {#if insights.length > 0}
            <div
              class="space-y-4"
              transition:slide={{ duration: 300, easing: quintOut }}
            >
              <!-- Error Insights -->
              {#if insights.some((i) => i.severity === "error")}
                <div class="space-y-3">
                  <h3
                    class=" text-sm font-bold text-red-500 flex items-center gap-2"
                  >
                    {$_('projectInsights.requiredSetup')}
                    <span
                      class="text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full"
                    >
                      {insights.filter((i) => i.severity === "error").length}
                    </span>
                  </h3>
                  {#each insights.filter((i) => i.severity === "error") as insight, i}
                    <div
                      class="group border-2 dark:border-dark-border p-4 rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] transition-all duration-300"
                      in:slide={{ duration: 300, delay: 150 + i * 50 }}
                    >
                      <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 mt-1">
                          <AlertCircle class="text-red-500" />
                        </div>
                        <div class="flex-grow space-y-2">
                          <h4 class=" font-bold flex items-center gap-2">
                            {insight.message}
                            <span
                              class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            >
                              {$_('projectInsights.required')}
                            </span>
                          </h4>
                          <p class="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                        <!-- <Button
                          variant="outline"
                          class="flex-shrink-0 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-300"
                          onclick={() =>
                            handleActionClick(insight.action.route)}
                        >
                          <span class="">{insight.action.label}</span>
                          <ChevronRight class="h-4 w-4 ml-2" />
                        </Button> -->
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Warning Insights -->
              {#if insights.some((i) => i.severity === "warning")}
                <div class="space-y-3">
                  <h3
                    class=" text-sm font-bold text-yellow-500 flex items-center gap-2"
                  >
                    {$_('projectInsights.recommendedSetup')}
                    <span
                      class="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full"
                    >
                      {insights.filter((i) => i.severity === "warning").length}
                    </span>
                  </h3>
                  {#each insights.filter((i) => i.severity === "warning") as insight, i}
                    <div
                      class="group border-2 dark:border-dark-border p-4 rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] transition-all duration-300"
                      in:slide={{ duration: 300, delay: 150 + i * 50 }}
                    >
                      <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 mt-1">
                          <AlertCircle class="text-yellow-500" />
                        </div>
                        <div class="flex-grow space-y-2">
                          <h4 class=" font-bold flex items-center gap-2">
                            {insight.message}
                            <span
                              class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                            >
                              {$_('projectInsights.recommended')}
                            </span>
                          </h4>
                          <p class="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                        <!-- <Button
                          variant="outline"
                          class="flex-shrink-0 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-300"
                          onclick={() =>
                            handleActionClick(insight.action.route)}
                        >
                          <span class="">{insight.action.label}</span>
                          <ChevronRight class="h-4 w-4 ml-2" />
                        </Button> -->
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <div transition:slide={{ duration: 300, easing: quintOut }}>
              <EmptyState
                title={$_("projectInsights.allTasksCompleted")}
                description={$_('emptyStateDescriptions.projectWellConfigured')}
                variant="completion"
                icon={CheckCircle2}
                height="h-auto"
              />
            </div>
          {/if}
        </Card.Content>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</Card.Root>

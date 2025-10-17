<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Progress from "$lib/components/ui/progress";
  import * as Accordion from "$lib/components/ui/accordion";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { AlertCircle, CheckCircle2, Sparkles } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import type { Literature } from "$lib/types/literature";

  type InsightRule = {
    field: keyof Literature;
    severity: "error" | "warning";
    message: string;
    description: string;
    action?: {
      label: string;
      tab: string;
    };
    checkFn?: (literature: Literature) => boolean;
  };

  const insightRules: InsightRule[] = [
    {
      field: "name",
      severity: "error",
      message: "Missing Literature Title",
      description:
        "Add a title to help identify and reference this literature.",
      // action: {
      //   label: "Add Title",
      //   tab: "details",
      // },
    },
    {
      field: "authors",
      severity: "error",
      message: "Missing Authors",
      description: "Add the authors of this literature for proper citation.",
      // action: {
      //   label: "Add Authors",
      //   tab: "details",
      // },
    },
    {
      field: "publishYear",
      severity: "error",
      message: "Missing Publication Year",
      description: "Add the publication year for chronological reference.",
      // action: {
      //   label: "Add Year",
      //   tab: "details",
      // },
    },
    {
      field: "publisherName",
      severity: "error",
      message: "Missing Publisher",
      description: "Add the publisher information for complete citation.",
      // action: {
      //   label: "Add Publisher",
      //   tab: "details",
      // },
    },
    {
      field: "type",
      severity: "warning",
      message: "Literature Type Not Set",
      description: "Specify the type of literature for better organization.",
      // action: {
      //   label: "Set Type",
      //   tab: "details",
      // },
    },
    {
      field: "status",
      severity: "warning",
      message: "Reading Status Not Set",
      description: "Set the reading status to track your progress.",
      // action: {
      //   label: "Set Status",
      //   tab: "status",
      // },
    },
  ];

  const { literature, onTabChange } = $props<{
    literature: Literature;
    onTabChange: (tab: string) => void;
  }>();

  let insights = $state<InsightRule[]>([]);
  let completionPercentage = $state(0);
  let accordionValue = $state<string[]>([]);

  function checkInsights(literature: Literature | null, rules: InsightRule[]) {
    if (!literature) return [];
    return rules.filter((rule) => {
      if (rule.checkFn) {
        return rule.checkFn(literature);
      }
      const fieldValue = literature[rule.field];
      return (
        !fieldValue ||
        (Array.isArray(fieldValue) && fieldValue.length === 0) ||
        (typeof fieldValue === "string" && fieldValue.trim() === "") ||
        (typeof fieldValue === "object" &&
          (!fieldValue || !fieldValue.toString().trim()))
      );
    });
  }

  function getCompletionPercentage(
    literature: Literature | null,
    rules: InsightRule[]
  ) {
    if (!literature) return 0;
    const completedRules = rules.filter((rule) => {
      if (rule.checkFn) {
        return !rule.checkFn(literature);
      }
      const fieldValue = literature[rule.field];
      return (
        fieldValue &&
        ((Array.isArray(fieldValue) && fieldValue.length > 0) ||
          (typeof fieldValue === "string" && fieldValue.trim() !== "") ||
          (typeof fieldValue === "object" &&
            fieldValue &&
            fieldValue.toString().trim()))
      );
    });
    return Math.round((completedRules.length / rules.length) * 100);
  }

  $effect(() => {
    insights = checkInsights(literature, insightRules);
    completionPercentage = getCompletionPercentage(literature, insightRules);
  });
</script>

<Card.Root id="lit-insights-card">
  <Accordion.Root value={accordionValue} type="multiple" class="w-full">
    <Accordion.Item value="insights">
      <div class="flex items-center justify-between px-6 pt-6">
        <div class="flex items-center gap-2">
          <Card.Title class="text-xl flex items-center gap-2">
            Literature Health
            {#if completionPercentage === 100}
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Sparkles class="h-5 w-5 text-yellow-500" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="text-sm">All setup tasks completed!</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
            {/if}
          </Card.Title>
          <span class="text-sm text-muted-foreground">
            ({insights.length}
            {insights.length === 1 ? "task" : "tasks"} remaining)
          </span>
        </div>
        <Accordion.Trigger
          id="lit-insights-accordion-trigger"
          class="hover:opacity-70 transition-opacity group"
        />
      </div>

      <Card.Header class="pt-4 px-6 pb-12">
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger
                  class="hover:text-foreground/70 transition-colors"
                >
                  <span>Literature Setup Progress</span>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p class="text-sm max-w-xs">
                    Complete these tasks to improve your literature's
                    organization and citation quality
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
            <span class="font-bold">{completionPercentage}%</span>
          </div>
          <div class="relative">
            <div id="lit-insights-progress-bar">
              <Progress.Root
                value={completionPercentage}
                class="h-2 bg-secondary relative overflow-hidden rounded-full"
              />
            </div>
            {#if completionPercentage > 0 && completionPercentage < 100}
              <div
                class="absolute top-3 left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={`transform: translateX(${completionPercentage}%)`}
              >
                <div
                  class="bg-black dark:bg-white text-white dark:text-black text-xs px-2 py-1 rounded-full"
                >
                  {completionPercentage}% complete
                </div>
              </div>
            {/if}
          </div>
        </div>
      </Card.Header>

      <Accordion.Content>
        <Card.Content class="space-y-6 pt-2">
          {#if insights.length > 0}
            <div
              class="space-y-4"
              transition:slide={{ duration: 300, easing: quintOut }}
            >
              <!-- Error Insights -->
              {#if insights.some((i) => i.severity === "error")}
                <div class="space-y-3">
                  <h3
                    class="text-sm font-bold text-red-500 flex items-center gap-2"
                  >
                    Required Fields
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
                          <h4 class="font-bold flex items-center gap-2">
                            {insight.message}
                            <span
                              class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            >
                              Required
                            </span>
                          </h4>
                          <p class="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                        <!-- <Button
                          variant="outline"
                          class="flex-shrink-0 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-300"
                          onclick={() => handleActionClick(insight.action.tab)}
                        >
                          <span>{insight.action.label}</span>
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
                    class="text-sm font-bold text-yellow-500 flex items-center gap-2"
                  >
                    Recommended Fields
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
                          <h4 class="font-bold flex items-center gap-2">
                            {insight.message}
                            <span
                              class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                            >
                              Recommended
                            </span>
                          </h4>
                          <p class="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                        <!-- <Button
                          variant="outline"
                          class="flex-shrink-0 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-300"
                          onclick={() => handleActionClick(insight.action.tab)}
                        >
                          <span>{insight.action.label}</span>
                          <ChevronRight class="h-4 w-4 ml-2" />
                        </Button> -->
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <div
              class="text-center py-6"
              transition:slide={{ duration: 300, easing: quintOut }}
            >
              <CheckCircle2 class="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p class="text-lg">All literature fields completed!</p>
              <p class="text-sm text-muted-foreground mt-2">
                This literature entry is well-documented and ready for citation.
              </p>
            </div>
          {/if}
        </Card.Content>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</Card.Root>

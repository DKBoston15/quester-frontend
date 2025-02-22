<!-- src/routes/project/Dashboard.svelte -->
<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import * as Textarea from "$lib/components/ui/textarea";
  import * as Select from "$lib/components/ui/select";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { Project } from "$lib/types/auth";
  import ProjectInsights from "$lib/components/ProjectInsights.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { InfoIcon } from "lucide-svelte";
  import ResearchProducts from "$lib/components/ResearchProducts.svelte";

  const props = $props<{ project: Project }>();

  const projectStatusOptions = [
    { value: "Planning", label: "Planning" },
    { value: "In Progress", label: "In Progress" },
    { value: "Writing", label: "Writing" },
    { value: "Review", label: "Review" },
    { value: "Revision", label: "Revision" },
    { value: "Completed", label: "Completed" },
    { value: "Archived", label: "Archived" },
  ] as const;

  const designTypes = [
    "research",
    "sampling",
    "measurement",
    "analytic",
  ] as const;

  let editMode = $state({
    purpose: false,
    status: false,
    designs: false,
  });

  let isPending = $state(false);
  let currentTab = $state<(typeof designTypes)[number]>("research");
  let currentStatus = $state<string | null>(null);
  let currentPurpose = $state<string | null>(null);
  let currentFinancialInst = $state<string | null>(null);
  let currentFinancialSupport = $state<string | null>(null);
  let localDesigns = $state<Record<string, string>>({
    research: "",
    sampling: "",
    measurement: "",
    analytic: "",
  });

  $effect(() => {
    const project = projectStore.currentProject;
    if (project) {
      currentStatus = project.status ?? null;
      currentPurpose = project.purpose ?? null;
      currentFinancialInst = project.financialInstitution ?? null;
      currentFinancialSupport = project.financialSupport ?? null;

      // Update localDesigns from project
      localDesigns = {
        research: project.researchDesign ?? "",
        sampling: project.samplingDesign ?? "",
        measurement: project.measurementDesign ?? "",
        analytic: project.analyticDesign ?? "",
      };
    }
  });

  function handleDesignChange(
    type: (typeof designTypes)[number],
    value: string
  ) {
    localDesigns = { ...localDesigns, [type]: value };
  }

  async function saveDesigns() {
    if (!projectStore.currentProject?.id) return;

    isPending = true;
    try {
      await projectStore.updateProject(projectStore.currentProject.id, {
        researchDesign: localDesigns.research,
        samplingDesign: localDesigns.sampling,
        measurementDesign: localDesigns.measurement,
        analyticDesign: localDesigns.analytic,
      });
      editMode.designs = false;
    } catch (error) {
      console.error("Failed to update designs:", error);
    } finally {
      isPending = false;
    }
  }

  async function saveProjectOverview() {
    if (!projectStore.currentProject?.id) return;

    isPending = true;
    try {
      await projectStore.updateProject(projectStore.currentProject.id, {
        purpose: currentPurpose,
        status: currentStatus,
        financialInstitution: currentFinancialInst,
        financialSupport: currentFinancialSupport,
      });
      editMode.purpose = false;
      editMode.status = false;
    } catch (error) {
      console.error("Failed to update project:", error);
    } finally {
      isPending = false;
    }
  }

  function getBadgeVariant(status: string) {
    switch (status) {
      case "Planning":
        return "planning";
      case "In Progress":
        return "active";
      case "Writing":
      case "Review":
      case "Revision":
        return "review";
      case "Completed":
        return "success";
      case "Archived":
        return "archived";
      default:
        return "outline";
    }
  }

  function handleStatusSelect(value: string) {
    currentStatus = value;
  }
</script>

<div class="flex-1 w-full">
  <div class="w-full py-6 px-4">
    <h1 class="text-3xl font-bold mb-6">Project Dashboard</h1>

    <div class="grid grid-cols-2 gap-6 w-full">
      <!-- Left Column -->
      <div class="space-y-6">
        <!-- Project Overview -->
        <Card
          class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
        >
          <CardHeader>
            <div class="flex justify-between items-center">
              <CardTitle class="">Project Overview</CardTitle>
              {#if !editMode.purpose && !editMode.status}
                <Button
                  size="sm"
                  onclick={() => {
                    editMode.purpose = true;
                    editMode.status = true;
                  }}>Edit</Button
                >
              {/if}
            </div>
          </CardHeader>
          <CardContent class="space-y-6">
            <!-- Purpose Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <InfoIcon class="h-5 w-5" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="text-sm max-w-xs">
                      A research purpose is a statement establishing the intent
                      of the study.
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
                <h3 class="text-sm font-bold">Purpose Statement</h3>
              </div>

              {#if editMode.purpose}
                <Textarea.Textarea
                  bind:value={currentPurpose}
                  rows={5}
                  placeholder="Enter project purpose"
                  class="w-full"
                />
              {:else}
                <p class="text-muted-foreground whitespace-pre-wrap">
                  {currentPurpose || "No purpose defined"}
                </p>
              {/if}
            </div>

            <!-- Status Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <InfoIcon class="h-5 w-5" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="text-sm max-w-xs">
                      Current status and financial details of your project.
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
                <h3 class="text-sm font-bold">Project Status</h3>
              </div>

              {#if editMode.status}
                <div class="grid gap-4">
                  <Select.Root type="single">
                    <Select.Trigger class="w-full">
                      {#if currentStatus}
                        <Badge variant={getBadgeVariant(currentStatus)}
                          >{currentStatus}</Badge
                        >
                      {:else}
                        <span>Select status</span>
                      {/if}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Group>
                        {#each projectStatusOptions as option}
                          <Select.Item
                            value={option.value}
                            onclick={() => handleStatusSelect(option.value)}
                          >
                            <Badge variant={getBadgeVariant(option.value)}
                              >{option.label}</Badge
                            >
                          </Select.Item>
                        {/each}
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>

                  <Input
                    bind:value={currentFinancialInst}
                    placeholder="Financial Institution"
                  />
                  <Input
                    bind:value={currentFinancialSupport}
                    placeholder="Financial Support Amount"
                  />
                </div>
              {:else}
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Status:</span>
                    {#if currentStatus}
                      <Badge variant={getBadgeVariant(currentStatus)}
                        >{currentStatus}</Badge
                      >
                    {:else}
                      <span class="text-muted-foreground">Not set</span>
                    {/if}
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Institution:</span>
                    <span class="">{currentFinancialInst || "Not set"}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Support Amount:</span>
                    <span class="">{currentFinancialSupport || "Not set"}</span>
                  </div>
                </div>
              {/if}
            </div>
          </CardContent>
          {#if editMode.purpose || editMode.status}
            <CardFooter class="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onclick={() => {
                  editMode.purpose = false;
                  editMode.status = false;
                }}
                disabled={isPending}
                class="w-full"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onclick={saveProjectOverview}
                disabled={isPending}
                class="w-full"
              >
                {isPending ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          {/if}
        </Card>

        <!-- Project Designs -->
        <Card
          class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
        >
          <CardHeader>
            <div class="flex justify-between items-center">
              <CardTitle class=" flex items-center gap-2">
                Research Designs
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <InfoIcon class="h-5 w-5" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class=" text-sm max-w-xs">
                      Define your research methodology across different design
                      types.
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </CardTitle>
              {#if !editMode.designs}
                <Button size="sm" onclick={() => (editMode.designs = true)}
                  >Edit</Button
                >
              {/if}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs.Root value={currentTab}>
              <Tabs.List
                class="grid grid-cols-4 border dark:bg-background border-black dark:border-dark-border rounded-lg overflow-hidden"
              >
                {#each designTypes as type}
                  <Tabs.Trigger
                    value={type}
                    class="capitalize  px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-dark-border data-[state=active]:font-medium"
                  >
                    {type}
                  </Tabs.Trigger>
                {/each}
              </Tabs.List>
              {#each designTypes as type}
                <Tabs.Content value={type} class="pt-4">
                  {#if editMode.designs}
                    <select
                      class="flex h-10 w-full items-center justify-between rounded-md border border-black dark:border-dark-border bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={localDesigns[type]}
                      onchange={(e) =>
                        handleDesignChange(type, e.currentTarget.value)}
                    >
                      <option value="">Select {type} design</option>
                      {#each projectStore.designs[type] || [] as option}
                        <option value={option.name}>{option.name}</option>
                      {/each}
                    </select>
                  {:else}
                    <p class="text-muted-foreground">
                      {localDesigns[type] || `No ${type} design specified`}
                    </p>
                  {/if}
                </Tabs.Content>
              {/each}
            </Tabs.Root>
          </CardContent>
          {#if editMode.designs}
            <CardFooter class="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onclick={() => (editMode.designs = false)}
                disabled={isPending}
                class="w-full"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onclick={saveDesigns}
                disabled={isPending}
                class="w-full"
              >
                {isPending ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          {/if}
        </Card>
      </div>

      <!-- Right Column -->
      <div class="space-y-6">
        <!-- Project Insights -->
        <div class="w-full min-w-0">
          <ProjectInsights />
        </div>

        <!-- Research Products -->
        <div class="w-full min-w-0">
          <ResearchProducts />
        </div>
      </div>
    </div>
  </div>
</div>

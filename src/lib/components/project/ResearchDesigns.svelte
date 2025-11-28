<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { _ } from "svelte-i18n";

  const designTypes = [
    "research",
    "sampling",
    "measurement",
    "analytic",
  ] as const;

  let editMode = $state(false);
  let isPending = $state(false);
  let currentTab = $state<(typeof designTypes)[number]>("research");
  let localDesigns = $state<Record<string, string>>({
    research: "",
    sampling: "",
    measurement: "",
    analytic: "",
  });

  $effect(() => {
    const project = projectStore.currentProject;
    if (project) {
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
      editMode = false;
    } catch (error) {
      console.error("Failed to update designs:", error);
    } finally {
      isPending = false;
    }
  }
</script>

<Card
  class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <CardHeader>
    <div class="flex justify-between items-center">
      <CardTitle class="flex items-center gap-2">
        {$_('researchDesignsCard.projectDesigns')}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <InfoIcon class="h-5 w-5" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-sm max-w-xs">
              {$_('researchDesigns.defineMethodology')}
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </CardTitle>
      {#if !editMode}
        <Button size="sm" onclick={() => (editMode = true)}>{$_('common.edit')}</Button>
      {/if}
    </div>
  </CardHeader>
  <CardContent>
    <Tabs.Root value={currentTab}>
      <Tabs.List
        class="grid grid-cols-4 border dark:bg-background  dark:border-dark-border rounded-lg overflow-hidden"
      >
        {#each designTypes as type}
          <Tabs.Trigger
            value={type}
            class="capitalize px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]: dark:data-[state=active]:border-dark-border data-[state=active]:font-medium"
          >
            {type}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
      {#each designTypes as type}
        <Tabs.Content value={type} class="pt-4">
          {#if editMode}
            <select
              class="flex h-10 w-full items-center justify-between rounded-md border dark:border-dark-border bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={localDesigns[type]}
              onchange={(e) => handleDesignChange(type, e.currentTarget.value)}
            >
              <option value="">{$_('researchDesignsCard.selectDesign', { values: { type } })}</option>
              {#each projectStore.designs[type] || [] as option}
                <option value={option.name}>{option.name}</option>
              {/each}
            </select>
          {:else}
            <p class="text-muted-foreground">
              {localDesigns[type] || $_('researchDesignsCard.noDesignSpecified', { values: { type } })}
            </p>
          {/if}
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  </CardContent>
  {#if editMode}
    <CardFooter class="grid grid-cols-2 gap-2">
      <Button
        variant="ghost"
        size="sm"
        onclick={() => (editMode = false)}
        disabled={isPending}
        class="w-full"
      >
        {$_('common.cancel')}
      </Button>
      <Button
        size="sm"
        onclick={saveDesigns}
        disabled={isPending}
        class="w-full"
      >
        {isPending ? $_('common.saving') : $_('common.save')}
      </Button>
    </CardFooter>
  {/if}
</Card>

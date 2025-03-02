<!-- src/lib/components/custom-ui/literature/literatureItem/LiteratureDesigns.svelte -->
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
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import type { Literature } from "$lib/types/literature";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";

  const designTypes = [
    "research",
    "sampling",
    "measurement",
    "analytic",
  ] as const;

  const { literature } = $props<{ literature: Literature }>();
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
    if (literature) {
      localDesigns = {
        research: literature.researchDesign ?? "",
        sampling: literature.samplingDesign ?? "",
        measurement: literature.measurementDesign ?? "",
        analytic: literature.analyticDesign ?? "",
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
    if (!literature?.id) return;

    isPending = true;
    try {
      await literatureStore.updateLiterature(literature.id, {
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
  class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <CardHeader>
    <div class="flex justify-between items-center">
      <CardTitle class="flex items-center gap-2">
        Research Designs
        <Tooltip.Root>
          <Tooltip.Trigger>
            <InfoIcon class="h-5 w-5" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-sm max-w-xs">
              Define the research methodology used in this literature.
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </CardTitle>
      {#if !editMode}
        <Button size="sm" onclick={() => (editMode = true)}>Edit</Button>
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
            class="capitalize px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-dark-border data-[state=active]:font-medium"
          >
            {type}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
      {#each designTypes as type}
        <Tabs.Content value={type} class="pt-4">
          {#if editMode}
            <select
              class="flex h-10 w-full items-center justify-between rounded-md border border-black dark:border-dark-border bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={localDesigns[type]}
              onchange={(e) => handleDesignChange(type, e.currentTarget.value)}
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
  {#if editMode}
    <CardFooter class="grid grid-cols-2 gap-2">
      <Button
        variant="ghost"
        size="sm"
        onclick={() => (editMode = false)}
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

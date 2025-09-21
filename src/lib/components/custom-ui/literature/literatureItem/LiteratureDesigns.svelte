<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import type { Literature } from "$lib/types/literature";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import { toast } from "svelte-sonner";

  const designTypes = [
    "research",
    "sampling",
    "measurement",
    "analytic",
  ] as const;

  type DesignType = (typeof designTypes)[number];
  type DesignOption = { name: string };
  type DesignSelection = Record<DesignType, string>;

  const ADD_NEW_OPTION_VALUE = "__add_new__";

  const { literature } = $props<{ literature: Literature }>();
  let editMode = $state(false);
  let isPending = $state(false);
  let currentTab = $state<DesignType>("research");
  let localDesigns = $state<DesignSelection>({
    research: "",
    sampling: "",
    measurement: "",
    analytic: "",
  });
  let addingDesign = $state<Record<DesignType, boolean>>({
    research: false,
    sampling: false,
    measurement: false,
    analytic: false,
  });
  let newDesignNames = $state<Record<DesignType, string>>({
    research: "",
    sampling: "",
    measurement: "",
    analytic: "",
  });
  let designCreationPending = $state<DesignType | null>(null);

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
    type: DesignType,
    value: string
  ) {
    localDesigns = { ...localDesigns, [type]: value };
  }

  function handleSelectChange(type: DesignType, value: string) {
    if (value === ADD_NEW_OPTION_VALUE) {
      addingDesign = { ...addingDesign, [type]: true };
      newDesignNames = { ...newDesignNames, [type]: "" };
      return;
    }

    handleDesignChange(type, value);
  }

  function cancelAddDesign(type: DesignType) {
    addingDesign = { ...addingDesign, [type]: false };
    newDesignNames = { ...newDesignNames, [type]: "" };
  }

  function sortDesigns(designs: DesignOption[]): DesignOption[] {
    return [...designs].sort((a, b) => a.name.localeCompare(b.name));
  }

  async function persistLiteratureDesigns({ exitEditMode = false } = {}) {
    if (!literature?.id) {
      throw new Error("Select a literature item before saving designs");
    }

    isPending = true;
    try {
      await literatureStore.updateLiterature(literature.id, {
        researchDesign: localDesigns.research,
        samplingDesign: localDesigns.sampling,
        measurementDesign: localDesigns.measurement,
        analyticDesign: localDesigns.analytic,
      });

      if (exitEditMode) {
        editMode = false;
      }

      return true;
    } catch (error) {
      console.error("Failed to update designs:", error);
      throw error;
    } finally {
      isPending = false;
    }
  }

  function buildDesignPayload(
    type: DesignType,
    newDesignName: string
  ): Record<DesignType, DesignOption[]> {
    const existingDesigns = projectStore.designs;
    return {
      research:
        type === "research"
          ? sortDesigns([
              ...(existingDesigns.research || []),
              { name: newDesignName },
            ])
          : sortDesigns([...(existingDesigns.research || [])]),
      sampling:
        type === "sampling"
          ? sortDesigns([
              ...(existingDesigns.sampling || []),
              { name: newDesignName },
            ])
          : sortDesigns([...(existingDesigns.sampling || [])]),
      measurement:
        type === "measurement"
          ? sortDesigns([
              ...(existingDesigns.measurement || []),
              { name: newDesignName },
            ])
          : sortDesigns([...(existingDesigns.measurement || [])]),
      analytic:
        type === "analytic"
          ? sortDesigns([
              ...(existingDesigns.analytic || []),
              { name: newDesignName },
            ])
          : sortDesigns([...(existingDesigns.analytic || [])]),
    };
  }

  async function addDesignOption(type: DesignType) {
    const projectId = projectStore.currentProject?.id;
    const rawName = newDesignNames[type]?.trim() ?? "";

    if (!projectId) {
      toast.error("Select a project before adding designs");
      return;
    }

    if (!rawName) {
      toast.error("Design name cannot be empty");
      return;
    }

    const existingTypeDesigns = projectStore.designs[type] || [];
    if (
      existingTypeDesigns.some(
        (design) => design.name.toLowerCase() === rawName.toLowerCase()
      )
    ) {
      toast.error("Design with this name already exists");
      return;
    }

    designCreationPending = type;
    try {
      const payload = buildDesignPayload(type, rawName);
      await projectStore.updateDesigns(projectId, payload);
      localDesigns = { ...localDesigns, [type]: rawName };
      await persistLiteratureDesigns({ exitEditMode: true });
      toast.success(`Added ${type} design`);
      cancelAddDesign(type);
    } catch (error) {
      console.error("Failed to add design option:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add design option"
      );
    } finally {
      designCreationPending = null;
    }
  }

  async function saveDesigns() {
    if (!literature?.id) return;
    try {
      await persistLiteratureDesigns({ exitEditMode: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update designs"
      );
    }
  }
</script>

<Card
  class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
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
        id="lit-design-tabs"
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
            <div class="space-y-2">
              <select
                class="flex h-10 w-full items-center justify-between rounded-md border dark:border-dark-border bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={localDesigns[type]}
                onchange={(e) =>
                  handleSelectChange(type, e.currentTarget.value)}
              >
                <option value="">Select {type} design</option>
                {#each projectStore.designs[type] || [] as option}
                  <option value={option.name}>{option.name}</option>
                {/each}
                <option value={ADD_NEW_OPTION_VALUE}>
                  Add new {type} design +
                </option>
              </select>

              {#if addingDesign[type]}
                <div class="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="text"
                    placeholder={`New ${type} design name`}
                    bind:value={newDesignNames[type]}
                    onkeydown={(event) =>
                      event.key === "Enter" &&
                      designCreationPending !== type &&
                      addDesignOption(type)}
                    disabled={designCreationPending === type}
                  />
                  <div class="flex gap-2">
                    <Button
                      size="sm"
                      onclick={() => addDesignOption(type)}
                      disabled={designCreationPending === type}
                    >
                      {designCreationPending === type ? "Adding…" : "Add"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => cancelAddDesign(type)}
                      disabled={designCreationPending === type}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              {/if}
            </div>
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
        id="lit-design-cancel-button"
        size="sm"
        onclick={() => (editMode = false)}
        disabled={isPending}
        class="w-full"
      >
        Cancel
      </Button>
      <Button
        size="sm"
        id="lit-design-save-button"
        onclick={saveDesigns}
        disabled={isPending}
        class="w-full"
      >
        {isPending ? "Saving..." : "Save"}
      </Button>
    </CardFooter>
  {/if}
</Card>

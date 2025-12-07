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
  import * as Textarea from "$lib/components/ui/textarea";
  import * as Select from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import type { Literature } from "$lib/types/literature";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import { _ } from "svelte-i18n";
  import { toast } from "svelte-sonner";
  import { normalizeDesignDetail } from "$lib/utils/design";

  const designTypes = [
    "research",
    "sampling",
    "measurement",
    "analytic",
  ] as const;

  type DesignType = (typeof designTypes)[number];
  type DesignOption = { name: string };
  type LocalDesignState = { selections: string[]; description: string };
  type DesignSelectionState = Record<DesignType, LocalDesignState>;

  const createEmptyState = (): LocalDesignState => ({
    selections: [],
    description: "",
  });

  const { literature } = $props<{ literature: Literature }>();
  let editMode = $state(false);
  let isPending = $state(false);
  let currentTab = $state<DesignType>("research");
  let localDesigns = $state<DesignSelectionState>({
    research: createEmptyState(),
    sampling: createEmptyState(),
    measurement: createEmptyState(),
    analytic: createEmptyState(),
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

  const toLocalState = (detail: unknown): LocalDesignState => {
    const normalized = normalizeDesignDetail(detail);
    return {
      selections: [...normalized.selections],
      description: normalized.description ?? "",
    };
  };

  // Helper to extract design value (handles both string and object formats)
  function getDesignValue(design: unknown): string {
    if (!design) return "";
    if (typeof design === "string") return design;
    if (typeof design === "object") {
      // Handle { selections: string[], description?: string } format
      if ("selections" in design) {
        const selections = (design as { selections: string[] }).selections;
        if (Array.isArray(selections) && selections.length > 0) {
          return selections[0]; // Return first selection for the dropdown
        }
      }
      // Handle { name: string } format (legacy)
      if ("name" in design) {
        return (design as { name: string }).name || "";
      }
    }
    return "";
  }

  $effect(() => {
    if (literature) {
      localDesigns = {
        research: toLocalState(literature.researchDesign),
        sampling: toLocalState(literature.samplingDesign),
        measurement: toLocalState(literature.measurementDesign),
        analytic: toLocalState(literature.analyticDesign),
      };
    }
  });

  function sortDesigns(designs: DesignOption[]): DesignOption[] {
    return [...designs].sort((a, b) => a.name.localeCompare(b.name));
  }

  function sortSelections(type: DesignType, selections: string[]): string[] {
    const availableNames = (projectStore.designs[type] || []).map(
      (option) => option.name
    );
    return [...new Set(selections)].sort((a, b) => {
      const indexA = availableNames.indexOf(a);
      const indexB = availableNames.indexOf(b);

      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b);
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  function updateSelections(type: DesignType, selections: string[]) {
    localDesigns = {
      ...localDesigns,
      [type]: {
        ...localDesigns[type],
        selections: sortSelections(type, selections),
      },
    };
  }

  const typeLabels: Record<DesignType, string> = {
    research: "Research",
    sampling: "Sampling",
    measurement: "Measurement",
    analytic: "Analytic",
  };

  function getTriggerLabel(type: DesignType): string {
    const selections = localDesigns[type].selections;
    if (selections.length === 0) {
      return `Select ${typeLabels[type]} designs`;
    }
    return selections.join(", ");
  }

  function cancelAddDesign(type: DesignType) {
    addingDesign = { ...addingDesign, [type]: false };
    newDesignNames = { ...newDesignNames, [type]: "" };
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

  const toDesignUpdatePayload = (state: LocalDesignState) => ({
    selections: state.selections,
    description: state.description.trim() ? state.description.trim() : null,
  });

  async function persistLiteratureDesigns({ exitEditMode = false } = {}) {
    if (!literature?.id) {
      throw new Error("Select a literature item before saving designs");
    }

    isPending = true;
    try {
      await literatureStore.updateLiterature(literature.id, {
        researchDesign: toDesignUpdatePayload(localDesigns.research),
        samplingDesign: toDesignUpdatePayload(localDesigns.sampling),
        measurementDesign: toDesignUpdatePayload(localDesigns.measurement),
        analyticDesign: toDesignUpdatePayload(localDesigns.analytic),
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
      const activeProjectId = projectStore.currentProject?.id;
      if (!activeProjectId) {
        throw new Error("Select a project before adding designs");
      }
      await projectStore.updateDesigns(activeProjectId, payload);
      localDesigns = {
        ...localDesigns,
        [type]: {
          ...localDesigns[type],
          selections: sortSelections(type, [
            ...localDesigns[type].selections,
            rawName,
          ]),
        },
      };
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

<Card>
  <CardHeader>
    <div class="flex justify-between items-center">
      <CardTitle class="flex items-center gap-2">
        {$_('literatureDesigns.researchDesigns')}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <InfoIcon class="h-5 w-5" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-sm max-w-xs">
              {$_('literatureDesigns.defineMethodology')}
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
        id="lit-design-tabs"
        class="grid grid-cols-4 border dark:bg-background  dark:border rounded-lg overflow-hidden"
      >
        {#each designTypes as type}
          <Tabs.Trigger
            value={type}
            class="capitalize px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:font-medium dark:data-[state=active]:border-dark-border"
            onclick={() => (currentTab = type)}
          >
            {$_(`designTypes.${type}`)}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
      {#each designTypes as type}
        <Tabs.Content value={type} class="pt-4">
          {#if editMode}
            <div class="space-y-4">
              <div class="space-y-2">
                <label
                  class="text-sm font-medium capitalize"
                  for={`design-select-${type}`}
                >
                  {$_(`designTypes.${type}`)} {$_('literatureDesigns.designs')}
                </label>
                <Select.Root
                  type="multiple"
                  value={localDesigns[type].selections}
                  onValueChange={(value) =>
                    updateSelections(
                      type,
                      Array.isArray(value)
                        ? (value as string[])
                        : value
                          ? [value as string]
                          : []
                    )}
                  items={(projectStore.designs[type] || []).map((option) => ({
                    value: option.name,
                    label: option.name,
                  }))}
                >
                  <Select.Trigger
                    id={`design-select-${type}`}
                    class="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label={$_('literatureDesigns.selectDesignAria', { values: { type: $_(`designTypes.${type}`) } })}
                  >
                    <span class="truncate text-left"
                      >{getTriggerLabel(type)}</span
                    >
                  </Select.Trigger>
                  <Select.Content
                    class="z-50 max-h-64 w-[var(--bits-select-anchor-width)] select-none overflow-y-auto overflow-x-hidden rounded-md border bg-background p-1 shadow-lg"
                    sideOffset={8}
                  >
                    {#if (projectStore.designs[type] || []).length > 0}
                      {#each projectStore.designs[type] || [] as option}
                        <Select.Item value={option.name} label={option.name} />
                      {/each}
                    {:else}
                      <div class="px-3 py-2 text-sm text-muted-foreground">
                        {$_('literatureDesigns.noSavedDesigns', { values: { type: $_(`designTypes.${type}`) } })}
                      </div>
                    {/if}
                  </Select.Content>
                </Select.Root>
                <p class="text-xs text-muted-foreground">
                  {$_('literatureDesigns.selectDesignsHelp', { values: { type: $_(`designTypes.${type}`) } })}
                </p>
              </div>

              <div class="space-y-2">
                {#if addingDesign[type]}
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="text"
                      placeholder={$_('literatureDesigns.newDesignPlaceholder', { values: { type: $_(`designTypes.${type}`) } })}
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
                        {designCreationPending === type ? $_('common.adding') : $_('common.add')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => cancelAddDesign(type)}
                        disabled={designCreationPending === type}
                      >
                        {$_('common.cancel')}
                      </Button>
                    </div>
                  </div>
                {:else}
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => {
                      addingDesign = { ...addingDesign, [type]: true };
                      newDesignNames = { ...newDesignNames, [type]: "" };
                    }}
                  >
                    {$_('literatureDesigns.addNewDesign', { values: { type: $_(`designTypes.${type}`) } })} +
                  </Button>
                {/if}
              </div>

              <div class="border-t pt-6 space-y-3">
                <div>
                  <label
                    class="text-sm font-semibold capitalize text-foreground"
                    for={`design-description-${type}`}
                  >
                    {$_(`designTypes.${type}`)} {$_('literatureDesigns.designDescription')}
                  </label>
                  <p class="text-xs text-muted-foreground mt-1">
                    {$_('literatureDesigns.captureContext')}
                  </p>
                </div>
                <Textarea.Textarea
                  rows={3}
                  placeholder={$_('literatureDesigns.descriptionPlaceholder', { values: { type: $_(`designTypes.${type}`) } })}
                  bind:value={localDesigns[type].description}
                  id={`design-description-${type}`}
                  class="resize-none"
                />
              </div>
            </div>
          {:else}
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium mb-2 capitalize">
                  {$_(`designTypes.${type}`)} {$_('literatureDesigns.designs')}
                </h4>
                {#if localDesigns[type].selections.length > 0}
                  <div class="flex flex-wrap gap-2">
                    {#each localDesigns[type].selections as selection}
                      <Badge variant="outline">{selection}</Badge>
                    {/each}
                  </div>
                {:else}
                  <p class="text-sm text-muted-foreground">
                    {$_('literatureDesigns.noDesignSpecified', { values: { type: $_(`designTypes.${type}`) } })}
                  </p>
                {/if}
              </div>
              {#if localDesigns[type].description.trim().length > 0}
                <div class="border-t pt-4">
                  <h4 class="text-sm font-medium mb-2 capitalize">
                    {$_(`designTypes.${type}`)} {$_('literatureDesigns.designDescription')}
                  </h4>
                  <p class="text-sm text-muted-foreground whitespace-pre-wrap">
                    {localDesigns[type].description}
                  </p>
                </div>
              {/if}
            </div>
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
        {$_('common.cancel')}
      </Button>
      <Button
        size="sm"
        id="lit-design-save-button"
        onclick={saveDesigns}
        disabled={isPending}
        class="w-full"
      >
        {isPending ? $_('common.saving') : $_('common.save')}
      </Button>
    </CardFooter>
  {/if}
</Card>

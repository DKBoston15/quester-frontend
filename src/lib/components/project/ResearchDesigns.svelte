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
  import { InfoIcon, Check } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { localeStore } from "$lib/stores/LocaleStore.svelte";
  import { toast } from "svelte-sonner";
  import { normalizeDesignDetail } from "$lib/utils/design";
  import { _ } from "svelte-i18n";
  import {
    translateDesignName,
    isValidDesignType,
    isSupportedLocale,
    type DesignType as TranslationDesignType
  } from "$lib/utils/designTranslations";

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

  $effect(() => {
    const project = projectStore.currentProject;
    if (project) {
      localDesigns = {
        research: toLocalState(project.researchDesign),
        sampling: toLocalState(project.samplingDesign),
        measurement: toLocalState(project.measurementDesign),
        analytic: toLocalState(project.analyticDesign),
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

  // Get translated design type name
  function getTypeLabel(type: DesignType): string {
    return $_(`designTypes.${type}`);
  }

  // Check if current user is the owner of the project
  function isProjectOwner(): boolean {
    const currentUserId = auth.user?.id;
    const projectOwnerId = projectStore.currentProject?.userId;
    if (!currentUserId || !projectOwnerId) return false;
    return String(currentUserId) === String(projectOwnerId);
  }

  // Translate design name for display (only for non-owners)
  function getTranslatedDesignName(designType: DesignType, name: string): string {
    if (isProjectOwner()) {
      return name;
    }
    const currentLocale = localeStore.locale;
    if (isValidDesignType(designType) && isSupportedLocale(currentLocale)) {
      return translateDesignName(designType as TranslationDesignType, name, currentLocale);
    }
    return name;
  }

  function getTriggerLabel(type: DesignType): string {
    const selections = localDesigns[type].selections;
    if (selections.length === 0) {
      return $_('researchDesigns.selectDesigns', { values: { type: getTypeLabel(type) } });
    }
    return selections.map(s => getTranslatedDesignName(type, s)).join(", ");
  }

  function getFieldId(type: DesignType, suffix: string): string {
    return `${type}-${suffix}`.replace(/[^a-z0-9-_]/gi, "-");
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

  async function persistDesignSelections({ exitEditMode = false } = {}) {
    if (!projectStore.currentProject?.id) {
      throw new Error("Select a project before saving designs");
    }

    isPending = true;
    try {
      await projectStore.updateProject(projectStore.currentProject.id, {
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
      await projectStore.updateDesigns(projectId, payload);
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
      await persistDesignSelections({ exitEditMode: true });
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
    if (!projectStore.currentProject?.id) return;
    try {
      await persistDesignSelections({ exitEditMode: true });
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
        {$_('researchDesigns.title')}
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
        class="grid grid-cols-4 border dark:bg-background  dark:border rounded-lg overflow-hidden"
      >
        {#each designTypes as type}
          <Tabs.Trigger
            value={type}
            class="capitalize px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 rounded-none data-[state=active]:font-medium"
            onclick={() => (currentTab = type)}
          >
            {$_(`designTypes.${type}`)}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
      {#each designTypes as type}
        <Tabs.Content value={type} class="pt-4">
          {#if editMode}
            {@const designsControlId = getFieldId(type, "designs-select")}
            {@const designsLabelId = getFieldId(type, "designs-label")}
            {@const designsDescriptionId = getFieldId(type, "designs-help")}
            {@const descriptionControlId = getFieldId(
              type,
              "design-description"
            )}
            {@const descriptionLabelId = getFieldId(
              type,
              "design-description-label"
            )}
            {@const descriptionHelpId = getFieldId(
              type,
              "design-description-help"
            )}
            <div class="space-y-6">
              <div class="space-y-3">
                <div>
                  <label
                    id={designsLabelId}
                    for={designsControlId}
                    class="text-sm font-semibold capitalize text-foreground"
                  >
                    {$_('researchDesigns.designsLabel', { values: { type: getTypeLabel(type) } })}
                  </label>
                  <p
                    id={designsDescriptionId}
                    class="text-xs text-muted-foreground mt-1"
                  >
                    {$_('researchDesigns.selectDesignsHelp', { values: { type: getTypeLabel(type).toLowerCase() } })}
                  </p>
                </div>
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
                    label: getTranslatedDesignName(type, option.name),
                  }))}
                >
                  <Select.Trigger
                    id={designsControlId}
                    class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-labelledby={designsLabelId}
                    aria-describedby={designsDescriptionId}
                  >
                    <span class="truncate text-left flex-1"
                      >{getTriggerLabel(type)}</span
                    >
                  </Select.Trigger>
                  <Select.Content
                    class="z-50 max-h-64 w-[var(--bits-select-anchor-width)] select-none overflow-y-auto overflow-x-hidden rounded-md border bg-background p-1 shadow-lg"
                    sideOffset={8}
                  >
                    {#if (projectStore.designs[type] || []).length > 0}
                      {#each projectStore.designs[type] || [] as option}
                        <Select.Item value={option.name} label={getTranslatedDesignName(type, option.name)} />
                      {/each}
                    {:else}
                      <div class="px-3 py-2 text-sm text-muted-foreground">
                        {$_('researchDesigns.noSavedDesigns', { values: { type: getTypeLabel(type).toLowerCase() } })}
                      </div>
                    {/if}
                  </Select.Content>
                </Select.Root>
              </div>

              <div class="border-t pt-6">
                {#if addingDesign[type]}
                  <div class="flex flex-col gap-3 sm:flex-row">
                    <Input
                      type="text"
                      placeholder={$_('researchDesigns.enterNewDesign', { values: { type: getTypeLabel(type).toLowerCase() } })}
                      bind:value={newDesignNames[type]}
                      class="flex-1"
                      onkeydown={(event) =>
                        event.key === "Enter" &&
                        designCreationPending !== type &&
                        addDesignOption(type)}
                      disabled={designCreationPending === type}
                    />
                    <div class="flex gap-2 sm:shrink-0">
                      <Button
                        size="default"
                        onclick={() => addDesignOption(type)}
                        disabled={designCreationPending === type}
                        class="px-6"
                      >
                        {designCreationPending === type ? $_('researchDesigns.adding') : $_('common.add')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
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
                    size="default"
                    onclick={() => {
                      addingDesign = { ...addingDesign, [type]: true };
                      newDesignNames = { ...newDesignNames, [type]: "" };
                    }}
                    class="w-full sm:w-auto"
                  >
                    {$_('researchDesigns.addNewDesign', { values: { type: getTypeLabel(type).toLowerCase() } })}
                  </Button>
                {/if}
              </div>

              <div class="border-t pt-6 space-y-3">
                <div>
                  <label
                    id={descriptionLabelId}
                    for={descriptionControlId}
                    class="text-sm font-semibold capitalize text-foreground"
                  >
                    {$_('researchDesigns.designDescription', { values: { type: getTypeLabel(type) } })}
                  </label>
                  <p
                    id={descriptionHelpId}
                    class="text-xs text-muted-foreground mt-1"
                  >
                    {$_('researchDesigns.descriptionHelp')}
                  </p>
                </div>
                <Textarea.Textarea
                  id={descriptionControlId}
                  rows={4}
                  placeholder={$_('researchDesigns.describeApproach', { values: { type: getTypeLabel(type).toLowerCase() } })}
                  bind:value={localDesigns[type].description}
                  class="resize-none"
                  aria-describedby={descriptionHelpId}
                />
              </div>
            </div>
          {:else}
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium mb-2 capitalize">
                  {$_('researchDesigns.designsLabel', { values: { type: getTypeLabel(type) } })}
                </h4>
                {#if localDesigns[type].selections.length > 0}
                  <div class="flex flex-wrap gap-2">
                    {#each localDesigns[type].selections as selection}
                      <Badge variant="outline">{getTranslatedDesignName(type, selection)}</Badge>
                    {/each}
                  </div>
                {:else}
                  <p class="text-sm text-muted-foreground">
                    {$_('researchDesigns.noDesignSpecified', { values: { type: getTypeLabel(type).toLowerCase() } })}
                  </p>
                {/if}
              </div>
              {#if localDesigns[type].description.trim().length > 0}
                <div class="border-t pt-4">
                  <h4 class="text-sm font-medium mb-2 capitalize">
                    {$_('researchDesigns.designDescription', { values: { type: getTypeLabel(type) } })}
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
    <CardFooter class="flex justify-end gap-3 border-t">
      <Button
        variant="outline"
        onclick={() => (editMode = false)}
        disabled={isPending}
      >
        {$_('common.cancel')}
      </Button>
      <Button onclick={saveDesigns} disabled={isPending}>
        {isPending ? $_('common.saving') : $_('common.save')}
      </Button>
    </CardFooter>
  {/if}
</Card>

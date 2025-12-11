<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
    CardDescription,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon, Plus, X, Edit, Check, Save } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { localeStore } from "$lib/stores/LocaleStore.svelte";
  import { toast } from "svelte-sonner";
  import type { Project } from "$lib/types/auth";
  import type { Literature } from "$lib/types/literature";
  import { normalizeDesignDetail } from "$lib/utils/design";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";
  import {
    translateDesignName,
    isValidDesignType,
    isSupportedLocale,
    type DesignType as TranslationDesignType
  } from "$lib/utils/designTranslations";

  // Helper for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  // Check if current user is the owner of the project
  function isProjectOwner(): boolean {
    const currentUserId = auth.user?.id;
    const projectOwnerId = projectStore.currentProject?.userId;
    if (!currentUserId || !projectOwnerId) return false;
    return String(currentUserId) === String(projectOwnerId);
  }

  // Get translated design name for display
  // For owners: show design as-is (designs are already in their language)
  // For non-owners: translate standard designs to user's current locale
  function getTranslatedDesignName(designType: DesignType, name: string): string {
    // If user is the owner, no translation needed (designs are in owner's language)
    if (isProjectOwner()) {
      return name;
    }

    // For non-owners, translate standard designs to their locale
    const currentLocale = localeStore.locale;
    if (isValidDesignType(designType) && isSupportedLocale(currentLocale)) {
      return translateDesignName(designType as TranslationDesignType, name, currentLocale);
    }

    return name;
  }

  // Design types that match our existing components
  const designTypes = [
    "research",
    "sampling",
    "measurement",
    "analytic",
  ] as const;

  type DesignType = (typeof designTypes)[number];
  type DesignOption = { name: string };

  const projectFieldByType: Record<DesignType, keyof Project> = {
    research: "researchDesign",
    sampling: "samplingDesign",
    measurement: "measurementDesign",
    analytic: "analyticDesign",
  };

  const literatureFieldByType: Record<DesignType, keyof Literature> = {
    research: "researchDesign",
    sampling: "samplingDesign",
    measurement: "measurementDesign",
    analytic: "analyticDesign",
  };

  let currentTab = $state<DesignType>("research");
  let isPending = $state(false);
  let pendingOperation = $state<"add" | "edit" | "delete" | "save" | null>(
    null
  );
  let pendingIndex = $state<number | null>(null);
  let localDesigns = $state<Record<DesignType, DesignOption[]>>({
    research: [],
    sampling: [],
    measurement: [],
    analytic: [],
  });

  // Track editing state
  let newDesignName = $state("");
  let editingDesign = $state<{
    index: number;
    originalName: string;
    newName: string;
    type: DesignType;
  } | null>(null);
  let initialized = $state(false);
  let renameContext = $state<{
    type: DesignType;
    oldName: string;
    newName: string;
  } | null>(null);

  // Function to sort design options alphabetically
  function sortDesigns(designs: DesignOption[]): DesignOption[] {
    return [...designs].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Track the last synced state to detect changes
  let lastSyncedLocale = $state<string | null>(null);
  let lastSyncedDesignsHash = $state<string | null>(null);

  // Helper to create a simple hash of designs for change detection
  function getDesignsHash(designs: Record<string, { name: string }[]>): string {
    return JSON.stringify(designs);
  }

  // Initialize local designs from the store, and re-sync when locale or designs change
  $effect(() => {
    const currentLocale = localeStore.locale;
    const currentDesignsHash = projectStore.designs ? getDesignsHash(projectStore.designs) : null;

    const localeChanged = lastSyncedLocale !== currentLocale;
    const designsChanged = lastSyncedDesignsHash !== currentDesignsHash;
    const shouldSync = projectStore.designs && (!initialized || localeChanged || designsChanged);

    if (shouldSync) {
      Object.keys(projectStore.designs).forEach((type) => {
        if (type in localDesigns) {
          // Sort designs alphabetically when loading
          localDesigns[type as DesignType] = sortDesigns([
            ...projectStore.designs[type],
          ]);
        }
      });
      initialized = true;
      lastSyncedLocale = currentLocale;
      lastSyncedDesignsHash = currentDesignsHash;
    }
  });

  // Check if a project is selected
  $effect(() => {
    if (!projectStore.currentProject) {
      toast.error(t("designManager.selectProjectMessage"));
    }
  });

  // Helper function to check if a specific operation is pending
  function isOperationPending(
    operation: "add" | "edit" | "delete" | "save",
    index?: number
  ): boolean {
    if (!isPending) return false;
    if (pendingOperation !== operation) return false;
    if (operation === "edit" || operation === "delete") {
      return pendingIndex === index;
    }
    return true;
  }

  // Function to add a new design option
  async function addDesign() {
    if (!newDesignName.trim()) {
      toast.error(t("designManager.designNameEmpty"));
      return;
    }

    // Check for duplicates
    if (
      localDesigns[currentTab].some(
        (design) => design.name.toLowerCase() === newDesignName.toLowerCase()
      )
    ) {
      toast.error(t("designManager.designExists"));
      return;
    }

    // Add new design and sort alphabetically
    const updatedDesigns = sortDesigns([
      ...localDesigns[currentTab],
      { name: newDesignName },
    ]);

    localDesigns[currentTab] = updatedDesigns;
    newDesignName = "";

    // Save changes immediately
    pendingOperation = "add";
    await saveToDatabase();
  }

  // Function to start editing a design option
  function startEditing(index: number) {
    const design = localDesigns[currentTab][index];
    editingDesign = {
      index,
      originalName: design.name,
      newName: design.name,
      type: currentTab,
    };
  }

  function commitEditingDesign(): number | null {
    if (!editingDesign) return null;

    const { type, index, originalName } = editingDesign;
    const trimmedName = editingDesign.newName.trim();

    if (!trimmedName) {
      toast.error(t("designManager.designNameEmpty"));
      return null;
    }

    // Check for duplicates, excluding the current one being edited
    const hasDuplicate = localDesigns[type].some((design, idx) => {
      if (idx === index) return false;
      return design.name.toLowerCase() === trimmedName.toLowerCase();
    });

    if (hasDuplicate) {
      toast.error(t("designManager.designExists"));
      return null;
    }

    const updatedDesigns = [...localDesigns[type]];
    updatedDesigns[index] = { name: trimmedName };
    localDesigns[type] = sortDesigns(updatedDesigns);

    if (originalName !== trimmedName) {
      renameContext = {
        type,
        oldName: originalName,
        newName: trimmedName,
      };
    }

    editingDesign = null;
    return index;
  }

  // Function to save an edited design option
  async function saveEdit() {
    const index = commitEditingDesign();
    if (index === null) return;

    // Save changes immediately
    pendingOperation = "edit";
    pendingIndex = index;
    await saveToDatabase();
  }

  // Function to cancel editing
  function cancelEdit() {
    editingDesign = null;
  }

  // Function to remove a design option
  async function removeDesign(index: number) {
    localDesigns[currentTab] = localDesigns[currentTab].filter(
      (_, i) => i !== index
    );

    // Save changes immediately
    pendingOperation = "delete";
    pendingIndex = index;
    await saveToDatabase();
  }

  // Helper function to save changes to the database
  async function saveToDatabase() {
    isPending = true;
    try {
      // Get designs ID from existing designs in store or use current project ID
      // We need to use an actual UUID for project_id

      // Use the currently selected project from the store
      const projectId = projectStore.currentProject?.id;

      if (!projectId) {
        throw new Error(
          "No project selected. Please select a project first to manage designs."
        );
      }

      // Ensure all design categories are sorted before saving
      const sortedDesigns = {
        research: sortDesigns([...localDesigns.research]),
        sampling: sortDesigns([...localDesigns.sampling]),
        measurement: sortDesigns([...localDesigns.measurement]),
        analytic: sortDesigns([...localDesigns.analytic]),
      };

      // Use the ProjectStore's built-in method for updating designs
      await projectStore.updateDesigns(projectId, sortedDesigns);

      // Update local designs with sorted versions
      localDesigns = sortedDesigns;

      if (renameContext) {
        try {
          await syncRenamedDesign(renameContext);
        } catch (syncError) {
          console.error("Failed to sync renamed design across records:", syncError);
          toast.error(
            syncError instanceof Error
              ? syncError.message
              : t("designManager.syncFailed")
          );
        } finally {
          renameContext = null;
        }
      }

      toast.success(t("designManager.updatedSuccess"));
    } catch (error) {
      console.error("Failed to update designs:", error);
      toast.error(
        error instanceof Error ? error.message : t("designManager.failedToUpdateDesigns")
      );
    } finally {
      isPending = false;
      pendingOperation = null;
      pendingIndex = null;
    }
  }

  // Function to save all changes to the backend
  async function saveDesigns() {
    if (editingDesign) {
      const appliedIndex = commitEditingDesign();
      if (appliedIndex === null) {
        return;
      }
    }

    pendingOperation = "save";
    await saveToDatabase();
  }

  async function syncRenamedDesign(details: {
    type: DesignType;
    oldName: string;
    newName: string;
  }) {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;

    const projectField = projectFieldByType[details.type];
    const literatureField = literatureFieldByType[details.type];

    const updates: Promise<unknown>[] = [];

    const currentProjectDetail = projectStore.currentProject?.[projectField];
    const normalizedProjectDetail = normalizeDesignDetail(currentProjectDetail);

    if (
      normalizedProjectDetail.selections.some(
        (selection) => selection.toLowerCase() === details.oldName.toLowerCase()
      )
    ) {
      const updatedSelections = normalizedProjectDetail.selections.map((selection) =>
        selection.toLowerCase() === details.oldName.toLowerCase()
          ? details.newName
          : selection
      );

      updates.push(
        projectStore.updateProject(projectId, {
          [projectField]: {
            selections: updatedSelections,
            description: normalizedProjectDetail.description ?? null,
          },
        } as Partial<Project>)
      );
    }

    for (const literatureItem of literatureStore.data) {
      const detail = normalizeDesignDetail(literatureItem[literatureField]);
      if (
        detail.selections.some(
          (selection) => selection.toLowerCase() === details.oldName.toLowerCase()
        )
      ) {
        const updatedSelections = detail.selections.map((selection) =>
          selection.toLowerCase() === details.oldName.toLowerCase()
            ? details.newName
            : selection
        );

        updates.push(
          literatureStore.updateLiterature(literatureItem.id, {
            [literatureField]: {
              selections: updatedSelections,
              description: detail.description ?? null,
            },
          } as Partial<Literature>)
        );
      }
    }

    if (updates.length === 0) return;

    const results = await Promise.allSettled(updates);
    const failed = results.filter((result) => result.status === "rejected");

    if (failed.length > 0) {
      throw new Error(
        "Design renamed, but some associated records could not be updated"
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
        {$_("designManager.title")}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <InfoIcon class="h-5 w-5" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-sm max-w-xs">
              {$_("designManager.tooltip")}
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </CardTitle>
    </div>
    <CardDescription>
      {$_("designManager.description")}
      {#if projectStore.currentProject}
        <span class="font-medium"
          >{$_("designManager.currentProject", { values: { name: projectStore.currentProject.name } })}</span
        >
      {:else}
        <span class="text-red-500"
          >{$_("designManager.selectProjectMessage")}</span
        >
      {/if}
    </CardDescription>
  </CardHeader>

  <CardContent>
    <Tabs.Root bind:value={currentTab}>
      <Tabs.List
        class="grid grid-cols-4 border dark:bg-background  dark:border-dark-border rounded-lg overflow-hidden"
      >
        {#each designTypes as type}
          <Tabs.Trigger
            value={type}
            class="capitalize px-4 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]: dark:data-[state=active]:border-dark-border data-[state=active]:font-medium"
          >
            {$_(`designTypes.${type}`)}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>

      {#each designTypes as type}
        <Tabs.Content value={type} class="pt-4">
          <div class="space-y-4">
            <!-- Add new design form -->
            <div class="flex items-center gap-2">
              <Input
                type="text"
                placeholder={$_("designManager.addNewOption")}
                bind:value={newDesignName}
                class="flex-grow"
                onkeydown={(e) =>
                  e.key === "Enter" &&
                  !isPending &&
                  projectStore.currentProject &&
                  addDesign()}
                disabled={isPending || !projectStore.currentProject}
              />
              <Button
                size="sm"
                onclick={addDesign}
                disabled={!newDesignName.trim() ||
                  isPending ||
                  !projectStore.currentProject}
              >
                {#if isOperationPending("add")}
                  <span class="animate-spin mr-1">⏳</span>
                {:else}
                  <Plus class="h-4 w-4 mr-1" />
                {/if}
                {$_("common.add")}
              </Button>
            </div>

            <!-- List of designs -->
            <div
              class="border dark:border-dark-border rounded-lg overflow-hidden"
            >
              {#if localDesigns[type].length === 0}
                <div class="p-4 text-center text-muted-foreground">
                  {$_("designManager.noDesignsYet", { values: { type: $_(`designTypes.${type}`).toLowerCase() } })}
                </div>
              {:else}
                <div class="divide-y divide-black dark:divide-dark-border">
                  {#each localDesigns[type] as design, index}
                    <div class="p-3 flex justify-between items-center">
                      {#if editingDesign && editingDesign.type === type && editingDesign.index === index}
                        <div class="flex items-center gap-2 flex-grow">
                          <Input
                            type="text"
                            bind:value={editingDesign.newName}
                            class="flex-grow"
                            onkeydown={(e) =>
                              e.key === "Enter" &&
                              !isPending &&
                              projectStore.currentProject &&
                              saveEdit()}
                            disabled={isPending || !projectStore.currentProject}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onclick={saveEdit}
                            disabled={isPending || !projectStore.currentProject}
                          >
                            {#if isOperationPending("edit", index)}
                              <span class="animate-spin">⏳</span>
                            {:else}
                              <Check class="h-4 w-4" />
                            {/if}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onclick={cancelEdit}
                            disabled={isPending || !projectStore.currentProject}
                          >
                            <X class="h-4 w-4" />
                          </Button>
                        </div>
                      {:else}
                        <span>{getTranslatedDesignName(type, design.name)}</span>
                        <div class="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onclick={() => startEditing(index)}
                            disabled={isPending || !projectStore.currentProject}
                          >
                            <Edit class="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            class="text-red-500 hover:text-red-700"
                            onclick={() => removeDesign(index)}
                            disabled={isPending || !projectStore.currentProject}
                          >
                            {#if isOperationPending("delete", index)}
                              <span class="animate-spin">⏳</span>
                            {:else}
                              <X class="h-4 w-4" />
                            {/if}
                          </Button>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  </CardContent>

  <CardFooter class="flex items-center justify-between">
    <p class="text-sm text-muted-foreground">
      {#if projectStore.currentProject}
        {$_("designManager.autoSaveMessage")}
      {:else}
        {$_("designManager.selectProjectMessage")}
      {/if}
    </p>
    <Button
      onclick={saveDesigns}
      disabled={isPending || !projectStore.currentProject}
      class="ml-auto"
    >
      {#if isOperationPending("save")}
        <span class="animate-spin mr-2">⏳</span> {$_("common.saving")}
      {:else}
        <Save class="h-4 w-4 mr-1" /> {$_("designManager.saveNow")}
      {/if}
    </Button>
  </CardFooter>
</Card>

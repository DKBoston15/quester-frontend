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
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { toast } from "svelte-sonner";

  // Design types that match our existing components
  const designTypes = [
    "research",
    "sampling",
    "measurement",
    "analytic",
  ] as const;

  type DesignType = (typeof designTypes)[number];
  type DesignOption = { name: string };

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
  } | null>(null);
  let initialized = $state(false);

  // Function to sort design options alphabetically
  function sortDesigns(designs: DesignOption[]): DesignOption[] {
    return [...designs].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Initialize local designs from the store - only run once
  $effect(() => {
    if (projectStore.designs && !initialized) {
      Object.keys(projectStore.designs).forEach((type) => {
        if (type in localDesigns) {
          // Sort designs alphabetically when loading
          localDesigns[type as DesignType] = sortDesigns([
            ...projectStore.designs[type],
          ]);
        }
      });
      initialized = true;
    }
  });

  // Check if a project is selected
  $effect(() => {
    if (!projectStore.currentProject) {
      toast.error("Please select a project to manage its designs");
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
      toast.error("Design name cannot be empty");
      return;
    }

    // Check for duplicates
    if (
      localDesigns[currentTab].some(
        (design) => design.name.toLowerCase() === newDesignName.toLowerCase()
      )
    ) {
      toast.error("Design with this name already exists");
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
    };
  }

  // Function to save an edited design option
  async function saveEdit() {
    if (!editingDesign) return;

    if (!editingDesign.newName.trim()) {
      toast.error("Design name cannot be empty");
      return;
    }

    // Check for duplicates, excluding the current one being edited
    if (
      localDesigns[currentTab].some(
        (design, idx) =>
          idx !== editingDesign!.index &&
          design.name.toLowerCase() === editingDesign!.newName.toLowerCase()
      )
    ) {
      toast.error("Design with this name already exists");
      return;
    }

    // Update the design and sort alphabetically
    const updatedDesigns = [...localDesigns[currentTab]];
    updatedDesigns[editingDesign.index] = { name: editingDesign.newName };
    localDesigns[currentTab] = sortDesigns(updatedDesigns);

    const index = editingDesign.index;
    editingDesign = null;

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
      const result = await projectStore.updateDesigns(projectId, sortedDesigns);

      // Update local designs with sorted versions
      localDesigns = sortedDesigns;

      toast.success("Designs updated successfully");
    } catch (error) {
      console.error("Failed to update designs:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update designs"
      );
    } finally {
      isPending = false;
      pendingOperation = null;
      pendingIndex = null;
    }
  }

  // Function to save all changes to the backend
  async function saveDesigns() {
    pendingOperation = "save";
    await saveToDatabase();
  }
</script>

<Card
  class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <CardHeader>
    <div class="flex justify-between items-center">
      <CardTitle class="flex items-center gap-2">
        Manage Project Designs
        <Tooltip.Root>
          <Tooltip.Trigger>
            <InfoIcon class="h-5 w-5" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-sm max-w-xs">
              The design options below will be available for describing both the
              current project and the literature associated with this project.
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </CardTitle>
    </div>
    <CardDescription>
      These design options will be available for selection in this project and
      its literature items.
      {#if projectStore.currentProject}
        <span class="font-medium"
          >Current project: {projectStore.currentProject.name}</span
        >
      {:else}
        <span class="text-red-500"
          >No project selected. Please select a project first.</span
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
            {type}
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
                placeholder="Add new design option"
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
                Add
              </Button>
            </div>

            <!-- List of designs -->
            <div
              class="border dark:border-dark-border rounded-lg overflow-hidden"
            >
              {#if localDesigns[type].length === 0}
                <div class="p-4 text-center text-muted-foreground">
                  No {type} designs added yet. Add your first one above.
                </div>
              {:else}
                <div class="divide-y divide-black dark:divide-dark-border">
                  {#each localDesigns[type] as design, index}
                    <div class="p-3 flex justify-between items-center">
                      {#if editingDesign && editingDesign.index === index && currentTab === type}
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
                        <span>{design.name}</span>
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
        Changes are saved automatically as you make them.
      {:else}
        Please select a project to manage its designs.
      {/if}
    </p>
    <Button
      onclick={saveDesigns}
      disabled={isPending || !projectStore.currentProject}
      class="ml-auto"
    >
      {#if isOperationPending("save")}
        <span class="animate-spin mr-2">⏳</span> Saving...
      {:else}
        <Save class="h-4 w-4 mr-1" /> Save Now
      {/if}
    </Button>
  </CardFooter>
</Card>

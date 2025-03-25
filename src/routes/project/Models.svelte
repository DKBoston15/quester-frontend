<!-- src/routes/project/Models.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { modelStore } from "$lib/stores/ModelStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Root, Content, Title, Description } from "$lib/components/ui/dialog";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Plus, Trash2, Pencil, Search, Info } from "lucide-svelte";
  import { navigate } from "svelte-routing";
  import type { Node, Edge } from "@xyflow/svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { auth } from "$lib/stores/AuthStore.svelte";

  interface Model {
    id: string;
    name: string;
    projectId: string;
    nodes: Node[];
    edges: Edge[];
    createdAt: string;
    updatedAt: string;
  }

  let searchQuery = $state("");
  let showCreateDialog = $state(false);
  let showDeleteDialog = $state(false);
  let showRenameDialog = $state(false);
  let newModelName = $state("New Model");
  let modelToDelete = $state<Model | null>(null);
  let modelToRename = $state<Model | null>(null);
  let renameValue = $state("");
  let isLoadingCapability = $state(true);
  let hasAccess = $state(false);

  // Check if user has access to model features
  async function checkModelAccessCapability() {
    try {
      const response = await fetch(
        "http://localhost:3333/capabilities/model_access",
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to check model access capability");
      }

      const data = await response.json();
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to dashboard
      if (!hasAccess) {
        console.warn("User attempted to access Models page without permission");
        if (projectStore.currentProject?.id) {
          navigate(`/project/${projectStore.currentProject.id}/dashboard`);
        } else {
          navigate("/dashboard");
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check model access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/dashboard");
      return false;
    } finally {
      isLoadingCapability = false;
    }
  }

  // Load models data when project changes
  $effect(() => {
    const project = projectStore.currentProject;
    if (!project?.id) {
      console.warn("No project available");
      return;
    }

    // First check capability, then load models
    checkModelAccessCapability().then((hasModelAccess) => {
      if (hasModelAccess) {
        modelStore.loadModels(project.id).catch((err) => {
          console.error("Failed to load models:", err);
        });
      }
    });
  });

  // Clear models data when component is destroyed
  onDestroy(() => {
    modelStore.clearAll();
  });

  async function handleCreateModel() {
    if (!projectStore.currentProject?.id) {
      console.error("No current project ID available");
      return;
    }

    try {
      const newModel = await modelStore.createModel({
        name: newModelName,
        projectId: projectStore.currentProject.id,
        nodes: [],
        edges: [],
      });

      if (!newModel) {
        console.error("Failed to create model: No model returned");
        return;
      }

      if (!newModel.id) {
        console.error("Created model has no ID:", newModel);
        return;
      }

      showCreateDialog = false;
      newModelName = "New Model";
      const path = `/project/${projectStore.currentProject.id}/models/${newModel.id}`;
      navigate(path);
    } catch (err) {
      console.error("Failed to create model:", err);
    }
  }

  // Helper function to stop propagation
  function stopPropagation(handler: (e: MouseEvent) => void) {
    return (e: MouseEvent) => {
      e.stopPropagation();
      handler(e);
    };
  }

  function handleCardClick(model: Model) {
    const projectId = projectStore.currentProject?.id;
    if (projectId && model.id) {
      navigate(`/project/${projectId}/models/${model.id}`);
    }
  }

  function handleDeleteClick(model: Model) {
    modelToDelete = model;
    showDeleteDialog = true;
  }

  async function handleDeleteModel() {
    if (!modelToDelete?.id) return;

    try {
      await modelStore.deleteModel(modelToDelete.id);
      showDeleteDialog = false;
      modelToDelete = null;
    } catch (err) {
      console.error("Failed to delete model:", err);
    }
  }

  function handleRenameClick(model: Model) {
    modelToRename = model;
    renameValue = model.name;
    showRenameDialog = true;
  }

  async function handleRenameModel() {
    if (!modelToRename?.id) return;

    try {
      const updatedModel = await modelStore.updateModel(modelToRename.id, {
        name: renameValue,
      });

      if (!updatedModel) {
        throw new Error("Failed to update model: No response received");
      }

      // Instead of manually updating the model in the array,
      // refresh the entire model list to ensure consistency
      const projectId = projectStore.currentProject?.id;
      if (projectId) {
        await modelStore.loadModels(projectId);
      }

      showRenameDialog = false;
      modelToRename = null;
      renameValue = "";
    } catch (err) {
      console.error("Failed to rename model:", err);
      // You might want to show this error to the user in the UI
    }
  }

  $effect(() => {
    if (!showCreateDialog) {
      newModelName = "New Model";
    }
  });

  $effect(() => {
    if (!showDeleteDialog) {
      modelToDelete = null;
    }
  });

  $effect(() => {
    if (!showRenameDialog) {
      modelToRename = null;
      renameValue = "";
    }
  });
</script>

{#if isLoadingCapability}
  <div class="flex-1 w-full flex items-center justify-center">
    <div
      class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
    ></div>
  </div>
{:else if hasAccess}
  <div class="flex-1 w-full">
    <div class="container mx-auto py-6 px-4">
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h1 class="text-3xl font-bold">Models</h1>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Info class="h-5 w-5 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p class="text-sm max-w-xs">
                  Create and manage research models to visualize your concepts
                  and relationships.
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <Button
            onclick={() => (showCreateDialog = true)}
            class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
          >
            <Plus class="h-4 w-4 mr-2" />
            Create Model
          </Button>
        </div>
        <p class="text-muted-foreground mt-2">
          Create and manage your research models
        </p>
      </div>

      <Card.Root
        class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] relative overflow-hidden"
      >
        <!-- Decorative corners like in ProjectSidebar -->
        <div
          class="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-dark-accent-blue border border-black dark:border-dark-border"
        ></div>
        <div
          class="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 dark:bg-dark-accent-yellow border border-black dark:border-dark-border"
        ></div>

        <Card.Header class="pb-0">
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search models..."
              bind:value={searchQuery}
              class="pl-9 flex h-10 w-full rounded-md border-2 border-black dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </Card.Header>

        <Card.Content class="space-y-6 pt-6">
          {#if modelStore.isLoading}
            <div class="flex justify-center items-center h-[400px]">
              <p class="text-lg text-muted-foreground">Loading models...</p>
            </div>
          {:else if modelStore.error}
            <div class="flex justify-center items-center h-[400px]">
              <p class="text-lg text-destructive">{modelStore.error}</p>
            </div>
          {:else if !modelStore.models.length}
            <div
              class="flex flex-col justify-center items-center h-[400px] gap-4"
            >
              <p class="text-lg text-muted-foreground">No models created yet</p>
              <Button
                variant="outline"
                onclick={() => (showCreateDialog = true)}
                class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
              >
                <Plus class="h-4 w-4 mr-2" />
                Create your first model
              </Button>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {#each modelStore.models
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .filter((model) => model?.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())) as model (model.id)}
                <button
                  type="button"
                  class="group text-left transition-all duration-200 bg-transparent border-none p-0 m-0 w-full cursor-pointer"
                  onclick={() => handleCardClick(model)}
                  onkeydown={(e) => e.key === "Enter" && handleCardClick(model)}
                  transition:fly|local={{
                    y: 20,
                    duration: 300,
                    easing: cubicOut,
                  }}
                >
                  <Card.Root
                    class="h-full pb-4 border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all relative overflow-hidden"
                  >
                    <Card.Header class="pb-2">
                      <div class="flex justify-between items-start">
                        <Card.Title class="text-lg font-bold"
                          >{model.name}</Card.Title
                        >
                        <div
                          class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            class="h-8 w-8 border-2 border-black dark:border-dark-border bg-background shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] dark:hover:shadow-[3px_3px_0px_0px_rgba(44,46,51,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] transition-all"
                            onclick={stopPropagation(() =>
                              handleRenameClick(model)
                            )}
                          >
                            <Pencil
                              class="h-4 w-4 text-blue-600 dark:text-blue-400"
                            />
                            <span class="sr-only">Rename model</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            class="h-8 w-8 border-2 border-black dark:border-dark-border bg-background shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[3px_3px_0px_0px_rgba(220,38,38,0.15)] dark:hover:shadow-[3px_3px_0px_0px_rgba(220,38,38,0.15)] hover:border-destructive dark:hover:border-destructive hover:translate-y-[-1px] hover:translate-x-[-1px] transition-all"
                            onclick={stopPropagation(() =>
                              handleDeleteClick(model)
                            )}
                          >
                            <Trash2 class="h-4 w-4 text-destructive" />
                            <span class="sr-only">Delete model</span>
                          </Button>
                        </div>
                      </div>
                      <Card.Description class="text-xs">
                        <div class="flex flex-col gap-1 mt-1">
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">Created:</span>
                            <span
                              >{new Date(
                                model.createdAt
                              ).toLocaleDateString()}</span
                            >
                          </div>
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">Updated:</span>
                            <span
                              >{new Date(
                                model.updatedAt
                              ).toLocaleDateString()}</span
                            >
                          </div>
                        </div>
                      </Card.Description>
                    </Card.Header>

                    <div
                      class="absolute -top-1 -right-1 w-2 h-2 bg-green-400 dark:bg-dark-accent-green border border-black dark:border-dark-border"
                    ></div>
                    <div
                      class="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 dark:bg-dark-accent-pink border border-black dark:border-dark-border"
                    ></div>
                  </Card.Root>
                </button>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  </div>

  <!-- Create Model Dialog -->
  <Root bind:open={showCreateDialog}>
    <Content
      class="sm:max-w-[425px] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <Title>Create New Model</Title>
        <Description>
          Give your model a name. You can change it later.
        </Description>
      </div>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="name" class="text-right"> Name </label>
          <input
            id="name"
            bind:value={newModelName}
            class="col-span-3 flex h-10 w-full rounded-md border-2 border-black dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
      <div
        class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"
      >
        <Button
          variant="outline"
          onclick={() => (showCreateDialog = false)}
          class="border-2 border-black dark:border-dark-border"
        >
          Cancel
        </Button>
        <Button
          onclick={handleCreateModel}
          class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
        >
          Create Model
        </Button>
      </div>
    </Content>
  </Root>

  <!-- Delete Model Dialog -->
  <AlertDialog.Root bind:open={showDeleteDialog}>
    <AlertDialog.Content
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <AlertDialog.Header>
        <AlertDialog.Title>Delete Model</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete "{modelToDelete?.name}"? This action
          cannot be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <div class="flex justify-end gap-2">
          <Button
            variant="outline"
            onclick={() => (showDeleteDialog = false)}
            class="border-2 border-black dark:border-dark-border"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onclick={handleDeleteModel}
            class="border-2 border-destructive dark:border-destructive"
          >
            Delete
          </Button>
        </div>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <!-- Rename Model Dialog -->
  <Root bind:open={showRenameDialog}>
    <Content
      class="sm:max-w-[425px] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <Title>Rename Model</Title>
        <Description>
          Enter a new name for "{modelToRename?.name}"
        </Description>
      </div>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="rename" class="text-right"> Name </label>
          <input
            id="rename"
            bind:value={renameValue}
            class="col-span-3 flex h-10 w-full rounded-md border-2 border-black dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
      <div
        class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"
      >
        <Button
          variant="outline"
          onclick={() => (showRenameDialog = false)}
          class="border-2 border-black dark:border-dark-border"
        >
          Cancel
        </Button>
        <Button
          onclick={handleRenameModel}
          class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
        >
          Rename
        </Button>
      </div>
    </Content>
  </Root>
{/if}

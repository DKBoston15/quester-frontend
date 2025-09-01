<script lang="ts">
  import { onDestroy } from "svelte";
  import { outcomeStore } from "$lib/stores/OutcomeStore";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Root, Content, Title, Description } from "$lib/components/ui/dialog";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import {
    Plus,
    Trash2,
    Pencil,
    Search,
    Info,
    Link as LinkIcon,
    GraduationCap,
  } from "lucide-svelte";
  import { navigate } from "svelte-routing";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import * as Select from "$lib/components/ui/select";
  import { auth } from "$lib/stores/AuthStore";
  import PublisherScore from "$lib/components/custom-ui/dashboard/PublisherScore.svelte";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";

  interface Outcome {
    id: string;
    name: string;
    projectId: string;
    type: string;
    content: string | null;
    sectionType: string | null;
    createdAt: string;
    updatedAt: string;
  }

  let searchQuery = $state("");
  let showCreateDialog = $state(false);
  let showDeleteDialog = $state(false);
  let showRenameDialog = $state(false);
  let newOutcomeName = $state("New Outcome");
  let selectedTemplate = $state("");
  let outcomeToDelete = $state<Outcome | null>(null);
  let outcomeToRename = $state<Outcome | null>(null);
  let renameValue = $state("");
  let editLinkUrl = $state("");
  let selectedType = $state("QUESTION");
  let linkUrl = $state("");

  // Driver.js initialization
  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    overlayClickBehavior: "nextStep",
    steps: [
      {
        element: "#outcomes-header",
        popover: {
          title: "Manage Your Outcomes",
          description:
            "This page is where you create, view, and manage all the outcomes, findings, or links related to your research project.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#create-outcome-button",
        popover: {
          title: "Initiate Outcome Creation",
          description:
            "Clicking this button opens a dialog where you can start creating a new outcome (a research finding, question, or link).",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#outcomes-search",
        popover: {
          title: "Find Outcomes Quickly",
          description:
            "Use this search bar to filter your outcomes list by name.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#outcomes-grid",
        popover: {
          title: "Your Outcome Collection",
          description:
            "All your outcomes are displayed here as cards. Click a card to view/edit (for outcomes) or open (for links). Hover over a card to see edit/delete options.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#journal-suggestions-card",
        popover: {
          title: "Get Journal Suggestions",
          description:
            "Based on the literature you've added, Quester suggests relevant journals for potential publication. Click 'Explain' for details on the scoring.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#conference-suggestions-card",
        popover: {
          title: "Find Relevant Conferences",
          description:
            "Similarly, Quester suggests conferences where your research might be a good fit for presentation.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#create-outcome-button",
        popover: {
          title: "Let's Create an Outcome",
          description:
            "We'll walk through the creation process. You can create a detailed research outcome or a simple link.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#create-outcome-dialog",
        popover: {
          title: "1. Select Outcome Type",
          description:
            "First, categorize your outcome. Choose 'Research Outcome' for findings, questions, or analyses that need detailed documentation (using a template), or 'Link' for simply saving relevant external URLs.",
          side: "right",
          align: "start",
        },
        onHighlightStarted: () => {
          setTimeout(() => {
            showCreateDialog = true;
          }, 50);
        },
      },
      {
        element: "#create-outcome-dialog #name",
        popover: {
          title: "2. Name Your Outcome",
          description:
            "Provide a clear, concise name that summarizes this outcome or link. This helps you identify it later.",
          side: "right",
          align: "center",
        },
      },
      {
        element: "#create-outcome-dialog",
        popover: {
          title: "3. Add Details (Type Specific)",
          description:
            "If creating a 'Link', paste the URL here. If creating a 'Research Outcome', choose a template (like 'Key Finding' or 'Research Question') to structure the information you'll add next.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#create-outcome-submit-button",
        popover: {
          title: "4. Create the Outcome",
          description:
            "Clicking here saves the outcome. 'Link' types are saved immediately. 'Research Outcome' types will open a dedicated editor based on the template you selected, ready for you to document the details.",
          side: "top",
          align: "center",
        },
        onDeselected: () => {
          showCreateDialog = false;
        },
      },
      {
        element: ".outcome-card-actions",
        popover: {
          title: "Manage Existing Outcomes",
          description:
            "Hover over any card to reveal buttons for renaming (pencil icon) or deleting (trash icon) the outcome.",
          side: "left",
          align: "start",
        },
      },
      {
        element: ".container",
        popover: {
          title: "Ready to Document Your Findings?",
          description:
            "Use the Outcomes page to keep track of key results, questions, and useful links throughout your research process. Stay organized!",
          side: "top",
          align: "center",
        },
      },
    ],
  });

  // Load outcomes data when project changes
  $effect(() => {
    const project = projectStore.currentProject;
    if (!project?.id) {
      console.warn("No project available");
      return;
    }

    outcomeStore.loadOutcomes(project.id).catch((err) => {
      console.error("Failed to load outcomes:", err);
    });
  });

  // Clear outcomes data when component is destroyed
  onDestroy(() => {
    outcomeStore.clearAll();
  });

  // Reset form when dialog closes
  $effect(() => {
    if (!showCreateDialog) {
      newOutcomeName = "New Outcome";
      selectedTemplate = "";
      selectedType = "QUESTION";
      linkUrl = "";
    }
  });

  async function handleCreateOutcome() {
    if (!projectStore.currentProject?.id) {
      console.error("No current project ID available");
      return;
    }

    try {
      // For LINK type, ensure we have both name and URL
      if (selectedType === "LINK" && !linkUrl) {
        console.error("URL is required for Link type outcomes");
        return;
      }

      const newOutcome = await outcomeStore.createOutcome(
        {
          name: newOutcomeName,
          projectId: projectStore.currentProject.id,
          type: selectedType,
          content: selectedType === "LINK" ? linkUrl : undefined,
          userId: auth.user?.id?.toString(),
        },
        selectedType === "LINK" ? undefined : selectedTemplate
      );

      if (!newOutcome) {
        console.error("Failed to create outcome: No outcome returned");
        return;
      }

      if (!newOutcome.id) {
        console.error("Created outcome has no ID:", newOutcome);
        return;
      }

      showCreateDialog = false;
      newOutcomeName = "New Outcome";
      selectedTemplate = "";
      selectedType = "QUESTION";
      linkUrl = "";

      if (newOutcome.type !== "LINK") {
        const path = `/project/${projectStore.currentProject.id}/outcomes/${newOutcome.id}`;
        navigate(path);
      }
    } catch (err) {
      console.error("Failed to create outcome:", err);
    }
  }

  // Helper function to stop propagation
  function stopPropagation(handler: (e: MouseEvent) => void) {
    return (e: MouseEvent) => {
      e.stopPropagation();
      handler(e);
    };
  }

  function handleCardClick(outcome: Outcome) {
    if (outcome.type === "LINK") {
      // Ensure URL has a protocol
      let url = outcome.content || "";
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const projectId = projectStore.currentProject?.id;
      if (projectId && outcome.id) {
        navigate(`/project/${projectId}/outcomes/${outcome.id}`);
      }
    }
  }

  function handleDeleteClick(outcome: Outcome) {
    outcomeToDelete = outcome;
    showDeleteDialog = true;
  }

  async function handleDeleteOutcome() {
    if (!outcomeToDelete?.id) return;

    try {
      await outcomeStore.deleteOutcome(outcomeToDelete.id);
      showDeleteDialog = false;
      outcomeToDelete = null;
    } catch (err) {
      console.error("Failed to delete outcome:", err);
    }
  }

  function handleRenameClick(outcome: Outcome) {
    outcomeToRename = outcome;
    renameValue = outcome.name;
    editLinkUrl = outcome.type === "LINK" ? outcome.content || "" : "";
    showRenameDialog = true;
  }

  async function handleRenameOutcome() {
    if (!outcomeToRename?.id) return;

    try {
      const updateData: Partial<Outcome> = {
        name: renameValue,
      };

      // Include URL update for Link type outcomes
      if (outcomeToRename.type === "LINK") {
        updateData.content = editLinkUrl;
      }

      const updatedOutcome = await outcomeStore.updateOutcome(
        outcomeToRename.id,
        updateData
      );

      if (!updatedOutcome) {
        throw new Error("Failed to update outcome: No response received");
      }

      // Instead of manually updating the outcome in the array,
      // refresh the entire outcome list to ensure consistency
      const projectId = projectStore.currentProject?.id;
      if (projectId) {
        await outcomeStore.loadOutcomes(projectId);
      }

      showRenameDialog = false;
      outcomeToRename = null;
      renameValue = "";
      editLinkUrl = "";
    } catch (err) {
      console.error("Failed to rename outcome:", err);
    }
  }

  $effect(() => {
    if (!showRenameDialog) {
      outcomeToRename = null;
      renameValue = "";
      editLinkUrl = "";
    }
  });
</script>

<div class="flex-1 w-full">
  <div class="container mx-auto py-6 px-4">
    <div class="mb-8">
      <div class="flex items-center justify-between" id="outcomes-header">
        <div class="flex items-center gap-2">
          <h1 class="text-3xl font-bold">Outcomes</h1>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Info class="h-5 w-5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="text-sm max-w-xs">
                Create and manage research outcomes to track your findings and
                questions.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div class="flex items-center space-x-2">
          <Button
            id="create-outcome-button"
            onclick={() => (showCreateDialog = true)}
            class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
          >
            <Plus class="h-4 w-4 mr-2" />
            Create Outcome
          </Button>
          <Button
            id="learn-outcomes-button"
            variant="outline"
            onclick={() => driverObj.drive()}
            class="border-2 dark:border-dark-border"
          >
            <GraduationCap class="h-4 w-4 mr-2" />
            Tour
          </Button>
        </div>
      </div>
      <p class="text-muted-foreground mt-2">
        Create and manage your project outcomes
      </p>
    </div>

    <Card.Root
      class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] relative overflow-hidden"
    >
      <!-- Decorative corners -->
      <div
        class="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-dark-accent-blue border dark:border-dark-border"
      ></div>
      <div
        class="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 dark:bg-dark-accent-yellow border dark:border-dark-border"
      ></div>

      <Card.Header class="pb-0">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <input
            id="outcomes-search"
            type="text"
            placeholder="Search outcomes..."
            bind:value={searchQuery}
            class="pl-9 flex h-10 w-full rounded-md border-2 dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </Card.Header>

      <Card.Content class="space-y-6 pt-6">
        {#if outcomeStore.isLoading}
          <div class="flex justify-center items-center h-[400px]">
            <p class="text-lg text-muted-foreground">Loading outcomes...</p>
          </div>
        {:else if outcomeStore.error}
          <div class="flex justify-center items-center h-[400px]">
            <p class="text-lg text-destructive">{outcomeStore.error}</p>
          </div>
        {:else if !outcomeStore.outcomes.length}
          <EmptyState
            title="No outcomes created yet"
            variant="data-empty"
            ctaText="Create your first outcome"
            ctaAction={() => (showCreateDialog = true)}
          />
        {:else}
          <div
            id="outcomes-grid"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {#each outcomeStore.outcomes
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .filter((outcome) => outcome?.name
                  ?.toLowerCase()
                  .includes(searchQuery.toLowerCase())) as outcome (outcome.id)}
              <button
                type="button"
                class="outcome-card group text-left transition-all duration-200 bg-transparent border-none p-0 m-0 w-full cursor-pointer"
                onclick={() => handleCardClick(outcome)}
                onkeydown={(e) => e.key === "Enter" && handleCardClick(outcome)}
                transition:fly|local={{
                  y: 20,
                  duration: 300,
                  easing: cubicOut,
                }}
              >
                <Card.Root
                  class="h-full pb-4 border-2  dark:border-dark-border bg-card dark:bg-dark-card shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,0.1)] transition-all relative overflow-hidden"
                >
                  <Card.Header class="pb-2">
                    <div class="flex justify-between items-start gap-4">
                      <div class="min-w-0 flex-1">
                        <Card.Title class="text-lg font-bold truncate"
                          >{outcome.name}</Card.Title
                        >
                        {#if outcome.type === "LINK" && outcome.content}
                          <p
                            class="text-sm text-muted-foreground mt-1 truncate"
                          >
                            {outcome.content}
                          </p>
                        {/if}
                      </div>
                      <div
                        class="outcome-card-actions flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
                      >
                        <Button
                          variant="outline"
                          size="icon"
                          class="rename-button h-8 w-8 border-2  dark:border-dark-border bg-background shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] dark:hover:shadow-[3px_3px_0px_0px_rgba(44,46,51,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] transition-all"
                          onclick={stopPropagation(() =>
                            handleRenameClick(outcome)
                          )}
                        >
                          <Pencil
                            class="h-4 w-4 text-blue-600 dark:text-blue-400"
                          />
                          <span class="sr-only">Rename outcome</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          class="delete-button h-8 w-8 border-2  dark:border-dark-border bg-background shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[3px_3px_0px_0px_rgba(220,38,38,0.15)] dark:hover:shadow-[3px_3px_0px_0px_rgba(220,38,38,0.15)] hover:border-destructive dark:hover:border-destructive hover:translate-y-[-1px] hover:translate-x-[-1px] transition-all"
                          onclick={stopPropagation(() =>
                            handleDeleteClick(outcome)
                          )}
                        >
                          <Trash2 class="h-4 w-4 text-destructive" />
                          <span class="sr-only">Delete outcome</span>
                        </Button>
                      </div>
                    </div>
                    <Card.Description class="text-xs">
                      <div class="flex flex-col gap-1 mt-1">
                        <div class="flex justify-between">
                          <span class="text-muted-foreground">Type:</span>
                          <span class="capitalize flex items-center gap-1">
                            {#if outcome.type === "LINK"}
                              <LinkIcon class="h-3 w-3" />
                            {/if}
                            {outcome.type.toLowerCase()}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-muted-foreground">Created:</span>
                          <span
                            >{new Date(
                              outcome.createdAt
                            ).toLocaleDateString()}</span
                          >
                        </div>
                        <div class="flex justify-between">
                          <span class="text-muted-foreground">Updated:</span>
                          <span
                            >{new Date(
                              outcome.updatedAt
                            ).toLocaleDateString()}</span
                          >
                        </div>
                      </div>
                    </Card.Description>
                  </Card.Header>

                  <div
                    class="absolute -top-1 -right-1 w-2 h-2 bg-green-400 dark:bg-dark-accent-green border dark:border-dark-border"
                  ></div>
                  <div
                    class="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 dark:bg-dark-accent-pink border dark:border-dark-border"
                  ></div>
                </Card.Root>
              </button>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
    <div class="mt-4">
      <PublisherScore />
    </div>
  </div>
</div>

<!-- Create Outcome Dialog -->
<Root bind:open={showCreateDialog}>
  <Content
    id="create-outcome-dialog"
    class="sm:max-w-[425px] border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <div class="flex flex-col space-y-1.5 text-center sm:text-left">
      <Title>Create New Outcome</Title>
      <Description>Give your outcome a name and select a template.</Description>
    </div>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <label for="type" class="text-right"> Type </label>
        <div class="col-span-3">
          <Select.Root bind:value={selectedType} type="single">
            <Select.Trigger>
              <span class="truncate">
                {selectedType === "LINK" ? "Link" : "Research Outcome"}
              </span>
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <div class="px-2 py-1.5 text-sm font-medium">Type</div>
                <Select.Item value="QUESTION">Research Outcome</Select.Item>
                <Select.Item value="LINK">Link</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <label for="name" class="text-right">Name</label>
        <input
          id="name"
          bind:value={newOutcomeName}
          placeholder="Enter a name"
          class="col-span-3 flex h-10 w-full rounded-md border-2 dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {#if selectedType === "LINK"}
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="url" class="text-right">URL</label>
          <input
            id="url"
            bind:value={linkUrl}
            placeholder="https://example.com"
            class="col-span-3 flex h-10 w-full rounded-md border-2 dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      {:else}
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="template" class="text-right"> Template </label>
          <div class="col-span-3">
            <Select.Root bind:value={selectedTemplate} type="single">
              <Select.Trigger>
                <span class="truncate"
                  >{selectedTemplate || "Select a template"}</span
                >
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <div class="px-2 py-1.5 text-sm font-medium">Templates</div>
                  {#each outcomeStore.templates.filter((t) => t.type !== "LINK") as template}
                    <Select.Item value={template.name}>
                      {template.name}
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      {/if}
    </div>
    <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
      <Button
        variant="outline"
        onclick={() => (showCreateDialog = false)}
        class="border-2  dark:border-dark-border"
      >
        Cancel
      </Button>
      <Button
        id="create-outcome-submit-button"
        onclick={handleCreateOutcome}
        class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
      >
        Create Outcome
      </Button>
    </div>
  </Content>
</Root>

<!-- Delete Outcome Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content
    class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Outcome</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{outcomeToDelete?.name}"? This action
        cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <div class="flex justify-end gap-2">
        <Button
          variant="outline"
          onclick={() => (showDeleteDialog = false)}
          class="border-2  dark:border-dark-border"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onclick={handleDeleteOutcome}
          class="border-2 border-destructive dark:border-destructive"
        >
          Delete
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Rename Outcome Dialog -->
<Root bind:open={showRenameDialog}>
  <Content
    id="rename-outcome-dialog"
    class="sm:max-w-[425px] border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <div class="flex flex-col space-y-1.5 text-center sm:text-left">
      <Title>Edit Outcome</Title>
      <Description>
        Update the {outcomeToRename?.type === "LINK" ? "name and URL" : "name"} for
        "{outcomeToRename?.name}"
      </Description>
    </div>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <label for="rename" class="text-right"> Name </label>
        <input
          id="rename"
          bind:value={renameValue}
          class="col-span-3 flex h-10 w-full rounded-md border-2 dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {#if outcomeToRename?.type === "LINK"}
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="editUrl" class="text-right"> URL </label>
          <input
            id="editUrl"
            bind:value={editLinkUrl}
            placeholder="https://example.com"
            class="col-span-3 flex h-10 w-full rounded-md border-2 dark:border-dark-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      {/if}
    </div>
    <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
      <Button
        variant="outline"
        onclick={() => (showRenameDialog = false)}
        class="border-2  dark:border-dark-border"
      >
        Cancel
      </Button>
      <Button
        onclick={handleRenameOutcome}
        class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
      >
        Save Changes
      </Button>
    </div>
  </Content>
</Root>

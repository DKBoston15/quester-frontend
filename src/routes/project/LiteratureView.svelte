<script lang="ts">
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import LiteratureDetails from "$lib/components/custom-ui/literature/literatureItem/LiteratureDetails.svelte";
  import LiteratureStatus from "$lib/components/custom-ui/literature/literatureItem/LiteratureStatus.svelte";
  import LiteratureDesigns from "$lib/components/custom-ui/literature/literatureItem/LiteratureDesigns.svelte";
  import Keywords from "$lib/components/custom-ui/literature/literatureItem/Keywords.svelte";
  import LiteratureInsights from "$lib/components/custom-ui/literature/literatureItem/LiteratureInsights.svelte";
  import { ArrowLeft, Trash2 } from "lucide-svelte";
  import { navigate } from "svelte-routing";
  import type { Literature } from "$lib/types/literature";
  import Reference from "$lib/components/custom-ui/literature/literatureItem/Reference.svelte";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";

  const { literatureId } = $props<{ literatureId: string }>();
  let selectedTab = $state("details");
  let literature = $state<Literature | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const projectId = projectStore.currentProject?.id;

    if (!literatureId || !projectId) {
      error = "Invalid literature or project ID";
      return;
    }

    loadLiterature(literatureId);
  });

  async function loadLiterature(id: string) {
    try {
      isLoading = true;
      await literatureStore.loadLiterature(
        projectStore.currentProject?.id || ""
      );
      literature = literatureStore.data.find((lit) => lit.id === id) || null;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load literature";
      console.error("Error loading literature:", err);
    } finally {
      isLoading = false;
    }
  }

  function handleBack() {
    const projectId = projectStore.currentProject?.id;
    if (projectId) {
      navigate(`/project/${projectId}/literature`);
    }
  }

  async function handleDelete() {
    if (!literature?.id) return;

    try {
      await literatureStore.deleteLiterature(literature.id);
      const projectId = projectStore.currentProject?.id;
      if (projectId) {
        navigate(`/project/${projectId}/literature`);
      }
    } catch (err) {
      console.error("Error deleting literature:", err);
    }
  }

  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#lit-view-header",
        popover: {
          title: "Literature Item Details",
          description:
            "This page provides a detailed view of a single literature item. Here you can manage its details, track status, add keywords, view insights, and generate citations.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#lit-view-back-button",
        popover: {
          title: "Go Back",
          description: "Return to the main literature list for this project.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#lit-view-delete-button",
        popover: {
          title: "Delete Item",
          description:
            "Permanently remove this literature item and all associated notes from your project.",
          side: "left",
          align: "end",
        },
      },
      {
        element: "#lit-status-card",
        popover: {
          title: "Track Reading Status",
          description:
            "Monitor and update the progress of reading and processing this literature item. Click 'Change Status' to update.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#lit-details-card",
        popover: {
          title: "Core Information",
          description:
            "View and edit the fundamental details of this literature item, such as title, authors, publication year, and type. Click 'Edit' to make changes.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#lit-designs-card",
        popover: {
          title: "Methodology Details",
          description:
            "Categorize the research, sampling, measurement, and analytic designs used in this literature according to your project's framework. Click 'Edit' to modify.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#lit-insights-card",
        popover: {
          title: "Literature Health & Setup",
          description:
            "Check the completeness of this literature entry. Expand this section to see recommended fields to fill out for better organization and citation quality.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#lit-keywords-card",
        popover: {
          title: "Add Keywords",
          description:
            "Tag this literature with relevant keywords. This helps in organizing your sources and identifying thematic connections across your research.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#lit-reference-card",
        popover: {
          title: "Generate Citations",
          description:
            "Quickly generate citations in various common styles (APA, MLA, etc.) based on the entered details. Use the dropdown to select a style and the button to copy.",
          side: "left",
          align: "start",
        },
      },
      {
        element: ".container", // General overview
        popover: {
          title: "Manage Your Source",
          description:
            "Use this detailed view to thoroughly document, analyze, and integrate this piece of literature into your research project.",
          side: "top",
          align: "center",
        },
      },
    ],
  });
</script>

<div class="flex-1 w-full">
  <div class="container mx-auto py-6 px-4">
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <Button size="sm" onclick={handleBack} id="lit-view-back-button">
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Literature
        </Button>
        {#if literature}
          <div class="flex items-center gap-2">
            <Button
              id="lit-view-delete-button"
              variant="destructive"
              size="sm"
              onclick={handleDelete}
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Delete Literature
            </Button>
            <Button
              variant="outline"
              onclick={() => driverObj.drive()}
              aria-label="Learn about Literature View"
            >
              <GraduationCap class="h-4 w-4 mr-2" />
              Tour
            </Button>
          </div>
        {/if}
      </div>

      {#if literature}
        <div id="lit-view-header">
          <h1 class="text-3xl font-bold">{literature.name}</h1>
        </div>
        <p class="text-muted-foreground mt-2">
          {(() => {
            const authors = literature.authors;
            let authorList: string[] = [];

            if (Array.isArray(authors)) {
              // Already an array
              authorList = authors;
            } else if (typeof authors === "string") {
              // Try parsing if it's a string
              try {
                const parsed = JSON.parse(authors);
                if (Array.isArray(parsed)) {
                  authorList = parsed;
                } else {
                  // Parsed but not an array, treat original string as single author if non-empty
                  if (authors.trim()) {
                    authorList = [authors];
                  }
                }
              } catch (e) {
                // Parsing failed, treat original string as single author if non-empty
                if (authors.trim()) {
                  authorList = [authors];
                }
              }
            }
            // If after all checks, authorList is empty, return fallback
            if (authorList.length === 0) {
              return "No authors listed";
            }
            // Join the valid author list
            return authorList.join(", ");
          })()}
        </p>

        <!-- Status Card -->
        <div class="mt-4 mb-6">
          <Card.Root
            id="lit-status-card"
            class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <Card.Content class="py-4">
              <LiteratureStatus {literature} />
            </Card.Content>
          </Card.Root>
        </div>
      {/if}
    </div>

    {#if isLoading}
      <div class="flex justify-center items-center h-[400px]">
        <p class="text-lg text-muted-foreground">
          Loading literature details...
        </p>
      </div>
    {:else if error}
      <div class="flex justify-center items-center h-[400px]">
        <p class="text-lg text-destructive">{error}</p>
      </div>
    {:else if literature}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: Details -->
        <div class="space-y-6">
          <Card.Root
            id="lit-details-card"
            class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <Card.Header>
              <Card.Title>Details</Card.Title>
            </Card.Header>
            <Card.Content>
              <LiteratureDetails
                {literature}
                on:update={({ detail }) => {
                  literature = detail.literature;
                }}
              />
              <p class="text-sm text-muted-foreground mt-4">
                Added on:
                {new Date(literature.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </Card.Content>
          </Card.Root>

          <div id="lit-designs-card">
            <LiteratureDesigns {literature} />
          </div>
        </div>

        <!-- Right Column: Literature Health, Keywords, and Citation -->
        <div class="space-y-6">
          <LiteratureInsights
            {literature}
            onTabChange={(tab) => (selectedTab = tab)}
          />

          <!-- Keywords -->
          <Card.Root
            id="lit-keywords-card"
            class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <Card.Header>
              <Card.Title>Keywords</Card.Title>
            </Card.Header>
            <Card.Content>
              <Keywords {literature} />
            </Card.Content>
          </Card.Root>

          <!-- Citation -->
          <div id="lit-reference-card">
            <Reference {literature} />
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

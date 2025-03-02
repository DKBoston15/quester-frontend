<!-- src/routes/project/LiteratureView.svelte -->
<script lang="ts">
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import { Button } from "$lib/components/ui/button";
  import LiteratureDetails from "$lib/components/custom-ui/literature/literatureItem/LiteratureDetails.svelte";
  import LiteratureStatus from "$lib/components/custom-ui/literature/literatureItem/LiteratureStatus.svelte";
  import LiteratureDesigns from "$lib/components/custom-ui/literature/literatureItem/LiteratureDesigns.svelte";
  import Keywords from "$lib/components/custom-ui/literature/literatureItem/Keywords.svelte";
  import LiteratureInsights from "$lib/components/custom-ui/literature/literatureItem/LiteratureInsights.svelte";
  import { ArrowLeft } from "lucide-svelte";
  import { navigate } from "svelte-routing";
  import type { Literature } from "$lib/types/literature";
  import Reference from "$lib/components/custom-ui/literature/literatureItem/Reference.svelte";

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
</script>

<div class="flex-1 w-full">
  <div class="container mx-auto py-6 px-4">
    <div class="mb-8">
      <Button variant="ghost" size="sm" onclick={handleBack} class="mb-4">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Back to Literature
      </Button>

      {#if literature}
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold">{literature.name}</h1>
        </div>
        <p class="text-muted-foreground mt-2">
          {(() => {
            const authors = literature.authors;
            if (!authors) return "No authors listed";
            if (Array.isArray(authors)) {
              return authors.join(", ");
            }
            try {
              const parsedAuthors = JSON.parse(authors);
              return Array.isArray(parsedAuthors)
                ? parsedAuthors.join(", ")
                : authors;
            } catch (e) {
              return authors;
            }
          })()}
        </p>
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
        <!-- Left Column -->
        <div class="space-y-6">
          <LiteratureInsights
            {literature}
            onTabChange={(tab) => (selectedTab = tab)}
          />

          <Card.Root
            class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <Tabs.Root value={selectedTab}>
              <Card.Header>
                <Tabs.List class="grid w-full grid-cols-2">
                  <Tabs.Trigger value="details">Details</Tabs.Trigger>
                  <Tabs.Trigger value="status">Status</Tabs.Trigger>
                </Tabs.List>
              </Card.Header>

              <Tabs.Content value="details">
                <Card.Content>
                  <LiteratureDetails
                    {literature}
                    on:update={({ detail }) => {
                      literature = detail.literature;
                    }}
                  />
                </Card.Content>
              </Tabs.Content>

              <Tabs.Content value="status">
                <Card.Content>
                  <LiteratureStatus {literature} />
                </Card.Content>
              </Tabs.Content>
            </Tabs.Root>
          </Card.Root>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <Card.Root
            class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <Card.Header>
              <Card.Title>Research Design</Card.Title>
            </Card.Header>
            <Card.Content>
              <LiteratureDesigns {literature} />
            </Card.Content>
          </Card.Root>

          <Card.Root
            class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <Card.Header>
              <Card.Title>Keywords</Card.Title>
            </Card.Header>
            <Card.Content>
              <Keywords {literature} />
            </Card.Content>
          </Card.Root>

          <Reference {literature} />
        </div>
      </div>
    {/if}
  </div>
</div>

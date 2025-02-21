<!-- src/routes/Project.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "../lib/stores/AuthStore.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import type { Project } from "$lib/types/auth";

  const props = $props<{
    params: {
      projectId: string;
    };
  }>();

  let project = $state<Project | null>(null);
  let isLoading = $state(true);
  let error = $state("");

  $effect(() => {
    console.log("Project params:", props.params);
    loadProject();
  });

  async function loadProject() {
    if (!props.params.projectId) {
      error = "No project ID provided";
      isLoading = false;
      return;
    }

    try {
      console.log("Fetching project:", props.params.projectId);
      const projectResponse = await fetch(
        `http://localhost:3333/projects/${props.params.projectId}`,
        { credentials: "include" }
      );

      if (!projectResponse.ok) {
        throw new Error(`Project not found (${projectResponse.status})`);
      }

      const projectData = await projectResponse.json();
      console.log("Project data:", projectData);
      project = projectData;
    } catch (err) {
      console.error("Error loading project:", err);
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="container mx-auto py-6">
  <Card>
    <CardHeader>
      <CardTitle>{project?.name || "Loading..."}</CardTitle>
    </CardHeader>
    <CardContent>
      {#if isLoading}
        <div>Loading project...</div>
      {:else if error}
        <div class="text-red-500">
          {error}
          <div class="text-sm mt-2">Project ID: {props.params.projectId}</div>
        </div>
      {:else if project}
        <!-- Project content here -->
        <div class="space-y-4">
          <div>
            <h3 class="font-semibold mb-1">Project Details</h3>
            <p class="text-sm">Name: {project.name}</p>
            {#if project.description}
              <p class="text-sm">Description: {project.description}</p>
            {/if}
            <p class="text-sm">
              Created: {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

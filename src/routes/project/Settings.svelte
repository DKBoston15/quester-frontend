<!-- src/routes/project/Settings.svelte -->
<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import DesignManager from "$lib/components/custom-ui/project/DesignManager.svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { toast } from "svelte-sonner";

  let projectName = $state("");
  let originalName = $state("");
  let isUpdating = $state(false);
  let hasChanges = $state(false);

  // Load the current project name when the component mounts
  $effect(() => {
    if (projectStore.currentProject) {
      projectName = projectStore.currentProject.name;
      originalName = projectStore.currentProject.name;
    }
  });

  // Track changes in the project name
  $effect(() => {
    hasChanges = originalName !== projectName && projectName.trim() !== "";
  });

  // Save project name changes
  async function updateProjectName(event: Event) {
    event.preventDefault();

    if (!projectStore.currentProject?.id) {
      toast.error("No project selected");
      return;
    }

    if (!projectName.trim()) {
      toast.error("Project name cannot be empty");
      return;
    }

    isUpdating = true;
    try {
      await projectStore.updateProject(projectStore.currentProject.id, {
        name: projectName,
      });
      originalName = projectName;
      toast.success("Project name updated successfully");
    } catch (error) {
      console.error("Failed to update project name:", error);
      toast.error("Failed to update project name");
    } finally {
      isUpdating = false;
    }
  }
</script>

<div class="container mx-auto py-6 px-4">
  <h1 class="text-3xl font-bold mb-6">Project Settings</h1>

  <div class="grid gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="">General Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" on:submit={updateProjectName}>
          <div class="space-y-2">
            <Label for="projectName">Project Name</Label>
            <Input
              id="projectName"
              type="text"
              bind:value={projectName}
              placeholder="Enter project name"
              disabled={isUpdating || !projectStore.currentProject}
            />
            {#if !projectStore.currentProject}
              <p class="text-sm text-red-500">
                No project selected. Please select a project first.
              </p>
            {/if}
          </div>
          <Button
            type="submit"
            disabled={!hasChanges || isUpdating || !projectStore.currentProject}
          >
            {#if isUpdating}
              <span class="animate-spin mr-2">⏳</span> Updating...
            {:else}
              Save Changes
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>

    <DesignManager />

    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="text-red-600">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" disabled={!projectStore.currentProject}>
          Delete Project
        </Button>
        {#if !projectStore.currentProject}
          <p class="text-sm text-red-500 mt-2">
            No project selected. Please select a project first.
          </p>
        {/if}
      </CardContent>
    </Card>
  </div>
</div>

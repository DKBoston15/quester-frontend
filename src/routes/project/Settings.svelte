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
  import { API_BASE_URL } from "$lib/config";

  let projectName = $state("");
  let originalName = $state("");
  let isUpdating = $state(false);
  let hasChanges = $state(false);
  let showDeleteDialog = $state(false);
  let isDeleting = $state(false);
  let isExporting = $state(false);

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

  // Export project function
  async function exportProject() {
    if (!projectStore.currentProject?.id) {
      toast.error("No project selected");
      return;
    }

    isExporting = true;
    try {
      const exportUrl = `${API_BASE_URL}/projects/${projectStore.currentProject.id}/export`;
      // Trigger download by navigating
      window.location.href = exportUrl;

      // Optionally show a success toast, though the browser handles the download itself
      // toast.success("Project export started...");
    } catch (error) {
      console.error("Failed to initiate project export:", error);
      toast.error("Failed to start project export");
    } finally {
      // Reset exporting state after a short delay to allow navigation
      setTimeout(() => {
        isExporting = false;
      }, 1000); // Adjust delay as needed
    }
  }

  // Delete project function
  async function deleteProject() {
    if (!projectStore.currentProject?.id) {
      toast.error("No project selected");
      return;
    }

    isDeleting = true;
    try {
      // Call the API to delete the project
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectStore.currentProject.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete project (${response.status})`);
      }

      toast.success("Project deleted successfully");
      // Navigate to dashboard with lowercase path
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    } finally {
      isDeleting = false;
      showDeleteDialog = false;
    }
  }
</script>

<div class="container mx-auto py-6 px-4">
  <h1 class="text-3xl font-bold mb-6">Settings</h1>

  <div class="grid gap-6">
    <Card
      class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
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
      class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="text-red-600">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <h3 class="font-medium mb-2">Export Project Data</h3>
          <p class="text-sm text-muted-foreground mb-3">
            Download all your project data, including literature, notes,
            outcomes, and analyses, as a zip file.
          </p>
          <Button
            variant="outline"
            disabled={!projectStore.currentProject || isExporting}
            onclick={exportProject}
          >
            {#if isExporting}
              <span class="animate-spin mr-2">⏳</span> Exporting...
            {:else}
              Export Data
            {/if}
          </Button>
        </div>
        <hr class="my-4" />
        <div>
          <h3 class="font-medium mb-2 text-red-600">Delete Project</h3>
          <p class="text-sm text-muted-foreground mb-3">
            Permanently remove this project and all its associated data. This
            action cannot be undone.
          </p>
          <Button
            variant="destructive"
            disabled={!projectStore.currentProject || isDeleting}
            onclick={() => (showDeleteDialog = true)}
          >
            {#if isDeleting}
              <span class="animate-spin mr-2">⏳</span> Deleting...
            {:else}
              Delete Project
            {/if}
          </Button>
        </div>
        {#if !projectStore.currentProject}
          <p class="text-sm text-red-500 mt-2">
            No project selected. Please select a project first.
          </p>
        {/if}
      </CardContent>
    </Card>
  </div>
</div>

<!-- Delete Project Confirmation Dialog -->
{#if showDeleteDialog}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md w-full shadow-xl"
    >
      <h2 class="text-2xl font-bold mb-4">Delete Project</h2>
      <p class="text-base mb-6">
        Are you sure you want to delete this project? This action cannot be
        undone.
        {#if projectStore.currentProject}
          <p class="font-medium mt-2">
            Project: {projectStore.currentProject.name}
          </p>
        {/if}
      </p>
      <div class="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onclick={() => (showDeleteDialog = false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onclick={deleteProject}
          disabled={isDeleting}
        >
          {#if isDeleting}
            <span class="animate-spin mr-2">⏳</span> Deleting...
          {:else}
            Delete
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}

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
  import { projectStore } from "$lib/stores/ProjectStore";
  import { toast } from "svelte-sonner";
  import { api, getApiUrl } from "$lib/services/api-client";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap, Info } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";

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
      // Trigger download by navigating to the export URL
      window.location.href = getApiUrl(`/projects/${projectStore.currentProject.id}/export`);

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
      await api.delete(`/projects/${projectStore.currentProject.id}`);

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

  // Define driverObj
  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#settings-header",
        popover: {
          title: "Configure Your Project",
          description:
            "Manage your project's basic settings, custom designs, and data options here.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#project-name-input",
        popover: {
          title: "Update Project Name",
          description:
            "Change the project name here and click 'Save Changes' when done.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#design-manager-card",
        popover: {
          title: "Manage Custom Designs",
          description:
            "Add, edit, or remove custom options for your research, sampling, measurement, and analytic designs to tailor Quester to your specific methodology.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#danger-zone-card",
        popover: {
          title: "Danger Zone",
          description:
            "Be careful! This section contains actions like exporting or permanently deleting your project.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#export-data-button",
        popover: {
          title: "Export Project Data",
          description:
            "Download a zip file containing all your project data (literature, notes, designs, etc.) for backup or use elsewhere.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#delete-project-button",
        popover: {
          title: "Delete Project",
          description:
            "Permanently delete this project and all its data. This action cannot be undone, so proceed with caution!",
          side: "top",
          align: "start",
        },
      },
    ],
  });
</script>

<div class="container mx-auto py-6 px-4">
  <div class="flex justify-between items-center mb-6" id="settings-header">
    <div class="flex items-center gap-2">
      <h1 class="text-3xl font-bold">Settings</h1>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Info class="h-5 w-5 text-muted-foreground" />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p class="text-sm max-w-xs">
            Configure your project settings, manage custom designs, and handle
            data export or deletion options for your research project.
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
    <Button variant="outline" onclick={() => driverObj.drive()}>
      <GraduationCap class="h-4 w-4 mr-2" />
      Tour
    </Button>
  </div>

  <div class="grid gap-6">
    <Card
      id="general-settings-card"
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
              id="project-name-input"
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

    <div id="design-manager-card">
      <DesignManager />
    </div>

    <Card
      id="danger-zone-card"
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
            id="export-data-button"
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
            id="delete-project-button"
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

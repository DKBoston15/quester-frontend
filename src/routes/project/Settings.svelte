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
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

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
      toast.error(t("projectSettings.noProjectSelected"));
      return;
    }

    if (!projectName.trim()) {
      toast.error(t("projectSettings.nameCannotBeEmpty"));
      return;
    }

    isUpdating = true;
    try {
      await projectStore.updateProject(projectStore.currentProject.id, {
        name: projectName,
      });
      originalName = projectName;
      toast.success(t("projectSettings.nameUpdatedSuccess"));
    } catch (error) {
      console.error("Failed to update project name:", error);
      toast.error(t("projectSettings.nameUpdateFailed"));
    } finally {
      isUpdating = false;
    }
  }

  // Export project function
  async function exportProject() {
    if (!projectStore.currentProject?.id) {
      toast.error(t("projectSettings.noProjectSelected"));
      return;
    }

    isExporting = true;
    try {
      // Trigger download by navigating to the export URL
      window.location.href = getApiUrl(
        `/projects/${projectStore.currentProject.id}/export`
      );
    } catch (error) {
      console.error("Failed to initiate project export:", error);
      toast.error(t("projectSettings.exportFailed"));
    } finally {
      // Reset exporting state after a short delay to allow navigation
      setTimeout(() => {
        isExporting = false;
      }, 1000);
    }
  }

  // Delete project function
  async function deleteProject() {
    if (!projectStore.currentProject?.id) {
      toast.error(t("projectSettings.noProjectSelected"));
      return;
    }

    isDeleting = true;
    try {
      // Call the API to delete the project
      await api.delete(`/projects/${projectStore.currentProject.id}`);

      toast.success(t("projectSettings.deletedSuccess"));
      // Navigate to dashboard with lowercase path
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error(t("projectSettings.deleteFailed"));
    } finally {
      isDeleting = false;
      showDeleteDialog = false;
    }
  }

  // Create tour with translated steps
  function createProjectSettingsTour() {
    return driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#settings-header",
          popover: {
            title: t("tours.projectSettings.configure.title"),
            description: t("tours.projectSettings.configure.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#project-name-input",
          popover: {
            title: t("tours.projectSettings.projectName.title"),
            description: t("tours.projectSettings.projectName.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#design-manager-card",
          popover: {
            title: t("tours.projectSettings.customDesigns.title"),
            description: t("tours.projectSettings.customDesigns.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#danger-zone-card",
          popover: {
            title: t("tours.projectSettings.dangerZone.title"),
            description: t("tours.projectSettings.dangerZone.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#export-data-button",
          popover: {
            title: t("tours.projectSettings.exportData.title"),
            description: t("tours.projectSettings.exportData.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#delete-project-button",
          popover: {
            title: t("tours.projectSettings.deleteProject.title"),
            description: t("tours.projectSettings.deleteProject.description"),
            side: "top",
            align: "start",
          },
        },
      ],
    });
  }
</script>

<div class="container mx-auto py-6 px-4">
  <div class="flex justify-between items-center mb-6" id="settings-header">
    <div class="flex items-center gap-2">
      <h1 class="text-3xl font-bold">{$_("projectSettings.title")}</h1>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Info class="h-5 w-5 text-muted-foreground" />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p class="text-sm max-w-xs">
            {$_("projectSettings.tooltip")}
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
    <Button variant="outline" onclick={() => createProjectSettingsTour().drive()}>
      <GraduationCap class="h-4 w-4 mr-2" />
      {$_("common.tour")}
    </Button>
  </div>

  <div class="grid gap-6">
    <Card id="general-settings-card">
      <CardHeader>
        <CardTitle class="">{$_("projectSettings.generalSettings")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" onsubmit={updateProjectName}>
          <div class="space-y-2">
            <Label for="projectName">{$_("projectSettings.projectName")}</Label>
            <Input
              id="project-name-input"
              type="text"
              bind:value={projectName}
              placeholder={$_("projectSettings.enterProjectName")}
              disabled={isUpdating || !projectStore.currentProject}
            />
            {#if !projectStore.currentProject}
              <p class="text-sm text-red-500">
                {$_("projectSettings.selectProjectFirst")}
              </p>
            {/if}
          </div>
          <Button
            type="submit"
            disabled={!hasChanges || isUpdating || !projectStore.currentProject}
          >
            {#if isUpdating}
              <span class="animate-spin mr-2">⏳</span> {$_("common.loading")}
            {:else}
              {$_("projectSettings.saveChanges")}
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>

    <div id="design-manager-card">
      <DesignManager />
    </div>

    <Card id="danger-zone-card">
      <CardHeader>
        <CardTitle class="text-red-600">{$_("projectSettings.dangerZone")}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <h3 class="font-medium mb-2">{$_("projectSettings.exportProjectData")}</h3>
          <p class="text-sm text-muted-foreground mb-3">
            {$_("projectSettings.exportDescription")}
          </p>
          <Button
            id="export-data-button"
            variant="outline"
            disabled={!projectStore.currentProject || isExporting}
            onclick={exportProject}
          >
            {#if isExporting}
              <span class="animate-spin mr-2">⏳</span> {$_("projectSettings.exporting")}
            {:else}
              {$_("projectSettings.exportData")}
            {/if}
          </Button>
        </div>
        <hr class="my-4" />
        <div>
          <h3 class="font-medium mb-2 text-red-600">{$_("projectSettings.deleteProject")}</h3>
          <p class="text-sm text-muted-foreground mb-3">
            {$_("projectSettings.deleteDescription")}
          </p>
          <Button
            id="delete-project-button"
            variant="destructive"
            disabled={!projectStore.currentProject || isDeleting}
            onclick={() => (showDeleteDialog = true)}
          >
            {#if isDeleting}
              <span class="animate-spin mr-2">⏳</span> {$_("common.deleting")}
            {:else}
              {$_("projectSettings.deleteProject")}
            {/if}
          </Button>
        </div>
        {#if !projectStore.currentProject}
          <p class="text-sm text-red-500 mt-2">
            {$_("projectSettings.selectProjectFirst")}
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
      <h2 class="text-2xl font-bold mb-4">{$_("projectSettings.deleteProject")}</h2>
      <div class="text-base mb-6">
        <p>
          {$_("projectSettings.deleteConfirmMessage")}
        </p>
        {#if projectStore.currentProject}
          <p class="font-medium mt-2">
            {$_("projectSettings.projectLabel")}: {projectStore.currentProject.name}
          </p>
        {/if}
      </div>
      <div class="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onclick={() => (showDeleteDialog = false)}
          disabled={isDeleting}
        >
          {$_("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onclick={deleteProject}
          disabled={isDeleting}
        >
          {#if isDeleting}
            <span class="animate-spin mr-2">⏳</span> {$_("common.deleting")}
          {:else}
            {$_("common.delete")}
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}

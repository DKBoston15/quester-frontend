<!-- src/lib/components/custom-ui/literature/literatureItem/LiteratureStatus.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import type { Literature } from "$lib/types/literature";
  import {
    BookOpen,
    CheckCircle2,
    Clock,
    Archive,
    AlertCircle,
  } from "lucide-svelte";

  const { literature } = $props<{ literature: Literature }>();
  let selectedStatus = $state(literature?.status || "Not Started");
  let editMode = $state(false);
  let statusBackup = $state<string | null>(null);

  const statusConfig = {
    "Not Started": {
      icon: AlertCircle,
      color: "text-yellow-500 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    Reading: {
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    "Note Taking": {
      icon: Clock,
      color: "text-purple-500 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    Completed: {
      icon: CheckCircle2,
      color: "text-green-500 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    Archived: {
      icon: Archive,
      color: "text-gray-500 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900/20",
    },
  };

  function handleStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedStatus = target.value;
  }

  function enterEditMode() {
    statusBackup = selectedStatus;
    editMode = true;
  }

  function cancelEdit() {
    if (statusBackup !== null) {
      selectedStatus = statusBackup;
      statusBackup = null;
    }
    editMode = false;
  }

  async function updateStatus() {
    if (literature) {
      try {
        await literatureStore.updateLiterature(literature.id, {
          status: selectedStatus,
        });
        editMode = false;
      } catch (error) {
        console.error("Error updating status:", error);
      }
    }
  }

  let currentStatus = $derived(
    statusConfig[selectedStatus as keyof typeof statusConfig]
  );
</script>

<div class="grid gap-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class={`p-3 rounded-lg ${currentStatus.bgColor}`}>
        <svelte:component
          this={currentStatus.icon}
          class={`w-6 h-6 ${currentStatus.color}`}
        />
      </div>
      <div>
        <Label class="text-base font-medium">Reading Status</Label>
        {#if !editMode}
          <p class={`text-lg font-semibold ${currentStatus.color}`}>
            {selectedStatus}
          </p>
        {/if}
      </div>
    </div>
    <div class="flex space-x-2">
      {#if editMode}
        <Button size="sm" variant="ghost" onclick={cancelEdit}>Cancel</Button>
        <Button size="sm" onclick={updateStatus}>Save</Button>
      {:else}
        <Button size="sm" onclick={enterEditMode}>Change Status</Button>
      {/if}
    </div>
  </div>

  {#if editMode}
    <select
      id="status"
      class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      bind:value={selectedStatus}
      onchange={handleStatusChange}
    >
      <option value="Not Started">Not Started</option>
      <option value="Reading">Reading</option>
      <option value="Note Taking">Note Taking</option>
      <option value="Completed">Completed</option>
      <option value="Archived">Archived</option>
    </select>
  {/if}
</div>

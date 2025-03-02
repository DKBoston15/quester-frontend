<!-- src/lib/components/custom-ui/literature/literatureItem/LiteratureStatus.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import type { Literature } from "$lib/types/literature";

  const { literature } = $props<{ literature: Literature }>();
  let selectedStatus = $state(literature?.status || "Not Started");
  let editMode = $state(false);
  let statusBackup = $state<string | null>(null);

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
</script>

<div class="grid gap-6">
  <div class="grid gap-3">
    <Label for="status">Status</Label>
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
    {:else}
      <p>{selectedStatus}</p>
    {/if}
  </div>

  <div class="flex justify-end space-x-2">
    {#if editMode}
      <Button size="sm" variant="ghost" onclick={cancelEdit}>Cancel</Button>
      <Button size="sm" onclick={updateStatus}>Save</Button>
    {:else}
      <Button size="sm" onclick={enterEditMode}>Edit</Button>
    {/if}
  </div>
</div>

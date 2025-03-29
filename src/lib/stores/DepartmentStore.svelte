<!-- src/lib/stores/DepartmentStore.svelte -->
<script context="module" lang="ts">
  import { writable } from "svelte/store";

  // A simple counter store to track department updates
  // We only need to know WHEN it updates, not what the value is
  export const departmentUpdated = writable(0);

  // Function to trigger an update notification
  export function notifyDepartmentUpdate() {
    departmentUpdated.update((n) => n + 1);
  }
</script>

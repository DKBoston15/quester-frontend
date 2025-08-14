<script context="module" lang="ts">
  import { writable } from "svelte/store";

  export const departmentUpdated = writable(0);

  export function notifyDepartmentUpdate() {
    departmentUpdated.update((n) => n + 1);
  }
</script>

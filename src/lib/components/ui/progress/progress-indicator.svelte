<!-- src/lib/components/ui/progress/progress-indicator.svelte -->
<script lang="ts">
  const props = $props<{
    class?: string;
    style?: string;
  }>();
</script>

<div
  class={`h-full w-full flex-1 transition-all ${props.class ?? ""}`}
  style={props.style}
/>

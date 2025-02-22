<!-- src/lib/components/ui/progress/progress.svelte -->
<script lang="ts">
  const props = $props<{
    value?: number;
    class?: string;
  }>();
</script>

<div
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={props.value}
  class={`relative h-4 w-full overflow-hidden rounded-full bg-secondary ${props.class ?? ""}`}
>
  <slot />
</div>

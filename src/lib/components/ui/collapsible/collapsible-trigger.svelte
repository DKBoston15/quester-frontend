<script lang="ts">
  import { Collapsible as CollapsiblePrimitive, type WithoutChild } from "bits-ui";

  let {
    ref = $bindable(null),
    child,
    children,
    ...restProps
  }: WithoutChild<CollapsiblePrimitive.TriggerProps> = $props();
</script>

<CollapsiblePrimitive.Trigger bind:ref {child} {...restProps}>
  {@render children?.()}
</CollapsiblePrimitive.Trigger>
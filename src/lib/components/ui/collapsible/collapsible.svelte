<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from "bits-ui";

  let {
    disabled = false,
    open = $bindable(false),
    onOpenChange,
    ...restProps
  } = $props<{
    disabled?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: import("svelte").Snippet;
  }>();
</script>

<CollapsiblePrimitive.Root
  bind:open
  {onOpenChange}
  {disabled}
  {...restProps}
>
  {@render children()}
</CollapsiblePrimitive.Root>
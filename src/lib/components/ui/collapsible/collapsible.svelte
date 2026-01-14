<script lang="ts">
  import { Collapsible as CollapsiblePrimitive, type WithoutChild } from "bits-ui";

  let {
    disabled = false,
    open = $bindable(false),
    onOpenChange,
    children,
    ...restProps
  }: WithoutChild<CollapsiblePrimitive.RootProps> = $props();
</script>

<CollapsiblePrimitive.Root
  bind:open
  {onOpenChange}
  {disabled}
  {...restProps}
>
  {@render children?.()}
</CollapsiblePrimitive.Root>
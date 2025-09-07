<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";
  import type { HTMLDivAttributes } from "svelte/elements";

  let {
    ref = $bindable(),
    class: className,
    children,
    ...restProps
  } = $props<
    HTMLDivAttributes & {
      ref?: HTMLDivElement;
      children: import("svelte").Snippet;
    }
  >();
</script>

<CollapsiblePrimitive.Content
  bind:ref
  class={cn(
    "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
    className
  )}
  {...restProps}
>
  {@render children()}
</CollapsiblePrimitive.Content>
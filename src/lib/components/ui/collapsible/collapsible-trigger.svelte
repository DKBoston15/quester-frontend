<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from "bits-ui";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    ref = $bindable(),
    child,
    children,
    ...restProps
  } = $props<
    HTMLButtonAttributes & {
      ref?: HTMLButtonElement;
      child?: import("svelte").Snippet<[{ builder: any }]>;
      children?: import("svelte").Snippet;
      asChild?: boolean;
    }
  >();
</script>

<CollapsiblePrimitive.Trigger bind:ref {...restProps} let:builder>
  {#if child}
    {@render child({ builder })}
  {:else if children}
    {@render children()}
  {/if}
</CollapsiblePrimitive.Trigger>
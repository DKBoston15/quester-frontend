<script lang="ts">
  import { Toggle } from "bits-ui";
  import { cn } from "$lib/utils.js";

  // Use $state and $props from Svelte 5
  let {
    pressed = $bindable(false),
    class: className = undefined,
    disabled = false,
    onPressedChange = undefined,
    ...rest
  } = $props();
</script>

<Toggle.Root
  bind:pressed
  {disabled}
  onPressedChange={(value) => {
    if (onPressedChange) onPressedChange(value);
  }}
  class={cn(
    "group focus-visible:ring-ring focus-visible:ring-offset-background data-[state=on]:bg-primary data-[state=off]:bg-input peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {...rest}
>
  <div
    class={cn(
      "bg-background pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform group-data-[state=on]:translate-x-5 group-data-[state=off]:translate-x-0"
    )}
  />
</Toggle.Root>

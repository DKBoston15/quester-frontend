<script lang="ts">
  import Sun from "lucide-svelte/icons/sun";
  import Moon from "lucide-svelte/icons/moon";
  import { Button } from "$lib/components/ui/button/index.js";
  import { toggleMode, initializeTheme } from "$lib/utils/mode-watcher";
  import { onMount } from "svelte";
  import { cn } from "$lib/utils.js";

  const props = $props<{
    class?: string;
  }>();

  onMount(() => {
    initializeTheme();
  });
</script>

<div class={cn("flex items-center justify-center w-full", props.class)}>
  <Button
    onclick={toggleMode}
    variant="ghost"
    size="icon"
    class={cn(
      "h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 p-2 rounded-sm",
      props.class
    )}
  >
    <Sun
      class="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
    />
    <Moon
      class="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
    />
    <span class="sr-only">Toggle theme</span>
  </Button>
</div>

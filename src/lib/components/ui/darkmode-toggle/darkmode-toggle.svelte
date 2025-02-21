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

<Button
  onclick={toggleMode}
  variant="ghost"
  size="icon"
  class={cn(
    "w-8 h-8 text-blue-500 hover:scale-110 transition-transform duration-300 relative flex items-center justify-center",
    props.class
  )}
>
  <Sun
    class="h-8 w-8 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
  />
  <Moon
    class="absolute h-8 w-8 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
  />
  <span class="sr-only">Toggle theme</span>
</Button>

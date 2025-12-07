<script lang="ts">
  import Sun from "lucide-svelte/icons/sun";
  import Moon from "lucide-svelte/icons/moon";
  import { Button } from "$lib/components/ui/button/index.js";
  import { toggleMode, initializeTheme } from "$lib/utils/mode-watcher";
  import { onMount } from "svelte";
  import { cn } from "$lib/utils.js";
  import { _ } from "svelte-i18n";

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
      "h-8 w-8 rounded-full p-0 text-foreground transition duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-brand/80 focus-visible:ring-offset-0",
      props.class
    )}
  >
    <Sun
      class="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
    />
    <Moon
      class="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
    />
    <span class="sr-only">{$_('srOnly.toggleTheme')}</span>
  </Button>
</div>

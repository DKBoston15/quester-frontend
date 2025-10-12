<script lang="ts">
  import { Undo } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { ToolBarIconProps } from "./types.js";

  let {
    editor,
    toolTipProps = { delayDuration: 0, disabled: false },
  }: ToolBarIconProps = $props();

  // Local reactive state for disabled status
  let isDisabled = $state(true);

  // Safely update disabled state (avoid synchronous state mutation during render)
  function updateDisabledState() {
    const canUndo = editor?.can().undo() ?? false;
    // Defer state change to avoid mutating during template/derived evaluation
    queueMicrotask(() => {
      isDisabled = !canUndo;
    });
  }

  // Attach listeners on mount and when editor changes
  import { onMount } from "svelte";
  let detach: (() => void) | null = null;

  function attachListeners() {
    // Clean up any existing listener before attaching a new one
    detach?.();
    detach = null;
    const currentEditor = editor;
    if (!currentEditor) return;
    // Run after current tick to avoid state mutation during template evaluation
    queueMicrotask(() => updateDisabledState());
    currentEditor.on("transaction", updateDisabledState);
    detach = () => {
      currentEditor.off("transaction", updateDisabledState);
      detach = null;
    };
  }

  onMount(() => {
    attachListeners();
    return () => {
      detach?.();
      detach = null;
    };
  });

  // React if editor instance changes
  $effect(() => {
    // Access editor for dependency tracking
    const ed = editor;
    // Detach previous listeners and reattach for new instance
    detach?.();
    detach = null;
    attachListeners();
  });
</script>

<Tooltip.Provider {...toolTipProps}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="ghost"
        class="size-8 p-0"
        onclick={() => editor?.chain().focus().undo().run()}
        disabled={isDisabled}
      >
        <Undo size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Undo (⌘Z)</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

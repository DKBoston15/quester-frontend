<script lang="ts">
  import { Redo } from "lucide-svelte";
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
    const canRedo = editor?.can().redo() ?? false;
    // Defer state change to avoid mutating during template/derived evaluation
    queueMicrotask(() => {
      isDisabled = !canRedo;
    });
  }

  import { onMount } from "svelte";
  let detach: (() => void) | null = null;

  function attachListeners() {
    if (!editor) return;
    // Run after current tick to avoid state mutation during template evaluation
    queueMicrotask(() => updateDisabledState());
    editor.on("transaction", updateDisabledState);
    detach = () => editor?.off("transaction", updateDisabledState);
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
        onclick={() => editor?.chain().focus().redo().run()}
        disabled={isDisabled}
      >
        <Redo size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Redo (⌘Shift+Z)</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

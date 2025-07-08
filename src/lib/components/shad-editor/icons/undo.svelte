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

  // Effect to update isDisabled when editor state changes
  $effect(() => {
    function updateDisabledState() {
      const canUndo = editor?.can().chain().focus().undo().run();
      isDisabled = !canUndo;
    }

    // Initial check
    if (editor) {
      updateDisabledState();
      // Listen for transaction updates
      editor.on("transaction", updateDisabledState);
    }

    // Cleanup function
    return () => {
      editor?.off("transaction", updateDisabledState);
    };
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

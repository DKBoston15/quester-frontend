<script lang="ts">
  import { Redo } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { ToolBarIconProps } from "./types.js";
  import { _ } from "svelte-i18n";

  let {
    editor,
    toolTipProps = { delayDuration: 0, disabled: false },
  }: ToolBarIconProps = $props();

  // Local reactive state for disabled status
  let isDisabled = $state(true);

  // Effect to update isDisabled when editor state changes
  $effect(() => {
    function updateDisabledState() {
      const canRedo = editor?.can().chain().focus().redo().run();
      isDisabled = !canRedo;
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
        onclick={() => editor?.chain().focus().redo().run()}
        disabled={isDisabled}
      >
        <Redo size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>{$_('editor.toolbar.redo')}</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

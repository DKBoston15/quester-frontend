<script lang="ts">
  import { Redo } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { ToolBarIconProps } from "./types.js";

  let {
    editor,
    toolTipProps = { delayDuration: 0, disabled: false },
  }: ToolBarIconProps = $props();
</script>

<Tooltip.Provider {...toolTipProps}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="ghost"
        class="size-8 p-0"
        onclick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      >
        <Redo size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Redo (⌘R)</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

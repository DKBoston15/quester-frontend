<script lang="ts">
  import { Subscript } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
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
        class={cn("size-8 p-0", editor.isActive("subscript") && "bg-muted")}
        onclick={() => editor.chain().focus().toggleSubscript().run()}
      >
        <Subscript size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Subscript (⌘,)</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

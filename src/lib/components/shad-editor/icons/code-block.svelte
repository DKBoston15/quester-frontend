<script lang="ts">
  import { FileCode } from "lucide-svelte";
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
        size="icon"
        class={cn("size-8", editor.isActive("codeBlock") && "bg-muted")}
        onclick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <FileCode size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content
      avoidCollisions
      class="border bg-background p-2 font-medium text-foreground"
    >
      <p>Code Block</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

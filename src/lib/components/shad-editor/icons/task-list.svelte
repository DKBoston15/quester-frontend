<script lang="ts">
  import { CheckSquare } from "lucide-svelte";
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
        class={cn("size-8 p-0", editor.isActive("taskList") && "bg-muted")}
        onclick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Tasks List (⌘⇧9)</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

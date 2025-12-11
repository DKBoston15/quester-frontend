<script lang="ts">
  import { Code } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import type { ToolBarIconProps } from "./types.js";
  import { _ } from "svelte-i18n";

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
        class={cn("size-8", editor.isActive("code") && "bg-muted")}
        onclick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>{$_('editor.toolbar.code')}</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

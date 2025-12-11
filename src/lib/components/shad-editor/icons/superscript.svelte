<script lang="ts">
  import { Superscript } from "lucide-svelte";
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
        class={cn("size-8 p-0", editor.isActive("superscript") && "bg-muted")}
        onclick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <Superscript size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>{$_('editor.toolbar.superscript')}</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

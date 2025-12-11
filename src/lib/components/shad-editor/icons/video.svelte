<script lang="ts">
  import { Video } from "lucide-svelte";
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
        class={cn(
          "size-8 p-0",
          editor.isActive("video-placeholder") && "bg-muted"
        )}
        onclick={() => editor.chain().focus().insertVideoPlaceholder().run()}
      >
        <Video size={16} />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>{$_('editor.toolbar.addVideo')}</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

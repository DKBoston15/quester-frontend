<script lang="ts">
  import {
    ChevronDown,
    Code,
    DiamondMinus,
    Download,
    FileJson,
    FileText,
  } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { downloadFile } from "../custom/utils.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import type { ToolBarIconProps } from "./types.js";
  import { _ } from "svelte-i18n";

  let {
    editor,
    toolTipProps = { delayDuration: 0, disabled: false },
  }: ToolBarIconProps = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Tooltip.Provider {...toolTipProps}>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button variant="ghost" size="sm" class="h-8">
            <Download size={16} />
            <ChevronDown class="size-3 text-muted-foreground" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{$_('editor.toolbar.exportData')}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-48 p-2">
    <DropdownMenu.Item
      onclick={() => downloadFile(editor.getHTML(), "data.html")}
    >
      <Code />
      <span>{$_('editor.export.html')}</span>
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() =>
        downloadFile(editor.storage.markdown.getMarkdown(), "data.md")}
    >
      <DiamondMinus />
      <span>{$_('editor.export.markdown')}</span>
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => downloadFile(editor.getText(), "data.txt")}
    >
      <FileText />
      <span>{$_('editor.export.text')}</span>
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() =>
        downloadFile(JSON.stringify(editor.getJSON()), "data.json")}
    >
      <FileJson />
      <span>{$_('editor.export.json')}</span>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

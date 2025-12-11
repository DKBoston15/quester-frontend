<script lang="ts">
  import {
    Heading1,
    Heading2,
    Heading3,
    Pilcrow,
    FileJson,
    ChevronDown,
    Check,
    Minus,
  } from "lucide-svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
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
          <Button variant="ghost" size="sm" class="h-8 gap-1 p-1">
            {#if editor.isActive("heading", { level: 1 })}
              <Heading1 size={16} />
            {:else if editor.isActive("heading", { level: 2 })}
              <Heading2 size={16} />
            {:else if editor.isActive("heading", { level: 3 })}
              <Heading3 size={16} />
            {:else if editor.isActive("paragraph")}
              <Pilcrow size={16} />
            {:else if editor.isActive("codeBlock")}
              <FileJson size={16} />
            {:else}
              <Minus size={16} />
            {/if}
            <ChevronDown class="!size-2 text-muted-foreground" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{$_('editor.textFormatting')}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-40">
    <DropdownMenu.Item
      onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      closeOnSelect={false}
    >
      <Heading1 /> {$_('editor.heading1')}
      {#if editor.isActive("heading", { level: 1 })}
        <Check class="absolute right-2 !size-3 text-muted-foreground" />
      {/if}
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      closeOnSelect={false}
    >
      <Heading2 /> {$_('editor.heading2')}
      {#if editor.isActive("heading", { level: 2 })}
        <Check class="absolute right-2 !size-3 text-muted-foreground" />
      {/if}
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      closeOnSelect={false}
    >
      <Heading3 /> {$_('editor.heading3')}
      {#if editor.isActive("heading", { level: 3 })}
        <Check class="absolute right-2 !size-3 text-muted-foreground" />
      {/if}
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => editor.chain().focus().setParagraph().run()}
      closeOnSelect={false}
    >
      <Pilcrow /> {$_('editor.paragraph')}
      {#if editor.isActive("paragraph")}
        <Check class="absolute right-2 !size-3 text-muted-foreground" />
      {/if}
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => editor.chain().focus().toggleCodeBlock().run()}
      closeOnSelect={false}
    >
      <FileJson /> {$_('editor.codeBlock')}
      {#if editor.isActive("codeBlock")}
        <Check class="absolute right-2 !size-3 text-muted-foreground" />
      {/if}
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

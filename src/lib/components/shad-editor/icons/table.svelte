<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { cn } from "$lib/utils.js";
  import { Table, ChevronDown } from "lucide-svelte";
  import type { ToolBarIconProps } from "./types.js";
  import { _ } from "svelte-i18n";

  let {
    editor,
    toolTipProps = { delayDuration: 0, disabled: false },
  }: ToolBarIconProps = $props();

  const isTableActive = $derived.by(() => editor.isActive("table"));

  let rows = $state(3);
  let cols = $state(3);
  const blocks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  let open = $state(false);
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    <Tooltip.Provider {...toolTipProps}>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            variant="ghost"
            size="sm"
            class={cn("h-8 gap-1 p-1", isTableActive && "bg-muted")}
          >
            <Table size={16} />
            <ChevronDown class="!size-2 text-muted-foreground" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{$_('editor.toolbar.table')}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="h-fit w-fit overflow-auto">
    {#if isTableActive}
      <DropdownMenu.Item
        onclick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: false })
            .run()}
      >
        <span>{$_('editor.table.insertTable')}</span>
      </DropdownMenu.Item>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>
          <span>{$_('editor.table.cells')}</span>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().mergeCells().run()}
          >
            <span>{$_('editor.table.merge')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().splitCell().run()}
          >
            <span>{$_('editor.table.split')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().mergeOrSplit().run()}
          >
            <span>{$_('editor.table.mergeOrSplit')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>
          <span>{$_('editor.table.row')}</span>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().addRowBefore().run()}
          >
            <span>{$_('editor.table.insertAbove')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().addRowAfter().run()}
          >
            <span>{$_('editor.table.insertBelow')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().deleteRow().run()}
            class="text-destructive hover:text-foreground data-[highlighted]:bg-destructive"
          >
            <span>{$_('editor.table.deleteRow')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>
          <span>{$_('editor.table.column')}</span>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().addColumnBefore().run()}
          >
            <span>{$_('editor.table.insertBefore')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <span>{$_('editor.table.insertAfter')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => editor.chain().focus().deleteColumn().run()}
            class="text-destructive hover:text-foreground data-[highlighted]:bg-destructive"
          >
            <span>{$_('editor.table.delete')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Item
        onclick={() => editor.chain().focus().deleteTable().run()}
        class="text-destructive hover:text-foreground data-[highlighted]:bg-destructive"
      >
        <span>{$_('editor.table.delete')}</span>
      </DropdownMenu.Item>
    {:else}
      <div class="mb-4 flex flex-col gap-1 p-1">
        {#each blocks as row}
          <div class="flex gap-1">
            {#each blocks as col}
              <Button
                variant="outline"
                role="button"
                class={cn(
                  "size-4 rounded-none bg-muted/20 p-0",
                  row <= rows && col <= cols && "bg-muted"
                )}
                title={$_('editor.table.rowsColumns', { values: { rows, cols } })}
                onmouseenter={() => {
                  cols = col;
                  rows = row;
                }}
                onclick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows, cols, withHeaderRow: false })
                    .run();
                  open = false;
                }}
              ></Button>
            {/each}
          </div>
        {/each}
      </div>
      <span class="text-xs">
        {$_('editor.table.rowsColumns', { values: { rows, cols } })}
      </span>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>

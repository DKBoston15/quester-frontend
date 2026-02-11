<script lang="ts">
  import type { TableBlock as TableBlockType } from "$lib/types/analysis";
  import { Button } from "$lib/components/ui/button";
  import ArrowUpDown from "lucide-svelte/icons/arrow-up-down";

  interface Props {
    block: TableBlockType;
  }

  const { block }: Props = $props();

  const INITIAL_ROWS = 50;
  let showAll = $state(false);
  let sortKey = $state<string | null>(null);
  let sortDir = $state<"asc" | "desc">("asc");

  let sortedRows = $derived.by(() => {
    let rows = [...block.rows];
    if (sortKey) {
      rows.sort((a, b) => {
        const va = a[sortKey!];
        const vb = b[sortKey!];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number" && typeof vb === "number") {
          return sortDir === "asc" ? va - vb : vb - va;
        }
        const sa = String(va);
        const sb = String(vb);
        return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
    }
    return rows;
  });

  let visibleRows = $derived(
    showAll ? sortedRows : sortedRows.slice(0, INITIAL_ROWS),
  );

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
  }
</script>

<div class="rounded-lg border bg-card overflow-hidden">
  {#if block.title}
    <div class="px-4 py-2 border-b bg-muted/30">
      <h4 class="text-sm font-medium">{block.title}</h4>
    </div>
  {/if}

  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b bg-muted/20">
          {#each block.columns as col}
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              {#if col.sortable !== false}
                <button
                  class="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  onclick={() => toggleSort(col.key)}
                >
                  {col.label}
                  <ArrowUpDown class="size-3 opacity-50" />
                </button>
              {:else}
                {col.label}
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each visibleRows as row}
          <tr class="border-b last:border-0 hover:bg-muted/10 transition-colors">
            {#each block.columns as col}
              {@const value = row[col.key]}
              <td
                class="px-3 py-2 {col.type === 'number' ? 'tabular-nums whitespace-nowrap text-right' : ''}"
                title={String(value ?? "")}
              >
                {#if col.type === "number"}
                  {value ?? "—"}
                {:else}
                  <div class="max-w-[250px] truncate">
                    {value ?? "—"}
                  </div>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="px-4 py-2 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
    <span>
      {visibleRows.length} of {block.rows.length} rows
    </span>
    {#if block.rows.length > INITIAL_ROWS}
      <Button
        variant="ghost"
        size="sm"
        class="text-xs h-6"
        onclick={() => (showAll = !showAll)}
      >
        {showAll ? "Show less" : `Show all ${block.rows.length}`}
      </Button>
    {/if}
  </div>

  {#if block.caption}
    <div class="px-4 py-2 text-xs text-muted-foreground italic">
      {block.caption}
    </div>
  {/if}
</div>

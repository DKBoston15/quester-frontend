<script lang="ts">
  import type { ComparisonBlock as ComparisonBlockType } from "$lib/types/analysis";
  import ArrowLeftRight from "lucide-svelte/icons/arrow-left-right";

  interface Props {
    block: ComparisonBlockType;
  }

  const { block }: Props = $props();

  function isDifferent(dimension: string): boolean {
    if (!block.highlightDifferences) return false;
    const values = block.items.map((item) =>
      String(item.dimensions[dimension] ?? ""),
    );
    return new Set(values).size > 1;
  }
</script>

<div class="rounded-lg border bg-card overflow-hidden">
  {#if block.title}
    <div class="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
      <ArrowLeftRight class="size-4 text-muted-foreground" />
      <h4 class="text-sm font-medium">{block.title}</h4>
    </div>
  {/if}

  <div class="p-4 overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b">
          <th class="text-left py-2 px-3 text-muted-foreground font-medium">
            Dimension
          </th>
          {#each block.items as item}
            <th class="text-left py-2 px-3 font-medium">
              {item.label}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each block.sharedDimensions as dimension}
          {@const different = isDifferent(dimension)}
          <tr class="border-b last:border-b-0 {different ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}">
            <td class="py-2 px-3 text-muted-foreground font-medium">
              {dimension}
            </td>
            {#each block.items as item}
              <td class="py-2 px-3 {different ? 'font-medium' : ''}">
                {item.dimensions[dimension] ?? "—"}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

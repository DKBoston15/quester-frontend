<script lang="ts">
  import { getContext } from "svelte";
  import { readable, type Readable } from "svelte/store";
  import type { Snippet } from "svelte";

  interface Props {
    content: Snippet<
      [{ width: number; height: number; xScale: any; yScale: any }]
    >;
  }

  const { content }: Props = $props();
  const ctx: any = getContext("LayerCake");

  function asStore<T>(value: unknown): Readable<T> {
    if (value && typeof (value as Readable<T>).subscribe === "function") {
      return value as Readable<T>;
    }

    if (typeof value === "function") {
      return readable((value as () => T)());
    }

    return readable(value as T);
  }

  const widthStore = asStore<number>(ctx.width);
  const heightStore = asStore<number>(ctx.height);
  const xScaleStore = asStore<any>(ctx.xScale);
  const yScaleStore = asStore<any>(ctx.yScale);
</script>

{@render content({
  width: $widthStore,
  height: $heightStore,
  xScale: $xScaleStore,
  yScale: $yScaleStore,
})}

declare module "svelte-echarts" {
  import type { SvelteComponent } from "svelte";

  export class Chart extends SvelteComponent<{
    options: Record<string, any>;
  }> {}
}

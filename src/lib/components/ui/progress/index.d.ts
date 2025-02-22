declare module "$lib/components/ui/progress" {
  import type { SvelteComponentTyped } from "svelte";

  interface ProgressProps {
    value?: number;
    class?: string;
  }

  interface ProgressIndicatorProps {
    class?: string;
    style?: string;
  }

  export class Root extends SvelteComponentTyped<ProgressProps> {}
  export class Indicator extends SvelteComponentTyped<ProgressIndicatorProps> {}
}

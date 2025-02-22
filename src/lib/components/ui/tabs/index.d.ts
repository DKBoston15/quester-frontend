declare module "$lib/components/ui/tabs" {
  import { SvelteComponent } from "svelte";

  export const Root: typeof SvelteComponent;
  export const Content: typeof SvelteComponent;
  export const List: typeof SvelteComponent;
  export const Trigger: typeof SvelteComponent;

  export const Tabs: typeof Root;
  export const TabsContent: typeof Content;
  export const TabsList: typeof List;
  export const TabsTrigger: typeof Trigger;
}

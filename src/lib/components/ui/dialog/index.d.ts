declare module "$lib/components/ui/dialog" {
  import { Dialog as DialogPrimitive } from "bits-ui";
  export const Root: typeof DialogPrimitive.Root;
  export const Portal: typeof DialogPrimitive.Portal;
  export const Overlay: typeof DialogPrimitive.Overlay;
  export const Content: typeof DialogPrimitive.Content;
  export const Title: typeof DialogPrimitive.Title;
  export const Description: typeof DialogPrimitive.Description;
  export const Close: typeof DialogPrimitive.Close;
  export const Trigger: typeof DialogPrimitive.Trigger;
}

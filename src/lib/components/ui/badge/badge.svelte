<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  export const badgeVariants = tv({
    base: "focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-red-500 bg-red-500 text-white dark:bg-transparent dark:text-red-500 hover:bg-red-100/50",
        outline: "text-foreground",
        success:
          "border-green-500 bg-green-500 text-white dark:bg-transparent dark:text-green-500 hover:bg-green-100/50",
        warning:
          "border-orange-500 bg-orange-500 text-white dark:bg-transparent dark:text-orange-500 hover:bg-orange-100/50",
        planning:
          "border-indigo-500 bg-indigo-500 text-white dark:bg-transparent dark:text-indigo-500 hover:bg-indigo-100/50",
        active:
          "border-blue-500 bg-blue-500 text-white dark:bg-transparent dark:text-blue-500 hover:bg-blue-100/50",
        review:
          "border-amber-500 bg-amber-500 text-white dark:bg-transparent dark:text-amber-500 hover:bg-amber-100/50",
        archived:
          "border-slate-500 bg-slate-500 text-white dark:bg-transparent dark:text-slate-500 hover:bg-slate-100/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
</script>

<script lang="ts">
  import type { WithElementRef } from "bits-ui";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    href,
    class: className,
    variant = "default",
    children,
    ...restProps
  }: WithElementRef<HTMLAnchorAttributes> & {
    variant?: BadgeVariant;
  } = $props();
</script>

<svelte:element
  this={href ? "a" : "span"}
  bind:this={ref}
  {href}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</svelte:element>

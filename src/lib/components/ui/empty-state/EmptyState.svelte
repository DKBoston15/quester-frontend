<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "lucide-svelte";
  import type { ComponentType } from "svelte";

  type EmptyStateVariant =
    | "data-empty"
    | "search-empty"
    | "selection-empty"
    | "completion";

  interface Props {
    title: string;
    description?: string;
    variant?: EmptyStateVariant;
    ctaText?: string;
    ctaAction?: () => void;
    ctaDisabled?: boolean;
    icon?: ComponentType;
    height?: string;
  }

  let {
    title,
    description,
    variant = "data-empty",
    ctaText,
    ctaAction,
    ctaDisabled = false,
    icon: Icon,
    height = "h-[400px]",
  }: Props = $props();

  function handleCtaClick() {
    if (ctaAction) {
      ctaAction();
    }
  }

  function getVariantStyles(variant: EmptyStateVariant) {
    switch (variant) {
      case "data-empty":
        return "border-2 border-dashed border-gray-600";
      case "search-empty":
        return "border border-gray-200";
      case "selection-empty":
        return "border border-gray-200 bg-gray-50";
      case "completion":
        return "border border-green-200 bg-green-50";
      default:
        return "border-2 border-dashed border-gray-300";
    }
  }
</script>

<div
  class="flex flex-col items-center justify-center gap-4 rounded-lg p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] {height} {getVariantStyles(
    variant
  )}"
  role="region"
  aria-label="Empty state"
>
  {#if Icon}
    <Icon class="h-12 w-12 text-muted-foreground" />
  {/if}

  <div class="text-center">
    <h3 class="text-lg font-medium text-muted-foreground">{title}</h3>
    {#if description}
      <p class="mt-2 text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>

  {#if ctaText && ctaAction}
    <Button
      variant="outline"
      onclick={handleCtaClick}
      disabled={ctaDisabled}
      class="mt-2"
      aria-label={ctaText}
    >
      <Plus class="mr-2 h-4 w-4" />
      {ctaText}
    </Button>
  {/if}
</div>

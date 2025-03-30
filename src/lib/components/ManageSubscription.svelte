<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { API_BASE_URL } from "$lib/config";
  import { CreditCard } from "lucide-svelte";

  const props = $props<{
    organizationId: string;
    isUpgradeCta?: boolean;
  }>();

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function handleManageSubscription() {
    try {
      isLoading = true;
      error = null;
      const response = await fetch(
        `${API_BASE_URL}/stripe/create-portal-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ organizationId: props.organizationId }),
        }
      );

      if (!response.ok) throw new Error("Failed to create portal session");

      const { portalUrl } = await response.json();
      window.location.href = portalUrl;
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to create portal session";
      console.error("Failed to create portal session:", err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="space-y-4">
  {#if error}
    <div class="text-red-500 dark:text-red-400 text-sm">{error}</div>
  {/if}

  <Button
    variant="outline"
    disabled={isLoading}
    onclick={handleManageSubscription}
    class="w-full border-2 border-black dark:border-dark-border  hover:bg-accent hover:text-accent-foreground"
  >
    <CreditCard class="mr-2 h-4 w-4" />
    {isLoading
      ? "Loading..."
      : props.isUpgradeCta
        ? "Upgrade Your Plan"
        : "Manage Subscription"}
  </Button>
</div>

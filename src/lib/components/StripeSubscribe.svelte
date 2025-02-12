<script lang="ts">
  import { onMount } from "svelte";
  import type { Stripe } from "@stripe/stripe-js";
  import { loadStripe } from "@stripe/stripe-js";
  import { Button } from "./ui/button";

  export let organizationId: string;
  export let priceId: string;
  export let planId: string;

  let stripe: Stripe | null = null;
  let isLoading = false;

  onMount(async () => {
    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  });

  async function handleSubscribe() {
    if (!stripe) return;

    try {
      isLoading = true;
      console.log("priceId", priceId);
      console.log("planId", planId);
      const response = await fetch(
        "http://localhost:3333/stripe/generate-checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            organizationId,
            priceId,
            planId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        console.error("Stripe checkout error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Failed to start checkout:", error);
    } finally {
      isLoading = false;
    }
  }
</script>

<Button
  onclick={handleSubscribe}
  disabled={isLoading || !stripe}
  variant="default"
  class="w-full"
>
  {#if isLoading}
    <div class="flex items-center gap-2">
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      >
        Processing...</span
      >
    </div>
  {:else}
    Subscribe Now
  {/if}
</Button>

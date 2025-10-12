<script lang="ts">
  import { onMount } from "svelte";
  import type { Stripe } from "@stripe/stripe-js";
  import { loadStripe } from "@stripe/stripe-js";
  import { api } from "$lib/services/api-client";
  import { auth } from "$lib/stores/AuthStore";

  export let organizationId: string;
  export let priceId: string;
  export let planId: string;
  export let isOwner: boolean;

  let stripe: Stripe | null = null;
  let stripeError = false;
  let isLoading = false;

  onMount(() => {
    void (async () => {
      try {
        stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      } catch (error) {
        console.error("Failed to load Stripe:", error);
        stripe = null;
        stripeError = true;
      }
    })();
  });

  async function handleSubscribe() {
    if (!stripe) return;

    try {
      isLoading = true;
      const { sessionId } = await api.post(`/stripe/generate-checkout`, {
        organizationId,
        priceId,
        planId,
        userEmail: auth.user?.email,
        isOwner: isOwner,
      });

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

<button
  onclick={handleSubscribe}
  disabled={isLoading || !stripe || stripeError}
  class="w-full text-white font-bold"
>
  {#if isLoading}
    <div class="flex items-center justify-center gap-2">
      <div
        class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
      ></div>
      <span>Processing...</span>
    </div>
  {:else if stripeError}
    Stripe Failed to Load
  {:else}
    Subscribe Now
  {/if}
</button>

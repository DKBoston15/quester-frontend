<script lang="ts">
  import { onMount } from "svelte";
  import type { Stripe } from "@stripe/stripe-js";
  import { loadStripe } from "@stripe/stripe-js";
  import { API_BASE_URL } from "$lib/config";
  import { auth } from "$lib/stores/AuthStore.svelte";

  export let organizationId: string;
  export let priceId: string;
  export let planId: string;
  export let isOwner: boolean;

  let stripe: Stripe | null = null;
  let isLoading = false;

  onMount(async () => {
    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  });

  async function handleSubscribe() {
    if (!stripe) return;

    try {
      isLoading = true;
      const response = await fetch(`${API_BASE_URL}/stripe/generate-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationId,
          priceId,
          planId,
          userEmail: auth.user?.email,
          isOwner: isOwner,
        }),
      });

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

<button
  onclick={handleSubscribe}
  disabled={isLoading || !stripe}
  class="w-full text-white font-bold"
>
  {#if isLoading}
    <div class="flex items-center justify-center gap-2">
      <div
        class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
      ></div>
      <span>Processing...</span>
    </div>
  {:else}
    Subscribe Now
  {/if}
</button>

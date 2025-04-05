<script lang="ts">
  import { navigate } from "svelte-routing";
  import { auth } from "../../lib/stores/AuthStore.svelte";
  import { DarkmodeToggle } from "$lib/components/ui/darkmode-toggle";
  import { onMount } from "svelte";
  import { API_BASE_URL } from "$lib/config";

  let isLoading = $state(true);
  let error = $state("");
  const currentOrg = $derived(auth.currentOrganization);
  const currentOrgId = $derived(auth.currentOrgId);
  let retryCount = $state(0);
  const MAX_RETRIES = 5;

  async function processSubscription() {
    if (!currentOrgId) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        setTimeout(processSubscription, Math.pow(2, retryCount - 1) * 1000);
        return;
      } else {
        error = "Could not load organization details. Please refresh the page.";
        isLoading = false;
        return;
      }
    }

    try {
      // First get the organization details to determine subscription type
      const orgResponse = await fetch(
        `${API_BASE_URL}/organizations/${currentOrgId}`,
        { credentials: "include" }
      );

      if (!orgResponse.ok) {
        throw new Error("Failed to fetch organization details");
      }

      const orgData = await orgResponse.json();
      const isTeamSubscription = orgData.subscriptionType === "organization";

      // Then sync the subscription
      const response = await fetch(`${API_BASE_URL}/stripe/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationId: currentOrgId,
          subscriptionType: isTeamSubscription ? "organization" : "personal",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync subscription");
      }

      // After successful subscription sync, continue onboarding flow
      if (isTeamSubscription) {
        // For team/org subscriptions, go to department creation (step 3)
        navigate("/onboarding", { state: { step: 3 } });
      } else {
        // For personal subscriptions, go directly to project creation (step 3)
        navigate("/onboarding", { state: { step: 3 } });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    processSubscription();
  });
</script>

<div
  class="relative min-h-screen bg-background dark:bg-dark-background transition-colors duration-300"
>
  <!-- Dark mode toggle -->
  <div class="fixed top-4 right-4 z-50">
    <DarkmodeToggle />
  </div>

  <!-- Background pattern -->
  <div
    class="absolute inset-0"
    style="background-image: radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0) dark:radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0); background-size: 20px 20px;"
  ></div>

  <!-- Decorative elements -->
  <div
    class="absolute top-20 right-20 w-4 h-4 border-2 dark:border-dark-border bg-yellow-400 dark:bg-dark-accent-yellow rotate-12 hidden sm:block"
  ></div>
  <div
    class="absolute bottom-20 left-20 w-4 h-4 border-2 dark:border-dark-border bg-blue-400 dark:bg-dark-accent-blue -rotate-12 hidden sm:block"
  ></div>

  <div class="relative mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-8 mt-12">
    <div
      class="border-2 mt-8 dark:border-dark-border bg-card dark:bg-dark-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,1)]"
    >
      <div class="mb-6 relative">
        <h2
          class=" text-3xl font-bold text-black dark:text-dark-text-primary mb-2"
        >
          Processing Your Subscription
        </h2>
        <div
          class="mt-4 h-1 w-12 bg-yellow-400 dark:bg-dark-accent-yellow"
        ></div>
      </div>

      {#if error}
        <div
          class="mb-6 p-4 border-2 border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
        >
          {error}
          <button
            class="mt-4 text-blue-600 hover:text-blue-800 underline"
            onclick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      {:else}
        <div class="text-center">
          {#if isLoading}
            <div class="flex flex-col items-center space-y-4">
              <div
                class="w-8 h-8 border-4 border-blue-400 dark:border-dark-accent-blue border-t-transparent rounded-full animate-spin"
              ></div>
              <p class="text-lg text-black dark:text-dark-text-primary">
                Please wait while we process your subscription for
                <span class="font-bold">{currentOrg?.name}</span>...
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

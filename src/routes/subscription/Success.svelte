<script lang="ts">
  import { navigate } from "svelte-routing";
  import { auth } from "../../lib/stores/AuthStore.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";

  let isLoading = true;
  let error = "";
  const currentOrg = $derived(auth.currentOrganization);
  const currentOrgId = $derived(auth.currentOrgId);

  $effect(async () => {
    if (!currentOrgId) return; // Wait until we have an orgId

    try {
      const response = await fetch("http://localhost:3333/stripe/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationId: currentOrgId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync subscription");
      }

      navigate("/dashboard");
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isLoading = false;
    }
  });
</script>

<div
  class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
>
  <Card class="mx-auto w-full max-w-md">
    <CardHeader>
      <CardTitle>Processing Subscription</CardTitle>
    </CardHeader>
    <CardContent>
      {#if isLoading}
        <div class="text-center">
          <p class="text-gray-600">
            Please wait while we process your subscription for
            {currentOrg?.name}...
          </p>
        </div>
      {:else if error}
        <div class="text-red-600">
          <p>{error}</p>
          <button
            class="mt-4 text-blue-600 hover:text-blue-800"
            onclick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

<script lang="ts">
  import { Button } from "./ui/button";

  export let organizationId: string;
  let isLoading = false;

  async function handleManageSubscription() {
    try {
      isLoading = true;
      const response = await fetch(
        "http://localhost:3333/stripe/create-portal-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ organizationId }),
        }
      );

      if (!response.ok) throw new Error("Failed to create portal session");

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Failed to create portal session:", error);
    } finally {
      isLoading = false;
    }
  }
</script>

<Button
  variant="outline"
  disabled={isLoading}
  onclick={handleManageSubscription}
>
  {isLoading ? "Loading..." : "Manage Subscription"}
</Button>

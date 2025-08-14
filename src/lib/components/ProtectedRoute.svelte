<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { auth } from "../stores/AuthStore.svelte";

  onMount(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      navigate("/");
    }
  });

  $effect(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      navigate("/");
    }
  });
</script>

{#if auth.isLoading}
  <div>Loading...</div>
{:else if auth.isAuthenticated}
  <slot />
{:else}
  <div>Redirecting...</div>
{/if}

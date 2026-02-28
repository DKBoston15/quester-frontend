<script>
  import { navigate } from "svelte-routing";
  import { auth } from "$lib/stores/AuthStore";
  import { _ } from "svelte-i18n";

  $effect(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      navigate("/");
    }
  });
</script>

{#if auth.isLoading}
  <div>{$_('emptyStates.loading')}</div>
{:else if auth.isAuthenticated}
  <slot />
{:else}
  <div>{$_('protectedRoute.redirecting')}</div>
{/if}

<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { auth } from "$lib/stores/AuthStore.svelte";

  onMount(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      navigate("/");
    }
  });
</script>

<slot />

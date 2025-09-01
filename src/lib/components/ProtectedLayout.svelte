<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { auth } from "$lib/stores/AuthStore";

  onMount(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      navigate("/");
    }
  });
</script>

<slot />
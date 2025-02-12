<!-- src/App.svelte -->
<script lang="ts">
  import "./app.css";
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { auth } from "./lib/stores/AuthStore.svelte";
  import Dashboard from "./routes/Dashboard.svelte";
  import ProtectedRoute from "./lib/components/ProtectedRoute.svelte";
  import Onboarding from "./routes/Onboarding.svelte";
  import Project from "./routes/Project.svelte";
  import PendingInvites from "$lib/components/PendingInvites.svelte";
  import Success from "./routes/subscription/Success.svelte";
  import Pricing from "./routes/Pricing.svelte";
  import { navigate } from "svelte-routing";

  const props = $props<{ url: string }>();

  onMount(() => {
    auth.verifySession();
  });

  function login() {
    window.location.href = "http://localhost:3333/auth/redirect";
  }

  function logout() {
    window.location.href = "http://localhost:3333/auth/logout";
  }

  async function checkPendingInvites() {
    if (!auth.user?.email) return false;

    const response = await fetch(
      `http://localhost:3333/invitations/pending?email=${encodeURIComponent(auth.user.email)}`,
      { credentials: "include" }
    );

    if (!response.ok) return false;

    const invitations = await response.json();
    return invitations.length > 0;
  }
</script>

<Router url={props.url}>
  <nav class="p-4 bg-gray-100">
    {#if !auth.isAuthenticated}
      <button
        onclick={login}
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Sign in with WorkOS
      </button>
    {:else if auth.user}
      <span class="mr-4">Welcome, {auth.user.firstName}!</span>
      <button
        onclick={logout}
        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    {/if}
  </nav>

  <main class="p-4">
    <Route path="/onboarding">
      <ProtectedRoute>
        {#if auth.user}
          {#await checkPendingInvites()}
            <div>Loading...</div>
          {:then hasPendingInvites}
            {#if hasPendingInvites}
              <PendingInvites />
            {:else}
              <Onboarding />
            {/if}
          {/await}
        {/if}
      </ProtectedRoute>
    </Route>
    <Route path="/dashboard">
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    </Route>
    <Route path="/org/:orgSlug/project/:projectSlug" let:params>
      <ProtectedRoute>
        <Project {params} />
      </ProtectedRoute>
    </Route>
    <Route path="/pricing">
      <ProtectedRoute>
        {#if auth.isLoading}
          <div>Loading...</div>
        {:else if !auth.currentOrgId}
          {navigate("/onboarding")}
        {:else}
          <Pricing organizationId={auth.currentOrgId} />
        {/if}
      </ProtectedRoute>
    </Route>
    <Route path="/subscription/success" component={Success} />
  </main>
</Router>

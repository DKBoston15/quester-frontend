<!-- src/App.svelte -->
<script lang="ts">
  import "./app.css";
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { auth } from "./lib/stores/AuthStore.svelte";
  import Dashboard from "./routes/Dashboard.svelte";
  import ProtectedLayout from "./lib/components/ProtectedLayout.svelte";
  import Onboarding from "./routes/Onboarding.svelte";
  import Project from "./routes/Project.svelte";
  import PendingInvites from "$lib/components/PendingInvites.svelte";
  import Success from "./routes/subscription/Success.svelte";
  import Pricing from "./routes/Pricing.svelte";
  import SignIn from "./routes/SignIn.svelte";
  import { navigate } from "svelte-routing";
  import { Toaster } from "$lib/components/ui/sonner";

  type ProjectParams = {
    projectId: string;
    view?: string;
    literatureId?: string;
  };

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

  const currentOrgName = $derived(auth.currentOrganization?.name || "");
</script>

<Router url={props.url}>
  <main class="bg-background text-foreground">
    <Toaster />
    {#if !auth.isAuthenticated && !auth.isLoading}
      <SignIn onLogin={login} />
    {:else}
      <!-- Protected Routes -->
      <!-- <nav
        class="border-b-2 border-black dark:border-white bg-background py-4 px-6"
      >
        <div class="mx-auto flex max-w-7xl items-center justify-between">
          <div class="flex items-center gap-8">
            <a href="/" class="font-mono text-2xl font-bold text-foreground"
              >Quester</a
            >
            {#if auth.isAuthenticated && currentOrgName}
              <span class="font-mono text-lg text-foreground"
                >{currentOrgName}</span
              >
            {/if}
          </div>

          <div class="flex items-center gap-6">
            {#if auth.user}
              <span class="font-mono text-foreground"
                >Welcome, {auth.user.firstName}!</span
              >
              <DarkmodeToggle />
              <button
                onclick={logout}
                class="group relative inline-flex items-center justify-center border-2 border-black dark:border-white bg-background text-foreground px-6 py-3 font-mono text-lg transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
              >
                <span class="relative">Logout</span>
              </button>
            {/if}
          </div>
        </div>
      </nav> -->

      <ProtectedLayout>
        <Route path="/onboarding">
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
        </Route>
        <Route path="/dashboard">
          <Dashboard />
        </Route>
        <Route path="/project/:projectId/literature/:literatureId" let:params>
          {#if params.projectId && params.literatureId}
            <Project
              params={{
                projectId: params.projectId,
                view: "literature",
                literatureId: params.literatureId,
              }}
            />
          {:else}
            <div>Invalid project or literature ID</div>
          {/if}
        </Route>
        <Route path="/project/:projectId/literature" let:params>
          {#if params.projectId}
            <Project
              params={{ projectId: params.projectId, view: "literature" }}
            />
          {:else}
            <div>Invalid project ID</div>
          {/if}
        </Route>
        <Route path="/project/:projectId" let:params>
          {#if params.projectId}
            <Project params={{ projectId: params.projectId }} />
          {:else}
            <div>Invalid project ID</div>
          {/if}
        </Route>
        <Route path="/project/:projectId/*" let:params>
          {#if params.projectId}
            <Project params={{ projectId: params.projectId }} />
          {:else}
            <div>Invalid project ID</div>
          {/if}
        </Route>
        <Route path="/pricing">
          {#if auth.isLoading}
            <div>Loading...</div>
          {:else if !auth.currentOrgId}
            {navigate("/onboarding")}
          {:else}
            <Pricing
              organizationId={auth.currentOrgId}
              mode="organization"
              workspaceName={currentOrgName}
              onBack={() => navigate("/dashboard")}
            />
          {/if}
        </Route>
        <Route path="/subscription/success">
          <Success />
        </Route>
      </ProtectedLayout>
    {/if}
  </main>
</Router>

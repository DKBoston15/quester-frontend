<script lang="ts">
  import "./app.css";
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { auth } from "./lib/stores/AuthStore.svelte";
  import Dashboard from "./routes/Dashboard.svelte";
  import OrganizationAnalytics from "./routes/OrganizationAnalytics.svelte";
  import ProtectedLayout from "./lib/components/ProtectedLayout.svelte";
  import Onboarding from "./routes/Onboarding.svelte";
  import Project from "./routes/Project.svelte";
  import PendingInvites from "$lib/components/PendingInvites.svelte";
  import Success from "./routes/subscription/Success.svelte";
  import Pricing from "./routes/Pricing.svelte";
  import SignIn from "./routes/SignIn.svelte";
  import { navigate } from "svelte-routing";
  import { Toaster } from "$lib/components/ui/sonner";
  import TeamManagement from "./routes/TeamManagement.svelte";
  import Settings from "./routes/Settings.svelte";
  import { api } from "$lib/services/api-client";
  import { GlobalSearchDialog } from "$lib/components/global-search";
  import AnnouncementModal from "$lib/components/announcements/AnnouncementModal.svelte";
  import { announcementStore } from "$lib/stores/AnnouncementStore.svelte";
  import { initializeFullStory } from "$lib/services/fullstory";

  const props = $props<{ url: string }>();

  // Check if the user is authenticated
  let isCheckingAuth = $state(true);

  onMount(async () => {
    // Initialize FullStory
    initializeFullStory();

    // Safety timeout - force loading to false after 10 seconds
    const safetyTimeout = setTimeout(() => {
      isCheckingAuth = false;
      // Force a re-render
      document.dispatchEvent(new Event("forceRerender"));
    }, 10000);

    // Create a promise that rejects after a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Auth verification timed out after 10 seconds"));
      }, 10000); // 10 second timeout
    });

    try {
      // Race the auth verification against the timeout
      await Promise.race([auth.verifySession(), timeoutPromise]);

      isCheckingAuth = false;

      if (!auth.isAuthenticated && window.location.pathname !== "/") {
        console.error(
          'App.svelte onMount: <<< REDIRECTING TO / >>> Condition met: !auth.isAuthenticated && window.location.pathname !== "/"'
        );
        navigate("/", { replace: true });
      } else if (auth.isAuthenticated && window.location.pathname === "/") {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Error during auth verification:", err);
      // If we timeout or have another error, force isCheckingAuth to false
      // and clear user to reset auth state
      isCheckingAuth = false;
      auth.clearUser(); // This internally sets isLoading to false
      navigate("/", { replace: true });
    } finally {
      // Ensure the safety timeout is cleared
      clearTimeout(safetyTimeout);
      // Double-check the isCheckingAuth state
      isCheckingAuth = false;
    }
  });

  function login() {
    // Keep the redirect as is since it's a browser redirect, not an API call
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/redirect`;
  }

  async function checkPendingInvites() {
    if (!auth.user?.email) return false;
    const userEmail = auth.user.email; // Store email for filtering

    try {
      const invitations = await api.get(
        `/invitations/pending?email=${encodeURIComponent(userEmail)}`
      );

      // Filter invitations to only include those for the current user's email
      const userPendingInvites = invitations.filter(
        (invite: { email: string }) => invite.email === userEmail
      );

      // Return true only if there are pending invites specifically for this user
      return userPendingInvites.length > 0;
    } catch (error) {
      console.error("Error checking pending invites:", error);
      return false;
    }
  }

  const currentOrgName = $derived(auth.currentOrganization?.name || "");
  
  // Organization owner role ID
  const ORGANIZATION_OWNER_ROLE_ID = "e820de49-d7bd-42d7-8b05-49279cee686f";
  
  // Check if user is organization owner
  const isOrganizationOwner = $derived(
    auth.currentOrganization?.organizationRoles?.some(
      (role) => role.roleId === ORGANIZATION_OWNER_ROLE_ID
    ) || false
  );

  // Initialize announcements when user is authenticated
  $effect(() => {
    if (auth.isAuthenticated && !auth.isLoading) {
      // Initialize announcement store and check for unread announcements
      announcementStore.initialize().then(() => {
        // Check for unread announcements and auto-show modal if needed
        announcementStore.checkAndShowAnnouncements();
      });
    } else if (!auth.isAuthenticated) {
      // Reset announcement store when user logs out
      announcementStore.reset();
    }
  });
</script>

{#if isCheckingAuth}
  <div class="fixed inset-0 flex flex-col items-center justify-center">
    <div
      class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"
    ></div>
    <p class="text-muted-foreground mb-2">Checking authentication...</p>
    <div class="text-xs text-center text-muted-foreground/70 max-w-md px-4">
      <p>If this persists, you can try to:</p>
      <ul class="mt-2 text-left list-disc pl-6">
        <li>Refresh the page</li>
        <li>Clear your browser cache</li>
        <li>
          <button
            class="underline text-primary"
            onclick={() => {
              isCheckingAuth = false;
              auth.clearUser();
              navigate("/", { replace: true });
            }}
          >
            Click here to reset authentication
          </button>
        </li>
      </ul>
    </div>
  </div>
{:else}
  <Router url={props.url}>
    <main class="bg-background text-foreground">
      <Toaster />
      {#if !auth.isAuthenticated && !auth.isLoading}
        <SignIn onLogin={login} />
      {:else}
        <!-- Global Search Dialog - Available across all authenticated routes -->
        <GlobalSearchDialog />

        <!-- Announcement Modal - Available across all authenticated routes -->
        <AnnouncementModal />
        <ProtectedLayout>
          <Route path="/">
            {#if auth.isAuthenticated}
              <Dashboard />
            {:else}
              <div>Redirecting...</div>
            {/if}
          </Route>
          <Route path="/dashboard">
            <Dashboard />
          </Route>
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
            {:else}
              <div>User data not loaded</div>
            {/if}
          </Route>
          <Route path="/team-management">
            <TeamManagement />
          </Route>
          <Route path="/organization-analytics">
            <OrganizationAnalytics />
          </Route>
          <Route path="/settings">
            <Settings />
          </Route>

          <!-- Project Routes -->
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
          <Route path="/project/:projectId/models/:modelId" let:params>
            {#if params.projectId && params.modelId}
              <Project
                params={{
                  projectId: params.projectId,
                  view: "models",
                  modelId: params.modelId,
                }}
              />
            {:else}
              <div>Invalid project or model ID</div>
            {/if}
          </Route>
          <Route path="/project/:projectId/models" let:params>
            {#if params.projectId}
              <Project
                params={{ projectId: params.projectId, view: "models" }}
              />
            {:else}
              <div>Invalid project ID</div>
            {/if}
          </Route>
          <Route path="/project/:projectId/outcomes/:outcomeId" let:params>
            {#if params.projectId && params.outcomeId}
              <Project
                params={{
                  projectId: params.projectId,
                  view: "outcomes",
                  outcomeId: params.outcomeId,
                }}
              />
            {:else}
              <div>Invalid project or outcome ID</div>
            {/if}
          </Route>
          <Route path="/project/:projectId/outcomes" let:params>
            {#if params.projectId}
              <Project
                params={{ projectId: params.projectId, view: "outcomes" }}
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
                isOwner={isOrganizationOwner}
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
{/if}

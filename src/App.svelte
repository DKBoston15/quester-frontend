<script lang="ts">
  import "./app.css";
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { auth } from "$lib/stores/AuthStore";
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
  import { announcementStore } from "$lib/stores/AnnouncementStore";
  import { initializeFullStory } from "$lib/services/fullstory";
  import ProcessingTray from "$lib/components/custom-ui/literature/ProcessingTray.svelte";
  import { initializeTheme } from "$lib/utils/mode-watcher";
  import { setupI18n } from "$lib/i18n";
  import { localeStore } from "$lib/stores/LocaleStore.svelte";
  import { _ } from "svelte-i18n";

  const props = $props<{ url: string }>();

  // Check if the user is authenticated
  let isCheckingAuth = $state(true);
  let i18nReady = $state(false);
  let authRetryCount = $state(0);
  let isSlowConnection = $state(false);

  const AUTH_TIMEOUT_MS = 15000; // 15 seconds per attempt
  const MAX_AUTH_RETRIES = 2;

  onMount(() => {
    let destroyed = false;

    // Initialize theme early so auth-check respects dark mode
    initializeTheme();

    // Initialize i18n
    setupI18n().then(() => {
      i18nReady = true;
      localeStore.setInitialized();
    });

    // Initialize FullStory
    initializeFullStory();

    // Safety timeout - force loading to false after all retries exhausted
    const totalTimeout = AUTH_TIMEOUT_MS * (MAX_AUTH_RETRIES + 1) + 5000;
    const safetyTimeout = setTimeout(() => {
      if (destroyed) {
        return;
      }

      isCheckingAuth = false;
      document.dispatchEvent(new Event("forceRerender"));
    }, totalTimeout);

    const runAuthCheck = async (attempt: number = 0): Promise<void> => {
      const { promise: timeoutPromise, cancel: cancelTimeout } = createTimeoutPromise(
        AUTH_TIMEOUT_MS,
        `Auth verification timed out (attempt ${attempt + 1})`
      );

      try {
        // Race the auth verification against the timeout
        await Promise.race([auth.verifySession(), timeoutPromise]);

        if (destroyed) {
          return;
        }

        // Reset slow connection indicator on success
        isSlowConnection = false;

        if (!auth.isAuthenticated && window.location.pathname !== "/") {
          navigate("/", { replace: true });
        } else if (auth.isAuthenticated && window.location.pathname === "/") {
          navigate("/dashboard", { replace: true });
        }
        // Initialize locale from user preference if authenticated
        if (auth.isAuthenticated && auth.user?.metadata?.locale) {
          localeStore.initializeFromUser(auth.user.metadata.locale);
        }
      } catch (err) {
        cancelTimeout();

        if (destroyed) {
          return;
        }

        console.warn(`Auth verification attempt ${attempt + 1} failed:`, err);

        // If we have retries left, try again
        if (attempt < MAX_AUTH_RETRIES) {
          authRetryCount = attempt + 1;
          isSlowConnection = true;
          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (!destroyed) {
            return runAuthCheck(attempt + 1);
          }
        }

        // All retries exhausted
        console.error("Auth verification failed after all retries");
        isCheckingAuth = false;
        auth.clearUser();
        navigate("/", { replace: true });
      } finally {
        cancelTimeout();

        if (!destroyed && !isSlowConnection) {
          clearTimeout(safetyTimeout);
          isCheckingAuth = false;
        }
      }
    };

    void runAuthCheck();

    return () => {
      destroyed = true;
      clearTimeout(safetyTimeout);
    };
  });

  function login() {
    // Keep the redirect as is since it's a browser redirect, not an API call
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/redirect`;
  }

  async function checkPendingInvites() {
    if (!auth.user?.email) return false;
    const userEmail = auth.user.email; // Store email for filtering

    try {
      const invitations = await api.get<Array<{email: string; id: string}>>(
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

  function createTimeoutPromise(durationMs: number, message: string) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const promise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(message));
      }, durationMs);
    });

    return {
      promise,
      cancel() {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      },
    };
  }
</script>

{#if !i18nReady}
  <!-- Simple loading state before i18n is ready -->
  <div class="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground">
    <div
      class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"
    ></div>
  </div>
{:else if isCheckingAuth}
  <div class="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground">
    <div
      class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"
    ></div>
    <p class="text-muted-foreground mb-2">
      {#if isSlowConnection}
        {$_('auth.slowConnection', { default: 'Connection is slow, retrying...' })} ({authRetryCount + 1}/{MAX_AUTH_RETRIES + 1})
      {:else}
        {$_('auth.checkingAuth')}
      {/if}
    </p>
    <div class="text-xs text-center text-muted-foreground/70 max-w-md px-4">
      <p>{$_('auth.authPersist')}</p>
      <ul class="mt-2 text-left list-disc pl-6">
        <li>{$_('auth.refreshPage')}</li>
        <li>{$_('auth.clearCache')}</li>
        <li>
          <button
            class="underline text-primary"
            onclick={() => {
              isCheckingAuth = false;
              auth.clearUser();
              navigate("/", { replace: true });
            }}
          >
            {$_('auth.resetAuth')}
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
          <!-- Persistent document processing tray -->
          <ProcessingTray />
          <Route path="/">
            {#if auth.isAuthenticated}
              <Dashboard />
            {:else}
              <div>{$_('auth.redirecting')}</div>
            {/if}
          </Route>
          <Route path="/dashboard">
            <Dashboard />
          </Route>
          <Route path="/onboarding">
            {#if auth.user}
              {#await checkPendingInvites()}
                <div>{$_('common.loading')}</div>
              {:then hasPendingInvites}
                {#if hasPendingInvites}
                  <PendingInvites />
                {:else}
                  <Onboarding />
                {/if}
              {/await}
            {:else}
              <div>{$_('common.loading')}</div>
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
              <div>{$_('errors.invalidProjectOrLiteratureId')}</div>
            {/if}
          </Route>
          <Route path="/project/:projectId/literature" let:params>
            {#if params.projectId}
              <Project
                params={{ projectId: params.projectId, view: "literature" }}
              />
            {:else}
              <div>{$_('errors.invalidProjectId')}</div>
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
              <div>{$_('errors.invalidProjectOrModelId')}</div>
            {/if}
          </Route>
          <Route path="/project/:projectId/models" let:params>
            {#if params.projectId}
              <Project
                params={{ projectId: params.projectId, view: "models" }}
              />
            {:else}
              <div>{$_('errors.invalidProjectId')}</div>
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
              <div>{$_('errors.invalidProjectOrOutcomeId')}</div>
            {/if}
          </Route>
          <Route path="/project/:projectId/outcomes" let:params>
            {#if params.projectId}
              <Project
                params={{ projectId: params.projectId, view: "outcomes" }}
              />
            {:else}
              <div>{$_('errors.invalidProjectId')}</div>
            {/if}
          </Route>
          <Route path="/project/:projectId" let:params>
            {#if params.projectId}
              <Project params={{ projectId: params.projectId }} />
            {:else}
              <div>{$_('errors.invalidProjectId')}</div>
            {/if}
          </Route>
          <Route path="/project/:projectId/*" let:params>
            {#if params.projectId}
              <Project params={{ projectId: params.projectId }} />
            {:else}
              <div>{$_('errors.invalidProjectId')}</div>
            {/if}
          </Route>
          <Route path="/pricing">
            {#if auth.isLoading}
              <div>{$_('common.loading')}</div>
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

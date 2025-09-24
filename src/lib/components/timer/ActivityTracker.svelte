<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { activitySessionStore } from '$lib/stores/ActivitySessionStore.svelte'

  let {
    currentRoute,
    projectId,
    autoStart = true
  } = $props<{
    currentRoute: string
    projectId?: string
    autoStart?: boolean
  }>()

  let previousRoute = $state('')

  // Track route changes and manage sessions accordingly
  $effect(() => {
    if (currentRoute && currentRoute !== previousRoute) {
      handleRouteChange(currentRoute)
      previousRoute = currentRoute
    }
  })

  async function handleRouteChange(newRoute: string) {
    if (!autoStart) return

    try {
      // Stop any existing session
      if (activitySessionStore.isSessionActive) {
        await activitySessionStore.stopCurrentSession('route_change')
      }

      // Start new session for the new route
      await activitySessionStore.startSession(newRoute, {
        projectId,
        autoStarted: true,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })

      console.log(`Started activity session for route: ${newRoute}`)
    } catch (error) {
      console.error('Failed to handle route change:', error)
    }
  }

  // Handle page visibility changes
  function handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, send heartbeat with hidden status
      if (activitySessionStore.isSessionActive) {
        activitySessionStore.sendHeartbeat({
          visibilityState: 'hidden',
          timestamp: new Date().toISOString()
        })
      }
    } else {
      // Page is visible again, send heartbeat with visible status
      if (activitySessionStore.isSessionActive) {
        activitySessionStore.sendHeartbeat({
          visibilityState: 'visible',
          timestamp: new Date().toISOString()
        })
      }
    }
  }

  // Handle before page unload
  function handleBeforeUnload() {
    if (activitySessionStore.isSessionActive) {
      // Use sendBeacon for reliable session end tracking
      navigator.sendBeacon('/api/activity/sessions/end', JSON.stringify({
        sessionId: activitySessionStore.currentSession?.id,
        reason: 'page_unload'
      }))
    }
  }

  // Handle window focus/blur for additional activity tracking
  function handleWindowFocus() {
    if (activitySessionStore.isSessionActive) {
      activitySessionStore.sendHeartbeat({
        windowState: 'focused',
        timestamp: new Date().toISOString()
      })
    }
  }

  function handleWindowBlur() {
    if (activitySessionStore.isSessionActive) {
      activitySessionStore.sendHeartbeat({
        windowState: 'blurred',
        timestamp: new Date().toISOString()
      })
    }
  }

  onMount(() => {
    // Set up event listeners
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
      window.addEventListener('focus', handleWindowFocus)
      window.addEventListener('blur', handleWindowBlur)
    }

    // Start initial session if route is provided and autoStart is enabled
    if (currentRoute && autoStart) {
      handleRouteChange(currentRoute)
    }

    return () => {
      // Clean up event listeners
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        window.removeEventListener('focus', handleWindowFocus)
        window.removeEventListener('blur', handleWindowBlur)
      }
    }
  })

  onDestroy(() => {
    // Stop session when component is destroyed
    if (activitySessionStore.isSessionActive) {
      activitySessionStore.stopCurrentSession('component_destroyed')
    }
  })
</script>

<!--
  This component is invisible and purely handles activity tracking logic.
  It automatically manages activity sessions based on route changes and user interactions.

  Usage:
  <ActivityTracker currentRoute={$page.route.id} projectId={project.id} />
-->

{#if activitySessionStore.error}
  <!-- Optional: Display error state for debugging -->
  <div class="activity-tracker-error hidden">
    <!-- Error: {activitySessionStore.error} -->
  </div>
{/if}

<style>
  .activity-tracker-error {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--destructive);
    color: var(--destructive-foreground);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 9999;
  }
</style>
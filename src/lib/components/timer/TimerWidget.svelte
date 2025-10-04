<script lang="ts">
  import { onMount } from 'svelte'
  import { activitySessionStore } from '$lib/stores/ActivitySessionStore.svelte'
  import { countdownTimerStore } from '$lib/stores/CountdownTimerStore.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip'
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
  import {
    Timer,
    Play,
    Pause,
    Square,
    Clock,
    ChevronDown,
    ChevronRight,
    Plus,
    BarChart3
  } from 'lucide-svelte'
  import CountdownTimer from './CountdownTimer.svelte'
  import TimerPresets from './TimerPresets.svelte'
  import TimerDashboard from './TimerDashboard.svelte'

  let { currentRoute = '', projectId = '' } = $props<{
    currentRoute?: string
    projectId?: string
  }>()

  let isExpanded = $state(false)
  let showPresets = $state(false)
  let showDashboard = $state(false)
  let currentTime = $state(new Date())

  // Update current time every second
  let timeInterval: number | null = null

  function formatDuration(ms: number): string {
    if (ms == null || isNaN(ms) || ms < 0) return '0:00'

    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function formatTimeAgo(ms: number): string {
    if (ms == null || isNaN(ms) || ms < 0) return '0m'

    const minutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h`
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  async function startQuickCountdown(minutes: number) {
    try {
      await countdownTimerStore.startCountdown({
        targetDurationMs: minutes * 60 * 1000,
        metadata: {
          projectId,
          route: currentRoute,
          quickTimer: true
        }
      })
      showPresets = false
    } catch (error) {
      console.error('Failed to start countdown:', error)
    }
  }

  onMount(() => {
    // Load initial data (gracefully handle failures)
    activitySessionStore.loadSummary(currentRoute).catch(err =>
      console.warn('Failed to load activity summary, using offline mode:', err)
    )
    countdownTimerStore.loadTimers().catch(err =>
      console.warn('Failed to load countdown timers, using offline mode:', err)
    )

    // Start time update interval
    timeInterval = window.setInterval(() => {
      currentTime = new Date()
    }, 1000)

    return () => {
      if (timeInterval) {
        clearInterval(timeInterval)
      }
    }
  })
</script>

<div class="timer-widget w-full space-y-2">
  <Sidebar.Menu class="w-full">
    <Sidebar.MenuItem class="w-full">
      <CollapsiblePrimitive.Root bind:open={isExpanded} class="w-full">
        <CollapsiblePrimitive.Trigger
          class="flex w-full items-center gap-3 rounded-md pl-6 pr-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <Timer class="h-4 w-4" />
          <span class="font-medium group-data-[collapsible=icon]:hidden">Timer</span>
          <div class="ml-auto flex items-center gap-1 group-data-[collapsible=icon]:hidden">
            {#if activitySessionStore.isSessionActive}
              <div class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            {/if}
            {#if isExpanded}
              <ChevronDown class="h-3 w-3" />
            {:else}
              <ChevronRight class="h-3 w-3" />
            {/if}
          </div>
        </CollapsiblePrimitive.Trigger>

        <CollapsiblePrimitive.Content
          class="px-4 pt-3 pb-4 space-y-3 group-data-[collapsible=icon]:hidden"
        >
          <!-- Current Session -->
          <div class="space-y-2">
            <div class="text-xs text-muted-foreground">Current Session</div>
            <div class="flex items-center justify-between">
              <span class="text-sm">
                {formatDuration(activitySessionStore.currentSessionDuration)}
              </span>
              {#if activitySessionStore.isSessionActive}
                {#if activitySessionStore.isSessionPaused}
                  <div class="flex items-center gap-1 text-xs text-yellow-600">
                    <div class="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                    Paused
                  </div>
                {:else}
                  <div class="flex items-center gap-1 text-xs text-green-600">
                    <div class="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Live
                  </div>
                {/if}
              {/if}
            </div>
          </div>

          <!-- Page Stats -->
          {#if activitySessionStore.currentPageSummary || activitySessionStore.isSessionActive}
            <div class="space-y-2">
              <div class="text-xs text-muted-foreground">This Page</div>
              <div class="text-sm flex items-center gap-1">
                {formatTimeAgo(activitySessionStore.liveCurrentPageTotal)} total
                {#if activitySessionStore.isSessionActive}
                  <div class="h-1 w-1 bg-blue-400 rounded-full animate-pulse" title="Including current session"></div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Project Total -->
          <div class="space-y-2">
            <div class="text-xs text-muted-foreground">Project Total</div>
            <div class="text-sm font-medium flex items-center gap-1">
              {formatTimeAgo(activitySessionStore.liveProjectTotal)}
              {#if activitySessionStore.isSessionActive}
                <div class="h-1 w-1 bg-blue-400 rounded-full animate-pulse" title="Including current session"></div>
              {/if}
              {#if activitySessionStore.error}
                <div class="text-xs text-amber-600 mt-1">
                  ⚠️ Offline mode
                </div>
              {/if}
            </div>
          </div>

          <!-- Active Countdown -->
          {#if countdownTimerStore.hasActiveCountdown && countdownTimerStore.activeEvent}
            <div class="pt-2 border-t border-border/50">
              <CountdownTimer event={countdownTimerStore.activeEvent} />
            </div>
          {/if}

          <!-- Quick Timer Actions -->
          <div class="border-t border-border/50 pt-2 space-y-2">
            <div class="text-xs text-muted-foreground">Quick Timers</div>

            {#if showPresets}
              <TimerPresets
                onSelectPreset={startQuickCountdown}
                onClose={() => showPresets = false}
              />
            {:else}
              <div class="grid grid-cols-3 gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs h-7"
                  onclick={() => startQuickCountdown(5)}
                >
                  5m
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs h-7"
                  onclick={() => startQuickCountdown(15)}
                >
                  15m
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs h-7"
                  onclick={() => startQuickCountdown(25)}
                >
                  25m
                </Button>
              </div>
              <div class="grid grid-cols-2 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-xs h-7"
                  onclick={() => showPresets = true}
                >
                  <Plus class="h-3 w-3 mr-1" />
                  Custom
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-xs h-7"
                  onclick={() => showDashboard = true}
                >
                  <BarChart3 class="h-3 w-3 mr-1" />
                  Stats
                </Button>
              </div>
            {/if}
          </div>
        </CollapsiblePrimitive.Content>
      </CollapsiblePrimitive.Root>
    </Sidebar.MenuItem>
  </Sidebar.Menu>

  <!-- Collapsed View - Show minimal info when sidebar is collapsed -->
  <div class="hidden group-data-[collapsible=icon]:block">
    <Tooltip.Root>
      <Tooltip.Trigger class="w-full">
        <div class="p-2 flex flex-col items-center gap-1">
          <Timer class="h-4 w-4" />
          {#if activitySessionStore.isSessionActive}
            {#if activitySessionStore.isSessionPaused}
              <div class="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
            {:else}
              <div class="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
            {/if}
          {/if}
          <div class="text-xs">
            {formatDuration(activitySessionStore.currentSessionDuration).split(':').slice(-2).join(':')}
          </div>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content side="right" sideOffset={10} class="w-64">
        <div class="space-y-2">
          <div><strong>Current Session:</strong> {formatDuration(activitySessionStore.currentSessionDuration)}</div>
          <div><strong>Page Total:</strong> {formatTimeAgo(activitySessionStore.liveCurrentPageTotal)}</div>
          <div><strong>Project Total:</strong> {formatTimeAgo(activitySessionStore.liveProjectTotal)}</div>
          {#if countdownTimerStore.hasActiveCountdown}
            <div><strong>Active Timer:</strong> Running</div>
          {/if}
        </div>
      </Tooltip.Content>
    </Tooltip.Root>
  </div>

  <!-- Timer Dashboard -->
  <TimerDashboard
    bind:open={showDashboard}
    {projectId}
  />
</div>

<style>
  .timer-widget {
    min-height: fit-content;
  }
</style>

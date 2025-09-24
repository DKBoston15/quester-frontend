<script lang="ts">
  import { onMount } from 'svelte'
  import { activitySessionStore } from '$lib/stores/ActivitySessionStore.svelte'
  import { countdownTimerStore } from '$lib/stores/CountdownTimerStore.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Tooltip from '$lib/components/ui/tooltip'
  import * as Collapsible from '$lib/components/ui/collapsible'
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
    // Load initial data
    activitySessionStore.loadSummary(currentRoute)
    countdownTimerStore.loadTimers()

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

<div class="timer-widget border-b border-border/50 pb-2">
  <Collapsible.Root bind:open={isExpanded}>
    <Collapsible.Trigger
      class="flex items-center justify-between w-full p-2 hover:bg-accent/50 rounded-sm transition-colors"
    >
      <div class="flex items-center gap-2">
        <Timer class="h-4 w-4" />
        <span class="text-sm font-medium group-data-[collapsible=icon]:hidden">Timer</span>
      </div>
      <div class="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
        {#if activitySessionStore.isSessionActive}
          <div class="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
        {/if}
        {#if isExpanded}
          <ChevronDown class="h-3 w-3" />
        {:else}
          <ChevronRight class="h-3 w-3" />
        {/if}
      </div>
    </Collapsible.Trigger>

    <Collapsible.Content class="px-2 pb-2 space-y-3">
      <!-- Current Session -->
      <div class="space-y-2">
        <div class="text-xs text-muted-foreground">Current Session</div>
        <div class="flex items-center justify-between">
          <span class="text-sm">
            {formatDuration(activitySessionStore.currentSessionDuration)}
          </span>
          {#if activitySessionStore.isSessionActive}
            <div class="flex items-center gap-1 text-xs text-green-600">
              <div class="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
              Live
            </div>
          {/if}
        </div>
      </div>

      <!-- Page Stats -->
      {#if activitySessionStore.currentPageSummary}
        <div class="space-y-2">
          <div class="text-xs text-muted-foreground">This Page</div>
          <div class="text-sm">
            {formatTimeAgo(activitySessionStore.currentPageSummary.totalDurationMs)} total
          </div>
          <div class="text-xs text-muted-foreground">
            {activitySessionStore.currentPageSummary.sessionCount} sessions
          </div>
        </div>
      {/if}

      <!-- Project Total -->
      <div class="space-y-2">
        <div class="text-xs text-muted-foreground">Project Total</div>
        <div class="text-sm font-medium">
          {formatTimeAgo(activitySessionStore.totalProjectTime)}
        </div>
      </div>

      <!-- Active Countdown -->
      {#if countdownTimerStore.hasActiveCountdown && countdownTimerStore.activeEvent}
        <div class="pt-2 border-t border-border/50">
          <CountdownTimer event={countdownTimerStore.activeEvent} />
        </div>
      {/if}

      <!-- Quick Timer Actions -->
      <div class="pt-2 border-t border-border/50 space-y-2">
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
    </Collapsible.Content>
  </Collapsible.Root>

  <!-- Collapsed View - Show minimal info when sidebar is collapsed -->
  <div class="group-data-[collapsible=icon]:block hidden">
    <Tooltip.Root>
      <Tooltip.Trigger class="w-full">
        <div class="p-2 flex flex-col items-center gap-1">
          <Timer class="h-4 w-4" />
          {#if activitySessionStore.isSessionActive}
            <div class="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
          {/if}
          <div class="text-xs">
            {formatDuration(activitySessionStore.currentSessionDuration).split(':').slice(-2).join(':')}
          </div>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content side="right" sideOffset={10} class="w-64">
        <div class="space-y-2">
          <div><strong>Current Session:</strong> {formatDuration(activitySessionStore.currentSessionDuration)}</div>
          {#if activitySessionStore.currentPageSummary}
            <div><strong>Page Total:</strong> {formatTimeAgo(activitySessionStore.currentPageSummary.totalDurationMs)}</div>
          {/if}
          <div><strong>Project Total:</strong> {formatTimeAgo(activitySessionStore.totalProjectTime)}</div>
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
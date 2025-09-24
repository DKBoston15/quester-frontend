<script lang="ts">
  import { onMount } from 'svelte'
  import { activitySessionStore } from '$lib/stores/ActivitySessionStore.svelte'
  import { countdownTimerStore } from '$lib/stores/CountdownTimerStore.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Tabs from '$lib/components/ui/tabs'
  import {
    Clock,
    Timer,
    TrendingUp,
    Calendar,
    Target,
    BarChart3
  } from 'lucide-svelte'

  let { projectId } = $props<{ projectId: string }>()

  let selectedPeriod = $state('week')

  function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function getProductivityInsights() {
    const summary = activitySessionStore.summary
    if (!summary) return []

    const insights = []
    const totalTime = summary.global.totalDurationMs
    const sessionCount = summary.global.sessionCount

    if (sessionCount > 0) {
      const avgSessionLength = totalTime / sessionCount
      insights.push({
        icon: TrendingUp,
        title: 'Average Session',
        value: formatDuration(avgSessionLength),
        description: 'Time per session'
      })
    }

    // Find most productive route
    const topRoute = summary.perRoute.sort((a, b) => b.totalDurationMs - a.totalDurationMs)[0]
    if (topRoute) {
      insights.push({
        icon: Target,
        title: 'Most Active Page',
        value: topRoute.route.split('/').pop() || 'Unknown',
        description: `${formatDuration(topRoute.totalDurationMs)} total`
      })
    }

    // Total project time
    insights.push({
      icon: Clock,
      title: 'Total Project Time',
      value: formatDuration(totalTime),
      description: `Across ${sessionCount} sessions`
    })

    return insights
  }

  function getTimerStats() {
    const events = countdownTimerStore.events
    const completedEvents = events.filter(e => e.status === 'completed')
    const totalEvents = events.length

    if (totalEvents === 0) {
      return {
        totalTimers: 0,
        completedTimers: 0,
        completionRate: 0,
        totalFocusTime: 0
      }
    }

    const completionRate = (completedEvents.length / totalEvents) * 100
    const totalFocusTime = completedEvents.reduce((sum, event) => sum + event.elapsedMs, 0)

    return {
      totalTimers: totalEvents,
      completedTimers: completedEvents.length,
      completionRate: Math.round(completionRate),
      totalFocusTime
    }
  }

  onMount(() => {
    // Load data
    activitySessionStore.loadSummary()
    countdownTimerStore.loadEvents(50)
  })

  $: insights = getProductivityInsights()
  $: timerStats = getTimerStats()
</script>

<div class="timer-stats space-y-6">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Timer Analytics</h3>
    <div class="flex gap-2">
      <Button
        size="sm"
        variant={selectedPeriod === 'day' ? 'default' : 'outline'}
        onclick={() => selectedPeriod = 'day'}
      >
        Day
      </Button>
      <Button
        size="sm"
        variant={selectedPeriod === 'week' ? 'default' : 'outline'}
        onclick={() => selectedPeriod = 'week'}
      >
        Week
      </Button>
      <Button
        size="sm"
        variant={selectedPeriod === 'month' ? 'default' : 'outline'}
        onclick={() => selectedPeriod = 'month'}
      >
        Month
      </Button>
    </div>
  </div>

  <Tabs.Root value="overview" class="w-full">
    <Tabs.List class="grid w-full grid-cols-3">
      <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
      <Tabs.Trigger value="focus">Focus Time</Tabs.Trigger>
      <Tabs.Trigger value="productivity">Productivity</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="overview" class="space-y-4">
      <!-- Activity Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each insights as insight}
          <Card.Root>
            <Card.Content class="p-4">
              <div class="flex items-center space-x-2">
                <insight.icon class="h-4 w-4 text-primary" />
                <div class="space-y-1">
                  <p class="text-sm font-medium">{insight.title}</p>
                  <p class="text-2xl font-bold">{insight.value}</p>
                  <p class="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>

      <!-- Route Breakdown -->
      {#if activitySessionStore.summary?.perRoute.length}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <BarChart3 class="h-4 w-4" />
              Time by Page
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              {#each activitySessionStore.summary.perRoute.slice(0, 5) as route}
                {@const percentage = (route.totalDurationMs / activitySessionStore.summary.global.totalDurationMs) * 100}
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center justify-between text-sm">
                      <span class="font-medium">{route.route.split('/').pop() || 'Unknown'}</span>
                      <span class="text-muted-foreground">{formatDuration(route.totalDurationMs)}</span>
                    </div>
                    <div class="mt-1 bg-secondary rounded-full h-2">
                      <div
                        class="bg-primary h-2 rounded-full transition-all duration-300"
                        style="width: {percentage}%"
                      ></div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>

    <Tabs.Content value="focus" class="space-y-4">
      <!-- Timer Performance -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Timer class="h-4 w-4" />
              Timer Performance
            </Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm">Total Timers</span>
              <span class="font-bold">{timerStats.totalTimers}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Completed</span>
              <span class="font-bold text-green-600">{timerStats.completedTimers}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Completion Rate</span>
              <span class="font-bold">{timerStats.completionRate}%</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Focus Time</span>
              <span class="font-bold">{formatDuration(timerStats.totalFocusTime)}</span>
            </div>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Target class="h-4 w-4" />
              Recent Timers
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each countdownTimerStore.events.slice(0, 5) as event}
                <div class="flex items-center justify-between text-sm">
                  <span class="truncate">
                    {event.countdownTimer?.label || 'Quick Timer'}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-muted-foreground">
                      {formatTime(event.targetDurationMs)}
                    </span>
                    <div class="w-2 h-2 rounded-full {
                      event.status === 'completed' ? 'bg-green-500' :
                      event.status === 'cancelled' ? 'bg-red-500' :
                      event.status === 'active' ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-500'
                    }"></div>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>

    <Tabs.Content value="productivity" class="space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <TrendingUp class="h-4 w-4" />
            Productivity Insights
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <!-- Productivity tips based on user data -->
          {#if timerStats.completionRate < 70}
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 class="font-medium text-yellow-800 dark:text-yellow-200">Timer Completion</h4>
              <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Your timer completion rate is {timerStats.completionRate}%. Try starting with shorter intervals to build consistency.
              </p>
            </div>
          {:else if timerStats.completionRate >= 90}
            <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 class="font-medium text-green-800 dark:text-green-200">Excellent Focus!</h4>
              <p class="text-sm text-green-700 dark:text-green-300 mt-1">
                You're completing {timerStats.completionRate}% of your timers. Consider trying longer focus sessions.
              </p>
            </div>
          {/if}

          {#if activitySessionStore.summary?.global.sessionCount > 10}
            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 class="font-medium text-blue-800 dark:text-blue-200">Active User</h4>
              <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                You've completed {activitySessionStore.summary.global.sessionCount} sessions. Your dedication is showing!
              </p>
            </div>
          {/if}

          <!-- Weekly goal suggestion -->
          <div class="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
            <h4 class="font-medium">Suggested Weekly Goal</h4>
            <p class="text-sm text-muted-foreground mt-1">
              Based on your activity, aim for {Math.max(10, Math.ceil(activitySessionStore.summary?.global.totalDurationMs / (1000 * 60) / 7) || 10)} hours this week.
            </p>
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>
  </Tabs.Root>
</div>

<style>
  .timer-stats {
    max-width: 100%;
    overflow-x: auto;
  }
</style>
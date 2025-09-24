<script lang="ts">
  import { onMount } from 'svelte'
  import { activitySessionStore } from '$lib/stores/ActivitySessionStore.svelte'
  import { countdownTimerStore } from '$lib/stores/CountdownTimerStore.svelte'
  import { literatureStore } from '$lib/stores/LiteratureStore.svelte'
  import { modelStore } from '$lib/stores/ModelStore.svelte'
  import { outcomeStore } from '$lib/stores/OutcomeStore.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import {
    Clock,
    TrendingUp,
    Target,
    BarChart3
  } from 'lucide-svelte'

  let { projectId } = $props<{ projectId: string }>()

  let selectedPeriod = $state('week')

  function formatDuration(ms: number): string {
    if (ms == null || isNaN(ms) || ms < 0) return '0m'

    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }

    // For durations less than 1 minute, show seconds
    if (minutes === 0 && totalSeconds > 0) {
      return `${totalSeconds}s`
    }

    return `${minutes}m`
  }

  function formatTime(ms: number): string {
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

  function lookupItemName(itemType: string, itemId: string): string | null {
    console.log('=== LOOKUP DEBUG ===')
    console.log('Looking up:', { itemType, itemId })

    switch (itemType) {
      case 'literature': {
        console.log('Literature store data:', literatureStore.data.length, 'items')
        const item = literatureStore.data.find(lit => lit.id === itemId)
        console.log('Found literature item:', item?.name || item?.title)
        return item?.name || item?.title || null
      }
      case 'models': {
        console.log('Model store data:', modelStore.models.length, 'items')
        const item = modelStore.models.find(model => model.id === itemId)
        console.log('Found model item:', item?.name)
        return item?.name || null
      }
      case 'outcomes': {
        console.log('Outcome store data:', outcomeStore.outcomes.length, 'items')
        const item = outcomeStore.outcomes.find(outcome => outcome.id === itemId)
        console.log('Found outcome item:', item?.name)
        return item?.name || null
      }
      default:
        console.log('Unknown item type:', itemType)
        return null
    }
  }

  function formatRouteName(route: string): string {
    if (!route) return 'Unknown'

    console.log('=== ROUTE DEBUG ===')
    console.log('Parsing route:', route)

    // Split the route into segments
    const segments = route.split('/').filter(segment => segment.length > 0)
    console.log('Route segments:', segments)

    // Look for specific route patterns
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]
      const nextSegment = segments[i + 1]

      // Check if current segment is a route type and next is likely a UUID
      const isNextUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextSegment)

      console.log(`Checking segments[${i}]: '${segment}' -> '${nextSegment}' (isUUID: ${isNextUUID})`)

      if (isNextUUID) {
        console.log('Found UUID pattern, looking up item name...')
        // Try to get the actual item name from the store
        const itemName = lookupItemName(segment, nextSegment)
        if (itemName) {
          console.log('Returning item name:', itemName)
          return itemName
        }

        console.log('No item found, using fallback...')
        // Fall back to generic names if item not found in store
        switch (segment) {
          case 'literature':
            return 'Literature'
          case 'models':
            return 'Model'
          case 'outcomes':
            return 'Outcome'
          case 'notes':
            return 'Note'
        }
      }
    }

    // Extract the last part of the route path for other cases
    const routePart = segments[segments.length - 1] || 'Unknown'

    // Check if the last segment is a UUID without a clear parent context
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routePart)

    if (isUUID) {
      // For UUIDs without clear context, show a generic name
      return 'Page'
    }

    // For simple words, capitalize the first letter
    return routePart.charAt(0).toUpperCase() + routePart.slice(1).toLowerCase()
  }

  function getProductivityInsights() {
    const summary = activitySessionStore.summary
    if (!summary) return []

    const insights = []
    const totalTime = summary.global.totalDurationMs
    const sessionCount = summary.global.sessionCount

    if (sessionCount > 0 && totalTime > 0) {
      const avgSessionLength = totalTime / sessionCount

      // If average session is less than 30 seconds, show as "No meaningful data"
      if (avgSessionLength < 30000) {
        insights.push({
          icon: TrendingUp,
          title: 'Average Session',
          value: 'Too short to track',
          description: 'Sessions under 30s'
        })
      } else {
        insights.push({
          icon: TrendingUp,
          title: 'Average Session',
          value: formatDuration(avgSessionLength),
          description: 'Time per session'
        })
      }
    } else {
      // Show placeholder when no sessions exist yet
      insights.push({
        icon: TrendingUp,
        title: 'Average Session',
        value: 'No data yet',
        description: 'Start a session to see stats'
      })
    }

    // Find most productive route
    const topRoute = [...summary.perRoute].sort((a, b) => b.totalDurationMs - a.totalDurationMs)[0]
    if (topRoute) {
      insights.push({
        icon: Target,
        title: 'Most Active Page',
        value: formatRouteName(topRoute.route),
        description: `${formatDuration(topRoute.totalDurationMs)} total`
      })
    }

    // Total project time
    insights.push({
      icon: Clock,
      title: 'Total Project Time',
      value: formatDuration(totalTime),
      description: sessionCount > 0 ? `Across ${sessionCount} sessions` : 'No sessions yet'
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

    // Load project stores if projectId is provided
    if (projectId) {
      literatureStore.loadLiterature(projectId).catch(err =>
        console.warn('Failed to load literature for timer stats:', err)
      )
      modelStore.loadModels(projectId).catch(err =>
        console.warn('Failed to load models for timer stats:', err)
      )
      outcomeStore.loadOutcomes(projectId).catch(err =>
        console.warn('Failed to load outcomes for timer stats:', err)
      )
    }
  })

  const insights = $derived(getProductivityInsights())
  const timerStats = $derived(getTimerStats())
</script>

<div class="timer-stats space-y-6">
  <div class="flex items-center justify-end">
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

  <div class="w-full space-y-4">
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
                      <span class="font-medium">{formatRouteName(route.route)}</span>
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

  </div>
</div>

<style>
  .timer-stats {
    max-width: 100%;
    overflow-x: auto;
  }
</style>
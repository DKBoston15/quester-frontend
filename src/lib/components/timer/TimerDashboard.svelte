<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Timer, BarChart3, Settings } from 'lucide-svelte'
  import TimerStats from './TimerStats.svelte'
  import TimerManagement from './TimerManagement.svelte'
  import CountdownTimer from './CountdownTimer.svelte'
  import { countdownTimerStore } from '$lib/stores/CountdownTimerStore.svelte'

  let {
    open = false,
    projectId = ''
  } = $props<{
    open?: boolean
    projectId?: string
  }>()

  let activeTab = $state('overview')
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-6xl max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Timer class="h-5 w-5" />
        Timer Dashboard
      </Dialog.Title>
      <Dialog.Description>
        Manage your timer presets, view analytics, and track your productivity.
      </Dialog.Description>
    </Dialog.Header>

    <Tabs.Root bind:value={activeTab} class="w-full mt-4">
      <Tabs.List class="grid w-full grid-cols-3">
        <Tabs.Trigger value="overview" class="flex items-center gap-2">
          <Timer class="h-4 w-4" />
          Overview
        </Tabs.Trigger>
        <Tabs.Trigger value="analytics" class="flex items-center gap-2">
          <BarChart3 class="h-4 w-4" />
          Analytics
        </Tabs.Trigger>
        <Tabs.Trigger value="manage" class="flex items-center gap-2">
          <Settings class="h-4 w-4" />
          Manage
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="overview" class="mt-6 space-y-6">
        <!-- Active Timer -->
        {#if countdownTimerStore.hasActiveCountdown && countdownTimerStore.activeEvent}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3">Active Timer</h3>
            <div class="max-w-md mx-auto">
              <CountdownTimer event={countdownTimerStore.activeEvent} />
            </div>
          </div>
        {:else}
          <!-- Quick Start Section -->
          <div class="text-center space-y-4">
            <h3 class="text-lg font-semibold">Quick Start</h3>
            <p class="text-muted-foreground">Start a timer to begin focused work</p>

            <div class="flex justify-center gap-3">
              <Button onclick={() => activeTab = 'manage'}>
                Create Timer
              </Button>
              {#if countdownTimerStore.defaultTimer}
                <Button variant="outline">
                  Start Default Timer
                </Button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Recent Activity Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 border rounded-lg">
            <div class="text-2xl font-bold">
              {countdownTimerStore.timers.length}
            </div>
            <div class="text-sm text-muted-foreground">Timer Presets</div>
          </div>

          <div class="text-center p-4 border rounded-lg">
            <div class="text-2xl font-bold">
              {countdownTimerStore.events.filter(e => e.status === 'completed').length}
            </div>
            <div class="text-sm text-muted-foreground">Completed Sessions</div>
          </div>

          <div class="text-center p-4 border rounded-lg">
            <div class="text-2xl font-bold">
              {countdownTimerStore.events.length}
            </div>
            <div class="text-sm text-muted-foreground">Total Sessions</div>
          </div>
        </div>

        <!-- Recent Timer Events -->
        {#if countdownTimerStore.events.length > 0}
          <div>
            <h4 class="font-medium mb-3">Recent Sessions</h4>
            <div class="space-y-2">
              {#each countdownTimerStore.events.slice(0, 5) as event}
                <div class="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div class="font-medium">
                      {event.countdownTimer?.label || 'Quick Timer'}
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {new Date(event.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm">
                      {Math.round(event.targetDurationMs / (1000 * 60))}m
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
          </div>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="analytics" class="mt-6">
        <TimerStats {projectId} />
      </Tabs.Content>

      <Tabs.Content value="manage" class="mt-6">
        <TimerManagement />
      </Tabs.Content>
    </Tabs.Root>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => open = false}>
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
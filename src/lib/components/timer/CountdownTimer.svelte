<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { countdownTimerStore } from '$lib/stores/CountdownTimerStore.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Progress from '$lib/components/ui/progress'
  import { Play, Pause, Square, Volume2 } from 'lucide-svelte'
  import type { CountdownEvent } from '$lib/types/timer'

  let { event } = $props<{ event: CountdownEvent }>()

  let remainingMs = $state(0)
  let isRunning = $state(false)
  let intervalId: number | null = null
  let startTime: number | null = null
  let pausedTime = $state(0)

  // Calculate initial remaining time
  function initializeTimer() {
    const elapsed = event.elapsedMs || 0
    remainingMs = Math.max(0, event.targetDurationMs - elapsed)
    isRunning = event.status === 'active'

    if (isRunning && remainingMs > 0) {
      startCountdown()
    }
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function startCountdown() {
    if (intervalId) return // Already running

    isRunning = true
    startTime = Date.now() - pausedTime

    intervalId = window.setInterval(() => {
      if (!startTime) return

      const elapsed = Date.now() - startTime
      const newRemaining = Math.max(0, event.targetDurationMs - elapsed)

      remainingMs = newRemaining

      if (newRemaining <= 0) {
        completeTimer('completed')
      }
    }, 100) // Update every 100ms for smooth countdown
  }

  function pauseCountdown() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    if (startTime) {
      pausedTime = Date.now() - startTime
    }

    isRunning = false
  }

  function stopCountdown() {
    completeTimer('cancelled')
  }

  async function completeTimer(status: 'completed' | 'cancelled' | 'expired') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    isRunning = false

    try {
      const elapsedMs = startTime
        ? Math.min(event.targetDurationMs, Date.now() - startTime)
        : event.elapsedMs || 0

      await countdownTimerStore.completeCountdown(event.id, {
        elapsedMs,
        status,
        completedAt: new Date().toISOString()
      })

      // Play sound notification if completed successfully
      if (status === 'completed') {
        playNotificationSound()
        showNotification()
      }
    } catch (error) {
      console.error('Failed to complete countdown:', error)
    }
  }

  function playNotificationSound() {
    // Play custom sound if available, otherwise use default browser notification sound
    if (event.countdownTimer?.soundAsset) {
      const audio = new Audio(event.countdownTimer.soundAsset)
      audio.play().catch(e => console.warn('Could not play custom sound:', e))
    } else {
      // Use browser's default notification sound for quick timers or timers without custom sounds
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Do1W0gBT2O2/DCeSsFKHvN8dyLPAkSZLjq45hIEg5MpePr1W0gBTuU2PK7fDKJLHfM8N+OPwsSZLTl6aNIDA9MonDr7W4gBT+N3PA9fSKKKXrN8OKLOwkSZ7nq4ZhMEQ5NpuTn1m8gBTqQ2/HKejKJLXbN8OCPPAkSZbPl66NICg9MpeTp1W0gBTuN3PDCfS2HKHrL8OGKPQsTY7Tm555KGQ5Op+Tq1GMgBTqQ2POKezCHKHfM8N+ePAsNY7Lm55xJGwxLneTo2W0gBTyN3PC6gCKOJnvK8OKEOwqTXrbj7HQ3NTO/1V4jTZKfmJhAE1IwgqJJGQdLIOPr7m4gBjmX2PDGdTOHLnrL8OCKPAoUYrjj7pMKGg1MpOTu1mkgBzCV2/DHdzCGKHrL8N6KNAsVY7Pk6ZhNEwtOouPo129cEQyOWXPj6mR5H1Mwf6VNHQtYOUdGXqPj5rOSLm5bA9ivgGJfG1m4zNw0D1lvWqPj5rdVGUNJhXGOKztyHgctjHXj5pWDBhK8ZFhqQbvS8Tv1V5KJcl6p4dkP')
      audio.play().catch(e => console.warn('Could not play default sound:', e))
    }
  }

  function showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Complete!', {
        body: `Your ${formatTime(event.targetDurationMs)} timer has finished.`,
        icon: '/favicon.ico'
      })
    }
  }

  // Request notification permission on mount
  onMount(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    initializeTimer()
  })

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })

  // Progress calculation
  const progress = $derived(((event.targetDurationMs - remainingMs) / event.targetDurationMs) * 100)
</script>

<div class="countdown-timer space-y-3">
  <div class="flex items-center justify-between">
    <div class="text-sm font-medium">
      {event.countdownTimer?.label || 'Timer'}
    </div>
    <div class="text-xs text-muted-foreground">
      {formatTime(event.targetDurationMs)}
    </div>
  </div>

  <div class="text-center">
    <div class="text-2xl font-mono font-bold">
      {formatTime(remainingMs)}
    </div>
    <Progress.Root value={progress} class="w-full mt-2" />
  </div>

  <div class="flex items-center justify-center gap-2">
    {#if isRunning}
      <Button
        size="sm"
        variant="outline"
        onclick={pauseCountdown}
        class="h-8 w-8 p-0"
      >
        <Pause class="h-3 w-3" />
      </Button>
    {:else if remainingMs > 0}
      <Button
        size="sm"
        variant="outline"
        onclick={startCountdown}
        class="h-8 w-8 p-0"
      >
        <Play class="h-3 w-3" />
      </Button>
    {/if}

    <Button
      size="sm"
      variant="destructive"
      onclick={stopCountdown}
      class="h-8 w-8 p-0"
    >
      <Square class="h-3 w-3" />
    </Button>

    {#if event.countdownTimer?.soundAsset}
      <Button
        size="sm"
        variant="ghost"
        class="h-8 w-8 p-0"
        title="Sound enabled"
      >
        <Volume2 class="h-3 w-3" />
      </Button>
    {/if}
  </div>

  {#if remainingMs <= 0 && event.status !== 'completed'}
    <div class="text-center text-sm text-green-600 font-medium">
      Timer Complete! 🎉
    </div>
  {/if}
</div>

<style>
  .countdown-timer {
    background: linear-gradient(135deg, rgba(var(--primary), 0.05) 0%, rgba(var(--secondary), 0.05) 100%);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid rgba(var(--border), 0.5);
  }
</style>
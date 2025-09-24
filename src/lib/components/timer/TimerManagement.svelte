<script lang="ts">
  import { onMount } from 'svelte'
  import { countdownTimerStore } from '$lib/stores/CountdownTimerStore.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import * as Card from '$lib/components/ui/card'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Label } from '$lib/components/ui/label'
  import { Switch } from '$lib/components/ui/switch'
  import {
    Plus,
    Timer,
    Edit,
    Trash2,
    Star,
    Play
  } from 'lucide-svelte'
  import type { CountdownTimer, CreateCountdownTimerRequest } from '$lib/types/timer'

  let showCreateDialog = $state(false)
  let editingTimer = $state<CountdownTimer | null>(null)
  let formData = $state({
    label: '',
    durationMinutes: 25,
    soundAsset: '',
    isDefault: false
  })

  function resetForm() {
    formData = {
      label: '',
      durationMinutes: 25,
      soundAsset: '',
      isDefault: false
    }
  }

  function openCreateDialog() {
    resetForm()
    editingTimer = null
    showCreateDialog = true
  }

  function openEditDialog(timer: CountdownTimer) {
    formData = {
      label: timer.label,
      durationMinutes: Math.round(timer.durationMs / (1000 * 60)),
      soundAsset: timer.soundAsset || '',
      isDefault: timer.isDefault
    }
    editingTimer = timer
    showCreateDialog = true
  }

  function formatDuration(ms: number): string {
    const minutes = Math.round(ms / (1000 * 60))
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  async function handleSubmit() {
    try {
      const timerData = {
        label: formData.label,
        durationMs: formData.durationMinutes * 60 * 1000,
        soundAsset: formData.soundAsset || undefined,
        isDefault: formData.isDefault
      }

      if (editingTimer) {
        await countdownTimerStore.updateTimer(editingTimer.id, timerData)
      } else {
        await countdownTimerStore.createTimer(timerData as CreateCountdownTimerRequest)
      }

      showCreateDialog = false
      resetForm()
    } catch (error) {
      console.error('Failed to save timer:', error)
    }
  }

  async function handleDelete(timer: CountdownTimer) {
    if (confirm(`Are you sure you want to delete "${timer.label}"?`)) {
      try {
        await countdownTimerStore.deleteTimer(timer.id)
      } catch (error) {
        console.error('Failed to delete timer:', error)
      }
    }
  }

  async function startTimer(timer: CountdownTimer) {
    try {
      await countdownTimerStore.startCountdown({
        countdownTimerId: timer.id,
        targetDurationMs: timer.durationMs,
        metadata: {
          timerLabel: timer.label,
          preset: true
        }
      })
    } catch (error) {
      console.error('Failed to start timer:', error)
    }
  }

  onMount(() => {
    countdownTimerStore.loadTimers()
  })
</script>

<div class="timer-management space-y-6">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Timer Presets</h3>
    <Button onclick={openCreateDialog} size="sm">
      <Plus class="h-4 w-4 mr-1" />
      New Timer
    </Button>
  </div>

  <!-- Timer List -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each countdownTimerStore.timers as timer (timer.id)}
      <Card.Root class="relative">
        <Card.Header class="pb-3">
          <div class="flex items-center justify-between">
            <Card.Title class="text-base flex items-center gap-2">
              <Timer class="h-4 w-4" />
              {timer.label}
              {#if timer.isDefault}
                <Star class="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {/if}
            </Card.Title>
            <div class="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onclick={() => openEditDialog(timer)}
                class="h-7 w-7 p-0"
              >
                <Edit class="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onclick={() => handleDelete(timer)}
                class="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Content class="pt-0">
          <div class="space-y-3">
            <div class="text-2xl font-mono font-bold text-center">
              {formatDuration(timer.durationMs)}
            </div>
            <Button
              onclick={() => startTimer(timer)}
              class="w-full"
              disabled={countdownTimerStore.isTimerRunning}
            >
              <Play class="h-4 w-4 mr-1" />
              Start Timer
            </Button>
          </div>
        </Card.Content>
      </Card.Root>
    {/each}

    <!-- Empty State -->
    {#if countdownTimerStore.timers.length === 0}
      <Card.Root class="col-span-full">
        <Card.Content class="p-8 text-center">
          <Timer class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 class="text-lg font-medium mb-2">No Timer Presets</h3>
          <p class="text-muted-foreground mb-4">
            Create your first timer preset to get started with focused work sessions.
          </p>
          <Button onclick={openCreateDialog}>
            <Plus class="h-4 w-4 mr-1" />
            Create Timer
          </Button>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  <!-- Create/Edit Dialog -->
  <Dialog.Root bind:open={showCreateDialog}>
    <Dialog.Content class="sm:max-w-md">
      <Dialog.Header>
        <Dialog.Title>
          {editingTimer ? 'Edit Timer' : 'Create Timer'}
        </Dialog.Title>
        <Dialog.Description>
          {editingTimer ? 'Update your timer preset.' : 'Create a new timer preset for focused work sessions.'}
        </Dialog.Description>
      </Dialog.Header>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <div class="space-y-2">
          <Label for="label">Timer Name</Label>
          <Input
            id="label"
            bind:value={formData.label}
            placeholder="e.g., Pomodoro, Deep Work"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            max="480"
            bind:value={formData.durationMinutes}
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="sound">Sound Alert (optional)</Label>
          <Input
            id="sound"
            bind:value={formData.soundAsset}
            placeholder="URL to sound file"
          />
        </div>

        <div class="flex items-center space-x-2">
          <Switch
            id="default"
            bind:checked={formData.isDefault}
          />
          <Label for="default">Set as default timer</Label>
        </div>

        <Dialog.Footer>
          <Button
            type="button"
            variant="outline"
            onclick={() => showCreateDialog = false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!formData.label.trim()}>
            {editingTimer ? 'Update' : 'Create'} Timer
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Loading/Error States -->
  {#if countdownTimerStore.isLoading}
    <div class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  {/if}

  {#if countdownTimerStore.error}
    <div class="text-center py-8">
      <p class="text-destructive">{countdownTimerStore.error}</p>
      <Button
        variant="outline"
        onclick={() => countdownTimerStore.clearError()}
        class="mt-2"
      >
        Dismiss
      </Button>
    </div>
  {/if}
</div>
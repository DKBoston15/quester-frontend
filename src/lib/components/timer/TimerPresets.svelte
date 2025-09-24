<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { X } from 'lucide-svelte'

  let {
    onSelectPreset,
    onClose
  } = $props<{
    onSelectPreset: (minutes: number) => void
    onClose: () => void
  }>()

  let customMinutes = $state('')

  const presets = [
    { label: '5 min', minutes: 5 },
    { label: '10 min', minutes: 10 },
    { label: '15 min', minutes: 15 },
    { label: '20 min', minutes: 20 },
    { label: '25 min', minutes: 25 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '60 min', minutes: 60 },
    { label: '90 min', minutes: 90 }
  ]

  function handleCustomTimer() {
    const minutes = parseInt(customMinutes)
    if (minutes > 0 && minutes <= 1440) { // Max 24 hours
      onSelectPreset(minutes)
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleCustomTimer()
    } else if (event.key === 'Escape') {
      onClose()
    }
  }
</script>

<div class="timer-presets space-y-3">
  <div class="flex items-center justify-between">
    <div class="text-xs font-medium">Select Timer</div>
    <Button
      size="sm"
      variant="ghost"
      onclick={onClose}
      class="h-6 w-6 p-0"
    >
      <X class="h-3 w-3" />
    </Button>
  </div>

  <!-- Preset Grid -->
  <div class="grid grid-cols-3 gap-1">
    {#each presets as preset}
      <Button
        size="sm"
        variant="outline"
        class="text-xs h-7"
        onclick={() => onSelectPreset(preset.minutes)}
      >
        {preset.label}
      </Button>
    {/each}
  </div>

  <!-- Custom Timer Input -->
  <div class="space-y-2">
    <div class="text-xs text-muted-foreground">Custom (minutes)</div>
    <div class="flex gap-1">
      <Input
        bind:value={customMinutes}
        placeholder="30"
        type="number"
        min="1"
        max="1440"
        class="h-7 text-xs"
        onkeydown={handleKeydown}
      />
      <Button
        size="sm"
        variant="outline"
        onclick={handleCustomTimer}
        class="h-7 px-2 text-xs"
        disabled={!customMinutes || parseInt(customMinutes) <= 0}
      >
        Start
      </Button>
    </div>
  </div>
</div>

<style>
  .timer-presets {
    background: rgba(var(--card), 1);
    border: 1px solid rgba(var(--border), 0.5);
    border-radius: 6px;
    padding: 8px;
  }
</style>
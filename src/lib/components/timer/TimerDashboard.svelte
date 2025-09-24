<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Timer } from 'lucide-svelte'
  import TimerStats from './TimerStats.svelte'

  let {
    open = $bindable(false),
    projectId = ''
  } = $props<{
    open?: boolean
    projectId?: string
  }>()
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-6xl max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Timer class="h-5 w-5" />
        Timer Analytics
      </Dialog.Title>
      <Dialog.Description>
        View your timer analytics and track your productivity.
      </Dialog.Description>
    </Dialog.Header>

    <div class="w-full mt-4">
      <TimerStats {projectId} />
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => open = false}>
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
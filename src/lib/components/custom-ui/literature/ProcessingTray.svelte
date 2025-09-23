<script lang="ts">
  import ProcessingStatus from "$lib/components/custom-ui/literature/ProcessingStatus.svelte";
  import { processingJobsStore } from "$lib/stores/ProcessingJobsStore.svelte";

  let jobs = $derived(processingJobsStore.all);

  function handleComplete(e: CustomEvent<{ jobId: string; status: string }>) {
    processingJobsStore.remove(e.detail.jobId);
  }
</script>

{#if jobs.length > 0}
  <div class="fixed bottom-4 right-4 z-[60] space-y-2 max-w-md">
    {#each jobs as jobId (jobId)}
      <ProcessingStatus {jobId} autoRefresh={true} showDetails={false} on:processing-complete={handleComplete} />
    {/each}
  </div>
{/if}


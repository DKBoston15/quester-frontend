<!-- src/routes/project/Analytics.svelte -->
<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";

  export let params: { projectId: string };
</script>

<div class="container mx-auto py-6 px-4">
  <h1 class="text-3xl font-bold mb-6">Project Analytics</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="">Literature Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Track your literature review progress.
        </p>
      </CardContent>
    </Card>

    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="">Research Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Monitor your research activity over time.
        </p>
      </CardContent>
    </Card>

    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="">Outcome Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Analyze your research outcomes and impact.
        </p>
      </CardContent>
    </Card>
  </div>
</div>

<!-- src/routes/project/Dashboard.svelte -->
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
  <h1 class="text-3xl font-mono font-bold mb-6">Project Dashboard</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="font-mono">Literature</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Track and manage your research literature.
        </p>
      </CardContent>
    </Card>

    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="font-mono">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Organize your research notes and findings.
        </p>
      </CardContent>
    </Card>

    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="font-mono">Outcomes</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          View and analyze your research outcomes.
        </p>
      </CardContent>
    </Card>
  </div>
</div>

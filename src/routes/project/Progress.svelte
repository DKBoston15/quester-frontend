<!-- src/routes/project/Progress.svelte -->
<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "lucide-svelte";

  export let params: { projectId: string };
</script>

<div class="container mx-auto py-6 px-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold">Research Progress</h1>
    <Button class="">
      <Plus class="h-4 w-4 mr-2" />
      Add Milestone
    </Button>
  </div>

  <div class="grid gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="">Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Track your research milestones and progress.
        </p>
      </CardContent>
    </Card>

    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="">No milestones set</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Add research milestones to track your progress.
        </p>
      </CardContent>
    </Card>
  </div>
</div>

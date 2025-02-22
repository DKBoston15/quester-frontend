<!-- src/routes/project/Literature.svelte -->
<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "lucide-svelte";

  export let params: { projectId: string };
</script>

<div class="container mx-auto py-6 px-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold">Literature</h1>
    <Button class="">
      <Plus class="h-4 w-4 mr-2" />
      Add Literature
    </Button>
  </div>

  <div class="mb-6">
    <Input type="text" placeholder="Search literature..." class="" />
  </div>

  <div class="grid gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="">No literature added yet</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Start by adding some research papers or articles to your project.
        </p>
      </CardContent>
    </Card>
  </div>
</div>

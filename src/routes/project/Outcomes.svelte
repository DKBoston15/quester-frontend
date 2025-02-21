<!-- src/routes/project/Outcomes.svelte -->
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
  import type { Project } from "$lib/types/auth";

  const props = $props<{ project: Project }>();
</script>

<div class="container mx-auto py-6 px-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-mono font-bold">Research Outcomes</h1>
    <Button class="font-mono">
      <Plus class="h-4 w-4 mr-2" />
      Add Outcome
    </Button>
  </div>

  <div class="mb-6">
    <Input type="text" placeholder="Search outcomes..." class="font-mono" />
  </div>

  <div class="grid gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="font-mono">No outcomes recorded</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground">
          Start documenting your research outcomes and findings.
        </p>
      </CardContent>
    </Card>
  </div>
</div>

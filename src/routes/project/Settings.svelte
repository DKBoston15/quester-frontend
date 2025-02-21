<!-- src/routes/project/Settings.svelte -->
<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";

  export let params: { projectId: string };
</script>

<div class="container mx-auto py-6 px-4">
  <h1 class="text-3xl font-mono font-bold mb-6">Project Settings</h1>

  <div class="grid gap-6">
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="font-mono">General Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="space-y-4">
          <div class="space-y-2">
            <Label for="projectName">Project Name</Label>
            <Input id="projectName" type="text" class="font-mono" />
          </div>
          <div class="space-y-2">
            <Label for="projectDescription">Project Description</Label>
            <Input id="projectDescription" type="text" class="font-mono" />
          </div>
          <Button type="submit" class="font-mono">Save Changes</Button>
        </form>
      </CardContent>
    </Card>

    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader>
        <CardTitle class="font-mono text-red-600">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" class="font-mono">Delete Project</Button>
      </CardContent>
    </Card>
  </div>
</div>

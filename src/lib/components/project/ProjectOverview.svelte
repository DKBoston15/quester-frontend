<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import * as Textarea from "$lib/components/ui/textarea";
  import * as Select from "$lib/components/ui/select";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon, Loader2Icon, WandIcon } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { toast } from "svelte-sonner";
  import { api } from "$lib/services/api-client";

  const projectStatusOptions = [
    { value: "Planning", label: "Planning" },
    { value: "In Progress", label: "In Progress" },
    { value: "Writing", label: "Writing" },
    { value: "Review", label: "Review" },
    { value: "Revision", label: "Revision" },
    { value: "Completed", label: "Completed" },
    { value: "Archived", label: "Archived" },
  ] as const;

  let editMode = $state({
    purpose: false,
    status: false,
  });

  let isPending = $state(false);
  let currentStatus = $state<string | null>(null);
  let currentPurpose = $state<string | null>(null);

  let isRewriting = $state(false);
  let customInstruction = $state("");
  let streamingContent = $state("");
  let showCustomInstruction = $state(false);

  $effect(() => {
    const project = projectStore.currentProject;
    if (project) {
      currentStatus = project.status ?? null;
      currentPurpose = project.purpose ?? null;
    }
  });

  function getBadgeVariant(status: string) {
    switch (status) {
      case "Planning":
        return "planning";
      case "In Progress":
        return "active";
      case "Writing":
      case "Review":
      case "Revision":
        return "review";
      case "Completed":
        return "success";
      case "Archived":
        return "archived";
      default:
        return "outline";
    }
  }

  function handleStatusSelect(value: string) {
    currentStatus = value;
  }

  async function saveProjectOverview() {
    if (!projectStore.currentProject?.id) return;

    isPending = true;
    try {
      await projectStore.updateProject(projectStore.currentProject.id, {
        purpose: currentPurpose,
        status: currentStatus,
      });
      editMode.purpose = false;
      editMode.status = false;
    } catch (error) {
      console.error("Failed to update project:", error);
    } finally {
      isPending = false;
    }
  }

  async function startAiRewrite() {
    if (!projectStore.currentProject?.id || !currentPurpose) return;

    const toastId = toast.loading("Rewriting purpose...");
    isRewriting = true;
    streamingContent = "";

    try {
      const response = await api.stream("/ai/rewrite-purpose", {
        method: "POST",
        body: {
          projectId: projectStore.currentProject.id,
          command: customInstruction || undefined,
        },
      });

      if (!response.ok) throw new Error("Failed to start rewrite");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text and append to streaming content
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const content = line.slice(6);
            if (content === "[DONE]") continue;
            try {
              const parsed = JSON.parse(content);
              const text = parsed.choices[0]?.delta?.content || "";
              streamingContent += text;
            } catch (e) {
              console.error("Failed to parse chunk:", e);
            }
          }
        }
      }

      // After streaming is complete, update the purpose
      currentPurpose = streamingContent;
      await saveProjectOverview();
      toast.success("Successfully rewrote purpose!", {
        id: toastId,
        description: "The new purpose has been saved.",
      });
    } catch (error) {
      console.error("Error during rewrite:", error);
      toast.error("Failed to rewrite purpose", {
        id: toastId,
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      isRewriting = false;
      showCustomInstruction = false;
      customInstruction = "";
    }
  }
</script>

<div class="space-y-6">
  <Card
    class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <CardHeader>
      <div class="flex justify-between items-center">
        <CardTitle class="">Project Overview</CardTitle>
        {#if !editMode.purpose && !editMode.status}
          <Button
            size="sm"
            onclick={() => {
              editMode.purpose = true;
              editMode.status = true;
            }}>Edit</Button
          >
        {/if}
      </div>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Purpose Section -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <Tooltip.Root>
            <Tooltip.Trigger>
              <InfoIcon class="h-5 w-5" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="text-sm max-w-xs">
                A research purpose is a statement establishing the intent of the
                study.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
          <h3 class="text-sm font-bold">Purpose Statement</h3>
          {#if !editMode.purpose && currentPurpose}
            <div class="flex gap-2 ml-auto">
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <Button
                    size="sm"
                    variant="outline"
                    class="gap-2"
                    disabled={isRewriting}
                    onclick={() =>
                      (showCustomInstruction = !showCustomInstruction)}
                  >
                    <WandIcon class="h-4 w-4" />
                    AI Rewrite
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="end">
                  <p class="text-sm max-w-xs">
                    Let AI help improve your purpose statement. You can provide
                    specific instructions or let Quester enhance it
                    automatically.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          {/if}
        </div>

        {#if showCustomInstruction}
          <div class="flex gap-2">
            <Input
              bind:value={customInstruction}
              placeholder="Optional: Guide the rewrite (e.g. 'Make it more concise' or 'Emphasize methodology')"
              class="flex-1"
            />
            <Button size="sm" onclick={startAiRewrite} disabled={isRewriting}>
              {#if isRewriting}
                <Loader2Icon class="h-4 w-4 animate-spin mr-2" />
                Rewriting...
              {:else}
                Start
              {/if}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onclick={() => {
                showCustomInstruction = false;
                customInstruction = "";
              }}
              disabled={isRewriting}
            >
              Cancel
            </Button>
          </div>
        {/if}

        {#if editMode.purpose}
          <Textarea.Textarea
            bind:value={currentPurpose}
            rows={5}
            placeholder="Enter project purpose"
            class="w-full"
          />
        {:else if isRewriting}
          <div class="relative">
            <p class="text-muted-foreground whitespace-pre-wrap">
              {streamingContent || "Generating..."}
            </p>
            <div class="absolute top-0 right-0">
              <Loader2Icon class="h-4 w-4 animate-spin" />
            </div>
          </div>
        {:else}
          <p class="text-muted-foreground whitespace-pre-wrap">
            {currentPurpose || "No purpose defined"}
          </p>
        {/if}
      </div>

      <!-- Status Section -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <Tooltip.Root>
            <Tooltip.Trigger>
              <InfoIcon class="h-5 w-5" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="text-sm max-w-xs">Current status of your project.</p>
            </Tooltip.Content>
          </Tooltip.Root>
          <h3 class="text-sm font-bold">Project Status</h3>
        </div>

        {#if editMode.status}
          <div class="grid gap-4">
            <Select.Root type="single">
              <Select.Trigger class="w-full">
                {#if currentStatus}
                  <Badge variant={getBadgeVariant(currentStatus)}
                    >{currentStatus}</Badge
                  >
                {:else}
                  <span>Select status</span>
                {/if}
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  {#each projectStatusOptions as option}
                    <Select.Item
                      value={option.value}
                      onclick={() => handleStatusSelect(option.value)}
                    >
                      <Badge variant={getBadgeVariant(option.value)}
                        >{option.label}</Badge
                      >
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
        {:else}
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-muted-foreground">Status:</span>
              {#if currentStatus}
                <Badge variant={getBadgeVariant(currentStatus)}
                  >{currentStatus}</Badge
                >
              {:else}
                <span class="text-muted-foreground">Not set</span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </CardContent>
    {#if editMode.purpose || editMode.status}
      <CardFooter class="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => {
            editMode.purpose = false;
            editMode.status = false;
          }}
          disabled={isPending}
          class="w-full"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onclick={saveProjectOverview}
          disabled={isPending}
          class="w-full"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </CardFooter>
    {/if}
  </Card>
</div>

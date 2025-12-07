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
  import { projectStore } from "$lib/stores/ProjectStore";
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

  const aiRewritePresets = [
    {
      label: "Shorten",
      tooltip: "Make this 20–40% shorter without losing meaning.",
      instruction:
        "Preset: Shorten — Make the statement 20–40% shorter and ≤240 characters while preserving key entities, methods, and outcomes. Output only the rewritten statement.",
    },
    {
      label: "Plain-Language",
      tooltip: "Swap jargon for everyday terms—keep the science.",
      instruction:
        "Preset: Plain-Language — Rewrite for non-experts (~9th–10th grade). Replace jargon with common terms, expand acronyms once, use active voice, and keep essential technical nouns. Output only the rewritten statement.",
    },
    {
      label: "SMART",
      tooltip: "Turn the goal into a measurable, time-bound objective.",
      instruction:
        "Preset: SMART — Reframe as Specific, Measurable, Achievable, Relevant, Time-bound using only details present. If metrics/timeframes are missing, use general measurable phrasing (e.g., 'within the study period') without inventing numbers. Output only the rewritten statement.",
    },
    {
      label: "Journal-Ready",
      tooltip: "Concise, neutral, manuscript-style objective.",
      instruction:
        "Preset: Journal-Ready — Rewrite in formal academic tone, concise (1–2 sentences), neutral, and outcome-focused. Include method keywords when present and avoid causal claims unless design supports them. Output only the rewritten statement.",
    },
  ] as const;

  const PURPOSE_CHAR_MIN = 120;
  const PURPOSE_CHAR_MAX = 280;

  let editMode = $state({
    purpose: false,
    status: false,
  });

  let isPending = $state(false);
  let currentStatus = $state<string | null>(null);
  let currentPurpose = $state<string | null>(null);
  let purposeCharCount = $state(0);
  let purposeWithinRange = $state(false);
  let previousPurpose = $state<string | null>(null);

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

  $effect(() => {
    const count = currentPurpose ? currentPurpose.trim().length : 0;
    purposeCharCount = count;
    purposeWithinRange = count >= PURPOSE_CHAR_MIN && count <= PURPOSE_CHAR_MAX;
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
      const trimmedPurpose = currentPurpose?.trim() ?? null;
      currentPurpose = trimmedPurpose;
      await projectStore.updateProject(projectStore.currentProject.id, {
        purpose: trimmedPurpose,
        status: currentStatus,
      });
      editMode.purpose = false;
      editMode.status = false;
      if (!isRewriting) {
        previousPurpose = null;
      }
    } catch (error) {
      console.error("Failed to update project:", error);
    } finally {
      isPending = false;
    }
  }

  function runAiPreset(instruction: string) {
    if (isRewriting) return;
    customInstruction = instruction;
    showCustomInstruction = false;
    void startAiRewrite();
  }

  async function undoLastRewrite() {
    if (!projectStore.currentProject?.id || !previousPurpose) return;

    const restoreValue = previousPurpose;
    isPending = true;
    try {
      currentPurpose = restoreValue;
      await projectStore.updateProject(projectStore.currentProject.id, {
        purpose: restoreValue,
      });
      toast.success("Restored the previous purpose.");
      previousPurpose = null;
    } catch (error) {
      console.error("Failed to restore purpose:", error);
      toast.error("Unable to restore the previous purpose.");
    } finally {
      isPending = false;
    }
  }

  async function startAiRewrite() {
    if (!projectStore.currentProject?.id || !currentPurpose || isRewriting)
      return;

    const toastId = toast.loading("Rewriting purpose...", {
      duration: Infinity,
    });
    previousPurpose = currentPurpose;
    isRewriting = true;
    streamingContent = "";

    try {
      const response = await api.stream("/ai/rewrite-purpose", {
        method: "POST",
        body: {
          projectId: projectStore.currentProject.id,
          purpose: currentPurpose,
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
  <Card>
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
                A research purpose succinctly explains why the study exists. Aim
                for one or two sentences covering the reason for conducting the
                research, the participants involved, the concepts studied, the
                methods used, and the results expected.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
          <h3 class="text-sm font-bold">Purpose Statement</h3>
        </div>

        {#if editMode.purpose}
          <div class="space-y-2">
            <Textarea.Textarea
              bind:value={currentPurpose}
              rows={5}
              placeholder="Ex: Evaluate whether weekly self-reflection prompts improve 10th-grade math performance by >= 5 points, using a randomized classroom design over eight weeks."
              class="w-full"
            />
            <div class="flex items-center justify-between text-xs">
              <span
                class={purposeWithinRange
                  ? "text-muted-foreground"
                  : "text-amber-500"}
              >
                {purposeCharCount} characters {purposeWithinRange
                  ? "✓"
                  : `(aim for ${PURPOSE_CHAR_MIN}-${PURPOSE_CHAR_MAX})`}
              </span>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              {#each aiRewritePresets as preset (preset.label)}
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      class="gap-1 text-xs"
                      disabled={isRewriting}
                      onclick={() => runAiPreset(preset.instruction)}
                    >
                      <WandIcon class="h-4 w-4" />
                      {preset.label}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="text-xs max-w-xs">{preset.tooltip}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              {/each}
              <Button
                size="sm"
                variant="ghost"
                class="text-xs"
                disabled={isRewriting}
                onclick={() => (showCustomInstruction = !showCustomInstruction)}
              >
                Custom prompt
              </Button>
            </div>
            {#if showCustomInstruction}
              <div class="flex flex-wrap gap-2">
                <Input
                  bind:value={customInstruction}
                  placeholder="e.g. highlight data sources and trim filler"
                  class="flex-1 min-w-[220px]"
                />
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    onclick={startAiRewrite}
                    disabled={isRewriting || !customInstruction.trim()}
                  >
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
              </div>
            {/if}
          </div>
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

        {#if previousPurpose && !isRewriting}
          <div class="text-xs text-muted-foreground">
            Purpose updated with Quester.
            <button
              type="button"
              class="ml-1 font-medium underline hover:text-foreground disabled:opacity-50"
              onclick={undoLastRewrite}
              disabled={isPending}
            >
              Undo
            </button>
          </div>
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
            <div class="flex items-center gap-3">
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
      <CardFooter class="flex justify-end gap-3 border-t">
        <Button
          variant="outline"
          onclick={() => {
            editMode.purpose = false;
            editMode.status = false;
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onclick={saveProjectOverview} disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      </CardFooter>
    {/if}
  </Card>
</div>

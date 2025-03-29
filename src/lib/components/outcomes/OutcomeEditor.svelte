<!-- src/lib/components/outcomes/OutcomeEditor.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { outcomeStore } from "$lib/stores/OutcomeStore.svelte";
  import ShadEditor from "$lib/components/shad-editor/shad-editor.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Badge } from "$lib/components/ui/badge";
  import { auth } from "$lib/stores/AuthStore.svelte";

  interface Outcome {
    id: string;
    name: string;
    projectId: string;
    type: string;
    content: string | null;
    sectionType: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string;
  }

  interface OutcomeResponse {
    message: string;
    outcome: Outcome;
  }

  // Helper function to parse content
  function parseContent(rawContent: any) {
    if (!rawContent) {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };
    }

    try {
      if (typeof rawContent === "string") {
        return JSON.parse(rawContent);
      }
      return rawContent;
    } catch (e) {
      console.error("Error parsing content:", e);
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };
    }
  }

  const props = $props<{
    outcome: Outcome;
    onDelete: () => void;
  }>();

  let showDeleteDialog = $state(false);
  let content = $state(parseContent(props.outcome.content));
  let name = $state(props.outcome.name);
  let isEditing = $state(false);
  let saveTimeout: NodeJS.Timeout;
  let lastSavedContent = $state(JSON.stringify(content));
  let currentOutcome = $state<Outcome>({
    id: props.outcome.id,
    name: props.outcome.name,
    projectId: props.outcome.projectId,
    type: props.outcome.type || "QUESTION",
    content: props.outcome.content,
    sectionType: props.outcome.sectionType,
    createdAt: props.outcome.createdAt,
    updatedAt: props.outcome.updatedAt,
    userId: props.outcome.userId || auth.user?.id?.toString(),
  });

  // Auto-save functionality
  $effect(() => {
    if (!currentOutcome) return;

    const currentContentString = JSON.stringify(content);
    const hasContentChanged = currentContentString !== lastSavedContent;
    const hasNameChanged = name !== currentOutcome.name;

    if (hasContentChanged || hasNameChanged) {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        try {
          if (!currentOutcome.id) {
            console.error("Cannot auto-save outcome: No outcome ID provided");
            return;
          }

          const response = await outcomeStore.updateOutcome(currentOutcome.id, {
            content: currentContentString,
            name,
            type: currentOutcome.type,
          });

          // Ensure we maintain all fields when updating currentOutcome
          currentOutcome = {
            id: response.outcome.id,
            name: response.outcome.name,
            projectId: response.outcome.projectId,
            type: response.outcome.type || currentOutcome.type,
            content: response.outcome.content,
            sectionType: response.outcome.sectionType,
            createdAt: response.outcome.createdAt || currentOutcome.createdAt,
            updatedAt: response.outcome.updatedAt || currentOutcome.updatedAt,
            userId: response.outcome.userId || currentOutcome.userId,
          };
          lastSavedContent = currentContentString;
        } catch (err) {
          console.error("Failed to auto-save outcome:", err);
        }
      }, 1000);
    }
  });

  function getTypeColor(type: string | undefined): string {
    if (!type) return "bg-gray-500 dark:bg-gray-700";

    switch (type.toUpperCase()) {
      case "QUESTION":
        return "bg-blue-500 dark:bg-blue-700";
      case "FINDING":
        return "bg-green-500 dark:bg-green-700";
      case "GAP":
        return "bg-yellow-500 dark:bg-yellow-700";
      case "LINK":
        return "bg-purple-500 dark:bg-purple-700";
      default:
        return "bg-gray-500 dark:bg-gray-700";
    }
  }
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <header
    class="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        {#if isEditing}
          <input
            type="text"
            bind:value={name}
            class="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1"
            onblur={() => (isEditing = false)}
            onkeydown={(e) => e.key === "Enter" && (isEditing = false)}
          />
        {:else}
          <h1 class="text-2xl font-bold rounded px-1">
            {name}
          </h1>
        {/if}
        {#if currentOutcome?.type}
          <Badge class={getTypeColor(currentOutcome.type)}>
            {currentOutcome.type}
          </Badge>
        {/if}
      </div>
    </div>
    {#if currentOutcome?.createdAt && currentOutcome?.updatedAt}
      <div class="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
        <span
          >Created {new Date(
            currentOutcome.createdAt
          ).toLocaleDateString()}</span
        >
        <span>•</span>
        <span
          >Updated {new Date(
            currentOutcome.updatedAt
          ).toLocaleDateString()}</span
        >
      </div>
    {/if}
  </header>

  <!-- Editor -->
  <div class="flex-1 overflow-y-auto p-4">
    <ShadEditor
      {content}
      on:contentChange={(e) => {
        content = e.detail;
      }}
      placeholder="Start writing your outcome..."
    />
  </div>
</div>

<!-- Delete Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content
    class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Outcome</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this outcome? This action cannot be
        undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <div class="flex justify-end gap-2">
        <Button
          variant="outline"
          onclick={() => (showDeleteDialog = false)}
          class="border-2 border-black dark:border-dark-border"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onclick={() => {
            showDeleteDialog = false;
            props.onDelete();
          }}
          class="border-2 border-destructive dark:border-destructive"
        >
          Delete
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

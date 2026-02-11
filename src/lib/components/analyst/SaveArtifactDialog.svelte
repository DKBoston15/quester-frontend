<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { createArtifact } from "$lib/services/analysis-api";
  import type { AnalysisBlock } from "$lib/types/analysis";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import Bookmark from "lucide-svelte/icons/bookmark";
  import Loader2 from "lucide-svelte/icons/loader-2";

  interface Props {
    block: AnalysisBlock;
    projectId: string;
    messageId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: () => void;
  }

  const { block, projectId, messageId, open, onOpenChange, onSaved }: Props =
    $props();

  let title = $state("");
  let tags = $state("");
  let saving = $state(false);
  let error = $state<string | null>(null);

  function getDefaultTitle(): string {
    if ("title" in block && block.title) return block.title;
    if (block.type === "metric") return "Metrics";
    if (block.type === "citation") return "Citations";
    return `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} block`;
  }

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      title = getDefaultTitle();
      tags = "";
      error = null;
    }
    onOpenChange(isOpen);
  }

  async function handleSave() {
    if (!title.trim()) {
      error = "Title is required";
      return;
    }

    saving = true;
    error = null;

    try {
      const { id: _id, ...blockData } = block;
      await createArtifact({
        projectId,
        sessionId: analystStore.currentSessionId ?? undefined,
        messageId,
        title: title.trim(),
        blockType: block.type,
        blockData,
        queryContext: { blockId: block.id },
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onSaved?.();
      handleOpen(false);
    } catch (err: any) {
      error = err.message ?? "Failed to save artifact";
    } finally {
      saving = false;
    }
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Save as Artifact</Dialog.Title>
      <Dialog.Description>
        Save this {block.type} block to your artifact collection for later
        reference.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Label for="artifact-title">Title</Label>
        <Input
          id="artifact-title"
          bind:value={title}
          placeholder="Artifact title"
        />
      </div>

      <div class="grid gap-2">
        <Label for="artifact-tags">Tags (comma-separated)</Label>
        <Input
          id="artifact-tags"
          bind:value={tags}
          placeholder="e.g. demographics, year-range, key-finding"
        />
      </div>

      {#if error}
        <p class="text-sm text-destructive">{error}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => handleOpen(false)}>
        Cancel
      </Button>
      <Button onclick={handleSave} disabled={saving}>
        {#if saving}
          <Loader2 class="mr-2 size-4 animate-spin" />
          Saving...
        {:else}
          <Bookmark class="mr-2 size-4" />
          Save
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

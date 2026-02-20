<script lang="ts">
  import { slide, fade } from "svelte/transition";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import Plus from "lucide-svelte/icons/plus";
  import Search from "lucide-svelte/icons/search";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";

  interface Props {
    onSelectSession?: (sessionId: string) => void;
    onNewSession?: () => void;
  }

  const { onSelectSession, onNewSession }: Props = $props();

  let sessions = $derived(analystStore.sessions);
  let currentSessionId = $derived(analystStore.currentSessionId);
  let searchQuery = $state("");
  let showDeleteDialog = $state(false);
  let sessionToDelete = $state<string | null>(null);

  let filteredSessions = $derived.by(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) =>
      (s.title || "").toLowerCase().includes(q),
    );
  });

  function handleDeleteSession(sessionId: string, event: MouseEvent) {
    event.stopPropagation();
    sessionToDelete = sessionId;
    showDeleteDialog = true;
  }

  async function confirmDelete() {
    if (!sessionToDelete) return;
    await analystStore.deleteSession(sessionToDelete);
    showDeleteDialog = false;
    sessionToDelete = null;
  }

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(dateStr));
  }
</script>

<div
  class="w-72 border-r bg-background flex-shrink-0 flex flex-col overflow-hidden"
  transition:slide={{ axis: "x", duration: 200 }}
>
  <div class="p-3 border-b space-y-2">
    <div class="flex items-center justify-between">
      <h3
        class="font-semibold text-sm text-muted-foreground uppercase tracking-wide"
      >
        Sessions
      </h3>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        onclick={() => onNewSession?.()}
        title="New conversation"
      >
        <Plus class="size-4" />
      </Button>
    </div>
    <div class="relative">
      <Search
        class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
      />
      <Input
        class="h-8 text-xs pl-8"
        placeholder="Search sessions..."
        bind:value={searchQuery}
      />
    </div>
  </div>

  <div class="flex-1 overflow-y-auto p-2 space-y-1">
    {#if filteredSessions.length === 0}
      <p class="text-sm text-muted-foreground text-center py-6">
        {searchQuery
          ? "No matching sessions."
          : "No sessions yet. Start a conversation!"}
      </p>
    {:else}
      {#each filteredSessions as session (session.id)}
        <button
          class="w-full p-2.5 text-left rounded-lg border hover:bg-muted/50 transition-colors group {currentSessionId === session.id ? 'bg-muted border-primary' : ''}"
          onclick={() => onSelectSession?.(session.id)}
          transition:fade={{ duration: 150 }}
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {session.title || "Untitled session"}
              </div>
              <div class="text-xs text-muted-foreground mt-0.5">
                {formatDate(session.updatedAt)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onclick={(e: MouseEvent) => handleDeleteSession(session.id, e)}
            >
              <Trash2 class="size-3" />
            </Button>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</div>

<!-- Delete Confirmation -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Session</AlertDialog.Title>
      <AlertDialog.Description>
        This will permanently delete this analysis session and all its messages.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDelete}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

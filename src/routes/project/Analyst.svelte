<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import ConversationThread from "$lib/components/analyst/ConversationThread.svelte";
  import InputArea from "$lib/components/analyst/InputArea.svelte";
  import SessionSidebar from "$lib/components/analyst/SessionSidebar.svelte";
  import ArtifactPanel from "$lib/components/analyst/ArtifactPanel.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import Microscope from "lucide-svelte/icons/microscope";
  import History from "lucide-svelte/icons/history";
  import Plus from "lucide-svelte/icons/plus";
  import BookmarkCheck from "lucide-svelte/icons/bookmark-check";

  let showSidebar = $state(false);
  let showArtifactPanel = $state(false);

  let isStreaming = $derived(analystStore.isStreaming);

  const projectId = $derived(projectStore.currentProject?.id);

  onMount(() => {
    if (projectId) {
      analystStore.loadSessions(projectId);
    }
  });

  onDestroy(() => {
    analystStore.abort();
  });

  async function handleSend(message: string) {
    if (!projectId) return;
    await analystStore.sendQuery(projectId, message);
    await analystStore.loadSessions(projectId);
  }

  function handleSuggestionClick(text: string) {
    handleSend(text);
  }

  function handleAbort() {
    analystStore.abort();
  }

  function handleNewSession() {
    analystStore.startNewSession();
  }

  async function handleSelectSession(sessionId: string) {
    await analystStore.loadSession(sessionId);
    showSidebar = false;
  }
</script>

<Card.Root class="flex flex-col h-full border-0 rounded-none">
  <!-- Header -->
  <Card.Header
    class="px-6 py-4 flex w-full justify-between border-b bg-background"
  >
    <div class="flex justify-between items-center gap-3">
      <div class="flex items-center gap-3">
        <div
          class="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg"
        >
          <Microscope class="h-6 w-6 text-white" />
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold">Research Analyst</span>
          <span class="text-sm text-muted-foreground hidden sm:inline">
            · Analyze your research data
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={() => (showArtifactPanel = true)}
          title="Saved artifacts"
        >
          <BookmarkCheck class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">Artifacts</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onclick={() => (showSidebar = !showSidebar)}
          class={showSidebar ? "bg-secondary" : ""}
        >
          <History class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">Sessions</span>
        </Button>
        <Button variant="outline" size="sm" onclick={handleNewSession}>
          <Plus class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">New</span>
        </Button>
      </div>
    </div>
  </Card.Header>

  <div class="flex-1 overflow-hidden relative">
    <div class="flex h-full">
      <!-- Session Sidebar -->
      {#if showSidebar}
        <SessionSidebar
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
        />
      {/if}

      <!-- Main Conversation Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <ConversationThread
          {projectId}
          onSuggestionClick={handleSuggestionClick}
        />

        <div class="border-t bg-background p-4">
          <InputArea
            onSend={handleSend}
            onAbort={handleAbort}
            {isStreaming}
          />
        </div>
      </div>
    </div>
  </div>
</Card.Root>

<!-- Artifact Panel (Sheet sidebar) -->
{#if projectId}
  <ArtifactPanel {projectId} open={showArtifactPanel} onOpenChange={(v) => (showArtifactPanel = v)} />
{/if}

<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { analystStore } from "$lib/stores/AnalystStore.svelte";
  import { researchQuestionsStore } from "$lib/stores/ResearchQuestionsStore.svelte";
  import ConversationThread from "$lib/components/analyst/ConversationThread.svelte";
  import InputArea from "$lib/components/analyst/InputArea.svelte";
  import SessionSidebar from "$lib/components/analyst/SessionSidebar.svelte";
  import ArtifactPanel from "$lib/components/analyst/ArtifactPanel.svelte";
  import LiteratureScopeBar from "$lib/components/analyst/LiteratureScopeBar.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import Microscope from "lucide-svelte/icons/microscope";
  import History from "lucide-svelte/icons/history";
  import Plus from "lucide-svelte/icons/plus";
  import BookmarkCheck from "lucide-svelte/icons/bookmark-check";
  import GraduationCap from "lucide-svelte/icons/graduation-cap";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  const t = (key: string, options?: { values?: Record<string, unknown> }) =>
    get(_)(key, options);

  let showSidebar = $state(false);
  let showArtifactPanel = $state(false);

  let isStreaming = $derived(analystStore.isStreaming);

  const projectId = $derived(projectStore.currentProject?.id);

  onMount(() => {
    if (projectId) {
      analystStore.loadSessions(projectId);
      loadResearchQuestions(projectId);
    }
  });

  onDestroy(() => {
    analystStore.abort();
  });

  async function loadResearchQuestions(pid: string) {
    await researchQuestionsStore.loadQuestions(pid);
    analystStore.setAvailableResearchQuestions(researchQuestionsStore.questions);
  }

  // Reload research questions when project changes
  $effect(() => {
    if (projectId) {
      loadResearchQuestions(projectId);
    }
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

  // Factory function for driver.js tour with i18n
  function createDriverObj() {
    return driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#analyst-header",
          popover: {
            title: t("tours.analyst.header.title"),
            description: t("tours.analyst.header.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#analyst-scope-bar",
          popover: {
            title: t("tours.analyst.scopeBar.title"),
            description: t("tours.analyst.scopeBar.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#analyst-scope-bar",
          popover: {
            title: t("tours.analyst.rqFilter.title"),
            description: t("tours.analyst.rqFilter.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#analyst-input-area",
          popover: {
            title: t("tours.analyst.inputArea.title"),
            description: t("tours.analyst.inputArea.description"),
            side: "top",
            align: "center",
          },
        },
        {
          element: "#analyst-conversation",
          popover: {
            title: t("tours.analyst.conversation.title"),
            description: t("tours.analyst.conversation.description"),
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#analyst-sessions-toggle",
          popover: {
            title: t("tours.analyst.sessions.title"),
            description: t("tours.analyst.sessions.description"),
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#analyst-artifacts-button",
          popover: {
            title: t("tours.analyst.artifacts.title"),
            description: t("tours.analyst.artifacts.description"),
            side: "bottom",
            align: "end",
          },
        },
      ],
    });
  }
</script>

<Card.Root class="flex flex-col h-full border-0 rounded-none">
  <!-- Header -->
  <Card.Header
    id="analyst-header"
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
          id="analyst-artifacts-button"
          variant="outline"
          size="sm"
          onclick={() => (showArtifactPanel = true)}
          title="Saved artifacts"
        >
          <BookmarkCheck class="h-4 w-4 mr-2" />
          <span class="hidden sm:inline">Artifacts</span>
        </Button>
        <Button
          id="analyst-sessions-toggle"
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
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button variant="outline" size="sm" onclick={() => createDriverObj().drive()}>
                <GraduationCap class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">{$_("dashboard.tour")}</span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>{$_("common.tutorial")}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
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
        <div id="analyst-conversation" class="flex-1 overflow-hidden">
          <ConversationThread
            {projectId}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        <div class="border-t bg-background px-4 pt-2 pb-4 space-y-2">
          <div id="analyst-scope-bar">
            <LiteratureScopeBar {projectId} disabled={isStreaming} />
          </div>
          <div id="analyst-input-area">
            <InputArea
              onSend={handleSend}
              onAbort={handleAbort}
              {isStreaming}
            />
          </div>
        </div>
      </div>

      <!-- Artifact Panel Sidebar -->
      {#if showArtifactPanel && projectId}
        <ArtifactPanel {projectId} open={showArtifactPanel} onOpenChange={(v) => (showArtifactPanel = v)} />
      {/if}
    </div>
  </div>
</Card.Root>

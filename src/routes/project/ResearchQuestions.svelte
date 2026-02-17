<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { projectStore } from "$lib/stores/ProjectStore";
  import {
    researchQuestionsStore,
    type ResearchQuestion,
    type ResearchQuestionStatus,
    type ResearchQuestionVersion,
    type DesignAlignmentScore,
  } from "$lib/stores/ResearchQuestionsStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Badge } from "$lib/components/ui/badge";
  import { Progress } from "$lib/components/ui/progress";
  import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/components/ui/tabs";
  import * as Card from "$lib/components/ui/card";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Select from "$lib/components/ui/select";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import QuestionCard from "$lib/components/research-questions/QuestionCard.svelte";
  import QuestionCreationGuide from "$lib/components/research-questions/QuestionCreationGuide.svelte";
  import DesignAlignmentPanel from "$lib/components/research-questions/DesignAlignmentPanel.svelte";
  import PurposeAlignmentPanel from "$lib/components/research-questions/PurposeAlignmentPanel.svelte";
  import CoherencePanel from "$lib/components/research-questions/CoherencePanel.svelte";
  import ConnectedLiteraturePanel from "$lib/components/research-questions/ConnectedLiteraturePanel.svelte";
  import {
    Plus,
    Search,
    Info,
    FileText,
    Target,
    BookOpen,
    History,
    Trash2,
    Save,
    X,
    Sparkles,
    RefreshCw,
    Circle,
    ChartBar,
  } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  const t = (key: string, options?: { values?: Record<string, unknown> }) =>
    get(_)(key, options);

  // State
  let searchQuery = $state("");
  let statusFilter = $state<ResearchQuestionStatus | "all">("all");
  let activeTab = $state("detail");
  let isCreating = $state(false);
  let isEditing = $state(false);
  let showDeleteDialog = $state(false);
  let questionToDelete = $state<string | null>(null);

  // Edit form state
  let editQuestion = $state("");
  let editDescription = $state("");
  let editStatus = $state<ResearchQuestionStatus>("draft");

  // New question form state
  let newQuestion = $state("");
  let newDescription = $state("");

  // Derived state
  let filteredQuestions = $derived.by(() => {
    let result = researchQuestionsStore.questions;

    if (statusFilter !== "all") {
      result = result.filter((q) => q.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.question.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query),
      );
    }

    return result;
  });

  let selectedQuestion = $derived(researchQuestionsStore.selectedQuestion);
  let versions = $derived(researchQuestionsStore.versions);
  let isLoading = $derived(researchQuestionsStore.isLoading);
  let streamingAnalysis = $derived(researchQuestionsStore.streamingAnalysis);

  // Load questions on mount
  onMount(() => {
    loadQuestions();
  });

  onDestroy(() => {
    researchQuestionsStore.reset();
  });

  // Reload when project changes
  $effect(() => {
    const pid = projectStore.currentProject?.id;
    if (pid) {
      loadQuestions();
    }
  });

  async function loadQuestions() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId) return;
    await researchQuestionsStore.loadQuestions(projectId);
  }

  function selectQuestion(question: ResearchQuestion) {
    researchQuestionsStore.setSelectedQuestion(question);
    isEditing = false;
    isCreating = false;
    activeTab = "detail";
  }

  function startEditing() {
    if (!selectedQuestion) return;
    editQuestion = selectedQuestion.question;
    editDescription = selectedQuestion.description;
    editStatus = selectedQuestion.status;
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
  }

  async function saveEdit() {
    if (!selectedQuestion) return;
    await researchQuestionsStore.updateQuestion(selectedQuestion.id, {
      question: editQuestion,
      description: editDescription,
      status: editStatus,
    });
    isEditing = false;
  }

  function startCreating() {
    isCreating = true;
    newQuestion = "";
    newDescription = "";
    researchQuestionsStore.setSelectedQuestion(null);
  }

  function cancelCreating() {
    isCreating = false;
  }

  async function createQuestion() {
    const projectId = projectStore.currentProject?.id;
    if (!projectId || !newQuestion.trim()) return;

    await researchQuestionsStore.createQuestion(projectId, {
      question: newQuestion.trim(),
      description: newDescription.trim(),
      status: "draft",
    });
    isCreating = false;
  }

  function confirmDelete(id: string) {
    questionToDelete = id;
    showDeleteDialog = true;
  }

  async function executeDelete() {
    if (!questionToDelete) return;
    await researchQuestionsStore.deleteQuestion(questionToDelete);
    showDeleteDialog = false;
    questionToDelete = null;
  }

  let isAnalyzingAll = $state(false);

  async function handleAnalyzeAlignment() {
    if (!selectedQuestion) return;
    activeTab = "analysis";
    await researchQuestionsStore.analyzeAlignment(selectedQuestion.id);
  }

  async function handleAnalyzeAll() {
    if (!selectedQuestion) return;
    isAnalyzingAll = true;
    try {
      await researchQuestionsStore.analyzePurposeAlignment(selectedQuestion.id);
      await researchQuestionsStore.analyzeAlignment(selectedQuestion.id);
      await researchQuestionsStore.analyzeCoherence(selectedQuestion.id);
    } finally {
      isAnalyzingAll = false;
    }
  }

  async function loadVersions() {
    if (!selectedQuestion) return;
    await researchQuestionsStore.loadVersionHistory(selectedQuestion.id);
  }

  function handleTabChange(value: string) {
    activeTab = value;
    if (value === "versions" && selectedQuestion) {
      loadVersions();
    }
  }

  // Helpers
  function getStatusBadgeVariant(
    status: ResearchQuestionStatus,
  ): "default" | "active" | "archived" {
    switch (status) {
      case "draft":
        return "default";
      case "active":
        return "active";
      case "archived":
        return "archived";
      default:
        return "default";
    }
  }

  function getAlignmentColor(score: number): string {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getAlignmentLabel(score: number): string {
    if (score >= 70) return "High";
    if (score >= 40) return "Medium";
    return "Low";
  }

  function getAverageAlignment(scores: DesignAlignmentScore | null): number {
    if (!scores) return 0;
    return Math.round(
      (scores.researchDesign +
        scores.samplingDesign +
        scores.measurementDesign +
        scores.analyticDesign) /
        4,
    );
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTimestamp(dateStr: string): string {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const designTypes = [
    { key: "researchDesign" as const, label: "Research Design", icon: Target },
    { key: "samplingDesign" as const, label: "Sampling Design", icon: Circle },
    { key: "measurementDesign" as const, label: "Measurement Design", icon: FileText },
    { key: "analyticDesign" as const, label: "Analytic Design", icon: Sparkles },
  ];
</script>

<div class="flex flex-col h-screen">
  <!-- Header -->
  <div
    class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10"
  >
    <div class="container mx-auto py-4 px-4">
      <div class="flex items-center justify-between" id="rq-header-controls">
        <div class="flex-1 min-w-0 mr-4">
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-3xl font-bold truncate">Research Questions</h1>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                <Info class="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p class="text-sm max-w-xs">
                  Create, track, and refine your research questions with Quester-powered design alignment and literature matching.
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <p class="text-muted-foreground text-sm truncate">
            Manage research questions and analyze their alignment with your project design.
          </p>
        </div>

        <div class="flex items-center gap-4 flex-shrink-0">
          <Button
            id="new-question-button"
            onclick={startCreating}
            disabled={!projectStore.currentProject}
          >
            <Plus class="h-4 w-4 mr-2" />
            New Question
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  {#if isLoading && researchQuestionsStore.questions.length === 0}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">Loading research questions...</div>
    </div>
  {:else}
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar: Questions List -->
      <aside
        id="rq-list-sidebar"
        class="w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col"
      >
        <!-- Search & Filter -->
        <div class="p-3 border-b space-y-2">
          <div class="relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              class="pl-8 h-9"
              bind:value={searchQuery}
            />
          </div>
          <div class="flex gap-1">
            {#each [
              { value: "all", label: "All" },
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ] as filter}
              <button
                class="px-2.5 py-1 text-xs rounded-full transition-colors {statusFilter ===
                filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                onclick={() =>
                  (statusFilter = filter.value as ResearchQuestionStatus | "all")}
              >
                {filter.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Questions List -->
        <div class="flex-1 overflow-y-auto">
          {#if filteredQuestions.length === 0}
            <div class="p-4 text-center text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No matching questions found."
                : "No research questions yet."}
            </div>
          {:else}
            {#each filteredQuestions as question (question.id)}
              <QuestionCard
                {question}
                selected={selectedQuestion?.id === question.id}
                onclick={() => selectQuestion(question)}
              />
            {/each}
          {/if}
        </div>
      </aside>

      <!-- Right Panel: Detail View -->
      <main class="flex-1 overflow-y-auto">
        {#if isCreating}
          <!-- Create New Question Form -->
          <div class="max-w-2xl mx-auto p-6 space-y-4">
            <h2 class="text-xl font-semibold">Create Research Question</h2>

            <div class="space-y-3">
              <div>
                <label
                  for="new-question-text"
                  class="text-sm font-medium mb-1 block"
                >
                  Question
                </label>
                <Textarea
                  id="new-question-text"
                  placeholder="Enter your research question..."
                  bind:value={newQuestion}
                  class="min-h-[80px]"
                />
              </div>

              <div>
                <label
                  for="new-question-desc"
                  class="text-sm font-medium mb-1 block"
                >
                  Description (optional)
                </label>
                <Textarea
                  id="new-question-desc"
                  placeholder="Add context or details about this question..."
                  bind:value={newDescription}
                  class="min-h-[60px]"
                />
              </div>
            </div>

            <div class="flex gap-2">
              <Button onclick={createQuestion} disabled={!newQuestion.trim()}>
                <Plus class="h-4 w-4 mr-2" />
                Create Question
              </Button>
              <Button variant="outline" onclick={cancelCreating}>
                <X class="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>

            <QuestionCreationGuide
              projectPurpose={projectStore.currentProject?.purpose ?? null}
              existingQuestions={researchQuestionsStore.questions}
              onUseSuggestion={(q) => { newQuestion = q; }}
            />
          </div>
        {:else if selectedQuestion}
          <!-- Question Detail with Tabs -->
          <div class="flex flex-col h-full">
            <div class="border-b px-4 pt-3">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                  <TabsTrigger value="detail">
                    <FileText class="h-3.5 w-3.5 mr-1.5" />
                    Detail
                  </TabsTrigger>
                  <TabsTrigger value="analysis">
                    <ChartBar class="h-3.5 w-3.5 mr-1.5" />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="literature">
                    <BookOpen class="h-3.5 w-3.5 mr-1.5" />
                    Literature
                  </TabsTrigger>
                  <TabsTrigger value="versions">
                    <History class="h-3.5 w-3.5 mr-1.5" />
                    History
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              <!-- Detail Tab -->
              {#if activeTab === "detail"}
                <div class="max-w-2xl space-y-4">
                  {#if isEditing}
                    <!-- Edit Mode -->
                    <div class="space-y-3">
                      <div>
                        <label
                          for="edit-question-text"
                          class="text-sm font-medium mb-1 block"
                        >
                          Question
                        </label>
                        <Textarea
                          id="edit-question-text"
                          bind:value={editQuestion}
                          class="min-h-[80px]"
                        />
                      </div>

                      <div>
                        <label
                          for="edit-question-desc"
                          class="text-sm font-medium mb-1 block"
                        >
                          Description
                        </label>
                        <Textarea
                          id="edit-question-desc"
                          bind:value={editDescription}
                          class="min-h-[60px]"
                        />
                      </div>

                      <div>
                        <span class="text-sm font-medium mb-1 block">
                          Status
                        </span>
                        <div class="flex gap-1">
                          {#each ["draft", "active", "archived"] as status}
                            <button
                              class="px-3 py-1.5 text-sm rounded-md transition-colors {editStatus ===
                              status
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                              onclick={() =>
                                (editStatus = status as ResearchQuestionStatus)}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          {/each}
                        </div>
                      </div>
                    </div>

                    <div class="flex gap-2">
                      <Button onclick={saveEdit}>
                        <Save class="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onclick={cancelEditing}>
                        Cancel
                      </Button>
                    </div>
                  {:else}
                    <!-- View Mode -->
                    <div class="space-y-4">
                      <div class="flex items-start justify-between gap-3">
                        <h2 class="text-xl font-semibold leading-tight">
                          {selectedQuestion.question}
                        </h2>
                        <Badge
                          variant={getStatusBadgeVariant(selectedQuestion.status)}
                        >
                          {selectedQuestion.status.charAt(0).toUpperCase() + selectedQuestion.status.slice(1)}
                        </Badge>
                      </div>

                      {#if selectedQuestion.description}
                        <p class="text-muted-foreground">
                          {selectedQuestion.description}
                        </p>
                      {/if}

                      <div class="text-xs text-muted-foreground">
                        Version {selectedQuestion.version} &middot; Updated {formatDate(
                          selectedQuestion.updatedAt,
                        )}
                      </div>

                      <div class="flex gap-2">
                        <Button variant="outline" size="sm" onclick={startEditing}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onclick={handleAnalyzeAlignment}
                        >
                          <Sparkles class="h-3.5 w-3.5 mr-1.5" />
                          Analyze with Quester
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          class="text-destructive hover:text-destructive"
                          onclick={() => confirmDelete(selectedQuestion.id)}
                        >
                          <Trash2 class="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>

                      <!-- AI Suggested Improvements -->
                      {#if streamingAnalysis}
                        <Card.Root
                          class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                        >
                          <Card.Header class="pb-2">
                            <Card.Title class="text-sm flex items-center gap-2">
                              <Sparkles class="h-4 w-4 text-primary" />
                              Quester Analysis
                              {#if !streamingAnalysis.isComplete}
                                <RefreshCw class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              {/if}
                            </Card.Title>
                          </Card.Header>
                          <Card.Content>
                            <p class="text-sm whitespace-pre-wrap">
                              {streamingAnalysis.content}
                            </p>
                          </Card.Content>
                        </Card.Root>
                      {/if}
                    </div>
                  {/if}
                </div>

              <!-- Analysis Tab -->
              {:else if activeTab === "analysis"}
                <div class="max-w-2xl space-y-8">
                  <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold">Analysis</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={handleAnalyzeAll}
                      disabled={isAnalyzingAll}
                    >
                      <Sparkles class="h-3.5 w-3.5 mr-1.5" />
                      {isAnalyzingAll ? "Analyzing..." : "Analyze All"}
                    </Button>
                  </div>

                  <PurposeAlignmentPanel question={selectedQuestion} />

                  <hr class="border-border" />

                  <DesignAlignmentPanel question={selectedQuestion} />

                  <hr class="border-border" />

                  <CoherencePanel question={selectedQuestion} />
                </div>

              <!-- Connected Literature Tab -->
              {:else if activeTab === "literature"}
                <div class="max-w-2xl">
                  <ConnectedLiteraturePanel question={selectedQuestion} />
                </div>

              <!-- Version History Tab -->
              {:else if activeTab === "versions"}
                <div class="max-w-2xl space-y-4">
                  <h3 class="text-lg font-semibold">Version History</h3>

                  {#if versions.length > 0}
                    <div class="space-y-0 relative">
                      <!-- Timeline line -->
                      <div
                        class="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border"
                      ></div>

                      {#each versions as version (version.id)}
                        <div class="flex gap-3 pb-4 relative">
                          <!-- Timeline dot -->
                          <div
                            class="w-[22px] h-[22px] rounded-full border-2 border-primary bg-background flex-shrink-0 z-10 flex items-center justify-center"
                          >
                            <span class="text-[8px] font-bold text-primary">
                              {version.version}
                            </span>
                          </div>

                          <!-- Version content -->
                          <div class="flex-1 min-w-0">
                            <div
                              class="flex items-center gap-2 text-xs text-muted-foreground mb-1"
                            >
                              <span>v{version.version}</span>
                              <span>&middot;</span>
                              <span>{formatTimestamp(version.createdAt)}</span>
                            </div>
                            <div
                              class="p-3 rounded-lg border bg-card text-sm"
                            >
                              <p class="font-medium mb-1">{version.question}</p>
                              {#if version.description}
                                <p class="text-muted-foreground text-xs">
                                  {version.description}
                                </p>
                              {/if}
                              {#if version.designAlignmentScore}
                                <div class="flex gap-1 mt-2">
                                  {#each designTypes as dt}
                                    {@const score =
                                      version.designAlignmentScore[dt.key]}
                                    <div
                                      class="w-2 h-2 rounded-full {getAlignmentColor(
                                        score,
                                      )}"
                                      title="{dt.label}: {score}%"
                                    ></div>
                                  {/each}
                                </div>
                              {/if}
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else if isLoading}
                    <div class="text-center text-sm text-muted-foreground py-8">
                      Loading version history...
                    </div>
                  {:else}
                    <EmptyState
                      title="No version history"
                      description="Version history will appear here as you make changes to this question."
                      variant="data-empty"
                      height="h-[200px]"
                    />
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <!-- No Question Selected -->
          <div class="flex-1 flex items-center justify-center h-full">
            <EmptyState
              title="No question selected"
              description="Select a research question from the list or create a new one."
              variant="data-empty"
              ctaText="New Question"
              ctaAction={startCreating}
              ctaDisabled={!projectStore.currentProject}
            />
          </div>
        {/if}
      </main>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Research Question</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this research question? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={executeDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<script lang="ts">
  import { onMount } from 'svelte';
  import { commandCenterStore, type Artifact, type CommandResponse, type CommandCenterInsight, type DailyBriefing, type SourceCategory } from '$lib/stores/CommandCenterStore.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Card from '$lib/components/ui/card';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Badge } from '$lib/components/ui/badge';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import * as Dialog from '$lib/components/ui/dialog';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { auth } from '$lib/stores/AuthStore';
  import { literatureStore } from '$lib/stores/LiteratureStore.svelte';
  import { navigate } from 'svelte-routing';
  import { _ } from 'svelte-i18n';
  import ContextSelector from '$lib/components/command-center/ContextSelector.svelte';
  import {
    Zap,
    Send,
    Save,
    X,
    Pin,
    RefreshCw,
    Trash2,
    AlertTriangle,
    TrendingUp,
    Lightbulb,
    Link2,
    ChevronRight,
    BarChart2,
    Clock,
    Circle,
    Moon,
    Sun,
    Sunrise,
    ArrowRight,
    Sparkles,
    Info,
    ExternalLink,
    BookOpen,
  } from 'lucide-svelte';
  import { formatDistanceToNow } from 'date-fns';

  interface Props {
    project: any;
  }

  let { project }: Props = $props();

  let query = $state('');
  let isLoading = $derived(commandCenterStore.commandLoading);
  let currentResponse = $derived(commandCenterStore.currentResponse);
  let artifacts = $derived(project?.id ? commandCenterStore.getArtifacts(project.id) : []);
  let insights = $derived(project?.id ? commandCenterStore.getInsights(project.id) : []);
  let dailyBriefing = $derived(project?.id ? commandCenterStore.getDailyBriefing(project.id) : null);
  let briefingLoading = $derived(project?.id ? commandCenterStore.isBriefingLoading(project.id) : false);
  let showBriefing = $state(true);
  let selectedArtifact = $state<typeof artifacts[0] | null>(null);
  let artifactFilter = $state<'all' | 'pinned' | 'summary' | 'theme_cluster' | 'timeline' | 'gap_analysis' | 'comparison'>('all');

  // Filtered artifacts based on selected tab
  let filteredArtifacts = $derived(() => {
    if (artifactFilter === 'all') return artifacts;
    if (artifactFilter === 'pinned') return artifacts.filter(a => a.isPinned);
    return artifacts.filter(a => a.type === artifactFilter);
  });

  // Counts for tabs
  let artifactCounts = $derived(() => ({
    all: artifacts.length,
    pinned: artifacts.filter(a => a.isPinned).length,
    summary: artifacts.filter(a => a.type === 'summary').length,
    theme_cluster: artifacts.filter(a => a.type === 'theme_cluster').length,
    timeline: artifacts.filter(a => a.type === 'timeline').length,
    gap_analysis: artifacts.filter(a => a.type === 'gap_analysis').length,
    comparison: artifacts.filter(a => a.type === 'comparison').length,
  }));

  // Context scope state
  let contextScope = $derived(commandCenterStore.contextScope);

  const shortcuts = [
    { label: 'Compare', prefix: 'Compare ' },
    { label: 'Find gaps', prefix: 'What gaps exist in ' },
    { label: 'Themes', prefix: 'What themes emerge from ' },
    { label: 'Timeline', prefix: 'Show timeline of ' },
    { label: 'Summarize', prefix: 'Summarize ' },
  ];

  const typeConfig: Record<string, { color: string; label: string }> = {
    comparison: { color: 'bg-amber-500/10 text-amber-500', label: 'Comparison' },
    gap_analysis: { color: 'bg-rose-500/10 text-rose-500', label: 'Gap Analysis' },
    theme_cluster: { color: 'bg-teal-500/10 text-teal-500', label: 'Themes' },
    timeline: { color: 'bg-violet-500/10 text-violet-500', label: 'Timeline' },
    summary: { color: 'bg-blue-500/10 text-blue-500', label: 'Summary' },
  };

  const insightTypeConfig: Record<string, { icon: any; color: string }> = {
    attention: { icon: AlertTriangle, color: 'text-rose-500' },
    growth: { icon: TrendingUp, color: 'text-teal-500' },
    suggestion: { icon: Lightbulb, color: 'text-violet-500' },
    connection: { icon: Link2, color: 'text-amber-500' },
  };

  function getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  function getTimeIcon() {
    const hour = new Date().getHours();
    if (hour < 12) return Sunrise;
    if (hour < 18) return Sun;
    return Moon;
  }

  // Parse text with citation markers [1, 2, 3] and make them interactive
  function parseCitations(text: string): { text: string; citations: number[] }[] {
    const parts: { text: string; citations: number[] }[] = [];
    const regex = /\[(\d+(?:,\s*\d+)*)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), citations: [] });
      }
      // Add citation markers
      const citations = match[1].split(',').map(n => parseInt(n.trim()));
      parts.push({ text: '', citations });
      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), citations: [] });
    }

    return parts.length > 0 ? parts : [{ text, citations: [] }];
  }

  // Get source info by citation number (1-indexed) for current response
  function getSourceByCitation(citationNum: number) {
    if (!currentResponse?.sourcesUsed) return null;
    return currentResponse.sourcesUsed[citationNum - 1] || null;
  }

  // Get source info by citation number for artifacts (handles legacy artifacts)
  function getArtifactSourceByCitation(citationNum: number, artifact: typeof artifacts[0]) {
    const idx = citationNum - 1;

    // Try embedded sourcesUsed first (new artifacts)
    // Type assertion needed since contextSnapshot type doesn't include sourcesUsed yet
    const contextSnapshot = artifact.contextSnapshot as { sourceIds?: string[]; contentTypes?: string[]; sourcesUsed?: Array<{ id: string; title: string; authors?: string | null }> } | null;
    const embedded = contextSnapshot?.sourcesUsed?.[idx];
    if (embedded) return { ...embedded, sourceId: embedded.id };

    // Fall back to looking up by sourceIds (legacy artifacts)
    const sourceId = contextSnapshot?.sourceIds?.[idx];
    if (sourceId) {
      const lit = literatureStore.getById(sourceId);
      if (lit) {
        const authors = Array.isArray(lit.authors) ? lit.authors.join(', ') : lit.authors;
        return {
          id: sourceId,
          sourceId: sourceId,
          title: lit.name,
          authors: authors || null,
        };
      }
    }

    return null;
  }

  // Navigate to a source from citation click
  function handleCitationClick(sourceId: string | undefined) {
    if (!project?.id || !sourceId) return;
    navigate(`/project/${project.id}/literature/${sourceId}`);
    closeArtifactDetail();
  }

  function handleArtifactClick(artifact: typeof artifacts[0]) {
    selectedArtifact = artifact;
  }

  function closeArtifactDetail() {
    selectedArtifact = null;
  }

  function handleAskFollowup(artifact: typeof artifacts[0]) {
    // Get original source IDs from artifact's context snapshot
    const contextSnapshot = artifact.contextSnapshot as { sourceIds?: string[]; contentTypes?: string[] } | null;
    const sourceIds = contextSnapshot?.sourceIds || [];

    // Clear all specific selections first
    commandCenterStore.setSpecificIds('literature', []);
    commandCenterStore.setSpecificIds('notes', []);
    commandCenterStore.setSpecificIds('outcomes', []);
    commandCenterStore.setSpecificIds('models', []);
    commandCenterStore.setSpecificIds('artifacts', []);

    // Disable all categories
    commandCenterStore.setCategoryEnabled('literature', false);
    commandCenterStore.setCategoryEnabled('notes', false);
    commandCenterStore.setCategoryEnabled('outcomes', false);
    commandCenterStore.setCategoryEnabled('models', false);
    commandCenterStore.setCategoryEnabled('artifacts', false);

    // Select the artifact and its original literature sources
    commandCenterStore.setSpecificIds('artifacts', [artifact.id]);
    commandCenterStore.setSpecificIds('literature', sourceIds);

    // Populate query with context-aware template
    query = `Based on "${artifact.title}", `;

    // Close dialog
    closeArtifactDetail();
  }

  onMount(async () => {
    if (project?.id) {
      // Load artifacts
      commandCenterStore.loadArtifacts(project.id);

      // Load insights
      commandCenterStore.loadInsights(project.id);

      // Load context sources
      commandCenterStore.loadContextSources(project.id);

      // Load literature for source lookups (if not already loaded for this project)
      if (literatureStore.loadedProjectId !== project.id) {
        literatureStore.loadLiterature(project.id);
      }

      // Check for daily briefing
      const briefingStatus = await commandCenterStore.checkBriefing(project.id);
      if (briefingStatus.needsBriefing && !briefingStatus.cachedBriefing) {
        // Generate new briefing
        commandCenterStore.generateBriefing(project.id);
      }

      // Update session
      commandCenterStore.updateSession(project.id);
    }
  });

  async function handleSubmit() {
    if (!query.trim() || isLoading || !project?.id) return;
    await commandCenterStore.processCommand(query.trim(), project.id);
    query = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function applyShortcut(prefix: string) {
    query = prefix;
  }

  async function handleSaveArtifact() {
    if (!project?.id) return;
    await commandCenterStore.saveArtifact(project.id);
  }

  function handleDismissResponse() {
    commandCenterStore.dismissCurrentResponse();
  }

  async function handlePinArtifact(artifact: Artifact) {
    await commandCenterStore.updateArtifact(artifact.id, { isPinned: !artifact.isPinned });
  }

  async function handleRegenerateArtifact(artifact: Artifact) {
    await commandCenterStore.regenerateArtifact(artifact.id);
  }

  async function handleDeleteArtifact(artifact: Artifact) {
    await commandCenterStore.deleteArtifact(artifact.id);
  }

  function handleInsightClick(insight: CommandCenterInsight) {
    if (!project?.id) return;
    commandCenterStore.markInsightRead(insight.id, project.id);
  }

  function dismissBriefing() {
    if (!project?.id) return;
    showBriefing = false;
  }

  function reopenBriefing() {
    showBriefing = true;
  }

  // Context Selector handlers
  function handleCategoryChange(category: SourceCategory, enabled: boolean) {
    commandCenterStore.setCategoryEnabled(category, enabled);
  }

  function handleSpecificIdsChange(category: SourceCategory, ids: string[]) {
    commandCenterStore.setSpecificIds(category, ids);
  }

  function handleAllSourcesToggle() {
    commandCenterStore.toggleAllSources();
  }
</script>

<div class="flex h-full bg-background">
  <!-- Main Content -->
  <div class="flex-1 p-6 overflow-y-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold">
        Good {getTimeOfDay()}, {auth.user?.firstName || 'Researcher'}
      </h1>
      {#if commandCenterStore.getUnreadInsightsCount(project?.id || '') > 0}
        <p class="text-sm text-muted-foreground">
          {commandCenterStore.getUnreadInsightsCount(project?.id || '')} new insights available
        </p>
      {/if}
    </div>

    <!-- Command Bar -->
    <Card.Root class="mb-6 border-2 focus-within:border-primary transition-colors">
      <Card.Content class="p-4">
        <div class="flex items-center gap-3">
          <Zap class="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            bind:value={query}
            onkeydown={handleKeydown}
            placeholder="Ask anything, or try: compare methods, find gaps, extract themes..."
            class="border-0 shadow-none focus-visible:ring-0 text-base"
            disabled={isLoading}
          />
          {#if query.trim()}
            <Button
              size="sm"
              onclick={handleSubmit}
              disabled={isLoading}
              class="flex-shrink-0"
            >
              <Send class="h-4 w-4" />
            </Button>
          {/if}
        </div>

        <div class="flex items-center justify-between mt-3 pt-3 border-t">
          <div class="flex gap-2">
            {#each shortcuts as shortcut}
              <Button
                variant="ghost"
                size="sm"
                class="text-xs h-7"
                onclick={() => applyShortcut(shortcut.prefix)}
                disabled={isLoading}
              >
                {shortcut.label}
              </Button>
            {/each}
          </div>
          <ContextSelector
            projectId={project?.id || ''}
            counts={contextScope.counts}
            items={contextScope.items}
            categories={contextScope.categories}
            specificIds={contextScope.specificIds}
            onCategoryChange={handleCategoryChange}
            onSpecificIdsChange={handleSpecificIdsChange}
            onAllSourcesToggle={handleAllSourcesToggle}
          />
        </div>

        {#if isLoading}
          <div class="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div class="flex items-center gap-3">
              <div class="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <div class="flex-1">
                <p class="text-sm font-medium text-primary">Analyzing your sources...</p>
                <p class="text-xs text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Daily Briefing (below command bar) -->
    {#if dailyBriefing && showBriefing && !currentResponse}
      {@const TimeIcon = getTimeIcon()}
      <Card.Root class="mb-6 overflow-hidden">
        <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-full bg-amber-500/20">
                <TimeIcon class="h-4 w-4 text-amber-500" />
              </div>
              <span class="text-sm font-medium text-amber-600 dark:text-amber-400">
                Good {getTimeOfDay()}, {auth.user?.firstName || 'Researcher'}
              </span>
            </div>
            <Button variant="ghost" size="sm" class="h-6 w-6 p-0 hover:bg-background/50" onclick={dismissBriefing}>
              <X class="h-4 w-4" />
            </Button>
          </div>

          <!-- Summary -->
          <p class="text-sm text-muted-foreground mb-5">
            {dailyBriefing.changesSummary}
          </p>

          <!-- Detected Patterns -->
          {#if dailyBriefing.detectedPatterns?.length}
            <div class="mb-5">
              <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Patterns Detected
              </h4>
              <div class="space-y-2">
                {#each dailyBriefing.detectedPatterns.slice(0, 2) as pattern}
                  <div class="flex items-start gap-2 text-sm">
                    <TrendingUp class="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span class="text-muted-foreground">{pattern}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Suggested Actions -->
          {#if dailyBriefing.suggestedActions?.length}
            <div>
              <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles class="h-3.5 w-3.5 text-amber-500" />
                Suggested for Today
              </h4>
              <div class="space-y-2">
                {#each dailyBriefing.suggestedActions.slice(0, 3) as action}
                  <button
                    class="w-full flex items-center justify-between p-3 rounded-lg bg-background/60 hover:bg-background transition-colors text-left group"
                    onclick={() => {
                      query = action.action;
                    }}
                  >
                    <span class="text-sm text-foreground/80 group-hover:text-foreground">{action.action}</span>
                    <ArrowRight class="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Footer Actions -->
          <div class="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
            <Button variant="ghost" size="sm" class="text-muted-foreground hover:text-foreground" onclick={dismissBriefing}>
              Dismiss for now
            </Button>
            <Button size="sm" class="bg-amber-500 hover:bg-amber-600 text-white" onclick={() => {
              if (dailyBriefing.suggestedActions?.[0]) {
                query = dailyBriefing.suggestedActions[0].action;
                handleSubmit();
              }
              dismissBriefing();
            }}>
              Start exploring
              <ChevronRight class="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card.Root>
    {:else if briefingLoading && !currentResponse}
      <Card.Root class="mb-6">
        <Card.Content class="p-6">
          <div class="flex items-center gap-3">
            <Skeleton class="h-8 w-8 rounded-full" />
            <div class="space-y-2 flex-1">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-3/4" />
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {:else if dailyBriefing && !showBriefing && !currentResponse}
      {@const TimeIcon = getTimeIcon()}
      <!-- Collapsed briefing indicator -->
      <button
        class="mb-6 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-sm text-amber-600 dark:text-amber-400"
        onclick={reopenBriefing}
      >
        <TimeIcon class="h-4 w-4" />
        <span>View your daily briefing</span>
        <ChevronRight class="h-4 w-4" />
      </button>
    {/if}

    <!-- Current Response -->
    {#if currentResponse}
      <Card.Root class="mb-6 border-amber-500/30">
        <Card.Header class="pb-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-amber-500/10">
                <Zap class="h-4 w-4 text-amber-500" />
              </div>
              <Card.Title class="text-lg">{currentResponse.title}</Card.Title>
            </div>
            <Button variant="ghost" size="sm" onclick={handleDismissResponse}>
              <X class="h-4 w-4" />
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground mb-4">
            {#each parseCitations(currentResponse.content.summary) as part}
              {#if part.text}
                <span>{part.text}</span>
              {/if}
              {#if part.citations.length > 0}
                {#each part.citations as citationNum, i}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <button
                        class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                      >
                        {citationNum}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="top" class="max-w-xs">
                      {@const source = getSourceByCitation(citationNum)}
                      {#if source}
                        <div class="text-sm">
                          <p class="font-medium">{source.title}</p>
                          {#if source.authors}
                            <p class="text-muted-foreground text-xs">{source.authors}</p>
                          {/if}
                        </div>
                      {:else}
                        <span class="text-xs">Source {citationNum}</span>
                      {/if}
                    </Tooltip.Content>
                  </Tooltip.Root>
                  {#if i < part.citations.length - 1}
                    <span class="text-muted-foreground">,</span>
                  {/if}
                {/each}
              {/if}
            {/each}
          </p>

          {#if currentResponse.content.key_findings?.length}
            <div class="mb-4">
              <h4 class="font-medium mb-2">Key Findings</h4>
              <ul class="space-y-2">
                {#each currentResponse.content.key_findings as finding}
                  <li class="text-sm flex items-start gap-2">
                    <ChevronRight class="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      {#each parseCitations(finding) as part}
                        {#if part.text}
                          {part.text}
                        {/if}
                        {#if part.citations.length > 0}
                          {#each part.citations as citationNum, i}
                            <Tooltip.Root>
                              <Tooltip.Trigger>
                                <button
                                  class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                >
                                  {citationNum}
                                </button>
                              </Tooltip.Trigger>
                              <Tooltip.Content side="top" class="max-w-xs">
                                {@const source = getSourceByCitation(citationNum)}
                                {#if source}
                                  <div class="text-sm">
                                    <p class="font-medium">{source.title}</p>
                                    {#if source.authors}
                                      <p class="text-muted-foreground text-xs">{source.authors}</p>
                                    {/if}
                                  </div>
                                {:else}
                                  <span class="text-xs">Source {citationNum}</span>
                                {/if}
                              </Tooltip.Content>
                            </Tooltip.Root>
                            {#if i < part.citations.length - 1}
                              <span class="text-muted-foreground">,</span>
                            {/if}
                          {/each}
                        {/if}
                      {/each}
                    </span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Detailed Analysis -->
          {#if currentResponse.content.detailed_analysis}
            <div class="mb-4">
              <h4 class="font-medium mb-2">Detailed Analysis</h4>
              <div class="text-sm text-muted-foreground">
                {#each parseCitations(currentResponse.content.detailed_analysis) as part}
                  {#if part.text}
                    <span class="whitespace-pre-line">{part.text}</span>
                  {/if}
                  {#if part.citations.length > 0}
                    {#each part.citations as citationNum, i}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <button
                            class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                          >
                            {citationNum}
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" class="max-w-xs">
                          {@const source = getSourceByCitation(citationNum)}
                          {#if source}
                            <div class="text-sm">
                              <p class="font-medium">{source.title}</p>
                              {#if source.authors}
                                <p class="text-muted-foreground text-xs">{source.authors}</p>
                              {/if}
                            </div>
                          {:else}
                            <span class="text-xs">Source {citationNum}</span>
                          {/if}
                        </Tooltip.Content>
                      </Tooltip.Root>
                      {#if i < part.citations.length - 1}
                        <span class="text-muted-foreground">,</span>
                      {/if}
                    {/each}
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

          <!-- Contradictions -->
          {#if currentResponse.content.contradictions?.length}
            <div class="mb-4">
              <h4 class="font-medium mb-2 text-amber-500">Contradictions Found</h4>
              <ul class="space-y-1 text-sm text-muted-foreground">
                {#each currentResponse.content.contradictions as item}
                  <li class="flex items-start gap-2">
                    <AlertTriangle class="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Limitations -->
          {#if currentResponse.content.limitations?.length}
            <div class="mb-4">
              <h4 class="font-medium mb-2">Limitations</h4>
              <ul class="space-y-1 text-sm text-muted-foreground">
                {#each currentResponse.content.limitations as item}
                  <li>• {item}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Sources -->
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
            <BookOpen class="h-3.5 w-3.5" />
            <span>{currentResponse.sourcesUsed.length} sources used</span>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-3">
            <div class="flex gap-2">
              <Button onclick={handleSaveArtifact} class="gap-2">
                <Save class="h-4 w-4" />
                Save artifact
              </Button>
            </div>

            {#if currentResponse.suggestedFollowups?.length}
              <div class="border-t pt-3">
                <p class="text-xs text-muted-foreground mb-2">Suggested follow-ups:</p>
                <div class="space-y-1.5">
                  {#each currentResponse.suggestedFollowups.slice(0, 3) as followup}
                    <button
                      type="button"
                      class="w-full flex items-center gap-2 p-2 rounded-md text-left text-sm bg-muted/50 hover:bg-muted transition-colors group"
                      onclick={() => { query = followup; }}
                    >
                      <ChevronRight class="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                      <span class="text-muted-foreground group-hover:text-foreground">{followup}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Artifacts Grid -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold">Research Artifacts</h2>
      </div>

      <!-- Filter Tabs -->
      {#if artifacts.length > 0}
        <div class="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          <button
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap {artifactFilter === 'all' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
            onclick={() => artifactFilter = 'all'}
          >
            All artifacts <span class="ml-1 opacity-70">{artifactCounts().all}</span>
          </button>
          {#if artifactCounts().pinned > 0}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap {artifactFilter === 'pinned' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
              onclick={() => artifactFilter = 'pinned'}
            >
              Pinned <span class="ml-1 opacity-70">{artifactCounts().pinned}</span>
            </button>
          {/if}
          {#if artifactCounts().summary > 0}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap {artifactFilter === 'summary' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
              onclick={() => artifactFilter = 'summary'}
            >
              Summaries <span class="ml-1 opacity-70">{artifactCounts().summary}</span>
            </button>
          {/if}
          {#if artifactCounts().theme_cluster > 0}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap {artifactFilter === 'theme_cluster' ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
              onclick={() => artifactFilter = 'theme_cluster'}
            >
              Themes <span class="ml-1 opacity-70">{artifactCounts().theme_cluster}</span>
            </button>
          {/if}
          {#if artifactCounts().timeline > 0}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap {artifactFilter === 'timeline' ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
              onclick={() => artifactFilter = 'timeline'}
            >
              Timelines <span class="ml-1 opacity-70">{artifactCounts().timeline}</span>
            </button>
          {/if}
          {#if artifactCounts().gap_analysis > 0}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap {artifactFilter === 'gap_analysis' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
              onclick={() => artifactFilter = 'gap_analysis'}
            >
              Gaps <span class="ml-1 opacity-70">{artifactCounts().gap_analysis}</span>
            </button>
          {/if}
          {#if artifactCounts().comparison > 0}
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap {artifactFilter === 'comparison' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
              onclick={() => artifactFilter = 'comparison'}
            >
              Comparisons <span class="ml-1 opacity-70">{artifactCounts().comparison}</span>
            </button>
          {/if}
        </div>
      {/if}

      {#if filteredArtifacts().length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each filteredArtifacts() as artifact (artifact.id)}
            {@const config = typeConfig[artifact.type] || typeConfig.summary}
            <button
              class="text-left w-full"
              onclick={() => handleArtifactClick(artifact)}
            >
              <Card.Root class="h-full hover:border-primary/50 transition-colors cursor-pointer relative group">
                {#if artifact.isPinned}
                  <div class="absolute top-2 right-2 z-10">
                    <Pin class="h-4 w-4 text-amber-500 fill-amber-500" />
                  </div>
                {/if}
                {#if artifact.isStale}
                  <Badge variant="outline" class="absolute top-2 right-2 z-10 text-xs bg-amber-500/10 text-amber-500">
                    Updates available
                  </Badge>
                {/if}

                <Card.Header class="pb-2">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="p-1.5 rounded {config.color}">
                      {#if artifact.type === 'comparison'}
                        <BarChart2 class="h-4 w-4" />
                      {:else if artifact.type === 'timeline'}
                        <Clock class="h-4 w-4" />
                      {:else}
                        <Circle class="h-4 w-4" />
                      {/if}
                    </div>
                    <Badge variant="secondary" class="text-xs">{config.label}</Badge>
                  </div>
                  <Card.Title class="text-sm line-clamp-2">{artifact.title}</Card.Title>
                </Card.Header>
                <Card.Content>
                  {#if artifact.description}
                    <p class="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {artifact.description}
                    </p>
                  {/if}
                  <div class="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(artifact.createdAt), { addSuffix: true })}
                  </div>
                </Card.Content>

                <!-- Hover actions -->
                <div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 w-7 p-0"
                    onclick={(e: MouseEvent) => { e.stopPropagation(); handlePinArtifact(artifact); }}
                  >
                    <Pin class="h-3 w-3" />
                  </Button>
                  {#if artifact.isStale}
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 w-7 p-0"
                      onclick={(e: MouseEvent) => { e.stopPropagation(); handleRegenerateArtifact(artifact); }}
                    >
                      <RefreshCw class="h-3 w-3" />
                    </Button>
                  {/if}
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 w-7 p-0 text-destructive"
                    onclick={(e: MouseEvent) => { e.stopPropagation(); handleDeleteArtifact(artifact); }}
                  >
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </div>
              </Card.Root>
            </button>
          {/each}
        </div>
      {:else if artifacts.length > 0}
        <!-- Filter has no results -->
        <Card.Root class="border-dashed">
          <Card.Content class="flex flex-col items-center justify-center py-12 text-center">
            <div class="p-3 rounded-full bg-muted mb-4">
              <Zap class="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 class="font-medium mb-1">No matching artifacts</h3>
            <p class="text-sm text-muted-foreground">
              Try selecting a different filter
            </p>
            <Button variant="outline" size="sm" class="mt-3" onclick={() => artifactFilter = 'all'}>
              View all artifacts
            </Button>
          </Card.Content>
        </Card.Root>
      {:else}
        <!-- No artifacts at all -->
        <Card.Root class="border-dashed">
          <Card.Content class="flex flex-col items-center justify-center py-12 text-center">
            <div class="p-3 rounded-full bg-muted mb-4">
              <Zap class="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 class="font-medium mb-1">Your research workspace awaits</h3>
            <p class="text-sm text-muted-foreground">
              Ask a question above to generate your first artifact
            </p>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  </div>

  <!-- Right Sidebar - Insights -->
  <aside class="w-80 border-l bg-card p-4 overflow-y-auto hidden lg:block">
    <h3 class="font-semibold mb-4">AI Insights</h3>

    <!-- Insights List -->
    <div class="space-y-2">
      {#each insights as insight (insight.id)}
        {@const config = insightTypeConfig[insight.type] || insightTypeConfig.suggestion}
        {@const Icon = config.icon}
        <button
          class="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left flex gap-3 {insight.isRead ? 'opacity-60' : ''}"
          onclick={() => handleInsightClick(insight)}
        >
          {#if !insight.isRead}
            <div class="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          {/if}
          <div class="p-1.5 rounded bg-background {config.color}">
            <Icon class="h-4 w-4" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{insight.title}</p>
            <p class="text-xs text-muted-foreground truncate">{insight.detail}</p>
          </div>
        </button>
      {:else}
        <p class="text-sm text-muted-foreground text-center py-6">
          Insights will appear as you build your research
        </p>
      {/each}
    </div>
  </aside>
</div>

<!-- Artifact Detail Dialog -->
<Dialog.Root open={selectedArtifact !== null} onOpenChange={(open) => { if (!open) closeArtifactDetail(); }}>
  <Dialog.Content class="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
    {#if selectedArtifact}
      {@const config = typeConfig[selectedArtifact.type] || typeConfig.summary}
      <Dialog.Header class="px-6 pt-6 pb-4 border-b flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg {config.color}">
            {#if selectedArtifact.type === 'comparison'}
              <BarChart2 class="h-5 w-5" />
            {:else if selectedArtifact.type === 'timeline'}
              <Clock class="h-5 w-5" />
            {:else}
              <Circle class="h-5 w-5" />
            {/if}
          </div>
          <div class="flex-1">
            <Dialog.Title class="text-lg">{selectedArtifact.title}</Dialog.Title>
            <div class="flex items-center gap-2 mt-1">
              <Badge variant="secondary" class="text-xs">{config.label}</Badge>
              <span class="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(selectedArtifact.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </Dialog.Header>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div class="space-y-4">
          <!-- Summary -->
          {#if selectedArtifact.content?.summary}
            <p class="text-muted-foreground">{selectedArtifact.content.summary}</p>
          {/if}

          <!-- Key Findings with citation parsing -->
          {#if selectedArtifact.content?.key_findings?.length}
            <div>
              <h4 class="font-medium mb-2">Key Findings</h4>
              <ul class="space-y-2">
                {#each selectedArtifact.content.key_findings as finding}
                  <li class="text-sm flex items-start gap-2">
                    <ChevronRight class="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      {#each parseCitations(finding) as part}
                        {#if part.text}
                          {part.text}
                        {/if}
                        {#if part.citations.length > 0}
                          {#each part.citations as citationNum, i}
                            {@const source = getArtifactSourceByCitation(citationNum, selectedArtifact)}
                            <Tooltip.Root>
                              <Tooltip.Trigger>
                                <button
                                  type="button"
                                  class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 hover:underline transition-colors cursor-pointer"
                                  onclick={() => handleCitationClick(source?.sourceId)}
                                >
                                  {citationNum}
                                </button>
                              </Tooltip.Trigger>
                              <Tooltip.Content side="top" class="max-w-xs">
                                {#if source}
                                  <div class="text-sm">
                                    <p class="font-medium">{source.title}</p>
                                    {#if source.authors}
                                      <p class="text-muted-foreground text-xs">{source.authors}</p>
                                    {/if}
                                    <p class="text-primary text-xs mt-1">Click to view source</p>
                                  </div>
                                {:else}
                                  <span class="text-xs text-muted-foreground">Source not found</span>
                                {/if}
                              </Tooltip.Content>
                            </Tooltip.Root>
                            {#if i < part.citations.length - 1}
                              <span class="text-muted-foreground">,</span>
                            {/if}
                          {/each}
                        {/if}
                      {/each}
                    </span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Detailed Analysis -->
          {#if selectedArtifact.content?.detailed_analysis}
            <div>
              <h4 class="font-medium mb-2">Detailed Analysis</h4>
              <p class="text-sm text-muted-foreground whitespace-pre-wrap">{selectedArtifact.content.detailed_analysis}</p>
            </div>
          {/if}

          <!-- Contradictions -->
          {#if selectedArtifact.content?.contradictions?.length}
            <div>
              <h4 class="font-medium mb-2 text-amber-500">Contradictions Found</h4>
              <ul class="space-y-1">
                {#each selectedArtifact.content.contradictions as contradiction}
                  <li class="text-sm flex items-start gap-2">
                    <AlertTriangle class="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{contradiction}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Limitations -->
          {#if selectedArtifact.content?.limitations?.length}
            <div>
              <h4 class="font-medium mb-2 text-muted-foreground">Limitations</h4>
              <ul class="space-y-1 text-sm text-muted-foreground">
                {#each selectedArtifact.content.limitations as limitation}
                  <li>• {limitation}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Sources Summary -->
          {#if (selectedArtifact.contextSnapshot?.sourceIds?.length || 0) > 0}
            {@const contextSnapshot = selectedArtifact.contextSnapshot as { sourceIds?: string[]; contentTypes?: string[]; sourcesUsed?: Array<{ id: string; title: string; authors?: string | null }> } | null}
            {@const sourceCount = contextSnapshot?.sourcesUsed?.length || contextSnapshot?.sourceIds?.length || 0}
            <div class="pt-4 border-t">
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 p-3 bg-muted/50 rounded-lg">
                <BookOpen class="h-3.5 w-3.5" />
                <span>{sourceCount} sources used</span>
              </div>
              <h4 class="font-medium mb-2 text-sm">Sources Used ({sourceCount})</h4>
              <div class="space-y-1.5">
                {#each Array(sourceCount) as _, idx}
                  {@const source = getArtifactSourceByCitation(idx + 1, selectedArtifact)}
                  <button
                    type="button"
                    class="w-full flex items-start gap-2 text-sm text-left p-1.5 -mx-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer group"
                    onclick={() => handleCitationClick(source?.sourceId)}
                  >
                    <span class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-medium bg-muted text-muted-foreground rounded group-hover:bg-primary/10 group-hover:text-primary">
                      {idx + 1}
                    </span>
                    <div class="flex-1 min-w-0">
                      {#if source}
                        <p class="truncate font-medium text-foreground/90 group-hover:text-primary">{source.title}</p>
                        {#if source.authors}
                          <p class="text-xs text-muted-foreground truncate">{source.authors}</p>
                        {/if}
                      {:else}
                        <p class="truncate text-muted-foreground italic">Source not found</p>
                      {/if}
                    </div>
                    <ExternalLink class="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Source Query -->
          {#if selectedArtifact.sourceQuery}
            <div class="pt-4 border-t">
              <p class="text-xs text-muted-foreground">
                <span class="font-medium">Original query:</span> {selectedArtifact.sourceQuery}
              </p>
            </div>
          {/if}
        </div>
      </div>

      <Dialog.Footer class="flex-shrink-0 border-t px-6 py-4">
        <div class="flex items-center justify-between w-full">
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => { if (selectedArtifact) handlePinArtifact(selectedArtifact); }}
            >
              <Pin class="h-4 w-4 mr-1" />
              {selectedArtifact.isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() => { if (selectedArtifact) handleAskFollowup(selectedArtifact); }}
            >
              <Sparkles class="h-4 w-4 mr-1" />
              Ask follow-up
            </Button>
            {#if selectedArtifact.isStale}
              <Button
                variant="outline"
                size="sm"
                onclick={() => { if (selectedArtifact) { handleRegenerateArtifact(selectedArtifact); closeArtifactDetail(); }}}
              >
                <RefreshCw class="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            {/if}
          </div>
          <div class="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onclick={() => { if (selectedArtifact) { handleDeleteArtifact(selectedArtifact); closeArtifactDetail(); }}}
            >
              <Trash2 class="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onclick={closeArtifactDetail}>
              Close
            </Button>
          </div>
        </div>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

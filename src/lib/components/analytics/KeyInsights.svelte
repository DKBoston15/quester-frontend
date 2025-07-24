<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import EmptyState from "$lib/components/ui/empty-state/EmptyState.svelte";
  import InsightCard from "./InsightCard.svelte";
  import InsightsHistoryModal from "./InsightsHistoryModal.svelte";
  import { insightsStore } from "$lib/stores/InsightsStore.svelte";
  import { Lightbulb, RefreshCw, Sparkles, AlertCircle, History } from "lucide-svelte";

  interface Props {
    projectId: string;
    onInsightsChange?: (insights: any[]) => void;
    analyticsData?: any;
  }

  let { projectId, onInsightsChange, analyticsData }: Props = $props();

  // Reactive state from store
  let insights = $derived(insightsStore.getInsights(projectId));
  let isLoading = $derived(insightsStore.isLoading(projectId));
  let error = $derived(insightsStore.getError(projectId));
  let lastUpdated = $derived(insightsStore.getLastUpdated(projectId));
  let canGenerate = $derived(insightsStore.canGenerateInsights(projectId));
  let isLimitCheckLoading = $derived(insightsStore.isLimitCheckLoading(projectId));
  let isRefreshing = $state(false);
  let showHistory = $state(false);

  // Load insights from store/API
  async function loadInsights() {
    if (!projectId) {
      console.log('[KeyInsights] No projectId provided');
      return;
    }
    console.log('[KeyInsights] Loading insights for project:', projectId);
    await insightsStore.loadInsights(projectId);
    console.log('[KeyInsights] Insights loaded, count:', insights.length);
  }

  // Generate new insights
  async function generateInsights(force = false) {
    if (!projectId) {
      console.log('[KeyInsights] No projectId for generation');
      return;
    }
    
    console.log('[KeyInsights] Generating insights for project:', projectId, 'force:', force, 'analyticsData:', !!analyticsData);
    isRefreshing = true;
    try {
      await insightsStore.generateInsights(projectId, force, analyticsData);
      console.log('[KeyInsights] Insights generation completed');
      // Refresh the generation limit check after successful generation
      await insightsStore.checkGenerationLimit(projectId);
    } catch (error) {
      console.error('[KeyInsights] Error generating insights:', error);
    } finally {
      isRefreshing = false;
    }
  }

  // Refresh a specific insight
  async function refreshInsight() {
    await generateInsights(true);
  }

  // Load insights on component mount
  onMount(async () => {
    console.log('[KeyInsights] Component mounted for project:', projectId);
    // Run these sequentially to avoid race conditions with button state
    await loadInsights();
    if (projectId) {
      console.log('[KeyInsights] Checking generation limit for project:', projectId);
      // Don't await this - let it run in background without blocking UI
      insightsStore.checkGenerationLimit(projectId);
    }
  });



  // Notify parent component when insights change
  $effect(() => {
    if (onInsightsChange) {
      onInsightsChange(insights);
    }
  });

  // Format last updated time
  function formatLastUpdated(date: Date | null): string {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  }
</script>

<Card.Root class="mb-6">
  <Card.Header class="pb-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <Sparkles class="h-5 w-5" />
        </div>
        <div>
          <Card.Title class="text-xl font-semibold">Key Insights</Card.Title>
          <Card.Description>
            AI-powered analysis of your research patterns and trends
            {#if lastUpdated}
              <span class="text-xs text-muted-foreground ml-2">
                • Updated {formatLastUpdated(lastUpdated)}
              </span>
            {/if}
          </Card.Description>
        </div>
      </div>
      
      <div class="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onclick={() => showHistory = true}
          title="View insights history"
        >
          <History class="h-4 w-4 mr-2" />
          History
        </Button>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onclick={() => generateInsights(true)}
              disabled={isRefreshing || isLoading || !canGenerate}
            >
              <RefreshCw class={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Generating...' : 'Regenerate'}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            {#if !canGenerate}
              <p>You've reached your daily insight limit</p>
            {:else if isLimitCheckLoading}
              <p>Checking daily limit...</p>
            {:else if isRefreshing}
              <p>Generating insights...</p>
            {:else if isLoading}
              <p>Loading insights...</p>
            {:else}
              <p>Generate new insights for this project</p>
            {/if}
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>
  </Card.Header>
  
  <Card.Content>
    {#if isLoading && insights.length === 0}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <RefreshCw class="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Analyzing your research data...</p>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <AlertCircle class="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p class="text-sm text-destructive mb-4">{error}</p>
          {#if error.includes('Daily insight generation limit')}
            <p class="text-xs text-muted-foreground mb-4">
              You've reached the maximum of 3 insight generations per day to optimize AI costs.
              Your insights will refresh tomorrow.
            </p>
          {:else}
            <Button variant="outline" size="sm" onclick={() => loadInsights()}>
              Try Again
            </Button>
          {/if}
        </div>
      </div>
    {:else if insights.length === 0}
      <EmptyState
        title="No insights yet"
        description="Add literature and notes to your project to generate AI-powered insights about your research patterns."
        variant="data-empty"
        height="h-48"
      >
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button 
              onclick={() => generateInsights()} 
              class="mt-4"
              disabled={!canGenerate}
            >
              <Lightbulb class="h-4 w-4 mr-2" />
              Generate Insights
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            {#if !canGenerate}
              <p>You've reached your daily insight limit</p>
            {:else}
              <p>Generate AI-powered insights for this project</p>
            {/if}
          </Tooltip.Content>
        </Tooltip.Root>
      </EmptyState>
    {:else}
      <div class="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {#each insights as insight}
          <InsightCard 
            {insight} 
            onRefresh={refreshInsight}
            isRefreshing={isRefreshing}
          />
        {/each}
      </div>
      
      {#if insights.length > 0}
        <div class="mt-6 pt-4 border-t text-center">
          <p class="text-xs text-muted-foreground mb-3">
            Insights are automatically updated when your project data changes significantly.
          </p>
          <Badge variant="secondary" class="text-xs">
            <Lightbulb class="h-3 w-3 mr-1" />
            AI-Powered Analysis
          </Badge>
        </div>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>

<!-- Insights History Modal -->
<InsightsHistoryModal 
  {projectId}
  open={showHistory}
  onOpenChange={(open) => showHistory = open}
/>
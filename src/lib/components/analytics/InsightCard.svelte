<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { 
    TrendingUp, 
    Brain, 
    AlertTriangle, 
    RefreshCw, 
    Info 
  } from "lucide-svelte";

  interface Props {
    insight: {
      type: 'research_focus' | 'content_analysis' | 'research_gaps';
      content: string;
      confidence: number;
      dataPoints: string[];
    };
    onRefresh?: () => void;
    isRefreshing?: boolean;
  }

  let { insight, onRefresh, isRefreshing = false }: Props = $props();

  // Map insight types to visual properties
  const insightConfig = {
    research_focus: {
      icon: TrendingUp,
      label: "Research Focus",
      color: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      textColor: "text-blue-700 dark:text-blue-300"
    },
    content_analysis: {
      icon: Brain,
      label: "Content Analysis", 
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      textColor: "text-purple-700 dark:text-purple-300"
    },
    research_gaps: {
      icon: AlertTriangle,
      label: "Research Gaps",
      color: "bg-amber-500", 
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      textColor: "text-amber-700 dark:text-amber-300"
    }
  };

  const config = insightConfig[insight.type];
  const IconComponent = config.icon;

  // Format confidence as percentage
  const confidencePercentage = Math.round(insight.confidence * 100);
</script>

<Card.Root class={`transition-all hover:shadow-md ${config.bgColor} border-l-4 border-l-${config.color.replace('bg-', '')}`}>
  <Card.Header class="pb-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class={`p-2 rounded-lg ${config.color} text-white`}>
          <IconComponent class="h-4 w-4" />
        </div>
        <div>
          <Badge variant="secondary" class={config.textColor}>
            {config.label}
          </Badge>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Badge variant="outline" class="ml-2 text-xs">
                {confidencePercentage}%
              </Badge>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>AI Confidence: {confidencePercentage}%</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
      
      {#if onRefresh}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button 
              variant="ghost" 
              size="icon"
              onclick={onRefresh}
              disabled={isRefreshing}
              class="h-8 w-8"
            >
              <RefreshCw class={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Regenerate insight</p>
          </Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </div>
  </Card.Header>
  
  <Card.Content class="pt-0">
    <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3">
      {insight.content}
    </p>
    
    {#if insight.dataPoints.length > 0}
      <div class="border-t pt-3">
        <div class="flex items-center gap-2 mb-2">
          <Info class="h-3 w-3 text-muted-foreground" />
          <span class="text-xs font-medium text-muted-foreground">Supporting Data</span>
        </div>
        <div class="flex flex-wrap gap-1">
          {#each insight.dataPoints.slice(0, 3) as dataPoint}
            <Badge variant="outline" class="text-xs">
              {dataPoint}
            </Badge>
          {/each}
          {#if insight.dataPoints.length > 3}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Badge variant="outline" class="text-xs">
                  +{insight.dataPoints.length - 3} more
                </Badge>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div class="max-w-xs">
                  {#each insight.dataPoints.slice(3) as dataPoint}
                    <p class="text-xs">{dataPoint}</p>
                  {/each}
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          {/if}
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
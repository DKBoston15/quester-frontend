import { api } from '$lib/services/api-client';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';

const t = (key: string) => get(_)(key);

export interface Insight {
  type: 'research_focus' | 'content_analysis' | 'research_gaps';
  content: string;
  confidence: number;
  dataPoints: string[];
}

export interface HistoricalInsight {
  date: string;
  insights: Insight[];
}

interface InsightsState {
  insights: Record<string, Insight[]>; // projectId -> insights
  loading: Record<string, boolean>;    // projectId -> loading state
  error: Record<string, string | null>; // projectId -> error
  lastUpdated: Record<string, Date>;   // projectId -> last update time
  historicalInsights: Record<string, HistoricalInsight[]>; // projectId -> historical insights
  historyLoading: Record<string, boolean>; // projectId -> history loading state
  canGenerate: Record<string, boolean>; // projectId -> can generate more insights today
  limitCheckLoading: Record<string, boolean>; // projectId -> checking limit state
}

class InsightsStore {
  private state = $state<InsightsState>({
    insights: {},
    loading: {},
    error: {},
    lastUpdated: {},
    historicalInsights: {},
    historyLoading: {},
    canGenerate: {},
    limitCheckLoading: {}
  });

  // Getters
  getInsights(projectId: string): Insight[] {
    return this.state.insights[projectId] || [];
  }

  isLoading(projectId: string): boolean {
    return this.state.loading[projectId] || false;
  }

  getError(projectId: string): string | null {
    return this.state.error[projectId] || null;
  }

  getLastUpdated(projectId: string): Date | null {
    return this.state.lastUpdated[projectId] || null;
  }

  getHistoricalInsights(projectId: string): HistoricalInsight[] {
    return this.state.historicalInsights[projectId] || [];
  }

  isHistoryLoading(projectId: string): boolean {
    return this.state.historyLoading[projectId] || false;
  }

  canGenerateInsights(projectId: string): boolean {
    return this.state.canGenerate[projectId] !== false; // Default to true if not checked yet
  }

  isLimitCheckLoading(projectId: string): boolean {
    return this.state.limitCheckLoading[projectId] || false;
  }

  // Load insights from API (with caching)
  async loadInsights(projectId: string): Promise<void> {
    // Check if we have recent insights (within 30 minutes)
    const lastUpdate = this.state.lastUpdated[projectId];
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    if (lastUpdate && lastUpdate > thirtyMinutesAgo && this.state.insights[projectId]?.length > 0) {
      return; // Use cached data
    }

    this.state.loading[projectId] = true;
    this.state.error[projectId] = null;

    try {
      const response = await api.get(`/projects/${projectId}/insights`);
      
      if (response.success) {
        this.state.insights[projectId] = response.data;
        this.state.lastUpdated[projectId] = new Date();
      } else {
        throw new Error(response.error || t('common.insightsStore.failedToLoadInsights'));
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      this.state.error[projectId] = error instanceof Error ? error.message : t('common.insightsStore.failedToLoadInsights');
    } finally {
      this.state.loading[projectId] = false;
    }
  }

  // Generate new insights (bypass cache)
  async generateInsights(projectId: string, force = false, analyticsData?: any): Promise<void> {
    this.state.loading[projectId] = true;
    this.state.error[projectId] = null;

    try {
      const payload: any = { force };
      if (analyticsData) {
        payload.analyticsData = analyticsData;
      }
      
      const response = await api.post(`/projects/${projectId}/insights/generate`, payload);
      
      if (response.success) {
        this.state.insights[projectId] = response.data;
        this.state.lastUpdated[projectId] = new Date();
      } else {
        throw new Error(response.error || t('common.insightsStore.failedToGenerateInsights'));
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      this.state.error[projectId] = error instanceof Error ? error.message : t('common.insightsStore.failedToGenerateInsights');
    } finally {
      this.state.loading[projectId] = false;
    }
  }

  // Get cached insights without API call
  async getCachedInsights(projectId: string): Promise<Insight[]> {
    try {
      const response = await api.get(`/projects/${projectId}/insights/cached`);
      
      if (response.success) {
        this.state.insights[projectId] = response.data;
        this.state.lastUpdated[projectId] = new Date();
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting cached insights:', error);
      return [];
    }
  }

  // Check if insights need refresh based on project data changes
  shouldRefreshInsights(projectId: string, lastDataUpdate: Date): boolean {
    const lastInsightUpdate = this.state.lastUpdated[projectId];
    
    if (!lastInsightUpdate) return true;
    
    // Refresh if project data was updated after last insight generation
    return lastDataUpdate > lastInsightUpdate;
  }

  // Clear insights for a project
  clearInsights(projectId: string): void {
    delete this.state.insights[projectId];
    delete this.state.loading[projectId];
    delete this.state.error[projectId];
    delete this.state.lastUpdated[projectId];
  }

  // Load historical insights from API
  async loadHistoricalInsights(projectId: string): Promise<void> {
    this.state.historyLoading[projectId] = true;

    try {
      const response = await api.get(`/projects/${projectId}/insights/history`);
      
      if (response.success) {
        this.state.historicalInsights[projectId] = response.data;
      } else {
        throw new Error(response.error || t('common.insightsStore.failedToLoadHistoricalInsights'));
      }
    } catch (error) {
      console.error('Error loading historical insights:', error);
      // Don't set error state for history loading to avoid disrupting main UI
    } finally {
      this.state.historyLoading[projectId] = false;
    }
  }

  // Check if user can generate more insights today
  async checkGenerationLimit(projectId: string): Promise<void> {
    this.state.limitCheckLoading[projectId] = true;

    try {
      const response = await api.get(`/projects/${projectId}/insights/can-generate`);
      
      if (response.success) {
        this.state.canGenerate[projectId] = response.canGenerate;
      } else {
        // If we can't check the limit, assume they can generate (fail open)
        this.state.canGenerate[projectId] = true;
      }
    } catch (error) {
      console.error('Error checking generation limit:', error);
      // If we can't check the limit, assume they can generate (fail open)
      this.state.canGenerate[projectId] = true;
    } finally {
      this.state.limitCheckLoading[projectId] = false;
    }
  }

  // Clear all insights
  clearAll(): void {
    this.state.insights = {};
    this.state.loading = {};
    this.state.error = {};
    this.state.lastUpdated = {};
    this.state.historicalInsights = {};
    this.state.historyLoading = {};
    this.state.canGenerate = {};
    this.state.limitCheckLoading = {};
  }

  // Subscribe to insights for a project
  subscribe(projectId: string, callback: (insights: Insight[]) => void): () => void {
    let currentInsights = this.getInsights(projectId);
    
    // Call immediately with current state
    callback(currentInsights);
    
    // Set up reactive subscription
    const unsubscribe = $effect.root(() => {
      $effect(() => {
        const newInsights = this.getInsights(projectId);
        if (newInsights !== currentInsights) {
          currentInsights = newInsights;
          callback(newInsights);
        }
      });
    });
    
    return unsubscribe;
  }
}

// Export singleton instance
export const insightsStore = new InsightsStore();
<!-- src/lib/components/custom-ui/literature/ProcessingStatus.svelte -->
<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    RefreshCw,
    ChevronDown,
    FileText,
    Download,
    Files,
    CalendarClock,
    Timer
  } from "lucide-svelte";
  import { API_BASE_URL } from "$lib/config";
  import { onMount, createEventDispatcher } from "svelte";
  import { processingJobsStore } from "$lib/stores/ProcessingJobsStore.svelte";

  const dispatch = createEventDispatcher();

  const { jobId, autoRefresh = true, showDetails = true } = $props<{
    jobId: string | undefined | null;
    autoRefresh?: boolean;
    showDetails?: boolean;
  }>();

  interface ProcessingJob {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    totalItems: number;
    errorMessage?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    metadata?: any;
    results?: any;
  }

  interface ProcessingFile {
    id: string;
    filename: string;
    fileType: string;
    size: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    pageCount?: number;
    extractionErrors?: string[];
    createdAt: string;
    updatedAt: string;
  }

  interface ProcessingStatus {
    job: ProcessingJob;
    files: ProcessingFile[];
  }

  let status = $state<ProcessingStatus | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isExpanded = $state(false);
  let refreshInterval: NodeJS.Timeout | null = null;
  let isUploading = $state(false);
  let uploadProgress = $state(0);

  async function fetchStatus() {
    try {
      isLoading = true;
      error = null;

      if (!jobId) {
        isLoading = false;
        return; // nothing to fetch
      }
      
      // Check if this job is still uploading
      const jobInfo = processingJobsStore.getJob(jobId);
      let shouldSimulateUpload = jobInfo?.isUploading || isUploading; // Keep simulating if already simulating
      
      // Always try to fetch real status from server, even while uploading
      let serverData = null;
      try {
        const response = await fetch(`${API_BASE_URL}/processing-jobs/${jobId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          serverData = await response.json();
        }
      } catch (fetchError) {
        // Server data not available yet, that's okay if we're uploading
        console.log('Server data not yet available:', fetchError);
      }
      
      // Decide whether to show simulated or real progress
      if (serverData) {
        const serverProgress = serverData.job?.progress || 0;
        
        // Keep simulating if we're still in upload phase and server progress is less than our simulation
        if (shouldSimulateUpload && serverProgress <= uploadProgress) {
          // Continue upload simulation
          isUploading = true;
          uploadProgress = Math.min(uploadProgress + Math.random() * 15, 90);
          
          // Use server data but override progress with our simulation
          status = {
            ...serverData,
            job: {
              ...serverData.job,
              progress: uploadProgress
            }
          };
        } else {
          // Server progress has caught up or exceeded simulation, use real data
          if (isUploading) {
            isUploading = false;
            processingJobsStore.setUploaded(jobId);
          }
          status = serverData;
        }
      } else if (shouldSimulateUpload) {
        // No server data yet, continue simulating
        isUploading = true;
        uploadProgress = Math.min(uploadProgress + Math.random() * 15, 90);
        
        // Create a mock status to show immediate feedback
        status = {
          job: {
            id: jobId,
            type: 'document_processing',
            status: 'pending',
            progress: uploadProgress, // Use simulated progress here too
            totalItems: jobInfo.files?.length || 0,
            createdAt: new Date().toISOString()
          },
          files: jobInfo.files?.map(f => ({
            id: crypto.randomUUID(),
            filename: f.filename,
            fileType: f.filename.split('.').pop() || 'unknown',
            size: f.size,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })) || []
        };
      } else {
        // No server data and not uploading - might be an error
        throw new Error('Failed to fetch processing status');
      }

        // Stop auto-refresh if job is complete (only check if we have real server data)
        if (status?.job && (status.job.status === 'completed' || status.job.status === 'failed')) {
          stopAutoRefresh();

          // Force visual completion to 100% so users see completion before close
          if (status.job.status === 'completed') {
            status.job.progress = 100;
          }

          // Slightly delay closing so 100% is visible, then dispatch completion
          setTimeout(() => {
            // Capture target literature before the store entry is removed
            let targetId: string | undefined
            try {
              const info = processingJobsStore.getJob(status.job!.id)
              targetId = info?.targetLiteratureId
            } catch {}

            // Dispatch completion event (ProcessingTray will remove the card)
            dispatch('processing-complete', {
              jobId: status.job!.id,
              status: status.job!.status,
              results: status.job!.results,
            })

            // If this was an attach flow, always reload the page to reflect changes
            if (targetId) {
              try {
                window.dispatchEvent(new CustomEvent('quester:literature-updated', { detail: { literatureId: targetId } }))
              } catch {}
              // Hard refresh to ensure UI reflects the new attachment
              window.location.reload()
            }
          }, 1700) // keep the card visible at 100% a bit longer before closing + refresh
        }

    } catch (err) {
      console.error('Error fetching processing status:', err);
      error = err instanceof Error ? err.message : 'Failed to fetch status';
    } finally {
      isLoading = false;
    }
  }

  function startAutoRefresh() {
    if (!jobId) return;
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(() => {
      if (status?.job.status === 'pending' || status?.job.status === 'processing') {
        fetchStatus();
      } else {
        stopAutoRefresh();
      }
    }, 2000); // Refresh every 2 seconds
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function handleManualRefresh() {
    fetchStatus();
  }

  function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending':
        return Clock;
      case 'processing':
        return Loader2;
      case 'completed':
        return CheckCircle2;
      case 'failed':
        return AlertCircle;
      default:
        return FileText;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function formatDuration(startDate: string, endDate?: string): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async function downloadDocument(fileId: string, filename: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${fileId}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      
      // Create a download link with proper filename
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Download error:', err);
      // Could show a toast error here
    }
  }

  // Mount and unmount logic
  onMount(() => {
    fetchStatus();
    
    if (autoRefresh) {
      startAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  });

  // Reactive effect to handle auto-refresh changes
  $effect(() => {
    if (!jobId) {
      stopAutoRefresh();
      return;
    }
    if (autoRefresh && status?.job?.status && ['pending', 'processing'].includes(status.job.status)) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
</script>

<Card class="shadow-lg border-muted">
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle class="text-lg flex items-center space-x-2">
        {#if status?.job}
          {#snippet jobStatusIcon()}
            {@const StatusIcon = getStatusIcon(status.job.status)}
            <StatusIcon 
              class="h-5 w-5 {status.job.status === 'processing' ? 'animate-spin' : ''}"
            />
          {/snippet}
          {@render jobStatusIcon()}
          <span>Document Processing</span>
        {:else}
          <Loader2 class="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        {/if}
      </CardTitle>
      
      <div class="flex items-center space-x-2">
        {#if status?.job}
          <Badge variant={getStatusBadgeVariant(status.job.status)} class="capitalize">
            {status.job.status}
          </Badge>
        {/if}
        
        <Button
          variant="ghost"
          size="sm"
          onclick={handleManualRefresh}
          disabled={isLoading}
        >
          <RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent class="space-y-4 pt-4">
    {#if error}
      <div class="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded-lg">
        <AlertCircle class="h-5 w-5" />
        <span>{error}</span>
      </div>
    {/if}

    {#if status?.job}
      <!-- Progress Section -->
      {#if isUploading || status.job.status === 'pending' || status.job.status === 'processing'}
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">
              {#if isUploading}
                Uploading {status.job.totalItems} {status.job.totalItems === 1 ? 'file' : 'files'}...
              {:else}
                Processing {status.job.totalItems} {status.job.totalItems === 1 ? 'document' : 'documents'}...
              {/if}
            </span>
            <span class="font-semibold">{Math.round(status.job.progress || 0)}%</span>
          </div>
          <div class="relative">
            <Progress value={status.job.progress || 0} class="h-2" />
          </div>
        </div>
      {/if}

      <!-- Job Summary -->
      <div class="flex items-center justify-between gap-4 p-3 pr-6 bg-muted/50 rounded-lg flex-wrap overflow-hidden">
        <div class="flex items-center gap-2 text-sm min-w-0">
          <Files class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span class="text-muted-foreground">Total Files:</span>
          <span class="font-medium truncate">{status.job.totalItems}</span>
        </div>
        
        <div class="flex items-center gap-2 text-sm min-w-0">
          <CalendarClock class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span class="text-muted-foreground">Started:</span>
          <span class="font-medium truncate">
            {#if status.job.startedAt}
              {new Date(status.job.startedAt).toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: '2-digit',
                hour12: true 
              })}
            {:else}
              Pending
            {/if}
          </span>
        </div>
        
        <div class="flex items-center gap-2 text-sm min-w-0">
          <Timer class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span class="text-muted-foreground">Duration:</span>
          <span class="font-medium truncate">
            {#if status.job.startedAt}
              {formatDuration(status.job.startedAt, status.job.completedAt)}
            {:else}
              -
            {/if}
          </span>
        </div>
      </div>

      <!-- Error Message -->
      {#if status.job.errorMessage}
        <div class="p-3 bg-destructive/10 text-destructive rounded-lg">
          <div class="flex items-center space-x-2 mb-1">
            <AlertCircle class="h-4 w-4" />
            <span class="font-medium">Error</span>
          </div>
          <p class="text-sm">{status.job.errorMessage}</p>
        </div>
      {/if}

      <!-- Results Summary -->
      {#if status.job.results && status.job.status === 'completed'}
        <div class="p-3 bg-muted/50 rounded-lg border border-muted">
          <h4 class="font-medium mb-2 text-sm">Processing Complete</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-green-600" />
              <span class="text-muted-foreground">Successful:</span>
              <span class="font-semibold text-green-600">
                {status.job.results.successfulDocuments || 0}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <AlertCircle class="h-4 w-4 text-destructive" />
              <span class="text-muted-foreground">Failed:</span>
              <span class="font-semibold text-destructive">
                {status.job.results.failedDocuments || 0}
              </span>
            </div>
          </div>
        </div>
      {/if}

      <!-- File Details -->
      {#if showDetails && status.files.length > 0}
        <Collapsible.Root bind:open={isExpanded}>
          <Collapsible.Trigger asChild let:builder>
            <Button builders={[builder]} variant="ghost" class="w-full justify-between p-0">
              <span class="font-medium">
                File Details ({status.files.length})
              </span>
              <ChevronDown class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}" />
            </Button>
          </Collapsible.Trigger>
          
          <Collapsible.Content class="space-y-2 mt-4">
            {#each status.files as file (file.id)}
              {#snippet fileIcon()}
                {@const StatusIcon = getStatusIcon(file.status)}
                <StatusIcon 
                  class="h-4 w-4 flex-shrink-0 {file.status === 'processing' ? 'animate-spin' : ''}"
                />
              {/snippet}
              
              <div class="border rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2 flex-1 min-w-0">
                    {@render fileIcon()}
                    <span class="font-medium truncate">{file.filename}</span>
                  </div>
                  
                  <div class="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(file.status)} class="text-xs">
                      {file.status}
                    </Badge>
                    
                    {#if file.status === 'completed'}
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => downloadDocument(file.id, file.filename)}
                      >
                        <Download class="h-3 w-3" />
                      </Button>
                    {/if}
                  </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>Size: {formatFileSize(file.size)}</div>
                  <div>Type: {file.fileType}</div>
                  {#if file.pageCount}
                    <div>Pages: {file.pageCount}</div>
                  {/if}
                  <div>Updated: {formatDate(file.updatedAt)}</div>
                </div>

                {#if file.extractionErrors && file.extractionErrors.length > 0}
                  <div class="mt-2 p-2 bg-destructive/10 text-destructive rounded">
                    <div class="text-xs font-medium mb-1">Extraction Errors:</div>
                    <ul class="text-xs list-disc list-inside">
                      {#each file.extractionErrors as error}
                        <li>{error}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/each}
          </Collapsible.Content>
        </Collapsible.Root>
      {/if}
    {/if}
  </CardContent>
</Card>

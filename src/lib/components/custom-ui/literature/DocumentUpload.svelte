<!-- src/lib/components/custom-ui/literature/DocumentUpload.svelte -->
<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import { Badge } from "$lib/components/ui/badge";
  import { 
    Upload, 
    FileText, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    Loader2,
    Clock
  } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import { API_BASE_URL } from "$lib/config";
  import { auth } from "$lib/stores/AuthStore.svelte";

  const dispatch = createEventDispatcher();

  const { projectId, isOpen, onOpenChange } = $props<{
    projectId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }>();

  // Upload state
  let dragOver = $state(false);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let uploadedFiles = $state<UploadedFile[]>([]);
  let processingJobId = $state<string | null>(null);
  let uploadError = $state<string | null>(null);

  // Processing state
  let isPollingStatus = $state(false);
  let processingStatus = $state<ProcessingStatus | null>(null);
  let statusPollingInterval: NodeJS.Timeout | null = null;

  interface UploadedFile {
    id: string;
    filename: string;
    size: number;
    status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
  }

  interface ProcessingStatus {
    job: {
      id: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      totalItems: number;
      errorMessage?: string;
    };
    files: Array<{
      id: string;
      filename: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      extractionErrors?: string[];
    }>;
  }

  // File validation
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    const files = Array.from(event.dataTransfer?.files || []);
    handleFiles(files);
  }

  function handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    handleFiles(files);
    input.value = ''; // Reset input
  }

  function handleFiles(files: File[]) {
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      uploadError = `File validation errors:\n${errors.join('\n')}`;
      return;
    }

    if (validFiles.length > 10) {
      uploadError = 'Maximum 10 files allowed per upload';
      return;
    }

    uploadFiles(validFiles);
  }

  function validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    // Check file type
    const hasValidType = ALLOWED_TYPES.includes(file.type);
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidType && !hasValidExtension) {
      return { 
        valid: false, 
        error: 'File type not supported. Please upload PDF, DOCX, DOC, or TXT files' 
      };
    }

    return { valid: true };
  }

  async function uploadFiles(files: File[]) {
    isUploading = true;
    uploadProgress = 0;
    uploadError = null;

    // Initialize uploaded files tracking
    uploadedFiles = files.map((file, index) => ({
      id: `temp-${index}`,
      filename: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
    }));

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      
      files.forEach((file, index) => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Update uploaded files with server response
      uploadedFiles = result.uploadedFiles.map((file: any) => ({
        id: file.id,
        filename: file.filename,
        size: file.size,
        status: 'uploaded',
        progress: 100,
      }));

      processingJobId = result.jobId;
      uploadProgress = 100;

      // Start polling for processing status
      startStatusPolling();

    } catch (error) {
      console.error('Upload error:', error);
      uploadError = error instanceof Error ? error.message : 'Upload failed';
      
      // Mark all files as failed
      uploadedFiles = uploadedFiles.map(file => ({
        ...file,
        status: 'failed',
        error: uploadError || 'Upload failed',
      }));
    } finally {
      isUploading = false;
    }
  }

  async function startStatusPolling() {
    if (!processingJobId) return;

    isPollingStatus = true;
    
    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/processing-jobs/${processingJobId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to get processing status');
        }

        const status = await response.json();
        processingStatus = status;

        // Update file statuses
        uploadedFiles = uploadedFiles.map(uploadedFile => {
          const serverFile = status.files.find((f: any) => f.id === uploadedFile.id);
          if (serverFile) {
            return {
              ...uploadedFile,
              status: serverFile.status,
              error: serverFile.extractionErrors?.join(', '),
            };
          }
          return uploadedFile;
        });

        // Stop polling if job is complete
        if (status.job.status === 'completed' || status.job.status === 'failed') {
          clearInterval(statusPollingInterval!);
          statusPollingInterval = null;
          isPollingStatus = false;

          // Dispatch event to refresh literature list
          if (status.job.status === 'completed') {
            dispatch('documents-processed', {
              jobId: processingJobId,
              files: uploadedFiles.filter(f => f.status === 'completed'),
            });
          }
        }

      } catch (error) {
        console.error('Status polling error:', error);
        // Continue polling in case of temporary errors
      }
    };

    // Poll immediately and then every 2 seconds
    await pollStatus();
    statusPollingInterval = setInterval(pollStatus, 2000);
  }

  function resetUpload() {
    uploadedFiles = [];
    processingJobId = null;
    uploadError = null;
    uploadProgress = 0;
    processingStatus = null;
    
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
    
    isPollingStatus = false;
  }

  function handleClose() {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
    
    resetUpload();
    onOpenChange(false);
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'uploading':
      case 'processing':
        return Loader2;
      case 'uploaded':
      case 'pending':
        return Clock;
      case 'completed':
        return CheckCircle2;
      case 'failed':
        return AlertCircle;
      default:
        return FileText;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  }

  // Cleanup on component destroy
  $effect(() => {
    return () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
    };
  });
</script>

<Dialog.Root open={isOpen} onOpenChange={handleClose}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
    <Dialog.Content class="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-[95vw] max-w-4xl rounded-lg border bg-background shadow-lg">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b p-6">
        <Dialog.Title class="text-xl font-semibold">Upload Documents</Dialog.Title>
        <Button variant="ghost" size="sm" onclick={handleClose}>
          <X class="h-4 w-4" />
        </Button>
      </div>

      <!-- Content -->
      <div class="max-h-[70vh] overflow-y-auto p-6">
        
        {#if uploadedFiles.length === 0}
          <!-- Upload Zone -->
          <div
            class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}"
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
          >
            <Upload class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 class="text-lg font-medium mb-2">Drop documents here or click to browse</h3>
            <p class="text-sm text-muted-foreground mb-4">
              Supports PDF, DOCX, DOC, and TXT files (max 50MB each, 10 files per upload)
            </p>
            
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt"
              onchange={handleFileInput}
              class="hidden"
              id="file-input"
            />
            
            <Button onclick={() => document.getElementById('file-input')?.click()}>
              Select Files
            </Button>
          </div>

        {:else}
          <!-- File List -->
          <div class="space-y-4">
            
            {#if isUploading}
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium">Uploading files...</span>
                  <span class="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} class="w-full" />
              </div>
            {/if}

            {#if processingStatus}
              <div class="bg-muted/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium">Processing Status</span>
                  <Badge variant={processingStatus.job.status === 'completed' ? 'default' : 'secondary'}>
                    {processingStatus.job.status}
                  </Badge>
                </div>
                
                {#if processingStatus.job.status === 'processing'}
                  <div class="space-y-2">
                    <div class="flex items-center justify-between text-sm">
                      <span>Extracting metadata and text...</span>
                      <span>{processingStatus.job.progress}%</span>
                    </div>
                    <Progress value={processingStatus.job.progress} class="w-full" />
                  </div>
                {/if}

                {#if processingStatus.job.errorMessage}
                  <div class="mt-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
                    {processingStatus.job.errorMessage}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Individual Files -->
            <div class="space-y-2">
              {#each uploadedFiles as file (file.id)}
                <div class="flex items-center justify-between p-3 border rounded-lg">
                  <div class="flex items-center space-x-3 flex-1 min-w-0">
                    <div class="flex-shrink-0">
                      {#if file.status === 'uploading' || file.status === 'processing'}
                        <Loader2 class="h-5 w-5 {getStatusColor(file.status)} animate-spin" />
                      {:else}
                        {#snippet statusIcon()}
                          {@const StatusIcon = getStatusIcon(file.status)}
                          <StatusIcon class="h-5 w-5 {getStatusColor(file.status)}" />
                        {/snippet}
                        {@render statusIcon()}
                      {/if}
                    </div>
                    
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">{file.filename}</p>
                      <p class="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {file.status}
                      </p>
                      
                      {#if file.error}
                        <p class="text-xs text-destructive mt-1">{file.error}</p>
                      {/if}
                    </div>
                  </div>

                  <Badge variant={file.status === 'completed' ? 'default' : file.status === 'failed' ? 'destructive' : 'secondary'}>
                    {file.status}
                  </Badge>
                </div>
              {/each}
            </div>

            <!-- Upload More Button -->
            {#if !isUploading && !isPollingStatus}
              <Button 
                variant="outline" 
                onclick={resetUpload}
                class="w-full"
              >
                Upload More Documents
              </Button>
            {/if}
          </div>
        {/if}

        {#if uploadError}
          <div class="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            <div class="flex items-center space-x-2">
              <AlertCircle class="h-5 w-5" />
              <span class="font-medium">Upload Error</span>
            </div>
            <p class="mt-1 text-sm whitespace-pre-line">{uploadError}</p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t p-6 flex justify-end space-x-2">
        <Button variant="outline" onclick={handleClose}>
          {uploadedFiles.length > 0 ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  /* Custom styles for drag and drop */
  .drag-over {
    @apply border-primary bg-primary/5;
  }
</style>
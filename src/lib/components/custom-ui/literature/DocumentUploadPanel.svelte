<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Clock,
  } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import { API_BASE_URL } from "$lib/config";
  import { auth } from "$lib/stores/AuthStore";
  import { processingJobsStore } from "$lib/stores/ProcessingJobsStore.svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  const dispatch = createEventDispatcher();

  const { projectId, attachLiteratureId = undefined } = $props<{
    projectId: string;
    attachLiteratureId?: string;
  }>();

  // Upload state
  let dragOver = $state(false);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let uploadedFiles = $state<UploadedFile[]>([]);
  let processingJobId = $state<string | null>(null);
  let uploadError = $state<string | null>(null);
  let mergeMode = $state<"fill-empty" | "override">("fill-empty");

  // We no longer need processing state here - it's handled by ProcessingStatus component

  interface UploadedFile {
    id: string;
    filename: string;
    size: number;
    status: "uploading" | "uploaded" | "processing" | "completed" | "failed";
    progress: number;
    error?: string;
  }

  // File validation
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
  ];
  const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];

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
    input.value = ""; // Reset input
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
      uploadError = `${t("documentUpload.validationErrors")}:\n${errors.join("\n")}`;
      return;
    }

    if (validFiles.length > 5) {
      uploadError = t("documentUpload.maxFilesExceeded");
      return;
    }

    uploadFiles(validFiles);
  }

  function validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: t("documentUpload.fileSizeExceeds") };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      // Fallback to extension check if type is empty or unrecognized
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: t("documentUpload.unsupportedFileType") };
      }
    }
    return { valid: true };
  }

  async function uploadFiles(files: File[]) {
    uploadError = null;
    isUploading = true;
    uploadProgress = 0;

    try {
      // Store files info for the processing modal
      const filesInfo = files.map((file) => ({
        filename: file.name,
        size: file.size,
      }));

      // Immediately notify that upload is starting and close dialog
      dispatch("upload-starting", { files: filesInfo });

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      // Backend validator requires projectId in body even when present in route
      if (projectId) formData.append("projectId", projectId);
      if (attachLiteratureId)
        formData.append("literatureId", attachLiteratureId);
      if (attachLiteratureId) formData.append("mergeMode", mergeMode);

      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/documents/upload`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("documentUploadPanel.uploadFailed"));
      }

      const result = await response.json();
      processingJobId = result.jobId;

      // Notify and persist globally
      if (processingJobId) {
        dispatch("upload-started", { jobId: processingJobId });
        processingJobsStore.add(processingJobId, filesInfo, attachLiteratureId);

        // Close the upload dialog after successful upload
        // The ProcessingStatus modal will handle showing progress
        dispatch("upload-complete", { jobId: processingJobId });
      }
    } catch (error) {
      console.error("Upload error:", error);
      uploadError = error instanceof Error ? error.message : t("documentUploadPanel.uploadFailed");

      // Mark all files as failed
      uploadedFiles = uploadedFiles.map((file) => ({
        ...file,
        status: "failed",
        error: uploadError || t("documentUploadPanel.uploadFailed"),
      }));
    } finally {
      isUploading = false;
    }
  }

  // Status polling is now handled by ProcessingStatus component

  function resetUpload() {
    uploadedFiles = [];
    processingJobId = null;
    uploadError = null;
    uploadProgress = 0;
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "uploading":
      case "processing":
        return Loader2;
      case "uploaded":
      case "pending":
        return Clock;
      case "completed":
        return CheckCircle2;
      case "failed":
        return AlertCircle;
      default:
        return FileText;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "processing":
        return "text-blue-600";
      case "uploading":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  }
</script>

<!-- Inline Upload UI for use inside Add Literature dialog -->
<div class="space-y-6">
  <!-- Upload Zone -->
  <div
    class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragOver
      ? 'border-primary bg-primary/5'
      : 'border-muted-foreground/25'}"
    role="button"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <Upload class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
    <h3 class="text-lg font-medium mb-2">
      {$_("documentUpload.dropOrBrowse")}
    </h3>
    <p class="text-sm text-muted-foreground mb-4">
      {$_("documentUpload.supportedFormats")}
    </p>

    {#if attachLiteratureId}
      <div class="max-w-md mx-auto text-left mb-4">
        <p class="text-sm font-medium mb-2">{$_("documentUpload.whenMetadataExtracted")}:</p>
        <div class="space-y-2 text-sm">
          <label class="flex items-center gap-2">
            <input
              type="radio"
              name="merge-mode"
              value="fill-empty"
              bind:group={mergeMode}
            />
            <span>{$_("documentUpload.fillEmptyOnly")}</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="radio"
              name="merge-mode"
              value="override"
              bind:group={mergeMode}
            />
            <span>{$_("documentUpload.overrideExisting")}</span>
          </label>
        </div>
      </div>
    {/if}

    <input
      type="file"
      multiple
      accept=".pdf,.docx,.doc,.txt"
      onchange={handleFileInput}
      class="hidden"
      id="file-input-inline"
    />

    <Button
      onclick={() => document.getElementById("file-input-inline")?.click()}
    >
      {$_("documentUpload.selectFiles")}
    </Button>
  </div>

  {#if uploadError}
    <div class="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
      <div class="flex items-center space-x-2">
        <AlertCircle class="h-5 w-5" />
        <span class="font-medium">{$_("documentUpload.uploadError")}</span>
      </div>
      <p class="mt-1 text-sm whitespace-pre-line">{uploadError}</p>
    </div>
  {/if}

  <!-- Processing Feedback Callout -->
  <div
    class="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg"
  >
    <p class="text-sm text-amber-900 dark:text-amber-100">
      <span class="font-medium">{$_("documentUpload.improvingProcessing")}</span>
      {" "}{$_("documentUpload.feedbackNote")}
    </p>
  </div>
</div>

<style>
</style>

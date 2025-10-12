<script lang="ts">
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import { projectStore } from "$lib/stores/ProjectStore";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import LiteratureDetails from "$lib/components/custom-ui/literature/literatureItem/LiteratureDetails.svelte";
  import LiteratureStatus from "$lib/components/custom-ui/literature/literatureItem/LiteratureStatus.svelte";
  import LiteratureDesigns from "$lib/components/custom-ui/literature/literatureItem/LiteratureDesigns.svelte";
  import Keywords from "$lib/components/custom-ui/literature/literatureItem/Keywords.svelte";
  import LiteratureInsights from "$lib/components/custom-ui/literature/literatureItem/LiteratureInsights.svelte";
  import {
    ArrowLeft,
    Trash2,
    Eye,
    Download,
    Upload,
    Flag,
  } from "lucide-svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { navigate } from "svelte-routing";
  import type { Literature } from "$lib/types/literature";
  import { API_BASE_URL } from "$lib/config";
  import Reference from "$lib/components/custom-ui/literature/literatureItem/Reference.svelte";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import DocumentUploadPanel from "$lib/components/custom-ui/literature/DocumentUploadPanel.svelte";
  import FeedbackAPI from "$lib/services/feedback-api";
  import { toast } from "svelte-sonner";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { ChevronDown } from "lucide-svelte";

  const { literatureId } = $props<{ literatureId: string }>();
  let selectedTab = $state("details");
  let literature = $state<Literature | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let showDeleteDialog = $state(false);
  let isDeleting = $state(false);
  let showAttachDialog = $state(false);
  let showFeedbackDialog = $state(false);
  let feedbackComment = $state("");
  let isSubmittingFeedback = $state(false);

  $effect(() => {
    const projectId = projectStore.currentProject?.id;

    if (!literatureId || !projectId) {
      error = "Invalid literature or project ID";
      return;
    }

    loadLiterature(literatureId);
  });

  // Refresh this literature when processing completes for an attach action
  $effect.root(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { literatureId?: string }
        | undefined;
      if (detail?.literatureId && literature?.id === detail.literatureId) {
        // Force reload the literature data from the server
        await loadLiterature(detail.literatureId);
      }
    };
    window.addEventListener(
      "quester:literature-updated",
      handler as EventListener
    );
    return () =>
      window.removeEventListener(
        "quester:literature-updated",
        handler as EventListener
      );
  });

  async function loadLiterature(id: string) {
    try {
      isLoading = true;
      // Force reload the literature data from the server
      await literatureStore.loadLiterature(
        projectStore.currentProject?.id || ""
      );
      // Find the updated literature item
      literature = literatureStore.data.find((lit) => lit.id === id) || null;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load literature";
      console.error("Error loading literature:", err);
    } finally {
      isLoading = false;
    }
  }

  function handleBack() {
    const projectId = projectStore.currentProject?.id;
    if (projectId) {
      navigate(`/project/${projectId}/literature`);
    }
  }

  async function handleDelete() {
    if (!literature?.id) return;

    try {
      isDeleting = true;
      await literatureStore.deleteLiterature(literature.id);
      const projectId = projectStore.currentProject?.id;
      if (projectId) {
        navigate(`/project/${projectId}/literature`);
      }
    } catch (err) {
      console.error("Error deleting literature:", err);
    } finally {
      isDeleting = false;
    }
  }

  let citedPage = $state<number | null>(null);

  // Read cited page from query (e.g., ?p=3)
  $effect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("p");
      citedPage = p ? Number(p) : null;
      if (Number.isNaN(citedPage)) citedPage = null;
    } catch {}
  });

  async function previewDocument(page?: number) {
    if (!literature?.sourceFileId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${literature.sourceFileId}/download?preview=true`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get preview URL");
      }

      const data = await response.json();

      // Fetch the PDF through CORS-enabled request, then create blob URL
      const pdfResponse = await fetch(data.downloadUrl, {
        method: "GET",
        mode: "cors",
      });

      if (!pdfResponse.ok) {
        throw new Error("Failed to fetch PDF");
      }

      const pdfBlob = await pdfResponse.blob();
      // Create blob with correct MIME type for PDF
      const typedBlob = new Blob([pdfBlob], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(typedBlob);

      // Open blob URL (no CORS issues). If a page was provided, append #page=
      const urlWithAnchor = page ? `${blobUrl}#page=${page}` : blobUrl;
      window.open(urlWithAnchor, "_blank");

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error("Preview error:", err);
    }
  }

  async function downloadDocument() {
    if (!literature?.sourceFileId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${literature.sourceFileId}/download`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }

      const data = await response.json();

      // Create a download link
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
    }
  }

  async function submitFeedback() {
    if (!literature?.id || !projectStore.currentProject?.id) return;

    try {
      isSubmittingFeedback = true;

      await FeedbackAPI.createFeedback({
        projectId: projectStore.currentProject.id,
        subjectType: "literature",
        subjectId: literature.id,
        feedbackType: "processing_issue",
        title: `Processing issue reported for "${literature.name}"`,
        description: feedbackComment.trim() || undefined,
        metadata: {
          literatureTitle: literature.name,
          hasDocument: !!literature.sourceFileId,
          userAgent: navigator.userAgent,
        },
      });

      toast.success("Feedback submitted successfully!", {
        description: "Thank you for helping us improve!",
      });

      showFeedbackDialog = false;
      feedbackComment = "";
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback", {
        description:
          "Please try again or contact support if the issue persists.",
      });
    } finally {
      isSubmittingFeedback = false;
    }
  }

  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#lit-view-header",
        popover: {
          title: "Literature Item Details",
          description:
            "This page provides a detailed view of a single literature item. Here you can manage its details, track status, add keywords, view insights, and generate citations.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#lit-view-back-button",
        popover: {
          title: "Go Back",
          description: "Return to the main literature list for this project.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#lit-view-preview-button",
        popover: {
          title: "View Document",
          description:
            "Open the original document file in your browser for reading and review.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#lit-view-download-button",
        popover: {
          title: "Download Document",
          description: "Download the original document file to your computer.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#lit-view-delete-button",
        popover: {
          title: "Delete Item",
          description:
            "Permanently remove this literature item and all associated notes from your project.",
          side: "left",
          align: "end",
        },
      },
      {
        element: "#lit-status-card",
        popover: {
          title: "Track Reading Status",
          description:
            "Monitor and update the progress of reading and processing this literature item. Click 'Change Status' to update.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#lit-details-card",
        popover: {
          title: "Core Information",
          description:
            "View and edit the fundamental details of this literature item, such as title, authors, publication year, and type. Click 'Edit' to make changes.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#lit-designs-card",
        popover: {
          title: "Methodology Details",
          description:
            "Categorize the research, sampling, measurement, and analytic designs used in this literature according to your project's framework. Click 'Edit' to modify.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#lit-insights-card",
        popover: {
          title: "Literature Health & Setup",
          description:
            "Check the completeness of this literature entry. Expand this section to see recommended fields to fill out for better organization and citation quality.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#lit-keywords-card",
        popover: {
          title: "Add Keywords",
          description:
            "Tag this literature with relevant keywords. This helps in organizing your sources and identifying thematic connections across your research.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#lit-reference-card",
        popover: {
          title: "Generate Citations",
          description:
            "Quickly generate citations in various common styles (APA, MLA, etc.) based on the entered details. Use the dropdown to select a style and the button to copy.",
          side: "left",
          align: "start",
        },
      },
      {
        element: ".container", // General overview
        popover: {
          title: "Manage Your Source",
          description:
            "Use this detailed view to thoroughly document, analyze, and integrate this piece of literature into your research project.",
          side: "top",
          align: "center",
        },
      },
    ],
  });
</script>

<div class="flex-1 w-full">
  <div class="container mx-auto py-6 px-4">
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <Button size="sm" onclick={handleBack} id="lit-view-back-button">
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Literature
        </Button>
        {#if literature}
          <div class="flex items-center gap-2">
            {#if literature.sourceFileId}
              <Button
                variant="outline"
                size="sm"
                onclick={previewDocument}
                id="lit-view-preview-button"
              >
                <Eye class="h-4 w-4 mr-2" />
                View Document
              </Button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <Button variant="outline" size="sm" {...props}>
                      Actions
                      <ChevronDown class="h-4 w-4 ml-2" />
                    </Button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onclick={downloadDocument}>
                    <Download class="h-4 w-4 mr-2" />
                    Download Document
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={() => (showFeedbackDialog = true)}
                    class="text-red-600 focus:text-red-600"
                  >
                    <Flag class="h-4 w-4 mr-2" />
                    Report Issue
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            {:else}
              <Button
                variant="outline"
                size="sm"
                onclick={() => (showAttachDialog = true)}
              >
                <Upload class="h-4 w-4 mr-2" />
                Attach Document
              </Button>
            {/if}
            <AlertDialog.Root bind:open={showDeleteDialog}>
              <AlertDialog.Trigger>
                {#snippet child({ props })}
                  <Button
                    id="lit-view-delete-button"
                    variant="destructive"
                    size="sm"
                    {...props}
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    Delete Literature
                  </Button>
                {/snippet}
              </AlertDialog.Trigger>
              <AlertDialog.Content class="border-2 dark:border-dark-border">
                <AlertDialog.Header>
                  <AlertDialog.Title>Delete Literature</AlertDialog.Title>
                  <AlertDialog.Description>
                    Are you sure you want to delete "{literature?.name}"? This
                    action cannot be undone.
                  </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onclick={() => (showDeleteDialog = false)}
                      class="border-2 dark:border-dark-border"
                      disabled={isDeleting}>Cancel</Button
                    >
                    <Button
                      variant="destructive"
                      onclick={handleDelete}
                      class="border-2 border-destructive dark:border-destructive"
                      disabled={isDeleting}
                    >
                      {#if isDeleting}
                        Deleting...
                      {:else}
                        Delete
                      {/if}
                    </Button>
                  </div>
                </AlertDialog.Footer>
              </AlertDialog.Content>
            </AlertDialog.Root>
            <Button
              variant="outline"
              onclick={() => driverObj.drive()}
              aria-label="Learn about Literature View"
            >
              <GraduationCap class="h-4 w-4 mr-2" />
              Tour
            </Button>
          </div>
        {/if}
      </div>

      {#if citedPage}
        <div
          class="mb-4 p-3 rounded-md border bg-muted/40 text-sm flex items-center justify-between"
        >
          <div>
            This item was cited from page {citedPage}.
          </div>
          {#if literature?.sourceFileId}
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onclick={() => previewDocument(citedPage || undefined)}
              >
                <Eye class="h-4 w-4 mr-2" /> Open document at page {citedPage}
              </Button>
            </div>
          {/if}
        </div>
      {/if}

      {#if literature}
        <div id="lit-view-header">
          <h1 class="text-3xl font-bold">{literature.name}</h1>
        </div>
        <p class="text-muted-foreground mt-2">
          {(() => {
            const authors = literature.authors;
            let authorList: string[] = [];

            if (Array.isArray(authors)) {
              authorList = authors;
            } else if (typeof authors === "string") {
              try {
                const parsed = JSON.parse(authors);
                if (Array.isArray(parsed)) authorList = parsed;
                else if (authors.trim()) authorList = [authors];
              } catch (e) {
                if (authors.trim()) authorList = [authors];
              }
            }
            return authorList.length > 0
              ? authorList.join(", ")
              : "No authors listed";
          })()}
        </p>
        {#if (() => {
          const ed = literature.editors;
          if (Array.isArray(ed)) return ed.length > 0;
          if (typeof ed === "string") {
            try {
              const parsed = JSON.parse(ed);
              return Array.isArray(parsed) ? parsed.length > 0 : !!ed.trim();
            } catch (e) {
              return !!ed.trim();
            }
          }
          return false;
        })()}
          <p class="text-muted-foreground mt-1">
            Editors: {(() => {
              const editors = literature.editors;
              let list: string[] = [];
              if (Array.isArray(editors)) list = editors;
              else if (typeof editors === "string") {
                try {
                  const parsed = JSON.parse(editors);
                  list = Array.isArray(parsed)
                    ? parsed
                    : editors.trim()
                      ? [editors]
                      : [];
                } catch (e) {
                  list = editors.trim() ? [editors] : [];
                }
              }
              return list.join(", ");
            })()}
          </p>
        {/if}

        <!-- Status Card -->
        <div class="mt-4 mb-6">
          <Card.Root id="lit-status-card">
            <Card.Content class="py-4">
              <LiteratureStatus {literature} />
            </Card.Content>
          </Card.Root>
        </div>

        <!-- Attach Document Dialog -->
        <Dialog.Root bind:open={showAttachDialog}>
          <Dialog.Content class="max-w-2xl">
            <Dialog.Header>
              <Dialog.Title>Attach Document to "{literature.name}"</Dialog.Title
              >
              <Dialog.Description>
                Upload a PDF, DOCX, DOC, or TXT. We will extract text and
                metadata.
              </Dialog.Description>
            </Dialog.Header>
            <div class="py-2">
              <DocumentUploadPanel
                projectId={projectStore.currentProject?.id || ""}
                attachLiteratureId={literature.id}
                on:upload-started={() => (showAttachDialog = false)}
                on:upload-complete={() => (showAttachDialog = false)}
              />
            </div>
            <Dialog.Footer class="justify-end">
              <Button
                variant="outline"
                onclick={() => (showAttachDialog = false)}>Close</Button
              >
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>

        <!-- Feedback Dialog -->
        <Dialog.Root bind:open={showFeedbackDialog}>
          <Dialog.Content class="max-w-lg">
            <Dialog.Header>
              <Dialog.Title class="flex items-center gap-2">
                <Flag class="h-5 w-5 text-red-600" />
                Report Issue
              </Dialog.Title>
              <Dialog.Description>
                Help us improve by reporting issues with "{literature.name}"
              </Dialog.Description>
            </Dialog.Header>
            <div class="py-4 space-y-4">
              <div class="space-y-2">
                <label for="feedback-comment" class="text-sm font-medium">
                  What went wrong? (optional)
                </label>
                <textarea
                  id="feedback-comment"
                  bind:value={feedbackComment}
                  placeholder="Describe the issue you noticed (e.g., incorrect metadata, missing text, wrong extraction)..."
                  rows="4"
                  class="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                  disabled={isSubmittingFeedback}
                ></textarea>
              </div>
              <div class="text-sm text-muted-foreground">
                <p>Your feedback will help us improve. Thank you!</p>
              </div>
            </div>
            <Dialog.Footer class="flex justify-end gap-2">
              <Button
                variant="outline"
                onclick={() => (showFeedbackDialog = false)}
                disabled={isSubmittingFeedback}
              >
                Cancel
              </Button>
              <Button
                onclick={submitFeedback}
                disabled={isSubmittingFeedback}
                class="bg-red-600 hover:bg-red-700 text-white"
              >
                {#if isSubmittingFeedback}
                  Submitting...
                {:else}
                  Submit Report
                {/if}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      {/if}
    </div>

    {#if isLoading}
      <div class="flex justify-center items-center h-[400px]">
        <p class="text-lg text-muted-foreground">
          Loading literature details...
        </p>
      </div>
    {:else if error}
      <div class="flex justify-center items-center h-[400px]">
        <p class="text-lg text-destructive">{error}</p>
      </div>
    {:else if literature}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: Details -->
        <div class="space-y-6">
          <Card.Root id="lit-details-card">
            <Card.Header>
              <Card.Title>Details</Card.Title>
            </Card.Header>
            <Card.Content>
              <LiteratureDetails
                {literature}
                on:update={({ detail }) => {
                  literature = detail.literature;
                }}
              />
              <p class="text-sm text-muted-foreground mt-4">
                Added on:
                {new Date(literature.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </Card.Content>
          </Card.Root>

          <div id="lit-designs-card">
            <LiteratureDesigns {literature} />
          </div>
        </div>

        <!-- Right Column: Literature Health, Keywords, and Citation -->
        <div class="space-y-6">
          <LiteratureInsights
            {literature}
            onTabChange={(tab) => (selectedTab = tab)}
          />

          <!-- Keywords -->
          <Card.Root id="lit-keywords-card">
            <Card.Header>
              <Card.Title>Keywords</Card.Title>
            </Card.Header>
            <Card.Content>
              <Keywords {literature} />
            </Card.Content>
          </Card.Root>

          <!-- Citation -->
          <div id="lit-reference-card">
            <Reference {literature} />
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

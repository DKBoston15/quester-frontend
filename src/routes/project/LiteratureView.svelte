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
  import { openUrlInNewTab } from "$lib/utils/browser";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

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
      const endpoint = `${API_BASE_URL}/documents/${literature.sourceFileId}/download?preview=true`;
      const response = await fetch(
        endpoint,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        // Surface server message if available
        let message = "Failed to get preview URL";
        try {
          const err = await response.json();
          if (err?.message) message = err.message;
        } catch {}
        toast.error("Unable to preview document", { description: message });
        return;
      }

      const data = await response.json();

      // Open the signed URL directly (no CORS fetch needed)
      const baseUrl: unknown = data?.downloadUrl;
      if (typeof baseUrl !== "string" || baseUrl.length === 0) {
        toast.error("Unable to preview document", { description: "Missing download URL" });
        // Fallback to download in case preview inline fails
        await downloadDocument();
        return;
      }
      const url = page ? `${baseUrl}#page=${page}` : baseUrl;
      openUrlInNewTab(url);
    } catch (err) {
      console.error("Preview error:", err);
      toast.error("Unable to preview document", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function downloadDocument() {
    if (!literature?.sourceFileId) return;

    try {
      const endpoint = `${API_BASE_URL}/documents/${literature.sourceFileId}/download`;
      const response = await fetch(
        endpoint,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        let message = "Failed to get download URL";
        try {
          const err = await response.json();
          if (err?.message) message = err.message;
        } catch {}
        throw new Error(message);
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

  // Function to create driver with translated steps
  function createDriver() {
    return driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#lit-view-header",
          popover: {
            title: t("tours.literatureView.header.title"),
            description: t("tours.literatureView.header.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#lit-view-back-button",
          popover: {
            title: t("tours.literatureView.goBack.title"),
            description: t("tours.literatureView.goBack.description"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#lit-view-preview-button",
          popover: {
            title: t("tours.literatureView.viewDocument.title"),
            description: t("tours.literatureView.viewDocument.description"),
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#lit-view-download-button",
          popover: {
            title: t("tours.literatureView.downloadDocument.title"),
            description: t("tours.literatureView.downloadDocument.description"),
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#lit-view-delete-button",
          popover: {
            title: t("tours.literatureView.deleteItem.title"),
            description: t("tours.literatureView.deleteItem.description"),
            side: "left",
            align: "end",
          },
        },
        {
          element: "#lit-status-card",
          popover: {
            title: t("tours.literatureView.trackStatus.title"),
            description: t("tours.literatureView.trackStatus.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#lit-details-card",
          popover: {
            title: t("tours.literatureView.coreInfo.title"),
            description: t("tours.literatureView.coreInfo.description"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#lit-designs-card",
          popover: {
            title: t("tours.literatureView.methodology.title"),
            description: t("tours.literatureView.methodology.description"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#lit-insights-card",
          popover: {
            title: t("tours.literatureView.health.title"),
            description: t("tours.literatureView.health.description"),
            side: "left",
            align: "start",
          },
        },
        {
          element: "#lit-keywords-card",
          popover: {
            title: t("tours.literatureView.addKeywords.title"),
            description: t("tours.literatureView.addKeywords.description"),
            side: "left",
            align: "start",
          },
        },
        {
          element: "#lit-reference-card",
          popover: {
            title: t("tours.literatureView.generateCitations.title"),
            description: t("tours.literatureView.generateCitations.description"),
            side: "left",
            align: "start",
          },
        },
        {
          element: ".container",
          popover: {
            title: t("tours.literatureView.manageSource.title"),
            description: t("tours.literatureView.manageSource.description"),
            side: "top",
            align: "center",
          },
        },
      ],
    });
  }
</script>

<div class="flex-1 w-full">
  <div class="container mx-auto py-6 px-4">
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <Button size="sm" onclick={handleBack} id="lit-view-back-button">
          <ArrowLeft class="h-4 w-4 mr-2" />
          {$_('literatureView.backToLiterature')}
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
                {$_('literatureView.viewDocument')}
              </Button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <Button variant="outline" size="sm" {...props}>
                      {$_('literatureView.actions')}
                      <ChevronDown class="h-4 w-4 ml-2" />
                    </Button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onclick={downloadDocument}>
                    <Download class="h-4 w-4 mr-2" />
                    {$_('literatureView.downloadDocument')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={() => (showFeedbackDialog = true)}
                    class="text-red-600 focus:text-red-600"
                  >
                    <Flag class="h-4 w-4 mr-2" />
                    {$_('literatureView.reportIssue')}
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
                {$_('literatureView.attachDocument')}
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
                    {$_('literatureView.deleteLiterature')}
                  </Button>
                {/snippet}
              </AlertDialog.Trigger>
              <AlertDialog.Content class="border-2 dark:border-dark-border">
                <AlertDialog.Header>
                  <AlertDialog.Title>{$_('literatureView.deleteLiterature')}</AlertDialog.Title>
                  <AlertDialog.Description>
                    {$_('literatureView.deleteConfirmation', { values: { name: literature?.name } })}
                  </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onclick={() => (showDeleteDialog = false)}
                      class="border-2 dark:border-dark-border"
                      disabled={isDeleting}>{$_('common.cancel')}</Button
                    >
                    <Button
                      variant="destructive"
                      onclick={handleDelete}
                      class="border-2 border-destructive dark:border-destructive"
                      disabled={isDeleting}
                    >
                      {#if isDeleting}
                        {$_('common.deleting')}
                      {:else}
                        {$_('common.delete')}
                      {/if}
                    </Button>
                  </div>
                </AlertDialog.Footer>
              </AlertDialog.Content>
            </AlertDialog.Root>
            <Button
              variant="outline"
              onclick={() => createDriver().drive()}
              aria-label={$_('literatureView.tourAriaLabel')}
            >
              <GraduationCap class="h-4 w-4 mr-2" />
              {$_('common.tour')}
            </Button>
          </div>
        {/if}
      </div>

      {#if citedPage}
        <div
          class="mb-4 p-3 rounded-md border bg-muted/40 text-sm flex items-center justify-between"
        >
          <div>
            {$_('literatureView.citedFromPage', { values: { page: citedPage } })}
          </div>
          {#if literature?.sourceFileId}
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onclick={() => previewDocument(citedPage || undefined)}
              >
                <Eye class="h-4 w-4 mr-2" /> {$_('literatureView.openAtPage', { values: { page: citedPage } })}
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
              : $_('literatureView.noAuthorsListed');
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
            {$_('literatureView.editors')}: {(() => {
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
              <Dialog.Title>{$_('literatureView.attachDocumentTo', { values: { name: literature.name } })}</Dialog.Title
              >
              <Dialog.Description>
                {$_('literatureView.attachDocumentDescription')}
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
                onclick={() => (showAttachDialog = false)}>{$_('common.close')}</Button
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
                {$_('literatureView.reportIssue')}
              </Dialog.Title>
              <Dialog.Description>
                {$_('literatureView.reportIssueDescription', { values: { name: literature.name } })}
              </Dialog.Description>
            </Dialog.Header>
            <div class="py-4 space-y-4">
              <div class="space-y-2">
                <label for="feedback-comment" class="text-sm font-medium">
                  {$_('literatureView.whatWentWrong')}
                </label>
                <textarea
                  id="feedback-comment"
                  bind:value={feedbackComment}
                  placeholder={$_('literatureView.feedbackPlaceholder')}
                  rows="4"
                  class="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                  disabled={isSubmittingFeedback}
                ></textarea>
              </div>
              <div class="text-sm text-muted-foreground">
                <p>{$_('literatureView.feedbackThankYou')}</p>
              </div>
            </div>
            <Dialog.Footer class="flex justify-end gap-2">
              <Button
                variant="outline"
                onclick={() => (showFeedbackDialog = false)}
                disabled={isSubmittingFeedback}
              >
                {$_('common.cancel')}
              </Button>
              <Button
                onclick={submitFeedback}
                disabled={isSubmittingFeedback}
                class="bg-red-600 hover:bg-red-700 text-white"
              >
                {#if isSubmittingFeedback}
                  {$_('literatureView.submitting')}
                {:else}
                  {$_('literatureView.submitReport')}
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
          {$_('literatureView.loadingDetails')}
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
              <Card.Title>{$_('literatureView.details')}</Card.Title>
            </Card.Header>
            <Card.Content>
              <LiteratureDetails
                {literature}
                on:update={({ detail }) => {
                  literature = detail.literature;
                }}
              />
              <p class="text-sm text-muted-foreground mt-4">
                {$_('literatureView.addedOn')}:
                {new Date(literature.createdAt).toLocaleDateString(undefined, {
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
              <Card.Title>{$_('literatureView.keywords')}</Card.Title>
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

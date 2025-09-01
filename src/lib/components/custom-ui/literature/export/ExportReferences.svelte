<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Copy, Download, FileText, CheckSquare, Square } from "lucide-svelte";
  import type { Literature } from "$lib/types/literature";
  import type { CitationStyle } from "$lib/utils/citationFormatters";
  import {
    citationStyles,
    formatCitation,
    stripHtmlTags,
  } from "$lib/utils/citationFormatters";
  import { compileBibliography } from "$lib/utils/bibliographyUtils";
  import ReferencePreview from "./ReferencePreview.svelte";
  import { toast } from "svelte-sonner";
  import { exportToPDFSimple } from "$lib/utils/pdfExportSimple";
  import { exportToDOCX } from "$lib/utils/exportFormats/docx";
  import { exportToBibTeX } from "$lib/utils/exportFormats/bibtex";
  import { exportToRIS } from "$lib/utils/exportFormats/ris";
  import { exportToCSV } from "$lib/utils/exportFormats/csv";

  interface Props {
    open: boolean;
    selectedLiterature: Literature[];
    projectTitle?: string;
    userName?: string;
    onOpenChange: (open: boolean) => void;
  }

  let {
    open = $bindable(),
    selectedLiterature,
    projectTitle,
    userName,
    onOpenChange,
  }: Props = $props();

  // Internal selection state for the modal
  let internalSelectedIds = $state<Set<string>>(new Set());
  let userHasManuallyChanged = $state(false);
  let selectionVersion = $state(0); // Version counter to force reactivity

  // Initialize internal selection when modal opens (but preserve user changes)
  $effect(() => {
    // ONLY initialize when modal first opens, never reset after that
    if (
      open &&
      selectedLiterature &&
      internalSelectedIds.size === 0 &&
      !userHasManuallyChanged
    ) {
      internalSelectedIds = new Set(
        selectedLiterature.map((item) => item.id).filter(Boolean)
      );
      selectionVersion++;
    }
  });

  // Get currently selected literature based on internal state
  const currentlySelected = $derived(
    selectedLiterature.filter(
      (item) => item.id && internalSelectedIds.has(item.id)
    )
  );

  function toggleReference(literature: Literature) {
    if (!literature.id) return;

    userHasManuallyChanged = true;
    const newSelected = new Set(internalSelectedIds);
    if (newSelected.has(literature.id)) {
      newSelected.delete(literature.id);
    } else {
      newSelected.add(literature.id);
    }
    internalSelectedIds = newSelected;
    selectionVersion++; // Force reactivity
  }

  function selectAll() {
    userHasManuallyChanged = true;
    const allIds = selectedLiterature.map((item) => item.id).filter(Boolean);
    internalSelectedIds = new Set(allIds);
    selectionVersion++; // Force reactivity
  }

  function deselectAll() {
    userHasManuallyChanged = true;
    internalSelectedIds = new Set();
    selectionVersion++; // Force reactivity
  }

  let selectedStyle = $state<CitationStyle>("APA");
  let selectedFormat = $state<
    "copy" | "pdf" | "docx" | "bibtex" | "ris" | "csv"
  >("copy");
  let isExporting = $state(false);

  const exportFormats = [
    { value: "copy", label: "Copy to Clipboard", icon: Copy },
    { value: "pdf", label: "PDF", icon: FileText, disabled: false },
    { value: "docx", label: "Word (DOCX)", icon: FileText, disabled: false },
    { value: "bibtex", label: "BibTeX", icon: FileText, disabled: false },
    { value: "ris", label: "RIS", icon: FileText, disabled: false },
    { value: "csv", label: "CSV", icon: FileText, disabled: false },
  ];

  $effect(() => {
    // Store user preference
    if (selectedStyle) {
      localStorage.setItem("preferredCitationStyle", selectedStyle);
    }
    if (selectedFormat) {
      localStorage.setItem("preferredExportFormat", selectedFormat);
    }
  });

  // Load user preferences
  $effect(() => {
    const savedStyle = localStorage.getItem(
      "preferredCitationStyle"
    ) as CitationStyle;
    const savedFormat = localStorage.getItem(
      "preferredExportFormat"
    ) as typeof selectedFormat;

    if (savedStyle && citationStyles.some((s) => s.value === savedStyle)) {
      selectedStyle = savedStyle;
    }
    if (
      savedFormat &&
      exportFormats.some((f) => f.value === savedFormat && !f.disabled)
    ) {
      selectedFormat = savedFormat;
    }
  });

  async function handleExport() {
    if (currentlySelected.length === 0) {
      toast.error("No references selected");
      return;
    }

    isExporting = true;

    try {
      // Validate export data completeness
      const selectedItems = currentlySelected;

      if (selectedItems.length === 0) {
        toast.error("No references selected for export");
        return;
      }

      // Validate that all selected items have required data
      const invalidItems = selectedItems.filter((item) => {
        const type = typeof item.type === 'string' ? item.type : (item.type as any)?.value;
        const hasTitle = type === 'Book Chapter' ? Boolean((item as any).chapterTitle) : Boolean(item.name);
        const hasAuthors = Array.isArray(item.authors) ? item.authors.length > 0 : Boolean(item.authors);
        return !hasTitle || !hasAuthors;
      });

      if (invalidItems.length > 0) {
        console.warn("Found literature items with missing data:", invalidItems);
        toast.warning(
          `${invalidItems.length} references are missing title or authors. Export may be incomplete.`
        );
      }

      switch (selectedFormat) {
        case "copy":
          await copyToClipboard();
          break;
        case "pdf":
          await exportToPDFSimple({
            literature: currentlySelected,
            citationStyle: selectedStyle,
            projectTitle: projectTitle || "Research Bibliography",
            authorName: userName,
          });
          toast.success(
            `PDF exported successfully with ${currentlySelected.length} references`
          );
          open = false;
          break;
        case "docx":
          await exportToDOCX({
            literature: currentlySelected,
            citationStyle: selectedStyle,
            projectTitle: projectTitle || "Research Bibliography",
            authorName: userName,
          });
          toast.success(
            `DOCX exported successfully with ${currentlySelected.length} references`
          );
          open = false;
          break;
        case "bibtex":
          await exportToBibTeX({
            literature: currentlySelected,
          });
          toast.success(
            `BibTeX exported successfully with ${currentlySelected.length} references`
          );
          open = false;
          break;
        case "ris":
          await exportToRIS({
            literature: currentlySelected,
          });
          toast.success(
            `RIS exported successfully with ${currentlySelected.length} references`
          );
          open = false;
          break;
        case "csv":
          await exportToCSV({
            literature: currentlySelected,
          });
          toast.success(
            `CSV exported successfully with ${currentlySelected.length} references`
          );
          open = false;
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export references");
    } finally {
      isExporting = false;
    }
  }

  async function copyToClipboard() {
    const currentLiterature = currentlySelected;
    if (currentLiterature.length === 0) {
      throw new Error("No references to copy");
    }

    try {
      // Get formatted citations and create properly formatted text
      const compiledLiterature = compileBibliography(currentLiterature, {
        sortBy: "author",
        sortOrder: "asc",
      });

      // Create bibliography header
      const header = `Bibliography\n\nGenerated on ${new Date().toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )}\n\n`;

      // Format each citation with proper spacing
      const formattedText = compiledLiterature
        .map((item) => {
          const citation = formatCitation(item, selectedStyle);
          // Remove HTML tags and replace with proper spacing
          return stripHtmlTags(citation)
            .replace(/\s+/g, " ") // Replace multiple spaces with single space
            .trim();
        })
        .join("\n\n"); // Double line break between citations

      const fullText = header + formattedText;

      await navigator.clipboard.writeText(fullText);
      toast.success(
        `${currentLiterature.length} references copied to clipboard`
      );
      open = false;
    } catch (err) {
      throw new Error("Failed to copy to clipboard");
    }
  }

  function getExportButtonText() {
    const format = exportFormats.find((f) => f.value === selectedFormat);
    if (selectedFormat === "copy") {
      return "Copy to Clipboard";
    }
    return `Download ${format?.label || ""}`;
  }

  function getExportButtonIcon() {
    const format = exportFormats.find((f) => f.value === selectedFormat);
    return format?.icon || Download;
  }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content class="max-w-5xl h-[90vh] overflow-hidden flex flex-col">
    <Dialog.Header>
      <Dialog.Title>Export References</Dialog.Title>
      <Dialog.Description>
        Preview and export your selected references in various formats
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex-1 overflow-hidden flex flex-col gap-4">
      <!-- Controls -->
      <div class="flex items-center justify-between gap-4 px-6 pt-4">
        <div class="flex items-center gap-4">
          <Badge variant="secondary" class="px-3 py-1">
            {currentlySelected.length} of {selectedLiterature.length} reference{selectedLiterature.length !==
            1
              ? "s"
              : ""} selected
          </Badge>

          <!-- Selection controls -->
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onclick={selectAll}
              disabled={currentlySelected.length === selectedLiterature.length}
            >
              <CheckSquare class="h-4 w-4 mr-1" />
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onclick={deselectAll}
              disabled={currentlySelected.length === 0}
            >
              <Square class="h-4 w-4 mr-1" />
              None
            </Button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Citation Style Selector -->
          <div class="relative">
            <select
              bind:value={selectedStyle}
              class="w-[140px] h-10 px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {#each citationStyles as style}
                <option
                  value={style.value}
                  class="bg-background text-foreground">{style.label}</option
                >
              {/each}
            </select>
          </div>

          <!-- Export Format Selector -->
          <div class="relative">
            <select
              bind:value={selectedFormat}
              class="w-[180px] h-10 px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {#each exportFormats as format}
                <option
                  value={format.value}
                  disabled={format.disabled}
                  class="bg-background text-foreground"
                >
                  {format.label}{format.disabled ? " (Soon)" : ""}
                </option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="flex-1 overflow-hidden px-6 min-h-0">
        <ReferencePreview
          literature={selectedLiterature}
          citationStyle={selectedStyle}
          {internalSelectedIds}
          {selectionVersion}
          onToggleReference={toggleReference}
        />
      </div>
    </div>

    <Dialog.Footer class="px-6 py-4">
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button
        onclick={handleExport}
        disabled={isExporting || currentlySelected.length === 0}
      >
        {#if isExporting}
          <span class="animate-spin mr-2">⏳</span>
          Exporting...
        {:else}
          {@const IconComponent = getExportButtonIcon()}
          <IconComponent class="h-4 w-4 mr-2" />
          {getExportButtonText()}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

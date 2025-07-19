<!-- src/lib/components/custom-ui/literature/export/ExportReferences.svelte -->
<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import { Copy, Download, FileText } from "lucide-svelte";
  import type { Literature } from "$lib/types/literature";
  import type { CitationStyle } from "$lib/utils/citationFormatters";
  import { citationStyles, formatCitation, stripHtmlTags } from "$lib/utils/citationFormatters";
  import { compileBibliography } from "$lib/utils/bibliographyUtils";
  import ReferencePreview from "./ReferencePreview.svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    open: boolean;
    selectedLiterature: Literature[];
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(), selectedLiterature, onOpenChange }: Props = $props();


  let selectedStyle = $state<CitationStyle>("APA");
  let selectedFormat = $state<"copy" | "pdf" | "docx" | "bibtex" | "ris" | "csv">("copy");
  let isExporting = $state(false);

  const exportFormats = [
    { value: "copy", label: "Copy to Clipboard", icon: Copy },
    { value: "pdf", label: "PDF", icon: FileText, disabled: true },
    { value: "docx", label: "Word (DOCX)", icon: FileText, disabled: true },
    { value: "bibtex", label: "BibTeX", icon: FileText, disabled: true },
    { value: "ris", label: "RIS", icon: FileText, disabled: true },
    { value: "csv", label: "CSV", icon: FileText, disabled: true },
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
    const savedStyle = localStorage.getItem("preferredCitationStyle") as CitationStyle;
    const savedFormat = localStorage.getItem("preferredExportFormat") as typeof selectedFormat;
    
    if (savedStyle && citationStyles.some(s => s.value === savedStyle)) {
      selectedStyle = savedStyle;
    }
    if (savedFormat && exportFormats.some(f => f.value === savedFormat && !f.disabled)) {
      selectedFormat = savedFormat;
    }
  });

  async function handleExport() {
    if (selectedLiterature.length === 0) {
      toast.error("No references selected");
      return;
    }

    isExporting = true;

    try {
      switch (selectedFormat) {
        case "copy":
          await copyToClipboard();
          break;
        case "pdf":
          // TODO: Implement PDF export
          toast.info("PDF export coming soon!");
          break;
        case "docx":
          // TODO: Implement DOCX export
          toast.info("DOCX export coming soon!");
          break;
        case "bibtex":
          // TODO: Implement BibTeX export
          toast.info("BibTeX export coming soon!");
          break;
        case "ris":
          // TODO: Implement RIS export
          toast.info("RIS export coming soon!");
          break;
        case "csv":
          // TODO: Implement CSV export
          toast.info("CSV export coming soon!");
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
    if (selectedLiterature.length === 0) {
      throw new Error("No references to copy");
    }

    try {
      // Get formatted citations and create properly formatted text
      const compiledLiterature = compileBibliography(selectedLiterature, { sortBy: "author", sortOrder: "asc" });
      
      // Create bibliography header
      const header = `Bibliography\n\nGenerated on ${new Date().toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })}\n\n`;
      
      // Format each citation with proper spacing
      const formattedText = compiledLiterature.map(item => {
        const citation = formatCitation(item, selectedStyle);
        // Remove HTML tags and replace with proper spacing
        return stripHtmlTags(citation)
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
      }).join('\n\n'); // Double line break between citations
      
      const fullText = header + formattedText;
      
      await navigator.clipboard.writeText(fullText);
      toast.success(`${selectedLiterature.length} references copied to clipboard`);
      open = false;
    } catch (err) {
      throw new Error("Failed to copy to clipboard");
    }
  }

  function getExportButtonText() {
    const format = exportFormats.find(f => f.value === selectedFormat);
    if (selectedFormat === "copy") {
      return "Copy to Clipboard";
    }
    return `Download ${format?.label || ""}`;
  }

  function getExportButtonIcon() {
    const format = exportFormats.find(f => f.value === selectedFormat);
    return format?.icon || Download;
  }
</script>

<Dialog.Root bind:open onOpenChange={onOpenChange}>
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
            {selectedLiterature.length} reference{selectedLiterature.length !== 1 ? 's' : ''} selected
          </Badge>
        </div>

        <div class="flex items-center gap-2">
          <!-- Citation Style Selector -->
          <div class="relative">
            <select 
              bind:value={selectedStyle}
              class="w-[140px] h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {#each citationStyles as style}
                <option value={style.value}>{style.label}</option>
              {/each}
            </select>
          </div>

          <!-- Export Format Selector -->
          <div class="relative">
            <select 
              bind:value={selectedFormat}
              class="w-[180px] h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {#each exportFormats as format}
                <option value={format.value} disabled={format.disabled}>
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
        />
      </div>
    </div>

    <Dialog.Footer class="px-6 py-4">
      <Button variant="outline" onclick={() => open = false}>
        Cancel
      </Button>
      <Button 
        onclick={handleExport} 
        disabled={isExporting || selectedLiterature.length === 0}
      >
        {#if isExporting}
          <span class="animate-spin mr-2">⏳</span>
          Exporting...
        {:else}
          <svelte:component this={getExportButtonIcon()} class="h-4 w-4 mr-2" />
          {getExportButtonText()}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
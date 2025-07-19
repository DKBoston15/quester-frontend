<!-- src/lib/components/custom-ui/literature/export/PrintTemplate.svelte -->
<script lang="ts">
  import type { Literature } from "$lib/types/literature";
  import type { CitationStyle } from "$lib/utils/citationFormatters";
  import { formatCitation } from "$lib/utils/citationFormatters";
  import { compileBibliography } from "$lib/utils/bibliographyUtils";

  interface Props {
    literature: Literature[];
    citationStyle: CitationStyle;
    projectTitle?: string;
    authorName?: string;
    institution?: string;
  }

  let {
    literature,
    citationStyle,
    projectTitle = "Research Bibliography",
    authorName = "",
    institution = "",
  }: Props = $props();

  // Helper function to truncate long text
  function truncateText(text: string, maxLength: number = 200): string {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  }

  // Sanitize and validate props
  const safeProjectTitle = $derived(() => truncateText(projectTitle, 100));
  const safeAuthorName = $derived(() => truncateText(authorName, 50));
  const safeInstitution = $derived(() => truncateText(institution, 100));

  // Compile and format citations
  const compiledLiterature = $derived(() => {
    if (!literature || literature.length === 0) return [];
    try {
      return compileBibliography(literature, {
        sortBy: "author",
        sortOrder: "asc",
      });
    } catch (error) {
      console.error("Error compiling bibliography:", error);
      return literature; // Fall back to original list
    }
  });

  const formattedCitations = $derived(() => {
    return compiledLiterature().map((item, index) => {
      try {
        const formatted = formatCitation(item, citationStyle);
        // Ensure citation isn't too long
        const truncatedFormatted =
          formatted.length > 2000
            ? formatted.slice(0, 2000) + "..."
            : formatted;

        return {
          literature: item,
          formatted: truncatedFormatted,
        };
      } catch (error) {
        console.error(`Error formatting citation ${index + 1}:`, error);
        // Fallback formatting
        return {
          literature: item,
          formatted: `${item.name || "Unknown Title"} (${item.publishYear || "n.d."})`,
        };
      }
    });
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
</script>

<!-- Print-optimized template -->
<div class="print-template">
  <!-- Title Page -->
  <div class="title-page">
    <div class="title-content">
      <h1 class="main-title">{safeProjectTitle}</h1>
      <h2 class="subtitle">Bibliography</h2>

      <div class="metadata">
        {#if safeAuthorName}
          <p class="author">Prepared by: {safeAuthorName}</p>
        {/if}
        {#if safeInstitution}
          <p class="institution">{safeInstitution}</p>
        {/if}
        <p class="date">Generated on {currentDate}</p>
        <p class="style">Citation Style: {citationStyle}</p>
        <p class="count">
          {formattedCitations.length} Reference{formattedCitations.length !== 1
            ? "s"
            : ""}
        </p>
      </div>
    </div>
  </div>

  <!-- Page break before bibliography -->
  <div class="page-break"></div>

  <!-- Bibliography Content -->
  <div class="bibliography-content">
    <header class="bibliography-header">
      <h1>Bibliography</h1>
    </header>

    {#if formattedCitations.length === 0}
      <div class="no-references">
        <p>No references available.</p>
      </div>
    {:else}
      <div class="references-list">
        {#each formattedCitations as citationItem, index}
          <div class="reference-entry" data-reference-index={index + 1}>
            <div class="citation-text">
              {@html citationItem.formatted}
            </div>
            {#if citationItem.literature.doi}
              <div class="doi-info">
                DOI: {citationItem.literature.doi}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Footer information -->
    <div class="bibliography-footer">
      <p class="generation-info">
        This bibliography was generated on {currentDate} using {citationStyle} citation
        style via Quester. Total references: {formattedCitations.length}.
      </p>
    </div>
  </div>
</div>

<style>
  /* Base styles for both screen and print */
  .print-template {
    max-width: 8.5in;
    margin: 0 auto;
    background: white;
    color: black;
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.6;
  }

  /* Title Page Styles */
  .title-page {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2in;
  }

  .title-content {
    max-width: 6in;
  }

  .main-title {
    font-size: 24pt;
    font-weight: bold;
    margin-bottom: 0.5in;
    line-height: 1.2;
  }

  .subtitle {
    font-size: 18pt;
    font-weight: normal;
    margin-bottom: 1in;
    line-height: 1.2;
  }

  .metadata {
    text-align: left;
    margin-top: 1in;
  }

  .metadata p {
    margin: 0.25in 0;
    font-size: 12pt;
  }

  .author {
    font-weight: bold;
  }

  .page-break {
    page-break-before: always;
  }

  /* Bibliography Content Styles */
  .bibliography-content {
    padding: 1in;
    min-height: 100vh;
  }

  .bibliography-header {
    text-align: center;
    margin-bottom: 1in;
    border-bottom: 2px solid #000;
    padding-bottom: 0.25in;
  }

  .bibliography-header h1 {
    font-size: 18pt;
    font-weight: bold;
    margin: 0;
  }

  .references-list {
    margin-bottom: 1in;
  }

  .reference-entry {
    margin-bottom: 1em;
    break-inside: avoid;
    position: relative;
  }

  .citation-text {
    text-align: justify;
    text-indent: -0.5in;
    padding-left: 0.5in;
    line-height: 1.6;
  }

  .doi-info {
    font-size: 10pt;
    color: #666;
    margin-top: 0.25em;
    padding-left: 0.5in;
  }

  .no-references {
    text-align: center;
    padding: 2in 0;
    font-style: italic;
    color: #666;
  }

  .bibliography-footer {
    margin-top: 2in;
    padding-top: 0.5in;
    border-top: 1px solid #ccc;
    font-size: 10pt;
    color: #666;
    text-align: center;
  }

  /* Print-specific styles */
  @media print {
    .print-template {
      max-width: none;
      margin: 0;
      font-size: 12pt;
    }

    .title-page {
      height: 100vh;
      page-break-after: always;
    }

    .page-break {
      page-break-before: always;
      height: 0;
    }

    .bibliography-content {
      padding: 0.75in;
    }

    .reference-entry {
      break-inside: avoid;
      margin-bottom: 1em;
    }

    /* Ensure proper page breaks */
    .bibliography-header {
      break-after: avoid;
    }

    /* Handle long references that might break across pages */
    .citation-text {
      orphans: 2;
      widows: 2;
    }

    /* Remove screen-only elements */
    .doi-info {
      font-size: 9pt;
    }

    /* Footer positioning */
    .bibliography-footer {
      position: fixed;
      bottom: 0.5in;
      left: 0.75in;
      right: 0.75in;
      font-size: 9pt;
    }
  }

  /* Screen-only styles for preview */
  @media screen {
    .print-template {
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      margin: 2rem auto;
    }

    .title-page {
      border-bottom: 1px solid #eee;
    }

    .bibliography-content {
      background: white;
    }
  }

  /* Typography enhancements */
  :global(.citation-text i) {
    font-style: italic;
  }

  :global(.citation-text em) {
    font-style: italic;
  }

  :global(.citation-text a) {
    color: black;
    text-decoration: underline;
  }

  /* Responsive adjustments for smaller screens */
  @media screen and (max-width: 768px) {
    .print-template {
      margin: 1rem;
      max-width: none;
    }

    .title-page {
      padding: 1rem;
      height: auto;
      min-height: 60vh;
    }

    .bibliography-content {
      padding: 1rem;
    }

    .main-title {
      font-size: 20pt;
    }

    .subtitle {
      font-size: 16pt;
    }
  }
</style>

<script lang="ts">
  import type { KeywordAnalysis } from "$lib/types/index";
  import { Card } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "$lib/components/ui/accordion";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon, DownloadIcon, ClipboardCopyIcon } from "lucide-svelte";
  import VennDiagram from "./VennDiagram.svelte";
  import FrequencyChart from "./FrequencyChart.svelte";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import { toast } from "svelte-sonner";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string) => get(_)(key);

  const { analysis } = $props<{ analysis: KeywordAnalysis }>();

  // Initialize all derived state properly
  function parseAnalysisData(analysis: KeywordAnalysis) {
    if (!analysis || !analysis.keywords) {
      return {
        report: { report: "" },
        keywords: [],
        frequencyData: {},
      };
    }

    try {
      // Parse report
      const report =
        typeof analysis.report === "string"
          ? JSON.parse(analysis.report)
          : analysis.report;

      // Parse keywords
      const keywords =
        typeof analysis.keywords === "string"
          ? JSON.parse(analysis.keywords)
          : analysis.keywords;

      // Parse frequency data - handle both field names
      const rawFrequencyData =
        analysis.frequencyData || analysis.frequency_data;
      const frequencyData =
        typeof rawFrequencyData === "string"
          ? JSON.parse(rawFrequencyData || "{}")
          : rawFrequencyData || {};

      return {
        report: report || { report: "" },
        keywords: Array.isArray(keywords) ? keywords : [],
        frequencyData: frequencyData || {},
      };
    } catch (error) {
      console.error("❌ AnalysisResults - Error parsing analysis data:", error);
      return {
        report: { report: "" },
        keywords: [],
        frequencyData: {},
      };
    }
  }

  // Use derived state that updates when analysis changes
  let parsedData = $derived(parseAnalysisData(analysis));
  let report = $derived(parsedData.report);
  let keywords = $derived(parsedData.keywords);
  let frequencyData = $derived(parsedData.frequencyData);

  // Format keywords for display
  let keywordsText = $derived(
    Array.isArray(keywords) ? keywords.join(", ") : ""
  );

  function getKeywordFrequency(keyword: string) {
    if (!frequencyData?.individual) {
      return { count: 0, url: "" };
    }

    const result = {
      count: frequencyData.individual[keyword] || 0,
      url: `https://scholar.google.com/scholar?hl=en&q=${encodeURIComponent(keyword)}`,
    };

    return result;
  }

  function getCooccurrenceData(keyword1: string, keyword2: string) {
    if (!frequencyData?.pairs) return { count: 0, url: "" };

    // If same keyword, return its individual frequency
    if (keyword1 === keyword2) {
      return {
        count: frequencyData.individual[keyword1] || 0,
        url: `https://scholar.google.com/scholar?hl=en&q=${encodeURIComponent(keyword1)}`,
      };
    }

    // Try both orderings of the keywords
    const key1 = `${keyword1}:${keyword2}`;
    const key2 = `${keyword2}:${keyword1}`;
    const count = frequencyData.pairs[key1] || frequencyData.pairs[key2] || 0;

    return {
      count,
      url: `https://scholar.google.com/scholar?hl=en&q="${encodeURIComponent(keyword1)}"+AND+"${encodeURIComponent(keyword2)}"`,
    };
  }

  function formatNumber(num: number) {
    if (num === 0) return "0";
    return new Intl.NumberFormat().format(num);
  }

  interface FrequencyData {
    term: string;
    frequency: number;
  }

  interface FrequencyStats extends FrequencyData {
    percentage: string;
    cumulative: string;
  }

  function sortUnivariateData(): FrequencyData[] {
    if (!keywords || !frequencyData) return [];

    const data = keywords.map((keyword: string) => ({
      term: keyword,
      frequency: getKeywordFrequency(keyword).count,
    }));

    return data.sort(
      (a: FrequencyData, b: FrequencyData) => b.frequency - a.frequency
    );
  }

  function calculateFrequencyStats(): FrequencyStats[] {
    const sortedData = sortUnivariateData();
    const total = sortedData.reduce(
      (sum: number, data: FrequencyData) => sum + data.frequency,
      0
    );

    let cumulative = 0;
    return sortedData.map((item: FrequencyData) => {
      const percentage = total !== 0 ? (item.frequency / total) * 100 : 0;
      cumulative += percentage;
      return {
        term: item.term,
        frequency: item.frequency,
        percentage: percentage.toFixed(2),
        cumulative: cumulative.toFixed(2),
      };
    });
  }

  // New function to get triple frequency and URL
  function getTripleFrequencyData(kw1: string, kw2: string, kw3: string) {
    if (!frequencyData?.triples) return { count: 0, url: "" };

    const keys = [
      `${kw1}:${kw2}:${kw3}`,
      `${kw1}:${kw3}:${kw2}`,
      `${kw2}:${kw1}:${kw3}`,
      `${kw2}:${kw3}:${kw1}`,
      `${kw3}:${kw1}:${kw2}`,
      `${kw3}:${kw2}:${kw1}`,
    ];

    let count = 0;
    for (const key of keys) {
      if (frequencyData.triples[key] !== undefined) {
        count = frequencyData.triples[key];
        break;
      }
    }

    const query = `"${encodeURIComponent(kw1)}" AND "${encodeURIComponent(kw2)}" AND "${encodeURIComponent(kw3)}"`;
    const url = `https://scholar.google.com/scholar?hl=en&q=${query}`;

    return { count, url };
  }

  interface TripleStats {
    kw1: string;
    kw2: string;
    kw3: string;
    frequency: number;
    url: string;
  }

  // New function to calculate all triple combinations and their stats
  function calculateTripleStats(): TripleStats[] {
    if (!keywords || keywords.length < 3 || !frequencyData?.triples) return [];

    const triples: TripleStats[] = [];
    for (let i = 0; i < keywords.length; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        for (let k = j + 1; k < keywords.length; k++) {
          const kw1 = keywords[i];
          const kw2 = keywords[j];
          const kw3 = keywords[k];
          const { count, url } = getTripleFrequencyData(kw1, kw2, kw3);
          triples.push({ kw1, kw2, kw3, frequency: count, url });
        }
      }
    }
    // Optional: Sort by frequency descending
    return triples.sort((a, b) => b.frequency - a.frequency);
  }

  function handleVennFilter(
    event: CustomEvent<{ include: string[]; exclude: string[]; url: string }>
  ) {
    const { url } = event.detail;

    if (url) {
      window.open(url, "_blank");
    } else {
      console.warn("Venn diagram filter event did not provide a URL.");
    }
  }

  // --- Copy Summary Function ---
  let summaryElement: HTMLDivElement;

  async function copySummaryText() {
    if (!summaryElement) return;

    try {
      await navigator.clipboard.writeText(summaryElement.innerText);
      toast.success(t("keywordAnalysis.summaryCopied"));
    } catch (err) {
      console.error("Failed to copy summary text: ", err);
      toast.error(t("keywordAnalysis.copyFailed"));
    }
  }
  // --- End Copy Summary Function ---

  // --- CSV Download Functions ---

  // Helper to escape CSV fields
  function escapeCsvField(field: any): string {
    const stringField = String(field);
    // Escape double quotes by doubling them and wrap in quotes if contains comma, newline, or double quote
    if (
      stringField.includes('"') ||
      stringField.includes(",") ||
      stringField.includes("\n") ||
      stringField.includes("\r")
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  }

  // Helper to trigger download
  function triggerDownload(filename: string, csvContent: string) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      console.error("Browser does not support automatic download triggering.");
      // Provide fallback or message
    }
  }

  // 1. Download Frequency Distribution CSV
  function downloadFrequencyCSV() {
    const stats = calculateFrequencyStats();
    if (stats.length === 0) return;

    const headers = [
      "Key Term",
      "Frequency",
      "Percentage (%)",
      "Cumulative Percentage (%)",
    ];
    let csvString = headers.map(escapeCsvField).join(",") + "\r\n";

    stats.forEach((stat) => {
      const row = [stat.term, stat.frequency, stat.percentage, stat.cumulative];
      csvString += row.map(escapeCsvField).join(",") + "\r\n";
    });

    // Add Total row
    const total = stats.reduce((sum, stat) => sum + stat.frequency, 0);
    const totalRow = ["Total", total, "100.00", "100.00"];
    csvString += totalRow.map(escapeCsvField).join(",") + "\r\n";

    triggerDownload("frequency_distribution.csv", csvString);
  }

  // 2. Download Cross Distribution CSV
  function downloadCrossDistCSV() {
    if (!keywords || keywords.length === 0) return;

    const headers = ["Key term", ...keywords];
    let csvString = headers.map(escapeCsvField).join(",") + "\r\n";

    keywords.forEach((rowKeyword: string, i: number) => {
      const row = [rowKeyword];
      keywords.forEach((colKeyword: string, j: number) => {
        if (i <= j) {
          const cooccurrence = getCooccurrenceData(rowKeyword, colKeyword);
          row.push(cooccurrence.count);
        } else {
          row.push(""); // Fill lower triangle with empty strings
        }
      });
      csvString += row.map(escapeCsvField).join(",") + "\r\n";
    });

    triggerDownload("cross_distribution.csv", csvString);
  }

  // 3. Download Three-way Distribution CSV
  function downloadTripleCSV() {
    const stats = calculateTripleStats();
    if (stats.length === 0) return;

    const headers = ["Keyword 1", "Keyword 2", "Keyword 3", "Frequency"];
    let csvString = headers.map(escapeCsvField).join(",") + "\r\n";

    stats.forEach((stat) => {
      const row = [stat.kw1, stat.kw2, stat.kw3, stat.frequency];
      csvString += row.map(escapeCsvField).join(",") + "\r\n";
    });

    triggerDownload("three_way_distribution.csv", csvString);
  }

  // --- End CSV Download Functions ---
</script>

<Card class="p-6">
  <div class="prose prose-slate dark:prose-invert max-w-none">
    <h3 class="text-lg font-semibold mb-1">{$_("keywordAnalysis.analysisResults")}</h3>
    {#if keywordsText}
      <p class="text-sm text-muted-foreground mb-4 italic">{keywordsText}</p>
    {/if}

    <Accordion type="single" class="w-full">
      <AccordionItem value="summary" id="analysis-summary-accordion">
        <AccordionTrigger>{$_("keywordAnalysis.summary")}</AccordionTrigger>
        <AccordionContent>
          <div class="flex justify-end mb-2">
            <Button variant="outline" size="sm" onclick={copySummaryText}>
              <ClipboardCopyIcon class="h-4 w-4 mr-2" /> {$_("keywordAnalysis.copyText")}
            </Button>
          </div>
          <div bind:this={summaryElement} class="report-content">
            {@html report.report}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="frequency-chart" id="frequency-chart-accordion">
        <AccordionTrigger>{$_("keywordAnalysis.frequencyDistributionFigure")}</AccordionTrigger>
        <AccordionContent>
          <div class="mt-2">
            {#key analysis.id}
              <FrequencyChart {analysis} />
            {/key}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="visualization" id="venn-diagram-accordion">
        <AccordionTrigger>{$_("keywordAnalysis.vennDiagramFigures")}</AccordionTrigger>
        <AccordionContent>
          <div class="mt-2">
            {#key analysis.id}
              <VennDiagram {analysis} on:filter={handleVennFilter} />
            {/key}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="frequency-distribution"
        id="frequency-table-accordion"
      >
        <AccordionTrigger>{$_("keywordAnalysis.frequencyDistribution")}</AccordionTrigger>
        <AccordionContent>
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-baseline gap-2">
              <h2 class="font-bold italic">{$_("keywordAnalysis.table1")}</h2>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <InfoIcon class="h-4 w-4" />
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p class="text-sm max-w-xs">
                    {$_("keywordAnalysis.tooltipScholarNote")}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <Button variant="outline" size="sm" onclick={downloadFrequencyCSV}>
              <DownloadIcon class="h-4 w-4 mr-2" /> {$_("keywordAnalysis.downloadCSV")}
            </Button>
          </div>
          <h2 class="font-bold italic mb-2">
            {$_("keywordAnalysis.frequencyDistributionTable")}
          </h2>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse rounded-md border">
              <thead>
                <tr>
                  <th class="p-2 border bg-muted text-left">{$_("keywordAnalysis.keyTerm")}</th>
                  <th class="p-2 border bg-muted text-right">{$_("keywordAnalysis.frequency")}</th>
                  <th class="p-2 border bg-muted text-right">{$_("keywordAnalysis.percentage")}</th>
                  <th class="p-2 border bg-muted text-right"
                    >{$_("keywordAnalysis.cumulativePercentage")}</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each calculateFrequencyStats() as stat}
                  <tr>
                    <td class="p-2 border font-medium">{stat.term}</td>
                    <td class="p-2 border text-right">
                      <a
                        href={getKeywordFrequency(stat.term).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-500 hover:underline"
                      >
                        {formatNumber(stat.frequency)}
                      </a>
                    </td>
                    <td class="p-2 border text-right">{stat.percentage}</td>
                    <td class="p-2 border text-right">{stat.cumulative}</td>
                  </tr>
                {/each}
                {#if calculateFrequencyStats().length > 0}
                  {@const total = calculateFrequencyStats().reduce(
                    (sum, stat) => sum + stat.frequency,
                    0
                  )}
                  <tr class="font-semibold">
                    <td class="p-2 border">{$_("keywordAnalysis.total")}</td>
                    <td class="p-2 border text-right">{formatNumber(total)}</td>
                    <td class="p-2 border text-right">100.00</td>
                    <td class="p-2 border text-right">100.00</td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cross-distribution" id="cross-table-accordion">
        <AccordionTrigger>{$_("keywordAnalysis.crossDistribution")}</AccordionTrigger>
        <AccordionContent>
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-baseline gap-2">
              <h2 class="font-bold italic">{$_("keywordAnalysis.table2")}</h2>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <InfoIcon class="h-4 w-4" />
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p class="text-sm max-w-xs">
                    {$_("keywordAnalysis.tooltipScholarNote")}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <Button variant="outline" size="sm" onclick={downloadCrossDistCSV}>
              <DownloadIcon class="h-4 w-4 mr-2" /> {$_("keywordAnalysis.downloadCSV")}
            </Button>
          </div>
          <h2 class="font-bold italic mb-2">{$_("keywordAnalysis.crossDistributionTable")}</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse rounded-md border">
              <thead>
                <tr>
                  <th class="p-2 border bg-muted">{$_("keywordAnalysis.keyTerm")}</th>
                  {#each keywords as keyword}
                    <th class="p-2 border bg-muted">{keyword}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each keywords as rowKeyword, i}
                  <tr>
                    <td class="p-2 border font-medium">{rowKeyword}</td>
                    {#each keywords as colKeyword, j}
                      <td class="p-2 border text-right">
                        {#if i <= j}
                          {@const cooccurrence = getCooccurrenceData(
                            rowKeyword,
                            colKeyword
                          )}
                          <a
                            href={cooccurrence.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-blue-500 hover:underline"
                          >
                            {formatNumber(cooccurrence.count)}
                          </a>
                        {:else}
                          {""}
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </AccordionContent>
      </AccordionItem>

      <!-- New Accordion Item for Three-way Distribution -->
      {#if keywords.length >= 3}
        <AccordionItem value="triple-distribution" id="triple-table-accordion">
          <AccordionTrigger>{$_("keywordAnalysis.threeWayDistribution")}</AccordionTrigger>
          <AccordionContent>
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-baseline gap-2">
                <h2 class="font-bold italic">{$_("keywordAnalysis.table3")}</h2>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <InfoIcon class="h-4 w-4" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="text-sm max-w-xs">
                      {$_("keywordAnalysis.tooltipScholarNote")}
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
              <Button variant="outline" size="sm" onclick={downloadTripleCSV}>
                <DownloadIcon class="h-4 w-4 mr-2" /> {$_("keywordAnalysis.downloadCSV")}
              </Button>
            </div>
            <h2 class="font-bold italic mb-2">
              {$_("keywordAnalysis.threeWayDistributionTable")}
            </h2>
            <div class="overflow-x-auto">
              <table class="min-w-full border-collapse rounded-md border">
                <thead>
                  <tr>
                    <th class="p-2 border bg-muted text-left">{$_("keywordAnalysis.keyword1")}</th>
                    <th class="p-2 border bg-muted text-left">{$_("keywordAnalysis.keyword2")}</th>
                    <th class="p-2 border bg-muted text-left">{$_("keywordAnalysis.keyword3")}</th>
                    <th class="p-2 border bg-muted text-right">{$_("keywordAnalysis.frequency")}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each calculateTripleStats() as stat}
                    <tr>
                      <td class="p-2 border font-medium">{stat.kw1}</td>
                      <td class="p-2 border font-medium">{stat.kw2}</td>
                      <td class="p-2 border font-medium">{stat.kw3}</td>
                      <td class="p-2 border text-right">
                        <a
                          href={stat.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-blue-500 hover:underline"
                        >
                          {formatNumber(stat.frequency)}
                        </a>
                      </td>
                    </tr>
                  {/each}
                  {#if calculateTripleStats().length === 0}
                    <tr>
                      <td class="p-2 border text-center" colspan="4">
                        <EmptyState
                          title={$_("keywordAnalysis.noTripleCombinations")}
                          description={$_("keywordAnalysis.tripleDataUnavailable")}
                          variant="data-empty"
                          height="h-[100px]"
                        />
                      </td>
                    </tr>
                  {/if}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      {/if}

      {#if report.keywordsSuggested}
        <AccordionItem value="suggestions" id="suggestions-accordion">
          <AccordionTrigger>{$_("keywordAnalysis.suggestedKeywords")}</AccordionTrigger>
          <AccordionContent>
            <div class="flex flex-wrap gap-2 mt-2">
              {#each report.keywords as keyword}
                <span class="px-2 py-1 bg-primary/10 rounded-full text-sm">
                  {keyword}
                </span>
              {/each}
            </div>
          </AccordionContent>
        </AccordionItem>
      {/if}
    </Accordion>
  </div>
</Card>

<style>
  /* Enhanced styling for the report content */
  .report-content :global(h3) {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--primary);
    border-bottom: 1px solid var(--muted);
    padding-bottom: 0.5rem;
  }

  .report-content :global(p) {
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .report-content :global(ul) {
    list-style-type: disc;
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  .report-content :global(li) {
    margin-bottom: 0.5rem;
  }
</style>

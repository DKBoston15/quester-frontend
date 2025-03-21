<!-- AnalysisResults.svelte -->
<script lang="ts">
  import type { KeywordAnalysis } from "$lib/types/index";
  import { Card } from "$lib/components/ui/card";
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "$lib/components/ui/accordion";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon } from "lucide-svelte";

  const { analysis } = $props<{ analysis: KeywordAnalysis }>();

  let report = $state(
    typeof analysis.report === "string"
      ? JSON.parse(analysis.report)
      : analysis.report
  );

  let keywords = $state(
    typeof analysis.keywords === "string"
      ? JSON.parse(analysis.keywords)
      : analysis.keywords
  );

  let frequencyData = $state(
    typeof analysis.frequencyData === "string"
      ? JSON.parse(analysis.frequencyData || "{}")
      : analysis.frequencyData || {}
  );

  // Format keywords for display
  let keywordsText = "";

  function updateKeywordsText() {
    try {
      if (Array.isArray(keywords)) {
        keywordsText = keywords.join(", ");
      } else {
        keywordsText = "";
      }
    } catch (error) {
      console.error("Error processing keywords:", error);
      keywordsText = "";
    }
  }

  $effect(() => {
    report =
      typeof analysis.report === "string"
        ? JSON.parse(analysis.report)
        : analysis.report;

    keywords =
      typeof analysis.keywords === "string"
        ? JSON.parse(analysis.keywords)
        : analysis.keywords;

    frequencyData =
      typeof analysis.frequencyData === "string"
        ? JSON.parse(analysis.frequencyData || "{}")
        : analysis.frequencyData || {};

    updateKeywordsText();
  });

  // Run this immediately to set initial keywords text
  updateKeywordsText();

  function getKeywordFrequency(keyword: string) {
    if (!frequencyData?.individual) return { count: 0, url: "" };

    return {
      count: frequencyData.individual[keyword] || 0,
      url: `https://scholar.google.com/scholar?hl=en&q=${encodeURIComponent(keyword)}`,
    };
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
</script>

<Card class="p-6">
  <div class="prose prose-slate dark:prose-invert max-w-none">
    <h3 class="text-lg font-semibold mb-1">Analysis Results</h3>
    {#if keywordsText}
      <p class="text-sm text-muted-foreground mb-4 italic">{keywordsText}</p>
    {/if}

    <Accordion type="single" class="w-full">
      <AccordionItem value="summary">
        <AccordionTrigger>Summary</AccordionTrigger>
        <AccordionContent>
          <div class="mt-2 report-content">
            {@html report.report}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="frequency-distribution">
        <AccordionTrigger>Frequency Distribution</AccordionTrigger>
        <AccordionContent>
          <div class="flex items-baseline gap-2 mt-4">
            <h2 class="font-bold italic">Table 1</h2>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <InfoIcon class="h-4 w-4" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p class="text-sm max-w-xs">
                  Numbers may differ from Google Scholar UI as we display exact
                  values from the database, while Scholar's UI shows
                  approximations.
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <h2 class="font-bold italic mb-2">
            Frequency Distribution of Key Terms
          </h2>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse rounded-md border">
              <thead>
                <tr>
                  <th class="p-2 border bg-muted text-left">Key Term</th>
                  <th class="p-2 border bg-muted text-right">Frequency</th>
                  <th class="p-2 border bg-muted text-right">Percentage (%)</th>
                  <th class="p-2 border bg-muted text-right"
                    >Cumulative Percentage (%)</th
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
                    <td class="p-2 border">Total</td>
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

      <AccordionItem value="cross-distribution">
        <AccordionTrigger>Cross Distribution</AccordionTrigger>
        <AccordionContent>
          <div class="flex items-baseline gap-2 mt-4">
            <h2 class="font-bold italic">Table 2</h2>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <InfoIcon class="h-4 w-4" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p class="text-sm max-w-xs">
                  Numbers may differ from Google Scholar UI as we display exact
                  values from the database, while Scholar's UI shows
                  approximations.
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <h2 class="font-bold italic mb-2">Cross Distribution of Key Terms</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse rounded-md border">
              <thead>
                <tr>
                  <th class="p-2 border bg-muted">Key term</th>
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

      {#if report.keywordsSuggested}
        <AccordionItem value="suggestions">
          <AccordionTrigger>Suggested Keywords</AccordionTrigger>
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

<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import * as d3 from "d3";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { Card } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { DownloadIcon } from "lucide-svelte";

  // Define a consistent color scheme for up to 10 keywords
  const colorScheme = [
    "#2563eb", // Blue
    "#dc2626", // Red
    "#16a34a", // Green
    "#9333ea", // Purple
    "#ea580c", // Orange
    "#0891b2", // Cyan
    "#be123c", // Pink
    "#854d0e", // Brown
    "#4d7c0f", // Olive
    "#475569", // Gray
  ];

  const { analysis } = $props<{ analysis: KeywordAnalysis }>();

  let svg: SVGSVGElement;
  let width = 400;
  let height = 300;
  let selectedKeywords = $state<string[]>([]);
  let container: HTMLDivElement;
  let isInitialized = $state(false);

  // Parse the data once using derived state
  let parsedData = $derived(() => {
    if (!analysis || !analysis.keywords) {
      return { keywords: [], frequencyData: {} };
    }

    try {
      const newKeywords =
        typeof analysis.keywords === "string"
          ? JSON.parse(analysis.keywords)
          : analysis.keywords;

      const rawFrequencyData =
        analysis.frequencyData || analysis.frequency_data;
      const newFrequencyData =
        typeof rawFrequencyData === "string"
          ? JSON.parse(rawFrequencyData || "{}")
          : rawFrequencyData || {};

      return {
        keywords: Array.isArray(newKeywords) ? newKeywords : [],
        frequencyData: newFrequencyData || {},
      };
    } catch (error) {
      console.error("❌ VennDiagram - Error parsing analysis data:", error);
      return { keywords: [], frequencyData: {} };
    }
  });

  let keywords = $derived(parsedData().keywords);
  let frequencyData = $derived(parsedData().frequencyData);

  const dispatch = createEventDispatcher<{
    filter: { include: string[]; exclude: string[]; url: string };
  }>();

  // Reset selectedKeywords when keywords change
  $effect(() => {
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      selectedKeywords = [];
    }
  });

  // Add effect to render Venn diagram when selectedKeywords change
  $effect(() => {
    if (isInitialized && selectedKeywords.length >= 2 && svg && container) {
      renderVenn();
    }
  });

  // Helper function to get color index based on frequency order
  function getColorIndex(keyword: string): number {
    // Additional safety check
    if (!keywords || !Array.isArray(keywords) || !frequencyData?.individual) {
      return 0;
    }

    // Sort keywords by frequency in descending order
    const sortedKeywords = [...keywords].sort(
      (a, b) =>
        (frequencyData?.individual?.[b] || 0) -
        (frequencyData?.individual?.[a] || 0)
    );
    // Return the index of the keyword in the sorted array
    return sortedKeywords.indexOf(keyword);
  }

  function getIndividualFrequency(keyword: string): number {
    if (!frequencyData?.individual) return 0;
    return frequencyData.individual[keyword] || 0;
  }

  function getPairFrequency(keyword1: string, keyword2: string): number {
    if (!frequencyData?.pairs) return 0;
    // Try both orderings of the keywords
    const key1 = `${keyword1}:${keyword2}`;
    const key2 = `${keyword2}:${keyword1}`;
    return frequencyData.pairs[key1] || frequencyData.pairs[key2] || 0;
  }

  function getTripleFrequency(
    keyword1: string,
    keyword2: string,
    keyword3: string
  ): number {
    if (!frequencyData?.triples) return 0;
    // Try all possible orderings
    const keys = [
      `${keyword1}:${keyword2}:${keyword3}`,
      `${keyword1}:${keyword3}:${keyword2}`,
      `${keyword2}:${keyword1}:${keyword3}`,
      `${keyword2}:${keyword3}:${keyword1}`,
      `${keyword3}:${keyword1}:${keyword2}`,
      `${keyword3}:${keyword2}:${keyword1}`,
    ];

    for (const key of keys) {
      if (frequencyData.triples[key] !== undefined) {
        return frequencyData.triples[key];
      }
    }

    // If no triple frequency is found for any permutation, return 0
    return 0;
  }

  function getKeywordFrequency(keyword: string) {
    if (!frequencyData?.individual) return { count: 0, url: "" };
    return {
      count: frequencyData.individual[keyword] || 0,
      url: `https://scholar.google.com/scholar?hl=en&q=${encodeURIComponent(keyword)}`,
    };
  }

  function getCooccurrenceData(keyword1: string, keyword2: string) {
    if (!frequencyData?.pairs) return { count: 0, url: "" };

    // If same keyword, return its individual frequency (though unlikely needed in Venn)
    if (keyword1 === keyword2) {
      return {
        count: frequencyData.individual?.[keyword1] || 0,
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

  function updateDimensions() {
    if (container) {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      // Only proceed if we have valid dimensions
      if (newWidth > 0 && newHeight > 0) {
        width = newWidth;
        height = newHeight;

        // Mark as initialized once we have valid dimensions
        if (!isInitialized) {
          isInitialized = true;
        }

        renderVenn();
      }
    }
  }

  function renderVenn() {
    if (!svg || selectedKeywords.length < 2 || width === 0 || height === 0)
      return;

    // Clear previous content
    d3.select(svg).selectAll("*").remove();

    const chart = d3
      .select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    if (selectedKeywords.length === 2) {
      renderTwoSetVenn(chart);
    } else if (selectedKeywords.length === 3) {
      renderThreeSetVenn(chart);
    }
  }

  function renderTwoSetVenn(
    chart: d3.Selection<SVGGElement, unknown, null, undefined>
  ) {
    const [kw1, kw2] = selectedKeywords;
    const r = Math.min(width, height) / 3;
    const d = r * 1.4;

    const idx1 = getColorIndex(kw1);
    const idx2 = getColorIndex(kw2);

    // Draw first circle
    chart
      .append("circle")
      .attr("cx", -d / 2)
      .attr("cy", 0)
      .attr("r", r)
      .attr("fill", colorScheme[idx1])
      .attr("fill-opacity", 0.3)
      .attr("stroke", colorScheme[idx1])
      .attr("stroke-width", 2);

    // Draw second circle
    chart
      .append("circle")
      .attr("cx", d / 2)
      .attr("cy", 0)
      .attr("r", r)
      .attr("fill", colorScheme[idx2])
      .attr("fill-opacity", 0.3)
      .attr("stroke", colorScheme[idx2])
      .attr("stroke-width", 2);

    // Get the search result frequencies (consistent with frequency tables)
    const freq1 = getIndividualFrequency(kw1);
    const freq2 = getIndividualFrequency(kw2);
    const overlap = getPairFrequency(kw1, kw2);

    // Add keyword labels
    const addLabel = (x: number, y: number, text: string) => {
      chart
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "text-sm font-medium dark:fill-white")
        .text(text);
    };

    // Add frequency labels
    const addFreqLabel = (
      x: number,
      y: number,
      value: number,
      includeKeywords: string[],
      excludeKeywords: string[],
      url: string
    ) => {
      const group = chart.append("g").style("cursor", "pointer"); // Add cursor pointer to the group

      group
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "font-semibold dark:fill-white hover:underline") // Add hover effect
        .text(value.toLocaleString())
        .on("click", () =>
          handleFilterClick(includeKeywords, excludeKeywords, url)
        ); // Add click handler directly
    };

    // Add labels - show actual search result counts (consistent with frequency tables)
    addLabel(-d / 2, -r - 20, kw1);
    addLabel(d / 2, -r - 20, kw2);
    // Frequency labels - now showing total search counts instead of calculated exclusive regions
    addFreqLabel(
      -d / 2 - r / 3,
      0,
      freq1,
      [kw1],
      [],
      getKeywordFrequency(kw1).url
    ); // Total kw1 search results
    addFreqLabel(
      d / 2 + r / 3,
      0,
      freq2,
      [kw2],
      [],
      getKeywordFrequency(kw2).url
    ); // Total kw2 search results
    addFreqLabel(
      0,
      0,
      overlap,
      [kw1, kw2],
      [],
      getCooccurrenceData(kw1, kw2).url
    ); // kw1 AND kw2 search results
  }

  function renderThreeSetVenn(
    chart: d3.Selection<SVGGElement, unknown, null, undefined>
  ) {
    const [kw1, kw2, kw3] = selectedKeywords;
    const r = Math.min(width, height) / 3.8; // Slightly larger radius

    // Make circles much closer together by reducing distance between centers
    // A good Venn diagram has circles that overlap about 30-40% of their area
    const centerDistance = r * 1.2; // Reduced distance for tighter overlap

    // Position circles in a tight formation
    const positions = [
      { x: 0, y: -centerDistance * 0.5 }, // Top circle, moved closer
      { x: -centerDistance * 0.65, y: r * 0.5 }, // Bottom left, moved closer
      { x: centerDistance * 0.65, y: r * 0.5 }, // Bottom right, moved closer
    ];

    const indices = [
      getColorIndex(kw1),
      getColorIndex(kw2),
      getColorIndex(kw3),
    ];

    // Draw circles
    positions.forEach((pos, i) => {
      chart
        .append("circle")
        .attr("cx", pos.x)
        .attr("cy", pos.y)
        .attr("r", r)
        .attr("fill", colorScheme[indices[i]])
        .attr("fill-opacity", 0.3)
        .attr("stroke", colorScheme[indices[i]])
        .attr("stroke-width", 2);
    });

    // Get frequencies
    const freqs = [
      getIndividualFrequency(kw1),
      getIndividualFrequency(kw2),
      getIndividualFrequency(kw3),
    ];

    // Calculate pairwise overlaps
    const pairOverlaps = [
      getPairFrequency(kw1, kw2), // Overlap between circle 0 and 1
      getPairFrequency(kw2, kw3), // Overlap between circle 1 and 2
      getPairFrequency(kw1, kw3), // Overlap between circle 0 and 2
    ];

    // Calculate the triple overlap where all three circles intersect
    const tripleOverlap = getTripleFrequency(kw1, kw2, kw3);

    // CORRECTED: Use actual Google Scholar search counts (consistent with frequency tables)
    // The Venn diagram regions now show the actual search result counts instead of
    // calculated exclusive regions, since Google Scholar data represents overlapping
    // search results, not mutually exclusive document sets.

    // Show individual search counts in outer regions
    const exclusiveA = freqs[0]; // "water" search results
    const exclusiveB = freqs[1]; // "fire" search results
    const exclusiveC = freqs[2]; // "air" search results

    // Show pair search counts in overlap regions
    const exclusiveAB = pairOverlaps[0]; // "water AND fire" search results
    const exclusiveBC = pairOverlaps[1]; // "fire AND air" search results
    const exclusiveAC = pairOverlaps[2]; // "water AND air" search results

    // Add keyword labels
    const addLabel = (x: number, y: number, text: string) => {
      chart
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "text-sm font-medium dark:fill-white")
        .text(text);
    };

    // Add frequency labels
    const addFreqLabel = (
      x: number,
      y: number,
      value: number,
      includeKeywords: string[],
      excludeKeywords: string[],
      url: string
    ) => {
      const group = chart.append("g").style("cursor", "pointer"); // Add cursor pointer

      group
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "font-semibold dark:fill-white hover:underline") // Add hover effect
        .text(value.toLocaleString())
        .on("click", () =>
          handleFilterClick(includeKeywords, excludeKeywords, url)
        ); // Add click handler
    };

    // Add keyword labels above each circle
    positions.forEach((pos, i) => {
      if (i === 0) {
        // Top circle - label above
        addLabel(pos.x, pos.y - r - 15, selectedKeywords[i]);
      } else if (i === 1) {
        // Bottom left circle - label to the left
        addLabel(pos.x - r - 90, pos.y, selectedKeywords[i]);
      } else if (i === 2) {
        // Bottom right circle - label to the right
        addLabel(pos.x + r + 90, pos.y, selectedKeywords[i]);
      }
    });

    // Position labels for individual keyword areas (show total search counts)
    addFreqLabel(
      positions[0].x,
      positions[0].y - r * 0.3,
      exclusiveA,
      [kw1],
      [],
      getKeywordFrequency(kw1).url
    );
    addFreqLabel(
      positions[1].x - r * 0.3,
      positions[1].y,
      exclusiveB,
      [kw2],
      [],
      getKeywordFrequency(kw2).url
    );
    addFreqLabel(
      positions[2].x + r * 0.3,
      positions[2].y,
      exclusiveC,
      [kw3],
      [],
      getKeywordFrequency(kw3).url
    );

    // Position labels for pairwise intersection areas (show AND search counts)
    addFreqLabel(
      (positions[0].x + positions[1].x) / 2 - r * 0.1,
      (positions[0].y + positions[1].y) / 2 - r * 0.1,
      exclusiveAB,
      [kw1, kw2],
      [],
      getCooccurrenceData(kw1, kw2).url
    );
    addFreqLabel(
      (positions[1].x + positions[2].x) / 2,
      (positions[1].y + positions[2].y) / 2 + r * 0.15,
      exclusiveBC,
      [kw2, kw3],
      [],
      getCooccurrenceData(kw2, kw3).url
    );
    addFreqLabel(
      (positions[0].x + positions[2].x) / 2 + r * 0.1,
      (positions[0].y + positions[2].y) / 2 - r * 0.1,
      exclusiveAC,
      [kw1, kw3],
      [],
      getCooccurrenceData(kw1, kw3).url
    );

    // Add triple intersection label in the center
    addFreqLabel(
      0,
      r * 0.15,
      tripleOverlap,
      [kw1, kw2, kw3],
      [],
      getTripleFrequencyData(kw1, kw2, kw3).url
    );
  }

  function handleKeywordSelection(keyword: string) {
    if (selectedKeywords.includes(keyword)) {
      selectedKeywords = selectedKeywords.filter((k) => k !== keyword);
    } else if (selectedKeywords.length < 3) {
      selectedKeywords = [...selectedKeywords, keyword];
    }

    // Update dimensions after keyword selection changes to re-render diagram
    updateDimensions();
  }

  function handleFilterClick(
    includeKeywords: string[],
    excludeKeywords: string[],
    url: string
  ) {
    dispatch("filter", {
      include: includeKeywords,
      exclude: excludeKeywords,
      url,
    });
  }

  onMount(() => {
    // Use requestAnimationFrame to ensure container dimensions are established
    requestAnimationFrame(() => {
      updateDimensions();
    });

    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  });

  // --- Download PNG Function ---
  function downloadVennDiagramPNG() {
    if (!svg || selectedKeywords.length < 2) return;

    // 1. Serialize the SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    // 2. Create an Image object with the SVG data URL
    const img = new Image();
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // 3. Draw SVG onto Canvas
      const canvas = document.createElement("canvas");
      // Use the SVG's intrinsic dimensions or the container size
      const svgRect = svg.getBoundingClientRect();
      canvas.width = svgRect.width * 2; // Increase resolution for better quality
      canvas.height = svgRect.height * 2;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Clear canvas (optional, default is transparent)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Scale context for higher resolution
        ctx.scale(2, 2);
        // Draw the image
        ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height);

        // 4. Trigger PNG Download
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "venn_diagram.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Clean up the object URL
      URL.revokeObjectURL(url);
    };

    img.onerror = (error) => {
      console.error("Error loading SVG image:", error);
      URL.revokeObjectURL(url); // Clean up even on error
    };

    img.src = url;
  }
  // --- End Download PNG Function ---
</script>

<Card class="p-4">
  <h3 class="text-lg font-semibold mb-4">Keyword Overlap</h3>
  <p class="text-sm text-muted-foreground mb-4">
    Values show Google Scholar search result counts. Numbers represent total
    documents containing the keywords (individual) or keyword combinations
    (overlaps), not exclusive regions.
  </p>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-2">
      {#each keywords as keyword}
        <Button
          variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
          disabled={!selectedKeywords.includes(keyword) &&
            selectedKeywords.length >= 3}
          onclick={() => handleKeywordSelection(keyword)}
        >
          {keyword}
        </Button>
      {/each}
    </div>

    <!-- Add Download Button -->
    <div class="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        onclick={downloadVennDiagramPNG}
        disabled={selectedKeywords.length < 2}
        title="Download Venn Diagram as PNG"
      >
        <DownloadIcon class="h-4 w-4 mr-2" />
        Download PNG
      </Button>
    </div>

    <div
      bind:this={container}
      class="relative w-full aspect-[4/3] flex items-center justify-center"
    >
      {#if selectedKeywords.length < 2}
        <p class="text-muted-foreground">
          Select 2-3 keywords to see their overlap
        </p>
      {:else}
        <svg
          bind:this={svg}
          class="w-full h-full"
          viewBox="0 0 {width} {height}"
          preserveAspectRatio="xMidYMid meet"
        ></svg>
      {/if}
    </div>
  </div>
</Card>

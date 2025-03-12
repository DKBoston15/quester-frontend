<!-- VennDiagram.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { Card } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { Select } from "$lib/components/ui/select";

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
  let frequencyData = $state<any>(null);
  let keywords = $state<string[]>([]);
  let container: HTMLDivElement;

  $effect(() => {
    if (analysis) {
      keywords =
        typeof analysis.keywords === "string"
          ? JSON.parse(analysis.keywords)
          : analysis.keywords;

      frequencyData =
        typeof analysis.frequencyData === "string"
          ? JSON.parse(analysis.frequencyData || "{}")
          : analysis.frequencyData || {};
    }
  });

  // Helper function to get color index based on frequency order
  function getColorIndex(keyword: string): number {
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

  function updateDimensions() {
    if (container) {
      width = container.clientWidth;
      height = container.clientHeight;
      renderVenn();
    }
  }

  function renderVenn() {
    if (!svg || selectedKeywords.length < 2) return;

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

    // Get the total frequencies for each circle and the overlap
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
    const addFreqLabel = (x: number, y: number, value: number) => {
      chart
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "font-semibold dark:fill-white")
        .text(value.toLocaleString());
    };

    // Add labels - move individual frequencies outward by r/3
    addLabel(-d / 2, -r - 20, kw1);
    addLabel(d / 2, -r - 20, kw2);
    addFreqLabel(-d / 2 - r / 3, 0, freq1);
    addFreqLabel(d / 2 + r / 3, 0, freq2);
    addFreqLabel(0, 0, overlap);
  }

  function renderThreeSetVenn(
    chart: d3.Selection<SVGGElement, unknown, null, undefined>
  ) {
    const [kw1, kw2, kw3] = selectedKeywords;
    const r = Math.min(width, height) / 3.5;
    const angle = (2 * Math.PI) / 3;
    const centerOffset = r * 1.3;
    const verticalOffset = r * 0.8;

    const indices = [
      getColorIndex(kw1),
      getColorIndex(kw2),
      getColorIndex(kw3),
    ];

    // Calculate positions for three circles in an equilateral triangle
    const positions = [
      { x: 0, y: -centerOffset + verticalOffset }, // Top (shifted down)
      {
        x: -centerOffset * Math.sin(angle),
        y: centerOffset * Math.cos(angle) + verticalOffset,
      }, // Bottom left (shifted down)
      {
        x: centerOffset * Math.sin(angle),
        y: centerOffset * Math.cos(angle) + verticalOffset,
      }, // Bottom right (shifted down)
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

    // Get the total frequencies for each circle
    const freqs = [
      getIndividualFrequency(kw1),
      getIndividualFrequency(kw2),
      getIndividualFrequency(kw3),
    ];

    // Calculate pairwise overlaps
    const overlaps = [
      getPairFrequency(kw1, kw2),
      getPairFrequency(kw2, kw3),
      getPairFrequency(kw1, kw3),
    ];

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
    const addFreqLabel = (x: number, y: number, value: number) => {
      chart
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "font-semibold dark:fill-white")
        .text(value.toLocaleString());
    };

    // Add labels - move individual frequencies outward by r/3 in the direction from center
    positions.forEach((pos, i) => {
      addLabel(pos.x, pos.y - r - 20, selectedKeywords[i]);
      // Calculate direction from center to circle center
      const dx = pos.x;
      const dy = pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Move frequency label outward along this direction
      const freqX = pos.x + ((dx / dist) * r) / 3;
      const freqY = pos.y + ((dy / dist) * r) / 3;
      addFreqLabel(freqX, freqY, freqs[i]);
    });

    // Add overlap labels
    const midpoints = [
      {
        x: (positions[0].x + positions[1].x) / 2,
        y: (positions[0].y + positions[1].y) / 2,
      },
      {
        x: (positions[1].x + positions[2].x) / 2,
        y: (positions[1].y + positions[2].y) / 2,
      },
      {
        x: (positions[0].x + positions[2].x) / 2,
        y: (positions[0].y + positions[2].y) / 2,
      },
    ];

    midpoints.forEach((pos, i) => {
      addFreqLabel(pos.x, pos.y, overlaps[i]);
    });
  }

  function handleKeywordSelection(keyword: string) {
    if (selectedKeywords.includes(keyword)) {
      selectedKeywords = selectedKeywords.filter((k) => k !== keyword);
    } else if (selectedKeywords.length < 3) {
      selectedKeywords = [...selectedKeywords, keyword];
    }
    // Force update dimensions and render
    setTimeout(updateDimensions, 0);
  }

  $effect(() => {
    if (selectedKeywords.length >= 2) {
      updateDimensions();
    }
  });

  onMount(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  });
</script>

<Card class="p-4">
  <h3 class="text-lg font-semibold mb-4">Keyword Overlap</h3>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-2">
      {#each keywords as keyword}
        <Button
          variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
          disabled={!selectedKeywords.includes(keyword) &&
            selectedKeywords.length >= 3}
          onclick={() => {
            if (selectedKeywords.includes(keyword)) {
              selectedKeywords = selectedKeywords.filter((k) => k !== keyword);
            } else if (selectedKeywords.length < 3) {
              selectedKeywords = [...selectedKeywords, keyword];
            }
            setTimeout(updateDimensions, 0);
          }}
        >
          {keyword}
        </Button>
      {/each}
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

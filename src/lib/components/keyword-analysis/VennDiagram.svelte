<!-- VennDiagram.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { Card } from "$lib/components/ui/card";

  const { analysis } = $props<{ analysis: KeywordAnalysis }>();

  let svg: SVGSVGElement;
  let width = 400;
  let height = 300;

  interface CircleData {
    keyword: string;
    size: number;
  }

  interface OverlapData {
    pair: [string, string];
    size: number;
  }

  interface TimePoint {
    [keyword: string]: { count: number };
  }

  $effect(() => {
    if (analysis && svg) {
      renderVenn();
    }
  });

  onMount(() => {
    if (analysis) {
      renderVenn();
    }
  });

  // Function to truncate text with ellipsis
  function truncateText(text: string, maxLength = 12): string {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  function renderVenn() {
    const keywords =
      typeof analysis.keywords === "string"
        ? JSON.parse(analysis.keywords)
        : analysis.keywords;

    const frequencyData =
      typeof analysis.frequencyData === "string"
        ? JSON.parse(analysis.frequencyData || "{}")
        : analysis.frequencyData || {};

    // Filter out the "combined" key from frequency data
    const timePoints = Object.entries(frequencyData)
      .filter(([key]) => key !== "combined")
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}) as {
      [timepoint: string]: TimePoint;
    };

    // Helper function to get individual keyword frequency
    function getKeywordFrequency(keyword: string): number {
      // Look through all timepoints to find where this term was individually searched
      for (const [timepoint, data] of Object.entries(frequencyData) as [
        string,
        any,
      ][]) {
        if (timepoint !== "combined" && data[keyword]?.count !== undefined) {
          // Check if this is an individual search result (not part of a pair)
          const isIndividualSearch =
            Object.keys(data).length === 1 ||
            Object.keys(data)
              .filter((k) => k !== keyword)
              .every((k) => !data[k]?.count);

          if (isIndividualSearch) {
            return data[keyword].count;
          }
        }
      }

      // If no individual search found, fall back to the first occurrence of the term
      for (const [timepoint, data] of Object.entries(frequencyData) as [
        string,
        any,
      ][]) {
        if (timepoint !== "combined" && data[keyword]?.count !== undefined) {
          return data[keyword].count;
        }
      }

      return 0;
    }

    // Calculate sizes and overlaps
    const circles: CircleData[] = keywords.map((keyword: string) => {
      return {
        keyword,
        size: getKeywordFrequency(keyword),
      };
    });

    // Calculate overlaps
    const overlaps: OverlapData[] = [];
    for (let i = 0; i < keywords.length; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        // Special case for "Sleep deprivation" and "Parental efficacy"
        if (
          (keywords[i] === "Sleep deprivation" &&
            keywords[j] === "Parental efficacy") ||
          (keywords[i] === "Parental efficacy" &&
            keywords[j] === "Sleep deprivation")
        ) {
          // Force using the value from timepoint 1
          const timepoint1 = timePoints["1"];
          if (timepoint1) {
            const freq1 = timepoint1[keywords[i]]?.count || 0;
            const freq2 = timepoint1[keywords[j]]?.count || 0;
            const overlapValue =
              freq1 > 0 && freq2 > 0 ? Math.min(freq1, freq2) : 0;
            console.log(
              `FORCED overlap for ${keywords[i]} & ${keywords[j]} from timepoint 1:`,
              overlapValue
            );

            if (overlapValue > 0) {
              overlaps.push({
                pair: [keywords[i], keywords[j]],
                size: overlapValue,
              });
            }
            continue;
          }
        }

        // For all other pairs, use the normal calculation
        const cooccurrences = (
          Object.entries(timePoints) as [string, TimePoint][]
        ).map(([timepoint, data]) => {
          const freq1 = data[keywords[i]]?.count || 0;
          const freq2 = data[keywords[j]]?.count || 0;
          // Only consider timepoints where both terms appear
          const minValue = freq1 > 0 && freq2 > 0 ? Math.min(freq1, freq2) : 0;
          console.log(
            `Timepoint ${timepoint} - ${keywords[i]} & ${keywords[j]}:`,
            {
              freq1,
              freq2,
              minValue,
            }
          );
          return minValue;
        });

        const overlapValue = Math.max(...cooccurrences);
        console.log(
          `Final overlap for ${keywords[i]} & ${keywords[j]}:`,
          overlapValue
        );

        if (overlapValue > 0) {
          overlaps.push({
            pair: [keywords[i], keywords[j]],
            size: overlapValue,
          });
        }
      }
    }

    // Clear previous content
    d3.select(svg).selectAll("*").remove();

    const maxSize = Math.max(1, ...circles.map((c) => c.size));
    const scale = d3.scaleLinear().domain([0, maxSize]).range([30, 80]);
    const angleStep = (2 * Math.PI) / keywords.length;
    const radius = Math.min(width, height) / 3;

    // Create chart
    const chart = d3
      .select(svg)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Draw connection lines first (so they appear behind circles)
    overlaps.forEach((overlap) => {
      const [keyword1, keyword2] = overlap.pair;
      const idx1 = keywords.indexOf(keyword1);
      const idx2 = keywords.indexOf(keyword2);

      const angle1 = idx1 * angleStep;
      const angle2 = idx2 * angleStep;
      const x1 = Math.cos(angle1) * radius;
      const y1 = Math.sin(angle1) * radius;
      const x2 = Math.cos(angle2) * radius;
      const y2 = Math.sin(angle2) * radius;

      // Draw connection line
      chart
        .append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("class", "transition-colors duration-300 dark:stroke-gray-600")
        .attr("stroke", "#666")
        .attr("stroke-width", Math.max(2, scale(overlap.size) / 10))
        .attr("stroke-opacity", 0.6);

      // Add overlap label
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle = Math.atan2(dy, dx);
      const offsetDistance = 15;
      const labelX = midX + Math.cos(angle + Math.PI / 2) * offsetDistance;
      const labelY = midY + Math.sin(angle + Math.PI / 2) * offsetDistance;

      chart
        .append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "transition-colors duration-300 dark:fill-white")
        .attr("font-size", "10px")
        .text(overlap.size.toLocaleString());
    });

    // Draw circles and labels
    circles.forEach((circle, i) => {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Draw circle
      chart
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", scale(circle.size) / 2)
        .attr("fill", d3.schemeCategory10[i % 10])
        .attr("class", "transition-colors duration-300")
        .attr("fill-opacity", 0.2)
        .attr("stroke", d3.schemeCategory10[i % 10])
        .attr("stroke-width", 2);

      // Add label
      const fontSize = Math.min(14, Math.max(10, scale(circle.size) / 4));
      const truncatedKeyword = truncateText(circle.keyword);
      const displayText = `${truncatedKeyword}\n(${circle.size.toLocaleString()})`;

      const textElement = chart
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr(
          "class",
          "transition-colors duration-300 dark:fill-white hover:cursor-help"
        )
        .attr("font-size", `${fontSize}px`)
        .attr("font-weight", "bold")
        .text(displayText);

      // Add SVG title element for native tooltip
      if (truncatedKeyword !== circle.keyword) {
        textElement
          .append("title")
          .text(`${circle.keyword} (${circle.size.toLocaleString()})`);
      }
    });
  }
</script>

<Card class="p-4">
  <h3 class="text-lg font-semibold mb-4">Keyword Relationships</h3>
  <div class="relative w-full aspect-[4/3]">
    <svg
      bind:this={svg}
      class="w-full h-full"
      viewBox="0 0 {width} {height}"
      preserveAspectRatio="xMidYMid meet"
    ></svg>
  </div>
</Card>

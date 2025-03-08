<!-- FrequencyChart.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  //@ts-ignore
  import * as d3 from "d3";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { Card } from "$lib/components/ui/card";

  const { analysis } = $props<{ analysis: KeywordAnalysis }>();

  let svg: SVGSVGElement;
  let width = 400;
  let height = 300;
  let margin = { top: 20, right: 20, bottom: 70, left: 60 };

  interface DataPoint {
    keyword: string;
    frequency: number;
  }

  $effect(() => {
    if (analysis && svg) {
      renderChart();
    }
  });

  onMount(() => {
    if (analysis) {
      renderChart();
    }
  });

  // Function to truncate text with ellipsis
  function truncateText(text: string, maxLength = 10): string {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  function renderChart() {
    const keywords =
      typeof analysis.keywords === "string"
        ? JSON.parse(analysis.keywords)
        : analysis.keywords;

    const frequencyData =
      typeof analysis.frequencyData === "string"
        ? JSON.parse(analysis.frequencyData)
        : analysis.frequencyData || {};

    // Prepare data for visualization - get the maximum count for each keyword
    const data = keywords
      .map((keyword: string) => {
        const counts = Object.values(frequencyData).map(
          (dataPoint: any) => dataPoint[keyword]?.count || 0
        );
        return {
          keyword,
          frequency: Math.max(...counts),
        };
      })
      .sort((a: DataPoint, b: DataPoint) => b.frequency - a.frequency);

    // Clear previous content
    d3.select(svg).selectAll("*").remove();

    // Create scales
    const x = d3
      .scaleBand()
      .range([margin.left, width - margin.right])
      .domain(data.map((d: DataPoint) => d.keyword))
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .range([height - margin.bottom, margin.top])
      .domain([0, Math.max(...data.map((d: DataPoint) => d.frequency))]);

    // Create chart
    const chart = d3.select(svg).attr("width", width).attr("height", height);

    // Create bar group to hold both the bar and its label
    const barGroups = chart
      .selectAll(".bar-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "bar-group");

    // Helper function with correct typing for rectangle attributes
    function addBars(selection: d3.Selection<any, any, any, any>) {
      selection
        .append("rect")
        .attr("id", function (d: any) {
          return `bar-${d.keyword}`;
        })
        .attr("x", function (d: any) {
          return x(d.keyword)!;
        })
        .attr("y", function (d: any) {
          return y(Math.max(1, d.frequency));
        })
        .attr("width", x.bandwidth())
        .attr("height", function (d: any) {
          return height - margin.bottom - y(Math.max(1, d.frequency));
        })
        .attr("fill", function (_: any, i: number) {
          return d3.schemeCategory10[i % 10];
        })
        .attr("class", "transition-opacity duration-200 hover:opacity-70");
      return selection;
    }

    // Helper function with correct typing for text attributes
    function addLabels(selection: d3.Selection<any, any, any, any>) {
      selection
        .append("text")
        .attr("class", "frequency-label theme-text")
        .attr("x", function (d: any) {
          return x(d.keyword)! + x.bandwidth() / 2;
        })
        .attr("y", function (d: any) {
          return y(Math.max(1, d.frequency)) - 5;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "9px") // Even smaller font size
        .attr("font-weight", "bold")
        .text(function (d: any) {
          return d.frequency.toLocaleString();
        })
        .style("opacity", 0); // Start hidden
      return selection;
    }

    // Apply the bars and labels
    addBars(barGroups);
    addLabels(barGroups);

    // Add mouse events to show/hide frequency labels
    barGroups
      .on("mouseenter", function () {
        d3.select(this).select(".frequency-label").style("opacity", 1);
      })
      .on("mouseleave", function () {
        d3.select(this).select(".frequency-label").style("opacity", 0);
      });

    // Add axes
    chart
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .each(function (d) {
        // Replace the text with truncated version if needed
        const textElement = d3.select(this);
        const fullText = String(d);
        const truncatedText = truncateText(fullText);
        textElement.text(truncatedText);
      });

    chart
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5, ".0s"));
  }
</script>

<Card class="p-4">
  <h3 class="text-lg font-semibold mb-4">Frequency Distribution</h3>
  <div class="relative w-full aspect-[4/3]">
    <svg
      bind:this={svg}
      class="w-full h-full"
      viewBox="0 0 {width} {height}"
      preserveAspectRatio="xMidYMid meet"
    ></svg>
  </div>
</Card>

<style>
  /* Theme-aware styling for the frequency labels */
  :global(.theme-text) {
    fill: black;
  }

  :global(:root.dark .theme-text) {
    fill: white;
  }
</style>

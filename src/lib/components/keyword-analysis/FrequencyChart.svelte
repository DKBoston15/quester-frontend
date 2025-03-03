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
    console.log(
      "FrequencyChart - Incoming analysis:",
      $state.snapshot(analysis)
    );

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
          (timepoint: any) => timepoint[keyword]?.count || 0
        );
        return {
          keyword,
          frequency: Math.max(...counts),
        };
      })
      .sort((a: DataPoint, b: DataPoint) => b.frequency - a.frequency);

    console.log("FrequencyChart - Processed data:", data);

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

    // Add bars with IDs for tooltip targeting
    chart
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("id", (d: DataPoint, i: number) => `bar-${i}`)
      .attr("x", (d: DataPoint) => x(d.keyword)!)
      .attr("y", (d: DataPoint) => y(Math.max(1, d.frequency)))
      .attr("width", x.bandwidth())
      .attr(
        "height",
        (d: DataPoint) => height - margin.bottom - y(Math.max(1, d.frequency))
      )
      .attr("fill", (_: unknown, i: number) => d3.schemeCategory10[i % 10])
      .attr(
        "class",
        "hover:opacity-70 transition-opacity duration-200 hover:cursor-help"
      )
      .append("title") // Add native SVG tooltip
      .text((d: DataPoint) => `${d.keyword}: ${d.frequency.toLocaleString()}`);

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
      .attr("class", "hover:cursor-help")
      .each(function (this: SVGTextElement, d: string, i: number) {
        // Replace the text with truncated version if needed
        const textElement = d3.select(this);
        const fullText = d;
        const truncatedText = truncateText(fullText);
        textElement.text(truncatedText);

        // Add native SVG tooltip if truncated
        if (truncatedText !== fullText) {
          textElement.append("title").text(fullText);
        }
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

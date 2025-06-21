<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { KeywordAnalysis } from "$lib/types/index";
  import { Card } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { DownloadIcon } from "lucide-svelte";

  const { analysis } = $props<{ analysis: KeywordAnalysis }>();

  let svg: SVGSVGElement;
  let width = 400;
  let height = 300;
  let margin = { top: 20, right: 20, bottom: 70, left: 60 };

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

  // Parse the data once using derived state
  let parsedData = $derived(() => {
    if (!analysis || !analysis.keywords) {
      return { keywords: [], frequencyData: {} };
    }

    try {
      const keywords =
        typeof analysis.keywords === "string"
          ? JSON.parse(analysis.keywords)
          : analysis.keywords;

      const rawFrequencyData =
        analysis.frequencyData || analysis.frequency_data;
      const frequencyData =
        typeof rawFrequencyData === "string"
          ? JSON.parse(rawFrequencyData || "{}")
          : rawFrequencyData || {};

      return {
        keywords: Array.isArray(keywords) ? keywords : [],
        frequencyData: frequencyData || {},
      };
    } catch (error) {
      console.error("❌ FrequencyChart - Error parsing analysis data:", error);
      return { keywords: [], frequencyData: {} };
    }
  });

  interface DataPoint {
    keyword: string;
    frequency: number;
  }

  $effect(() => {
    if (
      analysis &&
      svg &&
      parsedData().keywords &&
      parsedData().keywords.length > 0
    ) {
      renderChart();
    }
  });

  onMount(() => {
    if (analysis && parsedData().keywords && parsedData().keywords.length > 0) {
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
    const { keywords, frequencyData } = parsedData();

    // Additional safety check
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return;
    }

    // Prepare data for visualization using the new structure
    const data = keywords
      .map((keyword: string) => ({
        keyword,
        frequency: frequencyData.individual?.[keyword] || 0,
      }))
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
          return colorScheme[i % colorScheme.length];
        })
        .attr("class", "transition-opacity duration-200 hover:opacity-70");
      return selection;
    }

    // Helper function with correct typing for text attributes
    function addLabels(selection: d3.Selection<any, any, any, any>) {
      selection
        .append("text")
        .attr("class", "frequency-label")
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
        .style("opacity", 0) // Start hidden
        // Set fill color based on theme
        .attr(
          "fill",
          document.documentElement.classList.contains("dark")
            ? "white"
            : "black"
        );
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

  // --- Download PNG Function ---
  function downloadFrequencyChartPNG() {
    if (!svg) return;

    // 1. Serialize the SVG
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svg);

    // Ensure namespace for proper rendering as image source
    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgString = svgString.replace(
        "<svg",
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );
    }

    // 2. Create an Image object with the SVG data URL
    const img = new Image();
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // 3. Draw SVG onto Canvas
      const canvas = document.createElement("canvas");
      const svgRect = svg.getBoundingClientRect();
      canvas.width = svgRect.width * 2; // Increase resolution
      canvas.height = svgRect.height * 2;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Set a white background for the PNG
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(2, 2); // Scale for resolution
        ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height);

        // 4. Trigger PNG Download
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "frequency_chart.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      URL.revokeObjectURL(url);
    };

    img.onerror = (error) => {
      console.error("Error loading SVG image for frequency chart:", error);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }
  // --- End Download PNG Function ---
</script>

<Card class="p-4">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold">Frequency Distribution</h3>
    <Button
      variant="outline"
      size="sm"
      onclick={downloadFrequencyChartPNG}
      title="Download Frequency Chart as PNG"
    >
      <DownloadIcon class="h-4 w-4 mr-2" />
      Download PNG
    </Button>
  </div>
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
  /* No styles needed here, but the block prevents a build issue. */
</style>

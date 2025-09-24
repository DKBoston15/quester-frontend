<script lang="ts">
  import TwoD from "$lib/components/graph/TwoD.svelte";
  import ThreeD from "$lib/components/graph/ThreeD.svelte";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { nodeIcons, typeMap } from "$lib/components/graph/data";
  import * as Card from "$lib/components/ui/card";
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { api } from "$lib/services/api-client";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap, ZoomIn, ZoomOut } from "lucide-svelte";

  let value = $state("2D");
  let isLoading = $state(true);
  let hasAccess = $state(false);

  interface GraphControls {
    zoomIn: () => void;
    zoomOut: () => void;
  }

  let twoDControls = $state<GraphControls | null>(null);
  let threeDControls = $state<GraphControls | null>(null);

  function handleTwoDRegister(controls: GraphControls | null) {
    twoDControls = controls;
  }

  function handleThreeDRegister(controls: GraphControls | null) {
    threeDControls = controls;
  }

  // Define the type for typeMap keys
  type TypeMapKey = keyof typeof typeMap;

  // Check if user has access to graph visualization features
  async function checkGraphAccessCapability() {
    try {
      const data = await api.get('/capabilities/graph_access');
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to overview
      if (!hasAccess) {
        console.warn(
          "User attempted to access Connections page without permission"
        );
        if (projectStore.currentProject?.id) {
          navigate(`/project/${projectStore.currentProject.id}/overview`);
        } else {
          navigate("/overview");
        }
      }
    } catch (error) {
      console.error("Failed to check graph access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/overview");
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    checkGraphAccessCapability();
  });

  // Define driverObj
  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    steps: [
      {
        element: "#connections-header",
        popover: {
          title: "Visualize Your Research Connections",
          description:
            "This view maps out the relationships between your literature, notes, keywords, and concepts. It helps you discover hidden patterns, identify research gaps, and understand the structure of your project.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#view-toggle",
        popover: {
          title: "Switch Between Dimensions",
          description:
            "Toggle between a 2D network graph and an immersive 3D view to explore your connections from different perspectives.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#legend-button",
        popover: {
          title: "Understand the Symbols",
          description:
            "Click here to open the legend, which explains what each icon (node) in the graph represents (e.g., literature, note, keyword).",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#controls-toggle-button",
        popover: {
          title: "Show/Hide Interaction Hints",
          description:
            "Toggle this to display or hide helpful tips on how to navigate and interact with the graph (zooming, panning, selecting).",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#connections-header",
        popover: {
          title: "Interact with the Graph",
          description:
            "Explore the graph area below! Use your mouse to zoom, pan, and select nodes. In 2D, you can drag nodes; in 3D, rotate the view. Check the controls hints if needed.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#connections-header",
        popover: {
          title: "Navigate to Literature",
          description:
            "Right-click on any literature node (book icons) to open a context menu with quick navigation options. You can instantly jump to the full literature details in a new tab without losing your place in the graph.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#connections-header",
        popover: {
          title: "Filter Connected Nodes",
          description:
            "Use the context menu to filter the graph and show only nodes connected to a specific literature item. This helps you focus on the immediate connections of a particular research piece. Use 'Reset Filter' to return to the full view.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#connections-header",
        popover: {
          title: "Discover Insights",
          description:
            "Use this visualization to see how ideas connect, identify clusters of related work, spot potential research gaps, and gain a deeper understanding of your research landscape.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  });

  function handleZoomIn() {
    if (value === "2D") {
      twoDControls?.zoomIn();
    } else if (value === "3D") {
      threeDControls?.zoomIn();
    }
  }

  function handleZoomOut() {
    if (value === "2D") {
      twoDControls?.zoomOut();
    } else if (value === "3D") {
      threeDControls?.zoomOut();
    }
  }

  function activeControlsReady() {
    return value === "2D" ? !!twoDControls : value === "3D" ? !!threeDControls : false;
  }
</script>

{#if isLoading}
  <div class="flex-1 w-full flex items-center justify-center">
    <div
      class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
    ></div>
  </div>
{:else if hasAccess}
  <div
    id="connections-header"
    class={`overflow-hidden relative h-full flex flex-col ${document.documentElement.classList.contains("dark") ? "bg-[#1A1A1A]" : "bg-white"}`}
  >
    <div class="flex justify-between dark:bg-[#1A1A1A] bg-white p-4">
      <div class="flex items-center space-x-2 z-50">
        <ToggleGroup.Root
          id="view-toggle"
          variant="outline"
          {value}
          type="single"
          class=""
          onValueChange={(val) => {
            if (val) value = val;
          }}
        >
          <ToggleGroup.Item
            value="2D"
            aria-label="Toggle 2D"
            class="w-[6rem] border-2 data-[state=on]:bg-black data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            2D
          </ToggleGroup.Item>
          <ToggleGroup.Item
            value="3D"
            aria-label="Toggle 3D"
            class="w-[6rem] border-2 data-[state=on]:bg-black data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            3D
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
      <div class="flex space-x-2 items-center z-50">
        <Button
          aria-label="Zoom out"
          variant="outline"
          class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          onclick={handleZoomOut}
          disabled={!activeControlsReady()}
        >
          <ZoomOut class="h-4 w-4" />
        </Button>
        <Button
          aria-label="Zoom in"
          variant="outline"
          class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          onclick={handleZoomIn}
          disabled={!activeControlsReady()}
        >
          <ZoomIn class="h-4 w-4" />
        </Button>
        <Popover.Root>
          <Popover.Trigger>
            <Button
              id="legend-button"
              variant="outline"
              class="w-[6rem] border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              >Legend</Button
            >
          </Popover.Trigger>
          <Popover.Content
            class="w-80 max-h-[650px] mt-2 p-0 overflow-hidden bg-transparent overflow-y-none border-none shadow-none"
          >
            <Card.Root>
              <Card.Content>
                <div
                  class="font-semibold border-b p-3 dark:border-neutral-800 sticky top-0"
                >
                  Legend
                </div>
                <div class="p-3 space-y-1.5 overflow-y-none max-h-[520px]">
                  {#each Object.entries(nodeIcons) as [key, value]}
                    {#if key === "literature"}
                      <div
                        class="flex items-center group hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md p-1.5 transition-colors"
                      >
                        <img
                          src={value}
                          alt={"Literature"}
                          class="w-6 h-6 mr-2 flex-shrink-0"
                        />
                        <span class="text-sm truncate">Literature</span>
                      </div>
                    {:else}
                      <div
                        class="flex items-center group hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md p-1.5 transition-colors"
                      >
                        <img
                          src={value}
                          alt={key}
                          class="w-6 h-6 mr-2 flex-shrink-0"
                        />
                        <span class="text-sm truncate"
                          >{typeMap[key as TypeMapKey] || key}</span
                        >
                      </div>
                    {/if}
                  {/each}
                </div>
              </Card.Content>
            </Card.Root>
          </Popover.Content>
        </Popover.Root>
        <Popover.Root>
          <Popover.Trigger>
            <Button
              id="controls-toggle-button"
              variant="outline"
              class="w-[7rem] border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              >Controls</Button
            >
          </Popover.Trigger>
          <Popover.Content
            class="w-80 max-h-[400px] mt-2 p-0 overflow-hidden bg-transparent overflow-y-none border-none shadow-none"
          >
            <Card.Root>
              <Card.Content>
                <div
                  class="font-semibold border-b p-3 dark:border-neutral-800 sticky top-0"
                >
                  Interaction Controls
                </div>
                <div class="p-3 space-y-3">
                  {#if value === "2D"}
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium">2D Graph Controls</h4>
                      <ul class="text-xs space-y-1 text-muted-foreground">
                        <li>
                          <strong>Left Click:</strong> Pan/Select/Drag nodes
                        </li>
                        <li><strong>Scroll Wheel:</strong> Zoom in/out</li>
                        <li>
                          <strong>Left Click + Shift:</strong> Select multiple nodes
                        </li>
                        <li>
                          <strong>Right Click (Literature):</strong> Context menu (navigate, filter)
                        </li>
                      </ul>
                    </div>
                  {:else if value === "3D"}
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium">3D Graph Controls</h4>
                      <ul class="text-xs space-y-1 text-muted-foreground">
                        <li><strong>Left Click:</strong> Rotate view</li>
                        <li><strong>Scroll Wheel:</strong> Zoom in/out</li>
                        <li><strong>Right Click (Empty):</strong> Pan view</li>
                        <li><strong>Right Click (Literature):</strong> Context menu (navigate, filter)</li>
                      </ul>
                    </div>
                  {/if}
                </div>
              </Card.Content>
            </Card.Root>
          </Popover.Content>
        </Popover.Root>
        <Button
          variant="outline"
          onclick={() => driverObj.drive()}
          class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <GraduationCap class="h-4 w-4 mr-2" />
          Tour
        </Button>
      </div>
    </div>
    <div id="graph-container" class="flex-1 relative overflow-hidden">
      {#if value === "3D"}
        <ThreeD registerControls={handleThreeDRegister} />
      {:else if value === "2D"}
        <TwoD registerControls={handleTwoDRegister} />
      {/if}
    </div>
  </div>
{/if}

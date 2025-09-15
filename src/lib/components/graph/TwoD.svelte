<script lang="ts">
  import { onMount } from "svelte";
  import {
    colorCheckboxMap,
    createGraphData,
    nodeIcons,
    nodeTypes,
  } from "./data";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyState from "$lib/components/ui/empty-state/EmptyState.svelte";
  import { groupColorMap } from "./data";
  import * as Card from "$lib/components/ui/card";
  import TypeCheckbox from "./TypeCheckbox.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { projectStore } from "$lib/stores/ProjectStore";

  // Types for graph data
  interface GraphNode {
    id: string;
    val: number;
    group: number;
    icon: string;
    createdAt: string;
    x?: number;
    y?: number;
    fx?: number;
    fy?: number;
    [key: string]: any;
  }

  interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
    value?: number;
    [key: string]: any;
  }

  interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
  }

  interface TypeVisibility {
    [key: string]: boolean;
  }

  // Track which project's graph is currently loaded
  let lastLoadedProjectId: string | null = null;

  let graph: HTMLDivElement;
  let ForceGraph: any;
  let labels = false;
  let showIcons = false;
  let stickNodes = false;
  let Graph: any;
  let isGraphReady = $state(false);
  let selectedNodes = new Set<GraphNode>();
  let selectedNode: GraphNode | null = null;
  let originalGraphData: GraphData;
  let timelapseInterval: NodeJS.Timeout;
  let currentNodeIndex = 0;
  let selectedNodesForRendering = new Set<string>();

  async function loadGraphForProject(projectId: string) {
    isGraphReady = false;
    try {
      const graphData = await createGraphData(projectId);
      originalGraphData = graphData;
      // Initialize with both literature and keyword nodes visible
      const initialNodes = graphData.nodes.filter(
        (node) => node.icon === "keyword" || node.icon === "literature"
      );

      const visibleNodeIds = new Set(initialNodes.map((node) => node.id));

      // Filter links and ensure they reference the correct nodes
      const initialLinks = graphData.links
        .filter(
          (link) =>
            visibleNodeIds.has(typeof link.source === 'string' ? link.source : (link.source as any).id) && 
            visibleNodeIds.has(typeof link.target === 'string' ? link.target : (link.target as any).id)
        )
        .map((link) => {
          // Find the actual node objects from our filtered nodes
          const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
          const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
          const sourceNode = initialNodes.find(
            (node) => node.id === sourceId
          );
          const targetNode = initialNodes.find(
            (node) => node.id === targetId
          );

          return {
            ...link,
            source: sourceNode!,
            target: targetNode!,
          };
        });

      Graph.graphData({
        nodes: initialNodes,
        links: initialLinks,
      });
      isGraphReady = true;

      // Reset local UI state on project change
      selectedNodes.clear();
      selectedNodesForRendering.clear();
      selectedNode = null;
      typeVisibility = nodeTypes.reduce((acc, type) => {
        acc[type] = type === "keyword" || type === "literature";
        return acc;
      }, {} as TypeVisibility);

      lastLoadedProjectId = projectId;
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  }

  onMount(async () => {
    if (typeof window !== "undefined") {
      const module = await import("force-graph");
      ForceGraph = module.default;
      Graph = (ForceGraph as any)()(graph)
        .nodeId("id")
        .nodeVal("val")
        .nodeLabel("id")
        .nodeColor((node: GraphNode) =>
          node === selectedNode ? "pink" : groupColorMap[node.group as keyof typeof groupColorMap]
        )
        .linkColor((link: GraphLink) =>
          link.source === selectedNode || link.target === selectedNode
            ? "#0d52f5"
            : "#757575"
        )
        .linkWidth((link: GraphLink) =>
          link.source === selectedNode || link.target === selectedNode ? 4 : 1
        )
        .linkSource("source")
        .linkTarget("target")
        .linkDirectionalParticleColor(() => "#0d52f5")
        .onNodeClick((node: GraphNode, event: MouseEvent) => {
          handleNodeClick(node, event);
        })
        .onNodeDrag((node: GraphNode, translate: { x: number; y: number }) => {
          if (selectedNodes.has(node)) {
            [...selectedNodes]
              .filter((selNode) => selNode !== node)
              .forEach((dragNode) =>
                ["x", "y"].forEach(
                  (coord) => {
                    const coordKey = coord as 'x' | 'y';
                    const fCoordKey = `f${coord}` as 'fx' | 'fy';
                    dragNode[fCoordKey] = (dragNode[coordKey] || 0) + translate[coordKey];
                  }
                )
              );
          }
        })
        .onNodeDragEnd((node: GraphNode) => {
          if (selectedNodes.has(node)) {
            [...selectedNodes].forEach((selNode) => {
              if (stickNodes) {
                selNode.fx = selNode.x;
                selNode.fy = selNode.y;
              } else {
                selNode.fx = undefined;
                selNode.fy = undefined;
              }
            });
          } else {
            if (stickNodes) {
              node.fx = node.x;
              node.fy = node.y;
            } else {
              node.fx = undefined;
              node.fy = undefined;
            }
          }
        });

      Graph.d3Force("charge").strength(-30);
      Graph.d3Force("link").strength();

      const pid = projectStore.currentProject?.id;
      if (pid) {
        await loadGraphForProject(pid);
      }
    }
  });

  // React to project changes while staying on the Connections view
  $effect(async () => {
    const pid = projectStore.currentProject?.id;
    if (!pid || !Graph) return;
    if (pid === lastLoadedProjectId) return;
    await loadGraphForProject(pid);
  });

  function addParticleEffects(node: GraphNode) {
    // Add directional particles on the links connected to the selected node
    if (Graph) {
      Graph.linkDirectionalParticles((link: GraphLink) => {
        if (link.source === node || link.target === node) {
          return 4; // Number of particles
        }
        return 0;
      });
      Graph.linkDirectionalParticleSpeed(0.005); // Speed of particles
    }
  }

  function handleNodeClick(node: GraphNode, event: MouseEvent) {
    selectedNode = node;
    Graph.nodeColor(Graph.nodeColor() as any);
    Graph.linkColor(Graph.linkColor() as any);
    Graph.linkDirectionalParticles(0);
    addParticleEffects(node);

    if (event) {
      if (event.shiftKey) {
        if (selectedNodes.size === 0) {
          selectedNodes.add(node);
        } else {
          selectedNodes.has(node)
            ? selectedNodes.delete(node)
            : selectedNodes.add(node);
        }
        Graph.nodeColor((node: GraphNode) =>
          selectedNodes.has(node) ? "orange" : groupColorMap[node.group as keyof typeof groupColorMap]
        );
      } else {
        Graph.centerAt(node.x, node.y, 1000);
        Graph.zoom(8, 2000);
      }
    }
  }

  let typeVisibility = $state<TypeVisibility>(
    nodeTypes.reduce((acc, type) => {
      acc[type] = type === "keyword" || type === "literature"; // Show both keyword and literature by default
      return acc;
    }, {} as TypeVisibility)
  );

  function renderIcons() {
    const imgCache = new Map();
    let loadedImages = 0;
    const totalImages = Object.keys(nodeIcons).length;

    if (showIcons) {
      // Preload all images
      Object.entries(nodeIcons).forEach(([icon, path]) => {
        const img = new Image();
        img.onload = () => {
          loadedImages++;
          imgCache.set(icon, img);
          if (loadedImages === totalImages) {
            renderNodesWithIcons();
          }
        };
        img.onerror = () => {
          console.error(`Failed to load icon: ${icon}`);
          loadedImages++;
          if (loadedImages === totalImages) {
            renderNodesWithIcons();
          }
        };
        img.src = path;
      });
    } else {
      Graph.nodeCanvasObject(null).nodePointerAreaPaint(null);
    }

    function renderNodesWithIcons() {
      Graph.nodeCanvasObject((node: GraphNode, ctx: CanvasRenderingContext2D) => {
        const size = 24;
        const img = imgCache.get(node.icon);

        if (img) {
          ctx.drawImage(img, (node.x || 0) - size / 2, (node.y || 0) - size / 2, size, size);
        } else {
          // Fallback if image is not available
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, size / 2, 0, 2 * Math.PI);
          ctx.fillStyle = groupColorMap[node.group as keyof typeof groupColorMap];
          ctx.fill();
        }
      }).nodePointerAreaPaint((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
        const size = 24;
        ctx.fillStyle = color;
        ctx.fillRect((node.x || 0) - size / 2, (node.y || 0) - size / 2, size, size);
      });

      Graph.d3ReheatSimulation();
    }
  }

  function addLabels() {
    if (labels) {
      Graph.nodeCanvasObject((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.id;
        const fontSize = 16 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(
          (n) => n + fontSize * 0.2
        );

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = document.documentElement.classList.contains("dark")
          ? "white"
          : "black";
        ctx.fillText(label, node.x || 0, node.y || 0);

        node.__bckgDimensions = bckgDimensions;
      }).nodePointerAreaPaint((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = color;
        const bckgDimensions = node.__bckgDimensions;
        if (bckgDimensions) {
          ctx.fillRect(
            (node.x || 0) - bckgDimensions[0] / 2,
            (node.y || 0) - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );
        }
      });
    } else {
      Graph.nodeCanvasObject(null).nodePointerAreaPaint(null);
    }
  }

  function toggleTypeVisibility(type: string) {
    typeVisibility[type] = !typeVisibility[type];
    updateGraphData(type);
    Graph.d3ReheatSimulation();
  }

  function updateGraphData(type: string) {
    if (typeVisibility[type]) {
      // Adding nodes of the selected type
      let currentData = Graph.graphData();
      let addedNodes;

      if (selectedNodesForRendering.size > 0) {
        addedNodes = originalGraphData.nodes.filter(
          (node: GraphNode) => node.icon === type && selectedNodesForRendering.has(node.id)
        );
      } else {
        addedNodes = originalGraphData.nodes.filter(
          (node: GraphNode) => node.icon === type
        );
      }

      // Combine current and new nodes
      const updatedNodes = [...currentData.nodes, ...addedNodes] as GraphNode[];
      const visibleNodeIds = new Set(updatedNodes.map((node: GraphNode) => node.id));

      // Get all links where both source and target are in our visible nodes
      const updatedLinks = originalGraphData.links
        .filter(
          (link) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
            return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
          }
        )
        .map((link) => {
          const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
          const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
          const sourceNode = updatedNodes.find(
            (node) => node.id === sourceId
          );
          const targetNode = updatedNodes.find(
            (node) => node.id === targetId
          );
          return {
            ...link,
            source: sourceNode!,
            target: targetNode!,
          };
        });

      Graph.graphData({
        nodes: updatedNodes,
        links: updatedLinks,
      });
    } else {
      // Removing nodes of the selected type
      let currentData = Graph.graphData();
      let filteredNodes;

      if (selectedNodesForRendering.size > 0) {
        filteredNodes = currentData.nodes.filter(
          (node: GraphNode) =>
            node.icon !== type || !selectedNodesForRendering.has(node.id)
        );
      } else {
        filteredNodes = currentData.nodes.filter((node: GraphNode) => node.icon !== type);
      }

      const visibleNodeIds = new Set(filteredNodes.map((node: GraphNode) => node.id));

      // Filter links to only keep those between remaining visible nodes
      const filteredLinks = originalGraphData.links
        .filter(
          (link) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
            return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
          }
        )
        .map((link) => {
          const sourceNode = filteredNodes.find(
            (node: GraphNode) => node.id === (typeof link.source === 'string' ? link.source : (link.source as any).id)
          );
          const targetNode = filteredNodes.find(
            (node: GraphNode) => node.id === (typeof link.target === 'string' ? link.target : (link.target as any).id)
          );
          return {
            ...link,
            source: sourceNode!,
            target: targetNode!,
          };
        });

      Graph.graphData({
        nodes: filteredNodes,
        links: filteredLinks,
      });
    }

    Graph.d3ReheatSimulation();
  }

  function startTimelapse() {
    const filteredNodes = originalGraphData.nodes;
    const sortedNodes =
      selectedNodesForRendering.size > 0
        ? [...selectedNodesForRendering].map((nodeId) =>
            filteredNodes.find((node: GraphNode) => node.id === nodeId)
          ).filter(Boolean)
        : filteredNodes;

    const validSortedNodes = sortedNodes.filter(Boolean) as GraphNode[];
    validSortedNodes.sort((a: GraphNode, b: GraphNode) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });

    clearInterval(timelapseInterval);
    currentNodeIndex = 0;
    Graph.graphData({ nodes: [], links: [] });

    timelapseInterval = setInterval(() => {
      if (currentNodeIndex < validSortedNodes.length) {
        const currentNode = validSortedNodes[currentNodeIndex];
        let graphData = Graph.graphData();
        let { nodes, links } = graphData;

        // Add the new node
        nodes.push(currentNode);

        // Create a set of visible node IDs for efficient lookup
        const visibleNodeIds = new Set(nodes.map((node: GraphNode) => node.id));

        // Find all links that could connect to currently visible nodes
        const newLinks = originalGraphData.links
          .filter(
            (link) => {
              const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
              const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
              return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
            }
          )
          .map((link) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
            return {
              source: nodes.find((node: GraphNode) => node.id === sourceId),
              target: nodes.find((node: GraphNode) => node.id === targetId),
              value: link.value,
            };
          })
          .filter((link) => link.source && link.target); // Ensure both endpoints exist

        Graph.graphData({
          nodes,
          links: newLinks,
        });

        Graph.centerAt(currentNode.x, currentNode.y, 1000);
        currentNodeIndex++;
      } else {
        clearInterval(timelapseInterval);
      }
    }, 400);
  }
</script>

<div class="container relative h-full">
  <!-- Overlay controls always visible (disabled until graph ready) -->
  <div class="absolute inset-x-0 top-0 z-50 pointer-events-none mt-2">
    <div class="flex w-full justify-between">
      <div class="flex items-center space-x-1 ml-4 pointer-events-auto">
          <Popover.Root>
            <Popover.Trigger>
               <Button
                 variant="outline"
                 class="w-[6rem] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={!isGraphReady}
                 >Settings</Button
               >
            </Popover.Trigger>
            <Popover.Content
              class="w-60 max-h-[650px] bg-transparent border-none shadow-none"
            >
              <Card.Root>
                <Card.Content class="flex flex-col space-y-2">
                  <Button
                    onclick={() => {
                      if (!showIcons) {
                        labels = !labels;
                        addLabels();
                        if (labels) {
                          showIcons = false;
                        }
                      }
                    }}
                    disabled={showIcons}
                    class="w-full"
                  >
                    {!labels ? "Labels On" : "Labels Off"}
                  </Button>
                  <Button
                    onclick={() => {
                      if (!labels) {
                        showIcons = !showIcons;
                        renderIcons();
                        if (showIcons) {
                          labels = false;
                        }
                      }
                    }}
                    disabled={labels}
                    class="w-full"
                  >
                    {!showIcons ? "Icons On" : "Icons Off"}
                  </Button>
                  <Button
                    onclick={() => (stickNodes = !stickNodes)}
                    class="w-full"
                  >
                    {!stickNodes ? "Stick Nodes" : "Unstick Nodes"}
                  </Button>
                  <Button onclick={startTimelapse} class="w-full"
                    >Timelapse</Button
                  >
                </Card.Content>
              </Card.Root>
            </Popover.Content>
          </Popover.Root>
          <Popover.Root>
            <Popover.Trigger>
               <Button
                 variant="outline"
                 class="w-[6rem] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={!isGraphReady}
                 >Filter</Button
               >
            </Popover.Trigger>
            <Popover.Content
              class="bg-transparent last:border-none shadow-none"
            >
              <Card.Root>
                <Card.Header>
                  <Card.Title>Filter</Card.Title>
                  <Card.Description>
                    Toggle visibility of different node types
                  </Card.Description>
                </Card.Header>
                <Card.Content
                  class="grid grid-cols-1 gap-4 dark:bg-[#1F2024]"
                >
                  <div class="space-y-4 dark:bg-[#1F2024]">
                    {#each nodeTypes as type}
                      <div class="flex items-center space-x-2 bg-[#1F2024]">
                        <TypeCheckbox
                          type={type as keyof typeof colorCheckboxMap}
                          color={colorCheckboxMap[type as keyof typeof colorCheckboxMap]}
                          bind:checked={typeVisibility[type]}
                          onToggle={toggleTypeVisibility}
                        />
                      </div>
                    {/each}
                  </div>
                </Card.Content>
              </Card.Root>
            </Popover.Content>
          </Popover.Root>
      </div>
    </div>
  </div>
  {#if originalGraphData}
    {#if originalGraphData.nodes.length != 0 && originalGraphData.nodes.length != 0}
      
    {:else}
      <div class="h-[60vh]">
        <EmptyState
          title="No data to display yet!"
          description="Add literature to see your graph start to populate."
          variant="data-empty"
          height="h-full"
        />
      </div>
    {/if}
  {/if}
  <!-- Graph host fills the container -->
  <div bind:this={graph} class="absolute inset-0"></div>
</div>

<style>
  /* Remove global div styles that affect all divs */
  .container {
    background-color: var(--background-color);
  }

  .container {
    width: 100%;
    overflow: hidden;
    /* allow overlay to render; graph handles its own rendering area */
    padding: 0 !important;
    margin: 0 !important;
  }
</style>

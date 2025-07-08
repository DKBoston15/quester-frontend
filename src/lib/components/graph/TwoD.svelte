<script>
  import { onMount } from "svelte";
  import {
    colorCheckboxMap,
    createGraphData,
    nodeIcons,
    nodeTypes,
  } from "./data";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyState from "$lib/components/ui/empty-state/EmptyState.svelte";
  let graph;
  let ForceGraph;
  let labels = false;
  let showIcons = false;
  let stickNodes = false;
  let Graph;
  import { groupColorMap } from "./data";
  import * as Card from "$lib/components/ui/card";
  import TypeCheckbox from "./TypeCheckbox.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";

  const projectId = projectStore.currentProject?.id;

  let selectedNodes = new Set();
  let selectedNode = null;
  let originalGraphData;
  let timelapseInterval;
  let currentNodeIndex = 0;
  let selectedNodesForRendering = new Set();

  onMount(async () => {
    if (typeof window !== "undefined") {
      const module = await import("force-graph");
      ForceGraph = module.default;
      Graph = ForceGraph()(graph)
        .nodeId("id")
        .nodeVal("val")
        .nodeLabel("id")
        .nodeColor((node) =>
          node === selectedNode ? "pink" : groupColorMap[node.group]
        )
        .linkColor((link) =>
          link.source === selectedNode || link.target === selectedNode
            ? "#0d52f5"
            : "#757575"
        )
        .linkWidth((link) =>
          link.source === selectedNode || link.target === selectedNode ? 4 : 1
        )
        .linkSource("source")
        .linkTarget("target")
        .linkDirectionalParticleColor(() => "#0d52f5")
        .onNodeClick((node, event) => {
          handleNodeClick(node, event);
        })
        .onNodeDrag((node, translate) => {
          if (selectedNodes.has(node)) {
            [...selectedNodes]
              .filter((selNode) => selNode !== node)
              .forEach((node) =>
                ["x", "y"].forEach(
                  (coord) =>
                    (node[`f${coord}`] = node[coord] + translate[coord])
                )
              );
          }
        })
        .onNodeDragEnd((node) => {
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

      try {
        Graph.d3Force("charge").strength(-30);
        Graph.d3Force("link").strength();

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
              visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
          )
          .map((link) => {
            // Find the actual node objects from our filtered nodes
            const sourceNode = initialNodes.find(
              (node) => node.id === link.source
            );
            const targetNode = initialNodes.find(
              (node) => node.id === link.target
            );

            return {
              ...link,
              source: sourceNode,
              target: targetNode,
            };
          });

        Graph.graphData({
          nodes: initialNodes,
          links: initialLinks,
        });
      } catch (error) {
        console.error("Error fetching graph data:", error);
      }
    }
  });

  function handleNodeClick(node, event) {
    selectedNode = node;
    Graph.nodeColor(Graph.nodeColor());
    Graph.linkColor(Graph.linkColor());
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
        Graph.nodeColor((node) =>
          selectedNodes.has(node) ? "orange" : groupColorMap[node.group]
        );
      } else {
        Graph.centerAt(node.x, node.y, 1000);
        Graph.zoom(8, 2000);
      }
    }
  }

  let typeVisibility = nodeTypes.reduce((acc, type) => {
    acc[type] = type === "keyword" || type === "literature"; // Show both keyword and literature by default
    return acc;
  }, {});

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
      Graph.nodeCanvasObject((node, ctx) => {
        const size = 24;
        const img = imgCache.get(node.icon);

        if (img) {
          ctx.drawImage(img, node.x - size / 2, node.y - size / 2, size, size);
        } else {
          // Fallback if image is not available
          ctx.beginPath();
          ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI);
          ctx.fillStyle = groupColorMap[node.group];
          ctx.fill();
        }
      }).nodePointerAreaPaint((node, color, ctx) => {
        const size = 24;
        ctx.fillStyle = color;
        ctx.fillRect(node.x - size / 2, node.y - size / 2, size, size);
      });

      Graph.d3ReheatSimulation();
    }
  }

  function addLabels() {
    if (labels) {
      Graph.nodeCanvasObject((node, ctx, globalScale) => {
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
        ctx.fillText(label, node.x, node.y);

        node.__bckgDimensions = bckgDimensions;
      }).nodePointerAreaPaint((node, color, ctx) => {
        ctx.fillStyle = color;
        const bckgDimensions = node.__bckgDimensions;
        bckgDimensions &&
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            ...bckgDimensions
          );
      });
    } else {
      Graph.nodeCanvasObject(null).nodePointerAreaPaint(null);
    }
  }

  function toggleTypeVisibility(type) {
    typeVisibility[type] = !typeVisibility[type];
    typeVisibility = typeVisibility;
    updateGraphData(type);
    Graph.d3ReheatSimulation();
  }

  function updateGraphData(type) {
    if (typeVisibility[type]) {
      // Adding nodes of the selected type
      let currentData = Graph.graphData();
      let addedNodes;

      if (selectedNodesForRendering.size > 0) {
        addedNodes = originalGraphData.nodes.filter(
          (node) => node.icon === type && selectedNodesForRendering.has(node.id)
        );
      } else {
        addedNodes = originalGraphData.nodes.filter(
          (node) => node.icon === type
        );
      }

      // Combine current and new nodes
      const updatedNodes = [...currentData.nodes, ...addedNodes];
      const visibleNodeIds = new Set(updatedNodes.map((node) => node.id));

      // Get all links where both source and target are in our visible nodes
      const updatedLinks = originalGraphData.links
        .filter(
          (link) =>
            visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
        )
        .map((link) => {
          const sourceNode = updatedNodes.find(
            (node) => node.id === link.source
          );
          const targetNode = updatedNodes.find(
            (node) => node.id === link.target
          );
          return {
            ...link,
            source: sourceNode,
            target: targetNode,
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
          (node) =>
            node.icon !== type || !selectedNodesForRendering.has(node.id)
        );
      } else {
        filteredNodes = currentData.nodes.filter((node) => node.icon !== type);
      }

      const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));

      // Filter links to only keep those between remaining visible nodes
      const filteredLinks = originalGraphData.links
        .filter(
          (link) =>
            visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
        )
        .map((link) => {
          const sourceNode = filteredNodes.find(
            (node) => node.id === link.source
          );
          const targetNode = filteredNodes.find(
            (node) => node.id === link.target
          );
          return {
            ...link,
            source: sourceNode,
            target: targetNode,
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
            filteredNodes.find((node) => node.id === nodeId)
          )
        : filteredNodes;

    sortedNodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    clearInterval(timelapseInterval);
    currentNodeIndex = 0;
    Graph.graphData({ nodes: [], links: [] });

    timelapseInterval = setInterval(() => {
      if (currentNodeIndex < sortedNodes.length) {
        const currentNode = sortedNodes[currentNodeIndex];
        let graphData = Graph.graphData();
        let { nodes, links } = graphData;

        // Add the new node
        nodes.push(currentNode);

        // Create a set of visible node IDs for efficient lookup
        const visibleNodeIds = new Set(nodes.map((node) => node.id));

        // Find all links that could connect to currently visible nodes
        const newLinks = originalGraphData.links
          .filter(
            (link) =>
              visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
          )
          .map((link) => ({
            source: nodes.find((node) => node.id === link.source),
            target: nodes.find((node) => node.id === link.target),
            value: link.value,
          }))
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

<div class="container">
  {#if originalGraphData}
    {#if originalGraphData.nodes.length != 0 && originalGraphData.nodes.length != 0}
      <div class="absolute z-40">
        <div class="flex w-full justify-between">
          <div class="flex items-center space-x-1 ml-4">
            <Popover.Root portal={null}>
              <Popover.Trigger>
                <Button
                  variant="outline"
                  class="w-[6rem] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
            <Popover.Root portal={null}>
              <Popover.Trigger>
                <Button
                  variant="outline"
                  class="w-[6rem] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                            {type}
                            color={colorCheckboxMap[type]}
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
</div>
<div bind:this={graph}></div>

<style>
  div {
    width: 100%;
    background-color: var(--background-color);
  }

  .container {
    width: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
    padding: 0 !important;
    margin: 0 !important;
  }
</style>

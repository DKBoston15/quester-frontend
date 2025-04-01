<script>
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import SpriteText from "three-spritetext";
  import TypeCheckbox from "./TypeCheckbox.svelte";
  import {
    colorCheckboxMap,
    createGraphData,
    groupColorMap,
    nodeIcons,
    nodeTypes,
  } from "./data";
  import * as Popover from "$lib/components/ui/popover";
  import * as Card from "$lib/components/ui/card";
  import * as THREE from "three";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { isDarkMode } from "$lib/utils/mode-watcher";

  const projectId = projectStore.currentProject?.id;

  let showIcons = false;
  let elem;
  let Graph;
  let selectedNodes = new Set();
  let selectedNode = null;
  let stickNodes = false;
  let labels = false;
  let originalGraphData;
  let timelapseInterval;
  let currentNodeIndex = 0;
  let selectedNodesForRendering = new Set();

  onMount(async () => {
    const ForceGraph3D = (await import("3d-force-graph")).default;
    const graphData = await createGraphData(projectId);
    originalGraphData = graphData;

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
        const sourceNode = initialNodes.find((node) => node.id === link.source);
        const targetNode = initialNodes.find((node) => node.id === link.target);

        return {
          ...link,
          source: sourceNode,
          target: targetNode,
        };
      });

    Graph = ForceGraph3D()(elem)
      .graphData({
        nodes: initialNodes,
        links: initialLinks,
      })
      .nodeId("id")
      .nodeVal("val")
      .nodeLabel("id")
      .backgroundColor(
        document.documentElement.classList.contains("dark") ? "#1A1A1A" : "#fff"
      )
      .nodeColor((node) =>
        node === selectedNode ? "purple" : groupColorMap[node.group]
      )
      .linkColor((link) =>
        link.source === selectedNode || link.target === selectedNode
          ? "#0d52f5"
          : document.documentElement.classList.contains("dark")
            ? "#757575"
            : "#000"
      )
      .linkOpacity(0.6)
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
              ["x", "y", "z"].forEach(
                (coord) => (node[`f${coord}`] = node[coord] + translate[coord])
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
              selNode.fz = selNode.z;
            } else {
              selNode.fx = undefined;
              selNode.fy = undefined;
              selNode.fz = undefined;
            }
          });
        } else {
          if (stickNodes) {
            node.fx = node.x;
            node.fy = node.y;
            node.fz = node.z;
          } else {
            node.fx = undefined;
            node.fy = undefined;
            node.fz = undefined;
          }
        }
      });
  });

  function handleNodeClick(node, event) {
    selectedNode = node;
    Graph.nodeColor(Graph.nodeColor());
    Graph.linkColor(Graph.linkColor());
    Graph.linkDirectionalParticles(0);

    if (event.shiftKey) {
      if (selectedNodes.size === 0) {
        selectedNodes.add(node);
      } else {
        selectedNodes.has(node)
          ? selectedNodes.delete(node)
          : selectedNodes.add(node);
      }
      Graph.nodeColor(Graph.nodeColor());
    } else {
      const distance = 100; // Adjust this value to control the zoom level
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      Graph.cameraPosition(
        {
          x: node.x * distRatio,
          y: node.y * distRatio,
          z: node.z * distRatio,
        },
        node,
        1000
      );
    }
  }

  function addLabels() {
    if (labels) {
      Graph.nodeThreeObject((node) => {
        const sprite = new SpriteText(node.id);
        sprite.material.depthWrite = false;
        sprite.color = groupColorMap[node.group];
        sprite.textHeight = 8;
        return sprite;
      });
    } else {
      Graph.nodeThreeObject(null);
    }
  }

  let typeVisibility = nodeTypes.reduce((acc, type) => {
    acc[type] = type === "keyword" || type === "literature"; // Show both keyword and literature by default
    return acc;
  }, {});

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

  function renderIcons() {
    const imgCache = new Map();

    Graph.nodeThreeObject((node) => {
      const size = 12;
      const iconPath = nodeIcons[node.icon];

      if (!imgCache.has(iconPath)) {
        const img = new THREE.TextureLoader().load(iconPath);
        imgCache.set(iconPath, img);
      }

      const imgTexture = imgCache.get(iconPath);
      const material = new THREE.SpriteMaterial({ map: imgTexture });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(size, size, size);

      return showIcons ? sprite : null;
    });
  }

  function unstickAllNodes() {
    Graph.graphData().nodes.forEach((node) => {
      node.fx = undefined;
      node.fy = undefined;
      node.fz = undefined;
    });
    Graph.d3ReheatSimulation();
  }

  function startTimelapse() {
    const filteredNodes = originalGraphData.nodes;
    const sortedNodes =
      selectedNodesForRendering.size > 0
        ? [...selectedNodesForRendering]
            .map((nodeId) => filteredNodes.find((node) => node.id === nodeId))
            .filter(Boolean)
        : filteredNodes;

    // Sort nodes by creation date
    sortedNodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    clearInterval(timelapseInterval);
    currentNodeIndex = 0;
    Graph.graphData({ nodes: [], links: [] });

    // Set initial camera position
    const { minX, maxX, minY, maxY, minZ, maxZ } = sortedNodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x || 0),
        maxX: Math.max(acc.maxX, node.x || 0),
        minY: Math.min(acc.minY, node.y || 0),
        maxY: Math.max(acc.maxY, node.y || 0),
        minZ: Math.min(acc.minZ, node.z || 0),
        maxZ: Math.max(acc.maxZ, node.z || 0),
      }),
      {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity,
      }
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    Graph.cameraPosition(
      { x: centerX, y: centerY, z: centerZ + range * 1.5 },
      { x: centerX, y: centerY, z: centerZ },
      0
    );

    const displayedNodes = [];

    timelapseInterval = setInterval(() => {
      if (currentNodeIndex < sortedNodes.length) {
        const currentNode = sortedNodes[currentNodeIndex];

        // Add the new node to our displayed nodes array
        displayedNodes.push(currentNode);

        // Find all relevant links for the currently displayed nodes
        const relevantLinks = originalGraphData.links
          .filter((link) => {
            const sourceId =
              typeof link.source === "object" ? link.source.id : link.source;
            const targetId =
              typeof link.target === "object" ? link.target.id : link.target;

            // Check if both source and target nodes are in our displayed nodes
            return (
              displayedNodes.some((n) => n.id === sourceId) &&
              displayedNodes.some((n) => n.id === targetId)
            );
          })
          .map((link) => ({
            source: displayedNodes.find(
              (n) =>
                n.id ===
                (typeof link.source === "object" ? link.source.id : link.source)
            ),
            target: displayedNodes.find(
              (n) =>
                n.id ===
                (typeof link.target === "object" ? link.target.id : link.target)
            ),
            value: link.value,
          }));

        // Update the graph with current nodes and links
        Graph.graphData({
          nodes: displayedNodes,
          links: relevantLinks,
        });

        currentNodeIndex++;
      } else {
        clearInterval(timelapseInterval);
      }
    }, 500);
  }

  $: {
    if (selectedNodesForRendering.size > 0) {
      updateGraphDataWithFilter();
    }
  }

  $: {
    if (Graph) {
      Graph.backgroundColor($isDarkMode ? "#1A1A1A" : "#fff").linkColor(
        (link) =>
          link.source === selectedNode || link.target === selectedNode
            ? "#0d52f5"
            : $isDarkMode
              ? "#757575"
              : "#000"
      );
    }
  }

  function updateGraphDataWithFilter() {
    let filteredNodes;

    if (selectedNodesForRendering.size > 0) {
      filteredNodes = filteredNodes.filter((node) =>
        selectedNodesForRendering.has(node.id)
      );
    }

    const filteredLinks = originalGraphData.links.filter(
      (link) =>
        filteredNodes.some((node) => node.id === link.source.id) &&
        filteredNodes.some((node) => node.id === link.target.id)
    );

    Graph.graphData({
      nodes: filteredNodes,
      links: filteredLinks,
    });
    Graph.d3ReheatSimulation();
  }
</script>

<div class="container">
  {#if originalGraphData}
    {#if originalGraphData.nodes.length != 0 && originalGraphData.nodes.length != 0}
      <div class="absolute z-40 w-full">
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
                    >
                      {!showIcons ? "Show Icons" : "Hide Icons"}
                    </Button>
                    <Button
                      onclick={() => {
                        stickNodes = !stickNodes;
                        if (!stickNodes) {
                          unstickAllNodes();
                        }
                      }}
                    >
                      {!stickNodes ? "Stick Nodes" : "Unstick Nodes"}
                    </Button>
                    <Button onclick={startTimelapse}>Start Timelapse</Button>
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
                  <Card.Content class="grid grid-cols-1 gap-4">
                    <div class="space-y-4 dark:bg-[#1F2024]">
                      {#each nodeTypes as type}
                        <div
                          class="flex items-center space-x-2 dark:bg-red-400"
                        >
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
      <div
        class="flex flex-col items-center justify-center h-[60vh] text-center"
      >
        <h3 class="text-2xl font-semibold mb-4">No data to display yet!</h3>
        <p class="text-lg text-muted-foreground">
          Add literature to see your graph start to populate.
        </p>
      </div>
    {/if}
  {/if}
</div>
<div bind:this={elem} id="3d-graph"></div>

<style>
  div {
    width: 100%;
    background-color: var(--background-color);
  }

  .container {
    width: 100%;
    overflow-x: hidden;
    padding: 0 !important;
    margin: 0 !important;
  }
</style>

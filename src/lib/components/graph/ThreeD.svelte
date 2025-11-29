<script lang="ts">
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
  import { projectStore } from "$lib/stores/ProjectStore";
  import { isDarkMode } from "$lib/utils/mode-watcher";
  import type { ForceGraph3DInstance } from "3d-force-graph";
  import { _ } from "svelte-i18n";

  // Types for graph data
  interface GraphNode {
    id: string;
    val: number;
    group: number;
    icon: string;
    createdAt: string;
    x?: number;
    y?: number;
    z?: number;
    fx?: number;
    fy?: number;
    fz?: number;
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

  let showIcons = false;
  let elem: HTMLDivElement;
  let Graph: ForceGraph3DInstance<GraphNode, GraphLink>;
  let isGraphReady = $state(false);
  let selectedNodes = new Set<GraphNode>();
  let selectedNode: GraphNode | null = null;
  let stickNodes = false;
  let labels = false;
  let originalGraphData: GraphData;
  let timelapseInterval: NodeJS.Timeout;
  let currentNodeIndex = 0;
  let selectedNodesForRendering = new Set<string>();

  async function loadGraphForProject(projectId: string) {
    isGraphReady = false;
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
          visibleNodeIds.has(typeof link.source === 'string' ? link.source : (link.source as any).id) && 
          visibleNodeIds.has(typeof link.target === 'string' ? link.target : (link.target as any).id)
      )
      .map((link) => {
        // Find the actual node objects from our filtered nodes
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
        const sourceNode = initialNodes.find((node) => node.id === sourceId);
        const targetNode = initialNodes.find((node) => node.id === targetId);

        return {
          ...link,
          source: sourceNode!,
          target: targetNode!,
        };
      });

    if (!Graph) {
      const ForceGraph3D = (await import("3d-force-graph")).default;
      Graph = (ForceGraph3D as any)()(elem)
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
        .nodeColor((node: GraphNode) =>
          node === selectedNode ? "purple" : groupColorMap[node.group as keyof typeof groupColorMap]
        )
        .linkColor((link: GraphLink) =>
          link.source === selectedNode || link.target === selectedNode
            ? "#0d52f5"
            : document.documentElement.classList.contains("dark")
              ? "#757575"
              : "#000"
        )
        .linkOpacity(0.6)
        .linkWidth((link: GraphLink) =>
          link.source === selectedNode || link.target === selectedNode ? 4 : 1
        )
        .linkSource("source")
        .linkTarget("target")
        .linkDirectionalParticleColor(() => "#0d52f5")
        .onNodeClick((node: GraphNode, event: MouseEvent) => {
          handleNodeClick(node, event);
        })
        .onNodeDrag((node: GraphNode, translate: { x: number; y: number; z: number }) => {
          if (selectedNodes.has(node)) {
            [...selectedNodes]
              .filter((selNode) => selNode !== node)
              .forEach((dragNode) =>
                ["x", "y", "z"].forEach(
                  (coord) => {
                    const coordKey = coord as 'x' | 'y' | 'z';
                    const fCoordKey = `f${coord}` as 'fx' | 'fy' | 'fz';
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
    } else {
      // Update existing graph data
      Graph.graphData({
        nodes: initialNodes,
        links: initialLinks,
      });
    }

    // Reset local state on project change
    selectedNodes.clear();
    selectedNodesForRendering.clear();
    selectedNode = null;
    typeVisibility = nodeTypes.reduce((acc, type) => {
      acc[type] = type === "keyword" || type === "literature";
      return acc;
    }, {} as TypeVisibility);

    lastLoadedProjectId = projectId;
    isGraphReady = true;
  }

  onMount(async () => {
    // Initialize graph on mount for current project
    const pid = projectStore.currentProject?.id;
    if (pid) {
      await loadGraphForProject(pid);
    }
  });

  // React to project changes while staying on the Connections view
  $effect(async () => {
    const pid = projectStore.currentProject?.id;
    if (!pid) return;
    if (pid === lastLoadedProjectId) return;
    await loadGraphForProject(pid);
  });
  

  function handleNodeClick(node: GraphNode, event: MouseEvent) {
    selectedNode = node;
    Graph.nodeColor(Graph.nodeColor() as any);
    Graph.linkColor(Graph.linkColor() as any);
    Graph.linkDirectionalParticles(0);

    if (event.shiftKey) {
      if (selectedNodes.size === 0) {
        selectedNodes.add(node);
      } else {
        selectedNodes.has(node)
          ? selectedNodes.delete(node)
          : selectedNodes.add(node);
      }
      Graph.nodeColor(Graph.nodeColor() as any);
    } else {
      const distance = 100; // Adjust this value to control the zoom level
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);

      Graph.cameraPosition(
        {
          x: (node.x || 0) * distRatio,
          y: (node.y || 0) * distRatio,
          z: (node.z || 0) * distRatio,
        },
        { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
        1000
      );
    }
  }

  function addLabels() {
    if (labels) {
      Graph.nodeThreeObject((node: GraphNode) => {
        const sprite = new SpriteText(node.id);
        sprite.material.depthWrite = false;
        sprite.color = groupColorMap[node.group as keyof typeof groupColorMap];
        sprite.textHeight = 8;
        return sprite;
      });
    } else {
      Graph.nodeThreeObject(null as any);
    }
  }

  let typeVisibility = $state<TypeVisibility>(
    nodeTypes.reduce((acc, type) => {
      acc[type] = type === "keyword" || type === "literature"; // Show both keyword and literature by default
      return acc;
    }, {} as TypeVisibility)
  );

  function toggleTypeVisibility(type: string) {
    typeVisibility[type] = !typeVisibility[type];
    typeVisibility = typeVisibility;
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
          (link) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
          }
        )
        .map((link) => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
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
          (link) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
          }
        )
        .map((link) => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          const sourceNode = filteredNodes.find(
            (node) => node.id === sourceId
          );
          const targetNode = filteredNodes.find(
            (node) => node.id === targetId
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

  function renderIcons() {
    const imgCache = new Map();

    if (showIcons) {
      Graph.nodeThreeObject((node: GraphNode) => {
      const size = 12;
      const iconPath = nodeIcons[node.icon as keyof typeof nodeIcons];

      if (!imgCache.has(iconPath)) {
        const img = new THREE.TextureLoader().load(iconPath);
        imgCache.set(iconPath, img);
      }

      const imgTexture = imgCache.get(iconPath)!;
      const material = new THREE.SpriteMaterial({ map: imgTexture });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(size, size, size);

        return sprite;
      });
    } else {
      Graph.nodeThreeObject(null as any);
    }
  }

  function unstickAllNodes() {
    Graph.graphData().nodes.forEach((node: GraphNode) => {
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
    const validSortedNodes = sortedNodes.filter(Boolean) as GraphNode[];
    validSortedNodes.sort((a: GraphNode, b: GraphNode) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    clearInterval(timelapseInterval);
    currentNodeIndex = 0;
    Graph.graphData({ nodes: [], links: [] });

    // Set initial camera position
    const { minX, maxX, minY, maxY, minZ, maxZ } = validSortedNodes.reduce(
      (acc: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }, node: GraphNode) => ({
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

    const displayedNodes: GraphNode[] = [];

    timelapseInterval = setInterval(() => {
      if (currentNodeIndex < validSortedNodes.length) {
        const currentNode = validSortedNodes[currentNodeIndex];

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
            )!,
            target: displayedNodes.find(
              (n) =>
                n.id ===
                (typeof link.target === "object" ? link.target.id : link.target)
            )!,
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

  $effect(() => {
    if (selectedNodesForRendering.size > 0) {
      updateGraphDataWithFilter();
    }
  });

  $effect(() => {
    if (Graph) {
      Graph.backgroundColor($isDarkMode ? "#1A1A1A" : "#fff").linkColor(
        (link: GraphLink) =>
          link.source === selectedNode || link.target === selectedNode
            ? "#0d52f5"
            : $isDarkMode
              ? "#757575"
              : "#000"
      );
    }
  });

  function updateGraphDataWithFilter() {
    let filteredNodes: GraphNode[] | undefined;

    if (selectedNodesForRendering.size > 0 && filteredNodes) {
      filteredNodes = filteredNodes.filter((node) =>
        selectedNodesForRendering.has(node.id)
      );
    }

    if (!filteredNodes) return;

    const filteredLinks = originalGraphData.links.filter(
      (link) => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
        return filteredNodes!.some((node) => node.id === sourceId) &&
               filteredNodes!.some((node) => node.id === targetId);
      }
    );

    Graph.graphData({
      nodes: filteredNodes,
      links: filteredLinks,
    });
    Graph.d3ReheatSimulation();
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
              >{$_('common.settings')}</Button
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
                  {!labels ? $_('graph.labelsOn') : $_('graph.labelsOff')}
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
                  {!showIcons ? $_('graph.showIcons') : $_('graph.hideIcons')}
                </Button>
                <Button
                  onclick={() => {
                    stickNodes = !stickNodes;
                    if (!stickNodes) {
                      unstickAllNodes();
                    }
                  }}
                >
                  {!stickNodes ? $_('graph.stickNodes') : $_('graph.unstickNodes')}
                </Button>
                <Button onclick={startTimelapse}>{$_('threeD.startTimelapse')}</Button>
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
              >{$_('graph.filter')}</Button
            >
          </Popover.Trigger>
          <Popover.Content
            class="bg-transparent last:border-none shadow-none"
          >
            <Card.Root>
              <Card.Header>
                <Card.Title>{$_('graph.filterTitle')}</Card.Title>
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
    {#if originalGraphData.nodes.length == 0}
      <div class="flex flex-col items-center justify-center h-[60vh] text-center">
        <h3 class="text-2xl font-semibold mb-4">{$_('emptyStates.noData')}</h3>
        <p class="text-lg text-muted-foreground">
          Add literature to see your graph start to populate.
        </p>
      </div>
    {/if}
  {/if}
  <!-- Graph host fills the container -->
  <div bind:this={elem} id="3d-graph" class="absolute inset-0"></div>
</div>

<style>
  /* Remove global div styles that affect all divs */
  .container {
    background-color: var(--background-color);
  }

  .container {
    width: 100%;
    overflow: hidden;
    padding: 0 !important;
    margin: 0 !important;
  }
</style>

<!-- src/routes/project/ModelView.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { modelStore } from "$lib/stores/ModelStore.svelte";
  import Model from "$lib/components/model/Model.svelte";
  import { API_BASE_URL } from "$lib/config";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";

  const props = $props<{
    modelId: string;
    projectId: string;
  }>();

  let isLoadingCapability = $state(true);
  let hasAccess = $state(false);
  let modelComponentRef = $state<any>(null);
  
  $effect(() => {
    console.log('ModelView: modelComponentRef changed:', modelComponentRef);
  });

  // Check if user has access to model features
  async function checkModelAccessCapability() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/capabilities/model_access`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to check model access capability");
      }

      const data = await response.json();
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to overview
      if (!hasAccess) {
        console.warn("User attempted to access Model view without permission");
        if (props.projectId) {
          navigate(`/project/${props.projectId}/overview`);
        } else {
          navigate("/overview");
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check model access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/overview");
      return false;
    } finally {
      isLoadingCapability = false;
    }
  }

  onMount(async () => {
    const hasModelAccess = await checkModelAccessCapability();
    if (hasModelAccess) {
      await modelStore.loadModel(props.modelId);
    }
  });

  // Enhanced interactive tutorial with auto-demos
  const driverObj = driver({
    showProgress: true,
    popoverClass: "quester-driver-theme",
    onHighlightStarted: (element, step, options) => {
      console.log('Global onHighlightStarted:', step);
      
      // Check if this is the toolbar step
      if (step.element === '#flow-toolbar') {
        console.log('Tutorial: Toolbar step detected in global handler');
        
        setTimeout(() => {
          console.log('Tutorial: Creating node via global handler');
          const tutorialMethods = (window as any).tutorialMethods;
          
          if (tutorialMethods && typeof tutorialMethods.addTutorialNode === 'function') {
            const nodeId = tutorialMethods.addTutorialNode('ResizableNode');
            if (nodeId) {
              (window as any).tutorialNodeId = nodeId;
              console.log('Tutorial: Created node with ID:', nodeId);
            }
          }
        }, 1000);
      }
    },
    steps: [
      {
        element: "#model-view-loading-container",
        popover: {
          title: "Loading Your Model",
          description:
            "Quester is now checking your access permissions and loading the selected model data. This usually only takes a moment.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#model-view-container",
        popover: {
          title: "Welcome to Model Builder!",
          description:
            "Let's take an interactive tour! I'll demonstrate how to build models by automatically adding nodes and connecting them. Watch as we explore each feature!",
          side: "top",
          align: "center",
        },
        onHighlightStarted: (_element, _step, _options) => {
          // Only show this step if the model has actually loaded
          if (
            isLoadingCapability ||
            !hasAccess ||
            modelStore.isLoading ||
            modelStore.error ||
            !modelStore.currentModel
          ) {
            console.log('Tutorial: Skipping model view step - model not ready');
            driverObj.moveNext(); // Skip if model isn't loaded
          } else {
            console.log('Tutorial: Model is ready, proceeding with tour');
          }
        },
      },
      {
        element: "#flow-toolbar",
        popover: {
          title: "Model Building Toolbar",
          description:
            "This toolbar lets you add different types of nodes to build your model. Watch as I create a node for you!",
          side: "right",
          align: "start",
        },
        onHighlightStarted: () => {
          console.log('Tutorial: Toolbar step highlight started');
          
          // Create node after a delay to show the toolbar first
          setTimeout(() => {
            console.log('Tutorial: Creating node now');
            console.log('Tutorial: Global tutorial methods:', (window as any).tutorialMethods);
            
            const tutorialMethods = (window as any).tutorialMethods;
            
            if (tutorialMethods && typeof tutorialMethods.addTutorialNode === 'function') {
              console.log('Tutorial: Calling global addTutorialNode');
              const nodeId = tutorialMethods.addTutorialNode('ResizableNode');
              
              if (nodeId) {
                (window as any).tutorialNodeId = nodeId;
                console.log('Tutorial: Created node with ID:', nodeId);
              }
            } else {
              console.error('Tutorial: Global tutorial methods not available');
            }
          }, 1000);
        }
      },
      {
        element: () => {
          // Use the node ID we stored from the previous step
          const nodeId = (window as any).tutorialNodeId;
          return nodeId ? `[data-id="${nodeId}"]` : ".svelte-flow__node";
        },
        popover: {
          title: "Your First Node!",
          description:
            "Here's the node I created for you! You can drag it around, resize it using the handles, and double-click to edit its content. Click on it to see the editing options!",
          side: "top",
          align: "center",
        },
        onHighlightStarted: async (_element, _step, _options) => {
          console.log('Tutorial: Node step highlighted');
          // Select the node to show the NodeToolbar
          setTimeout(() => {
            const nodeId = (window as any).tutorialNodeId;
            const tutorialMethods = (window as any).tutorialMethods;
            
            console.log('Tutorial: Attempting to select node:', nodeId);
            
            if (nodeId && tutorialMethods && typeof tutorialMethods.selectNode === 'function') {
              console.log('Tutorial: Selecting node:', nodeId);
              tutorialMethods.selectNode(nodeId);
            } else {
              console.warn('Tutorial: Unable to select node - missing nodeId or tutorial methods');
            }
          }, 500);
        },
      },
      {
        element: "[data-node-toolbar]",
        popover: {
          title: "Node Editing Menu",
          description:
            "Perfect! When you select a node, this menu appears. Here you can customize the node's appearance - change colors, borders, text styling, and add effects. Try clicking the different tabs!",
          side: "bottom",
          align: "center",
        },
        onHighlightStarted: (_element, _step, options) => {
          // Check if toolbar is visible
          const toolbar = document.querySelector('[data-node-toolbar]');
          if (!toolbar || getComputedStyle(toolbar).display === "none") {
            // If not visible, skip this step
            options.driver.moveNext();
          }
        },
      },
      {
        element: "#flow-toolbar",
        popover: {
          title: "Adding More Nodes",
          description:
            "Let me add another node so we can connect them with arrows!",
          side: "right",
          align: "start",
        },
        onHighlightStarted: async (_element, _step, _options) => {
          // Clear selection first
          const pane = document.querySelector('.svelte-flow__pane');
          if (pane) {
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
            });
            pane.dispatchEvent(clickEvent);
          }
          
          // Create a second node
          setTimeout(() => {
            const tutorialMethods = (window as any).tutorialMethods;
            if (tutorialMethods && typeof tutorialMethods.addTutorialNode === 'function') {
              console.log('Tutorial: Creating second node (CircleNode)');
              tutorialMethods.addTutorialNode('CircleNode');
            }
          }, 500);
        },
      },
      {
        element: ".svelte-flow",
        popover: {
          title: "Connecting Nodes with Arrows",
          description:
            "Perfect! Now I'll demonstrate how to connect nodes. Watch as I automatically create a connection between these two nodes. In practice, you'd drag from one node's handle to another.",
          side: "top",
          align: "center",
        },
        onHighlightStarted: async (_element, _step, _options) => {
          // Auto-connect the nodes after a delay
          setTimeout(() => {
            // Get the most recent nodes and create a connection between them
            const modelViewEvent = new CustomEvent('autoConnectNodes', {
              detail: { action: 'connect-latest-nodes' }
            });
            document.dispatchEvent(modelViewEvent);
          }, 1000);
        },
      },
      {
        element: ".svelte-flow__edge",
        popover: {
          title: "Arrows Show Relationships",
          description:
            "Excellent! This arrow shows the relationship between your concepts. Click on any arrow to customize its appearance - change colors, add arrowheads, or make it animated!",
          side: "bottom",
          align: "center",
        },
        onHighlightStarted: (_element, _step, _options) => {
          // Auto-select the edge after a delay to show the customization panel
          setTimeout(() => {
            const edge = document.querySelector('.svelte-flow__edge');
            if (edge) {
              // Simulate edge click
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
              });
              edge.dispatchEvent(clickEvent);
              
              // Add highlight effect
              (edge as HTMLElement).style.filter = "drop-shadow(0 0 8px rgba(79, 70, 229, 0.8))";
              setTimeout(() => {
                (edge as HTMLElement).style.filter = "";
              }, 2000);
            }
          }, 500);
        },
      },
      {
        element: "#edge-customization-panel",
        popover: {
          title: "Customize Your Arrows",
          description:
            "This panel appeared when I selected the arrow! Here you can change the arrow's style, color, thickness, add arrowheads, and even make it animated to show dynamic relationships.",
          side: "left",
          align: "start",
        },
        onHighlightStarted: (_element, _step, options) => {
          const panel = document.getElementById("edge-customization-panel");
          if (!panel || getComputedStyle(panel).display === "none") {
            options.driver.moveNext();
          }
        },
      },
      {
        element: ".svelte-flow__controls",
        popover: {
          title: "Navigation Controls",
          description:
            "Use these controls to zoom in/out, fit your entire model to the view, and lock/unlock canvas panning. Very handy for large, complex models!",
          side: "top",
          align: "end",
        },
      },
      {
        element: ".svelte-flow__minimap",
        popover: {
          title: "Minimap for Large Models",
          description:
            "This minimap shows an overview of your entire model. Click and drag within it to quickly navigate large canvases. It's especially useful for complex research models!",
          side: "left",
          align: "end",
        },
      },
      {
        element: "#flow-toolbar",
        popover: {
          title: "Building Your Research Model",
          description:
            "Now you know the basics! Add rectangle nodes for concepts, circle nodes for variables, connect them with arrows to show relationships. Use the grid and snap settings to keep things organized. You're ready to build your research model!",
          side: "right",
          align: "center",
        },
        onDeselected: () => {
          // Clear any edge selection when tour ends
          setTimeout(() => {
            const pane = document.querySelector('.svelte-flow__pane');
            if (pane) {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
              });
              pane.dispatchEvent(clickEvent);
            }
          }, 500);
        },
      },
    ],
  });
</script>

<div class="h-full relative" id="model-view-outer-container">
  <div class="absolute top-2 right-2 z-50">
    <Button
      variant="outline"
      size="icon"
      onclick={() => {
        console.log('Tutorial button clicked, starting tour...');
        driverObj.drive();
        
        // Create the tutorial nodes and edge after a delay
        setTimeout(() => {
          console.log('Tutorial: Creating demonstration nodes...');
          const tutorialMethods = (window as any).tutorialMethods;
          
          if (tutorialMethods) {
            // Create first node (rectangle) at left position
            const nodeId1 = tutorialMethods.addTutorialNodeAt('ResizableNode', 250, 200, 'Concept A');
            
            // Create second node (circle) at right position
            setTimeout(() => {
              const nodeId2 = tutorialMethods.addTutorialNodeAt('CircleNode', 450, 200, 'Concept B');
              
              if (nodeId1 && nodeId2) {
                (window as any).tutorialNodeId = nodeId1;
                (window as any).tutorialNodeId2 = nodeId2;
                console.log('Tutorial: Created demo nodes:', nodeId1, nodeId2);
                
                // Create edge between the nodes
                setTimeout(() => {
                  if (tutorialMethods.addTutorialEdge) {
                    const edgeId = tutorialMethods.addTutorialEdge(nodeId1, nodeId2);
                    console.log('Tutorial: Created edge between nodes:', edgeId);
                  }
                }, 500);
              }
            }, 500);
          }
        }, 3000); // 3 second delay to let tutorial get to the right step
      }}
      class="border-2 dark:border-dark-border"
    >
      <GraduationCap class="h-4 w-4" />
      <span class="sr-only">Interactive Model Building Tutorial</span>
    </Button>
  </div>
  {#if isLoadingCapability}
    <div
      class="flex h-full items-center justify-center"
      id="model-view-loading-container"
    >
      <div
        class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
      ></div>
    </div>
  {:else if hasAccess}
    {#if modelStore.isLoading}
      <div
        class="flex h-full items-center justify-center"
        id="model-view-loading-container"
      >
        <p class="text-lg text-muted-foreground">Loading model...</p>
      </div>
    {:else if modelStore.error}
      <div
        class="flex h-full items-center justify-center"
        id="model-view-loading-container"
      >
        <p class="text-lg text-destructive">{modelStore.error}</p>
      </div>
    {:else if modelStore.currentModel}
      <div class="h-full" id="model-view-container">
        <Model 
          modelId={props.modelId} 
          projectId={props.projectId} 
          bind:this={modelComponentRef}
        />
      </div>
    {:else}
      <div
        class="flex h-full items-center justify-center"
        id="model-view-loading-container"
      >
        <p class="text-lg text-muted-foreground">Model not found</p>
      </div>
    {/if}
  {/if}
</div>

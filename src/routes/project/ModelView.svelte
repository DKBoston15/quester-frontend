<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { modelStore } from "$lib/stores/ModelStore";
  import Model from "$lib/components/model/Model.svelte";
  import { api } from "$lib/services/api-client";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { GraduationCap } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  const props = $props<{
    modelId: string;
    projectId: string;
  }>();

  let isLoadingCapability = $state(true);
  let hasAccess = $state(false);
  let modelComponentRef = $state<any>(null);

  // Keyboard shortcuts for undo/redo
  function handleKeydown(event: KeyboardEvent) {
    if (!modelComponentRef) return;

    const isCtrl = event.ctrlKey || event.metaKey;

    if (isCtrl && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      if (typeof modelComponentRef.performUndo === "function") {
        modelComponentRef.performUndo();
      }
    } else if (
      isCtrl &&
      (event.key === "y" || (event.key === "z" && event.shiftKey))
    ) {
      event.preventDefault();
      if (typeof modelComponentRef.performRedo === "function") {
        modelComponentRef.performRedo();
      }
    }
  }

  // Check if user has access to model features
  async function checkModelAccessCapability() {
    try {
      const data = await api.get("/capabilities/model_access");
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

  // Enhanced interactive tutorial with auto-demos - factory function for i18n
  function createDriverObj() {
    const driverInstance = driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      onHighlightStarted: (element, step, options) => {
        // Check if this is the toolbar step
        if (step.element === "#flow-toolbar") {
          setTimeout(() => {
            const tutorialMethods = (window as any).tutorialMethods;

            if (
              tutorialMethods &&
              typeof tutorialMethods.addTutorialNode === "function"
            ) {
              const nodeId = tutorialMethods.addTutorialNode("ResizableNode");
              if (nodeId) {
                (window as any).tutorialNodeId = nodeId;
              }
            }
          }, 1000);
        }
      },
      steps: [
        {
          element: "#model-view-loading-container",
          popover: {
            title: t("tours.modelView.loading.title"),
            description: t("tours.modelView.loading.description"),
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#model-view-container",
          popover: {
            title: t("tours.modelView.welcome.title"),
            description: t("tours.modelView.welcome.description"),
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
              driverInstance.moveNext(); // Skip if model isn't loaded
            }
          },
        },
        {
          element: "#flow-toolbar",
          popover: {
            title: t("tours.modelView.toolbar.title"),
            description: t("tours.modelView.toolbar.description"),
            side: "right",
            align: "start",
          },
          onHighlightStarted: () => {
            // Create node after a delay to show the toolbar first
            setTimeout(() => {
              const tutorialMethods = (window as any).tutorialMethods;

              if (
                tutorialMethods &&
                typeof tutorialMethods.addTutorialNode === "function"
              ) {
                const nodeId = tutorialMethods.addTutorialNode("ResizableNode");

                if (nodeId) {
                  (window as any).tutorialNodeId = nodeId;
                }
              } else {
                console.error("Tutorial: Global tutorial methods not available");
              }
            }, 1000);
          },
        },
        {
          element: () => {
            const nodeId = (window as any).tutorialNodeId;
            const selector = nodeId
              ? `[data-id="${nodeId}"]`
              : ".svelte-flow__node";
            const el = document.querySelector(selector);
            return (el as Element) ?? document.body;
          },
          popover: {
            title: t("tours.modelView.firstNode.title"),
            description: t("tours.modelView.firstNode.description"),
            side: "top",
            align: "center",
          },
          onHighlightStarted: async (_element, _step, _options) => {
            setTimeout(() => {
              const nodeId = (window as any).tutorialNodeId;
              const tutorialMethods = (window as any).tutorialMethods;

              if (
                nodeId &&
                tutorialMethods &&
                typeof tutorialMethods.selectNode === "function"
              ) {
                tutorialMethods.selectNode(nodeId);
              }
            }, 500);
          },
        },
        {
          element: "[data-node-toolbar]",
          popover: {
            title: t("tours.modelView.nodeMenu.title"),
            description: t("tours.modelView.nodeMenu.description"),
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: (_element, _step, options) => {
            // Check if toolbar is visible
            const toolbar = document.querySelector("[data-node-toolbar]");
            if (!toolbar || getComputedStyle(toolbar).display === "none") {
              // If not visible, skip this step
              options.driver.moveNext();
            }
          },
        },
        {
          element: "#flow-toolbar",
          popover: {
            title: t("tours.modelView.addingNodes.title"),
            description: t("tours.modelView.addingNodes.description"),
            side: "right",
            align: "start",
          },
          onHighlightStarted: async (_element, _step, _options) => {
            // Clear selection first
            const pane = document.querySelector(".svelte-flow__pane");
            if (pane) {
              const clickEvent = new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
              });
              pane.dispatchEvent(clickEvent);
            }

            // Create a second node
            setTimeout(() => {
              const tutorialMethods = (window as any).tutorialMethods;
              if (
                tutorialMethods &&
                typeof tutorialMethods.addTutorialNode === "function"
              ) {
                tutorialMethods.addTutorialNode("CircleNode");
              }
            }, 500);
          },
        },
        {
          element: ".svelte-flow",
          popover: {
            title: t("tours.modelView.connecting.title"),
            description: t("tours.modelView.connecting.description"),
            side: "top",
            align: "center",
          },
          onHighlightStarted: async (_element, _step, _options) => {
            // Auto-connect the nodes after a delay
            setTimeout(() => {
              // Get the most recent nodes and create a connection between them
              const modelViewEvent = new CustomEvent("autoConnectNodes", {
                detail: { action: "connect-latest-nodes" },
              });
              document.dispatchEvent(modelViewEvent);
            }, 1000);
          },
        },
        {
          element: ".svelte-flow__edge",
          popover: {
            title: t("tours.modelView.arrows.title"),
            description: t("tours.modelView.arrows.description"),
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: (_element, _step, _options) => {
            // Auto-select the edge after a delay to show the customization panel
            setTimeout(() => {
              const edge = document.querySelector(".svelte-flow__edge");
              if (edge) {
                // Simulate edge click
                const clickEvent = new MouseEvent("click", {
                  bubbles: true,
                  cancelable: true,
                });
                edge.dispatchEvent(clickEvent);

                // Add highlight effect
                (edge as HTMLElement).style.filter =
                  "drop-shadow(0 0 8px rgba(79, 70, 229, 0.8))";
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
            title: t("tours.modelView.customizeArrows.title"),
            description: t("tours.modelView.customizeArrows.description"),
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
            title: t("tours.modelView.navigation.title"),
            description: t("tours.modelView.navigation.description"),
            side: "top",
            align: "end",
          },
        },
        {
          element: ".svelte-flow__minimap",
          popover: {
            title: t("tours.modelView.minimap.title"),
            description: t("tours.modelView.minimap.description"),
            side: "left",
            align: "end",
          },
        },
        {
          element: "#flow-toolbar",
          popover: {
            title: t("tours.modelView.building.title"),
            description: t("tours.modelView.building.description"),
            side: "right",
            align: "center",
          },
          onDeselected: () => {
            // Clear any edge selection when tour ends
            setTimeout(() => {
              const pane = document.querySelector(".svelte-flow__pane");
              if (pane) {
                const clickEvent = new MouseEvent("click", {
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
    return driverInstance;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-full relative" id="model-view-outer-container">
  <div class="absolute top-2 right-2 z-50">
    <Button
      variant="outline"
      onclick={() => {
        createDriverObj().drive();

        // Create the tutorial nodes and edge after a delay
        setTimeout(() => {
          const tutorialMethods = (window as any).tutorialMethods;

          if (tutorialMethods) {
            // Create first node (rectangle) at left position
            const nodeId1 = tutorialMethods.addTutorialNodeAt(
              "ResizableNode",
              250,
              200,
              "Concept A"
            );

            // Create second node (circle) at right position
            setTimeout(() => {
              const nodeId2 = tutorialMethods.addTutorialNodeAt(
                "CircleNode",
                450,
                200,
                "Concept B"
              );

              if (nodeId1 && nodeId2) {
                (window as any).tutorialNodeId = nodeId1;
                (window as any).tutorialNodeId2 = nodeId2;

                // Create edge between the nodes
                setTimeout(() => {
                  if (tutorialMethods.addTutorialEdge) {
                    const edgeId = tutorialMethods.addTutorialEdge(
                      nodeId1,
                      nodeId2
                    );
                    (window as any).tutorialEdgeId = edgeId;
                  }
                }, 500);
              }
            }, 500);
          }
        }, 3000); // 3 second delay to let tutorial get to the right step
      }}
      class="border-2 dark:border-dark-border"
    >
      <GraduationCap class="h-4 w-4 mr-2" />
      {$_("dashboard.tour")}
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
        <p class="text-lg text-muted-foreground">{$_("models.loadingModel")}</p>
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
        <p class="text-lg text-muted-foreground">{$_("models.modelNotFound")}</p>
      </div>
    {/if}
  {/if}
</div>

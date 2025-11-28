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
  import { GraduationCap } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative translation access
  const t = (key: string) => get(_)(key);

  let value = $state("2D");
  let isLoading = $state(true);
  let hasAccess = $state(false);

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

  // Define driverObj factory function for i18n
  function createDriverObj() {
    return driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#connections-header",
          popover: {
            title: t("tours.connections.visualize.title"),
            description: t("tours.connections.visualize.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#view-toggle",
          popover: {
            title: t("tours.connections.dimensions.title"),
            description: t("tours.connections.dimensions.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#legend-button",
          popover: {
            title: t("tours.connections.legend.title"),
            description: t("tours.connections.legend.description"),
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#controls-toggle-button",
          popover: {
            title: t("tours.connections.controls.title"),
            description: t("tours.connections.controls.description"),
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#connections-header",
          popover: {
            title: t("tours.connections.interact.title"),
            description: t("tours.connections.interact.description"),
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#connections-header",
          popover: {
            title: t("tours.connections.discover.title"),
            description: t("tours.connections.discover.description"),
            side: "bottom",
            align: "start",
          },
        },
      ],
    });
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
            aria-label={$_("connections.toggle2D")}
            class="w-[6rem] border-2 data-[state=on]:bg-black data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            2D
          </ToggleGroup.Item>
          <ToggleGroup.Item
            value="3D"
            aria-label={$_("connections.toggle3D")}
            class="w-[6rem] border-2 data-[state=on]:bg-black data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            3D
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
      <div class="flex space-x-2 items-center z-50">
        <Popover.Root>
          <Popover.Trigger>
            <Button
              id="legend-button"
              variant="outline"
              class="w-[6rem] border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              >{$_("connections.legend")}</Button
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
                  {$_("connections.legend")}
                </div>
                <div class="p-3 space-y-1.5 overflow-y-none max-h-[520px]">
                  {#each Object.entries(nodeIcons) as [key, value]}
                    {#if key === "literature"}
                      <div
                        class="flex items-center group hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md p-1.5 transition-colors"
                      >
                        <img
                          src={value}
                          alt={$_("literature.title")}
                          class="w-6 h-6 mr-2 flex-shrink-0"
                        />
                        <span class="text-sm truncate">{$_("literature.title")}</span>
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
              >{$_("connections.controls")}</Button
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
                  {$_("connections.interactionControls")}
                </div>
                <div class="p-3 space-y-3">
                  {#if value === "2D"}
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium">{$_("connections.2dGraphControls")}</h4>
                      <ul class="text-xs space-y-1 text-muted-foreground">
                        <li>
                          <strong>{$_("connections.leftClick")}:</strong> {$_("connections.panSelectDrag")}
                        </li>
                        <li><strong>{$_("connections.scrollWheel")}:</strong> {$_("connections.zoomInOut")}</li>
                        <li>
                          <strong>{$_("connections.leftClickShift")}:</strong> {$_("connections.selectMultiple")}
                        </li>
                      </ul>
                    </div>
                  {:else if value === "3D"}
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium">{$_("connections.3dGraphControls")}</h4>
                      <ul class="text-xs space-y-1 text-muted-foreground">
                        <li><strong>{$_("connections.leftClick")}:</strong> {$_("connections.rotateView")}</li>
                        <li><strong>{$_("connections.scrollWheel")}:</strong> {$_("connections.zoomInOut")}</li>
                        <li><strong>{$_("connections.rightClick")}:</strong> {$_("connections.panView")}</li>
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
          onclick={() => createDriverObj().drive()}
          class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <GraduationCap class="h-4 w-4 mr-2" />
          {$_("dashboard.tour")}
        </Button>
      </div>
    </div>
    <div id="graph-container" class="flex-1 relative overflow-hidden">
      {#if value === "3D"}
        <ThreeD />
      {:else if value === "2D"}
        <TwoD />
      {/if}
    </div>
  </div>
{/if}

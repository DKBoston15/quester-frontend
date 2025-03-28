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
  import { projectStore } from "$lib/stores/ProjectStore.svelte";

  let value = "2D";
  let showControls = false;
  let isLoading = $state(true);
  let hasAccess = $state(false);

  // Define the type for typeMap keys
  type TypeMapKey = keyof typeof typeMap;

  function toggleControls() {
    showControls = !showControls;
  }

  // Check if user has access to graph visualization features
  async function checkGraphAccessCapability() {
    try {
      const response = await fetch(
        "http://localhost:3333/capabilities/graph_access",
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to check graph access capability");
      }

      const data = await response.json();
      hasAccess = data.allowed;

      // If user doesn't have access, redirect to dashboard
      if (!hasAccess) {
        console.warn(
          "User attempted to access Connections page without permission"
        );
        if (projectStore.currentProject?.id) {
          navigate(`/project/${projectStore.currentProject.id}/dashboard`);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error("Failed to check graph access capability:", error);
      hasAccess = false;
      // Redirect on error as well
      navigate("/dashboard");
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    checkGraphAccessCapability();
  });
</script>

{#if isLoading}
  <div class="flex-1 w-full flex items-center justify-center">
    <div
      class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
    ></div>
  </div>
{:else if hasAccess}
  <div
    class={`overflow-hidden relative  ${document.documentElement.classList.contains("dark") ? "bg-[#121317]" : "bg-white"}`}
  >
    <div class="flex justify-between dark:bg-[#1A1A1A] bg-white">
      <div class="flex flex-col items-start z-50 p-4">
        <ToggleGroup.Root variant="outline" bind:value type="single" class="">
          <ToggleGroup.Item
            value="2D"
            aria-label="Toggle 2D"
            disabled={value === "2D"}
            class="w-[6rem] border-2 data-[state=on]:bg-black data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            2D
          </ToggleGroup.Item>
          <ToggleGroup.Item
            value="3D"
            aria-label="Toggle 3D"
            disabled={value === "3D"}
            class="w-[6rem] border-2 data-[state=on]:bg-black data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            3D
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
      <div class="flex space-x-2 items-center p-4">
        <Popover.Root>
          <Popover.Trigger>
            <Button
              variant="outline"
              class="w-[6rem] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
        <Button
          variant="outline"
          onclick={toggleControls}
          class="w-[7rem] border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >{showControls ? "Hide Controls" : "Show Controls"}</Button
        >
      </div>
    </div>
    {#if value === "3D"}
      <ThreeD />
    {:else if value === "2D"}
      <TwoD />
    {/if}
    {#if showControls && value === "2D"}
      <div
        class="absolute bottom-16 left-1/2 text-xs transform -translate-x-1/2 mb-4"
      >
        Left Click: Pan/Select/Drag, Scroll Wheel: Zoom, Left Click + Shift:
        Select Multiple Nodes
      </div>
    {/if}
    {#if showControls && value === "3D"}
      <div
        class="absolute bottom-16 left-1/2 text-xs transform -translate-x-1/2 mb-4"
      >
        Left Click: Rotate, Scroll Wheel: Zoom, Right Click: Pan
      </div>
    {/if}
  </div>
{/if}

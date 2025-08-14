<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import {
    InfoIcon,
    PlusIcon,
    Loader2Icon,
    ChevronDownIcon,
    ChevronUpIcon,
  } from "lucide-svelte";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { grantStore } from "$lib/stores/GrantStore.svelte";
  import { toast } from "svelte-sonner";
  import GrantForm from "./GrantForm.svelte";
  import GrantListItem from "./GrantListItem.svelte";

  let showAddForm = $state(false);
  let isLoading = $state(false);
  let isExpanded = $state(false);

  $effect(() => {
    if (projectStore.currentProject?.id) {
      loadGrants();
    }
  });

  async function loadGrants() {
    if (!projectStore.currentProject?.id) return;

    try {
      await grantStore.loadGrants(projectStore.currentProject.id);
    } catch (error) {
      console.error("Failed to load grants:", error);
      toast.error("Failed to load grants");
    }
  }

  function getBadgeVariant(status: string) {
    switch (status.toLowerCase()) {
      case "active":
        return "active";
      case "pending":
        return "planning";
      case "completed":
        return "success";
      case "cancelled":
      case "expired":
        return "archived";
      default:
        return "outline";
    }
  }

  async function handleAddGrant(grantData: any) {
    if (!projectStore.currentProject?.id) return;

    isLoading = true;
    try {
      await grantStore.createGrant(projectStore.currentProject.id, grantData);
      showAddForm = false;
      toast.success("Grant added successfully");
    } catch (error) {
      console.error("Failed to add grant:", error);
      toast.error("Failed to add grant");
    } finally {
      isLoading = false;
    }
  }

  function handleCancelAdd() {
    showAddForm = false;
  }
</script>

<Card
  class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <CardHeader>
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <Tooltip.Root>
          <Tooltip.Trigger>
            <InfoIcon class="h-5 w-5" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-sm max-w-xs">
              Manage comprehensive grant information including NSF funding
              opportunities and other grant details.
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
        <CardTitle>Grant Details</CardTitle>
      </div>

      {#if !showAddForm}
        <Button size="sm" class="gap-2" onclick={() => (showAddForm = true)}>
          <PlusIcon class="h-4 w-4" />
          Add Grant
        </Button>
      {/if}
    </div>
  </CardHeader>

  <CardContent class="space-y-4">
    {#if showAddForm}
      <GrantForm
        onSave={handleAddGrant}
        onCancel={handleCancelAdd}
        {isLoading}
      />
    {:else if grantStore.isLoading}
      <div class="flex items-center justify-center py-8">
        <Loader2Icon class="h-6 w-6 animate-spin mr-2" />
        Loading grants...
      </div>
    {:else if grantStore.error}
      <div class="text-center py-8">
        <p class="text-destructive mb-4">{grantStore.error}</p>
        <Button size="sm" onclick={loadGrants}>Try Again</Button>
      </div>
    {:else if grantStore.grants.length === 0}
      <EmptyState
        title="No grants found"
        description="Add your first grant to get started."
        variant="data-empty"
        ctaText="Add Grant"
        ctaAction={() => (showAddForm = true)}
        icon={PlusIcon}
      />
    {:else}
      <!-- Grants container with height limitation -->
      <div class="relative">
        <div
          class="space-y-3 transition-all duration-300 ease-in-out overflow-hidden"
          class:max-h-80={!isExpanded && grantStore.grants.length > 1}
          class:max-h-none={isExpanded || grantStore.grants.length <= 1}
        >
          {#each grantStore.grants as grant (grant.id)}
            <GrantListItem {grant} />
          {/each}
        </div>

        <!-- Expand/Collapse button and fade overlay -->
        {#if grantStore.grants.length > 1}
          <!-- Expand/Collapse button -->
          <div class="flex justify-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (isExpanded = !isExpanded)}
              class="gap-2 bg-background border-2 dark:border-dark-border shadow-sm"
            >
              {#if isExpanded}
                <ChevronUpIcon class="h-4 w-4" />
                Show Less ({grantStore.grants.length} grants)
              {:else}
                <ChevronDownIcon class="h-4 w-4" />
                Show All ({grantStore.grants.length} grants)
              {/if}
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </CardContent>
</Card>

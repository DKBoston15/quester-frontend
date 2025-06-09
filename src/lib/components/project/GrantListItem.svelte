<!-- src/lib/components/project/GrantListItem.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import {
    EditIcon,
    TrashIcon,
    CalendarIcon,
    DollarSignIcon,
    UserIcon,
    BuildingIcon,
    FileTextIcon,
  } from "lucide-svelte";
  import { grantStore } from "$lib/stores/GrantStore.svelte";
  import { toast } from "svelte-sonner";
  import GrantForm from "./GrantForm.svelte";
  import type { Grant } from "$lib/types/auth";

  interface Props {
    grant: Grant;
  }

  let { grant }: Props = $props();

  let isEditing = $state(false);
  let isDeleting = $state(false);
  let showDeleteDialog = $state(false);

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

  function formatCurrency(amount: number | null) {
    if (!amount) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatAwardType(type: string | null) {
    if (!type) return "Not specified";
    return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
  }

  async function handleEdit(updateData: Partial<Grant>) {
    try {
      await grantStore.updateGrant(grant.id, updateData);
      isEditing = false;
      toast.success("Grant updated successfully");
    } catch (error) {
      console.error("Failed to update grant:", error);
      toast.error("Failed to update grant");
    }
  }

  function handleDeleteClick() {
    showDeleteDialog = true;
  }

  async function confirmDelete() {
    isDeleting = true;
    showDeleteDialog = false;

    try {
      await grantStore.deleteGrant(grant.id);
      toast.success("Grant deleted successfully");
    } catch (error) {
      console.error("Failed to delete grant:", error);
      toast.error("Failed to delete grant");
    } finally {
      isDeleting = false;
    }
  }

  function handleCancelEdit() {
    isEditing = false;
  }
</script>

{#if isEditing}
  <GrantForm {grant} onSave={handleEdit} onCancel={handleCancelEdit} />
{:else}
  <Card.Root
    class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <Card.Header class="pb-4">
      <div class="flex justify-between items-start gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-start gap-3 mb-2">
            <div class="flex-1 min-w-0">
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <Card.Title
                    class="text-xl font-semibold leading-tight mb-1 truncate"
                  >
                    {grant.grantName}
                  </Card.Title>
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">{grant.grantName}</p>
                </Tooltip.Content>
              </Tooltip.Root>
              {#if grant.awardNumber}
                <div
                  class="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <FileTextIcon class="h-4 w-4 flex-shrink-0" />
                  <Tooltip.Root>
                    <Tooltip.Trigger class="text-left">
                      <span class="truncate">Award #{grant.awardNumber}</span>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="top" align="start">
                      <p class="max-w-xs text-sm">Award #{grant.awardNumber}</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              {/if}
            </div>
            <Badge
              variant={getBadgeVariant(grant.status)}
              class="flex-shrink-0"
            >
              {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div class="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => (isEditing = true)}
            class="h-9 w-9 p-0 hover:bg-accent"
            title="Edit grant"
          >
            <EditIcon class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onclick={handleDeleteClick}
            disabled={isDeleting}
            class="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete grant"
          >
            <TrashIcon class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card.Header>

    <Card.Content class="space-y-4 pt-0">
      <!-- Key Metrics Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        {#if grant.amount}
          <div
            class="flex items-center gap-3 p-3 bg-accent/30 rounded-lg min-w-0"
          >
            <div
              class="p-2 bg-green-100 dark:bg-green-900/30 rounded-md flex-shrink-0"
            >
              <DollarSignIcon
                class="h-4 w-4 text-green-600 dark:text-green-400"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-muted-foreground">Amount</p>
              <p class="font-semibold truncate">
                {formatCurrency(grant.amount)}
              </p>
            </div>
          </div>
        {/if}

        {#if grant.startDate}
          <div
            class="flex items-center gap-3 p-3 bg-accent/30 rounded-lg min-w-0"
          >
            <div
              class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md flex-shrink-0"
            >
              <CalendarIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-muted-foreground">Duration</p>
              <p class="font-semibold text-sm">
                <span class="block sm:hidden"
                  >{formatDate(grant.startDate)}</span
                >
                <span class="hidden sm:block"
                  >{formatDate(grant.startDate)} - {formatDate(
                    grant.endDate || null
                  )}</span
                >
              </p>
            </div>
          </div>
        {/if}

        {#if grant.principalInvestigator}
          <div
            class="flex items-center gap-3 p-3 bg-accent/30 rounded-lg min-w-0"
          >
            <div
              class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md flex-shrink-0"
            >
              <UserIcon class="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-muted-foreground">
                Principal Investigator
              </p>
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <p class="font-semibold text-sm truncate">
                    {grant.principalInvestigator}
                  </p>
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">{grant.principalInvestigator}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>
        {/if}
      </div>

      <!-- Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {#if grant.recipient}
          <div class="flex items-start gap-2 min-w-0">
            <BuildingIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground">Recipient:</span>
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <span class="ml-2 block truncate">{grant.recipient}</span>
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">{grant.recipient}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>
        {/if}

        {#if grant.awardType}
          <div class="flex items-start gap-2 min-w-0">
            <FileTextIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground">Type:</span>
              <span class="ml-2 break-words"
                >{formatAwardType(grant.awardType)}</span
              >
            </div>
          </div>
        {/if}

        {#if grant.directorateDivision}
          <div class="flex items-start gap-2 min-w-0">
            <BuildingIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground">Directorate:</span
              >
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <span class="ml-2 block truncate"
                    >{grant.directorateDivision}</span
                  >
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">{grant.directorateDivision}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>
        {/if}

        {#if grant.programManager}
          <div class="flex items-start gap-2 min-w-0">
            <UserIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground"
                >Program Manager:</span
              >
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <span class="ml-2 block truncate">{grant.programManager}</span
                  >
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">{grant.programManager}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>
        {/if}

        {#if grant.coPrincipalInvestigator}
          <div class="flex items-start gap-2 md:col-span-2 min-w-0">
            <UserIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground"
                >Co-Principal Investigator:</span
              >
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <span class="ml-2 block truncate"
                    >{grant.coPrincipalInvestigator}</span
                  >
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">
                    {grant.coPrincipalInvestigator}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>
{/if}

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content
    class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
  >
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Grant</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{grant.grantName}"? This action cannot
        be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <div class="flex justify-end gap-2">
        <Button
          variant="outline"
          onclick={() => (showDeleteDialog = false)}
          class="border-2 dark:border-dark-border"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onclick={confirmDelete}
          class="border-2 border-destructive dark:border-destructive"
        >
          Delete Grant
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

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
    MailIcon,
    PhoneIcon,
    Loader2Icon,
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

  function formatAwardInstrument(type: string | null) {
    if (!type) return "Not specified";

    // Handle the specific mappings
    const typeMap: Record<string, string> = {
      standard: "Standard Grant",
      research: "Research Grant",
      training: "Training Grant",
      equipment: "Equipment Grant",
      fellowship: "Fellowship",
      career: "Career Development",
      collaborative: "Collaborative Research",
      other: "Other",
    };

    return (
      typeMap[type] ||
      type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")
    );
  }

  function formatInvestigatorList(investigators: string[] | null) {
    if (!investigators || investigators.length === 0) return "Not specified";
    return investigators.join(", ");
  }

  async function handleSaveGrant(grantData: Partial<Grant>) {
    if (!grant.id) return;

    isDeleting = true;
    try {
      await grantStore.updateGrant(grant.id, grantData);
      isEditing = false;
      toast.success("Grant updated successfully");
    } catch (error) {
      console.error("Failed to update grant:", error);
      toast.error("Failed to update grant");
    } finally {
      isDeleting = false;
    }
  }

  function handleCancelEdit() {
    isEditing = false;
  }

  async function handleDeleteGrant() {
    if (!grant.id) return;

    isDeleting = true;
    try {
      await grantStore.deleteGrant(grant.id);
      showDeleteDialog = false;
      toast.success("Grant deleted successfully");
    } catch (error) {
      console.error("Failed to delete grant:", error);
      toast.error("Failed to delete grant");
    } finally {
      isDeleting = false;
    }
  }
</script>

{#if isEditing}
  <GrantForm
    {grant}
    onSave={handleSaveGrant}
    onCancel={handleCancelEdit}
    isLoading={isDeleting}
  />
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

        <div class="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onclick={() => (isEditing = true)}
          >
            <EditIcon class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onclick={() => (showDeleteDialog = true)}
          >
            <TrashIcon class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card.Header>

    <Card.Content class="space-y-4">
      <!-- Main Info Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p class="font-semibold text-sm">
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

        {#if grant.principalInvestigators && grant.principalInvestigators.length > 0}
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
                Principal Investigator{grant.principalInvestigators.length > 1
                  ? "s"
                  : ""}
              </p>
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <p class="font-semibold text-sm truncate">
                    {formatInvestigatorList(grant.principalInvestigators)}
                  </p>
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">
                    {formatInvestigatorList(grant.principalInvestigators)}
                  </p>
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
              <span class="font-medium text-muted-foreground"
                >Award Instrument:</span
              >
              <span class="ml-2 break-words"
                >{formatAwardInstrument(grant.awardType)}</span
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

        {#if grant.programManagerEmail}
          <div class="flex items-start gap-2 min-w-0">
            <MailIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground">PM Email:</span>
              <a
                href="mailto:{grant.programManagerEmail}"
                class="ml-2 text-blue-600 dark:text-blue-400 hover:underline block truncate"
              >
                {grant.programManagerEmail}
              </a>
            </div>
          </div>
        {/if}

        {#if grant.programManagerPhone}
          <div class="flex items-start gap-2 min-w-0">
            <PhoneIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground">PM Phone:</span>
              <a
                href="tel:{grant.programManagerPhone}"
                class="ml-2 text-blue-600 dark:text-blue-400 hover:underline block truncate"
              >
                {grant.programManagerPhone}
              </a>
            </div>
          </div>
        {/if}

        {#if grant.coPrincipalInvestigators && grant.coPrincipalInvestigators.length > 0}
          <div class="flex items-start gap-2 md:col-span-2 min-w-0">
            <UserIcon
              class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-muted-foreground"
                >Co-Principal Investigator{grant.coPrincipalInvestigators
                  .length > 1
                  ? "s"
                  : ""}:</span
              >
              <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                  <span class="ml-2 block truncate"
                    >{formatInvestigatorList(
                      grant.coPrincipalInvestigators
                    )}</span
                  >
                </Tooltip.Trigger>
                <Tooltip.Content side="top" align="start">
                  <p class="max-w-xs text-sm">
                    {formatInvestigatorList(grant.coPrincipalInvestigators)}
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
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Grant</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{grant.grantName}"? This action cannot
        be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleDeleteGrant}
        disabled={isDeleting}
        class="bg-destructive hover:bg-destructive/90"
      >
        {#if isDeleting}
          <Loader2Icon class="h-4 w-4 animate-spin mr-2" />
        {/if}
        Delete Grant
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

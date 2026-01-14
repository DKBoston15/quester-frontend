<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { auth } from "$lib/stores/AuthStore";
  import { Separator } from "$lib/components/ui/separator";
  import { Loader2 } from "lucide-svelte";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import { api } from "$lib/services/api-client";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  type Invitation = {
    id: string;
    organization: {
      id: string;
      name: string;
    };
    invitedBy: {
      firstName: string;
      lastName: string;
    };
    accessMapping: {
      organization: { id: string; roleId: string };
      departments?: { id: string; roleId: string; name: string }[];
      projects?: { id: string; roleId: string; name: string }[];
    };
  };

  let invitations = $state<Invitation[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let processingIds = $state<Set<string>>(new Set());

  onMount(() => {
    if (!auth.user?.email) return;
    void loadInvitations();
  });

  async function loadInvitations() {
    isLoading = true;
    error = null;
    try {
      invitations = await api.get(
        `/invitations/pending?email=${encodeURIComponent(auth.user?.email || "")}`
      );
    } catch (err) {
      error = err instanceof Error ? err.message : t("pendingInvites.failedToLoad");
    } finally {
      isLoading = false;
    }
  }

  async function acceptSingle(invitationId: string) {
    processingIds = new Set([...processingIds, invitationId]);
    error = null;

    try {
      await api.post(`/invitations/accept-multiple`, {
        invitationIds: [invitationId],
      });

      // Remove from local list
      invitations = invitations.filter((inv) => inv.id !== invitationId);

      // Navigate to dashboard if no more invitations
      if (invitations.length === 0) {
        navigate("/dashboard");
      }
    } catch (err) {
      error = err instanceof Error ? err.message : t("pendingInvites.failedToAccept");
    } finally {
      processingIds = new Set([...processingIds].filter((id) => id !== invitationId));
    }
  }

  async function declineInvitation(invitationId: string) {
    processingIds = new Set([...processingIds, invitationId]);
    error = null;

    try {
      await api.post(`/invitations/${invitationId}/decline`);

      // Remove from local list
      invitations = invitations.filter((inv) => inv.id !== invitationId);

      // Navigate to dashboard if no more invitations
      if (invitations.length === 0) {
        navigate("/dashboard");
      }
    } catch (err) {
      error = err instanceof Error ? err.message : t("pendingInvites.failedToDecline");
    } finally {
      processingIds = new Set([...processingIds].filter((id) => id !== invitationId));
    }
  }

  async function acceptAllInvitations() {
    isLoading = true;
    error = null;

    try {
      await api.post(`/invitations/accept-multiple`, {
        invitationIds: invitations.map((inv) => inv.id),
      });

      // Navigate to dashboard after successful acceptance
      navigate("/dashboard");
    } catch (err) {
      error =
        err instanceof Error ? err.message : t("pendingInvites.failedToAccept");
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="container bg-background dark:bg-zinc-900 mx-auto py-6 max-w-2xl">
  <Card
    class="border-2 border-primary/20 shadow-md dark:bg-zinc-800 dark:border-zinc-700"
  >
    <CardHeader>
      <CardTitle class="text-2xl text-primary dark:text-primary"
        >{$_('pendingInvites.title')}</CardTitle
      >
    </CardHeader>
    <CardContent>
      {#if isLoading && invitations.length === 0}
        <div class="flex items-center justify-center py-8">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
        </div>
      {:else if error}
        <div class="text-center py-4">
          <p class="text-destructive mb-4">{error}</p>
          <Button variant="outline" onclick={loadInvitations}>
            {$_('common.retry')}
          </Button>
        </div>
      {:else if invitations.length === 0}
        <EmptyState
          title={$_('pendingInvites.noInvites')}
          variant="data-empty"
          height="h-[200px]"
        />
      {:else}
        <div class="space-y-6">
          {#each invitations as invitation (invitation.id)}
            <div
              class="border rounded-lg p-4 bg-card dark:bg-zinc-700/30 shadow-sm dark:border-zinc-700"
            >
              <div class="mb-4">
                <h3 class="text-lg text-foreground dark:text-zinc-100">
                  {$_('pendingInvites.invitedBy', { values: { name: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}` } })}
                </h3>
                <p
                  class="text-xl font-semibold text-foreground dark:text-white"
                >
                  {invitation.organization.name}
                </p>
              </div>

              <div class="space-y-4">
                {#if invitation.accessMapping.departments?.length}
                  <div>
                    <h4 class="font-medium text-foreground dark:text-zinc-200">
                      {$_('team.departments')}:
                    </h4>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                      {#each invitation.accessMapping.departments as dept}
                        <li class="text-muted-foreground dark:text-zinc-300">
                          {dept.name}
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if invitation.accessMapping.projects?.length}
                  <div>
                    <h4 class="font-medium text-foreground dark:text-zinc-200">
                      {$_('team.projects')}:
                    </h4>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                      {#each invitation.accessMapping.projects as project}
                        <li class="text-muted-foreground dark:text-zinc-300">
                          {project.name}
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>

              <!-- Individual accept/decline buttons -->
              <div class="flex gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-600">
                <Button
                  onclick={() => acceptSingle(invitation.id)}
                  disabled={processingIds.has(invitation.id)}
                  size="sm"
                >
                  {#if processingIds.has(invitation.id)}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  {$_('pendingInvites.accept')}
                </Button>
                <Button
                  variant="outline"
                  onclick={() => declineInvitation(invitation.id)}
                  disabled={processingIds.has(invitation.id)}
                  size="sm"
                >
                  {$_('pendingInvites.decline')}
                </Button>
              </div>
            </div>
          {/each}

          {#if invitations.length > 1}
            <Separator class="my-6" />

            <div class="flex justify-end">
              <Button onclick={acceptAllInvitations} disabled={isLoading || processingIds.size > 0}>
                {#if isLoading}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {$_('pendingInvites.acceptAll')}
              </Button>
            </div>
          {/if}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

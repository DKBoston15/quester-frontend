<!-- src/lib/components/PendingInvites.svelte -->
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
  import { auth } from "../stores/AuthStore.svelte";
  import { Separator } from "$lib/components/ui/separator";
  import { API_BASE_URL } from "$lib/config";

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

  onMount(async () => {
    if (!auth.user?.email) return;
    await loadInvitations();
  });

  async function loadInvitations() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/invitations/pending?email=${encodeURIComponent(auth.user?.email || "")}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to load invitations");
      }

      invitations = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load invitations";
    } finally {
      isLoading = false;
    }
  }

  async function acceptInvitations() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(
        `${API_BASE_URL}/invitations/accept-multiple`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            invitationIds: invitations.map((inv) => inv.id),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to accept invitations");
      }

      isLoading = false;

      // Navigate to dashboard after successful acceptance
      navigate("/dashboard");
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to accept invitations";
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
        >Pending Invitations</CardTitle
      >
    </CardHeader>
    <CardContent>
      {#if isLoading}
        <div class="text-center py-4 text-muted-foreground">Loading...</div>
      {:else if error}
        <div class="text-destructive py-4">{error}</div>
      {:else if invitations.length === 0}
        <div class="text-center py-4 text-muted-foreground">
          No pending invitations
        </div>
      {:else}
        <div class="space-y-6">
          {#each invitations as invitation (invitation.id)}
            <div
              class="border rounded-lg p-4 bg-card dark:bg-zinc-700/30 shadow-sm dark:border-zinc-700"
            >
              <div class="mb-4">
                <h3 class="text-lg text-foreground dark:text-zinc-100">
                  {invitation.invitedBy.firstName}
                  {invitation.invitedBy.lastName} invited you to:
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
                      Departments:
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
                      Projects:
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
            </div>
          {/each}

          <Separator class="my-6" />

          <div class="flex justify-end">
            <Button onclick={acceptInvitations} disabled={isLoading}>
              {isLoading ? "Accepting..." : "Accept All Invitations"}
            </Button>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

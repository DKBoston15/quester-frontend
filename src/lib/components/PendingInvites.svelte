<!-- src/lib/components/PendingInvites.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { navigate } from "svelte-routing";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { auth } from "../stores/AuthStore.svelte";

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
                `http://localhost:3333/invitations/pending?email=${encodeURIComponent(auth.user?.email || '')}`,
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
            const response = await fetch("http://localhost:3333/invitations/accept-multiple", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    invitationIds: invitations.map(inv => inv.id)
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to accept invitations");
            }

            isLoading = false;

            // Navigate to onboarding after successful acceptance
            navigate("/dashboard");
        } catch (err) {
            error = err instanceof Error ? err.message : "Failed to accept invitations";
            isLoading = false;
        }
    }
</script>

<div class="container mx-auto py-6 max-w-2xl">
    <Card>
        <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
            {#if isLoading}
                <div class="text-center py-4">Loading...</div>
            {:else if error}
                <div class="text-red-500 py-4">{error}</div>
            {:else if invitations.length === 0}
                <div class="text-center py-4">No pending invitations</div>
            {:else}
                <div class="space-y-6">
                    {#each invitations as invitation (invitation.id)}
                        <div class="border rounded-lg p-4">
                            <div class="mb-4">
                                <h3 class="text-lg font-medium">
                                    {invitation.invitedBy.firstName} {invitation.invitedBy.lastName} invited you to:
                                </h3>
                                <p class="text-xl font-semibold">{invitation.organization.name}</p>
                            </div>

                            <div class="space-y-4">
                                {#if invitation.accessMapping.departments?.length}
                                    <div>
                                        <h4 class="font-medium">Departments:</h4>
                                        <ul class="list-disc pl-5">
                                            {#each invitation.accessMapping.departments as dept}
                                                <li>{dept.name}</li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/if}

                                {#if invitation.accessMapping.projects?.length}
                                    <div>
                                        <h4 class="font-medium">Projects:</h4>
                                        <ul class="list-disc pl-5">
                                            {#each invitation.accessMapping.projects as project}
                                                <li>{project.name}</li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}

                    <div class="pt-4">
                        <Button onclick={acceptInvitations} disabled={isLoading}>
                            {isLoading ? "Accepting..." : "Accept All Invitations"}
                        </Button>
                    </div>
                </div>
            {/if}
        </CardContent>
    </Card>
</div>
<!-- src/lib/components/InviteUserForm.svelte -->
<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Checkbox, Label } from "bits-ui";
    import { useId } from "bits-ui";
    import type { Organization, Department, Project } from "$lib/types/auth";

    const props = $props<{
        organization: Organization;
        departments?: Department[];
        projects?: Project[];
    }>();

    let email = $state("");
    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let success = $state<string | null>(null);

    type AccessItem = { id: string; roleId: string };
    let selectedDepartments = $state<Record<string, AccessItem>>({});
    let selectedProjects = $state<Record<string, AccessItem>>({});
    let organizationRoleId = $state("");

    function handleCheckedChange(id: string, type: 'department' | 'project', checked: boolean) {
        if (type === 'department') {
            if (checked) {
                selectedDepartments[id] = { id, roleId: '' };
            } else {
                delete selectedDepartments[id];
            }
        } else {
            if (checked) {
                selectedProjects[id] = { id, roleId: '' };
            } else {
                delete selectedProjects[id];
            }
        }
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!email || !organizationRoleId) return;

        isLoading = true;
        error = null;
        success = null;

        try {
            const response = await fetch("http://localhost:3333/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    organizationId: props.organization.id,
                    organizationRoleId,
                    departments: Object.values(selectedDepartments),
                    projects: Object.values(selectedProjects)
                }),
            });

            if (!response.ok) throw new Error("Failed to send invitation");

            success = "Invitation sent successfully!";
            email = "";
            selectedDepartments = {};
            selectedProjects = {};
            organizationRoleId = "";
        } catch (err) {
            error = err instanceof Error ? err.message : "Failed to send invitation";
        } finally {
            isLoading = false;
        }
    }
</script>

<Card>
    <CardHeader>
        <CardTitle>Invite User to {props.organization.name}</CardTitle>
    </CardHeader>
    <CardContent>
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            <div class="space-y-2">
                <label for="email" class="text-sm font-medium">Email Address</label>
                <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        bind:value={email}
                        required
                />
            </div>

            <div class="space-y-2">
                <label class="text-sm font-medium">Organization Role</label>
                <select
                        bind:value={organizationRoleId}
                        class="w-full rounded border p-2"
                        required
                >
                    <option value="">Select role...</option>
                    <option value="Admin">Admin</option>
                    <option value="Member">Member</option>
                </select>
            </div>

            {#if props.departments?.length}
                <div class="space-y-2">
                    <label class="text-sm font-medium">Departments</label>
                    <div class="space-y-2">
                        {#each props.departments as dept}
                            <div class="flex items-center gap-4">
                                {#snippet checkboxId()}
                                    {useId()}
                                {/snippet}

                                <Checkbox.Root
                                        id={checkboxId}
                                        class="size-4 rounded border"
                                        onCheckedChange={(checked) => handleCheckedChange(dept.id, 'department', checked)}
                                />
                                <Label.Root for={checkboxId}>{dept.name}</Label.Root>

                                {#if selectedDepartments[dept.id]}
                                    <select
                                            class="rounded border p-1 text-sm"
                                            bind:value={selectedDepartments[dept.id].roleId}
                                    >
                                        <option value="">Select role...</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Member">Member</option>
                                    </select>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            {#if props.projects?.length}
                <div class="space-y-2">
                    <label class="text-sm font-medium">Projects</label>
                    <div class="space-y-2">
                        {#each props.projects as project}
                            <div class="flex items-center gap-4">
                                {#snippet checkboxId()}
                                    {useId()}
                                {/snippet}

                                <Checkbox.Root
                                        id={checkboxId}
                                        class="size-4 rounded border"
                                        onCheckedChange={(checked) => handleCheckedChange(project.id, 'project', checked)}
                                />
                                <Label.Root for={checkboxId}>{project.name}</Label.Root>

                                {#if selectedProjects[project.id]}
                                    <select
                                            class="rounded border p-1 text-sm"
                                            bind:value={selectedProjects[project.id].roleId}
                                    >
                                        <option value="">Select role...</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Member">Member</option>
                                    </select>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            {#if error}
                <div class="text-red-500 text-sm">{error}</div>
            {/if}
            {#if success}
                <div class="text-green-500 text-sm">{success}</div>
            {/if}

            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Invitation"}
            </Button>
        </form>
    </CardContent>
</Card>
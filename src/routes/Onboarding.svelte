<script lang="ts">
    import { navigate } from "svelte-routing";
    import { auth } from "../lib/stores/AuthStore.svelte";
    import { onMount } from "svelte";
    import type { Organization, Department } from "../lib/types/auth";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";

    interface CreatedOrganization {
        id: string;
        name: string;
        slug: string;
    }

    // State management
    let currentStep = $state(1);
    let subscriptionType = $state<'personal' | 'organization' | null>(null);
    let orgName = $state("");
    let departmentCount = $state(1);
    let departmentInputValue = $state("1");
    let departments = $state<Array<{ name: string; id?: string }>>([{ name: "" }]);
    let selectedDepartmentId = $state<string | null>(null);
    let projectName = $state("");
    let isLoading = $state(false);
    let error = $state("");
    let createdOrganization = $state<CreatedOrganization | null>(null);
    let organizations = $state<Organization[]>([]);

    onMount(async () => {
        try {
            const response = await fetch(
                `http://localhost:3333/organizations/by-user?userId=${auth.user?.id}`,
                { credentials: "include" }
            );
            const data = await response.json();
            organizations = data.data;

            if (organizations.length > 0) {
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Failed to fetch organizations:", error);
        }
    });

    function handleSubscriptionChoice(type: 'personal' | 'organization') {
        subscriptionType = type;
        currentStep = 2;
    }

    function updateDepartmentCount(inputValue: string) {
        // Remove non-numeric characters
        const cleanValue = inputValue.replace(/[^0-9]/g, '');
        departmentInputValue = cleanValue;

        // Convert to number and validate range
        const numValue = cleanValue ? parseInt(cleanValue, 10) : 1;
        const validCount = Math.max(1, Math.min(10, numValue));

        // Update actual department count and array
        departmentCount = validCount;
        departments = Array(validCount).fill(null).map((_, i) =>
            departments[i] || { name: "" }
        );
    }

    async function handleCreateOrganization(e: Event) {
        e.preventDefault();
        isLoading = true;
        error = "";

        try {
            const response = await fetch("http://localhost:3333/organizations/createOrgWithUser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: orgName,
                    slug: orgName.toLowerCase().replace(/\s+/g, '-'),
                    userId: auth.user?.id
                }),
            });

            if (!response.ok) throw new Error("Failed to create organization");

            const data = await response.json();
            createdOrganization = data.organization;

            if (subscriptionType === 'organization') {
                currentStep = 3;
            } else {
                currentStep = 4;
            }
        } catch (err) {
            error = err instanceof Error ? err.message : "An error occurred";
        } finally {
            isLoading = false;
        }
    }

    async function handleCreateDepartments(e: Event) {
        e.preventDefault();
        if (!createdOrganization) return;

        isLoading = true;
        error = "";

        try {
            const createdDepts = await Promise.all(
                departments
                    .filter(dept => dept.name.trim())
                    .map(async (dept) => {
                        const response = await fetch("http://localhost:3333/departments/createDepartmentWithUser", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                name: dept.name,
                                organizationId: createdOrganization.id,
                                userId: auth.user?.id
                            }),
                        });

                        if (!response.ok) {
                            throw new Error(`Failed to create department: ${dept.name}`);
                        }

                        // The response directly contains the department data
                        const department = await response.json();

                        return {
                            name: department.name,
                            id: department.id
                        };
                    })
            );

            // Update departments state with all created departments
            departments = createdDepts;

            // Set first department as default selected
            if (createdDepts.length > 0) {
                selectedDepartmentId = createdDepts[0].id;
            }

            currentStep = 4;
        } catch (err) {
            error = err instanceof Error ? err.message : "An error occurred";
            console.error('Department creation error:', err);
        } finally {
            isLoading = false;
        }
    }

    async function handleCreateProject(e: Event) {
        e.preventDefault();
        if (!createdOrganization) return;

        isLoading = true;
        error = "";

        try {
            const response = await fetch("http://localhost:3333/projects/createProjectWithUser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: projectName,
                    organizationId: createdOrganization.id,
                    departmentId: selectedDepartmentId,
                    userId: auth.user?.id
                }),
            });

            if (!response.ok) throw new Error("Failed to create project");

            const data = await response.json();
            const projectSlug = data.project.name.toLowerCase().replace(/\s+/g, '-');

            navigate(`/org/${createdOrganization.slug}/project/${projectSlug}`);
        } catch (err) {
            error = err instanceof Error ? err.message : "An error occurred";
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <Card class="mx-auto w-full max-w-md">
        <CardHeader>
            <CardTitle>
                {#if currentStep === 1}
                    Choose Your Subscription
                {:else if currentStep === 2}
                    Name Your Workspace
                {:else if currentStep === 3}
                    Create Departments
                {:else}
                    Create Your First Project
                {/if}
            </CardTitle>
        </CardHeader>

        <CardContent>
            {#if error}
                <div class="mb-4 p-4 text-red-700 bg-red-100 rounded">
                    {error}
                </div>
            {/if}

            {#if currentStep === 1}
                <div class="space-y-4">
                    <Button
                            variant="outline"
                            class="w-full h-24"
                            onclick={() => handleSubscriptionChoice('personal')}
                    >
                        Personal Workspace
                        <span class="block text-sm text-gray-500">For individual use</span>
                    </Button>

                    <Button
                            variant="outline"
                            class="w-full h-24"
                            onclick={() => handleSubscriptionChoice('organization')}
                    >
                        Organization Workspace
                        <span class="block text-sm text-gray-500">For teams and businesses</span>
                    </Button>
                </div>

            {:else if currentStep === 2}
                <form onsubmit={handleCreateOrganization} class="space-y-4">
                    <div>
                        <Label for="orgName">Workspace Name</Label>
                        <Input
                                type="text"
                                id="orgName"
                                bind:value={orgName}
                                required
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} class="w-full">
                        {isLoading ? 'Creating...' : 'Continue'}
                    </Button>
                </form>

            {:else if currentStep === 3}
                <form onsubmit={handleCreateDepartments} class="space-y-4">
                    <div class="space-y-4">
                        <div>
                            <Label>Number of Departments</Label>
                            <Input
                                    type="text"
                                    inputmode="numeric"
                                    pattern="[0-9]*"
                                    min="1"
                                    max="10"
                                    bind:value={departmentInputValue}
                                    oninput={(e) => updateDepartmentCount(e.currentTarget.value)}
                            />
                        </div>

                        {#each departments as dept, i}
                            <div>
                                <Label for={`dept${i}`}>Department {i + 1} Name</Label>
                                <Input
                                        type="text"
                                        id={`dept${i}`}
                                        bind:value={dept.name}
                                        required
                                />
                            </div>
                        {/each}
                    </div>

                    <Button type="submit" disabled={isLoading} class="w-full">
                        {isLoading ? 'Creating...' : 'Continue'}
                    </Button>
                </form>

            {:else if currentStep === 4}
                <form onsubmit={handleCreateProject} class="space-y-4">
                    {#if subscriptionType === 'organization' && departments.length > 0}
                        <div>
                            <Label for="department">Department</Label>
                            <Select.Root
                                    type="single"
                                    value={selectedDepartmentId}
                                    onValueChange={(value) => selectedDepartmentId = value}
                            >
                                <Select.Trigger class="w-full">
                                    <span>
                                        {departments.find(d => d.id === selectedDepartmentId)?.name || "Select a department"}
                                    </span>
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Group>
                                        {#each departments as dept}
                                            {#if dept.id}
                                                <Select.Item value={dept.id}>
                                                    {dept.name}
                                                </Select.Item>
                                            {/if}
                                        {/each}
                                    </Select.Group>
                                </Select.Content>
                            </Select.Root>
                        </div>
                    {/if}

                    <div>
                        <Label for="projectName">Project Name</Label>
                        <Input
                                type="text"
                                id="projectName"
                                bind:value={projectName}
                                required
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} class="w-full">
                        {isLoading ? 'Creating...' : 'Create Project'}
                    </Button>
                </form>
            {/if}
        </CardContent>
    </Card>
</div>
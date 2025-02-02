<!-- src/routes/Project.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { auth } from "../lib/stores/AuthStore.svelte";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import type { Organization, Project } from "$lib/types/auth";

    const props = $props<{
        params: {
            orgSlug: string;
            projectSlug: string;
        }
    }>();

    let project = $state<Project | null>(null);
    let isLoading = $state(true);
    let error = $state("");

    onMount(async () => {
        try {
            // First get the organization ID from the slug
            const orgResponse = await fetch(
                `http://localhost:3333/organizations/by-user?userId=${auth.user?.id}`,
                { credentials: "include" }
            );
            const orgData = await orgResponse.json();
            const organization = orgData.data.find((org: Organization) =>
                org.slug === props.params.orgSlug
            );

            if (!organization) throw new Error("Organization not found");

            // Then get the projects for this organization
            const projectResponse = await fetch(
                `http://localhost:3333/projects/by-user?userId=${auth.user?.id}`,
                { credentials: "include" }
            );
            const projectData = await projectResponse.json();
            project = projectData.data.find((p: Project) =>
                p.name.toLowerCase().replace(/\s+/g, '-') === props.params.projectSlug
            );

            if (!project) throw new Error("Project not found");
        } catch (err) {
            error = err instanceof Error ? err.message : "An error occurred";
        } finally {
            isLoading = false;
        }
    });
</script>

<div class="container mx-auto py-6">
    <Card>
        <CardHeader>
            <CardTitle>{project?.name || 'Loading...'}</CardTitle>
        </CardHeader>
        <CardContent>
            {#if isLoading}
                <div>Loading project...</div>
            {:else if error}
                <div class="text-red-500">{error}</div>
            {:else}
                <!-- Project content here -->
                <div>
                    <p>Organization: {props.params.orgSlug}</p>
                    <p>Project: {project?.name}</p>
                    <!-- Add more project details as needed -->
                </div>
            {/if}
        </CardContent>
    </Card>
</div>
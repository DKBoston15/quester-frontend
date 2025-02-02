<!-- TreeNode.svelte -->
<script lang="ts">
    import { ChevronRight, Plus } from "lucide-svelte";
    import type { Organization, Department, Project } from "$lib/types/auth";
    import { auth } from "$lib/stores/AuthStore.svelte";
    import { navigate } from "svelte-routing";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";

    export let item: Organization | Department | Project;
    export let level: number = 0;
    export let expanded: boolean = true;
    export let parentOrg: Organization | null = null;

    let departments: Department[] = [];
    let projects: Project[] = [];
    let isLoading = false;
    let isExpanded = expanded;
    let showNewProjectForm = false;
    let newProjectName = "";

    function isOrganization(item: any): item is Organization {
        return 'slug' in item;
    }

    function isDepartment(item: any): item is Department {
        return 'organizationId' in item && !('projectRoles' in item);
    }

    function handleProjectClick(project: Project) {
        const org = parentOrg || (isOrganization(item) ? item : null);
        if (!org) return;

        const projectSlug = project.name.toLowerCase().replace(/\s+/g, '-');
        navigate(`/org/${org.slug}/project/${projectSlug}`);
    }

    async function createProject(e: Event) {
        e.preventDefault();
        if (!newProjectName || !auth.user) return;

        const org = parentOrg || (isOrganization(item) ? item : null);
        if (!org) return;

        try {
            const response = await fetch("http://localhost:3333/projects/createProjectWithUser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: newProjectName,
                    organizationId: org.id,
                    departmentId: isDepartment(item) ? item.id : null,
                    userId: auth.user.id
                }),
            });

            if (!response.ok) throw new Error("Failed to create project");

            const data = await response.json();
            newProjectName = "";
            showNewProjectForm = false;

            // Refresh the projects list
            await loadChildren();

            // Navigate to the new project
            const projectSlug = data.project.name.toLowerCase().replace(/\s+/g, '-');
            navigate(`/org/${org.slug}/project/${projectSlug}`);
        } catch (error) {
            console.error("Failed to create project:", error);
        }
    }

    async function loadChildren() {
        if (!item || isLoading || !auth.user) return;
        isLoading = true;

        try {
            if (isOrganization(item)) {
                // Load departments for this organization
                const deptResponse = await fetch(
                    `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
                    { credentials: "include" }
                );
                const deptData = await deptResponse.json();
                departments = deptData.data.filter(d => d.organizationId === item.id);

                // Load projects directly under organization (no department)
                const projectsResponse = await fetch(
                    `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
                    { credentials: "include" }
                );
                const projectsData = await projectsResponse.json();
                projects = projectsData.data.filter(p =>
                    p.organizationId === item.id && !p.departmentId
                );
            }
            else if (isDepartment(item)) {
                // Load only projects that belong to this department
                const projectsResponse = await fetch(
                    `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
                    { credentials: "include" }
                );
                const projectsData = await projectsResponse.json();
                projects = projectsData.data.filter(p => p.departmentId === item.id);
            }
        } catch (error) {
            console.error("Failed to load children:", error);
        } finally {
            isLoading = false;
        }
    }

    function toggleExpand(event: MouseEvent) {
        event.stopPropagation();
        isExpanded = !isExpanded;
        if (isExpanded && (departments.length === 0 && projects.length === 0)) {
            loadChildren();
        }
    }

    function toggleNewProjectForm(event: MouseEvent) {
        event.stopPropagation();
        showNewProjectForm = !showNewProjectForm;
    }

    // Initial load if expanded
    if (isExpanded) {
        loadChildren();
    }
</script>

<div class={level === 0 ? '' : level === 1 ? 'pl-6' : 'pl-12'}>
    <div
            class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer group"
    >
        <div class="flex items-center gap-2 flex-1">
            {#if isOrganization(item) || isDepartment(item)}
                <button
                        class="p-1 hover:bg-gray-100 rounded-full transform transition-transform opacity-0 group-hover:opacity-100"
                        class:rotate-90={isExpanded}
                        class:opacity-100={isExpanded}
                        onclick={toggleExpand}
                        type="button"
                >
                    <ChevronRight size={16} />
                </button>
            {:else}
                <div class="w-[32px]"></div>
            {/if}

            <span class="font-medium">
                {#if isOrganization(item)}
                    🏢 <!-- Organization -->
                {:else if isDepartment(item)}
                    📁 <!-- Department -->
                {:else}
                    📄 <!-- Project -->
                {/if}
                {item.name}
            </span>

            {#if isOrganization(item) || isDepartment(item)}
                <button
                        class="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 ml-2"
                        onclick={toggleNewProjectForm}
                        type="button"
                >
                    <Plus size={16} />
                </button>
            {/if}
        </div>
    </div>

    {#if showNewProjectForm}
        <div class="pl-9 pt-2">
            <form onsubmit={createProject} class="flex gap-2">
                <Input
                        type="text"
                        placeholder="New project name"
                        bind:value={newProjectName}
                        required
                        class="text-sm"
                />
                <Button type="submit" size="sm">Create</Button>
                <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onclick={() => showNewProjectForm = false}
                >
                    Cancel
                </Button>
            </form>
        </div>
    {/if}

    {#if isExpanded}
        {#if isLoading}
            <div class="pl-9 text-sm text-gray-500">Loading...</div>
        {:else}
            {#if departments.length > 0}
                {#each departments as department}
                    <svelte:self
                            item={department}
                            level={level + 1}
                            parentOrg={isOrganization(item) ? item : parentOrg}
                    />
                {/each}
            {/if}

            {#if projects.length > 0}
                <div class="pl-9">
                    {#each projects as project}
                        <div
                                class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onclick={() => handleProjectClick(project)}
                        >
                            <div class="w-[32px]"></div>
                            <span class="font-medium">
                                📄 {project.name}
                            </span>
                        </div>
                    {/each}
                </div>
            {/if}

            {#if departments.length === 0 && projects.length === 0}
                <div class="pl-9 text-sm text-gray-500">No items</div>
            {/if}
        {/if}
    {/if}
</div>
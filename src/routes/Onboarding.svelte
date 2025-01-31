<!-- src/routes/Onboarding.svelte -->
<script lang="ts">
    import { navigate } from "svelte-routing";
    import { auth } from "../lib/stores/AuthStore.svelte";
    import {onMount} from "svelte";
    import type {Organization} from "../lib/types/auth";

    let orgName = $state("");
    let isLoading = $state(false);
    let error = $state("");
    let organizations: Organization[] = $state([])

    onMount(async () => {
        const response = await fetch(`http://localhost:3333/organizations/by-user?userId=${auth?.user?.id}`, {
                method: "GET",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
            }
        );
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to fetch organizations");
        }
        const data = await response.json();
        organizations = (data.data);
        console.log($state.snapshot(organizations))
    })

    function handleContinueWithoutOrg() {
        navigate("/dashboard");
    }

    async function handleCreateOrg(e: SubmitEvent) {
        e.preventDefault();
        isLoading = true;
        error = "";

        try {
            const response = await fetch("http://localhost:3333/organizations/createOrgWithUser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: orgName,
                    slug: orgName.toLowerCase().replace(/\s+/g, '-'),
                    userId: auth?.user?.id }),
            })

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to create organization");
            }

            navigate("/dashboard");
        } catch (err) {
            error = err instanceof Error ? err.message : "An error occurred";
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div class="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Welcome, {auth.user?.firstName}! Let's get started
                </h2>
            </div>

            <div class="mt-8">
                {#if error}
                    <div class="mb-4 p-4 text-red-700 bg-red-100 rounded">
                        {error}
                    </div>
                {/if}
                {#if organizations.length === 0}
                <div class="space-y-6">
                    <div>
                        <button
                                onclick={handleContinueWithoutOrg}
                                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Continue without an organization
                        </button>
                    </div>

                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300" ></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-white text-gray-500">Or</span>
                        </div>
                    </div>

                    <form onsubmit={handleCreateOrg}>
                        <div>
                            <label
                                    for="orgName"
                                    class="block text-sm font-medium text-gray-700"
                            >
                                Organization Name
                            </label>
                            <div class="mt-1">
                                <input
                                        type="text"
                                        id="orgName"
                                        bind:value={orgName}
                                        required
                                        class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Enter your organization name"
                                />
                            </div>
                        </div>

                        <div class="mt-6">
                            <button
                                    type="submit"
                                    disabled={isLoading}
                                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Creating...' : 'Create Organization'}
                            </button>
                        </div>
                    </form>
                </div>
                {/if}
                {#if organizations.length > 0}
                    Organizations<br/>
                    <hr/>
                    {#each organizations as org}
                        {org.name}<br/>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>
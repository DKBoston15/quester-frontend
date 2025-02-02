<!-- src/App.svelte -->
<script lang="ts">
    import './app.css';
    import { Router, Route } from "svelte-routing";
    import { onMount } from 'svelte';
    import { auth } from './lib/stores/AuthStore.svelte';
    import Dashboard from './routes/Dashboard.svelte';
    import ProtectedRoute from './lib/components/ProtectedRoute.svelte';
    import Onboarding from "./routes/Onboarding.svelte";
    import Project from "./routes/Project.svelte";

    // In Svelte 5, we use $props() instead of export let
    const props = $props<{ url: string }>();

    onMount(() => {
        auth.verifySession();
    });

    function login() {
        window.location.href = "http://localhost:3333/auth/redirect";
    }

    function logout() {
        window.location.href = "http://localhost:3333/auth/logout";
    }
</script>

<Router url={props.url}>
    <nav class="p-4 bg-gray-100">
        {#if !auth.isAuthenticated}
            <button
                    onclick={login}
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Sign in with WorkOS
            </button>
        {:else if auth.user}
            <span class="mr-4">Welcome, {auth.user.firstName}!</span>
            <button
                    onclick={logout}
                    class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
                Logout
            </button>
        {/if}
    </nav>

    <main class="p-4">
        <Route path="/onboarding">
            <ProtectedRoute>
                <Onboarding />
            </ProtectedRoute>
        </Route>
        <Route path="/dashboard">
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        </Route>
        <Route path="/org/:orgSlug/project/:projectSlug" let:params>
            <ProtectedRoute>
                <Project {params} />
            </ProtectedRoute>
        </Route>
    </main>
</Router>
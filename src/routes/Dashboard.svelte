<!-- src/routes/Dashboard.svelte -->
<script lang="ts">
    import { auth } from "../lib/stores/AuthStore.svelte";

    function handleLogout() {
        window.location.href = "http://localhost:3333/auth/logout";
    }
</script>

<div class="p-4">
    <h1>Dashboard</h1>
    {#if auth.user}
        <p>Welcome, {auth.user.firstName}!</p>
        <button
                on:click={handleLogout}
                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
            Logout
        </button>
    {/if}
</div>
<script lang="ts">
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
</script>

<Sidebar.Provider>
  <div class="flex h-screen bg-background w-full">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-4">
      <div class="container mx-auto py-6 px-4">
        <!-- Welcome Section -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold mb-2">Organization Analytics</h1>
          <p class="text-muted-foreground">
            Here's what's happening in your organization.
          </p>
        </div>
      </div>
    </main>
  </div>
</Sidebar.Provider>

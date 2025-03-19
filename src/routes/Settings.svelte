<!-- src/routes/Settings.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
  } from "$lib/components/ui/card";
  import {
    Settings as SettingsIcon,
    User,
    CreditCard,
    Shield,
    Bell,
  } from "lucide-svelte";
  import * as Tabs from "$lib/components/ui/tabs";

  let activeTab = $state("profile");
  let isLoading = $state(false);
  let message = $state<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // User profile data
  let firstName = $state(auth.user?.firstName || "");
  let lastName = $state(auth.user?.lastName || "");
  let email = $state(auth.user?.email || "");

  onMount(() => {
    // Initialize user profile data from auth store
    firstName = auth.user?.firstName || "";
    lastName = auth.user?.lastName || "";
    email = auth.user?.email || "";
  });

  async function saveProfile() {
    isLoading = true;
    message = null;

    try {
      // Placeholder for actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message = {
        type: "success",
        text: "Profile updated successfully!",
      };
    } catch (err) {
      message = {
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile",
      };
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="container mx-auto p-4 max-w-6xl">
  <div class="flex flex-col gap-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-3xl font-bold mb-2 flex items-center gap-2">
        <SettingsIcon class="h-8 w-8" />
        Settings
      </h1>
      <p class="text-muted-foreground">Manage your account and preferences</p>
    </div>

    <!-- Settings Tabs -->
    <Card
      class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
    >
      <CardHeader class="pb-0">
        <Tabs.Root value={activeTab}>
          <Tabs.List class="grid grid-cols-4 gap-4">
            <Tabs.Trigger
              value="profile"
              onclick={() => (activeTab = "profile")}
            >
              <User class="h-4 w-4 mr-2" />
              Profile
            </Tabs.Trigger>
            <Tabs.Trigger
              value="notifications"
              onclick={() => (activeTab = "notifications")}
            >
              <Bell class="h-4 w-4 mr-2" />
              Notifications
            </Tabs.Trigger>
            <Tabs.Trigger
              value="billing"
              onclick={() => (activeTab = "billing")}
            >
              <CreditCard class="h-4 w-4 mr-2" />
              Billing
            </Tabs.Trigger>
            <Tabs.Trigger
              value="security"
              onclick={() => (activeTab = "security")}
            >
              <Shield class="h-4 w-4 mr-2" />
              Security
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </CardHeader>

      <CardContent class="pt-6">
        <!-- Profile Tab -->
        {#if activeTab === "profile"}
          <form
            class="space-y-6"
            onsubmit={(e) => {
              e.preventDefault();
              saveProfile();
            }}
          >
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <Label for="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First Name"
                  bind:value={firstName}
                  class="border-2 border-black dark:border-dark-border"
                />
              </div>
              <div class="space-y-2">
                <Label for="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last Name"
                  bind:value={lastName}
                  class="border-2 border-black dark:border-dark-border"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                bind:value={email}
                class="border-2 border-black dark:border-dark-border"
              />
            </div>

            {#if message}
              <div
                class={`p-3 rounded-md ${message.type === "success" ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"}`}
              >
                {message.text}
              </div>
            {/if}

            <div class="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {#if isLoading}
                  <div
                    class="h-4 w-4 mr-2 border-2 border-t-transparent rounded-full animate-spin"
                  ></div>
                  Saving...
                {:else}
                  Save Changes
                {/if}
              </Button>
            </div>
          </form>
        {/if}

        <!-- Placeholders for other tabs -->
        {#if activeTab === "notifications"}
          <div class="text-center py-8 text-muted-foreground">
            <p>Notification settings will be available soon</p>
          </div>
        {/if}

        {#if activeTab === "billing"}
          <div class="text-center py-8 text-muted-foreground">
            <p>Billing settings will be available soon</p>
          </div>
        {/if}

        {#if activeTab === "security"}
          <div class="text-center py-8 text-muted-foreground">
            <p>Security settings will be available soon</p>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</div>

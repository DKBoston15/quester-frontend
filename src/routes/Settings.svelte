<!-- src/routes/Settings.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
  } from "$lib/components/ui/card";
  import { Settings as SettingsIcon, User, Building2 } from "lucide-svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import TeamSettings from "$lib/components/TeamSettings.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  // Import tooltip components
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { API_BASE_URL } from "$lib/config";

  let activeTab = $state("profile");
  let isLoading = $state(false);
  let message = $state<{ type: "success" | "error"; text: string } | null>(
    null
  );
  let hasOrgSettingsAccess = $state(false);
  let checkingCapabilities = $state(true);

  // User profile data
  let firstName = $state(auth.user?.firstName || "");
  let lastName = $state(auth.user?.lastName || "");
  let email = $state(auth.user?.email || "");

  // Monitor activeTab changes and prevent switching to org tab if no access
  $effect(() => {
    if (
      activeTab === "organization" &&
      !hasOrgSettingsAccess &&
      !checkingCapabilities
    ) {
      console.warn("Attempted to access organization tab without permission");
      activeTab = "profile";
    }
  });

  onMount(async () => {
    // Initialize user profile data from auth store
    firstName = auth.user?.firstName || "";
    lastName = auth.user?.lastName || "";
    email = auth.user?.email || "";

    // Check if user can access organization settings
    await checkOrgSettingsCapability();

    // Initialize team management store for organization settings
    if (auth.currentOrgId) {
      await teamManagement.setSelectedResource(
        "organization",
        auth.currentOrgId
      );
      await teamManagement.refreshCurrentResource();
    }

    checkingCapabilities = false;
  });

  // Check if user has access to organization settings based on subscription
  async function checkOrgSettingsCapability() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/capabilities/org_settings_access`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to check organization settings capability");
      }

      const data = await response.json();
      hasOrgSettingsAccess = data.allowed;

      // If user doesn't have access but organization tab is selected, switch to profile
      if (!hasOrgSettingsAccess && activeTab === "organization") {
        activeTab = "profile";
      }
    } catch (error) {
      console.error("Failed to check organization settings capability:", error);
      hasOrgSettingsAccess = false;

      // If error occurs and organization tab is selected, switch to profile
      if (activeTab === "organization") {
        activeTab = "profile";
      }
    }
  }

  // Check if user is an owner of the current organization
  function isOrganizationOwner() {
    // Only relevant for organization context or when using organization privileges
    if (!teamManagement.organizationStructure) return false;

    const currentUserId = auth.user?.id;
    if (!currentUserId) return false;

    // Find the current user in the organization
    const orgUsers = teamManagement.organizationStructure.users || [];
    const currentUser = orgUsers.find(
      (u: any) => String(u.id) === String(currentUserId)
    );

    if (!currentUser) return false;

    // Check if the user has the owner role
    if (currentUser.$extras?.roleName === "Owner") return true;

    // Check organization roles array as a fallback
    if (
      currentUser.organizationRoles &&
      currentUser.organizationRoles.length > 0
    ) {
      return currentUser.organizationRoles.some(
        (role: any) => role.role?.name === "Owner" || role.roleName === "Owner"
      );
    }

    return false;
  }

  async function saveProfile() {
    isLoading = true;
    message = null;

    try {
      await auth.updateUser({
        firstName,
        lastName,
      });

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

<Sidebar.Provider>
  <div class="flex h-screen bg-background w-full">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      <div class="container mx-auto py-6 px-4">
        <!-- Page Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold mb-2 flex items-center gap-2">
            <SettingsIcon class="h-8 w-8" />
            Settings
          </h1>
          <p class="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        {#if checkingCapabilities}
          <div class="flex justify-center py-8">
            <div
              class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
            ></div>
          </div>
        {:else}
          <!-- Settings Tabs -->
          <Card
            class="border-2 border-black dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <CardHeader class="pb-0">
              <Tabs.Root value={activeTab}>
                <Tabs.List class="grid grid-cols-5 gap-4">
                  <Tabs.Trigger
                    value="profile"
                    onclick={() => (activeTab = "profile")}
                  >
                    <User class="h-4 w-4 mr-2" />
                    Profile
                  </Tabs.Trigger>
                  {#if hasOrgSettingsAccess}
                    <Tabs.Trigger
                      value="organization"
                      onclick={() => (activeTab = "organization")}
                    >
                      <Building2 class="h-4 w-4 mr-2" />
                      Organization
                    </Tabs.Trigger>
                  {:else}
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <Tabs.Trigger
                            value="organization"
                            disabled={true}
                            class="opacity-50 cursor-not-allowed"
                          >
                            <Building2 class="h-4 w-4 mr-2" />
                            Organization
                          </Tabs.Trigger>
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          side="right"
                          sideOffset={10}
                          class="w-56 z-[9999]"
                        >
                          Organization settings are not available on your
                          current plan. Please upgrade to access organization
                          settings.
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  {/if}
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
                      disabled
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

              <!-- Organization Tab -->
              {#if activeTab === "organization"}
                <div class="space-y-6">
                  {#if teamManagement.isLoading}
                    <div class="flex justify-center py-8">
                      <div
                        class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
                      ></div>
                    </div>
                  {:else if auth.currentOrganization}
                    <!-- Team Settings Component -->
                    <Card class="border-2 border-black dark:border-dark-border">
                      <CardHeader>
                        <CardTitle>Organization Settings</CardTitle>
                        <CardDescription>
                          Configure settings for {auth.currentOrganization.name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {#if teamManagement.permissions.canManage || isOrganizationOwner()}
                          <TeamSettings resourceType="organization" />
                        {:else}
                          <div class="text-center py-8 text-muted-foreground">
                            <p>
                              You don't have permission to manage organization
                              settings
                            </p>
                          </div>
                        {/if}
                      </CardContent>
                    </Card>
                  {/if}
                </div>
              {/if}
            </CardContent>
          </Card>
        {/if}
      </div>
    </main>
  </div>
</Sidebar.Provider>

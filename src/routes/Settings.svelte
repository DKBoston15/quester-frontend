<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/stores/AuthStore";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
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
  import { User, Building2, GraduationCap, CreditCard } from "lucide-svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import TeamSettings from "$lib/components/TeamSettings.svelte";
  import ManageSubscription from "$lib/components/ManageSubscription.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { api } from "$lib/services/api-client";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper to get translation value imperatively for driver.js
  const t = (key: string) => get(_)(key);

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
  let orcidUrl = $state(auth.user?.orcidUrl || "");

  // Validation state
  let orcidError = $state<string | null>(null);

  // ORCID URL validation function
  function validateOrcidUrl(url: string): string | null {
    if (!url.trim()) return null; // Empty is valid (optional field)

    const orcidPattern = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    if (!orcidPattern.test(url)) {
      return t("settings.orcidValidation");
    }
    return null;
  }

  // Monitor orcidUrl changes for validation
  $effect(() => {
    orcidError = validateOrcidUrl(orcidUrl);
  });

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
    orcidUrl = auth.user?.orcidUrl || "";

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
      const data = await api.get(`/capabilities/org_settings_access`);
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

    // Validate ORCID URL before saving
    const orcidValidationError = validateOrcidUrl(orcidUrl);
    if (orcidValidationError) {
      message = {
        type: "error",
        text: orcidValidationError,
      };
      isLoading = false;
      return;
    }

    try {
      await auth.updateUser({
        firstName,
        lastName,
        orcidUrl: orcidUrl.trim() || null,
      });

      message = {
        type: "success",
        text: t("settings.profileUpdated"),
      };
    } catch (err) {
      message = {
        type: "error",
        text: err instanceof Error ? err.message : t("settings.failedToUpdate"),
      };
    } finally {
      isLoading = false;
    }
  }

  // Create settings tour with translated steps
  function createSettingsTour() {
    const driverInstance = driver({
      showProgress: true,
      popoverClass: "quester-driver-theme",
      steps: [
        {
          element: "#settings-header",
          popover: {
            title: t("tours.settings.header.title"),
            description: t("tours.settings.header.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#settings-tabs",
          popover: {
            title: t("tours.settings.tabs.title"),
            description: t("tours.settings.tabs.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#profile-tab-content",
          popover: {
            title: t("tours.settings.profile.title"),
            description: t("tours.settings.profile.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#profile-save-button",
          popover: {
            title: t("tours.settings.saveButton.title"),
            description: t("tours.settings.saveButton.description"),
            side: "left",
            align: "start",
          },
        },
        {
          element: "#organization-tab-trigger",
          popover: {
            title: t("tours.settings.organizationTab.title"),
            description: t("tours.settings.organizationTab.description"),
            side: "bottom",
            align: "start",
          },
          onHighlightStarted: (element) => {
            if (!element?.hasAttribute("disabled")) {
              activeTab = "organization";
            }
          },
        },
        {
          element: "#organization-tab-content",
          popover: {
            title: t("tours.settings.organizationContent.title"),
            description: t("tours.settings.organizationContent.description"),
            side: "top",
            align: "start",
          },
          onHighlightStarted: () => {
            if (hasOrgSettingsAccess) {
              activeTab = "organization";
            }
          },
        },
        {
          element: "#setting-disable-invitations",
          popover: {
            title: t("tours.settings.disableInvitations.title"),
            description: t("tours.settings.disableInvitations.description"),
            side: "top",
            align: "start",
          },
          onHighlightStarted: () => {
            if (!hasOrgSettingsAccess) driverInstance.moveNext();
          },
        },
        {
          element: "#setting-allow-member-invites",
          popover: {
            title: t("tours.settings.allowMemberInvites.title"),
            description: t("tours.settings.allowMemberInvites.description"),
            side: "top",
            align: "start",
          },
          onHighlightStarted: () => {
            if (!hasOrgSettingsAccess) driverInstance.moveNext();
          },
        },
        {
          element: "#setting-members-create-projects",
          popover: {
            title: t("tours.settings.membersCreateProjects.title"),
            description: t("tours.settings.membersCreateProjects.description"),
            side: "top",
            align: "start",
          },
          onHighlightStarted: () => {
            if (!hasOrgSettingsAccess) driverInstance.moveNext();
          },
        },
        {
          element: ".container",
          popover: {
            title: t("tours.settings.keepUpdated.title"),
            description: t("tours.settings.keepUpdated.description"),
            side: "top",
            align: "center",
          },
        },
      ],
    });
    return driverInstance;
  }
</script>

<Sidebar.Provider>
  <div class="flex h-screen bg-gray-50 dark:bg-background w-full">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      <div class="container mx-auto py-6 px-4">
        <!-- Page Header -->
        <div class="mb-8" id="settings-header">
          <div class="flex justify-between items-center">
            <h1 class="text-3xl font-bold mb-2 flex items-center gap-2">
              {$_('settings.title')}
            </h1>
            <!-- Add Learn Button -->
            <Button
              variant="outline"
              onclick={() => createSettingsTour().drive()}
              aria-label={$_('dashboard.tour')}
            >
              <GraduationCap class="h-4 w-4 mr-2" />
              {$_('dashboard.tour')}
            </Button>
          </div>
          <p class="text-muted-foreground">
            {$_('settings.subtitle')}
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
            class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
          >
            <CardHeader class="pb-0">
              <Tabs.Root value={activeTab}>
                <Tabs.List class="grid grid-cols-6 gap-4" id="settings-tabs">
                  <Tabs.Trigger
                    value="profile"
                    onclick={() => (activeTab = "profile")}
                  >
                    <User class="h-4 w-4 mr-2" />
                    {$_('settings.profile')}
                  </Tabs.Trigger>
                  {#if hasOrgSettingsAccess}
                    <Tabs.Trigger
                      value="organization"
                      id="organization-tab-trigger"
                      onclick={() => (activeTab = "organization")}
                    >
                      <Building2 class="h-4 w-4 mr-2" />
                      {$_('settings.organization')}
                    </Tabs.Trigger>
                  {:else}
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <Tabs.Trigger
                            value="organization"
                            id="organization-tab-trigger"
                            disabled={true}
                            class="opacity-50 cursor-not-allowed"
                          >
                            <Building2 class="h-4 w-4 mr-2" />
                            {$_('settings.organization')}
                          </Tabs.Trigger>
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          side="right"
                          sideOffset={10}
                          class="w-56 z-[9999]"
                        >
                          {$_('settings.orgNotAvailable')}
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  {/if}
                  {#if auth.currentOrganization && isOrganizationOwner()}
                    <Tabs.Trigger
                      value="billing"
                      id="billing-tab-trigger"
                      onclick={() => (activeTab = "billing")}
                    >
                      <CreditCard class="h-4 w-4 mr-2" />
                      {$_('settings.billing')}
                    </Tabs.Trigger>
                  {/if}
                </Tabs.List>
              </Tabs.Root>
            </CardHeader>

            <CardContent class="pt-6">
              <!-- Profile Tab -->
              {#if activeTab === "profile"}
                <form
                  id="profile-tab-content"
                  class="space-y-6"
                  onsubmit={(e) => {
                    e.preventDefault();
                    saveProfile();
                  }}
                >
                  <div class="grid gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                      <Label for="firstName">{$_('settings.firstName')}</Label>
                      <Input
                        id="firstName"
                        placeholder={$_('settings.firstName')}
                        bind:value={firstName}
                        class="border-2  dark:border-dark-border"
                      />
                    </div>
                    <div class="space-y-2">
                      <Label for="lastName">{$_('settings.lastName')}</Label>
                      <Input
                        id="lastName"
                        placeholder={$_('settings.lastName')}
                        bind:value={lastName}
                        class="border-2  dark:border-dark-border"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <Label for="email">{$_('settings.email')}</Label>
                    <Input
                      disabled
                      id="email"
                      type="email"
                      placeholder={$_('settings.email')}
                      bind:value={email}
                      class="border-2  dark:border-dark-border"
                    />
                  </div>

                  <div class="space-y-2">
                    <Label for="orcidUrl">
                      {$_('settings.orcidUrl')}
                      <span class="text-sm text-muted-foreground font-normal">
                        ({$_('common.optional')})
                      </span>
                    </Label>
                    <Input
                      id="orcidUrl"
                      type="url"
                      placeholder="https://orcid.org/0000-0000-0000-0000"
                      bind:value={orcidUrl}
                      class={`border-2 dark:border-dark-border ${orcidError ? "border-destructive" : ""}`}
                    />
                    {#if orcidError}
                      <p class="text-sm text-destructive">{orcidError}</p>
                    {:else}
                      <p class="text-sm text-muted-foreground">
                        {$_('settings.orcidDescription')}
                        <a
                          href="https://orcid.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-primary hover:underline"
                        >
                          {$_('settings.learnMoreOrcid')}
                        </a>
                      </p>
                    {/if}
                  </div>

                  {#if message}
                    <div
                      class={`p-3 rounded-md ${message.type === "success" ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"}`}
                    >
                      {message.text}
                    </div>
                  {/if}

                  <div class="flex justify-end">
                    <Button
                      id="profile-save-button"
                      type="submit"
                      disabled={isLoading}
                    >
                      {#if isLoading}
                        <div
                          class="h-4 w-4 mr-2 border-2 border-t-transparent rounded-full animate-spin"
                        ></div>
                        {$_('settings.saving')}
                      {:else}
                        {$_('settings.saveChanges')}
                      {/if}
                    </Button>
                  </div>
                </form>
              {/if}

              <!-- Organization Tab -->
              {#if activeTab === "organization"}
                <div class="space-y-6" id="organization-tab-content">
                  {#if teamManagement.isLoading}
                    <div class="flex justify-center py-8">
                      <div
                        class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
                      ></div>
                    </div>
                  {:else if auth.currentOrganization}
                    <!-- Team Settings Component -->
                    <Card class="border-2  dark:border-dark-border">
                      <CardHeader>
                        <CardTitle>{$_('settings.organizationSettings')}</CardTitle>
                        <CardDescription>
                          {$_('settings.configureSettings', { values: { name: auth.currentOrganization.name } })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {#if teamManagement.permissions.canManage || isOrganizationOwner()}
                          <TeamSettings resourceType="organization" />
                        {:else}
                          <div class="text-center py-8 text-muted-foreground">
                            <p>{$_('settings.noPermission')}</p>
                          </div>
                        {/if}
                      </CardContent>
                    </Card>
                  {/if}
                </div>
              {/if}

              <!-- Billing Tab -->
              {#if activeTab === "billing"}
                <div class="space-y-6" id="billing-tab-content">
                  {#if auth.currentOrganization}
                    <!-- Subscription Management -->
                    {#if auth.currentOrganization.billingProviderId}
                      <Card class="border-2 dark:border-dark-border">
                        <CardHeader>
                          <div class="flex items-center gap-2">
                            <CreditCard class="h-5 w-5" />
                            <CardTitle>{$_('settings.subscription')}</CardTitle>
                          </div>
                          <CardDescription>
                            {$_('settings.currentPlan', { values: { plan: auth.currentOrganization.subscription?.plan?.name || $_('settings.noPlan') } })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ManageSubscription
                            organizationId={auth.currentOrganization.id}
                          />
                        </CardContent>
                      </Card>
                    {:else}
                      <Card class="border-2 dark:border-dark-border">
                        <CardHeader>
                          <div class="flex items-center gap-2">
                            <CreditCard class="h-5 w-5" />
                            <CardTitle>{$_('settings.subscribeToPlan')}</CardTitle>
                          </div>
                          <CardDescription>
                            {$_('settings.subscribeDescription')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            onclick={() =>
                              (window.location.href = "/onboarding")}
                            class="w-full"
                          >
                            {$_('settings.viewPlans')}
                          </Button>
                        </CardContent>
                      </Card>
                    {/if}
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

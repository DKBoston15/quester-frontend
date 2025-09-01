<script lang="ts">
  import { navigate } from "svelte-routing";
  import { auth } from "$lib/stores/AuthStore";
  import { onMount } from "svelte";
  import type { Organization as AuthOrganization } from "../lib/types/auth";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import Pricing from "./Pricing.svelte";
  import { DarkmodeToggle } from "$lib/components/ui/darkmode-toggle";
  import { LogOut } from "lucide-svelte";
  import { api } from "$lib/services/api-client";

  // Define the expected structure for the role information
  // interface OrganizationRole {
  //   role: {
  //     id: string;
  //     name: string;
  //   };
  //   // Add other potential fields if needed
  // }

  // Update the Organization type to ensure it matches/extends AuthOrganization correctly
  // We assume AuthOrganization already defines organizationRoles structure correctly,
  // potentially as: { roleId: string; role?: { id: string; name: string } }[]
  // So, we just use the type directly.
  interface Organization extends AuthOrganization {}

  interface CreatedOrganization {
    id: string;
    name: string;
    slug: string;
  }

  // State management
  let currentStep = $state(1);
  let subscriptionType = $state<"personal" | "organization">("personal");
  let orgName = $state("");
  let departmentCount = $state(1);
  let departmentInputValue = $state("1");
  let departments = $state<Array<{ name: string; id?: string }>>([
    { name: "" },
  ]);
  let selectedDepartmentId = $state<string | null>(null);
  let projectName = $state("");
  let isLoading = $state(false);
  let error = $state("");
  let createdOrganization = $state<CreatedOrganization>({
    id: "",
    name: "",
    slug: "",
  });
  let organizations = $state<Organization[]>([]);
  let hasExistingWorkspace = $state(false);
  const totalSteps = 4;
  let isOrgOwner = $state(false); // Track if the user is the org owner

  // Define the Owner Role ID (consider fetching this or using role name if more stable)
  const OWNER_ROLE_ID = "e820de49-d7bd-42d7-8b05-49279cee686f";

  onMount(async () => {
    try {
      // Check if we have a step in the navigation state
      const state = history.state;
      if (state?.step) {
        currentStep = state.step;
      }

      const data = await api.get(
        `/organizations/by-user?userId=${auth.user?.id}`
      );
      organizations = data.data;

      // Check if user has any organizations with active subscriptions
      const hasActiveSubscription = organizations.some(
        (org) => org.billingProviderId != null && org.subscription != null
      );

      if (organizations.length > 0) {
        // If they have an org, set it as the current workspace
        const lastOrg = organizations[organizations.length - 1];
        createdOrganization = {
          id: lastOrg.id,
          name: lastOrg.name,
          slug: lastOrg.slug,
        };
        orgName = lastOrg.name;
        hasExistingWorkspace = true;

        // Determine if the user is the owner of this organization
        if (
          lastOrg.organizationRoles &&
          lastOrg.organizationRoles.length > 0 &&
          // Access roleId directly if role object isn't guaranteed
          // Or prefer checking the nested role.id if backend always preloads it
          lastOrg.organizationRoles[0].role?.id === OWNER_ROLE_ID
        ) {
          isOrgOwner = true;
        } else {
          isOrgOwner = false;
        }

        // Set subscription type based on organization's subscription
        if (lastOrg.subscriptionType === "organization") {
          subscriptionType = "organization";
        } else {
          subscriptionType = "personal";
        }

        // --- Navigation Logic ---
        if (!isOrgOwner && hasActiveSubscription && !state?.step) {
          // If user is NOT the owner and the org has an active subscription, go straight to dashboard
          navigate("/dashboard");
        } else if (hasActiveSubscription && !state?.step) {
          // If user IS the owner and has active subscription, also go to dashboard (assuming setup is complete)
          // This handles owners returning after completing onboarding.
          navigate("/dashboard");
        } else if (!state?.step) {
          // If they have an org but no subscription or billing provider,
          // OR if they are a non-owner joining an org without subscription,
          // go to subscription step (Step 2). Owners will proceed from here.
          // Non-owners will be redirected after this step.
          currentStep = 2;
        }
        // If state?.step exists, respect the navigation state (e.g., coming back from Pricing)
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    }
  });

  function handleSubscriptionChoice(type: "personal" | "organization") {
    subscriptionType = type;
  }

  function updateDepartmentCount(inputValue: string) {
    // Remove non-numeric characters
    const cleanValue = inputValue.replace(/[^0-9]/g, "");
    departmentInputValue = cleanValue;

    // Convert to number and validate range
    const numValue = cleanValue ? parseInt(cleanValue, 10) : 1;
    const validCount = Math.max(1, Math.min(10, numValue));

    // Update actual department count and array
    departmentCount = validCount;
    departments = Array(validCount)
      .fill(null)
      .map((_, i) => departments[i] || { name: "" });
  }

  async function handleCreateOrganization(e: Event) {
    e.preventDefault();

    // If we already have a workspace, just move to the next step
    if (hasExistingWorkspace) {
      currentStep = 2;
      return;
    }

    isLoading = true;
    error = "";

    try {
      const data = await api.post(
        `/organizations/createOrgWithUser`,
        {
          name: orgName,
          slug: orgName.toLowerCase().replace(/\s+/g, "-"),
          userId: auth.user?.id,
        }
      );
      createdOrganization = data.organization;
      currentStep = 2;
    } catch (error) {
      console.error("Failed to create organization:", error);
      error = "Failed to create organization";
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
          .filter((dept) => dept.name.trim())
          .map(async (dept) => {
            // The response directly contains the department data
            const department = await api.post(
              `/departments/createDepartmentWithUser`,
              {
                name: dept.name,
                organizationId: createdOrganization.id,
                userId: auth.user?.id,
              }
            );

            return {
              name: department.name,
              id: department.id,
            };
          })
      );

      // Update departments state with all created departments
      departments = createdDepts;

      // Set first department as default selected
      if (createdDepts.length > 0) {
        selectedDepartmentId = createdDepts[0].id;
      }

      // Move to project creation step
      currentStep = 4;
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
      console.error("Department creation error:", err);
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
      await api.post(
        `/projects/createProjectWithUser`,
        {
          name: projectName,
          organizationId: createdOrganization.id,
          departmentId:
            subscriptionType === "organization"
              ? selectedDepartmentId
              : undefined,
          userId: auth.user?.id,
        }
      );

      // After successful project creation, navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isLoading = false;
    }
  }

  function handleLogout() {
    auth.logout();
  }
</script>

<div
  class="relative min-h-screen bg-background dark:bg-dark-background transition-colors duration-300"
>
  <!-- Top controls -->
  <div class="fixed top-4 right-4 z-50 flex items-center gap-2">
    <!-- Logout button -->
    <button
      onclick={handleLogout}
      class="relative border-2 dark:border-dark-border bg-card dark:bg-dark-card p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,1)] transition-all duration-300 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(44,46,51,1)]"
      title="Sign out"
    >
      <LogOut class="h-4 w-4 text-black dark:text-dark-text-primary" />
    </button>

    <!-- Dark mode toggle -->
    <DarkmodeToggle />
  </div>

  <!-- Background pattern -->
  <div
    class="absolute inset-0"
    style="background-image: radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0) dark:radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0); background-size: 20px 20px;"
  ></div>

  <!-- Decorative elements -->
  <div
    class="absolute top-20 right-20 w-4 h-4 border-2 dark:border-dark-border bg-yellow-400 dark:bg-dark-accent-yellow rotate-12 hidden sm:block"
  ></div>
  <div
    class="absolute bottom-20 left-20 w-4 h-4 border-2 dark:border-dark-border bg-blue-400 dark:bg-dark-accent-blue -rotate-12 hidden sm:block"
  ></div>

  <div
    class="relative mx-auto {currentStep === 2
      ? 'max-w-[1200px]'
      : currentStep === 3
        ? 'max-w-5xl min-h-[calc(100vh-4rem)]'
        : 'max-w-2xl'} px-4 sm:px-6 py-4 sm:py-8 mt-12"
  >
    <div
      class="border-2 mt-8 dark:border-dark-border bg-card dark:bg-dark-card {currentStep ===
      2
        ? 'pb-0'
        : 'p-6'} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,1)]"
    >
      <div class="{currentStep === 2 ? 'px-6 pt-6' : ''} mb-6 relative">
        <h2
          class=" text-3xl font-bold text-black dark:text-dark-text-primary mb-2"
        >
          {#if currentStep === 1}
            Choose Your Workspace Type
          {:else if currentStep === 2}
            {#if subscriptionType === "personal"}
              Choose Your Personal Plan
            {:else}
              Choose Your Team Plan
            {/if}
          {:else if currentStep === 3}
            {#if subscriptionType === "organization"}
              Create Departments
            {:else}
              Create Your First Project
            {/if}
          {:else if currentStep === 4}
            Create Your First Project
          {/if}
        </h2>
        <div
          class="mt-4 h-1 w-12 bg-yellow-400 dark:bg-dark-accent-yellow"
        ></div>
      </div>

      {#if error}
        <div
          class="mb-6 p-4 border-2 border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
        >
          {error}
        </div>
      {/if}

      {#if currentStep === 1}
        <!-- Organization Name -->
        <form onsubmit={handleCreateOrganization} class="space-y-6">
          <div>
            <Label
              class=" text-black dark:text-dark-text-primary mb-2"
              for="orgName"
            >
              Workspace Name
            </Label>
            <Input
              type="text"
              id="orgName"
              bind:value={orgName}
              required
              disabled={hasExistingWorkspace}
              class="border-2  dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary p-3  w-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue {hasExistingWorkspace
                ? 'opacity-50 cursor-not-allowed'
                : ''}"
            />
            {#if hasExistingWorkspace}
              <p
                class="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary"
              >
                You already have a workspace created
              </p>
            {/if}
          </div>

          <div class="space-y-4 mt-6">
            <Label class=" text-black dark:text-dark-text-primary">
              Workspace Type
            </Label>
            <div class="space-y-4">
              <button
                type="button"
                class="relative w-full border-2 dark:border-dark-border bg-card dark:bg-dark-card p-4 text-black dark:text-dark-text-primary transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] {subscriptionType ===
                'personal'
                  ? 'border-4 bg-blue-50 dark:bg-blue-900/20 translate-x-[-2px] translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)]'
                  : ''}"
                onclick={() => handleSubscriptionChoice("personal")}
              >
                <span class="text-xl">Personal Workspace</span>
                <span
                  class="block mt-1 text-sm text-blue-800 dark:text-dark-text-blue"
                  >For individual use</span
                >
              </button>

              <button
                type="button"
                class="relative w-full border-2 dark:border-dark-border bg-card dark:bg-dark-card p-4 text-black dark:text-dark-text-primary transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] {subscriptionType ===
                'organization'
                  ? 'border-4 bg-blue-50 dark:bg-blue-900/20 translate-x-[-2px] translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)]'
                  : ''}"
                onclick={() => handleSubscriptionChoice("organization")}
              >
                <span class="text-xl">Organization Workspace</span>
                <span
                  class="block mt-1 text-sm text-blue-800 dark:text-dark-text-blue"
                  >For teams and businesses</span
                >
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || (!hasExistingWorkspace && !orgName.trim())}
            class="relative w-full border-2 dark:border-dark-border bg-card dark:bg-dark-card px-6 py-3 text-lg text-black dark:text-dark-text-primary transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Creating..."
              : hasExistingWorkspace
                ? "Continue"
                : "Create Workspace"}
          </button>
        </form>
      {:else if currentStep === 2}
        <!-- Plan Selection - Centered -->
        <div class="w-full">
          <Pricing
            organizationId={createdOrganization?.id || ""}
            mode={subscriptionType}
            workspaceName={orgName}
            onBack={() => {
              currentStep = 1;
            }}
            isOwner={isOrgOwner}
          />
        </div>
      {:else if currentStep === 3}
        {#if subscriptionType === "organization"}
          <!-- Department Creation -->
          <form onsubmit={handleCreateDepartments} class="space-y-6">
            <div>
              <Label class=" text-black dark:text-dark-text-primary mb-2">
                Number of Departments
              </Label>
              <Input
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                min="1"
                max="10"
                bind:value={departmentInputValue}
                oninput={(e) => updateDepartmentCount(e.currentTarget.value)}
                class="border-2  dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary p-3  w-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
              />
            </div>

            {#each departments as dept, i}
              <div>
                <Label
                  class=" text-black dark:text-dark-text-primary mb-2"
                  for={`dept${i}`}
                >
                  Department {i + 1} Name
                </Label>
                <Input
                  type="text"
                  id={`dept${i}`}
                  bind:value={dept.name}
                  required
                  class="border-2  dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary p-3  w-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
                />
              </div>
            {/each}

            <button
              type="submit"
              disabled={isLoading}
              class="relative w-full border-2 dark:border-dark-border bg-card dark:bg-dark-card px-6 py-3 text-lg text-black dark:text-dark-text-primary transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Continue to Project Creation"}
            </button>
          </form>
        {:else}
          <!-- Project Creation -->
          <form onsubmit={handleCreateProject} class="space-y-6">
            <div>
              <Label
                class=" text-black dark:text-dark-text-primary mb-2"
                for="projectName"
              >
                Project Name
              </Label>
              <Input
                type="text"
                id="projectName"
                bind:value={projectName}
                required
                class="border-2  dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary p-3  w-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              class="relative w-full border-2 dark:border-dark-border bg-card dark:bg-dark-card px-6 py-3 text-lg text-black dark:text-dark-text-primary transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Project"}
            </button>
          </form>
        {/if}
      {:else if currentStep === 4}
        <!-- Project Creation for Organization -->
        <form onsubmit={handleCreateProject} class="space-y-6">
          <div>
            <Label
              class=" text-black dark:text-dark-text-primary mb-2"
              for="projectName"
            >
              Project Name
            </Label>
            <Input
              type="text"
              id="projectName"
              bind:value={projectName}
              required
              class="border-2  dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary p-3  w-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
            />
          </div>

          {#if departments.length > 0}
            <div>
              <Label
                class=" text-black dark:text-dark-text-primary mb-2"
                for="departmentSelect"
              >
                Select Department
              </Label>
              <select
                id="departmentSelect"
                bind:value={selectedDepartmentId}
                class="w-full border-2 dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
              >
                <option value="">Select a department...</option>
                {#each departments as dept}
                  {#if dept.id}
                    <option value={dept.id}>{dept.name}</option>
                  {/if}
                {/each}
              </select>
            </div>
          {/if}

          <button
            type="submit"
            disabled={isLoading}
            class="relative w-full border-2 dark:border-dark-border bg-card dark:bg-dark-card px-6 py-3 text-lg text-black dark:text-dark-text-primary transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Project"}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>

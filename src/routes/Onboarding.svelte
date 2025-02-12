<script lang="ts">
  import { navigate } from "svelte-routing";
  import { auth } from "../lib/stores/AuthStore.svelte";
  import { onMount } from "svelte";
  import type { Organization } from "../lib/types/auth";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import StripeSubscribe from "../lib/components/StripeSubscribe.svelte";
  import Pricing from "./Pricing.svelte";

  interface CreatedOrganization {
    id: string;
    name: string;
    slug: string;
  }

  // State management
  let currentStep = $state(1);
  let subscriptionType = $state<"personal" | "organization" | null>(null);
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
  let createdOrganization = $state<CreatedOrganization | null>(null);
  let organizations = $state<Organization[]>([]);
  let organizationId: string;
  const totalSteps = 4;

  // Update price IDs with your actual Stripe price IDs
  const PRICE_IDS = {
    personal: "price_1Nkx1kKUlY72sBdUPNIMJoJ9", // Replace with your actual price ID
    organization: "price_1Nkx1kKUlY72sBdUPNIMJoJ9", // Replace with your actual price ID
  };

  onMount(async () => {
    try {
      const response = await fetch(
        `http://localhost:3333/organizations/by-user?userId=${auth.user?.id}`,
        { credentials: "include" }
      );
      const data = await response.json();
      organizations = data.data;

      if (organizations.length > 0) {
        navigate("/dashboard");
      }

      // Fetch the organization ID if not already available
      // This might come from your auth context or previous onboarding steps
      organizationId = "your-org-id";
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    }
  });

  function handleSubscriptionChoice(type: "personal" | "organization") {
    subscriptionType = type;
    currentStep = 2;
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
    isLoading = true;
    error = "";

    try {
      const response = await fetch(
        "http://localhost:3333/organizations/createOrgWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: orgName,
            slug: orgName.toLowerCase().replace(/\s+/g, "-"),
            userId: auth.user?.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create organization");

      const data = await response.json();
      createdOrganization = data.organization;
      currentStep = 3; // Move to pricing step
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
            const response = await fetch(
              "http://localhost:3333/departments/createDepartmentWithUser",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  name: dept.name,
                  organizationId: createdOrganization.id,
                  userId: auth.user?.id,
                }),
              }
            );

            if (!response.ok) {
              throw new Error(`Failed to create department: ${dept.name}`);
            }

            // The response directly contains the department data
            const department = await response.json();

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
      const response = await fetch(
        "http://localhost:3333/projects/createProjectWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: projectName,
            organizationId: createdOrganization.id,
            departmentId: selectedDepartmentId,
            userId: auth.user?.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create project");

      const data = await response.json();
      const projectSlug = data.project.name.toLowerCase().replace(/\s+/g, "-");

      navigate(`/org/${createdOrganization.slug}/project/${projectSlug}`);
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isLoading = false;
    }
  }

  function handleNext() {
    if (currentStep < totalSteps) {
      currentStep++;
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      currentStep--;
    }
  }
</script>

<div
  class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
>
  <Card class="mx-auto w-full max-w-md">
    <CardHeader>
      <CardTitle>
        {#if currentStep === 1}
          Choose Your Workspace Type
        {:else if currentStep === 2}
          Name Your Workspace
        {:else if currentStep === 3}
          Choose Your Plan
        {:else if currentStep === 4}
          {#if subscriptionType === "organization"}
            Create Departments
          {:else}
            Create Your First Project
          {/if}
        {/if}
      </CardTitle>
    </CardHeader>

    <CardContent>
      {#if error}
        <div class="mb-4 p-4 text-red-700 bg-red-100 rounded">
          {error}
        </div>
      {/if}

      {#if currentStep === 1}
        <!-- Workspace Type Selection -->
        <div class="space-y-4">
          <Button
            variant="outline"
            class="w-full h-24"
            onclick={() => handleSubscriptionChoice("personal")}
          >
            Personal Workspace
            <span class="block text-sm text-gray-500">For individual use</span>
          </Button>

          <Button
            variant="outline"
            class="w-full h-24"
            onclick={() => handleSubscriptionChoice("organization")}
          >
            Organization Workspace
            <span class="block text-sm text-gray-500"
              >For teams and businesses</span
            >
          </Button>
        </div>
      {:else if currentStep === 2}
        <!-- Organization Name -->
        <form onsubmit={handleCreateOrganization} class="space-y-4">
          <div>
            <Label for="orgName">Workspace Name</Label>
            <Input type="text" id="orgName" bind:value={orgName} required />
          </div>

          <Button type="submit" disabled={isLoading} class="w-full">
            {isLoading ? "Creating..." : "Continue"}
          </Button>
        </form>
      {:else if currentStep === 3}
        <Pricing organizationId={createdOrganization?.id || ""} />
      {:else if currentStep === 4}
        <!-- Existing department or project creation forms -->
        {#if subscriptionType === "organization"}
          <form onsubmit={handleCreateDepartments} class="space-y-4">
            <div class="space-y-4">
              <div>
                <Label>Number of Departments</Label>
                <Input
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="10"
                  bind:value={departmentInputValue}
                  oninput={(e) => updateDepartmentCount(e.currentTarget.value)}
                />
              </div>

              {#each departments as dept, i}
                <div>
                  <Label for={`dept${i}`}>Department {i + 1} Name</Label>
                  <Input
                    type="text"
                    id={`dept${i}`}
                    bind:value={dept.name}
                    required
                  />
                </div>
              {/each}
            </div>

            <Button type="submit" disabled={isLoading} class="w-full">
              {isLoading ? "Creating..." : "Continue"}
            </Button>
          </form>
        {:else}
          <form onsubmit={handleCreateProject} class="space-y-4">
            <div>
              <Label for="projectName">Project Name</Label>
              <Input
                type="text"
                id="projectName"
                bind:value={projectName}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} class="w-full">
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </form>
        {/if}
      {/if}
    </CardContent>
  </Card>
</div>

<style>
  .onboarding-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .progress-bar {
    margin-bottom: 2rem;
    text-align: center;
  }

  .step {
    margin-bottom: 2rem;
  }

  .pricing-plans {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }

  .plan {
    border: 1px solid #ddd;
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
  }

  .plan ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }

  .plan li {
    margin: 0.5rem 0;
  }
</style>

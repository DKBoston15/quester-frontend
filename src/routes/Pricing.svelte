<script lang="ts">
  import { onMount } from "svelte";
  import StripeSubscribe from "$lib/components/StripeSubscribe.svelte";
  import {
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Switch } from "$lib/components/ui/switch";
  import { Check } from "lucide-svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  const props = $props<{
    organizationId: string;
    mode: "personal" | "organization";
    workspaceName: string;
    onBack: () => void;
  }>();

  type SubscriptionPlan = {
    id: string;
    name: string;
    productId: string;
    monthlyPriceId: string;
    yearlyPriceId: string;
    features: string[];
    maxUsers: number | null;
    priceMonthly: number;
    priceYearly: number;
    type: "free" | "pro" | "team" | "enterprise";
    tag?: string;
    accentColor: string;
    highlight?: boolean;
    description: string;
  };

  let plans = $state<SubscriptionPlan[]>([]);
  let isYearly = $state(false);
  let showContactForm = $state(false);
  let formSubmitted = $state(false);
  let error = $state<string | null>(null);
  let formData = $state({
    email: "",
    firstName: "",
    lastName: "",
    companyUniversity: "",
  });

  onMount(async () => {
    try {
      const response = await fetch("http://localhost:3333/subscription-plans", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch plans: ${response.status} ${response.statusText}`
        );
      }

      const allPlans = await response.json();

      if (!Array.isArray(allPlans)) {
        throw new Error(
          "Expected array of plans but received: " + typeof allPlans
        );
      }

      // Add additional UI properties to plans and infer type from name
      const enhancedPlans = allPlans.map((plan) => {
        // Infer plan type from name
        let type: "free" | "pro" | "team" | "enterprise";
        if (plan.priceMonthly === "0.00") {
          type = "free";
        } else if (plan.name.toLowerCase().includes("pro")) {
          type = "pro";
        } else if (plan.name.toLowerCase().includes("team")) {
          type = "team";
        } else {
          type = "enterprise";
        }

        return {
          ...plan,
          type,
          priceMonthly: parseFloat(plan.priceMonthly),
          priceYearly: parseFloat(plan.priceYearly),
          accentColor:
            type === "free" || type === "team" ? "yellow-400" : "blue-400",
          tag: getTagForPlan(type),
          highlight: type === "pro" || type === "team",
          description: getDescriptionForPlan(type),
        };
      });

      // Filter plans based on mode
      if (props.mode === "personal") {
        plans = enhancedPlans.filter(
          (plan) => plan.type === "free" || plan.type === "pro"
        );
      } else {
        // For organization mode, add enterprise plan and use consistent colors
        const enterprisePlan: SubscriptionPlan = {
          id: "enterprise",
          name: "Enterprise",
          productId: "enterprise",
          monthlyPriceId: "",
          yearlyPriceId: "",
          features: [
            "Everything in Team plan",
            "Custom user limit",
            "Priority support",
            "SLA guarantees",
          ],
          maxUsers: null,
          priceMonthly: 0,
          priceYearly: 0,
          type: "enterprise",
          tag: "Custom Solution",
          accentColor: "blue-400",
          highlight: false,
          description: "Customized solutions for teams and institutions",
        };

        plans = [
          ...enhancedPlans.filter((plan) => plan.type === "team"),
          enterprisePlan,
        ].map((plan) => ({
          ...plan,
          accentColor: "blue-400", // Make all organization plans use blue accent
        }));
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to fetch plans";
      console.error("Failed to fetch plans:", err);
    }
  });

  function getTagForPlan(type: string): string {
    switch (type) {
      case "free":
        return "Get Started";
      case "pro":
        return "Most Popular";
      case "team":
        return "Team Value";
      case "enterprise":
        return "Custom Solution";
      default:
        return "";
    }
  }

  function getDescriptionForPlan(type: string): string {
    switch (type) {
      case "free":
        return "Perfect for trying out Quester";
      case "pro":
        return "Full-featured plan for individuals";
      case "team":
        return "Full-featured plan for teams";
      case "enterprise":
        return "Customized solutions for teams and institutions";
      default:
        return "";
    }
  }

  function calculateSavings(monthlyPrice: number, yearlyPrice: number) {
    return (
      ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) *
      100
    ).toFixed(0);
  }

  function getPrice(plan: SubscriptionPlan) {
    if (plan.type === "free") return 0;
    if (plan.type === "enterprise") return null;
    return isYearly ? plan.priceYearly : plan.priceMonthly;
  }

  function getPriceId(plan: SubscriptionPlan) {
    return isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    // TODO: Implement contact form submission
    formSubmitted = true;
  }
</script>

<div class="w-full mx-auto px-6 pb-12">
  <!-- Pricing toggle and workspace info -->
  <div
    class="flex flex-col sm:flex-row justify-between items-center mb-12 mt-8"
  >
    <div class="flex items-center space-x-6 mb-4 sm:mb-0">
      <span
        class={`text-xl  text-black dark:text-dark-text-primary ${!isYearly ? "font-bold" : ""}`}
        >Monthly</span
      >
      <div
        class="border-2 border-black dark:border-dark-border p-1.5 flex items-center justify-center bg-card dark:bg-dark-card shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,1)]"
      >
        <Switch bind:checked={isYearly} />
      </div>
      <span
        class={`text-xl  text-black dark:text-dark-text-primary ${isYearly ? "font-bold" : ""}`}
        >Yearly</span
      >
      <span
        class="hidden sm:inline-block text-base font-bold bg-blue-400 dark:bg-dark-accent-blue dark:text-black px-3 py-1.5 border-2 border-black dark:border-dark-border"
        >Save up to 17%</span
      >
    </div>
    <div class="flex items-center space-x-2">
      <span
        class="text-sm font-medium text-gray-600 dark:text-dark-text-secondary"
        >Workspace:</span
      >
      <span
        class=" font-bold text-black dark:text-dark-text-primary px-2 py-1 bg-blue-400/20 dark:bg-dark-accent-blue/20 border-2 border-black dark:border-dark-border text-sm"
      >
        {props.workspaceName}
      </span>
    </div>
  </div>
  <!-- Show savings badge on mobile -->
  <div class="sm:hidden flex justify-center mb-8">
    <span
      class="text-base font-bold bg-blue-400 dark:bg-dark-accent-blue dark:text-black px-3 py-1.5 border-2 border-black dark:border-dark-border"
      >Save up to 17%</span
    >
  </div>

  {#if error}
    <div
      class="mb-12 p-6 border-2 border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
    >
      {error}
    </div>
  {/if}

  <!-- Pricing grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8">
    {#if plans.length === 0}
      <div class="col-span-2 text-center py-12">
        <p class="text-xl text-black dark:text-dark-text-primary">
          No subscription plans available.
        </p>
      </div>
    {:else}
      {#each plans as plan}
        <div class="relative group h-full">
          {#if plan.tag}
            <div class="absolute -top-5 left-6 z-10">
              <div
                class="bg-blue-400 dark:text-black dark:bg-dark-accent-blue px-4 py-1.5 border-2 border-black dark:border-dark-border text-base font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(44,46,51,1)]"
              >
                {plan.tag}
              </div>
            </div>
          {/if}

          <div
            class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)]
                           group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none
                           transition-all overflow-hidden flex flex-col h-full
                           {plan.highlight ? 'border-4' : 'border-2'}"
          >
            <CardHeader
              class="p-4 pt-6 border-b-2 border-black dark:border-dark-border {plan.highlight
                ? `bg-blue-400/20 dark:bg-dark-accent-blue/20`
                : ''} min-h-[140px]"
            >
              <CardTitle
                class="text-xl font-bold  mb-2 text-black dark:text-dark-text-primary"
                >{plan.name}</CardTitle
              >
              <CardDescription
                class="font-medium text-base text-gray-600 dark:text-dark-text-secondary"
                >{plan.description}</CardDescription
              >
            </CardHeader>

            <CardContent class="p-4 flex-grow flex flex-col">
              <div class="mb-6">
                {#if plan.type === "enterprise"}
                  <p
                    class="text-4xl font-bold text-black dark:text-dark-text-primary"
                  >
                    Custom Pricing
                  </p>
                {:else}
                  <p
                    class="text-4xl font-bold text-black dark:text-dark-text-primary"
                  >
                    ${getPrice(plan)}
                    <span
                      class="text-xl text-gray-600 dark:text-dark-text-secondary"
                      >{isYearly ? " / year" : " / month"}</span
                    >
                    {#if isYearly && plan.type !== "free"}
                      <span
                        class="text-base font-bold bg-{plan.accentColor} dark:bg-dark-accent-blue px-2 py-1 border border-black dark:border-dark-border ml-2"
                      >
                        Save {calculateSavings(
                          plan.priceMonthly,
                          plan.priceYearly
                        )}%
                      </span>
                    {/if}
                  </p>
                {/if}
              </div>

              <ul class="space-y-3 flex-grow">
                {#each plan.features as feature}
                  <li class="flex items-start group">
                    <div
                      class="w-6 h-6 border-2 border-black dark:border-dark-border bg-black dark:bg-dark-accent-blue flex-shrink-0 mr-4 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform"
                    >
                      <Check
                        class="text-white dark:text-dark-text-primary w-5 h-5"
                      />
                    </div>
                    <span
                      class="text-base font-medium text-gray-800 dark:text-dark-text-secondary group-hover:translate-x-1 transition-transform"
                    >
                      {feature}
                    </span>
                  </li>
                {/each}
              </ul>
            </CardContent>

            <CardFooter
              class="p-4 border-t-2 border-black dark:border-dark-border mt-auto {plan.highlight
                ? `bg-blue-400/20 dark:bg-dark-accent-blue/20`
                : ' dark:bg-dark-card-secondary'}"
            >
              {#if plan.type === "enterprise"}
                <AlertDialog.Root>
                  <AlertDialog.Trigger class="w-full">
                    <button
                      class="w-full bg-black dark:bg-dark-accent-blue text-white dark:text-dark-text-primary font-bold py-3 px-6 border-2 border-black dark:border-dark-border
                                     shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] hover:translate-x-0.5
                                     hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                      Contact Us
                    </button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content
                    class="sm:max-w-[425px] border-4 border-black dark:border-dark-border bg-card dark:bg-dark-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(44,46,51,1)]"
                  >
                    {#if formSubmitted}
                      <div class="p-6 text-center">
                        <h3
                          class="text-2xl font-bold mb-4 text-black dark:text-dark-text-primary"
                        >
                          Thank you for your interest!
                        </h3>
                        <p
                          class="text-base text-gray-600 dark:text-dark-text-secondary mb-6"
                        >
                          Someone from our team will reach out to you soon to
                          schedule a demo.
                        </p>
                        <AlertDialog.Cancel class="w-full">
                          <button
                            class="w-full bg-blue-400 dark:bg-dark-accent-blue text-black dark:text-dark-text-primary font-bold py-3 px-6 border-2 border-black dark:border-dark-border
                                   shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] hover:translate-x-0.5
                                   hover:translate-y-0.5 hover:shadow-none transition-all"
                            onclick={() => {
                              formSubmitted = false;
                              formData = {
                                email: "",
                                firstName: "",
                                lastName: "",
                                companyUniversity: "",
                              };
                            }}
                          >
                            Close
                          </button>
                        </AlertDialog.Cancel>
                      </div>
                    {:else}
                      <AlertDialog.Header>
                        <AlertDialog.Title
                          class="text-black dark:text-dark-text-primary"
                          >Get a full demo of how Quester works</AlertDialog.Title
                        >
                      </AlertDialog.Header>
                      <form onsubmit={handleSubmit} class="space-y-4">
                        <div class="space-y-2">
                          <Label
                            for="email"
                            class="text-black dark:text-dark-text-primary"
                            >Business Email</Label
                          >
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            bind:value={formData.email}
                            required
                            class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary"
                          />
                        </div>
                        <div class="space-y-2">
                          <Label
                            for="firstName"
                            class="text-black dark:text-dark-text-primary"
                            >First Name</Label
                          >
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="John"
                            bind:value={formData.firstName}
                            required
                            class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary"
                          />
                        </div>
                        <div class="space-y-2">
                          <Label
                            for="lastName"
                            class="text-black dark:text-dark-text-primary"
                            >Last Name</Label
                          >
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Doe"
                            bind:value={formData.lastName}
                            required
                            class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary"
                          />
                        </div>
                        <div class="space-y-2">
                          <Label
                            for="companyUniversity"
                            class="text-black dark:text-dark-text-primary"
                            >Company/University Name</Label
                          >
                          <Input
                            id="companyUniversity"
                            type="text"
                            placeholder="Acme Inc."
                            bind:value={formData.companyUniversity}
                            required
                            class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card text-black dark:text-dark-text-primary"
                          />
                        </div>
                        <button
                          type="submit"
                          class="w-full bg-black dark:bg-dark-accent-blue text-white dark:text-dark-text-primary font-bold py-3 px-6 border-2 border-black dark:border-dark-border
                                                     shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] hover:translate-x-0.5
                                                     hover:translate-y-0.5 hover:shadow-none transition-all"
                        >
                          Submit
                        </button>
                      </form>
                    {/if}
                  </AlertDialog.Content>
                </AlertDialog.Root>
              {:else}
                <div
                  class="w-full {plan.type === 'free'
                    ? 'bg-black dark:bg-dark-accent-blue'
                    : `bg-${plan.accentColor} dark:bg-dark-accent-${plan.accentColor === 'yellow-400' ? 'yellow' : 'blue'}`} 
                         {plan.type === 'free'
                    ? 'text-white dark:text-dark-text-primary'
                    : 'text-black dark:text-dark-text-primary'} 
                         font-bold py-3 px-6 border-2 border-black dark:border-dark-border
                         shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] hover:translate-x-0.5
                         hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                  <StripeSubscribe
                    organizationId={props.organizationId}
                    priceId={getPriceId(plan)}
                    planId={plan.id}
                  />
                </div>
              {/if}
            </CardFooter>

            <!-- Decorative corners -->
            <div
              class="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 dark:bg-dark-accent-blue border border-black dark:border-dark-border"
            ></div>
            <div
              class="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 dark:bg-dark-accent-blue border border-black dark:border-dark-border"
            ></div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Subtle back button at the bottom -->
  <div class="mt-12 flex justify-center">
    <button
      onclick={props.onBack}
      class="text-gray-600 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text-primary text-sm flex items-center gap-2 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
      Back to Workspace Selection
    </button>
  </div>
</div>

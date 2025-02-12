<script lang="ts">
  import { onMount } from "svelte";
  import StripeSubscribe from "$lib/components/StripeSubscribe.svelte";
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Switch } from "$lib/components/ui/switch";
  import { Check } from "lucide-svelte";

  const props = $props<{ organizationId: string }>();

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
  };

  let plans = $state<SubscriptionPlan[]>([]);
  let isYearly = $state(false);

  onMount(async () => {
    try {
      const response = await fetch("http://localhost:3333/subscription-plans");
      plans = await response.json();
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  });

  $effect(() => {
    console.log("Billing period changed:", isYearly ? "yearly" : "monthly");
  });

  function getPrice(plan: SubscriptionPlan) {
    return isYearly ? plan.priceYearly : plan.priceMonthly;
  }

  function getPriceId(plan: SubscriptionPlan) {
    console.log(plan);
    return isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;
  }
</script>

<div class="mx-auto max-w-7xl px-6 lg:px-8">
  <div class="mx-auto max-w-4xl text-center">
    <h2 class="text-base font-semibold leading-7 text-primary">Pricing</h2>
    <p class="mt-2 text-4xl font-bold tracking-tight">
      Choose the right plan for your research
    </p>
  </div>

  <div class="mt-6 flex justify-center">
    <div class="flex items-center gap-4">
      <span class:text-muted-foreground={isYearly}>Monthly</span>
      <Switch
        checked={isYearly}
        onCheckedChange={(checked) => (isYearly = checked)}
      />
      <span class:text-muted-foreground={!isYearly}> Yearly (Save 17%) </span>
    </div>
  </div>

  <div
    class="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3"
  >
    {#each plans as plan}
      <Card class="flex flex-col">
        <CardHeader>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>
            ${getPrice(plan)}{isYearly ? "/year" : "/month"}
          </CardDescription>
        </CardHeader>
        <CardContent class="flex-1">
          <ul class="space-y-3">
            {#each plan.features as feature}
              <li class="flex items-center gap-3">
                <Check class="h-4 w-4 text-primary" />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
        </CardContent>
        <CardFooter>
          <StripeSubscribe
            organizationId={props.organizationId}
            priceId={getPriceId(plan)}
            planId={plan.id}
          />
        </CardFooter>
      </Card>
    {/each}
  </div>
</div>

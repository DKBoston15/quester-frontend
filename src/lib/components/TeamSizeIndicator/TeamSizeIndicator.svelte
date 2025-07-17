<!-- src/lib/components/TeamSizeIndicator.svelte -->
<script lang="ts">
  import { Progress } from "$lib/components/ui/progress";
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
  import { Info } from "lucide-svelte";

  const props = $props<{
    currentCount: number;
    maxUsers: number;
    subscriptionPlan: string;
    showAlerts?: boolean;
  }>();

  // Calculate derived values
  let usersRemaining = $derived(Math.max(0, props.maxUsers - props.currentCount));
  let isFull = $derived(usersRemaining === 0);
  let isNearLimit = $derived(usersRemaining <= 1 && usersRemaining > 0);
  let percentage = $derived(Math.min(100, (props.currentCount / props.maxUsers) * 100));

  // Get upgrade suggestion based on plan
  function getUpgradeSuggestion(plan: string, isFull: boolean): string {
    if (plan === "Enterprise") {
      return "Please contact support to adjust your seat count.";
    } else if (plan === "Quester Pro") {
      return isFull ? "Upgrade to Quester Team to add more team members." : "Consider upgrading to Quester Team for up to 5 team members.";
    } else if (plan === "Quester Team") {
      return "Please contact support to discuss enterprise options for larger teams.";
    } else {
      return "Upgrade your plan to invite users.";
    }
  }
</script>

{#if props.maxUsers > 0}
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-medium">Team Members</h4>
        <p class="text-sm text-muted-foreground">
          {props.currentCount} of {props.maxUsers} seats used
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Progress value={percentage} class="w-32" />
        <span class="text-xs font-medium text-muted-foreground">
          {usersRemaining} {usersRemaining === 1 ? "seat" : "seats"} remaining
        </span>
      </div>
    </div>

    {#if props.showAlerts !== false}
      {#if isFull}
        <Alert variant="destructive">
          <Info class="h-4 w-4" />
          <AlertTitle>User Limit Reached</AlertTitle>
          <AlertDescription>
            You've reached the maximum of {props.maxUsers} users for your {props.subscriptionPlan} plan.
            {getUpgradeSuggestion(props.subscriptionPlan, true)}
          </AlertDescription>
        </Alert>
      {:else if isNearLimit}
        <Alert>
          <Info class="h-4 w-4" />
          <AlertTitle>Almost at User Limit</AlertTitle>
          <AlertDescription>
            You have {usersRemaining} {usersRemaining === 1 ? "seat" : "seats"} remaining on your {props.subscriptionPlan} plan.
            {getUpgradeSuggestion(props.subscriptionPlan, false)}
          </AlertDescription>
        </Alert>
      {/if}
    {/if}
  </div>
{/if}
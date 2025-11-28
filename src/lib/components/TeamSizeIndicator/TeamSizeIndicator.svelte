<script lang="ts">
  import { Progress } from "$lib/components/ui/progress";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Info } from "lucide-svelte";
  import { _ } from "svelte-i18n";

  const props = $props<{
    currentCount: number;
    maxUsers: number;
    subscriptionPlan: string;
    showAlerts?: boolean;
  }>();

  // Calculate derived values
  let usersRemaining = $derived(
    Math.max(0, props.maxUsers - props.currentCount)
  );
  let isFull = $derived(usersRemaining === 0);
  let isNearLimit = $derived(usersRemaining <= 1 && usersRemaining > 0);
  let percentage = $derived(
    Math.min(100, (props.currentCount / props.maxUsers) * 100)
  );

  // Get upgrade suggestion based on plan - using reactive $_() for translations
  let upgradeSuggestion = $derived.by(() => {
    const plan = props.subscriptionPlan;
    const full = isFull;

    if (plan === "Enterprise") {
      return $_('teamSizeIndicator.contactSupportSeats');
    } else if (plan === "Quester Pro") {
      return full
        ? $_('teamSizeIndicator.upgradeToTeam')
        : $_('teamSizeIndicator.considerTeamUpgrade');
    } else if (plan === "Quester Team") {
      return $_('teamSizeIndicator.contactSupportEnterprise');
    } else {
      return $_('teamSizeIndicator.upgradePlanToInvite');
    }
  });
</script>

{#if props.maxUsers > 0}
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-medium">{$_('teamSizeIndicator.teamMembers')}</h4>
        <p class="text-sm text-muted-foreground">
          {$_('teamSizeIndicator.seatsUsed', { values: { current: props.currentCount, max: props.maxUsers } })}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Progress value={percentage} class="w-32" />
        <span class="text-xs font-medium text-muted-foreground">
          {usersRemaining === 1 ? $_('teamSizeIndicator.seatRemaining') : $_('teamSizeIndicator.seatsRemaining', { values: { count: usersRemaining } })}
        </span>
      </div>
    </div>

    {#if props.showAlerts !== false}
      {#if isFull}
        <Alert variant="destructive">
          <Info class="h-4 w-4" />
          <AlertTitle>{$_('teamSizeIndicator.userLimitReached')}</AlertTitle>
          <AlertDescription>
            {$_('teamSizeIndicator.maxUsersReached', { values: { max: props.maxUsers, plan: props.subscriptionPlan } })}
            {upgradeSuggestion}
          </AlertDescription>
        </Alert>
      {:else if isNearLimit}
        <Alert>
          <Info class="h-4 w-4" />
          <AlertTitle>{$_('teamSizeIndicator.almostAtLimit')}</AlertTitle>
          <AlertDescription>
            {usersRemaining === 1
              ? $_('teamSizeIndicator.oneSeatRemaining', { values: { plan: props.subscriptionPlan } })
              : $_('teamSizeIndicator.seatsRemainingOnPlan', { values: { count: usersRemaining, plan: props.subscriptionPlan } })}
            {upgradeSuggestion}
          </AlertDescription>
        </Alert>
      {/if}
    {/if}
  </div>
{/if}

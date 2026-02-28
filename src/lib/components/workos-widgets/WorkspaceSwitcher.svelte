<script lang="ts">
  import type { Organization } from "$lib/types/auth";
  import * as Popover from "$lib/components/ui/popover";
  import { Separator } from "$lib/components/ui/separator";
  import { Check, ChevronsUpDown, Plus } from "lucide-svelte";
  import { _ } from "svelte-i18n";

  const {
    organizations,
    currentOrganizationId,
    onSwitch,
    onCreate,
  }: {
    organizations: Organization[];
    currentOrganizationId: string | null;
    onSwitch: (org: Organization) => void;
    onCreate: () => void;
  } = $props();

  let open = $state(false);

  function getUserRole(org: Organization): string | null {
    const role = org.organizationRoles?.[0]?.role;
    return role?.name ?? null;
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function handleSelect(org: Organization) {
    if (org.id !== currentOrganizationId) {
      onSwitch(org);
    }
    open = false;
  }

  function handleCreate() {
    open = false;
    // Defer navigation to next tick so the popover fully closes first
    setTimeout(() => onCreate(), 0);
  }

  function handleKeydown(e: KeyboardEvent, org: Organization) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(org);
    }
  }

  const currentOrg = $derived(
    organizations?.find((o) => o.id === currentOrganizationId)
  );
</script>

<Popover.Root bind:open>
  <Popover.Trigger class="w-full">
    <button
      class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left
             hover:bg-accent/50 transition-colors duration-150 overflow-hidden
             group-data-[collapsible=icon]:justify-center"
      aria-label={$_("workspace.switchWorkspace")}
    >
      <div
        class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md
               bg-primary text-primary-foreground text-xs font-semibold"
      >
        {getInitials(currentOrg?.name || "?")}
      </div>
      <div class="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
        <span class="block truncate text-sm font-semibold leading-tight">
          {currentOrg?.name || $_("sidebar.selectWorkspace")}
        </span>
        {#if currentOrg}
          {@const role = getUserRole(currentOrg)}
          {#if role}
            <span class="block text-[11px] text-muted-foreground leading-tight mt-0.5">
              {role}
            </span>
          {/if}
        {/if}
      </div>
      <ChevronsUpDown
        class="h-4 w-4 flex-shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
      />
    </button>
  </Popover.Trigger>

  <Popover.Content
    class="w-64 p-0"
    side="bottom"
    align="start"
    sideOffset={4}
  >
    <div class="px-3 pt-3 pb-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {$_("workspace.workspaces")}
      </p>
    </div>

    <div class="px-1.5 pb-1.5 max-h-72 overflow-y-auto">
      {#each organizations as org (org.id)}
        {@const isActive = org.id === currentOrganizationId}
        {@const role = getUserRole(org)}

        <button
          class="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left
                 transition-colors {isActive
            ? 'bg-accent'
            : 'hover:bg-accent/50'}"
          onclick={() => handleSelect(org)}
          onkeydown={(e) => handleKeydown(e, org)}
        >
          <div
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md
                   text-xs font-semibold {isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'}"
          >
            {getInitials(org.name)}
          </div>

          <div class="flex-1 min-w-0">
            <span class="block truncate text-sm font-medium">{org.name}</span>
            {#if role}
              <span class="block text-xs text-muted-foreground mt-0.5">{role}</span>
            {/if}
          </div>

          {#if isActive}
            <Check class="h-4 w-4 flex-shrink-0 text-primary" />
          {/if}
        </button>
      {/each}
    </div>

    <Separator />

    <div class="p-1.5">
      <button
        class="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm
               text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        onclick={handleCreate}
      >
        <Plus class="h-4 w-4" />
        {$_("workspace.createNew")}
      </button>
    </div>
  </Popover.Content>
</Popover.Root>

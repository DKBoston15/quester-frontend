<!-- src/routes/components/TeamSettings.svelte -->
<script lang="ts">
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Info, Save } from "lucide-svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore.svelte";

  // Props
  let { resourceType } = $props<{
    resourceType: "organization" | "department" | "project";
  }>();

  // Local state
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);

  // Computed values
  let invitationsDisabled = $derived(
    teamManagement.settings?.invitations?.disabled ?? false
  );
  let allowMemberInvitations = $derived(
    teamManagement.settings?.allowMemberInvitations ?? false
  );

  // Handle settings changes
  async function updateInvitationSettings(disabled: boolean) {
    isSaving = true;
    saveError = null;

    try {
      const success = await teamManagement.updateSetting("invitations", {
        disabled,
      });
      if (!success) {
        throw new Error(teamManagement.error || "Failed to update settings");
      }
    } catch (err) {
      saveError = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isSaving = false;
    }
  }

  async function updateMemberInvitationSettings(allowed: boolean) {
    isSaving = true;
    saveError = null;

    try {
      const success = await teamManagement.updateSetting(
        "allowMemberInvitations",
        allowed
      );
      if (!success) {
        throw new Error(teamManagement.error || "Failed to update settings");
      }
    } catch (err) {
      saveError = err instanceof Error ? err.message : "An error occurred";
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="space-y-6">
  <!-- Invitation Settings -->
  <div class="space-y-4">
    <h3 class="text-lg font-medium">Invitation Settings</h3>

    <!-- Disable Invitations -->
    <div class="flex items-center justify-between space-x-2">
      <Label for="disable-invitations" class="flex flex-col space-y-1">
        <span>Disable Invitations</span>
        <span class="text-sm text-muted-foreground">
          When enabled, no new members can be invited to this {resourceType}
        </span>
      </Label>
      <Switch
        id="disable-invitations"
        checked={invitationsDisabled}
        onchange={() => updateInvitationSettings(!invitationsDisabled)}
        disabled={isSaving}
      />
    </div>

    <!-- Allow Member Invitations -->
    {#if !invitationsDisabled}
      <div class="flex items-center justify-between space-x-2">
        <Label for="allow-member-invitations" class="flex flex-col space-y-1">
          <span>Allow Member Invitations</span>
          <span class="text-sm text-muted-foreground">
            Allow regular members to invite new members to this {resourceType}
          </span>
        </Label>
        <Switch
          id="allow-member-invitations"
          checked={allowMemberInvitations}
          onchange={() =>
            updateMemberInvitationSettings(!allowMemberInvitations)}
          disabled={isSaving}
        />
      </div>
    {/if}
  </div>

  <Separator />

  <!-- Organization-specific settings -->
  {#if resourceType === "organization"}
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Organization Settings</h3>
      <!-- Add organization-specific settings here -->
    </div>
  {/if}

  <!-- Department-specific settings -->
  {#if resourceType === "department"}
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Department Settings</h3>
      <!-- Add department-specific settings here -->
    </div>
  {/if}

  <!-- Project-specific settings -->
  {#if resourceType === "project"}
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Project Settings</h3>
      <!-- Add project-specific settings here -->
    </div>
  {/if}

  <!-- Error Display -->
  {#if saveError}
    <Alert variant="destructive">
      <Info class="h-4 w-4" />
      <AlertDescription>{saveError}</AlertDescription>
    </Alert>
  {/if}

  <!-- Loading State -->
  {#if isSaving}
    <div class="flex items-center justify-center py-4">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      ></div>
    </div>
  {/if}
</div>

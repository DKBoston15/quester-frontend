<script lang="ts">
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import { Separator } from "$lib/components/ui/separator";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Info, Lock } from "lucide-svelte";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { auth } from "$lib/stores/AuthStore";
  import { Badge } from "$lib/components/ui/badge";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper for imperative translation access
  const t = (key: string) => get(_)(key);

  // Props
  let { resourceType } = $props<{
    resourceType: "organization" | "department" | "project";
  }>();

  // Local state
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);
  let isUpdatingInvitationsDisabled = $state(false);
  let isUpdatingMemberInvitations = $state(false);
  let isUpdatingMembersCreateProjects = $state(false);
  let isUpdatingMembersCreateDepartments = $state(false);
  let isUpdatingAdminsCreateDepartments = $state(false);

  // Computed values for existing settings
  let invitationsDisabled = $derived(
    teamManagement.settings?.invitations?.disabled ?? false
  );
  let allowMemberInvitations = $derived(
    teamManagement.settings?.allowMemberInvitations ?? false
  );

  // Computed values for new settings
  let allowMembersToCreateProjects = $derived(
    teamManagement.settings?.allowMembersToCreateProjects ?? true
  );
  let allowMembersToCreateDepartments = $derived(
    teamManagement.settings?.allowMembersToCreateDepartments ?? false
  );
  let allowAdminsToCreateDepartments = $derived(
    teamManagement.settings?.allowAdminsToCreateDepartments ?? true
  );

  // Check if current user is an owner (for owner-only settings)
  let isOwner = $derived(getUserIsOwner());

  // Check if current user is an admin (for admin-accessible settings)
  let isAdmin = $derived(getUserIsAdmin());

  // Helper function to determine if the current user is an owner
  function getUserIsOwner() {
    if (!resourceType || resourceType !== "organization") return false;

    const currentUserId = auth.user?.id;
    if (!currentUserId) return false;

    // Check if current user has owner role in the organization
    if (
      teamManagement.organizationStructure &&
      teamManagement.organizationStructure.users
    ) {
      // Find the current user in the organization
      const currentUser = teamManagement.organizationStructure.users.find(
        (user: any) => String(user.id) === String(currentUserId)
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
          (role: any) =>
            role.role?.name === "Owner" || role.roleName === "Owner"
        );
      }
    }

    return false;
  }

  // Helper function to determine if the current user is an admin
  function getUserIsAdmin() {
    if (!resourceType || resourceType !== "organization") return false;

    const currentUserId = auth.user?.id;
    if (!currentUserId) return false;

    // Check if current user has admin or owner role in the organization
    if (
      teamManagement.organizationStructure &&
      teamManagement.organizationStructure.users
    ) {
      // Find the current user in the organization
      const currentUser = teamManagement.organizationStructure.users.find(
        (user: any) => String(user.id) === String(currentUserId)
      );

      if (!currentUser) return false;

      // Check if the user has the admin or owner role
      if (
        currentUser.$extras?.roleName === "Admin" ||
        currentUser.$extras?.roleName === "Owner"
      )
        return true;

      // Check organization roles array as a fallback
      if (
        currentUser.organizationRoles &&
        currentUser.organizationRoles.length > 0
      ) {
        return currentUser.organizationRoles.some(
          (role: any) =>
            role.role?.name === "Admin" ||
            role.role?.name === "Owner" ||
            role.roleName === "Admin" ||
            role.roleName === "Owner"
        );
      }
    }

    return false;
  }

  // Handle settings changes
  async function updateInvitationSettings(disabled: boolean) {
    if (isUpdatingInvitationsDisabled) return; // Prevent circular updates
    isSaving = true;
    isUpdatingInvitationsDisabled = true;
    saveError = null;

    try {
      const success = await teamManagement.updateSetting("invitations", {
        disabled,
      });
      if (!success) {
        throw new Error(teamManagement.error || t("teamSettings.failedToUpdateSettings"));
      }
    } catch (err) {
      console.error("Error updating invitation settings:", err);
      saveError = err instanceof Error ? err.message : t("teamSettings.errorOccurred");
    } finally {
      isSaving = false;
      setTimeout(() => {
        isUpdatingInvitationsDisabled = false;
      }, 100); // Add a small delay to ensure we don't immediately trigger another update
    }
  }

  async function updateMemberInvitationSettings(allowed: boolean) {
    if (isUpdatingMemberInvitations) return; // Prevent circular updates

    isSaving = true;
    isUpdatingMemberInvitations = true;
    saveError = null;

    try {
      const success = await teamManagement.updateSetting(
        "allowMemberInvitations",
        allowed
      );
      if (!success) {
        throw new Error(teamManagement.error || t("teamSettings.failedToUpdateSettings"));
      }
    } catch (err) {
      console.error("Error updating member invitation settings:", err);
      saveError = err instanceof Error ? err.message : t("teamSettings.errorOccurred");
    } finally {
      isSaving = false;
      setTimeout(() => {
        isUpdatingMemberInvitations = false;
      }, 100);
    }
  }

  // Handle new settings changes
  async function updateMembersCreateProjectsSettings(allowed: boolean) {
    if (isUpdatingMembersCreateProjects) return; // Prevent circular updates

    isSaving = true;
    isUpdatingMembersCreateProjects = true;
    saveError = null;

    try {
      const success = await teamManagement.updateSetting(
        "allowMembersToCreateProjects",
        allowed
      );
      if (!success) {
        throw new Error(teamManagement.error || t("teamSettings.failedToUpdateSettings"));
      }
    } catch (err) {
      console.error("Error updating members create projects settings:", err);
      saveError = err instanceof Error ? err.message : t("teamSettings.errorOccurred");
    } finally {
      isSaving = false;
      setTimeout(() => {
        isUpdatingMembersCreateProjects = false;
      }, 100);
    }
  }

  async function updateMembersCreateDepartmentsSettings(allowed: boolean) {
    if (isUpdatingMembersCreateDepartments) return; // Prevent circular updates

    isSaving = true;
    isUpdatingMembersCreateDepartments = true;
    saveError = null;

    try {
      const success = await teamManagement.updateSetting(
        "allowMembersToCreateDepartments",
        allowed
      );
      if (!success) {
        throw new Error(teamManagement.error || t("teamSettings.failedToUpdateSettings"));
      }
    } catch (err) {
      console.error("Error updating members create departments settings:", err);
      saveError = err instanceof Error ? err.message : t("teamSettings.errorOccurred");
    } finally {
      isSaving = false;
      setTimeout(() => {
        isUpdatingMembersCreateDepartments = false;
      }, 100);
    }
  }

  async function updateAdminsCreateDepartmentsSettings(allowed: boolean) {
    if (isUpdatingAdminsCreateDepartments) return; // Prevent circular updates

    isSaving = true;
    isUpdatingAdminsCreateDepartments = true;
    saveError = null;

    try {
      const success = await teamManagement.updateSetting(
        "allowAdminsToCreateDepartments",
        allowed
      );
      if (!success) {
        throw new Error(teamManagement.error || t("teamSettings.failedToUpdateSettings"));
      }
    } catch (err) {
      console.error("Error updating admins create departments settings:", err);
      saveError = err instanceof Error ? err.message : t("teamSettings.errorOccurred");
    } finally {
      isSaving = false;
      setTimeout(() => {
        isUpdatingAdminsCreateDepartments = false;
      }, 100);
    }
  }
</script>

<div class="space-y-6">
  <!-- Invitation Settings -->
  <div class="space-y-4">
    <h3 class="text-lg font-medium">{$_('teamSettings.invitationSettings')}</h3>

    {#if isOwner || isAdmin}
      <!-- Disable Invitations (owner-controlled but visible to admins) -->
      <div
        id="setting-disable-invitations"
        class="flex items-center justify-between space-x-2"
      >
        <Label for="disable-invitations" class="flex flex-col space-y-1">
          <span>{$_('teamSettings.disableInvitations')}</span>
          <span class="text-sm text-muted-foreground">
            {$_('teamSettings.disableInvitationsDescription', { values: { resourceType } })}
          </span>
          {#if !isOwner}
            <Badge
              variant="outline"
              class="text-xs w-fit mt-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
            >
              <Lock class="h-3 w-3 mr-1" />
              {$_('teamSettings.ownerOnly')}
            </Badge>
          {/if}
        </Label>
        <Switch
          id="disable-invitations"
          class="w-[44px]"
          pressed={invitationsDisabled}
          onPressedChange={(value: boolean) => {
            if (!isSaving && isOwner) {
              updateInvitationSettings(value);
            }
          }}
          disabled={isSaving || !isOwner}
        />
      </div>

      <!-- Allow Member Invitations (owner-controlled but visible to admins) -->
      {#if !invitationsDisabled}
        <div
          id="setting-allow-member-invites"
          class="flex items-center justify-between space-x-2"
        >
          <Label for="allow-member-invitations" class="flex flex-col space-y-1">
            <span>{$_('teamSettings.allowMemberInvitations')}</span>
            <span class="text-sm text-muted-foreground">
              {$_('teamSettings.allowMemberInvitationsDescription', { values: { resourceType } })}
            </span>
            {#if !isOwner}
              <Badge
                variant="outline"
                class="text-xs w-fit mt-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
              >
                <Lock class="h-3 w-3 mr-1" />
                {$_('teamSettings.ownerOnly')}
              </Badge>
            {/if}
          </Label>
          <Switch
            id="allow-member-invitations"
            class="w-[44px]"
            pressed={allowMemberInvitations}
            onPressedChange={(value: boolean) => {
              if (!isSaving && isOwner) {
                updateMemberInvitationSettings(value);
              }
            }}
            disabled={isSaving || !isOwner}
          />
        </div>
      {/if}
    {:else}
      <p class="text-sm text-muted-foreground italic">
        {$_('teamSettings.invitationSettingsAdminOnly')}
      </p>
    {/if}
  </div>

  <Separator />

  <!-- Organization-specific settings -->
  {#if resourceType === "organization"}
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{$_('teamSettings.contentCreationPermissions')}</h3>

      <!-- Project Creation (visible to everyone with permission to manage) -->
      <div
        id="setting-members-create-projects"
        class="flex items-center justify-between space-x-2"
      >
        <Label for="members-create-projects" class="flex flex-col space-y-1">
          <span>{$_('teamSettings.membersCanCreateProjects')}</span>
          <span class="text-sm text-muted-foreground">
            {$_('teamSettings.membersCanCreateProjectsDescription')}
          </span>
        </Label>
        <Switch
          id="members-create-projects"
          class="w-[44px]"
          pressed={allowMembersToCreateProjects}
          onPressedChange={(value: boolean) => {
            if (!isSaving) {
              updateMembersCreateProjectsSettings(value);
            }
          }}
          disabled={isSaving}
        />
      </div>

      <!-- Owner-only settings (visible to admins but not editable) -->
      {#if isOwner || isAdmin}
        <!-- Department Creation (Members) - Owner only -->
        <div
          id="setting-members-create-departments"
          class="flex items-center justify-between space-x-2"
        >
          <Label
            for="members-create-departments"
            class="flex flex-col space-y-1"
          >
            <span>{$_('teamSettings.membersCanCreateDepartments')}</span>
            <span class="text-sm text-muted-foreground">
              {$_('teamSettings.membersCanCreateDepartmentsDescription')}
            </span>
            {#if !isOwner}
              <Badge
                variant="outline"
                class="text-xs w-fit mt-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
              >
                <Lock class="h-3 w-3 mr-1" />
                {$_('teamSettings.ownerOnly')}
              </Badge>
            {/if}
          </Label>
          <Switch
            id="members-create-departments"
            class="w-[44px]"
            pressed={allowMembersToCreateDepartments}
            onPressedChange={(value: boolean) => {
              if (!isSaving && isOwner) {
                updateMembersCreateDepartmentsSettings(value);
              }
            }}
            disabled={isSaving || !isOwner}
          />
        </div>

        <!-- Department Creation (Admins) - Owner only -->
        <div
          id="setting-admins-create-departments"
          class="flex items-center justify-between space-x-2"
        >
          <Label
            for="admins-create-departments"
            class="flex flex-col space-y-1"
          >
            <span>{$_('teamSettings.adminsCanCreateDepartments')}</span>
            <span class="text-sm text-muted-foreground">
              {$_('teamSettings.adminsCanCreateDepartmentsDescription')}
            </span>
            {#if !isOwner}
              <Badge
                variant="outline"
                class="text-xs w-fit mt-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
              >
                <Lock class="h-3 w-3 mr-1" />
                {$_('teamSettings.ownerOnly')}
              </Badge>
            {/if}
          </Label>
          <Switch
            id="admins-create-departments"
            class="w-[44px]"
            pressed={allowAdminsToCreateDepartments}
            onPressedChange={(value: boolean) => {
              if (!isSaving && isOwner) {
                updateAdminsCreateDepartmentsSettings(value);
              }
            }}
            disabled={isSaving || !isOwner}
          />
        </div>
      {/if}
    </div>
  {/if}

  <!-- Department-specific settings -->
  {#if resourceType === "department"}
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{$_('teamSettings.departmentSettings')}</h3>
      <!-- Add department-specific settings here -->
    </div>
  {/if}

  <!-- Project-specific settings -->
  {#if resourceType === "project"}
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{$_('teamSettings.projectSettings')}</h3>
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
</div>

<script lang="ts">
  import type { User } from "$lib/types/auth";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Separator } from "$lib/components/ui/separator";
  import { Badge } from "$lib/components/ui/badge";
  import { Pencil, Check, X, AlertCircle, Mail, Link as LinkIcon } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { toast } from "svelte-sonner";

  const {
    user,
    onUpdate,
    isLoading = false,
  }: {
    user: User | null;
    onUpdate: (userData: Partial<User>) => Promise<void>;
    isLoading?: boolean;
  } = $props();

  let isEditing = $state(false);
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  // Form state
  let editFirstName = $state("");
  let editLastName = $state("");
  let editOrcidUrl = $state("");

  function startEditing() {
    if (!user) return;
    editFirstName = user.firstName || "";
    editLastName = user.lastName || "";
    editOrcidUrl = user.orcidUrl || "";
    isEditing = true;
    error = null;
  }

  function cancelEditing() {
    isEditing = false;
    error = null;
  }

  async function handleSave() {
    if (!editFirstName.trim()) {
      error = $_("validation.firstNameRequired");
      return;
    }
    if (!editLastName.trim()) {
      error = $_("validation.lastNameRequired");
      return;
    }

    isSaving = true;
    error = null;
    try {
      await onUpdate({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        orcidUrl: editOrcidUrl.trim() || null,
      });
      isEditing = false;
      toast.success($_("settings.profileUpdated"));
    } catch (err: any) {
      error = err.message || $_("errors.failedToUpdateProfile");
    } finally {
      isSaving = false;
    }
  }

  function getInitials(firstName: string, lastName: string): string {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }
</script>

{#if isLoading}
  <div class="space-y-4">
    <div class="flex items-center gap-4">
      <Skeleton class="h-16 w-16 rounded-full" />
      <div class="space-y-2">
        <Skeleton class="h-5 w-40" />
        <Skeleton class="h-4 w-60" />
      </div>
    </div>
    <Skeleton class="h-20 w-full" />
  </div>
{:else if !user}
  <Alert variant="destructive">
    <AlertCircle class="h-4 w-4" />
    <AlertDescription>{$_("errors.userNotFound")}</AlertDescription>
  </Alert>
{:else}
  <div class="space-y-6">
    <!-- Profile Header -->
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        {#if user.avatarUrl}
          <img
            src={user.avatarUrl}
            alt="{user.firstName} {user.lastName}"
            class="h-16 w-16 rounded-full object-cover border-2 border-border"
          />
        {:else}
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold border-2 border-border"
          >
            {getInitials(user.firstName, user.lastName)}
          </div>
        {/if}
        <div>
          <h3 class="text-lg font-semibold">
            {user.firstName} {user.lastName}
          </h3>
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail class="h-3.5 w-3.5" />
            <span>{user.email}</span>
            {#if user.emailVerified}
              <Badge variant="secondary" class="text-[10px] ml-1">
                {$_("settings.verified")}
              </Badge>
            {/if}
          </div>
        </div>
      </div>

      {#if !isEditing}
        <Button variant="outline" size="sm" onclick={startEditing}>
          <Pencil class="h-3.5 w-3.5 mr-1.5" />
          {$_("common.edit")}
        </Button>
      {/if}
    </div>

    <Separator />

    {#if isEditing}
      <!-- Edit Mode -->
      <div class="space-y-4">
        {#if error}
          <Alert variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="edit-first-name" class="text-sm font-medium">
              {$_("settings.firstName")}
            </label>
            <Input
              id="edit-first-name"
              bind:value={editFirstName}
              placeholder={$_("settings.firstName")}
            />
          </div>
          <div class="space-y-1.5">
            <label for="edit-last-name" class="text-sm font-medium">
              {$_("settings.lastName")}
            </label>
            <Input
              id="edit-last-name"
              bind:value={editLastName}
              placeholder={$_("settings.lastName")}
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="edit-orcid" class="text-sm font-medium">
            {$_("settings.orcidUrl")}
          </label>
          <Input
            id="edit-orcid"
            bind:value={editOrcidUrl}
            placeholder="https://orcid.org/0000-0000-0000-0000"
          />
          <p class="text-xs text-muted-foreground">
            {$_("settings.orcidDescription")}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button onclick={handleSave} disabled={isSaving} size="sm">
            <Check class="h-3.5 w-3.5 mr-1.5" />
            {isSaving ? $_("common.saving") : $_("common.save")}
          </Button>
          <Button variant="outline" size="sm" onclick={cancelEditing} disabled={isSaving}>
            <X class="h-3.5 w-3.5 mr-1.5" />
            {$_("common.cancel")}
          </Button>
        </div>
      </div>
    {:else}
      <!-- View Mode -->
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted-foreground">{$_("settings.firstName")}</p>
            <p class="text-sm font-medium">{user.firstName}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{$_("settings.lastName")}</p>
            <p class="text-sm font-medium">{user.lastName}</p>
          </div>
        </div>

        <div>
          <p class="text-sm text-muted-foreground">{$_("settings.email")}</p>
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium">{user.email}</p>
            <Badge variant="outline" class="text-[10px]">
              {$_("settings.managedByWorkOS")}
            </Badge>
          </div>
        </div>

        {#if user.orcidUrl}
          <div>
            <p class="text-sm text-muted-foreground">{$_("settings.orcidUrl")}</p>
            <a
              href={user.orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <LinkIcon class="h-3.5 w-3.5" />
              {user.orcidUrl}
            </a>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

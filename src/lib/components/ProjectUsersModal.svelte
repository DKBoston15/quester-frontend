<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import { _ } from "svelte-i18n";

  // Define the structure for the user prop
  interface ModalProjectUser {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }

  // Props
  let { onClose } = $props<{ onClose: () => void }>();

  // Reactive getters for cleaner access
  let isLoading = $derived(teamManagement.isModalDataLoading);
  let error = $derived(teamManagement.modalError);
  let projectData = $derived(teamManagement.modalProjectData);
  let projectName = $derived(projectData?.name || $_('projectUsers.defaultTitle'));
  let users = $derived(projectData?.users || []);

  function getRoleName(user: any): string {
    // Add more robust role checking as needed based on the actual user object structure
    return user?.role?.name || user?.$extras?.roleName || $_('common.unknown');
  }
</script>

<Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
  <Dialog.Content class="sm:max-w-[600px]">
    <Dialog.Header>
      <Dialog.Title class="truncate">{$_('projectUsers.title', { values: { projectName } })}</Dialog.Title>
      <Dialog.Description>
        {$_('projectUsers.description')}
      </Dialog.Description>
    </Dialog.Header>

    {#if isLoading}
      <div class="py-6 text-center">
        <div
          class="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
        ></div>
        <p class="mt-2 text-muted-foreground">{$_('projectUsers.loadingUsers')}</p>
      </div>
    {:else if error}
      <div class="py-6 text-center text-destructive">
        <p>{$_('projectUsers.errorLoading', { values: { error } })}</p>
      </div>
    {:else if users.length === 0}
      <div class="py-6 text-center text-muted-foreground">
        {$_('projectUsers.noUsersFound')}
      </div>
    {:else}
      <div class="max-h-[60vh] overflow-y-auto pr-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{$_('projectUsers.name')}</TableHead>
              <TableHead>{$_('projectUsers.email')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each users as user (user.id)}
              <TableRow>
                <TableCell class="font-medium">
                  {user.firstName || ""}
                  {user.lastName || ""}
                </TableCell>
                <TableCell>{user.email}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}

    <Dialog.Footer>
      <Button variant="outline" onclick={onClose}>{$_('projectUsers.close')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

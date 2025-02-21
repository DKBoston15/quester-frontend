<!-- src/lib/components/InviteUserForm.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import type { Organization, Department, Project } from "$lib/types/auth";

  const props = $props<{
    organization: Organization;
    departments?: Department[];
    projects?: Project[];
  }>();

  let email = $state("");
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);

  type AccessItem = { id: string; roleId: string };
  let selectedDepartments = $state<Record<string, AccessItem>>({});
  let selectedProjects = $state<Record<string, AccessItem>>({});
  let organizationRoleId = $state("");

  function handleCheckedChange(
    id: string,
    type: "department" | "project",
    checked: boolean
  ) {
    if (type === "department") {
      if (checked) {
        selectedDepartments[id] = { id, roleId: "" };
      } else {
        delete selectedDepartments[id];
      }
    } else {
      if (checked) {
        selectedProjects[id] = { id, roleId: "" };
      } else {
        delete selectedProjects[id];
      }
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!email || !organizationRoleId) return;

    isLoading = true;
    error = null;
    success = null;

    try {
      const response = await fetch("http://localhost:3333/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          organizationId: props.organization.id,
          organizationRoleId,
          departments: Object.values(selectedDepartments),
          projects: Object.values(selectedProjects),
        }),
      });

      if (!response.ok) throw new Error("Failed to send invitation");

      success = "Invitation sent successfully!";
      email = "";
      selectedDepartments = {};
      selectedProjects = {};
      organizationRoleId = "";
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to send invitation";
    } finally {
      isLoading = false;
    }
  }
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    handleSubmit(e);
  }}
  class="space-y-4"
>
  <div class="space-y-2">
    <Label for="email">Email Address</Label>
    <Input
      id="email"
      type="email"
      placeholder="user@example.com"
      bind:value={email}
      required
    />
  </div>

  <div class="space-y-2">
    <Label>Organization Role</Label>
    <select
      bind:value={organizationRoleId}
      class="w-full rounded border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
      required
    >
      <option value="">Select role...</option>
      <option value="Admin">Admin</option>
      <option value="Member">Member</option>
    </select>
  </div>

  {#if props.departments?.length}
    <div class="space-y-2">
      <Label>Departments</Label>
      <div class="space-y-2">
        {#each props.departments as dept}
          <div class="flex items-center gap-4">
            <Checkbox
              id={`dept-${dept.id}`}
              onCheckedChange={(checked) =>
                handleCheckedChange(dept.id, "department", checked)}
            />
            <Label for={`dept-${dept.id}`}>{dept.name}</Label>

            {#if selectedDepartments[dept.id]}
              <select
                class="rounded border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
                bind:value={selectedDepartments[dept.id].roleId}
              >
                <option value="">Select role...</option>
                <option value="Admin">Admin</option>
                <option value="Member">Member</option>
              </select>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if props.projects?.length}
    <div class="space-y-2">
      <Label>Projects</Label>
      <div class="space-y-2">
        {#each props.projects as project}
          <div class="flex items-center gap-4">
            <Checkbox
              id={`project-${project.id}`}
              onCheckedChange={(checked) =>
                handleCheckedChange(project.id, "project", checked)}
            />
            <Label for={`project-${project.id}`}>{project.name}</Label>

            {#if selectedProjects[project.id]}
              <select
                class="rounded border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent-blue"
                bind:value={selectedProjects[project.id].roleId}
              >
                <option value="">Select role...</option>
                <option value="Admin">Admin</option>
                <option value="Member">Member</option>
              </select>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if error}
    <div class="text-red-500 text-sm">{error}</div>
  {/if}
  {#if success}
    <div class="text-green-500 text-sm">{success}</div>
  {/if}

  <Button type="submit" disabled={isLoading} class="w-full">
    {isLoading ? "Sending..." : "Send Invitation"}
  </Button>
</form>

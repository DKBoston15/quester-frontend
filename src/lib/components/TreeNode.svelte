<!-- TreeNode.svelte -->
<script lang="ts">
  import {
    ChevronRight,
    Plus,
    Building2,
    FolderKanban,
    FileText,
    UserPlus,
    FolderTree,
    MoreVertical,
    FolderInput,
  } from "lucide-svelte";
  import type { Organization, Department, Project } from "$lib/types/auth";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import {
    departmentUpdated,
    notifyDepartmentUpdate,
  } from "$lib/stores/DepartmentStore.svelte";
  import { navigate } from "svelte-routing";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import Self from "./TreeNode.svelte";
  import { onMount } from "svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Label } from "$lib/components/ui/label";

  const props = $props<{
    item: Organization | Department | Project;
    level?: number;
    expanded?: boolean;
    parentOrg?: Organization | null;
    onSelect?: (item: Organization | Department | Project) => void;
  }>();

  let departments = $state<Department[]>([]);
  let projects = $state<Project[]>([]);
  let isLoading = $state(false);
  let isJoining = $state<Record<string, boolean>>({});
  let joinError = $state<Record<string, string>>({});
  let isExpanded = $state(props.expanded || true);
  let showNewProjectForm = $state(false);
  let showNewDepartmentForm = $state(false);
  let newProjectName = $state("");
  let newDepartmentName = $state("");
  let prevItemId = $state<string | null>(null);
  let canCreateProject = $state(false);
  let canCreateDepartment = $state(false);
  let isCreatingDepartment = $state(false);
  let lastUpdateCount = $state(0);

  // For moving projects
  let showMoveDialog = $state(false);
  let projectToMove = $state<Project | null>(null);
  let selectedDepartmentId = $state<string | null>(null);
  let allDepartments = $state<Department[]>([]);
  let isMovingProject = $state(false);
  let moveError = $state<string | null>(null);

  // This will only run once on mount and set up the subscription
  onMount(() => {
    // Set up a manual subscription to the store
    const unsubscribe = departmentUpdated.subscribe((value) => {
      // Only reload if the value changed since our last update
      if (value !== lastUpdateCount && isOrganization(props.item)) {
        lastUpdateCount = value;
        // Call loadChildren, but not from within an effect to avoid infinite loops
        loadChildren();
      }
    });

    // Load all departments for the org when mounted
    if (isOrganization(props.item)) {
      loadAllDepartments();
    }

    // Clean up subscription
    return unsubscribe;
  });

  $effect(() => {
    if (!props.item) return;

    const itemId = props.item.id;
    if (itemId === prevItemId) return;

    prevItemId = itemId;
    departments = [];
    projects = [];
    isLoading = false;

    if (isExpanded) {
      loadChildren();
      checkSubscription();

      // Load all departments if this is an organization
      if (isOrganization(props.item)) {
        loadAllDepartments();
      }
    }
  });

  // Function to load all departments for the organization
  async function loadAllDepartments() {
    if (!auth.user) return;

    const org = isOrganization(props.item) ? props.item : props.parentOrg;

    if (!org) return;

    try {
      // Use the departments/by-user endpoint which is available according to routes
      const response = await fetch(
        `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to load departments");
      }

      const data = await response.json();
      // Filter departments to only include those from the current organization
      allDepartments = data.data.filter(
        (d: Department) => d.organizationId === org.id
      );
    } catch (error) {
      console.error("Failed to load all departments:", error);
    }
  }

  // Function to open the move project dialog
  function openMoveDialog(project: Project, event: MouseEvent) {
    event.stopPropagation();
    projectToMove = project;
    selectedDepartmentId = project.departmentId || null;
    showMoveDialog = true;
    moveError = null;

    // Ensure we have the latest departments when opening the dialog
    loadAllDepartments();
  }

  // Function to close the move dialog
  function closeMoveDialog() {
    showMoveDialog = false;
    projectToMove = null;
    selectedDepartmentId = null;
    moveError = null;
  }

  // Function to move a project to a different department
  async function moveProject() {
    if (!projectToMove) return;

    isMovingProject = true;
    moveError = null;

    try {
      // Get the team-management API resources to update the tree view
      const resourcesBeforeUpdate = await fetch(
        `http://localhost:3333/team-management/resources`,
        { credentials: "include" }
      );

      // Use the projects update endpoint from the routes
      const response = await fetch(
        `http://localhost:3333/projects/${projectToMove.id}`,
        {
          method: "PUT", // Use PUT instead of PATCH based on API routes
          headers: {
            "Content-Type": "application/json",
            // Add explicit CORS headers to request
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            departmentId: selectedDepartmentId || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to move project");
      }

      // Close the dialog
      showMoveDialog = false;

      // Refresh the tree to show the changes
      notifyDepartmentUpdate();

      // If we're in a department view, reload the children
      if (isDepartment(props.item)) {
        await loadChildren();
      }
    } catch (error) {
      console.error("Failed to move project:", error);
      moveError =
        error instanceof Error ? error.message : "Failed to move project";
    } finally {
      isMovingProject = false;
    }
  }

  async function checkSubscription() {
    const org =
      props.parentOrg || (isOrganization(props.item) ? props.item : null);
    if (!org) return;

    try {
      const subscription = org.subscription;
      if (!subscription) {
        // Default to allowing department creation even without subscription data
        canCreateProject = false;
        canCreateDepartment = true;
        return;
      }

      const projectCount = projects.length;
      // If there's no project limit or we're under the limit, allow project creation
      canCreateProject =
        subscription.status === "active" &&
        (!subscription.seatsCount || projectCount < subscription.seatsCount);

      // Allow department creation for all active subscriptions
      canCreateDepartment = subscription.status === "active";
    } catch (error) {
      console.error("Failed to check subscription:", error);
      canCreateProject = false;
      // Default to true for department creation even on errors
      canCreateDepartment = true;
    }
  }

  function isOrganization(item: any): item is Organization {
    return "slug" in item;
  }

  function isDepartment(item: any): item is Department {
    return "organizationId" in item && !("projectRoles" in item);
  }

  // Check if the current user is a direct member of the project
  function isUserDirectMember(project: Project): boolean {
    if (!auth.user) return false;

    // If the project has a projectRoles array with an entry for this user, they're a direct member
    if (project.projectRoles && Array.isArray(project.projectRoles)) {
      return project.projectRoles.some(
        (role: any) => role.userId === auth.user?.id
      );
    }

    // Fallback: check if user is in the users array
    if (project.users && Array.isArray(project.users)) {
      return project.users.some((user: any) => user.id === auth.user?.id);
    }

    return false;
  }

  function handleProjectClick(project: Project) {
    if (!isUserDirectMember(project)) return;
    navigate(`/project/${project.id}`);
  }

  async function createProject(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (!newProjectName || !auth.user) return;

    const org =
      props.parentOrg || (isOrganization(props.item) ? props.item : null);
    if (!org) return;

    try {
      const response = await fetch(
        "http://localhost:3333/projects/createProjectWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newProjectName,
            organizationId: org.id,
            departmentId: isDepartment(props.item) ? props.item.id : null,
            userId: auth.user.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create project");

      const data = await response.json();
      newProjectName = "";
      showNewProjectForm = false;

      // Refresh the projects list
      await loadChildren();

      // Navigate to the new project using its ID
      navigate(`/project/${data.project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  }

  async function createDepartment(e: Event) {
    e.preventDefault();
    if (!newDepartmentName || !auth.user) return;

    const org =
      props.parentOrg || (isOrganization(props.item) ? props.item : null);
    if (!org) return;

    isCreatingDepartment = true;

    try {
      const response = await fetch(
        "http://localhost:3333/departments/createDepartmentWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newDepartmentName,
            organizationId: org.id,
            userId: auth.user.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create department");

      const data = await response.json();
      newDepartmentName = "";
      showNewDepartmentForm = false;

      // Refresh the departments list
      await loadChildren();

      // Notify other components about the department update
      notifyDepartmentUpdate();
    } catch (error) {
      console.error("Failed to create department:", error);
    } finally {
      isCreatingDepartment = false;
    }
  }

  async function loadChildren() {
    if (!props.item || isLoading || !auth.user) return;
    isLoading = true;

    try {
      if (isOrganization(props.item)) {
        // Load departments for this organization
        const deptResponse = await fetch(
          `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
          { credentials: "include" }
        );
        const deptData = await deptResponse.json();
        departments = deptData.data.filter(
          (d: Department) => d.organizationId === props.item.id
        );

        // Load all projects the user has access to (including through org admin role)
        const projectsResponse = await fetch(
          `http://localhost:3333/team-management/resources`,
          { credentials: "include" }
        );

        const teamManagementData = await projectsResponse.json();
        console.log(
          "TreeNode - Team Management Resources:",
          $state.snapshot(teamManagementData)
        );

        // Get all projects from the organization, regardless of department
        // (we'll filter department-specific projects out later)
        if (teamManagementData.projects?.length > 0) {
          projects = teamManagementData.projects.filter(
            (p: Project) =>
              p.organizationId === props.item.id && !p.departmentId // Only include projects not in a department here
          );
          console.log(
            "TreeNode - Projects for organization:",
            $state.snapshot(projects)
          );
        } else {
          // Fallback to the old method if team management API doesn't return projects
          const oldProjectsResponse = await fetch(
            `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
            { credentials: "include" }
          );
          const projectsData = await oldProjectsResponse.json();
          projects = projectsData.data.filter(
            (p: Project) =>
              p.organizationId === props.item.id && !p.departmentId
          );
        }
      } else if (isDepartment(props.item)) {
        // For departments, use the team management API first
        try {
          const teamManagementResponse = await fetch(
            `http://localhost:3333/team-management/resources`,
            { credentials: "include" }
          );

          const teamManagementData = await teamManagementResponse.json();

          // Filter projects for this specific department
          if (teamManagementData.projects?.length > 0) {
            projects = teamManagementData.projects.filter(
              (p: Project) => p.departmentId === props.item.id
            );
            console.log(
              "TreeNode - Projects for department:",
              $state.snapshot(projects)
            );
          } else {
            throw new Error("No projects in team management data"); // Trigger fallback
          }
        } catch (error) {
          console.log(
            "Falling back to projects/by-user for department projects"
          );
          // Fallback to direct project loading
          const projectsResponse = await fetch(
            `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
            { credentials: "include" }
          );
          const projectsData = await projectsResponse.json();
          projects = projectsData.data.filter(
            (p: Project) => p.departmentId === props.item.id
          );
        }
      }
    } catch (error) {
      console.error("Failed to load children:", error);
    } finally {
      isLoading = false;
    }
  }

  function toggleExpand(event: MouseEvent) {
    event.stopPropagation();
    isExpanded = !isExpanded;
    if (isExpanded && departments.length === 0 && projects.length === 0) {
      loadChildren();
    }
  }

  function toggleNewProjectForm(event: MouseEvent) {
    event.stopPropagation();
    showNewProjectForm = !showNewProjectForm;
    if (showNewDepartmentForm) showNewDepartmentForm = false;
  }

  function toggleNewDepartmentForm(event: MouseEvent) {
    event.stopPropagation();
    showNewDepartmentForm = !showNewDepartmentForm;
    if (showNewProjectForm) showNewProjectForm = false;
  }

  function handleSelect() {
    if (props.onSelect) {
      props.onSelect(props.item);
    }
  }

  async function joinProject(event: MouseEvent, project: Project) {
    event.stopPropagation();

    if (!auth.user) return;
    if (isUserDirectMember(project)) return;

    // Set the loading state for this specific project
    isJoining = { ...isJoining, [project.id]: true };
    joinError = { ...joinError, [project.id]: "" };

    try {
      const response = await fetch(
        `http://localhost:3333/team-management/project/${project.id}/self-assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ roleId: "member" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to join project");
      }

      console.log(`Successfully joined project: ${project.name}`);

      // Refresh the child data
      await loadChildren();
    } catch (error) {
      console.error("Error joining project:", error);
      joinError = {
        ...joinError,
        [project.id]: error instanceof Error ? error.message : "Failed to join",
      };
    } finally {
      isJoining = { ...isJoining, [project.id]: false };
    }
  }

  // For checking if user is a direct member of a department
  function isUserDirectDepartmentMember(department: Department): boolean {
    if (!auth.user) return false;

    // If the department has a departmentRoles array with an entry for this user, they're a direct member
    if (
      department.departmentRoles &&
      Array.isArray(department.departmentRoles)
    ) {
      return department.departmentRoles.some(
        (role: any) => role.userId === auth.user?.id
      );
    }

    return false;
  }

  async function joinDepartment(event: MouseEvent, department: Department) {
    event.stopPropagation();

    if (!auth.user) return;
    if (isUserDirectDepartmentMember(department)) return;

    // Set the loading state for this specific department
    isJoining = { ...isJoining, [department.id]: true };
    joinError = { ...joinError, [department.id]: "" };

    try {
      const response = await fetch(
        `http://localhost:3333/team-management/department/${department.id}/self-assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ roleId: "member" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to join department");
      }

      console.log(`Successfully joined department: ${department.name}`);

      // Refresh the child data
      await loadChildren();

      // Notify other components about the department update
      notifyDepartmentUpdate();
    } catch (error) {
      console.error("Error joining department:", error);
      joinError = {
        ...joinError,
        [department.id]:
          error instanceof Error ? error.message : "Failed to join",
      };
    } finally {
      isJoining = { ...isJoining, [department.id]: false };
    }
  }
</script>

<!-- Add the Dialog component for moving projects -->
<Dialog.Root bind:open={showMoveDialog}>
  <Dialog.Content class="max-w-md w-full mx-auto">
    <Dialog.Header>
      <Dialog.Title>Move Project</Dialog.Title>
      <Dialog.Description>
        Select a department to move the project to. Choose "No Department" to
        remove it from any department.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="department" class="text-right">Department</Label>
        <div class="col-span-3">
          <select
            id="department"
            class="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            bind:value={selectedDepartmentId}
          >
            <option value={null}>No Department</option>
            {#each allDepartments as dept}
              <option value={dept.id}>{dept.name}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if moveError}
        <p class="text-sm text-red-500">{moveError}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={closeMoveDialog}>Cancel</Button>
      <Button onclick={moveProject} disabled={isMovingProject}>
        {#if isMovingProject}
          <div
            class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
          ></div>
          Moving...
        {:else}
          Move Project
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<div
  role="button"
  tabindex="0"
  class={props.level === 0 ? "" : props.level === 1 ? "pl-6" : "pl-12"}
  onclick={handleSelect}
  onkeydown={handleSelect}
>
  <div
    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer group transition-colors"
  >
    <div class="flex items-center gap-2 flex-1">
      {#if isOrganization(props.item) || isDepartment(props.item)}
        <button
          class="p-1 hover:bg-accent hover:text-accent-foreground rounded-full transform transition-transform opacity-0 group-hover:opacity-100"
          class:rotate-90={isExpanded}
          class:opacity-100={isExpanded}
          onclick={toggleExpand}
          type="button"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      {:else}
        <div class="w-[32px]"></div>
      {/if}

      <span class="flex items-center gap-2">
        {#if isOrganization(props.item)}
          <Building2 class="h-4 w-4" />
        {:else if isDepartment(props.item)}
          <FolderKanban class="h-4 w-4" />
        {:else}
          <FileText class="h-4 w-4" />
        {/if}
        {props.item.name}
        {#if isDepartment(props.item) && !isUserDirectDepartmentMember(props.item)}
          <span
            class="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground"
          >
            Admin Access
          </span>
        {/if}
      </span>

      {#if isOrganization(props.item) && canCreateDepartment}
        <!-- Add department button for organizations -->
        <button
          class="p-1 hover:bg-accent hover:text-accent-foreground rounded-full opacity-0 group-hover:opacity-100 ml-2"
          onclick={toggleNewDepartmentForm}
          type="button"
          title="Create Department"
        >
          <FolderTree class="h-4 w-4" />
        </button>
      {/if}

      {#if (isOrganization(props.item) || isDepartment(props.item)) && canCreateProject}
        <!-- Add project button -->
        <button
          class="p-1 hover:bg-accent hover:text-accent-foreground rounded-full opacity-0 group-hover:opacity-100 ml-2"
          onclick={toggleNewProjectForm}
          type="button"
          title="Create Project"
        >
          <Plus class="h-4 w-4" />
        </button>
      {/if}

      {#if isDepartment(props.item) && !isUserDirectDepartmentMember(props.item)}
        <button
          class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 px-2 py-1"
          onclick={(e) => {
            e.stopPropagation();
            joinDepartment(e, props.item);
          }}
          disabled={isJoining[props.item.id]}
        >
          {#if isJoining[props.item.id]}
            <div
              class="h-3 w-3 border-t-2 border-primary animate-spin rounded-full"
            ></div>
            Joining...
          {:else}
            <UserPlus class="h-3 w-3" />
            Join Department
          {/if}
        </button>
      {/if}
    </div>
  </div>

  {#if showNewProjectForm}
    <div class="pl-9 pt-2" onclick={(e: MouseEvent) => e.stopPropagation()}>
      <form onsubmit={createProject} class="flex gap-2">
        <Input
          type="text"
          placeholder="New project name"
          bind:value={newProjectName}
          required
          class="text-sm"
          onclick={(e: MouseEvent) => e.stopPropagation()}
        />
        <Button
          type="submit"
          size="sm"
          onclick={(e: MouseEvent) => e.stopPropagation()}>Create</Button
        >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={(e: MouseEvent) => {
            e.stopPropagation();
            showNewProjectForm = false;
          }}
        >
          Cancel
        </Button>
      </form>
    </div>
  {/if}

  {#if showNewDepartmentForm}
    <div class="pl-9 pt-2" onclick={(e: MouseEvent) => e.stopPropagation()}>
      <form onsubmit={createDepartment} class="flex gap-2">
        <Input
          type="text"
          placeholder="New department name"
          bind:value={newDepartmentName}
          required
          class="text-sm"
          onclick={(e: MouseEvent) => e.stopPropagation()}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isCreatingDepartment}
          onclick={(e: MouseEvent) => e.stopPropagation()}
        >
          {#if isCreatingDepartment}
            <div
              class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
            ></div>
            Creating...
          {:else}
            Create
          {/if}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={(e: MouseEvent) => {
            e.stopPropagation();
            showNewDepartmentForm = false;
          }}
          disabled={isCreatingDepartment}
        >
          Cancel
        </Button>
      </form>
    </div>
  {/if}

  {#if isExpanded}
    {#if isLoading}
      <div class="pl-9 text-sm text-muted-foreground">Loading...</div>
    {:else}
      {#if departments.length > 0}
        <div class="pl-9">
          {#each departments as department}
            <Self
              item={department}
              level={props.level + 1}
              parentOrg={isOrganization(props.item)
                ? props.item
                : props.parentOrg}
              onSelect={(item) => {
                // Don't navigate to team management for departments
                if (props.onSelect && !isDepartment(item)) {
                  props.onSelect(item);
                }
              }}
            />
            {#if joinError[department.id]}
              <div class="pl-9 text-xs text-red-500 mt-1">
                {joinError[department.id]}
              </div>
            {/if}
          {/each}
        </div>
      {/if}

      {#if projects.length > 0}
        <div class="pl-9">
          {#each projects as project}
            <div
              role="button"
              tabindex="0"
              class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer transition-colors group"
              onclick={() => handleProjectClick(project)}
              onkeydown={() => handleProjectClick(project)}
            >
              <div class="w-[32px]"></div>
              <span class="flex items-center gap-2 flex-1">
                <FileText class="h-4 w-4" />
                {project.name}
                {#if !isUserDirectMember(project) && (!isDepartment(props.item) || !isUserDirectDepartmentMember(props.item))}
                  <span
                    class="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground"
                  >
                    Admin Access
                  </span>
                {/if}
              </span>

              <!-- Add dropdown menu -->
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <button
                    class="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-1 rounded-md hover:bg-muted"
                    onclick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Label>Actions</DropdownMenu.Label>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item>
                    <button
                      class="flex items-center w-full"
                      onclick={(e) => openMoveDialog(project, e)}
                    >
                      <FolderInput class="mr-2 h-4 w-4" />
                      <span>Move to Department</span>
                    </button>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>

              {#if !isUserDirectMember(project)}
                {#if isDepartment(props.item) && !isUserDirectDepartmentMember(props.item)}
                  <span
                    class="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-xs text-muted-foreground"
                  >
                    Join department to access project
                  </span>
                {:else}
                  <button
                    class="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1"
                    onclick={(e) => joinProject(e, project)}
                    disabled={isJoining[project.id]}
                  >
                    {#if isJoining[project.id]}
                      <div
                        class="h-3 w-3 border-t-2 border-primary animate-spin rounded-full"
                      ></div>
                      Joining...
                    {:else}
                      <UserPlus class="h-3 w-3" />
                      Join Project
                    {/if}
                  </button>
                {/if}
              {/if}
            </div>
            {#if joinError[project.id]}
              <div class="pl-9 text-xs text-red-500 mt-1">
                {joinError[project.id]}
              </div>
            {/if}
          {/each}
        </div>
      {/if}

      {#if departments.length === 0 && projects.length === 0}
        <div class="pl-9 text-sm text-muted-foreground">No items</div>
      {/if}
    {/if}
  {/if}
</div>

<!-- src/lib/components/OrganizationStructure.svelte -->
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
    Search,
    ListFilter,
    LayoutGrid,
    LayoutList,
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
  import { Toggle } from "$lib/components/ui/toggle";
  import { Label } from "$lib/components/ui/label";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import TreeNode from "./TreeNodeItem.svelte";

  // Props
  const props = $props<{
    initialOrganization?: Organization;
  }>();

  // Component state
  let viewMode = $state<"tree" | "list">("tree");
  let organizations = $state<Organization[]>([]);
  let departments = $state<Department[]>([]);
  let projects = $state<Project[]>([]);
  let flatProjects = $state<Project[]>([]);
  let searchQuery = $state("");
  let filteredProjects = $state<Project[]>([]);
  let showMyProjectsOnly = $state(false);
  let isLoading = $state(true);
  let selectedOrganization = $state<Organization | null>(null);

  // Dialog states
  let showNewProjectDialog = $state(false);
  let showNewDepartmentDialog = $state(false);
  let showMoveProjectDialog = $state(false);

  // Form states
  let newProjectName = $state("");
  let newProjectDescription = $state("");
  let newDepartmentName = $state("");
  let newDepartmentDescription = $state("");
  let selectedDepartmentId = $state<string | null>(null);
  let projectToMove = $state<Project | null>(null);

  // Operation states
  let isCreatingProject = $state(false);
  let isCreatingDepartment = $state(false);
  let isMovingProject = $state(false);
  let errorMessage = $state<string | null>(null);

  // Initialize component
  $effect(() => {
    loadData();

    // Subscribe to department updates
    const unsubscribe = departmentUpdated.subscribe(() => {
      loadData();
    });

    return unsubscribe;
  });

  $effect(() => {
    // Set initial organization if provided
    if (props.initialOrganization) {
      selectedOrganization = props.initialOrganization;
    } else if (auth.currentOrganization) {
      selectedOrganization = auth.currentOrganization;
    } else if (organizations.length > 0) {
      selectedOrganization = organizations[0];
    }
  });

  // Computed values for filtering projects
  $effect(() => {
    // Filter the flattened list of projects based on search and filter options
    if (!flatProjects.length) {
      filteredProjects = [];
      return;
    }

    let filtered = [...flatProjects];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.name?.toLowerCase().includes(query) ||
          (project.description &&
            project.description.toLowerCase().includes(query))
      );
    }

    // Apply my projects filter
    if (showMyProjectsOnly && auth.user) {
      filtered = filtered.filter(
        (project) =>
          project.projectRoles?.some(
            (role) => String(role.userId) === String(auth.user?.id)
          ) ||
          project.users?.some(
            (user) => String(user.id) === String(auth.user?.id)
          )
      );
    }

    // Update the filtered projects list
    filteredProjects = filtered;
  });

  // Load all data needed for the component
  async function loadData() {
    if (!auth.user) return;

    isLoading = true;
    errorMessage = null;

    try {
      // Load organizations
      const orgsResponse = await fetch(
        `http://localhost:3333/organizations/by-user?userId=${auth.user.id}`,
        { credentials: "include" }
      );

      if (!orgsResponse.ok) {
        throw new Error("Failed to load organizations");
      }

      const orgsData = await orgsResponse.json();
      organizations = orgsData.data;

      // Load departments and projects using team management API
      const resourcesResponse = await fetch(
        `http://localhost:3333/team-management/resources`,
        { credentials: "include" }
      );

      if (!resourcesResponse.ok) {
        throw new Error("Failed to load team resources");
      }

      const teamResources = await resourcesResponse.json();

      if (teamResources.departments) {
        departments = teamResources.departments;
      }

      if (teamResources.projects) {
        projects = teamResources.projects;
        flatProjects = teamResources.projects;
      }

      // Fall back to individual API calls if team management API doesn't return data
      if (!teamResources.departments?.length) {
        const deptsResponse = await fetch(
          `http://localhost:3333/departments/by-user?userId=${auth.user.id}`,
          { credentials: "include" }
        );

        if (deptsResponse.ok) {
          const deptsData = await deptsResponse.json();
          departments = deptsData.data;
        }
      }

      if (!teamResources.projects?.length) {
        const projectsResponse = await fetch(
          `http://localhost:3333/projects/by-user?userId=${auth.user.id}`,
          { credentials: "include" }
        );

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          projects = projectsData.data;
          flatProjects = projectsData.data;
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      errorMessage =
        error instanceof Error ? error.message : "Failed to load data";
    } finally {
      isLoading = false;
    }
  }

  // Create a new project
  async function createProject() {
    if (!selectedOrganization || !newProjectName || !auth.user) return;

    isCreatingProject = true;
    errorMessage = null;

    try {
      const response = await fetch(
        "http://localhost:3333/projects/createProjectWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newProjectName,
            description: newProjectDescription,
            organizationId: selectedOrganization.id,
            departmentId: selectedDepartmentId,
            userId: auth.user.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create project");
      }

      const data = await response.json();

      // Reset form and close dialog
      newProjectName = "";
      newProjectDescription = "";
      selectedDepartmentId = null;
      showNewProjectDialog = false;

      // Refresh data
      await loadData();

      // Navigate to the new project
      navigate(`/project/${data.project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      errorMessage =
        error instanceof Error ? error.message : "Failed to create project";
    } finally {
      isCreatingProject = false;
    }
  }

  // Create a new department
  async function createDepartment() {
    if (!selectedOrganization || !newDepartmentName || !auth.user) return;

    isCreatingDepartment = true;
    errorMessage = null;

    try {
      const response = await fetch(
        "http://localhost:3333/departments/createDepartmentWithUser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newDepartmentName,
            description: newDepartmentDescription,
            organizationId: selectedOrganization.id,
            userId: auth.user.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create department");
      }

      // Reset form and close dialog
      newDepartmentName = "";
      newDepartmentDescription = "";
      showNewDepartmentDialog = false;

      // Refresh data and notify other components
      await loadData();
      notifyDepartmentUpdate();
    } catch (error) {
      console.error("Failed to create department:", error);
      errorMessage =
        error instanceof Error ? error.message : "Failed to create department";
    } finally {
      isCreatingDepartment = false;
    }
  }

  // Move a project to a different department
  async function moveProject() {
    if (!projectToMove) return;

    isMovingProject = true;
    errorMessage = null;

    try {
      const response = await fetch(
        `http://localhost:3333/projects/${projectToMove.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
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

      // Reset form and close dialog
      projectToMove = null;
      selectedDepartmentId = null;
      showMoveProjectDialog = false;

      // Refresh data and notify other components
      await loadData();
      notifyDepartmentUpdate();
    } catch (error) {
      console.error("Failed to move project:", error);
      errorMessage =
        error instanceof Error ? error.message : "Failed to move project";
    } finally {
      isMovingProject = false;
    }
  }

  // Open the move project dialog
  function openMoveProjectDialog(project: Project) {
    projectToMove = project;
    selectedDepartmentId = project.departmentId || null;
    showMoveProjectDialog = true;
    errorMessage = null;
  }

  // Join a project (self-assign)
  async function joinProject(project: Project) {
    if (!auth.user) return;

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

      // Refresh data
      await loadData();
    } catch (error) {
      console.error("Error joining project:", error);
      errorMessage =
        error instanceof Error ? error.message : "Failed to join project";
    }
  }

  // Join a department (self-assign)
  async function joinDepartment(department: Department) {
    if (!auth.user) return;

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

      // Refresh data and notify other components
      await loadData();
      notifyDepartmentUpdate();
    } catch (error) {
      console.error("Error joining department:", error);
      errorMessage =
        error instanceof Error ? error.message : "Failed to join department";
    }
  }

  // Check if user is a direct member of a project
  function isUserProjectMember(project: Project): boolean {
    if (!auth.user) return false;

    // Check project roles
    if (project.projectRoles && Array.isArray(project.projectRoles)) {
      return project.projectRoles.some(
        (role) => role.userId.toString() === auth.user?.id.toString()
      );
    }

    // Check users array as fallback
    if (project.users && Array.isArray(project.users)) {
      return project.users.some(
        (user) => user.id.toString() === auth.user?.id.toString()
      );
    }

    return false;
  }

  // Check if user is a direct member of a department
  function isUserDepartmentMember(department: Department): boolean {
    if (!auth.user) return false;

    // Check department roles
    if (
      department.departmentRoles &&
      Array.isArray(department.departmentRoles)
    ) {
      return department.departmentRoles.some(
        (role) => role.userId.toString() === auth.user?.id.toString()
      );
    }

    return false;
  }

  // Get a flattened map of departments by ID for quick lookups
  $effect(() => {
    departmentsMap = departments.reduce((acc, dept) => {
      acc.set(dept.id, dept);
      return acc;
    }, new Map<string, Department>());
  });

  let departmentsMap = $state<Map<string, Department>>(new Map());

  // Determine if the user can create projects or departments
  function canCreateProject(orgId: string): boolean {
    const org = organizations.find((o) => o.id === orgId);
    if (!org || !org.subscription) return false;

    return org.subscription.status === "active";
  }

  function canCreateDepartment(orgId: string): boolean {
    const org = organizations.find((o) => o.id === orgId);
    if (!org || !org.subscription) return false;

    return org.subscription.status === "active";
  }

  // Handle toggle change
  function handleToggleChange(value: boolean): void {
    showMyProjectsOnly = value;
  }

  // Check if a department has any projects that match the current filters
  function filterHasMatchingProjects(departmentId: string): boolean {
    return filteredProjects.some((p) => p.departmentId === departmentId);
  }
</script>

<!-- Create Project Dialog -->
<Dialog.Root bind:open={showNewProjectDialog}>
  <Dialog.Content class="max-w-md w-full mx-auto">
    <Dialog.Header>
      <Dialog.Title>Create New Project</Dialog.Title>
      <Dialog.Description>
        Create a new project in {selectedOrganization?.name ||
          "your organization"}.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="projectName" class="text-right">Name</Label>
        <Input
          id="projectName"
          class="col-span-3"
          bind:value={newProjectName}
          placeholder="Enter project name"
          required
        />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="projectDescription" class="text-right">Description</Label>
        <Input
          id="projectDescription"
          class="col-span-3"
          bind:value={newProjectDescription}
          placeholder="Enter project description (optional)"
        />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="department" class="text-right">Department</Label>
        <div class="col-span-3">
          <select
            id="department"
            class="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            bind:value={selectedDepartmentId}
          >
            <option value={null}>No Department</option>
            {#each departments.filter((d) => d.organizationId === selectedOrganization?.id) as dept}
              <option value={dept.id}>{dept.name}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if errorMessage}
        <p class="text-sm text-destructive">{errorMessage}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showNewProjectDialog = false)}
        >Cancel</Button
      >
      <Button
        onclick={createProject}
        disabled={isCreatingProject || !newProjectName}
      >
        {#if isCreatingProject}
          <div
            class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
          ></div>
          Creating...
        {:else}
          Create Project
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Create Department Dialog -->
<Dialog.Root bind:open={showNewDepartmentDialog}>
  <Dialog.Content class="max-w-md w-full mx-auto">
    <Dialog.Header>
      <Dialog.Title>Create New Department</Dialog.Title>
      <Dialog.Description>
        Create a new department in {selectedOrganization?.name ||
          "your organization"}.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="departmentName" class="text-right">Name</Label>
        <Input
          id="departmentName"
          class="col-span-3"
          bind:value={newDepartmentName}
          placeholder="Enter department name"
          required
        />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="departmentDescription" class="text-right">Description</Label
        >
        <Input
          id="departmentDescription"
          class="col-span-3"
          bind:value={newDepartmentDescription}
          placeholder="Enter department description (optional)"
        />
      </div>

      {#if errorMessage}
        <p class="text-sm text-destructive">{errorMessage}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => (showNewDepartmentDialog = false)}>Cancel</Button
      >
      <Button
        onclick={createDepartment}
        disabled={isCreatingDepartment || !newDepartmentName}
      >
        {#if isCreatingDepartment}
          <div
            class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
          ></div>
          Creating...
        {:else}
          Create Department
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Move Project Dialog -->
<Dialog.Root bind:open={showMoveProjectDialog}>
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
        <Label for="moveDepartment" class="text-right">Department</Label>
        <div class="col-span-3">
          <select
            id="moveDepartment"
            class="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            bind:value={selectedDepartmentId}
          >
            <option value={null}>No Department</option>
            {#each departments.filter((d) => d.organizationId === projectToMove?.organizationId) as dept}
              <option value={dept.id}>{dept.name}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if errorMessage}
        <p class="text-sm text-destructive">{errorMessage}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showMoveProjectDialog = false)}
        >Cancel</Button
      >
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

<div class="w-full">
  <!-- Header with title and view options -->
  <div class="mb-4 border-b flex justify-between items-center">
    <Tabs.Root value={viewMode} class="w-auto">
      <Tabs.List>
        <Tabs.Trigger value="tree" onclick={() => (viewMode = "tree")}>
          <LayoutGrid class="h-4 w-4 mr-2" />
          Tree View
        </Tabs.Trigger>
        <Tabs.Trigger value="list" onclick={() => (viewMode = "list")}>
          <LayoutList class="h-4 w-4 mr-2" />
          List View
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    <!-- Action buttons -->
    <div class="flex gap-2">
      {#if selectedOrganization}
        {#if canCreateDepartment(selectedOrganization.id)}
          <Button
            variant="outline"
            size="sm"
            class="flex items-center gap-1"
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              showNewDepartmentDialog = true;
            }}
          >
            <FolderTree class="h-4 w-4" />
            New Department
          </Button>
        {/if}
        {#if canCreateProject(selectedOrganization.id)}
          <Button
            variant="default"
            size="sm"
            class="flex items-center gap-1"
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              selectedDepartmentId = null;
              showNewProjectDialog = true;
            }}
          >
            <Plus class="h-4 w-4" />
            New Project
          </Button>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Search Bar -->
  <div class="flex items-center mb-4">
    <div class="relative flex-1">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search projects..."
        bind:value={searchQuery}
        class="pl-9"
      />
    </div>

    <Toggle
      pressed={showMyProjectsOnly}
      onPressedChange={handleToggleChange}
      variant="outline"
      class="gap-1 ml-2"
    >
      <ListFilter class="h-4 w-4" />
      My Projects
    </Toggle>
  </div>

  <!-- Loading state -->
  {#if isLoading}
    <div class="flex justify-center items-center h-40">
      <div
        class="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"
      ></div>
    </div>
    <!-- Error state -->
  {:else if errorMessage}
    <div class="bg-destructive/10 text-destructive rounded-md p-4 mb-4">
      <p>{errorMessage}</p>
      <Button variant="outline" class="mt-2" onclick={loadData}>Retry</Button>
    </div>
    <!-- Empty state -->
  {:else if organizations.length === 0}
    <div class="bg-muted/30 rounded-md p-8 text-center border border-muted">
      <Building2 class="h-12 w-12 mx-auto mb-4 text-primary/40" />
      <h3 class="text-lg font-medium mb-2">No Organizations Found</h3>
      <p class="text-muted-foreground mb-4">
        You don't have access to any organizations yet.
      </p>
    </div>
    <!-- Content -->
  {:else}
    <!-- Tree View -->
    {#if viewMode === "tree"}
      <div class="border rounded-md overflow-hidden bg-background">
        {#each organizations as org}
          <div class="border-b last:border-0">
            <div
              class="flex items-center gap-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              onclick={() => (selectedOrganization = org)}
            >
              <Building2 class="h-5 w-5 text-muted-foreground" />
              <span class="font-medium">{org.name}</span>

              <div class="ml-auto flex gap-2">
                {#if canCreateDepartment(org.id)}
                  <Button
                    variant="outline"
                    size="sm"
                    class="flex items-center gap-1"
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      selectedOrganization = org;
                      showNewDepartmentDialog = true;
                    }}
                  >
                    <FolderTree class="h-4 w-4" />
                    New Department
                  </Button>
                {/if}

                {#if canCreateProject(org.id)}
                  <Button
                    variant="default"
                    size="sm"
                    class="flex items-center gap-1"
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      selectedOrganization = org;
                      selectedDepartmentId = null;
                      showNewProjectDialog = true;
                    }}
                  >
                    <Plus class="h-4 w-4" />
                    New Project
                  </Button>
                {/if}
              </div>
            </div>

            <div class="ml-4 border-l pl-4 pb-2">
              <!-- Calculate filtered departments (only show departments with matching projects if search is active) -->
              {#if searchQuery || showMyProjectsOnly}
                <!-- For each department, check if it has any projects that match the current filters -->
                {#each departments.filter((d) => d.organizationId === org.id && filterHasMatchingProjects(d.id)) as department}
                  <TreeNode
                    item={department}
                    depth={1}
                    onNewProject={() => {
                      selectedOrganization = org;
                      selectedDepartmentId = department.id;
                      showNewProjectDialog = true;
                    }}
                    onJoinDepartment={() => joinDepartment(department)}
                    onMoveProject={(p: Project) => openMoveProjectDialog(p)}
                    isUserMember={isUserDepartmentMember(department)}
                    filteredProjects={filteredProjects.filter(
                      (p) => p.departmentId === department.id
                    )}
                    isFiltering={true}
                  />
                {/each}

                <!-- Direct Projects (no department) that match the filter -->
                {#each filteredProjects.filter((p) => p.organizationId === org.id && !p.departmentId) as project}
                  <div
                    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer ml-2 my-1 transition-colors"
                  >
                    <FileText class="h-4 w-4 text-primary" />
                    <span>{project.name}</span>

                    <div class="ml-auto flex gap-2">
                      {#if !isUserProjectMember(project)}
                        <Button
                          variant="outline"
                          size="sm"
                          class="flex items-center gap-1"
                          onclick={(e: MouseEvent) => {
                            e.stopPropagation();
                            joinProject(project);
                          }}
                        >
                          <UserPlus class="h-3 w-3" />
                          Join
                        </Button>
                      {:else}
                        <Badge
                          variant="outline"
                          class="bg-primary/10 text-primary">Member</Badge
                        >
                      {/if}

                      <Button
                        variant="ghost"
                        size="sm"
                        class="flex items-center gap-1"
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                          openMoveProjectDialog(project);
                        }}
                      >
                        <FolderInput class="h-4 w-4" />
                        Move
                      </Button>
                    </div>
                  </div>
                {/each}

                <!-- No results message when filtering -->
                {#if (searchQuery || showMyProjectsOnly) && filteredProjects.filter((p) => p.organizationId === org.id).length === 0 && departments.filter((d) => d.organizationId === org.id && filterHasMatchingProjects(d.id)).length === 0}
                  <div
                    class="text-sm text-muted-foreground py-4 px-6 bg-muted/50 rounded-md m-3 border border-muted"
                  >
                    {#if searchQuery}
                      <div class="font-medium text-foreground">
                        No projects match "{searchQuery}"
                      </div>
                      <p class="mt-1">
                        Try using different keywords or clearing your search
                      </p>
                    {:else if showMyProjectsOnly}
                      <div class="font-medium text-foreground">
                        You're not a member of any projects
                      </div>
                      <p class="mt-1">
                        Try disabling the "My Projects" filter to see all
                        projects
                      </p>
                    {:else}
                      No projects found
                    {/if}
                    <Button
                      variant="outline"
                      size="sm"
                      class="mt-3"
                      onclick={() => {
                        searchQuery = "";
                        showMyProjectsOnly = false;
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                {/if}
              {:else}
                <!-- Standard view (no filtering) -->
                {#each departments.filter((d) => d.organizationId === org.id) as department}
                  <TreeNode
                    item={department}
                    depth={1}
                    onNewProject={() => {
                      selectedOrganization = org;
                      selectedDepartmentId = department.id;
                      showNewProjectDialog = true;
                    }}
                    onJoinDepartment={() => joinDepartment(department)}
                    onMoveProject={(p: Project) => openMoveProjectDialog(p)}
                    isUserMember={isUserDepartmentMember(department)}
                    isFiltering={false}
                  />
                {/each}

                <!-- Direct Projects (no department) -->
                {#each projects.filter((p) => p.organizationId === org.id && !p.departmentId) as project}
                  <div
                    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer ml-2 my-1 transition-colors"
                  >
                    <FileText class="h-4 w-4 text-primary" />
                    <span>{project.name}</span>

                    <div class="ml-auto flex gap-2">
                      {#if !isUserProjectMember(project)}
                        <Button
                          variant="outline"
                          size="sm"
                          class="flex items-center gap-1"
                          onclick={(e: MouseEvent) => {
                            e.stopPropagation();
                            joinProject(project);
                          }}
                        >
                          <UserPlus class="h-3 w-3" />
                          Join
                        </Button>
                      {:else}
                        <Badge
                          variant="outline"
                          class="bg-primary/10 text-primary">Member</Badge
                        >
                      {/if}

                      <Button
                        variant="ghost"
                        size="sm"
                        class="flex items-center gap-1"
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                          openMoveProjectDialog(project);
                        }}
                      >
                        <FolderInput class="h-4 w-4" />
                        Move
                      </Button>
                    </div>
                  </div>
                {/each}

                <!-- No items message -->
                {#if departments.filter((d) => d.organizationId === org.id).length === 0 && projects.filter((p) => p.organizationId === org.id && !p.departmentId).length === 0}
                  <div class="text-sm text-muted-foreground py-2 px-4">
                    No departments or projects
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
      <!-- List View -->
    {:else}
      <div class="border rounded-md overflow-hidden bg-background">
        <!-- Header -->
        <div
          class="bg-muted/70 px-4 py-2 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center font-medium text-sm border-b"
        >
          <span>Project</span>
          <span>Department</span>
          <span>Organization</span>
          <span>Actions</span>
        </div>

        <!-- Project items -->
        {#if filteredProjects.length > 0}
          {#each filteredProjects as project}
            <div
              class="px-4 py-3 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center border-t hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              onclick={() => {
                if (isUserProjectMember(project)) {
                  navigate(`/project/${project.id}`);
                }
              }}
            >
              <!-- Project name -->
              <div class="flex items-center gap-2 min-w-[200px]">
                <FileText class="h-4 w-4 text-primary" />
                <span class="font-medium">{project.name}</span>
                {#if project.description}
                  <span
                    class="text-xs text-muted-foreground truncate max-w-[200px]"
                  >
                    {project.description}
                  </span>
                {/if}
              </div>

              <!-- Department -->
              <div>
                {#if project.departmentId && departmentsMap.has(project.departmentId)}
                  <div class="flex items-center gap-1">
                    <FolderKanban class="h-4 w-4 text-amber-500" />
                    <span
                      >{departmentsMap.get(project.departmentId)?.name ||
                        "Unknown"}</span
                    >
                  </div>
                {:else}
                  <span class="text-muted-foreground text-sm"
                    >No department</span
                  >
                {/if}
              </div>

              <!-- Organization -->
              <div class="flex items-center gap-1">
                <Building2 class="h-4 w-4 text-muted-foreground" />
                <span
                  >{organizations.find((o) => o.id === project.organizationId)
                    ?.name || "Unknown"}</span
                >
              </div>

              <!-- Actions -->
              <div class="flex gap-2 min-w-[120px]">
                {#if !isUserProjectMember(project)}
                  <Button
                    variant="outline"
                    size="sm"
                    class="flex items-center gap-1"
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      joinProject(project);
                    }}
                  >
                    <UserPlus class="h-3 w-3" />
                    Join
                  </Button>
                {:else}
                  <Badge variant="outline" class="bg-primary/10 text-primary"
                    >Member</Badge
                  >
                {/if}

                <Button
                  variant="ghost"
                  size="sm"
                  class="flex items-center gap-1"
                  onclick={(e: MouseEvent) => {
                    e.stopPropagation();
                    openMoveProjectDialog(project);
                  }}
                >
                  <FolderInput class="h-4 w-4" />
                  Move
                </Button>
              </div>
            </div>
          {/each}
          <!-- No results state -->
        {:else}
          <div
            class="p-8 text-center bg-muted/30 border border-muted rounded-md m-3"
          >
            <Search class="h-12 w-12 mx-auto mb-4 text-primary/40" />
            <h3 class="text-lg font-medium mb-2">No Projects Found</h3>
            <p class="text-muted-foreground mb-4">
              {#if searchQuery}
                No projects match your search query.
              {:else if showMyProjectsOnly}
                You are not a member of any projects.
              {:else}
                No projects are available.
              {/if}
            </p>
            <Button
              variant="outline"
              onclick={() => {
                searchQuery = "";
                showMyProjectsOnly = false;
              }}
            >
              Clear Filters
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

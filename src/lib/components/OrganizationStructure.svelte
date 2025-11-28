<script lang="ts">
  import {
    Plus,
    Building2,
    FileText,
    UserPlus,
    FolderTree,
    FolderInput,
    Search,
    ListFilter,
    LayoutGrid,
    LayoutList,
  } from "lucide-svelte";
  import type { Organization, Department, Project } from "$lib/types/auth";
  import { auth } from "$lib/stores/AuthStore";
  import {
    departmentUpdated,
    notifyDepartmentUpdate,
  } from "$lib/stores/DepartmentStore";
  import { navigate } from "svelte-routing";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Toggle } from "$lib/components/ui/toggle";
  import { Label } from "$lib/components/ui/label";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import TreeNode from "./TreeNodeItem.svelte";
  import { api } from "$lib/services/api-client";
  import { teamManagement } from "$lib/stores/TeamManagementStore";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";
  import "driver.js/dist/driver.css";

  // Helper for imperative translation access
  const t = (key: string) => get(_)(key);

  // Props
  const props = $props<{
    initialOrganization?: Organization;
  }>();

  // Component state
  let viewMode = $state<"tree" | "list">("tree");
  let organizations = $state<Organization[]>([]);
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

  // State for project creation capability check
  let projectCreationCapabilities = $state<
    Record<string, { allowed: boolean; message?: string }>
  >({});

  // State for department creation capability check
  let departmentCreationCapabilities = $state<
    Record<string, { allowed: boolean; message?: string }>
  >({});

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
    const storeProjects = teamManagement.userResources?.projects || [];
    if (!storeProjects.length) {
      filteredProjects = [];
      return;
    }

    let filtered = [...storeProjects];

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
            (role: any) => String(role.userId) === String(auth.user?.id)
          ) ||
          project.users?.some(
            (user: any) => String(user.id) === String(auth.user?.id)
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
      // Fetch organizations separately (assuming userResources might not contain full org details needed)
      const orgsData = await api.get(
        `/organizations/by-user?userId=${auth.user.id}`
      );
      organizations = orgsData.data; // Assuming response structure

      // Load user resources (departments, projects with roles) using the store
      // This ensures we get the data with $extras.roleName
      const teamResources = await teamManagement.loadUserResources();

      // Populate local state from the store's data
      // No longer needed to populate local state for departments/projects
      // departments = teamResources.departments || [];
      // projects = teamResources.projects || [];
      // flatProjects = teamResources.projects || [];

      // Removed fallback fetches for departments and projects
      /*
      if (teamResources.departments) {
        departments = teamResources.departments;
      }

      if (teamResources.projects) {
        projects = teamResources.projects;
        flatProjects = teamResources.projects;
      }

      // Fall back to individual API calls if team management API doesn't return data
      if (!teamResources.departments?.length) {
        try {
          const deptsData = await api.get(`/departments/by-user?userId=${auth.user.id}`);
          departments = deptsData.data;
        } catch (error) {
          console.error("Failed to fetch departments:", error);
        }
      }

      if (!teamResources.projects?.length) {
        try {
          const projectsData = await api.get(`/projects/by-user?userId=${auth.user.id}`);
          projects = projectsData.data;
          flatProjects = projectsData.data;
        } catch (error) {
          console.error("Failed to fetch projects:", error);
        }
      }
      */
    } catch (error) {
      console.error("Failed to load data:", error);
      errorMessage =
        error instanceof Error ? error.message : t("organizationStructure.failedToLoadData");
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
      const data = await api.post("/projects/createProjectWithUser", {
        name: newProjectName,
        description: newProjectDescription,
        organizationId: selectedOrganization.id,
        departmentId: selectedDepartmentId,
        userId: auth.user.id,
      });

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
        error instanceof Error ? error.message : t("organizationStructure.failedToCreateProject");
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
      const data = await api.post("/departments/createDepartmentWithUser", {
        name: newDepartmentName,
        description: newDepartmentDescription,
        organizationId: selectedOrganization.id,
        userId: auth.user.id,
      });
      const newDepartment = data.department; // Assuming API returns the new department object

      // --- Start Client-side Store Update ---
      if (newDepartment && teamManagement.userResources) {
        // Assume the creator is assigned the 'Owner' role by default by the backend
        // Adjust 'Owner' if the backend assigns a different default role
        const newDeptWithRole = {
          ...newDepartment,
          $extras: { roleName: "Owner" },
        };

        // Call the store function to add the new department
        teamManagement.addDepartmentToUserResources(newDeptWithRole);
      }
      // --- End Client-side Store Update ---

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
        error instanceof Error ? error.message : t("organizationStructure.failedToCreateDepartment");
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
      await api.put(`/projects/${projectToMove.id}`, {
        departmentId: selectedDepartmentId || null,
      });

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
        error instanceof Error ? error.message : t("organizationStructure.failedToMoveProject");
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
      await api.post(`/team-management/project/${project.id}/self-assign`, {
        roleId: "member",
      });

      // Refresh data
      await loadData();
    } catch (error) {
      console.error("Error joining project:", error);
      errorMessage =
        error instanceof Error ? error.message : t("organizationStructure.failedToJoinProject");
    }
  }

  // Join a department (self-assign)
  async function joinDepartment(department: Department) {
    if (!auth.user) return;

    try {
      await api.post(
        `/team-management/department/${department.id}/self-assign`,
        {
          roleId: "member",
        }
      );

      // Refresh data and notify other components
      await loadData();
      notifyDepartmentUpdate();
    } catch (error) {
      console.error("Error joining department:", error);
      errorMessage =
        error instanceof Error ? error.message : t("organizationStructure.failedToJoinDepartment");
    }
  }

  // Check if user is a direct member of a project
  function isUserProjectMember(project: Project): boolean {
    if (!auth.user) return false;

    // Check project roles
    if (project.projectRoles && Array.isArray(project.projectRoles)) {
      return project.projectRoles.some(
        (role: any) => role.userId.toString() === auth.user?.id.toString()
      );
    }

    // Check users array as fallback
    if (project.users && Array.isArray(project.users)) {
      return project.users.some(
        (user: any) => user.id.toString() === auth.user?.id.toString()
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
    // Only rebuild the map when departments change
    const storeDepartments = teamManagement.userResources?.departments || [];
    departmentsMap = storeDepartments.reduce(
      (acc: Map<string, Department>, dept: any) => {
        acc.set(dept.id, dept);
        return acc;
      },
      new Map<string, Department>()
    );
  });

  // Process orphaned projects only once when flatProjects or departmentsMap changes
  $effect(() => {
    if (
      !filteredProjects ||
      filteredProjects.length === 0 ||
      departmentsMap.size === 0
    )
      return;
  });

  let departmentsMap = $state<Map<string, Department>>(new Map());

  // Check if the user can create projects using the subscription capability service
  async function checkProjectCreationCapability(
    orgId: string
  ): Promise<boolean> {
    if (!auth.user) return false;

    // Return cached result if available
    if (projectCreationCapabilities[orgId] !== undefined) {
      return projectCreationCapabilities[orgId].allowed;
    }

    try {
      const data = await api.get("/capabilities/project_create");

      // Store the result in the capability cache
      projectCreationCapabilities[orgId] = {
        allowed: data.allowed,
        message: data.message,
      };

      return data.allowed;
    } catch (error) {
      console.error("Failed to check project creation capability:", error);
      return false;
    }
  }

  // Determine if the user can create projects or departments
  function canCreateProject(orgId: string): boolean {
    // Use the cached capability check result if available, otherwise default to false
    // This synchronous function will return the cached result from the async check
    return projectCreationCapabilities[orgId]?.allowed || false;
  }

  // Check if the user can create departments using the subscription capability service
  async function checkDepartmentCreationCapability(
    orgId: string
  ): Promise<boolean> {
    if (!auth.user) return false;

    // Return cached result if available
    if (departmentCreationCapabilities[orgId] !== undefined) {
      return departmentCreationCapabilities[orgId].allowed;
    }

    try {
      const data = await api.get("/capabilities/department_create");

      // Store the result in the capability cache
      departmentCreationCapabilities[orgId] = {
        allowed: data.allowed,
        message: data.message,
      };

      return data.allowed;
    } catch (error) {
      console.error("Failed to check department creation capability:", error);
      return false;
    }
  }

  // Initialize capability checks when component loads
  $effect(() => {
    if (auth.user && organizations.length > 0) {
      // Check capabilities for each organization
      organizations.forEach((org) => {
        checkProjectCreationCapability(org.id);
        checkDepartmentCreationCapability(org.id);
      });
    }
  });

  function canCreateDepartment(orgId: string): boolean {
    // Use the cached capability check result if available, otherwise default to false
    // This synchronous function will return the cached result from the async check
    return departmentCreationCapabilities[orgId]?.allowed || false;
  }

  // Helper function to get user's role for a specific project
  function getUserRoleForProject(project: Project): string {
    if (!auth.user) return $_('common.unknown');
    const resources = teamManagement.userResources;
    if (!resources?.projects) return $_('common.unknown');

    const resource = resources.projects.find((r: any) => r.id === project.id);
    return resource?.$extras?.roleName || $_('common.unknown');
  }

  // Handle toggle change
  function handleToggleChange(value: boolean): void {
    showMyProjectsOnly = value;
  }

  // Check if a department has any projects that match the current filters
  function filterHasMatchingProjects(departmentId: string): boolean {
    if (!departmentId || !departmentsMap.has(departmentId)) {
      return false;
    }

    // Make sure we don't include orphaned projects that have a departmentId but the department doesn't exist
    return filteredProjects.some((p) => p.departmentId === departmentId);
  }

  // Helper function to check if the current user is an Admin or Owner of a given Org
  function isUserOrgAdminOrOwner(orgId: string): boolean {
    if (!auth.user || !teamManagement.userResources?.organizations)
      return false;
    const orgResource = teamManagement.userResources.organizations.find(
      (o: any) => o.id === orgId
    );
    return (
      orgResource?.$extras?.roleName === "Admin" ||
      orgResource?.$extras?.roleName === "Owner"
    );
  }

  // Helper function to check if the current user is specifically a Member of a given Org
  function isUserOrgMember(orgId: string): boolean {
    if (!auth.user || !teamManagement.userResources?.organizations)
      return false;
    const orgResource = teamManagement.userResources.organizations.find(
      (o: any) => o.id === orgId
    );
    // Ensure they are part of the org but NOT Admin or Owner
    return (
      !!orgResource &&
      !(
        orgResource?.$extras?.roleName === "Admin" ||
        orgResource?.$extras?.roleName === "Owner"
      )
    );
  }

  // Helper function to check if the current user is specifically an Owner of a given Org
  function isUserOrgOwner(orgId: string): boolean {
    if (!auth.user || !teamManagement.userResources?.organizations)
      return false;
    const orgResource = teamManagement.userResources.organizations.find(
      (o: any) => o.id === orgId
    );
    return orgResource?.$extras?.roleName === "Owner";
  }

  // Helper function to check if the current user is specifically an Admin of a given Org
  function isUserOrgAdmin(orgId: string): boolean {
    if (!auth.user || !teamManagement.userResources?.organizations)
      return false;
    const orgResource = teamManagement.userResources.organizations.find(
      (o: any) => o.id === orgId
    );
    return orgResource?.$extras?.roleName === "Admin";
  }
</script>

<!-- Create Project Dialog -->
<Dialog.Root bind:open={showNewProjectDialog}>
  <Dialog.Content class="max-w-md w-full mx-auto">
    <Dialog.Header>
      <Dialog.Title>{$_('organizationDialogs.createProject.title')}</Dialog.Title>
      <Dialog.Description>
        {$_('organizationDialogs.createProject.dialogDescription', { values: { organizationName: selectedOrganization?.name || 'your organization' } })}
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="projectName" class="text-right">{$_('organizationDialogs.createProject.name')}</Label>
        <Input
          id="projectName"
          class="col-span-3"
          bind:value={newProjectName}
          placeholder={$_('organizationDialogs.createProject.namePlaceholder')}
          required
        />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="projectDescription" class="text-right">{$_('organizationDialogs.createProject.descriptionLabel')}</Label>
        <Input
          id="projectDescription"
          class="col-span-3"
          bind:value={newProjectDescription}
          placeholder={$_('organizationDialogs.createProject.descriptionPlaceholder')}
        />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="department" class="text-right">{$_('organizationDialogs.createProject.department')}</Label>
        <div class="col-span-3">
          <select
            id="department"
            class="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            bind:value={selectedDepartmentId}
          >
            <option value={null}>{$_('organizationDialogs.createProject.noDepartment')}</option>
            {#each (teamManagement.userResources?.departments || []).filter((d: any) => d.organizationId === selectedOrganization?.id) as dept}
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
        >{$_('organizationDialogs.createProject.cancel')}</Button
      >
      <Button
        onclick={createProject}
        disabled={isCreatingProject || !newProjectName}
      >
        {#if isCreatingProject}
          <div
            class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
          ></div>
          {$_('organizationDialogs.createProject.creating')}
        {:else}
          {$_('organizationDialogs.createProject.create')}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Create Department Dialog -->
<Dialog.Root bind:open={showNewDepartmentDialog}>
  <Dialog.Content class="max-w-md w-full mx-auto">
    <Dialog.Header>
      <Dialog.Title>{$_('organizationDialogs.createDepartment.title')}</Dialog.Title>
      <Dialog.Description>
        {$_('organizationDialogs.createDepartment.dialogDescription', { values: { organizationName: selectedOrganization?.name || 'your organization' } })}
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="departmentName" class="text-right">{$_('organizationDialogs.createDepartment.name')}</Label>
        <Input
          id="departmentName"
          class="col-span-3"
          bind:value={newDepartmentName}
          placeholder={$_('organizationDialogs.createDepartment.namePlaceholder')}
          required
        />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="departmentDescription" class="text-right">{$_('organizationDialogs.createDepartment.descriptionLabel')}</Label
        >
        <Input
          id="departmentDescription"
          class="col-span-3"
          bind:value={newDepartmentDescription}
          placeholder={$_('organizationDialogs.createDepartment.descriptionPlaceholder')}
        />
      </div>

      {#if errorMessage}
        <p class="text-sm text-destructive">{errorMessage}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => (showNewDepartmentDialog = false)}>{$_('organizationDialogs.createDepartment.cancel')}</Button
      >
      <Button
        onclick={createDepartment}
        disabled={isCreatingDepartment || !newDepartmentName}
      >
        {#if isCreatingDepartment}
          <div
            class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
          ></div>
          {$_('organizationDialogs.createDepartment.creating')}
        {:else}
          {$_('organizationDialogs.createDepartment.create')}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Move Project Dialog -->
<Dialog.Root bind:open={showMoveProjectDialog}>
  <Dialog.Content class="max-w-md w-full mx-auto">
    <Dialog.Header>
      <Dialog.Title>{$_('organizationDialogs.moveProject.title')}</Dialog.Title>
      <Dialog.Description>
        {$_('organizationDialogs.moveProject.description')}
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="moveDepartment" class="text-right">{$_('organizationDialogs.moveProject.department')}</Label>
        <div class="col-span-3">
          <select
            id="moveDepartment"
            class="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            bind:value={selectedDepartmentId}
          >
            <option value={null}>{$_('organizationDialogs.moveProject.noDepartment')}</option>
            {#each (teamManagement.userResources?.departments || []).filter((d: any) => d.organizationId === projectToMove?.organizationId) as dept}
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
        >{$_('organizationDialogs.moveProject.cancel')}</Button
      >
      <Button onclick={moveProject} disabled={isMovingProject}>
        {#if isMovingProject}
          <div
            class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
          ></div>
          {$_('organizationDialogs.moveProject.moving')}
        {:else}
          {$_('organizationDialogs.moveProject.move')}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<div class="w-full">
  <!-- Header with title and view options -->
  <div
    class="mb-4 border-b flex justify-between items-center"
    id="org-structure-header"
  >
    <Tabs.Root value={viewMode} class="w-auto" id="org-view-mode-toggle">
      <Tabs.List>
        <Tabs.Trigger value="tree" onclick={() => (viewMode = "tree")}>
          <LayoutGrid class="h-4 w-4 mr-2" />
          {$_('organizationDialogs.treeView.treeView')}
        </Tabs.Trigger>
        <Tabs.Trigger value="list" onclick={() => (viewMode = "list")}>
          <LayoutList class="h-4 w-4 mr-2" />
          {$_('organizationDialogs.treeView.listView')}
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    <!-- Action buttons -->
    <div class="flex gap-2 items-center">
      {#if selectedOrganization}
        {@const orgId = selectedOrganization.id}
        {@const subAllowsProjectCreate =
          projectCreationCapabilities[orgId]?.allowed ?? false}
        {@const settingAllowsMemberCreate =
          teamManagement.settings?.allowMembersToCreateProjects ?? false}
        {@const userCanCreateProj =
          subAllowsProjectCreate &&
          (isUserOrgAdminOrOwner(orgId) ||
            (isUserOrgMember(orgId) && settingAllowsMemberCreate))}
        {@const createProjectTooltip = !subAllowsProjectCreate
          ? projectCreationCapabilities[orgId]?.message ||
            "Project creation not allowed by subscription."
          : !userCanCreateProj && isUserOrgMember(orgId)
            ? "Members are not allowed to create projects in this organization."
            : ""}

        <!-- Department Creation Logic (Replacement Start) -->
        {@const subAllowsDeptCreate =
          departmentCreationCapabilities[orgId]?.allowed ?? false}
        {@const settingAllowsMemberCreateDept =
          teamManagement.settings?.allowMembersToCreateDepartments ?? false}
        {@const settingAllowsAdminCreateDept =
          teamManagement.settings?.allowAdminsToCreateDepartments ?? true}
        {@const roleAllowsCreateDept =
          isUserOrgOwner(orgId) ||
          (isUserOrgAdmin(orgId) && settingAllowsAdminCreateDept) ||
          (isUserOrgMember(orgId) && settingAllowsMemberCreateDept)}
        {@const userCanCreateDept = subAllowsDeptCreate && roleAllowsCreateDept}
        {@const createDeptTooltip = !subAllowsDeptCreate
          ? departmentCreationCapabilities[orgId]?.message ||
            "Department creation not allowed by subscription."
          : !roleAllowsCreateDept && isUserOrgAdmin(orgId)
            ? "Administrators are not allowed to create departments in this organization."
            : !roleAllowsCreateDept && isUserOrgMember(orgId)
              ? "Members are not allowed to create departments in this organization."
              : "You do not have permission to create departments."}

        {#if userCanCreateDept}
          <Button
            id="org-new-department-button"
            variant="outline"
            size="sm"
            class="flex items-center gap-1"
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              showNewDepartmentDialog = true;
            }}
          >
            <FolderTree class="h-4 w-4" />
            {$_('organizationDialogs.treeView.newDepartment')}
          </Button>
        {:else}
          <div
            class="relative inline-block group"
            id="org-new-department-button"
          >
            <Button
              variant="outline"
              size="sm"
              class="flex items-center gap-1 opacity-70"
              disabled
            >
              <FolderTree class="h-4 w-4" />
              {$_('organizationDialogs.treeView.newDepartment')}
            </Button>
            <div
              class="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50"
            >
              <div
                class="bg-popover text-popover-foreground shadow-md rounded-md p-2 text-xs w-48"
              >
                {createDeptTooltip}
              </div>
            </div>
          </div>
        {/if}
        {#if userCanCreateProj}
          <Button
            id="org-new-project-button"
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
            {$_('organizationDialogs.treeView.newProject')}
          </Button>
        {:else}
          <!-- Disabled Button with Tooltip -->
          <div class="relative inline-block group" id="org-new-project-button">
            <Button
              variant="default"
              size="sm"
              class="flex items-center gap-1 opacity-70"
              disabled
            >
              <Plus class="h-4 w-4" />
              {$_('organizationDialogs.treeView.newProject')}
            </Button>
            <div
              class="absolute right-0 bottom-full mb-2 w-60 p-2 text-xs text-popover-foreground bg-popover rounded shadow-lg hidden group-hover:block z-50"
            >
              {createProjectTooltip ||
                "You do not have permission to create projects."}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Search Bar -->
  <div class="flex items-center mb-4">
    <div class="relative flex-1">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        id="org-search-input"
        type="text"
        placeholder={$_('organizationDialogs.treeView.searchProjects')}
        bind:value={searchQuery}
        class="pl-9"
      />
    </div>

    <Toggle
      id="org-filter-toggle"
      pressed={showMyProjectsOnly}
      onPressedChange={handleToggleChange}
      variant="outline"
      class="gap-1 ml-2"
    >
      <ListFilter class="h-4 w-4" />
      {$_('organizationDialogs.treeView.myProjects')}
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
      <Button variant="outline" class="mt-2" onclick={loadData}>{$_('organizationDialogs.treeView.retry')}</Button>
    </div>
    <!-- Empty state -->
  {:else if organizations.length === 0}
    <div class="bg-muted/30 rounded-md p-8 text-center border border-muted">
      <Building2 class="h-12 w-12 mx-auto mb-4 text-primary/40" />
      <h3 class="text-lg font-medium mb-2">{$_('organizationDialogs.treeView.noOrganizationsFound')}</h3>
      <p class="text-muted-foreground mb-4">
        {$_('organizationDialogs.treeView.noAccessYet')}
      </p>
    </div>
    <!-- Content -->
  {:else}
    <!-- Tree View -->
    {#if viewMode === "tree"}
      <div
        class="border rounded-md overflow-hidden bg-background"
        id="org-tree-view-container"
      >
        {#each organizations as org}
          <div class="border-b last:border-0">
            <button
              type="button"
              class="flex w-full items-center gap-2 p-3 text-left hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              onclick={() => (selectedOrganization = org)}
            >
              <Building2 class="h-5 w-5 text-muted-foreground shrink-0" />
              <span class="font-medium flex-grow">{org.name}</span>
            </button>

            <div class="ml-4 border-l pl-4 pb-2">
              <!-- Calculate filtered departments (only show departments with matching projects if search is active) -->
              {#if searchQuery || showMyProjectsOnly}
                <!-- For each department, check if it has any projects that match the current filters -->
                {#each (teamManagement.userResources?.departments || []).filter((d: any) => d.organizationId === org.id && filterHasMatchingProjects(d.id)) as department}
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
                {#each filteredProjects.filter((p) => p.organizationId === org.id && (!p.departmentId || !departmentsMap.has(p.departmentId))) as project}
                  <div
                    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer ml-2 my-1 transition-colors"
                    onclick={() => {
                      if (isUserProjectMember(project)) {
                        navigate(`/project/${project.id}`);
                      }
                    }}
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
                          {$_('organizationDialogs.treeView.join')}
                        </Button>
                      {:else}
                        <!-- Use the specific role name -->
                        <Badge
                          variant="outline"
                          class="bg-primary/10 text-primary"
                          >{getUserRoleForProject(project)}</Badge
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
                        {$_('organizationDialogs.treeView.move')}
                      </Button>
                    </div>
                  </div>
                {/each}

                <!-- No results message when filtering -->
                {#if (searchQuery || showMyProjectsOnly) && filteredProjects.filter((p) => p.organizationId === org.id).length === 0 && (teamManagement.userResources?.departments || []).filter((d: any) => d.organizationId === org.id && filterHasMatchingProjects(d.id)).length === 0}
                  <div
                    class="text-sm text-muted-foreground py-4 px-6 bg-muted/50 rounded-md m-3 border border-muted"
                  >
                    {#if searchQuery}
                      <div class="font-medium text-foreground">
                        {$_('organizationFallbacks.noProjectsMatchQuery', { values: { query: searchQuery } })}
                      </div>
                      <p class="mt-1">
                        {$_('organizationFallbacks.tryDifferentKeywords')}
                      </p>
                    {:else if showMyProjectsOnly}
                      <div class="font-medium text-foreground">
                        {$_('organizationFallbacks.notMemberOfProjects')}
                      </div>
                      <p class="mt-1">
                        {$_('organizationFallbacks.tryDisablingFilter')}
                      </p>
                    {:else}
                      {$_('organizationFallbacks.noProjectsFound')}
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
                      {$_('organizationDialogs.treeView.clearFilters')}
                    </Button>
                  </div>
                {/if}
              {:else}
                <!-- Standard view (no filtering) -->
                {#each (teamManagement.userResources?.departments || []).filter((d: any) => d.organizationId === org.id) as department}
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
                    isFiltering={false}
                  />
                {/each}

                <!-- Direct Projects (no department) -->
                {#each filteredProjects.filter((p) => p.organizationId === org.id && (!p.departmentId || !departmentsMap.has(p.departmentId))) as project}
                  <div
                    class="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer ml-2 my-1 transition-colors"
                    onclick={() => {
                      if (isUserProjectMember(project)) {
                        navigate(`/project/${project.id}`);
                      }
                    }}
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
                          {$_('organizationDialogs.treeView.join')}
                        </Button>
                      {:else}
                        <!-- Use the specific role name -->
                        <Badge
                          variant="outline"
                          class="bg-primary/10 text-primary"
                          >{getUserRoleForProject(project)}</Badge
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
                        {$_('organizationDialogs.treeView.move')}
                      </Button>
                    </div>
                  </div>
                {/each}

                <!-- No items message -->
                {#if (teamManagement.userResources?.departments || []).filter((d: any) => d.organizationId === org.id).length === 0 && filteredProjects.filter((p) => p.organizationId === org.id && (!p.departmentId || !departmentsMap.has(p.departmentId))).length === 0}
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
      <div
        class="border rounded-md overflow-hidden bg-background"
        id="org-list-view-container"
      >
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
              <span>{project.name}</span>
              <span
                >{project.departmentId
                  ? departmentsMap.get(project.departmentId)?.name
                  : $_('organizationFallbacks.noDepartment')}</span
              >
              <span
                >{project.organizationId
                  ? organizations.find((o) => o.id === project.organizationId)
                      ?.name
                  : $_('organizationFallbacks.noOrganization')}</span
              >
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
                  <!-- Use the specific role name -->
                  <Badge variant="outline" class="bg-primary/10 text-primary"
                    >{getUserRoleForProject(project)}</Badge
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
        {:else}
          <div class="text-sm text-muted-foreground py-2 px-4">
            {$_('organizationFallbacks.noProjectsFound')}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

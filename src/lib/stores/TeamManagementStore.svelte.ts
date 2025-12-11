
  import { api } from "$lib/services/api-client";
  import { auth } from "$lib/stores/AuthStore";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper function for imperative access
  const t = (key: string, options?: object) => get(_)(key, options);

  type ResourceType = "organization" | "department" | "project";

  // State management
  let selectedResourceType = $state<ResourceType>("organization");
  let selectedResourceId = $state<string | null>(null);
  let organizationStructure = $state<any | null>(null);
  let departmentStructure = $state<any | null>(null);
  let projectTeam = $state<any | null>(null);
  let userResources = $state<any | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let permissions = $state<Record<string, boolean>>({});
  let settings = $state<Record<string, any>>({});
  let settingsError = $state<string | null>(null);
  let userLoginStatsMap = $state<Record<string, any> | null>(null);
  let loginStatUsers = $state<any[] | null>(null);

  // State for project details modal
  let modalProjectData = $state<any | null>(null);
  let isModalDataLoading = $state(false);
  let modalError = $state<string | null>(null);

  export const teamManagement = {
    // Getters
    get selectedResourceType() {
      return selectedResourceType;
    },
    get selectedResourceId() {
      return selectedResourceId;
    },
    get organizationStructure() {
      return organizationStructure;
    },
    get departmentStructure() {
      return departmentStructure;
    },
    get projectTeam() {
      return projectTeam;
    },
    get userResources() {
      return userResources;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get permissions() {
      return permissions;
    },
    get settings() {
      return settings;
    },
    get settingsError() {
      return settingsError;
    },
    get userLoginStatsMap() {
      return userLoginStatsMap;
    },
    get loginStatUsers() {
      return loginStatUsers;
    },
    get modalProjectData() {
      return modalProjectData;
    },
    get isModalDataLoading() {
      return isModalDataLoading;
    },
    get modalError() {
      return modalError;
    },

    // Set the selected resource
    async setSelectedResource(type: ResourceType, id: string) {
      selectedResourceType = type;
      selectedResourceId = id;

      // Clear previous specific structures to avoid showing stale data
      organizationStructure = null;
      departmentStructure = null;
      projectTeam = null;
      settings = {}; // Clear settings as well
      permissions = {}; // Clear permissions
      settingsError = null;

      // Load the selected resource data
      try {
        switch (type) {
          case "organization":
            await this.loadOrganizationStructure(id);
            break;
          case "department":
            await this.loadDepartmentStructure(id);
            break;
          case "project":
            await this.loadProjectTeam(id);
            break;
        }
        // After successfully loading the resource structure and permissions,
        // load its full settings ONLY if the user has management permission.
        if (permissions.canManage) {
          await this.loadSettings();
        }
      } catch (err) {
        // The specific load functions handle their own errors and state updates
        // We might already have an error set from the load function, no need to overwrite
        console.error(
          `[TeamManagementStore] Error setting selected resource ${type}:${id}`,
          err
        );
      }
    },

    // Load resources that the user has access to
    async loadUserResources(
      includeStats: boolean = false,
      includeLoginStats: boolean = false
    ) {
      isLoading = true;
      error = null;

      try {
        let apiUrl = `/team-management/resources`;
        const queryParams = [];
        if (includeStats) {
          queryParams.push("includeStats=true");
        }
        if (includeLoginStats) {
          queryParams.push("includeLoginStats=true");
        }
        if (queryParams.length > 0) {
          apiUrl += `?${queryParams.join("&")}`;
        }

        const data = await api.get(apiUrl);
        userResources = {
          organizations: data.organizations,
          departments: data.departments,
          projects: data.projects,
          projectStats: data.projectStats,
        };
        // Preserve previously loaded analytics if this response doesn't include them
        if (Object.prototype.hasOwnProperty.call(data, "userLoginStatsMap")) {
          userLoginStatsMap = data.userLoginStatsMap || null;
        }
        if (Object.prototype.hasOwnProperty.call(data, "loginStatUsers")) {
          loginStatUsers = data.loginStatUsers || null;
        }

        // If no resource is selected and we have organizations, select the first one
        if (!selectedResourceId && data.organizations?.length > 0) {
          this.setSelectedResource("organization", data.organizations[0].id);
        }

        // Return the data so we can work with it
        return data;
      } catch (err) {
        console.error("Error loading user resources:", err);
        error = err instanceof Error ? err.message : t("teamManagement.errors.failedToLoadResources");
        userLoginStatsMap = null;
        loginStatUsers = null;
        throw err; // Re-throw to allow caller to catch
      } finally {
        isLoading = false;
      }
    },

    // Load organization structure
    async loadOrganizationStructure(organizationId: string) {
      if (!organizationId) return;

      isLoading = true;
      error = null;

      try {
        const data = await api.get(
          `/team-management/organization/${organizationId}`
        );

        // Check if there are any roles available
        const hasRoles = data.organization?.users?.some(
          (user: any) => user.role && user.role.id
        );

        // If no roles are found, add some hardcoded roles for the interface
        if (
          data.organization &&
          (!hasRoles || !data.organization.users?.length)
        ) {
          data.organization.availableRoles = [
            { id: "admin", name: t("teamManagement.roles.admin") },
            { id: "member", name: t("teamManagement.roles.member") },
          ];
        }

        organizationStructure = data.organization;
        permissions = data.permissions || {};

        // Extract and store settings included in the organization structure response
        const newSettings: Record<string, any> = {};
        if (data.organization?.hasOwnProperty("allowMembersToCreateProjects")) {
          newSettings.allowMembersToCreateProjects =
            data.organization.allowMembersToCreateProjects;
        }
        if (
          data.organization?.hasOwnProperty("allowMembersToCreateDepartments")
        ) {
          newSettings.allowMembersToCreateDepartments =
            data.organization.allowMembersToCreateDepartments;
        }
        if (
          data.organization?.hasOwnProperty("allowAdminsToCreateDepartments")
        ) {
          newSettings.allowAdminsToCreateDepartments =
            data.organization.allowAdminsToCreateDepartments;
        }

        // Merge the extracted settings into the main settings state
        if (Object.keys(newSettings).length > 0) {
          settings = { ...settings, ...newSettings };
        }
      } catch (err) {
        console.error("Error loading organization structure:", err);
        error =
          err instanceof Error
            ? err.message
            : t("teamManagement.errors.operationFailed");

        // Create a minimal structure if the API failed but we have an organization ID
        if (
          !organizationStructure &&
          auth.currentOrganization &&
          auth.currentOrganization.id === organizationId
        ) {
          organizationStructure = {
            id: organizationId,
            name: auth.currentOrganization.name || t("team.organizations"),
            users: [auth.user],
            // Add hardcoded roles for the interface
            availableRoles: [
              { id: "admin", name: t("teamManagement.roles.admin") },
              { id: "member", name: t("teamManagement.roles.member") },
            ],
          };

          // Give admin permissions to the current user to allow basic functionality
          permissions = {
            canInviteUsers: true,
            canChangeRoles: true,
            canManage: true,
          };
        }
      } finally {
        isLoading = false;
      }
    },

    // Load department structure
    async loadDepartmentStructure(departmentId: string) {
      if (!departmentId) return;

      isLoading = true;
      error = null;

      try {
        const data = await api.get(
          `/team-management/department/${departmentId}`
        );

        // Check if there are any roles available
        const hasRoles = data.department?.users?.some(
          (user: any) => user.role && user.role.id
        );

        // If no roles are found, add some hardcoded roles for the interface
        if (data.department && (!hasRoles || !data.department.users?.length)) {
          data.department.availableRoles = [
            { id: "manager", name: t("teamManagement.roles.manager") },
            { id: "member", name: t("teamManagement.roles.member") },
          ];
        }

        departmentStructure = data.department;
        permissions = data.permissions || {};
      } catch (err) {
        console.error("Error loading department structure:", err);
        error =
          err instanceof Error
            ? err.message
            : t("teamManagement.errors.operationFailed");

        // Create a minimal structure if the API failed
        if (!departmentStructure) {
          departmentStructure = {
            id: departmentId,
            name: t("team.departments"),
            users: [],
            // Add hardcoded roles for the interface
            availableRoles: [
              { id: "manager", name: t("teamManagement.roles.manager") },
              { id: "member", name: t("teamManagement.roles.member") },
            ],
          };

          // Give minimal permissions
          permissions = {
            canInviteUsers: false,
            canChangeRoles: false,
            canManage: false,
          };
        }
      } finally {
        isLoading = false;
      }
    },

    // Load project team
    async loadProjectTeam(projectId: string) {
      if (!projectId) return;

      isLoading = true;
      error = null;

      try {
        const data = await api.get(`/team-management/project/${projectId}`);

        // Check if there are any roles available
        const hasRoles = data.project?.users?.some(
          (user: any) => user.role && user.role.id
        );

        // If no roles are found, add some hardcoded roles for the interface
        if (data.project && (!hasRoles || !data.project.users?.length)) {
          data.project.availableRoles = [
            { id: "owner", name: t("teamManagement.roles.owner") },
            { id: "admin", name: t("teamManagement.roles.admin") },
            { id: "member", name: t("teamManagement.roles.member") },
          ];
        }

        projectTeam = data.project;
        permissions = data.permissions || {};
      } catch (err) {
        console.error("Error loading project team:", err);
        error =
          err instanceof Error
            ? err.message
            : t("teamManagement.errors.operationFailed");

        // Create a minimal structure if the API failed
        if (!projectTeam) {
          projectTeam = {
            id: projectId,
            name: t("team.projects"),
            users: [],
            // Add hardcoded roles for the interface
            availableRoles: [
              { id: "owner", name: t("teamManagement.roles.owner") },
              { id: "admin", name: t("teamManagement.roles.admin") },
              { id: "member", name: t("teamManagement.roles.member") },
            ],
          };

          // Give minimal permissions
          permissions = {
            canInviteUsers: false,
            canChangeRoles: false,
            canManage: false,
          };
        }
      } finally {
        isLoading = false;
      }
    },

    // Add a user to the selected resource
    async addUser(userId: string, roleId: string) {
      if (!selectedResourceType || !selectedResourceId) {
        error = t("teamManagement.errors.invalidResourceId");
        return false;
      }

      try {
        await api.post(
          `/team-management/${selectedResourceType}/${selectedResourceId}/users`,
          { userId, roleId }
        );

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error adding user:", err);
        error = err instanceof Error ? err.message : t("teamManagement.errors.operationFailed");
        return false;
      }
    },

    // Update a user's role in the selected resource
    async updateUserRole(userId: string, roleId: string) {
      if (!selectedResourceType || !selectedResourceId) {
        error = t("teamManagement.errors.invalidResourceId");
        return false;
      }

      try {
        // The backend now handles both string role names (like "admin", "member") and UUIDs
        // So we can send the roleId directly without conversion
        const payload = { roleId };

        await api.put(
          `/team-management/${selectedResourceType}/${selectedResourceId}/users/${userId}`,
          payload
        );

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error updating user role:", err);
        error = err instanceof Error ? err.message : t("teamManagement.errors.operationFailed");
        return false;
      }
    },

    // Remove a user from the selected resource
    async removeUser(userId: string) {
      if (!selectedResourceType || !selectedResourceId) {
        error = t("teamManagement.errors.invalidResourceId");
        return false;
      }

      try {
        await api.delete(
          `/team-management/${selectedResourceType}/${selectedResourceId}/users/${userId}`
        );

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error removing user:", err);
        error = err instanceof Error ? err.message : t("teamManagement.errors.operationFailed");
        return false;
      }
    },

    // Self-assign to a resource (only for department and project)
    async selfAssign(roleId: string) {
      if (
        !selectedResourceType ||
        !selectedResourceId ||
        selectedResourceType === "organization"
      ) {
        error = t("teamManagement.errors.invalidResourceId");
        console.error(
          "Self-assignment failed: Not available for this resource type"
        );
        return false;
      }

      try {
        const payload = { roleId };

        await api.post(
          `/team-management/${selectedResourceType}/${selectedResourceId}/self-assign`,
          payload
        );

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error self-assigning:", err);
        error = err instanceof Error ? err.message : t("teamManagement.errors.operationFailed");
        return false;
      }
    },

    // Add a newly created department to the user's resources list
    // This is used for immediate UI updates after creation, before the next full refresh.
    addDepartmentToUserResources(newDepartment: any) {
      if (userResources && userResources.departments) {
        // Create a new array to ensure reactivity if needed, although direct mutation should work with runes
        userResources.departments = [
          ...userResources.departments,
          newDepartment,
        ];
      } else if (userResources) {
        // If departments array didn't exist, create it
        userResources.departments = [newDepartment];
      }
    },

    // Load settings for the current resource
    async loadSettings() {
      if (!selectedResourceType || !selectedResourceId) return;

      isLoading = true;
      settingsError = null;

      try {
        try {
          const data = await api.get(
            `/settings/${selectedResourceType}/${selectedResourceId}`
          );

          // Merge fetched settings with existing ones
          settings = { ...settings, ...data };
        } catch (err: any) {
          if (err.status === 403) {
            return; // Exit without modifying settings on 403
          }
          throw err;
        }
      } catch (err) {
        console.error("[TeamManagementStore] Error loading settings:", err);
        settingsError =
          err instanceof Error ? err.message : t("teamManagement.errors.failedToLoadSettings");
      } finally {
        isLoading = false;
      }
    },

    // Update a specific setting
    async updateSetting(key: string, value: any) {
      if (!selectedResourceType || !selectedResourceId) {
        settingsError = t("teamManagement.errors.invalidResourceId");
        return false;
      }

      try {
        try {
          await api.put(
            `/settings/${selectedResourceType}/${selectedResourceId}`,
            { [key]: value }
          );
        } catch (err: any) {
          // Check if this is a permissions error (403)
          if (err.status === 403) {
            settingsError = t("teamManagement.errors.failedToSaveSettings");
            return false;
          }
          throw err;
        }

        // Create a new settings object to trigger reactivity only once
        const newSettings = { ...settings };

        // Handle nested settings
        if (
          typeof value === "object" &&
          value !== null &&
          key in newSettings &&
          typeof newSettings[key] === "object"
        ) {
          newSettings[key] = { ...newSettings[key], ...value };
        } else {
          newSettings[key] = value;
        }

        // Only update if there's actually a change
        const currentValue = JSON.stringify(settings);
        const newValue = JSON.stringify(newSettings);

        if (currentValue !== newValue) {
          settings = newSettings;
        }

        return true;
      } catch (err) {
        console.error("[TeamManagementStore] Error updating setting:", err);
        settingsError =
          err instanceof Error ? err.message : t("teamManagement.errors.failedToSaveSettings");
        // Don't set the general error for settings issues
        return false;
      }
    },

    // Refresh the current resource data
    async refreshCurrentResource() {
      if (!selectedResourceType || !selectedResourceId) return;

      error = null; // Reset general error
      settingsError = null; // Reset settings error

      try {
        switch (selectedResourceType) {
          case "organization":
            await this.loadOrganizationStructure(selectedResourceId);
            break;
          case "department":
            await this.loadDepartmentStructure(selectedResourceId);
            break;
          case "project":
            await this.loadProjectTeam(selectedResourceId);
            break;
        }
        // Loading settings might fail due to permissions, but that's handled in loadSettings
        await this.loadSettings();
      } catch (err) {
        console.error("Error refreshing resource data:", err);
        error = err instanceof Error ? err.message : t("teamManagement.errors.operationFailed");
      }
    },

    // Clear all data
    clear() {
      selectedResourceType = "organization";
      selectedResourceId = null;
      organizationStructure = null;
      departmentStructure = null;
      projectTeam = null;
      userResources = null;
      isLoading = false;
      error = null;
      permissions = {};
      settings = {};
      settingsError = null;
      userLoginStatsMap = null;
      loginStatUsers = null;
      modalProjectData = null;
      isModalDataLoading = false;
      modalError = null;
    },

    // Initialize the store
    async initialize() {
      if (auth.currentOrganization?.id) {
        try {
          await this.loadUserResources();

          // If loading settings fails due to permissions, it's handled in the loadSettings method
          await this.loadSettings();
        } catch (err) {
          console.error("Error initializing team management:", err);
          error = err instanceof Error ? err.message : t("teamManagement.errors.failedToLoadResources");
        }
      } else {
        this.clear();
      }
    },

    // Load specific project details for the modal view
    async loadProjectDetailsForModal(projectId: string) {
      if (!projectId) return;

      isModalDataLoading = true;
      modalError = null;
      modalProjectData = null; // Clear previous data

      try {
        const data = await api.get(`/team-management/project/${projectId}`);
        // The actual project data is nested under a 'project' key in the response
        modalProjectData = data.project;
      } catch (err) {
        console.error("Error loading project details for modal:", err);
        modalError = err instanceof Error ? err.message : t("teamManagement.errors.failedToLoadProjectDetails");
        modalProjectData = null;
      } finally {
        isModalDataLoading = false;
      }
    },

    // Delete a department
    async deleteDepartment(departmentId: string) {
      if (!departmentId) {
        error = t("teamManagement.errors.invalidResourceId");
        return false;
      }

      try {
        await api.delete(`/departments/${departmentId}`);

        // Remove the department from the local store for immediate UI update
        if (userResources && userResources.departments) {
          userResources.departments = userResources.departments.filter(
            (dept: any) => dept.id !== departmentId
          );
        }

        // If the deleted department was the selected resource, clear selection
        if (
          selectedResourceId === departmentId &&
          selectedResourceType === "department"
        ) {
          selectedResourceId = null;
          // Optionally select the first organization if available
          if (userResources?.organizations?.length > 0) {
            this.setSelectedResource(
              "organization",
              userResources.organizations[0].id
            );
          } else {
            // Or clear related structures if no orgs left
            departmentStructure = null;
            projectTeam = null;
            permissions = {};
          }
        }

        return true;
      } catch (err) {
        console.error("Error deleting department:", err);
        error = err instanceof Error ? err.message : t("teamManagement.errors.operationFailed");
        return false;
      }
    },
  };

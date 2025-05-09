<!-- src/lib/stores/TeamManagementStore.svelte -->
<script lang="ts" module>
  import { API_BASE_URL } from "$lib/config";
  import { auth } from "./AuthStore.svelte";
  // Remove the incorrect backend import
  // import type { LoginStatUserJson } from "../../app/services/permission_service";

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
          console.log(
            "[TeamManagementStore] User can manage, attempting to load full settings."
          );
          await this.loadSettings();
        } else {
          console.log(
            "[TeamManagementStore] User cannot manage, skipping full settings load."
          );
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
        let apiUrl = `${API_BASE_URL}/team-management/resources`;
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

        const response = await fetch(apiUrl, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load resources (${response.status})`);
        }

        const data = await response.json();
        userResources = {
          organizations: data.organizations,
          departments: data.departments,
          projects: data.projects,
          projectStats: data.projectStats,
        };
        userLoginStatsMap = data.userLoginStatsMap || null;
        loginStatUsers = data.loginStatUsers || null;

        // If no resource is selected and we have organizations, select the first one
        if (!selectedResourceId && data.organizations?.length > 0) {
          this.setSelectedResource("organization", data.organizations[0].id);
        }

        // Return the data so we can work with it
        return data;
      } catch (err) {
        console.error("Error loading user resources:", err);
        error = err instanceof Error ? err.message : "An error occurred";
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
        const response = await fetch(
          `${API_BASE_URL}/team-management/organization/${organizationId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Failed to load organization structure (${response.status})`
          );
        }

        const data = await response.json();

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
            { id: "admin", name: "Admin" },
            { id: "member", name: "Member" },
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
          console.log(
            "[TeamManagementStore] Updated settings from Org Structure:",
            newSettings
          );
        }
      } catch (err) {
        console.error("Error loading organization structure:", err);
        error =
          err instanceof Error
            ? err.message
            : "An error occurred. Please contact your administrator as there may be a backend configuration issue.";

        // Create a minimal structure if the API failed but we have an organization ID
        if (
          !organizationStructure &&
          auth.currentOrganization &&
          auth.currentOrganization.id === organizationId
        ) {
          organizationStructure = {
            id: organizationId,
            name: auth.currentOrganization.name || "Organization",
            users: [auth.user],
            // Add hardcoded roles for the interface
            availableRoles: [
              { id: "admin", name: "Admin" },
              { id: "member", name: "Member" },
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
        const response = await fetch(
          `${API_BASE_URL}/team-management/department/${departmentId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Failed to load department structure (${response.status})`
          );
        }

        const data = await response.json();

        // Check if there are any roles available
        const hasRoles = data.department?.users?.some(
          (user: any) => user.role && user.role.id
        );

        // If no roles are found, add some hardcoded roles for the interface
        if (data.department && (!hasRoles || !data.department.users?.length)) {
          data.department.availableRoles = [
            { id: "manager", name: "Manager" },
            { id: "member", name: "Member" },
          ];
        }

        departmentStructure = data.department;
        permissions = data.permissions || {};
      } catch (err) {
        console.error("Error loading department structure:", err);
        error =
          err instanceof Error
            ? err.message
            : "An error occurred. Please contact your administrator as there may be a backend configuration issue.";

        // Create a minimal structure if the API failed
        if (!departmentStructure) {
          departmentStructure = {
            id: departmentId,
            name: "Department",
            users: [],
            // Add hardcoded roles for the interface
            availableRoles: [
              { id: "manager", name: "Manager" },
              { id: "member", name: "Member" },
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
        const response = await fetch(
          `${API_BASE_URL}/team-management/project/${projectId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Failed to load project team (${response.status})`
          );
        }

        const data = await response.json();

        // Check if there are any roles available
        const hasRoles = data.project?.users?.some(
          (user: any) => user.role && user.role.id
        );

        // If no roles are found, add some hardcoded roles for the interface
        if (data.project && (!hasRoles || !data.project.users?.length)) {
          data.project.availableRoles = [
            { id: "owner", name: "Owner" },
            { id: "admin", name: "Admin" },
            { id: "member", name: "Member" },
          ];
        }

        projectTeam = data.project;
        permissions = data.permissions || {};
      } catch (err) {
        console.error("Error loading project team:", err);
        error =
          err instanceof Error
            ? err.message
            : "An error occurred. Please contact your administrator as there may be a backend configuration issue.";

        // Create a minimal structure if the API failed
        if (!projectTeam) {
          projectTeam = {
            id: projectId,
            name: "Project",
            users: [],
            // Add hardcoded roles for the interface
            availableRoles: [
              { id: "owner", name: "Owner" },
              { id: "admin", name: "Admin" },
              { id: "member", name: "Member" },
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
        error = "No resource selected";
        return false;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/team-management/${selectedResourceType}/${selectedResourceId}/users`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId, roleId }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to add user (${response.status})`);
        }

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error adding user:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        return false;
      }
    },

    // Update a user's role in the selected resource
    async updateUserRole(userId: string, roleId: string) {
      if (!selectedResourceType || !selectedResourceId) {
        error = "No resource selected";
        return false;
      }

      try {
        // The backend now handles both string role names (like "admin", "member") and UUIDs
        // So we can send the roleId directly without conversion
        const payload = { roleId };

        const response = await fetch(
          `${API_BASE_URL}/team-management/${selectedResourceType}/${selectedResourceId}/users/${userId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          // Try to get more error details from the response
          let errorDetails = "";
          try {
            const errorData = await response.json();
            console.error("Error response from server:", errorData);
            errorDetails = errorData.message || errorData.error || "";
          } catch (parseErr) {
            errorDetails = "Could not parse error details";
          }

          throw new Error(
            `Failed to update user role (${response.status}): ${errorDetails}`
          );
        }

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error updating user role:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        return false;
      }
    },

    // Remove a user from the selected resource
    async removeUser(userId: string) {
      if (!selectedResourceType || !selectedResourceId) {
        error = "No resource selected";
        return false;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/team-management/${selectedResourceType}/${selectedResourceId}/users/${userId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to remove user (${response.status})`);
        }

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error removing user:", err);
        error = err instanceof Error ? err.message : "An error occurred";
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
        error = "Self-assignment not available for this resource type";
        console.error(
          "Self-assignment failed: Not available for this resource type"
        );
        return false;
      }

      try {
        const payload = { roleId };

        const response = await fetch(
          `${API_BASE_URL}/team-management/${selectedResourceType}/${selectedResourceId}/self-assign`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Self-assignment API response error:", {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
          });
          throw new Error(
            `Failed to self-assign (${response.status}): ${errorData.message || response.statusText}`
          );
        }

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error self-assigning:", err);
        error = err instanceof Error ? err.message : "An error occurred";
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
      } else {
        console.warn(
          "[TeamManagementStore] Cannot add department: userResources is not yet loaded."
        );
      }
    },

    // Load settings for the current resource
    async loadSettings() {
      if (!selectedResourceType || !selectedResourceId) return;

      isLoading = true;
      settingsError = null;

      try {
        const url = `${API_BASE_URL}/settings/${selectedResourceType}/${selectedResourceId}`;
        console.log("[TeamManagementStore] Fetching settings from:", url);

        const response = await fetch(url, {
          credentials: "include",
        });

        console.log(
          "[TeamManagementStore] Settings response status:",
          response.status
        );

        if (!response.ok) {
          if (response.status === 403) {
            console.log(
              "[TeamManagementStore] Permission denied (403) loading settings."
            );
            return; // Exit without modifying settings on 403
          }
          throw new Error(`Failed to load settings (${response.status})`);
        }

        const data = await response.json();
        console.log("[TeamManagementStore] Received settings data:", data);

        // Merge fetched settings with existing ones
        settings = { ...settings, ...data };
      } catch (err) {
        console.error("[TeamManagementStore] Error loading settings:", err);
        settingsError =
          err instanceof Error ? err.message : "An error occurred";
      } finally {
        isLoading = false;
      }
    },

    // Update a specific setting
    async updateSetting(key: string, value: any) {
      if (!selectedResourceType || !selectedResourceId) {
        settingsError = "No resource selected";
        return false;
      }

      try {
        const url = `${API_BASE_URL}/settings/${selectedResourceType}/${selectedResourceId}`;
        const body = JSON.stringify({ [key]: value });

        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: body,
        });

        if (!response.ok) {
          // Check if this is a permissions error (403)
          if (response.status === 403) {
            settingsError = "You don't have permission to update settings";
            return false;
          }

          const errorData = await response.json().catch(() => ({}));
          console.error(`[TeamManagementStore] Error response:`, errorData);
          throw new Error(
            `Failed to update setting (${response.status}): ${errorData.message || response.statusText}`
          );
        }

        // Obtain response text first to check if there's any content
        const responseText = await response.text();

        // Only try to parse as JSON if there is content
        let responseData = {};
        if (responseText.trim().length > 0) {
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            console.warn(
              "[TeamManagementStore] Could not parse response as JSON:",
              e
            );
          }
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
          err instanceof Error ? err.message : "An error occurred";
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
        error = err instanceof Error ? err.message : "An error occurred";
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
          error = err instanceof Error ? err.message : "An error occurred";
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
        const response = await fetch(
          `${API_BASE_URL}/team-management/project/${projectId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Failed to load project details (${response.status})`
          );
        }

        const data = await response.json();
        // The actual project data is nested under a 'project' key in the response
        modalProjectData = data.project;

        console.log("Loaded project details for modal:", modalProjectData);
      } catch (err) {
        console.error("Error loading project details for modal:", err);
        modalError = err instanceof Error ? err.message : "An error occurred";
        modalProjectData = null;
      } finally {
        isModalDataLoading = false;
      }
    },

    // Delete a department
    async deleteDepartment(departmentId: string) {
      if (!departmentId) {
        error = "Department ID is required";
        return false;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/departments/${departmentId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        if (!response.ok) {
          let errorDetails = `Failed to delete department (${response.status})`;
          try {
            const errorData = await response.json();
            errorDetails += `: ${errorData.message || "Unknown error"}`;
          } catch (parseErr) {
            /* Ignore parse error */
          }
          throw new Error(errorDetails);
        }

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
        error = err instanceof Error ? err.message : "An error occurred";
        return false;
      }
    },
  };
</script>

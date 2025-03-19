<!-- src/lib/stores/TeamManagementStore.svelte -->
<script lang="ts" module>
  import type { Organization, Department, Project, User } from "../types/auth";
  import { auth } from "./AuthStore.svelte";

  // State management
  let selectedResourceType = $state<"organization" | "department" | "project">(
    "organization"
  );
  let selectedResourceId = $state<string | null>(null);
  let organizationStructure = $state<any | null>(null);
  let departmentStructure = $state<any | null>(null);
  let projectTeam = $state<any | null>(null);
  let userResources = $state<any | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let permissions = $state<Record<string, boolean>>({});
  let settings = $state<Record<string, any>>({});

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

    // Set the selected resource
    setSelectedResource(
      type: "organization" | "department" | "project",
      id: string
    ) {
      selectedResourceType = type;
      selectedResourceId = id;

      // Load the selected resource data
      switch (type) {
        case "organization":
          this.loadOrganizationStructure(id);
          break;
        case "department":
          this.loadDepartmentStructure(id);
          break;
        case "project":
          this.loadProjectTeam(id);
          break;
      }
    },

    // Load resources that the user has access to
    async loadUserResources() {
      isLoading = true;
      error = null;

      try {
        const response = await fetch(
          "http://localhost:3333/team-management/resources",
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load resources (${response.status})`);
        }

        const data = await response.json();
        console.log("===== USER RESOURCES DATA =====", data);
        console.log("Organizations:", data.organizations?.length);
        console.log("Departments:", data.departments?.length);
        console.log("Projects:", data.projects?.length);
        if (data.projects?.length > 0) {
          console.log(
            "Projects list:",
            data.projects.map((p: any) => ({ id: p.id, name: p.name }))
          );
        }
        userResources = data;

        // If no resource is selected and we have organizations, select the first one
        if (!selectedResourceId && data.organizations?.length > 0) {
          this.setSelectedResource("organization", data.organizations[0].id);
        }
      } catch (err) {
        console.error("Error loading user resources:", err);
        error = err instanceof Error ? err.message : "An error occurred";
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
          `http://localhost:3333/team-management/organization/${organizationId}`,
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
        console.log("Organization structure raw response:", data);

        // Check if there are any roles available
        const hasRoles = data.organization?.users?.some(
          (user: any) => user.role && user.role.id
        );
        console.log("Organization has users with roles:", hasRoles);

        // If no roles are found, add some hardcoded roles for the interface
        if (
          data.organization &&
          (!hasRoles || !data.organization.users?.length)
        ) {
          console.log("Adding hardcoded roles to organization structure");
          data.organization.availableRoles = [
            { id: "admin", name: "Admin" },
            { id: "member", name: "Member" },
          ];
        }

        organizationStructure = data.organization;
        permissions = data.permissions || {};
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
          console.log("Creating fallback organization structure");
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
          `http://localhost:3333/team-management/department/${departmentId}`,
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
        console.log("Department structure raw response:", data);

        // Check if there are any roles available
        const hasRoles = data.department?.users?.some(
          (user: any) => user.role && user.role.id
        );
        console.log("Department has users with roles:", hasRoles);

        // If no roles are found, add some hardcoded roles for the interface
        if (data.department && (!hasRoles || !data.department.users?.length)) {
          console.log("Adding hardcoded roles to department structure");
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
          `http://localhost:3333/team-management/project/${projectId}`,
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
        console.log("Project team raw response:", data);

        // Check if there are any roles available
        const hasRoles = data.project?.users?.some(
          (user: any) => user.role && user.role.id
        );
        console.log("Project has users with roles:", hasRoles);

        // If no roles are found, add some hardcoded roles for the interface
        if (data.project && (!hasRoles || !data.project.users?.length)) {
          console.log("Adding hardcoded roles to project structure");
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
          `http://localhost:3333/team-management/${selectedResourceType}/${selectedResourceId}/users`,
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

      console.log("Updating user role:", {
        userId,
        roleId,
        resourceType: selectedResourceType,
        resourceId: selectedResourceId,
      });

      try {
        // The backend now handles both string role names (like "admin", "member") and UUIDs
        // So we can send the roleId directly without conversion
        const payload = { roleId };
        console.log("Sending update role payload:", payload);

        const response = await fetch(
          `http://localhost:3333/team-management/${selectedResourceType}/${selectedResourceId}/users/${userId}`,
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

        console.log("Successfully updated role");
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
          `http://localhost:3333/team-management/${selectedResourceType}/${selectedResourceId}/users/${userId}`,
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

      console.log(
        `Attempting to self-assign to ${selectedResourceType} (${selectedResourceId}) with role: ${roleId}`
      );

      try {
        const payload = { roleId };
        console.log("Sending self-assign payload:", payload);

        const response = await fetch(
          `http://localhost:3333/team-management/${selectedResourceType}/${selectedResourceId}/self-assign`,
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

        console.log(`Successfully self-assigned to ${selectedResourceType}`);

        // Reload the current resource data
        await this.refreshCurrentResource();
        return true;
      } catch (err) {
        console.error("Error self-assigning:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        return false;
      }
    },

    // Load settings for the current resource
    async loadSettings() {
      if (!selectedResourceType || !selectedResourceId) return;

      isLoading = true;
      error = null;

      try {
        const response = await fetch(
          `http://localhost:3333/settings/${selectedResourceType}/${selectedResourceId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load settings (${response.status})`);
        }

        const data = await response.json();
        settings = data;
      } catch (err) {
        console.error("Error loading settings:", err);
        error = err instanceof Error ? err.message : "An error occurred";
      } finally {
        isLoading = false;
      }
    },

    // Update a specific setting
    async updateSetting(key: string, value: any) {
      if (!selectedResourceType || !selectedResourceId) {
        error = "No resource selected";
        return false;
      }

      console.log(`[TeamManagementStore] Updating setting: ${key} to`, value);
      console.log(
        `[TeamManagementStore] Resource: ${selectedResourceType}/${selectedResourceId}`
      );

      try {
        const url = `http://localhost:3333/settings/${selectedResourceType}/${selectedResourceId}`;
        const body = JSON.stringify({ [key]: value });

        console.log(`[TeamManagementStore] Making API call to: ${url}`);
        console.log(`[TeamManagementStore] Request body: ${body}`);

        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: body,
        });

        console.log(
          `[TeamManagementStore] API response status:`,
          response.status
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`[TeamManagementStore] Error response:`, errorData);
          throw new Error(
            `Failed to update setting (${response.status}): ${errorData.message || response.statusText}`
          );
        }

        // Obtain response text first to check if there's any content
        const responseText = await response.text();
        console.log(`[TeamManagementStore] Response text:`, responseText);

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

        console.log(
          `[TeamManagementStore] Parsed response data:`,
          responseData
        );

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
          console.log(
            `[TeamManagementStore] Setting has changed, updating local state`
          );
          settings = newSettings;
        } else {
          console.log(
            `[TeamManagementStore] No change detected in settings, skipping update`
          );
        }

        return true;
      } catch (err) {
        console.error("[TeamManagementStore] Error updating setting:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        return false;
      }
    },

    // Refresh the current resource data
    async refreshCurrentResource() {
      if (!selectedResourceType || !selectedResourceId) return;

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
      await this.loadSettings();
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
    },

    // Initialize the store
    async initialize() {
      if (auth.currentOrganization?.id) {
        await this.loadUserResources();
        await this.loadSettings();
      } else {
        this.clear();
      }
    },
  };
</script>

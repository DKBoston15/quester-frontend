<script lang="ts" module>
  import { API_BASE_URL } from "$lib/config";
  import { setGlobalLogoutHandler, api } from "../services/api-client";
  import type { Organization, User } from "../types/auth";

  let user: User | null = $state(null);
  let currentOrganization = $state<Organization | null>(null);
  let isLoading = $state(true);
  const isAuthenticated = $derived(Boolean(user));
  const currentOrgId = $derived(currentOrganization?.id || null);

  export const auth = {
    get user() {
      return user;
    },
    get currentOrganization() {
      return currentOrganization;
    },
    get currentOrgId() {
      return currentOrgId;
    },
    get isLoading() {
      return isLoading;
    },
    get isAuthenticated() {
      return isAuthenticated;
    },

    async setUser(newUser: User) {
      user = newUser;
      if (newUser) {
        const orgs = await this.fetchUserOrganizations();
        if (orgs && orgs.length > 0) {
          // Load the last selected org from localStorage if available
          const lastOrgId = localStorage.getItem("lastSelectedOrgId");
          const lastOrg = orgs.find(
            (org: Organization) => org.id === lastOrgId
          );
          await this.setCurrentOrganization(lastOrg || orgs[0]);
        }
      }
      isLoading = false;
    },

    async setCurrentOrganization(org: Organization | null) {
      currentOrganization = org;

      // Store the selected org ID in localStorage
      if (org?.id) {
        localStorage.setItem("lastSelectedOrgId", org.id);
      } else {
        localStorage.removeItem("lastSelectedOrgId");
      }

      // Trigger a re-render of components that depend on currentOrganization
      const event = new CustomEvent("organizationChanged", { detail: org });
      window.dispatchEvent(event);
    },

    clearUser() {
      user = null;
      currentOrganization = null;
      localStorage.removeItem("lastSelectedOrgId");
      isLoading = false;
    },

    // Global logout handler for API client - called automatically on 401/403 errors
    handleGlobalLogout() {
      console.log("Global logout triggered by API client due to authentication error");
      
      // Clear user state immediately to prevent half-logout
      this.clearUser();
      
      // Redirect to login page
      window.location.href = "/";
    },

    async fetchUserOrganizations() {
      try {
        // Use centralized API client with skip auth check to prevent loops
        const { data } = await api.get(`/organizations/by-user?userId=${user?.id}`, { skipAuthCheck: true });
        return data as Organization[];
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        return null;
      }
    },

    async verifySession() {
      try {
        // Use centralized API client with skip auth check to prevent loops
        const data = await api.get(`/auth/verify`, { skipAuthCheck: true });
        if (data?.user) {
          // First set the user
          user = data.user;

          // Then load organizations
          const orgs = await this.fetchUserOrganizations();
          if (orgs && orgs.length > 0) {
            // Load the last selected org from localStorage if available
            const lastOrgId = localStorage.getItem("lastSelectedOrgId");
            const lastOrg = orgs.find(
              (org: Organization) => org.id === lastOrgId
            );
            await this.setCurrentOrganization(lastOrg || orgs[0]);
          } else {
            await this.setCurrentOrganization(null);
          }
        } else {
          this.clearUser();
        }
      } catch (error) {
        console.error("Failed to verify session:", error);
        this.clearUser();
      } finally {
        isLoading = false;
      }
    },

    login() {
      window.location.href = `${API_BASE_URL}/auth/redirect`;
    },

    async logout() {
      try {
        // Use centralized API client with skip auth check since we're logging out
        await api.post(`/auth/logout`, {}, { skipAuthCheck: true });
      } catch (error) {
        console.error("LOCAL LOGOUT: Network error during logout:", error);
      } finally {
        this.clearUser(); // Clear auth state regardless of API call result
        window.location.href = "/";
      }
    },

    // Make sure the rest of your AuthStore code (setUser, verifySession etc.) remains the same

    async updateUser(userData: Partial<User>) {
      try {
        // Use centralized API client which handles auth errors automatically
        const updatedUser = await api.put(`/users/${user?.id}`, userData);
        await this.setUser({ ...user!, ...updatedUser });
        return { success: true, user: updatedUser };
      } catch (error) {
        console.error("Failed to update user:", error);
        throw error;
      }
    },
  };

  // Register the global logout handler with the API client
  // This ensures all API calls will trigger logout on 401/403 errors
  setGlobalLogoutHandler(() => auth.handleGlobalLogout());
</script>

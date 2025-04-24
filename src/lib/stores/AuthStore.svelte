<script lang="ts" module>
  import { API_BASE_URL } from "$lib/config";
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

    async fetchUserOrganizations() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/organizations/by-user?userId=${user?.id}`,
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const { data } = await response.json();
          return data as Organization[]; // Add type assertion here
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        return null;
      }
    },

    async verifySession() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
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

    // ===== START: Replace existing logout() function =====
    // Inside AuthStore.svelte auth = { ... }
    async logout() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          credentials: "include", // Crucial for sending cookies locally too
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        // Try to read response body regardless of status for debugging
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch (e) {
          console.log(
            "LOCAL LOGOUT: Could not parse response body as JSON or no body."
          );
        }
      } catch (error) {
        console.error("LOCAL LOGOUT: Network error during fetch:", error);
      } finally {
        this.clearUser(); // Should see "Local auth state cleared." log from this function
        window.location.href = "/";
      }
    },

    // Make sure the rest of your AuthStore code (setUser, verifySession etc.) remains the same

    async updateUser(userData: Partial<User>) {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${user?.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          throw new Error("Failed to update user");
        }

        const updatedUser = await response.json();
        await this.setUser({ ...user!, ...updatedUser });
        return { success: true, user: updatedUser };
      } catch (error) {
        console.error("Failed to update user:", error);
        throw error;
      }
    },
  };
</script>

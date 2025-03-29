<script lang="ts" module>
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
          `http://localhost:3333/organizations/by-user?userId=${user?.id}`,
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
        const response = await fetch("http://localhost:3333/auth/verify", {
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
      window.location.href = "http://localhost:3333/auth/redirect";
    },

    logout() {
      window.location.href = "http://localhost:3333/auth/logout";
    },

    async updateUser(userData: Partial<User>) {
      try {
        const response = await fetch(
          `http://localhost:3333/users/${user?.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(userData),
          }
        );

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

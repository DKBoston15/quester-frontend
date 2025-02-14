<script context="module" lang="ts">
  import type { Organization, User } from "../types/auth";

  let user: User | null = $state(null);
  let currentOrganization: Organization | null = $state(null);
  let isLoading = $state(true);
  const isAuthenticated = $derived(Boolean(user));
  const currentOrgId = $derived(currentOrganization?.id ?? null);

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
      console.log("Setting user:", newUser);
      user = newUser;
      if (newUser) {
        const orgs = await this.fetchUserOrganizations();
        console.log("Fetched orgs:", orgs);
        if (orgs?.length > 0) {
          // Load the last selected org from localStorage if available
          const lastOrgId = localStorage.getItem("lastSelectedOrgId");
          const lastOrg = orgs.find(
            (org: Organization) => org.id === lastOrgId
          );
          this.setCurrentOrganization(lastOrg || orgs[0]);
        }
      }
      isLoading = false;
    },

    async setCurrentOrganization(org: Organization | null) {
      console.log("Setting organization:", org);
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
          const { data } = await response.json(); // Extract the data array
          console.log("Organizations fetched:", data); // Debug
          return data; // Return just the data array
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
            await this.setUser(data.user);
          } else {
            this.clearUser();
          }
        } else {
          this.clearUser();
        }
      } catch (error) {
        console.error("Failed to verify session:", error);
        this.clearUser();
      }
    },

    login() {
      window.location.href = "http://localhost:3333/auth/redirect";
    },

    logout() {
      window.location.href = "http://localhost:3333/auth/logout";
    },
  };
</script>

// AuthStore.svelte

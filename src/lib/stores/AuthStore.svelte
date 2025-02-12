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
      console.log("Setting user:", newUser); // Debug
      user = newUser;
      if (newUser) {
        const orgs = await this.fetchUserOrganizations();
        console.log("Fetched orgs:", orgs); // Debug
        if (orgs?.length > 0) {
          console.log("Setting first org:", orgs[0]); // Debug
          this.setCurrentOrganization(orgs[0]);
        }
      }
      isLoading = false;
    },

    setCurrentOrganization(org: Organization | null) {
      console.log("Setting organization:", org);
      currentOrganization = org;
    },

    clearUser() {
      user = null;
      currentOrganization = null;
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

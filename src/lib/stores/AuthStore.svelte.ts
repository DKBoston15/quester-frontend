import { setGlobalLogoutHandler, api } from "../services/api-client";
import type { Organization, User } from "../types/auth";
import { identifyUser, clearUserIdentity } from "../services/fullstory";
import posthog from "posthog-js";

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
      identifyUser(newUser);
      await this.loadAndSetOrganization();
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

    syncPosthogIdentity();
  },

  clearUser() {
    user = null;
    currentOrganization = null;
    localStorage.removeItem("lastSelectedOrgId");
    isLoading = false;
    // Clear FullStory user identity
    clearUserIdentity();

    if (typeof window !== "undefined") {
      posthog.reset();
    }
  },

  // Global logout handler for API client - called automatically on 401/403 errors
  handleGlobalLogout() {
    // Clear user state immediately to prevent half-logout
    this.clearUser();

    // Redirect to login page
    window.location.href = "/";
  },

  async fetchUserOrganizations() {
    try {
      // Use centralized API client with skip auth check to prevent loops
      const data = await api.get(
        `/organizations/by-user?userId=${user?.id}&limit=100`,
        { skipAuthCheck: true }
      );
      // Backend returns paginated response { data: [...], meta: {...} }
      const orgs = (data as any)?.data ?? data;
      return Array.isArray(orgs) ? orgs as Organization[] : [];
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      return null;
    }
  },

  async verifySession() {
    try {
      const data = await api.get(`/auth/verify`, { skipAuthCheck: true });
      if (data?.user) {
        user = data.user;
        identifyUser(user!);
        await this.loadAndSetOrganization();
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

  async loadAndSetOrganization() {
    const orgs = await this.fetchUserOrganizations();
    if (orgs && orgs.length > 0) {
      const lastOrgId = localStorage.getItem("lastSelectedOrgId");
      const lastOrg = orgs.find((org: Organization) => org.id === lastOrgId);
      await this.setCurrentOrganization(lastOrg || orgs[0]);
    } else {
      await this.setCurrentOrganization(null);
    }
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

  async updateUser(userData: Partial<User>) {
    try {
      const updatedUser = await api.put(`/users/me/profile`, userData);
      // Update user data directly without re-fetching organizations
      // to avoid resetting app state
      user = { ...user!, ...updatedUser };
      // Re-identify user in FullStory with updated info
      if (user) {
        identifyUser(user);
      }
      syncPosthogIdentity();
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

function syncPosthogIdentity() {
  if (typeof window === "undefined" || !user) {
    return;
  }

  const displayName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const properties: Record<string, string> = {
    email: user.email,
    name: displayName || user.email,
  };

  if (user.firstName) {
    properties.first_name = user.firstName;
  }

  if (user.lastName) {
    properties.last_name = user.lastName;
  }

  if (currentOrganization?.id) {
    properties.organization_id = currentOrganization.id;
  }

  posthog.identify(user.authProviderId || user.id, properties);
}

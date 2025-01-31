<script context="module" lang="ts">
    import type {Organization, User} from "../types/auth";

    let user: User | null = $state(null);
    let currentOrganization: Organization | null = $state(null);
    let isLoading = $state(true);

    const isAuthenticated = $derived(Boolean(user));

    export const auth = {
        get user() { return user; },
        get currentOrganization() { return currentOrganization; },
        get isLoading() { return isLoading; },
        get isAuthenticated() { return isAuthenticated; },

        setUser(newUser: User) {
            user = newUser;
            isLoading = false;
        },

        setCurrentOrganization(org: Organization | null) {
            currentOrganization = org;
        },

        clearUser() {
            user = null;
            currentOrganization = null;
            isLoading = false;
        },

        async fetchUserOrganizations() {
            try {
                const response = await fetch(`http://localhost:3333/organizations/user/${user?.id}`, {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
                return null;
            } catch (error) {
                console.error('Failed to fetch organizations:', error);
                return null;
            }
        },

        async verifySession() {
            try {
                const response = await fetch('http://localhost:3333/auth/verify', {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data?.user) {
                        this.setUser(data.user);
                    } else {
                        this.clearUser();
                    }
                } else {
                    this.clearUser();
                }
            } catch (error) {
                console.error('Failed to verify session:', error);
                this.clearUser();
            }
        },

        login() {
            window.location.href = "http://localhost:3333/auth/redirect";
        },

        logout() {
            window.location.href = "http://localhost:3333/auth/logout";
        }
    };
</script>
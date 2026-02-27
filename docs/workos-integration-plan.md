# WorkOS Integration Plan — Quester Frontend (v2)

> **Date**: 2026-02-27
> **Status**: Draft — Planning Only (No Code Changes)
> **Scope**: Frontend only. Backend handles all direct WorkOS API communication.
> **Constraint**: Free-tier WorkOS features only.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Context](#2-architecture-context)
3. [Backend WorkOS Status (Already Done)](#3-backend-workos-status-already-done)
4. [Free vs Paid WorkOS Features](#4-free-vs-paid-workos-features)
5. [Current Frontend Inventory](#5-current-frontend-inventory)
6. [Phase 1 — Auth Flow Cleanup & Session Hardening](#6-phase-1--auth-flow-cleanup--session-hardening)
7. [Phase 2 — User Profile Alignment](#7-phase-2--user-profile-alignment)
8. [Phase 3 — Organization Data Model Alignment](#8-phase-3--organization-data-model-alignment)
9. [Phase 4 — Invitations & Team Membership (WorkOS-backed)](#9-phase-4--invitations--team-membership-workos-backed)
10. [Phase 5 — Roles & Permissions via WorkOS RBAC](#10-phase-5--roles--permissions-via-workos-rbac)
11. [Phase 6 — Fine-Grained Authorization for Departments & Projects](#11-phase-6--fine-grained-authorization-for-departments--projects)
12. [Phase 7 — Feature Flags (Replace Custom Team Settings)](#12-phase-7--feature-flags-replace-custom-team-settings)
13. [Phase 8 — MFA Support](#13-phase-8--mfa-support)
14. [Phase 9 — Cleanup & Dead Code Removal](#14-phase-9--cleanup--dead-code-removal)
15. [Files Impact Summary](#15-files-impact-summary)
16. [Migration Strategy](#16-migration-strategy)
17. [Risk Assessment](#17-risk-assessment)
18. [Backend Work Required (Tracked Separately)](#18-backend-work-required-tracked-separately)

---

## 1. Executive Summary

### What's already true

The Quester **backend** (AdonisJS) already integrates WorkOS for:
- **Authentication** via AuthKit (sealed sessions, `wos-session` cookie)
- **Organizations** CRUD (create, update, delete synced to WorkOS)
- **Organization Memberships** (add/remove users via WorkOS)
- **Invitations** (send, accept, revoke via WorkOS)

The **frontend** is a plain **Svelte 5 + Vite SPA** (NOT SvelteKit) that communicates with the backend via cookie-authenticated REST API calls. It never directly contacts WorkOS. The auth flow already works: redirect → backend → AuthKit hosted UI → callback → sealed session cookie → frontend `GET /auth/verify`.

### What this plan does

This plan updates the **frontend** to:
1. Clean up legacy auth code that predates the WorkOS backend migration
2. Align frontend data models/types with WorkOS-backed backend responses
3. Update team management UI to leverage WorkOS-backed invitations and memberships
4. Prepare for **new** free WorkOS features: Roles & Permissions, FGA, Feature Flags, MFA
5. Remove all dead/redundant custom code

### What this plan does NOT do

- Add any WorkOS SDK to the frontend (not needed — backend proxies everything)
- Migrate to SvelteKit (stays as plain Svelte + Vite SPA)
- Implement paid features (no Enterprise SSO, Directory Sync, Audit Logs, Radar)
- Change the backend (tracked separately)

---

## 2. Architecture Context

### Tech Stack
- **Frontend**: Svelte 5 (runes API) + Vite + TypeScript + Tailwind CSS + shadcn-svelte
- **Routing**: `svelte-routing` (client-side SPA router, NOT SvelteKit)
- **Backend**: AdonisJS with `@workos-inc/node@^7.37.2`
- **Auth mechanism**: `wos-session` HTTP-only cookie (WorkOS sealed session)
- **API communication**: `credentials: 'include'` on all fetch calls (cookie auto-sent)

### Data Flow
```
Frontend (Svelte SPA)
    │
    │  REST API calls with credentials: 'include'
    │  (wos-session cookie auto-attached)
    │
    ▼
Backend (AdonisJS)
    │
    │  WorkOS Guard validates sealed session
    │  WorkOS Service makes API calls
    │
    ▼
WorkOS (AuthKit, User Mgmt, Orgs, Invitations, etc.)
```

### Critical Point: No WorkOS SDK on the Frontend

The frontend has **zero** WorkOS dependencies. All WorkOS interaction is proxied through the backend. This means:
- `@workos/authkit-sveltekit` — **NOT applicable** (requires SvelteKit, we use plain Svelte)
- `@workos-inc/authkit-js` — **NOT needed** (backend handles auth)
- `@workos-inc/widgets` — **NOT usable** (React components, we use Svelte; also would need direct WorkOS access)

All frontend changes involve updating components to work with **backend endpoints** that are backed by WorkOS.

---

## 3. Backend WorkOS Status (Already Done)

| Feature | Backend Status | WorkOS API Used |
|---|---|---|
| **OAuth login flow** | ✅ Working | `getAuthorizationUrl()`, `authenticateWithCode()` |
| **Session management** | ✅ Working | `loadSealedSession()`, sealed `wos-session` cookie |
| **Session verification** | ✅ Working | `GET /auth/verify` → validates sealed session |
| **Logout** | ✅ Working | `POST /auth/logout` → clears cookie |
| **User sync** | ✅ Working | Find-or-create local user from WorkOS user on login |
| **Organization CRUD** | ✅ Working | `createOrganization()`, `updateOrganization()`, `deleteOrganization()` |
| **Org memberships** | ✅ Working | `createOrganizationMembership()`, `deleteOrganizationMembership()` |
| **Invitations** | ✅ Working | `sendInvitation()`, `acceptInvitation()`, `revokeInvitation()`, `listInvitations()` |
| **Invitation → org join** | ✅ Working | Auto-processes invitation on OAuth callback if `organizationId` present |
| **Roles & Permissions** | ❌ Not yet | Local `PermissionService` handles roles (not WorkOS R&P) |
| **FGA** | ❌ Not yet | Department/project permissions are local |
| **Feature Flags** | ❌ Not yet | Custom `TeamSettings` toggles stored in local DB |
| **MFA** | ❌ Not yet | AuthKit supports it; just needs dashboard enablement |
| **Webhooks** | ❌ Not yet | No webhook handler — entirely pull-based |

---

## 4. Free vs Paid WorkOS Features

### In Scope (Free Tier)

| Feature | Free Limit | Use In Quester |
|---|---|---|
| **AuthKit** (auth UI, social login, email+password, passkeys, magic auth) | 1M MAUs/month | ✅ Already active |
| **User Management** (CRUD, email verification, password reset) | Included with AuthKit | ✅ Already active |
| **Organizations** (multi-tenancy, memberships) | Unlimited | ✅ Already active |
| **Invitations** | Unlimited | ✅ Already active |
| **Roles & Permissions** (org-level RBAC, JWT-embedded permissions) | Unlimited | 🔲 Phase 5 |
| **Fine-Grained Authorization** (resource-level permissions) | 10M ops/month | 🔲 Phase 6 |
| **Feature Flags** (per-org feature gating) | Unlimited | 🔲 Phase 7 |
| **MFA** (TOTP, SMS) | Included with AuthKit | 🔲 Phase 8 |
| **Radar** (bot protection) | 1,000 checks free | ✅ Dashboard toggle only |

### Out of Scope (Paid)

| Feature | Cost | Decision |
|---|---|---|
| Enterprise SSO (SAML/OIDC) | $125/connection/mo | ❌ Excluded |
| Directory Sync (SCIM) | $125/connection/mo | ❌ Excluded |
| Admin Portal (SSO/DSYNC config) | Requires SSO/DSYNC | ❌ Excluded (no SSO to configure) |
| Audit Logs (SIEM export) | $125/connection + $99/M events | ❌ Excluded |
| Custom Domains | $99/mo | ❌ Excluded |
| Stripe Seat Sync | Unknown pricing | ❌ Excluded (keep existing Stripe integration) |

---

## 5. Current Frontend Inventory

### Authentication Flow (Working, needs cleanup)

```
Current:
1. App.svelte onMount → auth.verifySession()
   - GET /auth/verify (credentials: 'include', sends wos-session cookie)
   - Backend validates sealed session, returns { user: {...} }
   - AuthStore sets user, fetches orgs, restores last org from localStorage
2. If not authed → render SignIn.svelte
   - Both "Continue with Google" and "Use email & password" buttons
     → window.location.href = `${API_BASE_URL}/auth/redirect`
   - Backend redirects to WorkOS AuthKit hosted UI
   - User authenticates → WorkOS callback → backend sets wos-session → redirect to frontend
3. If authed → render ProtectedLayout with routes
4. Every API call: credentials: 'include' (cookie auto-sent)
5. On 401: global logout handler fires → clear state → redirect to /
6. Logout: POST /auth/logout → clear client state → redirect to /
```

### Key Files

| File | Purpose | Change Needed |
|---|---|---|
| `src/lib/stores/AuthStore.svelte.ts` | Auth state, login/logout/verify, org switching | Moderate cleanup |
| `src/lib/services/api-client.ts` | HTTP client with cookie auth, 401 handler, retries | Minor |
| `src/App.svelte` | App shell, auth check on mount, routing | Moderate cleanup |
| `src/routes/SignIn.svelte` | Login page (two buttons, both redirect) | Simplify |
| `src/lib/components/ProtectedLayout.svelte` | Client-side auth guard | Keep |
| `src/lib/components/ProtectedRoute.svelte` | Client-side auth guard with loading state | Keep |
| `src/lib/types/auth.ts` | User, Organization, Role, etc. types | Update types |
| `src/lib/stores/TeamManagementStore.svelte.ts` | Team CRUD, roles, permissions | Significant rewrite |
| `src/lib/components/InvitationManager.svelte` | Send/manage invitations | Update for WorkOS-backed API |
| `src/lib/components/PendingInvites.svelte` | Accept/view pending invitations | Simplify |
| `src/lib/components/TeamMembersList.svelte` | Member list with roles | Update data source |
| `src/lib/components/RoleManager.svelte` | Role assignment UI | Update for WorkOS roles |
| `src/lib/components/TeamSettings.svelte` | Org permission toggles | Replace with feature flags |
| `src/routes/Settings.svelte` | User settings/profile | Update user data source |
| `src/lib/services/fullstory.ts` | FullStory analytics | Minor update |
| `src/lib/components/TeamSizeIndicator/` | Seat count display | Simplify |

---

## 6. Phase 1 — Auth Flow Cleanup & Session Hardening

**Goal**: Clean up legacy auth code. The flow already works with WorkOS on the backend, but the frontend has vestiges of the pre-WorkOS era.

### Changes

| File | Change | Details |
|---|---|---|
| `SignIn.svelte` | **Simplify** | Both buttons do the same thing (redirect to `/auth/redirect`). WorkOS AuthKit's hosted UI already presents all enabled auth methods (Google, email+password, etc.). Replace two buttons with a single "Sign In" button or auto-redirect. AuthKit handles method selection. |
| `App.svelte` | **Clean up** | Remove the 10-second safety timeout race condition. The `wos-session` cookie validation via `/auth/verify` is fast and reliable. Simplify the auth initialization flow. |
| `AuthStore.svelte.ts` | **Clean up** | Remove the `login()` method that just does `window.location.href` — this can be a simple utility. Simplify `verifySession()` error handling. The core state management (`user`, `currentOrganization`, `isAuthenticated`, `isLoading`) is fine. |
| `api-client.ts` | **No change** | The `credentials: 'include'` + 401 global logout pattern works correctly with `wos-session` cookie. Keep as-is. |
| `ProtectedLayout.svelte` | **No change** | Client-side guard is still needed in an SPA. Works correctly. |
| `ProtectedRoute.svelte` | **No change** | Same — keep the reactive `$effect` guard. |

### Acceptance Criteria
- [ ] SignIn page has a single clear call-to-action (AuthKit handles method selection)
- [ ] App.svelte auth initialization is simplified (no timeout race)
- [ ] Auth flow still works: redirect → AuthKit → callback → cookie → verify → dashboard
- [ ] 401 handling still works: API error → clear state → redirect to login
- [ ] No functional regressions in login/logout

---

## 7. Phase 2 — User Profile Alignment

**Goal**: Ensure frontend User type and profile UI match what the backend returns from WorkOS-synced user data.

### Current User type:
```typescript
type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  orcidUrl: string | null;
  metadata?: UserMetadata | null;
};
```

### Backend behavior:
On login callback, the backend syncs from WorkOS:
- `email` ← WorkOS user email
- `firstName` / `lastName` ← WorkOS user name
- `avatarUrl` ← WorkOS `profilePictureUrl`

The backend returns the **local** user object (with numeric `id`), not the raw WorkOS user object. So the frontend type mostly stays the same.

### Changes

| File | Change | Details |
|---|---|---|
| `src/lib/types/auth.ts` | **Add field** | Add `authProviderId?: string` to User type (the WorkOS user ID from backend). Useful for analytics and future direct WorkOS references. |
| `Settings.svelte` | **Minor update** | Ensure profile updates (name, avatar) go through backend which syncs to WorkOS. Add note that email changes require WorkOS flow (if supported). |
| `fullstory.ts` | **Minor update** | Use `authProviderId` (WorkOS user ID) for FullStory identity if available, for consistency across systems. |
| PostHog in `AuthStore` | **Minor update** | Same — use `authProviderId` for PostHog identity. |

### Acceptance Criteria
- [ ] User type includes `authProviderId` (WorkOS user ID)
- [ ] Profile page displays data from backend (which syncs from WorkOS)
- [ ] Name updates go through backend → WorkOS
- [ ] ORCID URL continues to work (app-specific, stays in local DB)
- [ ] Analytics services use WorkOS user ID for cross-system consistency

---

## 8. Phase 3 — Organization Data Model Alignment

**Goal**: Update Organization types and org-related UI to match WorkOS-backed backend responses.

### Current Organization type:
```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  billingProviderId?: string;
  subscriptionType?: "personal" | "organization";
  members: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  subscription?: { /* Stripe data */ };
  organizationRoles?: Array<{ roleId: string; role?: { id: string; name: string } }>;
}
```

### Backend behavior:
Organizations are created in WorkOS first, then stored locally with `authProviderOrgId` (WorkOS org ID). The backend returns the **local** org object enriched with members, subscription data, etc.

### Changes

| File | Change | Details |
|---|---|---|
| `src/lib/types/auth.ts` | **Add field** | Add `authProviderOrgId?: string` to Organization type. |
| `AuthStore.svelte.ts` | **Review** | Ensure `fetchUserOrganizations()` → `GET /organizations/by-user` returns WorkOS-synced data correctly. The `setCurrentOrganization()` + localStorage pattern is fine for an SPA. |
| Org switching UI | **No change** | The current localStorage-based org switching works for this SPA architecture. WorkOS session-based org switching requires SvelteKit (re-auth with org context), which is not applicable here. |

### Acceptance Criteria
- [ ] Organization type includes `authProviderOrgId` field
- [ ] Org CRUD operations work through backend → WorkOS pipeline
- [ ] Org switching via localStorage continues to work
- [ ] No regressions in org-dependent features (dashboard, team management, projects)

---

## 9. Phase 4 — Invitations & Team Membership (WorkOS-backed)

**Goal**: Update invitation and team membership UI to work with the backend's WorkOS-backed invitation and membership system.

### Backend behavior (already done):
- **Send invitation**: Backend calls `workos.userManagement.sendInvitation()` — WorkOS sends the email
- **Accept invitation**: On OAuth callback, backend detects `organizationId` and auto-processes the pending invite via `PermissionService`
- **Revoke invitation**: Backend calls `workos.userManagement.revokeInvitation()` — gracefully handles expired/already-accepted
- **Remove member**: Backend calls `workos.userManagement.deleteOrganizationMembership()`
- **Invitation model**: Local DB stores `authProviderInvitationId` (WorkOS invitation ID) + `accessMapping` JSONB for multi-resource role assignments

### Current invitation flow:
```
Admin → InvitationManager → POST /invitations (email, roles for org/dept/project)
                                  ↓
Backend → WorkOS sends email + creates local Invitation with accessMapping
                                  ↓
User clicks email link → WorkOS AuthKit → Backend callback → auto-joins org + processes accessMapping
```

### Key insight:
The invitation flow is **already WorkOS-backed**. The frontend's `InvitationManager.svelte` sends to the backend, which calls WorkOS. The main frontend work is:
1. Ensuring the invitation UI works correctly with the WorkOS-backed flow
2. Simplifying `PendingInvites.svelte` since WorkOS handles acceptance (user clicks email → AuthKit → auto-join)
3. Handling the case where `createOrganizationMembership` is commented out in the backend (noted as a gap)

### Changes

| File | Change | Details |
|---|---|---|
| `InvitationManager.svelte` | **Review & update** | Ensure invitation sending works with backend's WorkOS-backed endpoint. The `accessMapping` pattern (org + dept + project roles in one invite) is a Quester-specific feature on top of WorkOS — keep it. |
| `PendingInvites.svelte` | **Simplify** | WorkOS handles invitation acceptance via email link → AuthKit. The manual "accept invitation" UI may be redundant for most cases. Consider showing pending invites as informational only (user needs to check their email). |
| `TeamMembersList.svelte` | **Update** | Ensure member removal calls the backend endpoint that triggers `deleteOrganizationMembership()` in WorkOS. |
| `TeamManagementStore.svelte.ts` | **Update** | Update invitation-related methods to match backend's WorkOS-backed response format. |

### Acceptance Criteria
- [ ] Sending invitations works (frontend → backend → WorkOS sends email)
- [ ] Invitation list shows pending invitations from backend (sourced from WorkOS)
- [ ] Revoking invitations works (frontend → backend → WorkOS revoke)
- [ ] Removing team members triggers WorkOS membership deletion via backend
- [ ] Accepting invitations via email link works end-to-end (AuthKit → callback → auto-join)
- [ ] The `accessMapping` multi-resource role assignment still works on acceptance

---

## 10. Phase 5 — Roles & Permissions via WorkOS RBAC

**Goal**: Replace the custom local permission system with WorkOS Roles & Permissions for **organization-level** access control.

### Current system:
- 3 org-level roles: Owner, Admin, Member
- Managed by local `PermissionService` in the backend
- Frontend reads role data from API responses and gates UI accordingly
- `RoleManager.svelte` provides role assignment UI
- `TeamManagementStore.svelte.ts` has a `permissions` object derived from the user's role

### WorkOS Roles & Permissions (free):
- Define custom roles in WorkOS dashboard (e.g., `org-owner`, `org-admin`, `member`)
- Assign roles to organization memberships
- Permissions are embedded in the JWT/session — available without extra API calls
- Backend validates permissions server-side; frontend reads them for UI gating

### What needs to happen:

**Backend (tracked separately)**:
1. Define roles (`org-owner`, `org-admin`, `member`) in WorkOS dashboard
2. Define permission slugs (e.g., `org:manage`, `org:members:invite`, `org:billing:manage`)
3. Assign roles when creating memberships
4. Expose permissions in the `/auth/verify` response or a new `/auth/permissions` endpoint
5. Migrate existing role assignments to WorkOS

**Frontend**:

| File | Change | Details |
|---|---|---|
| `src/lib/types/auth.ts` | **Add types** | Add `WorkOSRole` and `Permission` types. Add `permissions?: string[]` to the auth context. |
| `AuthStore.svelte.ts` | **Add permissions** | Store permissions from `/auth/verify` response. Expose `hasPermission(slug)` helper. |
| `RoleManager.svelte` | **Update** | Fetch available roles from backend (which reads from WorkOS). Role assignment calls backend → WorkOS membership role update. |
| `TeamMembersList.svelte` | **Update** | Display WorkOS role names instead of local role names. |
| `TeamManagementStore.svelte.ts` | **Rewrite permissions** | Replace the manually-constructed `permissions` object with a `hasPermission(slug)` check. Gate UI based on permission slugs from WorkOS, not local role comparisons. |
| All components with role checks | **Update** | Replace `role === 'Owner'` checks with `hasPermission('org:manage')` checks. |

### Permission slugs to define:

```
org:manage              — Full org management (Owner only)
org:settings:read       — View org settings (Admin+)
org:settings:write      — Modify org settings (Admin+)
org:members:invite      — Send invitations (Admin+ or Member if allowed)
org:members:manage      — Change roles, remove members (Admin+)
org:billing:manage      — Manage subscriptions (Owner only)
org:departments:create  — Create departments (configurable)
org:projects:create     — Create projects (configurable)
```

### Acceptance Criteria
- [ ] Roles defined in WorkOS dashboard (Owner, Admin, Member)
- [ ] Permissions embedded in auth context available to frontend
- [ ] `hasPermission()` helper available throughout the app
- [ ] Role assignment UI uses WorkOS-backed roles via backend
- [ ] UI elements gated by permission slugs (not hardcoded role names)
- [ ] Existing role assignments migrated to WorkOS (backend task)

---

## 11. Phase 6 — Fine-Grained Authorization for Departments & Projects

**Goal**: Replace custom department/project permission hierarchy with WorkOS FGA (10M free ops/month).

### Current system:
- Departments and Projects have their own role assignments (Manager/Member, Owner/Admin/Member)
- Managed by local `PermissionService`
- Invitation `accessMapping` JSONB assigns roles at org + dept + project level simultaneously
- Frontend displays department/project-specific member lists and role managers

### WorkOS FGA (free tier):
- Define resource types: `organization`, `department`, `project`
- Define relations (roles) per type: e.g., `department#manager`, `project#admin`
- Create warrants: `user:X is manager of department:Y`
- Check access: `can user:X manage department:Y?` → boolean
- List resources: `what departments can user:X access?` → list
- Inheritance: `org-admin of organization:A` → inherits access to all departments/projects in org A

### What needs to happen:

**Backend (tracked separately)**:
1. Define FGA resource types and relations in WorkOS
2. Create warrants when assigning dept/project roles
3. Check warrants for permission decisions
4. New endpoints: `GET /permissions/check`, `GET /permissions/resources`
5. Migrate existing dept/project role assignments to FGA warrants

**Frontend**:

| File | Change | Details |
|---|---|---|
| `TeamManagementStore.svelte.ts` | **Rewrite dept/project logic** | Replace local role lookups with backend calls that use FGA. E.g., `GET /departments/:id/members` returns FGA-resolved member list. |
| `TeamMembersList.svelte` | **Update** | When viewing department or project members, fetch from FGA-backed endpoint. |
| `RoleManager.svelte` | **Update** | When assigning dept/project roles, call backend → FGA warrant creation. |
| `InvitationManager.svelte` | **Update** | The `accessMapping` pattern may change: org invite via WorkOS, then dept/project access as a separate step post-acceptance. |
| Permission checks in UI | **Add** | Before showing "edit" buttons on a project, check `GET /permissions/check?resource=project:X&permission=manage`. Cache results. |

### Two-layer auth model:
```
Layer 1 — Org-level (WorkOS Roles & Permissions, Phase 5):
  "Can this user invite members?"  →  Check permission slug from session
  Fast, no API call needed (embedded in auth context)

Layer 2 — Resource-level (WorkOS FGA, Phase 6):
  "Can this user edit Project X?"  →  Check via backend FGA endpoint
  Requires API call, but cacheable (cache for 30-60 seconds)
```

### Acceptance Criteria
- [ ] FGA resource types defined: organization, department, project
- [ ] Department member lists sourced from FGA via backend
- [ ] Project member lists sourced from FGA via backend
- [ ] Role assignment for departments/projects creates FGA warrants via backend
- [ ] Permission inheritance works (org admin → all depts/projects)
- [ ] UI gates resource actions based on FGA permission checks
- [ ] Frontend caches FGA results to minimize API calls

---

## 12. Phase 7 — Feature Flags (Replace Custom Team Settings)

**Goal**: Replace the custom `TeamSettings` toggles with WorkOS Feature Flags (free).

### Current TeamSettings toggles:
```
allowMemberInvitations         — Let members (not just admins) send invites
allowMembersToCreateProjects   — Let members create projects
allowMembersToCreateDepartments — Let members create departments
allowAdminsToCreateDepartments — Let admins create departments
```

These are stored as boolean fields on the Organization model in the local DB. Org admins toggle them in `TeamSettings.svelte`.

### WorkOS Feature Flags (free):
- Define flags in WorkOS dashboard
- Fetch flag state per organization: `GET /feature-flags?organization_id=X`
- Toggle flags via WorkOS dashboard or API
- Org-level scoping built in

### What needs to happen:

**Backend (tracked separately)**:
1. Define feature flags in WorkOS dashboard matching current settings
2. New endpoint: `GET /organizations/:id/feature-flags` → returns flag states from WorkOS
3. New endpoint: `PUT /organizations/:id/feature-flags/:flag` → updates flag in WorkOS
4. Migrate existing setting values to WorkOS feature flags

**Frontend**:

| File | Change | Details |
|---|---|---|
| `TeamSettings.svelte` | **Rewrite** | Fetch flags from `GET /organizations/:id/feature-flags`. Toggle calls `PUT` endpoint. Display matches current UI (toggle switches). |
| `TeamManagementStore.svelte.ts` | **Update** | Replace settings checks (`if settings.allowMemberInvitations`) with feature flag checks. |
| `InvitationManager.svelte` | **Update** | Check `allow_member_invitations` flag to determine if current user (member) can invite. |
| Any component checking team settings | **Update** | Replace with feature flag lookups. |

### Feature flags to create:

| WorkOS Flag Key | Replaces | Default |
|---|---|---|
| `allow_member_invitations` | `allowMemberInvitations` | `false` |
| `allow_members_create_projects` | `allowMembersToCreateProjects` | `false` |
| `allow_members_create_departments` | `allowMembersToCreateDepartments` | `false` |
| `allow_admins_create_departments` | `allowAdminsToCreateDepartments` | `true` |

### Acceptance Criteria
- [ ] Feature flags defined in WorkOS dashboard
- [ ] TeamSettings UI reads/writes flags via backend → WorkOS
- [ ] All permission checks that referenced old settings now check feature flags
- [ ] Feature flag values are org-scoped (different orgs can have different settings)
- [ ] Old setting fields on Organization model deprecated

---

## 13. Phase 8 — MFA Support

**Goal**: Enable MFA for users via WorkOS AuthKit (free, built into AuthKit).

### How it works:
MFA is handled entirely by AuthKit's hosted UI. When enabled:
- Users see an MFA enrollment step after login
- TOTP (authenticator app) and SMS are supported
- Orgs can optionally require MFA for all members

### What needs to happen:

**Backend/Dashboard**:
1. Enable MFA in WorkOS dashboard (AuthKit settings)
2. Optionally: endpoint to require MFA for an org

**Frontend**:

| File | Change | Details |
|---|---|---|
| `Settings.svelte` | **Add section** | Show MFA enrollment status. Link to manage MFA factors (could redirect to AuthKit hosted UI or build custom UI with backend API). |
| `TeamSettings.svelte` (or org settings) | **Add toggle** | Allow org owners to require MFA for all members (calls backend → WorkOS org setting). |

### Acceptance Criteria
- [ ] MFA enabled in WorkOS AuthKit dashboard
- [ ] Users can enroll in TOTP MFA during login flow (handled by AuthKit)
- [ ] User settings shows MFA enrollment status
- [ ] Org owners can require MFA for their organization (optional)

---

## 14. Phase 9 — Cleanup & Dead Code Removal

**Goal**: Remove all dead/redundant code after phases 1-8 are complete.

### Code to remove/simplify:

| What | Why |
|---|---|
| Dual login buttons in `SignIn.svelte` | AuthKit handles method selection |
| 10-second timeout race in `App.svelte` | `wos-session` validation is reliable |
| Manual `permissions` object construction in `TeamManagementStore` | Replaced by `hasPermission()` |
| Local role comparison logic (`role === 'Owner'`) | Replaced by permission slug checks |
| Old team settings fields on Organization type | Replaced by feature flags |
| Any unused types in `auth.ts` | Clean up after type alignment |

### Acceptance Criteria
- [ ] No dead code related to old auth/role/permission patterns
- [ ] All `auth.ts` types reflect current WorkOS-backed data model
- [ ] No references to deprecated team settings fields
- [ ] TypeScript `svelte-check` passes with no errors
- [ ] All existing features still work

---

## 15. Files Impact Summary

### Files to MODIFY

| File | Phase | Severity | Description |
|---|---|---|---|
| `src/routes/SignIn.svelte` | 1 | Light | Simplify to single CTA |
| `src/App.svelte` | 1 | Light | Remove timeout race logic |
| `src/lib/stores/AuthStore.svelte.ts` | 1, 2, 5 | Moderate | Cleanup + add `hasPermission()` + add `authProviderId` |
| `src/lib/types/auth.ts` | 2, 3, 5 | Moderate | Add WorkOS fields, permission types |
| `src/routes/Settings.svelte` | 2, 8 | Light | Update data source, add MFA section |
| `src/lib/services/fullstory.ts` | 2 | Light | Use WorkOS user ID |
| `src/lib/stores/TeamManagementStore.svelte.ts` | 4, 5, 6, 7 | **Heavy** | Rewrite permissions, dept/project logic, settings checks |
| `src/lib/components/InvitationManager.svelte` | 4, 7 | Moderate | Align with WorkOS-backed invitations, feature flag checks |
| `src/lib/components/PendingInvites.svelte` | 4 | Moderate | Simplify (WorkOS handles acceptance via email) |
| `src/lib/components/TeamMembersList.svelte` | 4, 5, 6 | Moderate | Update data source, use WorkOS roles |
| `src/lib/components/RoleManager.svelte` | 5, 6 | Moderate | Use WorkOS-backed roles and FGA |
| `src/lib/components/TeamSettings.svelte` | 7 | **Heavy** | Rewrite to use feature flags |
| `src/lib/components/TeamSizeIndicator/` | 4 | Light | Simplify member count source |

### Files that DON'T change

| File | Reason |
|---|---|
| `src/lib/services/api-client.ts` | `credentials: 'include'` pattern works perfectly with `wos-session` |
| `src/lib/components/ProtectedLayout.svelte` | Client-side guard still needed in SPA |
| `src/lib/components/ProtectedRoute.svelte` | Client-side guard still needed in SPA |
| `src/lib/components/StripeSubscribe.svelte` | Stripe integration unchanged |
| `src/lib/components/ManageSubscription.svelte` | Stripe integration unchanged |
| `src/routes/Pricing.svelte` | Pricing display unchanged |

### No new files to create

All changes are modifications to existing files. No new Svelte components, stores, or services are needed on the frontend because:
- No WorkOS SDK is used on the frontend
- No new UI paradigms (widgets, portals) are introduced
- Backend proxies all WorkOS interactions

---

## 16. Migration Strategy

### Phase ordering and dependencies:

```
Phase 1: Auth Cleanup              ← Independent, do first (low risk)
Phase 2: User Profile Alignment    ← Independent of Phase 1
Phase 3: Org Data Model Alignment  ← Independent of Phase 1
Phase 4: Invitations & Membership  ← Light dependency on Phase 3
Phase 5: Roles & Permissions       ← Requires backend work first
Phase 6: FGA (Depts & Projects)    ← Requires backend work first, depends on Phase 5
Phase 7: Feature Flags             ← Requires backend work first
Phase 8: MFA                       ← Dashboard toggle, minimal frontend
Phase 9: Cleanup                   ← After all other phases complete
```

### What can be done NOW (frontend-only, no backend changes):
- **Phase 1**: Auth flow cleanup (simplify SignIn, remove timeout race)
- **Phase 2**: User profile alignment (add `authProviderId` to types)
- **Phase 3**: Org data model alignment (add `authProviderOrgId` to types)

### What requires backend changes first:
- **Phase 4**: Invitations & Membership (backend already WorkOS-backed, but may need API response format updates)
- **Phase 5**: Roles & Permissions (backend needs to define roles in WorkOS, expose in API)
- **Phase 6**: FGA (backend needs FGA setup, new permission check endpoints)
- **Phase 7**: Feature Flags (backend needs new flag endpoints)
- **Phase 8**: MFA (dashboard config + optional backend endpoint)

### Rollback:
Each phase is independently reversible since no code is deleted until Phase 9.

---

## 17. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **Backend API response format changes** | Medium | Coordinate backend & frontend phase timing. Version API if needed. |
| **FGA latency for permission checks** | Low | Cache FGA results on frontend (30-60s TTL). Backend can also cache. |
| **10M FGA ops/month limit** | Low | Cache aggressively. Batch checks where possible. Monitor usage. |
| **Feature flag migration** | Low | Run old settings + feature flags in parallel during transition. |
| **ORCID URL not in WorkOS** | None | Stays in local DB, not affected by any changes. |
| **Org switching still uses localStorage** | None | Acceptable for SPA. Only SvelteKit would benefit from session-based org context. |
| **WorkOS invitation email vs custom email** | Low | WorkOS sends invitation emails. If custom branding needed, WorkOS supports custom email providers (Mailgun, etc.). |
| **No webhooks on backend** | Medium | Some WorkOS state changes (invitation expiry, user deletion from dashboard) won't sync automatically. Recommend adding webhook handler as part of backend work. |

---

## 18. Backend Work Required (Tracked Separately)

These backend changes are prerequisites for frontend phases 5-8:

| Backend Task | Frontend Phase | Priority |
|---|---|---|
| Define roles (Owner, Admin, Member) in WorkOS dashboard | Phase 5 | High |
| Define permission slugs in WorkOS dashboard | Phase 5 | High |
| Expose permissions in `/auth/verify` response | Phase 5 | High |
| Migrate existing role assignments to WorkOS | Phase 5 | High |
| Set up FGA resource types (org, dept, project) | Phase 6 | Medium |
| Create FGA warrant management endpoints | Phase 6 | Medium |
| Create FGA permission check endpoint | Phase 6 | Medium |
| Migrate dept/project roles to FGA warrants | Phase 6 | Medium |
| Define feature flags in WorkOS dashboard | Phase 7 | Medium |
| Create feature flag read/write endpoints | Phase 7 | Medium |
| Migrate team settings to feature flags | Phase 7 | Medium |
| Enable MFA in WorkOS dashboard | Phase 8 | Low |
| Uncomment `createOrganizationMembership` in invitation flow | Phase 4 | High |
| Add webhook handler for WorkOS events | All | Medium |

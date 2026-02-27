# WorkOS Integration Plan — Quester Frontend

> **Date**: 2026-02-27
> **Status**: Draft — Planning Only (No Code Changes)
> **Scope**: Frontend only. Backend integration will follow separately.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Inventory](#2-current-state-inventory)
3. [WorkOS Feature Mapping](#3-workos-feature-mapping)
4. [Integration Architecture](#4-integration-architecture)
5. [Phase 1 — Authentication & Session Management](#5-phase-1--authentication--session-management)
6. [Phase 2 — User Management & Profiles](#6-phase-2--user-management--profiles)
7. [Phase 3 — Organizations & Multi-Tenancy](#7-phase-3--organizations--multi-tenancy)
8. [Phase 4 — Roles, Permissions & RBAC](#8-phase-4--roles-permissions--rbac)
9. [Phase 5 — Team Management & Invitations](#9-phase-5--team-management--invitations)
10. [Phase 6 — Enterprise SSO & Admin Portal](#10-phase-6--enterprise-sso--admin-portal)
11. [Phase 7 — Fine-Grained Authorization (FGA)](#11-phase-7--fine-grained-authorization-fga)
12. [Phase 8 — Billing Integration (Stripe Seat Sync)](#12-phase-8--billing-integration-stripe-seat-sync)
13. [Phase 9 — Security Enhancements (Radar, MFA)](#13-phase-9--security-enhancements-radar-mfa)
14. [Phase 10 — Feature Flags & Polish](#14-phase-10--feature-flags--polish)
15. [Svelte-Specific Considerations](#15-svelte-specific-considerations)
16. [Files to Modify / Remove / Create](#16-files-to-modify--remove--create)
17. [Migration Strategy](#17-migration-strategy)
18. [Risk Assessment](#18-risk-assessment)
19. [WorkOS Pricing Considerations](#19-workos-pricing-considerations)

---

## 1. Executive Summary

This plan replaces the custom-built authentication, user management, team/organization management, role-based access control, and invitation systems in the Quester frontend with WorkOS equivalents. WorkOS provides:

- **AuthKit** — Hosted/headless authentication with social login, MFA, passkeys, magic auth
- **User Management** — Complete user lifecycle (signup, login, profile, email verification, password reset)
- **Organizations** — Multi-tenancy with memberships and domain verification
- **Roles & Permissions** — Built-in RBAC with JWT-embedded claims
- **Fine-Grained Authorization (FGA)** — Resource-scoped permissions based on Google Zanzibar
- **Widgets** — Pre-built React UI components (Users Management, Org Switcher, User Profile, User Sessions, User Security)
- **Admin Portal** — Hosted UI for enterprise IT admins to configure SSO, Directory Sync, domains
- **Radar** — Bot/fraud protection
- **Stripe Seat Sync** — Automatic member count syncing to Stripe
- **Feature Flags** — Per-organization feature gating

The official **`@workos/authkit-sveltekit`** SDK provides first-class SvelteKit support with components (`SignInButton`, `SignOutButton`, `UserProfile`), reactive stores (`authUser`, `isAuthenticated`), and server-side auth helpers.

---

## 2. Current State Inventory

### What exists today in Quester and needs replacement:

| Feature Area | Current Implementation | Key Files |
|---|---|---|
| **Authentication (Login/Logout)** | Custom OAuth redirect to backend, cookie-based sessions, `auth.verifySession()` | `AuthStore.svelte.ts`, `SignIn.svelte`, `App.svelte` |
| **Route Protection** | Custom `ProtectedLayout.svelte`, `ProtectedRoute.svelte` with reactive auth checks | `ProtectedLayout.svelte`, `ProtectedRoute.svelte` |
| **Session Management** | Cookie-based with `credentials: 'include'`, global logout on 401, 10s timeout | `api-client.ts`, `AuthStore.svelte.ts` |
| **User Profile** | Settings page with first/last name, email, ORCID, language | `Settings.svelte` |
| **Organizations** | Custom org model with `fetchUserOrganizations()`, localStorage org switching | `AuthStore.svelte.ts` |
| **Team Management** | Full CRUD with org/dept/project hierarchy, resource-type selection | `TeamManagementStore.svelte.ts`, `TeamManagement.svelte` |
| **RBAC (Roles)** | 3-tier roles (Owner/Admin/Member) at org/dept/project scopes, role assignment UI | `RoleManager.svelte`, `TeamMembersList.svelte`, `auth.ts` |
| **Invitations** | Send/accept/revoke invitations with role mapping across org/dept/project | `InvitationManager.svelte`, `PendingInvites.svelte` |
| **Org Settings** | Toggle-based settings (allow member invites, create projects/depts) | `TeamSettings.svelte` |
| **Billing/Subscriptions** | Stripe checkout/portal integration, plan tiers (Free/Pro/Team/Enterprise) | `StripeSubscribe.svelte`, `ManageSubscription.svelte`, `Pricing.svelte` |
| **Team Size Limits** | Visual seat count indicator with upgrade suggestions | `TeamSizeIndicator.svelte` |
| **Analytics** | FullStory user identification, PostHog identify/reset | `fullstory.ts`, `AuthStore.svelte.ts` |

---

## 3. WorkOS Feature Mapping

| Current Quester Feature | WorkOS Replacement | Notes |
|---|---|---|
| Google OAuth + email/password login | **AuthKit** (hosted or headless) | Supports Google, Microsoft, GitHub, Apple, passkeys, magic auth, email+password |
| Cookie-based sessions + `auth.verifySession()` | **AuthKit Session Management** | JWT access tokens + refresh tokens, `@workos/authkit-sveltekit` handles cookie encryption |
| `ProtectedLayout` / `ProtectedRoute` | **`authKit.withAuth()`** | Server-side route protection in SvelteKit load functions |
| User profile (name, email, avatar) | **WorkOS User objects** + `UserProfile` widget/component | WorkOS manages user data; ORCID is custom and stays |
| Organizations + `fetchUserOrganizations()` | **WorkOS Organizations** | Native org memberships, domain verification, org-level settings |
| Org switching via localStorage | **`switchToOrganization()`** or Organization Switcher Widget | Official widget or custom Svelte equivalent |
| Team member CRUD | **WorkOS Organization Memberships API** + Users Management Widget | Add/remove members, assign roles via API |
| Owner/Admin/Member roles | **WorkOS Roles & Permissions** | Define custom roles in WorkOS dashboard, permissions in JWT |
| Invitation system | **WorkOS Invitation API** | Send invitations by email, auto-join on signup |
| Org settings (allow member invites, etc.) | **WorkOS Organization settings** + Feature Flags | Some map to WorkOS org config, others to feature flags |
| Stripe checkout/portal | **WorkOS Stripe Seat Sync** + existing Stripe integration | WorkOS auto-syncs seat counts; keep existing Stripe checkout |
| Team size indicator | Derive from **WorkOS org membership count** + Stripe entitlements | WorkOS provides member counts natively |
| FullStory/PostHog identity | Keep, but source user data from **WorkOS user object** | Identity calls use WorkOS user ID/email |
| Department management | **WorkOS FGA** resource hierarchy | Departments become FGA resource types with hierarchical permissions |
| Project-level roles | **WorkOS FGA** resource-scoped roles | Project access controlled via FGA warrants |
| Enterprise SSO | **WorkOS SSO** + Admin Portal | New capability — let enterprise customers configure their own IdP |
| MFA | **WorkOS MFA** (TOTP + SMS) | New capability — built into AuthKit |
| Bot protection | **WorkOS Radar** | New capability — automatic fraud detection |
| Feature gating | **WorkOS Feature Flags** | New capability — per-org feature toggling |

---

## 4. Integration Architecture

### SDK Stack

```
@workos/authkit-sveltekit      — Server-side auth (hooks, route protection, session)
@workos-inc/authkit-js          — Client-side auth (getUser, getAccessToken, signIn/signOut)
@workos-inc/node (v8+)         — Backend API calls (user management, org management, FGA)
@workos-inc/widgets (optional)  — React components (need adapter for Svelte)
```

### Authentication Flow (New)

```
User → SignIn page → redirect to AuthKit hosted UI
                         ↓
              WorkOS handles auth (social, email+password, SSO, MFA, passkeys)
                         ↓
              Redirect back to /auth/callback with authorization code
                         ↓
              SvelteKit server exchanges code for access token + refresh token
                         ↓
              Encrypted session cookie set via authkit-sveltekit
                         ↓
              authKit.withAuth() / authKit.getUser() in load functions
                         ↓
              Access token contains org ID, role, permissions (JWT claims)
                         ↓
              Frontend reads claims for RBAC decisions
```

### Authorization Flow (New — with FGA)

```
Organization-level permissions → Read from JWT claims (instant, no API call)
Resource-level permissions → Call FGA API (server-side, cached)
                               ↓
              "Can user X edit project Y?" → FGA access check
              "What projects can user X access?" → FGA list query
```

---

## 5. Phase 1 — Authentication & Session Management

**Goal**: Replace custom auth with WorkOS AuthKit.

### What changes:

| Component | Action | Details |
|---|---|---|
| `AuthStore.svelte.ts` | **Rewrite** | Replace custom state with `@workos/authkit-sveltekit` stores (`authUser`, `isAuthenticated`). Remove `verifySession()`, `login()`, `logout()`, `setUser()`, `clearUser()`, `handleGlobalLogout()`. |
| `SignIn.svelte` | **Replace** | Redirect to AuthKit hosted UI via `authKit.getSignInUrl()`. Or use `SignInButton` component from SDK. Remove custom Google OAuth button and email login. |
| `App.svelte` | **Simplify** | Remove 10-second session timeout logic, manual `auth.verifySession()` call. Auth is handled by SvelteKit hooks. |
| `ProtectedLayout.svelte` | **Replace** | Use `authKit.withAuth()` in SvelteKit `+page.server.ts` load functions. |
| `ProtectedRoute.svelte` | **Replace** | Same — server-side protection replaces client-side checks. |
| `api-client.ts` | **Modify** | Replace cookie-based `credentials: 'include'` with Bearer token from `getAccessToken()`. Remove global logout handler (WorkOS handles session revocation). |
| `hooks.server.ts` | **Create** | Configure `authKitHandle()` from `@workos/authkit-sveltekit`. |
| `/auth/callback` route | **Create** | Handle AuthKit redirect with authorization code exchange. |

### Environment variables to add:
```
WORKOS_CLIENT_ID
WORKOS_API_KEY
WORKOS_REDIRECT_URI (e.g., http://localhost:5173/auth/callback)
WORKOS_COOKIE_PASSWORD (32+ characters)
```

### Acceptance Criteria:
- [ ] Users can sign in via AuthKit hosted UI (email+password, Google OAuth)
- [ ] Session is maintained via encrypted cookie (access token + refresh token)
- [ ] Protected routes redirect unauthenticated users to AuthKit
- [ ] Logout clears session and redirects to AuthKit sign-out endpoint
- [ ] 401 responses trigger automatic session refresh or re-authentication
- [ ] No custom session verification logic remains

---

## 6. Phase 2 — User Management & Profiles

**Goal**: Replace custom user CRUD with WorkOS User Management.

### What changes:

| Component | Action | Details |
|---|---|---|
| `Settings.svelte` (profile section) | **Modify** | Read user data from WorkOS user object. First name, last name, email from WorkOS. ORCID stays as custom metadata (stored in WorkOS user metadata or app DB). |
| `AuthStore.svelte.ts` (user type) | **Modify** | Map to WorkOS user schema: `id`, `email`, `firstName`, `lastName`, `profilePictureUrl`, `emailVerified`, `createdAt`. |
| `fullstory.ts` | **Modify** | Source identity data from WorkOS user object instead of custom user type. |
| PostHog integration | **Modify** | Same — use WorkOS user ID for `posthog.identify()`. |

### WorkOS User Object (replaces custom User type):
```typescript
interface WorkOSUser {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>; // Store ORCID URL, locale, etc.
}
```

### Custom data that stays in app DB:
- ORCID URL (can optionally go in WorkOS user `metadata`)
- Language/locale preference (can go in WorkOS user `metadata`)
- Any app-specific user settings

### Acceptance Criteria:
- [ ] User profile displays data from WorkOS user object
- [ ] Profile updates (name) go through WorkOS User Management API
- [ ] ORCID URL stored in WorkOS user metadata or app DB
- [ ] Email verification handled by WorkOS (automatic for OAuth)
- [ ] Analytics (FullStory, PostHog) use WorkOS user IDs
- [ ] Avatar/profile picture comes from WorkOS (synced from social providers)

---

## 7. Phase 3 — Organizations & Multi-Tenancy

**Goal**: Replace custom organization system with WorkOS Organizations.

### What changes:

| Component | Action | Details |
|---|---|---|
| `AuthStore.svelte.ts` (org logic) | **Rewrite** | Replace `fetchUserOrganizations()`, `setCurrentOrganization()` with WorkOS org memberships. Use `switchToOrganization()` from SDK. |
| Organization switching | **Replace** | Use WorkOS Organization Switcher (build Svelte equivalent of React widget, or use AuthKit `switchToOrganization()`). |
| `Organization` type in `auth.ts` | **Replace** | Map to WorkOS Organization: `id`, `name`, `slug`, `domains`, `createdAt`. |
| localStorage `lastSelectedOrgId` | **Replace** | WorkOS session tracks current organization natively. Organization ID embedded in access token. |
| `organizationChanged` custom event | **Keep/Modify** | May still need for UI reactivity, but org context comes from WorkOS session. |
| `OrganizationStructure.svelte` | **Modify** | Source org data from WorkOS instead of custom API. |

### WorkOS Organization Object:
```typescript
interface WorkOSOrganization {
  id: string;
  name: string;
  slug: string;
  domains: Array<{ id: string; domain: string; state: string }>;
  createdAt: string;
  updatedAt: string;
  allowProfilesOutsideOrganization: boolean;
}
```

### Key change — org context in JWT:
The WorkOS access token includes `org_id` claim. When a user switches orgs, they re-authenticate with the new org context (WorkOS handles this). No more manual localStorage tracking.

### Acceptance Criteria:
- [ ] Organizations created/managed via WorkOS API
- [ ] Users see their org memberships from WorkOS
- [ ] Org switching uses WorkOS `switchToOrganization` or custom Svelte component
- [ ] Current org ID comes from access token JWT claim, not localStorage
- [ ] `organizationChanged` event still fires for UI components that depend on it
- [ ] Domain verification available via WorkOS Admin Portal

---

## 8. Phase 4 — Roles, Permissions & RBAC

**Goal**: Replace custom 3-tier role system with WorkOS Roles & Permissions.

### Current roles to map:

| Current Role | Scope | WorkOS Equivalent |
|---|---|---|
| Organization Owner | Organization | Custom role `org-owner` with all permissions |
| Organization Admin | Organization | Custom role `org-admin` with management permissions |
| Organization Member | Organization | Default `member` role |
| Department Manager | Department | FGA role on department resource (Phase 7) |
| Department Member | Department | FGA role on department resource (Phase 7) |
| Project Owner | Project | FGA role on project resource (Phase 7) |
| Project Admin | Project | FGA role on project resource (Phase 7) |
| Project Member | Project | FGA role on project resource (Phase 7) |

### WorkOS Permissions to define:

```
# Organization-level (in JWT)
org:manage                 — Full org management
org:settings:read          — View org settings
org:settings:write         — Modify org settings
org:members:invite         — Send invitations
org:members:manage         — Add/remove/change roles
org:billing:manage         — Manage subscriptions
org:departments:create     — Create departments
org:projects:create        — Create projects

# Resource-level (via FGA, Phase 7)
department:manage          — Full department management
department:members:manage  — Manage department members
project:manage             — Full project management
project:members:manage     — Manage project members
project:content:edit       — Edit project content
project:content:view       — View project content
```

### What changes:

| Component | Action | Details |
|---|---|---|
| `RoleManager.svelte` | **Rewrite** | Fetch roles from WorkOS API (`GET /roles?scope=organization`). Update role via WorkOS org membership API. |
| `TeamMembersList.svelte` | **Modify** | Read roles from WorkOS org membership data. Permission checks use JWT claims. |
| `auth.ts` (Role/Permission types) | **Rewrite** | Define types matching WorkOS role/permission schema. |
| `TeamManagementStore.svelte.ts` | **Rewrite** | Permissions object derived from JWT claims instead of custom API. |
| `TeamSettings.svelte` | **Modify** | Settings that map to WorkOS org config use WorkOS API. Others become feature flags. |

### Acceptance Criteria:
- [ ] Organization roles (Owner, Admin, Member) defined in WorkOS dashboard
- [ ] Role assignments managed via WorkOS Organization Memberships API
- [ ] Permissions embedded in JWT access token claims
- [ ] Frontend reads permissions from JWT for UI gating (show/hide buttons, menus)
- [ ] Role change UI uses WorkOS API instead of custom endpoints
- [ ] Last-owner protection logic still works (check owner count via WorkOS API)

---

## 9. Phase 5 — Team Management & Invitations

**Goal**: Replace custom invitation system and team management with WorkOS equivalents.

### What changes:

| Component | Action | Details |
|---|---|---|
| `InvitationManager.svelte` | **Rewrite** | Use WorkOS Invitation API: `POST /user_management/invitations`. WorkOS sends invitation emails automatically. |
| `PendingInvites.svelte` | **Rewrite** | Fetch pending invitations via WorkOS API. Accept handled by WorkOS (user clicks email link → AuthKit signup → auto-joined to org). |
| `TeamMembersList.svelte` | **Modify** | List org members from WorkOS org memberships. Show roles from WorkOS. |
| `TeamManagementStore.svelte.ts` | **Significant rewrite** | Replace all custom API calls with WorkOS equivalents. Org members from memberships API. Roles from WorkOS. |
| `TeamSizeIndicator.svelte` | **Modify** | Derive member count from WorkOS org membership count. |

### WorkOS Invitation Flow (replaces custom):
```
Admin clicks "Invite" → POST /user_management/invitations (email, org_id, role_slug)
                             ↓
WorkOS sends invitation email to user
                             ↓
User clicks link → AuthKit signup/login → auto-joined to org with assigned role
                             ↓
No manual "accept invitation" step needed (WorkOS handles it)
```

### Key simplification:
The current system has complex multi-resource invitation mapping (org + dept + project roles in one invite). With WorkOS:
- **Org-level invitations** are handled by WorkOS natively
- **Department/project access** is handled separately via FGA (Phase 7) after user joins org

### Acceptance Criteria:
- [ ] Invitations sent via WorkOS Invitation API
- [ ] Invitation emails sent by WorkOS (or custom email via WorkOS custom email feature)
- [ ] Pending invitations listed from WorkOS API
- [ ] Invitation revocation via WorkOS API
- [ ] Team member list sourced from WorkOS org memberships
- [ ] Seat limit enforcement uses WorkOS member count + Stripe entitlements
- [ ] Self-assign flow for departments/projects uses FGA (Phase 7)

---

## 10. Phase 6 — Enterprise SSO & Admin Portal

**Goal**: Add enterprise-grade SSO and self-serve admin configuration via WorkOS.

### New capabilities (not currently in Quester):

| Feature | Implementation | Details |
|---|---|---|
| **Enterprise SSO** | WorkOS SSO connections | Enterprise customers can use their own IdP (Okta, Entra ID, Google Workspace, etc.) |
| **Admin Portal** | WorkOS Admin Portal links | Generate portal links via API, embed in org settings page |
| **Domain Verification** | WorkOS domain verification | Enterprise customers verify their domains for auto-join |
| **Directory Sync** | WorkOS SCIM | Auto-provision/deprovision users from enterprise directories |

### What changes:

| Component | Action | Details |
|---|---|---|
| `Settings.svelte` | **Add section** | Add "Enterprise" tab with Admin Portal link for org owners |
| `OrganizationSettings.svelte` | **Add section** | SSO configuration status, Admin Portal launch button |
| New: `AdminPortalButton.svelte` | **Create** | Generate and open Admin Portal link for IT admins |

### Admin Portal Intents:
```typescript
// Generate portal links for different admin tasks
const intents = ['sso', 'dsync', 'domain_verification', 'audit_logs', 'log_streams'];
```

### Acceptance Criteria:
- [ ] Enterprise org owners can access Admin Portal from settings
- [ ] Admin Portal link generated via WorkOS API with appropriate intent
- [ ] SSO connection status visible in org settings
- [ ] Users from SSO-enabled orgs transparently authenticate via their IdP
- [ ] Directory Sync events handled by backend (webhook-driven)

---

## 11. Phase 7 — Fine-Grained Authorization (FGA)

**Goal**: Replace custom department/project permission hierarchy with WorkOS FGA.

### FGA Resource Type Schema:

```
# Resource hierarchy matching Quester's structure
organization
  └── department
       └── project

# Roles per resource type
organization: owner, admin, member
department: manager, member
project: owner, admin, member
```

### How FGA replaces current system:

| Current Feature | FGA Replacement |
|---|---|
| Department roles (Manager/Member) | FGA role assignment on department resource |
| Project roles (Owner/Admin/Member) | FGA role assignment on project resource |
| "Can user manage this project?" | FGA access check: `user X, permission project:manage, resource project:Y` |
| "What projects can user X access?" | FGA list query |
| Elevated org permissions in project context | FGA inheritance: org admin → inherits access to all departments/projects |
| Self-assign to department/project | FGA warrant creation |

### Two-Layer Authorization:
```
Layer 1 (JWT — instant):     Org-level permissions (can invite, can manage, etc.)
Layer 2 (FGA API — precise):  Resource-level permissions (can edit project X, can view department Y)
```

### What changes:

| Component | Action | Details |
|---|---|---|
| `TeamManagementStore.svelte.ts` | **Rewrite** | Department/project permission checks use FGA API instead of custom endpoints |
| `TeamMembersList.svelte` | **Modify** | Department/project member lists from FGA queries |
| `RoleManager.svelte` | **Modify** | Department/project role changes via FGA warrant API |
| Backend | **New endpoints** | Wrap FGA checks/mutations for frontend consumption |

### Acceptance Criteria:
- [ ] FGA resource types defined for organization, department, project
- [ ] Roles and permissions defined per resource type in WorkOS
- [ ] Department access governed by FGA warrants
- [ ] Project access governed by FGA warrants
- [ ] Permission inheritance works (org owner → all departments → all projects)
- [ ] Access checks are fast (<50ms p95 latency)
- [ ] Frontend permission checks use server-side FGA results (passed via load functions)

---

## 12. Phase 8 — Billing Integration (Stripe Seat Sync)

**Goal**: Simplify billing by using WorkOS Stripe Seat Sync.

### What changes:

| Component | Action | Details |
|---|---|---|
| `StripeSubscribe.svelte` | **Keep mostly** | Stripe checkout still needed. But seat count auto-synced by WorkOS. |
| `ManageSubscription.svelte` | **Keep** | Stripe portal still used for billing management. |
| `Pricing.svelte` | **Keep mostly** | Plan display stays. Subscription plan data may come from app DB or Stripe. |
| `TeamSizeIndicator.svelte` | **Simplify** | Seat count from WorkOS org membership count. Max seats from Stripe entitlements. |
| Backend | **Configure** | Connect Stripe via WorkOS dashboard. Set Stripe customer ID on each WorkOS organization. |

### WorkOS Stripe Seat Sync:
```
User joins org → WorkOS increments Stripe meter → Stripe bills accordingly
User leaves org → WorkOS decrements Stripe meter → Stripe adjusts
```

### Acceptance Criteria:
- [ ] WorkOS connected to Stripe via dashboard
- [ ] Each WorkOS organization has Stripe customer ID set
- [ ] Member count automatically synced to Stripe meters
- [ ] Seat limit enforcement uses Stripe entitlements
- [ ] Existing checkout/portal flows still work
- [ ] TeamSizeIndicator reads from WorkOS membership count

---

## 13. Phase 9 — Security Enhancements (Radar, MFA)

**Goal**: Enable WorkOS Radar and MFA for enhanced security.

### Radar (Bot & Fraud Protection):
- **Enable in WorkOS dashboard** — no frontend code needed
- Automatically protects AuthKit sign-in/sign-up flows
- Detects bots, credential stuffing, impossible travel, unknown devices
- Custom rules can block by domain, IP range, country

### MFA:
- **Built into AuthKit** — users can enable MFA in their profile
- TOTP (authenticator apps) and SMS supported
- Orgs can require MFA for all members (configurable per org)

### What changes:

| Component | Action | Details |
|---|---|---|
| No frontend changes for Radar | **Dashboard config only** | Enable Radar protections in WorkOS dashboard |
| Settings page | **Add MFA section** | Allow users to enroll/manage MFA factors |
| Org settings | **Add MFA requirement** | Allow org admins to require MFA for all members |

### Acceptance Criteria:
- [ ] Radar enabled and protecting auth flows
- [ ] Users can enable TOTP MFA from their profile
- [ ] Org admins can require MFA for their organization
- [ ] Suspicious login attempts are challenged or blocked

---

## 14. Phase 10 — Feature Flags & Polish

**Goal**: Use WorkOS Feature Flags for per-org feature gating and clean up remaining custom code.

### Feature Flags to create:

| Flag | Purpose | Replaces |
|---|---|---|
| `allow_member_invitations` | Let members (not just admins) send invites | `TeamSettings.allowMemberInvitations` |
| `allow_members_create_projects` | Let members create projects | `TeamSettings.allowMembersToCreateProjects` |
| `allow_members_create_departments` | Let members create departments | `TeamSettings.allowMembersToCreateDepartments` |
| `allow_admins_create_departments` | Let admins create departments | `TeamSettings.allowAdminsToCreateDepartments` |
| `enterprise_features` | Gate enterprise-only features | Plan-based gating |

### What changes:

| Component | Action | Details |
|---|---|---|
| `TeamSettings.svelte` | **Rewrite** | Toggle settings become feature flag management (via WorkOS API) |
| Feature gating throughout app | **Add** | Check feature flags from WorkOS for conditional rendering |
| Remove dead code | **Cleanup** | Remove all replaced custom auth/team/invite/role code |

### Acceptance Criteria:
- [ ] Feature flags defined in WorkOS dashboard
- [ ] Per-org feature flags fetched via WorkOS API
- [ ] Settings toggles map to WorkOS feature flags
- [ ] All deprecated custom code removed
- [ ] App functions fully on WorkOS infrastructure

---

## 15. Svelte-Specific Considerations

### Official SvelteKit SDK (`@workos/authkit-sveltekit`)

This is the primary integration point. It provides:

```typescript
// hooks.server.ts
import { configureAuthKit, authKitHandle } from '@workos/authkit-sveltekit';

configureAuthKit({
  clientId: env.WORKOS_CLIENT_ID,
  apiKey: env.WORKOS_API_KEY,
  redirectUri: env.WORKOS_REDIRECT_URI,
  cookiePassword: env.WORKOS_COOKIE_PASSWORD,
});

export const handle = authKitHandle();
```

```typescript
// +page.server.ts (protected route)
import { authKit } from '@workos/authkit-sveltekit';

export const load = async (event) => {
  const auth = await authKit.withAuth(event);
  // auth.user is guaranteed to exist
  // auth.organizationId, auth.role, auth.permissions available
  return { user: auth.user };
};
```

### WorkOS Widgets (React-only) — Svelte Strategy

WorkOS Widgets (`@workos-inc/widgets`) are React components. For Svelte, we have three options:

**Option A (Recommended): Build custom Svelte equivalents**
- Build Svelte components that call the same WorkOS APIs the widgets use
- Full control over styling (Tailwind CSS integration)
- Native Svelte reactivity with runes
- Components: `UsersManagement.svelte`, `OrganizationSwitcher.svelte`, `UserProfile.svelte`, `UserSessions.svelte`

**Option B: React-in-Svelte adapter**
- Use `svelte-preprocess-react` or similar to mount React widgets
- Less maintenance but adds React as a dependency
- May have styling conflicts

**Option C: Use AuthKit hosted UI for everything**
- Redirect users to WorkOS-hosted pages for user management
- Least code but least integrated UX

### Recommended approach: **Option A** — Build native Svelte components using WorkOS APIs, matching the current shadcn-svelte design system.

---

## 16. Files to Modify / Remove / Create

### Files to REMOVE (replaced by WorkOS):
```
src/lib/stores/AuthStore.svelte.ts          → Replaced by @workos/authkit-sveltekit stores
src/lib/components/ProtectedLayout.svelte    → Replaced by server-side authKit.withAuth()
src/lib/components/ProtectedRoute.svelte     → Replaced by server-side authKit.withAuth()
src/routes/SignIn.svelte                     → Replaced by AuthKit hosted UI redirect
src/lib/components/PendingInvites.svelte     → Replaced by WorkOS invitation flow (auto-join)
```

### Files to SIGNIFICANTLY REWRITE:
```
src/lib/stores/TeamManagementStore.svelte.ts → Use WorkOS APIs for members, roles, FGA
src/lib/components/InvitationManager.svelte  → Use WorkOS Invitation API
src/lib/components/TeamMembersList.svelte    → Source data from WorkOS memberships
src/lib/components/RoleManager.svelte        → Use WorkOS Roles API
src/lib/components/TeamSettings.svelte       → Map to WorkOS feature flags
src/lib/services/api-client.ts               → Use Bearer tokens from WorkOS session
src/lib/types/auth.ts                        → Map types to WorkOS schemas
src/App.svelte                               → Remove custom session logic
```

### Files to MODIFY (lighter changes):
```
src/routes/Settings.svelte                   → Source user data from WorkOS, add enterprise section
src/routes/Pricing.svelte                    → Keep mostly, update seat count source
src/lib/components/StripeSubscribe.svelte    → Keep, update org data source
src/lib/components/ManageSubscription.svelte → Keep as-is
src/lib/components/TeamSizeIndicator/        → Simplify, use WorkOS member count
src/lib/services/fullstory.ts                → Update to use WorkOS user object
src/routes/OrganizationSettings.svelte       → Add Admin Portal section
src/routes/TeamManagement.svelte             → Update to use WorkOS-backed store
```

### Files to CREATE:
```
src/hooks.server.ts                          → AuthKit handle configuration
src/routes/auth/callback/+server.ts          → AuthKit callback handler
src/lib/stores/WorkOSAuthStore.svelte.ts     → New auth store wrapping WorkOS SDK
src/lib/components/AdminPortalButton.svelte  → Generate Admin Portal links
src/lib/components/OrganizationSwitcher.svelte → Custom Svelte org switcher
src/lib/components/WorkOSUserProfile.svelte  → Custom Svelte user profile
src/lib/components/UserSessions.svelte       → Custom Svelte session management
src/lib/services/workos-fga.ts               → FGA access check helpers
src/lib/types/workos.ts                      → WorkOS type definitions
```

---

## 17. Migration Strategy

### Approach: **Parallel implementation with feature flag cutover**

1. **Install WorkOS SDKs** alongside existing code
2. **Set up AuthKit** in parallel — both old and new auth work simultaneously
3. **Feature-flag the switch** — toggle between old/new auth per environment
4. **Migrate one feature at a time** — auth first, then orgs, then roles, etc.
5. **Data migration** — Map existing users/orgs/roles to WorkOS (backend task)
6. **Remove old code** — After validation, remove all replaced custom code

### Migration order (matches phases):
```
Phase 1: Auth & Sessions          ← Foundation, must be first
Phase 2: User Profiles            ← Depends on Phase 1
Phase 3: Organizations            ← Depends on Phase 1
Phase 4: Roles & Permissions      ← Depends on Phase 3
Phase 5: Team Mgmt & Invitations  ← Depends on Phase 3 & 4
Phase 6: Enterprise SSO & Admin   ← Depends on Phase 3
Phase 7: FGA                      ← Depends on Phase 4
Phase 8: Billing (Stripe Sync)    ← Depends on Phase 3
Phase 9: Security (Radar, MFA)    ← Independent, can be earlier
Phase 10: Feature Flags & Cleanup ← Last, after everything works
```

### Rollback strategy:
Each phase should be independently reversible. Keep old code behind feature flags until the new implementation is validated in production.

---

## 18. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **WorkOS Widgets are React-only** | Medium | Build native Svelte components (recommended Option A) |
| **Data migration complexity** | High | Detailed backend migration plan needed (separate effort) |
| **ORCID URL has no WorkOS equivalent** | Low | Store in WorkOS user `metadata` field or keep in app DB |
| **Department hierarchy not native to WorkOS** | Medium | Use FGA resource types with hierarchical inheritance |
| **Complex invitation mapping (org+dept+project)** | Medium | Simplify: org invite via WorkOS, dept/project access via FGA after join |
| **Session format change** | Medium | Parallel auth during migration, feature-flagged cutover |
| **JWT size limit (4KB)** | Low | Keep permission slugs concise, use FGA for resource-level checks |
| **Vendor lock-in** | Medium | WorkOS uses standard OAuth 2.0 / SAML — portable patterns |
| **Pricing at scale** | Low | Free tier covers 1M MAUs; SSO/DSYNC costs per enterprise connection |
| **SvelteKit SDK maturity** | Low | Official first-party SDK, actively maintained |
| **Existing Stripe integration** | Low | WorkOS Stripe Seat Sync complements, doesn't replace Stripe checkout |
| **Custom analytics integration** | Low | FullStory/PostHog just need WorkOS user IDs — minimal change |

---

## 19. WorkOS Pricing Considerations

| Product | Free Tier | Paid |
|---|---|---|
| **AuthKit (User Mgmt)** | 1M MAUs/month | $2,500/1M MAUs |
| **Enterprise SSO** | — | $125/connection/month (volume discounts at 16+) |
| **Directory Sync** | — | $125/connection/month |
| **FGA** | 10M operations/month | Contact sales |
| **Radar** | 1,000 checks | $100/month per 50K checks |
| **Audit Logs** | — | $125/SIEM connection + $99/M events |
| **Custom Domain** | — | $99/month |

**For Quester's likely usage**: The free tier (1M MAUs, 10M FGA operations) will cover most scenarios. SSO/DSYNC costs only apply per enterprise customer connection, not per user.

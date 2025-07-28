Task 024 - Investigate Notes Not Saving (Revised Plan)
Metadata
ID: 024

Status: todo

Priority: high

Category: bug

Size: L

Created: 2025-01-12

Updated: 2025-07-18

Dependencies: task-025-backend-session-refresh-endpoint

Problem Statement
Users experience a "half logout" state where, after prolonged app usage, notes appear to save, but changes are lost upon reload. The app incorrectly redirects to a workspace selection page, causing the user to lose context and unsaved work due to an inconsistent authentication state.

Bug Report Details:

If you leave Quester on too long, it will allow you to add text, but it will not save it. When reloading the page, it will redirect to the page that asks you to open your workspace. When navigating back to the document, the new text is gone. So, it kind of half logs out?

Research Notes
Affected Files
src/lib/stores/AuthStore.svelte:85-120 - Session verification logic

src/lib/components/notes/NoteEditor.svelte:325-452 - Auto-save implementation

src/lib/stores/NotesStore.svelte:526-640 - Note update API calls

src/routes/Dashboard.svelte:233-237 - Workspace redirect logic

src/lib/components/ProtectedRoute.svelte:7-17 - Authentication checks

Technical Context

1. Session Management Issues:

No Token Refresh: The core issue is the lack of a token refresh mechanism. The client holds a JWT with a fixed expiry and has no way to renew it.

Server Session Duration: The exact server-side session timeout is currently unconfirmed. Action Item: Confirm this with the backend team.

Reactive Verification: Session verification only runs reactively (e.g., on page load) via the /auth/verify endpoint, without any retry or refresh logic.

Ungraceful Failure: A failed session verification calls clearUser() but does not manage a graceful logout flow, leading to the inconsistent state.

2. Auto-save Implementation:

A 2-second debounced auto-save in NoteEditor.svelte continues attempting to save even after the session has expired.

No Error Handling: The save mechanism does not handle 401/403 responses from the API, leading to silent failures.

The NotesStore.updateNote() function lacks centralized authentication error handling, preventing the app from reacting to the expired session.

3. Inconsistent Error Handling:

While some parts of the API layer (custom-events-api.ts) have 401/403 handling, this is not applied globally. The notes API is a critical blind spot.

Silent save failures leave the user unaware that their work is not being persisted.

4. Workspace Redirect Logic:

The "half-logout" state is triggered when a subsequent navigation fails to fetch the user's organizations (due to the expired token).

AuthStore.svelte:106 sets currentOrganization to null, and Dashboard.svelte:233-237 interprets this as a new user, redirecting to /onboarding instead of /login.

Root Cause Analysis
The bug is a race condition between an expiring server-side session and the client's unawareness of this state change.

Sequence of Events:

User works on a note for an extended period, exceeding the server's session timeout.

The client's JWT expires. Auto-save requests begin failing with 401/403 errors.

Critical Failure: The client-side error handling does not catch these auth errors, so the AuthStore remains in an "authenticated" state with stale data.

The user continues working, believing their changes are being saved.

A page reload or navigation triggers a session/organization verification. This fetch now fails with a 401.

The failure clears the user's organization list, causing a redirect to the workspace selection/onboarding page instead of the login page.

The user loses all unsaved work and is left in a confusing application state.

Implementation Plan
Phase 1: Immediate Fixes (Architectural Hardening)
Goal: Stop data loss and create a predictable authentication flow.

Implement Centralized API Error Interceptor:

Create a shared fetch wrapper or middleware that intercepts all outgoing API requests.

This interceptor will automatically handle 401/403 responses.

On a 401 error, it should immediately trigger a global logout action, clearing all user state and redirecting to /login.

Apply this wrapper to all API calls (notes, organizations, projects, etc.) to ensure uniform behavior.

Implement Proactive Session Refresh Mechanism:

Backend Dependency: Requires a new secure endpoint (e.g., /api/auth/refresh) that can exchange a valid refresh token for a new access token.

On app load, and after each successful API call, schedule a proactive token refresh to occur before the current token's known expiry time (e.g., at 80% of its lifetime).

This prevents the session from expiring during active use.

If a refresh attempt fails, trigger the full logout flow.

Improve Auto-Save Error Handling:

Integrate the auto-save mechanism with the new centralized interceptor.

The auto-save loop must be immediately paused upon receiving the first auth error to prevent repeated failed requests.

Display a clear, non-intrusive UI indicator (e.g., a small toast or a status icon changing from "Saved" to "Connection issue") when saves fail.

Phase 2: User Experience Improvements
Goal: Minimize disruption and help the user recover gracefully.

Enhanced Error Messaging & State Indication:

Implement a toast notification system to inform the user: "Your session has expired. Please log in again to continue."

Provide a clear visual warning if the session is about to expire and a refresh attempt is failing.

Navigation and Work Preservation:

Before triggering the auth redirect, store the current route (e.g., /notes/123) in localStorage.

After a successful re-authentication, automatically redirect the user back to their last location.

Temporarily cache unsaved changes in localStorage, keyed by user and note ID (e.g., unsavedChanges*{userId}*{noteId}), to prevent data collision between users.

On returning to the note, prompt the user to restore their unsaved work. Clear this cache on successful save or explicit discard.

Phase 3: Long-Term Resilience (Offline-First)
Goal: Make the application robust against intermittent connectivity.

Offline-First Auto-Save Queue:

Instead of failing immediately, queue failed saves (due to auth or network errors) in a local store (e.g., IndexedDB).

Create a background process that retries sending the queued changes once authentication and connectivity are restored.

Implement a basic conflict resolution strategy (e.g., "last write wins" or prompting the user if the server version is newer).

Acceptance Criteria
[ ] A 401/403 error on any API endpoint triggers a clean, global logout and redirects to the login page.

[ ] The app proactively refreshes the user's session during active use, preventing session expiry.

[ ] Auto-save attempts cease immediately after the first authentication failure.

[ ] The user receives a clear UI notification (e.g., toast message) when saves fail due to session issues.

[ ] Reloading the page after a session has expired redirects to /login, not the workspace selection page.

[ ] After re-authenticating, the user is returned to their previous location (e.g., the note they were editing).

[ ] Unsaved work is temporarily cached locally and can be restored after re-authentication.

[ ] The centralized API error handling is applied consistently across all data-fetching hooks and stores.

Related Tasks
New Backend Task: task-025-backend-session-refresh-endpoint: Create a secure /api/auth/refresh endpoint.

New Frontend Task: task-026-central-api-interceptor: Implement the global fetch wrapper for error handling.

New Frontend Task: task-027-proactive-session-refresh: Implement the proactive token refresh logic.

New Frontend Task: task-028-ux-auth-flow: Implement local storage for navigation and unsaved work, plus associated UI prompts.

# Task 024 - Investigate Notes Not Saving

## Metadata
- **ID**: 024
- **Status**: todo
- **Priority**: high
- **Category**: bug
- **Size**: L
- **Created**: 2025-01-12
- **Updated**: 2025-01-12
- **Dependencies**: none

## Problem Statement
Users experience a "half logout" state where:
1. After prolonged app usage, notes appear to save but changes are lost upon reload
2. App redirects to workspace selection page instead of staying on current note
3. User loses context and has difficulty navigating back to their work
4. Authentication state becomes inconsistent (user appears logged in but session expired)

**Bug Report Details:**
> If you leave Quester on too long, it will allow you to add text, but it will not save it. When reloading the page, it will redirect to the page that asks you to open your workspace. When navigating back to the document, the new text is gone. So, it kind of half logs out?

## Research Notes

### Affected Files
- `src/lib/stores/AuthStore.svelte:85-120` - Session verification logic
- `src/lib/components/notes/NoteEditor.svelte:325-452` - Auto-save implementation  
- `src/lib/stores/NotesStore.svelte:526-640` - Note update API calls
- `src/routes/Dashboard.svelte:233-237` - Workspace redirect logic
- `src/lib/components/ProtectedRoute.svelte:7-17` - Authentication checks

### Technical Context

**1. Session Management Issues:**
- No token refresh mechanism exists in AuthStore.svelte:85-120
- Session verification only checks `/auth/verify` endpoint without retry logic
- Failed session verification calls `clearUser()` but doesn't handle graceful degradation

**2. Auto-save Implementation:**
- 2-second debounced auto-save in NoteEditor.svelte:326-337
- Continues attempting saves even after session expiry
- No error handling for 401/403 responses from save attempts
- NotesStore.updateNote() lacks centralized authentication error handling

**3. Inconsistent Error Handling:**
- custom-events-api.ts has 401/403 handling (lines 116-124) but notes API doesn't
- Failed saves don't trigger auth state updates
- Silent failures leave user unaware of save problems

**4. Workspace Redirect Logic:**
- Dashboard.svelte:233-237 redirects to `/onboarding` when no organizations found
- AuthStore.svelte:106 sets currentOrganization to null when org fetch fails
- Creates "half logout" where user is authenticated but has no active workspace

### Code References
- **Auth Session Check**: AuthStore.svelte:85-120 (`verifySession()` method)
- **Auto-save Logic**: NoteEditor.svelte:325-337 (`scheduleSave()` function)
- **Note Save API**: NotesStore.svelte:582-595 (`updateNote()` fetch call)
- **Workspace Redirect**: Dashboard.svelte:233-237 (organization loading failure)
- **Protected Route**: ProtectedRoute.svelte:7-17 (auth state monitoring)

## Root Cause Analysis

The bug occurs due to a race condition between:
1. **Session Expiry**: Server-side session timeout (unknown duration)
2. **Auto-save Frequency**: Client attempts save every 2 seconds
3. **Silent Failures**: 401/403 responses don't update client auth state
4. **Organization Refetch**: Subsequent navigation triggers org fetch that fails
5. **Workspace Redirect**: Failed org fetch redirects to onboarding instead of login

**Sequence of Events:**
1. User works on note for extended period (>session timeout)
2. Auto-save continues but API calls start returning 401/403
3. Client auth state remains "authenticated" with stale session
4. User continues typing, seeing false save confirmations
5. Page reload or navigation triggers session/org verification
6. Verification fails, clears organizations, redirects to workspace selection
7. User loses unsaved work and context of their location

## Implementation Plan

### Phase 1: Immediate Fixes (Session Handling)
1. **Add centralized API error interceptor**
   - Create shared fetch wrapper with 401/403 handling
   - Automatically trigger logout on authentication failures
   - Apply to all API calls (notes, organizations, projects)

2. **Implement session refresh mechanism**
   - Add refresh endpoint call before critical operations
   - Retry failed requests once after refresh attempt
   - Handle refresh failures gracefully

3. **Improve auto-save error handling**
   - Stop auto-save attempts after authentication failures
   - Show clear error states when saves fail
   - Prevent false positive save confirmations

### Phase 2: User Experience Improvements
1. **Enhanced error messaging**
   - Toast notifications for session expiry
   - Clear indicators when saves fail
   - Warning before session timeout (if detectable)

2. **Better navigation preservation**
   - Store current route in localStorage before auth redirects
   - Restore user's location after re-authentication
   - Maintain unsaved changes in localStorage temporarily

3. **Session timeout detection**
   - Monitor API response patterns for timeout indicators
   - Proactive session refresh before expiry
   - Grace period for user to save work

### Phase 3: Robust State Management
1. **Offline-first auto-save**
   - Queue failed saves for retry after re-authentication
   - Local storage backup for unsaved changes
   - Conflict resolution for stale data

2. **Improved auth state consistency**
   - Single source of truth for authentication status
   - Consistent session validation across all routes
   - Better loading states during auth transitions

## Acceptance Criteria
- [ ] Notes auto-save reliably without false positive confirmations
- [ ] Session expiry triggers clear logout rather than half-logout state  
- [ ] User gets clear feedback when saves fail due to session issues
- [ ] Page reload after session expiry redirects to login, not workspace selection
- [ ] Re-authentication returns user to their previous location when possible
- [ ] Auto-save stops attempting requests after authentication failure
- [ ] API error handling is consistent across all endpoints
- [ ] Session refresh mechanism prevents unnecessary logouts during active use

## Related Tasks
- Need to create: Add session refresh mechanism
- Need to create: Implement centralized API error handling
- Need to create: Add offline-first auto-save with retry queue
- Need to create: Improve navigation preservation across auth transitions
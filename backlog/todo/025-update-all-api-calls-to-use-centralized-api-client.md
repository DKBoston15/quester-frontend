# Task 025 - Update All API Calls to Use Centralized API Client

## Metadata
- **ID**: 025
- **Status**: todo
- **Priority**: high
- **Category**: refactor
- **Size**: L
- **Created**: 2025-01-19
- **Updated**: 2025-01-19
- **Dependencies**: task-024

## Description
Migrate all remaining fetch() calls throughout the codebase to use the new centralized api-client service. This ensures consistent authentication error handling and prevents partial logout states across the entire application.

## Context
Following the implementation of the centralized API client in task-024, there are still many direct fetch() calls scattered throughout the codebase. These calls bypass the global authentication error handling, potentially causing inconsistent behavior when sessions expire.

## Acceptance Criteria
- [ ] All direct fetch() calls replaced with api client methods
- [ ] All API calls handle 401/403 errors consistently
- [ ] No regression in existing functionality
- [ ] All API error messages properly displayed to users
- [ ] TypeScript types maintained for all API responses
- [ ] Loading states properly managed during API calls

## Implementation Plan

### Phase 1: Inventory Remaining fetch() Calls
1. Search codebase for all `fetch(` occurrences
2. Categorize by module/feature area
3. Identify any special cases (auth endpoints, file uploads, etc.)

### Phase 2: Systematic Migration
1. **Auth-related endpoints** (skip auth check)
   - Login/logout flows
   - Session verification
   
2. **Store modules**
   - ProjectStore
   - LiteratureStore
   - OrganizationStore
   - WorkspaceStore
   - Any remaining in NotesStore
   
3. **Component-level API calls**
   - Dashboard components
   - Settings components
   - Team management
   - File uploads
   
4. **Service layers**
   - Custom events (already has some error handling)
   - Chat history
   - Any other service files

### Phase 3: Special Cases
1. **File uploads** - May need multipart/form-data support
2. **Streaming responses** - Real-time data or large downloads
3. **External APIs** - Non-application endpoints

### Phase 4: Testing & Verification
1. Test each migrated endpoint
2. Verify error handling works correctly
3. Ensure loading states are preserved
4. Check that all error messages display properly

## Technical Considerations

### Migration Pattern
```typescript
// Before:
const response = await fetch(`${API_BASE_URL}/endpoint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(data)
});
if (!response.ok) throw new Error('Failed');
const result = await response.json();

// After:
const result = await api.post('/endpoint', data);
```

### Special Cases Handling
```typescript
// Auth endpoints (skip auth check):
await api.post('/auth/login', credentials, { skipAuthCheck: true });

// File uploads:
const formData = new FormData();
formData.append('file', file);
await api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Custom error handling:
try {
  const data = await api.get('/data');
} catch (error) {
  if (isAuthError(error)) {
    // Already handled by global handler
  } else {
    // Handle other errors
    toast.error(getErrorMessage(error));
  }
}
```

## Files to Update (Preliminary List)
- `src/lib/stores/ProjectStore.svelte`
- `src/lib/stores/LiteratureStore.svelte`
- `src/lib/stores/OrganizationStore.svelte`
- `src/lib/stores/WorkspaceStore.svelte`
- `src/lib/stores/AuthStore.svelte` (remaining calls)
- Various component files with inline API calls
- Service layer files

## Related Tasks
- task-024: Initial implementation of centralized API client
- Future: Add request/response interceptors for analytics
- Future: Add request caching layer
- Future: Add offline queue for failed requests
# Comprehensive Testing Setup for Team Management Components

## Metadata
- **ID**: 024
- **Status**: in-progress
- **Priority**: high
- **Category**: feature
- **Size**: XL
- **Created**: 2025-01-17
- **Updated**: 2025-01-17
- **Dependencies**: None

## Problem Statement
The TeamManagement.svelte component and its connected components (TeamMembersList, InvitationManager, ResourceUserManager, RoleManager, TeamSizeIndicator) currently have no test coverage. We need to implement comprehensive testing that covers:

1. **Component Rendering**: All states and UI variations
2. **User Interactions**: Search, filtering, role changes, invitations
3. **State Management**: TeamManagementStore integration and reactivity
4. **API Integration**: Mock API responses for different scenarios
5. **Authentication Flows**: Different user permission levels
6. **Edge Cases**: Error states, loading states, subscription limits
7. **Accessibility**: Keyboard navigation, screen reader compatibility

## Research Notes

### Affected Files
- **Primary Component**: `src/routes/TeamManagement.svelte` (932 lines)
- **Store**: `src/lib/stores/TeamManagementStore.svelte`
- **Child Components**:
  - `src/lib/components/TeamMembersList.svelte`
  - `src/lib/components/InvitationManager.svelte`
  - `src/lib/components/ResourceUserManager.svelte`
  - `src/lib/components/RoleManager.svelte`
  - `src/lib/components/TeamSizeIndicator/TeamSizeIndicator.svelte`
  - `src/lib/components/ResourceSelector.svelte`
- **Supporting Components**: AppSidebar, UI components from shadcn-svelte
- **Types**: `src/lib/types/auth.ts`, team management types

### Technical Context
- **Framework**: Svelte 5 with runes API (`$state`, `$derived`, `$props()`)
- **State Management**: Custom Svelte stores with runes
- **Authentication**: Cookie-based with AuthStore
- **API Integration**: Fetch with credentials: 'include'
- **UI Library**: shadcn-svelte (bits-ui based)
- **Styling**: Tailwind CSS
- **Complex Features**: Driver.js tours, real-time validation, animations

### Code References
- **Main component**: `src/routes/TeamManagement.svelte:1-932`
- **Store integration**: `src/routes/TeamManagement.svelte:4` (teamManagement store)
- **Authentication checks**: `src/routes/TeamManagement.svelte:344-412` (permission functions)
- **API calls**: `src/routes/TeamManagement.svelte:222-274` (subscription limits)
- **Tour system**: `src/routes/TeamManagement.svelte:80-220` (Driver.js integration)

## Subtasks

### Phase 1: Testing Infrastructure Setup ✅
1. **✅ Install and configure testing framework** (Vitest + @testing-library/svelte)
   - Installed vitest@3.2.4, @testing-library/svelte@5.2.8, @testing-library/jest-dom@6.6.3
   - Created vitest.config.ts with Svelte 5 support
   - Added test scripts to package.json (test, test:ui, test:watch, test:coverage)
2. **✅ Set up Svelte 5 runes testing utilities**
   - Created src/test/setup.ts with global test configuration
   - Set up browser API mocks (matchMedia, IntersectionObserver, ResizeObserver)
   - Configured jest-dom matchers
3. **✅ Configure test environment with JSDOM**
   - Configured jsdom environment in vitest.config.ts
   - Set up DOM testing capabilities
4. **✅ Create testing utilities for store mocking**
   - Created comprehensive src/test/store-utils.ts
   - Mock API responses for all team management endpoints
   - Store state testing utilities and fetch mocking
   - AuthStore mocking capabilities
5. **Set up API mocking with MSW or similar** (In Progress)

### Phase 2: Unit Tests for Individual Components
6. **Test TeamSizeIndicator component** - subscription limits display
7. **Test TeamMembersList component** - user list rendering, role display
8. **Test InvitationManager component** - invitation form, validation
9. **Test ResourceUserManager component** - user selection, addition
10. **Test RoleManager component** - role selection modal, updates

### Phase 3: Integration Tests for Main Component
11. **Test resource navigation** - organization/department/project selection
12. **Test search and filtering functionality**
13. **Test permission-based UI rendering** (different user roles)
14. **Test subscription limit enforcement**
15. **Test self-assignment functionality** (join project/department)
16. **Test error handling and display**

### Phase 4: User Flow Tests
17. **Test complete invitation workflow** - send invite, manage pending invites
18. **Test role management workflow** - select user, change role, save
19. **Test resource switching workflow** - navigate between different resources
20. **Test tour system** - start tour, navigate steps, dismiss

### Phase 5: Edge Cases and Error Scenarios
21. **Test loading states** - initial load, data refresh
22. **Test empty states** - no resources, no team members
23. **Test error states** - API failures, permission denied
24. **Test subscription limit scenarios** - at limit, over limit, upgrade prompts
25. **Test network error handling** - offline, timeout, server errors

### Phase 6: Accessibility and Performance
26. **Test keyboard navigation** - tab order, enter/space interactions
27. **Test screen reader compatibility** - ARIA labels, announcements
28. **Test responsive behavior** - mobile, tablet, desktop layouts
29. **Test animation performance** - smooth transitions, no layout shifts

### Phase 7: End-to-End Testing
30. **Set up Playwright for E2E tests**
31. **Test complete team management flows** - full user journey
32. **Test cross-browser compatibility**
33. **Test authentication integration** - login/logout, session management

## Implementation Progress

### ✅ Completed
- **Testing Framework**: Vitest with Svelte 5 support fully configured
- **Test Environment**: JSDOM environment with browser API mocks
- **Store Testing Utilities**: Comprehensive mocking utilities for TeamManagementStore
- **API Mocking**: Configurable fetch mocking with realistic test data
- **Documentation**: TESTING.md with usage instructions and patterns

### 🔄 Current Status
- Phase 1 is 80% complete (4/5 subtasks done)
- MSW setup for API mocking is next priority
- Ready to begin Phase 2 component testing

### 📁 Files Created
- `vitest.config.ts` - Test runner configuration
- `src/test/setup.ts` - Global test setup and browser mocks
- `src/test/store-utils.ts` - Store testing utilities and API mocks
- `TESTING.md` - Testing documentation and best practices
- Example test files demonstrating utility function testing

### ⚠️ Known Limitations
- Component testing limited due to @testing-library/svelte + Svelte 5 runes compatibility issues
- Focus shifted to testing business logic, utilities, and store methods
- E2E testing with Playwright will handle full component integration testing

### 🎯 Next Steps
1. Complete MSW setup for more sophisticated API mocking
2. Create comprehensive store business logic tests
3. Begin utility function and service layer testing
4. Set up Playwright for component integration testing

## Related Tasks
- Testing setup would benefit other components across the application
- Could establish testing patterns for other complex Svelte 5 components
- Security testing for authentication and authorization flows
- Consider upgrading to newer @testing-library/svelte version when Svelte 5 compatibility improves
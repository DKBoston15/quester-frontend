# Clean Up Project Sidebar

## Metadata
- **ID**: 014
- **Status**: todo
- **Priority**: low
- **Category**: ui-ux
- **Size**: S
- **Created**: 2025-01-07
- **Updated**: 2025-01-07 (Detailed investigation completed)
- **Dependencies**: None

## Problem Statement
The project sidebar needs cleanup to improve organization, navigation, and visual clarity.

## Research Notes
### Affected Files
- **ProjectSidebar.svelte**: `src/lib/components/ProjectSidebar.svelte` (801 lines)
  - Lines 39-41: Three-tier route organization
  - Lines 131-228: Complex subscription capability checking
  - Lines 320-408: Route configuration with subscription-based disabling
  - Lines 474-651: Navigation rendering with duplicated disabled state logic
- **AppSidebar.svelte**: `src/lib/components/AppSidebar.svelte` (448 lines)
  - Lines 32-54: Static main navigation menu configuration
  - Lines 161-203: Project loading with pagination
  - Lines 273-383: Collapsible projects section
- **Sidebar UI System**: `src/lib/components/ui/sidebar/` (24 components)
- **Related Stores**: `src/lib/stores/AuthStore.svelte`, `src/lib/stores/ProjectStore.svelte`
- **Integration Points**: `src/routes/project/Project.svelte:72-74`, `src/routes/Dashboard.svelte:297-299`

### Technical Context
- **Architecture**: Two-tier sidebar system (App + Project level)
- **Subscription Logic**: Complex capability checking with 3 API endpoints and session storage
- **Responsive Design**: Breakpoint at 768px with collapse-to-icon functionality
- **Code Duplication**: 90+ lines of identical disabled state handling logic
- **Menu Structure**: Arbitrary three-tier organization (primary/secondary/tertiary)
- **State Management**: Multiple stores for auth, project, and team management

### Code References
- **Code Duplication**: `src/lib/components/ProjectSidebar.svelte:507-556` and `src/lib/components/ProjectSidebar.svelte:602-650`
- **Subscription Logic**: `src/lib/components/ProjectSidebar.svelte:44-228`
- **Route Configuration**: `src/lib/components/ProjectSidebar.svelte:320-408`
- **Mobile Responsive**: Both sidebars use sheet/drawer pattern with overlay
- **Icon Usage**: 24 different lucide-svelte icons across both sidebars

## Subtasks
- [ ] Eliminate code duplication in disabled state handling (ProjectSidebar.svelte:507-556 and 602-650)
- [ ] Simplify subscription logic by creating unified capability service
- [ ] Refactor route grouping from arbitrary three-tier to logical organization
- [ ] Create shared components for disabled menu items and subscription tooltips
- [ ] Reorganize menu structure (Core: Overview/Literature/Notes, Analysis: Insights/Analytics, Management: Settings)
- [ ] Optimize subscription caching to reduce API calls
- [ ] Standardize tooltip patterns across both sidebars
- [ ] Add proper loading states during subscription capability checks
- [ ] Improve responsive breakpoints for tablet devices (768px-1024px)
- [ ] Test navigation flow and accessibility

## Related Tasks
None currently
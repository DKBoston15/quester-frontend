# Move Subscription Card to Settings

## Metadata
- **ID**: 012
- **Status**: todo
- **Priority**: low
- **Category**: ui-ux
- **Size**: XS
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement
The subscription card currently appears on the overview page but should be moved to the settings page for better organization.

## Research Notes
### Affected Files
- /Users/nexus/Documents/Development/quester-frontend/src/routes/Dashboard.svelte (lines 381-426) - Current location
- /Users/nexus/Documents/Development/quester-frontend/src/routes/Settings.svelte - Target location
- /Users/nexus/Documents/Development/quester-frontend/src/lib/components/ManageSubscription.svelte - Reusable component

### Technical Context
- Subscription card currently appears on Dashboard page, not project overview as initially thought
- Card only visible to organization owners (isOrganizationOwner() function)
- Uses ManageSubscription component for Stripe billing portal integration
- Settings page has tabbed interface (Profile and Organization tabs)

### Code References
- Dashboard.svelte:381-426 - Current subscription card implementation
- Settings.svelte - Target location with existing tab structure
- ManageSubscription.svelte - Core subscription management component

## Subtasks
- [ ] Remove subscription card section from Dashboard.svelte (lines 381-426)
- [ ] Add new "Subscription" or "Billing" tab to Settings.svelte
- [ ] Import ManageSubscription component in Settings.svelte
- [ ] Update subscription card styling to fit Settings page design
- [ ] Maintain organization owner access control
- [ ] Test billing functionality in new location

## Related Tasks
None currently
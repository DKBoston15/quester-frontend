# Add Create Event Button to Overview Page

## Metadata
- **ID**: 018
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: S
- **Created**: 2025-01-07
- **Updated**: 2025-01-07 (Detailed investigation completed)
- **Dependencies**: None

## Problem Statement
Users need a convenient way to create timeline events directly from the project overview page to improve workflow and accessibility.

## Research Notes
### Affected Files
- **Overview Route**: `src/routes/project/Overview.svelte` (161 lines)
  - Lines 119-159: Two-column grid layout
  - Lines 106-117: Page header with title and tutorial button
- **ProjectOverview Component**: `src/lib/components/project/ProjectOverview.svelte` (366 lines)
  - Lines 169-181: CardHeader with Edit button (optimal integration point)
- **Custom Events Store**: `src/lib/stores/custom-events-store.svelte`
  - Lines 435-462: `openCreateForm()` method
  - Lines 218: `createEvent()` method
  - Lines 44: `formState` for modal visibility
- **Event Form Modal**: `src/lib/components/custom-ui/custom-events/CustomEventForm.svelte`
  - Complete modal-based form with validation
  - Support for 6 event types (milestone, deadline, meeting, insight, decision, other)
- **Timeline System**: `src/lib/components/custom-ui/timeline/Timeline.svelte` (1041 lines)
  - Displays all event types including custom events
- **Existing Implementation**: `src/lib/components/custom-ui/timeline/TimelineControls.svelte:457-465`
  - "Add Event" button already exists in Progress page

### Technical Context
- **Architecture**: Complete event creation system already exists
- **Integration Point**: ProjectOverview component header (lines 169-181)
- **Event Store**: Full CRUD operations with optimistic updates
- **Modal System**: Controlled by store state, opens automatically on `openCreateForm()`
- **Event Types**: Supports project events, literature events, notes events, model events, outcome events, and custom events
- **Timeline Display**: Events appear in Timeline component on Progress page
- **No Breaking Changes**: All infrastructure exists, minimal code required

### Code References
- **Recommended Integration**: `src/lib/components/project/ProjectOverview.svelte:169-181`
- **Event Creation Flow**: `customEventsStore.openCreateForm()` → modal opens → form submission → timeline update
- **Existing Pattern**: `src/lib/components/custom-ui/timeline/TimelineControls.svelte:457-465`
- **Required Dependencies**: `lucide-svelte` (Plus icon), `customEventsStore` (already available)
- **Estimated Code**: ~15 lines (imports + button implementation)

## Subtasks
- [ ] Import required dependencies (Plus icon from lucide-svelte, customEventsStore)
- [ ] Add create event button to ProjectOverview component header (lines 169-181)
- [ ] Implement button click handler using customEventsStore.openCreateForm()
- [ ] Ensure button visibility follows existing edit mode pattern
- [ ] Test event creation workflow from overview page
- [ ] Verify button styling matches existing Edit button
- [ ] Test modal opening and form submission
- [ ] Ensure events appear in timeline after creation
- [ ] Test button state during edit mode (should be hidden)

## Related Tasks
Task 016 (Timeline events notes)
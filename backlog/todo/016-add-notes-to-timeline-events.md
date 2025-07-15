# Add Notes to Timeline Events

## Metadata
- **ID**: 016
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: M
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement
Users need the ability to add notes to timeline events to provide additional context and details about project milestones and activities.

## Research Notes
### Affected Files
- Timeline component: `src/lib/components/custom-ui/timeline/Timeline.svelte`
- Custom events: `src/lib/components/custom-ui/custom-events/`
- Timeline controls: `src/lib/components/custom-ui/timeline/TimelineControls.svelte`

### Technical Context
- Timeline visualization
- Custom event system
- Event data structure and storage

### Code References
- Timeline component: `src/lib/components/custom-ui/timeline/Timeline.svelte`
- Custom events: `src/lib/components/custom-ui/custom-events/CustomEventForm.svelte`

## Subtasks
- [ ] Extend event data structure to include notes
- [ ] Update event creation and editing forms
- [ ] Add notes display in timeline visualization
- [ ] Implement notes editing functionality
- [ ] Update API endpoints for event notes
- [ ] Test note creation and display

## Related Tasks
None currently
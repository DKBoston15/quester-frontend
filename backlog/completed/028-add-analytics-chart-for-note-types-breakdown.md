# Add Analytics Chart for Note Types Breakdown

## Metadata
- **ID**: 028
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: M
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement
The analytics page currently shows various charts for literature and keyword analysis but lacks a breakdown of note types. Users need to visualize the distribution of different note types (LITERATURE, RESEARCH, BASE, QUICK) to understand their note-taking patterns and research workflow.

## Research Notes
### Affected Files
- `/src/routes/project/Analytics.svelte` - Main analytics page where new chart should be added
- `/src/lib/stores/NotesStore.svelte` - Contains notes data that needs to be aggregated
- `/src/lib/types.ts` - Defines Note interface with type property

### Technical Context
The analytics page uses Chart.js for horizontal and vertical bar charts. Current charts include:
- Prevalent Publishers (horizontal bar)
- Prevalent Keywords (horizontal bar)
- Types of Literature (horizontal bar)
- Publication Years (vertical bar)
- Various research design charts

Notes have four types defined in the Note interface:
- `LITERATURE` - Notes linked to literature entries
- `RESEARCH` - General research notes
- `BASE` - Base notes
- `QUICK` - Quick notes

The NotesStore contains all notes data that can be aggregated by type for the chart.

### Code References
- `/src/routes/project/Analytics.svelte` - Chart implementations using Chart.js
- `/src/lib/stores/NotesStore.svelte` - Notes data source
- `/src/lib/types.ts:Note` - Note type definitions

## Subtasks
- [ ] Create data aggregation function to count notes by type
- [ ] Add new horizontal bar chart component for note types breakdown
- [ ] Integrate chart into analytics page layout
- [ ] Add fullscreen modal support for the new chart
- [ ] Ensure chart follows existing theming (dark/light mode)
- [ ] Add appropriate colors for each note type
- [ ] Include chart in analytics tutorial if applicable

## Related Tasks
None identified
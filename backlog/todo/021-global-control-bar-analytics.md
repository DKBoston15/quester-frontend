# Global Control Bar for Analytics Page

## Metadata
- **ID**: 021
- **Status**: todo
- **Priority**: high
- **Category**: feature
- **Size**: L
- **Created**: 2025-07-08
- **Updated**: 2025-07-08
- **Dependencies**: None

## Problem Statement
The Analytics page needs a global control bar at the top to provide users with master controls for filtering and date range selection. This will include the brushable year chart as the primary control mechanism, allowing users to set global filters like "Show me everything except websites" and master date ranges that affect all visualizations on the page.

## Research Notes
### Affected Files
- `src/routes/project/Analytics.svelte` - Main analytics page component
- Analytics-related components in `src/lib/components/`
- Potentially chart components and stores

### Technical Context
- Need to implement global state management for analytics filters
- Brushable year chart integration for date range selection
- Filter controls for content types (websites, articles, etc.)
- Coordination between global controls and individual chart components

### Code References
To be identified during implementation

## Subtasks
- [ ] Design global control bar layout and UI
- [ ] Implement brushable year chart component
- [ ] Add filter controls for content types
- [ ] Create global analytics state management
- [ ] Integrate controls with existing chart components
- [ ] Add responsive design for mobile views
- [ ] Test filter interactions across all charts

## Related Tasks
- Task 022 (Key Insights Section)
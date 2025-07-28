# Add Frequency Distribution by Publication Year

## Metadata
- **ID**: 033
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: M
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement
The analytics page currently shows publication year distribution but lacks frequency distribution analysis by publication year. Users need to understand the frequency patterns and trends in their literature collection over time periods.

## Research Notes
### Affected Files
- `/src/routes/project/Analytics.svelte` - Main analytics page with existing publication year chart
- Existing Chart.js implementation for publication years (vertical bar chart)
- Literature data source for publication year information

### Technical Context
The analytics page already has a "Distribution of Publication Years" vertical bar chart using Chart.js. This shows the count of literature by year but doesn't provide frequency distribution analysis.

A frequency distribution by publication year would show:
- Frequency bins/ranges of publication years
- Distribution patterns over time periods
- Statistical analysis of publication date clustering
- Potentially histogram-style visualization

This would complement the existing publication year chart with more detailed frequency analysis.

### Code References
- `/src/routes/project/Analytics.svelte` - Existing publication year chart implementation
- Chart.js configuration for publication year data
- Literature data aggregation logic

## Subtasks
- [ ] Design frequency distribution bins for publication years (5-year periods, decades, etc.)
- [ ] Create data aggregation function for frequency analysis
- [ ] Implement frequency distribution chart (histogram or similar)
- [ ] Add chart to analytics page layout
- [ ] Ensure chart follows existing theming and fullscreen modal support
- [ ] Add appropriate labeling and tooltips for frequency interpretation
- [ ] Test with different literature datasets to verify meaningful insights

## Related Tasks
- Task 028 (Add analytics chart for note types breakdown) - Similar chart addition pattern
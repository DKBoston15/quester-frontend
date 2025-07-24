# Make Frequency Distribution Chart Smaller

## Metadata
- **ID**: 032
- **Status**: todo
- **Priority**: low
- **Category**: ui-ux
- **Size**: XS
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement
The frequency distribution chart in keyword analysis takes up too much screen real estate, making it difficult to view multiple analytics at once or see the chart alongside other content.

## Research Notes
### Affected Files
- `/src/lib/components/keyword-analysis/FrequencyChart.svelte` - D3.js frequency distribution implementation
- `/src/lib/components/keyword-analysis/KeywordAnalysis.svelte` - Container component
- `/src/routes/project/Analytics.svelte` - Analytics page layout

### Technical Context
The frequency distribution charts are implemented using D3.js and appear in the keyword analysis section. They show frequency distributions for keyword overlap analysis with interactive Venn diagrams.

Current implementation likely uses default sizing that could be reduced while maintaining readability and functionality.

### Code References
- `/src/lib/components/keyword-analysis/FrequencyChart.svelte` - Chart sizing and dimensions
- Keyword analysis layout and responsive behavior

## Subtasks
- [ ] Identify current chart dimensions and sizing
- [ ] Reduce chart height/width while maintaining readability
- [ ] Test chart responsiveness at smaller sizes
- [ ] Ensure text and data points remain legible
- [ ] Verify fullscreen modal still works for detailed viewing
- [ ] Test on different screen sizes and devices

## Related Tasks
None identified
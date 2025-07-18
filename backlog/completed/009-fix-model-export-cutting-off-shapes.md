# Fix Model Export Cutting Off Shapes

## Metadata
- **ID**: 009
- **Status**: todo
- **Priority**: high
- **Category**: bug
- **Size**: M
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement
Downloaded model images cut off the upper parts of circles and completely cut off some shapes like blue boxes. Large circles have text cut off due to partial shape rendering.

## Research Notes
### Affected Files
- Model component: `src/lib/components/model/Model.svelte`
- Model export functionality
- Image generation logic

### Technical Context
- html-to-image library for export
- Canvas rendering and boundaries
- Shape positioning and clipping

### Code References
- Model component: `src/lib/components/model/Model.svelte`
- html-to-image dependency in package.json

## Subtasks
- [ ] Investigate model export boundary calculation
- [ ] Fix canvas sizing to include all shapes
- [ ] Test export with various model sizes and shapes
- [ ] Ensure text within shapes is fully visible
- [ ] Validate export quality and resolution

## Related Tasks
Task 008 (Model function improvements)
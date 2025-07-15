# Model Function Improvements

## Metadata
- **ID**: 008
- **Status**: todo
- **Priority**: high
- **Category**: feature
- **Size**: XL
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement
Multiple improvements needed for Model functionality: adjustable box order (move to back/front), ellipses instead of circles, Ctrl-Z should work for shape positions, and investigation of 401 errors.

## Research Notes
### Affected Files
- Model component: `src/lib/components/model/Model.svelte`
- Model view: `src/routes/project/ModelView.svelte`
- Model store: `src/lib/stores/ModelStore.svelte`

### Technical Context
- XYFlow for model visualization
- Shape manipulation and layering
- Undo/redo functionality
- Authentication and session management

### Code References
- Model component: `src/lib/components/model/Model.svelte`

## Subtasks
- [ ] Implement box order adjustment (z-index controls)
- [ ] Add ellipse shapes as alternative to circles
- [ ] Extend Ctrl-Z functionality to shape positions
- [ ] Investigate and fix 401 authentication errors
- [ ] Test model editing and saving
- [ ] Improve model interaction UX

## Related Tasks
Task 009 (Model export issues)
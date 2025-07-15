# Fix Outcome Creation Template Bug

## Metadata
- **ID**: 005
- **Status**: completed
- **Priority**: high
- **Category**: bug
- **Size**: S
- **Created**: 2025-01-07
- **Updated**: 2025-01-08
- **Dependencies**: None

## Problem Statement
When creating an outcome without a template, the page incorrectly opens with the template for Research Question instead of a blank outcome.

## Research Notes
### Affected Files
- /Users/nexus/Documents/Development/quester-frontend/src/lib/stores/OutcomeStore.svelte (lines 1328-1385, specifically 1351-1359)
- /Users/nexus/Documents/Development/quester-frontend/src/routes/project/Outcomes.svelte (lines 241-249)

### Technical Context
- Bug occurs in `createOutcome` function when no template is explicitly selected
- System defaults to first template of specified type ("QUESTION" type defaults to "Research Question" template)
- Template fallback logic is overly aggressive

### Code References
- OutcomeStore.svelte:1351-1359 - Fallback logic that causes the bug
- Outcomes.svelte:241-249 - Where createOutcome is called

## Subtasks
- [x] Modify createOutcome function to distinguish between "no template selected" and "use default template"
- [x] Add check for empty string template selection
- [x] Only apply template fallback when explicitly requested
- [x] Test outcome creation without template selection
- [x] Verify explicit template selection still works correctly

## Implementation Notes
### Approach Taken
Modified the `createOutcome` function in OutcomeStore.svelte to properly distinguish between:
- `templateName` being `undefined` (no template parameter passed - should use default template)
- `templateName` being empty string `""` (user explicitly chose no template - should create blank outcome)

### Features Implemented
- Fixed template fallback logic to only apply when `templateName` is `undefined`
- Added explicit check for empty string template selection
- Preserved existing behavior for explicit template selection and LINK type outcomes

### Technical Decisions
- Changed the condition from `if (templateName)` to `if (templateName && templateName !== "")` to handle empty strings correctly
- Added condition `templateName === undefined` to the default template application logic
- Added explanatory comments to clarify the distinction between no template vs empty template selection

### Modified Files
- `/Users/nexus/Documents/Development/quester-frontend/src/lib/stores/OutcomeStore.svelte:1337-1360` - Fixed template fallback logic in createOutcome function

## Related Tasks
None currently
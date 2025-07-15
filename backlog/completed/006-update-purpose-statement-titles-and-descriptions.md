# Update Purpose Statement Titles and Descriptions

## Metadata
- **ID**: 006
- **Status**: completed
- **Priority**: medium
- **Category**: ui-ux
- **Size**: S
- **Created**: 2025-01-07
- **Updated**: 2025-01-08
- **Dependencies**: None

## Problem Statement
Need to update project setup text: change "Missing Project Description" to "Missing Purpose Statement", update description text, replace funding statements with grant information, and add design-related recommendations.

## Research Notes
### Affected Files
- /Users/nexus/Documents/Development/quester-frontend/src/lib/components/ProjectInsights.svelte (lines 40-42, 49-67, 71-74)
- /Users/nexus/Documents/Development/quester-frontend/src/lib/components/project/ProjectOverview.svelte (lines 192-220)
- /Users/nexus/Documents/Development/quester-frontend/src/routes/project/Overview.svelte (lines 34-46)

### Technical Context
- "Missing Project Description" text appears in ProjectInsights.svelte line 40
- Description text "Define your project's purpose and scope..." appears in lines 41-42
- Two funding-related setup statements exist: Financial Institution (lines 49-57) and Financial Support Amount (lines 60-67)
- Keywords recommendation already exists with good guidance (lines 71-74)

### Code References
- ProjectInsights.svelte:40 - "Missing Project Description" title
- ProjectInsights.svelte:41-42 - Description text to update
- ProjectInsights.svelte:49-67 - Two funding statements to replace with single grant statement
- ProjectInsights.svelte:71-74 - Existing keywords recommendation (reference for new designs recommendation)

## Subtasks
- [x] Change "Missing Project Description" to "Missing Purpose Statement" in ProjectInsights.svelte:40
- [x] Update description from "Define your project's purpose and scope" to "Create a purpose statement" in lines 41-42
- [x] Replace Financial Institution setup statement (lines 49-57) with single grant information statement
- [x] Replace Financial Support Amount setup statement (lines 60-67) with grant information continuation
- [x] Add new recommended statement for Designs (similar to Keywords recommendation structure)
- [x] Test setup recommendations display correctly

## Implementation Notes

### Approach Taken
Used the MultiEdit tool to efficiently update all text changes in ProjectInsights.svelte in a single operation. This ensured consistency and reduced the chance of errors.

### Features Implemented
1. **Purpose Statement Updates**: Changed the title from "Missing Project Description" to "Missing Purpose Statement" and simplified the description text to "Create a purpose statement" for better clarity.

2. **Grant Information Consolidation**: Replaced two separate financial insights (Financial Institution and Financial Support Amount) with a single "Missing Grant Information" insight, streamlining the setup recommendations.

3. **Designs Recommendation**: Added a new recommended setup item for project designs that checks all four design fields (researchDesign, samplingDesign, measurementDesign, analyticDesign) to determine if any designs have been added.

### Technical Decisions
- Used the existing `checkFn` pattern for the designs recommendation to check multiple fields
- Maintained the same severity level ("warning") for new recommendations as similar existing items
- Preserved the commented-out action buttons for potential future implementation

### Modified Files
- src/lib/components/ProjectInsights.svelte (lines 40, 41-42, 49-74)

## Related Tasks
None currently
# Standardize Blank Page Layouts with Create Buttons

## Metadata
- **ID**: 007
- **Status**: todo
- **Priority**: medium
- **Category**: ui-ux
- **Size**: L
- **Created**: 2025-01-07
- **Updated**: 2025-01-08
- **Dependencies**: None

## Problem Statement
Need to (a) make information on blank pages uniform and centered (e.g., "No literature added yet", "No models created yet") and (b) provide "Create your first..." buttons for each tab without the Create button in the top left corner.

## Research Notes
### Affected Files
**Primary Routes (Main Focus):**
- `src/routes/project/Literature.svelte:264-269` - NEEDS CTA button
- `src/routes/project/Models.svelte:369-382` - GOOD PATTERN (reference)
- `src/routes/project/Notes.svelte:370-386` - Different pattern (selection state)
- `src/routes/project/Outcomes.svelte:451-464` - GOOD PATTERN (reference)

**List/Table Components:**
- `src/lib/components/notes/NoteList.svelte:761-768` - Basic text pattern
- `src/lib/components/custom-ui/literature/LiteratureTable.svelte` - AG-Grid handled
- `src/lib/components/keyword-analysis/AnalysisResults.svelte:591-597` - Inline table empty state

**Team Management:**
- `src/lib/components/TeamMembersList.svelte:422-430` - Contextual messages
- `src/lib/components/InvitationManager.svelte:420-441` - Comprehensive state management
- `src/lib/components/PendingInvites.svelte:108-111` - Simple centered

**Analytics/Insights:**
- `src/lib/components/ProjectInsights.svelte:339-350` - Completion state
- `src/lib/components/custom-ui/project/NextBestActions.svelte:294-304,370-379` - Tab-specific
- `src/lib/components/graph/TwoD.svelte:505-514` - Instructional with CTA

**Existing UI Components:**
- `src/lib/components/ui/command/command-empty.svelte` - Command/search specific

### Technical Context
**Current Patterns Identified:**
1. **Complete Pattern** (Models/Outcomes): `flex flex-col justify-center items-center h-[400px] gap-4` with CTA button
2. **Incomplete Pattern** (Literature): `flex justify-center items-center h-[400px]` without CTA button
3. **Selection Pattern** (Notes): `h-full flex items-center justify-center` for no-selection states
4. **Search Pattern** (NoteList): `text-center py-8 text-muted-foreground` for search results
5. **Inline Pattern** (Tables): Embedded within table structures
6. **Contextual Pattern** (TeamMembers): Different messages based on search vs no data

**Design System Elements:**
- Height: `h-[400px]` for main content areas
- Typography: `text-lg text-muted-foreground` for messages
- Buttons: `variant="outline"` with Plus icon and custom shadow styling
- Gap: `gap-4` between elements
- Shadow: `shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]` (design system pattern)

### Code References
**REFERENCE PATTERN (Models.svelte:369-382):**
```svelte
<div class="flex flex-col justify-center items-center h-[400px] gap-4">
  <p class="text-lg text-muted-foreground">No models created yet</p>
  <Button
    variant="outline"
    onclick={() => (showCreateDialog = true)}
    class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(44,46,51,0.1)] transition-all"
  >
    <Plus class="h-4 w-4 mr-2" />
    Create your first model
  </Button>
</div>
```

**PROBLEMATIC PATTERN (Literature.svelte:264-269):**
```svelte
<div class="flex justify-center items-center h-[400px]">
  <p class="text-lg text-muted-foreground">No literature added yet</p>
</div>
```

**TOP-LEFT BUTTON FINDING:**
- ✅ **NO top-left create buttons found** - all existing buttons are properly positioned in top-right
- Current button layout: `[Page Title] .................... [Create Buttons]`
- All create buttons use consistent pattern with Plus icon and proper styling

## Subtasks
### Phase 1: Component Creation
- [ ] Create reusable `EmptyState.svelte` component based on Models.svelte pattern
- [ ] Define component variants: `data-empty`, `search-empty`, `selection-empty`, `completion`
- [ ] Add proper TypeScript types and prop interfaces

### Phase 2: Primary Routes Standardization
- [ ] ✅ Literature.svelte:264-269 - Add CTA button using EmptyState component
- [ ] ✅ Models.svelte:369-382 - Already good, convert to use EmptyState component
- [ ] ✅ Outcomes.svelte:451-464 - Already good, convert to use EmptyState component
- [ ] ✅ Notes.svelte:370-386 - Review if needs changes (selection state vs data state)

### Phase 3: List/Table Components
- [ ] NoteList.svelte:761-768 - Standardize with EmptyState component
- [ ] TeamMembersList.svelte:422-430 - Standardize contextual messages
- [ ] PendingInvites.svelte:108-111 - Standardize with EmptyState component
- [ ] AnalysisResults.svelte:591-597 - Standardize inline table empty state

### Phase 4: Analytics/Insights Components
- [ ] ProjectInsights.svelte:339-350 - Standardize completion state
- [ ] NextBestActions.svelte:294-304,370-379 - Standardize tab-specific empty states
- [ ] TwoD.svelte:505-514 - Standardize instructional empty state

### Phase 5: Validation & Testing
- [ ] Ensure all empty states follow consistent messaging patterns
- [ ] Verify CTA buttons trigger correct actions
- [ ] Test responsive behavior across different screen sizes
- [ ] Validate accessibility (ARIA labels, keyboard navigation)
- [ ] ~~Remove/relocate top-left Create buttons~~ - NOT NEEDED (no top-left buttons found)

## Implementation Plan

### 1. Create Base EmptyState Component
- **File**: `src/lib/components/ui/empty-state/EmptyState.svelte`
- **Base Pattern**: Use Models.svelte:369-382 as template
- **Props Interface**:
  ```typescript
  interface EmptyStateProps {
    title: string;
    description?: string;
    variant?: 'data-empty' | 'search-empty' | 'selection-empty' | 'completion';
    ctaText?: string;
    ctaAction?: () => void;
    icon?: ComponentType;
    height?: string; // default: 'h-[400px]'
  }
  ```

### 2. Define Standardized Patterns
- **Data Empty**: Main content areas with CTA buttons
- **Search Empty**: Search results with contextual help
- **Selection Empty**: No item selected states
- **Completion**: Positive completion states

### 3. Migration Strategy
- **Phase 1**: Create component and test with Literature.svelte
- **Phase 2**: Migrate primary routes (Models, Outcomes)
- **Phase 3**: Migrate list/table components
- **Phase 4**: Migrate analytics/insights components
- **Phase 5**: Testing and validation

### 4. Design System Integration
- **Shadows**: Use existing `shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]` pattern
- **Typography**: Consistent `text-lg text-muted-foreground`
- **Buttons**: `variant="outline"` with Plus icon
- **Spacing**: `gap-4` between elements
- **Height**: `h-[400px]` for main content areas

### 5. Quality Assurance
- **Accessibility**: ARIA labels, keyboard navigation
- **Responsive**: Test across breakpoints
- **Consistency**: Verify all empty states use component
- **Actions**: Ensure CTA buttons trigger correct functions

## Investigation Summary
✅ **COMPLETE** - Deep investigation conducted across entire codebase
- **26 empty states** found across 14 different files
- **5 distinct patterns** identified with Models/Outcomes as best practice
- **0 top-left create buttons** found (all properly positioned in top-right)
- **Ready for implementation** with clear standardization plan

## Related Tasks
None currently
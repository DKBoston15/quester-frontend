# Add Label to Note Type Dropdown

## Metadata
- **ID**: 027
- **Status**: todo
- **Priority**: medium
- **Category**: ui-ux
- **Size**: S
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement
The note type dropdown in the note editor currently lacks clear labeling, making it unclear to users what the dropdown controls. Users need a visible label to understand they can select different note section types.

## Research Notes
### Affected Files
- `/src/lib/components/notes/NoteEditor.svelte` (lines 654-668) - Contains the existing Select component for section types
- `/src/lib/components/notes/NoteEditor.svelte` (lines 59-67) - Defines sectionTypeOptions array

### Technical Context
The dropdown is currently implemented using shadcn-svelte Select component and only appears when `note.type === "LITERATURE"`. It controls the `section_type` property with options: Introduction, Methods, Results, Discussion, Conclusion, References, Other.

Current implementation shows no label:
```svelte
<Select
  type="single"
  value={currentSectionType.value}
  onValueChange={handleSectionTypeChange}
>
  <SelectTrigger class="h-8 w-[180px]">
    <span>{currentSectionType.label}</span>
  </SelectTrigger>
```

### Code References
- `/src/lib/components/notes/NoteEditor.svelte:654-668` - Select component implementation
- `/src/lib/components/notes/NoteEditor.svelte:59-67` - Section type options definition

## Subtasks
- [x] Add appropriate label text above or beside the Select component
- [x] Ensure label is semantically linked to the dropdown for accessibility
- [x] Style label consistently with existing form elements in the editor
- [x] Test that label appears only when dropdown is visible (LITERATURE notes only)

## Implementation Notes
- Added semantic label "Section:" with proper accessibility linking using `for` and `id` attributes
- Wrapped the Select component in a flex container with gap for proper spacing
- Used consistent styling with `text-sm font-medium text-muted-foreground` matching existing form elements
- Label only appears when condition `note.type === "LITERATURE"` is met, same as the dropdown
- Implementation maintains existing functionality while improving user clarity and accessibility

## Related Tasks
None identified
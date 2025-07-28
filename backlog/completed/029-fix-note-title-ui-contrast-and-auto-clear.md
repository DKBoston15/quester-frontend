# Fix Note Title UI Contrast and Auto-Clear Untitled

## Metadata
- **ID**: 029
- **Status**: todo
- **Priority**: medium
- **Category**: ui-ux
- **Size**: M
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement
The note title input has poor contrast and lacks auto-clear functionality for "Untitled Note". Users face accessibility issues due to invisible focus states and must manually delete placeholder text when creating new notes, creating a poor user experience.

## Research Notes
### Affected Files
- `/src/lib/components/notes/NoteEditor.svelte` (lines 595-627) - Main title input implementation
- `/src/lib/components/notes/NoteList.svelte` (lines 625-631) - Title display in sidebar
- `/src/lib/components/ui/input/input.svelte` - Base input component styling
- `/src/routes/project/Notes.svelte` (line 191) - Note creation with default "Untitled Note"

### Technical Context
Current title input styling uses:
- `bg-transparent border-none shadow-none` - Makes input nearly invisible
- `focus-visible:ring-0` - Completely removes focus indicators
- Placeholder "Untitled Note" with no auto-selection
- Manual DOM manipulation for updates instead of reactive updates

**Accessibility Issues Identified:**
1. No focus ring violates WCAG guidelines
2. Placeholder contrast may not meet WCAG AA requirements
3. No visual indication that title is editable
4. Poor keyboard navigation experience

**UX Issues:**
- Users must manually select and delete "Untitled Note" text
- No auto-selection when focusing on default title
- Unclear editability due to transparent styling

### Code References
- `/src/lib/components/notes/NoteEditor.svelte:595-627` - Title input component
- `/src/lib/components/notes/NoteEditor.svelte:71-74` - Auto-edit mode logic
- `/src/lib/components/notes/NoteEditor.svelte:84-87` - Save prevention logic

## Subtasks
- [ ] Restore proper focus ring styling for accessibility compliance
- [ ] Implement auto-text-selection when focusing on "Untitled Note"
- [ ] Add subtle visual indicators (border/background) to show editability
- [ ] Improve placeholder text contrast to meet WCAG AA standards
- [ ] Replace manual DOM manipulation with reactive state updates
- [ ] Test keyboard navigation and screen reader compatibility
- [ ] Ensure consistent styling across light and dark themes

## Related Tasks
None identified
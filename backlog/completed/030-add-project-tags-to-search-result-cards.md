# Add Project Tags to Search Result Cards

## Metadata
- **ID**: 030
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: S
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement
When users select "All Projects" in the global search dialog, search result cards don't indicate which project each result belongs to. This makes it difficult for users to understand the context and origin of search results across multiple projects.

## Research Notes
### Affected Files
- `/src/lib/components/global-search/GlobalSearchDialog.svelte` - Main search dialog with result cards
- `/src/lib/stores/GlobalSearchStore.svelte.ts` - Search state management and API calls
- `/src/lib/services/SearchService.ts` - API service for search operations

### Technical Context
The global search dialog has a toggle for "Current Project" vs "All Projects" scope. When "All Projects" is selected, results come from multiple projects but the cards don't show project information.

Current search result card structure shows:
- Content type badge (Notes, Literature, Projects, etc.)
- Title and snippet
- Last updated timestamp
- Relevance score

The search API likely returns project information that isn't being displayed in the UI. Need to add project name/identifier to each result card when showing cross-project results.

### Code References
- `/src/lib/components/global-search/GlobalSearchDialog.svelte` - Search result card rendering
- `/src/lib/stores/GlobalSearchStore.svelte.ts` - Search API integration
- Search scope toggle logic for "All Projects" vs "Current Project"

## Subtasks
- [ ] Investigate search API response to confirm project information is included
- [ ] Add project name display to search result cards
- [ ] Style project tags to be visually distinct from content type badges
- [ ] Ensure project tags only show when "All Projects" scope is selected
- [ ] Handle cases where project information might be missing
- [ ] Test with multiple projects to verify correct project attribution

## Related Tasks
None identified
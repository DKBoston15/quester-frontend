# Add Tutorial AI Chat and Move Research AI to Separate Page

## Metadata
- **ID**: 031
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: L
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement
The current AI chat implementation is mixed between global search and project-specific research functionality. Users need a dedicated tutorial AI chat within the search interface for general help, while the research-specific AI should be moved to its own dedicated page for focused research tasks.

## Research Notes
### Affected Files
- `/src/lib/components/global-search/AIChat.svelte` - Current AI chat in global search
- `/src/lib/components/global-search/GlobalSearchDialog.svelte` - Search dialog containing AI chat
- `/src/routes/project/Chat.svelte` - Existing project-specific chat page
- `/src/lib/stores/GlobalSearchStore.svelte.ts` - Search and chat state management

### Technical Context
Currently there are two AI chat implementations:

1. **Global AI Chat** (in search dialog):
   - Located in GlobalSearchDialog
   - Chat history with session management
   - General purpose AI assistance
   - Integrated with search functionality

2. **Project Chat** (dedicated page):
   - Research-focused suggestions
   - Streaming responses
   - Source references with relevance scores
   - Project context awareness

**Proposed Changes:**
- Add tutorial-focused AI chat to search dialog for general help/guidance
- Move research-specific AI functionality to dedicated research AI page
- Separate concerns between general tutorial assistance and research tasks

### Code References
- `/src/lib/components/global-search/AIChat.svelte` - Current AI implementation
- `/src/routes/project/Chat.svelte` - Research chat page
- Chat state management and API integration patterns

## Subtasks
- [ ] Create new tutorial AI chat component for search dialog
- [ ] Design tutorial AI prompts and help categories
- [ ] Move research AI functionality to dedicated route/page
- [ ] Update navigation to include dedicated research AI page
- [ ] Implement different AI contexts (tutorial vs research)
- [ ] Update state management to handle separate chat types
- [ ] Ensure proper session separation between tutorial and research chats
- [ ] Add appropriate routing and navigation updates
- [ ] Update any existing links/references to AI functionality

## Related Tasks
None identified
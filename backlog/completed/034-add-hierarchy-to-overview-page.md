# Add Hierarchy to Overview Page

## Metadata

- **ID**: 034
- **Status**: todo
- **Priority**: medium
- **Category**: ui-ux
- **Size**: L
- **Created**: 2025-01-24
- **Updated**: 2025-01-24
- **Dependencies**: None

## Problem Statement

The overview pages (both dashboard and project overview) lack clear visual hierarchy and information organization. Users need better information architecture to quickly understand project status, navigate between sections, and prioritize their work across multiple projects.

## Research Notes

### Affected Files

- `/src/routes/Dashboard.svelte` - Main dashboard overview page
- `/src/routes/project/Overview.svelte` - Project-specific overview page
- `/src/lib/components/OrganizationStructure.svelte` - Organization/project tree component
- Project sidebar and navigation components

### Technical Context

**Current Dashboard Structure:**

- Single card with organization structure (tree/list view)
- Basic search and filter functionality
- Flat information presentation

**Current Project Overview Structure:**

- Two-column grid layout
- Left: Project details, keywords, research designs, products
- Right: Project health, next actions

**Missing Hierarchy Elements:**

- No breadcrumb navigation
- No visual grouping of related information
- No priority indicators or status visualization
- No progressive disclosure for information density
- Limited contextual navigation

### Code References

- `/src/routes/Dashboard.svelte` - Main dashboard layout
- `/src/routes/project/Overview.svelte` - Project overview two-column layout
- `/src/lib/components/OrganizationStructure.svelte` - Project tree structure

## Subtasks

- [ ] Add breadcrumb navigation showing Organization > Department > Project > Section
- [ ] Implement visual grouping of related cards with separators or backgrounds
- [ ] Add priority indicators and status color coding system
- [ ] Create collapsible sections for better information density
- [ ] Add quick action buttons directly in overview cards
- [ ] Implement project switcher component for easy context switching
- [ ] Add "What to do next" smart recommendations based on project state
- [ ] Create dashboard widgets to replace single organization strucBetture card
- [ ] Add visual progress indicators for project health across multiple projects
- [ ] Implement consistent status indicators throughout the hierarchy
- [ ] Test responsive behavior with enhanced hierarchy elements

## Related Tasks

None identified

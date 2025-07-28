# Add Info Icon Tooltips to Page Headers

## Metadata

- **ID**: 020
- **Status**: todo
- **Priority**: medium
- **Category**: ui-ux
- **Size**: S
- **Created**: 2025-01-08
- **Updated**: 2025-01-08
- **Dependencies**: []

## Problem Statement

Several pages in the application are missing info icon tooltips next to their page headers. These tooltips provide contextual help to users, explaining the purpose of each section. Currently, only 3 pages have these tooltips (models, notes, outcomes), while 7 pages that should have them are missing this feature.

## Research Notes

### Affected Files

- `src/routes/project/[id]/analytics/+page.svelte`
- `src/routes/project/[id]/insights/+page.svelte`
- `src/routes/project/[id]/literature/+page.svelte`
- `src/routes/project/[id]/settings/+page.svelte`
- `src/routes/team-management/+page.svelte`
- `src/routes/organization-settings/+page.svelte`
- `src/routes/organization-analytics/+page.svelte`

### Technical Context

The existing pattern uses:

- `lucide-svelte` for the Info icon
- `shadcn-svelte` Tooltip component
- Consistent styling: `h-5 w-5 text-muted-foreground` for the icon
- Tooltip content wrapped in `<p class="text-sm max-w-xs">`

### Code References

Example implementation from `src/routes/project/[id]/models/+page.svelte`:

```svelte
<div class="flex items-center gap-2">
  <h1 class="text-3xl font-bold">Models</h1>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Info class="h-5 w-5 text-muted-foreground" />
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p class="text-sm max-w-xs">
        Create and manage research models to visualize your concepts and relationships.
      </p>
    </Tooltip.Content>
  </Tooltip.Root>
</div>
```

## Subtasks

- [ ] Add info tooltip to Analytics page with appropriate description
- [ ] Add info tooltip to Insights page with appropriate description
- [ ] Add info tooltip to Literature page with appropriate description
- [ ] Add info tooltip to Project Settings page with appropriate description
- [ ] Add info tooltip to Team Management page with appropriate description
- [ ] Add info tooltip to Organization Settings page with appropriate description
- [ ] Add info tooltip to Organization Analytics page with appropriate description
- [ ] Ensure consistent styling and behavior across all tooltips

## Related Tasks

- None identified

<!-- TimelineControls.svelte -->
<script lang="ts">
  import {
    Search,
    Filter,
    Calendar,
    SlidersHorizontal,
    X,
    CalendarDays,
    Download,
    Share2,
    CheckSquare,
    Square,
    MoreHorizontal,
    Trash2,
    Edit3,
    Eye,
    Archive,
    Tag,
    User,
    RotateCcw,
    FileText,
    Star,
    Plus,
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Popover from "$lib/components/ui/popover";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Select from "$lib/components/ui/select";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  // import { DatePicker } from "$lib/components/ui/date-picker";
  import { fade, slide } from "svelte/transition";
  import { customEventsStore } from "$lib/stores/custom-events-store.svelte";
  import type {
    CustomTimelineEvent,
    CustomEventCreator,
  } from "$lib/types/custom-events";

  interface FilterOptions {
    types: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    searchQuery: string;
    customEventTypes?: string[];
    createdBy?: string[];
    tags?: string[];
  }

  interface TypeOption {
    id: string;
    label: string;
    count: number;
  }

  interface BulkActionResult {
    action: string;
    eventIds: string[];
    success: boolean;
    message?: string;
  }

  let {
    filters = { types: [], searchQuery: "" },
    onFiltersChange,
    availableTypes = [],
    selectedEvents = [],
    onBulkAction = undefined,
    showBulkActions = true,
    showExportOptions = true,
    onExport = undefined,
    customEvents = [],
  } = $props<{
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    availableTypes: TypeOption[];
    selectedEvents?: string[];
    onBulkAction?: (
      action: string,
      eventIds: string[]
    ) => Promise<BulkActionResult>;
    showBulkActions?: boolean;
    showExportOptions?: boolean;
    onExport?: (format: string, filters: FilterOptions) => void;
    customEvents?: CustomTimelineEvent[];
  }>();

  let searchQuery = $state(filters.searchQuery);
  let selectedTypes = $state(new Set(filters.types));
  let selectedCustomEventTypes = $state(
    new Set(filters.customEventTypes || [])
  );
  let selectedCreators = $state(new Set(filters.createdBy || []));
  let selectedTags = $state(new Set(filters.tags || []));
  let dateRangeStart = $state<Date | undefined>(filters.dateRange?.start);
  let dateRangeEnd = $state<Date | undefined>(filters.dateRange?.end);
  let dateRangeStartString = $state(
    dateRangeStart ? dateRangeStart.toISOString().split("T")[0] : ""
  );
  let dateRangeEndString = $state(
    dateRangeEnd ? dateRangeEnd.toISOString().split("T")[0] : ""
  );
  let showFilters = $state(false);
  let showAdvancedFilters = $state(false);
  let showBulkActionsMenu = $state(false);
  let showExportMenu = $state(false);
  let bulkActionInProgress = $state(false);

  // Get available custom event types
  let availableCustomEventTypes = $derived(() => {
    const types = new Set<string>();
    customEvents.forEach((event: CustomTimelineEvent) => {
      if (event.eventType) {
        types.add(event.eventType);
      }
    });
    return Array.from(types).map((type) => ({
      id: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      count: customEvents.filter(
        (e: CustomTimelineEvent) => e.eventType === type
      ).length,
    }));
  });

  // Get available creators
  let availableCreators = $derived(() => {
    const creators = new Map<string, CustomEventCreator>();
    customEvents.forEach((event: CustomTimelineEvent) => {
      if (event.creator) {
        creators.set(event.creator.id, event.creator);
      }
    });
    return Array.from(creators.values()).map((creator) => ({
      id: creator.id,
      label: creator.name || creator.email,
      count: customEvents.filter(
        (e: CustomTimelineEvent) => e.creator?.id === creator.id
      ).length,
    }));
  });

  // Get available tags
  let availableTags = $derived(() => {
    const tags = new Set<string>();
    customEvents.forEach((event: CustomTimelineEvent) => {
      if (event.tags) {
        event.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).map((tag) => ({
      id: tag,
      label: tag,
      count: customEvents.filter((e: CustomTimelineEvent) =>
        e.tags?.includes(tag)
      ).length,
    }));
  });

  // Update filters when any filter value changes
  let searchTimeout: ReturnType<typeof setTimeout>;
  $effect(() => {
    clearTimeout(searchTimeout);

    // Get current values to ensure they're tracked as dependencies
    const currentSearchQuery = searchQuery;
    const currentTypes = Array.from(selectedTypes);
    const currentCustomEventTypes = Array.from(selectedCustomEventTypes);
    const currentCreators = Array.from(selectedCreators);
    const currentTags = Array.from(selectedTags);
    const currentDateRange =
      dateRangeStart && dateRangeEnd
        ? { start: dateRangeStart, end: dateRangeEnd }
        : undefined;

    // Check what has changed
    const hasSearchChanged = currentSearchQuery !== filters.searchQuery;
    const hasTypesChanged =
      currentTypes.length !== filters.types.length ||
      !currentTypes.every((type) => filters.types.includes(type));
    const hasCustomEventTypesChanged =
      currentCustomEventTypes.length !==
        (filters.customEventTypes?.length || 0) ||
      !currentCustomEventTypes.every((type) =>
        filters.customEventTypes?.includes(type)
      );
    const hasCreatorsChanged =
      currentCreators.length !== (filters.createdBy?.length || 0) ||
      !currentCreators.every((creator) => filters.createdBy?.includes(creator));
    const hasTagsChanged =
      currentTags.length !== (filters.tags?.length || 0) ||
      !currentTags.every((tag) => filters.tags?.includes(tag));
    const hasDateRangeChanged =
      JSON.stringify(currentDateRange) !== JSON.stringify(filters.dateRange);

    // Update non-search filters immediately
    if (
      hasTypesChanged ||
      hasCustomEventTypesChanged ||
      hasCreatorsChanged ||
      hasTagsChanged ||
      hasDateRangeChanged
    ) {
      onFiltersChange({
        ...filters,
        searchQuery: currentSearchQuery,
        types: currentTypes,
        customEventTypes: currentCustomEventTypes,
        createdBy: currentCreators,
        tags: currentTags,
        dateRange: currentDateRange,
      });
    } else if (hasSearchChanged) {
      // Debounce search queries
      searchTimeout = setTimeout(() => {
        onFiltersChange({
          ...filters,
          searchQuery: currentSearchQuery,
          types: currentTypes,
          customEventTypes: currentCustomEventTypes,
          createdBy: currentCreators,
          tags: currentTags,
          dateRange: currentDateRange,
        });
      }, 300);
    }
  });

  function toggleType(typeId: string) {
    if (selectedTypes.has(typeId)) {
      selectedTypes.delete(typeId);
    } else {
      selectedTypes.add(typeId);
    }
    selectedTypes = new Set(selectedTypes);
  }

  function toggleCustomEventType(typeId: string) {
    if (selectedCustomEventTypes.has(typeId)) {
      selectedCustomEventTypes.delete(typeId);
    } else {
      selectedCustomEventTypes.add(typeId);
    }
    selectedCustomEventTypes = new Set(selectedCustomEventTypes);
  }

  function toggleCreator(creatorId: string) {
    if (selectedCreators.has(creatorId)) {
      selectedCreators.delete(creatorId);
    } else {
      selectedCreators.add(creatorId);
    }
    selectedCreators = new Set(selectedCreators);
  }

  function toggleTag(tag: string) {
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }
    selectedTags = new Set(selectedTags);
  }

  function clearDateRange() {
    dateRangeStart = undefined;
    dateRangeEnd = undefined;
  }

  function clearFilters() {
    searchQuery = "";
    selectedTypes = new Set();
    selectedCustomEventTypes = new Set();
    selectedCreators = new Set();
    selectedTags = new Set();
    dateRangeStart = undefined;
    dateRangeEnd = undefined;

    onFiltersChange({
      types: [],
      searchQuery: "",
      customEventTypes: [],
      createdBy: [],
      tags: [],
    });
  }

  async function handleBulkAction(action: string) {
    if (!onBulkAction || selectedEvents.length === 0) return;

    bulkActionInProgress = true;
    try {
      const result = await onBulkAction(action, selectedEvents);
      console.log("Bulk action result:", result);
    } catch (error) {
      console.error("Bulk action error:", error);
    } finally {
      bulkActionInProgress = false;
    }
  }

  function handleExport(format: string) {
    if (onExport) {
      onExport(format, filters);
    }
    showExportMenu = false;
  }

  // Custom event handlers
  function handleAddCustomEvent() {
    customEventsStore.openCreateForm();
  }

  // Date conversion handlers
  $effect(() => {
    if (dateRangeStartString) {
      dateRangeStart = new Date(dateRangeStartString);
    } else {
      dateRangeStart = undefined;
    }
  });

  $effect(() => {
    if (dateRangeEndString) {
      dateRangeEnd = new Date(dateRangeEndString);
    } else {
      dateRangeEnd = undefined;
    }
  });

  const typeColors: Record<string, string> = {
    project:
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
    literature:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    notes:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    models: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300",
    outcomes:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
    status: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300",
    design:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
    custom:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
  };

  let hasActiveFilters = $derived(
    searchQuery.length > 0 ||
      selectedTypes.size > 0 ||
      selectedCustomEventTypes.size > 0 ||
      selectedCreators.size > 0 ||
      selectedTags.size > 0 ||
      (dateRangeStart && dateRangeEnd)
  );

  let hasSelectedEvents = $derived(selectedEvents.length > 0);
</script>

<div class="timeline-controls">
  <div class="controls-row">
    <!-- Search -->
    <div class="search-container">
      <div class="search-input-wrapper flex items-center gap-2">
        <Search class="search-icon" />
        <Input
          bind:value={searchQuery}
          placeholder="Search timeline events..."
          class="search-input"
        />
        {#if searchQuery}
          <button
            onclick={() => (searchQuery = "")}
            class="clear-search"
            in:fade={{ duration: 150 }}
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Add Custom Event Button -->
    <Button
      variant="default"
      onclick={handleAddCustomEvent}
      class="add-event-button"
    >
      <Plus class="w-4 h-4 mr-2" />
      Add Event
    </Button>

    <!-- Filter toggle -->
    <Popover.Root bind:open={showFilters}>
      <Popover.Trigger>
        <Button
          variant="outline"
          class="filter-button {hasActiveFilters ? 'has-filters' : ''}"
        >
          <SlidersHorizontal class="w-4 h-4 mr-2" />
          Filters
          {#if hasActiveFilters}
            <Badge variant="secondary" class="filter-count ml-1">
              {selectedTypes.size +
                selectedCustomEventTypes.size +
                selectedCreators.size +
                selectedTags.size +
                (searchQuery ? 1 : 0) +
                (dateRangeStart && dateRangeEnd ? 1 : 0)}
            </Badge>
          {/if}
        </Button>
      </Popover.Trigger>

      <Popover.Content
        class="filter-popover overflow-y-auto z-[1050] w-[28rem] max-h-[400px]"
        side="bottom"
        align="end"
        sideOffset={8}
        avoidCollisions={false}
        sticky="always"
      >
        <div class="filter-content">
          <div class="filter-header">
            <h3 class="filter-title">Filter Timeline</h3>
            {#if hasActiveFilters}
              <button onclick={clearFilters} class="clear-filters">
                Clear all
              </button>
            {/if}
          </div>

          <!-- Date Range Filter -->
          <div class="filter-section">
            <h4 class="filter-section-title">Date Range</h4>
            <div class="date-range-container">
              <div class="date-inputs">
                <Input
                  type="date"
                  bind:value={dateRangeStartString}
                  placeholder="Start date"
                  class="date-input"
                />
                <Input
                  type="date"
                  bind:value={dateRangeEndString}
                  placeholder="End date"
                  class="date-input"
                />
                {#if dateRangeStart && dateRangeEnd}
                  <button onclick={clearDateRange} class="clear-date-range">
                    <X class="w-4 h-4" />
                  </button>
                {/if}
              </div>
            </div>
          </div>

          <!-- Event Types -->
          <div class="filter-section">
            <h4 class="filter-section-title">Event Types</h4>
            <div class="type-filters">
              {#each availableTypes as type}
                <label class="type-filter-item">
                  <Checkbox
                    checked={selectedTypes.has(type.id)}
                    onCheckedChange={() => toggleType(type.id)}
                  />
                  <div class="type-label">
                    <span class="type-name">{type.label}</span>
                    <Badge
                      variant="outline"
                      class="type-count {typeColors[type.id] || ''}"
                    >
                      {type.count}
                    </Badge>
                  </div>
                </label>
              {/each}
            </div>
          </div>

          <!-- Custom Event Types -->
          {#if availableCustomEventTypes().length > 0}
            <div class="filter-section">
              <h4 class="filter-section-title">Custom Event Types</h4>
              <div class="type-filters">
                {#each availableCustomEventTypes() as type}
                  <label class="type-filter-item">
                    <Checkbox
                      checked={selectedCustomEventTypes.has(type.id)}
                      onCheckedChange={() => toggleCustomEventType(type.id)}
                    />
                    <div class="type-label">
                      <span class="type-name">{type.label}</span>
                      <Badge variant="outline" class="type-count">
                        {type.count}
                      </Badge>
                    </div>
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Created By -->
          {#if availableCreators().length > 0}
            <div class="filter-section">
              <h4 class="filter-section-title">Created By</h4>
              <div class="type-filters">
                {#each availableCreators() as creator}
                  <label class="type-filter-item">
                    <Checkbox
                      checked={selectedCreators.has(creator.id)}
                      onCheckedChange={() => toggleCreator(creator.id)}
                    />
                    <div class="type-label">
                      <span class="type-name">{creator.label}</span>
                      <Badge variant="outline" class="type-count">
                        {creator.count}
                      </Badge>
                    </div>
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Tags -->
          {#if availableTags().length > 0}
            <div class="filter-section">
              <h4 class="filter-section-title">Tags</h4>
              <div class="type-filters">
                {#each availableTags() as tag}
                  <label class="type-filter-item">
                    <Checkbox
                      checked={selectedTags.has(tag.id)}
                      onCheckedChange={() => toggleTag(tag.id)}
                    />
                    <div class="type-label">
                      <span class="type-name">#{tag.label}</span>
                      <Badge variant="outline" class="type-count">
                        {tag.count}
                      </Badge>
                    </div>
                  </label>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- Bulk Actions -->
    {#if showBulkActions && hasSelectedEvents}
      <DropdownMenu.Root bind:open={showBulkActionsMenu}>
        <DropdownMenu.Trigger>
          <Button variant="outline" class="bulk-actions-button">
            <CheckSquare class="w-4 h-4 mr-2" />
            {selectedEvents.length} Selected
            <MoreHorizontal class="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Label>Bulk Actions</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onclick={() => handleBulkAction("edit")}
            disabled={bulkActionInProgress}
          >
            <Edit3 class="w-4 h-4 mr-2" />
            Edit Selected
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => handleBulkAction("export")}
            disabled={bulkActionInProgress}
          >
            <Download class="w-4 h-4 mr-2" />
            Export Selected
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onclick={() => handleBulkAction("archive")}
            disabled={bulkActionInProgress}
            class="text-amber-600"
          >
            <Archive class="w-4 h-4 mr-2" />
            Archive Selected
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => handleBulkAction("delete")}
            disabled={bulkActionInProgress}
            class="text-destructive"
          >
            <Trash2 class="w-4 h-4 mr-2" />
            Delete Selected
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}

    <!-- Export Options -->
    {#if showExportOptions}
      <DropdownMenu.Root bind:open={showExportMenu}>
        <DropdownMenu.Trigger>
          <Button variant="outline" size="sm">
            <Download class="w-4 h-4 mr-2" />
            Export
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Label>Export Format</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => handleExport("csv")}>
            <FileText class="w-4 h-4 mr-2" />
            CSV File
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => handleExport("json")}>
            <FileText class="w-4 h-4 mr-2" />
            JSON File
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}

    <!-- Clear filters (when active) -->
    {#if hasActiveFilters}
      <Button
        variant="ghost"
        size="sm"
        onclick={clearFilters}
        class="clear-all-button"
      >
        <X class="w-4 h-4" />
        Clear
      </Button>
    {/if}
  </div>

  <!-- Active filters display -->
  {#if hasActiveFilters}
    <div class="active-filters" in:slide={{ duration: 200 }}>
      {#if searchQuery}
        <Badge variant="secondary" class="filter-badge">
          Search: "{searchQuery}"
          <button
            onclick={() => (searchQuery = "")}
            class="filter-badge-remove"
          >
            <X class="w-3 h-3" />
          </button>
        </Badge>
      {/if}

      {#if dateRangeStart && dateRangeEnd}
        <Badge variant="secondary" class="filter-badge">
          <CalendarDays class="w-3 h-3 mr-1" />
          {dateRangeStart.toLocaleDateString()} - {dateRangeEnd.toLocaleDateString()}
          <button onclick={clearDateRange} class="filter-badge-remove">
            <X class="w-3 h-3" />
          </button>
        </Badge>
      {/if}

      {#each Array.from(selectedTypes) as typeId}
        {@const type = availableTypes.find((t: TypeOption) => t.id === typeId)}
        {#if type}
          <Badge
            variant="secondary"
            class="filter-badge {typeColors[String(typeId)] || ''}"
          >
            {type.label}
            <button
              onclick={() => toggleType(String(typeId))}
              class="filter-badge-remove"
            >
              <X class="w-3 h-3" />
            </button>
          </Badge>
        {/if}
      {/each}

      {#each Array.from(selectedCustomEventTypes) as typeId}
        {@const type = availableCustomEventTypes().find((t) => t.id === typeId)}
        {#if type}
          <Badge variant="secondary" class="filter-badge">
            <Star class="w-3 h-3 mr-1" />
            {type.label}
            <button
              onclick={() => toggleCustomEventType(String(typeId))}
              class="filter-badge-remove"
            >
              <X class="w-3 h-3" />
            </button>
          </Badge>
        {/if}
      {/each}

      {#each Array.from(selectedCreators) as creatorId}
        {@const creator = availableCreators().find((c) => c.id === creatorId)}
        {#if creator}
          <Badge variant="secondary" class="filter-badge">
            <User class="w-3 h-3 mr-1" />
            {creator.label}
            <button
              onclick={() => toggleCreator(String(creatorId))}
              class="filter-badge-remove"
            >
              <X class="w-3 h-3" />
            </button>
          </Badge>
        {/if}
      {/each}

      {#each Array.from(selectedTags) as tag}
        <Badge variant="secondary" class="filter-badge">
          <Tag class="w-3 h-3 mr-1" />
          #{tag}
          <button
            onclick={() => toggleTag(String(tag))}
            class="filter-badge-remove"
          >
            <X class="w-3 h-3" />
          </button>
        </Badge>
      {/each}
    </div>
  {/if}
</div>

<style>
  .timeline-controls {
    @apply space-y-3 mb-6;
  }

  .controls-row {
    @apply flex items-center gap-3 flex-wrap;
  }

  .search-container {
    @apply flex-1 min-w-[200px];
  }

  .search-input-wrapper {
    @apply relative;
  }

  .search-icon {
    @apply absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10;
  }

  .search-input {
    @apply pl-10 pr-10 h-10;
  }

  .clear-search {
    @apply absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors;
  }

  .filter-button {
    @apply flex items-center h-10;
  }

  .filter-button.has-filters {
    @apply border-primary text-primary;
  }

  .filter-count {
    @apply text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center;
  }

  .filter-popover {
    @apply w-[28rem] max-h-[400px] overflow-y-auto;
  }

  .filter-content {
    @apply space-y-4;
  }

  .filter-header {
    @apply flex items-center justify-between;
  }

  .filter-title {
    @apply font-semibold text-sm;
  }

  .clear-filters {
    @apply text-xs text-muted-foreground hover:text-foreground transition-colors;
  }

  .filter-section {
    @apply space-y-3;
  }

  .filter-section-title {
    @apply text-sm font-medium text-muted-foreground;
  }

  .date-range-container {
    @apply space-y-2;
  }

  .date-inputs {
    @apply flex gap-2;
  }

  .date-input {
    @apply flex-1;
  }

  .clear-date-range {
    @apply text-muted-foreground hover:text-foreground transition-colors p-1 rounded;
  }

  .type-filters {
    @apply space-y-2;
  }

  .type-filter-item {
    @apply flex items-center gap-3 cursor-pointer;
  }

  .type-label {
    @apply flex items-center justify-between flex-1;
  }

  .type-name {
    @apply text-sm;
  }

  .type-count {
    @apply text-xs px-2 py-0.5;
  }

  .bulk-actions-button {
    @apply flex items-center h-10 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20;
  }

  .clear-all-button {
    @apply flex items-center gap-2 h-9;
  }

  .add-event-button {
    @apply flex items-center gap-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90;
  }

  .active-filters {
    @apply flex flex-wrap items-center gap-2;
  }

  .filter-badge {
    @apply flex items-center gap-2 pr-1;
  }

  .filter-badge-remove {
    @apply ml-1 hover:bg-background/50 rounded-full p-0.5 transition-colors;
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .controls-row {
      @apply flex-col gap-2;
    }

    .search-container {
      @apply w-full;
    }

    .filter-popover {
      @apply w-80;
    }

    .date-inputs {
      @apply flex-col;
    }
  }
</style>

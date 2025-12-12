<script lang="ts">
  import { tick } from 'svelte';
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { cn } from '$lib/utils';
  import {
    ChevronsUpDown,
    ChevronLeft,
    Check,
    Library,
    Pencil,
    Microscope,
    ChartNetwork,
    Sparkles,
    Database,
  } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';

  type SourceCategory = 'literature' | 'notes' | 'outcomes' | 'models' | 'artifacts';

  interface SourceItem {
    id: string;
    name: string;
    subtitle?: string;
  }

  interface SourceCounts {
    literature: number;
    notes: number;
    outcomes: number;
    models: number;
    artifacts: number;
    total: number;
  }

  interface SourceItems {
    literature: SourceItem[];
    notes: SourceItem[];
    outcomes: SourceItem[];
    models: SourceItem[];
    artifacts: SourceItem[];
  }

  interface Props {
    projectId: string;
    counts: SourceCounts;
    items: SourceItems;
    categories: Record<SourceCategory, boolean>;
    specificIds: Record<SourceCategory, string[]>;
    onCategoryChange: (category: SourceCategory, enabled: boolean) => void;
    onSpecificIdsChange: (category: SourceCategory, ids: string[]) => void;
    onAllSourcesToggle: () => void;
  }

  let {
    projectId,
    counts,
    items,
    categories,
    specificIds,
    onCategoryChange,
    onSpecificIdsChange,
    onAllSourcesToggle,
  }: Props = $props();

  let open = $state(false);
  let searchQuery = $state('');
  let activePanel = $state<SourceCategory | null>(null);
  let triggerRef = $state<HTMLButtonElement>(null!);

  const categoryConfig: Record<SourceCategory, { icon: any; label: string; colorClass: string }> = {
    literature: { icon: Library, label: 'Literature', colorClass: 'text-blue-500' },
    notes: { icon: Pencil, label: 'Notes', colorClass: 'text-amber-500' },
    outcomes: { icon: Microscope, label: 'Outcomes', colorClass: 'text-emerald-500' },
    models: { icon: ChartNetwork, label: 'Models', colorClass: 'text-violet-500' },
    artifacts: { icon: Sparkles, label: 'Artifacts', colorClass: 'text-rose-500' },
  };

  const categoryOrder: SourceCategory[] = ['literature', 'notes', 'outcomes', 'models', 'artifacts'];

  // Check if all categories are enabled
  let allEnabled = $derived(
    categories.literature &&
    categories.notes &&
    categories.outcomes &&
    categories.models &&
    categories.artifacts
  );

  // Count selected items (specific selections or all from enabled categories)
  let selectedCount = $derived(() => {
    let count = 0;
    for (const cat of categoryOrder) {
      if (specificIds[cat].length > 0) {
        count += specificIds[cat].length;
      } else if (categories[cat]) {
        count += counts[cat];
      }
    }
    return count;
  });

  // Check if we have any specific selections
  let hasSpecificSelections = $derived(
    Object.values(specificIds).some(arr => arr.length > 0)
  );

  // Get summary text for button
  let summaryText = $derived(() => {
    const count = selectedCount();
    if (count === 0) return 'No sources';
    if (count === counts.total && !hasSpecificSelections) return 'All sources';
    return `${count} source${count !== 1 ? 's' : ''}`;
  });

  // Filter items by search
  function filterItems(categoryItems: SourceItem[]): SourceItem[] {
    if (!searchQuery.trim()) return categoryItems;
    const query = searchQuery.toLowerCase();
    return categoryItems.filter(
      item => item.name.toLowerCase().includes(query) ||
              item.subtitle?.toLowerCase().includes(query)
    );
  }

  // Check if a specific item is selected
  function isItemSelected(category: SourceCategory, itemId: string): boolean {
    if (specificIds[category].length > 0) {
      return specificIds[category].includes(itemId);
    }
    return categories[category];
  }

  // Toggle a specific item
  function toggleItem(category: SourceCategory, itemId: string) {
    const currentIds = [...specificIds[category]];
    const idx = currentIds.indexOf(itemId);

    if (specificIds[category].length === 0 && categories[category]) {
      // Switching from "all" to specific selection - select all except this one
      const allIds = items[category].map(i => i.id).filter(id => id !== itemId);
      onSpecificIdsChange(category, allIds);
      onCategoryChange(category, false);
    } else if (idx >= 0) {
      // Remove item
      currentIds.splice(idx, 1);
      onSpecificIdsChange(category, currentIds);
    } else {
      // Add item
      currentIds.push(itemId);
      onSpecificIdsChange(category, currentIds);
    }
  }

  // Toggle entire category
  function toggleCategory(category: SourceCategory) {
    if (specificIds[category].length > 0) {
      // Clear specific selections, enable category
      onSpecificIdsChange(category, []);
      onCategoryChange(category, true);
    } else {
      // Toggle category
      onCategoryChange(category, !categories[category]);
    }
  }

  // Get the category state for display
  function getCategoryState(category: SourceCategory): 'all' | 'some' | 'none' {
    if (specificIds[category].length > 0) {
      return specificIds[category].length === counts[category] ? 'all' : 'some';
    }
    return categories[category] ? 'all' : 'none';
  }

  function closeAndFocusTrigger() {
    open = false;
    tick().then(() => {
      triggerRef?.focus();
    });
  }

  function handleBackToMain() {
    activePanel = null;
    searchQuery = '';
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger bind:ref={triggerRef}>
    <Button
      variant="outline"
      size="sm"
      role="combobox"
      aria-expanded={open}
      class="h-7 px-2 gap-1.5 text-xs font-normal"
    >
      <Database class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-muted-foreground">{summaryText()}</span>
      <ChevronsUpDown class="h-3 w-3 opacity-50" />
    </Button>
  </Popover.Trigger>

  <Popover.Content class="w-72 p-0" align="end" sideOffset={4}>
    {#if activePanel === null}
      <!-- Main Panel -->
      <Command.Root>
        <Command.Input
          placeholder="Search sources..."
          bind:value={searchQuery}
        />
        <Command.List class="max-h-72">
          <Command.Empty>
            <div class="flex flex-col items-center gap-2 py-6">
              <Database class="h-8 w-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground">No sources found</p>
            </div>
          </Command.Empty>

          <!-- All Sources Toggle -->
          <Command.Group>
            <Command.Item
              value="all-sources"
              onSelect={onAllSourcesToggle}
              class="flex items-center gap-3 cursor-pointer"
            >
              <div class={cn(
                "flex h-4 w-4 items-center justify-center rounded-sm border",
                allEnabled ? "bg-primary border-primary" : "border-muted-foreground/30"
              )}>
                {#if allEnabled}
                  <Check class="h-3 w-3 text-primary-foreground" />
                {/if}
              </div>
              <Database class="h-4 w-4 text-muted-foreground" />
              <span class="flex-1 font-medium">All Sources</span>
              <Badge variant="secondary" class="text-[10px] h-5 px-1.5">
                {counts.total}
              </Badge>
            </Command.Item>
          </Command.Group>

          <!-- Category List -->
          <Command.Group heading="Categories">
            {#each categoryOrder as category}
              {@const config = categoryConfig[category]}
              {@const Icon = config.icon}
              {@const state = getCategoryState(category)}
              {@const count = specificIds[category].length > 0
                ? specificIds[category].length
                : (categories[category] ? counts[category] : 0)}

              <Command.Item
                value={category}
                class="flex items-center gap-3 cursor-pointer group"
                onSelect={() => {
                  if (counts[category] > 0) {
                    activePanel = category;
                    searchQuery = '';
                  } else {
                    toggleCategory(category);
                  }
                }}
              >
                <button
                  type="button"
                  class="flex h-4 w-4 items-center justify-center rounded-sm border transition-colors {state === 'all' ? 'bg-primary border-primary' : state === 'some' ? 'bg-primary/50 border-primary' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}"
                  onclick={(e) => {
                    e.stopPropagation();
                    toggleCategory(category);
                  }}
                >
                  {#if state === 'all'}
                    <Check class="h-3 w-3 text-primary-foreground" />
                  {:else if state === 'some'}
                    <div class="h-1.5 w-1.5 rounded-full bg-primary-foreground"></div>
                  {/if}
                </button>
                <Icon class="h-4 w-4 {config.colorClass}" />
                <span class="flex-1">{config.label}</span>
                <Badge
                  variant={count > 0 ? "default" : "secondary"}
                  class="text-[10px] h-5 px-1.5 {count > 0 ? '' : 'opacity-50'}"
                >
                  {specificIds[category].length > 0
                    ? `${specificIds[category].length}/${counts[category]}`
                    : counts[category]}
                </Badge>
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    {:else}
      <!-- Category Detail Panel -->
      {@const currentPanel = activePanel}
      {@const config = categoryConfig[currentPanel]}
      {@const Icon = config.icon}
      {@const categoryItems = filterItems(items[currentPanel])}

      <div class="flex items-center gap-2 px-3 py-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          class="h-6 w-6 p-0"
          onclick={handleBackToMain}
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Icon class="h-4 w-4 {config.colorClass}" />
        <span class="font-medium text-sm flex-1">{config.label}</span>
        <Badge variant="outline" class="text-[10px] h-5">
          {specificIds[currentPanel].length > 0
            ? `${specificIds[currentPanel].length} selected`
            : categories[currentPanel] ? 'All' : 'None'}
        </Badge>
      </div>

      <Command.Root shouldFilter={false}>
        <Command.Input
          placeholder={`Search ${config.label.toLowerCase()}...`}
          bind:value={searchQuery}
        />
        <Command.List class="max-h-64">
          <Command.Empty>
            <div class="flex flex-col items-center gap-2 py-6">
              <Icon class="h-8 w-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground">
                {searchQuery ? 'No matching items' : `No ${config.label.toLowerCase()} available`}
              </p>
            </div>
          </Command.Empty>

          <!-- Select All Option (hide when searching) -->
          {#if !searchQuery.trim()}
            <Command.Group>
              <Command.Item
                value={`all-${currentPanel}`}
                onSelect={() => {
                  if (specificIds[currentPanel].length > 0 || !categories[currentPanel]) {
                    onSpecificIdsChange(currentPanel, []);
                    onCategoryChange(currentPanel, true);
                  } else {
                    onCategoryChange(currentPanel, false);
                  }
                }}
                class="flex items-center gap-3 cursor-pointer"
              >
                <div class={cn(
                  "flex h-4 w-4 items-center justify-center rounded-sm border",
                  categories[currentPanel] && specificIds[currentPanel].length === 0
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                )}>
                  {#if categories[currentPanel] && specificIds[currentPanel].length === 0}
                    <Check class="h-3 w-3 text-primary-foreground" />
                  {/if}
                </div>
                <span class="flex-1 font-medium">All {config.label}</span>
                <span class="text-xs text-muted-foreground">{counts[currentPanel]} items</span>
              </Command.Item>
            </Command.Group>
          {/if}

          <Command.Group heading="Items">
            {#each categoryItems as item (item.id)}
              <Command.Item
                value={`${item.id} ${item.name} ${item.subtitle || ''}`}
                onSelect={() => toggleItem(currentPanel, item.id)}
                class="flex items-center gap-3 cursor-pointer"
              >
                <div class={cn(
                  "flex h-4 w-4 items-center justify-center rounded-sm border transition-colors",
                  isItemSelected(currentPanel, item.id)
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                )}>
                  {#if isItemSelected(currentPanel, item.id)}
                    <Check class="h-3 w-3 text-primary-foreground" />
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate">{item.name}</div>
                  {#if item.subtitle}
                    <div class="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                  {/if}
                </div>
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    {/if}
  </Popover.Content>
</Popover.Root>

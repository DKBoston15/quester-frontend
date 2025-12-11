<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { ChevronDown } from 'lucide-svelte';
	import type { ToolBarIconProps } from './types.js';
	import { _ } from 'svelte-i18n';

	let { editor, toolTipProps = { delayDuration: 0, disabled: false } }: ToolBarIconProps = $props();

	const FONT_SIZE = $derived([
		{ label: $_('editor.fontSize.tiny'), value: '0.7rem' },
		{ label: $_('editor.fontSize.smaller'), value: '0.75rem' },
		{ label: $_('editor.fontSize.small'), value: '0.9rem' },
		{ label: $_('editor.fontSize.medium'), value: '' },
		{ label: $_('editor.fontSize.large'), value: '1.25rem' },
		{ label: $_('editor.fontSize.extraLarge'), value: '1.5rem' }
	]);

	let currentSize = $derived.by(() => editor.getAttributes('textStyle').fontSize || '');

	const currentLabel = $derived.by(() => {
		const l = FONT_SIZE.find((f) => f.value === currentSize);
		if (l) return l.label.split(' ')[0];
		return $_('editor.fontSize.medium');
	});
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Tooltip.Provider {...toolTipProps}>
			<Tooltip.Root>
				<Tooltip.Trigger class={buttonVariants({ variant: 'ghost', class: 'h-8 w-fit gap-1 p-1' })}>
					<span>{currentLabel}</span>
					<ChevronDown class="!size-2 text-muted-foreground" />
				</Tooltip.Trigger>
				<Tooltip.Content
					avoidCollisions
					class="border bg-background p-2 font-medium text-foreground"
				>
					<p>{$_('editor.fontSize.title')}</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="h-fit w-fit" portalProps={{ disabled: true, to: undefined }}>
		{#each FONT_SIZE as fontSize}
			<DropdownMenu.Item
				onclick={() => {
					editor.chain().focus().setFontSize(fontSize.value).run();
				}}
				style={`font-size: ${fontSize.value}`}>{fontSize.label}</DropdownMenu.Item
			>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>

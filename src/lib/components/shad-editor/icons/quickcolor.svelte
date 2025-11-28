<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { cn } from '$lib/utils.js';
	import { ChevronDown } from 'lucide-svelte';
	import type { ToolBarIconProps } from './types.js';
	import { _ } from 'svelte-i18n';

	let { editor, toolTipProps = { delayDuration: 0, disabled: false } }: ToolBarIconProps = $props();

	const colors = $derived([
		{ label: $_('editor.colors.default'), value: '' },
		{ label: $_('editor.colors.blue'), value: '#0000FF' },
		{ label: $_('editor.colors.brown'), value: '#A52A2A' },
		{ label: $_('editor.colors.green'), value: '#008000' },
		{ label: $_('editor.colors.grey'), value: '#808080' },
		{ label: $_('editor.colors.orange'), value: '#FFA500' },
		{ label: $_('editor.colors.pink'), value: '#FFC0CB' },
		{ label: $_('editor.colors.purple'), value: '#800080' },
		{ label: $_('editor.colors.red'), value: '#FF0000' },
		{ label: $_('editor.colors.yellow'), value: '#FFFF00' }
	]);

	const currentColor = $derived.by(() => editor.getAttributes('textStyle').color);
	const currentHighlight = $derived.by(() => editor.getAttributes('highlight').color);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Tooltip.Provider {...toolTipProps}>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant="ghost"
						size="sm"
						class="h-8 w-fit gap-1 p-1"
						style={`color: ${currentColor}; background-color: ${currentHighlight}30;`}
					>
						A
						<ChevronDown class="!size-2 text-muted-foreground" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content
					avoidCollisions
					class="border bg-background p-2 font-medium text-foreground"
				>
					<p>{$_('editor.quickColors')}</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content
		class="h-fit max-h-60 w-fit max-w-60 overflow-auto"
		portalProps={{ disabled: true, to: undefined }}
	>
		<span class="text-[0.75rem] font-medium text-muted-foreground">{$_('editor.textColor')}</span>
		<DropdownMenu.Group class="grid grid-cols-5 gap-2">
			{#each colors as color}
				<DropdownMenu.Item
					onclick={() => {
						if (color.value === '' || color.label === 'Default')
							editor.chain().focus().unsetColor().run();
						else
							editor
								.chain()
								.focus()
								.setColor(currentColor === color.value ? '' : color.value)
								.run();
					}}
					closeOnSelect={false}
					title={color.label}
					class={buttonVariants({
						variant: 'ghost',
						class: cn(
							'size-8 cursor-pointer bg-muted/50 p-1',
							editor.isActive('textStyle', { color: color.value }) && 'border-2 font-semibold'
						)
					})}
					style={`color: ${color.value}; background-color: ${color.value}30; border-color: ${color.value};`}
				>
					A
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
		<DropdownMenu.Separator />
		<span class="text-[0.75rem] font-medium text-muted-foreground">{$_('editor.backgroundColors')}</span>
		<DropdownMenu.Group class="grid grid-cols-5 gap-2">
			{#each colors as color}
				<DropdownMenu.Item
					class={buttonVariants({
						variant: 'ghost',
						class: cn(
							'size-8 cursor-pointer bg-muted/50 p-1',
							editor.isActive('highlight', { color: color.value }) && 'border-2 font-semibold'
						)
					})}
					style={`background-color: ${color.value}80; border-color: ${color.value};`}
					onclick={() => {
						if (color.value === '' || color.label === 'Default')
							editor.chain().focus().unsetHighlight().run();
						else editor.chain().focus().toggleHighlight({ color: color.value }).run();
					}}
					closeOnSelect={false}
					title={color.label}
				></DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<script lang="ts">
	import type { ShouldShowProps } from '$lib/shad-editor/menus/types.js';
	import { type Editor } from '@tiptap/core';
	import { BubbleMenu } from 'svelte-tiptap';
	import { ArrowDownFromLine, ArrowUpFromLine, Trash } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { isRowGripSelected } from './utils.js';
	import { _ } from 'svelte-i18n';
	interface Props {
		editor: Editor;
	}

	let { editor }: Props = $props();
</script>

<BubbleMenu
	{editor}
	pluginKey="table-row-menu"
	shouldShow={(props: ShouldShowProps) => {
		if (!props.state) {
			return false;
		}
		return isRowGripSelected({
			editor: props.editor,
			view: props.view,
			state: props.state,
			from: props.from
		});
	}}
	class="flex h-fit w-fit flex-col items-center gap-1 rounded border bg-background p-1 shadow-lg"
>
	<Button
		variant="ghost"
		class="h-8 w-full justify-start gap-2 p-1"
		onclick={() => editor.chain().focus().addRowAfter().run()}
	>
		<ArrowDownFromLine />
		<span>{$_('editor.table.addRowAfter')}</span>
	</Button>
	<Button
		variant="ghost"
		class="h-8 w-full justify-start gap-2 p-1"
		onclick={() => editor.chain().focus().addRowBefore().run()}
	>
		<ArrowUpFromLine />
		<span>{$_('editor.table.addRowBefore')}</span>
	</Button>
	<Button
		variant="ghost"
		class="h-8 w-full justify-start gap-2 p-1"
		onclick={() => editor.chain().focus().deleteRow().run()}
	>
		<Trash />
		<span>{$_('editor.table.deleteRow')}</span>
	</Button>
</BubbleMenu>

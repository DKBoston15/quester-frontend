<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import type { NodeViewProps } from '@tiptap/core';
	import { ImageIcon, X } from 'lucide-svelte';
	import { NodeViewWrapper } from 'svelte-tiptap';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { _ } from 'svelte-i18n';
	const { node, editor, selected, deleteNode, updateAttributes }: NodeViewProps = $props();
</script>

<NodeViewWrapper class="w-full">
	<Popover.Root>
		<Popover.Trigger
			class={buttonVariants({
				variant: 'outline',
				class: 'h-fit w-full bg-muted/50 p-0'
			})}
		>
			<div contenteditable="false" class="flex w-full items-center justify-start p-4">
				<ImageIcon class="mr-2" />
				<span>{$_('editor.media.image.addImage')}</span>
			</div>
		</Popover.Trigger>
		<Popover.Content class="bg-popover shadow-lg *:my-2">
			<div class="flex items-center justify-between">
				<h1 class="text-xl font-bold">{$_('editor.media.image.title')}</h1>
				<Popover.Close>
					<X class="size-4 text-muted-foreground" />
				</Popover.Close>
			</div>
			<p>{$_('editor.media.image.description')}</p>
			<Input
				placeholder={$_('editor.media.image.urlPlaceholder')}
				type="url"
				onchange={(e) => {
					if (e !== null && e.target !== null) {
						//@ts-ignore
						editor.chain().focus().setImage({ src: e.target.value }).run();
					}
				}}
				class="w-full"
			/>
			<p class="font-bold">{$_('editor.media.image.or')}</p>
			<p>{$_('editor.media.image.pickImage')}</p>
			<Input
				id="picture"
				type="file"
				accept="image/*"
				multiple={false}
				onchange={(e: Event) => {
					//@ts-ignore
					if (e.target && e.target.files) {
						//@ts-ignore
						const files = Array.from(e.target.files || []);
						files.map((file) => {
							const reader = new FileReader();
							reader.onload = () => {
								const src = reader.result as string;
								editor.chain().focus().setImage({ src }).run();
							};
							//@ts-ignore
							reader.readAsDataURL(file);
						});
					}
				}}
			/>
		</Popover.Content>
	</Popover.Root>
</NodeViewWrapper>

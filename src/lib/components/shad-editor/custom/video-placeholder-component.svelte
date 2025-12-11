<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import type { NodeViewProps } from '@tiptap/core';
	import { Video, X } from 'lucide-svelte';
	import { NodeViewWrapper } from 'svelte-tiptap';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { _ } from 'svelte-i18n';
	const { node, editor, selected, deleteNode, updateAttributes }: NodeViewProps = $props();

	/**
	 * Stores the video url
	 */
	let src = $state('');
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
				<Video class="mr-2" />
				<span>{$_('editor.media.video.insertVideo')}</span>
			</div>
		</Popover.Trigger>
		<Popover.Content class="bg-popover shadow-lg *:my-2">
			<div class="flex items-center justify-between">
				<h1 class="text-xl font-bold">{$_('editor.media.video.title')}</h1>
				<Popover.Close>
					<X class="size-4 text-muted-foreground" />
				</Popover.Close>
			</div>
			<p>{$_('editor.media.video.description')}</p>
			<Input placeholder={$_('editor.media.video.urlPlaceholder')} type="url" bind:value={src} class="w-full" />
			<p class="font-bold">{$_('editor.media.video.or')}</p>
			<p>{$_('editor.media.video.pickVideo')}</p>
			<Input
				id="picture"
				type="file"
				accept="video/*"
				multiple={false}
				onchange={(e: Event) => {
					//@ts-ignore
					if (e.target && e.target.files) {
						//@ts-ignore
						const files = Array.from(e.target.files || []);
						files.map((file) => {
							const reader = new FileReader();
							reader.onload = () => {
								src = reader.result as string;
							};
							//@ts-ignore
							reader.readAsDataURL(file);
						});
					}
				}}
			/>
			{#if src.trim() !== ''}
				<video {src} controls class="h-fit w-fit">
					<track kind="captions" />
				</video>
				<Button onclick={() => editor.chain().focus().setVideo(src).run()}>{$_('editor.media.video.addVideo')}</Button>
			{/if}
		</Popover.Content>
	</Popover.Root>
</NodeViewWrapper>

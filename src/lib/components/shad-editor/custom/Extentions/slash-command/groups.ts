import type { Group } from './types.js';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';

const t = (key: string) => get(_)(key);

export const GROUPS: Group[] = [
	{
		name: 'format',
		title: t('editor.slashCommands.groups.format'),
		commands: [
			{
				name: 'heading1',
				label: t('editor.slashCommands.heading1.label'),
				iconName: 'Heading1',
				description: t('editor.slashCommands.heading1.description'),
				aliases: ['h1'],
				action: (editor) => {
					editor.chain().focus().setHeading({ level: 1 }).run();
				}
			},
			{
				name: 'heading2',
				label: t('editor.slashCommands.heading2.label'),
				iconName: 'Heading2',
				description: t('editor.slashCommands.heading2.description'),
				aliases: ['h2'],
				action: (editor) => {
					editor.chain().focus().setHeading({ level: 2 }).run();
				}
			},
			{
				name: 'heading3',
				label: t('editor.slashCommands.heading3.label'),
				iconName: 'Heading3',
				description: t('editor.slashCommands.heading3.description'),
				aliases: ['h3'],
				action: (editor) => {
					editor.chain().focus().setHeading({ level: 3 }).run();
				}
			},
			{
				name: 'bulletList',
				label: t('editor.slashCommands.bulletList.label'),
				iconName: 'List',
				description: t('editor.slashCommands.bulletList.description'),
				aliases: ['ul'],
				action: (editor) => {
					editor.chain().focus().toggleBulletList().run();
				}
			},
			{
				name: 'numberedList',
				label: t('editor.slashCommands.numberedList.label'),
				iconName: 'ListOrdered',
				description: t('editor.slashCommands.numberedList.description'),
				aliases: ['ol'],
				action: (editor) => {
					editor.chain().focus().toggleOrderedList().run();
				}
			},
			{
				name: 'taskList',
				label: t('editor.slashCommands.taskList.label'),
				iconName: 'ListTodo',
				description: t('editor.slashCommands.taskList.description'),
				aliases: ['todo'],
				action: (editor) => {
					editor.chain().focus().toggleTaskList().run();
				}
			},

			{
				name: 'blockquote',
				label: t('editor.slashCommands.blockquote.label'),
				iconName: 'Quote',
				description: t('editor.slashCommands.blockquote.description'),
				action: (editor) => {
					editor.chain().focus().setBlockquote().run();
				}
			},
			{
				name: 'codeBlock',
				label: t('editor.slashCommands.codeBlock.label'),
				iconName: 'SquareCode',
				description: t('editor.slashCommands.codeBlock.description'),
				shouldBeHidden: (editor) => editor.isActive('columns'),
				action: (editor) => {
					editor.chain().focus().setCodeBlock().run();
				}
			}
		]
	},
	{
		name: 'insert',
		title: t('editor.slashCommands.groups.insert'),
		commands: [
			{
				name: 'image-placeholder',
				label: t('editor.slashCommands.image.label'),
				iconName: 'Image',
				description: t('editor.slashCommands.image.description'),
				action: (editor) => {
					editor.chain().focus().insertImagePlaceholder().run();
				}
			},

			{
				name: 'video-placeholder',
				label: t('editor.slashCommands.video.label'),
				iconName: 'Video',
				description: t('editor.slashCommands.video.description'),
				action: (editor) => {
					editor.chain().focus().insertVideoPlaceholder().run();
				}
			},

			{
				name: 'audio-placeholder',
				label: t('editor.slashCommands.audio.label'),
				iconName: 'AudioLines',
				description: t('editor.slashCommands.audio.description'),
				action: (editor) => {
					editor.chain().focus().insertAudioPlaceholder().run();
				}
			},

			{
				name: 'table',
				label: t('editor.slashCommands.table.label'),
				iconName: 'Table',
				description: t('editor.slashCommands.table.description'),
				shouldBeHidden: (editor) => editor.isActive('columns'),
				action: (editor) => {
					editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
				}
			},

			{
				name: 'horizontalRule',
				label: t('editor.slashCommands.horizontalRule.label'),
				iconName: 'Minus',
				description: t('editor.slashCommands.horizontalRule.description'),
				aliases: ['hr'],
				action: (editor) => {
					editor.chain().focus().setHorizontalRule().run();
				}
			}
		]
	}
];

export default GROUPS;

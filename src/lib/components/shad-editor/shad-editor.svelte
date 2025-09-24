<script lang="ts">
  import "./editor.css";

  import { Editor, type Content } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import { onDestroy, onMount, createEventDispatcher } from "svelte";
  import EditorToolbar from "./editor-toolbar.svelte";
  import { cn } from "$lib/utils.js";

  import { Subscript } from "@tiptap/extension-subscript";
  import { Superscript } from "@tiptap/extension-superscript";
  import { Underline } from "@tiptap/extension-underline";
  import { Link } from "@tiptap/extension-link";
  import TaskList from "@tiptap/extension-task-list";
  import TaskItem from "@tiptap/extension-task-item";
  import TextStyle from "@tiptap/extension-text-style";
  import Color from "@tiptap/extension-color";
  import Highlight from "@tiptap/extension-highlight";
  import Text from "@tiptap/extension-text";
  import Typography from "@tiptap/extension-typography";
  import TextAlign from "@tiptap/extension-text-align";
  import { MathExtension } from "@aarkue/tiptap-math-extension";
  import { Markdown } from "tiptap-markdown";

  import "katex/dist/katex.min.css";

  import { SmilieReplacer } from "./custom/Extentions/SmilieReplacer.js";
  import { ColorHighlighter } from "./custom/Extentions/ColorHighlighter.js";
  import { ImageExtension } from "./custom/Extentions/ImageExtention.js";
  import { SvelteNodeViewRenderer } from "svelte-tiptap";
  import CodeExtended from "./custom/code-extended.svelte";

  // Lowlight
  import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
  import { all, createLowlight } from "lowlight";
  import "./onedark.css";
  import SearchAndReplace from "./custom/Extentions/SearchAndReplace.js";
  import { ImagePlaceholder } from "./custom/Extentions/ImagePlaceHolder.js";
  import Placeholder from "@tiptap/extension-placeholder";
  import AutoJoiner from "tiptap-extension-auto-joiner";
  import GlobalDragHandle from "tiptap-extension-global-drag-handle";
  import { VideoExtention } from "./custom/Extentions/VideoExtended.js";
  import { VideoPlaceholder } from "./custom/Extentions/VideoPlaceHolder.js";
  import LinkBubbleMenu from "./menus/link-bubble-menu.svelte";
  import {
    Table,
    TableCell,
    TableHeader,
    TableRow,
  } from "./custom/Extentions/table/index.js";
  import TableColumnMenu from "./custom/Extentions/table/menu/table-col-menu.svelte";
  import TableRowMenu from "./custom/Extentions/table/menu/table-row-menu.svelte";
  import { getHandlePaste } from "./custom/utils.js";
  import SlashCommand from "./custom/Extentions/slash-command/slashcommand.js";
  import FontSize from "./custom/Extentions/FontSize.js";
  import { AudioPlaceholder } from "./custom/Extentions/AudioPlaceHolder.js";
  import { AudioExtention } from "./custom/Extentions/AudioExtended.js";
  import BubbleMenu from "./menus/bubble-menu.svelte";
  import { ParagraphIndent } from "./custom/Extentions/ParagraphIndent";
  import TrailingNode from "./custom/Extentions/TrailingNode";
  // Tab handling is implemented via editorProps.handleKeyDown below

  const lowlight = createLowlight(all);

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    contentChange: Content;
  }>();

  interface Props {
    class?: string;
    content: Content;
    showToolbar?: boolean;
    placeholder?: string;
  }

  let {
    class: className = "",
    content = $bindable({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    }),
    showToolbar = true,
    placeholder = "Start writing...",
  }: Props = $props();

  // Use $state for element but not for editor
  let editor = $state<Editor | null>(null);
  let element = $state<HTMLElement>();

  onMount(() => {
    editor = new Editor({
      element,
      content,
      editorProps: {
        attributes: {
          class:
            "m-auto p-2 px-6 focus:outline-none flex-1 prose text-foreground min-w-full max-h-full overflow-auto dark:prose-invert *:my-2",
        },
        handleKeyDown: (view, event) => {
          const key = event.key;

          // Tab handling
          if (key === "Tab") {
            const { selection } = view.state as any;
            const fromPos = selection.$from;

            let inListItem = false;
            let inList = false;
            let inCodeBlock = false;
            let inTable = false;

            for (let i = fromPos.depth; i >= 0; i--) {
              const node = fromPos.node(i);
              const name = node.type.name;
              if (name === "listItem") inListItem = true;
              if (name === "orderedList" || name === "bulletList") inList = true;
              if (name === "codeBlock") inCodeBlock = true;
              if (name === "table" || name === "tableCell" || name === "tableHeader") inTable = true;
              if (inListItem && inList) break;
            }

            event.preventDefault();
            event.stopPropagation();

            // Table cell navigation: Tab -> next cell, Shift+Tab -> previous cell
            if (inTable) {
              if ((event as KeyboardEvent).shiftKey) {
                editor?.commands.goToPreviousCell?.();
              } else {
                editor?.commands.goToNextCell?.();
              }
              return true;
            }

            if (inListItem && inList) {
              if ((event as KeyboardEvent).shiftKey) {
                editor?.commands.liftListItem("listItem");
              } else {
                editor?.commands.sinkListItem("listItem");
              }
              return true;
            }

            if (inCodeBlock) {
              editor?.chain().focus().insertContent("\t").run();
              return true;
            }

            // For non-list paragraphs: increase or decrease paragraph indent
            if ((event as KeyboardEvent).shiftKey) {
              editor?.commands.decreaseIndent();
            } else {
              editor?.commands.increaseIndent();
            }
            return true;
          }

          // Backspace handling on empty, indented paragraph: decrease indent instead of deleting line
          if (key === "Backspace") {
            const { selection } = view.state as any;
            if (!selection.empty) return false;
            const fromPos = selection.$from;
            const parent = fromPos.parent;
            const atStart = fromPos.parentOffset === 0;
            const isParagraph = parent.type?.name === "paragraph";
            const isEmpty = parent.content?.size === 0;
            const indentLevel = Number(parent.attrs?.indent || 0);

            if (isParagraph && isEmpty && atStart && indentLevel > 0) {
              event.preventDefault();
              event.stopPropagation();
              editor?.commands.decreaseIndent();
              return true;
            }

            return false;
          }

          return false;
        },
      },
      extensions: [
        StarterKit.configure({
          orderedList: {
            HTMLAttributes: {
              class: "hierarchical-ordered-list",
            },
          },
          bulletList: {
            HTMLAttributes: {
              class: "list-disc",
            },
          },
          heading: {
            levels: [1, 2, 3, 4],
            HTMLAttributes: {
              class: "tiptap-heading",
            },
          },
          codeBlock: false,
          text: false,
        }),
        Placeholder.configure({
          emptyEditorClass: "is-empty",
          placeholder: ({ node }) => {
            if (node.type.name === "heading") {
              return "What's the title?";
            } else if (node.type.name === "paragraph") {
              return "Press / or write something ...";
            }
            return "";
          },
        }),
        AutoJoiner,
        GlobalDragHandle.configure({
          excludedTags: ["pre", "code", "table p"],
        }),
        Typography,
        Text,
        TextStyle,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Color,
        Highlight.configure({ multicolor: true }),
        Underline,
        Superscript,
        Subscript,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer",
          },
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        SearchAndReplace,
        CodeBlockLowlight.configure({
          lowlight,
        }).extend({
          addNodeView() {
            return SvelteNodeViewRenderer(CodeExtended);
          },
        }),
        SmilieReplacer,
        ColorHighlighter,
        Table,
        TableCell,
        TableRow,
        TableHeader,
        ImageExtension.configure({
          allowBase64: true,
        }),
        ImagePlaceholder,
        MathExtension.configure({ evaluation: true }),
        Markdown,
        VideoExtention,
        VideoPlaceholder,
        SlashCommand,
        FontSize,
        AudioPlaceholder,
        AudioExtention,
        ParagraphIndent.configure({
          types: ['paragraph'],
          maxIndent: 8,
          indentStep: 1,
          indentUnit: '2em',
        }),
        // Ensure there is always a paragraph after block nodes like tables
        TrailingNode,
      ],
      autofocus: true,
      onUpdate: (transaction) => {
        const newContent = transaction.editor.getJSON();
        content = newContent;
        dispatch("contentChange", newContent);
      },
    });

    // Preserve existing editorProps (including handleKeyDown/attributes) when adding handlePaste
    editor.setOptions({
      editorProps: {
        ...(editor.options.editorProps || {}),
        handlePaste: getHandlePaste(editor),
      },
    });
  });

  onDestroy(() => {
    if (editor) editor.destroy();
  });
</script>

<div class={cn("flex flex-col rounded border", className)}>
  {#if editor && showToolbar}
    <EditorToolbar {editor} />
    <LinkBubbleMenu {editor} />
    <BubbleMenu {editor} />
    <TableColumnMenu {editor} />
    <TableRowMenu {editor} />
  {/if}

  <div
    bind:this={element}
    spellcheck="false"
    class="h-full w-full flex-1 overflow-y-scroll"
  ></div>
</div>

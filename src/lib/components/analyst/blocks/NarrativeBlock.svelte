<script lang="ts">
  import MarkdownIt from "markdown-it";
  import DOMPurify from "dompurify";

  interface Props {
    content: string;
    streaming?: boolean;
  }

  const { content, streaming = false }: Props = $props();

  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true,
  });

  let rendered = $derived(DOMPurify.sanitize(md.render(content)));
</script>

<div class="prose prose-sm dark:prose-invert max-w-none prose-narrative">
  {@html rendered}
  {#if streaming}
    <span class="inline-block w-2 h-4 bg-current animate-pulse ml-0.5 align-middle rounded-sm"></span>
  {/if}
</div>

<style>
  .prose-narrative :global(p:last-child) {
    margin-bottom: 0;
  }
  .prose-narrative :global(p:first-child) {
    margin-top: 0;
  }
</style>

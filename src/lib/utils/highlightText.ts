/**
 * Wraps matching substrings in <mark> tags for search highlighting.
 * Escapes HTML entities in the input text to prevent XSS.
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query.trim());
  const regex = new RegExp(
    `(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );

  return escaped.replace(
    regex,
    '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">$1</mark>',
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

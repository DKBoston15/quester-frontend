import type { Note } from "$lib/types";

type NoteSearchable = Pick<Note, "name" | "content" | "section_type" | "updated_at">;

const IGNORED_OBJECT_KEYS = new Set([
  "type",
  "marks",
  "id",
  "href",
  "src",
  "class",
  "style",
  "target",
  "rel",
]);

function stripHtml(value: string): string {
  if (!value) return "";

  if (typeof document !== "undefined") {
    const element = document.createElement("div");
    element.innerHTML = value;
    return element.textContent || element.innerText || "";
  }

  return value.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collectText(value: unknown, segments: string[], visited: WeakSet<object>) {
  if (value == null) return;

  if (typeof value === "string") {
    const normalized = normalizeWhitespace(stripHtml(value));
    if (normalized) {
      segments.push(normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectText(entry, segments, visited));
    return;
  }

  if (typeof value !== "object") return;

  if (visited.has(value)) return;
  visited.add(value);

  const record = value as Record<string, unknown>;

  if (typeof record.text === "string") {
    const normalized = normalizeWhitespace(stripHtml(record.text));
    if (normalized) {
      segments.push(normalized);
    }
  }

  if (record.content !== undefined) {
    collectText(record.content, segments, visited);
  }

  if (record.attrs && typeof record.attrs === "object") {
    const attrs = record.attrs as Record<string, unknown>;
    for (const key of ["alt", "title", "caption", "label"]) {
      if (typeof attrs[key] === "string") {
        const normalized = normalizeWhitespace(stripHtml(attrs[key] as string));
        if (normalized) {
          segments.push(normalized);
        }
      }
    }
  }

  for (const [key, child] of Object.entries(record)) {
    if (key === "text" || key === "content" || key === "attrs" || IGNORED_OBJECT_KEYS.has(key)) {
      continue;
    }

    collectText(child, segments, visited);
  }
}

export function extractNoteContentText(content: unknown): string {
  if (!content) return "";

  if (typeof content === "string") {
    try {
      return extractNoteContentText(JSON.parse(content));
    } catch {
      return normalizeWhitespace(stripHtml(content));
    }
  }

  const segments: string[] = [];
  collectText(content, segments, new WeakSet<object>());

  return normalizeWhitespace(segments.join(" "));
}

export function formatNoteFriendlyDate(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function getNoteSectionSearchText(
  sectionType: Note["section_type"] | null | undefined,
  fallbackLabel: string = "Other"
): string {
  if (!sectionType) return fallbackLabel;

  if (typeof sectionType === "object") {
    return [sectionType.value, sectionType.label]
      .filter((value): value is string => Boolean(value))
      .join(" ");
  }

  return sectionType;
}

export function noteMatchesQuery(
  note: NoteSearchable,
  query: string,
  fallbackSectionLabel: string = "Other"
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const searchableSegments = [
    note.name || "",
    extractNoteContentText(note.content),
    getNoteSectionSearchText(note.section_type, fallbackSectionLabel),
    note.updated_at ? formatNoteFriendlyDate(new Date(note.updated_at)) : "",
  ];

  return searchableSegments.some((segment) =>
    segment.toLowerCase().includes(normalizedQuery)
  );
}

export function getNotePreview(content: unknown, maxLength: number = 100): string {
  const plainText = extractNoteContentText(content);
  if (!plainText) return "";

  return plainText.length > maxLength
    ? `${plainText.slice(0, maxLength)}...`
    : plainText;
}

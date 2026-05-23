const ACRONYM_MAX_LENGTH = 5;

const isAcronym = (word: string): boolean => {
  return (
    word.length >= 2 &&
    word.length <= ACRONYM_MAX_LENGTH &&
    word === word.toUpperCase()
  );
};

export const normalizeKeyword = (raw: unknown): string => {
  if (typeof raw !== "string") return "";

  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (!collapsed) return "";

  const words = collapsed.split(" ");

  const normalized = words.map((word) =>
    isAcronym(word) ? word : word.toLowerCase()
  );

  const first = normalized[0];
  if (first && !isAcronym(first)) {
    normalized[0] = first.charAt(0).toUpperCase() + first.slice(1);
  }

  return normalized.join(" ");
};

export const dedupeKeywords = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of list) {
    const normalized = normalizeKeyword(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
};

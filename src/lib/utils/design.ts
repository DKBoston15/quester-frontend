export interface DesignDetail {
  selections: string[]
  description?: string | null
}

export const createEmptyDesignDetail = (): DesignDetail => ({
  selections: [],
  description: null,
})

function uniqueStrings(values: string[]): string[] {
  const seen = new Map<string, string>();
  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, trimmed);
    }
  });
  return Array.from(seen.values());
}

function normalizeDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeDesignDetail(input: unknown): DesignDetail {
  if (input === undefined || input === null) {
    return createEmptyDesignDetail()
  }

  if (typeof input === 'string') {
    const trimmed = input.trim()

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        return normalizeDesignDetail(parsed)
      } catch {
        // fall through and treat as plain string if parsing fails
      }
    }

    return {
      selections: uniqueStrings([trimmed]),
      description: null,
    }
  }

  if (Array.isArray(input)) {
    return {
      selections: uniqueStrings(
        (input as unknown[]).map((value) => {
          if (typeof value === 'string') return value
          if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
            return String((value as Record<string, unknown>).name ?? '')
          }
          return typeof value === 'number' ? String(value) : ''
        })
      ),
      description: null,
    }
  }

  if (typeof input === 'object') {
    const maybeDetail = input as Partial<DesignDetail> & { selections?: unknown }
    const sourceSelections = Array.isArray(maybeDetail.selections)
      ? maybeDetail.selections
      : []

    return {
      selections: uniqueStrings(
        (sourceSelections as unknown[]).map((value) => {
          if (typeof value === 'string') return value
          if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
            return String((value as Record<string, unknown>).name ?? '')
          }
          return typeof value === 'number' ? String(value) : ''
        })
      ),
      description: normalizeDescription(maybeDetail.description ?? null),
    }
  }

  return createEmptyDesignDetail()
}

export function designSelections(detail: DesignDetail | null | undefined): string[] {
  if (!detail?.selections) return []
  return detail.selections
}

export function designDescription(detail: DesignDetail | null | undefined): string | null {
  if (!detail) return null
  return detail.description ?? null
}

export function hasDesignContent(detail: DesignDetail | null | undefined): boolean {
  const selections = designSelections(detail)
  const description = designDescription(detail)
  return selections.length > 0 || (description !== null && description.trim().length > 0)
}

export function designToSummaryString(detail: DesignDetail | null | undefined): string {
  const selections = designSelections(detail)
  const description = designDescription(detail)

  const parts: string[] = []
  if (selections.length > 0) {
    parts.push(selections.join(', '))
  }
  if (description) {
    parts.push(description)
  }
  return parts.join(' — ')
}

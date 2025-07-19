import type { Literature } from "$lib/types/literature";
import { literatureToCitation } from "./citationFormatters";

export interface BibliographyOptions {
  sortBy?: "author" | "year" | "title";
  sortOrder?: "asc" | "desc";
  groupByType?: boolean;
}

export function sortLiterature(
  literature: Literature[],
  options: BibliographyOptions = {}
): Literature[] {
  if (!literature || !Array.isArray(literature)) {
    return [];
  }
  
  const { sortBy = "author", sortOrder = "asc" } = options;
  
  const sorted = [...literature].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case "author": {
        const aAuthors = literatureToCitation(a).authors;
        const bAuthors = literatureToCitation(b).authors;
        const aFirstAuthor = aAuthors[0] || "";
        const bFirstAuthor = bAuthors[0] || "";
        compareValue = aFirstAuthor.localeCompare(bFirstAuthor);
        break;
      }
      case "year": {
        const aYear = a.publishYear || "9999";
        const bYear = b.publishYear || "9999";
        compareValue = aYear.localeCompare(bYear);
        break;
      }
      case "title": {
        const aTitle = a.name || "";
        const bTitle = b.name || "";
        compareValue = aTitle.localeCompare(bTitle);
        break;
      }
    }
    
    return sortOrder === "asc" ? compareValue : -compareValue;
  });
  
  return sorted;
}

export function groupLiteratureByType(literature: Literature[]): Map<string, Literature[]> {
  const grouped = new Map<string, Literature[]>();
  
  literature.forEach((item) => {
    // Handle type field - it might be a string or an object with { label, value }
    let typeValue = "Other";
    if (typeof item.type === "string") {
      typeValue = item.type || "Other";
    } else if (item.type && typeof item.type === "object" && "value" in item.type) {
      typeValue = (item.type as any).value || "Other";
    }

    if (!grouped.has(typeValue)) {
      grouped.set(typeValue, []);
    }
    grouped.get(typeValue)!.push(item);
  });
  
  return grouped;
}

export function compileBibliography(
  literature: Literature[],
  options: BibliographyOptions = {}
): Literature[] {
  if (!literature || !Array.isArray(literature)) {
    return [];
  }
  
  let compiled = [...literature];
  
  // Sort the literature
  compiled = sortLiterature(compiled, options);
  
  // If grouping by type is requested, we'll return a flat array but sorted within groups
  if (options.groupByType) {
    const grouped = groupLiteratureByType(compiled);
    compiled = [];
    
    // Define a preferred order for types
    const typeOrder = [
      "Book",
      "Book Chapter",
      "Journal Article",
      "Conference Presentation",
      "Conference Proceedings",
      "Dissertation",
      "Literature Review",
      "Magazine Article",
      "Gray Literature",
      "Other"
    ];
    
    // Add items in preferred type order
    typeOrder.forEach((type) => {
      if (grouped.has(type)) {
        compiled.push(...grouped.get(type)!);
      }
    });
    
    // Add any remaining types not in the preferred order
    grouped.forEach((items, type) => {
      if (!typeOrder.includes(type)) {
        compiled.push(...items);
      }
    });
  }
  
  return compiled;
}

export function estimatePageCount(
  literatureCount: number,
  averageLinesPerReference: number = 3,
  linesPerPage: number = 25
): number {
  const totalLines = literatureCount * averageLinesPerReference;
  return Math.ceil(totalLines / linesPerPage);
}

export function filterLiteratureBySelection(
  literature: Literature[],
  selectedIds: Set<string>
): Literature[] {
  if (!literature || !Array.isArray(literature)) {
    return [];
  }
  return literature.filter((item) => item && item.id && selectedIds.has(item.id));
}
import type { Literature } from '$lib/types/literature';
import { compileBibliography } from '../bibliographyUtils';

interface RISExportOptions {
  literature: Literature[];
}

// Map literature types to RIS types
const typeToRIS: Record<string, string> = {
  'Journal Article': 'JOUR',
  'Book': 'BOOK',
  'Book Chapter': 'CHAP',
  'Conference Presentation': 'CONF',
  'Conference Proceedings': 'CONF',
  'Dissertation': 'THES',
  'Literature Review': 'JOUR',
  'Magazine Article': 'MGZN',
  'Gray Literature': 'GEN',
  'Other': 'GEN'
};

function formatRISAuthors(authors: string[]): string[] {
  if (!authors || authors.length === 0) return [];
  
  return authors.map(author => {
    const parts = author.split(', ');
    if (parts.length === 2) {
      // Format: Last, First -> Last, First
      return `AU  - ${parts[0]}, ${parts[1]}`;
    }
    return `AU  - ${author}`;
  });
}

function formatRISEditors(editors: string[]): string[] {
  if (!editors || editors.length === 0) return [];
  
  return editors.map(editor => {
    const parts = editor.split(', ');
    if (parts.length === 2) {
      return `ED  - ${parts[0]}, ${parts[1]}`;
    }
    return `ED  - ${editor}`;
  });
}

function formatRISKeywords(keywords: any[]): string[] {
  if (!keywords || keywords.length === 0) return [];
  
  return keywords
    .map(k => typeof k === 'string' ? k : k.name || '')
    .filter(k => k)
    .map(k => `KW  - ${k}`);
}

export function generateRIS(options: RISExportOptions): string {
  const { literature } = options;
  
  if (!literature || literature.length === 0) {
    throw new Error('No literature provided for RIS generation');
  }

  // Compile and sort literature
  const compiledLiterature = compileBibliography(literature, { sortBy: "author", sortOrder: "asc" });
  
  const entries: string[] = [];

  compiledLiterature.forEach((item, index) => {
    const lines: string[] = [];
    
    // Entry type
    const risType = typeToRIS[item.type || 'Other'] || 'GEN';
    lines.push(`TY  - ${risType}`);

    // ID (use index + 1 for simplicity)
    lines.push(`ID  - ${index + 1}`);

    // Title
    if (item.name) {
      lines.push(`TI  - ${item.name}`);
    }

    // Authors
    if (item.authors && item.authors.length > 0) {
      lines.push(...formatRISAuthors(item.authors));
    }

    // Year
    if (item.publishYear) {
      lines.push(`PY  - ${item.publishYear}`);
    }

    // Type-specific fields
    switch (risType) {
      case 'JOUR': // Journal article
        if (item.publisherName) {
          lines.push(`JO  - ${item.publisherName}`);
          lines.push(`JF  - ${item.publisherName}`); // Full journal name
        }
        if (item.volume) {
          lines.push(`VL  - ${item.volume}`);
        }
        if (item.issue) {
          lines.push(`IS  - ${item.issue}`);
        }
        if (item.startPage) {
          lines.push(`SP  - ${item.startPage}`);
        }
        if (item.endPage) {
          lines.push(`EP  - ${item.endPage}`);
        }
        break;

      case 'BOOK':
        if (item.publisherName) {
          lines.push(`PB  - ${item.publisherName}`);
        }
        if (item.city) {
          lines.push(`CY  - ${item.city}`);
        }
        if (item.editors && item.editors.length > 0) {
          lines.push(...formatRISEditors(item.editors));
        }
        break;

      case 'CHAP': // Book chapter
        if (item.secondName) {
          lines.push(`T2  - ${item.secondName}`); // Book title
          lines.push(`BT  - ${item.secondName}`);
        }
        if (item.editors && item.editors.length > 0) {
          lines.push(...formatRISEditors(item.editors));
        }
        if (item.publisherName) {
          lines.push(`PB  - ${item.publisherName}`);
        }
        if (item.city) {
          lines.push(`CY  - ${item.city}`);
        }
        if (item.startPage) {
          lines.push(`SP  - ${item.startPage}`);
        }
        if (item.endPage) {
          lines.push(`EP  - ${item.endPage}`);
        }
        break;

      case 'CONF': // Conference
        if (item.publisherName) {
          lines.push(`T2  - ${item.publisherName}`); // Conference name
          lines.push(`C1  - ${item.publisherName}`);
        }
        if (item.city) {
          lines.push(`CY  - ${item.city}`);
        }
        if (item.startDate) {
          const date = new Date(item.startDate);
          lines.push(`DA  - ${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`);
        }
        break;

      case 'THES': // Thesis/Dissertation
        if (item.publisherName) {
          lines.push(`PB  - ${item.publisherName}`); // University
        }
        if (item.city) {
          lines.push(`CY  - ${item.city}`);
        }
        lines.push('M3  - Doctoral dissertation');
        break;

      case 'MGZN': // Magazine
        if (item.publisherName) {
          lines.push(`JO  - ${item.publisherName}`);
          lines.push(`JF  - ${item.publisherName}`);
        }
        if (item.startDate) {
          const date = new Date(item.startDate);
          lines.push(`DA  - ${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`);
        }
        if (item.startPage) {
          lines.push(`SP  - ${item.startPage}`);
        }
        if (item.endPage) {
          lines.push(`EP  - ${item.endPage}`);
        }
        break;
    }

    // Abstract
    if (item.abstract) {
      const cleanAbstract = item.abstract.replace(/\n/g, ' ').trim();
      if (cleanAbstract) {
        lines.push(`AB  - ${cleanAbstract}`);
      }
    }

    // Keywords
    if (item.keywords && item.keywords.length > 0) {
      lines.push(...formatRISKeywords(item.keywords));
    }

    // DOI
    if (item.doi) {
      lines.push(`DO  - ${item.doi}`);
    }

    // URL
    if (item.link) {
      lines.push(`UR  - ${item.link}`);
    }

    // Notes (use for additional info)
    const notes: string[] = [];
    if (item.type && !typeToRIS[item.type]) {
      notes.push(`Type: ${item.type}`);
    }
    if (notes.length > 0) {
      lines.push(`N1  - ${notes.join('; ')}`);
    }

    // End of record
    lines.push('ER  - ');

    entries.push(lines.join('\n'));
  });

  return entries.join('\n\n');
}

export async function exportToRIS(options: RISExportOptions): Promise<void> {
  try {
    if (!options.literature || options.literature.length === 0) {
      throw new Error('No literature selected for export');
    }

    const risContent = generateRIS(options);
    
    // Create blob with proper encoding
    const blob = new Blob([risContent], { type: 'application/x-research-info-systems;charset=utf-8' });
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `bibliography_${timestamp}.ris`;
    
    // Download file
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('RIS export failed:', error);
    throw new Error(`Failed to generate RIS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
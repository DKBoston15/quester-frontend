import type { Literature } from '$lib/types/literature';
import { compileBibliography } from '../bibliographyUtils';

interface BibTeXExportOptions {
  literature: Literature[];
}

// Map literature types to BibTeX entry types
const typeToBibTeX: Record<string, string> = {
  'Journal Article': 'article',
  'Book': 'book',
  'Book Chapter': 'incollection',
  'Conference Presentation': 'inproceedings',
  'Conference Proceedings': 'proceedings',
  'Dissertation': 'phdthesis',
  'Literature Review': 'article',
  'Magazine Article': 'article',
  'Gray Literature': 'misc',
  'Other': 'misc'
};

function sanitizeBibTeXKey(name: string, year: string): string {
  // Create a key from author name and year
  const safeName = name
    .split(',')[0] // Get last name
    .replace(/[^a-zA-Z]/g, '') // Remove non-letters
    .toLowerCase()
    .slice(0, 20); // Limit length
  
  return `${safeName}${year}`;
}

function escapeLatex(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, match => `\\${match}`)
    .replace(/[#$%&_]/g, match => `\\${match}`)
    .replace(/[~^]/g, match => `\\${match}{}`)
    .replace(/[<>]/g, match => `$${match}$`);
}

function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  
  return authors
    .map(author => {
      const parts = author.split(', ');
      if (parts.length === 2) {
        return `${parts[0]}, ${parts[1]}`;
      }
      return author;
    })
    .join(' and ');
}

function formatEditors(editors: string[]): string {
  if (!editors || editors.length === 0) return '';
  
  return formatAuthors(editors);
}

export function generateBibTeX(options: BibTeXExportOptions): string {
  const { literature } = options;
  
  if (!literature || literature.length === 0) {
    throw new Error('No literature provided for BibTeX generation');
  }

  // Compile and sort literature
  const compiledLiterature = compileBibliography(literature, { sortBy: "author", sortOrder: "asc" });
  
  const entries: string[] = [];
  const usedKeys = new Set<string>();

  compiledLiterature.forEach((item, index) => {
    // Determine entry type
    const entryType = typeToBibTeX[item.type || 'Other'] || 'misc';
    
    // Generate unique key
    let baseKey = sanitizeBibTeXKey(
      item.authors?.[0] || item.name || 'unknown',
      item.publishYear || new Date().getFullYear().toString()
    );
    
    let key = baseKey;
    let counter = 1;
    while (usedKeys.has(key)) {
      key = `${baseKey}${String.fromCharCode(96 + counter)}`;
      counter++;
    }
    usedKeys.add(key);

    // Build entry fields
    const fields: string[] = [];

    // Common fields (title depends on type)
    if (entryType === 'incollection') {
      // For book chapters, the BibTeX title is the chapter title
      const chapterTitle = (item as any).chapterTitle || '';
      if (chapterTitle) {
        fields.push(`  title = {${escapeLatex(chapterTitle)}}`);
      } else if (item.name) {
        // Fallback to name if chapterTitle missing
        fields.push(`  title = {${escapeLatex(item.name)}}`);
      }
    } else if (item.name) {
      fields.push(`  title = {${escapeLatex(item.name)}}`);
    }

    if (item.authors && item.authors.length > 0) {
      fields.push(`  author = {${formatAuthors(item.authors)}}`);
    }

    if (item.publishYear) {
      fields.push(`  year = {${item.publishYear}}`);
    }

    // Type-specific fields
    switch (entryType) {
      case 'article':
        if (item.publisherName) {
          fields.push(`  journal = {${escapeLatex(item.publisherName)}}`);
        }
        if (item.volume) {
          fields.push(`  volume = {${item.volume}}`);
        }
        if (item.issue) {
          fields.push(`  number = {${item.issue}}`);
        }
        if (item.startPage && item.endPage) {
          fields.push(`  pages = {${item.startPage}--${item.endPage}}`);
        } else if (item.startPage) {
          fields.push(`  pages = {${item.startPage}}`);
        }
        break;

      case 'book':
        if (item.publisherName) {
          fields.push(`  publisher = {${escapeLatex(item.publisherName)}}`);
        }
        if (item.city) {
          fields.push(`  address = {${escapeLatex(item.city)}}`);
        }
        if (item.editors && item.editors.length > 0) {
          fields.push(`  editor = {${formatEditors(item.editors)}}`);
        }
        break;

      case 'incollection': // Book chapter
        {
          const bookTitle = item.secondName || item.name || '';
          if (bookTitle) {
            fields.push(`  booktitle = {${escapeLatex(bookTitle)}}`);
          }
        }
        if (item.editors && item.editors.length > 0) {
          fields.push(`  editor = {${formatEditors(item.editors)}}`);
        }
        if (item.publisherName) {
          fields.push(`  publisher = {${escapeLatex(item.publisherName)}}`);
        }
        if (item.city) {
          fields.push(`  address = {${escapeLatex(item.city)}}`);
        }
        if (item.startPage && item.endPage) {
          fields.push(`  pages = {${item.startPage}--${item.endPage}}`);
        }
        break;

      case 'inproceedings': // Conference paper
        if (item.publisherName) {
          fields.push(`  booktitle = {${escapeLatex(item.publisherName)}}`);
        }
        if (item.city) {
          fields.push(`  address = {${escapeLatex(item.city)}}`);
        }
        if (item.startPage && item.endPage) {
          fields.push(`  pages = {${item.startPage}--${item.endPage}}`);
        }
        break;

      case 'phdthesis':
        if (item.publisherName) {
          fields.push(`  school = {${escapeLatex(item.publisherName)}}`);
        }
        if (item.city) {
          fields.push(`  address = {${escapeLatex(item.city)}}`);
        }
        break;

      case 'misc':
        if (item.publisherName) {
          fields.push(`  howpublished = {${escapeLatex(item.publisherName)}}`);
        }
        break;
    }

    // Optional fields
    if (item.doi) {
      fields.push(`  doi = {${item.doi}}`);
    }

    if (item.link) {
      fields.push(`  url = {${item.link}}`);
    }

    // Abstract if available
    if (item.abstract) {
      const cleanAbstract = escapeLatex(item.abstract)
        .replace(/\n/g, ' ')
        .trim();
      if (cleanAbstract) {
        fields.push(`  abstract = {${cleanAbstract}}`);
      }
    }

    // Keywords if available
    if (item.keywords && item.keywords.length > 0) {
      const keywordString = item.keywords
        .map(k => typeof k === 'string' ? k : k.name || '')
        .filter(k => k)
        .join(', ');
      if (keywordString) {
        fields.push(`  keywords = {${escapeLatex(keywordString)}}`);
      }
    }

    // Build the entry
    const entry = `@${entryType}{${key},\n${fields.join(',\n')}\n}`;
    entries.push(entry);
  });

  // Add header comment
  const header = `% BibTeX bibliography generated by Quester
% Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
% Total entries: ${entries.length}

`;

  return header + entries.join('\n\n');
}

export async function exportToBibTeX(options: BibTeXExportOptions): Promise<void> {
  try {
    if (!options.literature || options.literature.length === 0) {
      throw new Error('No literature selected for export');
    }

    const bibtexContent = generateBibTeX(options);
    
    // Create blob
    const blob = new Blob([bibtexContent], { type: 'text/plain;charset=utf-8' });
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `bibliography_${timestamp}.bib`;
    
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
    console.error('BibTeX export failed:', error);
    throw new Error(`Failed to generate BibTeX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

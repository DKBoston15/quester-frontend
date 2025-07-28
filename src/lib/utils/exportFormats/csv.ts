import type { Literature } from '$lib/types/literature';
import { compileBibliography } from '../bibliographyUtils';

interface CSVExportOptions {
  literature: Literature[];
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // Check if escaping is needed
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

function formatCSVAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  return authors.join('; ');
}

function formatCSVKeywords(keywords: any[]): string {
  if (!keywords || keywords.length === 0) return '';
  
  return keywords
    .map(k => typeof k === 'string' ? k : k.name || '')
    .filter(k => k)
    .join('; ');
}

export function generateCSV(options: CSVExportOptions): string {
  const { literature } = options;
  
  if (!literature || literature.length === 0) {
    throw new Error('No literature provided for CSV generation');
  }

  // Compile and sort literature
  const compiledLiterature = compileBibliography(literature, { sortBy: "author", sortOrder: "asc" });
  
  // Define CSV headers
  const headers = [
    'ID',
    'Type',
    'Title',
    'Authors',
    'Year',
    'Journal/Publisher',
    'Volume',
    'Issue',
    'Start Page',
    'End Page',
    'DOI',
    'URL',
    'Abstract',
    'Keywords',
    'Editors',
    'Book Title',
    'City',
    'Start Date',
    'End Date',
    'Created Date',
    'Modified Date'
  ];

  // Create CSV rows
  const rows: string[] = [];
  
  // Add header row
  rows.push(headers.map(h => escapeCSV(h)).join(','));

  // Add data rows
  compiledLiterature.forEach((item, index) => {
    const row = [
      escapeCSV(item.id || index + 1),
      escapeCSV(item.type || ''),
      escapeCSV(item.name || ''),
      escapeCSV(formatCSVAuthors(item.authors || [])),
      escapeCSV(item.publishYear || ''),
      escapeCSV(item.publisherName || ''),
      escapeCSV(item.volume || ''),
      escapeCSV(item.issue || ''),
      escapeCSV(item.startPage || ''),
      escapeCSV(item.endPage || ''),
      escapeCSV(item.doi || ''),
      escapeCSV(item.link || ''),
      escapeCSV(item.abstract || ''),
      escapeCSV(formatCSVKeywords(item.keywords || [])),
      escapeCSV(formatCSVAuthors(item.editors || [])),
      escapeCSV(item.secondName || ''),
      escapeCSV(item.city || ''),
      escapeCSV(item.startDate || ''),
      escapeCSV(item.endDate || ''),
      escapeCSV(item.createdAt ? new Date(item.createdAt).toISOString() : ''),
      escapeCSV(item.updatedAt ? new Date(item.updatedAt).toISOString() : '')
    ];
    
    rows.push(row.join(','));
  });

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  return BOM + rows.join('\n');
}

export async function exportToCSV(options: CSVExportOptions): Promise<void> {
  try {
    if (!options.literature || options.literature.length === 0) {
      throw new Error('No literature selected for export');
    }

    const csvContent = generateCSV(options);
    
    // Create blob with proper encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `bibliography_${timestamp}.csv`;
    
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
    console.error('CSV export failed:', error);
    throw new Error(`Failed to generate CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
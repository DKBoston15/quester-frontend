import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { mount, unmount } from 'svelte';
import type { Literature } from '$lib/types/literature';
import type { CitationStyle } from './citationFormatters';

// Utility functions for handling edge cases
function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove or replace problematic characters
    .replace(/[^\u0000-\u007F]/g, '') // Remove non-ASCII characters
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/[&]/g, 'and') // Replace ampersand
    .replace(/['"]/g, '') // Remove quotes
    .trim()
    .slice(0, 200); // Limit length to prevent overflow
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
    .slice(0, 100); // Limit filename length
}

function handleLongText(text: string, maxLength: number = 1000): string {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  // Truncate at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}

interface PDFExportOptions {
  literature: Literature[];
  citationStyle: CitationStyle;
  projectTitle?: string;
  authorName?: string;
  institution?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
}

export async function generatePDF(options: PDFExportOptions): Promise<Blob> {
  const {
    literature,
    citationStyle,
    projectTitle = "Research Bibliography",
    authorName = "",
    institution = "",
    orientation = 'portrait',
    format = 'a4'
  } = options;

  // Validate inputs
  if (!literature || literature.length === 0) {
    throw new Error('No literature provided for PDF generation');
  }

  if (!citationStyle) {
    throw new Error('Citation style is required for PDF generation');
  }

  // Sanitize inputs to handle special characters
  const sanitizedProjectTitle = sanitizeText(projectTitle);
  const sanitizedAuthorName = sanitizeText(authorName);
  const sanitizedInstitution = sanitizeText(institution);

  // Create a temporary container for the print template
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0';
  tempContainer.style.width = '210mm'; // A4 width
  tempContainer.style.background = 'white';
  tempContainer.style.minHeight = '297mm'; // A4 height
  document.body.appendChild(tempContainer);

  let component: any;
  
  try {
    // Import and render the PrintTemplate component
    const PrintTemplate = await import('../components/custom-ui/literature/export/PrintTemplate.svelte');
    
    // Use Svelte 5 mount API
    component = mount(PrintTemplate.default, {
      target: tempContainer,
      props: {
        literature,
        citationStyle,
        projectTitle: sanitizedProjectTitle,
        authorName: sanitizedAuthorName,
        institution: sanitizedInstitution
      }
    });

    // Wait for component to render and check if it rendered successfully
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Validate that the component rendered properly
    if (!tempContainer.querySelector('.print-template')) {
      throw new Error('Failed to render print template');
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: format
    });

    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; // 15mm margin

    // Find all elements that need to be captured
    const titlePage = tempContainer.querySelector('.title-page') as HTMLElement;
    const bibliographyContent = tempContainer.querySelector('.bibliography-content') as HTMLElement;

    if (titlePage) {
      try {
        // Capture title page with error handling
        const titleCanvas = await html2canvas(titlePage, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: Math.min(titlePage.scrollWidth, 2000), // Limit canvas size
          height: Math.min(titlePage.scrollHeight, 2000)
        });

        const titleImgData = titleCanvas.toDataURL('image/png');
        const titleImgWidth = pageWidth - (margin * 2);
        const titleImgHeight = (titleCanvas.height * titleImgWidth) / titleCanvas.width;

        // Ensure image fits on page
        const maxHeight = pageHeight - (margin * 2);
        const finalHeight = Math.min(titleImgHeight, maxHeight);
        const finalWidth = titleImgWidth * (finalHeight / titleImgHeight);

        pdf.addImage(titleImgData, 'PNG', margin, margin, finalWidth, finalHeight);
      } catch (error) {
        console.warn('Failed to render title page, skipping:', error);
        // Continue without title page
      }
    }

    if (bibliographyContent) {
      // Add new page for bibliography
      pdf.addPage();

      // Capture bibliography content in chunks to handle pagination
      const referenceEntries = bibliographyContent.querySelectorAll('.reference-entry');
      const header = bibliographyContent.querySelector('.bibliography-header') as HTMLElement;
      
      let currentY = margin;
      
      // Add header to first bibliography page
      if (header) {
        try {
          const headerCanvas = await html2canvas(header, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });

          const headerImgData = headerCanvas.toDataURL('image/png');
          const headerImgWidth = pageWidth - (margin * 2);
          const headerImgHeight = (headerCanvas.height * headerImgWidth) / headerCanvas.width;

          pdf.addImage(headerImgData, 'PNG', margin, currentY, headerImgWidth, headerImgHeight);
          currentY += headerImgHeight + 10; // Add some spacing
        } catch (error) {
          console.warn('Failed to render header, continuing without it:', error);
        }
      }

      // Process each reference entry
      for (let i = 0; i < referenceEntries.length; i++) {
        const entry = referenceEntries[i] as HTMLElement;
        
        // Create a temporary container for just this entry
        const entryContainer = document.createElement('div');
        entryContainer.style.width = '180mm'; // Content width within margins
        entryContainer.style.backgroundColor = '#ffffff';
        entryContainer.style.padding = '0';
        entryContainer.style.fontFamily = 'Times New Roman, Times, serif';
        entryContainer.style.fontSize = '12pt';
        entryContainer.style.lineHeight = '1.6';
        
        // Clone the entry content
        entryContainer.appendChild(entry.cloneNode(true));
        document.body.appendChild(entryContainer);

        try {
          const entryCanvas = await html2canvas(entryContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            height: Math.min(entryContainer.scrollHeight, 500) // Limit height for very long entries
          });

          const entryImgData = entryCanvas.toDataURL('image/png');
          const entryImgWidth = pageWidth - (margin * 2);
          let entryImgHeight = (entryCanvas.height * entryImgWidth) / entryCanvas.width;

          // Handle very large entries by splitting them
          const maxEntryHeight = pageHeight - (margin * 3); // Leave room for spacing
          if (entryImgHeight > maxEntryHeight) {
            entryImgHeight = maxEntryHeight;
            console.warn(`Entry ${i + 1} was too large and was scaled down`);
          }

          // Check if we need a new page
          if (currentY + entryImgHeight > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }

          pdf.addImage(entryImgData, 'PNG', margin, currentY, entryImgWidth, entryImgHeight);
          currentY += entryImgHeight + 5; // Add small spacing between entries

        } catch (error) {
          console.warn(`Failed to render reference entry ${i + 1}, skipping:`, error);
          // Continue to next entry
        } finally {
          if (entryContainer.parentNode) {
            document.body.removeChild(entryContainer);
          }
        }
      }

      // Add footer to last page
      const footer = bibliographyContent.querySelector('.bibliography-footer') as HTMLElement;
      if (footer) {
        const footerCanvas = await html2canvas(footer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const footerImgData = footerCanvas.toDataURL('image/png');
        const footerImgWidth = pageWidth - (margin * 2);
        const footerImgHeight = (footerCanvas.height * footerImgWidth) / footerCanvas.width;

        // Position footer at bottom of page
        const footerY = pageHeight - margin - footerImgHeight;
        pdf.addImage(footerImgData, 'PNG', margin, footerY, footerImgWidth, footerImgHeight);
      }
    }

    // Cleanup
    if (component) {
      unmount(component);
    }
    document.body.removeChild(tempContainer);

    // Return PDF as blob
    return new Blob([pdf.output('blob')], { type: 'application/pdf' });

  } catch (error) {
    // Cleanup on error
    if (component) {
      try {
        unmount(component);
      } catch (e) {
        console.error('Failed to unmount component:', e);
      }
    }
    if (tempContainer.parentNode) {
      document.body.removeChild(tempContainer);
    }
    throw error;
  }
}

export function downloadPDF(blob: Blob, filename: string = 'bibliography.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  try {
    // Validate options before proceeding
    if (!options.literature || options.literature.length === 0) {
      throw new Error('No literature selected for export');
    }

    if (options.literature.length > 100) {
      console.warn('Large number of references may cause performance issues');
    }

    const pdfBlob = await generatePDF(options);
    
    // Generate safe filename
    const baseFilename = sanitizeFilename(options.projectTitle || 'bibliography');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${baseFilename}_${options.citationStyle.toLowerCase()}_${timestamp}.pdf`;
    
    downloadPDF(pdfBlob, filename);
  } catch (error) {
    console.error('PDF export failed:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('canvas')) {
        throw new Error('Failed to generate PDF: Unable to render content. This may be due to browser limitations or content size.');
      } else if (error.message.includes('memory')) {
        throw new Error('Failed to generate PDF: Too much content to process. Try exporting fewer references.');
      } else {
        throw new Error(`Failed to generate PDF: ${error.message}`);
      }
    }
    
    throw new Error('Failed to generate PDF: Unknown error occurred');
  }
}
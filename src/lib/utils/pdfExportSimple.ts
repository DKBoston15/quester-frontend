import jsPDF from 'jspdf';
import type { Literature } from '$lib/types/literature';
import type { CitationStyle } from './citationFormatters';
import { formatCitation, stripHtmlTags } from './citationFormatters';
import { compileBibliography } from './bibliographyUtils';

interface PDFExportOptions {
  literature: Literature[];
  citationStyle: CitationStyle;
  projectTitle?: string;
  authorName?: string;
  institution?: string;
}

export async function generatePDFSimple(options: PDFExportOptions): Promise<Blob> {
  const {
    literature,
    citationStyle,
    projectTitle = "Research Bibliography",
    authorName = "",
    institution = ""
  } = options;

  // Create PDF with proper settings
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set font
  pdf.setFont('helvetica');
  
  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  const contentWidth = pageWidth - (margin * 2);

  // Title page
  let yPosition = 50;
  
  // Main title
  pdf.setFontSize(24);
  pdf.text(projectTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Subtitle
  pdf.setFontSize(18);
  pdf.text('Bibliography', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 30;

  // Metadata
  pdf.setFontSize(12);
  if (authorName) {
    pdf.text(`Prepared by: ${authorName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight;
  }
  if (institution) {
    pdf.text(institution, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight;
  }
  
  yPosition += 10;
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  pdf.text(`Generated on ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight;
  
  pdf.text(`Citation Style: ${citationStyle}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight;
  
  pdf.text(`${literature.length} Reference${literature.length !== 1 ? 's' : ''}`, pageWidth / 2, yPosition, { align: 'center' });

  // Start bibliography on new page
  pdf.addPage();
  yPosition = margin;

  // Bibliography header
  pdf.setFontSize(16);
  pdf.text('Bibliography', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Compile and sort literature
  const compiledLiterature = compileBibliography(literature, { sortBy: "author", sortOrder: "asc" });

  // Set font for citations
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  // Process each citation
  compiledLiterature.forEach((item, index) => {
    try {
      // Format citation
      const formattedCitation = formatCitation(item, citationStyle);
      const plainText = stripHtmlTags(formattedCitation);
      
      // Split long citations into lines
      const lines = pdf.splitTextToSize(plainText, contentWidth);
      
      // Check if we need a new page
      const textHeight = lines.length * lineHeight;
      if (yPosition + textHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      // Add citation text
      lines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });

      // Add spacing between citations
      yPosition += 5;

    } catch (error) {
      console.error(`Error formatting citation ${index + 1}:`, error);
      // Add fallback text
      pdf.text(`${item.name || 'Unknown Title'} (${item.publishYear || 'n.d.'})`, margin, yPosition);
      yPosition += lineHeight + 5;
    }
  });

  // Add footer on last page
  const footerY = pageHeight - 15;
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(
    `Generated on ${currentDate} • ${citationStyle} Style • ${literature.length} references`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Return as blob
  return new Blob([pdf.output('blob')], { type: 'application/pdf' });
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

export async function exportToPDFSimple(options: PDFExportOptions): Promise<void> {
  try {
    if (!options.literature || options.literature.length === 0) {
      throw new Error('No literature selected for export');
    }

    const pdfBlob = await generatePDFSimple(options);
    
    // Generate safe filename
    const baseFilename = (options.projectTitle || 'bibliography')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${baseFilename}_${options.citationStyle.toLowerCase()}_${timestamp}.pdf`;
    
    downloadPDF(pdfBlob, filename);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
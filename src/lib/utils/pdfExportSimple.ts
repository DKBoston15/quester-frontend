import jsPDF from 'jspdf';
import type { Literature } from '$lib/types/literature';
import type { CitationStyle } from './citationFormatters';
import { formatCitation } from './citationFormatters';
import { compileBibliography } from './bibliographyUtils';

interface FormattedTextSegment {
  text: string;
  isItalic: boolean;
}

interface ProcessedText {
  segments: FormattedTextSegment[];
  plainText: string;
}

interface PDFExportOptions {
  literature: Literature[];
  citationStyle: CitationStyle;
  projectTitle?: string;
  authorName?: string;
  institution?: string;
}

/**
 * Process formatted citation text to preserve italic formatting
 */
function processFormattedText(htmlText: string): ProcessedText {
  const segments: FormattedTextSegment[] = [];
  let plainText = '';
  
  // First, remove all non-italic HTML tags (like <span>)
  let cleanedHtml = htmlText.replace(/<(?!\/?(i|em)(?=>|\s.*>))\/?[^>]+>/g, '');
  
  // Regular expression to match italic tags and content
  const italicRegex = /<(i|em)>(.*?)<\/\1>/g;
  let lastIndex = 0;
  let match;

  while ((match = italicRegex.exec(cleanedHtml)) !== null) {
    // Add regular text before italic
    if (match.index > lastIndex) {
      const regularText = cleanedHtml.slice(lastIndex, match.index);
      if (regularText) {
        segments.push({ text: regularText, isItalic: false });
        plainText += regularText;
      }
    }
    
    // Add italic text
    const italicText = match[2];
    if (italicText) {
      segments.push({ text: italicText, isItalic: true });
      plainText += italicText;
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining regular text
  if (lastIndex < cleanedHtml.length) {
    const remainingText = cleanedHtml.slice(lastIndex);
    if (remainingText) {
      segments.push({ text: remainingText, isItalic: false });
      plainText += remainingText;
    }
  }
  
  // If no segments were created, return the entire text as regular
  if (segments.length === 0 && cleanedHtml) {
    segments.push({ text: cleanedHtml, isItalic: false });
    plainText = cleanedHtml;
  }
  
  return { segments, plainText };
}

/**
 * Add formatted text with hanging indent to PDF
 */
function addFormattedTextWithHangingIndent(
  pdf: jsPDF,
  processedText: ProcessedText,
  leftMargin: number,
  startY: number,
  availableWidth: number,
  hangingIndent: number,
  lineHeight: number
): number {
  let currentY = startY;
  let currentX = leftMargin;
  let isFirstLine = true;
  
  // Process each segment
  for (const segment of processedText.segments) {
    // Set font style
    if (segment.isItalic) {
      pdf.setFont('helvetica', 'italic');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    // Split text into words
    const words = segment.text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      const wordWidth = pdf.getTextWidth(word);
      
      // Calculate line width limit
      const lineWidth = isFirstLine ? availableWidth + hangingIndent : availableWidth;
      const lineStartX = isFirstLine ? leftMargin : leftMargin + hangingIndent;
      
      // Check if word fits on current line
      if (currentX + wordWidth > lineStartX + lineWidth && currentX > lineStartX) {
        // Move to next line
        currentY += lineHeight;
        currentX = leftMargin + hangingIndent;
        isFirstLine = false;
      }
      
      // If this is the start of a line, set proper x position
      if (currentX === leftMargin) {
        currentX = isFirstLine ? leftMargin : leftMargin + hangingIndent;
      }
      
      // Add the word
      pdf.text(word, currentX, currentY);
      currentX += wordWidth;
      
      // After first word, no longer first line
      if (isFirstLine && i === 0) {
        isFirstLine = false;
      }
    }
  }
  
  return currentY;
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
  
  // Project title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(projectTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Subtitle
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Bibliography', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 25;

  // Metadata
  pdf.setFontSize(12);
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  // Generated by line
  const generatedByText = authorName 
    ? `Generated on ${currentDate} by Quester for ${authorName}`
    : `Generated on ${currentDate} by Quester`;
  pdf.text(generatedByText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 1.5;
  
  // Citation style
  pdf.text(`Citation Style: ${citationStyle}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight;
  
  // Reference count
  pdf.text(`${literature.length} Reference${literature.length !== 1 ? 's' : ''}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Institution if provided
  if (institution) {
    yPosition += lineHeight * 2;
    pdf.setFont('helvetica', 'italic');
    pdf.text(institution, pageWidth / 2, yPosition, { align: 'center' });
  }

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
      
      // Process text with italic formatting preserved
      const processedText = processFormattedText(formattedCitation);
      
      // Calculate hanging indent
      const hangingIndent = 12.7; // 0.5 inch in mm
      const availableWidth = contentWidth - hangingIndent;
      
      // Check if we need a new page
      const estimatedLines = Math.ceil(processedText.plainText.length / 80); // rough estimate
      const textHeight = estimatedLines * lineHeight;
      if (yPosition + textHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      // Add citation text with hanging indent and italic formatting
      const endY = addFormattedTextWithHangingIndent(pdf, processedText, margin, yPosition, availableWidth, hangingIndent, lineHeight);
      
      // Update position with actual end position plus spacing
      yPosition = endY + 5;

    } catch (error) {
      console.error(`Error formatting citation ${index + 1}:`, error);
      // Add fallback text with hanging indent
      const fallbackText = `${item.name || 'Unknown Title'} (${item.publishYear || 'n.d.'})`;
      pdf.text(fallbackText, margin + 12.7, yPosition);
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
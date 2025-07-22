import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, Header, PageNumber, PageBreak } from 'docx';
import type { Literature } from '$lib/types/literature';
import type { CitationStyle } from '../citationFormatters';
import { formatCitation, stripHtmlTags } from '../citationFormatters';
import { compileBibliography } from '../bibliographyUtils';

/**
 * Parse HTML text to create TextRun objects with formatting
 */
function parseHtmlToTextRuns(htmlText: string): TextRun[] {
  const textRuns: TextRun[] = [];
  
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
        textRuns.push(new TextRun({
          text: regularText,
          size: 24 // 12pt font
        }));
      }
    }
    
    // Add italic text
    const italicText = match[2];
    if (italicText) {
      textRuns.push(new TextRun({
        text: italicText,
        size: 24, // 12pt font
        italics: true
      }));
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining regular text
  if (lastIndex < cleanedHtml.length) {
    const remainingText = cleanedHtml.slice(lastIndex);
    if (remainingText) {
      textRuns.push(new TextRun({
        text: remainingText,
        size: 24 // 12pt font
      }));
    }
  }
  
  // If no text runs were created, return the entire text as a single run
  if (textRuns.length === 0 && cleanedHtml) {
    textRuns.push(new TextRun({
      text: cleanedHtml,
      size: 24 // 12pt font
    }));
  }
  
  return textRuns;
}

interface DOCXExportOptions {
  literature: Literature[];
  citationStyle: CitationStyle;
  projectTitle?: string;
  authorName?: string;
  institution?: string;
}

export async function generateDOCX(options: DOCXExportOptions): Promise<Blob> {
  const {
    literature,
    citationStyle,
    projectTitle = "Research Bibliography",
    authorName = "",
    institution = ""
  } = options;

  if (!literature || literature.length === 0) {
    throw new Error('No literature provided for DOCX generation');
  }

  // Compile and sort literature
  const compiledLiterature = compileBibliography(literature, { sortBy: "author", sortOrder: "asc" });
  
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Create sections array
  const sections = [];

  // Title page paragraphs
  const titlePageParagraphs: Paragraph[] = [
    // Add spacing before title
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    
    // Main title
    new Paragraph({
      text: projectTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 400
      }
    }),
    
    // Subtitle
    new Paragraph({
      text: "Bibliography",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 800
      }
    }),
    
    // Add spacing
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
  ];

  // Add metadata if provided
  if (authorName) {
    titlePageParagraphs.push(
      new Paragraph({
        text: `Prepared by: ${authorName}`,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 200
        }
      })
    );
  }

  if (institution) {
    titlePageParagraphs.push(
      new Paragraph({
        text: institution,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 200
        }
      })
    );
  }

  // Add generation date and style info
  titlePageParagraphs.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      text: `Generated on ${currentDate}`,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 200
      }
    }),
    new Paragraph({
      text: `Citation Style: ${citationStyle}`,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 200
      }
    }),
    new Paragraph({
      text: `${literature.length} Reference${literature.length !== 1 ? 's' : ''}`,
      alignment: AlignmentType.CENTER
    })
  );

  // Title page section
  sections.push({
    properties: {
      page: {
        margin: {
          top: 1440, // 1 inch
          right: 1440,
          bottom: 1440,
          left: 1440
        }
      }
    },
    children: titlePageParagraphs
  });

  // Bibliography paragraphs
  const bibliographyParagraphs: Paragraph[] = [
    // Bibliography header
    new Paragraph({
      text: "Bibliography",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 400
      }
    }),
    new Paragraph({ text: "" }) // Add spacing
  ];

  // Add each citation
  compiledLiterature.forEach((item, index) => {
    try {
      const formattedCitation = formatCitation(item, citationStyle);
      
      // Parse HTML to create TextRun objects with proper formatting
      const textRuns = parseHtmlToTextRuns(formattedCitation);
      
      // Create citation paragraph with hanging indent
      bibliographyParagraphs.push(
        new Paragraph({
          children: textRuns,
          spacing: {
            after: 240, // Add space between citations
            line: 360 // 1.5 line spacing
          },
          indent: {
            left: 720, // 0.5 inch left indent
            hanging: 720 // 0.5 inch hanging indent
          }
        })
      );

      // Add DOI if available
      if (item.doi) {
        bibliographyParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `DOI: ${item.doi}`,
                size: 20, // 10pt font
                color: "666666"
              })
            ],
            spacing: {
              after: 120
            },
            indent: {
              left: 720
            }
          })
        );
      }

    } catch (error) {
      console.error(`Error formatting citation ${index + 1}:`, error);
      // Add fallback citation
      bibliographyParagraphs.push(
        new Paragraph({
          text: `${item.name || 'Unknown Title'} (${item.publishYear || 'n.d.'})`,
          spacing: {
            after: 240
          },
          indent: {
            left: 720,
            hanging: 720
          }
        })
      );
    }
  });

  // Bibliography section with headers and footers
  sections.push({
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            text: projectTitle,
            alignment: AlignmentType.RIGHT,
            spacing: {
              after: 200
            }
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Page ",
                size: 20
              }),
              new TextRun({
                children: [PageNumber.CURRENT],
                size: 20
              }),
              new TextRun({
                text: " of ",
                size: 20
              }),
              new TextRun({
                children: [PageNumber.TOTAL_PAGES],
                size: 20
              })
            ]
          })
        ]
      })
    },
    properties: {
      page: {
        margin: {
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
          header: 720,
          footer: 720
        }
      }
    },
    children: bibliographyParagraphs
  });

  // Create the document
  const doc = new Document({
    creator: "Quester Literature Export",
    title: projectTitle,
    description: `Bibliography in ${citationStyle} format`,
    sections: sections,
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24 // 12pt
          },
          paragraph: {
            spacing: {
              line: 276 // Single line spacing
            }
          }
        }
      },
      paragraphStyles: [
        {
          id: "Citation",
          name: "Citation",
          basedOn: "Normal",
          next: "Citation",
          run: {
            size: 24
          },
          paragraph: {
            spacing: {
              after: 240,
              line: 360
            },
            indent: {
              left: 720,
              hanging: 720
            }
          }
        }
      ]
    }
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

// Fix missing import
import { Packer } from 'docx';

export async function exportToDOCX(options: DOCXExportOptions): Promise<void> {
  try {
    if (!options.literature || options.literature.length === 0) {
      throw new Error('No literature selected for export');
    }

    const docxBlob = await generateDOCX(options);
    
    // Generate safe filename
    const baseFilename = (options.projectTitle || 'bibliography')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${baseFilename}_${options.citationStyle.toLowerCase()}_${timestamp}.docx`;
    
    // Download file
    const url = URL.createObjectURL(docxBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('DOCX export failed:', error);
    throw new Error(`Failed to generate DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
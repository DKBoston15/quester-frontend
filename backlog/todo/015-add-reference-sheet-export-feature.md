# Add Reference Sheet Export Feature

## Metadata

- **ID**: 015
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: L
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement

Users need the ability to export reference sheets from their literature and research materials for external use and sharing. Currently, users can only copy individual citations, but need bulk export functionality for complete bibliographies.

## Deep Dive Analysis

### Current System Strengths

- **Sophisticated Citation Engine**: `Reference.svelte` already formats 6 academic styles (APA, MLA, Chicago, Harvard, IEEE, ASA)
- **Comprehensive Data Model**: Literature type contains all necessary citation fields
- **Existing Export Patterns**: App has CSV/JSON/PNG export in other modules
- **Strong Architecture**: Svelte stores, AG-Grid table, established component patterns

### Technical Implementation Strategy

#### Phase 1: Preview & Copy/Paste Reference Sheet (MVP - 1 week)

**Priority: High | Complexity: Low | Value: High**

**Implementation**:

- Add bulk selection to literature table using AG-Grid row selection
- Add select all button to literature table using AG-Grid row selection
- Create `ExportReferences.svelte` component with modal/dialog interface
- **Create live preview of formatted bibliography**
- Extract citation formatting functions from `Reference.svelte` to shared utilities
- Implement "Copy All References" with proper bibliography formatting
- Support all 6 existing citation styles with alphabetical author sorting

**Preview Features**:

- Live citation style switching in preview
- Scrollable reference list in modal
- Show selection count and estimated page count
- Format preview exactly as it will be exported

**Files to Create/Modify**:

- `src/lib/components/custom-ui/literature/export/ExportReferences.svelte` (main dialog with preview)
- `src/lib/components/custom-ui/literature/export/ReferencePreview.svelte` (preview component)
- `src/lib/utils/citationFormatters.ts` (extracted from Reference.svelte)
- `src/lib/components/custom-ui/literature/LiteratureTable.svelte` (add selection)
- `src/routes/project/LiteratureView.svelte` (add export button)

#### Phase 2: PDF Export (2-3 weeks)

**Priority: Medium | Complexity: Medium | Value: High**

**Implementation Options**:

1. **Browser Print (Recommended)**: HTML template + window.print() + CSS @media print
2. **jsPDF Library**: Add dependency for programmatic PDF generation
3. **Hybrid**: html-to-image for formatting + jsPDF for document structure

**Technical Requirements**:

- Print-optimized CSS with proper page breaks
- Bibliography pagination handling
- Header/footer with project metadata
- Professional academic formatting

#### Phase 3: Academic & Document Export Formats (1-2 weeks)

**Priority: High | Complexity: Medium | Value: High**

**Formats to Support**:

- **DOCX**: Microsoft Word format for editing and sharing
- **BibTeX**: Most common academic reference format
- **RIS**: EndNote and reference manager compatibility
- **CSV**: Data analysis and spreadsheet compatibility

**DOCX Implementation**:

- Use `docx` library (npm install docx)
- Create formatted document with proper styles
- Include title page with project metadata
- Support headers, footers, and page numbers
- Allow custom document templates

### Technical Architecture

```
src/lib/components/custom-ui/literature/
├── export/
│   ├── ExportReferences.svelte        # Main export dialog with preview
│   ├── ReferencePreview.svelte        # Live preview component
│   ├── ExportFormatSelector.svelte    # Format picker (Copy/PDF/DOCX/BibTeX/RIS/CSV)
│   └── BulkReferenceActions.svelte    # Selection management toolbar
├── utils/
│   ├── citationFormatters.ts          # Extracted formatting logic
│   ├── exportFormats/
│   │   ├── docx.ts                    # DOCX document generation
│   │   ├── bibtex.ts                  # BibTeX format export
│   │   ├── ris.ts                     # RIS format export
│   │   └── csv.ts                     # CSV format export
│   └── bibliographyUtils.ts           # Sorting and grouping utilities
```

### Performance Considerations

- Handle 100+ references efficiently using virtual scrolling
- Batch processing for large exports with progress indication
- Memory management for PDF generation
- Browser compatibility testing (especially PDF features)

### User Experience Design

- **Live Preview Modal**:
  - Split view: selection list on left, formatted preview on right
  - Real-time preview updates as selections change
  - Citation style switcher in preview header
  - Estimated page count display
  - Zoom controls for preview
  
- **Export Workflow**:
  - Single "Export References" button opens preview dialog
  - Format selector (Copy, PDF, DOCX, BibTeX, RIS, CSV)
  - "Export" button changes label based on format (Copy/Download)
  - Progress indicator for large exports
  - Success toast with file download

- **Selection Management**:
  - Select all/none buttons in toolbar
  - Individual checkbox selection
  - Filter selected/unselected items
  - Selection count badge
  - Keyboard shortcuts (Ctrl+A, Space)

- **User Preferences**:
  - Remember last citation style
  - Remember last export format
  - Default sort order (alphabetical by author)
  - Auto-save preferences to localStorage

## Research Notes

### Affected Files

- **Core Citation Logic**: `src/lib/components/custom-ui/literature/literatureItem/Reference.svelte`
- **Literature Management**: `src/routes/project/LiteratureView.svelte`
- **Data Layer**: `src/lib/stores/LiteratureStore.svelte`
- **Type Definitions**: `src/lib/types/literature.ts`

### Technical Context

- **Existing Export Patterns**: Timeline module has CSV/JSON/PDF export in `Progress.svelte`
- **PDF Capabilities**: No current PDF library (need to add jsPDF or similar)
- **Image Export**: `html-to-image` library already available
- **Table Management**: AG-Grid with built-in selection capabilities

### Dependencies to Add

```json
{
  "docx": "^8.5.0", // DOCX generation
  "jspdf": "^2.5.1", // PDF generation
  "file-saver": "^2.0.5" // File download utility
}
```

## Subtasks

### Phase 1: MVP Preview & Copy/Paste (Week 1)

- [ ] Extract citation formatting functions to shared utilities
- [ ] Add bulk selection to literature table (AG-Grid row selection)
- [ ] Create ExportReferences dialog component with preview pane
- [ ] Implement ReferencePreview component with live style switching
- [ ] Add bibliography compilation and sorting logic
- [ ] Implement "Copy All References" functionality
- [ ] Add export format selector (initially just Copy)
- [ ] Integrate export button into LiteratureView interface
- [ ] Show selection count and preview updates
- [ ] Test with large reference lists (performance validation)

### Phase 2: PDF Export (Weeks 2-3)

- [ ] Add jsPDF dependency to package.json
- [ ] Create print-optimized HTML template for references
- [ ] Implement CSS @media print styles with page breaks
- [ ] Add PDF generation with proper formatting
- [ ] Create header/footer with project metadata
- [ ] Test PDF output quality and formatting consistency
- [ ] Handle edge cases (very long titles, special characters)

### Phase 3: Academic & Document Formats (Week 4)

- [ ] Add docx dependency to package.json
- [ ] Implement DOCX export with proper formatting
- [ ] Create document template with title page and metadata
- [ ] Add headers, footers, and page numbers to DOCX
- [ ] Implement BibTeX export format generator
- [ ] Add RIS export for reference manager compatibility
- [ ] Create CSV export for data analysis use cases
- [ ] Add format validation and error handling
- [ ] Test DOCX in MS Word, Google Docs, LibreOffice
- [ ] Test with academic reference managers (Zotero, Mendeley)
- [ ] Document export format specifications

### Testing & Quality Assurance

- [ ] Unit tests for citation formatting functions
- [ ] Integration tests for bulk export workflows
- [ ] Cross-browser compatibility testing (especially PDF)
- [ ] Performance testing with 500+ references
- [ ] Accessibility compliance verification
- [ ] Academic style guide validation (sample from each format)

## Related Tasks

None currently

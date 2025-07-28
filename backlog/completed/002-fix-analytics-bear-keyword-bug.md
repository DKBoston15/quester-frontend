# Fix Analytics Bear Keyword Bug

## Metadata
- **ID**: 002
- **Status**: todo
- **Priority**: high
- **Category**: bug
- **Size**: M
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement
In Sofia's project Sleep_White_Matter, the word "bear" never appears in her Notes but shows up in Analytics for her Notes, indicating a bug in the keyword analysis system.

## Research Notes
### Affected Files
- `src/routes/project/analytics/utils.ts:137-164` - processTextWithNLP() function with lemmatization
- `src/routes/project/analytics/Analytics.svelte:104-137` - extractTextFromTipTap() implementation
- `src/routes/project/analytics/Analytics.svelte:140-162` - analyzeLiterature() calls and data flow
- `src/routes/project/analytics/utils.ts:260-313` - duplicate extractTextFromTipTap() implementation

### Technical Context
**Root Cause Identified**: The bug is caused by wink-nlp's lemmatization process in the Analytics page (NOT the Keyword Analysis feature). 

**Key Technical Details**:
- wink-nlp's `lemmaIts` converts verb forms to root words: "bears" → "bear", "bore" → "bear", "born" → "bear"
- Academic writing commonly uses phrases like "research bears out", "data bore results", "analysis was born from"
- Analytics page processes Notes content through `processTextWithNLP()` which applies lemmatization
- Two separate systems: Analytics page (frontend wink-nlp) vs Keyword Analysis (backend API)
- Duplicate `extractTextFromTipTap()` implementations exist in codebase

**Data Flow**:
1. Notes content → extractTextFromTipTap() → plain text
2. Plain text → processTextWithNLP() → wink-nlp lemmatization
3. Lemmatized words → nounsWordCounts → analytics display

### Code References
- Lemmatization bug: `src/routes/project/analytics/utils.ts:148` - `.lemmaIts` application
- Word counting: `src/routes/project/analytics/utils.ts:157-164` - frequency calculation
- Analytics display: `src/routes/project/analytics/Analytics.svelte:230-250` - results rendering
- Text extraction: `src/routes/project/analytics/Analytics.svelte:104-137` and `utils.ts:260-313`

## Implementation Plan
### Phase 1: Fix Lemmatization Issue
- [x] Modify `processTextWithNLP()` to optionally disable lemmatization for noun extraction
- [x] Update `analyzeLiterature()` to pass lemmatization control parameter
- [x] Test with academic text containing "bears", "bore", "born" variations

### Phase 2: Code Consolidation
- [x] Consolidate duplicate `extractTextFromTipTap()` implementations
- [x] Ensure consistent text processing across components
- [x] Update imports to use single implementation

### Phase 3: Validation & Testing
- [x] Create test cases with academic language patterns
- [x] Verify Sofia's project no longer shows false "bear" keyword
- [x] Test other potential lemmatization false positives
- [x] Document lemmatization behavior for future reference

### Phase 4: Consider Keyword Analysis Feature
- [ ] Investigate if backend Keyword Analysis has similar lemmatization issues
- [ ] Ensure consistency between Analytics and Keyword Analysis processing

## Implementation Notes
**Completed**: 2025-01-15

**Root Cause**: The bug was caused by wink-nlp's lemmatization process in `processTextWithNLP()` that converted words like "bears", "bore", and "born" to their root form "bear", creating false positives in Sofia's project analytics.

**Solution Applied**:
- Added `useLemmatization: boolean = true` parameter to `processTextWithNLP()` function in `src/routes/project/analytics/utils.ts`
- Disabled lemmatization for both literature and notes processing by passing `false` parameter
- Consolidated duplicate `extractTextFromTipTap()` implementations from Analytics.svelte to utils.ts
- Fixed TypeScript unused variable warnings

**Files Modified**:
- `src/routes/project/analytics/utils.ts` - Added lemmatization control, exported extractTextFromTipTap
- `src/routes/project/Analytics.svelte` - Updated imports, removed duplicate function

**Technical Implementation**:
- Lines 341 & 406: Disabled lemmatization with `useLemmatization: false`
- Used `normalIts` instead of `lemmaIts` when lemmatization is disabled
- Maintained backward compatibility with default lemmatization enabled

**Testing Results**:
- Academic phrases like "research bears out" now correctly produce "bears" (not "bear")
- Legitimate "bear" words still detected correctly
- Core analytics functionality remains intact
- All TypeScript warnings resolved

## Related Tasks
None currently
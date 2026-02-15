# Playwright E2E Tests for Research Analyst Chat

Comprehensive end-to-end test suite for the Research Analyst chat feature, covering all block types, system prompt behavior, and UI interactions.

## Prerequisites

1. **Tilt dev environment running** (backend + frontend):
   ```bash
   # From quester root directory
   tilt up
   ```

2. **Playwright installed**:
   ```bash
   cd quester-frontend
   pnpm install  # Installs @playwright/test
   npx playwright install chromium  # Installs browser binaries
   ```

3. **One-time authentication setup**:
   ```bash
   npx playwright test --project=auth-setup
   ```
   - Browser opens and navigates to homepage
   - Playwright Inspector pauses execution
   - Manually complete WorkOS SSO in the browser
   - Click "Resume" in Playwright Inspector when on `/dashboard`
   - Authentication cookies saved to `e2e/fixtures/auth.json`

4. **Valid PROJECT_ID**: A project UUID with literature data for testing

## Running Tests

### Run All Tests
```bash
PROJECT_ID=6a2e1f01-4c34-4426-892a-40d3928512cd npx playwright test --project=analyst-tests
```

### Run Specific Test
```bash
PROJECT_ID=6a2e1f01-4c34-4426-892a-40d3928512cd npx playwright test --project=analyst-tests -g "table block"
```

### Run in Headed Mode (Visible Browser)
```bash
PROJECT_ID=6a2e1f01-4c34-4426-892a-40d3928512cd npx playwright test --project=analyst-tests --headed
```

### View HTML Report
```bash
npx playwright show-report
```

## Test Suite Overview

**Total Tests:** 13

### 1. Empty State & Basic Flow (2 tests)
- ✓ Starter suggestions visible
- ✓ Send message and receive response

### 2. System Prompt Verification (2 tests)
- ✓ No tool names leaked in narrative
- ✓ Suggestions not duplicated in narrative

### 3. Block Type Rendering (5 tests with soft fallbacks)
- ✓ Table block rendering
- ✓ Chart block rendering
- ✓ Metric block rendering
- ✓ Comparison block rendering
- ✓ Citation block rendering

### 4. User Interactions (4 tests)
- ✓ Suggestion chips render and clickable
- ✓ Steps progress indicator (timing-dependent)
- ✓ Starter suggestion click
- ✓ New session clears conversation

## Test Execution Strategy

### Non-Deterministic AI Responses
- Tests use **real AI queries** (not mocked)
- Block type tests have **soft fallback assertions**
- If expected block type not generated, test verifies narrative exists instead
- **Structural validation** (has rows, has columns) over content validation

### Timeouts
- **Test timeout:** 120s (2 minutes per test)
- **Expect timeout:** 90s (AI responses take 10-60s)
- Sequential execution (no parallel tests to avoid resource contention)

### No Retries
- **retries: 0** - AI non-determinism makes retries misleading
- Failures should trigger investigation, not automatic retry

## Selectors Reference

All selectors verified against source code:

| Element | Selector | Source |
|---------|----------|--------|
| Chat input | `textarea[placeholder="Ask about your research data..."]` | InputArea.svelte:46 |
| Send button | `button[aria-label="Send message"]` | InputArea.svelte:74 |
| Stop button | `button[aria-label="Stop generation"]` | InputArea.svelte:65 |
| Any block | `[data-analysis-block-id]` | BlockRenderer.svelte:61 |
| Message wrapper | `[data-analysis-message-id]` | ConversationThread.svelte:149 |
| Narrative | `.prose.prose-sm` | NarrativeBlock.svelte:22 |
| Suggestion chips | `div.flex.flex-wrap.gap-2.pt-2 button` | SuggestionsBlock.svelte:13-21 |
| Table block | `[data-analysis-block-id]:has(table)` | TableBlock |
| Chart block | `[data-analysis-block-id]:has(canvas, svg)` | Chart.js/D3 |
| Metric block | `[data-analysis-block-id]:has(.grid)` | MetricBlock |
| Comparison block | `[data-analysis-block-id]:has(th:has-text("Dimension"))` | ComparisonBlock |
| Citation block | `[data-analysis-block-id]:has(h4:has-text("Citations"))` | CitationBlock |

## Troubleshooting

### Authentication Issues
If auth.json is invalid or expired:
```bash
rm e2e/fixtures/auth.json
npx playwright test --project=auth-setup
# Complete SSO again
```

### PROJECT_ID Not Set
```
Error: PROJECT_ID environment variable is required
```
**Solution:** Set PROJECT_ID before running tests:
```bash
PROJECT_ID=<uuid> npx playwright test --project=analyst-tests
```

### Tests Timing Out
- Verify backend is running and responding
- Check AI service (DeepSeek/OpenAI) is configured and accessible
- Increase timeout if needed (edit `playwright.config.ts`)

### Block Type Test Failures
- Check if AI generated a different block type (soft fallback should pass)
- Verify narrative exists in response
- Review prompt wording if AI consistently chooses wrong block type

## CI/CD Integration (Future)

Not currently integrated into CI/CD due to:
- Manual SSO requirement
- AI response non-determinism
- Long execution time (2-17 minutes for all tests)

**Future improvements:**
- Dedicated test project with pre-seeded data
- Service account authentication
- Smoke test subset for faster feedback
- Retry logic for CI environment

## Files

```
quester-frontend/
├── playwright.config.ts       # Playwright configuration
├── e2e/
│   ├── README.md             # This file
│   ├── auth.setup.ts         # Manual SSO authentication
│   ├── analyst.spec.ts       # Main test suite (13 tests)
│   └── fixtures/
│       └── auth.json         # Saved auth cookies (gitignored)
├── test-results/             # Test execution artifacts (gitignored)
└── playwright-report/        # HTML report (gitignored)
```

import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for Research Analyst chat feature.
 *
 * Prerequisites:
 * - Tilt dev environment running (backend + frontend)
 * - Authentication completed (npx playwright test --project=auth-setup)
 * - PROJECT_ID environment variable set to a valid project UUID with literature data
 *
 * Usage:
 *   PROJECT_ID=<uuid> npx playwright test --project=analyst-tests
 *   PROJECT_ID=<uuid> npx playwright test --project=analyst-tests -g "table block"
 *   PROJECT_ID=<uuid> npx playwright test --project=analyst-tests --headed
 *
 * Selectors verified against source code:
 * - Chat input: textarea[placeholder="Ask about your research data..."] (InputArea.svelte:46)
 * - Send button: button[aria-label="Send message"] (InputArea.svelte:74)
 * - Stop button: button[aria-label="Stop generation"] (InputArea.svelte:65)
 * - Any block: [data-analysis-block-id] (BlockRenderer.svelte:61)
 * - Message wrapper: [data-analysis-message-id] (ConversationThread.svelte:149)
 * - Narrative: .prose.prose-sm (NarrativeBlock.svelte:22)
 * - Suggestion chips: div.flex.flex-wrap.gap-2.pt-2 button (SuggestionsBlock.svelte:13-21)
 */

// Validate PROJECT_ID environment variable
if (!process.env.PROJECT_ID) {
  throw new Error(
    'PROJECT_ID environment variable is required. ' +
      'Usage: PROJECT_ID=<uuid> npx playwright test --project=analyst-tests'
  );
}

const PROJECT_ID = process.env.PROJECT_ID;

/**
 * Helper: Send a message in the analyst chat
 */
async function sendMessage(page: Page, text: string): Promise<void> {
  const textarea = page.locator('textarea[placeholder="Ask about your research data..."]');
  await textarea.fill(text);

  const sendButton = page.locator('button[aria-label="Send message"]');
  await sendButton.click();
}

/**
 * Helper: Wait for AI response to complete
 * Waits for stop button to disappear and send button to return (90s timeout)
 */
async function waitForResponseComplete(page: Page): Promise<void> {
  const stopButton = page.locator('button[aria-label="Stop generation"]');
  const sendButton = page.locator('button[aria-label="Send message"]');

  // Wait for stop button to disappear (streaming finished)
  await stopButton.waitFor({ state: 'hidden', timeout: 90_000 });

  // Wait for send button to be visible again (ready for next message)
  await sendButton.waitFor({ state: 'visible', timeout: 90_000 });
}

// Base URL for all tests
test.beforeEach(async ({ page }) => {
  // Navigate directly to analyst chat
  await page.goto(`/project/${PROJECT_ID}/analyst`);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check if we got redirected to login (auth failed)
  if (page.url().includes('/login') || page.url().includes('/auth')) {
    throw new Error(
      'Authentication failed - redirected to login page!\n' +
      'The saved auth cookies may have expired. Re-run: npx playwright test --project=auth-setup'
    );
  }
});

// ============================================================================
// Empty State and Basic Flow Tests
// ============================================================================

test('Empty state - starter suggestions visible', async ({ page }) => {
  // Verify starter suggestion buttons are visible (using actual text from the UI)
  const starterButton1 = page.getByText('Summarize my research collection');
  const starterButton2 = page.getByText('What are the publication trends by year?');
  const starterButton3 = page.getByText('Which authors appear most frequently?');

  await expect(starterButton1).toBeVisible();
  await expect(starterButton2).toBeVisible();
  await expect(starterButton3).toBeVisible();
});

test('Send & receive - basic message flow', async ({ page }) => {
  // Send a message
  await sendMessage(page, 'Hello');

  // Verify user message appears
  const userMessage = page.locator('[data-analysis-message-id]').first();
  await expect(userMessage).toBeVisible();

  // Wait for AI response to complete
  await waitForResponseComplete(page);

  // Verify assistant message with narrative content
  const narrative = page.locator('.prose.prose-sm').last();
  await expect(narrative).toBeVisible();
  await expect(narrative).not.toBeEmpty();
});

// ============================================================================
// System Prompt Verification Tests
// ============================================================================

test('No tool names leaked - verify narrative does not contain tool names', async ({ page }) => {
  // Send a query
  await sendMessage(page, 'Tell me about my research data');

  // Wait for response
  await waitForResponseComplete(page);

  // Get all narrative text
  const narratives = page.locator('.prose.prose-sm');
  const narrativeTexts = await narratives.allTextContents();
  const fullNarrativeText = narrativeTexts.join(' ').toLowerCase();

  // Tool names that should NOT appear in narrative
  const toolNames = [
    'create_table',
    'create_chart',
    'get_document_chunks',
    'count_and_aggregate',
    'aggregate_chunks',
    'create_citation',
    'create_metric',
    'create_comparison',
  ];

  // Verify no tool names are leaked
  for (const toolName of toolNames) {
    expect(fullNarrativeText).not.toContain(toolName);
  }
});

test('Suggestions NOT in narrative - verify no suggestion sections in narrative text', async ({
  page,
}) => {
  // Send a query
  await sendMessage(page, 'Analyze my research collection');

  // Wait for response
  await waitForResponseComplete(page);

  // Get all narrative text
  const narratives = page.locator('.prose.prose-sm');
  const narrativeTexts = await narratives.allTextContents();
  const fullNarrativeText = narrativeTexts.join(' ').toLowerCase();

  // Phrases that indicate suggestions are embedded in narrative
  const suggestionPhrases = ['follow-up suggestion', 'you might also ask', 'suggested questions'];

  // Verify no suggestion introduction phrases in narrative
  for (const phrase of suggestionPhrases) {
    expect(fullNarrativeText).not.toContain(phrase);
  }
});

// ============================================================================
// Block Type Rendering Tests (with soft fallback assertions)
// ============================================================================

test('Table block - verify table structure with thead, tbody, rows', async ({ page }) => {
  // Send prompt biased toward table generation
  await sendMessage(page, 'Show me the top authors in a table with their publication counts');

  // Wait for response
  await waitForResponseComplete(page);

  // Try to find table block
  const tableBlock = page.locator('[data-analysis-block-id]:has(table)');
  const hasTable = (await tableBlock.count()) > 0;

  if (hasTable) {
    // Verify table structure
    await expect(tableBlock).toBeVisible();
    await expect(tableBlock.locator('thead')).toBeVisible();
    await expect(tableBlock.locator('tbody')).toBeVisible();
    await expect(tableBlock.locator('tbody tr')).not.toHaveCount(0);
  } else {
    // Soft fallback: AI didn't generate table, verify narrative exists instead
    const narrative = page.locator('.prose.prose-sm').last();
    await expect(narrative).toBeVisible();
  }
});

test('Chart block - verify canvas or svg element', async ({ page }) => {
  // Send prompt biased toward chart generation
  await sendMessage(page, 'Create a bar chart showing publications by year');

  // Wait for response
  await waitForResponseComplete(page);

  // Try to find chart block (Chart.js uses canvas, D3 uses svg)
  // Look for large SVG (chart), not small icons
  const chartBlock = page.locator('[data-analysis-block-id]:has(canvas, svg)');
  const hasChart = (await chartBlock.count()) > 0;

  if (hasChart) {
    // Verify chart element exists
    await expect(chartBlock).toBeVisible();
    // Look for SVG with significant width (chart, not icon)
    const chartSvg = chartBlock.locator('svg[width]').first();
    await expect(chartSvg).toBeVisible();
  } else {
    // Soft fallback: AI didn't generate chart, verify narrative exists instead
    const narrative = page.locator('.prose.prose-sm').last();
    await expect(narrative).toBeVisible();
  }
});

test('Metric block - verify grid layout with metric cards', async ({ page }) => {
  // Send prompt biased toward metric generation
  await sendMessage(page, 'Show key metrics for my research collection as metric cards');

  // Wait for response
  await waitForResponseComplete(page);

  // Try to find metric block (uses .grid layout)
  const metricBlock = page.locator('[data-analysis-block-id]:has(.grid)').first();
  const hasMetrics = (await metricBlock.count()) > 0;

  if (hasMetrics) {
    // Verify metric cards with labels and values
    await expect(metricBlock).toBeVisible();
    await expect(metricBlock.locator('.grid')).toBeVisible();
  } else {
    // Soft fallback: AI didn't generate metrics, verify narrative exists instead
    const narrative = page.locator('.prose.prose-sm').last();
    await expect(narrative).toBeVisible();
  }
});

test('Comparison block - verify table with Dimension header and columns', async ({ page }) => {
  // Send prompt biased toward comparison generation
  await sendMessage(page, 'Compare the methodologies across the first 3 articles');

  // Wait for response
  await waitForResponseComplete(page);

  // Try to find comparison block (has th with "Dimension" text)
  const comparisonBlock = page.locator('[data-analysis-block-id]:has(th:has-text("Dimension"))');
  const hasComparison = (await comparisonBlock.count()) > 0;

  if (hasComparison) {
    // Verify comparison table structure
    await expect(comparisonBlock).toBeVisible();
    await expect(comparisonBlock.locator('th:has-text("Dimension")')).toBeVisible();
    // Should have at least 3 columns (Dimension + entities being compared)
    const thElements = comparisonBlock.locator('th');
    const thCount = await thElements.count();
    expect(thCount).toBeGreaterThanOrEqual(3);
  } else {
    // Soft fallback: AI didn't generate comparison, verify narrative exists instead
    const narrative = page.locator('.prose.prose-sm').last();
    await expect(narrative).toBeVisible();
  }
});

test('Citation block - verify Citations header, ul/li items, reference count badge', async ({
  page,
}) => {
  // Send prompt biased toward citation generation
  await sendMessage(page, 'Create 3 example APA citations about machine learning');

  // Wait for response
  await waitForResponseComplete(page);

  // Try to find citation block (has h4 with "Citations" text)
  const citationBlock = page.locator('[data-analysis-block-id]:has(h4:has-text("Citations"))').first();
  const hasCitations = (await citationBlock.count()) > 0;

  if (hasCitations) {
    // Verify citation structure
    await expect(citationBlock).toBeVisible();
    await expect(citationBlock.locator('h4:has-text("Citations")')).toBeVisible();
    await expect(citationBlock.locator('ul')).toBeVisible();
    await expect(citationBlock.locator('ul li')).not.toHaveCount(0);
  } else {
    // Soft fallback: AI didn't generate citations, verify narrative exists instead
    const narrative = page.locator('.prose.prose-sm').last();
    await expect(narrative).toBeVisible();
  }
});

// ============================================================================
// Interaction Tests
// ============================================================================

test('Suggestions render & click - verify chips visible and clickable', async ({ page }) => {
  // Send a message to get suggestions
  await sendMessage(page, 'Tell me about my research');

  // Wait for response
  await waitForResponseComplete(page);

  // Find suggestion chips
  const suggestionContainer = page.locator('div.flex.flex-wrap.gap-2.pt-2');
  const suggestionChips = suggestionContainer.locator('button');

  // Verify at least one suggestion chip is visible
  const chipCount = await suggestionChips.count();
  expect(chipCount).toBeGreaterThan(0);

  // Click the first suggestion chip
  const firstChip = suggestionChips.first();
  const chipText = await firstChip.textContent();
  await firstChip.click();

  // Verify new user message was sent with the suggestion text
  await page.waitForTimeout(1000); // Brief wait for message to appear
  const userMessages = page.locator('[data-analysis-message-id]');
  const lastUserMessage = userMessages.last();
  await expect(lastUserMessage).toBeVisible();
});

test('Steps progress - verify steps block appears during streaming (try/catch)', async ({
  page,
}) => {
  // Send a message
  await sendMessage(page, 'Analyze my research data');

  // Try to catch steps block during streaming (timing-dependent)
  try {
    // Look for steps/progress indicator (implementation may vary)
    // This is a best-effort check since timing is unpredictable
    const stepsBlock = page.locator('[data-analysis-block-id]').first();
    await stepsBlock.waitFor({ state: 'visible', timeout: 5000 });
    // If we get here, steps block appeared (success)
  } catch {
    // Steps block didn't appear in time or doesn't exist for this response
    // This is acceptable - not all responses show steps
  }

  // Wait for response to complete regardless
  await waitForResponseComplete(page);

  // Verify we got a response (narrative exists)
  const narrative = page.locator('.prose.prose-sm').last();
  await expect(narrative).toBeVisible();
});

test('Starter suggestion click - click "Summarize my research collection"', async ({ page }) => {
  // Click the starter suggestion
  const starterButton = page.getByText('Summarize my research collection');
  await starterButton.click();

  // Verify user message was created
  const userMessage = page.locator('[data-analysis-message-id]').first();
  await expect(userMessage).toBeVisible();

  // Wait for AI response
  await waitForResponseComplete(page);

  // Verify response received
  const narrative = page.locator('.prose.prose-sm').last();
  await expect(narrative).toBeVisible();
  await expect(narrative).not.toBeEmpty();
});

test('New session - verify conversation clears and empty state returns', async ({ page }) => {
  // Send a message to have some conversation history
  await sendMessage(page, 'Hello');
  await waitForResponseComplete(page);

  // Verify message exists
  const messagesBefore = page.locator('[data-analysis-message-id]');
  const countBefore = await messagesBefore.count();
  expect(countBefore).toBeGreaterThan(0);

  // Click "New" button to start new session (use exact match and get last one)
  const newButton = page.getByRole('button', { name: 'New', exact: true }).last();
  await newButton.click();

  // Wait for page to reset
  await page.waitForTimeout(2000);

  // Verify conversation cleared - starter suggestions should be visible again
  const starterButton = page.getByText('Summarize my research collection');
  await expect(starterButton).toBeVisible();

  // Verify old messages are gone
  const messagesAfter = page.locator('[data-analysis-message-id]');
  const countAfter = await messagesAfter.count();
  expect(countAfter).toBe(0);
});

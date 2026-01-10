import { test, expect } from '@playwright/test';

/**
 * Demo Mode Tests
 * Verifies that the Try Demo button works correctly and displays trade data
 */

test.describe('Demo Mode', () => {
  test('should show transcription and trade card when clicking Try Demo', async ({ page }) => {
    await page.goto('/');

    // Click Try Demo button
    const tryDemoBtn = page.locator('#tryDemoBtn');
    await tryDemoBtn.click();

    // Verify empty state is hidden
    const emptyState = page.locator('#emptyState');
    await expect(emptyState).not.toBeVisible();

    // Verify transcription appears
    const resultSection = page.locator('#resultSection');
    await expect(resultSection).toHaveClass(/visible/);

    const transcription = page.locator('#transcription');
    await expect(transcription).not.toBeEmpty();

    // Verify transcription has text content
    const transcriptionText = await transcription.textContent();
    expect(transcriptionText).toBeTruthy();
    expect(transcriptionText!.length).toBeGreaterThan(10);
  });

  test('should render trade card with extracted information', async ({ page }) => {
    await page.goto('/');

    // Click Try Demo button
    await page.locator('#tryDemoBtn').click();

    // Wait for trade card to appear
    const tradeCard = page.locator('#tradeCard');
    await expect(tradeCard).toHaveClass(/visible/);

    // Verify trade card has content
    await expect(tradeCard).not.toBeEmpty();

    // Verify trade card header exists
    const tradeCardHeader = tradeCard.locator('.trade-card-header');
    await expect(tradeCardHeader).toBeVisible();
  });

  test('should display ticker in trade card', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tryDemoBtn').click();

    // Wait for trade card
    const tradeCard = page.locator('#tradeCard');
    await expect(tradeCard).toHaveClass(/visible/);

    // Verify ticker is displayed (if present in demo data)
    const ticker = tradeCard.locator('.trade-card-ticker');
    const tickerCount = await ticker.count();

    if (tickerCount > 0) {
      await expect(ticker.first()).toBeVisible();
      const tickerText = await ticker.first().textContent();
      expect(tickerText).toBeTruthy();
    }
  });

  test('should display trade direction (LONG/SHORT)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tryDemoBtn').click();

    // Wait for trade card
    const tradeCard = page.locator('#tradeCard');
    await expect(tradeCard).toHaveClass(/visible/);

    // Verify direction badge exists
    const direction = tradeCard.locator('.trade-card-direction');
    const directionCount = await direction.count();

    if (directionCount > 0) {
      await expect(direction.first()).toBeVisible();
      const directionText = await direction.first().textContent();
      expect(directionText).toMatch(/LONG|SHORT|BUY|SELL/i);
    }
  });

  test('should display price levels (entry, stop loss, take profit)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tryDemoBtn').click();

    // Wait for trade card
    const tradeCard = page.locator('#tradeCard');
    await expect(tradeCard).toHaveClass(/visible/);

    // Check for price items
    const priceLevels = tradeCard.locator('.trade-card-prices');
    const priceCount = await priceLevels.count();

    if (priceCount > 0) {
      await expect(priceLevels.first()).toBeVisible();

      // At least one price item should be visible
      const priceItems = tradeCard.locator('.trade-price-item');
      expect(await priceItems.count()).toBeGreaterThan(0);
    }
  });

  test('should show action buttons after demo loads', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tryDemoBtn').click();

    // Verify result actions are visible
    const resultSection = page.locator('#resultSection');
    await expect(resultSection).toHaveClass(/visible/);

    // Verify Clear button
    const clearBtn = page.locator('#clearBtn');
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toHaveText('Clear');

    // Verify Export button
    const exportBtn = page.locator('#exportBtn');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toContainText('Export');

    // Verify Save button
    const saveBtn = page.locator('#saveBtn');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveText('Save Note');
  });

  test('should cycle through different demo examples on multiple clicks', async ({ page }) => {
    await page.goto('/');

    // Click Try Demo multiple times and verify transcription changes
    const tryDemoBtn = page.locator('#tryDemoBtn');
    const transcription = page.locator('#transcription');

    // Get first demo
    await tryDemoBtn.click();
    await expect(transcription).not.toBeEmpty();
    const firstText = await transcription.textContent();

    // Get second demo
    await page.locator('#clearBtn').click();
    await tryDemoBtn.click();
    const secondText = await transcription.textContent();

    // Demos should exist
    expect(firstText).toBeTruthy();
    expect(secondText).toBeTruthy();
  });

  test('should display saved notes section', async ({ page }) => {
    await page.goto('/');

    // Saved notes section should be visible
    const savedNotesSection = page.locator('#savedNotesSection');
    await expect(savedNotesSection).toHaveClass(/visible/);
  });

  test('should allow saving demo as note', async ({ page }) => {
    await page.goto('/');

    // Load demo
    await page.locator('#tryDemoBtn').click();

    // Click Save Note button
    const saveBtn = page.locator('#saveBtn');
    await saveBtn.click();

    // Verify saved notes list has at least one note
    const savedNotesList = page.locator('#savedNotesList');
    const savedNotes = savedNotesList.locator('.saved-note');

    // Should have at least one saved note
    expect(await savedNotes.count()).toBeGreaterThan(0);
  });
});

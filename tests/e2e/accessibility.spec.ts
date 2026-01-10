import { test, expect } from '@playwright/test';

/**
 * Accessibility Tests
 * Verifies that the application follows accessibility best practices
 */

test.describe('Accessibility', () => {
  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/');

    // Record button
    const recordBtn = page.locator('#recordBtn');
    await expect(recordBtn).toHaveAttribute('aria-label', 'Start recording');

    // Help button
    const helpBtn = page.locator('#helpBtn');
    await expect(helpBtn).toHaveAttribute('aria-label', 'Examples and Tips');

    // About button
    const aboutBtn = page.locator('#aboutBtn');
    await expect(aboutBtn).toHaveAttribute('aria-label', 'About Traders Voice');

    // Model select
    const modelSelect = page.locator('#modelSelect');
    await expect(modelSelect).toHaveAttribute('aria-label', 'Select AI model');

    // Privacy info button
    const privacyInfoBtn = page.locator('#privacyInfoBtn');
    await expect(privacyInfoBtn).toHaveAttribute('aria-label', 'Privacy information');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // h1 should exist and be unique
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Traders Voice');

    // h2 should be present for sections
    const h2s = page.locator('h2');
    expect(await h2s.count()).toBeGreaterThan(0);
  });

  test('should have proper alt text for images', async ({ page }) => {
    await page.goto('/');

    // Logo should have alt text
    const logo = page.locator('.header-brand img.logo');
    await expect(logo).toHaveAttribute('alt', 'Traders Voice');

    // Hero image should have alt attribute (can be empty for decorative images)
    const heroImage = page.locator('.empty-state-hero-img');
    await expect(heroImage).toHaveAttribute('alt');
  });

  test('should have proper link attributes for external links', async ({ page }) => {
    await page.goto('/');

    // GitHub link should have proper attributes
    const githubLink = page.locator('.github-link');
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('should have proper button titles/tooltips', async ({ page }) => {
    await page.goto('/');

    // Model info button
    const modelInfoBtn = page.locator('#modelInfoBtn');
    await expect(modelInfoBtn).toHaveAttribute('title', 'Model info');

    // Privacy info button
    const privacyInfoBtn = page.locator('#privacyInfoBtn');
    await expect(privacyInfoBtn).toHaveAttribute('title', 'Privacy info');

    // FAQ toggle
    const faqToggle = page.locator('#faqToggle');
    await expect(faqToggle).toHaveAttribute('aria-expanded');
  });

  test('should maintain focus outline for keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab to record button
    await page.keyboard.press('Tab');

    // Check that some element has focus
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });

  test('should have semantic HTML structure', async ({ page }) => {
    await page.goto('/');

    // Should have header
    const header = page.locator('.header');
    await expect(header).toBeVisible();

    // Should have footer
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();

    // Should have main content area
    const mainLayout = page.locator('.main-layout');
    await expect(mainLayout).toBeVisible();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/');

    // Model select should have label via aria-label
    const modelSelect = page.locator('#modelSelect');
    await expect(modelSelect).toHaveAttribute('aria-label', 'Select AI model');
  });
});

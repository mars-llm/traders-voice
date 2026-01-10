import { test, expect } from '@playwright/test';

/**
 * Page Load Tests
 * Verifies that the page loads correctly with all essential elements visible
 */

test.describe('Page Load', () => {
  test('should load the page and display hero image in empty state', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Traders Voice/);

    // Verify hero section is visible
    const emptyState = page.locator('#emptyState');
    await expect(emptyState).toBeVisible();

    // Verify hero image is present
    const heroImage = page.locator('.empty-state-hero-img');
    await expect(heroImage).toBeVisible();

    // Verify hero text overlay
    await expect(page.locator('.empty-state-headline')).toContainText('Hands-free trade journaling');
    await expect(page.locator('.empty-state-headline')).toContainText('fully local');

    // Verify feature tags
    await expect(page.locator('.feature-tag').filter({ hasText: 'Works Offline' })).toBeVisible();
    await expect(page.locator('.feature-tag').filter({ hasText: 'Structured Output' })).toBeVisible();
  });

  test('should display record button in idle state', async ({ page }) => {
    await page.goto('/');

    // Verify record button is visible and in idle state
    const recordBtn = page.locator('#recordBtn');
    await expect(recordBtn).toBeVisible();
    await expect(recordBtn).toHaveClass(/idle/);

    // Verify status text
    const statusText = page.locator('#statusText');
    await expect(statusText).toHaveText('Click to record');
  });

  test('should display header with logo and title', async ({ page }) => {
    await page.goto('/');

    // Verify logo is visible
    const logo = page.locator('.header-brand img.logo');
    await expect(logo).toBeVisible();

    // Verify title
    await expect(page.locator('h1')).toHaveText('Traders Voice');
  });

  test('should display model selector in header', async ({ page }) => {
    await page.goto('/');

    // Verify model selector is visible
    const modelSelect = page.locator('#modelSelect');
    await expect(modelSelect).toBeVisible();

    // Verify default model is selected
    await expect(modelSelect).toHaveValue('Xenova/whisper-base.en');

    // Verify model info is displayed
    const modelInfo = page.locator('#modelInfo');
    await expect(modelInfo).toBeVisible();
    await expect(page.locator('.model-info-text')).toContainText('English optimized');
  });

  test('should display help and about buttons', async ({ page }) => {
    await page.goto('/');

    // Verify help button
    const helpBtn = page.locator('#helpBtn');
    await expect(helpBtn).toBeVisible();
    await expect(helpBtn).toHaveAttribute('title', 'Examples & Tips');

    // Verify about button
    const aboutBtn = page.locator('#aboutBtn');
    await expect(aboutBtn).toBeVisible();
    await expect(aboutBtn).toHaveAttribute('title', 'About');
  });

  test('should display speaking tips', async ({ page }) => {
    await page.goto('/');

    // Verify speaking tips are visible
    const speakingTips = page.locator('.speaking-tips');
    await expect(speakingTips).toBeVisible();

    // Verify tips content
    await expect(page.locator('.tips-header')).toContainText('For best results');

    // Verify some key tips
    await expect(speakingTips).toContainText('Action first');
    await expect(speakingTips).toContainText('Entry price');
    await expect(speakingTips).toContainText('Risk management');
  });

  test('should display privacy information in footer', async ({ page }) => {
    await page.goto('/');

    // Verify privacy badges in footer
    await expect(page.locator('.footer-privacy')).toContainText('100% Local');
    await expect(page.locator('.footer-privacy')).toContainText('No Tracking');
    await expect(page.locator('.footer-privacy')).toContainText('No Cookies');

    // Verify GitHub link
    const githubLink = page.locator('.github-link');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', /github\.com/);
  });

  test('should display Try Demo button', async ({ page }) => {
    await page.goto('/');

    // Verify Try Demo button is visible
    const tryDemoBtn = page.locator('#tryDemoBtn');
    await expect(tryDemoBtn).toBeVisible();
    await expect(tryDemoBtn).toContainText('Try Demo');
  });

  test('should display keyboard shortcut hint', async ({ page }) => {
    await page.goto('/');

    // Verify keyboard shortcut hint
    const hint = page.locator('.hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('Press Space to start/stop recording');
  });
});

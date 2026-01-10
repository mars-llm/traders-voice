import { test, expect } from '@playwright/test';

/**
 * UI Interactions Tests
 * Verifies that interactive elements work correctly
 */

test.describe('UI Interactions', () => {
  test.describe('FAQ Toggle', () => {
    test('should expand and collapse FAQ section', async ({ page }) => {
      await page.goto('/');

      const faqToggle = page.locator('#faqToggle');
      const faqContent = page.locator('#faqContent');

      // Initially collapsed
      await expect(faqToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(faqContent).not.toHaveClass(/visible/);

      // Click to expand
      await faqToggle.click();
      await expect(faqToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(faqContent).toHaveClass(/visible/);

      // Click to collapse
      await faqToggle.click();
      await expect(faqToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(faqContent).not.toHaveClass(/visible/);
    });

    test('should display FAQ questions and answers when expanded', async ({ page }) => {
      await page.goto('/');

      const faqToggle = page.locator('#faqToggle');
      await faqToggle.click();

      const faqContent = page.locator('#faqContent');
      await expect(faqContent).toHaveClass(/visible/);

      // Verify FAQ items are present
      await expect(faqContent.locator('.faq-item')).toHaveCount(5);

      // Verify some key FAQ questions
      await expect(faqContent).toContainText('microphone permission');
      await expect(faqContent).toContainText('model download');
      await expect(faqContent).toContainText('work offline');
      await expect(faqContent).toContainText('languages');
      await expect(faqContent).toContainText('audio sent anywhere');
    });

    test('should update arrow icon when toggling FAQ', async ({ page }) => {
      await page.goto('/');

      const faqToggle = page.locator('#faqToggle');
      const arrow = faqToggle.locator('.toggle-arrow');

      // Initially should show down arrow
      await expect(arrow).toHaveText('▼');

      // Click to expand
      await faqToggle.click();
      await expect(arrow).toHaveText('▲');

      // Click to collapse
      await faqToggle.click();
      await expect(arrow).toHaveText('▼');
    });
  });

  test.describe('Export Dropdown', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      // Load demo to have content for export
      await page.locator('#tryDemoBtn').click();
      await page.locator('#resultSection').waitFor({ state: 'visible' });
    });

    test('should open and close export dropdown menu', async ({ page }) => {
      const exportDropdown = page.locator('#exportDropdown');
      const exportBtn = page.locator('#exportBtn');
      const exportMenu = page.locator('#exportMenu');

      // Initially closed
      await expect(exportDropdown).not.toHaveClass(/open/);

      // Click to open
      await exportBtn.click();
      await expect(exportDropdown).toHaveClass(/open/);

      // Click outside to close
      await page.locator('body').click({ position: { x: 0, y: 0 } });
      await expect(exportDropdown).not.toHaveClass(/open/);
    });

    test('should display all export format options', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const exportMenu = page.locator('#exportMenu');

      // Verify all export options are present
      await expect(exportMenu.locator('[data-format="text"]')).toBeVisible();
      await expect(exportMenu.locator('[data-format="markdown"]')).toBeVisible();
      await expect(exportMenu.locator('[data-format="json"]')).toBeVisible();

      // Verify text labels
      await expect(exportMenu).toContainText('Plain Text');
      await expect(exportMenu).toContainText('Markdown');
      await expect(exportMenu).toContainText('JSON');
    });

    test('should close dropdown after selecting an export format', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      const exportDropdown = page.locator('#exportDropdown');

      // Open dropdown
      await exportBtn.click();
      await expect(exportDropdown).toHaveClass(/open/);

      // Click an export option
      await page.locator('[data-format="text"]').click();

      // Dropdown should close
      await expect(exportDropdown).not.toHaveClass(/open/);
    });
  });

  test.describe('Model Selection', () => {
    test('should allow changing model selection', async ({ page }) => {
      await page.goto('/');

      const modelSelect = page.locator('#modelSelect');

      // Change to tiny model
      await modelSelect.selectOption('Xenova/whisper-tiny.en');
      await expect(modelSelect).toHaveValue('Xenova/whisper-tiny.en');

      // Change to small model
      await modelSelect.selectOption('Xenova/whisper-small.en');
      await expect(modelSelect).toHaveValue('Xenova/whisper-small.en');

      // Change back to base model
      await modelSelect.selectOption('Xenova/whisper-base.en');
      await expect(modelSelect).toHaveValue('Xenova/whisper-base.en');
    });

    test('should update model info text when changing models', async ({ page }) => {
      await page.goto('/');

      const modelSelect = page.locator('#modelSelect');
      const modelInfoText = page.locator('.model-info-text');

      // Select English-only model
      await modelSelect.selectOption('Xenova/whisper-base.en');
      await expect(modelInfoText).toContainText('English optimized');

      // Select multilingual model
      await modelSelect.selectOption('Xenova/whisper-base');
      await expect(modelInfoText).toContainText('Multi-language → English');

      // Back to English-only
      await modelSelect.selectOption('Xenova/whisper-tiny.en');
      await expect(modelInfoText).toContainText('English optimized');
    });

    test('should have all expected model options', async ({ page }) => {
      await page.goto('/');

      const modelSelect = page.locator('#modelSelect');

      // English-only models
      await expect(modelSelect.locator('option[value="Xenova/whisper-tiny.en"]')).toHaveCount(1);
      await expect(modelSelect.locator('option[value="Xenova/whisper-base.en"]')).toHaveCount(1);
      await expect(modelSelect.locator('option[value="Xenova/whisper-small.en"]')).toHaveCount(1);

      // Multilingual models
      await expect(modelSelect.locator('option[value="Xenova/whisper-tiny"]')).toHaveCount(1);
      await expect(modelSelect.locator('option[value="Xenova/whisper-base"]')).toHaveCount(1);
      await expect(modelSelect.locator('option[value="Xenova/whisper-small"]')).toHaveCount(1);
    });

    test('should show model info tooltip when clicking info button', async ({ page }) => {
      await page.goto('/');

      const modelInfoBtn = page.locator('#modelInfoBtn');

      // Click info button - this opens a native alert dialog
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('alert');
        const message = dialog.message();
        expect(message).toContain('base.en');
        expect(message).toContain('English optimized');
        await dialog.accept();
      });

      await modelInfoBtn.click();
    });
  });

  test.describe('Clear Functionality', () => {
    test('should clear transcription and hide results', async ({ page }) => {
      await page.goto('/');

      // Load demo
      await page.locator('#tryDemoBtn').click();
      const resultSection = page.locator('#resultSection');
      await expect(resultSection).toHaveClass(/visible/);

      // Click Clear
      await page.locator('#clearBtn').click();

      // Verify results are hidden
      await expect(resultSection).not.toHaveClass(/visible/);

      // Verify transcription is empty
      const transcription = page.locator('#transcription');
      await expect(transcription).toBeEmpty();
    });

    test('should hide trade card when clearing', async ({ page }) => {
      await page.goto('/');

      // Load demo
      await page.locator('#tryDemoBtn').click();
      const tradeCard = page.locator('#tradeCard');
      await expect(tradeCard).toHaveClass(/visible/);

      // Click Clear
      await page.locator('#clearBtn').click();

      // Verify trade card is hidden
      await expect(tradeCard).not.toHaveClass(/visible/);
    });

    test('should reset demo cycle when clearing', async ({ page }) => {
      await page.goto('/');

      // Load demo
      await page.locator('#tryDemoBtn').click();
      const transcription = page.locator('#transcription');
      const firstText = await transcription.textContent();

      // Clear
      await page.locator('#clearBtn').click();

      // Load demo again
      await page.locator('#tryDemoBtn').click();
      const secondText = await transcription.textContent();

      // Should have content
      expect(secondText).toBeTruthy();
    });
  });

  test.describe('Saved Notes Section', () => {
    test('should display saved notes header and clear all button', async ({ page }) => {
      await page.goto('/');

      const savedNotesSection = page.locator('#savedNotesSection');
      await expect(savedNotesSection).toHaveClass(/visible/);

      // Verify header
      await expect(savedNotesSection.locator('h2')).toHaveText('Saved Notes');

      // Verify Clear All button
      const clearAllBtn = page.locator('#clearAllNotesBtn');
      await expect(clearAllBtn).toBeVisible();
      await expect(clearAllBtn).toHaveText('Clear All');
    });

    test('should show empty state when no notes are saved', async ({ page }) => {
      // Clear any existing notes first
      await page.goto('/');

      // Clear localStorage
      await page.evaluate(() => {
        localStorage.removeItem('traders-voice-saved-notes');
      });

      // Reload to see empty state
      await page.reload();

      const savedNotesList = page.locator('#savedNotesList');
      await expect(savedNotesList.locator('.saved-notes-empty')).toBeVisible();
      await expect(savedNotesList).toContainText('No saved notes yet');
    });

    test('should display saved notes after saving', async ({ page }) => {
      // Clear existing notes
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('traders-voice-saved-notes');
      });
      await page.reload();

      // Load demo and save
      await page.locator('#tryDemoBtn').click();
      await page.locator('#saveBtn').click();

      // Verify note appears in list
      const savedNotesList = page.locator('#savedNotesList');
      const savedNotes = savedNotesList.locator('.saved-note');
      expect(await savedNotes.count()).toBeGreaterThan(0);

      // Verify note has timestamp
      await expect(savedNotes.first().locator('.saved-note-time')).toBeVisible();

      // Verify note has text
      await expect(savedNotes.first().locator('.saved-note-text')).not.toBeEmpty();
    });

    test('should have copy and delete buttons for each saved note', async ({ page }) => {
      await page.goto('/');

      // Clear and save a note
      await page.evaluate(() => {
        localStorage.removeItem('traders-voice-saved-notes');
      });
      await page.reload();
      await page.locator('#tryDemoBtn').click();
      await page.locator('#saveBtn').click();

      // Verify action buttons
      const firstNote = page.locator('.saved-note').first();
      await expect(firstNote.locator('.copy')).toBeVisible();
      await expect(firstNote.locator('.delete')).toBeVisible();
    });

    test('should delete note when clicking delete button', async ({ page }) => {
      await page.goto('/');

      // Clear and save a note
      await page.evaluate(() => {
        localStorage.removeItem('traders-voice-saved-notes');
      });
      await page.reload();
      await page.locator('#tryDemoBtn').click();
      await page.locator('#saveBtn').click();

      // Get initial count
      const savedNotesList = page.locator('#savedNotesList');
      const initialCount = await savedNotesList.locator('.saved-note').count();
      expect(initialCount).toBeGreaterThan(0);

      // Delete the note
      await savedNotesList.locator('.saved-note').first().locator('.delete').click();

      // Verify note is deleted
      const finalCount = await savedNotesList.locator('.saved-note').count();
      expect(finalCount).toBe(initialCount - 1);
    });
  });

  test.describe('Modals', () => {
    test('should open and close help modal', async ({ page }) => {
      await page.goto('/');

      const helpBtn = page.locator('#helpBtn');
      const helpModal = page.locator('#helpModal');

      // Initially not visible
      await expect(helpModal).not.toHaveClass(/visible/);

      // Open modal
      await helpBtn.click();
      await expect(helpModal).toHaveClass(/visible/);

      // Verify modal content
      await expect(helpModal).toContainText('Examples & Tips');
      await expect(helpModal).toContainText('Crypto Trades');

      // Close modal
      await helpModal.locator('.modal-close').click();
      await expect(helpModal).not.toHaveClass(/visible/);
    });

    test('should open and close about modal', async ({ page }) => {
      await page.goto('/');

      const aboutBtn = page.locator('#aboutBtn');
      const aboutModal = page.locator('#aboutModal');

      // Initially not visible
      await expect(aboutModal).not.toHaveClass(/visible/);

      // Open modal
      await aboutBtn.click();
      await expect(aboutModal).toHaveClass(/visible/);

      // Verify modal content
      await expect(aboutModal).toContainText('About Traders Voice');
      await expect(aboutModal).toContainText('Privacy First');
      await expect(aboutModal).toContainText('100% Local Processing');

      // Close modal via backdrop
      await aboutModal.locator('.modal-backdrop').click();
      await expect(aboutModal).not.toHaveClass(/visible/);
    });

    test('should close modals with Escape key', async ({ page }) => {
      await page.goto('/');

      const helpBtn = page.locator('#helpBtn');
      const helpModal = page.locator('#helpModal');

      // Open modal
      await helpBtn.click();
      await expect(helpModal).toHaveClass(/visible/);

      // Press Escape
      await page.keyboard.press('Escape');
      await expect(helpModal).not.toHaveClass(/visible/);
    });
  });

  test.describe('Trade Card Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.locator('#tryDemoBtn').click();
      await page.locator('#tradeCard').waitFor({ state: 'visible' });
    });

    test('should collapse and expand trade card', async ({ page }) => {
      const tradeCard = page.locator('#tradeCard');
      const collapseBtn = tradeCard.locator('.trade-card-collapse-btn');
      const tradeCardContent = tradeCard.locator('.trade-card-content');

      // Initially expanded
      await expect(tradeCardContent).not.toHaveClass(/trade-card-collapsed/);
      await expect(collapseBtn).toHaveText('▼');

      // Click to collapse
      await collapseBtn.click();
      await expect(tradeCardContent).toHaveClass(/trade-card-collapsed/);
      await expect(collapseBtn).toHaveText('▶');

      // Click to expand
      await collapseBtn.click();
      await expect(tradeCardContent).not.toHaveClass(/trade-card-collapsed/);
      await expect(collapseBtn).toHaveText('▼');
    });
  });
});

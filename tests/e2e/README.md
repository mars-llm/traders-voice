# E2E Tests

Playwright end-to-end tests for Traders Voice application.

## Overview

These tests verify the application's functionality from a user's perspective, covering:

- **Page Load**: Hero image, buttons, model selector, speaking tips
- **Demo Mode**: Try Demo button, transcription display, trade card rendering
- **UI Interactions**: FAQ toggle, export dropdown, model selection, clear functionality
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

## Running Tests

### Install Playwright Browsers

First time setup:

```bash
npx playwright install
```

Or install just Chromium for faster testing:

```bash
npx playwright install chromium
```

### Run All Tests

```bash
npm run test:e2e
```

### Run with UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

This opens Playwright's UI mode where you can:
- See tests run in real-time
- Debug failures
- Step through tests
- View screenshots and traces

### Run in Headed Mode (See the Browser)

```bash
npm run test:e2e:headed
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### Run Specific Test File

```bash
npx playwright test page-load.spec.ts
```

### Run Specific Test

```bash
npx playwright test -g "should display hero image"
```

## Test Structure

```
tests/e2e/
├── page-load.spec.ts        # Initial page load and element visibility
├── demo-mode.spec.ts         # Try Demo button and demo data rendering
├── ui-interactions.spec.ts   # Interactive elements (FAQ, export, etc.)
└── accessibility.spec.ts     # ARIA labels, semantic HTML, a11y
```

## What We Don't Test

- **Actual recording**: Requires microphone permission, tested manually
- **Model loading**: Downloads large models, tested manually
- **Transcription accuracy**: AI model behavior, out of scope

## Writing New Tests

Follow Playwright best practices:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    await page.goto('/');

    const element = page.locator('#elementId');
    await expect(element).toBeVisible();
  });
});
```

## Debugging Failed Tests

1. **Check the HTML report**: Opens automatically after test failure
2. **Use UI mode**: `npm run test:e2e:ui` - best for debugging
3. **Run in headed mode**: `npm run test:e2e:headed` - see browser actions
4. **Enable debug mode**: `npm run test:e2e:debug` - step through tests

## CI/CD Integration

Tests automatically run in CI with:
- Retry on failure (2 retries)
- Sequential execution (no parallel)
- HTML report generation
- Screenshots on failure

## Browser Configuration

Tests run on:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

Configure in `playwright.config.ts` to change browsers.

## Notes

- Tests run against `localhost:5174` (Vite dev server)
- Dev server starts automatically before tests
- Tests use demo mode to avoid microphone requirements
- LocalStorage is cleared between some tests to ensure clean state

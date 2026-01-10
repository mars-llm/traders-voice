# E2E Test Setup Instructions

Quick setup guide for Playwright E2E tests in Traders Voice.

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

## Installation

### 1. Install Dependencies

Dependencies are already installed via npm. Verify with:

```bash
npm list @playwright/test
```

Should show: `@playwright/test@1.57.0` (or similar)

### 2. Install Playwright Browsers

Install all browsers (Chromium, Firefox, WebKit):

```bash
npx playwright install
```

Or install just Chromium for faster setup:

```bash
npx playwright install chromium
```

### 3. Verify Installation

Run a quick test to verify setup:

```bash
npm run test:e2e -- page-load.spec.ts
```

This should:
1. Start the dev server at localhost:5174
2. Run page load tests
3. Generate HTML report
4. Show passing tests

## First Run

### Option 1: UI Mode (Recommended)

```bash
npm run test:e2e:ui
```

This opens Playwright's interactive UI where you can:
- See all tests
- Run tests individually
- Watch tests execute
- Debug failures

### Option 2: Command Line

```bash
npm run test:e2e
```

Runs all tests in headless mode and generates a report.

## Troubleshooting

### Port Already in Use

If you see "Port 5174 already in use":

1. Stop any running dev server:
   ```bash
   pkill -f "vite"
   ```

2. Or use a different port in `playwright.config.ts`:
   ```typescript
   webServer: {
     command: 'npm run dev -- --port 5175',
     url: 'http://localhost:5175',
   }
   ```

### Browser Not Installed

If you see "Executable doesn't exist":

```bash
npx playwright install
```

### Tests Timing Out

If tests timeout:

1. Increase timeout in `playwright.config.ts`:
   ```typescript
   timeout: 60000, // 60 seconds
   ```

2. Or run with headed mode to see what's happening:
   ```bash
   npm run test:e2e:headed
   ```

### Dev Server Not Starting

Check that your dev server works:

```bash
npm run dev
```

Visit http://localhost:5174 in your browser. If the app loads, tests should work.

## Running Specific Tests

### Single Test File

```bash
npx playwright test page-load.spec.ts
```

### Single Test Case

```bash
npx playwright test -g "should display hero image"
```

### Single Browser

```bash
npx playwright test --project=chromium
```

## Environment Variables

Set environment variables for CI/CD:

```bash
# Enable CI mode (retries, sequential execution)
CI=true npm run test:e2e

# Debug mode
DEBUG=pw:api npm run test:e2e
```

## Next Steps

1. ✅ Run tests: `npm run test:e2e:ui`
2. ✅ Review test coverage: See `TEST_COVERAGE.md`
3. ✅ Read test documentation: See `README.md`
4. ✅ Write new tests: Follow examples in `*.spec.ts` files

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all tests (headless) |
| `npm run test:e2e:ui` | Open UI mode (best for dev) |
| `npm run test:e2e:headed` | Run with visible browser |
| `npm run test:e2e:debug` | Debug mode (step through) |
| `npx playwright codegen localhost:5174` | Generate test code |
| `npx playwright show-report` | View last test report |

## Support

For Playwright documentation: https://playwright.dev/

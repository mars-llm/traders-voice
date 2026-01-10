# E2E Test Coverage

This document outlines the complete test coverage for Traders Voice E2E tests.

## Test Files

### 1. page-load.spec.ts (9 tests)

Tests that verify the initial page load and static content.

- ✅ Page loads with hero image in empty state
- ✅ Record button displays in idle state
- ✅ Header shows logo and title
- ✅ Model selector displays with correct default selection
- ✅ Help and About buttons are visible
- ✅ Speaking tips section displays
- ✅ Privacy information in footer displays
- ✅ Try Demo button is visible
- ✅ Keyboard shortcut hint displays

### 2. demo-mode.spec.ts (9 tests)

Tests the demo functionality without requiring microphone access.

- ✅ Try Demo button shows transcription and trade card
- ✅ Trade card renders with extracted information
- ✅ Ticker displays in trade card
- ✅ Trade direction (LONG/SHORT) displays
- ✅ Price levels (entry, stop loss, take profit) display
- ✅ Action buttons appear after demo loads
- ✅ Demo cycles through different examples
- ✅ Saved notes section displays
- ✅ Can save demo as note

### 3. ui-interactions.spec.ts (30+ tests)

Tests interactive UI elements and user workflows.

#### FAQ Toggle (3 tests)
- ✅ FAQ expands and collapses
- ✅ FAQ questions and answers display when expanded
- ✅ Arrow icon updates when toggling

#### Export Dropdown (3 tests)
- ✅ Dropdown opens and closes
- ✅ All export format options display
- ✅ Dropdown closes after selecting format

#### Model Selection (4 tests)
- ✅ Can change model selection
- ✅ Model info text updates when changing models
- ✅ All expected model options available
- ✅ Model info tooltip displays

#### Clear Functionality (3 tests)
- ✅ Clear button hides results and empties transcription
- ✅ Trade card hides when clearing
- ✅ Demo cycle resets when clearing

#### Saved Notes Section (6 tests)
- ✅ Header and Clear All button display
- ✅ Empty state shows when no notes saved
- ✅ Saved notes display after saving
- ✅ Copy and Delete buttons on each note
- ✅ Delete button removes note
- ✅ Notes persist in localStorage

#### Modals (3 tests)
- ✅ Help modal opens and closes
- ✅ About modal opens and closes
- ✅ Modals close with Escape key

#### Trade Card Interactions (1 test)
- ✅ Trade card collapses and expands

### 4. accessibility.spec.ts (8 tests)

Tests accessibility features and ARIA compliance.

- ✅ ARIA labels on interactive elements
- ✅ Proper heading hierarchy
- ✅ Alt text for images
- ✅ External link attributes (target, rel)
- ✅ Button titles and tooltips
- ✅ Focus outline for keyboard navigation
- ✅ Semantic HTML structure
- ✅ Form labels

## Total Test Count

**59+ E2E tests** covering critical user workflows and UI interactions.

## Not Covered by E2E Tests

The following are intentionally excluded:

### Requires Manual Testing
- **Actual microphone recording**: Requires browser permission
- **Model download and loading**: Large file downloads (39-244MB)
- **Audio transcription**: AI model inference timing

### Covered by Unit Tests
- Trade information extraction logic
- Price level chart generation
- Saved notes data management
- Export format generation

### Out of Scope
- Transcription accuracy (AI model behavior)
- Performance benchmarks
- Cross-browser rendering differences (handled by Playwright's browser matrix)

## Browser Coverage

Tests run on 3 browsers:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

Total test runs per suite: **59 tests × 3 browsers = 177 test executions**

## Critical User Paths

All critical user paths are covered:

1. ✅ **Page Load** → User visits site
2. ✅ **Demo Mode** → User tries demo without recording
3. ✅ **View Trade Data** → User sees extracted trade information
4. ✅ **Export Data** → User copies data in different formats
5. ✅ **Save Notes** → User saves notes locally
6. ✅ **Model Selection** → User changes AI model
7. ✅ **Access Help** → User opens help/about modals
8. ✅ **View Privacy Info** → User checks privacy details

## Test Execution Time

Approximate execution time:
- Single browser: ~30-60 seconds
- All browsers (3): ~2-3 minutes
- CI with retries: ~5-10 minutes

## Maintenance Notes

- Tests use demo mode to avoid microphone requirements
- LocalStorage is cleared in specific tests to ensure clean state
- Tests wait for elements to be visible before assertions
- Selectors use IDs and test-friendly classes for stability

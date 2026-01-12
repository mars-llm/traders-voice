import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initTheme, toggleTheme, setupThemeToggle } from './theme.js';

describe('Theme System', () => {
  let mockLocalStorage;
  let mockMatchMedia;
  let mockDocument;

  beforeEach(() => {
    // Mock localStorage
    const storage = new Map();
    mockLocalStorage = {
      getItem: vi.fn((key) => storage.get(key) || null),
      setItem: vi.fn((key, value) => storage.set(key, value)),
      clear: () => storage.clear(),
    };
    global.localStorage = mockLocalStorage;

    // Mock window.matchMedia
    mockMatchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    global.window.matchMedia = mockMatchMedia;

    // Mock document
    mockDocument = {
      documentElement: {
        getAttribute: vi.fn(() => 'dark'),
        setAttribute: vi.fn(),
      },
      body: {
        classList: {
          add: vi.fn(),
        },
      },
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({
        style: {},
        querySelector: vi.fn(() => null),
      })),
    };
    global.document = mockDocument;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      cb();
      return 1;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initTheme', () => {
    it('uses saved theme from localStorage', () => {
      mockLocalStorage.setItem('traders-voice-theme', 'light');

      const theme = initTheme();

      expect(theme).toBe('light');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('defaults to dark when no saved theme and system prefers dark', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
      });

      const theme = initTheme();

      expect(theme).toBe('dark');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('defaults to light when no saved theme and system prefers light', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
      });

      const theme = initTheme();

      expect(theme).toBe('light');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('enables theme transitions after initial load', () => {
      initTheme();

      expect(global.requestAnimationFrame).toHaveBeenCalled();
      expect(mockDocument.body.classList.add).toHaveBeenCalledWith('theme-transitions-enabled');
    });

    it('checks system preference via matchMedia', () => {
      initTheme();

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('saved theme takes precedence over system preference', () => {
      mockLocalStorage.setItem('traders-voice-theme', 'light');
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
      });

      const theme = initTheme();

      expect(theme).toBe('light'); // Saved preference wins
    });
  });

  describe('toggleTheme', () => {
    it('switches from dark to light', () => {
      mockDocument.documentElement.getAttribute = vi.fn(() => 'dark');

      const newTheme = toggleTheme();

      expect(newTheme).toBe('light');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('traders-voice-theme', 'light');
    });

    it('switches from light to dark', () => {
      mockDocument.documentElement.getAttribute = vi.fn(() => 'light');

      const newTheme = toggleTheme();

      expect(newTheme).toBe('dark');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('traders-voice-theme', 'dark');
    });

    it('defaults to dark when no current theme is set', () => {
      mockDocument.documentElement.getAttribute = vi.fn(() => null);

      const newTheme = toggleTheme();

      expect(newTheme).toBe('light'); // null defaults to dark, then toggles to light
    });

    it('persists theme choice to localStorage', () => {
      mockDocument.documentElement.getAttribute = vi.fn(() => 'dark');

      toggleTheme();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('traders-voice-theme', 'light');
    });
  });

  describe('updateThemeIcon (via initTheme and toggleTheme)', () => {
    it('shows sun icon when theme is dark', () => {
      const mockSunIcon = { style: { display: '' } };
      const mockMoonIcon = { style: { display: '' } };
      const mockButton = {
        querySelector: vi.fn((selector) => {
          if (selector === '.theme-icon-sun') return mockSunIcon;
          if (selector === '.theme-icon-moon') return mockMoonIcon;
          return null;
        }),
      };

      mockDocument.getElementById = vi.fn((id) => {
        if (id === 'themeToggle') return mockButton;
        return null;
      });

      mockLocalStorage.setItem('traders-voice-theme', 'dark');
      initTheme();

      expect(mockSunIcon.style.display).toBe('block');
      expect(mockMoonIcon.style.display).toBe('none');
    });

    it('shows moon icon when theme is light', () => {
      const mockSunIcon = { style: { display: '' } };
      const mockMoonIcon = { style: { display: '' } };
      const mockButton = {
        querySelector: vi.fn((selector) => {
          if (selector === '.theme-icon-sun') return mockSunIcon;
          if (selector === '.theme-icon-moon') return mockMoonIcon;
          return null;
        }),
      };

      mockDocument.getElementById = vi.fn((id) => {
        if (id === 'themeToggle') return mockButton;
        return null;
      });

      mockLocalStorage.setItem('traders-voice-theme', 'light');
      initTheme();

      expect(mockSunIcon.style.display).toBe('none');
      expect(mockMoonIcon.style.display).toBe('block');
    });

    it('handles missing theme toggle button gracefully', () => {
      mockDocument.getElementById = vi.fn(() => null);

      expect(() => initTheme()).not.toThrow();
    });

    it('handles missing icon elements gracefully', () => {
      const mockButton = {
        querySelector: vi.fn(() => null),
      };

      mockDocument.getElementById = vi.fn((id) => {
        if (id === 'themeToggle') return mockButton;
        return null;
      });

      expect(() => initTheme()).not.toThrow();
    });
  });

  describe('setupThemeToggle', () => {
    it('attaches click handler to theme toggle button', () => {
      const mockButton = {
        addEventListener: vi.fn(),
      };

      mockDocument.getElementById = vi.fn((id) => {
        if (id === 'themeToggle') return mockButton;
        return null;
      });

      setupThemeToggle();

      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', toggleTheme);
    });

    it('handles missing theme toggle button gracefully', () => {
      mockDocument.getElementById = vi.fn(() => null);

      expect(() => setupThemeToggle()).not.toThrow();
    });

    it('sets up system theme change listener', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn(),
      };

      mockMatchMedia.mockReturnValue(mockMediaQuery);

      setupThemeToggle();

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('auto-updates theme when system preference changes and no manual preference set', () => {
      let changeHandler;
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn((event, handler) => {
          if (event === 'change') changeHandler = handler;
        }),
      };

      mockMatchMedia.mockReturnValue(mockMediaQuery);
      mockLocalStorage.getItem = vi.fn(() => null); // No saved preference

      setupThemeToggle();

      // Simulate system change to dark
      changeHandler({ matches: true });

      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('does not auto-update theme when user has manual preference', () => {
      let changeHandler;
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn((event, handler) => {
          if (event === 'change') changeHandler = handler;
        }),
      };

      mockMatchMedia.mockReturnValue(mockMediaQuery);
      mockLocalStorage.getItem = vi.fn(() => 'light'); // User has saved preference

      setupThemeToggle();

      const setAttributeCalls = mockDocument.documentElement.setAttribute.mock.calls.length;

      // Simulate system change to dark
      changeHandler({ matches: true });

      // Should not have called setAttribute again
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledTimes(setAttributeCalls);
    });
  });

  describe('Integration: Theme Persistence', () => {
    it('persists theme across init and toggle', () => {
      // Initialize with dark theme
      mockLocalStorage.setItem('traders-voice-theme', 'dark');
      const initialTheme = initTheme();
      expect(initialTheme).toBe('dark');

      // Toggle to light
      mockDocument.documentElement.getAttribute = vi.fn(() => 'dark');
      const newTheme = toggleTheme();
      expect(newTheme).toBe('light');

      // Verify persistence
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('traders-voice-theme', 'light');
    });

    it('loads persisted theme on subsequent init', () => {
      // Simulate previous session
      mockLocalStorage.setItem('traders-voice-theme', 'light');

      // New session
      const theme = initTheme();

      expect(theme).toBe('light');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid theme value in localStorage', () => {
      mockLocalStorage.setItem('traders-voice-theme', 'invalid');

      const theme = initTheme();

      // Should still set the invalid value (no validation in current implementation)
      expect(theme).toBe('invalid');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'invalid');
    });

    it('handles empty string theme in localStorage', () => {
      mockLocalStorage.setItem('traders-voice-theme', '');

      const theme = initTheme();

      // Empty string is falsy, so should fall back to system preference
      expect(mockMatchMedia).toHaveBeenCalled();
    });
  });
});

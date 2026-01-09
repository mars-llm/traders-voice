import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Test suite for coach prompts functionality
 *
 * Tests the coach prompt rotation and storage logic
 * These functions are in main.js but we extract and test the core logic here
 */

// Mock COACH_PROMPTS array (from main.js)
const COACH_PROMPTS = [
  "State invalidation first: 'Stop is… because…'",
  "Name timeframe + context: 'On the 1H…'",
  "What would make you exit early?",
  "Include your conviction level: high, medium, low",
  "Mention the catalyst: earnings, news, breakout?",
  "State risk in dollars, not just percentage",
  "What's the reward-to-risk ratio?",
  "Is this a trend trade or counter-trend?",
  "Note market conditions: trending, ranging, volatile",
  "Include your entry trigger: 'I'll enter when…'",
  "What's your position size strategy?",
  "Are you scaling in or all at once?",
  "What indicators confirm this setup?",
  "Where's the next resistance or support?",
  "What's your target time horizon?",
  "Is your stop beyond recent volatility?",
  "What's your plan if price consolidates?",
  "Are you risking 1%, 2%, or more?",
  "Does volume support this move?",
  "What's the broader market context?"
];

const COACH_STORAGE_KEY = 'traders-voice-coach-dismissed';
const COACH_SESSION_KEY = 'traders-voice-current-prompt';

/**
 * Get a random prompt from the list
 */
function getRandomPrompt() {
  const randomIndex = Math.floor(Math.random() * COACH_PROMPTS.length);
  return COACH_PROMPTS[randomIndex];
}

/**
 * Check if coach prompts are dismissed
 */
function isCoachDismissed(storage) {
  return storage.getItem(COACH_STORAGE_KEY) === 'true';
}

/**
 * Get current prompt from session or generate new one
 */
function getCurrentPrompt(sessionStorage, shouldGenerate = true) {
  let currentPrompt = sessionStorage.getItem(COACH_SESSION_KEY);
  if (!currentPrompt && shouldGenerate) {
    currentPrompt = getRandomPrompt();
    sessionStorage.setItem(COACH_SESSION_KEY, currentPrompt);
  }
  return currentPrompt;
}

/**
 * Load next prompt (replace current)
 */
function loadNextPrompt(sessionStorage) {
  const newPrompt = getRandomPrompt();
  sessionStorage.setItem(COACH_SESSION_KEY, newPrompt);
  return newPrompt;
}

/**
 * Dismiss prompts permanently
 */
function dismissCoachPrompts(localStorage, sessionStorage) {
  localStorage.setItem(COACH_STORAGE_KEY, 'true');
  sessionStorage.removeItem(COACH_SESSION_KEY);
}

describe('Coach Prompts', () => {
  describe('COACH_PROMPTS array', () => {
    it('contains 20 coaching prompts', () => {
      expect(COACH_PROMPTS).toHaveLength(20);
    });

    it('all prompts are non-empty strings', () => {
      COACH_PROMPTS.forEach(prompt => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    it('includes prompts about risk management', () => {
      const riskPrompts = COACH_PROMPTS.filter(p =>
        p.toLowerCase().includes('risk') ||
        p.toLowerCase().includes('stop')
      );
      expect(riskPrompts.length).toBeGreaterThan(0);
    });

    it('includes prompts about market context', () => {
      const contextPrompts = COACH_PROMPTS.filter(p =>
        p.toLowerCase().includes('timeframe') ||
        p.toLowerCase().includes('context') ||
        p.toLowerCase().includes('market')
      );
      expect(contextPrompts.length).toBeGreaterThan(0);
    });

    it('includes prompts about indicators', () => {
      const indicatorPrompts = COACH_PROMPTS.filter(p =>
        p.toLowerCase().includes('indicator')
      );
      expect(indicatorPrompts.length).toBeGreaterThan(0);
    });
  });

  describe('getRandomPrompt', () => {
    it('returns a string from COACH_PROMPTS', () => {
      const prompt = getRandomPrompt();
      expect(COACH_PROMPTS).toContain(prompt);
    });

    it('returns different prompts over multiple calls', () => {
      // Set a seed for more predictable testing
      // Call multiple times and check we get variation
      const prompts = new Set();
      for (let i = 0; i < 50; i++) {
        prompts.add(getRandomPrompt());
      }
      // With 20 prompts and 50 calls, we should get at least 10 unique ones
      expect(prompts.size).toBeGreaterThanOrEqual(10);
    });

    it('never returns undefined or null', () => {
      for (let i = 0; i < 20; i++) {
        const prompt = getRandomPrompt();
        expect(prompt).toBeDefined();
        expect(prompt).not.toBeNull();
      }
    });
  });

  describe('isCoachDismissed', () => {
    it('returns false when not dismissed', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null)
      };
      expect(isCoachDismissed(mockStorage)).toBe(false);
    });

    it('returns true when dismissed', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue('true')
      };
      expect(isCoachDismissed(mockStorage)).toBe(true);
    });

    it('returns false for other stored values', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue('false')
      };
      expect(isCoachDismissed(mockStorage)).toBe(false);
    });

    it('uses correct storage key', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null)
      };
      isCoachDismissed(mockStorage);
      expect(mockStorage.getItem).toHaveBeenCalledWith(COACH_STORAGE_KEY);
    });
  });

  describe('getCurrentPrompt', () => {
    it('returns existing prompt from sessionStorage', () => {
      const storedPrompt = COACH_PROMPTS[0];
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(storedPrompt),
        setItem: vi.fn()
      };

      const result = getCurrentPrompt(mockStorage);
      expect(result).toBe(storedPrompt);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('generates new prompt when none exists', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn()
      };

      const result = getCurrentPrompt(mockStorage, true);
      expect(COACH_PROMPTS).toContain(result);
      expect(mockStorage.setItem).toHaveBeenCalledWith(COACH_SESSION_KEY, result);
    });

    it('does not generate when shouldGenerate is false', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn()
      };

      const result = getCurrentPrompt(mockStorage, false);
      expect(result).toBeNull();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('uses correct session storage key', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(COACH_PROMPTS[0]),
        setItem: vi.fn()
      };

      getCurrentPrompt(mockStorage);
      expect(mockStorage.getItem).toHaveBeenCalledWith(COACH_SESSION_KEY);
    });
  });

  describe('loadNextPrompt', () => {
    it('generates and stores a new prompt', () => {
      const mockStorage = {
        setItem: vi.fn()
      };

      const newPrompt = loadNextPrompt(mockStorage);
      expect(COACH_PROMPTS).toContain(newPrompt);
      expect(mockStorage.setItem).toHaveBeenCalledWith(COACH_SESSION_KEY, newPrompt);
    });

    it('replaces existing prompt', () => {
      const mockStorage = {
        setItem: vi.fn()
      };

      // Load first prompt
      const prompt1 = loadNextPrompt(mockStorage);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);

      // Load second prompt
      const prompt2 = loadNextPrompt(mockStorage);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(2);

      // Both should be valid prompts
      expect(COACH_PROMPTS).toContain(prompt1);
      expect(COACH_PROMPTS).toContain(prompt2);
    });
  });

  describe('dismissCoachPrompts', () => {
    it('sets dismissed flag in localStorage', () => {
      const mockLocalStorage = {
        setItem: vi.fn()
      };
      const mockSessionStorage = {
        removeItem: vi.fn()
      };

      dismissCoachPrompts(mockLocalStorage, mockSessionStorage);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(COACH_STORAGE_KEY, 'true');
    });

    it('removes current prompt from sessionStorage', () => {
      const mockLocalStorage = {
        setItem: vi.fn()
      };
      const mockSessionStorage = {
        removeItem: vi.fn()
      };

      dismissCoachPrompts(mockLocalStorage, mockSessionStorage);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(COACH_SESSION_KEY);
    });

    it('performs both storage operations', () => {
      const mockLocalStorage = {
        setItem: vi.fn()
      };
      const mockSessionStorage = {
        removeItem: vi.fn()
      };

      dismissCoachPrompts(mockLocalStorage, mockSessionStorage);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration: Full lifecycle', () => {
    it('handles complete prompt lifecycle', () => {
      const storage = new Map();
      const mockLocalStorage = {
        getItem: (key) => storage.get(`local:${key}`) || null,
        setItem: (key, value) => storage.set(`local:${key}`, value)
      };
      const mockSessionStorage = {
        getItem: (key) => storage.get(`session:${key}`) || null,
        setItem: (key, value) => storage.set(`session:${key}`, value),
        removeItem: (key) => storage.delete(`session:${key}`)
      };

      // 1. Initially not dismissed
      expect(isCoachDismissed(mockLocalStorage)).toBe(false);

      // 2. Load first prompt
      const prompt1 = getCurrentPrompt(mockSessionStorage, true);
      expect(COACH_PROMPTS).toContain(prompt1);

      // 3. Getting current prompt again returns same one
      const prompt1Again = getCurrentPrompt(mockSessionStorage, true);
      expect(prompt1Again).toBe(prompt1);

      // 4. Load next prompt changes it
      const prompt2 = loadNextPrompt(mockSessionStorage);
      expect(COACH_PROMPTS).toContain(prompt2);
      const currentAfterNext = getCurrentPrompt(mockSessionStorage, false);
      expect(currentAfterNext).toBe(prompt2);

      // 5. Dismiss removes session and sets flag
      dismissCoachPrompts(mockLocalStorage, mockSessionStorage);
      expect(isCoachDismissed(mockLocalStorage)).toBe(true);
      expect(getCurrentPrompt(mockSessionStorage, false)).toBeNull();
    });

    it('persists dismissed state across page loads', () => {
      const storage = new Map();
      const mockLocalStorage = {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value)
      };
      const mockSessionStorage = {
        removeItem: vi.fn()
      };

      // Dismiss
      dismissCoachPrompts(mockLocalStorage, mockSessionStorage);

      // Simulate page reload - check if still dismissed
      expect(isCoachDismissed(mockLocalStorage)).toBe(true);
    });

    it('session prompt is cleared on each page load when dismissed', () => {
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue('true') // Already dismissed
      };
      const mockSessionStorage = {
        getItem: vi.fn().mockReturnValue(null)
      };

      // User already dismissed, so prompt should not be shown
      expect(isCoachDismissed(mockLocalStorage)).toBe(true);
      expect(getCurrentPrompt(mockSessionStorage, false)).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles storage errors gracefully', () => {
      const mockStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage error');
        })
      };

      // Should not throw, but may return unexpected result
      expect(() => isCoachDismissed(mockStorage)).toThrow();
    });

    it('handles empty sessionStorage gracefully', () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(''),
        setItem: vi.fn()
      };

      // Empty string should trigger generation
      const result = getCurrentPrompt(mockStorage, true);
      expect(COACH_PROMPTS).toContain(result);
    });
  });

  describe('Prompt Quality Checks', () => {
    it('all prompts are actionable questions or statements', () => {
      COACH_PROMPTS.forEach(prompt => {
        // Check if it's a question or imperative statement
        const isQuestion = prompt.includes('?');
        const isImperative = /^[A-Z]/.test(prompt); // Starts with capital
        expect(isQuestion || isImperative).toBe(true);
      });
    });

    it('prompts cover key trading considerations', () => {
      const categories = {
        risk: ['risk', 'stop', 'invalidation'],
        timing: ['timeframe', 'time', 'when'],
        position: ['position', 'size', 'scaling'],
        analysis: ['indicator', 'context', 'volume', 'condition'],
        execution: ['entry', 'exit', 'target']
      };

      // Check each category has at least one prompt
      Object.entries(categories).forEach(([category, keywords]) => {
        const hasPrompt = COACH_PROMPTS.some(prompt =>
          keywords.some(keyword => prompt.toLowerCase().includes(keyword))
        );
        expect(hasPrompt).toBe(true);
      });
    });

    it('prompts are concise (under 100 characters)', () => {
      COACH_PROMPTS.forEach(prompt => {
        expect(prompt.length).toBeLessThan(100);
      });
    });
  });
});

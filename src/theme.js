/**
 * Theme Toggle System for Traders Voice
 * Handles dark/light mode switching with localStorage persistence
 */

/**
 * Initialize theme system based on user preference or system preference
 */
export function initTheme() {
  const savedTheme = localStorage.getItem('traders-voice-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);

  // Enable transitions after initial load (avoid flash)
  requestAnimationFrame(() => {
    document.body.classList.add('theme-transitions-enabled');
  });

  return theme;
}

/**
 * Toggle between dark and light themes
 */
export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('traders-voice-theme', newTheme);
  updateThemeIcon(newTheme);

  return newTheme;
}

/**
 * Update theme toggle button icon
 */
function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const sunIcon = themeToggle.querySelector('.theme-icon-sun');
  const moonIcon = themeToggle.querySelector('.theme-icon-moon');
  if (!sunIcon || !moonIcon) return;

  const isDark = theme === 'dark';
  sunIcon.style.display = isDark ? 'block' : 'none';
  moonIcon.style.display = isDark ? 'none' : 'block';
}

/**
 * Setup theme toggle handlers
 */
export function setupThemeToggle() {
  // Theme toggle button handler
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-update if user hasn't manually set a preference
    if (!localStorage.getItem('traders-voice-theme')) {
      const theme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      updateThemeIcon(theme);
    }
  });
}

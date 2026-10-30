export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Applies the selected theme ('system', 'light', or 'dark') to the document root and body.
 * Returns the resolved effective theme ('light' or 'dark').
 */
export function applyTheme(themeMode: ThemeMode = 'system'): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';

  let effectiveTheme: 'light' | 'dark';

  if (themeMode === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = prefersDark ? 'dark' : 'light';
  } else {
    effectiveTheme = themeMode;
  }

  const root = document.documentElement;
  const body = document.body;

  if (effectiveTheme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    if (body) {
      body.classList.add('light');
      body.classList.remove('dark');
    }
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    if (body) {
      body.classList.add('dark');
      body.classList.remove('light');
    }
  }

  return effectiveTheme;
}

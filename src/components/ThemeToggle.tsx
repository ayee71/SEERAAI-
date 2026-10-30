import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeMode, applyTheme } from '../utils/theme';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('seera_theme_mode') as ThemeMode) || 'system');

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('seera_theme_mode', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next: Record<ThemeMode, ThemeMode> = {
      system: 'light',
      light: 'dark',
      dark: 'system'
    };
    setTheme(next[theme]);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-amber-300 hover:text-amber-200 text-xs font-semibold cursor-pointer transition-all shadow-sm group"
      title={`Theme: ${theme}`}
    >
      {theme === 'system' && <Monitor className="w-4 h-4" />}
      {theme === 'light' && <Sun className="w-4 h-4" />}
      {theme === 'dark' && <Moon className="w-4 h-4" />}
      <span className="hidden md:inline font-mono text-[10px] text-amber-400 capitalize">
        {theme}
      </span>
    </button>
  );
};

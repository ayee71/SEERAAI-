import { useEffect, useCallback } from 'react';

export interface ShortcutHandlers {
  onOpenSearch: () => void;
  onSave: () => void;
  onPrint: () => void;
  onOpenHelp: () => void;
  onCloseModals: () => void;
  onNavigateTab: (tab: string) => void;
}

export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  const { onOpenSearch, onSave, onPrint, onOpenHelp, onCloseModals, onNavigateTab } = handlers;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isMod = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      // 1. Ctrl+K or Cmd+K: Open Search / Command Palette (Global everywhere)
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        onOpenSearch();
        return;
      }

      // 2. Ctrl+S or Cmd+S: Quick Save (Global everywhere, prevent browser "Save Page As HTML")
      if (isMod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        onSave();
        return;
      }

      // 3. Ctrl+P or Cmd+P: Quick Print / PDF Export (Global everywhere, trigger legal print)
      if (isMod && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        onPrint();
        return;
      }

      // 4. Ctrl+/ or Cmd+/: Open Keyboard Shortcuts Help Cheat Sheet
      if (isMod && e.key === '/') {
        e.preventDefault();
        e.stopPropagation();
        onOpenHelp();
        return;
      }

      // 5. Escape: Close open modals / dialogs / palette
      if (e.key === 'Escape') {
        onCloseModals();
        return;
      }

      // 6. Alt+1 through Alt+7: Fast tab navigation
      if (e.altKey && !isMod) {
        const keyMap: Record<string, string> = {
          '1': 'home',
          '2': 'explainLaw',
          '3': 'cassation',
          '4': 'docAnalysis',
          '5': 'create',
          '6': 'translate',
          '7': 'myContent',
        };

        if (keyMap[e.key]) {
          e.preventDefault();
          onNavigateTab(keyMap[e.key]);
          return;
        }
      }

      // 7. '?' key when NOT focused on an input: Show shortcuts cheat sheet
      if (!isInput && e.key === '?' && !isMod && !e.altKey) {
        e.preventDefault();
        onOpenHelp();
        return;
      }
    },
    [onOpenSearch, onSave, onPrint, onOpenHelp, onCloseModals, onNavigateTab]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

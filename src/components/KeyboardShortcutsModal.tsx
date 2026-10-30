import React from 'react';
import { Language } from '../i18n/translations';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  currentLang,
}) => {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      title: currentLang === 'om' ? '🔍 Barbaacha & Command Palette' : currentLang === 'am' ? '🔍 ፍለጋ እና ትዕዛዞች' : '🔍 Global Search & Command',
      shortcuts: [
        {
          keys: [`${modKey}`, 'K'],
          label: currentLang === 'om' ? 'Command Palette & Barbaacha Waliigalaa' : currentLang === 'am' ? 'የትዕዛዝ ሰሌዳ እና አጠቃላይ ፍለጋ' : 'Open Command Palette & Global Search',
          desc: 'Search tools, cassation precedents, statutes, and templates anywhere.',
        },
        {
          keys: [`${modKey}`, '/'],
          label: currentLang === 'om' ? 'Qaxxaamura Qubee (Shortcuts Cheat Sheet)' : currentLang === 'am' ? 'የቁልፍ ሰሌዳ አቋራጮች እገዛ' : 'Show Keyboard Shortcuts Help',
          desc: 'Toggle this legal shortcuts reference dialog.',
        },
        {
          keys: ['Esc'],
          label: currentLang === 'om' ? 'Modal ykn Palette Cufi' : currentLang === 'am' ? 'ማውጫን ዝጋ' : 'Close Open Modal or Dialog',
          desc: 'Dismiss active dialog, command palette, or overlay.',
        },
      ],
    },
    {
      title: currentLang === 'om' ? '📄 Sanada & Maxxansa (Document Actions)' : currentLang === 'am' ? '📄 የሰነድ እርምጃዎች' : '📄 Legal Document Actions',
      shortcuts: [
        {
          keys: [`${modKey}`, 'S'],
          label: currentLang === 'om' ? 'Sanada Ammaa Kuusi (Save Document)' : currentLang === 'am' ? 'ሰነዱን በቅጽበት አስቀምጥ' : 'Save Active Legal Document',
          desc: 'Instantly save open draft, analysis, or legal findings to secure storage.',
        },
        {
          keys: [`${modKey}`, 'P'],
          label: currentLang === 'om' ? 'Maxxansi ykn PDF Baasi (Print / PDF)' : currentLang === 'am' ? 'አትም ወይም ፒዲኤፍ አውርድ' : 'Print / Export Legal Document to PDF',
          desc: 'Trigger official legal layout printing or PDF export modal.',
        },
        {
          keys: [`${modKey}`, 'Shift', 'C'],
          label: currentLang === 'om' ? 'Waraabbii Seeraa Garagalchi' : currentLang === 'am' ? 'ሕጋዊ ጥቅስ ቅዳ' : 'Copy Official Legal Citation',
          desc: 'Copy formatted citation of the selected precedent or statutory provision.',
        },
      ],
    },
    {
      title: currentLang === 'om' ? '🏛️ Adeemsa Qaxxaamuraa (Fast Navigation)' : currentLang === 'am' ? '🏛️ ፈጣን አሰሳ' : '🏛️ Fast Navigation Tabs',
      shortcuts: [
        { keys: ['Alt', '1'], label: 'Home / Daashboordii Seeraa', desc: 'Jump to Main Legal Portal' },
        { keys: ['Alt', '2'], label: 'Ibsa Seeraa (Explain Law AI)', desc: 'Jump to Legal Explanations' },
        { keys: ['Alt', '3'], label: 'Kuusaa Dhaddacha Ijoo (Cassation)', desc: 'Jump to Binding Precedents & Visual Citation Map' },
        { keys: ['Alt', '4'], label: 'Qorannoo Sanadaa (Doc Analysis)', desc: 'Jump to Contract & Legal Analysis' },
        { keys: ['Alt', '5'], label: 'Sanada Qopheessi (Create Draft)', desc: 'Jump to Legal Drafting' },
        { keys: ['Alt', '6'], label: 'Hiikkaa Seeraa (Translate Law)', desc: 'Jump to Trilingual Legal Translator' },
        { keys: ['Alt', '7'], label: 'Sanadoota Kiyya (My Saved Content)', desc: 'Jump to Offline & Saved Library' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-2xl bg-amber-500 text-slate-950 font-bold border border-amber-400 shadow-md">
              ⌨️
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif-legal text-slate-100 flex items-center gap-2">
                <span>{currentLang === 'om' ? 'Qaxxaamura Qubee (Keyboard Shortcuts)' : currentLang === 'am' ? 'የቁልፍ ሰሌዳ አቋራጮች' : 'Keyboard Shortcuts for Legal Experts'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Saffisaan socho'uuf, sanada kuusuuf, fi barbaaduuf qubeewwan qaxxaamuraa fayyadamaa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm p-2 rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="space-y-6">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {group.title}
              </h4>
              <div className="bg-slate-950 rounded-2xl border border-slate-800 divide-y divide-slate-850 overflow-hidden">
                {group.shortcuts.map((sc, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200">{sc.label}</div>
                      <div className="text-[11px] text-slate-400">{sc.desc}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs shadow-xs min-w-[28px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            💡 Qajeelfama: Qubee <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">Esc</kbd> tuquun yeroo kamiyyuu cufuu dandeessu.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
          >
            {currentLang === 'om' ? 'Hubadheera (Close)' : currentLang === 'am' ? 'ገባኝ (ዝጋ)' : 'Got it (Close)'}
          </button>
        </div>
      </div>
    </div>
  );
};

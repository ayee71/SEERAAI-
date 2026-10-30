import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Language, translations } from '../i18n/translations';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onNavigateTab: (tab: string, query?: string) => void;
  onTriggerSave?: () => void;
  onTriggerPrint?: () => void;
  onOpenShortcutsHelp?: () => void;
  onSwitchLanguage?: (lang: Language) => void;
}

interface CommandItem {
  id: string;
  category: 'nav' | 'action' | 'precedent' | 'lang';
  categoryLabel: string;
  title: string;
  subtitle?: string;
  emoji: string;
  shortcut?: string;
  action: () => void;
}

export const GlobalCommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  currentLang,
  onNavigateTab,
  onTriggerSave,
  onTriggerPrint,
  onOpenShortcutsHelp,
  onSwitchLanguage,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'nav' | 'action' | 'precedent' | 'lang'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened and reset selection
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedCategory('all');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build command items
  const allCommands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation Tabs
      {
        id: 'nav-home',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Fuula Duraa (Home Dashboard)' : currentLang === 'am' ? 'ዋና ገጽ (Home)' : 'Home Dashboard',
        subtitle: 'Daashboordii seeraa fi qajeeltoowwan',
        emoji: '🏛️',
        shortcut: 'Alt+1',
        action: () => onNavigateTab('home'),
      },
      {
        id: 'nav-explain',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Ibsa Seeraa (Explain Law)' : currentLang === 'am' ? 'ሕግ አብራራ' : 'Explain Law AI',
        subtitle: 'Keeyyattoota seeraa fi heera mootummaa ibsi',
        emoji: '⚖️',
        shortcut: 'Alt+2',
        action: () => onNavigateTab('explainLaw'),
      },
      {
        id: 'nav-cassation',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Kuusaa Dhaddacha Ijoo (Cassation Library)' : currentLang === 'am' ? 'የሰበር ውሳኔዎች ማውጫ' : 'Cassation Precedent Library',
        subtitle: 'Murteewwan dirqisiisoo Oromiyaa fi Federaalaa',
        emoji: '📚',
        shortcut: 'Alt+3',
        action: () => onNavigateTab('cassation'),
      },
      {
        id: 'nav-analysis',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Qorannoo Sanadaa (Analyze Document)' : currentLang === 'am' ? 'የሰነድ ምርመራ' : 'Legal Document Analysis',
        subtitle: 'Waliigalteewwan fi dhimmoota seeraa qoradhu',
        emoji: '📜',
        shortcut: 'Alt+4',
        action: () => onNavigateTab('docAnalysis'),
      },
      {
        id: 'nav-create',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Sanada Qopheessi (Create Legal Draft)' : currentLang === 'am' ? 'ሕጋዊ ሰነድ አዘጋጅ' : 'Draft Legal Document',
        subtitle: 'Iyyannoo, waliigaltee, fi barruulee seeraa barreessi',
        emoji: '📝',
        shortcut: 'Alt+5',
        action: () => onNavigateTab('create'),
      },
      {
        id: 'nav-translate',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Hiikkaa Seeraa (Legal Translator)' : currentLang === 'am' ? 'የሕግ ትርጉም' : 'Legal Translator',
        subtitle: 'Afaan Oromoo • አማርኛ • English',
        emoji: '🌐',
        shortcut: 'Alt+6',
        action: () => onNavigateTab('translate'),
      },
      {
        id: 'nav-mycontent',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Sanadoota Kiyya (My Saved Content)' : currentLang === 'am' ? 'የተቀመጡ ሰነዶች' : 'My Saved Documents',
        subtitle: 'Sanadoota kuufaman fi offline storage',
        emoji: '📂',
        shortcut: 'Alt+7',
        action: () => onNavigateTab('myContent'),
      },
      {
        id: 'nav-glossary',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Galmee Jechoota Seeraa (Legal Glossary)' : currentLang === 'am' ? 'የሕግ መዝገበ-ቃላት' : 'Trilingual Legal Glossary',
        subtitle: 'Jechoota seeraa 2,000+ hiikkaa wajjin',
        emoji: '📖',
        action: () => onNavigateTab('glossary'),
      },
      {
        id: 'nav-templates',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Foormiiwwan Seeraa (Document Templates)' : currentLang === 'am' ? 'የሕግ ሰነድ ቅጾች' : 'Legal Templates',
        subtitle: 'Fakkeenya iyyannoo fi waliigaltee qophaa\'oo',
        emoji: '📑',
        action: () => onNavigateTab('templates'),
      },
      {
        id: 'nav-integration',
        category: 'nav',
        categoryLabel: 'Kallattii (Navigation)',
        title: currentLang === 'om' ? 'Qindaa\'ina Gemini AI (Integration View)' : currentLang === 'am' ? 'የGemini AI ውህደት መመሪያ' : 'Gemini AI Integration Guide',
        subtitle: 'Ibsa teeknikaa fi qajeeltoowwan seeraa Gemini AI',
        emoji: '⚡',
        action: () => onNavigateTab('integration'),
      },

      // Global Actions
      {
        id: 'action-shared-drafts',
        category: 'action',
        categoryLabel: 'Tarkaanfii (Actions)',
        title: currentLang === 'om' ? 'Qophii Sanadaa Qoodame (Shared Drafts)' : currentLang === 'am' ? 'የተጋሩ የሰነድ ረቂቆች' : 'Shared Drafts & Live Comments',
        subtitle: 'Token qoodinsaa fi yaada ogeessota seeraa ilaali',
        emoji: '📤',
        shortcut: 'Alt+D',
        action: () => onNavigateTab('sharedDraft'),
      },
      {
        id: 'action-legal-logic-auditor',
        category: 'action',
        categoryLabel: 'Tarkaanfii (Actions)',
        title: currentLang === 'om' ? 'Odiitara Loojikii Seeraa (Legal Auditor)' : currentLang === 'am' ? 'የሕግ ሥነ-ሥርዓት ኦዲተር' : 'Legal Logic & Procedural Auditor',
        subtitle: 'Hanqinaalee SDFHH, waamicha fi mallattoo qoradhu',
        emoji: '⚖️',
        shortcut: 'Alt+A',
        action: () => onNavigateTab('analyze'),
      },
      {
        id: 'action-save',
        category: 'action',
        categoryLabel: 'Tarkaanfii (Actions)',
        title: currentLang === 'om' ? 'Sanada Ammaa Kuusi (Save Document)' : currentLang === 'am' ? 'ሰነዱን አስቀምጥ (Save)' : 'Save Active Document',
        subtitle: 'Sanada amma baname kuusaa keessatti olkaa\'i',
        emoji: '💾',
        shortcut: 'Ctrl+S',
        action: () => {
          if (onTriggerSave) onTriggerSave();
        },
      },
      {
        id: 'action-print',
        category: 'action',
        categoryLabel: 'Tarkaanfii (Actions)',
        title: currentLang === 'om' ? 'Maxxansi ykn PDF Baasi (Print / PDF)' : currentLang === 'am' ? 'አትም / ፒዲኤፍ አውርድ' : 'Print / Export to PDF',
        subtitle: 'Sanada ykn qorannoo kana maxxansi',
        emoji: '🖨️',
        shortcut: 'Ctrl+P',
        action: () => {
          if (onTriggerPrint) onTriggerPrint();
        },
      },
      {
        id: 'action-shortcuts',
        category: 'action',
        categoryLabel: 'Tarkaanfii (Actions)',
        title: currentLang === 'om' ? 'Qaxxaamura Qubee (Keyboard Shortcuts)' : currentLang === 'am' ? 'የቁልፍ ሰሌዳ አቋራጮች' : 'Keyboard Shortcuts Cheat Sheet',
        subtitle: 'Tarree qaxxaamura qubee hunda ilaali',
        emoji: '⌨️',
        shortcut: 'Ctrl+/',
        action: () => {
          if (onOpenShortcutsHelp) onOpenShortcutsHelp();
        },
      },

      // Language Switchers
      {
        id: 'lang-om',
        category: 'lang',
        categoryLabel: 'Afaan (Language)',
        title: 'Afaan Oromoo tiin Fayyadami',
        subtitle: 'Afaan appii gara Afaan Oromoo tti jijjiiri',
        emoji: '🇪🇹',
        action: () => onSwitchLanguage && onSwitchLanguage('om'),
      },
      {
        id: 'lang-am',
        category: 'lang',
        categoryLabel: 'Afaan (Language)',
        title: 'በአማርኛ ቋንቋ ተጠቀም',
        subtitle: 'የመተግበሪያውን ቋንቋ ወደ አማርኛ ቀይር',
        emoji: '🇪🇹',
        action: () => onSwitchLanguage && onSwitchLanguage('am'),
      },
      {
        id: 'lang-en',
        category: 'lang',
        categoryLabel: 'Afaan (Language)',
        title: 'Switch to English',
        subtitle: 'Change interface language to English',
        emoji: '🇬🇧',
        action: () => onSwitchLanguage && onSwitchLanguage('en'),
      },
    ];

    // Precedent Matches (Search directly in Cassation Database)
    const q = search.toLowerCase().trim();
    const precedentMatches = CASSATION_PRECEDENTS_DATA.filter(
      (c) =>
        !q ||
        c.fileNumber.includes(q) ||
        c.parties.om.toLowerCase().includes(q) ||
        c.parties.am.toLowerCase().includes(q) ||
        c.parties.en.toLowerCase().includes(q) ||
        c.legalIssue.om.toLowerCase().includes(q) ||
        c.legalIssue.en.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.statutoryProvisions.some((p) => p.toLowerCase().includes(q))
    ).slice(0, search.trim() ? 12 : 5); // Show top 5 by default or up to 12 when searching

    precedentMatches.forEach((c) => {
      const isOr = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');
      list.push({
        id: `precedent-${c.fileNumber}`,
        category: 'precedent',
        categoryLabel: isOr ? 'Dhaddacha Ijoo Oromiyaa' : 'Dhaddacha Ijoo Federaalaa',
        title: `Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume})`,
        subtitle: `${c.parties.om} — ${c.legalIssue.om.substring(0, 85)}...`,
        emoji: isOr ? '🔴' : '🟢',
        action: () => {
          onNavigateTab('cassation', c.fileNumber);
        },
      });
    });

    return list;
  }, [currentLang, onNavigateTab, onTriggerSave, onTriggerPrint, onOpenShortcutsHelp, onSwitchLanguage, search]);

  // Filter commands by user search string and selected category
  const filteredCommands = useMemo(() => {
    return allCommands.filter((cmd) => {
      const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        cmd.title.toLowerCase().includes(q) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
        cmd.categoryLabel.toLowerCase().includes(q) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
      );
    });
  }, [allCommands, search, selectedCategory]);

  // Handle keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev + 1) % (filteredCommands.length || 1);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const scrollIntoView = (index: number) => {
    if (!listRef.current) return;
    const item = listRef.current.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-16 px-3 sm:px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <span className="text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              currentLang === 'om'
                ? 'Barbaadi: Meeshaa, Lakk. Galmee, Labsii, Qajeeltoo seeraa... (Ctrl+K)'
                : currentLang === 'am'
                ? 'ፈልግ: መሳሪያ፣ የሰበር መዝገብ፣ አዋጅ...'
                : 'Search tools, case files, statutes, shortcuts... (Ctrl+K)'
            }
            className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded-lg bg-slate-800 cursor-pointer"
            >
              ✕
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300 rounded-lg shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Category-Based Filtering Icons & Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950/45 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: currentLang === 'om' ? 'Hunda (All)' : 'ሁሉም', emoji: '🔍' },
            { id: 'nav', label: currentLang === 'om' ? 'Kallattii (Navigation)' : 'መዋቅር', emoji: '🏛️' },
            { id: 'action', label: currentLang === 'om' ? 'Tarkaanfii (Actions)' : 'እርምጃዎች', emoji: '⚡' },
            { id: 'precedent', label: currentLang === 'om' ? 'Dhaddacha (Precedents)' : 'የሰበር ውሳኔ', emoji: '📚' },
            { id: 'lang', label: currentLang === 'om' ? 'Afaan (Language)' : 'ቋንቋ', emoji: '🌐' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id as any);
                  setSelectedIndex(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results List with Keyboard Navigation Support */}
        <div ref={listRef} className="overflow-y-auto p-2 sm:p-3 space-y-1 divide-y divide-slate-800/40">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <span className="text-3xl block">⚖️</span>
              <p className="text-sm font-semibold text-slate-300">
                {currentLang === 'om' ? `Bu'aan barbaacha "${search}" hin argamne.` : `"${search}" የተደረገው ፍለጋ አልተገኘም።`}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {currentLang === 'om'
                  ? 'Lakkoofsa galmee dhaddacha ijoo, mata-duree seeraa, ykn meeshaa barbaaddan qabatamaadhaan barreessaa.'
                  : 'የሰበር መዝገብ ቁጥር፣ የሕግ ርዕስ ወይም የሚፈልጉትን መሳሪያ በጽሑፍ ያስገቡ።'}
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md ring-1 ring-amber-400'
                      : 'hover:bg-slate-800/70 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{cmd.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate">
                          {cmd.title}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                            isSelected
                              ? 'bg-slate-950 text-amber-300 font-bold'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {cmd.categoryLabel}
                        </span>
                      </div>
                      {cmd.subtitle && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border shadow-xs ${
                          isSelected
                            ? 'bg-slate-950 text-amber-300 border-slate-800'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <span className="text-xs font-mono font-bold bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded">↵</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↓</kbd>{' '}
              {currentLang === 'om' ? 'Gadi/Ool' : 'Navigate'}
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↵</kbd>{' '}
              {currentLang === 'om' ? 'Filadhu' : 'Select'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400 font-bold">{filteredCommands.length} items</span>
            <span>• SeeraAI Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};

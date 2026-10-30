import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  BookOpen,
  Type,
  Sun,
  Moon,
  Search,
  Copy,
  Check,
  FileDown,
  FileText,
  Printer,
  Sliders,
  ChevronDown,
  Layers,
  ArrowUp,
  Bookmark,
  Sparkles,
  AlignLeft,
  List,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { LegalCitationHighlighter } from './LegalCitationHighlighter';

export type ReadingTheme = 'dark' | 'light' | 'sepia' | 'contrast';
export type ReadingFont = 'sans' | 'serif' | 'ethiopic';
export type ReadingWidth = 'compact' | 'standard' | 'wide';

interface ImmersiveReadingModeProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  currentLang: Language;
  taskType: string;
  outputLanguages: Language[];
  separatedVersions?: {
    om?: string;
    am?: string;
    en?: string;
  };
  activeLangTab: 'combined' | 'om' | 'am' | 'en';
  setActiveLangTab: (tab: 'combined' | 'om' | 'am' | 'en') => void;
  onNavigateToCassation?: (query: string) => void;
  onOpenPdfModal?: () => void;
  onQuickWordExport?: () => void;
}

export const ImmersiveReadingMode: React.FC<ImmersiveReadingModeProps> = ({
  isOpen,
  onClose,
  title,
  content,
  currentLang,
  taskType,
  outputLanguages,
  separatedVersions,
  activeLangTab,
  setActiveLangTab,
  onNavigateToCassation,
  onOpenPdfModal,
  onQuickWordExport,
}) => {
  const t = translations[currentLang];
  const containerRef = useRef<HTMLDivElement>(null);

  // Appearance & Ergonomics
  const [theme, setTheme] = useState<ReadingTheme>('dark');
  const [fontSize, setFontSize] = useState<number>(18); // in px
  const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
  const [fontFamily, setFontFamily] = useState<ReadingFont>('serif');
  const [columnWidth, setColumnWidth] = useState<ReadingWidth>('standard');
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Determine active document text
  const activeContent = useMemo(() => {
    if (activeLangTab === 'om' && separatedVersions?.om) return separatedVersions.om;
    if (activeLangTab === 'am' && separatedVersions?.am) return separatedVersions.am;
    if (activeLangTab === 'en' && separatedVersions?.en) return separatedVersions.en;
    return content;
  }, [activeLangTab, separatedVersions, content]);

  // Extract Articles & Clauses for Table of Contents
  const tocItems = useMemo(() => {
    const lines = activeContent.split('\n');
    const items: { lineIndex: number; text: string; isHeading: boolean }[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Match Ethiopian legal article patterns (Keeyyata, አንቀጽ, Article, Clause, Section)
      if (
        /^(KEEYYATA|Keeyyata|KEEYYATA\s*\d+|ANQATSA|አንቀጽ|አንቀጽ\s*\d+|ARTICLE|Article\s*\d+|CLAUSE|Clause\s*\d+|SECTION|Section\s*\d+|KUTAA|ክፍል|PART|#[^#])/i.test(
          trimmed
        ) ||
        /^(\d+[\.\)]\s+[A-Z\u1200-\u137F])/i.test(trimmed)
      ) {
        items.push({
          lineIndex: idx,
          text: trimmed.replace(/^#+\s*/, '').substring(0, 60),
          isHeading: true,
        });
      }
    });

    return items;
  }, [activeContent]);

  // Word count and Reading Time
  const wordCount = useMemo(() => {
    return activeContent.split(/\s+/).filter(Boolean).length;
  }, [activeContent]);

  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 180));

  // Lock body scroll and register ESC key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showSearch) {
            setShowSearch(false);
          } else if (showSettings) {
            setShowSettings(false);
          } else if (showToc) {
            setShowToc(false);
          } else {
            onClose();
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault();
          setShowSearch((prev) => !prev);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose, showSearch, showSettings, showToc]);

  // Scroll tracking
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const total = scrollHeight - clientHeight;
    const pct = total > 0 ? (scrollTop / total) * 100 : 0;
    setScrollProgress(Math.min(100, Math.max(0, pct)));
    setShowBackToTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  // Theme styling definitions
  const themeStyles = {
    dark: {
      bg: 'bg-[#090d16]',
      text: 'text-[#f1f5f9]',
      subtext: 'text-[#94a3b8]',
      card: 'bg-[#0f172a]/95 border-[#1e293b]',
      controlBg: 'bg-[#1e293b] text-[#e2e8f0] hover:bg-[#334155]',
      activeControl: 'bg-amber-500 text-slate-950 font-bold',
      accent: 'text-amber-400',
      border: 'border-[#1e293b]',
      selection: 'selection:bg-amber-500/30 selection:text-amber-200',
      progressBar: 'bg-gradient-to-r from-amber-500 to-amber-400',
    },
    light: {
      bg: 'bg-[#f8fafc]',
      text: 'text-[#0f172a]',
      subtext: 'text-[#475569]',
      card: 'bg-[#ffffff] border-[#e2e8f0]',
      controlBg: 'bg-[#e2e8f0] text-[#1e293b] hover:bg-[#cbd5e1]',
      activeControl: 'bg-[#0f172a] text-[#ffffff] font-bold',
      accent: 'text-[#0f172a]',
      border: 'border-[#e2e8f0]',
      selection: 'selection:bg-amber-200 selection:text-slate-900',
      progressBar: 'bg-gradient-to-r from-slate-900 to-slate-700',
    },
    sepia: {
      bg: 'bg-[#fbf7ee]',
      text: 'text-[#292524]',
      subtext: 'text-[#78716c]',
      card: 'bg-[#f5efe1] border-[#e7dfcf]',
      controlBg: 'bg-[#e7dfcf] text-[#44403c] hover:bg-[#d6cbba]',
      activeControl: 'bg-[#78350f] text-[#fef3c7] font-bold',
      accent: 'text-[#78350f]',
      border: 'border-[#e7dfcf]',
      selection: 'selection:bg-[#fed7aa] selection:text-[#78350f]',
      progressBar: 'bg-gradient-to-r from-[#92400e] to-[#b45309]',
    },
    contrast: {
      bg: 'bg-[#000000]',
      text: 'text-[#ffffff]',
      subtext: 'text-[#a3a3a3]',
      card: 'bg-[#121212] border-[#262626]',
      controlBg: 'bg-[#262626] text-[#ffffff] hover:bg-[#404040]',
      activeControl: 'bg-[#ffffff] text-[#000000] font-bold',
      accent: 'text-[#facc15]',
      border: 'border-[#262626]',
      selection: 'selection:bg-[#facc15] selection:text-[#000000]',
      progressBar: 'bg-[#facc15]',
    },
  };

  const currentThemeStyle = themeStyles[theme];

  // Font family definitions
  const fontClass =
    fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'ethiopic'
      ? 'font-ethiopic'
      : 'font-sans';

  // Line height definitions
  const lineHeightClass =
    lineHeight === 'normal'
      ? 'leading-relaxed'
      : lineHeight === 'loose'
      ? 'leading-[2.2]'
      : 'leading-[1.85]';

  // Column width definitions
  const maxWidthClass =
    columnWidth === 'compact'
      ? 'max-w-[680px]'
      : columnWidth === 'wide'
      ? 'max-w-[1040px]'
      : 'max-w-[840px]';

  return (
    <div
      className={`fixed inset-0 z-[100] ${currentThemeStyle.bg} ${currentThemeStyle.text} ${currentThemeStyle.selection} flex flex-col overflow-hidden animate-in fade-in duration-200`}
    >
      {/* 1. Subtle Reading Progress Bar at the very top */}
      <div className="w-full h-1 bg-black/10 overflow-hidden relative shrink-0">
        <div
          role="progressbar"
          aria-valuenow={Math.round(scrollProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`${currentThemeStyle.progressBar} h-full transition-[width] duration-150 ease-out`}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Top Minimal Distraction-Free Header */}
      <header
        className={`px-4 sm:px-8 py-3 border-b ${currentThemeStyle.border} flex items-center justify-between gap-3 shrink-0 backdrop-blur-md bg-opacity-80`}
      >
        {/* Title & Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold truncate tracking-wide">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] opacity-70 font-mono mt-0.5">
              <span>{Math.round(scrollProgress)}% read</span>
              <span>•</span>
              <span>{wordCount} words</span>
              <span>•</span>
              <span>~{estimatedMinutes} min deep read</span>
            </div>
          </div>
        </div>

        {/* Floating Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Trilingual Tabs (if multi-language available) */}
          {outputLanguages.length > 1 && (
            <div className={`hidden md:flex items-center p-0.5 rounded-xl border ${currentThemeStyle.border}`}>
              <button
                onClick={() => setActiveLangTab('combined')}
                className={`px-2 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
                  activeLangTab === 'combined'
                    ? currentThemeStyle.activeControl
                    : `${currentThemeStyle.subtext} hover:opacity-100`
                }`}
              >
                All 3
              </button>
              {outputLanguages.includes('om') && (
                <button
                  onClick={() => setActiveLangTab('om')}
                  className={`px-2 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
                    activeLangTab === 'om'
                      ? currentThemeStyle.activeControl
                      : `${currentThemeStyle.subtext} hover:opacity-100`
                  }`}
                >
                  Oromoo
                </button>
              )}
              {outputLanguages.includes('am') && (
                <button
                  onClick={() => setActiveLangTab('am')}
                  className={`px-2 py-1 text-[11px] rounded-lg font-ethiopic transition-all cursor-pointer ${
                    activeLangTab === 'am'
                      ? currentThemeStyle.activeControl
                      : `${currentThemeStyle.subtext} hover:opacity-100`
                  }`}
                >
                  አማርኛ
                </button>
              )}
              {outputLanguages.includes('en') && (
                <button
                  onClick={() => setActiveLangTab('en')}
                  className={`px-2 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
                    activeLangTab === 'en'
                      ? currentThemeStyle.activeControl
                      : `${currentThemeStyle.subtext} hover:opacity-100`
                  }`}
                >
                  English
                </button>
              )}
            </div>
          )}

          {/* Table of Contents Button (if articles detected) */}
          {tocItems.length > 0 && (
            <button
              onClick={() => setShowToc((prev) => !prev)}
              className={`p-2 rounded-xl border ${currentThemeStyle.border} ${showToc ? currentThemeStyle.activeControl : currentThemeStyle.controlBg} transition-all cursor-pointer`}
              title="Table of Contents / Articles"
            >
              <List className="w-4 h-4" />
            </button>
          )}

          {/* In-Document Search Toggle */}
          <button
            onClick={() => setShowSearch((prev) => !prev)}
            className={`p-2 rounded-xl border ${currentThemeStyle.border} ${showSearch ? currentThemeStyle.activeControl : currentThemeStyle.controlBg} transition-all cursor-pointer`}
            title="Search in Document (Ctrl + F)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`p-2 rounded-xl border ${currentThemeStyle.border} ${currentThemeStyle.controlBg} transition-all cursor-pointer`}
            title="Copy Text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Quick Word Export */}
          {onQuickWordExport && (
            <button
              onClick={onQuickWordExport}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentThemeStyle.border} ${currentThemeStyle.controlBg} text-xs font-semibold transition-all cursor-pointer`}
              title="Export as Microsoft Word (.docx)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Word</span>
            </button>
          )}

          {/* Quick PDF Export */}
          {onOpenPdfModal && (
            <button
              onClick={onOpenPdfModal}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentThemeStyle.border} ${currentThemeStyle.controlBg} text-xs font-semibold transition-all cursor-pointer`}
              title="Export as PDF / Print"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
          )}

          {/* Typography & Ergonomics Settings Toggle */}
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentThemeStyle.border} ${showSettings ? currentThemeStyle.activeControl : currentThemeStyle.controlBg} text-xs font-semibold transition-all cursor-pointer`}
            title="Reading Ergonomics (Theme, Font, Spacing)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ergonomics</span>
          </button>

          {/* Exit Immersive Mode Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-[1.02] cursor-pointer"
            title="Exit Immersive Reading Mode (Esc)"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Ba'i / Exit (Esc)</span>
          </button>
        </div>
      </header>

      {/* 3. In-Document Search Bar (Collapsible) */}
      {showSearch && (
        <div className={`p-3 border-b ${currentThemeStyle.border} ${currentThemeStyle.card} flex items-center justify-center animate-in slide-in-from-top-2 duration-150`}>
          <div className="max-w-md w-full relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 opacity-50" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in legal text (e.g., Keeyyata, Civil Code, Cassation)..."
              className={`w-full pl-9 pr-20 py-2 rounded-xl border ${currentThemeStyle.border} ${currentThemeStyle.bg} text-xs focus:outline-none focus:ring-1 focus:ring-amber-500`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Ergonomics & Settings Drawer (Collapsible) */}
      {showSettings && (
        <div
          className={`p-4 sm:p-5 border-b ${currentThemeStyle.border} ${currentThemeStyle.card} flex flex-wrap items-center justify-between gap-6 text-xs animate-in slide-in-from-top-2 duration-150 z-20`}
        >
          {/* Theme Selector */}
          <div className="space-y-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] opacity-70 block">
              Reading Theme
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Obsidian</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Paper</span>
              </button>
              <button
                onClick={() => setTheme('sepia')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  theme === 'sepia'
                    ? 'bg-[#78350f] text-[#fef3c7] border-[#78350f] font-bold'
                    : 'bg-[#fbf7ee] border-[#e7dfcf] text-[#44403c]'
                }`}
              >
                <span>📜 Sepia</span>
              </button>
              <button
                onClick={() => setTheme('contrast')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  theme === 'contrast'
                    ? 'bg-white text-black border-white font-bold'
                    : 'bg-black border-neutral-700 text-white'
                }`}
              >
                <span>⚫ Pure Contrast</span>
              </button>
            </div>
          </div>

          {/* Font Family Selector */}
          <div className="space-y-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] opacity-70 block">
              Typography
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFontFamily('serif')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-serif font-semibold cursor-pointer ${
                  fontFamily === 'serif' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Legal Serif
              </button>
              <button
                onClick={() => setFontFamily('sans')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-semibold cursor-pointer ${
                  fontFamily === 'sans' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Modern Sans
              </button>
              <button
                onClick={() => setFontFamily('ethiopic')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-ethiopic font-semibold cursor-pointer ${
                  fontFamily === 'ethiopic' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                ግዕዝ (Ethiopic)
              </button>
            </div>
          </div>

          {/* Font Size Adjuster */}
          <div className="space-y-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] opacity-70 block">
              Text Size ({fontSize}px)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                className={`px-3 py-1 rounded-lg border ${currentThemeStyle.border} ${currentThemeStyle.controlBg} font-bold text-xs cursor-pointer`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize(18)}
                className={`px-2.5 py-1 rounded-lg border ${currentThemeStyle.border} ${currentThemeStyle.controlBg} font-mono text-[11px] cursor-pointer`}
              >
                Reset
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(26, s + 2))}
                className={`px-3 py-1 rounded-lg border ${currentThemeStyle.border} ${currentThemeStyle.controlBg} font-bold text-sm cursor-pointer`}
              >
                A+
              </button>
            </div>
          </div>

          {/* Line Spacing */}
          <div className="space-y-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] opacity-70 block">
              Line Spacing
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLineHeight('normal')}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                  lineHeight === 'normal' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setLineHeight('relaxed')}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                  lineHeight === 'relaxed' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Comfortable
              </button>
              <button
                onClick={() => setLineHeight('loose')}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                  lineHeight === 'loose' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Spacious
              </button>
            </div>
          </div>

          {/* Column Width */}
          <div className="space-y-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] opacity-70 block">
              Reading Width
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setColumnWidth('compact')}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                  columnWidth === 'compact' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Narrow
              </button>
              <button
                onClick={() => setColumnWidth('standard')}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                  columnWidth === 'standard' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setColumnWidth('wide')}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                  columnWidth === 'wide' ? currentThemeStyle.activeControl : currentThemeStyle.controlBg
                }`}
              >
                Wide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Reading Canvas with Table of Contents Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide-out Table of Contents */}
        {showToc && tocItems.length > 0 && (
          <aside
            className={`w-72 sm:w-80 border-r ${currentThemeStyle.border} ${currentThemeStyle.card} p-4 overflow-y-auto shrink-0 animate-in slide-in-from-left duration-200 z-10`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Articles & Clauses
                </h3>
              </div>
              <button
                onClick={() => setShowToc(false)}
                className="p-1 rounded-lg hover:opacity-80 text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              {tocItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setShowToc(false);
                    // Search or scroll to text snippet
                    setSearchQuery(item.text.substring(0, 30));
                  }}
                  className={`p-2 rounded-lg cursor-pointer hover:bg-black/10 transition-colors ${
                    item.isHeading ? 'font-semibold text-amber-400' : 'opacity-80'
                  }`}
                >
                  <span className="line-clamp-2">{item.text}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Scrollable Document Body */}
        <main
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-16 flex justify-center"
        >
          <article
            className={`w-full ${maxWidthClass} transition-all duration-200`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {/* Minimal Document Title Header */}
            <header className="mb-10 pb-6 border-b border-inherit text-center">
              <h1
                className={`font-bold tracking-wide uppercase ${
                  fontFamily === 'serif' ? 'font-serif' : 'font-sans'
                }`}
                style={{ fontSize: `${fontSize * 1.35}px` }}
              >
                {title}
              </h1>
              <div className="flex items-center justify-center gap-3 mt-3 text-xs opacity-60 font-mono">
                <span>FDRE Legal Format</span>
                <span>•</span>
                <span>{taskType.toUpperCase()}</span>
                <span>•</span>
                <span>Confidential Research</span>
              </div>
            </header>

            {/* Document Content with Citations */}
            <div
              className={`legal-content-body ${fontClass} ${lineHeightClass} whitespace-pre-wrap text-justify`}
              style={{ fontSize: `${fontSize}px` }}
            >
              <LegalCitationHighlighter
                text={activeContent}
                currentLang={currentLang}
                onNavigateToCassation={onNavigateToCassation}
              />
            </div>

            {/* Document Footer End Marker */}
            <footer className="mt-16 pt-8 border-t border-inherit text-center text-xs opacity-50 font-mono space-y-1">
              <div>-- Dhuma Sanadaa / የሰነዱ ማብቂያ / End of Document --</div>
              <div>SeeraAI Trilingual Legal Research Environment</div>
            </footer>
          </article>
        </main>
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 p-3 rounded-full ${currentThemeStyle.activeControl} shadow-2xl transition-all hover:scale-110 cursor-pointer z-30`}
          title="Back to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

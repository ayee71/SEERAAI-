import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Language } from '../i18n/translations';
import { 
  scanTextForLegalArticles, 
  resolveLegalArticleCitation, 
  ResolvedArticleCitation 
} from '../services/legalArticleResolver';
import { ArticleCitationPopover } from './ArticleCitationPopover';

interface CitationSuggestion {
  citation: string;
  precedent: string;
  link: string;
  resolved?: ResolvedArticleCitation | null;
}

interface SmartCitationLinkerProps {
  text: string;
  onInsert: (content: string) => void;
  currentLang?: Language;
  onNavigateToCassation?: (query: string) => void;
  className?: string;
}

export const SmartCitationLinker: React.FC<SmartCitationLinkerProps> = ({
  text,
  onInsert,
  currentLang = 'om',
  onNavigateToCassation,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<CitationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Active Popover State
  const [activeCitation, setActiveCitation] = useState<ResolvedArticleCitation | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | undefined>(undefined);
  
  // Search / Lookup Bar for Quick Citation Testing
  const [quickSearch, setQuickSearch] = useState('');
  const [showQuickSearch, setShowQuickSearch] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Client-side Real-Time Scan for Legal Articles in text
  const detectedArticles = useMemo(() => {
    return scanTextForLegalArticles(text);
  }, [text]);

  // 2. Server-side / AI Cassation Suggestions Fetch with graceful fallback
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!text || text.trim().length < 8) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/legal/suggest-citations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: currentLang }),
        });

        if (response.ok) {
          const data = await response.json();
          const items: CitationSuggestion[] = (data.suggestions || []).map((s: any) => ({
            citation: s.citation || '',
            precedent: s.precedent || '',
            link: s.link || s.citation || '',
            resolved: resolveLegalArticleCitation(s.citation || s.precedent || ''),
          }));
          setSuggestions(items);
        } else {
          setSuggestions([]);
        }
      } catch {
        // Fallback: no network or offline mode, suggestions can be resolved from local detectedArticles
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 800);
    return () => clearTimeout(timeout);
  }, [text, currentLang]);

  // Popover Trigger Handlers with Hover & Click Support
  const handleMouseEnter = (citation: ResolvedArticleCitation, e: React.MouseEvent<HTMLElement>) => {
    if (isPinned) return; // Keep pinned popover open

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    setPopoverCoords({
      top: rect.bottom + scrollY + 8,
      left: Math.max(16, rect.left + scrollX - 10),
    });
    setActiveCitation(citation);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;

    hoverTimeoutRef.current = setTimeout(() => {
      setActiveCitation(null);
      setPopoverCoords(undefined);
    }, 350);
  };

  const handleClickBadge = (citation: ResolvedArticleCitation, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // If clicking same citation that's already pinned, toggle it
    if (isPinned && activeCitation?.id === citation.id) {
      setIsPinned(false);
      setActiveCitation(null);
      return;
    }

    setPopoverCoords({
      top: rect.bottom + scrollY + 8,
      left: Math.max(16, rect.left + scrollX - 10),
    });
    setActiveCitation(citation);
    setIsPinned(true);
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;

    const resolved = resolveLegalArticleCitation(quickSearch.trim());
    if (resolved) {
      setActiveCitation(resolved);
      setIsPinned(true);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPopoverCoords({
          top: rect.bottom + window.scrollY + 8,
          left: Math.max(16, rect.left + window.scrollX),
        });
      }
    }
  };

  const hasContent = detectedArticles.length > 0 || suggestions.length > 0 || loading;

  return (
    <div ref={containerRef} className={`relative mt-2.5 space-y-2 ${className}`}>
      {/* Smart Citation Linker Toolbar Banner */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="p-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs">
            ⚖️
          </span>
          <span className="text-xs font-bold text-slate-200">
            {currentLang === 'om'
              ? 'Smart Citation Linker & Tumaalee Seeraa'
              : currentLang === 'am'
              ? 'ስማርት የሕግ ድንጋጌዎች አገናኝ (Smart Citation Linker)'
              : 'Smart Citation Linker & Statutory Precedents'}
          </span>
          {detectedArticles.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/40">
              {detectedArticles.length} {currentLang === 'om' ? 'Seerota Argaman' : 'Detected'}
            </span>
          )}
          {loading && (
            <span className="text-[10px] text-amber-400/80 font-mono animate-pulse flex items-center gap-1">
              <span>⏳</span> Barbaadaa jira...
            </span>
          )}
        </div>

        {/* Quick Article Lookup Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickSearch(!showQuickSearch)}
            className="text-[11px] font-semibold text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>🔍</span>
            <span>{showQuickSearch ? 'Cufi (Close)' : 'Keeyyata Barbaadi (Lookup Article)'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Quick Article Search Form */}
      {showQuickSearch && (
        <form onSubmit={handleQuickSearchSubmit} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder={
              currentLang === 'om'
                ? 'Fkn: Kwt. 6, Labsii 1156 K.27, Art. 1723, Galmee 249062...'
                : 'उदा: አንቀጽ 6, አዋጅ 1156 አንቀጽ 27, መዝገብ 249062...'
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
          >
            Ilaali (Preview)
          </button>
        </form>
      )}

      {/* 1. Live Detected Legal Articles Badges (Hover & Click to Open Popover) */}
      {detectedArticles.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1.5">
              <span>📜</span>
              <span>
                {currentLang === 'om'
                  ? 'Keeyyattoota Barreeffama Keessaa (Hover / Click to view full text):'
                  : 'የተገኙ የሕግ ድንጋጌዎች (Hover / Click to view full text):'}
              </span>
            </span>
            <span className="text-[10px] text-slate-500">
              {currentLang === 'om' ? 'Cuqaasi qabiyyee guutuu dubbisi' : 'Click badge to pin popover'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {detectedArticles.map((article) => {
              const isCurrent = activeCitation?.id === article.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onMouseEnter={(e) => handleMouseEnter(article, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={(e) => handleClickBadge(article, e)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                    isCurrent
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-500/50 hover:text-amber-300'
                  }`}
                  title={`${article.matchedCitation} - Hover or click to view full article text`}
                >
                  <span className="text-amber-400">
                    {article.type === 'cassation_precedent' ? '⚖️' : article.jurisdiction === 'oromia' ? '🌳' : '🏛️'}
                  </span>
                  <span>{article.matchedCitation}</span>
                  <span className="text-[10px] opacity-75 font-mono text-slate-400">
                    {article.proclamationNumber ? `(${article.proclamationNumber})` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Suggested Supreme Court Cassation Precedents */}
      {suggestions.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1.5">
              <span>⚖️</span>
              <span>
                {currentLang === 'om'
                  ? 'Murtiilee Dhaddacha Ijoo Walqabatan (Supreme Court Precedents):'
                  : 'ተዛማጅ የሰበር ውሳኔዎች (Supreme Court Precedents):'}
              </span>
            </span>
          </div>

          <div className="space-y-1.5">
            {suggestions.map((s, idx) => {
              const resolvedPrecedent = s.resolved || resolveLegalArticleCitation(s.citation || s.precedent);
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onMouseEnter={(e) => resolvedPrecedent && handleMouseEnter(resolvedPrecedent, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => resolvedPrecedent && handleClickBadge(resolvedPrecedent, e)}
                      className="text-left text-xs font-bold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>⚖️</span>
                      <span className="line-clamp-1">{s.citation}</span>
                      <span className="text-[10px] font-normal text-slate-400">(Hover/Click for full holding)</span>
                    </button>
                    <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                      {s.precedent}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {resolvedPrecedent && (
                      <button
                        type="button"
                        onClick={(e) => handleClickBadge(resolvedPrecedent, e)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                        title="Murtii guutuu dubbisi (View full decision)"
                      >
                        Ilaali
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onInsert(s.link || `\n\n[Wabii Dhaddacha Ijoo: ${s.citation} - ${s.precedent}]`)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer border border-amber-500/40"
                      title="Galmee keessatti galchi"
                    >
                      ➕ Galchi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Clickable Popover Component */}
      {activeCitation && (
        <div
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <ArticleCitationPopover
            citation={activeCitation}
            currentLang={currentLang}
            isPinned={isPinned}
            coords={popoverCoords}
            positionMode={popoverCoords ? 'absolute' : 'relative'}
            onClose={() => {
              setActiveCitation(null);
              setIsPinned(false);
              setPopoverCoords(undefined);
            }}
            onTogglePin={() => setIsPinned(!isPinned)}
            onInsert={onInsert}
            onNavigateToCassation={onNavigateToCassation}
          />
        </div>
      )}
    </div>
  );
};

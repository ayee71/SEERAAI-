import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../i18n/translations';
import { ResolvedArticleCitation } from '../services/legalArticleResolver';

interface ArticleCitationPopoverProps {
  citation: ResolvedArticleCitation;
  currentLang?: Language;
  isPinned: boolean;
  coords?: { top: number; left: number };
  onClose: () => void;
  onTogglePin?: () => void;
  onInsert?: (formattedText: string) => void;
  onNavigateToCassation?: (query: string) => void;
  positionMode?: 'absolute' | 'fixed' | 'relative';
}

export const ArticleCitationPopover: React.FC<ArticleCitationPopoverProps> = ({
  citation,
  currentLang = 'om',
  isPinned,
  coords,
  onClose,
  onTogglePin,
  onInsert,
  onNavigateToCassation,
  positionMode = 'absolute',
}) => {
  const [selectedLang, setSelectedLang] = useState<Language>(currentLang);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync default language when currentLang prop changes
  useEffect(() => {
    setSelectedLang(currentLang);
  }, [currentLang]);

  // Handle escape key and click outside when pinned
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    if (isPinned) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned, onClose]);

  const handleCopy = async () => {
    try {
      const title = citation.title[selectedLang] || citation.title.om;
      const source = citation.lawSource[selectedLang] || citation.lawSource.om;
      const text = citation.fullText[selectedLang] || citation.fullText.om;
      
      const copyPayload = `⚖️ ${title}\n[Madda: ${source}]\n\n${text}${
        citation.keyRules && citation.keyRules.length > 0 
          ? `\n\nQajeelfamoota Ijoo:\n${citation.keyRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}` 
          : ''
      }`;

      await navigator.clipboard.writeText(copyPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleInsertClick = () => {
    if (!onInsert) return;
    const title = citation.title[selectedLang] || citation.title.om;
    const source = citation.lawSource[selectedLang] || citation.lawSource.om;
    const text = citation.fullText[selectedLang] || citation.fullText.om;

    const formattedInsertion = `[${citation.matchedCitation} - ${title} (${source})]:\n"${text}"`;
    onInsert(formattedInsertion);
  };

  const handleOpenCassation = (query: string) => {
    if (onNavigateToCassation) {
      onNavigateToCassation(query);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('seera:navigate', {
          detail: { tab: 'cassation', query },
        })
      );
    }
  };

  // Safe positioning style calculations
  const style: React.CSSProperties = {
    position: positionMode,
    zIndex: 9999,
  };

  if (coords && positionMode !== 'relative') {
    // Keep popover inside window boundaries
    const popoverWidth = Math.min(460, typeof window !== 'undefined' ? window.innerWidth - 32 : 440);
    const maxLeft = typeof window !== 'undefined' ? window.innerWidth - popoverWidth - 16 : 400;
    const left = Math.max(16, Math.min(coords.left, maxLeft));

    style.top = coords.top;
    style.left = left;
    style.maxWidth = `${popoverWidth}px`;
  }

  const titleText = citation.title[selectedLang] || citation.title.om;
  const sourceText = citation.lawSource[selectedLang] || citation.lawSource.om;
  const fullTextContent = citation.fullText[selectedLang] || citation.fullText.om;

  return (
    <div
      ref={popoverRef}
      style={style}
      className={`w-full max-w-[460px] bg-slate-900/98 border ${
        isPinned ? 'border-amber-400 ring-2 ring-amber-500/20' : 'border-amber-500/40'
      } rounded-2xl shadow-2xl text-slate-100 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden text-left`}
    >
      {/* Popover Header */}
      <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm shrink-0">
            {citation.type === 'cassation_precedent' ? '⚖️' : citation.jurisdiction === 'oromia' ? '🌳' : '🏛️'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                {citation.jurisdiction === 'oromia'
                  ? 'Seera Oromiyaa (Regional)'
                  : citation.type === 'cassation_precedent'
                  ? 'Murtii Dhaddacha Ijoo'
                  : 'Seera Federaalaa (Federal)'}
              </span>
              {isPinned && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                  📌 Pinned
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-slate-100 truncate">
              {citation.matchedCitation}
            </h4>
          </div>
        </div>

        {/* Header Right: Language Switcher & Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setSelectedLang('om')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                selectedLang === 'om' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Afaan Oromoo"
            >
              OM
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang('am')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                selectedLang === 'am' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="አማርኛ"
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang('en')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                selectedLang === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="English"
            >
              EN
            </button>
          </div>

          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                isPinned 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={isPinned ? 'Unpin popover' : 'Pin popover open'}
            >
              📌
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Cufi (Close)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Popover Content Body */}
      <div className="p-4 space-y-3.5 max-h-[380px] overflow-y-auto">
        {/* Article Title & Source */}
        <div className="space-y-1">
          <h5 className="text-sm font-bold text-amber-300 leading-snug">
            {titleText}
          </h5>
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
            {sourceText} {citation.yearEC ? `• Bara ${citation.yearEC} B.A. (${citation.yearGC || ''} G.C.)` : ''}
          </p>
        </div>

        {/* Cassation Precedent Parties / Legal Issue */}
        {citation.parties && (
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Gareewwan Falmii (Parties):
            </span>
            <span className="text-slate-200 font-medium">
              {citation.parties[selectedLang] || citation.parties.om}
            </span>
          </div>
        )}

        {/* Full Text / Statutory Provision */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase tracking-wider">
            <span>
              {citation.type === 'cassation_precedent'
                ? 'Qajeeltoo Seeraa Dirqisiisaa (Binding Ratio):'
                : 'Qabiyyee Keeyyata Seeraa (Statutory Text):'}
            </span>
            <span className="text-slate-500 font-mono">
              {selectedLang.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-amber-500 selection:text-slate-950">
            {fullTextContent}
          </p>
        </div>

        {/* Key Statutory Rules (if present, e.g. for SDFHH articles) */}
        {citation.keyRules && citation.keyRules.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Qajeelfamoota & Haalawwan Hojiirra Oolmaa (Application Rules):
            </span>
            <ul className="space-y-1">
              {citation.keyRules.map((rule, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60"
                >
                  <span className="text-amber-400 font-mono text-[10px] shrink-0 mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Linked Supreme Court Cassation Precedents */}
        {citation.linkedPrecedents && citation.linkedPrecedents.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              <span>⚖️</span>
              <span>Murtiilee Dhaddacha Ijoo Kanaan Walqabatan (Linked Precedents):</span>
            </div>
            <div className="space-y-1.5">
              {citation.linkedPrecedents.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleOpenCassation(p.fileNumber)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 group-hover:underline">
                      Galmee Lakk. {p.fileNumber} {p.volume ? `(Jildii ${p.volume})` : ''}
                    </span>
                    {p.yearGC && <span className="text-[10px] text-slate-500">{p.yearGC} G.C.</span>}
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                    {p.ratio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Popover Footer Action Toolbar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>{copied ? '✓' : '📋'}</span>
          <span>{copied ? 'Koppifame!' : 'Koppisi (Copy)'}</span>
        </button>

        <div className="flex items-center gap-2">
          {onInsert && (
            <button
              type="button"
              onClick={handleInsertClick}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Keeyyata kana barreeffama keessatti galchi"
            >
              <span>➕</span>
              <span>Galchi (Insert)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenCassation(citation.articleNumber ? String(citation.articleNumber) : citation.matchedCitation)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <span>⚖️</span>
            <span>Bani (Open)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

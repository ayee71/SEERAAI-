import React from 'react';
import { Language } from '../i18n/translations';
import { getLegalCitationSuggestions, CitationSuggestion } from '../services/citationAutoSuggest';

interface CitationAutoSuggestDropdownProps {
  query: string;
  currentLang: Language;
  onSelectCitation: (citation: CitationSuggestion) => void;
  onClose?: () => void;
  maxDisplay?: number;
}

export const CitationAutoSuggestDropdown: React.FC<CitationAutoSuggestDropdownProps> = ({
  query,
  currentLang,
  onSelectCitation,
  onClose,
  maxDisplay = 5,
}) => {
  const suggestions = getLegalCitationSuggestions(query, maxDisplay);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-bold">
        <div className="flex items-center gap-1.5 text-amber-300">
          <span>💡</span>
          <span className="uppercase tracking-wider">
            {currentLang === 'om'
              ? 'Wabiilee Seeraa Si\'aawaa (Auto-Suggested Citations)'
              : currentLang === 'am'
              ? 'የተጠቆሙ የሕግ ድንጋጌዎች (Auto-Suggested Citations)'
              : 'Auto-Suggested Legal Citations'}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
          >
            ✕ Cufi
          </button>
        )}
      </div>

      <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
        {suggestions.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectCitation(item)}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-amber-500/60 transition-all cursor-pointer group flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs">{item.badgeEmoji}</span>
                <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {item.categoryLabel[currentLang] || item.categoryLabel.om}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                {item.title[currentLang] || item.title.om}
              </h5>
              <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                {item.context[currentLang] || item.context.om}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCitation(item);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 self-center"
            >
              <span>+</span>
              <span>Dabali</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

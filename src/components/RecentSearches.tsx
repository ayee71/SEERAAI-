import React, { useState, useEffect, useCallback } from 'react';
import { History, X, Clock, Trash2, ArrowUpRight, Search, Sparkles, Scale, BookOpen } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { getRecentSearches, deleteRecentSearch, clearRecentSearches, RecentSearch } from '../services/storage';

interface RecentSearchesProps {
  currentLang: Language;
  category?: 'explain_law' | 'cassation' | 'glossary' | 'general';
  onSelectSearch: (query: string) => void;
  mode?: 'under-search' | 'sidebar';
  className?: string;
  maxDisplay?: number;
  refreshTrigger?: number;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  currentLang,
  category,
  onSelectSearch,
  mode = 'under-search',
  className = '',
  maxDisplay = 8,
  refreshTrigger = 0,
}) => {
  const t = translations[currentLang];
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const [filterText, setFilterText] = useState('');

  const loadSearches = useCallback(() => {
    const list = getRecentSearches(category);
    setSearches(list);
  }, [category]);

  useEffect(() => {
    loadSearches();
  }, [loadSearches, refreshTrigger]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteRecentSearch(id);
    if (category) {
      setSearches(updated.filter((s) => s.category === category));
    } else {
      setSearches(updated);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t.recentSearches.clearConfirm)) {
      clearRecentSearches(category);
      setSearches([]);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.recentSearches.justNow;
    if (mins < 60) return `${mins}${t.recentSearches.minAgo}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${t.recentSearches.hoursAgo}`;
    const days = Math.floor(hours / 24);
    return `${days}${t.recentSearches.daysAgo}`;
  };

  const filteredSearches = searches.filter((item) =>
    !filterText.trim() ? true : item.query.toLowerCase().includes(filterText.toLowerCase())
  );

  const displayedSearches = filteredSearches.slice(0, maxDisplay);

  if (searches.length === 0) {
    if (mode === 'sidebar') {
      return (
        <div className={`p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center ${className}`}>
          <History className="w-6 h-6 text-slate-500 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-slate-400 font-medium">{t.recentSearches.empty}</p>
        </div>
      );
    }
    return null;
  }

  // 1. UNDER-SEARCH BAR MODE: Clean, horizontal chips & quick revisit tags
  if (mode === 'under-search') {
    return (
      <div className={`mt-3 space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.recentSearches.title}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-amber-300 font-mono border border-slate-700">
              {searches.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title={t.recentSearches.clear}
          >
            <Trash2 className="w-3 h-3" />
            <span>{t.recentSearches.clear}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {displayedSearches.map((item) => {
            const shortQuery = item.query.length > 55 ? `${item.query.substring(0, 52)}...` : item.query;
            return (
              <div
                key={item.id}
                onClick={() => onSelectSearch(item.query)}
                className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 text-xs transition-all cursor-pointer shadow-sm hover:shadow-md"
                title={`${item.query} (${formatTimeAgo(item.timestamp)})`}
              >
                <Search className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
                <span className="max-w-[220px] sm:max-w-[320px] truncate font-medium">{shortQuery}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-0.5 shrink-0">
                  {formatTimeAgo(item.timestamp)}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="ml-1 p-0.5 rounded-full hover:bg-slate-700/80 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                  title={t.recentSearches.remove}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. SIDEBAR / DRAWER MODE: Full panel with timestamps, category tags & fast replay
  return (
    <div className={`p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">{t.recentSearches.history}</h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono border border-amber-500/20">
            {searches.length}
          </span>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          title={t.recentSearches.clear}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t.recentSearches.clear}</span>
        </button>
      </div>

      {searches.length > 5 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t.recentSearches.filterRecent}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      )}

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 divide-y divide-slate-800/40">
        {displayedSearches.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectSearch(item.query)}
            className="pt-2 group flex items-start justify-between gap-2 p-2 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer border border-transparent hover:border-slate-700/60"
          >
            <div className="flex items-start gap-2 min-w-0">
              <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 group-hover:text-amber-300 leading-snug line-clamp-2">
                  {item.query}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                  {item.category && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {item.category === 'explain_law'
                        ? 'Seera'
                        : item.category === 'cassation'
                        ? 'Dhaddacha'
                        : item.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSearch(item.query);
                }}
                className="p-1 rounded-md text-slate-400 group-hover:text-amber-400 hover:bg-slate-700/60 transition-colors"
                title={t.recentSearches.revisit}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => handleDelete(e, item.id)}
                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                title={t.recentSearches.remove}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

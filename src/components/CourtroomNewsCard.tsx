import React, { useState, useEffect } from 'react';
import { Share2, Check, ExternalLink, Newspaper, Calendar, Tag, Bookmark, Sparkles, Building2 } from 'lucide-react';
import { Language } from '../i18n/translations';

export interface CourtNewsItem {
  id: string;
  title: string;
  category: 'directive' | 'precedent' | 'announcement' | 'technology';
  date: string;
  source: string;
  summary: string;
  fullBody?: string;
  badge: string;
  isUrgent?: boolean;
}

interface CourtroomNewsCardProps {
  news: CourtNewsItem;
  currentLang: Language;
  isHighlighted?: boolean;
  onSelect?: (news: CourtNewsItem) => void;
}

export const CourtroomNewsCard: React.FC<CourtroomNewsCardProps> = ({
  news,
  currentLang,
  isHighlighted = false,
  onSelect
}) => {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const generateDeepLink = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?tab=courtroomControl&newsId=${encodeURIComponent(news.id)}#news-${news.id}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const deepLink = generateDeepLink();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(deepLink);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = deepLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy deep link to clipboard:', err);
    }
  };

  return (
    <div
      id={`news-${news.id}`}
      onClick={() => {
        setShowFull(!showFull);
        if (onSelect) onSelect(news);
      }}
      className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden cursor-pointer group ${
        isHighlighted
          ? 'bg-amber-950/40 border-amber-500 shadow-2xl ring-2 ring-amber-500/50 scale-[1.01]'
          : 'bg-slate-950 border-slate-800/90 hover:border-amber-500/40 hover:bg-slate-900/90'
      }`}
    >
      {/* Top Meta Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
              news.category === 'directive'
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : news.category === 'precedent'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : news.category === 'announcement'
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {news.badge}
          </span>
          {news.isUrgent && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              ARIFAACHIISA (URGENT)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{news.date}</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-base font-bold text-white font-serif-legal group-hover:text-amber-300 transition-colors leading-snug">
        {news.title}
      </h4>

      {/* Source Citation */}
      <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-mono mt-1 mb-2.5">
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{news.source}</span>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        {showFull && news.fullBody ? news.fullBody : news.summary}
      </p>

      {/* Footer Actions: Share Button with navigator.clipboard */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
          <Tag className="w-3 h-3 text-slate-500" />
          <span>ID: {news.id}</span>
        </span>

        <div className="flex items-center gap-2">
          {/* Share Button incorporating navigator.clipboard API */}
          <button
            type="button"
            onClick={handleShare}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              copied
                ? 'bg-emerald-500 text-slate-950 scale-105'
                : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700/80'
            }`}
            title="Generate & copy deep link to this news card"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-400 group-hover:text-slate-950" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Copied Banner Toast */}
      {copied && (
        <div className="absolute top-3 right-3 bg-emerald-500/95 text-slate-950 text-[10px] font-mono font-bold px-3 py-1 rounded-full shadow-lg border border-emerald-300 flex items-center gap-1 animate-in fade-in zoom-in-95">
          <Check className="w-3 h-3" />
          <span>Deep link copied to clipboard</span>
        </div>
      )}
    </div>
  );
};

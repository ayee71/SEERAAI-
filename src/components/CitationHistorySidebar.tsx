/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Scale,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  X,
  RotateCcw,
  BookOpen,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import {
  CitationHistoryItem,
  getCitationHistory,
  removeCitationFromHistory,
  clearCitationHistory,
  resetCitationHistoryToDefault,
  subscribeCitationHistory,
} from '../services/citationHistoryService';

interface CitationHistorySidebarProps {
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
  onNavigatePrecedent: (tab: string, query?: string) => void;
  variant?: 'slideover' | 'embedded';
}

export const CitationHistorySidebar: React.FC<CitationHistorySidebarProps> = ({
  currentLang,
  isOpen,
  onClose,
  onNavigatePrecedent,
  variant = 'slideover',
}) => {
  const [historyItems, setHistoryItems] = useState<CitationHistoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setHistoryItems(getCitationHistory());
    const unsubscribe = subscribeCitationHistory((items) => {
      setHistoryItems(items);
    });
    return () => unsubscribe();
  }, []);

  const handleCopyCitation = async (item: CitationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const citationText = `⚖️ [Legal Citation / Wabiilee Seeraa]\n${item.title}${
      item.statuteOrArticle ? ` • ${item.statuteOrArticle}` : ''
    }\n${item.lawContext ? `Madaallii: ${item.lawContext}\n` : ''}${
      item.keyPrinciple ? `Qajeeltoo: ${item.keyPrinciple}\n` : ''
    }Kuusaa Seera AI - FDRE / Oromia Legal Precedents`;

    try {
      await navigator.clipboard.writeText(citationText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy citation', err);
    }
  };

  const handleOpenPrecedent = (item: CitationHistoryItem) => {
    onNavigatePrecedent(item.targetTab, item.targetQuery || item.title);
    if (variant === 'slideover') {
      onClose();
    }
  };

  const filteredItems = historyItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'cassation':
        return {
          label: '🏛️ Cassation',
          cls: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        };
      case 'constitution':
        return {
          label: '📜 Constitution',
          cls: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
        };
      case 'code':
        return {
          label: '⚖️ Legal Code',
          cls: 'bg-blue-950/80 text-blue-300 border-blue-500/30',
        };
      case 'proclamation':
        return {
          label: '📄 Proclamation',
          cls: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
        };
      default:
        return {
          label: '📚 Statute',
          cls: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return currentLang === 'om' ? 'Amma dura' : 'አሁን';
      if (diffMins < 60)
        return currentLang === 'om'
          ? `Daqiiqaa ${diffMins} dura`
          : currentLang === 'am'
          ? `ከ${diffMins} ደቂቃ በፊት`
          : `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24)
        return currentLang === 'om'
          ? `Sa'aatii ${diffHours} dura`
          : currentLang === 'am'
          ? `ከ${diffHours} ሰዓት በፊት`
          : `${diffHours}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return '';
    }
  };

  if (!isOpen && variant === 'slideover') return null;

  const content = (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 shadow-2xl text-left overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <span>{currentLang === 'om' ? 'Seenaa Wabiilee Seeraa' : currentLang === 'am' ? 'የሕግ ዋቢዎች ታሪክ' : 'Citation History'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {historyItems.length}/10
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentLang === 'om'
                ? 'Keeyyatoota & murteewwan dhiyoo banaman 10'
                : currentLang === 'am'
                ? 'በቅርብ የተከፈቱ 10 የሕግ ድንጋጌዎችና ውሳኔዎች'
                : 'Last 10 legal articles & statutes opened'}
            </p>
          </div>
        </div>

        {variant === 'slideover' && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Cufi / Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="p-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
        {[
          { id: 'all', label: currentLang === 'om' ? 'Hunda (All)' : 'ሁሉም' },
          { id: 'cassation', label: '🏛️ Cassation' },
          { id: 'proclamation', label: '📄 Labsii' },
          { id: 'code', label: '⚖️ Seera/Codes' },
          { id: 'constitution', label: '📜 Heera' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto text-xl">
              📖
            </div>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Hamma ammaatti wabiin seeraa baname hin jiru.'
                : 'ምንም የተከፈተ የሕግ ዋቢ ታሪክ አልተገኘም።'}
            </p>
            <button
              onClick={() => resetCitationHistoryToDefault()}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer border border-amber-500/40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{currentLang === 'om' ? 'Wabiilee Qajeeltoo Dhiyeessi' : 'ምሳሌ የሕግ ዋቢዎችን አምጣ'}</span>
            </button>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const badge = getCategoryBadge(item.category);
            return (
              <div
                key={item.id}
                onClick={() => handleOpenPrecedent(item)}
                className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-2xl space-y-2 transition-all cursor-pointer group shadow-sm"
              >
                {/* Meta row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      #{index + 1}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    {item.statuteOrArticle && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300/90 font-mono font-semibold">
                        {item.statuteOrArticle}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatRelativeTime(item.openedAt)}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors leading-snug">
                  {item.title}
                </h4>

                {/* Context / Principle snippet */}
                {(item.keyPrinciple || item.lawContext) && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.keyPrinciple || item.lawContext}
                  </p>
                )}

                {/* Actions bottom bar */}
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                    <span>{currentLang === 'om' ? 'Bani & Qori' : currentLang === 'am' ? 'ክፈትና መርምር' : 'Open Precedent'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopyCitation(item, e)}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Copy Citation"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCitationFromHistory(item.id);
                      }}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Tools */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0 text-xs">
        <button
          type="button"
          onClick={() => resetCitationHistoryToDefault()}
          className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{currentLang === 'om' ? 'Qajeeltoowwan Jalqabaa' : 'ነባሪ ዋቢዎችን ጫን'}</span>
        </button>

        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Seenaa wabiilee seeraa kana hunda haquu barbaadduu? / Clear all citation history?')) {
                clearCitationHistory();
              }
            }}
            className="text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>{currentLang === 'om' ? 'Hunda Haqaa' : 'ሁሉንም አጽዳ'}</span>
          </button>
        )}
      </div>
    </div>
  );

  if (variant === 'embedded') {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-200">
        {content}
      </div>
    </div>
  );
};

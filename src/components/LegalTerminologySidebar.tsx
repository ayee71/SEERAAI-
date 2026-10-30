import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { 
  Sparkles, 
  BookOpen, 
  Search, 
  X, 
  Check, 
  Copy, 
  Scale, 
  Globe, 
  Layers, 
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  countDetectedLegalTerms, 
  PredefinedLegalTerm 
} from '../services/legalTerminologyHighlighter';

interface LegalTerminologySidebarProps {
  currentLang: Language;
  text: string;
  onClose: () => void;
  onSelectTerm?: (term: PredefinedLegalTerm) => void;
  onOpenExplainLaw?: (query: string) => void;
}

export const LegalTerminologySidebar: React.FC<LegalTerminologySidebarProps> = ({
  currentLang,
  text,
  onClose,
  onSelectTerm,
  onOpenExplainLaw,
}) => {
  const t = translations[currentLang];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null);
  const [activeExpandedTerm, setActiveExpandedTerm] = useState<string | null>(null);

  const report = countDetectedLegalTerms(text);

  const filteredMatches = report.matchedList.filter((item) => {
    const matchesSearch = 
      item.term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.term.definition.om.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.term.definition.am.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.term.definition.en.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = 
      selectedCategoryFilter === 'all' || item.term.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleCopyDefinition = async (term: PredefinedLegalTerm) => {
    const textToCopy = `⚖️ ${term.term} [${term.category.toUpperCase()}]${term.source ? ` • ${term.source}` : ''}\n- Afaan Oromoo: ${term.definition.om}\n- አማርኛ: ${term.definition.am}\n- English: ${term.definition.en}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedTermId(term.term);
      setTimeout(() => setCopiedTermId(null), 2000);
    } catch (e) {
      console.error('Failed to copy term definition', e);
    }
  };

  const categories = [
    { id: 'all', label: currentLang === 'om' ? 'Hunda (All)' : currentLang === 'am' ? 'ሁሉም (All)' : 'All Categories' },
    { id: 'constitutional', label: currentLang === 'om' ? 'Heeraa (Constitutional)' : currentLang === 'am' ? 'ህገ-መንግስታዊ' : 'Constitutional' },
    { id: 'labor', label: currentLang === 'om' ? 'Hojii (Labor)' : currentLang === 'am' ? 'ሰራተኛና አሰሪ' : 'Labor & Employment' },
    { id: 'commercial', label: currentLang === 'om' ? 'Daldalaa (Commercial)' : currentLang === 'am' ? 'ንግድና ውል' : 'Commercial & Contracts' },
    { id: 'civilCourt', label: currentLang === 'om' ? 'Murtii (Civil Court)' : currentLang === 'am' ? 'ፍርድ ቤትና ሰበር' : 'Civil Court & Cassation' },
    { id: 'procedural', label: currentLang === 'om' ? 'Loojikii & Adeemsa (Procedural)' : currentLang === 'am' ? 'የስነ-ስርዓት' : 'Procedural Law' },
    { id: 'property', label: currentLang === 'om' ? 'Qabeenya (Property)' : currentLang === 'am' ? 'ንብረት' : 'Property Law' },
  ];

  return (
    <aside className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 space-y-4 shadow-2xl text-left flex flex-col h-full max-h-[820px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100">
              {currentLang === 'om'
                ? 'Qorannoo Jechoota Seeraa (Key Legal Terminology)'
                : currentLang === 'am'
                ? 'የሕግ ቃላት ትንተና ፓነል (Legal Terminology Panel)'
                : 'Key Legal Terminology Panel'}
            </h3>
            <span className="text-[11px] text-amber-300 font-mono">
              {report.totalCount} terms underlined in gold ({filteredMatches.length} matching)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all cursor-pointer"
          title="Close Terminology Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Filter & Categories */}
      <div className="space-y-2.5 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              currentLang === 'om'
                ? 'Jechoota seeraa barbaadi...'
                : currentLang === 'am'
                ? 'የሕግ ቃላትን ፈልግ...'
                : 'Search highlighted legal terms...'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer border ${
                selectedCategoryFilter === cat.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terms List Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredMatches.length === 0 ? (
          <div className="h-64 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
            <Info className="w-8 h-8 text-slate-600" />
            <p className="text-xs">
              {currentLang === 'om'
                ? 'Sanada kana keessatti jechoonni seeraa calaqqisiisan hin argamne ykn qabxii filatamte waliin wal-hin simne.'
                : currentLang === 'am'
                ? 'በዚህ ሰነድ ውስጥ የተለዩ የሕግ ቃላት አልተገኙም ወይም ከፍለጋው ጋር የሚስማማ የለም።'
                : 'No key legal terminology detected in this document matching your filter.'}
            </p>
          </div>
        ) : (
          filteredMatches.map(({ term, count }) => {
            const isExpanded = activeExpandedTerm === term.term;
            return (
              <div
                key={term.term}
                className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 space-y-3 transition-all shadow-sm group"
              >
                {/* Term Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif-legal font-bold text-sm text-amber-300 group-hover:text-amber-200">
                        {term.term}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        {term.category}
                      </span>
                      {count > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {count}x cited
                        </span>
                      )}
                    </div>
                    {term.source && (
                      <span className="text-[10px] text-slate-400 font-mono block">
                        📜 {term.source}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyDefinition(term)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors cursor-pointer"
                      title="Copy Term & Trilingual Definitions"
                    >
                      {copiedTermId === term.term ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveExpandedTerm(isExpanded ? null : term.term)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors cursor-pointer"
                      title="Toggle Trilingual Breakdown"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90 text-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Primary Definition (Current Language) */}
                <div className="text-xs text-slate-200 leading-relaxed bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">
                    🎯 {currentLang === 'om' ? 'Hiika Seeraa (Definition):' : currentLang === 'am' ? 'ህጋዊ ትርጉም (Definition):' : 'Legal Definition:'}
                  </span>
                  <p className="italic">"{term.definition[currentLang] || term.definition.om}"</p>
                </div>

                {/* Trilingual Translations (Expanded View) */}
                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-slate-800 animate-in fade-in duration-150">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-amber-400" />
                      <span>Hiika Afaanota Sadii (Trilingual Explanations):</span>
                    </span>

                    <div className="grid grid-cols-1 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        <strong className="text-amber-300 font-mono">Afaan Oromoo:</strong> {term.definition.om}
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        <strong className="text-amber-300 font-mono">አማርኛ:</strong> {term.definition.am}
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        <strong className="text-amber-300 font-mono">English:</strong> {term.definition.en}
                      </div>
                    </div>

                    {onOpenExplainLaw && (
                      <button
                        type="button"
                        onClick={() => onOpenExplainLaw(`Labsii ykn keeyyata "${term.term}" irratti ibsa guutuu fi murtiiwwan dhaddacha ijoo naaf dhiyeessi.`)}
                        className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Seera Kana Gad-fageenyaan Qori (Explain in Detail)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0 font-mono">
        <span>Unique Terms: {report.uniqueTerms.length}</span>
        <span className="text-amber-400">Gold Underlined ✨</span>
      </div>
    </aside>
  );
};

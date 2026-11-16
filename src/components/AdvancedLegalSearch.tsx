import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Calendar, 
  Globe, 
  BookOpen, 
  Scale, 
  Sparkles, 
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  History
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { 
  LegalLanguage, 
  LegalJurisdiction, 
  LegalSourceType, 
  RetrievedLegalSource,
  LegalSearchRequest 
} from '../types/legalAnswer';
import { searchSEERAAILegalSources } from '../services/legalAnswerClient';
import { motion, AnimatePresence } from 'framer-motion';

interface AdvancedLegalSearchProps {
  currentLang: Language;
  initialQuery?: string;
  onSelectResult?: (result: RetrievedLegalSource) => void;
}

export const AdvancedLegalSearch: React.FC<AdvancedLegalSearchProps> = ({
  currentLang,
  initialQuery = '',
  onSelectResult
}) => {
  const t = translations[currentLang];
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsLoading] = useState(false);
  const [results, setResults] = useState<RetrievedLegalSource[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedLangs, setSelectedLangs] = useState<LegalLanguage[]>(['om', 'am', 'en']);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<LegalJurisdiction>('both');
  const [selectedTypes, setSelectedTypes] = useState<LegalSourceType[]>([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const toggleType = (type: LegalSourceType) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleLang = (lang: LegalLanguage) => {
    setSelectedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && selectedTopics.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const request: LegalSearchRequest = {
        query,
        languages: selectedLangs,
        jurisdiction: selectedJurisdiction,
        sourceTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        topics: selectedTopics.length > 0 ? selectedTopics : undefined,
        dateRange: (dateStart || dateEnd) ? {
          start: dateStart || undefined,
          end: dateEnd || undefined
        } : undefined,
        maxResults: 25
      };

      const response = await searchSEERAAILegalSources(request);
      if (response.ok) {
        setResults(response.results);
      } else {
        setError('Search failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch();
    }
  }, [initialQuery]);

  const sourceLabels: Record<LegalSourceType, string> = {
    proclamation: currentLang === 'om' ? 'Labsii' : 'አዋጅ',
    regulation: currentLang === 'om' ? 'Dambii' : 'ደንብ',
    directive: currentLang === 'om' ? 'Qajeelfama' : 'መመሪያ',
    cassation_decision: currentLang === 'om' ? 'Murtii Ijibbaataa' : 'የሰበር ውሳኔ',
    civil_code: 'Civil Code',
    criminal_code: 'Criminal Code',
    court_decision: 'Court Decision',
    official_guideline: 'Guideline',
    other: 'Other'
  };

  return (
    <div className="w-full space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={currentLang === 'om' ? 'Labsii, murtii ykn qabiyyee seeraa barbaadi...' : 'Search laws, decisions, or legal content...'}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all text-lg shadow-inner font-medium"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold ${
                  showFilters ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Advanced Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
                <History className="w-3.5 h-3.5" />
                <span>Recent: Constitutional Law, Land Rights...</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fast Results:</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">Source-Grounded</span>
            </div>
          </div>
        </form>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 mt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Languages */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['om', 'am', 'en'] as LegalLanguage[]).map(lang => (
                      <button
                        key={lang}
                        onClick={() => toggleLang(lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          selectedLangs.includes(lang) 
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md' 
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {lang === 'om' ? 'Afaan Oromoo' : lang === 'am' ? 'Amharic' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jurisdiction */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5" />
                    Jurisdiction
                  </label>
                  <select
                    value={selectedJurisdiction}
                    onChange={(e) => setSelectedJurisdiction(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="both">Both (Federal & Oromia)</option>
                    <option value="federal">Federal Democratic Republic</option>
                    <option value="oromia">Oromia Regional State</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Effective Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-[10px] text-white focus:outline-none focus:border-amber-500/50"
                    />
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-[10px] text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                {/* Document Types */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Document Types
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['proclamation', 'regulation', 'cassation_decision', 'official_guideline'] as LegalSourceType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${
                          selectedTypes.includes(type) 
                            ? 'bg-blue-500 text-white border-blue-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {sourceLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 text-rose-400 text-sm font-medium animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Search Results {results.length > 0 && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">{results.length}</span>}
          </h4>
          {results.length > 0 && (
            <button 
              onClick={() => setResults([])}
              className="text-[10px] font-bold text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear Results
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isSearching ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-5/6" />
                </div>
                <div className="flex gap-2">
                  <div className="h-5 bg-slate-800 rounded w-16" />
                  <div className="h-5 bg-slate-800 rounded w-16" />
                </div>
              </div>
            ))
          ) : results.length > 0 ? (
            results.map((res) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, borderColor: 'rgba(245, 158, 11, 0.3)' }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 group transition-all cursor-pointer shadow-lg hover:shadow-amber-500/5"
                onClick={() => onSelectResult?.(res)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                      res.jurisdiction === 'federal' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {res.jurisdiction}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{res.proclamationNumber || res.decisionNumber || ''}</span>
                  </div>
                  
                  <h5 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                    {res.titleOm || res.titleAm || res.titleEn || res.title}
                  </h5>
                  
                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed italic">
                    "{res.legalIssueSummary}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold">
                      {sourceLabels[res.sourceType] || res.sourceType}
                    </span>
                    {res.effectiveDate && (
                      <span className="text-[9px] text-slate-500 font-medium">
                        {res.effectiveDate}
                      </span>
                    )}
                  </div>
                  <button className="p-1.5 rounded-lg bg-slate-950 text-slate-500 group-hover:text-amber-400 hover:bg-slate-800 transition-all">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : query ? (
            <div className="col-span-full py-20 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto border border-slate-800">
                <Search className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-slate-500 font-medium italic">
                {currentLang === 'om' ? "Bu'aa hin arganne. Maaloo ragaa biraa yaalaa." : "No results found for your filters."}
              </p>
            </div>
          ) : (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="flex justify-center gap-3">
                <div className="w-12 h-12 bg-amber-500/5 rounded-2xl flex items-center justify-center border border-amber-500/10">
                  <Sparkles className="w-6 h-6 text-amber-500/40" />
                </div>
                <div className="w-12 h-12 bg-blue-500/5 rounded-2xl flex items-center justify-center border border-blue-500/10">
                  <BookOpen className="w-6 h-6 text-blue-500/40" />
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">
                {currentLang === 'om' ? 'Barbaacha seeraa gadi fageenya qabuuf asitti jalqabi.' : 'Enter a query or use filters to start your legal research.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

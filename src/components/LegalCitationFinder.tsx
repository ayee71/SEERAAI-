import React, { useState, useEffect, useRef } from 'react';
import { Language, translations } from '../i18n/translations';
import { findLegalCitations, LegalCitationSuggestion } from '../services/api';
import {
  Scale,
  Search,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Filter,
  ShieldAlert,
  Gavel,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';

interface LegalCitationFinderProps {
  currentLang: Language;
  initialQuery?: string;
  onInsertCitation?: (insertText: string) => void;
  onNavigateTab?: (tab: string, query?: string) => void;
  isEmbedded?: boolean;
}

export const LegalCitationFinder: React.FC<LegalCitationFinderProps> = ({
  currentLang,
  initialQuery = '',
  onInsertCitation,
  onNavigateTab,
  isEmbedded = false,
}) => {
  const t = translations[currentLang];
  const [inputText, setInputText] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<LegalCitationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const debounceTimerRef = useRef<any>(null);

  // Quick preset keyword scenarios
  const QUICK_KEYWORDS = [
    { label: currentLang === 'om' ? 'Kwt 1731 (Pacta Sunt Servanda)' : currentLang === 'am' ? 'አንቀጽ 1731 (ውልን ማክበር)' : 'Art. 1731 (Contract Sanctity)', query: 'waliigaltee dirqama mallattoo 1731' },
    { label: currentLang === 'om' ? 'Yeroon Darbiinsaa (Yirgaa)' : currentLang === 'am' ? 'የይርጋ ጊዜ 10 ዓመት' : 'Limitation Period (Art 1845)', query: 'yeroon darbiinsaa yirgaa waggaa 10 limitation 1845' },
    { label: currentLang === 'om' ? 'Ariisaa Hojii (Labor Kwt 27)' : currentLang === 'am' ? 'ያለማስጠንቀቂያ ስንብት' : 'Labor Dismissal (Art 27)', query: 'hojjetaa ariisaa beeksisa malee misconduct 1156 27' },
    { label: currentLang === 'om' ? 'Severance Pay (Kwt 39)' : currentLang === 'am' ? 'የስንብት ክፍያና ካሳ' : 'Severance Pay (Art 39)', query: 'severance beenyaa kaffaltii damooza 1156 39' },
    { label: currentLang === 'om' ? 'Kiraa Manaa (Civil Kwt 2896)' : currentLang === 'am' ? 'የቤት ኪራይ ውል' : 'Tenancy Lease (Art 2896)', query: 'kiraa manaa kireeffataa kireessaa rent 2896' },
    { label: currentLang === 'om' ? 'Lafa Baadiyyaa (Labsii 248/2015)' : currentLang === 'am' ? 'የገጠር መሬት ይዞታ' : 'Oromia Rural Land (Proc 248)', query: 'lafa baadiyyaa qabiyyee oromiyaa 248/2015' },
    { label: currentLang === 'om' ? 'Beenyaa Expropriation (1161)' : currentLang === 'am' ? 'የመሬት ካሳ ክፍያ' : 'Land Expropriation (Proc 1161)', query: 'beenyaa expropriation compensation faayidaa uummataa 1161' },
    { label: currentLang === 'om' ? 'Res Judicata (SDFHH Kwt 5)' : currentLang === 'am' ? 'የመጨረሻ ፍርድ (አንቀጽ 5)' : 'Res Judicata (SDFHH Art 5)', query: 'res judicata murtii dhumaa sdfhh keeyyata 5' },
    { label: currentLang === 'om' ? 'Qabeenya Waloo Gaa\'elaa' : currentLang === 'am' ? 'የጋራ የጋብቻ ንብረት' : 'Marital Property (Family Code)', query: 'maatii gaa\'ela fuudha heeruma divorce common property 62' },
  ];

  // Perform search
  const performSearch = async (textToScan: string) => {
    if (!textToScan || textToScan.trim().length === 0) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await findLegalCitations(textToScan, currentLang, 10);
      setSuggestions(results);
    } catch (err) {
      console.warn('Scan failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount or when initialQuery changes
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0) {
      setInputText(initialQuery);
      performSearch(initialQuery);
    } else {
      // Run with default rich legal query to display initial suggestions
      performSearch('waliigaltee hojjetaa lafa murtii ijibbaataa yeroon darbiinsaa');
    }
  }, [initialQuery]);

  // Handle typing with 350ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 350);
  };

  // Listen for automated fix requests from the editor
  useEffect(() => {
    const handleFixRequest = (e: any) => {
      const { query } = e.detail;
      if (query) {
        setInputText(query);
        performSearch(query);
      }
    };

    window.addEventListener('seera:citation_fix_request' as any, handleFixRequest);
    return () => window.removeEventListener('seera:citation_fix_request' as any, handleFixRequest);
  }, []);

  const handleCopyCitation = (item: LegalCitationSuggestion) => {
    const textToCopy = `${item.insertText} (${item.lawTitle} - ${item.articleNumber})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleInsert = (item: LegalCitationSuggestion) => {
    if (onInsertCitation) {
      onInsertCitation(item.insertText);
    } else {
      // Dispatch global insert event for any active legal text area
      window.dispatchEvent(
        new CustomEvent('seera:insert_citation', {
          detail: { text: item.insertText, item },
        })
      );
    }
    setInsertedId(item.id);
    setTimeout(() => setInsertedId(null), 2500);
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  return (
    <div className={`flex flex-col ${isEmbedded ? 'space-y-4' : 'space-y-6 max-w-6xl mx-auto px-4 py-6'}`}>
      {/* Header Banner */}
      {!isEmbedded && (
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {currentLang === 'om'
                    ? 'AI Si\'aawaa • Barbaacha Keeyyata & Labsii Seeraa'
                    : currentLang === 'am'
                    ? 'አስተዋይ የሕግ አዋጆችና አንቀጾች መፈለጊያ'
                    : 'AI Legal Citation & Statutory Finder'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
                <Scale className="w-7 h-7 text-amber-400 shrink-0" />
                <span>
                  {currentLang === 'om'
                    ? 'Barbaacha Wabii Seeraa (Legal Citation Finder)'
                    : currentLang === 'am'
                    ? 'የሕግ ድንጋጌዎችና የሰበር ውሳኔዎች መፈለጊያ'
                    : 'Automated Legal Citation & Ratio Finder'}
                </span>
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentLang === 'om'
                  ? 'Barreeffama, dhimma falmii ykn jechoota seeraa galchaa. Sirnichi Koodii Siivilii, Labsii Hojjetaa 1156, Koodii Daldalaa, SDFHH, Labsii Lafa Baadiyyaa 248 fi Murtiiwwan Ijibbaataa irraa keeyyata sirrii battalatti isiniif dhiyeessa.'
                  : currentLang === 'am'
                  ? 'የክርክር ጭብጥዎን ወይም የሕግ ቃላትን ያስገቡ። ሲስተሙ የፍትሐብሔር ሕግ፣ የአሰሪና ሰራተኛ አዋጅ 1156፣ የንግድ ሕግ፣ የሥነ-ሥርዓት ሕግ እና አስገዳጅ የሰበር ውሳኔዎችን በማመሳከር ትክክለኛውን አንቀጽ ወዲያውኑ ይጠቁማል።'
                  : 'Scan user input, legal scenarios, or claim statements in real-time. Instantly surfaces exact statutory provisions, Civil Code articles, and binding Cassation precedents.'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-xl font-mono font-bold text-amber-400">100%</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  {currentLang === 'om' ? 'Heera & Labsii' : currentLang === 'am' ? 'አዋጅና ሕግ' : 'Statutes'}
                </div>
              </div>
              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-xl font-mono font-bold text-emerald-400">Vol 1-28</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  {currentLang === 'om' ? 'Ijibbaata' : currentLang === 'am' ? 'ሰበር' : 'Cassation'}
                </div>
              </div>
              <div className="text-center px-3">
                <div className="text-xl font-mono font-bold text-sky-400">1-Click</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  {currentLang === 'om' ? 'Galchi' : currentLang === 'am' ? 'አስገባ' : 'Insert'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Scanner Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-400" />
            <span>
              {currentLang === 'om'
                ? 'Barreeffama ykn Jechoota Seeraa Asitti Galchaa / Scan Input'
                : currentLang === 'am'
                ? 'የሚመረመረውን የሕግ ጽሑፍ ወይም ቃላት እዚህ ያስገቡ'
                : 'Enter Legal Text, Scenario or Keywords to Scan'}
            </span>
          </label>
          {isLoading && (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>
                {currentLang === 'om' ? 'Seera Sakatta\'aa Jira...' : currentLang === 'am' ? 'እየተፈተሸ ነው...' : 'Scanning Statutes...'}
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <textarea
            value={inputText}
            onChange={handleInputChange}
            rows={isEmbedded ? 3 : 4}
            placeholder={
              currentLang === 'om'
                ? 'Fkn: Hojjetaan sababa qulqullina hojii dhabeef beeksisa malee ari\'ame, kaffaltii beenyaa fi mindaa barbaada. Ykn: Waliigaltee kireessa manaa waggaa 2 dura mallatteeffame...'
                : currentLang === 'am'
                ? 'ምሳሌ፡ ሰራተኛ ያለማስጠንቀቂያ ከስራ ተሰናብቷል፣ የካሳና የስንብት ክፍያ ይገባዋል። ወይም፡ የማይንቀሳቀስ ንብረት ሽያጭ ውል በሰነዶች ማረጋገጫ ያልተመዘገበ...'
                : 'E.g., An employee was dismissed without prior notice for alleged misconduct, claiming severance pay and compensation. Or: A landlord unlawfully locked out tenant...'
            }
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 rounded-2xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-sans leading-relaxed resize-y"
          />
          {inputText && (
            <button
              type="button"
              onClick={() => {
                setInputText('');
                performSearch('');
              }}
              className="absolute top-3 right-3 text-xs text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {currentLang === 'om' ? 'Filannoo Saffisaa (Quick Keywords):' : currentLang === 'am' ? 'ፈጣን ቁልፍ ቃላት፡' : 'Quick Scenarios:'}
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_KEYWORDS.map((k, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(k.query);
                  performSearch(k.query);
                }}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-amber-950/40 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>💡</span>
                <span>{k.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {[
            { id: 'all', label: currentLang === 'om' ? 'Hunda (All)' : currentLang === 'am' ? 'ሁሉም' : 'All' },
            { id: 'civil_contract', label: currentLang === 'om' ? 'Koodii Siivilii (Contracts)' : currentLang === 'am' ? 'ፍትሐብሔር (ውል)' : 'Civil Code' },
            { id: 'labor', label: currentLang === 'om' ? 'Labsii Hojjetaa (1156)' : currentLang === 'am' ? 'አሰሪና ሰራተኛ' : 'Labor Law' },
            { id: 'property_land', label: currentLang === 'om' ? 'Lafa & Beenyaa' : currentLang === 'am' ? 'መሬትና ካሳ' : 'Land & Property' },
            { id: 'procedure_evidence', label: currentLang === 'om' ? 'SDFHH (Civil Procedure)' : currentLang === 'am' ? 'ሥነ-ሥርዓት (SDFHH)' : 'Procedure' },
            { id: 'commercial_tax', label: currentLang === 'om' ? 'Koodii Daldalaa (1243)' : currentLang === 'am' ? 'ንግድ ሕግ' : 'Commercial' },
            { id: 'family', label: currentLang === 'om' ? 'Koodii Maatii' : currentLang === 'am' ? 'የቤተሰብ ሕግ' : 'Family' },
            { id: 'criminal', label: currentLang === 'om' ? 'Seera Yakkaa (414)' : currentLang === 'am' ? 'የወንጀል ሕግ' : 'Criminal' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-xl whitespace-nowrap font-medium transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200">
            {currentLang === 'om'
              ? `Wabiilee Argaman (${filteredSuggestions.length})`
              : currentLang === 'am'
              ? `የተገኙ የሕግ ማጣቀሻዎች (${filteredSuggestions.length})`
              : `Suggested Citations (${filteredSuggestions.length})`}
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {currentLang === 'om' ? 'Bu\'uura RAG & Kuusaa Seeraa' : 'Verified Statutory Grounding'}
        </span>
      </div>

      {/* Suggestions List */}
      {filteredSuggestions.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 text-xl">
            ⚖️
          </div>
          <h4 className="text-base font-bold text-slate-300">
            {currentLang === 'om' ? 'Wabiin Seeraa Hin Argamne' : currentLang === 'am' ? 'ማጣቀሻ አልተገኘም' : 'No Citations Matched'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {currentLang === 'om'
              ? 'Jechoota seeraa kanneen akka "waliigaltee", "kwt 1731", "hojjetaa", "beenyaa", "yirgaa", ykn "lafa" galchuun yaalaa.'
              : currentLang === 'am'
              ? 'እንደ "ውል"፣ "አንቀጽ 1731"፣ "ሰራተኛ"፣ "ካሳ"፣ "ይርጋ" ያሉ የሕግ ቃላትን በመጠቀም ይሞክሩ።'
              : 'Try entering keywords like "contract", "labor 1156", "reinstatement", "tenancy", "limitation", or article numbers.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSuggestions.map((item) => {
            const isCopied = copiedId === item.id;
            const isInserted = insertedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4 group hover:bg-slate-850"
              >
                <div className="space-y-3">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{item.badgeEmoji || '📜'}</span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {item.articleNumber || item.proclamationNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                          item.jurisdiction === 'oromia'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {item.jurisdiction === 'oromia' ? 'Oromia Regional' : 'FDRE Federal'}
                      </span>
                    </div>

                    {item.matchedKeyword && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        🎯 {item.matchedKeyword}
                      </span>
                    )}
                  </div>

                  {/* Title & Law */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400">
                      {item.lawTitle} ({item.proclamationNumber})
                    </p>
                  </div>

                  {/* Summary / Rule */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                    <p className="text-xs text-slate-300 leading-relaxed">{item.summary}</p>
                  </div>

                  {/* Cassation Precedent Reference if available */}
                  {item.cassationRef && (
                    <div className="flex items-start gap-2 p-2 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300/90">
                      <Gavel className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Murtii Ijibbaataa: </span>
                        <span>{item.cassationRef}</span>
                      </div>
                    </div>
                  )}

                  {/* Insert Citation Preview */}
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                    <span className="truncate pr-2">"{item.insertText}"</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleInsert(item)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10 active:scale-95"
                  >
                    {isInserted ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{currentLang === 'om' ? 'Galcheera!' : currentLang === 'am' ? 'ገብቷል!' : 'Inserted!'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>{currentLang === 'om' ? 'Wabii Galchi' : currentLang === 'am' ? 'አንቀጹን አስገባ' : 'Insert Citation'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyCitation(item)}
                    title="Copy Citation"
                    className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('legislationRepository', item.proclamationNumber || item.articleNumber)}
                      title="View Law Details"
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

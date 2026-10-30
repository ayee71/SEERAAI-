import React, { useState, useMemo } from 'react';
import { Language } from '../i18n/translations';
import { CassationPrecedent } from '../data/cassationPrecedents';
import { 
  BindingStatutoryInterpretation, 
  InterpretationCategory, 
  getAllStatutoryInterpretations,
  CATEGORY_LABELS 
} from '../data/statutoryInterpretationsData';
import { 
  Search, 
  Scale, 
  Copy, 
  CheckCircle2, 
  BookOpen, 
  Sparkles, 
  ExternalLink, 
  Filter, 
  X, 
  FileText,
  BookmarkCheck,
  ChevronRight
} from 'lucide-react';
import { SmoothHeight } from './SmoothHeight';

interface StatutoryInterpretationsViewProps {
  currentLang: Language;
  precedents?: CassationPrecedent[];
  onNavigateToCassation?: (fileNumber: string) => void;
  onSendToExplain?: (query: string) => void;
}

export const StatutoryInterpretationsView: React.FC<StatutoryInterpretationsViewProps> = ({
  currentLang,
  precedents,
  onNavigateToCassation,
  onSendToExplain,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<InterpretationCategory | 'all'>('all');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<'all' | 'federal' | 'oromia'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [displayLanguage, setDisplayLanguage] = useState<'current' | 'om' | 'am' | 'en'>('current');

  // Load all statutory interpretations (curated + adapted from all cassation precedents)
  const allInterpretations = useMemo(() => {
    return getAllStatutoryInterpretations(precedents);
  }, [precedents]);

  // Preset popular statutory provisions (tumaalee seeraa beekamoo)
  const popularProvisions = [
    { label: 'SDDH K. 6 & 358 (Daagim-Daanyummaa & Mormii Murtee)', query: '6' },
    { label: 'K. 1723 & 2877 (Gurgurtaa Manaa & Galmee)', query: '1723' },
    { label: 'K. 2472 (Liqii & Ragaa Barreeffamaa)', query: '2472' },
    { label: 'K. 1731 (Seera Ta\'uu Waliigaltee)', query: '1731' },
    { label: 'K. 996 & 1060 (Dhaaltummaa & Qulqulleessa Idaa)', query: '996' },
    { label: 'Labsii 1156 K. 27 & 39 (Ariisaa Hojjetaa & Beenyaa)', query: '1156' },
    { label: 'Seera Yakkaa K. 692 (Gawwoonsaa / Fraud)', query: '692' },
    { label: 'SDDH K. 154-159 (Dhorkaa Yeroo / Injunction)', query: '154' },
    { label: 'Koodii Maatii K. 48 (Qabeenya Waloo Fuudhaa)', query: '48' },
    { label: 'Labsii 454/97 K. 2(1) (Dirqisiisummaa Hiikkoo Seeraa)', query: '454' },
  ];

  const filteredInterpretations = useMemo(() => {
    return allInterpretations.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Jurisdiction filter
      if (selectedJurisdiction !== 'all') {
        const isOromia = item.courtJurisdiction === 'oromia' || item.id.includes('oromia');
        if (selectedJurisdiction === 'oromia' && !isOromia) return false;
        if (selectedJurisdiction === 'federal' && isOromia) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const parts = q.split(/\s+/).filter(Boolean);

      const searchTarget = [
        item.fileNumber,
        item.volume.toString(),
        item.yearEC.toString(),
        item.yearGC.toString(),
        item.statutoryProvisionInterpreted.codeOrProclamation,
        item.statutoryProvisionInterpreted.om,
        item.statutoryProvisionInterpreted.am,
        item.statutoryProvisionInterpreted.en,
        item.specificArticles?.join(' ') || '',
        item.bindingInterpretationGiven.om,
        item.bindingInterpretationGiven.am,
        item.bindingInterpretationGiven.en,
        item.legalIssue?.om || '',
        item.legalIssue?.am || '',
        item.legalIssue?.en || '',
        item.parties.om,
        item.parties.am,
        item.parties.en,
        item.courtName?.om || '',
        item.courtName?.am || '',
      ].join(' ').toLowerCase();

      return parts.every((p) => searchTarget.includes(p));
    });
  }, [allInterpretations, selectedCategory, selectedJurisdiction, searchQuery]);

  const handleCopyInterpretation = (item: BindingStatutoryInterpretation) => {
    const activeLang = displayLanguage === 'current' ? currentLang : displayLanguage;
    const interpText = item.bindingInterpretationGiven[activeLang] || item.bindingInterpretationGiven.om;
    const provisionTitle = item.statutoryProvisionInterpreted[activeLang] || item.statutoryProvisionInterpreted.om;
    const partiesTitle = item.parties[activeLang] || item.parties.om;
    const courtTitle = item.courtName?.[activeLang] || item.courtName?.om || (item.courtJurisdiction === 'oromia' ? 'Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa' : 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa');

    const text = `⚖️ ${courtTitle}
${item.fileNumber} | Jildii: ${item.volume} | Bara: ${item.yearEC} B.A. (${item.yearGC} G.C.)
Qaamolee: ${partiesTitle}

📜 Tumaa Seeraa Hiikkoon Itti Kenname (Statutory Provision):
${item.statutoryProvisionInterpreted.codeOrProclamation} (${provisionTitle})

📌 Hiikkoo Seeraa Dirqisiisaa (Binding Interpretation - Labsii 454/97 K. 2(1)):
${interpText}

(SeeraAI - Kuusaa Murteewwan Dhaddacha Ijibbaataa)`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleGoToPrecedent = (item: BindingStatutoryInterpretation) => {
    if (onNavigateToCassation) {
      // Extract clean numeric digits or file number
      const cleanNum = item.fileNumber.replace(/[^\d]/g, '') || item.fileNumber;
      onNavigateToCassation(cleanNum);
    }
  };

  const handleDeepDiveAI = (item: BindingStatutoryInterpretation) => {
    if (onSendToExplain) {
      const activeLang = displayLanguage === 'current' ? currentLang : displayLanguage;
      const interpText = item.bindingInterpretationGiven[activeLang] || item.bindingInterpretationGiven.om;
      const query = `Hiikkoo seeraa Dhaddacha Ijibbaataa ${item.fileNumber} keessatti ${item.statutoryProvisionInterpreted.codeOrProclamation} irratti kenname bal'inaan naaf ibsi:\n${interpText}`;
      onSendToExplain(query);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 sm:p-4 rounded-2xl bg-amber-500 text-slate-950 border border-amber-400 shrink-0 shadow-lg">
                <Scale className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-serif-legal">
                    {currentLang === 'om'
                      ? 'Tumaalee Seeraa Hiikkoon Itti Kenname (Statutory Interpretations)'
                      : currentLang === 'am'
                      ? 'የህግ ትርጉም የተሰጣቸው ድንጋጌዎችና የሰበር ውሳኔዎች'
                      : 'Statutory Provisions with Binding Precedent Interpretations'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40">
                    Labsii 454/97 K. 2(1)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  {currentLang === 'om'
                    ? 'Murtiilee Dhaddacha Ijibbaata Federaalaa fi Oromiyaatiin tumaalee seeraa (Koodii Siiviilii, Deemsa Falmii, Yakkaa, Hojjetaa, Daldalaa, Maatii fi Lafa) irratti hiikkoo seeraa dirqisiisaa kenname lakkoofsa keeyyataatiin qindaa\'e.'
                    : currentLang === 'am'
                    ? 'በፌዴራልና በኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት በህግ ድንጋጌዎች ላይ የተሰጡ አስገዳጅ የህግ ትርጉሞች በአንቀጽ ቁጥር የተደራጁ።'
                    : 'Binding statutory interpretations rendered by Federal and Oromia Cassation Divisions categorized by code and article numbers.'}
                </p>
              </div>
            </div>

            {/* Quick Summary Pill Stats */}
            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Ida\'ama Hiikkoo</div>
                <div className="text-base font-bold text-amber-400 font-mono">{allInterpretations.length}</div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Argaman</div>
                <div className="text-base font-bold text-emerald-400 font-mono">{filteredInterpretations.length}</div>
              </div>
            </div>
          </div>

          {/* Popular Provisions Quick Search Chips */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ⚡ Tumaalee Seeraa Yeroo Baay\'ee Barbaadaman (Popular Statutory Articles):
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {popularProvisions.map((prov, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSearchQuery(prov.query)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 text-xs ${
                    searchQuery === prov.query
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{prov.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND JURISDICTION FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Main Provision Search Input */}
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-amber-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Barbaadi: Keeyyata (fkn: K. 6, 1723, 2472, 358, 27, 692), Labsii 1156, SDDH, Galmee Lakk..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-10 py-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer p-1"
                title="Qulqulleessi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Jurisdiction Filter Toggle */}
          <div className="md:col-span-4 flex items-center gap-2">
            {[
              { id: 'all', label: '🏛️ Hunda' },
              { id: 'federal', label: '🟢 Federaalaa' },
              { id: 'oromia', label: '🔴 Oromiyaa' },
            ].map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => setSelectedJurisdiction(j.id as any)}
                className={`flex-1 py-3 px-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border text-center ${
                  selectedJurisdiction === j.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                {j.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Gosoota Seeraa Filadhaa (Legal Domains):
            </span>

            {/* Language switch for interpretation text */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-500">Afaan Hiikkoo:</span>
              <div className="bg-slate-950 p-0.5 rounded-xl border border-slate-800 flex items-center gap-1">
                {(['om', 'am', 'en'] as const).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => setDisplayLanguage(lng)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      (displayLanguage === 'current' ? currentLang : displayLanguage) === lng
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lng}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏛️</span>
              <span>Hunda ({allInterpretations.length})</span>
            </button>

            {(Object.keys(CATEGORY_LABELS) as InterpretationCategory[]).map((catKey) => {
              const cat = CATEGORY_LABELS[catKey];
              const isSelected = selectedCategory === catKey;
              const countInCat = allInterpretations.filter((i) => i.category === catKey).length;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat[currentLang] || cat.om}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'}`}>
                    {countInCat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESULTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
          <span>
            Tumaalee Hiikkoon Itti Kenname: <strong className="text-amber-400">{filteredInterpretations.length}</strong>
          </span>
          <span className="hidden sm:inline">
            Status: <strong className="text-emerald-400">✓ Binding Interpretation Under Proc. 454/97</strong>
          </span>
        </div>

        <SmoothHeight triggerKey={`${selectedCategory}-${selectedJurisdiction}`} duration={320} className="w-full">
          {filteredInterpretations.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Tumaan seeraa ykn galmeen barbaaddan hin argamne</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Jecha barbaachaa fooyyessaa ykn filannoowwan gosa seeraa (categories) fi mana murtii jijjiiraa ilaalaa.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedJurisdiction('all');
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer shadow-sm"
            >
              Barbaacha Qulqulleessi (Reset All)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredInterpretations.map((item) => {
              const catObj = CATEGORY_LABELS[item.category];
              const isOromia = item.courtJurisdiction === 'oromia' || item.id.includes('oromia');
              const activeLang = displayLanguage === 'current' ? currentLang : displayLanguage;

              return (
                <div
                  key={item.id}
                  id={`stat-card-${item.id}`}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 shadow-xl transition-all space-y-4 relative group"
                >
                  {/* Top Bar: Court, File No, Volume, Category, Copy button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-xl font-bold uppercase border ${
                          isOromia
                            ? 'bg-red-950 text-red-300 border-red-500/40'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {isOromia ? '🔴 Oromiyaa Cassation' : '🟢 Federal Cassation'}
                      </span>

                      <span className="text-xs px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-bold shadow-xs">
                        {item.fileNumber}
                      </span>

                      <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 font-mono font-bold border border-slate-800">
                        Jildii {item.volume}
                      </span>

                      <span className="text-[11px] text-slate-400 font-mono">
                        Bara {item.yearEC} B.A. ({item.yearGC} G.C.)
                      </span>

                      {catObj && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 font-medium">
                          {catObj.emoji} {catObj[currentLang] || catObj.om}
                        </span>
                      )}
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCopyInterpretation(item)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Hiikkoo Waraabi"
                      >
                        {copiedId === item.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Waraabbameera!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Waraabi</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGoToPrecedent(item)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Gara galmee murtee guutuu dhaddacha ijibbaataatti darbi"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Galmee Murtee (Precedent)</span>
                      </button>

                      {onSendToExplain && (
                        <button
                          type="button"
                          onClick={() => handleDeepDiveAI(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Ibsa seeraa bal'aa AI tiin qoradhu"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">Ibsa AI</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Provision Interpreted Header Box */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Tumaa Seeraa Hiikkoon Itti Kenname (Statutory Provision Interpreted):</span>
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-amber-300 font-serif-legal">
                      {item.statutoryProvisionInterpreted.codeOrProclamation}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {item.statutoryProvisionInterpreted[activeLang] || item.statutoryProvisionInterpreted.om}
                    </p>
                  </div>

                  {/* Legal Issue & Binding Ratio */}
                  <div className="space-y-3">
                    {/* Legal Issue */}
                    {item.legalIssue && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <span>📌</span>
                          <span>Gaaffii Seeraa Ijoo (Core Legal Issue):</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {item.legalIssue[activeLang] || item.legalIssue.om}
                        </p>
                        {activeLang !== 'am' && item.legalIssue.am && (
                          <p className="text-[11px] text-slate-400 font-ethiopic leading-relaxed pt-1 border-t border-slate-900">
                            {item.legalIssue.am}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Binding Legal Interpretation (Ratio Decidendi) */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1.5 shadow-inner">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>Hiikkoo Seeraa Dirqisiisaa (Binding Ratio Decidendi - Labsii 454/97 K. 2(1)):</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans font-medium">
                        {item.bindingInterpretationGiven[activeLang] || item.bindingInterpretationGiven.om}
                      </p>
                      {activeLang !== 'am' && item.bindingInterpretationGiven.am && (
                        <p className="text-[11px] text-slate-400 font-ethiopic leading-relaxed pt-1.5 border-t border-slate-900">
                          {item.bindingInterpretationGiven.am}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Parties & Court Footer Meta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-500">Qaamolee:</span>
                      <strong className="text-slate-200">{item.parties[activeLang] || item.parties.om}</strong>
                      {item.parties.am && activeLang !== 'am' && (
                        <span className="text-slate-400 font-ethiopic">({item.parties.am})</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoToPrecedent(item)}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer self-start sm:self-auto"
                    >
                      <span>Murtii Guutuu Dubbisi</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </SmoothHeight>
      </div>
    </div>
  );
};

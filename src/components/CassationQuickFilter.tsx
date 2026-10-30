import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Gavel, 
  BookOpen, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Scale, 
  Bookmark, 
  Share2,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';

export type ProceduralStage = 
  | 'all'
  | 'filing_jurisdiction'
  | 'evidence_burden'
  | 'interim_injunction'
  | 'retrial_opposition'
  | 'execution_stay'
  | 'appellate_procedure'
  | 'merits_judgment';

export type CaseCategoryFilter = 
  | 'all'
  | 'procedure'
  | 'property'
  | 'contract'
  | 'labor'
  | 'commercial'
  | 'family'
  | 'criminal';

interface CassationQuickFilterProps {
  currentLang: Language;
  precedents?: CassationPrecedent[];
  onSelectPrecedent?: (precedent: CassationPrecedent) => void;
}

export const CassationQuickFilter: React.FC<CassationQuickFilterProps> = ({ 
  currentLang,
  precedents,
  onSelectPrecedent
}) => {
  const sourcePrecedents = precedents || CASSATION_PRECEDENTS_DATA;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<ProceduralStage>('all');
  const [selectedCategory, setSelectedCategory] = useState<CaseCategoryFilter>('all');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<'all' | 'federal' | 'oromia'>('all');
  const [expandedId, setExpandedId] = useState<string | null>('cass_249062');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Stage mapping helper based on statutory provisions and keywords
  const matchesProceduralStage = (p: CassationPrecedent, stage: ProceduralStage): boolean => {
    if (stage === 'all') return true;

    const fullText = [
      p.category,
      p.statutoryProvisions.join(' '),
      p.legalIssue.om,
      p.legalIssue.am,
      p.legalIssue.en,
      p.bindingPrinciple.om,
      p.bindingPrinciple.am,
      p.bindingPrinciple.en
    ].join(' ').toLowerCase();

    switch (stage) {
      case 'filing_jurisdiction':
        return /keeyyata 80|keeyyata 244|keeyyata 245|keeyyata 5|aangoo|አንቀጽ 80|አንቀጽ 244|jurisdiction|res judicata|mormii duraa/i.test(fullText);
      case 'evidence_burden':
        return /keeyyata 137|keeyyata 246|ragaa|madaallii|ጭብጥ|ማስረጃ|burden of proof|evidence|witness|dhageettii/i.test(fullText);
      case 'interim_injunction':
        return /keeyyata 154|dhorkaa|injunction|ዕግድ|attachment|provisional/i.test(fullText);
      case 'retrial_opposition':
        return /keeyyata 6|keeyyata 358|daagim|ዳግም ዳኝነት|የፍርድ መቃወሚያ|re-trial|opposition|third-party/i.test(fullText);
      case 'execution_stay':
        return /keeyyata 197|keeyyata 378|raawwii|አፈፃፀም|stay|dhaabbachuu|ዕግድ/i.test(fullText);
      case 'appellate_procedure':
        return /keeyyata 320|keeyyata 337|ol-iyyannoo|ይግባኝ|appeal|grounds/i.test(fullText);
      case 'merits_judgment':
        return /murtii|waliigaltee|dhimma bu'uuraa|ፍርድ|ውል|merits/i.test(fullText) || p.category !== 'procedure';
      default:
        return true;
    }
  };

  // Filtered precedents
  const filteredPrecedents = useMemo(() => {
    return sourcePrecedents.filter((p) => {
      // Jurisdiction filter
      if (selectedJurisdiction !== 'all' && p.courtJurisdiction !== selectedJurisdiction) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Procedural Stage filter
      if (!matchesProceduralStage(p, selectedStage)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchable = [
          p.fileNumber,
          `vol ${p.volume}`,
          p.category,
          p.courtJurisdiction,
          p.statutoryProvisions.join(' '),
          p.parties.om,
          p.parties.am,
          p.parties.en,
          p.legalIssue.om,
          p.legalIssue.am,
          p.legalIssue.en,
          p.bindingPrinciple.om,
          p.bindingPrinciple.am,
          p.bindingPrinciple.en
        ].join(' ').toLowerCase();

        return searchable.includes(q);
      }

      return true;
    });
  }, [selectedJurisdiction, selectedCategory, selectedStage, searchQuery]);

  // Copy citation helper
  const handleCopyCitation = (p: CassationPrecedent) => {
    const citationText = `⚖️ SUPREME COURT CASSATION PRECEDENT:
📂 File No: ${p.fileNumber} (Vol. ${p.volume}, ${p.yearEC} E.C. / ${p.yearGC} G.C.)
🏛️ Court: ${p.courtName?.[currentLang] || p.courtName?.om || 'Federal Supreme Court'}
👥 Parties: ${p.parties[currentLang] || p.parties.om}
📜 Category: ${p.category.toUpperCase()} | Statutes: ${p.statutoryProvisions.join(', ')}
🎯 Binding Principle (Murtii Dirqisiisaa):
"${p.bindingPrinciple[currentLang] || p.bindingPrinciple.om}"
(Source: Supreme Court Cassation Precedents - Seera AI)`;

    navigator.clipboard.writeText(citationText);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden text-left">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>
                  {currentLang === 'om' ? 'Calaltuu Murteewwan Dhaddacha Ijoo' : currentLang === 'am' ? 'የሰበር ውሳኔዎች ፈጣን ማጣሪያ' : 'Supreme Court Precedent Quick-Search'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                  {filteredPrecedents.length} Argaman
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'om'
                  ? 'Sadarkaa deemsa falmii (Procedural Stage) fi gosa dhimmaatiin (Case Category) murteewwan dirqisiisoo Dhaddacha Ijibbaataa saffisaan calalaa.'
                  : currentLang === 'am'
                  ? 'በክርክር ሂደት ደረጃ (Procedural Stage) እና በጉዳይ ዘርፍ (Category) አስገዳጅ የሰበር ውሳኔዎችን በፍጥነት አጣርተው ያግኙ።'
                  : 'Quickly highlight binding Supreme Court Cassation precedents by procedural stage, category, or legal provisions.'}
              </p>
            </div>
          </div>
        </div>

        {/* Jurisdiction Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setSelectedJurisdiction('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedJurisdiction === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentLang === 'om' ? 'Hundumaa' : 'ሁሉንም'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedJurisdiction('federal')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedJurisdiction === 'federal' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Federaalaa (FDRE)
          </button>
          <button
            type="button"
            onClick={() => setSelectedJurisdiction('oromia')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedJurisdiction === 'oromia' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Oromiyaa (OSC)
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            currentLang === 'om'
              ? 'Lakk. Galmee, qabxii seeraa, keeyyata (fkn: 358, 6, 244, 137, Daagim-daanyummaa, Lafa)...'
              : currentLang === 'am'
              ? 'የመዝገብ ቁጥር፣ የህግ ነጥብ ወይም አንቀጽ (ለምሳሌ፡ 358፣ 6፣ 244፣ 137፣ ዳግም ዳኝነት፣ መሬት)...'
              : 'Search file number, legal issue, statutory provision (e.g. Art. 358, 6, 244, Re-trial, Land)...'
          }
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-xs text-slate-500 hover:text-slate-300 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* FILTER 1: PROCEDURAL STAGES */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentLang === 'om' ? '1. Sadarkaa Deemsa Falmii (Procedural Stage):' : currentLang === 'am' ? '1. የክርክር ሂደት ደረጃ (Procedural Stage)፦' : '1. Procedural Stage:'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', labelOm: 'Hundumaa', labelAm: 'ሁሉም', labelEn: 'All Stages' },
            { id: 'filing_jurisdiction', labelOm: 'Aangoo & Mormii Duraa (Kwt 244)', labelAm: 'ስልጣንና የመጀመሪያ መቃወሚያ (አንቀጽ 244)', labelEn: 'Jurisdiction & Prelim. Objections' },
            { id: 'evidence_burden', labelOm: 'Ragaa & Kakuu (Kwt 137/246)', labelAm: 'ማስረጃና የማስረዳት ሸክም (አንቀጽ 137)', labelEn: 'Evidence & Burden of Proof' },
            { id: 'interim_injunction', labelOm: 'Dhorkaa Yeroo (Kwt 154)', labelAm: 'ጊዜያዊ ዕግድ (አንቀጽ 154)', labelEn: 'Interim Injunctions' },
            { id: 'retrial_opposition', labelOm: 'Daagim-Daanyummaa vs Mormii Murtee (Kwt 6 & 358)', labelAm: 'ዳግም ዳኝነት እና የፍርድ መቃወሚያ (አንቀጽ 6 እና 358)', labelEn: 'Re-trial vs 3rd Party Opposition' },
            { id: 'execution_stay', labelOm: 'Raawwii & Dhaabbannaa (Kwt 197/378)', labelAm: 'አፈፃፀም እና እገዳ (አንቀጽ 197)', labelEn: 'Execution & Stay' },
            { id: 'appellate_procedure', labelOm: 'Ol-Iyyannoo (Kwt 320)', labelAm: 'ይግባኝ (አንቀጽ 320)', labelEn: 'Appellate Review' },
            { id: 'merits_judgment', labelOm: 'Dhimma Bu\'uuraa (Merits)', labelAm: 'ፍሬ ነገርና ዋና ፍርድ', labelEn: 'Substantive Merits' },
          ].map((stage) => {
            const isSelected = selectedStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedStage(stage.id as ProceduralStage)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {currentLang === 'om' ? stage.labelOm : currentLang === 'am' ? stage.labelAm : stage.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER 2: CASE CATEGORY */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-rose-400" />
          <span>{currentLang === 'om' ? '2. Gosa Dhimma Falmii (Case Category):' : currentLang === 'am' ? '2. የጉዳይ ዘርፍ (Case Category)፦' : '2. Case Category:'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', labelOm: 'Hundumaa', labelAm: 'ሁሉም', labelEn: 'All Categories' },
            { id: 'procedure', labelOm: 'Deemsa Falmii (Civil/Crim Procedure)', labelAm: 'ሥነ-ሥርዓት', labelEn: 'Procedure' },
            { id: 'property', labelOm: 'Qabeenya & Lafa (Property & Land)', labelAm: 'ንብረትና መሬት', labelEn: 'Property' },
            { id: 'contract', labelOm: 'Waliigaltee (Contracts)', labelAm: 'ውልና ግዴታ', labelEn: 'Contracts' },
            { id: 'labor', labelOm: 'Hojjetaa & Hojjechiisaa (Labor)', labelAm: 'አሰሪና ሰራተኛ', labelEn: 'Labor' },
            { id: 'commercial', labelOm: 'Daldala (Commercial)', labelAm: 'ንግድ', labelEn: 'Commercial' },
            { id: 'family', labelOm: 'Maatii & Dhaala (Family)', labelAm: 'ቤተሰብ', labelEn: 'Family' },
            { id: 'criminal', labelOm: 'Yakka (Criminal)', labelAm: 'ወንጀል', labelEn: 'Criminal' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as CaseCategoryFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-950/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {currentLang === 'om' ? cat.labelOm : currentLang === 'am' ? cat.labelAm : cat.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* PRECEDENT RESULTS LIST */}
      <div className="space-y-4 pt-2">
        {filteredPrecedents.length === 0 ? (
          <div className="p-12 text-center bg-slate-950/60 rounded-3xl border border-slate-800 space-y-3">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">
              {currentLang === 'om' 
                ? 'Murtiin dhaddacha ijoo ulaagaa calallii kanaan walsimu hin argamne.' 
                : 'በዚህ ማጣሪያ መሰረት የተገኘ የሰበር ውሳኔ የለም።'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStage('all');
                setSelectedCategory('all');
                setSelectedJurisdiction('all');
              }}
              className="text-xs text-amber-400 underline font-bold"
            >
              Calaltuu Haqi (Reset Filters)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-h-[680px] overflow-y-auto pr-1">
            {filteredPrecedents.map((p) => {
              const isExpanded = expandedId === p.id;
              const isCopied = copiedId === p.id;

              return (
                <div
                  key={p.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 ${
                    isExpanded 
                      ? 'bg-slate-950 border-rose-500/50 shadow-xl shadow-rose-950/20' 
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 font-mono font-bold text-xs border border-rose-500/20">
                        Galmee Lakk. {p.fileNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-800">
                        Jildii (Vol.) {p.volume} • {p.yearEC} E.C.
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 font-mono text-[10px] uppercase font-bold border border-amber-500/20">
                        {p.category}
                      </span>
                      {p.courtJurisdiction === 'oromia' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                          Oromiyaa
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-800 flex items-center gap-1 transition-all cursor-pointer"
                        title="Copy binding principle and citation"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{isCopied ? (currentLang === 'om' ? 'Waraabame!' : 'ኮፒ ተደርጓል!') : (currentLang === 'om' ? 'Waraabi' : 'ኮፒ')}</span>
                      </button>

                      {onSelectPrecedent && (
                        <button
                          type="button"
                          onClick={() => onSelectPrecedent(p)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Dhaddachatti Ergi</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
                        title="Toggle full text"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Court & Parties */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">
                      {p.parties[currentLang] || p.parties.om}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {p.courtName?.[currentLang] || p.courtName?.om || 'Mana Murtii Waliigalaa Federaalaa'}
                    </p>
                  </div>

                  {/* Statutory Provisions tags */}
                  {p.statutoryProvisions && p.statutoryProvisions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-mono uppercase text-slate-500">Keeyyattoota (Provisions):</span>
                      {p.statutoryProvisions.map((prov, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono font-medium text-amber-300">
                          {prov}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Legal Issue (Qabxii Falmii) */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      <span>{currentLang === 'om' ? 'Qabxii Seeraa Falmisiise (Legal Issue):' : currentLang === 'am' ? 'አከራካሪው የህግ ነጥብ፦' : 'Legal Issue Framed:'}</span>
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {p.legalIssue[currentLang] || p.legalIssue.om}
                    </p>
                  </div>

                  {/* Binding Principle Excerpt / Full View */}
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-rose-300 flex items-center gap-1">
                      <Gavel className="w-3 h-3" />
                      <span>{currentLang === 'om' ? 'Qajeeltoo Dirqisiisaa (Binding Cassation Principle):' : currentLang === 'am' ? 'አስገዳጅ የሰበር ውሳኔ መርህ፦' : 'Binding Principle:'}</span>
                    </span>

                    <p className={`text-slate-100 leading-relaxed font-sans ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {p.bindingPrinciple[currentLang] || p.bindingPrinciple.om}
                    </p>

                    {!isExpanded && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(p.id)}
                        className="text-[11px] text-rose-400 font-bold hover:underline block pt-1"
                      >
                        {currentLang === 'om' ? 'Guutuu isaa dubbisi...' : 'ሙሉውን አንብብ...'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

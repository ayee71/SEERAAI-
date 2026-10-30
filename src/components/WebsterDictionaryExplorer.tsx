import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Download, 
  ExternalLink, 
  FileText, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Globe, 
  Scale, 
  Layers, 
  Bookmark,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  WEBSTER_DICTIONARY_METADATA, 
  WEBSTER_DICTIONARY_ENTRIES, 
  WEBSTER_LEGAL_ABBREVIATIONS, 
  WEBSTER_LATIN_LEGAL_MAXIMS,
  WebsterDictionaryEntry,
  LegalAbbreviation,
  LatinLegalMaxim 
} from '../data/websterLawDictionary';
import { AudioSpeakButton } from './AudioSpeakButton';

interface WebsterDictionaryExplorerProps {
  currentLang: Language;
  initialSearchQuery?: string;
  onSelectTerm?: (term: string) => void;
}

export const WebsterDictionaryExplorer: React.FC<WebsterDictionaryExplorerProps> = ({
  currentLang,
  initialSearchQuery = '',
  onSelectTerm,
}) => {
  const [sectionTab, setSectionTab] = useState<'dictionary' | 'maxims' | 'abbreviations' | 'pdf_viewer'>('dictionary');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const alphabet = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const categories = [
    { id: 'all', label: currentLang === 'om' ? 'Kutaa Hunda (All)' : 'All Fields' },
    { id: 'civil_procedure', label: currentLang === 'om' ? 'Adeemsa Falmii (Procedure)' : 'Procedure' },
    { id: 'contract_commercial', label: currentLang === 'om' ? 'Daldala & Waliigaltee' : 'Contracts & Commercial' },
    { id: 'criminal_evidence', label: currentLang === 'om' ? 'Yakka & Ragaa' : 'Criminal & Evidence' },
    { id: 'property_real_estate', label: currentLang === 'om' ? 'Qabeenya & Lafa' : 'Property & Real Estate' },
    { id: 'constitutional_administrative', label: currentLang === 'om' ? 'Heera & Bulchiinsa' : 'Constitutional & Admin' },
    { id: 'latin_foreign', label: currentLang === 'om' ? 'Laatiinii (Latin Maxims)' : 'Latin & Foreign' },
  ];

  // Filter dictionary terms
  const filteredTerms = useMemo(() => {
    return WEBSTER_DICTIONARY_ENTRIES.filter((entry) => {
      // Letter filter
      if (selectedLetter !== 'ALL' && !entry.term.toUpperCase().startsWith(selectedLetter)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      return (
        entry.term.toLowerCase().includes(q) ||
        entry.definitionEn.toLowerCase().includes(q) ||
        entry.om.term.toLowerCase().includes(q) ||
        entry.om.definition.toLowerCase().includes(q) ||
        entry.am.term.toLowerCase().includes(q) ||
        entry.am.definition.toLowerCase().includes(q)
      );
    });
  }, [selectedLetter, selectedCategory, searchQuery]);

  // Filter Latin Maxims
  const filteredMaxims = useMemo(() => {
    if (!searchQuery.trim()) return WEBSTER_LATIN_LEGAL_MAXIMS;
    const q = searchQuery.toLowerCase();
    return WEBSTER_LATIN_LEGAL_MAXIMS.filter(
      (m) =>
        m.phrase.toLowerCase().includes(q) ||
        m.literalTranslation.toLowerCase().includes(q) ||
        m.legalMeaningEn.toLowerCase().includes(q) ||
        m.legalMeaningOm.toLowerCase().includes(q) ||
        m.legalMeaningAm.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filter Abbreviations
  const filteredAbbreviations = useMemo(() => {
    if (!searchQuery.trim()) return WEBSTER_LEGAL_ABBREVIATIONS;
    const q = searchQuery.toLowerCase();
    return WEBSTER_LEGAL_ABBREVIATIONS.filter(
      (a) =>
        a.abbr.toLowerCase().includes(q) ||
        a.fullForm.toLowerCase().includes(q) ||
        a.meaningEn.toLowerCase().includes(q) ||
        a.meaningOm.toLowerCase().includes(q) ||
        a.meaningAm.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCopy = async (id: string, textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Book Metadata & Download Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-20 rounded-xl bg-amber-500/20 border-2 border-amber-500/50 flex flex-col items-center justify-center text-center p-1.5 shadow-lg shrink-0">
              <span className="text-xl">📖</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 font-mono mt-0.5">
                Webster's
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Official Asset Stored
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {WEBSTER_DICTIONARY_METADATA.publisher}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-400 font-mono">
                  ISBN: {WEBSTER_DICTIONARY_METADATA.isbn}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-serif-legal font-bold text-slate-100">
                {WEBSTER_DICTIONARY_METADATA.title}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {currentLang === 'om'
                  ? WEBSTER_DICTIONARY_METADATA.descriptionOm
                  : currentLang === 'am'
                  ? WEBSTER_DICTIONARY_METADATA.descriptionAm
                  : WEBSTER_DICTIONARY_METADATA.descriptionEn}
              </p>
            </div>
          </div>

          {/* Action Buttons: View PDF & Download */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'PDF Guutuu Bani (Read PDF)' : 'Open Original PDF'}</span>
            </button>

            <a
              href={WEBSTER_DICTIONARY_METADATA.pdfAssetPath}
              download="Websters_Law_Dictionary.pdf"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
          {[
            { id: 'dictionary', label: currentLang === 'om' ? '📖 Galmee Jechoota (A-Z Terms)' : '📖 A-Z Terms', count: WEBSTER_DICTIONARY_ENTRIES.length },
            { id: 'maxims', label: currentLang === 'om' ? '🏛️ Jechoota Laatiinii (Latin Maxims)' : '🏛️ Latin & Foreign Maxims', count: WEBSTER_LATIN_LEGAL_MAXIMS.length },
            { id: 'abbreviations', label: currentLang === 'om' ? '🔠 Gabaabduulee (Abbreviations)' : '🔠 Legal Abbreviations', count: WEBSTER_LEGAL_ABBREVIATIONS.length },
            { id: 'pdf_viewer', label: currentLang === 'om' ? '📑 In-App PDF Viewer' : '📑 Embedded PDF Book' },
          ].map((tab) => {
            const isSel = sectionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSectionTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSel ? 'bg-amber-950 text-amber-200' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: A-Z DICTIONARY TERMS */}
      {sectionTab === 'dictionary' && (
        <div className="space-y-4">
          {/* Search & Category Filter Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentLang === 'om'
                    ? 'Jechoota seeraa Webster barbaadi (fkn: abandonment, due process, bailment, res judicata)...'
                    : 'Search Webster terms in English, Afaan Oromoo, or አማርኛ...'
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Alphabet Filter Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-thin">
              {alphabet.map((letter) => {
                const isSel = selectedLetter === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setSelectedLetter(letter)}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0 font-bold ${
                      isSel
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
              {categories.map((c) => {
                const isSel = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      isSel
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Count & Status */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              {currentLang === 'om' ? 'Jechoota argaman:' : 'Terms found:'}{' '}
              <strong className="text-amber-400 font-mono">{filteredTerms.length}</strong>
            </span>
            {searchQuery && (
              <span className="text-[11px] text-slate-500">
                Barbaacha: "{searchQuery}"
              </span>
            )}
          </div>

          {/* Dictionary Entries List */}
          <div className="space-y-3">
            {filteredTerms.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              const termToSpeak = `${entry.term}. ${entry.definitionEn}. Afaan Oromoo: ${entry.om.term}. ${entry.om.definition}`;

              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-100 hover:text-amber-300 transition-colors">
                          {entry.term}
                        </h4>
                        <span className="text-xs font-mono text-amber-400 italic">
                          {entry.partOfSpeech}
                        </span>
                        {entry.phonetic && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            /{entry.phonetic}/
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                          {entry.category.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Trilingual Sub-headings */}
                      <div className="text-xs font-medium text-amber-300/90 flex items-center gap-2">
                        <span>Afaan Oromoo: <strong>{entry.om.term}</strong></span>
                        <span>·</span>
                        <span className="font-ethiopic">አማርኛ: <strong>{entry.am.term}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <AudioSpeakButton text={termToSpeak} variant="compact" />
                      
                      <button
                        type="button"
                        onClick={() => handleCopy(entry.id, `⚖️ ${entry.term} (${entry.partOfSpeech})\nDefinition: ${entry.definitionEn}\nAfaan Oromoo (${entry.om.term}): ${entry.om.definition}\nአማርኛ (${entry.am.term}): ${entry.am.definition}`)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Koppisi (Copy)"
                      >
                        {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Primary English Webster Definition */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Webster's Law Dictionary Definition:
                    </span>
                    <p>{entry.definitionEn}</p>
                    {entry.examplesEn && (
                      <p className="text-[11px] text-slate-400 italic">
                        Example: "{entry.examplesEn}"
                      </p>
                    )}
                  </div>

                  {/* Trilingual Equivalents Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {/* Afaan Oromoo Context */}
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Afaan Oromoo: {entry.om.term}
                      </span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {entry.om.definition}
                      </p>
                      {entry.om.usage && (
                        <p className="text-[10px] text-slate-400 italic pt-0.5">
                          Fakkeenya: {entry.om.usage}
                        </p>
                      )}
                    </div>

                    {/* Amharic Context */}
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block font-ethiopic">
                        አማርኛ፡ {entry.am.term}
                      </span>
                      <p className="text-slate-300 leading-relaxed text-[11px] font-ethiopic">
                        {entry.am.definition}
                      </p>
                      {entry.am.usage && (
                        <p className="text-[10px] text-slate-400 italic pt-0.5 font-ethiopic">
                          ምሳሌ፡ {entry.am.usage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sub-definitions & Cross References */}
                  {entry.subDefinitions && entry.subDefinitions.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Sub-definitions & Specific Forms:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {entry.subDefinitions.map((sub, sIdx) => (
                          <div key={sIdx} className="p-2 rounded-lg bg-slate-950 border border-slate-800/60 text-[11px]">
                            <strong className="text-amber-300 block">{sub.term}</strong>
                            <span className="text-slate-300 text-[10px] leading-snug">{sub.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.crossReferences && entry.crossReferences.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400 pt-1">
                      <span>See also:</span>
                      {entry.crossReferences.map((ref, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => {
                            setSearchQuery(ref);
                            setSelectedLetter('ALL');
                          }}
                          className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 hover:text-white border border-slate-800 font-mono text-[10px] cursor-pointer"
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: LATIN MAXIMS & FOREIGN PHRASES */}
      {sectionTab === 'maxims' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <span>🏛️</span>
              <span>Appendix B: Foreign Words, Latin Maxims & Procedural Principles</span>
            </h3>
            <p className="text-xs text-slate-400">
              Qajeeltoowwan fi jechoota Laatiinii seera keessatti yeroo hedduu hojiirra oolan hiika isaanii guutuu waliin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMaxims.map((maxim, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                    {maxim.language}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`max_${idx}`, `${maxim.phrase} - ${maxim.literalTranslation}\nMeaning: ${maxim.legalMeaningEn}\nAfaan Oromoo: ${maxim.legalMeaningOm}`)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    {copiedId === `max_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <h4 className="text-sm font-bold text-amber-300 italic font-serif">
                  "{maxim.phrase}"
                </h4>

                <p className="text-[11px] text-slate-400">
                  <strong>Hiika Jechaa (Literal):</strong> "{maxim.literalTranslation}"
                </p>

                <p className="text-slate-200 leading-relaxed">
                  <strong>Legal Rule:</strong> {maxim.legalMeaningEn}
                </p>

                <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                  <p className="text-emerald-300">
                    <strong>Afaan Oromoo:</strong> {maxim.legalMeaningOm}
                  </p>
                  <p className="text-amber-200 font-ethiopic">
                    <strong>አማርኛ፡</strong> {maxim.legalMeaningAm}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: LEGAL ABBREVIATIONS */}
      {sectionTab === 'abbreviations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <span>🔠</span>
              <span>Appendix A: Standard Legal Abbreviations</span>
            </h3>
            <p className="text-xs text-slate-400">
              Gabaabduulee seeraa (Legal abbreviations and statutory citations).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAbbreviations.map((abbr, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black font-mono text-amber-300">
                    {abbr.abbr}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`abbr_${idx}`, `${abbr.abbr}: ${abbr.fullForm}\n${abbr.meaningEn}`)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    {copiedId === `abbr_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <h5 className="font-bold text-slate-100 text-xs">
                  {abbr.fullForm}
                </h5>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {abbr.meaningEn}
                </p>
                <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
                  <span className="text-amber-400 font-semibold block">Afaan Oromoo:</span>
                  <span>{abbr.meaningOm}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: IN-APP EMBEDDED PDF BOOK VIEWER */}
      {sectionTab === 'pdf_viewer' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <span>📑</span>
                <span>Webster's New World Law Dictionary (Complete 334-Page PDF)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Kitaaba seeraa guutuu asuma keessatti dubbisaa ykn download godhaa.
              </p>
            </div>
            <a
              href={WEBSTER_DICTIONARY_METADATA.pdfAssetPath}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Screen Window</span>
            </a>
          </div>

          <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <iframe
              src={`${WEBSTER_DICTIONARY_METADATA.pdfAssetPath}#toolbar=1&navpanes=1`}
              title="Webster's Law Dictionary PDF"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* MODAL PDF READER POPUP */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">📖</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    {WEBSTER_DICTIONARY_METADATA.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {WEBSTER_DICTIONARY_METADATA.author} · Wiley Publishing
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={WEBSTER_DICTIONARY_METADATA.pdfAssetPath}
                  download="Websters_Law_Dictionary.pdf"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-950">
              <iframe
                src={`${WEBSTER_DICTIONARY_METADATA.pdfAssetPath}#toolbar=1`}
                title="Webster's Law Dictionary PDF Modal"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

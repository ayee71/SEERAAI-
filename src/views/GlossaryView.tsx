import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Bookmark,
  Layers,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Award,
  GraduationCap,
  Scale,
  Brain,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { LEGAL_GLOSSARY_DATA, LegalGlossaryEntry } from '../data/legalGlossary';
import { lookupLegalTerm, DictionaryResponse } from '../services/api';
import { RecentSearches } from '../components/RecentSearches';
import { saveRecentSearch } from '../services/storage';
import { analyticsService } from '../services/analytics';
import { WebsterDictionaryExplorer } from '../components/WebsterDictionaryExplorer';
import { WEBSTER_DICTIONARY_METADATA } from '../data/websterLawDictionary';
import { COURT_TERMINOLOGY_CATALOG } from '../data/courts/courtTerminologyCatalog';

interface GlossaryViewProps {
  currentLang: Language;
  initialQuery?: string;
  initialTab?: 'dictionary' | 'webster' | 'terminology' | 'flashcards' | 'quiz';
  onQueryChange?: (query: string) => void;
}

export const GlossaryView: React.FC<GlossaryViewProps> = ({
  currentLang,
  initialQuery = '',
  initialTab = 'dictionary',
  onQueryChange,
}) => {
  const t = translations[currentLang];

  const [activeTab, setActiveTab] = useState<'dictionary' | 'webster' | 'terminology' | 'flashcards' | 'quiz'>(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [termQuery, setTermQuery] = useState<string>('');
  const [termCategory, setTermCategory] = useState<string>('all');
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null);
  const [recentKey, setRecentKey] = useState(0);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCardIds, setKnownCardIds] = useState<Set<string>>(new Set());

  // Quiz state
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnsweredCount, setQuizAnsweredCount] = useState(0);
  const [quizSeed, setQuizSeed] = useState(0);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      if (onQueryChange) onQueryChange(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // AI online lookup state
  const [aiTermResult, setAiTermResult] = useState<DictionaryResponse | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Debounced save for glossary search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 3) {
      const timer = setTimeout(() => {
        saveRecentSearch(trimmed, 'glossary');
        setRecentKey((k) => k + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const categories = [
    { id: 'all', label: t.glossaryView.categoryAll },
    { id: 'constitutional', label: t.glossaryView.categoryConstitutional },
    { id: 'labor', label: t.glossaryView.categoryLabor },
    { id: 'commercial', label: t.glossaryView.categoryCommercial },
    { id: 'civilCourt', label: t.glossaryView.categoryCivilCourt },
  ];

  // Filter glossary entries by search and category
  const filteredEntries = useMemo(() => {
    return LEGAL_GLOSSARY_DATA.filter((entry) => {
      const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      return (
        entry.om.term.toLowerCase().includes(query) ||
        entry.om.definition.toLowerCase().includes(query) ||
        entry.am.term.toLowerCase().includes(query) ||
        entry.am.definition.toLowerCase().includes(query) ||
        entry.en.term.toLowerCase().includes(query) ||
        entry.en.definition.toLowerCase().includes(query) ||
        entry.sourceReference.toLowerCase().includes(query)
      );
    });
  }, [selectedCategory, searchQuery]);

  const flashcardList = filteredEntries.length > 0 ? filteredEntries : LEGAL_GLOSSARY_DATA;
  const currentCard = flashcardList[cardIndex % flashcardList.length];

  // Generate a 4-option multiple-choice question for quiz mode
  const currentQuiz = useMemo(() => {
    if (flashcardList.length === 0) return null;
    const item = flashcardList[quizQuestionIndex % flashcardList.length];
    const correctDef = item[currentLang]?.definition || item.om.definition;
    const correctTerm = item[currentLang]?.term || item.om.term;

    // Distractors from other entries
    const otherEntries = LEGAL_GLOSSARY_DATA.filter((e) => e.id !== item.id);
    const shuffledOthers = [...otherEntries].sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [
      { text: correctDef, isCorrect: true, termRef: correctTerm },
      ...shuffledOthers.map((o) => ({
        text: o[currentLang]?.definition || o.om.definition,
        isCorrect: false,
        termRef: o[currentLang]?.term || o.om.term,
      })),
    ].sort(() => 0.5 - Math.random());

    return {
      term: correctTerm,
      category: item.category,
      source: item.sourceReference,
      options,
    };
  }, [flashcardList, quizQuestionIndex, currentLang, quizSeed]);

  const handleNextCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev + 1) % flashcardList.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev - 1 + flashcardList.length) % flashcardList.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const nextIdx = Math.floor(Math.random() * flashcardList.length);
    setCardIndex(nextIdx);
  };

  const toggleKnownCard = (id: string) => {
    const updated = new Set(knownCardIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setKnownCardIds(updated);
  };

  const handleAnswerQuiz = (optionIndex: number, isCorrect: boolean) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    setQuizAnsweredCount((prev) => prev + 1);
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuiz = () => {
    setSelectedAnswer(null);
    setQuizQuestionIndex((prev) => prev + 1);
    setQuizSeed((s) => s + 1);
  };

  const handleOnlineLookup = async () => {
    if (!searchQuery.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);

    saveRecentSearch(searchQuery.trim(), 'glossary');
    setRecentKey((k) => k + 1);

    try {
      const data = await lookupLegalTerm(searchQuery.trim());
      setAiTermResult(data);
      
      // Track in analytics
      analyticsService.trackGlossaryTerm(searchQuery.trim());
    } catch (e: any) {
      setLookupError(e.message || 'Lookup failed');
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-amber-400" />
            <span>{t.glossaryView.title}</span>
          </h1>
          <p className="mt-1 text-slate-400 text-xs sm:text-sm">
            Jechoota seeraa Itoophiyaa Afaan Oromoo, አማርኛ, fi English'n qoradhaa, kaardiiwwaniin shaakalaa, fi qormaataan dandeettii keessan madaalaa.
          </p>
        </div>

        {/* View Switcher: Dictionary vs Webster vs Flashcards vs Quiz */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shrink-0 self-start md:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dictionary'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Galmee (Local)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('webster')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'webster'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>📖</span>
            <span>Webster's Law Dictionary</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 font-mono font-bold">
              PDF
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terminology')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'terminology'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Legal Terminology</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'flashcards'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kaardiiwwan (Flashcards)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 font-mono">
              {flashcardList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Qormaata (Quiz Mode)</span>
          </button>
        </div>
      </div>

      {/* Category Pills (Visible in all tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCategory(c.id);
              setCardIndex(0);
              setQuizQuestionIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DICTIONARY VIEW */}
      {activeTab === 'dictionary' && (
        <div className="space-y-6">
          {/* Webster's Law Dictionary Promo Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 rounded-xl bg-amber-500/20 text-amber-300">📖</span>
              <div>
                <span className="text-xs font-bold text-amber-300 block">
                  Webster's New World Law Dictionary (Susan Ellis Wild, Wiley Publishing)
                </span>
                <span className="text-[11px] text-slate-300">
                  Galmee jechoota seeraa addunyaa, jechoota Laatiinii, gabaabduulee fi kitaaba PDF guutuu (334 fuula) appii keessan keessatti qophaa'eera.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('webster')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer transition-colors shadow-sm shrink-0"
            >
              Webster's Bani (Open)
            </button>
          </div>

          {/* Search & AI Lookup Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (onQueryChange) onQueryChange(val);
                  }}
                  placeholder={t.glossaryView.searchPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70 transition-all"
                />
              </div>

              <button
                onClick={handleOnlineLookup}
                disabled={isLookingUp || !searchQuery.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] cursor-pointer"
              >
                {isLookingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.common.loading}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t.glossaryView.lookupButton}</span>
                  </>
                )}
              </button>
            </div>

            <RecentSearches
              currentLang={currentLang}
              category="glossary"
              onSelectSearch={(query) => {
                setSearchQuery(query);
              }}
              mode="under-search"
              refreshTrigger={recentKey}
            />
          </div>

          {/* AI Term Lookup Result Box */}
          {aiTermResult && (
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-100">
                    AI Deep Legal Term Result: <span className="text-amber-400 underline">{aiTermResult.term}</span>
                  </h3>
                </div>
                {aiTermResult.primaryProclamationOrCode && (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-amber-300 font-mono border border-slate-700">
                    {aiTermResult.primaryProclamationOrCode}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Afaan Oromoo</div>
                  <div className="text-sm font-semibold text-slate-100">{aiTermResult.om?.term || '-'}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiTermResult.om?.definition || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-ethiopic">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-sans">አማርኛ</div>
                  <div className="text-sm font-semibold text-slate-100">{aiTermResult.am?.term || '-'}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiTermResult.am?.definition || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">English</div>
                  <div className="text-sm font-semibold text-slate-100">{aiTermResult.en?.term || '-'}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiTermResult.en?.definition || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Glossary Cards List */}
          <div className="space-y-4">
            {filteredEntries.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-semibold">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-amber-400/90 font-semibold">
                    {item.sourceReference}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[11px] font-bold text-amber-400">AFAAN OROMOO</div>
                    <div className="text-sm font-bold text-slate-100">{item.om.term}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.om.definition}</p>
                    <p className="text-[11px] text-slate-500 italic pt-1">{item.om.usage}</p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 font-ethiopic">
                    <div className="text-[11px] font-bold text-amber-400 font-sans">አማርኛ</div>
                    <div className="text-sm font-bold text-slate-100">{item.am.term}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.am.definition}</p>
                    <p className="text-[11px] text-slate-500 italic pt-1 font-sans">{item.am.usage}</p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[11px] font-bold text-amber-400">ENGLISH</div>
                    <div className="text-sm font-bold text-slate-100">{item.en.term}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.en.definition}</p>
                    <p className="text-[11px] text-slate-500 italic pt-1">{item.en.usage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: WEBSTER'S NEW WORLD LAW DICTIONARY */}
      {activeTab === 'webster' && (
        <WebsterDictionaryExplorer
          currentLang={currentLang}
          initialSearchQuery={searchQuery}
          onSelectTerm={(term) => setSearchQuery(term)}
        />
      )}

      {/* TAB 3: INTERACTIVE FLASHCARDS MODE */}
      {activeTab === 'flashcards' && currentCard && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progress & Controls Header */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400">
                Kaardii {(cardIndex % flashcardList.length) + 1} / {flashcardList.length}
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-slate-400">{currentCard.category}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShuffle}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                title="Makaa (Shuffle Cards)"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Makaa</span>
              </button>

              <button
                type="button"
                onClick={() => toggleKnownCard(currentCard.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  knownCardIds.has(currentCard.id)
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{knownCardIds.has(currentCard.id) ? 'Beekeera (Known)' : 'Beekuu (Mark Known)'}</span>
              </button>
            </div>
          </div>

          {/* Flashcard Component */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[340px] bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 hover:border-amber-400 rounded-3xl p-8 shadow-2xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] select-none"
          >
            <div className="flex items-center justify-between text-xs text-amber-400/90 font-mono">
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                <span>{currentCard.sourceReference}</span>
              </span>
              <span className="text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-amber-300">
                {isFlipped ? 'Gariirra (Definition)' : 'Fuuldura (Term)'}
              </span>
            </div>

            {/* Front of Card: Term in Focus */}
            {!isFlipped ? (
              <div className="py-12 text-center space-y-4">
                <span className="text-xs uppercase tracking-widest font-mono text-slate-400">
                  {currentLang === 'om' ? 'Jecha Seeraa' : currentLang === 'am' ? 'የሕግ ቃል' : 'Legal Term'}
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-legal font-bold text-amber-300 tracking-wide">
                  {currentCard[currentLang]?.term || currentCard.om.term}
                </h2>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-400 pt-2">
                  <span>{currentCard.om.term}</span>
                  <span>•</span>
                  <span className="font-ethiopic">{currentCard.am.term}</span>
                  <span>•</span>
                  <span>{currentCard.en.term}</span>
                </div>
                <p className="text-xs text-slate-500 pt-4 flex items-center justify-center gap-1">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Hiika isaa arguuf kaardicha cuqaasaa (Click to Flip)</span>
                </p>
              </div>
            ) : (
              /* Back of Card: Trilingual Definition & Usage */
              <div className="py-6 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 block uppercase">Afaan Oromoo</span>
                    <h4 className="text-xs font-bold text-slate-200">{currentCard.om.term}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{currentCard.om.definition}</p>
                    <p className="text-[10px] text-slate-500 italic pt-1">{currentCard.om.usage}</p>
                  </div>

                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1 font-ethiopic">
                    <span className="text-[10px] font-bold text-amber-400 block uppercase font-sans">አማርኛ</span>
                    <h4 className="text-xs font-bold text-slate-200 font-ethiopic">{currentCard.am.term}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-ethiopic">{currentCard.am.definition}</p>
                    <p className="text-[10px] text-slate-500 italic pt-1 font-sans">{currentCard.am.usage}</p>
                  </div>

                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 block uppercase">English</span>
                    <h4 className="text-xs font-bold text-slate-200">{currentCard.en.term}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{currentCard.en.definition}</p>
                    <p className="text-[10px] text-slate-500 italic pt-1">{currentCard.en.usage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-3">
              <span>Cuqaasi garagalchi</span>
              <span>{knownCardIds.size} / {flashcardList.length} beekamaniiru</span>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePrevCard}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Duraa (Previous)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
            >
              <RotateCw className="w-4 h-4" />
              <span>Garagali (Flip)</span>
            </button>

            <button
              type="button"
              onClick={handleNextCard}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] shadow-lg shadow-amber-950/40"
            >
              <span>Itti Aanu (Next)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: QUIZ MODE */}
      {activeTab === 'quiz' && currentQuiz && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Score Header */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">
                Qabxii: {quizScore} / {quizAnsweredCount}
              </span>
            </div>
            <div className="text-slate-400 font-mono">
              Gaaffii {quizQuestionIndex + 1}
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                {currentQuiz.category}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {currentQuiz.source}
              </span>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                Hiikni seeraa jecha kanaa maali? (What is the legal definition of):
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif-legal font-bold text-amber-300">
                "{currentQuiz.term}"
              </h3>
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {currentQuiz.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                let btnStyle = 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-amber-500/50';

                if (selectedAnswer !== null) {
                  if (opt.isCorrect) {
                    btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/60 font-semibold';
                  } else if (isSelected) {
                    btnStyle = 'bg-red-950/60 border-red-500 text-red-200 ring-1 ring-red-500/60';
                  } else {
                    btnStyle = 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnswerQuiz(idx, opt.isCorrect)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 mt-0.5">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-xs sm:text-sm leading-relaxed flex-1">
                      {opt.text}
                    </span>
                    {selectedAnswer !== null && opt.isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {selectedAnswer !== null && isSelected && !opt.isCorrect && (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback & Next Question */}
            {selectedAnswer !== null && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="text-xs">
                  {currentQuiz.options[selectedAnswer].isCorrect ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sirrii dha! (Correct Answer)</span>
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" />
                      <span>Dogoggora. Deebiin sirrii kan bifa magariisaati.</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextQuiz}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-md transition-all cursor-pointer hover:scale-[1.02] flex items-center gap-2"
                >
                  <span>Gaaffii Itti Aanu (Next Question)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: LEGAL TERMINOLOGY & COURT PROCEEDINGS */}
      {activeTab === 'terminology' && (() => {
        const filteredTerminology = COURT_TERMINOLOGY_CATALOG.filter((item) => {
          const matchesCategory = termCategory === 'all' || item.category === termCategory;
          if (!matchesCategory) return false;

          if (!termQuery.trim()) return true;

          const q = termQuery.toLowerCase();
          return (
            item.title.om.toLowerCase().includes(q) ||
            item.title.am.toLowerCase().includes(q) ||
            item.title.en.toLowerCase().includes(q) ||
            item.definition.om.toLowerCase().includes(q) ||
            item.definition.am.toLowerCase().includes(q) ||
            item.definition.en.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.toLowerCase().includes(q)) ||
            item.lawRef.en.toLowerCase().includes(q)
          );
        });

        const isOm = currentLang === 'om';

        return (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shrink-0">
                    ⚖️
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold font-serif-legal text-white">
                      Trilingual Legal Terminology & Court Proceedings
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {isOm
                        ? 'Jechoota seeraa, adeemsa falmii mana murtii, fi yaad-rimeewwan seeraa Afaan Oromoo, አማርኛ, fi English\'n qoradhaa.'
                        : 'Explore common Ethiopian court proceedings, legal terms, and concepts in Afaan Oromoo, Amharic, and English.'}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs text-amber-400 font-mono">
                  <span>📚 {COURT_TERMINOLOGY_CATALOG.length} Core Concepts</span>
                </div>
              </div>

              {/* Quick Search Filter Bar */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={termQuery}
                    onChange={(e) => setTermQuery(e.target.value)}
                    placeholder={
                      isOm
                        ? 'Adeemsa falmii, jecha seeraa, ykn keeyyataa kanaan barbaadi...'
                        : 'Quick search court proceedings, legal terms, or statutory references...'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                  />
                  {termQuery && (
                    <button
                      type="button"
                      onClick={() => setTermQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
                  {[
                    { id: 'all', label: isOm ? 'Hunda' : 'All' },
                    { id: 'proceedings', label: isOm ? '🏛️ Adeemsa Falmii' : '🏛️ Proceedings' },
                    { id: 'principles', label: isOm ? '⚖️ Qajeeltoo Seeraa' : '⚖️ Principles' },
                    { id: 'commercial_property', label: isOm ? '📜 Daldala & Qabeenya' : '📜 Commercial/Property' },
                    { id: 'criminal_constitutional', label: isOm ? '🚨 Yakkaa & Heera' : '🚨 Criminal/Constitutional' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTermCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                        termCategory === cat.id
                          ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Terminology Cards List */}
            {filteredTerminology.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                {isOm
                  ? `Jechoonni ykn adeemsi falmii "${termQuery}" jedhuun walsimu hin argamne.`
                  : `No court proceedings or legal terms found matching "${termQuery}".`}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredTerminology.map((item) => {
                  const isCopied = copiedTermId === item.id;

                  const handleCopyTrilingual = async () => {
                    const textToCopy = `━━━━━━━━━━━━━━━━━━━━
${item.title.om} | ${item.title.am} | ${item.title.en}
Wabii Seeraa: ${item.lawRef.om}

AFAN OROMOO:
${item.definition.om}

አማርኛ:
${item.definition.am}

ENGLISH:
${item.definition.en}`;

                    try {
                      await navigator.clipboard.writeText(textToCopy);
                      setCopiedTermId(item.id);
                      setTimeout(() => setCopiedTermId(null), 2000);
                    } catch (err) {
                      console.error('Failed to copy term:', err);
                    }
                  };

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold uppercase">
                            ⚖️ {item.lawRef.en}
                          </span>

                          <button
                            type="button"
                            onClick={handleCopyTrilingual}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                              isCopied
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                            }`}
                          >
                            <span>{isCopied ? '✓' : '📋'}</span>
                            <span>{isCopied ? 'Waraabameera' : 'Copy'}</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Afaan Oromoo Section */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                              Afaan Oromoo
                            </span>
                            <h3 className="text-sm font-bold text-white">{item.title.om}</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">{item.definition.om}</p>
                          </div>

                          {/* Amharic Section */}
                          <div className="pt-2.5 border-t border-slate-800/80 space-y-1 font-ethiopic">
                            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider font-sans">
                              አማርኛ
                            </span>
                            <h3 className="text-sm font-bold text-white">{item.title.am}</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">{item.definition.am}</p>
                          </div>

                          {/* English Section */}
                          <div className="pt-2.5 border-t border-slate-800/80 space-y-1">
                            <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">
                              English
                            </span>
                            <h3 className="text-sm font-bold text-white">{item.title.en}</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">{item.definition.en}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.keywords.slice(0, 3).map((kw, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery(item.title.om);
                            setActiveTab('dictionary');
                            handleOnlineLookup();
                          }}
                          className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>🤖 AI'n Bal'inaan Ibsi</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

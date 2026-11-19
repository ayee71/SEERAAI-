import React, { useState, useRef, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { LEGAL_FAQ_DATA, LegalFaqItem } from '../data/legalFaqData';
import { Search, BookOpen, Sparkles, ExternalLink, HelpCircle, ChevronDown, ChevronUp, Scale, CheckCircle2, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { StreamingLegalResponse, StreamingStatus } from './StreamingLegalResponse';
import { streamLegalAnalysis, StreamLegalSource, StreamPhase } from '../services/legalStreamClient';

interface LegalHelpFaqProps {
  currentLang: Language;
  onSelectFaqQuery?: (query: string) => void;
}

export const LegalHelpFaq: React.FC<LegalHelpFaqProps> = ({ currentLang, onSelectFaqQuery }) => {
  const t = translations[currentLang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-125-cassation-binding');
  
  // Live Grounding AI Search Streaming State
  const [aiGroundingQuery, setAiGroundingQuery] = useState('');
  const [isGroundingLoading, setIsGroundingLoading] = useState(false);
  const [groundingResult, setGroundingResult] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamingStatus>('idle');
  const [streamPhase, setStreamPhase] = useState<StreamPhase>('grounding');
  const [streamPhaseLabel, setStreamPhaseLabel] = useState<string>('');
  const [streamSources, setStreamSources] = useState<StreamLegalSource[]>([]);
  const [streamModelUsed, setStreamModelUsed] = useState<string>('');
  const [streamElapsedMs, setStreamElapsedMs] = useState<number>(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamFallbackUsed, setStreamFallbackUsed] = useState<boolean>(false);
  const [streamRunId, setStreamRunId] = useState<number>(0);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
    };
  }, []);

  const categories = [
    { id: 'all', label: { om: 'Hunda', am: 'ሁሉም', en: 'All' } },
    { id: 'cassation', label: { om: 'Murtii Ijibbaataa', am: 'የሰበር ውሳኔ', en: 'Cassation Precedents' } },
    { id: 'labor', label: { om: 'Seera Hojjataa', am: 'የአሰሪና ሰራተኛ ህግ', en: 'Labor Law' } },
    { id: 'land_property', label: { om: 'Seera Lafa & Qabeenyaa', am: 'የመሬትና ንብረት ህግ', en: 'Land & Property' } },
    { id: 'family', label: { om: 'Seera Maatii', am: 'የቤተሰብ ህግ', en: 'Family Law' } },
    { id: 'criminal', label: { om: 'Seera Yakkaa', am: 'የወንጀል ህግ', en: 'Criminal Law' } },
    { id: 'procedure', label: { om: 'Seera Adeemsa Falmii', am: 'የሥነ-ሥርዓት ህግ', en: 'Procedural Law' } },
  ];

  const filteredFaqs = LEGAL_FAQ_DATA.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const qText = item.question[currentLang] || item.question.om;
    const aText = item.answer[currentLang] || item.answer.om;
    const refText = item.statuteReference;
    const queryLower = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !queryLower ||
      qText.toLowerCase().includes(queryLower) ||
      aText.toLowerCase().includes(queryLower) ||
      refText.toLowerCase().includes(queryLower) ||
      item.tags.some((tag) => tag.toLowerCase().includes(queryLower));

    return matchesCategory && matchesSearch;
  });

  const handleStopStream = () => {
    streamAbortRef.current?.abort();
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsGroundingLoading(false);
    setStreamStatus((prev) => (prev === 'grounding' || prev === 'streaming' ? 'stopped' : prev));
  };

  const handleRunSearchGrounding = async (queryToRun: string) => {
    const q = queryToRun.trim();
    if (!q) return;

    streamAbortRef.current?.abort();
    if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);

    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    const startedAt = Date.now();

    setIsGroundingLoading(true);
    setStreamRunId((prev) => prev + 1);
    setGroundingResult('');
    setStreamError(null);
    setStreamStatus('grounding');
    setStreamPhase('grounding');
    setStreamPhaseLabel('');
    setStreamSources([]);
    setStreamModelUsed('');
    setStreamFallbackUsed(false);
    setStreamElapsedMs(0);

    streamTimerRef.current = window.setInterval(() => {
      setStreamElapsedMs(Date.now() - startedAt);
    }, 100);

    try {
      await streamLegalAnalysis(
        {
          prompt: q,
          language: currentLang,
          outputLanguages: [currentLang],
          modelTier: 'gemini-4-hydrogen',
          isThinkingMode: false,
          jurisdiction: 'both',
        },
        {
          onPhase: (phase, label) => {
            setStreamPhase(phase);
            setStreamPhaseLabel(label);
            setStreamStatus(phase === 'grounding' ? 'grounding' : 'streaming');
          },
          onSources: (sources) => setStreamSources(sources),
          onChunk: (_delta, accumulated, model) => {
            setStreamStatus('streaming');
            setGroundingResult(accumulated);
            if (model) setStreamModelUsed(model);
          },
          onDone: (payload) => {
            setStreamStatus('completed');
            setStreamModelUsed(payload.modelUsed || '');
            setStreamFallbackUsed(Boolean(payload.fallbackUsed));
            setStreamElapsedMs(payload.durationMs || Date.now() - startedAt);
            if (payload.fullText) setGroundingResult(payload.fullText);
          },
          onError: (err) => {
            setStreamStatus('error');
            setStreamError(err.message);
          },
        },
        abortController.signal
      );
    } catch (err: any) {
      if (abortController.signal.aborted) {
        setStreamStatus('stopped');
      } else {
        setStreamStatus('error');
        setStreamError(err?.message || 'Network error');
      }
    } finally {
      if (streamTimerRef.current !== null) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      if (streamAbortRef.current === abortController) streamAbortRef.current = null;
      setIsGroundingLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Card with Logo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-2 shadow-xl shrink-0 flex items-center justify-center">
              <Scale className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100">
                  {currentLang === 'om'
                    ? 'Gargaarsa Seeraa & Gaaffilee Yeroo Baay\'ee Gaafataman (Legal Help & FAQ)'
                    : currentLang === 'am'
                    ? 'የሕግ እርዳታ እና ተደጋጋሚ ጥያቄዎች (Legal Help & FAQ)'
                    : 'Legal Help & FAQ Center'}
                </h1>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                  Search Grounding Enabled
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {currentLang === 'om'
                  ? 'Gargaarsa seeraa, hiikkoo seeraa, labsii, fi murtiilee dhaddacha ijibbaataa (Telegram @seeraai_ethio/125+) sakatta\'iinsaan mirkaneeffadhu.'
                  : 'የህግ ትርጓሜዎችን፣ አዋጆችን እና የሰበር ውሳኔዎችን ከቴሌግራም @seeraai_ethio/125+ በፍለጋ ማረጋገጫ ያግኙ።'}
              </p>
            </div>
          </div>

          <a
            href="https://t.me/seeraai_ethio/125"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-500/40 text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
          >
            <span>✈️</span>
            <span>Telegram @seeraai_ethio/125+</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Live Search Grounding Prompt Tool */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-amber-500/30 space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {currentLang === 'om'
                  ? 'Search Grounding Tool (Haaromsa Live Google & Telegram SeeraAI)'
                  : 'Live Search Grounding Tool'}
              </span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Gemini 3.8 Search Grounding</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiGroundingQuery}
              onChange={(e) => setAiGroundingQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunSearchGrounding(aiGroundingQuery);
              }}
              placeholder={
                currentLang === 'om'
                  ? 'Gaaffii seeraa haaraa barreessee sakatta\'iinsaan deebii mirkanaa\'e argadhu (fkn: Lakk. Galmee 214539, Labsii 1156)...'
                  : 'Type legal question for live web search grounding citations...'
              }
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-semibold"
            />
            <button
              type="button"
              disabled={isGroundingLoading || !aiGroundingQuery.trim()}
              onClick={() => handleRunSearchGrounding(aiGroundingQuery)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md"
            >
              {isGroundingLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>{currentLang === 'om' ? 'Sakatta\'i (Grounding)' : 'Search Live'}</span>
                </>
              )}
            </button>
          </div>

          {streamStatus !== 'idle' && (
            <div className="mt-3">
              <StreamingLegalResponse
                key={streamRunId}
                currentLang={currentLang}
                query={aiGroundingQuery}
                status={streamStatus}
                phase={streamPhase}
                phaseLabel={streamPhaseLabel}
                streamedText={groundingResult || ''}
                sources={streamSources}
                modelUsed={streamModelUsed}
                elapsedMs={streamElapsedMs}
                errorMessage={streamError}
                fallbackUsed={streamFallbackUsed}
                onStop={handleStopStream}
                onRetry={() => handleRunSearchGrounding(aiGroundingQuery)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Local FAQ Explorer Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">
              {currentLang === 'om' ? 'Gaaffilee Yeroo Baay\'ee Gaafataman (Local Legal FAQs)' : 'Legal FAQs Database'}
            </h2>
          </div>

          {/* Local Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentLang === 'om' ? 'FAQ keessatti barbaadi...' : 'Search FAQs...'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.label[currentLang] || cat.label.om}
            </button>
          ))}
        </div>

        {/* FAQ List Accordion */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 italic text-xs">
              {currentLang === 'om' ? 'Gaaffiin barbaadame hin argamne.' : 'No matching FAQ items found.'}
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              const qText = faq.question[currentLang] || faq.question.om;
              const aText = faq.answer[currentLang] || faq.answer.om;

              return (
                <div
                  key={faq.id}
                  className={`border rounded-2xl transition-all ${
                    isExpanded
                      ? 'border-amber-500/60 bg-slate-950/80 shadow-lg'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                        ❓
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 leading-snug">
                          {qText}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-semibold">
                            {faq.statuteReference}
                          </span>
                          {faq.fileNumber && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              File #{faq.fileNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4.5 pb-4 pt-2 border-t border-slate-800/80 space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 leading-relaxed">
                        {aText}
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          {faq.telegramPostUrl && (
                            <a
                              href={faq.telegramPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-500/30 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>✈️ Post #{faq.fileNumber}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAiGroundingQuery(qText);
                            handleRunSearchGrounding(qText);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{currentLang === 'om' ? 'AI Grounding bilan Sakatta\'i' : 'Search Grounding Definition'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

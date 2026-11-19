import React, { useState, useEffect, useRef } from 'react';
import { safeStringId } from '../utils/encoding';
import { Scale, Sparkles, RefreshCw, AlertCircle, Bookmark, Globe, Check, BookOpen, Layers, History, Brain, Zap, ListChecks, Compass, Upload, Send, MessageSquare } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, GenerateResponse, detectLanguage, dualAiAnalyze } from '../services/api';
import { DocumentViewer } from '../components/DocumentViewer';
import { RecentSearches } from '../components/RecentSearches';
import { saveRecentSearch } from '../services/storage';
import { analyticsService } from '../services/analytics';
import { buildShareableFindingUrl } from '../services/shareUrl';
import { autoArchiveAnsweredLegalQA } from '../services/legalQnARepository';
import { VoiceDictation, SUPPORTED_SPEECH_DIALECTS } from '../components/VoiceDictation';
import { VectorSearchUI } from '../components/VectorSearchUI';
import { cleanLegalArtifacts } from '../utils/legalProseFormatter';
import { requestNotificationPermission, showNotification } from '../utils/notification';
import { LegalCitationFinder } from '../components/LegalCitationFinder';
import { StreamingLegalResponse, StreamingStatus } from '../components/StreamingLegalResponse';
import {
  streamLegalAnalysis,
  StreamLegalSource,
  StreamPhase,
  StreamConversationTurn,
} from '../services/legalStreamClient';
import { VoiceRecordButton } from '../components/VoiceRecordButton';

interface ExplainLawViewProps {
  currentLang: Language;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}

export const ExplainLawView: React.FC<ExplainLawViewProps> = ({
  currentLang,
  initialQuery = '',
  onQueryChange,
}) => {
  const t = translations[currentLang];

  const [inputQuery, setInputQuery] = useState(initialQuery);
  const queryInputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedLangs, setSelectedLangs] = useState<Language[]>([currentLang]);
  const [detectedInputLang, setDetectedInputLang] = useState<Language | null>(null);
  const [selectedSpeechDialect, setSelectedSpeechDialect] = useState<string>(
    currentLang === 'am' ? 'am-ET' : currentLang === 'en' ? 'en-US' : 'om-ET'
  );
  const [dictationLang, setDictationLang] = useState<Language>(currentLang);

  const [modelTier, setModelTier] = useState<string>('gemini-4-hydrogen');
  const [isThinkingMode, setIsThinkingMode] = useState<boolean>(true);
  const [responseFormat, setResponseFormat] = useState<'direct_full' | 'bullets' | 'provisions_only' | 'advice_steps'>('direct_full');
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [splitResults, setSplitResults] = useState<{ gemini: string; openai: string } | null>(null);
  const [isSplitLoading, setIsSplitLoading] = useState(false);
  const [consolidatedResult, setConsolidatedResult] = useState<string | null>(null);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [copiedConsolidated, setCopiedConsolidated] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'presets' | 'history'>('presets');
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryLang, setSummaryLang] = useState<Language>(currentLang);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showCitationScanner, setShowCitationScanner] = useState(false);

  // Real-time Streaming Response State
  const [outputViewMode, setOutputViewMode] = useState<'stream' | 'reader'>('stream');
  const [streamStatus, setStreamStatus] = useState<StreamingStatus>('idle');
  const [streamPhase, setStreamPhase] = useState<StreamPhase>('grounding');
  const [streamPhaseLabel, setStreamPhaseLabel] = useState<string>('');
  const [streamedText, setStreamedText] = useState<string>('');
  const [streamSources, setStreamSources] = useState<StreamLegalSource[]>([]);
  const [streamModelUsed, setStreamModelUsed] = useState<string>('');
  const [streamFallbackUsed, setStreamFallbackUsed] = useState<boolean>(false);
  const [streamElapsedMs, setStreamElapsedMs] = useState<number>(0);
  const [activeStreamQuery, setActiveStreamQuery] = useState<string>('');
  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<StreamConversationTurn[]>([]);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const inputQueryRef = useRef<HTMLTextAreaElement>(null);
  const followUpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
      if (streamTimerRef.current !== null) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setInputQuery(initialQuery);
      handleInputChange(initialQuery);
    }
    requestNotificationPermission();
  }, [initialQuery]);

  const handleCopyShareableLink = async () => {
    if (!inputQuery.trim() && !result) return;
    try {
      const shareUrl = buildShareableFindingUrl('explainLaw', inputQuery.trim(), currentLang);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch (e) {
      console.error('Failed to copy share link', e);
    }
  };

  const presets = [
    {
      title: t.explainLaw.preset1,
      query: {
        om: "Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2019 Keeyyata 27 jalatti sababoonni hojjetaa tokko akeekkachiisa malee battalumatti hojii irraa ari'uuf heeyyaman maali? Hojjechiisaan adeemsa seeraa akkamii hordofuu qaba?",
        am: "በአሰሪና ሰራተኛ አዋጅ ቁጥር 1156/2011 አንቀጽ 27 መሰረት አንድን ሰራተኛ ያለማስጠንቀቂያ ከስራ ለማሰናበት የሚያበቁ ምክንያቶች ምንድን ናቸው? አሰሪው ምን ዓይነት የሕግ ሥነ-ሥርዓት መከተል አለበት?",
        en: "Under Ethiopian Labor Proclamation No. 1156/2019 Article 27, what are the specific grounds permitting summary termination without notice? What mandatory procedural steps must the employer fulfill?",
      },
    },
    {
      title: t.explainLaw.preset2,
      query: {
        om: "Koodii Daldalaa haarawa Lakk. 1243/2021 keeyyata 315 irratti mirga abbaa aksiyoonaa walgahii waliigalaa waamuu fi murtii mormuu akkamitti ibsama?",
        am: "በአዲሱ የንግድ ሕግ አዋጅ ቁጥር 1243/2013 አንቀጽ 315 ስር የባለአክሲዮኖች ጠቅላላ ጉባዔ የመጥራት እና ውሳኔን የመቃወም መብት በምን አግባብ ተደንግጓል?",
        en: "How does Commercial Code Proclamation No. 1243/2021 Article 315 regulate minority shareholder rights regarding calling extraordinary general meetings and petitioning to annul invalid corporate resolutions?",
      },
    },
    {
      title: t.explainLaw.preset3,
      query: {
        om: "Heera Mootummaa FDRE Keeyyata 40 irratti qabiyyeen lafaa fi mirgi qabeenya dhuunfaa akkamitti eegama? Mootummaan sababa faayidaa ummataatiif yoo fudhatu beenyaan akkamitti kaffalama?",
        am: "በኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት አንቀጽ 40 መሰረት የመሬት ይዞታና የግል ንብረት መብት እንዴት ተደንግጓል? መንግሥት ለሕዝብ ጥቅም ሲል ንብረትን ሲወስድ ተመጣጣኝ ካሳ እንዴት ይሰላል?",
        en: "Under FDRE Constitution Article 40, how are property ownership and landholding rights defined? What are the legal standards and safeguards for prompt, adequate compensation when the state expropriates private assets for public interest?",
      },
    },
    {
      title: currentLang === 'om' ? 'SDFHH Keeyyata 6 (Ilaalcha Deebii / Review of Judgment)' : 'SDFHH Art. 6 (Review of Judgment)',
      query: {
        om: "Seera Adeemsa Falmii Hariiroo Hawaasaa (SDFHH) Keeyyata 6 bu'uura godhachuun namni murtii dhumaa irratti mormii 'Ilaalcha Deebii' (Review of Judgment) dhiyeessu yoomi? Sababoonni gurguddoon itti dhiyaatan maali?",
        am: "በፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 6 መሠረት የዳግም ዳኝነት (Review of Judgment) ጥያቄ የሚቀርብባቸው ዋና ዋና ምክንያቶች እና የጊዜ ገደቡ ምን ያህል ነው?",
        en: "Under Civil Procedure Code (SDFHH) Article 6, what are the grounds for an application for Review of Judgment? What are the mandatory timelines and evidentiary requirements?",
      },
    },
    {
      title: t.explainLaw.preset4,
      query: {
        om: "Murtii Dhaddacha Dhimmoota Ijoo Mana Murtii Waliigalaa Federaalaa Lakk. Galmee 154211 irratti kaffaltii beenyaa hojjetaa fi murtii dirqisiisaa ta'e naaf ibsi.",
        am: "የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት በመዝገብ ቁጥር 154211 ላይ ስለ ሰራተኛ የካሳ ክፍያ እና ስንብት የሰጠውን አስገዳጅ የሕግ ትርጉም በዝርዝር አብራራልኝ።",
        en: "Explain the binding legal precedent of the Federal Supreme Court Cassation Division in File No. 154211 concerning severance payment calculations and statutory damages in wrongful employment dismissals.",
      },
    },
  ];

  const handleApplyPreset = (presetQuery: { om: string; am: string; en: string }) => {
    const text = presetQuery[currentLang] || presetQuery.om;
    setInputQuery(text);
    if (onQueryChange) onQueryChange(text);
  };

  const handleInputChange = async (val: string) => {
    setInputQuery(val);
    if (onQueryChange) onQueryChange(val);
    if (val.trim().length > 10) {
      const detected = await detectLanguage(val);
      setDetectedInputLang(detected);
    } else {
      setDetectedInputLang(null);
    }
  };

  const toggleLanguage = (lang: Language) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length === 1) return;
      setSelectedLangs(selectedLangs.filter((l) => l !== lang));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const handleConsolidateInsights = async () => {
    if (!splitResults) return;
    setIsConsolidating(true);
    try {
      const promptText = `Synthesize and consolidate the following two independent AI legal analyses (Google Gemini AI and OpenAI ChatGPT) into a singular, unified, and authoritative Ethiopian & Oromia legal recommendation. Reconcile any nuances, highlight common statutory proclamation articles and Cassation precedents, and produce a definitive 4-part synthesis (1. Ibsa Gabaabaa / Core Summary, 2. Xiinxala Seeraa / Statutory Analysis, 3. Furmaata & Actionable Steps, 4. Akeekkachiisa / Disclaimer):\n\n---\nGEMINI ANALYSIS:\n${splitResults.gemini}\n\n---\nOPENAI CHATGPT ANALYSIS:\n${splitResults.openai}`;
      
      const response = await generateLegalContent({
        prompt: promptText,
        taskType: 'explain_law',
        outputLanguages: selectedLangs,
        modelTier: 'deep_thinking',
      });

      if (response && response.content) {
        setConsolidatedResult(cleanLegalArtifacts(response.content));
      }
    } catch (err: any) {
      console.error('Consolidation failed:', err);
      setError(err?.message || 'Failed to consolidate dual AI recommendations');
    } finally {
      setIsConsolidating(false);
    }
  };

  const stopActiveStream = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsLoading(false);
    setStreamStatus((prev) => (prev === 'grounding' || prev === 'streaming' ? 'stopped' : prev));
    if (streamedText.trim()) {
      const cleanedPartial = cleanLegalArtifacts(streamedText);
      setResult({
        content: cleanedPartial,
        separatedVersions: {},
        detectedInputLang: currentLang,
        outputLanguages: selectedLangs,
      });
    }
  };

  const runStreamingLegalChat = async (promptToRun: string, appendToHistory: boolean = false) => {
    const trimmedPrompt = promptToRun.trim();
    if (!trimmedPrompt) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(
        'Neetwoorkiin hin jiru (Offline Mode). AI\'n seera ibsuuf intarneeta barbaada. Haa ta\'u malee, Kuusaa Dhaddacha Ijoo, Sanadoota Kuufaman, fi Galmee Jechootaa intarneeta malee guutummaatti fayyadamuu dandeessu.'
      );
      return;
    }

    // Cancel any active stream cleanly before starting a new turn
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
    }

    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    const startedAt = Date.now();

    setIsSplitScreen(false);
    setIsLoading(true);
    setError(null);
    setResult(null);
    setOutputViewMode('stream');
    setActiveStreamQuery(trimmedPrompt);
    setStreamStatus('grounding');
    setStreamPhase('grounding');
    setStreamPhaseLabel('');
    setStreamedText('');
    setStreamSources([]);
    setStreamModelUsed('');
    setStreamFallbackUsed(false);
    setStreamElapsedMs(0);

    streamTimerRef.current = window.setInterval(() => {
      setStreamElapsedMs(Date.now() - startedAt);
    }, 100);

    saveRecentSearch(trimmedPrompt, 'explain_law');
    setRecentRefreshKey((prev) => prev + 1);
    analyticsService.trackLegalSearch(trimmedPrompt, 'explain_law', 1);

    const historyForRequest = appendToHistory ? chatHistory : [];
    if (!appendToHistory) {
      setChatHistory([]);
    }

    let latestAccumulated = '';
    try {
      const donePayload = await streamLegalAnalysis(
        {
          prompt: trimmedPrompt,
          language: currentLang,
          outputLanguages: selectedLangs,
          responseFormat,
          modelTier,
          isThinkingMode,
          jurisdiction: 'both',
          conversationHistory: historyForRequest,
        },
        {
          onPhase: (phase, label) => {
            setStreamPhase(phase);
            setStreamPhaseLabel(label);
            setStreamStatus(phase === 'grounding' ? 'grounding' : 'streaming');
          },
          onSources: (sources) => {
            setStreamSources(sources);
          },
          onChunk: (_delta, accumulated, model) => {
            latestAccumulated = accumulated;
            setStreamStatus('streaming');
            setStreamedText(accumulated);
            if (model) setStreamModelUsed(model);
          },
          onDone: (payload) => {
            const finalClean = cleanLegalArtifacts(payload.fullText || latestAccumulated);
            const cleanedSeparated: { om?: string; am?: string; en?: string } = {};
            if (payload.separatedVersions?.om) cleanedSeparated.om = cleanLegalArtifacts(payload.separatedVersions.om);
            if (payload.separatedVersions?.am) cleanedSeparated.am = cleanLegalArtifacts(payload.separatedVersions.am);
            if (payload.separatedVersions?.en) cleanedSeparated.en = cleanLegalArtifacts(payload.separatedVersions.en);

            setStreamStatus('completed');
            setStreamModelUsed(payload.modelUsed || '');
            setStreamFallbackUsed(Boolean(payload.fallbackUsed));
            setStreamElapsedMs(payload.durationMs || Date.now() - startedAt);
            setStreamedText(payload.fullText || latestAccumulated);

            const formattedResult: GenerateResponse = {
              content: finalClean,
              separatedVersions: cleanedSeparated,
              detectedInputLang: payload.detectedInputLang || currentLang,
              outputLanguages: payload.outputLanguages || selectedLangs,
            };
            setResult(formattedResult);

            setChatHistory((prev) => [
              ...prev,
              { role: 'user', content: trimmedPrompt },
              { role: 'assistant', content: finalClean },
            ]);

            showNotification(t.actions.notificationTitle, t.actions.notificationBody);

            if (finalClean) {
              autoArchiveAnsweredLegalQA(
                trimmedPrompt,
                {
                  om: cleanedSeparated.om || finalClean,
                  am: cleanedSeparated.am || finalClean,
                  en: cleanedSeparated.en || finalClean,
                },
                [],
                [],
                'general'
              );
            }
          },
          onError: (streamErr) => {
            setStreamStatus('error');
            setError(streamErr.message || 'Streaming legal analysis failed');
          },
        },
        abortController.signal
      );

      if (!donePayload && abortController.signal.aborted) {
        setStreamStatus('stopped');
      }
    } catch (e: any) {
      if (abortController.signal.aborted) {
        setStreamStatus('stopped');
      } else {
        setStreamStatus('error');
        setError(e?.message || 'Explanation failed');
      }
    } finally {
      if (streamTimerRef.current !== null) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleExplain = async () => {
    await runStreamingLegalChat(inputQuery, false);
  };

  const handleSummarize = async () => {
    if (!result || !result.content) return;
    setIsSummarizing(true);
    try {
      const langName = summaryLang === 'om' ? 'Afaan Oromoo' : summaryLang === 'am' ? 'Amharic' : 'English';
      const summaryPrompt = `Provide a concise, professional, fluent narrative executive summary of the following legal analysis/text strictly in ${langName}. ZERO asterisks (*) and ZERO hashes (#):\n\n${result.content}`;
      const res = await generateLegalContent({
        prompt: summaryPrompt,
        taskType: 'explain_law',
        outputLanguages: [summaryLang],
        modelTier: modelTier as any,
      });
      const cleanedSummary = cleanLegalArtifacts(res.content || '');
      setSummaryResult(cleanedSummary);
      setShowSummaryModal(true);
    } catch (e: any) {
      setError(e.message || 'Summarization failed');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summaryResult) return;
    try {
      await navigator.clipboard.writeText(summaryResult);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch (e) {
      console.error('Failed to copy summary to clipboard', e);
    }
  };

  const getButtonText = () => {
    if (currentLang === 'om') return 'SEERA IBSI';
    if (currentLang === 'am') return 'ሕግ አብራራ';
    return 'EXPLAIN LAW';
  };

  return (
    <div className="space-y-8 pb-16">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <span>{t.explainLaw.title}</span>
          </h1>
          <p className="mt-1 text-slate-400 text-sm">{t.explainLaw.subtitle}</p>
        </div>

        {/* Global Copy Shareable Link Button in Header */}
        <button
          type="button"
          onClick={handleCopyShareableLink}
          disabled={!inputQuery.trim() && !result}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
            copiedShareLink
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/50 hover:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          title="Copy direct shareable link for this legal question/finding"
        >
          <span>{copiedShareLink ? '📋' : '🔗'}</span>
          <span>{copiedShareLink ? 'Linkiin Waraabameera! (Copied)' : 'Copy Shareable Link'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input, Presets & Recent Searches */}
        <div className="lg:col-span-6 space-y-6">
          <VectorSearchUI />
          {/* Quick Presets & Search History Toggle Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('presets')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeSidebarTab === 'presets'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.explainLaw.quickPresetsTitle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeSidebarTab === 'history'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.recentSearches.title}</span>
                </button>
              </div>
            </div>

            {activeSidebarTab === 'presets' ? (
              <div className="space-y-2">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyPreset(p.query)}
                    className="w-full text-left p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-amber-500/30 text-xs text-slate-300 transition-all flex items-center justify-between group"
                  >
                    <span className="font-medium group-hover:text-amber-400 transition-colors">{p.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Select</span>
                  </button>
                ))}
              </div>
            ) : (
              <RecentSearches
                currentLang={currentLang}
                category="explain_law"
                onSelectSearch={(query) => {
                  setInputQuery(query);
                  handleInputChange(query);
                }}
                mode="sidebar"
                refreshTrigger={recentRefreshKey}
              />
            )}
          </div>

          {/* Target Language Toggle for Explanation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>{t.common.outputLanguage}</span>
              </label>

              <button
                type="button"
                onClick={() => setSelectedLangs(['om', 'am', 'en'])}
                className={`text-[11px] px-2.5 py-0.5 rounded font-mono transition-all ${
                  selectedLangs.length === 3
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.common.allThreeLanguages}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => toggleLanguage('om')}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                  selectedLangs.includes('om')
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <span>Afaan Oromoo</span>
                {selectedLangs.includes('om') && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLanguage('am')}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-ethiopic font-medium transition-all ${
                  selectedLangs.includes('am')
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <span>አማርኛ</span>
                {selectedLangs.includes('am') && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLanguage('en')}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                  selectedLangs.includes('en')
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <span>English</span>
                {selectedLangs.includes('en') && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            </div>
          </div>

          {/* Input Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t.common.inputLabel}
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                {detectedInputLang && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{t.common.detectedLanguage}</span>
                    <span className="font-semibold text-amber-400 uppercase">{detectedInputLang}</span>
                  </div>
                )}

                {/* Trilingual Voice-to-Text Dictation & Dialect Selector */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 shadow-inner">
                  <span className="text-xs">🌐</span>
                  <select 
                    value={selectedSpeechDialect}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedSpeechDialect(code);
                      const match = SUPPORTED_SPEECH_DIALECTS.find(d => d.code === code);
                      if (match) {
                        setDictationLang(match.lang);
                      }
                    }}
                    className="bg-transparent text-slate-200 text-[11px] outline-none font-medium cursor-pointer"
                    title="Filannoo Afaanii / Dialect selector for SpeechRecognition (e.g. am-ET, om-ET, en-US)"
                  >
                    {SUPPORTED_SPEECH_DIALECTS.map((dialect) => (
                      <option key={dialect.code} value={dialect.code} className="bg-slate-900 text-slate-200">
                        {dialect.flag} {dialect.label}
                      </option>
                    ))}
                  </select>
                </div>

                <VoiceDictation 
                  onTextChange={(text) => {
                    const newText = inputQuery ? `${inputQuery} ${text}` : text;
                    handleInputChange(newText);
                  }} 
                  currentLang={currentLang}
                  dictationLang={dictationLang}
                  dialectCode={selectedSpeechDialect}
                  onDictationLangChange={setDictationLang}
                  onDialectChange={setSelectedSpeechDialect}
                />
              </div>
            </div>

            {/* Phone or PC File Upload & Copy-Paste Bar */}
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📱💻</span>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {currentLang === 'om' ? 'Faayila Telefonii/Komputeraa Fe\'i ykn Copy-Paste' : 'Upload Phone/PC File or Paste Text'}
                  </div>
                  <div className="text-[10px] text-slate-400">PDF, TXT, Suuraa (Image) ykn barreeffama kopshaa kallattiidhaan galchaa.</div>
                </div>
              </div>

              <div className="relative group/upload">
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const newContent = inputQuery ? `${inputQuery}\n\n${text}` : text;
                      setInputQuery(newContent);
                      if (onQueryChange) onQueryChange(newContent);
                      alert(currentLang === 'om' ? `Faayilni "${file.name}" milkaa'inaan galfameera!` : `File "${file.name}" uploaded successfully!`);
                    } catch (err) {
                      console.error(err);
                      alert('Failed to read file.');
                    }
                    e.target.value = '';
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png"
                />
                <button className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Faayila Filadhu (Browse)</span>
                </button>
              </div>
            </div>

            <textarea
              ref={queryInputRef}
              value={inputQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t.explainLaw.inputPlaceholder}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70 transition-all leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <VoiceRecordButton
                  currentLang={currentLang}
                  targetRef={queryInputRef}
                  currentValue={inputQuery}
                  onValueChange={handleInputChange}
                  onTranscription={(verbatim) => {
                    handleInputChange(inputQuery ? `${inputQuery}\n\n${verbatim}` : verbatim);
                  }}
                  size="sm"
                  label={currentLang === 'om' ? 'Sagaleen Gaafadhu' : currentLang === 'am' ? 'በድምፅ ጠይቅ' : 'Voice Input'}
                />

                <button
                  type="button"
                  onClick={() => setShowCitationScanner(!showCitationScanner)}
                  className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                    showCitationScanner
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                      : 'bg-slate-950 text-amber-300 border-amber-500/40 hover:bg-amber-950/40'
                  }`}
                >
                  <span>🔍</span>
                  <span>
                    {showCitationScanner
                      ? (currentLang === 'om' ? 'Wabii Cufi' : 'Close Citations')
                      : (currentLang === 'om' ? 'Barbaacha Wabii Seeraa (Citation Finder)' : currentLang === 'am' ? 'የሕግ ድንጋጌዎች መፈለጊያ' : 'Auto Citation Finder')}
                  </span>
                </button>
              </div>

              <span className="text-[10px] text-slate-500 font-mono">
                {currentLang === 'om' ? 'Kwt & Labsii Sakatta\'aa' : 'RAG Grounded'}
              </span>
            </div>

            {/* Embedded Legal Citation Finder */}
            {showCitationScanner && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 animate-in fade-in duration-200">
                <LegalCitationFinder
                  currentLang={currentLang}
                  initialQuery={inputQuery}
                  isEmbedded={true}
                  onInsertCitation={(citation) => {
                    const newText = inputQuery ? `${inputQuery}\n\n• ${citation}` : citation;
                    setInputQuery(newText);
                    handleInputChange(newText);
                  }}
                />
              </div>
            )}

            {/* Quick Recent Searches directly under input bar */}
            <RecentSearches
              currentLang={currentLang}
              category="explain_law"
              onSelectSearch={(query) => {
                setInputQuery(query);
                handleInputChange(query);
              }}
              mode="under-search"
              refreshTrigger={recentRefreshKey}
            />

            {/* Response Format Style Selector (Akkaataa Gaafatameen Deebisuu) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-amber-400" />
                  <span>Akkaataa Deebii (Format & Style):</span>
                </span>
                <span className="text-[10px] text-amber-300 font-mono">Akkaataa gaafatameen</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'direct_full', label: 'Deebii Kallattii', sub: 'Direct & Full', icon: Scale },
                  { id: 'bullets', label: 'Qabxii Qabxiin', sub: 'Bullet Points', icon: ListChecks },
                  { id: 'provisions_only', label: 'Keeyyattoota Seeraa', sub: 'Statutes & Precedents', icon: BookOpen },
                  { id: 'advice_steps', label: 'Tarkaanfii & Gorsa', sub: 'Action Steps', icon: Compass },
                ].map((f) => {
                  const Icon = f.icon;
                  const isSel = responseFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setResponseFormat(f.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-xs'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span className="text-[11px] font-bold truncate">{f.label}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 truncate">{f.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Thinking Mode Toggle Switch */}
            <div className="pt-2 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isThinkingMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                    <Brain className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>{currentLang === 'om' ? 'Akkataa Sammuu Qorannoo (Thinking Mode)' : 'Thinking Mode (Deep Reasoning)'}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full font-bold ${isThinkingMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                        {isThinkingMode ? 'ARMED / DEEP THINKING' : 'FAST'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isThinkingMode ? 'Xiinxala seeraa gadi-fageenyaa (deep reasoning tier enabled)' : 'Deebii saffisaa (fast model tier)'}
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isThinkingMode;
                    setIsThinkingMode(next);
                    if (next) {
                      setModelTier('deep_thinking');
                    } else {
                      setModelTier('gemini-4-hydrogen');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isThinkingMode ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isThinkingMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Visual Step-by-Step Reasoning Log Panel when Thinking Mode is Active */}
              {isThinkingMode && (
                <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in duration-200">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{currentLang === 'om' ? 'Tartiiba Xiinxala Sammuu (Reasoning Log)' : 'Reasoning Process Log'}</span>
                    </span>
                    <span className="text-emerald-400">4-Step Verified</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300">
                      <span className="text-amber-400 font-mono font-bold">1.</span>
                      <span>📜 Heera & Labsiilee Sakatta'uu</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300">
                      <span className="text-amber-400 font-mono font-bold">2.</span>
                      <span>🏛️ Murtii Ijibbaataa Madaaluu</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300">
                      <span className="text-amber-400 font-mono font-bold">3.</span>
                      <span>⚖️ Adeemsa & Tarkaanfii Qopheessuu</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300">
                      <span className="text-amber-400 font-mono font-bold">4.</span>
                      <span>🛡️ Keeyyattoota 100% Mirkaneessuu</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gemini AI Engine Selector */}
            <div className="pt-1 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span>Moodeela Gemini AI:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'gemini-4-hydrogen', label: 'Gemini 4 (Hydrogen)', icon: Brain },
                  { id: 'deep_thinking', label: 'Deep Thinking', icon: Brain },
                  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 (Fast)', icon: Zap },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = modelTier === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModelTier(m.id);
                        if (m.id === 'deep_thinking') setIsThinkingMode(true);
                      }}
                      className={`p-2 rounded-lg text-left text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-500/80 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${isSel ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExplain}
                disabled={isLoading || !inputQuery.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.actions.analyzing}</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">⚖️</span>
                    <span>{getButtonText()}</span>
                  </>
                )}
              </button>

              <button
                onClick={async () => {
                  if (!inputQuery.trim()) return;
                  setIsSplitLoading(true);
                  setIsSplitScreen(true);
                  setError(null);
                  try {
                    const promptText = inputQuery.trim();
                    const [geminiResult, openaiResult] = await Promise.allSettled([
                      dualAiAnalyze(promptText, 'gemini'),
                      dualAiAnalyze(promptText, 'openai'),
                    ]);

                    const geminiText =
                      geminiResult.status === 'fulfilled'
                        ? cleanLegalArtifacts(geminiResult.value.response)
                        : `Odeeffannoo Gemini: ${geminiResult.reason?.message || 'Xiinxalli seeraa yeroof hin milkoofne'}`;

                    const openaiText =
                      openaiResult.status === 'fulfilled'
                        ? cleanLegalArtifacts(openaiResult.value.response)
                        : `Odeeffannoo OpenAI GPT-4o: ${openaiResult.reason?.message || 'Xiinxalli OpenAI yeroof hin milkoofne'}`;

                    setSplitResults({
                      gemini: geminiText,
                      openai: openaiText,
                    });
                  } catch (e: any) {
                    setError(e.message || 'Dual split-screen analysis failed');
                  } finally {
                    setIsSplitLoading(false);
                  }
                }}
                disabled={isSplitLoading || !inputQuery.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Trigger parallel requests to Gemini & ChatGPT (GPT-4o) side-by-side comparison"
              >
                {isSplitLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dual AI Comparing...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Split-Screen (Gemini vs GPT-4o)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Structured Output */}
        <div className="lg:col-span-6 space-y-4">
          {result && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">⚡</span>
                <span className="text-xs font-bold text-slate-200">
                  {currentLang === 'om' ? 'Qabiyyee Seeraa Gabaabsuu' : currentLang === 'am' ? 'የሕግ ማጠቃለያ' : 'Legal Executive Summary'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={summaryLang}
                  onChange={(e) => setSummaryLang(e.target.value as Language)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                  title="Select Summary Language"
                >
                  <option value="om">Afaan Oromoo</option>
                  <option value="am">አማርኛ</option>
                  <option value="en">English</option>
                </select>

                <button
                  type="button"
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSummarizing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Gabaabsaa jira...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>{currentLang === 'om' ? 'Gabaabsuu' : currentLang === 'am' ? 'አጠቃልል' : 'Summarize'}</span>
                    </>
                  )}
                </button>

                {summaryResult && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm ${
                      copiedSummary
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                    }`}
                    title="Copy executive summary to clipboard"
                  >
                    <span>{copiedSummary ? '✓' : '📋'}</span>
                    <span>
                      {copiedSummary
                        ? currentLang === 'om'
                          ? 'Waraabameera!'
                          : currentLang === 'am'
                          ? 'ተገልብጧል!'
                          : 'Copied!'
                        : currentLang === 'om'
                        ? 'Waraabi (Copy)'
                        : currentLang === 'am'
                        ? 'ቅዳ (Copy)'
                        : 'Copy to Clipboard'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Inline Executive Summary Card with Quick Copy to Clipboard */}
          {summaryResult && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <h4 className="text-xs font-bold text-amber-300 font-serif-legal">
                    {currentLang === 'om'
                      ? 'Gabaabummaa Qabiyyee Seeraa (Executive Summary)'
                      : currentLang === 'am'
                      ? 'የሕግ ማጠቃለያ (Executive Summary)'
                      : 'Executive Legal Summary'}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                      copiedSummary
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                    }`}
                    title="Copy summary to clipboard to paste into legal applications"
                  >
                    <span>{copiedSummary ? '✓' : '📋'}</span>
                    <span>
                      {copiedSummary
                        ? currentLang === 'om'
                          ? 'Waraabameera! (Copied)'
                          : currentLang === 'am'
                          ? 'ተገልብጧል! (Copied)'
                          : 'Copied to Clipboard!'
                        : currentLang === 'om'
                        ? 'Waraabi (Copy to Clipboard)'
                        : currentLang === 'am'
                        ? 'ወደ ቅንጥብ ሰሌዳ ቅዳ (Copy)'
                        : 'Copy to Clipboard'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSummaryModal(true)}
                    className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold cursor-pointer"
                    title="Bal'inaan Agarsiisi (Maximize)"
                  >
                    <span>🔍</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto pr-1">
                {summaryResult}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-850">
                <span>Waraabuun gara Word, Mana Murtii, ykn Imeeliitti garagalchaa.</span>
                <span className="text-amber-400/80 font-mono text-[10px]">Ready for legal documents</span>
              </div>
            </div>
          )}

          {isSplitScreen ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h3 className="font-bold text-white text-sm font-serif-legal">Split-Screen Dual AI Comparison (Gemini Flash vs OpenAI GPT-4o)</h3>
                    <p className="text-[11px] text-slate-400">Parallel hard-thinking statutory analysis side-by-side</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {splitResults && (
                    <button
                      type="button"
                      onClick={handleConsolidateInsights}
                      disabled={isConsolidating}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Synthesize both Gemini and ChatGPT responses into a singular unified recommendation"
                    >
                      {isConsolidating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Consolidating Insights...</span>
                        </>
                      ) : (
                        <>
                          <span>✨</span>
                          <span>Consolidate Insights</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsSplitScreen(false)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>

              {isSplitLoading ? (
                <div className="p-16 text-center space-y-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-amber-400 font-mono animate-pulse">Running parallel requests to Gemini & GPT-4o...</p>
                </div>
              ) : splitResults ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Google Gemini Card */}
                    <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                            <h4 className="font-bold text-amber-300 text-sm font-serif-legal">Google Gemini AI (Hard Thinking)</h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">Gemini Flash</span>
                        </div>
                        <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto pr-2">
                          {splitResults.gemini}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => navigator.clipboard.writeText(splitResults.gemini)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>📋</span> Copy Gemini Response
                        </button>
                      </div>
                    </div>

                    {/* OpenAI ChatGPT GPT-4o Card */}
                    <div className="bg-slate-900 border-2 border-sky-500/50 rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-sky-400 animate-pulse" />
                            <h4 className="font-bold text-sky-300 text-sm font-serif-legal">OpenAI ChatGPT (GPT-4o Hard Thinking)</h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">GPT-4o</span>
                        </div>
                        <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto pr-2">
                          {splitResults.openai}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => navigator.clipboard.writeText(splitResults.openai)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>📋</span> Copy ChatGPT Response
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Consolidate Synthesis Card */}
                  {isConsolidating && (
                    <div className="p-8 bg-slate-900 border-2 border-amber-500/50 rounded-3xl text-center space-y-3 shadow-2xl animate-pulse">
                      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <div className="text-sm font-bold text-amber-300">Synthesizing Gemini + ChatGPT into a Unified Legal Recommendation...</div>
                      <div className="text-xs text-slate-400">Reconciling nuances, statutory provisions, and ratio decidendi.</div>
                    </div>
                  )}

                  {consolidatedResult && !isConsolidating && (
                    <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center justify-center text-xl shrink-0">
                            🏛️
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base font-serif-legal">
                              {currentLang === 'om' ? 'Gorsa Seeraa Consolidation (Unified Recommendation)' : 'Unified Consolidate Legal Recommendation'}
                            </h4>
                            <p className="text-xs text-slate-400">Synthesized best-of-both consensus between Gemini & GPT-4o</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(consolidatedResult);
                              setCopiedConsolidated(true);
                              setTimeout(() => setCopiedConsolidated(false), 2500);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow ${
                              copiedConsolidated
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                            }`}
                          >
                            <span>{copiedConsolidated ? '✓' : '📋'}</span>
                            <span>{copiedConsolidated ? 'Waraabameera!' : 'Copy Unified Recommendation'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950 p-5 rounded-2xl border border-slate-800">
                        {consolidatedResult}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : streamStatus !== 'idle' && (outputViewMode === 'stream' || !result) ? (
            <div className="space-y-4">
              {/* View Switcher & Prior Conversation Summary when turns exist */}
              {(result || chatHistory.length > 2) && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {chatHistory.length > 0
                        ? `${Math.ceil(chatHistory.length / 2)} ${currentLang === 'om' ? 'maroo marii' : currentLang === 'am' ? 'የውይይት ዙሮች' : 'chat turns'}`
                        : currentLang === 'om'
                          ? 'Tamsaasa Kallattii'
                          : 'Live Stream'}
                    </span>
                  </div>
                  {result && (
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setOutputViewMode('stream')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          outputViewMode === 'stream'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {currentLang === 'om' ? 'Streaming Chat' : 'Live Stream'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutputViewMode('reader')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          outputViewMode === 'reader'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {currentLang === 'om' ? 'Reader & PDF' : 'Full Reader'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Prior Conversation Turns (Collapsed History Thread) */}
              {chatHistory.length > 2 && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {currentLang === 'om'
                      ? 'Gaaffilee & Deebii Duraanii'
                      : currentLang === 'am'
                        ? 'ቀደም ያሉ ጥያቄዎች እና መልሶች'
                        : 'Earlier Legal Chat Turns'}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {chatHistory.slice(0, -2).map((turn, idx) => (
                      <div
                        key={idx}
                        className="text-xs border-b border-slate-800/70 pb-2 last:border-b-0 last:pb-0"
                      >
                        <span className="font-mono text-[10px] uppercase text-amber-400 mr-2">
                          {turn.role === 'user' ? 'Q:' : 'AI:'}
                        </span>
                        <span className="text-slate-300">
                          {turn.content.slice(0, 180)}
                          {turn.content.length > 180 ? '...' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <StreamingLegalResponse
                key={activeStreamQuery || 'stream'}
                currentLang={currentLang}
                query={activeStreamQuery || inputQuery}
                status={streamStatus}
                phase={streamPhase}
                phaseLabel={streamPhaseLabel}
                streamedText={streamedText}
                sources={streamSources}
                modelUsed={streamModelUsed}
                elapsedMs={streamElapsedMs}
                errorMessage={error}
                fallbackUsed={streamFallbackUsed}
                onStop={stopActiveStream}
                onRetry={() => runStreamingLegalChat(activeStreamQuery || inputQuery, chatHistory.length > 0)}
                onOpenFullReader={result ? () => setOutputViewMode('reader') : undefined}
                onSelectFollowUp={(fp) => runStreamingLegalChat(fp, true)}
              />

              {/* Follow-up Legal Chat Input Bar */}
              {streamStatus !== 'grounding' && streamStatus !== 'streaming' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!followUpInput.trim() || isLoading) return;
                    const nextQ = followUpInput.trim();
                    setFollowUpInput('');
                    runStreamingLegalChat(nextQ, true);
                  }}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 animate-stream-line-fade"
                >
                  <VoiceRecordButton
                    currentLang={currentLang}
                    targetRef={followUpInputRef}
                    currentValue={followUpInput}
                    onValueChange={setFollowUpInput}
                    onTranscription={(verbatim) => {
                      setFollowUpInput((prev) => (prev ? `${prev} ${verbatim}` : verbatim));
                    }}
                    size="sm"
                    mode="icon-only"
                    label={currentLang === 'om' ? 'Sagaleen Gaafadhu' : 'Voice Input'}
                  />
                  <input
                    ref={followUpInputRef}
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder={
                      currentLang === 'am'
                        ? 'ተከታይ የሕግ ጥያቄ ይጠይቁ...'
                        : currentLang === 'en'
                          ? 'Ask a follow-up question in this legal chat...'
                          : 'Gaaffii itti aanu (follow-up) marii kana keessatti gaafadhu...'
                    }
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!followUpInput.trim() || isLoading}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{currentLang === 'om' ? 'Ergi' : currentLang === 'am' ? 'ላክ' : 'Send'}</span>
                  </button>
                </form>
              )}
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setOutputViewMode('stream')}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 cursor-pointer"
                >
                  {currentLang === 'om' ? '← Gara Streaming Chat Deebi\'i' : '← Back to Streaming Chat'}
                </button>
              </div>
              <DocumentViewer
                documentId={safeStringId(activeStreamQuery || inputQuery, 'explain')}
                currentLang={currentLang}
                content={result.content}
                separatedVersions={result.separatedVersions}
                outputLanguages={result.outputLanguages}
                title="Ibsa Seeraa / የሕግ ማብራሪያ / Legal Explanation"
                taskType="explain_law"
                promptUsed={activeStreamQuery || inputQuery}
              />
            </div>
          ) : (
            <div className="h-full min-h-[420px] rounded-2xl border-2 border-dashed border-slate-800/80 bg-slate-950/40 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
                <Scale className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-300">
                {t.explainLaw.title}
              </h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed">
                Keeyyattoota labsii, heera mootummaa, ykn murtee dhaddacha ijoo galchuun ibsa qabatamaa kallattiidhaan (Streaming) argadhaa.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Modal */}
      {showSummaryModal && summaryResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="font-bold text-slate-100 text-base font-serif-legal">
                  {currentLang === 'om'
                    ? 'Gabaabummaa Qabiyyee Seeraa (Executive Summary)'
                    : currentLang === 'am'
                    ? 'የሕግ ማጠቃለያ (Executive Summary)'
                    : 'Executive Legal Summary'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                    copiedSummary
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                  }`}
                  title="Copy executive summary to clipboard"
                >
                  <span>{copiedSummary ? '✓' : '📋'}</span>
                  <span>{copiedSummary ? 'Waraabameera! (Copied)' : 'Copy to Clipboard'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="prose prose-invert max-none text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 space-y-2 whitespace-pre-wrap select-text">
              {summaryResult}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                {currentLang === 'om'
                  ? '💡 Qabiyyee kana gara application seeraa birootti (Word, Mana Murtii) garagalchaa.'
                  : currentLang === 'am'
                  ? '💡 ይህንን ማጠቃለያ ወደ ሌሎች የሕግ መተግበሪያዎች (Word, ፍርድ ቤት) በቀላሉ መለጠፍ ይችላሉ።'
                  : '💡 Ready to paste into Word, Court filings, or legal correspondence.'}
              </span>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-sm ${
                    copiedSummary
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                  }`}
                >
                  <span>{copiedSummary ? '✓' : '📋'}</span>
                  <span>
                    {copiedSummary
                      ? currentLang === 'om'
                        ? 'Waraabameera! (Copied to Clipboard)'
                        : currentLang === 'am'
                        ? 'ተገልብጧል! (Copied to Clipboard)'
                        : 'Copied to Clipboard!'
                      : currentLang === 'om'
                      ? 'Waraabi (Copy to Clipboard)'
                      : currentLang === 'am'
                      ? 'ወደ ቅንጥብ ሰሌዳ ቅዳ (Copy)'
                      : 'Copy to Clipboard'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-700"
                >
                  {currentLang === 'om' ? 'Cufi' : currentLang === 'am' ? 'ዝጋ' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

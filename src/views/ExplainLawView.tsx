import React, { useState, useEffect } from 'react';
import { safeStringId } from '../utils/encoding';
import { Scale, Sparkles, RefreshCw, AlertCircle, Bookmark, Globe, Check, BookOpen, Layers, History, Brain, Zap, ListChecks, Compass, Upload } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, GenerateResponse, detectLanguage } from '../services/api';
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
  const [selectedLangs, setSelectedLangs] = useState<Language[]>([currentLang]);
  const [detectedInputLang, setDetectedInputLang] = useState<Language | null>(null);
  const [selectedSpeechDialect, setSelectedSpeechDialect] = useState<string>(
    currentLang === 'am' ? 'am-ET' : currentLang === 'en' ? 'en-US' : 'om-ET'
  );
  const [dictationLang, setDictationLang] = useState<Language>(currentLang);

  const [modelTier, setModelTier] = useState<string>('gemini-flash-lite-latest');
  const [responseFormat, setResponseFormat] = useState<'direct_full' | 'bullets' | 'provisions_only' | 'advice_steps'>('direct_full');

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

  const handleExplain = async () => {
    if (!inputQuery.trim()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(
        'Neetwoorkiin hin jiru (Offline Mode). AI\'n seera ibsuuf intarneeta barbaada. Haa ta\'u malee, Kuusaa Dhaddacha Ijoo, Sanadoota Kuufaman, fi Galmee Jechootaa intarneeta malee guutummaatti fayyadamuu dandeessu.'
      );
      return;
    }
    setIsLoading(true);
    setError(null);

    // Save query to localStorage under 'explain_law' category
    saveRecentSearch(inputQuery, 'explain_law');
    setRecentRefreshKey((prev) => prev + 1);
    
    // Track in analytics
    analyticsService.trackLegalSearch(inputQuery, 'explain_law', 1);

    try {
      let finalPrompt = inputQuery;
      const citationPriorityInstruction = `\n\n[MANDATORY LEGAL ACCURACY & STRUCTURE DIRECTIVE:
You must strictly follow Ethiopian Federal and Oromia Regional statutory laws and binding Cassation precedents.
Provide the response strictly adhering to the 4 Mandatory Sections:
1. Ibsa Gabaabaa (Core Legal Summary)
2. Xiinxala Seeraa (Statutory Analysis with exact Proclamation numbers, Code articles, sub-articles, and Cassation precedent ratio decidendi)
3. Furmaata / Tarkaanfii (Actionable Remedies & procedural next steps)
4. Akeekkachiisa: Always conclude with: "Akeekkachiisa: Kun hubannoo seeraatiif kan qophaa'e qofa; gorsa ogeessa seeraa (abukaatoo) bakka hin bu'u." (or equivalent in Amharic/English).
Eliminate novelistic filler. Deliver direct, authoritative, and strictly verifiable legal counsel.]`;

      const response = await generateLegalContent({
        prompt: finalPrompt,
        taskType: 'explain_law',
        outputLanguages: selectedLangs,
        modelTier: modelTier as any,
      });

      // Post-processing utility: Automatically strip out non-legal artifacts like asterisks or stars (*),
      // hashes (#), and internal risk assessment or source headers
      if (response) {
        if (response.content) response.content = cleanLegalArtifacts(response.content);
        if (response.separatedVersions) {
          if (response.separatedVersions.om) response.separatedVersions.om = cleanLegalArtifacts(response.separatedVersions.om);
          if (response.separatedVersions.am) response.separatedVersions.am = cleanLegalArtifacts(response.separatedVersions.am);
          if (response.separatedVersions.en) response.separatedVersions.en = cleanLegalArtifacts(response.separatedVersions.en);
        }
      }

      setResult(response);
      showNotification(t.actions.notificationTitle, t.actions.notificationBody);

      // Auto-archive answered Q&A with cited statutes
      if (response && response.content) {
        autoArchiveAnsweredLegalQA(
          inputQuery,
          {
            om: response.separatedVersions?.om || response.content,
            am: response.separatedVersions?.am || response.content,
            en: response.separatedVersions?.en || response.content,
          },
          [],
          [],
          'general'
        );
      }
    } catch (e: any) {
      setError(e.message || 'Explanation failed');
    } finally {
      setIsLoading(false);
    }
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
              value={inputQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t.explainLaw.inputPlaceholder}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70 transition-all leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
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

            {/* Gemini AI Engine Selector */}
            <div className="pt-1 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span>Moodeela Gemini AI:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'gemini-flash-lite-latest', label: 'Flash Lite (Auto)', icon: Zap },
                  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 (Fast)', icon: Brain },
                  { id: 'gemini-flash-latest', label: 'Flash Standard', icon: Scale },
                  { id: 'gemini-3.5-pro', label: 'Pro 3.5', icon: Brain },
                  { id: 'gemini-3.5-flash', label: 'Flash 3.5', icon: Zap },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = modelTier === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModelTier(m.id)}
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

            <button
              onClick={handleExplain}
              disabled={isLoading || !inputQuery.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] cursor-pointer"
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

          {result ? (
            <DocumentViewer
              documentId={safeStringId(inputQuery, 'explain')}
              currentLang={currentLang}
              content={result.content}
              separatedVersions={result.separatedVersions}
              outputLanguages={result.outputLanguages}
              title="Ibsa Seeraa / የሕግ ማብራሪያ / Legal Explanation"
              taskType="explain_law"
              promptUsed={inputQuery}
            />
          ) : (
            <div className="h-full min-h-[420px] rounded-2xl border-2 border-dashed border-slate-800/80 bg-slate-950/40 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
                <Scale className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-300">
                {t.explainLaw.title}
              </h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed">
                Keeyyattoota labsii, heera mootummaa, ykn murtee dhaddacha ijoo galchuun ibsa qabatamaa argadhaa.
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

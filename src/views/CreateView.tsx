import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  Check, 
  Globe, 
  AlertCircle, 
  RefreshCw, 
  Wand2, 
  Info, 
  Brain, 
  Zap, 
  Scale, 
  Calculator, 
  Crown, 
  Coins, 
  BookOpen, 
  Cloud, 
  Loader2, 
  Clock,
  Mic,
  MicOff,
  Square,
  Volume2,
  Trash2,
  Layers,
  CheckCircle2,
  ChevronRight,
  Copy,
  Send,
  HelpCircle
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, detectLanguage, GenerateResponse } from '../services/api';
import { DocumentViewer } from '../components/DocumentViewer';
import { VoiceDictation, SUPPORTED_SPEECH_DIALECTS } from '../components/VoiceDictation';
import { LegalDictationToolbar } from '../components/LegalDictationToolbar';
import { useLegalDictation, formatSpokenLegalText } from '../hooks/useLegalDictation';
import { ClauseAutoComplete } from '../components/ClauseAutoComplete';
import { LegalCitationFinder } from '../components/LegalCitationFinder';
import { analyticsService } from '../services/analytics';
import { getUserScopedKey, getUserSettings } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { CourtFeeCalculator } from '../components/CourtFeeCalculator';
import { CourtFeeCalculationResult, calculateOromiaCourtFee } from '../services/courtFeeCalculatorService';
import { SmartCitationLinker } from '../components/SmartCitationLinker';
import { DiscussionPanel } from '../components/DiscussionPanel';
import { MessageSquare, Video } from 'lucide-react';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { PremiumGate } from '../components/PremiumGate';
import { useFirestoreAutoSave } from '../hooks/useFirestoreAutoSave';
import { backgroundSyncManager } from '../services/backgroundSync';
import { CitationPickerModal } from '../components/CitationPickerModal';
import { CitationFixOverlay } from '../components/CitationFixOverlay';
import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { isWriteLocked } from '../services/signOutSafetyService';

interface CreateViewProps {
  currentLang: Language;
  defaultOutputLang?: 'om' | 'am' | 'en' | 'all' | 'same_as_input' | 'ask';
  onNavigateTab?: (tab: string) => void;
}

export const CreateView: React.FC<CreateViewProps> = ({ currentLang, defaultOutputLang = 'om', onNavigateTab }) => {
  const t = translations[currentLang];
  const userBranding = getUserSettings().lawFirmBranding;

  const [selectedTemplate, setSelectedTemplate] = useState('employmentContract');
  const [creationCategory, setCreationCategory] = useState<'contract' | 'social_facebook' | 'social_telegram'>('contract');
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [modelTier, setModelTier] = useState<string>('gemini-flash-lite-latest');
  
  // Output language selections: user can select any combination of ['om', 'am', 'en']
  const [selectedLangs, setSelectedLangs] = useState<Language[]>(['om', 'am', 'en']);
  
  // Auto-detected input language
  const [detectedInputLang, setDetectedInputLang] = useState<Language | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [dictationLang, setDictationLang] = useState<Language>(currentLang);
  const [selectedSpeechDialect, setSelectedSpeechDialect] = useState<string>(
    currentLang === 'am' ? 'am-ET' : currentLang === 'en' ? 'en-US' : 'om-ET'
  );

  // Update default dialect when currentLang changes if user hasn't explicitly customized
  useEffect(() => {
    setSelectedSpeechDialect(currentLang === 'am' ? 'am-ET' : currentLang === 'en' ? 'en-US' : 'om-ET');
    setDictationLang(currentLang);
  }, [currentLang]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  // Auth profile & premium membership
  const { profile } = useAuth();
  const { isPremiumSubscriber: isPremiumUser } = usePremiumAccess();

  // Automated CourtFeeCalculator state
  const [showCourtFeeCalc, setShowCourtFeeCalc] = useState(false);
  const [attachedCourtFee, setAttachedCourtFee] = useState<CourtFeeCalculationResult | null>(() => {
    return calculateOromiaCourtFee({
      claimCategory: 'monetary',
      courtLevel: 'first_instance',
      claimAmountETB: 50000,
      isPremiumUser: Boolean(profile?.subscriptionPlan === 'unlimited' || profile?.subscriptionPlan === 'pro' || profile?.isPremium === true),
    });
  });
  const [showClauseAutoComplete, setShowClauseAutoComplete] = useState(false);
  const [showCitationFinder, setShowCitationFinder] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [showInlineDiscussion, setShowInlineDiscussion] = useState(false);
  const [fixTargetRange, setFixTargetRange] = useState<{ start: number, end: number, original: string } | null>(null);
  const [isCitationPickerOpen, setIsCitationPickerOpen] = useState(false);
  const [citationInitialQuery, setCitationInitialQuery] = useState('');

  // Load saved draft on mount
  useEffect(() => {
    try {
      const savedPrompt = localStorage.getItem(getUserScopedKey('seera_ai_draft_prompt'));
      const savedContext = localStorage.getItem(getUserScopedKey('seera_ai_draft_context'));
      const savedCategory = localStorage.getItem(getUserScopedKey('seera_ai_draft_category'));
      const savedTime = localStorage.getItem(getUserScopedKey('seera_ai_draft_last_saved'));
      if (savedPrompt) {
        setPrompt(savedPrompt);
      }
      if (savedContext) {
        setContext(savedContext);
      }
      if (savedCategory && ['contract', 'social_facebook', 'social_telegram'].includes(savedCategory)) {
        setCreationCategory(savedCategory as any);
      }
      if (savedTime) {
        setLastSavedTime(new Date(savedTime));
      }
    } catch (e) {
      console.error('Failed to load draft', e);
    }
  }, []);

  // Pure Periodic localStorage Auto-Save (Every 10 seconds) to prevent data loss even if Firestore is offline
  useEffect(() => {
    const interval = setInterval(() => {
      if (isWriteLocked()) return;
      if (prompt.trim() || context.trim()) {
        try {
          localStorage.setItem(getUserScopedKey('seera_ai_draft_prompt'), prompt);
          localStorage.setItem(getUserScopedKey('seera_ai_draft_context'), context);
          localStorage.setItem(getUserScopedKey('seera_ai_draft_category'), creationCategory);
          localStorage.setItem(getUserScopedKey('seera_ai_draft_template'), selectedTemplate);
          localStorage.setItem(getUserScopedKey('seera_ai_draft_last_saved'), new Date().toISOString());
          setLastSavedTime(new Date());
          setDraftSaved(true);
          setTimeout(() => setDraftSaved(false), 2000);
        } catch (e) {
          console.error('Periodic local save failed', e);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [prompt, context, creationCategory, selectedTemplate]);

  // 5-Second Debounced Auto-Save Draft to Firestore
  const draftId = getUserScopedKey('create_view_draft');
  const { saveStatus: firestoreSaveStatus, lastSavedAt: firestoreLastSavedAt } = useFirestoreAutoSave({
    docId: draftId,
    collectionName: 'document_drafts',
    debounceMs: 5000,
    data: {
      id: draftId,
      prompt: prompt.trim(),
      context: context.trim(),
      taskType: creationCategory,
      metadata: { template: selectedTemplate },
      userId: profile?.uid || getUserScopedKey('guest'),
      userEmail: profile?.email || undefined,
    },
    enabled: !isWriteLocked() && Boolean(prompt.trim() || context.trim()),
    onSaveSuccess: (savedTime) => {
      setAutoSaveStatus('Draft synced to cloud');
    },
  });

  // Listen for local voice command 'Save draft' and privacy-clear teardown
  useEffect(() => {
    const handleSaveDocument = () => {
      if (isWriteLocked()) return;
      try {
        localStorage.setItem(getUserScopedKey('seera_ai_draft_prompt'), prompt);
        localStorage.setItem(getUserScopedKey('seera_ai_draft_context'), context);
        localStorage.setItem(getUserScopedKey('seera_ai_draft_category'), creationCategory);
        localStorage.setItem(getUserScopedKey('seera_ai_draft_template'), selectedTemplate);
        localStorage.setItem(getUserScopedKey('seera_ai_draft_last_saved'), new Date().toISOString());
        setLastSavedTime(new Date());
        setDraftSaved(true);
        setAutoSaveStatus('Draft saved locally via voice command');
        setTimeout(() => setDraftSaved(false), 2500);
      } catch (e) {
        console.error('Local voice save failed', e);
      }
    };

    const handlePrivacyCleared = () => {
      setPrompt('');
      setContext('');
      setLastSavedTime(null);
      setAutoSaveStatus('');
    };

    window.addEventListener('seera:save_current_document', handleSaveDocument);
    window.addEventListener('seera_privacy_cleared', handlePrivacyCleared);
    return () => {
      window.removeEventListener('seera:save_current_document', handleSaveDocument);
      window.removeEventListener('seera_privacy_cleared', handlePrivacyCleared);
    };
  }, [prompt, context, creationCategory, selectedTemplate]);

  // Template prompt pre-fillers
  const templatePrompts: Record<string, { om: string; am: string; en: string }> = {
    employmentContract: {
      om: "Dhimma waliigaltee hojii dhaabbataa kan mindaan isaa ji'atti birrii 30,000 ta'e, qajeelfama Labsii Hojjetaa fi Hojjechiisaa 1156/2019 bu'uura godhate qopheessi. Seera boqonnaa waggaa, kaffaltii yeroo dabalataa fi haala addaan kutuu of keessatti haa hammatu.",
      am: "የአሰሪና ሰራተኛ አዋጅ ቁጥር 1156/2011ን መሰረት ያደረገ፣ የወር ደመወዙ 30,000 ብር የሆነ ቋሚ የስራ ውል አዘጋጅ። ዓመታዊ ፈቃድን፣ የትርፍ ሰዓት ክፍያን እና የውል ማቋረጥ ድንጋጌዎችን ያካትት።",
      en: "Draft a formal indefinite-period employment contract in accordance with Ethiopian Labor Proclamation No. 1156/2019, with a monthly gross salary of 30,000 ETB. Include statutory clauses for annual leave, overtime compensation, probation period, and termination procedures.",
    },
    commercialLease: {
      om: "Waliigaltee kireeffannaa gamoo daldalaa Finfinnee keessatti argamu waggaa 2f kireeffamu, ji'atti birrii 45,000 kan kaffalamu qopheessi. Koodii Siiviilii Itoophiyaa keeyyata 2896 bu'uura godhadhu.",
      am: "በአዲስ አበባ ከተማ የሚገኝ የንግድ ህንጻ ለ2 ዓመታት የሚቆይ፣ በወር 45,000 ብር የኪራይ ዋጋ ያለው የንግድ ኪራይ ውል አዘጋጅ። በፍትሐብሔር ሕግ ቁጥር 2896 መሰረት የተከራይና አከራይ መብትና ግዴታዎችን በዝርዝር ያካትት።",
      en: "Draft a 2-year commercial building lease agreement located in Addis Ababa with a monthly rent of 45,000 ETB, compliant with the Ethiopian Civil Code provisions on business tenancy (Arts. 2896-2974). Include terms for security deposit, maintenance, and sub-leasing restrictions.",
    },
    powerOfAttorney: {
      om: "Waraqaa bakka-bu'ummaa addaa (Special Power of Attorney) dhimma manaa fi lafaa gurguruu, ragaa qulqulleessuu fi baankii irraa liqii deebisuuf abukaattoof aangoo guutuu kennu qopheessi.",
      am: "የመኖሪያ ቤት እና ይዞታን ለመሸጥ፣ ሰነድ ለማጣራት እና በባንክ የብድር ጉዳዮችን ለማስፈጸም ለጠበቃ ሙሉ ስልጣን የሚሰጥ ልዩ የውክልና ስልጣን ሰነድ (Special Power of Attorney) አዘጋጅ።",
      en: "Draft an irrevocable Special Power of Attorney empowering an attorney-in-fact to represent the principal in property conveyance, landholding authentication before the Document Authentication and Registration Agency (DARA), and municipal transfers.",
    },
    legalWarningNotice: {
      om: "Akeekkachiisa seeraa dhumaa (Final Legal Notice) waliigaltee gatii birrii 150,000 kaffaluu dideef, guyyaa 10 keessatti yoo hin kaffalle gara mana murtii deemamuuf akeekkachiisu.",
      am: "በውል መሰረት የተገባለትን የ150,000 ብር ክፍያ ላልፈጸመ ተበዳሪ፣ በ10 ቀናት ውስጥ ካልከፈለ የፍርድ ቤት ክስ እንደሚመሰረትበት የሚያሳስብ የመጨረሻ የሕግ ማስጠንቀቂያ (Final Legal Notice) አዘጋጅ።",
      en: "Draft a formal legal notice of demand and default regarding an outstanding contractual debt of 150,000 ETB, providing a final cure period of 10 calendar days before instituting court action pursuant to the Ethiopian Civil Code.",
    },
    courtPetition: {
      om: "Himata mana murtii jalqabaa (Court Petition/Pleading) hojjetaan sababa malee hojiirraa gaggeeffame kaffaltii beenyaa fi mindaa ji'oota hafee gaafatu Labsii 1156/2019 keeyyata 43 bu'uura godhachuun qopheessi.",
      am: "ያለአግባብ ከስራ የተሰናበተ ሰራተኛ የካሳ ክፍያና የአገልግሎት ክፍያ እንዲከፈለው የሚጠይቅ የፍርድ ቤት ክስ አቤቱታ (Pleading) በአዋጅ ቁጥር 1156/2011 አንቀጽ 43 መሰረት አዘጋጅ።",
      en: "Draft a formal court petition (statement of claim) for unlawful dismissal under Labor Proclamation No. 1156/2019 Article 43, claiming statutory severance pay, compensation for unfair termination, and unpaid leave allowances.",
    },
    boardResolution: {
      om: "Murtii boordii daarektarootaa waldaa aksiyoonaa haarawa bu'uura Koodii Daldalaa haarawa lakk. 1243/2021 keeyyata 315tiin hojii geggeessaa olaanaa muuduf qophaa'u.",
      am: "በአዲሱ የንግድ ሕግ አዋጅ ቁጥር 1243/2013 አንቀጽ 315 መሰረት ዋና ስራ አስፈፃሚን ለመሾም የተላለፈ የአክሲዮን ማህበር የዳይሬክተሮች ቦርድ የውሳኔ ቃለ-ጉባዔ አዘጋጅ።",
      en: "Draft a formal Board of Directors Resolution for a Share Company resolving to appoint the Chief Executive Officer and grant corporate banking signatory authority under Commercial Code Proclamation No. 1243/2021.",
    },
    legalBrief: {
      om: "Waraqaa gabaabaa seeraa (Legal Brief) dhimma falmii qabeenyaa irratti xiyyeeffatu qopheessi. Qabxiilee falmii (Arguments), xiinxala seeraa (Legal Analysis), fi gaaffii xumuraa (Prayer for Relief) of keessatti haa hammatu.",
      am: "በንብረት ክርክር ላይ ያተኮረ የሕግ አጭር መግለጫ (Legal Brief) አዘጋጅ። የክርክር ነጥቦችን (Arguments)፣ የሕግ ትንተና (Legal Analysis) እና የዳኝነት ጥያቄን (Prayer for Relief) ያካትት።",
      en: "Draft a professional Legal Case Brief focusing on a property dispute. Include structured sections for Case Arguments, Legal Analysis (statutory/precedents), and a formal Prayer for Relief.",
    },
    customPrompt: {
      om: '',
      am: '',
      en: '',
    },
  };

  // When template changes, update the prompt if empty or previously templated
  const handleTemplateChange = (tmpl: string) => {
    setSelectedTemplate(tmpl);
    const tmplObj = templatePrompts[tmpl];
    if (tmplObj) {
      setPrompt(tmplObj[currentLang] || tmplObj.om);
    }
  };

  // Real-time language detection on user typing
  useEffect(() => {
    if (!prompt || prompt.length < 8) {
      setDetectedInputLang(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsDetecting(true);
      const detected = await detectLanguage(prompt);
      setDetectedInputLang(detected);
      setIsDetecting(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [prompt]);

  // Toggle language selection
  const toggleLanguage = (lang: Language) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length === 1) return; // Prevent 0 languages
      setSelectedLangs(selectedLangs.filter((l) => l !== lang));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const selectAllThree = () => {
    setSelectedLangs(['om', 'am', 'en']);
  };

  const selectSingle = (lang: Language) => {
    setSelectedLangs([lang]);
  };

  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showVoiceDictationPanel, setShowVoiceDictationPanel] = useState(false);

  // Setup useLegalDictation for direct hands-free drafting
  const {
    isRecording: isVoiceActive,
    isProcessing: isVoiceProcessing,
    durationSeconds: voiceDuration,
    interimTranscript: voiceInterim,
    audioVolume: voiceVolume,
    error: voiceError,
    startDictation: startVoiceDictation,
    stopDictation: stopVoiceDictation,
    cancelDictation: cancelVoiceDictation,
    insertAtCursor,
  } = useLegalDictation({
    language: dictationLang,
    speechDialect: selectedSpeechDialect,
    legalMode: true,
    onTranscriptionResult: (text, isFinal) => {
      if (text && isFinal) {
        if (promptTextareaRef.current) {
          insertAtCursor(promptTextareaRef.current, text, prompt, setPrompt);
        } else {
          setPrompt((prev) => (prev ? `${prev} ${text}` : text));
        }
      }
    },
  });

  const handleToggleVoiceDrafting = async () => {
    if (isVoiceActive) {
      const transcribed = await stopVoiceDictation();
      if (transcribed && transcribed.trim()) {
        if (promptTextareaRef.current) {
          insertAtCursor(promptTextareaRef.current, transcribed, prompt, setPrompt);
        } else {
          setPrompt((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
        }
      }
    } else {
      await startVoiceDictation();
    }
  };

  const formatVoiceTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Quick legal phrase insertion chips
  const quickLegalSnippets = dictationLang === 'am' ? [
    'በአዋጅ ቁጥር ',
    'በአንቀጽ ',
    'የሰበር ውሳኔ መዝገብ ቁጥር ',
    'የግራ ቀኙ ክርክር ',
    'የውል ግዴታ '
  ] : dictationLang === 'en' ? [
    'Pursuant to Proclamation No. ',
    'In accordance with Article ',
    'Cassation File No. ',
    'The parties hereby agree that ',
    'Terms and conditions '
  ] : [
    'Labsii Lakk. ',
    'Kwt. ',
    'Galmee Lakk. ',
    'Waliigaltee kanaan ',
    'Dirqama qaamolee '
  ];

  const handleInsertSnippet = (snippet: string) => {
    if (promptTextareaRef.current) {
      insertAtCursor(promptTextareaRef.current, snippet, prompt, setPrompt);
    } else {
      setPrompt((prev) => (prev ? `${prev} ${snippet}` : snippet));
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(
        'Neetwoorkiin hin jiru (Offline Mode). AI waliin waliigaltee haaraa qopheessuuf intarneeta barbaada. Haa ta\'u malee, Kuusaa Dhaddacha Ijoo, Sanadoota Kuufaman, fi Galmee Jechootaa intarneeta malee guutummaatti fayyadamuu dandeessu.'
      );
      return;
    }
    setIsGenerating(true);
    setError(null);

    try {
      let enrichedContext = context;
      if (attachedCourtFee && (creationCategory === 'contract' || selectedTemplate === 'courtPetition')) {
        const feeSummaryText = 
          `\n\n[SHALLAGGII KAFFALTII ABBAA SEERUMMAA - DAMBII BARA 2015]:\n` +
          `1. Sadarkaa Mana Murtii: ${attachedCourtFee.courtLevelName}\n` +
          `2. Gosa Dhimmaa: ${attachedCourtFee.claimCategory === 'monetary' ? 'Dhimma Maallaqaa' : attachedCourtFee.claimCategory === 'non_monetary' ? 'Dhimma Gatii Hin Qabne (Fixed)' : 'Ol\'iyyannoo'}\n` +
          `3. Gatii Dhimmaa: ${attachedCourtFee.claimAmountETB.toLocaleString()} ETB\n` +
          `4. Kaffaltii Abbaa Seerummaa Mootummaa: ${attachedCourtFee.totalGovernmentFee.toLocaleString()} ETB ${attachedCourtFee.isExempt ? `(Dhiifama %100: ${attachedCourtFee.exemptionReason})` : ''}\n` +
          `5. Kaffaltii Platformii: ${isPremiumUser ? '0 ETB (Eeyyama Premium - %100 Fee Waived)' : `${attachedCourtFee.standardPlatformProcessingFee} ETB`}\n` +
          `6. Waliigala Kaffaltii Qophii Sanadaa: ${(isPremiumUser ? attachedCourtFee.premiumUserTotal : attachedCourtFee.standardUserTotal).toLocaleString()} ETB\n` +
          `Bu'uura Seeraa: Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016.`;

        if (!enrichedContext.includes('SHALLAGGII KAFFALTII ABBAA SEERUMMAA')) {
          enrichedContext = enrichedContext ? `${enrichedContext}${feeSummaryText}` : feeSummaryText;
        }
      }

      const response = await generateLegalContent({
        prompt,
        context: enrichedContext,
        taskType: creationCategory,
        outputLanguages: selectedLangs,
        modelTier: modelTier as any,
      });
      setResult(response);
      analyticsService.trackDocumentCreation(creationCategory, selectedLangs.join(','));
    } catch (e: any) {
      setError(e.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Trilingual button label mapping as required
  const getButtonLabel = () => {
    if (currentLang === 'om') return 'UUMI';
    if (currentLang === 'am') return 'ፍጠር';
    return 'CREATE';
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-7 h-7 text-amber-400" />
            <span>{t.create.title}</span>
          </h1>
          <p className="mt-1 text-slate-400 text-sm">{t.create.subtitle}</p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          {firestoreSaveStatus === 'saving' && (
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Cloud Syncing...</span>
            </span>
          )}
          {firestoreSaveStatus === 'saved' && (
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
              <Cloud className="w-3.5 h-3.5" />
              <span>Draft Synced</span>
            </span>
          )}
          {draftSaved && (
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saved Locally</span>
            </span>
          )}
        </div>
      </div>

      {/* Category Tabs: Contracts, Facebook Post, Telegram Post */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setCreationCategory('contract')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            creationCategory === 'contract'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>{currentLang === 'om' ? 'Waliigaltee & Sanada Seeraa' : currentLang === 'am' ? 'ውል እና የሕግ ሰነድ' : 'Contracts & Legal Documents'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCreationCategory('social_facebook')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            creationCategory === 'social_facebook'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{currentLang === 'om' ? 'Miidiyaa Facebook' : 'የፌስቡክ ጽሑፍ'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCreationCategory('social_telegram')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            creationCategory === 'social_telegram'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{currentLang === 'om' ? 'Chaanaalii Telegram' : 'የቴሌግራም ቻናል'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Drafting Area & Controls */}
        <div className="lg:col-span-6 space-y-6">
          {/* Template Quick Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{currentLang === 'om' ? 'Fakkii Sanadaa (Template)' : 'የሰነድ አብነት'}</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentLang === 'om' ? 'Qajeelfama DARA / Seera Itoophiyaa' : 'Ethiopian Statutory Forms'}
              </span>
            </div>

            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="employmentContract">📋 Waliigaltee Hojii Dhaabbataa (Employment Contract - Labsii 1156/2019)</option>
              <option value="commercialLease">🏢 Waliigaltee Kireeffannaa Gamoo Daldalaa (Commercial Lease - CC Art. 2896)</option>
              <option value="powerOfAttorney">⚖️ Waraqaa Bakka Bu'ummaa Addaa (Special Power of Attorney - DARA)</option>
              <option value="legalWarningNotice">⚠️ Akeekkachiisa Seeraa Dhumaa (Final Legal Warning Notice)</option>
              <option value="courtPetition">🏛️ Himata Mana Murtii Jalqabaa (Court Petition / Pleading - Kwt. 43)</option>
              <option value="boardResolution">📑 Murtii Boordii Daarektarootaa (Board Resolution - Comm. Code 1243)</option>
              <option value="legalBrief">📜 Waraqaa Gabaabaa Seeraa (Legal Case Brief / Memo)</option>
              <option value="customPrompt">✏️ Qophii Dhuunfaa (Custom Legal Prompt)</option>
            </select>
          </div>

          {/* Target Language Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>{t.common.outputLanguage}</span>
              </label>
              <button
                type="button"
                onClick={selectAllThree}
                className={`text-[11px] px-2.5 py-0.5 rounded font-mono transition-all cursor-pointer ${
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
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all cursor-pointer ${
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
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-ethiopic font-medium transition-all cursor-pointer ${
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
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all cursor-pointer ${
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

          {/* MAIN DRAFTING AREA WITH VOICE-TO-TEXT BUTTON */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 relative">
            {/* Header with Title and Voice-to-Text Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <span>📝</span>
                  <span>{currentLang === 'om' ? 'Qabiyyee Sanadaa (Drafting Area)' : 'የሰነድ ረቂቅ ማዘጋጃ'}</span>
                </label>
                {detectedInputLang && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-amber-400 uppercase">
                    {detectedInputLang}
                  </span>
                )}
              </div>

              {/* HANDS-FREE VOICE-TO-TEXT BUTTON & DIALECT SELECTOR */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Speech Dialect Selector */}
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 shadow-inner">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <select
                    value={selectedSpeechDialect}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedSpeechDialect(code);
                      const match = SUPPORTED_SPEECH_DIALECTS.find((d) => d.code === code);
                      if (match) setDictationLang(match.lang);
                    }}
                    className="bg-transparent text-slate-200 text-[11px] font-medium outline-none cursor-pointer"
                    title="Select Speech Dialect (Afaan Oromoo, Amharic, or English)"
                  >
                    {SUPPORTED_SPEECH_DIALECTS.map((d) => (
                      <option key={d.code} value={d.code} className="bg-slate-900 text-slate-200">
                        {d.flag} {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Primary Voice-to-Text Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleVoiceDrafting}
                  disabled={isVoiceProcessing}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    isVoiceActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/50 animate-pulse border border-rose-400'
                      : isVoiceProcessing
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:border-rose-400'
                  }`}
                  title={isVoiceActive ? 'Stop Voice Recording' : 'Start Hands-Free Voice-to-Text Drafting'}
                >
                  {isVoiceProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>{currentLang === 'om' ? 'Gara barruutti...' : 'በመገልበጥ ላይ...'}</span>
                    </>
                  ) : isVoiceActive ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span className="font-mono font-bold">REC {formatVoiceTimer(voiceDuration)}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-rose-400" />
                      <span>{currentLang === 'om' ? 'Sagaleen Qopheessi' : currentLang === 'am' ? 'በድምፅ ፃፍ' : 'Voice-to-Text'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* LIVE VOICE RECORDING STATUS BANNER */}
            {isVoiceActive && (
              <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-rose-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-bold">
                      {currentLang === 'om' 
                        ? `Sagalee dhaggeeffachaa jira (${dictationLang === 'om' ? 'Afaan Oromoo' : dictationLang === 'am' ? 'አማርኛ' : 'English'})...` 
                        : `Listening hands-free in ${dictationLang === 'om' ? 'Afaan Oromoo' : dictationLang === 'am' ? 'Amharic' : 'English'}...`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold bg-rose-900/60 px-2 py-0.5 rounded text-[11px]">
                      {formatVoiceTimer(voiceDuration)}
                    </span>
                    <button
                      type="button"
                      onClick={cancelVoiceDictation}
                      className="text-rose-400 hover:text-white text-xs underline cursor-pointer"
                    >
                      {currentLang === 'om' ? 'Dhiisi' : 'Cancel'}
                    </button>
                  </div>
                </div>

                {/* Sound level visualizer bar */}
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(10, voiceVolume * 100))}%` }}
                  />
                </div>

                {/* Interim Live Transcript */}
                {voiceInterim && (
                  <p className="text-xs text-rose-100 italic bg-rose-950/90 p-2 rounded-lg border border-rose-800/60 font-mono">
                    "{voiceInterim}"
                  </p>
                )}
              </div>
            )}

            {/* Voice Error Notice */}
            {voiceError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{voiceError}</span>
              </div>
            )}

            {/* Quick Legal Phrase Chips & Voice Recording */}
            <div className="flex items-center justify-between gap-2 flex-wrap py-1 text-[11px]">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] text-slate-500 uppercase font-mono shrink-0 mr-1">
                  {currentLang === 'om' ? 'Jechoota Seeraa:' : 'ፈጣን ቃላት:'}
                </span>
                {quickLegalSnippets.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInsertSnippet(phrase)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-all shrink-0 cursor-pointer text-[11px]"
                  >
                    + {phrase}
                  </button>
                ))}
              </div>
              <VoiceRecordButton
                currentLang={currentLang}
                targetRef={promptTextareaRef}
                currentValue={prompt}
                onValueChange={setPrompt}
                onTranscription={(verbatim) => {
                  setPrompt((prev) => (prev ? `${prev}\n\n${verbatim}` : verbatim));
                }}
                size="sm"
                label={currentLang === 'om' ? 'Sagaleen Qopheessi' : currentLang === 'am' ? 'በድምፅ ቅዳ' : 'Voice Record'}
              />
            </div>

            {/* Textarea for Prompt */}
            <div className="relative">
              <textarea
                ref={promptTextareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder={
                  currentLang === 'om'
                    ? "Waliigaltee ykn sanada seeraa barbaaddan afaan sagaleetiin ykn barreeffamaan asitti qopheessaa... (fakkeenyaaf: Waliigaltee kireeffannaa konkolaataa ji'atti birrii 25,000...)"
                    : currentLang === 'am'
                    ? "የሚፈልጉትን ውል ወይም የሕግ ሰነድ በድምጽ ወይም በጽሑፍ እዚህ ያዘጋጁ... (ምሳሌ፡ የወር 25,000 ብር የኪራይ ውል...)"
                    : "Draft your legal document or contract requirements here using hands-free voice or typing... (e.g., Vehicle lease agreement at 25,000 ETB/month...)"
                }
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-all font-sans leading-relaxed resize-y"
              />

              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 text-xs p-1"
                  title="Clear text"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>{prompt.length} characters • {prompt.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>Hands-free voice enabled</span>
            </div>

            {/* Optional Context/Terms Box */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{currentLang === 'om' ? 'Odeeffannoo Dabalataa (Party Names, Dates, Amounts)' : 'ተጨማሪ መረጃዎች'}</span>
                <span className="text-[10px] text-slate-500 font-normal">(Filannoo / Optional)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                placeholder={
                  currentLang === 'om'
                    ? "Maqaa wal-falmitootaa, guyyaa, bakka, kaffaltii qabatamaa..."
                    : "የተከራካሪዎች ስም፣ ቀን፣ ቦታ፣ ትክክለኛ የክፍያ መጠን..."
                }
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            {/* Court Fee Calculator Quick Attachment */}
            {attachedCourtFee && (
              <div className="p-3 bg-slate-950/80 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-200">
                      {currentLang === 'om' ? 'Shallaggii Kaffaltii Abbaa Seerummaa' : 'የፍርድ ቤት አገልግሎት ክፍያ'}:
                    </span>{' '}
                    <span className="text-amber-400 font-bold font-mono">
                      {(isPremiumUser ? attachedCourtFee.premiumUserTotal : attachedCourtFee.standardUserTotal).toLocaleString()} ETB
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Dambii 2015/2016 Attached
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{currentLang === 'om' ? 'Qopheessaa Jira...' : currentLang === 'am' ? 'በማዘጋጀት ላይ...' : 'Drafting Legal Document...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{getButtonLabel()} ({creationCategory.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Output Document Viewer or Preview Guidance */}
        <div className="lg:col-span-6">
          {isGenerating ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-xl min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-3xl animate-pulse">
                <Scale className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om' ? 'Sanadni Seeraa Qophaa\'aa Jira' : 'የሕግ ሰነዱ በዝግጅት ላይ ነው'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {currentLang === 'om'
                  ? 'Koodii Siivilii, Labsiiwwan hojii, fi dambiiwwan Oromiyaa fi Federaalaa bu\'uura godhachuun AI seeraan qindeessa...'
                  : 'Applying Ethiopian statutory laws, proclamations, and cassation precedents...'}
              </p>
              <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing multi-lingual clauses...</span>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <DocumentViewer
                currentLang={currentLang}
                content={result.content}
                separatedVersions={result.separatedVersions}
                outputLanguages={result.outputLanguages || selectedLangs}
                title={prompt.slice(0, 50) || 'Sanada Seeraa'}
                taskType={creationCategory}
                promptUsed={prompt}
                showQAPanel={true}
              />
            </div>
          ) : (
            /* Idle Guidance Card */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                    {currentLang === 'om' ? 'Qajeelfama Qophii Sanada Seeraa' : 'የሕግ ሰነድ አዘገጃጀት መመሪያ'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    FDRE & Oromia Statutory Compliance
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-300 block">1. Sagaleen Qopheessuu (Hands-Free Dictation)</span>
                  <p className="text-slate-400 leading-relaxed">
                    Botoroo maayikirofooniin (Mic button) gubbaa jiru cuqaasuun sagalee keessaniin Afaan Oromoo, አማርኛ ykn English dhaan dubbadhaa; sirnichi battalatti qabiyyee seeraa qulqulluu qopheessa.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-300 block">2. Mirkaneessa DARA (Civil Code Art. 1723)</span>
                  <p className="text-slate-400 leading-relaxed">
                    Waliigalteen manaa, lafaa, fi kireeffannaa waggaa tokkoo olii barreeffamaan ta'ee Waajjira Mirkaneessa Sanadootaa duratti mirkanaa'uu qaba.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-300 block">3. Ragaalee Lama (Civil Code Art. 1727)</span>
                  <p className="text-slate-400 leading-relaxed">
                    Waliigalteen kamiyyuu ragaalee dandeettii seeraa qaban lamaan mirkanaa'uu qaba.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>SEERAAI Pro v4.1.0</span>
                <span>ISO/IEC 27001 Security Standard</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


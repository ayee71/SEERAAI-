import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Check, Globe, AlertCircle, RefreshCw, Wand2, Info, Brain, Zap, Scale, Calculator, Crown, Coins, BookOpen, Cloud, Loader2, Clock } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, detectLanguage, GenerateResponse } from '../services/api';
import { DocumentViewer } from '../components/DocumentViewer';
import { VoiceDictation, SUPPORTED_SPEECH_DIALECTS } from '../components/VoiceDictation';
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
    enabled: Boolean(prompt.trim() || context.trim()),
    onSaveSuccess: (savedTime) => {
      setAutoSaveStatus('Draft synced to cloud');
    },
  });

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
      
      // Track in analytics
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
          <FileText className="w-7 h-7 text-amber-400" />
          <span>{t.create.title}</span>
        </h1>
        <p className="mt-1 text-slate-400 text-sm">{t.create.subtitle}</p>
      </div>

      {/* Header and Grid */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
         {/* (Header contents) */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-6">
           {/* (Left column contents) */}
        </div>
        {/* Right Column */}
        <div className="lg:col-span-6">
          {/* (Right column contents) */}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-6 border-t border-slate-800/80 ...">
        {/* (Footer contents) */}
      </div>
    </div>
  );

};

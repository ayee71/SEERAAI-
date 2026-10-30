import React, { useState, useEffect, useMemo } from 'react';
import { utf8ToBase64 } from '../utils/encoding';
import {
  UploadCloud,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Languages,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Eye,
  Brain,
  Zap,
  Scale,
  Cpu,
  Info,
  ChevronRight,
  BookOpen,
  Copy,
  Check,
  FileSpreadsheet,
  ExternalLink,
  Search,
  Bookmark,
  Share2,
  X,
  Globe,
  Smartphone,
  Volume2,
  Headphones,
  Download,
  MessageCircle,
  Lock,
  ShieldCheck,
  AlertTriangle,
  History,
  FileDown,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import {
  getBuildStatusSummary,
  checkDatasetAvailability,
  VERIFIED_TELEGRAM_ARCHIVE_URL,
  clearLegalCache,
  verifyExternalDatasetIntegrity,
  GITHUB_LEGAL_ARCHIVE_URL,
  GITHUB_PROFILE_URL,
  GITHUB_CREATE_REPO_URL,
  getEffectiveGitHubUrl,
} from '../services/dynamicAssetLoader';
import {
  verifyDocumentHashWithServer,
  getCachedDocumentHashStatus,
  HashVerificationResult,
  logVerificationToHistory,
  getVerificationHistory,
  clearVerificationHistory,
} from '../services/documentHashVerificationService';
import { exportVerificationHistoryToCsv, exportVerificationHistoryToPdf, downloadCsv, downloadPdf, formatLegalTimestamp } from '../utils/legalReportExport';
import { DocumentHashStatusIndicator } from '../components/DocumentHashStatusIndicator';
import { ProgressiveLegalImageLoader } from '../components/ProgressiveLegalImageLoader';
import { DocumentViewer } from '../components/DocumentViewer';
import { LegalSummaryAudioPlayer } from '../components/LegalSummaryAudioPlayer';
import { downloadLegalSummaryAudio } from '../services/legalAudioExportService';
import { analyzeLegalDocument, AnalyzeDocumentResponse, performLegalLogicSearch, translateLegalText } from '../services/api';
import { processDocumentOffThread } from '../services/documentExtractionService';
import { scanDocumentCitations, DetectedCitation } from '../services/citationFinder';
import { TelegramImportModal } from '../components/TelegramImportModal';
import { DiscussionPanel } from '../components/DiscussionPanel';
import { CitationAutoSuggestDropdown } from '../components/CitationAutoSuggestDropdown';
import { CitationSuggestion } from '../services/citationAutoSuggest';
import { CitationValidatorPanel } from '../components/CitationValidatorPanel';
import { AnnotationTool } from '../components/AnnotationTool';
import { RiskFlaggedSidebar } from '../components/RiskFlaggedSidebar';
import { scanDocumentForLegalRisks, DocumentRiskReport, RiskFlaggedClause } from '../services/legalRiskScanner';
import { LegalLogicAuditorPanel } from '../components/LegalLogicAuditorPanel';
import { ShareDraftModal } from '../components/ShareDraftModal';
import { LegalTerminologySidebar } from '../components/LegalTerminologySidebar';
import { ProceduralHistoryTimelinePanel } from '../components/ProceduralHistoryTimelinePanel';
import { analyticsService } from '../services/analytics';
import { buildShareableFindingUrl } from '../services/shareUrl';
import {
  highlightKeyLegalTerminology,
  wrapKeyLegalTermsHtml,
  countDetectedLegalTerms,
  PredefinedLegalTerm,
} from '../services/legalTerminologyHighlighter';

import { BatchDocumentUploadPanel } from '../components/BatchDocumentUploadPanel';

// Re-export the legal terminology highlight function for DocumentAnalysisView
export { highlightKeyLegalTerminology, wrapKeyLegalTermsHtml };

interface DocumentAnalysisViewProps {
  currentLang: Language;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}

export type GeminiModelChoice =
  | 'gemini-flash-lite-latest'
  | 'gemini-3.1-flash-lite'
  | 'gemini-flash-latest'
  | 'gemini-3.5-pro'
  | 'gemini-3.5-flash';

interface LegalSamplePreset {
  id: string;
  title: { om: string; am: string; en: string };
  badge: { om: string; am: string; en: string };
  content: string;
}

export const DocumentAnalysisView: React.FC<DocumentAnalysisViewProps> = ({
  currentLang,
  initialQuery = '',
  onQueryChange,
}) => {
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const [filesList, setFilesList] = useState<{ file: File; base64: string; mimeType: string; name: string }[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageComparisonMode, setImageComparisonMode] = useState<'tabbed' | 'side_by_side'>('tabbed');
  const [secondaryImageIndex, setSecondaryImageIndex] = useState<number>(1);
  const [extractedQuickLang, setExtractedQuickLang] = useState<Language>(currentLang);
  const [extractedTranslationsCache, setExtractedTranslationsCache] = useState<Partial<Record<Language, string>>>({});
  const [isQuickTranslating, setIsQuickTranslating] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('application/pdf');
  const [pastedText, setPastedText] = useState(initialQuery || '');

  const [modelTier, setModelTier] = useState<GeminiModelChoice>('gemini-flash-lite-latest');
  const [analysisType, setAnalysisType] = useState<
    'risk_analysis' | 'compliance' | 'plain_explanation' | 'translate_document' | 'summarize' | 'extract_text'
  >('risk_analysis');
  const [selectedLangs, setSelectedLangs] = useState<Language[]>([currentLang]);
  const [customQuery, setCustomQuery] = useState('');
  const [archiveDataSource, setArchiveDataSource] = useState<'local' | 'external'>('local');

  const [isLoading, setIsLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeDocumentResponse | null>(null);

  // Web Worker Off-Thread Processing State
  const [isProcessingWorker, setIsProcessingWorker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<string>('');
  const [workerProgress, setWorkerProgress] = useState<number>(0);
  const [workerStats, setWorkerStats] = useState<{
    originalSize: string;
    optimizedSize: string;
    ratio: number;
    durationMs: number;
  } | null>(null);

  // Citation Finder state
  const [detectedCitations, setDetectedCitations] = useState<DetectedCitation[]>([]);
  const [activeOutputTab, setActiveOutputTab] = useState<'content' | 'citations' | 'terminology' | 'timeline' | 'discussion'>('content');
  const [isTimelinePanelOpen, setIsTimelinePanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedHeaderShareLink, setCopiedHeaderShareLink] = useState(false);
  const [showAudioReviewPlayer, setShowAudioReviewPlayer] = useState(false);
  const [isQuickExportingAudio, setIsQuickExportingAudio] = useState(false);
  const [audioExportSuccessToast, setAudioExportSuccessToast] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramSyncToast, setTelegramSyncToast] = useState<string | null>(null);

  // Key Legal Terminology Highlighting State
  const [isPreviewHighlighted, setIsPreviewHighlighted] = useState(false);
  const [selectedTermModal, setSelectedTermModal] = useState<PredefinedLegalTerm | null>(null);
  const [terminologySearchFilter, setTerminologySearchFilter] = useState('');
  const [extractViewMode, setExtractViewMode] = useState<'plain' | 'highlighted'>('highlighted');

  // Social Share Floating Menu State
  const [isSocialMenuOpen, setIsSocialMenuOpen] = useState(false);
  const [copiedSocialLink, setCopiedSocialLink] = useState(false);
  const [activeSocialPlatform, setActiveSocialPlatform] = useState<'facebook' | 'telegram' | 'whatsapp'>('facebook');

  // External Dataset Link Loading & Error State (404/503 wrapper & manual fallback)
  const [isLoadingExternalLink, setIsLoadingExternalLink] = useState(false);
  const [externalLinkError, setExternalLinkError] = useState<string | null>(null);
  const [showManualAccess, setShowManualAccess] = useState(false);
  const [copiedExternalUrl, setCopiedExternalUrl] = useState(false);

  // Cryptographic File Hash Verification State (Server-backed integrity check)
  const [hashVerificationMap, setHashVerificationMap] = useState<Record<string, HashVerificationResult>>({});
  const [isVerifyingHashMap, setIsVerifyingHashMap] = useState<Record<string, boolean>>({});
  const [externalDatasetHashResult, setExternalDatasetHashResult] = useState<HashVerificationResult | null>(null);
  const [isVerifyingExternalDatasetHash, setIsVerifyingExternalDatasetHash] = useState<boolean>(true);

  // Voice-to-Text Dictation State
  const [isRecordingText, setIsRecordingText] = useState(false);
  const [isRecordingQuery, setIsRecordingQuery] = useState(false);
  const [speechStatusMessage, setSpeechStatusMessage] = useState<string | null>(null);

  // Legal Logic Search AI Agent State
  const [isLogicSearching, setIsLogicSearching] = useState(false);
  const [logicSearchResult, setLogicSearchResult] = useState<string | null>(null);
  const [logicSearchError, setLogicSearchError] = useState<string | null>(null);

  // Auto-Suggestion State for Citations
  const [showQueryAutoSuggest, setShowQueryAutoSuggest] = useState(false);
  const [showTextAutoSuggest, setShowTextAutoSuggest] = useState(false);
  const [citationToast, setCitationToast] = useState<string | null>(null);

  // High-Risk Clause Scanner & Sidebar State
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [riskReport, setRiskReport] = useState<DocumentRiskReport>(() => scanDocumentForLegalRisks(initialQuery || '', currentLang));
  const [isRiskSidebarOpen, setIsRiskSidebarOpen] = useState(true);
  const [isProceduralAuditorOpen, setIsProceduralAuditorOpen] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedRiskClauseId, setSelectedRiskClauseId] = useState<string | null>(null);

  // Hash Verification Failure Dialog & History State
  const [showHashFailureDialog, setShowHashFailureDialog] = useState(false);
  const [failedVerificationResult, setFailedVerificationResult] = useState<HashVerificationResult | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<HashVerificationResult[]>([]);
  const [isExportingHistory, setIsExportingHistory] = useState(false);

  // Automatically re-scan text whenever document content or result changes
  useEffect(() => {
    const textToScan = pastedText || (result ? result.analysis : '');
    const report = scanDocumentForLegalRisks(textToScan, currentLang);
    setRiskReport(report);
  }, [pastedText, result, currentLang]);

  // Detected Predefined Key Legal Terminology Summary Statistics
  const inputTermsReport = useMemo(() => {
    return countDetectedLegalTerms(pastedText);
  }, [pastedText]);

  const resultTermsReport = useMemo(() => {
    return countDetectedLegalTerms(result?.analysis || '');
  }, [result]);

  // Jump to relevant section of document when user clicks a flagged clause in the sidebar
  const handleJumpToRiskClause = (clause: RiskFlaggedClause) => {
    setSelectedRiskClauseId(clause.id);

    if (textareaRef.current) {
      textareaRef.current.focus();
      try {
        textareaRef.current.setSelectionRange(clause.startIndex, clause.endIndex);
        
        // Approximate scroll position to line
        const lineHeight = 20;
        const targetScrollTop = Math.max(0, (clause.lineNumber - 2) * lineHeight);
        textareaRef.current.scrollTop = targetScrollTop;
      } catch (err) {
        console.warn('Text selection range error:', err);
      }
    }

    setCitationToast(
      currentLang === 'om'
        ? `📍 Sarara ${clause.lineNumber} irratti qabame: "${clause.matchedKeyword}"`
        : `📍 መስመር ${clause.lineNumber} ላይ ተመርጧል: "${clause.matchedKeyword}"`
    );
    setTimeout(() => setCitationToast(null), 3500);
  };

  const handleSelectCitationForQuery = (citation: CitationSuggestion) => {
    setCustomQuery((prev) => {
      if (!prev.trim()) return citation.insertText;
      if (prev.includes(citation.insertText)) return prev;
      return `${prev.trim()} (${citation.insertText})`;
    });
    setShowQueryAutoSuggest(false);
    setCitationToast(
      currentLang === 'om'
        ? `✓ Wabiin Seeraa "${citation.insertText}" Dabalameera!`
        : currentLang === 'am'
        ? `✓ የሕግ ድንጋጌ "${citation.insertText}" ተካቷል!`
        : `✓ Citation "${citation.insertText}" inserted!`
    );
    setTimeout(() => setCitationToast(null), 3000);
  };

  const handleSelectCitationForText = (citation: CitationSuggestion) => {
    setPastedText((prev) => {
      if (!prev.trim()) return citation.insertText;
      if (prev.includes(citation.insertText)) return prev;
      return `${prev.trim()}\n\n[Wabii Seeraa: ${citation.insertText}]`;
    });
    setShowTextAutoSuggest(false);
    setCitationToast(
      currentLang === 'om'
        ? `✓ Wabiin Seeraa "${citation.insertText}" Dabalameera!`
        : currentLang === 'am'
        ? `✓ የሕግ ድንጋጌ "${citation.insertText}" ተካቷል!`
        : `✓ Citation "${citation.insertText}" inserted!`
    );
    setTimeout(() => setCitationToast(null), 3000);
  };

  const handleExecuteLogicSearch = async () => {
    const textToSearch = (pastedText || customQuery || '').trim();
    if (!textToSearch) {
      setLogicSearchError(
        currentLang === 'om'
          ? 'Maaloo barreeffama seeraa ykn gaaffii sagaleen dubbiftan dura galchaa.'
          : currentLang === 'am'
          ? 'እባክዎ መጀመሪያ የሕግ ጽሑፍ ወይም በድምፅ የተናገሩትን ያስገቡ።'
          : 'Please dictate or paste legal text first to run logic search.'
      );
      setTimeout(() => setLogicSearchError(null), 3500);
      return;
    }

    setIsLogicSearching(true);
    setLogicSearchError(null);
    try {
      const res = await performLegalLogicSearch(textToSearch, currentLang);
      setLogicSearchResult(res.rawAnalysis);
    } catch (err: any) {
      setLogicSearchError(err?.message || 'Legal logic search failed. Please try again.');
    } finally {
      setIsLogicSearching(false);
    }
  };

  const toggleDictation = (targetField: 'text' | 'query') => {
    const isCurrentlyRecording = targetField === 'text' ? isRecordingText : isRecordingQuery;

    if (isCurrentlyRecording) {
      if ((window as any)._activeRecognition) {
        (window as any)._activeRecognition.stop();
      }
      setIsRecordingText(false);
      setIsRecordingQuery(false);
      setSpeechStatusMessage(null);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechStatusMessage(
        currentLang === 'om'
          ? '⚠️ Microphonii browser keessanii hin deeggaramu (Web Speech API is not supported in this browser).'
          : currentLang === 'am'
          ? '⚠️ ማይክሮፎን በዚህ ብራውዘር ላይ አይደገፍም።'
          : '⚠️ Speech recognition is not supported in this browser.'
      );
      setTimeout(() => setSpeechStatusMessage(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Localize language code according to selected application language
      const langCode = currentLang === 'om' ? 'om-ET' : currentLang === 'am' ? 'am-ET' : 'en-US';
      recognition.lang = langCode;

      if (targetField === 'text') {
        setIsRecordingText(true);
        setIsRecordingQuery(false);
      } else {
        setIsRecordingQuery(true);
        setIsRecordingText(false);
      }

      setSpeechStatusMessage(
        currentLang === 'om'
          ? '🎙️ Sagalee keessan dubbadhaa, barreeffamatti hiikamaa jira...'
          : currentLang === 'am'
          ? '🎙️ ድምፅዎን ይናገሩ፣ ወደ ጽሑፍ እየተለወጠ ነው...'
          : '🎙️ Listening to your microphone... Speak clearly.'
      );

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          if (targetField === 'text') {
            setPastedText((prev) => (prev ? prev + ' ' + transcript : transcript));
          } else {
            setCustomQuery((prev) => (prev ? prev + ' ' + transcript : transcript));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecordingText(false);
        setIsRecordingQuery(false);
        if (event.error === 'not-allowed') {
          setSpeechStatusMessage(
            currentLang === 'om'
              ? '⚠️ Hayyamni maayikiroofoonii dhowwameera. Maaloo browser keessan irratti hayyama kennaa.'
              : currentLang === 'am'
              ? '⚠️ የማይክሮፎን ፈቃድ ተከልክሏል። እባክዎ በብራውዘርዎ ፈቃድ ይስጡ።'
              : '⚠️ Microphone access not allowed. Please allow microphone permissions in your browser address bar.'
          );
        } else {
          setSpeechStatusMessage(
            currentLang === 'om'
              ? '⚠️ Sagaleen hin waraabamne. Maaloo irra deebi\'aa yaalaa.'
              : currentLang === 'am'
              ? '⚠️ ድምፅ አልተሰማም። እባክዎ ደግመው ይሞክሩ።'
              : '⚠️ Microphone error. Please try again.'
          );
        }
        setTimeout(() => setSpeechStatusMessage(null), 4000);
      };

      recognition.onend = () => {
        setIsRecordingText(false);
        setIsRecordingQuery(false);
        setSpeechStatusMessage(null);
      };

      recognition.start();
      (window as any)._activeRecognition = recognition;
    } catch (err) {
      console.error('Dictation start error', err);
      setIsRecordingText(false);
      setIsRecordingQuery(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      if (initialQuery.length > 80) {
        setPastedText(initialQuery);
      } else {
        setCustomQuery(initialQuery);
      }
    }
  }, [initialQuery]);

  const handleCopyShareableLink = async () => {
    const queryToShare = customQuery.trim() || (pastedText.trim().length < 200 ? pastedText.trim() : (result?.fileName || 'document'));
    try {
      const shareUrl = buildShareableFindingUrl('docAnalysis', queryToShare, currentLang);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedHeaderShareLink(true);
      setTimeout(() => setCopiedHeaderShareLink(false), 2500);
    } catch (e) {
      console.error('Failed to copy share link', e);
    }
  };

  // Automatically scan for statutory citations whenever document text or analysis changes
  useEffect(() => {
    const textToScan = (pastedText || '') + '\n' + (result?.analysis || '');
    if (textToScan.trim().length > 20) {
      const citations = scanDocumentCitations(textToScan);
      setDetectedCitations(citations);
    } else {
      setDetectedCitations([]);
    }
  }, [pastedText, result]);

  // Sample Legal Contracts for Instant Testing & Verification
  const samplePresets: LegalSamplePreset[] = [
    {
      id: 'employment_contract',
      title: {
        om: 'Waliigaltee Hojii (Balaa Seeraa Qabu)',
        am: 'የስራ ውል (ስጋት ያለበት)',
        en: 'Employment Contract (High Risk)',
      },
      badge: {
        om: 'Labsii 1156/2019',
        am: 'አዋጅ 1156/2011',
        en: 'Labor Proclamation',
      },
      content: `WALIIGALTEE HOJII DHABBATAA
Guyyaa: 12/05/2016 B.A.

Hojjechiisaa: Dhaabbata Daldalaa Al-Furaat (Finfinnee)
Hojjetaa: Obbo Tolasaa Baqqalaa

Keeyyata 1 - Hojii fi Mindaa:
Hojjetaan mindaa ji'aa birrii 15,000 kaffalamuun guyyaatti sa'aatii 10, torbanitti guyyoota 6 ni hojjata. Hojii yeroo dabalataa (Overtime) raawwatuuf kaffaltiin dabalataa hin kaffalamu.

Keeyyata 2 - Yeroo Yaalii (Probation):
Yeroon yaalii ji'oota 6 ta'a. Yeroo kana keessatti hojjechiisaan akeekkachiisa malee hojiirraa gaggeessuu ni danda'a.

Keeyyata 3 - Hojiirraa Gaggeessuu (Termination):
Hojjechiisaan sababa kamiinuu fedhii isaatiin hojjetaa guyyaa tokko dura akeekkachiisuun hojiirraa gaggeessuu ni danda'a. Hojjetaan beenyaa kaffaltii addaan kutuu (severance pay) ykn kaffaltii biraa kamiyyuu hin gaafatu.

Keeyyata 4 - Dorgommii Dhowwuu (Non-Compete):
Hojjetaan hojiirraa erga bahee booda waggoota 3f dhaabbata daldalaa walfakkaatu kamiyyuu keessatti akka hin hojjenne dhowwameera. Yoo dorgome beenyaa birrii 200,000 ni kaffala.`,
    },
    {
      id: 'lease_contract',
      title: {
        om: 'Waliigaltee Kireeffannaa Manaa (Balaa Qabu)',
        am: 'የቤት ኪራይ ውል (ስጋት ያለበት)',
        en: 'House Lease Agreement (With Hazards)',
      },
      badge: {
        om: 'Koodii Siivilii 2896',
        am: 'ፍትሐብሔር 2896',
        en: 'Civil Code 2896',
      },
      content: `WALIIGALTEE KIREEFFANNAA MANAA
Guyyaa: 20/08/2016 B.A.

Kireessaa: Obbo Jamaal Huseen
Kireeffataa: Aadde Faaxumaa Ahimad

Keeyyata 1 - Gatii fi Yeroo Kireeffannaa:
Waliigalteen kun waggaa 2f kan ture ta'ee, kireeffataan ji'atti birrii 25,000 kaffala. Qabsiisa (Security Deposit) kaffaltii ji'a 6 dursee kaffala.

Keeyyata 2 - Gatii Dabaluu:
Kireessaan yeroo barbaadetti haala dinagdee biyyattii ilaaluun gatii kireeffannaa %50 dabaluu mirga guutuu qaba. Kireeffataan yoo morme guyyaa 3 keessatti mana akka gadi lakkisu ni dirqama.

Keeyyata 3 - Qabsiisa Deebisuu:
Yeroo kireeffannaan xumuramu qabsiisni (deposit) kireeffataaf hin deebifamu; akka kaffaltii fooyya'iinsa manichaatti kireessaa biratti hafa.

Keeyyata 4 - Falmii Mana Murtii:
Waliigaltee kana irratti falmiin yoo ka'e, kireeffataan mana murtii deemuu mirga hin qabu; murtii dhumaa kireessaan murteessu fudhachuuf dirqama.`,
    },
    {
      id: 'real_estate_sale',
      title: {
        om: 'Waliigaltee Gurgurtaa Manaa (Seeraan Ala)',
        am: 'የቤት ሽያጭ ውል (ያልተመዘገበ)',
        en: 'Immovable Property Sale (Unregistered)',
      },
      badge: {
        om: 'Koodii Siivilii 1723',
        am: 'ፍትሐብሔር 1723',
        en: 'Civil Code 1723',
      },
      content: `WALIIGALTEE GURGURTAA MANA JIREEYYAA
Guyyaa: 05/01/2016 B.A.

Gurguraa: Obbo Dassaaleny Caalaa
Bitaa: Obbo Girmaa Mokonnon

Keeyyata 1 - Qabeenya Gurgurame:
Gurguraan mana jireenyaa Lakk. 452 Magaalaa Hawaasaa keessatti argamu gatii birrii 4,500,000 (Miliyoona afurii fi walakkaa) bitaadhaaf gurgureera.

Keeyyata 2 - Kaffaltii fi Dabarsuu:
Bitaan gatii manichaa harka qalleessaan guyyaa har'aa kaffalee xumureera. Gurguraan manicha guyyaa 15 keessatti dabarsee bitaadhaaf ni kenna.

Keeyyata 3 - Galmee fi Mirkaneessa:
Waliigalteen kun namoota ragaa sadii duratti barreeffamee mallatteeffameera. Waajjira Mirkaneessa Sanadootaa (DARA) deemanii galmeessuun hin barbaachisu; sanadni barreeffame kun mana murtiitti mirkaneeffama.

Keeyyata 4 - Murtii Dhaddacha Ijoo:
Falmiin yoo dhalate birriin deebi'a malee manni hin dabarsamu.`,
    },
    {
      id: 'defective_court_pleading',
      title: {
        om: 'Iyyata Himataa (Mallattoo & Waamicha Kan Dhabe)',
        am: 'የክስ አቤቱታ (ፊርማ እና መጥሪያ የሌለው)',
        en: 'Defective Pleading (Missing Signature & Service)',
      },
      badge: {
        om: 'SDFHH Kwt 92/94 (Hanqina)',
        am: 'ሥ/ሥ/ሕግ 92/94 (ክፍተት)',
        en: 'SDFHH Procedural Flaws',
      },
      content: `IYYATA HIMANNAA DHIMMA MAALLAQAA

Himataan Obbo Alamaayyoo Taaddasaa himatamaa Obbo Caalaa Mokonnon irraa maallaqa liqii Birrii 350,000 kan kaffaluu dide akka deebisu gaafata.
Himatamaan liqicha waan waakkateef manni murtii akka nuuf kaffalchiisu.

(Hubachiisa: Iyyatni kun teessoo waamichaa, mirkaneessa kakuu, mallattoo, aangoo maallaqaa, fi tarree ragaalee hin qabu - SDFHH Kwt 92, 94, 137, 222).`,
    },
    {
      id: 'debt_claim_missing_accrual',
      title: {
        om: 'Himata Liqii Daldalaa (Guyyaa Falmii & Gaaffii Ifa Hin Qabne)',
        am: 'የንግድ ብድር ክስ (ቀንና ዳኝነት ያልተለየ)',
        en: 'Debt Claim (Missing Accrual & Relief)',
      },
      badge: {
        om: 'SDFHH Kwt 222 & 224',
        am: 'ሥ/ሥ/ሕግ 222 እና 224',
        en: 'Missing Accrual & Prayers',
      },
      content: `MANA MURTII AANAA
HIMATAA: Dhaabbata Liqii fi Qusannaa
HIMATAMAA: Obbo Badhaadhaa Guutamaa

Himatamaan maallaqa liqeeffate Birrii 500,000 hin kaffalle. Manni murtii dhimma kana nuuf haa ilaalu.`,
    },
  ];

  const handleApplyPreset = (preset: LegalSamplePreset) => {
    // Only open if file hash has been confirmed by server
    const verification = hashVerificationMap[preset.id];
    if (verification && !verification.isVerified) {
      setError(
        currentLang === 'om'
          ? `Sanadni "${preset.title[currentLang] || preset.title.om}" dogoggora hash qaba (Hash Mismatch / Untrusted).`
          : `የተመረጠው ሰነድ የሃሽ ማረጋገጫ አልተሳካም (Hash Mismatch)።`
      );
      return;
    }
    setPastedText(preset.content);
    setFile(null);
    setFileBase64(null);
    setFilesList([]);
    setError(null);
  };

  // Load verification history on mount
  useEffect(() => {
    setVerificationHistory(getVerificationHistory());
  }, []);

  const refreshHistory = () => {
    setVerificationHistory(getVerificationHistory());
  };

  const handleExportHistory = () => {
    setIsExportingHistory(true);
    try {
      const csv = exportVerificationHistoryToCsv(verificationHistory);
      const filename = `SeeraAI_Verification_Audit_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCsv(csv, filename);
    } catch (err) {
      console.warn('Export failed:', err);
    } finally {
      setIsExportingHistory(false);
    }
  };

  const handleExportHistoryPdf = async () => {
    setIsExportingHistory(true);
    try {
      const pdfBlob = await exportVerificationHistoryToPdf(verificationHistory, currentLang as any);
      const filename = `SeeraAI_Legal_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPdf(pdfBlob, filename);
    } catch (err) {
      console.warn('PDF Export failed:', err);
    } finally {
      setIsExportingHistory(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm(currentLang === 'om' ? 'Seenaa ragaa qulqulleessuu ni barbaaduu?' : 'የማረጋገጫ ታሪክን ማጽዳት ይፈልጋሉ?')) {
      clearVerificationHistory();
      refreshHistory();
    }
  };

  // Automatically check external document file hashes against known-good values from the server
  useEffect(() => {
    let isSubscribed = true;

    const runServerHashAudits = async () => {
      // 1. Audit External Dataset Archive Link
      setIsVerifyingExternalDatasetHash(true);
      try {
        const extStatus = await verifyDocumentHashWithServer('saorethio1_master_archive');
        if (isSubscribed) {
          setExternalDatasetHashResult(extStatus);
          logVerificationToHistory(extStatus);
          setVerificationHistory(getVerificationHistory());
        }
      } catch (err) {
        console.warn('External dataset hash check failed:', err);
      } finally {
        if (isSubscribed) setIsVerifyingExternalDatasetHash(false);
      }

      // 2. Audit all external sample presets against known good copies on the server
      for (const preset of samplePresets) {
        setIsVerifyingHashMap((prev) => ({ ...prev, [preset.id]: true }));
        try {
          const res = await verifyDocumentHashWithServer(preset.id, { fileContent: preset.content });
          if (isSubscribed) {
            setHashVerificationMap((prev) => ({ ...prev, [preset.id]: res }));
            logVerificationToHistory(res);
            setVerificationHistory(getVerificationHistory());
          }
        } catch (err) {
          console.warn(`Hash check failed for preset ${preset.id}:`, err);
        } finally {
          if (isSubscribed) {
            setIsVerifyingHashMap((prev) => ({ ...prev, [preset.id]: false }));
          }
        }
      }
    };

    runServerHashAudits();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleImageTabChange = (index: number) => {
    setActiveImageIndex(index);
    if (filesList[index]) {
      setFile(filesList[index].file);
      setFileBase64(filesList[index].base64);
      setFileMimeType(filesList[index].mimeType);
    }
  };

  const handleQuickTranslate = async (targetLang: Language) => {
    if (!result?.analysis) return;
    setExtractedQuickLang(targetLang);

    // If already cached, instant dynamic update without network or re-upload!
    if (extractedTranslationsCache[targetLang]) {
      return;
    }

    setIsQuickTranslating(true);
    try {
      const sourceText = extractedTranslationsCache[currentLang] || result.analysis;
      const res = await translateLegalText({
        sourceText,
        sourceLang: 'auto',
        targetLang,
        mode: 'translate',
      });
      if (res && res.translatedText) {
        setExtractedTranslationsCache(prev => ({
          ...prev,
          [targetLang]: res.translatedText,
        }));
      }
    } catch (err: any) {
      console.warn('Quick translate failed:', err);
    } finally {
      setIsQuickTranslating(false);
    }
  };

  const handleProcessMultipleFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    setError(null);
    setIsProcessingWorker(true);
    setWorkerProgress(10);
    setWorkerStatus(
      currentLang === 'om'
        ? '⚡ Web Worker: Suuraalee qopheessaa jira...'
        : currentLang === 'am'
        ? '⚡ Web Worker: ምስሎችን በማዘጋጀት ላይ ነው...'
        : '⚡ Web Worker: Processing and optimizing images...'
    );

    const processedList: { file: File; base64: string; mimeType: string; name: string }[] = [];
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let startTime = Date.now();

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const selected = selectedFiles[i];
        
        // 2GB Limit check
        if (selected.size > 2 * 1024 * 1024 * 1024) {
          setError(
            currentLang === 'om'
              ? `Faayilli "${selected.name}" GB 2 ol. Maaloo faayila xiqqaa filadhaa.`
              : `ፋይሉ "${selected.name}" ከ2GB በላይ ነው። እባክዎ ትንሽ ፋይል ይምረጡ።`
          );
          continue;
        }

        totalOriginalSize += selected.size;

        setWorkerStatus(
          currentLang === 'om'
            ? `⚡ Web Worker: Faayila ${i + 1}/${selectedFiles.length} qopheessaa jira...`
            : currentLang === 'am'
            ? `⚡ Web Worker: ፋይል ${i + 1}/${selectedFiles.length} በማዘጋጀት ላይ...`
            : `⚡ Web Worker: Processing file ${i + 1}/${selectedFiles.length}...`
        );
        setWorkerProgress(Math.round((i / selectedFiles.length) * 100));

        const processed = await processDocumentOffThread(
          selected,
          {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.82,
            enhanceContrast: true,
          }
        );

        if (processed.success && processed.base64) {
          processedList.push({
            file: selected,
            base64: processed.base64,
            mimeType: processed.mimeType || selected.type,
            name: processed.name || selected.name
          });
          totalOptimizedSize += processed.base64.length * 0.75;
        } else if (processed.success && processed.text) {
          const base64Text = utf8ToBase64(processed.text);
          processedList.push({
            file: selected,
            base64: base64Text,
            mimeType: 'text/plain',
            name: processed.name || selected.name
          });
          totalOptimizedSize += processed.text.length;
        }
      }

      if (processedList.length > 0) {
        setFilesList((prev) => [...prev, ...processedList]);
        
        // Backward compatible sync with first file
        const first = processedList[0];
        setFile(first.file);
        setFileBase64(first.base64);
        setFileMimeType(first.mimeType);

        setWorkerStats({
          originalSize: (totalOriginalSize / 1024).toFixed(1) + ' KB',
          optimizedSize: (totalOptimizedSize / 1024).toFixed(1) + ' KB',
          ratio: Math.round((1 - (totalOptimizedSize / (totalOriginalSize || 1))) * 100),
          durationMs: Date.now() - startTime,
        });
      }
    } catch (err: any) {
      console.warn('Worker error:', err);
      setError(err.message || 'Worker processing error');
    } finally {
      setIsProcessingWorker(false);
    }
  };

  const handleProcessFile = handleProcessMultipleFiles;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      await handleProcessMultipleFiles(Array.from(selected));
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setFileBase64(null);
    setFilesList([]);
    setWorkerStats(null);
    setError(null);
  };

  const executeAnalysis = async (typeToRun: 'risk_analysis' | 'compliance' | 'plain_explanation' | 'translate_document' | 'summarize' | 'extract_text') => {
    if (filesList.length === 0 && !file && !pastedText.trim()) {
      setError('Maaloo faayila olkaa\'aa ykn barreeffama seeraa galchaa. / እባክዎ ፋይል ይጫኑ ወይም የሕግ ጽሑፍ ያስገቡ።');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(
        'Neetwoorkiin hin jiru (Offline Mode). Sanada haaraa AI\'n xiinxaluuf intarneeta barbaada. Haa ta\'u malee kuusaa murteewwan dhaddacha ijoo fi sanadoota taa\'an intarneeta malee fayyadamuu dandeessu.'
      );
      return;
    }

    setIsLoading(true);
    setAnalysisStep(1);
    setError(null);

    const timer1 = setTimeout(() => setAnalysisStep(2), 900);
    const timer2 = setTimeout(() => setAnalysisStep(3), 2200);

    try {
      const citationPriority = '[STRICT MANDATORY DIRECTIVE: You MUST prioritize citing the relevant proclamation name and number, exact statutory article number(s), and official legal source (Negarit Gazeta, Cassation Precedents) FIRST before providing any summary or narrative breakdown.]';
      const augmentedInstructions = customQuery
        ? `${customQuery}\n\n${citationPriority}`
        : citationPriority;

      const payloadFiles = filesList.map((f) => ({
        fileData: f.base64,
        mimeType: f.mimeType,
        fileName: f.name,
      }));

      const data = await analyzeLegalDocument({
        fileData: fileBase64,
        mimeType: fileMimeType,
        files: payloadFiles,
        fileText: pastedText,
        fileName: file?.name || filesList[0]?.name || 'Sanada Seeraa',
        analysisType: typeToRun,
        outputLanguages: selectedLangs,
        customInstructions: augmentedInstructions,
        modelTier,
      });

      setResult(data);
      if (typeToRun === 'extract_text') {
        const detected = data.detectedInputLang || currentLang;
        setExtractedQuickLang(detected);
        setExtractedTranslationsCache({ [detected]: data.analysis });
      }
      if (typeToRun === 'summarize') {
        setShowAudioReviewPlayer(true);
      }
      setActiveOutputTab('content');
      
      // Track analytics
      analyticsService.trackDocumentCreation(typeToRun, selectedLangs.join(','));
    } catch (e: any) {
      setError(e.message || 'Xiinxalli sanadaa hin milkoofne. Maaloo irra deebi\'aa yaalaa.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
    }
  };

  const handleAnalyze = () => executeAnalysis(analysisType);
  const handleSummarize = () => {
    setAnalysisType('summarize');
    executeAnalysis('summarize');
  };

  const handleQuickExportSummaryAudio = async () => {
    if (!result?.analysis) return;
    setIsQuickExportingAudio(true);
    try {
      await downloadLegalSummaryAudio(
        result.analysis,
        result.fileName || 'Cuunfaa_Sanada_Seeraa',
        { lang: currentLang, preferNeural: true }
      );
      setAudioExportSuccessToast(true);
      setTimeout(() => setAudioExportSuccessToast(false), 3500);
    } catch (e) {
      console.warn('Quick audio export failed:', e);
    } finally {
      setIsQuickExportingAudio(false);
    }
  };

  // Sanitized clipboard copy for seamless legal pasting
  const handleCopyCleanText = async () => {
    if (!result?.analysis) return;
    try {
      // Clean up markdown hashes and excessive bullets for pristine pasting into Word / Outlook
      const clean = result.analysis
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');

      await navigator.clipboard.writeText(clean);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {}
  };

  const toggleLanguage = (lang: Language) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length === 1) return;
      setSelectedLangs(selectedLangs.filter((l) => l !== lang));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  // Supported Gemini AI Engines
  const geminiModels: {
    id: GeminiModelChoice;
    name: string;
    tagline: string;
    icon: any;
    recommended?: boolean;
    badge: string;
  }[] = [
    {
      id: 'gemini-flash-lite-latest',
      name: 'Gemini Flash Lite (Latest)',
      tagline: 'Saffisaa & Quota-Eeggate (High Availability) • Cuunfaa fi qorannoo ariifachiisaaf',
      icon: Zap,
      recommended: true,
      badge: 'Filatamaa (Recommended)',
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      tagline: 'Qorannoo Seeraa Saffisaa • Mirkaneeffannoo labsii fi keeyyataa',
      icon: Brain,
      badge: 'Saffisaa (Fast)',
    },
    {
      id: 'gemini-flash-latest',
      name: 'Gemini Flash Latest',
      tagline: 'Wal-madaalaa (Standard Production) • Qulqullina seeraa eeggate',
      icon: Scale,
      badge: 'Wal-madaalaa',
    },
    {
      id: 'gemini-3.5-pro',
      name: 'Gemini 3.5 Pro',
      tagline: 'Qorannoo Seeraa Gadi Fagoo • Xiinxala seeraa walxaxaa',
      icon: Brain,
      badge: 'Pro',
    },
    {
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      tagline: 'Saffisaa fi Qulqullina olaanaa • Dhimmoota guyyaa-guyyaa',
      icon: Zap,
      badge: 'Saffisaa',
    },
  ];

  const analysisOptions = [
    {
      id: 'risk_analysis',
      title: 'Balaa Seeraa Qorachuu (Comprehensive Risk Audit)',
      amTitle: 'የሕግ ስጋትና ክፍተቶች ትንተና',
      desc: 'Qabxiiwwan mirga miidhan, kaffaltii beenyaa seeraan alaa fi balaawwan seeraa tokko tokkoon adda baasa.',
      icon: ShieldAlert,
    },
    {
      id: 'summarize',
      title: 'Gabaabsi & Cuunfi (Executive Legal Summary)',
      amTitle: 'አጭር የሕግ ማጠቃለያ',
      desc: 'Sanada dheeraa gara qabxiiwwan ijoo, qaamolee, fi dirqamootaatti qindeessa.',
      icon: FileSpreadsheet,
    },
    {
      id: 'compliance',
      title: 'Seera Qabeessummaa (Statutory Compliance)',
      amTitle: 'የሕጋዊነት ማረጋገጫ ኦዲት',
      desc: 'Heera FDRE, Labsii 1156/2019 fi Koodii Daldalaa waliin wal-simuu isaa sakatta\'a.',
      icon: CheckCircle2,
    },
    {
      id: 'plain_explanation',
      title: 'Ibsa Salphaa (Plain Legal Breakdown)',
      amTitle: 'ቀላል የሕግ ማብራሪያ',
      desc: 'Sanada walxaxaa gara qabxiiwwan salphaatti hiikee mirgootaa fi dirqamoota mul\'isa.',
      icon: Eye,
    },
    {
      id: 'translate_document',
      title: 'Hiikkaa Sanadaa (Legal Translation)',
      amTitle: 'ሙሉ ሰነዱን መተርጎም',
      desc: 'Sanadicha lakkoofsa labsii fi keeyyata eeguun afaan filatameetti hiika.',
      icon: Languages,
    },
    {
      id: 'extract_text',
      title: 'Barreeffama Qofa Baasuu (Extract Text Only)',
      amTitle: 'ጽሑፍ ብቻ ማውጣት (OCR Only)',
      desc: 'Suuraa seeraa irraa barreeffama qofa adda baasee baasa (copy-paste gochuuf salphaa kan ta’e).',
      icon: FileText,
    },
  ];

  const handleOpenInCassation = (query: string) => {
    window.dispatchEvent(
      new CustomEvent('seera:navigate', {
        detail: { tab: 'cassation', query },
      })
    );
  };

  const handleOpenInExplainLaw = (query: string) => {
    window.dispatchEvent(
      new CustomEvent('seera:navigate', {
        detail: { tab: 'explainLaw', query },
      })
    );
  };

  const handleOpenExternalDataset = async () => {
    // 0. Enforce cryptographic hash check against server before opening
    if (!externalDatasetHashResult?.isVerified) {
      setIsVerifyingExternalDatasetHash(true);
      const recheck = await verifyDocumentHashWithServer('saorethio1_master_archive', { forceRefresh: true });
      setExternalDatasetHashResult(recheck);
      logVerificationToHistory(recheck);
      refreshHistory();
      setIsVerifyingExternalDatasetHash(false);

      if (!recheck.isVerified) {
        setFailedVerificationResult(recheck);
        setShowHashFailureDialog(true);
        setExternalLinkError(
          currentLang === 'om'
            ? 'Qormaanni hash sanada alaa hin milkoofne (Hash Mismatch / Untrusted Copy). Nageenyaaf banuun dhowwameera.'
            : 'የውጭ ሰነድ የሃሽ ማረጋገጫ አልተሳካም። ለደህንነት ሲባል መክፈት ተከልክሏል።'
        );
        return;
      }
    }

    setIsLoadingExternalLink(true);
    setExternalLinkError(null);
    setShowManualAccess(false);

    try {
      // 1. Perform HEAD integrity check to saorethio1.com (cached in localStorage)
      const verifyResult = await verifyExternalDatasetIntegrity('https://saorethio1.com', 1000 * 60 * 15);
      
      // 2. Redirect to GitHub as requested ("saorethio1.com kanaas yemmuu click godhu GitHub irratti akka na geeysuun godhi")
      const targetGithubUrl = getEffectiveGitHubUrl();
      setIsLoadingExternalLink(false);

      if (verifyResult.isAvailable) {
        window.open('https://saorethio1.com', '_blank', 'noopener,noreferrer');
      } else {
        // Since saorethio1.com has DNS NXDOMAIN, redirect directly to GitHub profile/archive as requested!
        window.open(targetGithubUrl, '_blank', 'noopener,noreferrer');
        setShowManualAccess(true);
        setExternalLinkError(
          currentLang === 'om'
            ? 'saorethio1.com gara GitHub (@ayeledha) tti qajeelchameera. Yoo GitHub irratti "404 Page not found" argitan, repo "seeraai" uumuuf qabduu gadii fayyadamaa.'
            : currentLang === 'am'
            ? 'saorethio1.com ወደ GitHub (@ayeledha) ተቀይሯል። በGitHub ላይ "404 Page not found" ካጋጠመዎት "አዲስ ሬፖ ፍጠር" የሚለውን ይጠቀሙ።'
            : 'saorethio1.com redirected to GitHub (@ayeledha). If you see GitHub "404 Page not found", click "Create Repo" below to initialize "seeraai".'
        );
      }
    } catch (err: any) {
      setIsLoadingExternalLink(false);
      window.open(getEffectiveGitHubUrl(), '_blank', 'noopener,noreferrer');
      setShowManualAccess(true);
    }
  };

  const handleCopyExternalUrl = async () => {
    try {
      await navigator.clipboard.writeText('https://saorethio1.com');
      setCopiedExternalUrl(true);
      setTimeout(() => setCopiedExternalUrl(false), 3000);
    } catch {}
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title Header with Copy Shareable Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <span>Xiinxala Sanada Seeraa & Citation Finder</span>
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Sanadoota PDF, Scanned Images, fi Waliigaltee seeraa moodeelota Gemini AI filachuun balaa seeraa, seera-qabeessummaa, fi wabiilee dhaddacha ijoo sakatta'aa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Legal Archive Filter Toggle: saorethio1.com vs Local Storage */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs gap-1 shadow-sm shrink-0">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 px-2 flex items-center gap-1">
              <span>🗄️</span>
              <span className="hidden md:inline">Legal Archive:</span>
            </span>
            <button
              type="button"
              onClick={() => setArchiveDataSource('local')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                archiveDataSource === 'local'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Fetch from local cache / storage to save data usage and manage offline cache"
            >
              <span>💾 Local</span>
            </button>
            <button
              type="button"
              onClick={() => setArchiveDataSource('external')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                archiveDataSource === 'external'
                  ? 'bg-sky-500 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Fetch legal document datasets dynamically from saorethio1.com to save local space"
            >
              <span>🌐 saorethio1.com</span>
            </button>
          </div>

          {/* Dedicated Procedural History Timeline Side-Panel Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsTimelinePanelOpen(!isTimelinePanelOpen);
              if (!isTimelinePanelOpen) setActiveOutputTab('timeline');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
              isTimelinePanelOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/50 hover:border-amber-400'
            }`}
            title="Open Procedural History Timeline panel for uploaded court documents"
          >
            <span>⏱️</span>
            <span>
              {isTimelinePanelOpen
                ? (currentLang === 'om' ? 'Timeline Cufi' : currentLang === 'am' ? 'የጊዜ ሰሌዳ ዝጋ' : 'Close Timeline')
                : (currentLang === 'om' ? 'Seenaa Falmii (Timeline)' : currentLang === 'am' ? 'የሥነ-ሥርዓት ሂደት የጊዜ ሰሌዳ' : 'Procedural History Timeline')}
            </span>
          </button>

          {/* Sync from Telegram Archive Button */}
          <button
            type="button"
            onClick={() => setIsTelegramModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border shrink-0 bg-sky-950/80 hover:bg-sky-900/90 text-sky-200 border-sky-500/50 hover:border-sky-400 shadow-md"
            title="Import & Sync legal documents directly from Telegram saved messages or archives"
          >
            <span>✈️</span>
            <span>
              {currentLang === 'om'
                ? 'Kuusaa Telegram Irraa Fidi'
                : currentLang === 'am'
                ? 'ከቴሌግራም አርካይቭ አምጣ'
                : 'Sync from Telegram Archive'}
            </span>
          </button>

          {/* Global Copy Shareable Link in Header */}
          <button
            type="button"
            onClick={handleCopyShareableLink}
            disabled={!customQuery.trim() && !pastedText.trim() && !result}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
              copiedHeaderShareLink
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/50 hover:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title="Copy direct shareable link for this legal document analysis"
          >
            <span>{copiedHeaderShareLink ? '📋' : '🔗'}</span>
            <span>{copiedHeaderShareLink ? 'Linkiin Waraabameera! (Copied)' : 'Copy Shareable Link'}</span>
          </button>
        </div>
      </div>

      {/* Telegram Import Toast Banner */}
      {telegramSyncToast && (
        <div className="bg-sky-950/90 border border-sky-500/60 text-sky-100 px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between text-xs sm:text-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">✈️</span>
            <span className="font-semibold">{telegramSyncToast}</span>
          </div>
          <button
            onClick={() => setTelegramSyncToast(null)}
            className="text-sky-300 hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Telegram Import Modal */}
      {isTelegramModalOpen && (
        <TelegramImportModal
          language={currentLang}
          onClose={() => setIsTelegramModalOpen(false)}
          onImportComplete={(count) => {
            setIsTelegramModalOpen(false);
            const msg =
              currentLang === 'om'
                ? `Galmeewwan seeraa ${count}+ channaalii Telegram irraa milkaa'inaan kuusaa keessaniitti galfamaniiru!`
                : currentLang === 'am'
                ? `ከቴሌግራም አርካይቭ ${count}+ ሰነዶች በተሳካ ሁኔታ ተጭነዋል!`
                : `Successfully imported ${count}+ precedent documents from Telegram Archive!`;
            setTelegramSyncToast(msg);
            setTimeout(() => setTelegramSyncToast(null), 6000);
          }}
        />
      )}

      {/* Mode Switcher: Single Deep Analysis vs Batch Court Document Processing */}
      <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-full sm:w-auto self-start gap-2 shadow-lg">
        <button
          type="button"
          onClick={() => setUploadMode('single')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            uploadMode === 'single'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>📄</span>
          <span>
            {currentLang === 'om' ? 'Xiinxala Sanada Tokkoo (Single Doc Analysis)' : 'Single Document Analysis'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setUploadMode('batch')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            uploadMode === 'batch'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>📂</span>
          <span>
            {currentLang === 'om' ? 'Fe\'iinsa Sanadoota Baay\'ee (Batch Processing Mode)' : 'Batch Document Processing Mode'}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 border border-slate-800 font-mono">
            AI Multi
          </span>
        </button>
      </div>

      {uploadMode === 'batch' ? (
        <BatchDocumentUploadPanel currentLang={currentLang} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Gemini AI Engine Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span>Moodeela Gemini AI Filadhaa (Engine):</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {modelTier === 'gemini-flash-lite-latest' ? '⚡ Flash Lite (Active)' : '🧠 High Availability'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {geminiModels.map((m) => {
                const IconComponent = m.icon;
                const isSelected = modelTier === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelTier(m.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/70 shadow-sm text-amber-200 ring-1 ring-amber-500/50'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold line-clamp-1">{m.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isSelected
                            ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                      {m.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Test Sample Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Sanadoota Fakkeenyaa (Sample Legal Contracts):</span>
              </span>
              <span className="text-[10px] text-slate-500">Yaaluuf cuqaasaa</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {samplePresets.map((p) => {
                const hashStatus = hashVerificationMap[p.id];
                const isVerifying = isVerifyingHashMap[p.id];
                const isVerified = Boolean(hashStatus?.isVerified);

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-left transition-all flex flex-col justify-between gap-2.5 group shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 block line-clamp-2 flex-1">
                          {p.title[currentLang] || p.title.om}
                        </span>
                        <span
                          className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono bg-sky-950 text-sky-300 border border-sky-500/30"
                          title="Hosted on saorethio1.com external legal dataset"
                        >
                          🌐 External
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400/90 font-mono block">
                        {p.badge[currentLang] || p.badge.om}
                      </span>
                    </div>

                    {/* Verification Status Indicator & Secure Open Button */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <DocumentHashStatusIndicator
                        documentId={p.id}
                        isVerifying={isVerifying}
                        result={hashStatus}
                      />

                      <button
                        type="button"
                        disabled={!isVerified || isVerifying}
                        onClick={() => handleApplyPreset(p)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          isVerified && !isVerifying
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                        }`}
                        title={
                          isVerified
                            ? 'File hash matched server known-good copy. Ready to open.'
                            : isVerifying
                            ? 'Checking file hash with server...'
                            : 'Open disabled until file hash is verified'
                        }
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                            <span>Verifying...</span>
                          </>
                        ) : isVerified ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-slate-950" />
                            <span>Bani (Open)</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Locked</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prominent External Dataset & Build Status Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 text-xl shrink-0">
                  🌐
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-100">
                      {currentLang === 'om' ? 'Kuusaa Sanadoota Alaa (saorethio1.com)' : 'External Dataset Hosting (saorethio1.com)'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      Build v4.1.0 (35.07 MB • 250 MB Limit Compliant)
                    </span>
                    {/* Server-backed Verification Status Indicator */}
                    <DocumentHashStatusIndicator
                      documentId="saorethio1_master_archive"
                      isVerifying={isVerifyingExternalDatasetHash}
                      result={externalDatasetHashResult}
                    />
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentLang === 'om'
                      ? 'Hanga appii (250 MB) eeguuf, galmeewwan seeraa gurguddoo fi arayiiwwan waraqaa alaa saorethio1.com irraa argamu. Hash eeggatee banama.'
                      : 'To stay under the 250 MB publish limit, large legal document datasets & archives are hosted externally at saorethio1.com. Cryptographic hash verified.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.open(VERIFIED_TELEGRAM_ARCHIVE_URL, '_blank', 'noopener,noreferrer')}
                  className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                  title="Verified 1,500+ Legal Precedent Archive"
                >
                  <span>✈️</span>
                  <span>Telegram Archive (1,500+)</span>
                </button>

                {/* Open Button - Disabled until file hash is checked and verified against server known good copy */}
                <button
                  type="button"
                  onClick={handleOpenExternalDataset}
                  disabled={
                    isLoadingExternalLink ||
                    isVerifyingExternalDatasetHash ||
                    (externalDatasetHashResult !== null && !externalDatasetHashResult.isVerified)
                  }
                  className={`px-4 py-2.5 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all ${
                    externalDatasetHashResult?.isVerified && !isVerifyingExternalDatasetHash
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                  title={
                    externalDatasetHashResult?.isVerified
                      ? 'Cryptographic file hash verified by server. Click to open.'
                      : isVerifyingExternalDatasetHash
                      ? 'Checking file hash with server...'
                      : 'Open button disabled until file hash is verified against server known-good registry'
                  }
                >
                  {isLoadingExternalLink ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{currentLang === 'om' ? 'Qajeelchaa Jira (Redirecting)...' : 'Redirecting...'}</span>
                    </>
                  ) : isVerifyingExternalDatasetHash ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Verifying Hash...</span>
                    </>
                  ) : externalDatasetHashResult?.isVerified ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>Bani (Open - Hash Verified)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>Locked (Unverified Hash)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Visual Error Notification for 404 / 503 / Timeout */}
            {externalLinkError && (
              <div className="bg-rose-950/80 border border-rose-500/60 rounded-xl p-3 flex items-center justify-between text-xs text-rose-200">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{externalLinkError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExternalLinkError(null)}
                  className="text-rose-300 hover:text-white text-xs underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Manual Access Required Fallback Button & Copy Box with GitHub 404 fix */}
            {showManualAccess && (
              <div className="bg-slate-950 border border-amber-500/50 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🔓</span>
                    <span>{currentLang === 'om' ? 'Maddoota Kuusaa Alaa (Direct Access)' : 'External Legal Archives'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">DNS & GitHub 404 Helper</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(GITHUB_PROFILE_URL, '_blank', 'noopener,noreferrer')}
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>👤</span>
                    <span>GitHub @ayeledha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(GITHUB_CREATE_REPO_URL, '_blank', 'noopener,noreferrer')}
                    className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow"
                    title="Yoo '404 Didn't find anything' jedhe, repo haaraa maqaa 'seeraai' jedhu uumaa"
                  >
                    <span>➕</span>
                    <span>Repo "seeraai" Uumi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(VERIFIED_TELEGRAM_ARCHIVE_URL, '_blank', 'noopener,noreferrer')}
                    className="p-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <span>✈️</span>
                    <span>Telegram (@saiorethio1)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value="https://saorethio1.com"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-200 font-mono flex-1 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyExternalUrl}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                  >
                    <span>{copiedExternalUrl ? '✓ Waraabameera!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* File Upload Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Faayila Seeraa Olkaa'aa (PDF, DOCX, TXT, Image):
              </label>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Build Status: v4.1.0 Stable • Optimized 35 MB
              </span>
            </div>

            <div 
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const droppedFiles = e.dataTransfer.files;
                if (droppedFiles && droppedFiles.length > 0) {
                  handleProcessMultipleFiles(Array.from(droppedFiles));
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 min-h-[140px] text-center transition-all bg-slate-950/40 relative flex flex-col items-center justify-center cursor-pointer ${
                isDragging 
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]' 
                  : 'border-slate-700 hover:border-amber-500/70'
              }`}
            >
              <input
                type="file"
                multiple={true}
                accept=".pdf,.txt,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center pointer-events-none">
                <UploadCloud className={`w-10 h-10 mb-2 transition-colors ${isDragging ? 'text-amber-300 animate-bounce' : 'text-amber-400'}`} />
                <span className="text-sm font-semibold text-slate-200">
                  {filesList.length > 0 
                    ? `${filesList.length} files selected` 
                    : (isDragging ? "Faayila asitti gadi dhiisaa (Drop files here)" : "Faayila tokkoo fi isaa ol asitti harkisaa ykn filachuuf cuqaasaa")}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  PDF, Scanned Legal Contracts, Court Decisions, Proclamations (Processed Off-Main-Thread)
                </span>
                <span className="text-[11px] text-amber-400/90 mt-1.5 block font-mono">
                  🌐 Large datasets are available for download at saorethio1.com
                </span>
              </div>

              {filesList.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleClearFile();
                  }}
                  className="mt-3 px-3 py-1 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-lg text-xs font-medium z-10 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{currentLang === 'om' ? 'Faayiloota Hundaa Haqi (Clear All)' : 'ሁሉንም ፋይሎች አስወግድ'}</span>
                </button>
              )}
            </div>

            {filesList.length > 0 && (
              <div className="mt-4 border border-slate-700/80 rounded-3xl p-5 bg-slate-950 space-y-4 shadow-xl">
                {/* Header with Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🖼️</span>
                    <div>
                      <span className="text-xs font-bold text-slate-200">
                        {currentLang === 'om' ? 'Suuraalee Qophaa\'an (Uploaded Legal Images)' : 'የተዘጋጁ የሕግ ሰነዶች'} ({filesList.length})
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {currentLang === 'om' ? 'Mul\'ata tabs ykn cinaa fi cinaatti waldorgomsiisaa ilaalaa.' : 'በትሮች ወይም ጎን ለጎን በማነጻጸር ይመልከቱ።'}
                      </p>
                    </div>
                  </div>

                  {/* Mode switcher: Tabbed vs Side-by-Side */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setImageComparisonMode('tabbed')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        imageComparisonMode === 'tabbed'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>📑</span>
                      <span>{currentLang === 'om' ? 'Tabbed View' : 'በትሮች (Tabs)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageComparisonMode('side_by_side');
                        if (filesList.length > 1 && secondaryImageIndex === activeImageIndex) {
                          setSecondaryImageIndex((activeImageIndex + 1) % filesList.length);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        imageComparisonMode === 'side_by_side'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>◫</span>
                      <span>{currentLang === 'om' ? 'Cinaa fi Cinaatti (Side-by-Side)' : 'ጎን ለጎን (Side-by-Side)'}</span>
                    </button>
                  </div>
                </div>

                {/* Tabbed View Rendering */}
                {imageComparisonMode === 'tabbed' && (
                  <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {filesList.map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleImageTabChange(i)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                            activeImageIndex === i 
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold' 
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md bg-slate-950/40 text-[10px] font-mono flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <span className="truncate max-w-[130px]">{f.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 flex flex-col items-center p-3">
                      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 font-mono pb-2 mb-2 border-b border-slate-800/80">
                        <span>Fuula #{activeImageIndex + 1} / {filesList.length}: {filesList[activeImageIndex]?.name}</span>
                        <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{filesList[activeImageIndex]?.mimeType}</span>
                      </div>
                      <ProgressiveLegalImageLoader
                        fullSrc={`data:${filesList[activeImageIndex]?.mimeType};base64,${filesList[activeImageIndex]?.base64}`}
                        alt={filesList[activeImageIndex]?.name || 'Document'}
                        externalDocUrl="saorethio1.com"
                        className="w-full max-h-[460px]"
                      />
                    </div>
                  </div>
                )}

                {/* Side-by-Side Comparison Rendering */}
                {imageComparisonMode === 'side_by_side' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400">
                      {currentLang === 'om'
                        ? 'Suuraalee ykn sanadoota lama filachuun cinaa fi cinaatti waldorgomsiisaa (e.g., Fuula 1 vs Fuula 2).'
                        : 'ሁለት ምስሎችን ወይም ገጾችን በመምረጥ ጎን ለጎን ያወዳድሩ (ለምሳሌ፡ ገጽ 1 እና ገጽ 2)።'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Panel */}
                      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <span className="text-[11px] font-mono font-bold text-amber-400 uppercase">Sanada 1 (Left)</span>
                          <select
                            value={activeImageIndex}
                            onChange={(e) => handleImageTabChange(Number(e.target.value))}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                          >
                            {filesList.map((f, i) => (
                              <option key={i} value={i}>
                                #{i + 1}: {f.name.slice(0, 22)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-h-[380px] flex items-center justify-center bg-slate-950/60 rounded-xl overflow-hidden p-2">
                          <ProgressiveLegalImageLoader
                            fullSrc={`data:${filesList[activeImageIndex]?.mimeType};base64,${filesList[activeImageIndex]?.base64}`}
                            alt={filesList[activeImageIndex]?.name || 'Sanada 1'}
                            externalDocUrl="saorethio1.com"
                            className="w-full h-full"
                          />
                        </div>
                      </div>

                      {/* Right Panel */}
                      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase">Sanada 2 (Right)</span>
                          <select
                            value={filesList[secondaryImageIndex] ? secondaryImageIndex : 0}
                            onChange={(e) => setSecondaryImageIndex(Number(e.target.value))}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                          >
                            {filesList.map((f, i) => (
                              <option key={i} value={i}>
                                #{i + 1}: {f.name.slice(0, 22)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-h-[380px] flex items-center justify-center bg-slate-950/60 rounded-xl overflow-hidden p-2">
                          {filesList[secondaryImageIndex] ? (
                            <ProgressiveLegalImageLoader
                              fullSrc={`data:${filesList[secondaryImageIndex]?.mimeType};base64,${filesList[secondaryImageIndex]?.base64}`}
                              alt={filesList[secondaryImageIndex]?.name || 'Sanada 2'}
                              externalDocUrl="saorethio1.com"
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="text-slate-500 text-xs text-center p-6">
                              {currentLang === 'om' ? 'Faayilli lammaffaan hin jiru.' : 'ሁለተኛ ፋይል የለም።'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Instant Legal OCR Trigger Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {currentLang === 'om' 
                        ? 'Keeyyattoota fi qabxiiwwan seeraa akkuma jiruutti baasa (Verbatim Legal OCR).' 
                        : 'የሕግ አንቀጾችንና ንዑሳን ድንጋጌዎችን እንዳሉ ያወጣል (Akkuma jiruutti)።'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAnalysisType('extract_text');
                      executeAnalysis('extract_text');
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading && analysisType === 'extract_text' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>OCR Baasaa Jira...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>{currentLang === 'om' ? 'Legal OCR: Barreeffama Baasi (Akkuma Jiruutti)' : currentLang === 'am' ? 'Legal OCR፡ ጽሑፉን አውጣ' : 'Run Legal OCR (Extract Text)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}


            {/* List of Multiple Uploaded Files */}
            {filesList.length > 0 && (
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2.5">
                <span className="text-[10px] uppercase font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <span>📂</span>
                  <span>Faayiloota Olka'an / የተጫኑ ሰነዶች ({filesList.length}):</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filesList.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="truncate text-slate-300 font-mono text-[11px] max-w-[180px]">{f.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const updated = filesList.filter((_, idx) => idx !== i);
                          setFilesList(updated);
                          if (updated.length > 0) {
                            setFile(updated[0].file);
                            setFileBase64(updated[0].base64);
                            setFileMimeType(updated[0].mimeType);
                          } else {
                            setFile(null);
                            setFileBase64(null);
                          }
                        }}
                        className="p-1 hover:bg-rose-950/60 hover:text-rose-300 rounded text-slate-500 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Web Worker Live Off-Thread Processing & Optimization Indicator */}
            {isProcessingWorker && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 text-cyan-300 text-xs animate-in fade-in">
                <span className="text-base animate-spin">⚙️</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{workerStatus || 'Web Worker Processing...'}</span>
                    <span className="font-mono text-[11px] font-bold text-cyan-400">{workerProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div 
                      className="bg-cyan-500 h-full rounded-full transition-all duration-200" 
                      style={{ width: `${workerProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isProcessingWorker && workerStats && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚡</span>
                  <div>
                    <span className="font-semibold text-slate-200">Web Worker Engine (Off-Main-Thread): </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {workerStats.originalSize} → {workerStats.optimizedSize} ({workerStats.ratio}% optimized)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    ⏱️ {workerStats.durationMs}ms
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
                    UI Responsive (60 FPS)
                  </span>
                </div>
              </div>
            )}

            {/* HIGH-RISK KEYWORDS & CLAUSES SUMMARY BANNER */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                  riskReport.overallRating === 'high'
                    ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                    : riskReport.overallRating === 'medium'
                    ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                }`}>
                  {riskReport.overallRating === 'high' ? '🚨' : riskReport.overallRating === 'medium' ? '⚠️' : '🛡️'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-100 font-serif">
                      SADARKAA BALAA SEERAA (RISK RATING):
                    </h3>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                      riskReport.overallRating === 'high'
                        ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                        : riskReport.overallRating === 'medium'
                        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                    }`}>
                      {riskReport.overallRating === 'high' ? '🔴 Ol’aanaa (High)' : riskReport.overallRating === 'medium' ? '🟡 Giddu-galeessa (Medium)' : '🟢 Gadi-aanaa / Clean'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Risk Index: <strong className="text-amber-300 font-mono">{riskReport.riskIndex}/100</strong> • Keeyyattoota Shakkiisaa: <strong className="text-rose-400 font-mono">{riskReport.totalFlaggedCount}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRiskSidebarOpen(!isRiskSidebarOpen)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  isRiskSidebarOpen
                    ? 'bg-rose-950 text-rose-300 border-rose-500/50 shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span>{isRiskSidebarOpen ? '🚨 Risk Sidebar Cufi' : '🚨 Qorannoo Balaa Bani'}</span>
              </button>
            </div>

            {/* Pasted text alternative */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Yookiin Barreeffama Sanadaa Asitti Qobadhaa (Paste Legal Text):
                </label>

                <div className="flex items-center gap-2">
                  {/* Procedural Legal Logic Auditor Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsProceduralAuditorOpen(!isProceduralAuditorOpen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                      isProceduralAuditorOpen
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                        : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                    }`}
                    title="Toggle AI Procedural Legal Logic & Signature Auditor"
                  >
                    <span>⚖️</span>
                    <span>
                      {isProceduralAuditorOpen
                        ? (currentLang === 'om' ? 'Odiitara Cufi' : currentLang === 'am' ? 'ኦዲተሩን ዝጋ' : 'Close Auditor')
                        : (currentLang === 'om' ? '⚖️ Odiitara Loojikii (SDFHH)' : currentLang === 'am' ? '⚖️ የሥነ-ሥርዓት ኦዲተር' : '⚖️ Legal Logic Auditor')}
                    </span>
                  </button>

                  {/* Share Draft Feature */}
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 bg-slate-950 hover:bg-slate-800 text-emerald-400 border-emerald-500/40 hover:border-emerald-400"
                    title="Share this draft securely with colleagues"
                  >
                    <span>🔗</span>
                    <span>
                      {currentLang === 'om' ? 'Waliin Qoodi' : currentLang === 'am' ? 'አጋራ' : 'Share Draft'}
                    </span>
                  </button>

                  {/* Voice-to-Text Dictation Button for Legal Text */}
                  <button
                    type="button"
                    onClick={() => toggleDictation('text')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                      isRecordingText
                        ? 'bg-rose-600 text-white border-rose-500 shadow-lg animate-pulse'
                        : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                    }`}
                    title="Dictate document text using your microphone"
                  >
                    <span>{isRecordingText ? '🔴' : '🎙️'}</span>
                    <span>
                      {isRecordingText
                        ? (currentLang === 'om' ? 'Dhaabi (Stop)' : currentLang === 'am' ? 'አቁም (Stop)' : 'Recording... Stop')
                        : (currentLang === 'om' ? 'Sagaleen Dubbisi' : currentLang === 'am' ? 'በድምፅ ተናገር' : 'Voice Dictation')}
                    </span>
                  </button>

                  {/* Toggle Preview with Subtle Gold Underlined Key Legal Terminology */}
                  {pastedText.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsPreviewHighlighted(!isPreviewHighlighted)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                        isPreviewHighlighted
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                      }`}
                      title="Toggle subtle gold underline highlighting on key legal terminology"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isPreviewHighlighted
                          ? (currentLang === 'om' ? 'Gulaali (Edit)' : currentLang === 'am' ? 'አርትዕ (Edit)' : 'Edit Text')
                          : (currentLang === 'om'
                              ? `Jechoota Calaqqisi (${inputTermsReport.totalCount})`
                              : currentLang === 'am'
                              ? `የሕግ ቃላትን አድምቅ (${inputTermsReport.totalCount})`
                              : `Highlight Terms (${inputTermsReport.totalCount})`)}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                {isPreviewHighlighted && pastedText.trim().length > 0 ? (
                  <div className="w-full bg-slate-950 border border-amber-500/50 rounded-2xl p-4 min-h-[140px] text-xs text-slate-200 leading-relaxed font-sans overflow-y-auto max-h-[360px] space-y-2 select-text shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-[11px] text-amber-400/90 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Key Legal Terminology Highlight Active (Subtle Gold Underline)</span>
                      </span>
                      <span>{inputTermsReport.totalCount} terms flagged</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {highlightKeyLegalTerminology(pastedText, {
                        currentLang,
                        onTermClick: (term) => setSelectedTermModal(term),
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      ref={textareaRef}
                      value={pastedText}
                      onChange={(e) => {
                        setPastedText(e.target.value);
                        if (e.target.value.trim().length >= 2) {
                          setShowTextAutoSuggest(true);
                        } else {
                          setShowTextAutoSuggest(false);
                        }
                      }}
                      onFocus={() => {
                        if (pastedText.trim().length >= 2) setShowTextAutoSuggest(true);
                      }}
                      placeholder="Fkn: Iyyata himannaa, deebii himatamaa, waraqaa waamichaa, murtii mana murtii, ykn waliigaltee seeraa..."
                      rows={6}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[140px] text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/70 font-sans leading-relaxed"
                    />

                    {/* Auto-Suggest Dropdown for Pasted Legal Text */}
                    {showTextAutoSuggest && pastedText.trim().length >= 2 && (
                      <CitationAutoSuggestDropdown
                        query={pastedText}
                        currentLang={currentLang}
                        onSelectCitation={handleSelectCitationForText}
                        onClose={() => setShowTextAutoSuggest(false)}
                      />
                    )}
                  </>
                )}
              </div>


              {/* AI Legal Logic & Procedural Auditor Panel */}
              {isProceduralAuditorOpen && pastedText.trim().length > 0 && (
                <div className="pt-3 animate-in fade-in duration-200">
                  <LegalLogicAuditorPanel
                    documentText={pastedText}
                    onUpdateText={(newText) => {
                      setPastedText(newText);
                    }}
                    currentLang={currentLang}
                    onClose={() => setIsProceduralAuditorOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* Collapsible/Embedded Risk Flagged Sidebar Panel */}
            {isRiskSidebarOpen && (pastedText.trim().length > 0 || riskReport.totalFlaggedCount > 0) && (
              <div className="pt-2 animate-in fade-in duration-200">
                <RiskFlaggedSidebar
                  currentLang={currentLang}
                  riskReport={riskReport}
                  onJumpToClause={handleJumpToRiskClause}
                  selectedClauseId={selectedRiskClauseId}
                  onClose={() => setIsRiskSidebarOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Analysis Type Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Gosa Xiinxalaa Filadhaa (Analysis Scope):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {analysisOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = analysisType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnalysisType(opt.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/80 shadow-md text-slate-100 ring-1 ring-amber-500/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className="font-bold text-xs">{currentLang === 'am' ? opt.amTitle : opt.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Output Languages */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Afaan Bu'aa Xiinxalaa (Output Languages):
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedLangs(['om', 'am', 'en'])}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  selectedLangs.length === 3
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Afaanota Sadeeniin (All 3 Languages)
              </button>
              {(['om', 'am', 'en'] as Language[]).map((lang) => {
                const isSelected = selectedLangs.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-amber-300 border-amber-500/60'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang === 'om' ? 'Afaan Oromoo' : lang === 'am' ? 'አማርኛ' : 'English'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom User Question */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Gaaffii Addaa Yoo Qabaattan (Optional Specific Query):
              </label>

              {/* Voice-to-Text Dictation Button for Custom Question */}
              <button
                type="button"
                onClick={() => toggleDictation('query')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                  isRecordingQuery
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg animate-pulse'
                    : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                }`}
                title="Dictate your question using your microphone"
              >
                <span>{isRecordingQuery ? '🔴' : '🎙️'}</span>
                <span>
                  {isRecordingQuery
                    ? (currentLang === 'om' ? 'Dhaabi (Stop)' : currentLang === 'am' ? 'አቁም (Stop)' : 'Recording... Stop')
                    : (currentLang === 'om' ? 'Sagaleen Gaafadhu' : currentLang === 'am' ? 'በድምፅ ጠይቅ' : 'Voice Dictate Question')}
                </span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => {
                  setCustomQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    setShowQueryAutoSuggest(true);
                  } else {
                    setShowQueryAutoSuggest(false);
                  }
                }}
                onFocus={() => {
                  if (customQuery.trim().length >= 2) setShowQueryAutoSuggest(true);
                }}
                placeholder="Fkn: Keeyyata 3 irratti beenyaan kaffalamu seeraan alaa moo eeyyamamaadha?..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 min-h-[48px] text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
              />

              {/* Auto-Suggest Dropdown for Custom Question */}
              {showQueryAutoSuggest && customQuery.trim().length >= 2 && (
                <CitationAutoSuggestDropdown
                  query={customQuery}
                  currentLang={currentLang}
                  onSelectCitation={handleSelectCitationForQuery}
                  onClose={() => setShowQueryAutoSuggest(false)}
                />
              )}
            </div>

            {/* Citation Toast Notification */}
            {citationToast && (
              <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150 shadow-lg">
                <span className="animate-bounce">✓</span>
                <span>{citationToast}</span>
              </div>
            )}

            {/* Dictation Status Banner */}
            {speechStatusMessage && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150">
                <span className="animate-pulse">🎙️</span>
                <span>{speechStatusMessage}</span>
              </div>
            )}

            {/* ACTION BUTTONS: Analyze, Summarize, Legal OCR, AI Logic Search & Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2">
              <button
                onClick={handleAnalyze}
                disabled={isLoading || (!file && !pastedText.trim() && filesList.length === 0)}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] cursor-pointer min-h-[50px]"
              >
                {isLoading && analysisType === 'risk_analysis' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Xiinxalaa...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">✨</span>
                    <span>XIINXALI</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSummarize}
                disabled={isLoading || (!file && !pastedText.trim() && filesList.length === 0)}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/50 font-bold text-xs tracking-wide shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] cursor-pointer min-h-[50px]"
              >
                {isLoading && analysisType === 'summarize' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gabaabsamaa...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">📊</span>
                    <span>GABAABSI</span>
                  </>
                )}
              </button>

              {/* LEGAL OCR BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setAnalysisType('extract_text');
                  executeAnalysis('extract_text');
                }}
                disabled={isLoading || (!file && !pastedText.trim() && filesList.length === 0)}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] cursor-pointer min-h-[50px]"
                title="Legal OCR: Extract text preserving legal document structures like article numbers and sub-clauses"
              >
                {isLoading && analysisType === 'extract_text' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>OCR Baasaa...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">⚡</span>
                    <span>LEGAL OCR</span>
                  </>
                )}
              </button>

              {/* AI LEGAL LOGIC SEARCH BUTTON */}
              <button
                type="button"
                onClick={handleExecuteLogicSearch}
                disabled={isLogicSearching || (!pastedText.trim() && !customQuery.trim())}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] cursor-pointer min-h-[50px]"
                title="AI Legal Logic Agent: Suggest relevant proclamations and articles based on concepts"
              >
                {isLogicSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Barbaacha...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">🧠</span>
                    <span>LOGIC SEARCH</span>
                  </>
                )}
              </button>

              {/* PROCEDURAL HISTORY TIMELINE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setIsTimelinePanelOpen(true);
                  setActiveOutputTab('timeline');
                }}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs tracking-wide shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.01] cursor-pointer min-h-[50px]"
                title="Procedural History Timeline: Extract chronological case milestones from document"
              >
                <span className="text-base">⏱️</span>
              </button>
            </div>
            </div>

            {/* AI Legal Logic Search Error */}
            {logicSearchError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs font-medium">
                {logicSearchError}
              </div>
            )}

            {/* AI Legal Logic Search Results Panel */}
            {logicSearchResult && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in duration-200 text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧠</span>
                    <h4 className="font-bold text-xs text-emerald-300 uppercase tracking-wider">
                      {currentLang === 'om' ? 'Siyaawaa Seeraa AI (Legal Logic Suggestions)' : currentLang === 'am' ? 'የሕግ ጽንሰ-ሐሳብ እና የአዋጅ ጥቆማዎች' : 'AI Suggested Proclamations & Articles'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogicSearchResult(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                  >
                    ✕ Cufi
                  </button>
                </div>

                <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-200 whitespace-pre-line font-sans space-y-2">
                  {logicSearchResult}
                </div>
              </div>
            )}

            {/* REAL-TIME CITATION VALIDATOR PANEL */}
            {(pastedText.trim().length > 10 || customQuery.trim().length > 10) && (
              <CitationValidatorPanel
                content={(pastedText || customQuery)}
                currentLang={currentLang}
                onOpenCassation={handleOpenInCassation}
                onOpenExplainLaw={handleOpenInExplainLaw}
                onApplyReplacement={(oldCitation, newCitation) => {
                  setPastedText((prev) => prev.replace(new RegExp(oldCitation, 'gi'), newCitation));
                  setCustomQuery((prev) => prev.replace(new RegExp(oldCitation, 'gi'), newCitation));
                }}
              />
            )}

            {/* LEGAL ANNOTATIONS & CROSS-REFERENCES TOOL */}
            <AnnotationTool
              documentId={result?.fileName || 'doc-analysis-active'}
              currentLang={currentLang}
              documentText={pastedText || result?.analysis || ''}
              onNavigateToCassation={handleOpenInCassation}
              onNavigateToExplainLaw={handleOpenInExplainLaw}
            />

          {/* Active Reasoning Steps while analyzing */}
          {isLoading && (
            <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 shadow-md space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Brain className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Moodeelli {modelTier} Yaada Seeraa (Deep Thinking) Raawwataa Jira:</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className={`flex items-center gap-2 ${analysisStep >= 1 ? 'text-amber-200 font-medium' : 'text-slate-500'}`}>
                  <span>{analysisStep >= 1 ? '✓' : '○'}</span>
                  <span>1. Qabiyyee sanadichaa fi keeyyattoota seeraa tokko tokkoon dubbisuu...</span>
                </div>
                <div className={`flex items-center gap-2 ${analysisStep >= 2 ? 'text-amber-200 font-medium' : 'text-slate-500'}`}>
                  <span>{analysisStep >= 2 ? '✓' : '○'}</span>
                  <span>2. Koodii Siivilii, Labsii 1156/2019, fi Murteewwan Dhaddacha Ijoo waliin madaaluu...</span>
                </div>
                <div className={`flex items-center gap-2 ${analysisStep >= 3 ? 'text-amber-200 font-medium' : 'text-slate-500'}`}>
                  <span>{analysisStep >= 3 ? '✓' : '○'}</span>
                  <span>3. Sadarkaa balaa seeraa herreguu fi gabaasa cuunfaa qopheessuu...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Deebisii Yaali (Retry)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Output Column */}
        <div className="lg:col-span-6 space-y-4">
          {result ? (
            <div className="space-y-4">
              {/* Output Tab Switcher: Analysis/Summary vs Citation Finder */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('content')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeOutputTab === 'content'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {result.analysisType === 'summarize' ? 'Cuunfaa Seeraa (Summary)' : 'Xiinxala (Analysis)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('citations')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeOutputTab === 'citations'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Wabiilee Seeraa ({detectedCitations.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('terminology')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeOutputTab === 'terminology'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                    title="View document with key legal terminology underlined in subtle gold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {currentLang === 'om'
                        ? `Jechoota Seeraa (${resultTermsReport.totalCount})`
                        : currentLang === 'am'
                        ? `የሕግ ቃላት (${resultTermsReport.totalCount})`
                        : `Key Terms (${resultTermsReport.totalCount})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('timeline')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeOutputTab === 'timeline'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                    title="View Procedural History Timeline with extracted case dates and procedural milestones"
                  >
                    <span>⏱️</span>
                    <span>Timeline (Seenaa Falmii)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('discussion')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeOutputTab === 'discussion'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Discuss this document"
                  >
                    <span>💬</span>
                    <span>Marii (Discussion)</span>
                  </button>
                </div>

                {/* AUDIO SUMMARY REVIEW TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowAudioReviewPlayer((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    showAudioReviewPlayer
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                      : 'bg-slate-800 hover:bg-slate-750 text-amber-300 border-amber-500/40 hover:border-amber-400'
                  }`}
                  title="Dhaggeeffannaa & Sagalee Cuunfaa Buusi (Listen & Export Audio)"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>
                    {showAudioReviewPlayer
                      ? (currentLang === 'om' ? 'Cufi' : currentLang === 'am' ? 'ዝጋ' : 'Close Player')
                      : (currentLang === 'om' ? 'Sagalee Cuunfaa' : currentLang === 'am' ? 'የማጠቃለያ ድምፅ' : 'Audio Review')}
                  </span>
                </button>

                {/* DIRECT AUDIO EXPORT BUTTON */}
                <button
                  type="button"
                  onClick={handleQuickExportSummaryAudio}
                  disabled={isQuickExportingAudio}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                    audioExportSuccessToast
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                  } disabled:opacity-50`}
                  title="Export summary as generated .wav audio file for on-the-go legal review"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isQuickExportingAudio
                      ? (currentLang === 'om' ? 'Qopheessaa...' : 'በማዘጋጀት ላይ...')
                      : audioExportSuccessToast
                      ? (currentLang === 'om' ? 'Bu\'eera!' : 'ወርዷል!')
                      : (currentLang === 'om' ? 'Sagalee Buusi (.wav)' : currentLang === 'am' ? 'ድምፅ አውርድ (.wav)' : 'Export Audio (.wav)')}
                  </span>
                </button>

                {/* COPY TO CLIPBOARD BUTTON FOR SUMMARIES */}
                <button
                  type="button"
                  onClick={handleCopyCleanText}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/60"
                  title="Copy Clean Text to Clipboard"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Waraabameera!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Waraabi (Copy)</span>
                    </>
                  )}
                </button>
              </div>

              {/* View 1: Main Document / Summary Content */}
              {activeOutputTab === 'content' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Main content pane */}
                  <div className={`${isSidebarOpen && detectedCitations.length > 0 ? 'xl:col-span-8' : 'xl:col-span-12'} space-y-4`}>
                  {/* Interactive Audio Player & Exporter for Legal Review On The Go */}
                  {showAudioReviewPlayer && result && (
                    <LegalSummaryAudioPlayer
                      currentLang={currentLang}
                      summaryText={result.analysis}
                      documentTitle={result.fileName || 'Cuunfaa Sanada Seeraa'}
                      onClose={() => setShowAudioReviewPlayer(false)}
                      className="mb-2"
                    />
                  )}

                  {/* Status Banner */}
                  <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <ShieldAlert className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                          {result.analysisType === 'summarize' ? 'Cuunfaa Sanadaa' : 'Xiinxala Seeraa'}: {result.fileName}
                        </h4>
                        <span className="text-[11px] text-amber-300 font-mono flex items-center gap-1.5 mt-0.5">
                          <Brain className="w-3.5 h-3.5" />
                          <span>Engine: {result.modelUsed || modelTier} (Deep Thinking)</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold hidden sm:inline-block">
                        ✓ Xumurame
                      </span>

                      {/* Direct Copy Shareable Link Button on Result Banner */}
                      <button
                        type="button"
                        onClick={handleCopyShareableLink}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer border ${
                          copiedHeaderShareLink
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40 hover:border-amber-400'
                        }`}
                        title="Copy direct shareable link for this legal finding"
                      >
                        <span>{copiedHeaderShareLink ? '📋' : '🔗'}</span>
                        <span>{copiedHeaderShareLink ? 'Waraabameera!' : 'Copy Shareable Link'}</span>
                      </button>

                      {/* Share to Social Floating Action Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsSocialMenuOpen((prev) => !prev)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/40 transition-all hover:scale-105 cursor-pointer"
                          title="Share to Social (Facebook, Telegram, WhatsApp)"
                        >
                          <span>📢</span>
                          <span>Share to Social</span>
                        </button>

                        {/* Floating Action Menu Dropdown */}
                        {isSocialMenuOpen && (
                          <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-base">📢</span>
                                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                                  Qoodaa / Share Analysis Result
                                </h4>
                              </div>
                              <button
                                onClick={() => setIsSocialMenuOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Platform Tabs */}
                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] mb-3">
                              <button
                                onClick={() => setActiveSocialPlatform('facebook')}
                                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  activeSocialPlatform === 'facebook'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                📘 Facebook
                              </button>
                              <button
                                onClick={() => setActiveSocialPlatform('telegram')}
                                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  activeSocialPlatform === 'telegram'
                                    ? 'bg-sky-500 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                ✈️ Telegram
                              </button>
                              <button
                                onClick={() => setActiveSocialPlatform('whatsapp')}
                                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  activeSocialPlatform === 'whatsapp'
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                💬 WhatsApp
                              </button>
                            </div>

                            {/* Platform-Specific Preview Card */}
                            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden mb-3 shadow-md">
                              <div className="relative">
                                <img
                                  src="/og-image.jpg"
                                  alt="SeeraAI Analysis Preview"
                                  className="w-full h-28 object-cover"
                                />
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold text-amber-300 font-mono">
                                  {result.analysisType === 'summarize' ? 'Cuunfaa' : 'Xiinxala Seeraa'}
                                </span>
                              </div>
                              <div className="p-3 space-y-1">
                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                  www.saorethio1.com
                                </div>
                                <h5 className="text-xs font-bold text-slate-200 line-clamp-1">
                                  {activeSocialPlatform === 'facebook'
                                    ? `⚖️ ${result.fileName} - Xiinxala Seeraa (SAI Ethio)`
                                    : activeSocialPlatform === 'telegram'
                                    ? `📌 ${result.fileName} | Qorannoo Seeraa Itoophiyaa`
                                    : `📑 ${result.fileName} - Xiinxala Seeraa`}
                                </h5>
                                <p className="text-[10px] text-slate-400 line-clamp-2">
                                  {result.analysis.replace(/[#*]/g, '').substring(0, 120)}...
                                </p>
                              </div>
                            </div>

                            {/* Deep Link URL & Copy */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  readOnly
                                  value={buildShareableFindingUrl('docAnalysis', result.fileName, currentLang)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-amber-300/90 truncate select-all"
                                />
                                <button
                                  onClick={async () => {
                                    const deepLink = buildShareableFindingUrl('docAnalysis', result.fileName, currentLang);
                                    await navigator.clipboard.writeText(deepLink);
                                    setCopiedSocialLink(true);
                                    setTimeout(() => setCopiedSocialLink(false), 2000);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                    copiedSocialLink
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  }`}
                                >
                                  <span>{copiedSocialLink ? '✓' : '📋'}</span>
                                </button>
                              </div>

                              {/* Direct Launch Buttons */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const deepLink = buildShareableFindingUrl('docAnalysis', result.fileName, currentLang);
                                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLink)}`, '_blank');
                                  }}
                                  className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold text-center cursor-pointer"
                                >
                                  Facebook
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const deepLink = buildShareableFindingUrl('docAnalysis', result.fileName, currentLang);
                                    const text = encodeURIComponent(`⚖️ Xiinxala Seeraa: ${result.fileName}\n${deepLink}`);
                                    window.open(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${text}`, '_blank');
                                  }}
                                  className="py-1.5 px-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold text-center cursor-pointer"
                                >
                                  Telegram
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const deepLink = buildShareableFindingUrl('docAnalysis', result.fileName, currentLang);
                                    const text = encodeURIComponent(`⚖️ Xiinxala Seeraa SAI Ethio: ${result.fileName}\n${deepLink}`);
                                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                                  }}
                                  className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold text-center cursor-pointer"
                                >
                                  WhatsApp
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toggle Sidebar Button if closed */}
                      {!isSidebarOpen && detectedCitations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsSidebarOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-bold text-xs shadow-md transition-all cursor-pointer"
                          title="Open Citation References Sidebar"
                        >
                          <span>📖</span>
                          <span>References Sidebar ({detectedCitations.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {result.analysisType === 'extract_text' ? (
                    <div className="w-full space-y-4 text-left">
                      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-4">
                        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📄</span>
                            <div>
                              <h3 className="font-serif-legal font-bold text-base text-slate-100 flex items-center gap-2">
                                <span>{currentLang === 'om' ? 'Barreeffama Suuraa Irraa Ba’e (Legal OCR Text):' : currentLang === 'am' ? 'ከምስል የወጣ ጽሑፍ (Legal OCR)' : 'Extracted Legal Text from Image(s):'}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-bold border border-cyan-500/20">
                                  Akkuma Jiruutti (Verbatim)
                                </span>
                              </h3>
                              <p className="text-[11px] text-slate-400">
                                {currentLang === 'om' 
                                  ? 'Keeyyattoota fi qabxiiwwan seeraa akkuma jiruutti eegamee waraabameera.' 
                                  : 'የሕግ አንቀጾችና ንዑሳን ድንጋጌዎች ተጠብቀው ወጥተዋል።'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* DYNAMIC IN-PLACE QUICK TRANSLATE BAR */}
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-amber-500/40 text-xs shadow-inner">
                              <span className="text-[10px] uppercase font-mono font-bold text-amber-400 px-1.5 flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <span>Quick Translate:</span>
                              </span>
                              {(['om', 'am', 'en'] as Language[]).map((lang) => {
                                const isSelected = extractedQuickLang === lang;
                                const isCached = Boolean(extractedTranslationsCache[lang]);
                                return (
                                  <button
                                    key={lang}
                                    type="button"
                                    onClick={() => handleQuickTranslate(lang)}
                                    disabled={isQuickTranslating}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                                      isSelected
                                        ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                                  >
                                    <span>{lang === 'om' ? 'Afaan Oromoo' : lang === 'am' ? 'አማርኛ' : 'English'}</span>
                                    {isCached && !isSelected && <span className="text-[9px] text-emerald-400">✓</span>}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Toggle between Plain and Highlighted */}
                            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                              <button
                                type="button"
                                onClick={() => setExtractViewMode('plain')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                  extractViewMode === 'plain'
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Raw
                              </button>
                              <button
                                type="button"
                                onClick={() => setExtractViewMode('highlighted')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                  extractViewMode === 'highlighted'
                                    ? 'bg-slate-800 text-amber-300 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span>✨ Terminology</span>
                                <span className="text-[10px] opacity-80">({resultTermsReport.totalCount})</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const textToCopy = extractedTranslationsCache[extractedQuickLang] || result.analysis;
                                navigator.clipboard.writeText(textToCopy);
                                setCopiedSummary(true);
                                setTimeout(() => setCopiedSummary(false), 2000);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                            >
                              <span>📋</span>
                              <span>{copiedSummary ? (currentLang === 'om' ? 'Waraabameera!' : 'ኮፒ ተደርጓል!') : (currentLang === 'om' ? 'Waraabi' : 'ኮፒ')}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Loading Banner during Quick Translation */}
                        {isQuickTranslating && (
                          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-pulse font-mono">
                            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                            <span>
                              {currentLang === 'om'
                                ? `Saffisaan gara ${extractedQuickLang === 'om' ? 'Afaan Oromoo' : extractedQuickLang === 'am' ? 'Afaan Amaaraa' : 'Afaan Ingilizii'}tti jijjiiraa jira...`
                                : `በፍጥነት ወደ ${extractedQuickLang === 'om' ? 'ኦሮምኛ' : extractedQuickLang === 'am' ? 'አማርኛ' : 'እንግሊዝኛ'} እየተተረጎመ ነው...`}
                            </span>
                          </div>
                        )}

                        {extractViewMode === 'highlighted' ? (
                          <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-slate-100 font-sans leading-relaxed select-text min-h-[220px] max-h-[500px] overflow-y-auto whitespace-pre-wrap">
                            {highlightKeyLegalTerminology(extractedTranslationsCache[extractedQuickLang] || result.analysis, {
                              currentLang,
                              onTermClick: (term) => setSelectedTermModal(term),
                            })}
                          </div>
                        ) : (
                          <textarea
                            readOnly
                            value={extractedTranslationsCache[extractedQuickLang] || result.analysis}
                            rows={14}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <DocumentViewer
                      currentLang={currentLang}
                      content={result.analysis}
                      separatedVersions={result.separatedVersions}
                      outputLanguages={result.outputLanguages}
                      title={`${result.analysisType === 'summarize' ? 'Cuunfaa' : 'Xiinxala'}: ${result.fileName}`}
                      taskType="general"
                      showQAPanel={true}
                    />
                  )}
                </div>

                {/* Sidebar pane for Citation References */}
                {isSidebarOpen && detectedCitations.length > 0 && (
                  <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl text-left">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📋</span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-100">
                          {currentLang === 'om' ? 'Wabiilee Seeraa' : currentLang === 'am' ? 'የሕግ ዋቢዎች' : 'Citations Sidebar'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      >
                        ✕ Cufi
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {currentLang === 'om'
                        ? 'Sanada xiinxalame keessatti labsiilee fi murteewwan seeraa argaman:'
                        : currentLang === 'am'
                        ? 'በተተነተነው ሰነድ ውስጥ የተጠቀሱ የሕግ ድንጋጌዎችና የሰበር ውሳኔዎች፦'
                        : 'Legal proclamations and case laws detected in the document analysis:'}
                    </p>

                    <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 animate-in fade-in duration-200">
                      {detectedCitations.map((citation) => {
                        const badgeColor =
                          citation.category === 'cassation'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                            : citation.category === 'constitution'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-500/30'
                            : 'bg-amber-950/80 text-amber-300 border-amber-500/30';
                        return (
                          <div
                            key={citation.id}
                            className="p-3.5 bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl space-y-2.5 transition-all text-left shadow-xs group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                  {citation.category === 'cassation' ? '🏛️ Cassation' : citation.category === 'constitution' ? '📜 Heera' : '📄 Proclamation'}
                                </span>
                                {citation.articleOrSection && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                    {citation.articleOrSection}
                                  </span>
                                )}
                                <span
                                  className="group/ext relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono bg-sky-950 text-sky-300 border border-sky-500/30 cursor-help shrink-0"
                                  title="Hosted on saorethio1.com to help maintain the app's performance"
                                >
                                  <span>🌐 External</span>
                                  <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden group-hover/ext:block w-48 p-2 rounded-lg bg-slate-950 text-slate-200 text-[10px] font-sans border border-slate-700 shadow-xl z-30 leading-snug">
                                    Hosted on saorethio1.com to help maintain the app's performance and 250 MB limit.
                                  </span>
                                </span>
                              </div>
                              <h5 className="text-[11px] font-extrabold text-amber-300 group-hover:text-amber-200 transition-colors leading-tight">
                                {citation.title[currentLang] || citation.title.om}
                              </h5>
                              <p className="text-[10px] text-slate-300 leading-relaxed font-sans line-clamp-3">
                                {citation.lawContext[currentLang] || citation.lawContext.om}
                              </p>
                            </div>

                            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-900 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleOpenInCassation(citation.cassationQuery)}
                                className="w-full text-left px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <span>🔍 {currentLang === 'om' ? 'Dhaddacha Ijoo Barbaadi' : currentLang === 'am' ? 'ሰበር መዝገብ ፈልግ' : 'Search Cassation'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenInExplainLaw(
                                    `Labsii ykn keeyyata ${citation.title.om} irratti ibsa guutuu fi murtiiwwan dhaddacha ijoo naaf dhiyeessi.`
                                  )
                                }
                                className="w-full text-left px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <span>📖 {currentLang === 'om' ? 'Seera Kana Qori' : currentLang === 'am' ? 'ሕጉን መርምር' : 'Explain Proclamation'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* View 2: CITATION FINDER (FDRE Proclamations, Regulations & Cassation library links) */}
              {activeOutputTab === 'citations' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-slate-200">
                      <Scale className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-bold">
                        Wabiilee Seeraa fi Labsiilee Argaman (Citations Detected)
                      </h3>
                    </div>
                    <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {detectedCitations.length} Citations
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Sanada keessan keessatti labsiileen, keeyyatoonni, fi murteewwan dhaddacha ijoo argaman armaan gaditti tarreeffamaniiru. Cuqaasuun kuusaa dhaddacha ijoo keessaa guutuu isaanii dubbisaa:
                  </p>

                  {detectedCitations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                      Wabiin seeraa addatti adda hin baane. Barreeffama seeraa labsii qabu olkaa'aa.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectedCitations.map((citation) => (
                        <div
                          key={citation.id}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 space-y-2.5 transition-all shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-amber-300">
                                  {citation.title[currentLang] || citation.title.om}
                                </span>
                                {citation.articleOrSection && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                    {citation.articleOrSection}
                                  </span>
                                )}
                                <span
                                  className="group/ext relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-950 text-sky-300 border border-sky-500/30 cursor-help shrink-0"
                                  title="Hosted on saorethio1.com to help maintain the app's performance"
                                >
                                  <span>🌐 External</span>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/ext:block w-48 p-2 rounded-lg bg-slate-950 text-slate-200 text-[10px] font-sans border border-slate-700 shadow-2xl z-30 leading-snug">
                                    Hosted on saorethio1.com to help maintain the app's performance and 250 MB limit.
                                  </span>
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                {citation.lawContext[currentLang] || citation.lawContext.om}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900">
                            {/* Direct link to Cassation Library */}
                            <button
                              type="button"
                              onClick={() => handleOpenInCassation(citation.cassationQuery)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>Dhaddacha Ijoo Keessaa Barbaadi</span>
                            </button>

                            {/* Direct link to Explain Law */}
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenInExplainLaw(
                                  `Labsii ykn keeyyata ${citation.title.om} irratti ibsa guutuu fi murtiiwwan dhaddacha ijoo naaf dhiyeessi.`
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                              <span>Seera Kana Qori</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* View 3: KEY LEGAL TERMINOLOGY SIDE-PANEL / EXPLORER */}
              {activeOutputTab === 'terminology' && (
                <LegalTerminologySidebar
                  currentLang={currentLang}
                  text={result?.analysis || pastedText || ''}
                  onClose={() => setActiveOutputTab('content')}
                  onOpenExplainLaw={(query) => handleOpenInExplainLaw(query)}
                />
              )}

              {/* View 4: PROCEDURAL HISTORY TIMELINE PANEL */}
              {activeOutputTab === 'timeline' && (
                <ProceduralHistoryTimelinePanel
                  currentLang={currentLang}
                  isOpen={true}
                  onClose={() => setActiveOutputTab('content')}
                  documentFile={file}
                  documentBase64={fileBase64}
                  documentMimeType={fileMimeType}
                  documentName={file ? file.name : (filesList.length > 0 ? filesList[0].name : 'Court Document')}
                  filesList={filesList}
                  pastedText={pastedText || result?.analysis || ''}
                  onInsertTimelineToDocument={(timelineText) => {
                    setPastedText((prev) => (prev ? prev + '\n\n' + timelineText : timelineText));
                  }}
                />
              )}

              {/* View 5: DISCUSSION PANEL */}
              {activeOutputTab === 'discussion' && result && (
                <DiscussionPanel targetId={result.fileName || 'general'} />
              )}
            </div>

          ) : isTimelinePanelOpen || activeOutputTab === 'timeline' ? (
            <div className="space-y-4">
              <ProceduralHistoryTimelinePanel
                currentLang={currentLang}
                isOpen={true}
                onClose={() => {
                  setIsTimelinePanelOpen(false);
                  setActiveOutputTab('content');
                }}
                documentFile={file}
                documentBase64={fileBase64}
                documentMimeType={fileMimeType}
                documentName={file ? file.name : (filesList.length > 0 ? filesList[0].name : 'Court Document')}
                filesList={filesList}
                pastedText={pastedText}
                onInsertTimelineToDocument={(timelineText) => {
                  setPastedText((prev) => (prev ? prev + '\n\n' + timelineText : timelineText));
                }}
              />
            </div>
          ) : (
            <div className="h-full min-h-[440px] rounded-2xl border-2 border-dashed border-slate-800/80 bg-slate-950/40 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-300">
                Xiinxala Sanada Seeraa & Gemini Thinking
              </h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed">
                Sanada seeraa olkaa'uun ykn fakkeenya olitti cuqaasuun balaa seeraa, cuunfaa gabaabaa (Summary), fi wabiilee labsii fi dhaddacha ijoo sakatta'aa.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-amber-400/80 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                <Brain className="w-3.5 h-3.5" />
                <span>Gemini 3.8 Flash (Thinking & Citation Finder) qophaa'eera</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTimelinePanelOpen(true);
                  setActiveOutputTab('timeline');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
              >
                <span>⏱️</span>
                <span>{currentLang === 'om' ? 'Seenaa Falmii (Timeline) Bani' : currentLang === 'am' ? 'የሥነ-ሥርዓት ሂደት የጊዜ ሰሌዳ ክፈት' : 'Open Procedural History Timeline'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      )}
      {result && (
        <button
          type="button"
          onClick={() => setActiveOutputTab('discussion')}
          className="fixed right-6 bottom-24 p-3 bg-amber-500 text-slate-950 rounded-full shadow-2xl hover:scale-105 transition-all z-40"
          title="Marii (Discussion)"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      <ShareDraftModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentLang={currentLang}
        title={file?.name || 'Legal Draft'}
        content={pastedText || (result ? result.analysis : '')}
      />

      {/* Hash Verification Failure Alert Dialog */}
      {showHashFailureDialog && failedVerificationResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {currentLang === 'om' ? 'Hanqina Mirkaneessaa!' : currentLang === 'am' ? 'የማረጋገጫ ስህተት!' : 'Verification Failure!'}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                {currentLang === 'om'
                  ? `Sanadni "${failedVerificationResult.name || failedVerificationResult.documentId}" qormaata hash server irratti hin milkoofne. Sanadni kun jijjiirameera ykn amanamummaa hin qabu.`
                  : `ሰነዱ "${failedVerificationResult.name || failedVerificationResult.documentId}" በሰርቨር ላይ የሃሽ ማረጋገጫ አልተሳካም። ሰነዱ ተቀይሯል ወይም አስተማማኝ አይደለም።`}
              </p>
              
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800 mb-6 font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected:</span>
                  <span className="text-slate-300 truncate ml-2">{failedVerificationResult.expectedHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calculated:</span>
                  <span className="text-red-400 truncate ml-2">{failedVerificationResult.calculatedHash}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setShowHashFailureDialog(false);
                    await handleOpenExternalDataset(); // Re-trigger with forceRefresh logic
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{currentLang === 'om' ? 'Irra Deebi\'i' : 'እንደገና ይሞክሩ'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHashFailureDialog(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  {currentLang === 'om' ? 'Dhiisi (Abort)' : 'ይቅር'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification History Section */}
      <div className="mt-12 p-6 bg-slate-900/50 border border-slate-800 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">
                {currentLang === 'om' ? 'Seenaa Mirkaneessaa' : 'የማረጋገጫ ታሪክ'}
              </h2>
              <p className="text-xs text-slate-500">
                {currentLang === 'om' 
                  ? 'Galmee mirkaneessaa cryptograafikaa sanadoota hundaaf.' 
                  : currentLang === 'am'
                  ? 'ለሁሉም ሰነዶች የምስጢር ኮድ ማረጋገጫ ኦዲት።'
                  : 'Audit trail for all cryptographic document verifications.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportHistory}
              disabled={verificationHistory.length === 0 || isExportingHistory}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportHistoryPdf}
              disabled={verificationHistory.length === 0 || isExportingHistory}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 border border-amber-500 transition-colors shadow-lg shadow-amber-900/20"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{currentLang === 'om' ? 'PDF (Audit)' : 'ፒዲኤፍ (ኦዲት)'}</span>
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={verificationHistory.length === 0}
              className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/30 text-red-400 disabled:opacity-30 rounded-lg text-xs font-bold border border-red-900/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {verificationHistory.length > 0 ? (
          <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-950/30">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800">
                  <th className="px-4 py-3 font-semibold text-slate-400 text-xs">
                    {currentLang === 'om' ? 'Yeroo' : currentLang === 'am' ? 'ጊዜ' : 'Timestamp'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-400 text-xs">
                    {currentLang === 'om' ? 'Sanada' : currentLang === 'am' ? 'ሰነድ' : 'Document'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-400 text-xs text-center">
                    {currentLang === 'om' ? 'Haala' : currentLang === 'am' ? 'ሁኔታ' : 'Status'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-400 text-xs hidden sm:table-cell">
                    {currentLang === 'om' ? 'Aalgoriizimii' : currentLang === 'am' ? 'አልጎሪዝም' : 'Algorithm'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {verificationHistory.slice(0, 10).map((entry, idx) => (
                  <tr key={`${entry.documentId}-${idx}`} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {formatLegalTimestamp(entry.verifiedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-300 text-xs">{entry.name || entry.documentId}</div>
                      <div className="text-[10px] text-slate-600 truncate max-w-[120px]">{entry.documentId}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.isVerified 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {entry.isVerified ? 'VERIFIED' : 'MISMATCH'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[10px] font-mono hidden sm:table-cell">
                      {entry.algorithm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <ShieldCheck className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">
              {currentLang === 'om' 
                ? 'Seenaan mirkaneessaa ammatti hin jiru.' 
                : currentLang === 'am'
                ? 'እስካሁን ምንም የማረጋገጫ ታሪክ አልተመዘገበም።'
                : 'No verification history recorded yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

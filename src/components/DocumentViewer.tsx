import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { saveDocument, updateDocument, getUserSettings } from '../services/storage';
import { addAnnotation } from '../services/annotationService';
import { PdfExportModal } from './PdfExportModal';
import { LegalCitationHighlighter } from './LegalCitationHighlighter';
import { DocumentQAPanel } from './DocumentQAPanel';
import { exportLegalDocumentToDocx, exportLegalDocumentToPdf, sanitizeFilename, sanitizeContentForExport } from '../services/legalDocumentExport';
import { ImmersiveReadingMode } from './ImmersiveReadingMode';
import { AnnotationTool } from './AnnotationTool';
import { OpenWithAppModal } from './OpenWithAppModal';
import { LEGAL_GLOSSARY_DATA, LegalGlossaryEntry } from '../data/legalGlossary';
import { standardizeLegalCitations } from '../services/legalCitationStandardizer';
import { AICitationRefinementWidget } from './AICitationRefinementWidget';
import { ShareDraftModal } from './ShareDraftModal';
import { normalizeOromoForSpeech, getBestPhoneticVoice } from '../utils/oromoSpeechNormalizer';
import { LegalSummaryAudioPlayer } from './LegalSummaryAudioPlayer';
import { downloadLegalSummaryAudio } from '../services/legalAudioExportService';
import { LitigationRoadmapWidget } from './LitigationRoadmapWidget';
import { LegalDictationToolbar } from './LegalDictationToolbar';
import { CitationPickerModal } from './CitationPickerModal';
import { CitationFixOverlay } from './CitationFixOverlay';
import { BookOpen } from 'lucide-react';

interface DocumentViewerProps {
  documentId?: string;
  currentLang: Language;
  content: string;
  separatedVersions?: {
    om?: string;
    am?: string;
    en?: string;
  };
  outputLanguages: Language[];
  title?: string;
  taskType: 'contract' | 'explain_law' | 'social_facebook' | 'social_telegram' | 'translate' | 'general';
  promptUsed?: string;
  onImprove?: (textToImprove: string) => void;
  onNavigateToCassation?: (query: string) => void;
  showQAPanel?: boolean;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  currentLang,
  content,
  separatedVersions,
  outputLanguages,
  title = 'Sanada Seeraa / የሕግ ሰነድ / Legal Document',
  taskType,
  promptUsed = '',
  onImprove,
  onNavigateToCassation,
  showQAPanel = true,
}) => {
  const t = translations[currentLang];
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isOpenWithModalOpen, setIsOpenWithModalOpen] = useState(false);
  const [isImmersiveOpen, setIsImmersiveOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isExportingWordQuick, setIsExportingWordQuick] = useState(false);
  const [wordExportSuccess, setWordExportSuccess] = useState(false);
  
  // Highlight & Text Selection States for .legal-content-body
  const [selectedSegmentText, setSelectedSegmentText] = useState('');
  const [highlightedToast, setHighlightedToast] = useState(false);
  const [sharedToast, setSharedToast] = useState(false);

  // Real-time Translate Annotation States
  const [isTranslateAnnotationOpen, setIsTranslateAnnotationOpen] = useState(false);
  const [activeGlossaryMatch, setActiveGlossaryMatch] = useState<LegalGlossaryEntry | null>(null);
  const [translatedAnnotationToast, setTranslatedAnnotationToast] = useState(false);
  
  // In-document Search States for .legal-content-body
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Speech Synthesis (Listen to Document TTS) State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Direct PDF Export utilizing .legal-print-wrapper styling
  const [isDirectPdfExporting, setIsDirectPdfExporting] = useState(false);
  const [isShareDraftModalOpen, setIsShareDraftModalOpen] = useState(false);

  // Audio Review & Export State
  const [showAdvancedAudioPlayer, setShowAdvancedAudioPlayer] = useState(false);
  const [isExportingAudioWav, setIsExportingAudioWav] = useState(false);
  const [audioExportToast, setAudioExportToast] = useState(false);

  // Text Layout Alignment State for .legal-content-body
  const [textLayout, setTextLayout] = useState<'justify' | 'left'>('justify');

  // Toolbar Visibility Toggle - keeps reading text completely clean and unobstructed
  const [showReaderTools, setShowReaderTools] = useState(true);

  // In-line Document Editor & Legal Dictation State
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [editableDraftText, setEditableDraftText] = useState('');
  const [isCitationPickerOpen, setIsCitationPickerOpen] = useState(false);
  const [fixTargetRange, setFixTargetRange] = useState<{ start: number, end: number, original: string } | null>(null);
  const [citationInitialQuery, setCitationInitialQuery] = useState('');
  const editorTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleStartEditing = () => {
    setEditableDraftText(activeContent);
    setIsEditingDocument(true);
  };

  const handleSaveEditing = async () => {
    setContentOverride(editableDraftText);
    setIsEditingDocument(false);
    try {
      if (documentId) {
        updateDocument(documentId, {
          content: editableDraftText,
          updatedAt: new Date().toISOString(),
        });
      } else {
        saveDocument({
          title,
          content: editableDraftText,
          taskType,
          prompt: promptUsed || '',
          outputLanguages,
          tags: [taskType],
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.warn('Auto-save edited document error:', e);
    }
  };

  const handleCancelEditing = () => {
    setIsEditingDocument(false);
  };

  const handleExportAudioFile = async () => {
    setIsExportingAudioWav(true);
    try {
      const targetLang = activeLangTab === 'combined' ? currentLang : activeLangTab;
      await downloadLegalSummaryAudio(activeContent, title, {
        lang: targetLang as Language,
        preferNeural: true,
      });
      setAudioExportToast(true);
      setTimeout(() => setAudioExportToast(false), 3000);
    } catch (err) {
      console.warn('Audio export error:', err);
    } finally {
      setIsExportingAudioWav(false);
    }
  };

  const handleDirectDownloadPdf = async () => {
    setIsDirectPdfExporting(true);
    try {
      const filename = `${sanitizeFilename(title)}_Legal_Doc.pdf`;
      await exportLegalDocumentToPdf('document-viewer-print-container', filename, (msg) => {
        console.log(msg);
      });
    } catch (e: any) {
      console.error('Direct PDF export failed:', e);
      setIsPdfModalOpen(true);
    } finally {
      setIsDirectPdfExporting(false);
    }
  };

  const contentRef = React.useRef<HTMLDivElement>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const selected = selection.toString().trim();
      if (selected.length >= 2) {
        setSelectedSegmentText(selected);
      }
    }
  };

  const handleHighlightSave = async () => {
    const textToHighlight = selectedSegmentText || (window.getSelection()?.toString().trim() || '');
    if (!textToHighlight) return;

    const targetDocId = documentId || `doc-${Date.now()}`;
    await addAnnotation({
      documentId: targetDocId,
      selectedText: textToHighlight,
      color: 'amber',
      content: `Highlighted excerpt from ${title}`,
      tag: 'important',
    });

    setHighlightedToast(true);
    setSelectedSegmentText('');
    setTimeout(() => setHighlightedToast(false), 2000);
  };

  const handleShareSegment = async () => {
    const textToShare = selectedSegmentText || (window.getSelection()?.toString().trim() || activeContent.substring(0, 200));
    const baseUrl = window.location.origin + window.location.pathname;
    const deepLink = `${baseUrl}?docId=${encodeURIComponent(documentId || 'legal-doc')}&segment=${encodeURIComponent(textToShare)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'SeeraAI Legal Excerpt',
          text: `⚖️ ${title}\n\n"${textToShare.substring(0, 150)}..."\n\nDeep Link:`,
          url: deepLink,
        });
        setSharedToast(true);
        setTimeout(() => setSharedToast(false), 2000);
        return;
      } catch (e) {
        // Fallback to copy deep link
      }
    }

    try {
      if (document.hasFocus() && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(deepLink);
      } else {
        // Fallback textarea method for iframe contexts where document.hasFocus() might be false
        const textArea = document.createElement('textarea');
        textArea.value = deepLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 2000);
    } catch (err) {
      console.warn('Clipboard write fallback notification:', err);
      // Even if OS restricts clipboard completely, trigger toast and prompt
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 2000);
    }
  };

  const handleOpenTranslateAnnotation = (termToTranslate?: string) => {
    const raw = (termToTranslate || selectedSegmentText || window.getSelection()?.toString() || '').trim();
    if (!raw) return;
    const q = raw.toLowerCase();

    // Match in legal glossary
    const match = LEGAL_GLOSSARY_DATA.find(
      (item) =>
        item.om.term.toLowerCase() === q ||
        item.am.term.toLowerCase() === q ||
        item.en.term.toLowerCase() === q ||
        item.om.term.toLowerCase().includes(q) ||
        item.am.term.toLowerCase().includes(q) ||
        item.en.term.toLowerCase().includes(q) ||
        q.includes(item.om.term.toLowerCase()) ||
        q.includes(item.am.term.toLowerCase()) ||
        q.includes(item.en.term.toLowerCase())
    );

    setActiveGlossaryMatch(match || null);
    setSelectedSegmentText(raw);
    setIsTranslateAnnotationOpen(true);
  };

  const handleSaveTranslatedAnnotation = async () => {
    if (!selectedSegmentText) return;
    const targetDocId = documentId || `doc-${Date.now()}`;
    const explanationContent = activeGlossaryMatch
      ? `[TRILINGUAL LEGAL TRANSLATION]\n• OM: ${activeGlossaryMatch.om.term} - ${activeGlossaryMatch.om.definition}\n• AM: ${activeGlossaryMatch.am.term} - ${activeGlossaryMatch.am.definition}\n• EN: ${activeGlossaryMatch.en.term} - ${activeGlossaryMatch.en.definition}\nRef: ${activeGlossaryMatch.sourceReference}`
      : `[LEGAL TERM TRANSLATION]: ${selectedSegmentText}`;

    await addAnnotation({
      documentId: targetDocId,
      selectedText: selectedSegmentText,
      color: 'cyan',
      content: explanationContent,
      tag: 'important',
    });

    setTranslatedAnnotationToast(true);
    setTimeout(() => {
      setTranslatedAnnotationToast(false);
      setIsTranslateAnnotationOpen(false);
    }, 1800);
  };

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll > 0) {
        const progress = (scrollTop / totalScroll) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      } else {
        setScrollProgress(100);
      }
    }
  };

  // Global keyboard shortcut listeners (Ctrl+S and Ctrl+P)
  useEffect(() => {
    const handleGlobalSave = () => {
      handleSave();
    };

    const handleGlobalPrint = () => {
      setIsPdfModalOpen(true);
    };

    window.addEventListener('seera:save_current_document', handleGlobalSave);
    window.addEventListener('seera:print_current_document', handleGlobalPrint);

    return () => {
      window.removeEventListener('seera:save_current_document', handleGlobalSave);
      window.removeEventListener('seera:print_current_document', handleGlobalPrint);
    };
  }, [title, taskType, promptUsed, outputLanguages, content, separatedVersions]);

  // Tab state for multi-language display
  const hasMultiple = outputLanguages.length > 1;
  const [activeLangTab, setActiveLangTab] = useState<'combined' | 'om' | 'am' | 'en'>(
    hasMultiple ? 'combined' : outputLanguages[0] || 'om'
  );
  const [contentOverride, setContentOverride] = useState<string | null>(null);

  useEffect(() => {
    setContentOverride(null);
  }, [content, activeLangTab]);

  const getDisplayContent = () => {
    if (contentOverride !== null) {
      return contentOverride;
    }
    if (!hasMultiple || activeLangTab === 'combined') {
      return content;
    }
    if (activeLangTab === 'om' && separatedVersions?.om) return separatedVersions.om;
    if (activeLangTab === 'am' && separatedVersions?.am) return separatedVersions.am;
    if (activeLangTab === 'en' && separatedVersions?.en) return separatedVersions.en;
    return content;
  };

  const activeContent = getDisplayContent();

  // In-document Search Match Calculations
  const matchIndices = React.useMemo(() => {
    if (!docSearchQuery.trim()) return [];
    const matches: number[] = [];
    const q = docSearchQuery.toLowerCase();
    const text = activeContent.toLowerCase();
    let pos = text.indexOf(q);
    while (pos !== -1) {
      matches.push(pos);
      pos = text.indexOf(q, pos + q.length || pos + 1);
    }
    return matches;
  }, [docSearchQuery, activeContent]);

  const matchCount = matchIndices.length;

  const handleNextMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
  };

  const handlePrevMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
  };

  // Stop speech synthesis when active document content changes or unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeContent]);

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert(
        currentLang === 'om'
          ? 'Sirna dubbisuu (Speech Synthesis) meeshaa keessan irratti hin deeggaramne.'
          : currentLang === 'am'
          ? 'የድምፅ ንባብ አገልግሎት በዚህ ማሰሻ አይደገፍም።'
          : 'Speech synthesis is not supported on this browser.'
      );
      return;
    }

    const synth = window.speechSynthesis;

    if (isSpeaking) {
      if (isPaused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
      return;
    }

    synth.cancel();

    // Clean text to read aloud
    const textToRead = activeContent
      .replace(/[#*_~`]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!textToRead) return;

    // Determine language tag based on active tab or current language
    let langCode = 'om-ET';
    if (activeLangTab === 'am' || (activeLangTab === 'combined' && currentLang === 'am')) {
      langCode = 'am-ET';
    } else if (activeLangTab === 'en' || (activeLangTab === 'combined' && currentLang === 'en')) {
      langCode = 'en-US';
    } else {
      langCode = 'om-ET';
    }

    const processedText = langCode === 'om-ET' ? normalizeOromoForSpeech(textToRead) : textToRead;

    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.lang = langCode;
    utterance.rate = 0.92; // Clear measured pace for legal text

    const voices = synth.getVoices();
    let matchingVoice: SpeechSynthesisVoice | null = null;
    if (langCode === 'om-ET') {
      matchingVoice = getBestPhoneticVoice(synth);
    } else {
      matchingVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langCode.substring(0, 2))) || null;
    }

    if (matchingVoice) {
      utterance.voice = matchingVoice;
      if (langCode === 'om-ET' && matchingVoice.lang) {
        utterance.lang = matchingVoice.lang;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
  };

  const handleStopSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleSave = () => {
    const isBioEnforced = !!getUserSettings().biometricDocumentProtection;
    saveDocument({
      title: title || 'Untitled Legal Document',
      taskType,
      prompt: promptUsed,
      outputLanguages,
      content,
      separatedVersions,
      tags: ['SeeraAI', taskType, ...outputLanguages],
      isHighSecurity: isBioEnforced,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleBookmark = () => {
    const isBioEnforced = !!getUserSettings().biometricDocumentProtection;
    saveDocument({
      title: title || 'Untitled Legal Document',
      taskType,
      prompt: promptUsed,
      outputLanguages,
      content,
      separatedVersions,
      tags: ['SeeraAI', 'Bookmarked', taskType, ...outputLanguages],
      isBookmarked: true,
      isHighSecurity: isBioEnforced,
    });
    setBookmarked(true);
    setTimeout(() => setBookmarked(false), 3000);
  };

  const handleExportTxt = () => {
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShareTelegram = () => {
    let url = window.location.href;
    if (url.includes('ais-dev-')) {
      url = url.replace('ais-dev-', 'ais-pre-');
    }
    const snippet = activeContent.substring(0, 300).replace(/[#*]/g, '');
    const text = encodeURIComponent(`⚖️ ${title}\n\n${snippet}...\n\n-- SeeraAI Ethiopian Legal AI (@ayelebeharmee)`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    let url = window.location.href;
    if (url.includes('ais-dev-')) {
      url = url.replace('ais-dev-', 'ais-pre-');
    }
    const text = encodeURIComponent(`⚖️ ${title} - SeeraAI Ethiopian Legal Platform`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${text}`, '_blank');
  };

  const getPdfButtonLabel = () => {
    if (currentLang === 'om') return 'GARA PDF / BUUSI';
    if (currentLang === 'am') return 'በፒዲኤፍ አውርድ';
    return 'DOWNLOAD AS PDF';
  };

  const handleQuickWordExport = async () => {
    setIsExportingWordQuick(true);
    try {
      const userSettings = getUserSettings();
      const sections = [];
      if (hasMultiple && separatedVersions) {
        if (separatedVersions.om) sections.push({ lang: 'om', title: 'AFAN OROMOO', text: separatedVersions.om });
        if (separatedVersions.am) sections.push({ lang: 'am', title: 'አማርኛ', text: separatedVersions.am });
        if (separatedVersions.en) sections.push({ lang: 'en', title: 'ENGLISH', text: separatedVersions.en });
      }
      if (sections.length === 0) {
        sections.push({ lang: currentLang, title, text: activeContent });
      }

      await exportLegalDocumentToDocx(
        {
          title,
          taskType,
          refNumber: `ETH-LAW/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
          gregorianDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          ethiopianDate: `Fulbaana 23, 2019 B.A. / መስከረም 23 ቀን 2019 ዓ.ም`,
          sections,
          branding: userSettings.lawFirmBranding,
          includeLetterhead: true,
          includeSignatureBlock: true,
          includeWatermark: true,
        },
        `${sanitizeFilename(title)}_Legal_Doc.docx`
      );
      setWordExportSuccess(true);
      setTimeout(() => setWordExportSuccess(false), 3000);
    } catch (e: any) {
      console.error('Word quick export failed:', e);
      // Fallback: open modal
      setIsPdfModalOpen(true);
    } finally {
      setIsExportingWordQuick(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="bg-slate-950/70 p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span>🛡️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm sm:text-base">{title}</h3>
              
              {/* QUICK DOWNLOAD PDF BUTTON (Direct in Header for User Visibility) */}
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                title={getPdfButtonLabel()}
              >
                <span>📥</span>
                <span className="text-[10px] font-bold">PDF</span>
              </button>

              {/* BANI NAWAAN (OPEN WITH APP) Button */}
              <button
                onClick={() => setIsOpenWithModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition-all cursor-pointer"
                title="Bani Nawaan / Open with App (TECNO File Viewer, Drive, Files, Dropbox...)"
              >
                <span>📱</span>
                <span className="text-[10px] font-bold uppercase">
                  {currentLang === 'om' ? 'Bani' : currentLang === 'am' ? 'ይክፈቱ' : 'Open'}
                </span>
              </button>

              {/* DIRECT DOWNLOAD AS PDF BUTTON (Maintaining .legal-print-wrapper styling, trilingual formatting & watermark) */}
              <button
                onClick={handleDirectDownloadPdf}
                disabled={isDirectPdfExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition-all cursor-pointer font-bold text-xs shadow-sm disabled:opacity-50"
                title="Download as PDF using .legal-print-wrapper styling with trilingual formatting and watermarking"
              >
                <span>{isDirectPdfExporting ? '🔄' : '📥'}</span>
                <span>
                  {isDirectPdfExporting
                    ? (currentLang === 'om' ? 'PDF qopheessaa...' : currentLang === 'am' ? 'በዘጋጅ ላይ...' : 'Preparing PDF...')
                    : (currentLang === 'om' ? 'Download as PDF' : currentLang === 'am' ? 'PDF አውርድ' : 'Download as PDF')}
                </span>
              </button>

              {/* Quick Bookmark Star */}
              <button
                onClick={handleBookmark}
                className={`p-1 rounded-lg border transition-all cursor-pointer ${
                  bookmarked
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-400'
                }`}
                title={bookmarked ? 'Bookmarked!' : 'Bookmark this document for quick access in My Content'}
              >
                <span>⭐</span>
              </button>

              {/* Toggle Reader Toolbar Button */}
              <button
                type="button"
                onClick={() => setShowReaderTools((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  showReaderTools
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={showReaderTools ? 'Hide reader toolbar' : 'Show reader toolbar (search, audio, copy, share)'}
              >
                <span>{showReaderTools ? '👁️' : '🔍'}</span>
                <span className="hidden sm:inline">
                  {showReaderTools
                    ? (currentLang === 'om' ? 'Meeshaalee Dhoksi' : currentLang === 'am' ? 'መሳሪያዎችን ደብቅ' : 'Hide Tools')
                    : (currentLang === 'om' ? 'Meeshaalee Agarsiisi' : currentLang === 'am' ? 'መሳሪያዎችን አሳይ' : 'Show Tools')}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{t.common.legalAccuracyNotice}</span>
            </div>
          </div>
        </div>

        {/* Trilingual Tabs (When multi-language generated) */}
        {hasMultiple && (
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveLangTab('combined')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                activeLangTab === 'combined'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🥞</span>
              <span>{t.create.tabCombined}</span>
            </button>
            {outputLanguages.includes('om') && (
              <button
                onClick={() => setActiveLangTab('om')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeLangTab === 'om'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Afaan Oromoo
              </button>
            )}
            {outputLanguages.includes('am') && (
              <button
                onClick={() => setActiveLangTab('am')}
                className={`px-3 py-1 text-xs font-ethiopic font-medium rounded-lg transition-all ${
                  activeLangTab === 'am'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                አማርኛ
              </button>
            )}
            {outputLanguages.includes('en') && (
              <button
                onClick={() => setActiveLangTab('en')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeLangTab === 'en'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
            )}
          </div>
        )}
      </div>

      {/* Visual Reading Progress Bar for Long Legal Documents */}
      <div className="w-full bg-slate-950 h-1 overflow-hidden border-b border-slate-800/60 relative">
        <div
          role="progressbar"
          aria-valuenow={Math.round(scrollProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Document reading progress"
          className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 h-full transition-[width] duration-150 ease-out shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Stationary Control Bar (Search & Action Buttons): Positioned OUTSIDE the text scroll container so it never overlaps or blocks reading text */}
      {showReaderTools && (
        <div className="bg-slate-950/90 backdrop-blur-md p-2.5 sm:p-3 border-b border-slate-800/80 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* In-Document Term/Phrase Search Input */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-xs">🔍</span>
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => {
                  setDocSearchQuery(e.target.value);
                  setCurrentMatchIndex(0);
                }}
                placeholder={
                  currentLang === 'om'
                    ? 'Sanada keessatti barbaadi: Jechoota, Keeyyattoota seeraa...'
                    : currentLang === 'am'
                    ? 'በሰነዱ ውስጥ ይፈልጉ፦ የሕግ ቃላት፣ አንቀጾች...'
                    : 'Find legal terms or phrases in document...'
                }
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
              {docSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setDocSearchQuery('');
                    setCurrentMatchIndex(0);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Match Counter Badge & Stepper */}
            {docSearchQuery.trim() !== '' && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs shrink-0 font-mono shadow-inner">
                <span className={`text-[11px] font-bold ${matchCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : (currentLang === 'om' ? '0 argame' : '0 found')}
                </span>
                {matchCount > 0 && (
                  <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1.5 ml-0.5">
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      className="p-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-amber-300 transition-colors text-[10px] cursor-pointer"
                      title="Previous match"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      className="p-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-amber-300 transition-colors text-[10px] cursor-pointer"
                      title="Next match"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons (Listen, Highlight, Copy, Share, Align) */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end flex-wrap sm:flex-nowrap">
            {/* Listen to Document (TTS) Button */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleSpeak}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                  isSpeaking && !isPaused
                    ? 'bg-purple-600 border-purple-400 text-white animate-pulse shadow-purple-950/50'
                    : isSpeaking && isPaused
                    ? 'bg-amber-600/90 border-amber-400 text-white'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-purple-500/40 text-purple-300 hover:text-purple-200'
                }`}
                title="Listen to legal document text read aloud"
              >
                <span className="text-sm font-black">
                  {isSpeaking ? (isPaused ? '▶️' : '⏸️') : '🔊'}
                </span>
                <span>
                  {isSpeaking
                    ? isPaused
                      ? (currentLang === 'om' ? 'Itti Fufi' : currentLang === 'am' ? 'ቀጥል' : 'Resume')
                      : (currentLang === 'om' ? 'Dhaabi' : currentLang === 'am' ? 'አቁም' : 'Pause')
                    : (currentLang === 'om' ? 'Dhaggeeffadhu' : currentLang === 'am' ? 'አዳምጥ' : 'Listen')}
                </span>
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={handleStopSpeak}
                  className="p-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-bold transition-all cursor-pointer"
                  title="Stop speech synthesis"
                >
                  ⏹️
                </button>
              )}

              {/* Advanced Audio Player & On-the-Go Review Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedAudioPlayer((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                  showAdvancedAudioPlayer
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-950/40'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-amber-500/40 text-amber-300 hover:text-amber-200'
                }`}
                title="Open Studio Audio Player & On-the-Go Commute Controls"
              >
                <span>🎧</span>
                <span className="hidden sm:inline">
                  {currentLang === 'om' ? 'Audio Player' : currentLang === 'am' ? 'የድምፅ ማጫወቻ' : 'Audio Player'}
                </span>
              </button>

              {/* Direct Audio WAV Export Download Button */}
              <button
                type="button"
                onClick={handleExportAudioFile}
                disabled={isExportingAudioWav}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/40 text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
                title="Export legal document/summary as downloadable .wav audio file"
              >
                <span>{isExportingAudioWav ? '⏳' : audioExportToast ? '✓' : '📥'}</span>
                <span>
                  {isExportingAudioWav
                    ? (currentLang === 'om' ? 'Sagalee...' : 'በማዘጋጀት...')
                    : audioExportToast
                    ? (currentLang === 'om' ? 'Bu\'eera!' : 'ወርዷል!')
                    : (currentLang === 'om' ? 'Audio (.wav)' : currentLang === 'am' ? 'ድምፅ (.wav)' : 'Export Audio')}
                </span>
              </button>
            </div>

            {/* Highlight Button */}
            <button
              type="button"
              onClick={handleHighlightSave}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                highlightedToast
                  ? 'bg-emerald-600/90 border-emerald-400 text-white scale-105'
                  : selectedSegmentText
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold animate-pulse'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-amber-300'
              }`}
              title="Save selected text segment to local storage"
            >
              <span className="text-sm font-black">{highlightedToast ? '✓' : '🖍️'}</span>
              <span>
                {highlightedToast
                  ? (currentLang === 'om' ? 'Kuusameera!' : currentLang === 'am' ? 'ተቀምጧል!' : 'Saved!')
                  : selectedSegmentText
                  ? (currentLang === 'om' ? 'Filannoo Kuusi' : currentLang === 'am' ? 'የተመረጠውን አስቀምጥ' : 'Highlight')
                  : (currentLang === 'om' ? 'Qabxeessi' : currentLang === 'am' ? 'አስምር' : 'Highlight')}
              </span>
            </button>

            {/* Translate Annotation Button */}
            <button
              type="button"
              onClick={() => handleOpenTranslateAnnotation()}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                selectedSegmentText
                  ? 'bg-cyan-600 text-white border-cyan-400 font-extrabold animate-pulse shadow-cyan-900/50'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-cyan-500/40 text-cyan-300 hover:text-cyan-200'
              }`}
              title="Highlight specific legal terminology and instantly see trilingual translation & explanation"
            >
              <span className="text-sm font-black">🌐</span>
              <span>
                {currentLang === 'om' ? 'Hiika & Ibsa' : currentLang === 'am' ? 'የትርጉም ማብራሪያ' : 'Translate Term'}
              </span>
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                copied
                  ? 'bg-emerald-600/90 border-emerald-400 text-white scale-105'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-amber-500/40 text-amber-300 hover:text-amber-200'
              }`}
              title={copied ? 'Copied to clipboard!' : 'Copy trilingual legal text to clipboard'}
            >
              <span className="text-sm font-black">{copied ? '✓' : '📋'}</span>
              <span>
                {copied
                  ? (currentLang === 'om' ? 'Waraabame!' : currentLang === 'am' ? 'ተቀድቷል!' : 'Copied!')
                  : (currentLang === 'om' ? 'Waraabi' : currentLang === 'am' ? 'ቅዳ' : 'Copy')}
              </span>
            </button>

            {/* Direct Edit & Legal Dictation Button */}
            <button
              type="button"
              onClick={() => {
                if (isEditingDocument) {
                  handleSaveEditing();
                } else {
                  handleStartEditing();
                }
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                isEditingDocument
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-950/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-300 hover:text-emerald-200'
              }`}
              title="Gulaali fi maaykirofooniin dubbisi / Edit document with microphone dictation"
            >
              <span className="text-sm font-black">{isEditingDocument ? '💾' : '🎙️'}</span>
              <span>
                {isEditingDocument
                  ? (currentLang === 'om' ? 'Olkaayi / Save' : currentLang === 'am' ? 'አስቀምጥ' : 'Save Changes')
                  : (currentLang === 'om' ? 'Gulaali & Sagalee' : currentLang === 'am' ? 'አርትዕና ድምፅ' : 'Edit & Dictate')}
              </span>
            </button>

            {/* Share Deep Link Button */}
            <button
              type="button"
              onClick={handleShareSegment}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                sharedToast
                  ? 'bg-cyan-600/90 border-cyan-400 text-white scale-105'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-cyan-500/40 text-cyan-300 hover:text-cyan-200'
              }`}
              title="Generate & copy deep link to selected segment"
            >
              <span className="text-sm font-black">{sharedToast ? '✓' : '🔗'}</span>
              <span>
                {sharedToast
                  ? (currentLang === 'om' ? 'Qoodameera!' : currentLang === 'am' ? 'ተጋርቷል!' : 'Copied!')
                  : (currentLang === 'om' ? 'Qoodi' : currentLang === 'am' ? 'አጋራ' : 'Share')}
              </span>
            </button>

            {/* Secure Share Draft for Multi-User Review Button */}
            <button
              type="button"
              onClick={() => setIsShareDraftModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-300 hover:text-amber-200"
              title="Generate access-controlled token to share draft with legal peers for comments & review"
            >
              <span className="text-sm font-black">📤</span>
              <span>
                {currentLang === 'om' ? 'Qophii Qoodi' : currentLang === 'am' ? 'ረቂቅ አጋራ' : 'Share Draft'}
              </span>
            </button>

            {/* Text Alignment Layout Toggle (Justify vs Left Align) */}
            <button
              type="button"
              onClick={() => setTextLayout((prev) => (prev === 'justify' ? 'left' : 'justify'))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-300 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              title={`Switch text layout: ${textLayout === 'justify' ? 'Full Justify (Click to switch to Left Align)' : 'Left Align (Click to switch to Full Justify)'}`}
            >
              <span>{textLayout === 'justify' ? '☷' : '≡'}</span>
              <span>{textLayout === 'justify' ? 'Justify' : 'Left'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Advanced Studio Audio Review Player for Legal Briefs & Summaries */}
      {showAdvancedAudioPlayer && (
        <div className="px-4 sm:px-6 pt-3">
          <LegalSummaryAudioPlayer
            currentLang={activeLangTab === 'combined' ? currentLang : activeLangTab}
            summaryText={activeContent}
            documentTitle={title}
            onClose={() => setShowAdvancedAudioPlayer(false)}
          />
        </div>
      )}

      {/* AI-Powered Refinement Tool for Incomplete Legal Citations */}
      <AICitationRefinementWidget
        documentText={activeContent}
        currentLang={currentLang}
        onApplyRefinements={(newText) => {
          setContentOverride(newText);
          if (onImprove) {
            onImprove(newText);
          }
        }}
        className="px-4 sm:px-6 pt-3"
      />

      <div className="px-4 sm:px-6 pt-3">
        <LitigationRoadmapWidget
          documentTitle={title}
          documentContent={activeContent}
          currentLang={currentLang}
          taskType={taskType}
        />
      </div>

      {/* Main Content Area or Interactive Dictation Editor */}
      {isEditingDocument ? (
        <div className="p-5 sm:p-7 bg-slate-950/80 border-b border-slate-800 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">🎙️</span>
              <span className="text-xs sm:text-sm font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om' ? 'Gulaallii fi Waraabbii Sagalee Seeraa' : currentLang === 'am' ? 'የሕግ ረቂቅ አርትዖትና የድምፅ መቅረጫ' : 'Legal Dictation & Document Editor'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-all cursor-pointer"
              >
                {currentLang === 'om' ? 'Dhiisi / Cancel' : currentLang === 'am' ? 'ይቅር' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveEditing}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>💾</span>
                <span>{currentLang === 'om' ? 'Olkaayi / Save' : currentLang === 'am' ? 'አስቀምጥ' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Legal Dictation Microphone Toolbar & Citation Picker */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <LegalDictationToolbar
              currentLang={currentLang}
              onInsertText={(text) => {
                setEditableDraftText((prev) => (prev ? `${prev}\n\n${text}` : text));
              }}
              textareaRef={editorTextareaRef}
              currentValue={editableDraftText}
            />

            <button
              type="button"
              onClick={() => setIsCitationPickerOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{currentLang === 'om' ? 'Wabii Galchi (Insert Citation)' : currentLang === 'am' ? 'ማጣቀሻ አስገባ' : 'Insert Citation'}</span>
            </button>
          </div>

          <CitationPickerModal
            isOpen={isCitationPickerOpen}
            onClose={() => {
              setIsCitationPickerOpen(false);
              setCitationInitialQuery('');
            }}
            currentLang={currentLang}
            initialQuery={citationInitialQuery}
            onSelect={(citation) => {
              if (fixTargetRange) {
                const newText = 
                  editableDraftText.substring(0, fixTargetRange.start) + 
                  citation + 
                  editableDraftText.substring(fixTargetRange.end);
                setEditableDraftText(newText);
                setFixTargetRange(null);
              } else {
                setEditableDraftText((prev) => (prev ? `${prev}\n\n${citation}` : citation));
              }
              setIsCitationPickerOpen(false);
            }}
          />

          <div className="relative">
            <CitationFixOverlay 
              text={editableDraftText}
              onFix={(range) => {
                setCitationInitialQuery(range.original);
                setFixTargetRange(range);
                setIsCitationPickerOpen(true);
              }}
            />
            <textarea
              ref={editorTextareaRef}
              rows={14}
              value={editableDraftText}
              onChange={(e) => setEditableDraftText(e.target.value)}
              className="w-full bg-transparent border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans leading-relaxed resize-y z-10 relative"
              placeholder="Qabiyyee seeraa asitti gulaali ykn maaykirofooniitiin dubbisi..."
            />
            <div className="absolute inset-0 bg-slate-950 rounded-xl -z-10" />
          </div>
        </div>

      ) : (
        <div
          ref={contentRef}
          onScroll={handleScroll}
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
          onKeyUp={handleTextSelection}
          className={`p-5 sm:p-7 max-h-[600px] overflow-y-auto bg-slate-950/30 relative legal-content-body select-text transition-all duration-300 ${
            highlightedToast ? 'highlight-saved-active ring-2 ring-emerald-500/80 border-emerald-500/80' : ''
          }`}
        >
          <div className={`prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans selection:bg-amber-500/30 selection:text-amber-200 ${textLayout === 'justify' ? 'text-justify' : 'text-left'}`}>
            <LegalCitationHighlighter
              text={activeContent}
              currentLang={currentLang}
              onNavigateToCassation={onNavigateToCassation}
              searchTerm={docSearchQuery}
            />
          </div>
        </div>
      )}

      {/* Trilingual Action Bar (Mandatory Buttons) */}
      <div className="bg-slate-950/90 p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono text-[11px] text-amber-300">
            📖 {Math.round(scrollProgress)}% read ({Math.ceil(activeContent.split(/\s+/).filter(Boolean).length / 200)} min read)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono">
            {activeContent.split(/\s+/).filter(Boolean).length} words
          </span>
          {outputLanguages.map((l) => (
            <span
              key={l}
              className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase"
            >
              {l === 'om' ? 'Afaan Oromoo' : l === 'am' ? 'አማርኛ' : 'English'}
            </span>
          ))}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* IMMERSIVE READING MODE Toggle */}
          <button
            onClick={() => setIsImmersiveOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            title="Haala Dubbisa Qulqulluu (Immersive Reading Mode - F)"
          >
            <span>👁️</span>
            <span>DUBBISA GUUTUU</span>
          </button>

          {/* Dedicated DOWNLOAD AS PDF / PRINT STUDIO Button */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40 transition-all hover:scale-[1.02] border border-red-400/30 cursor-pointer"
            title={getPdfButtonLabel()}
          >
            <span>📥</span>
            <span>{getPdfButtonLabel()}</span>
          </button>

          {/* Dedicated EXPORT AS WORD (.DOCX) Button */}
          <button
            onClick={handleQuickWordExport}
            disabled={isExportingWordQuick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/40 transition-all hover:scale-[1.02] border border-blue-400/40 cursor-pointer"
            title="Export as Microsoft Word (.docx) file"
          >
            {isExportingWordQuick ? (
              <span className="animate-spin inline-block">🔄</span>
            ) : wordExportSuccess ? (
              <span className="text-emerald-300">✓</span>
            ) : (
              <span>📄</span>
            )}
            <span>{wordExportSuccess ? 'Word Bu\'eera!' : 'WORD (.DOCX)'}</span>
          </button>

          {/* COPY Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-[1.02]"
            title={t.actions.copy}
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? t.actions.copied : t.actions.copy}</span>
          </button>

          {/* Dedicated BOOKMARK Button */}
          <button
            onClick={handleBookmark}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40 transition-all hover:scale-[1.02] cursor-pointer"
            title="Bookmark this legal document to quickly access later in 'My Content'"
          >
            {bookmarked ? (
              <>
                <span>✓</span>
                <span>Bookmarked!</span>
              </>
            ) : (
              <>
                <span>★ Bookmark (Qabsiisi)</span>
              </>
            )}
          </button>

          {/* SAVE TO LIBRARY Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-md transition-all hover:scale-[1.02]"
            title="Save to Library (Kuusaatti Olkaa'i)"
          >
            <span>{saved ? '✓' : '🔖'}</span>
            <span>{saved ? 'Saved to Library!' : 'Save to Library'}</span>
          </button>

          {/* EXPORT TXT */}
          <button
            onClick={handleExportTxt}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title={t.actions.exportTxt}
          >
            <span>📥</span>
            <span>{t.actions.exportTxt}</span>
          </button>

          {/* SHARE TO TELEGRAM */}
          <button
            onClick={handleShareTelegram}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 transition-all hover:scale-[1.02]"
            title="Share to Telegram (@ayelebeharmee)"
          >
            <span>✈️ Telegram</span>
          </button>

          {/* SHARE TO FACEBOOK */}
          <button
            onClick={handleShareFacebook}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition-all hover:scale-[1.02]"
            title="Share to Facebook (@AyyuLawyer)"
          >
            <span>📘 Facebook</span>
          </button>

          {/* IMPROVE Button */}
          {onImprove && (
            <button
              onClick={() => onImprove(activeContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all"
              title={t.actions.improve}
            >
              <span>✨</span>
              <span>{t.actions.improve}</span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden high-res print container utilizing .legal-print-wrapper styling for direct PDF download */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
        <div
          id="document-viewer-print-container"
          className="legal-print-wrapper w-[800px] bg-white text-slate-900 p-12 relative"
        >
          {/* Confidential Watermark */}
          <div className="legal-watermark">
            SeeraAI • Confidential
          </div>

          {/* Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0">
                  <span className="text-3xl">⚖️</span>
                </div>
                <div>
                  <div className="font-serif-legal font-bold text-base tracking-wider text-slate-950 uppercase">
                    OGEESSA SEERAA - AYELE BE DHA
                  </div>
                  <div className="text-[12px] font-ethiopic font-semibold text-slate-800">
                    የሕግ ባለሙያ - አየለ በዳ • Legal Expert - Ayele Be Dha
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                    Ayele Be Dha (Ogeessa Seeraa) (FDRE-JURIST/2026) | Finfinnee, Ethiopia
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Title & Ref */}
          <div className="text-center mb-8 space-y-2">
            <h1 className="text-xl font-serif-legal font-bold text-slate-950 uppercase tracking-wide">
              {title}
            </h1>
            <div className="text-xs text-slate-500 font-mono flex items-center justify-center gap-4">
              <span>Ref: ETH-LAW/2026/SEERA</span>
              <span>Date: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Trilingual Formatted Content Body */}
          <div className="legal-content-body text-slate-900 text-sm whitespace-pre-wrap leading-relaxed space-y-4">
            {hasMultiple && separatedVersions ? (
              <>
                {separatedVersions.om && (
                  <div className="mb-6">
                    <div className="legal-lang-header font-bold bg-slate-100 p-2 border-l-4 border-slate-900 mb-2">AFAN OROMOO</div>
                    <div>{sanitizeContentForExport(separatedVersions.om)}</div>
                  </div>
                )}
                {separatedVersions.am && (
                  <div className="mb-6 font-ethiopic">
                    <div className="legal-lang-header font-bold bg-slate-100 p-2 border-l-4 border-slate-900 mb-2">አማርኛ (AMHARIC)</div>
                    <div>{sanitizeContentForExport(separatedVersions.am)}</div>
                  </div>
                )}
                {separatedVersions.en && (
                  <div className="mb-6">
                    <div className="legal-lang-header font-bold bg-slate-100 p-2 border-l-4 border-slate-900 mb-2">ENGLISH</div>
                    <div>{sanitizeContentForExport(separatedVersions.en)}</div>
                  </div>
                )}
              </>
            ) : (
              <div>{sanitizeContentForExport(activeContent)}</div>
            )}
          </div>

          {/* Signatory Block */}
          <div className="legal-signatory-block mt-12 pt-6 border-t-2 border-slate-900 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">Maqaa & Mallattoo (Signature):</div>
              <div className="text-sm font-serif-legal font-bold text-slate-800 mt-1">Ayele Be Dha (Legal Expert)</div>
            </div>
            <div className="text-right text-xs font-mono text-slate-600">
              SeeraAI Trilingual Legal AI Engine
            </div>
          </div>
        </div>
      </div>
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        currentLang={currentLang}
        title={title}
        taskType={taskType}
        content={content}
        separatedVersions={separatedVersions}
        outputLanguages={outputLanguages}
      />

      {/* Open with App Modal (Matching Android System Chooser) */}
      <OpenWithAppModal
        isOpen={isOpenWithModalOpen}
        onClose={() => setIsOpenWithModalOpen(false)}
        currentLang={currentLang}
        title={title}
        filename={`${title.replace(/\s+/g, '_')}_Legal_Doc.pdf`}
        fileType="pdf"
      />

      {/* Immersive Reading Mode Full-Screen Environment */}
      <ImmersiveReadingMode
        isOpen={isImmersiveOpen}
        onClose={() => setIsImmersiveOpen(false)}
        title={title}
        content={content}
        currentLang={currentLang}
        taskType={taskType}
        outputLanguages={outputLanguages}
        separatedVersions={separatedVersions}
        activeLangTab={activeLangTab}
        setActiveLangTab={setActiveLangTab}
        onNavigateToCassation={onNavigateToCassation}
        onOpenPdfModal={() => {
          setIsImmersiveOpen(false);
          setIsPdfModalOpen(true);
        }}
        onQuickWordExport={handleQuickWordExport}
      />

      {/* Interactive Q&A on Drafted Document / Template */}
      {showQAPanel && activeContent && activeContent.trim().length > 30 && (
        <DocumentQAPanel
          documentText={activeContent}
          documentTitle={title}
          currentLang={currentLang}
        />
      )}

      {/* Interactive Legal Annotations Tool */}
      <AnnotationTool
        documentId={documentId || title.toLowerCase().replace(/[^a-z0-9]/g, '-')}
        currentLang={currentLang}
        documentText={activeContent}
        onNavigateToCassation={onNavigateToCassation}
      />

      {/* Real-time Translate Annotation Pop-up Modal */}
      {isTranslateAnnotationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-left relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-xl">🌐</span>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>
                      {currentLang === 'om'
                        ? 'Hiikkaa fi Ibsa Jecha Seeraa'
                        : currentLang === 'am'
                        ? 'የሕግ ቃል ትርጉም እና ማብራሪያ'
                        : 'Real-Time Trilingual Legal Translation'}
                    </span>
                  </h3>
                  <span className="text-xs text-cyan-300 font-mono font-bold">
                    "{selectedSegmentText}"
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTranslateAnnotationOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Translation Cards in 3 Languages */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeGlossaryMatch ? (
                <>
                  {/* Afaan Oromoo */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>🌳 Afaan Oromoo</span>
                      <span className="font-mono text-emerald-300">{activeGlossaryMatch.om.term}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeGlossaryMatch.om.definition}
                    </p>
                    {activeGlossaryMatch.om.usage && (
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-900">
                        Fkn: {activeGlossaryMatch.om.usage}
                      </p>
                    )}
                  </div>

                  {/* Amharic */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-400 font-ethiopic">
                      <span>🏛️ አማርኛ (Amharic)</span>
                      <span className="font-ethiopic text-amber-300">{activeGlossaryMatch.am.term}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-ethiopic leading-relaxed">
                      {activeGlossaryMatch.am.definition}
                    </p>
                    {activeGlossaryMatch.am.usage && (
                      <p className="text-[11px] text-slate-400 font-ethiopic italic pt-1 border-t border-slate-900">
                        ምሳሌ፦ {activeGlossaryMatch.am.usage}
                      </p>
                    )}
                  </div>

                  {/* English */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                      <span>⚖️ English Legal Equivalent</span>
                      <span className="font-mono text-blue-300">{activeGlossaryMatch.en.term}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeGlossaryMatch.en.definition}
                    </p>
                    {activeGlossaryMatch.en.usage && (
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-900">
                        Ex: {activeGlossaryMatch.en.usage}
                      </p>
                    )}
                  </div>

                  {/* Legal Source Authority */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>📜 Madda Seeraa (Statutory Source):</span>
                    <span className="text-cyan-300 font-mono font-semibold">{activeGlossaryMatch.sourceReference}</span>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-center">
                  <div className="text-3xl">📖</div>
                  <h4 className="text-sm font-bold text-slate-200">
                    {currentLang === 'om' ? 'Hiika Jechaa Qophaa\'aa' : 'Legal Term Explanation'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Jechi filatame: <strong className="text-cyan-300">"{selectedSegmentText}"</strong>. Jecha kana akka qabxii hiikaatti sanadichatti ida'uu ni dandeessu.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsTranslateAnnotationOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
              >
                {currentLang === 'om' ? 'Cufi' : currentLang === 'am' ? 'ዝጋ' : 'Close'}
              </button>

              <button
                type="button"
                onClick={handleSaveTranslatedAnnotation}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>{translatedAnnotationToast ? '✓' : '📌'}</span>
                <span>
                  {translatedAnnotationToast
                    ? (currentLang === 'om' ? 'Qabxiin Kuusameera!' : 'Annotation Saved!')
                    : (currentLang === 'om' ? 'Akka Qabxii Seeraatti Kuusi' : currentLang === 'am' ? 'እንደ ማስታወሻ አስቀምጥ' : 'Save as Legal Annotation')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Share Draft Modal for Multi-User Collaborative Review */}
      {isShareDraftModalOpen && (
        <ShareDraftModal
          isOpen={isShareDraftModalOpen}
          onClose={() => setIsShareDraftModalOpen(false)}
          currentLang={currentLang}
          documentTitle={title}
          documentContent={activeContent}
          taskType={taskType}
        />
      )}
    </div>
  );
};


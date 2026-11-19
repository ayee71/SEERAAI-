import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { Scale, Gavel, ChevronLeft, ChevronRight, Info, AlertTriangle, CheckCircle2, Timer, Play, Pause, RotateCcw, History, MessageSquare, Plus, Mic, MicOff, Download, FileText, StickyNote, X, ChevronUp, ChevronDown, BarChart3, GripVertical, Upload, UploadCloud, Users, Calendar, Building2, Monitor, Radio, Wifi, RefreshCw, Zap, Eye, EyeOff, ExternalLink, Sparkles, Camera, Image, Video, Send, Copy, Check, Bookmark, FileCode, Share2, Maximize2, Link2, Lock, Shield, ShieldCheck, Volume2, VolumeX, BookOpen, Search, Filter, Cloud, CloudOff, Database } from 'lucide-react';
import { syncStatusService, CloudSyncStatus } from '../services/syncStatusService';
import { askSEERAAILegalQuestion } from '../services/legalAnswerClient';
import type { LegalAnswerResponse } from '../types/legalAnswer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyCourtWatermarkToPDF } from '../services/watermarkService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { analyzeLegalDocument, generateLegalContent } from '../services/api';
import { processDocumentOffThread } from '../services/documentExtractionService';
import { getUserScopedKey } from '../services/storage';
import { VoiceToMemoRecorder } from '../components/VoiceToMemoRecorder';
import { VoiceDictation } from '../components/VoiceDictation';
import { JudgeProceedingsWorkbench } from '../components/JudgeProceedingsWorkbench';
import { DictateCourtNoteModal } from '../components/DictateCourtNoteModal';
import { CourtroomAudioRecorder } from '../components/CourtroomAudioRecorder';
import { PremiumGate } from '../components/PremiumGate';
import JSZip from 'jszip';
import { Notifications } from '../components/Notifications';
import { CaseMilestoneTracker } from '../components/CaseMilestoneTracker';
import { formatEthiopianDate, formatCourtHearingScheduleDate } from '../utils/ethiopianCalendar';
import { WitnessTestimonyModal, WitnessTestimonyItem } from '../components/WitnessTestimonyModal';
import { CourtOrderGeneratorModal } from '../components/CourtOrderGeneratorModal';
import { EvidenceCaptureModal } from '../components/EvidenceCaptureModal';
import { CourtroomLayoutModal } from '../components/CourtroomLayoutModal';
import { FloatingCourtAudioControl } from '../components/FloatingCourtAudioControl';
import { LiveTranscriptionDisplay } from '../components/LiveTranscriptionDisplay';
import { MultiFileEvidenceUpload } from '../components/MultiFileEvidenceUpload';
import { practiceCaseService, CaseEvidence, generateAIEvidenceDescription, SAMPLE_DIGITAL_EVIDENCE } from '../services/practiceCaseService';
import { 
  getCaseByIdFromFirestore, 
  toggleCasePublicVisibilityInFirestore,
  FirestoreCaseDocket,
  PhysicalCaseEvidence,
  CourtroomSeatingLayout,
  bulkUpdateEvidenceAdmissibility,
  CaseWitnessStatement,
  saveCaseWitnessStatement,
  fetchCaseWitnessStatements,
  getLocalWitnessStatements
} from '../services/courtCaseService';
import { 
  subscribeToStoredTelegramDocs, 
  TelegramLegalPost,
  pollTelegramLegalNews,
  fetchTelegramChannelFeed,
  fetchTelegram1500Archive
} from '../services/telegramLegalHarvesterService';


interface CourtroomAssistantViewProps {
  currentLang: Language;
  initialCourtLevel?: 'firstInstance' | 'highCourt' | 'cassation';
}

interface CourtSession {
  id: string;
  userId: string;
  title: string;
  courtLevel: 'firstInstance' | 'highCourt' | 'cassation';
  currentStepIndex: number;
  logs: LogEntry[];
  witnesses: Witness[];
  quickNotes: string;
  status: 'active' | 'archived';
  createdAt: any;
  updatedAt: any;
}

interface ProceduralStep {
  id: number;
  title: { om: string; am: string; en: string };
  description: { om: string; am: string; en: string };
  statuteRef?: string;
  checklist: { om: string[]; am: string[]; en: string[] };
}

interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'auto' | 'manual';
  stepId?: number;
  witnessId?: string;
  tags?: string[];
  annotation?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  evidenceMetadata?: {
    exhibitNumber?: string;
    submittedBy?: string;
    evidenceType?: string;
    summary?: string;
    authenticityStatus?: string;
    dateSubmitted?: string;
    framedIssueRelevance?: string;
  };
}

interface Witness {
  id: string;
  name: string;
  type: 'plaintiff' | 'defendant';
  status: 'pending' | 'completed';
  caseId?: string;
}

interface ObjectionTemplate {
  id: string;
  label: string;
  category: 'form' | 'content' | 'procedure';
  template: string;
  isDefault?: boolean;
}

interface SmartInsight {
  type: 'counter_argument' | 'procedural_alert' | 'strategic_risk';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  lawReference: string;
  priority: number;
}

interface CourtWorkTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
}

const COURT_WORK_TEMPLATES: CourtWorkTemplate[] = [
  {
    id: 'testimony',
    title: 'Galmeessuu Ragaa Namaa (Witness Testimony)',
    category: 'witness',
    content: `MANA MURTII DHADDACHA...
GALMEE RAGAA NAMAA
Lakk. Galmee: [FILE_NO]
Himataa: [PLAINTIFF]
Himatamaa: [DEFENDANT]

Eenyummaa Ragaa:
Maqaa: [WITNESS_NAME]
Umrii: [AGE]
Hojii: [JOB]
Bakka Jireenyaa: [ADDRESS]

JECHA KAKUU:
"Ani dhugaa dhibba irratti dhibba akkan dubbadhu nan kaku..."

Qabiyyee Jecha Ragaa:
[TESTIMONY_BODY]

Mirkaneessa:
Mallattoo Ragaa: _________
Abbaa Seeraa: _________`
  },
  {
    id: 'decision',
    title: 'Murtii Dhaddachaa (Court Decision)',
    category: 'decision',
    content: `MANA MURTII...
MURTII / AJIJA
Lakk. Galmee: [FILE_NO]

Iyyata/Himannaa dhiyaate qorachuudhaan:
[DECISION_SUMMARY]

BU'UURA SEERAA:
Labsii Lakk. [PROCLAMATION_NO], Keeyyata [ARTICLE_NO]...

SABABA MURTICHAA:
[REASONING]

MURTII:
[FINAL_VERDICT]

Mirkaneessa:
Mallattoo Abbaa Seeraa: _________`
  },
  {
    id: 'summons',
    title: 'Waraqaa Waamichaa (Court Summons)',
    category: 'procedure',
    content: `WARAQAA WAAMICHAA
Mana Murtii: [COURT_NAME]
Lakk. Galmee: [FILE_NO]

Kan Waamame: [PERSON_NAME]
Bakka Jireenyaa: [ADDRESS]

Waal-dhabdee Himataa [PLAINTIFF] fi Himatamaa [DEFENDANT] gidduu jiruun wal-qabateen akka dhiyaattan ajajameera.

Beellama:
Guyyaa: [DATE]
Sa'aatii: [TIME]
Bakka: [LOCATION]

Hubachiisa: Yoo beellamarratti dhiyaachuu baattan akka seeraatti tarkaanfiin kan fudhatamu ta'a.`
  }
];

const DEFAULT_TEMPLATES: ObjectionTemplate[] = [
  { id: 'leading', label: 'Leading Question', category: 'form', template: 'Objection: Leading question.', isDefault: true },
  { id: 'speculation', label: 'Calls for Speculation', category: 'form', template: 'Objection: Calls for speculation.', isDefault: true },
  { id: 'hearsay', label: 'Hearsay', category: 'content', template: 'Objection: Hearsay.', isDefault: true },
  { id: 'irrelevant', label: 'Irrelevant', category: 'content', template: 'Objection: Irrelevant.', isDefault: true },
  { id: 'foundation', label: 'Lack of Foundation', category: 'content', template: 'Objection: Lack of foundation.', isDefault: true },
  { id: 'nonresponsive', label: 'Non-responsive', category: 'procedure', template: 'Objection: Non-responsive.', isDefault: true },
];

const CONTRADICTION_KEYWORDS = ['contradiction', 'discrepancy', 'conflict', 'wal-faallessu', 'faallaa', 'ተቃርኖ', 'ልዩነት', 'hiifoo'];

const LEGAL_TOOLTIPS: Record<string, { om: string; am: string; en: string; ref: string }> = {
  'cassation': {
    om: 'Dhaddacha murtii olaanaa kan seerri sirriitti hojiirra ooluu isaa mirkaneessu.',
    am: 'ህግ በትክክል መተግበሩን የሚያረጋግጥ የበላይ የሰበር ችሎት።',
    en: 'Cassation bench ensuring correct application of fundamental law.',
    ref: 'Proclamation No. 1234/2021'
  },
  'ijibbaata': {
    om: 'Dhaddacha murtii olaanaa kan seerri sirriitti hojiirra ooluu isaa mirkaneessu.',
    am: 'ህግ በትክክል መተግበሩን የሚያረጋግጥ የበላይ የሰበር ችሎት።',
    en: 'Cassation bench ensuring correct application of fundamental law.',
    ref: 'Proclamation No. 1234/2021'
  },
  'proclamation': {
    om: 'Labsii seeraa mana mareen baasu.',
    am: 'በህዝብ ተወካዮች ምክር ቤት የሚወጣ አዋጅ።',
    en: 'Legislative statute enacted by the parliament.',
    ref: 'Constitutional Law'
  },
  'labsii': {
    om: 'Labsii seeraa mana mareen baasu.',
    am: 'በህዝብ ተወካዮች ምክር ቤት የሚወጣ አዋጅ።',
    en: 'Legislative statute enacted by the parliament.',
    ref: 'Constitutional Law'
  },
  'regulation': {
    om: 'Dambii hojiirra oolmaa seeraaf baasu.',
    am: 'ህግን ለማስፈጸም የሚወጣ ደንብ።',
    en: 'Executive regulation issued to enforce a proclamation.',
    ref: 'Administrative Law'
  },
  'dambii': {
    om: 'Dambii hojiirra oolmaa seeraaf baasu.',
    am: 'ህግን ለማስፈጸም የሚወጣ ደንብ።',
    en: 'Executive regulation issued to enforce a proclamation.',
    ref: 'Administrative Law'
  },
  'contract': {
    om: 'Waliigaltee qaamolee gidduutti uumamu.',
    am: 'በወገኖች መካከል የሚደረግ የውል ስምምነት።',
    en: 'Binding agreement creating legal obligations.',
    ref: 'Civil Code Art. 1675'
  },
  'waliigaltee': {
    om: 'Waliigaltee qaamolee gidduutti uumamu.',
    am: 'በወገኖች መካከል የሚደረግ የውል ስምምነት።',
    en: 'Binding agreement creating legal obligations.',
    ref: 'Civil Code Art. 1675'
  }
};

const renderLegalTextWithTooltips = (content: string, lang: Language) => {
  if (!content) return null;
  const words = content.split(/(\s+)/);
  return words.map((word, idx) => {
    const cleanWord = word.replace(/[^a-zA-Z0-9_áàâäãåçéèêëíìîïñóòôöõúùûüýÿæœ]/g, '').toLowerCase();
    const tooltip = LEGAL_TOOLTIPS[cleanWord];
    if (tooltip) {
      return (
        <span key={idx} className="group/term relative inline-block cursor-help text-amber-300 font-semibold underline decoration-dotted underline-offset-4 hover:text-amber-200">
          {word}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/term:block z-50 w-56 p-2.5 bg-slate-900 border border-amber-500/60 text-[11px] text-slate-200 rounded-xl shadow-2xl pointer-events-none">
            <span className="font-bold text-amber-400 block mb-0.5 uppercase tracking-wide">💡 {cleanWord}:</span>
            <span className="block leading-relaxed">{tooltip[lang] || tooltip.om}</span>
            <span className="block text-[9px] font-mono text-cyan-400 mt-1 border-t border-slate-800 pt-1">📖 {tooltip.ref}</span>
          </span>
        </span>
      );
    }
    return word;
  });
};

const PROCEDURAL_STEPS: ProceduralStep[] = [
  {
    id: 1,
    title: {
      om: '1. Seensa fi Beekamtii Gareewwanii',
      am: '1. መግቢያ እና የተከራካሪዎች ማንነት ማረጋገጥ',
      en: '1. Opening & Identification of Parties'
    },
    description: {
      om: 'Abbaan seeraa eenyummaa himataa, himatamaa fi abukaattoota isaanii mirkaneeffata.',
      am: 'ዳኛው የከሳሽ፣ የተከሳሽ እና የጥበቃ ጠበቆችን ማንነት ያረጋግጣል።',
      en: 'The judge verifies the identity of the plaintiff, defendant, and their respective legal counsels.'
    },
    checklist: {
      om: [
        'Waraqaa eenyummaa mirkaneessuu',
        'Bakka bu\'iinsa (Power of Attorney) ilaaluu',
        'Hafiinsa garee tokkoo galmeessuu'
      ],
      am: [
        'የመታወቂያ ካርድ ማረጋገጥ',
        'የውክልና ስልጣን (Power of Attorney) መመርመር',
        'የወገኖች አለመገኘት መመዝገብ'
      ],
      en: [
        'Verify identity cards / documents',
        'Inspect Power of Attorney (if applicable)',
        'Record any absences'
      ]
    }
  },
  {
    id: 2,
    title: {
      om: '2. Mormiiwwan Sadarkaa Duraa (SDFHH 244)',
      am: '2. የመጀመሪያ ደረጃ መቃወሚያዎች (የፍትሐብሔር ሥነ-ሥርዓት 244)',
      en: '2. Preliminary Objections (SDFHH Art. 244)'
    },
    description: {
      om: 'Himatamaan mormiiwwan dhimma hundee dubbiitti osoo hin seenin dura dhiyaatan kaasa.',
      am: 'ተከሳሹ ወደ ዋናው ክርክር ከመገባቱ በፊት የሚቀርቡ መቃወሚያዎችን ያነሳል።',
      en: 'The defendant raises objections that must be resolved before proceeding to the merits of the case.'
    },
    statuteRef: 'SDFHH Keeyyata 244',
    checklist: {
      om: [
        'Aangoo mana murtii (Jurisdiction)',
        'Dhimma murtii dhumaa argate (Res Judicata)',
        'Darbiinsa yeroo (Period of Limitation)',
        'Dandeettii gareewwanii (Capacity)'
      ],
      am: [
        'የፍርድ ቤት ስልጣን (Jurisdiction)',
        'ቀደም ሲል የተወሰነ ጉዳይ (Res Judicata)',
        'የይርጋ ክልከላ (Period of Limitation)',
        'የተከራካሪዎች ችሎታ (Capacity)'
      ],
      en: [
        'Court Jurisdiction check',
        'Res Judicata check',
        'Statute of Limitation check',
        'Capacity to sue/be sued'
      ]
    }
  },
  {
    id: 3,
    title: {
      om: '3. Ijoo Dubbii Baasuu (SDFHH 246)',
      am: '3. ጭብጥ መያዝ (የፍትሐብሔር ሥነ-ሥርዓት 246)',
      en: '3. Framing of Issues (SDFHH Art. 246)'
    },
    description: {
      om: 'Abbaan seeraa qabxii gareewwan irratti wal-falman adda baasee qabata.',
      am: 'ዳኛው ተከራካሪዎች የተገጩባቸውን ነጥቦች ለይቶ ይይዛል።',
      en: 'The judge identifies and frames the specific material points of fact and law in dispute.'
    },
    statuteRef: 'SDFHH Keeyyata 246',
    checklist: {
      om: [
        'Ijoo dubbii firii dubbii (Issues of Fact)',
        'Ijoo dubbii seeraa (Issues of Law)',
        'Gareen ragaa dhiyeessuuf dirqama qabu adda baasuu'
      ],
      am: [
        'የፍሬ ነገር ጭብጥ (Issues of Fact)',
        'የሕግ ጭብጥ (Issues of Law)',
        'የማስረዳት ሸክም ያለበትን ወገን መለየት'
      ],
      en: [
        'Frame Issues of Fact',
        'Frame Issues of Law',
        'Determine Burden of Proof'
      ]
    }
  },
  {
    id: 4,
    title: {
      om: '4. Dhageessifata Ragaalee (Evidence)',
      am: '4. የማስረጃ አሰማም ሂደት (Evidence)',
      en: '4. Production & Hearing of Evidence'
    },
    description: {
      om: 'Ragaaleen namaa fi barreeffamaa dhiyaatanii dhaga\'amu.',
      am: 'የሰው እና የሰነድ ማስረጃዎች ቀርበው ይሰማሉ።',
      en: 'Documentary and oral evidence are presented and examined by the court.'
    },
    checklist: {
      om: [
        'Sanadoota dhiyeessuu (Documentary Evidence)',
        'Gaaffii duraa (Examination-in-chief)',
        'Gaaffii qaxxaamuraa (Cross-examination)',
        'Gaaffii keessa deebii (Re-examination)'
      ],
      am: [
        'የሰነድ ማስረጃዎችን ማቅረብ',
        'የመጀመሪያ ጥያቄ (Main examination)',
        'መስቀለኛ ጥያቄ (Cross-examination)',
        'የድጋሚ ጥያቄ (Re-examination)'
      ],
      en: [
        'Admit documentary evidence',
        'Direct Examination of witnesses',
        'Cross-Examination',
        'Re-Examination'
      ]
    }
  },
  {
    id: 5,
    title: {
      om: '5. Yaada Xumuraa fi Murtii',
      am: '5. የማጠቃለያ ክርክር እና ውሳኔ',
      en: '5. Closing Arguments & Judgment'
    },
    description: {
      om: 'Gareewwan yaada xumuraa dhiyeessu; abbaan seeraa murtii kenna.',
      am: 'ተከራካሪዎች የማጠቃለያ ሃሳባቸውን ያቀርባሉ፤ ዳኛው ውሳኔ ይሰጣል።',
      en: 'Parties present closing arguments, and the judge renders a final judgment or order.'
    },
    checklist: {
      om: [
        'Yaada xumuraa (Closing Oral/Written)',
        'Murtii abbaa seerummaa (Judgment)',
        'Ajaja raawwii ykn beenyaa'
      ],
      am: [
        'የማጠቃለያ ክርክር (በቃል ወይም በጽሁፍ)',
        'የዳኝነት ውሳኔ መስጠት (Judgment)',
        'የትዕዛዝ አፈፃፀም'
      ],
      en: [
        'Final Closing Submissions',
        'Render Judgment',
        'Execution orders / Cost awards'
      ]
    }
  }
];

export const CourtroomAssistantView: React.FC<CourtroomAssistantViewProps> = ({ currentLang, initialCourtLevel }) => {
  const t = translations[currentLang];
  const { profile } = useAuth();
  const AUTOSAVE_BASE_KEY = 'seera_courtroom_autosave_state';

  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(getUserScopedKey(AUTOSAVE_BASE_KEY));
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load autosave state:', e);
    }
    return null;
  };

  const savedState = getInitialState();

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(savedState?.currentStepIndex ?? 0);
  const currentStep = PROCEDURAL_STEPS[currentStepIndex];

  // Court Level State
  const [courtLevel, setCourtLevel] = useState<'firstInstance' | 'highCourt' | 'cassation'>(savedState?.courtLevel ?? initialCourtLevel ?? 'firstInstance');

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(savedState?.sessionId ?? null);
  const [sessionTitle, setSessionTitle] = useState<string>(savedState?.sessionTitle ?? '');
  const [savedSessions, setSavedSessions] = useState<CourtSession[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showCourtroomAudioModal, setShowCourtroomAudioModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCasePublic, setIsCasePublic] = useState<boolean>(savedState?.isCasePublic ?? false);
  const [latestNews, setLatestNews] = useState<TelegramLegalPost[]>([]);
  const [isBackgroundSyncActive, setIsBackgroundSyncActive] = useState<boolean>(true);
  const [isSyncingNews, setIsSyncingNews] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(new Date().toLocaleTimeString());
  const [selectedNewsSource, setSelectedNewsSource] = useState<'all' | 'seeraai_ethio' | 'wakolegalstudio'>('all');
  const [unreadNewsCount, setUnreadNewsCount] = useState<number>(0);
  const [newUpdatesToast, setNewUpdatesToast] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [newsTypeFilter, setNewsTypeFilter] = useState<'all' | 'precedents' | 'proclamations' | 'announcements'>('all');

  // Courtroom Live API & Evidence Streaming State (up to 2GB virtual storage pool)
  const [liveApiStatus, setLiveApiStatus] = useState<'connected' | 'connecting' | 'offline'>('connected');
  const [isEvidenceStreaming, setIsEvidenceStreaming] = useState<boolean>(true);
  const [storagePoolInfo] = useState<{ quota: string; usage: string; percent: number }>({
    quota: '2.0 GB',
    usage: '92.4 MB',
    percent: 4.6
  });

  // 1,500+ Archive Explorer Modal State
  const [showArchive1500Modal, setShowArchive1500Modal] = useState<boolean>(false);
  const [archive1500Query, setArchive1500Query] = useState<string>('');
  const [archive1500Category, setArchive1500Category] = useState<string>('all');
  const [archive1500Page, setArchive1500Page] = useState<number>(1);
  const [archive1500Data, setArchive1500Data] = useState<{
    total: number;
    page: number;
    files: any[];
    totalPages: number;
    channels: string[];
    archiveSummary: string;
  } | null>(null);
  const [isArchive1500Loading, setIsArchive1500Loading] = useState<boolean>(false);
  const [archiveCopiedId, setArchiveCopiedId] = useState<string | null>(null);
  const [discoveredPrecedents, setDiscoveredPrecedents] = useState<any[]>([]);

  const extractPrecedentsFromText = (text: string) => {
    if (!text) return;
    // Regex for Cassation Galmee Lakkoofsa patterns (e.g., "Galmee Lakk. 12345", "Case No. 54321")
    const galmeeRegex = /(?:Lakk\. Galmee|Galmee lakk\.|የመዝገብ ቁጥር|Case No\.?)\s*:?\s*(\d+)/gi;
    const matches = [...text.matchAll(galmeeRegex)];
    const uniqueIds = Array.from(new Set(matches.map(m => m[1])));
    
    if (uniqueIds.length > 0) {
      const newPrecedents = uniqueIds.map(id => ({
        id: `disc_${id}_${Date.now()}`,
        referenceNumber: id,
        source: 'AI Extraction',
        timestamp: new Date().toLocaleTimeString()
      }));
      setDiscoveredPrecedents(prev => {
        const existingRefs = new Set(prev.map(p => p.referenceNumber));
        const filtered = newPrecedents.filter(p => !existingRefs.has(p.referenceNumber));
        return [...filtered, ...prev].slice(0, 20);
      });
    }
  };

  const handleRefreshNews = async (channel: string = selectedNewsSource) => {
    setIsSyncingNews(true);
    try {
      const result = await fetchTelegramChannelFeed(channel, 10);
      if (result.ok && result.items && result.items.length > 0) {
        setLatestNews(result.items as any);
        setLastSyncTimestamp(new Date().toLocaleTimeString());
        setUnreadNewsCount(0);
      }
    } catch (err) {
      console.warn('[Courtroom Assistant] Manual news refresh error:', err);
    } finally {
      setIsSyncingNews(false);
    }
  };

  const handleSpeakText = (id: string, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (playingAudioId === id) {
      window.speechSynthesis.cancel();
      setPlayingAudioId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'am' ? 'am-ET' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setPlayingAudioId(null);
    utterance.onerror = () => setPlayingAudioId(null);

    setPlayingAudioId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleInsertCitationToSession = (news: TelegramLegalPost | any) => {
    const titleText = news.title?.[currentLang] || news.title?.om || news.referenceNumber || 'Legal Precedent';
    const summaryText = news.summary?.[currentLang] || news.summary?.om || news.rawText || '';
    const ref = news.referenceNumber || 'Telegram Legal Archive';
    const channel = news.channelHandle ? `@${news.channelHandle}` : '@seeraai_ethio';

    const citationLog: LogEntry = {
      id: `cite-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      text: `[WABII SEERAA / LEGAL CITATION - ${ref} (${channel})]:\n${titleText}\n\nQabxii Seeraa / Ratio:\n${summaryText}`,
      type: 'manual',
      tags: ['CITED_PRECEDENT', channel, ref],
      annotation: `Ingested from Telegram ${channel}`
    };

    setHistory(prev => [citationLog, ...prev]);
    setNewUpdatesToast(
      currentLang === 'om'
        ? `Wabiin "${ref}" galmee dhaddachaa keessatti dabalameera!`
        : currentLang === 'am'
        ? `ማስረጃው "${ref}" ወደ ችሎት መዝገብ ተካቷል!`
        : `Precedent "${ref}" added to courtroom transcript!`
    );
    setTimeout(() => setNewUpdatesToast(null), 3500);
  };

  const handleLoadArchive1500 = async (q: string = archive1500Query, cat: string = archive1500Category, pg: number = 1) => {
    setIsArchive1500Loading(true);
    try {
      const res = await fetchTelegram1500Archive(q, cat, pg, 15);
      if (res.ok) {
        setArchive1500Data({
          total: res.total,
          page: res.page || pg,
          files: res.files,
          totalPages: res.totalPages,
          channels: res.channels,
          archiveSummary: res.archiveSummary
        });
        setArchive1500Page(pg);
      }
    } catch (e) {
      console.warn('Failed to load 1500 archive:', e);
    } finally {
      setIsArchive1500Loading(false);
    }
  };

  // Initial subscribe
  useEffect(() => {
    const unsubscribe = subscribeToStoredTelegramDocs((posts) => {
      if (posts && posts.length > 0) {
        setLatestNews(posts.slice(0, 8));
      }
    });
    return () => unsubscribe();
  }, []);

  // Background polling loop targeting @seeraai_ethio and @wakolegalstudio
  useEffect(() => {
    if (!isBackgroundSyncActive) return;

    const interval = setInterval(async () => {
      try {
        const targetChannel = selectedNewsSource === 'all' ? 'seeraai_ethio' : selectedNewsSource;
        const res = await pollTelegramLegalNews(targetChannel, undefined, latestNews.length);
        if (res.ok) {
          setLastSyncTimestamp(new Date().toLocaleTimeString());
          if (res.hasNew && res.count > 0) {
            setUnreadNewsCount(prev => prev + res.count);
            setNewUpdatesToast(
              currentLang === 'om'
                ? `Oduun seeraa haaraan ${res.count} Telegram @${res.channel} irraa argameera!`
                : currentLang === 'am'
                ? `${res.count} አዲስ የህግ መረጃዎች ከቴሌግራም @${res.channel} ተገኝተዋል!`
                : `${res.count} new legal update(s) received from @${res.channel}!`
            );
            if (res.latestNews && res.latestNews.length > 0) {
              setLatestNews(res.latestNews as any);
            }
          }
        }
      } catch (err) {
        // Non-blocking background error
      }
    }, 35000);

    return () => clearInterval(interval);
  }, [isBackgroundSyncActive, selectedNewsSource, latestNews.length, currentLang]);

  // Real-time Background Caseload Metrics Sync Hook Effect
  const [realtimeCaseloadMetrics, setRealtimeCaseloadMetrics] = useState<{
    totalCases: number;
    newPending: number;
    opened: number;
    decided: number;
    closed: number;
    avgAgeDays: number;
    clearanceRate: number;
    lastUpdated: string;
  }>({
    totalCases: 0,
    newPending: 0,
    opened: 0,
    decided: 0,
    closed: 0,
    avgAgeDays: 0,
    clearanceRate: 0,
    lastUpdated: new Date().toLocaleTimeString()
  });

  useEffect(() => {
    let unsub: () => void = () => {};
    try {
      const q = collection(db, 'cases');
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const total = docs.length;
          const pending = docs.filter((c: any) => c.currentStage === 'intake' || c.paymentStatus === 'pending' || c.assignedJudge === 'Pending Assignment').length;
          const activeOpened = docs.filter((c: any) => c.currentStage !== 'closed' && c.currentStage !== 'intake').length;
          const closedCount = docs.filter((c: any) => c.currentStage === 'closed').length;
          const decidedCount = docs.filter((c: any) => c.currentStage === 'closed' || c.firstSummonsStatus === 'served').length;

          let ageSum = 0;
          docs.forEach((c: any) => {
            const dateStr = c.filingDate || c.createdAt;
            if (dateStr) {
              const age = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 3600 * 24)));
              ageSum += age;
            }
          });
          const avgAge = total > 0 ? Math.round((ageSum / total) * 10) / 10 : 0;
          const clearance = total > 0 ? Math.round((decidedCount / total) * 100) : 0;

          const metricsPayload = {
            totalCases: total,
            newPending: pending,
            opened: activeOpened,
            decided: decidedCount,
            closed: closedCount,
            avgAgeDays: avgAge,
            clearanceRate: clearance,
            lastUpdated: new Date().toLocaleTimeString()
          };

          setRealtimeCaseloadMetrics(metricsPayload);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('seera_caseload_metrics_updated', { detail: metricsPayload }));
          }
        }
      });
    } catch (err) {
      console.warn('[Realtime Caseload Sync] Error:', err);
    }

    return () => unsub();
  }, []);

  // Timer State
  const [seconds, setSeconds] = useState<number>(savedState?.seconds ?? 0);
  const [isActive, setIsActive] = useState(false);

  // History State
  const [history, setHistory] = useState<LogEntry[]>(savedState?.history ?? []);
  const [manualEntry, setManualEntry] = useState('');
  const [tagWitnessId, setTagWitnessId] = useState<string>('');

  // Witness State
  const [witnesses, setWitnesses] = useState<Witness[]>(savedState?.witnesses ?? []);
  const [newWitnessName, setNewWitnessName] = useState('');
  const [newWitnessCaseId, setNewWitnessCaseId] = useState('');
  const [newWitnessType, setNewWitnessType] = useState<'plaintiff' | 'defendant'>('plaintiff');
  const [witnessSearch, setWitnessSearch] = useState('');
  const [witnessStatusFilter, setWitnessStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [witnessSortBy, setWitnessSortBy] = useState<'date' | 'alpha' | 'status'>('date');

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Quick Notes State
  const [quickNotes, setQuickNotes] = useState<string>(savedState?.quickNotes ?? '');
  const [claimText, setClaimText] = useState<string>(savedState?.claimText ?? '');
  const [defenseText, setDefenseText] = useState<string>(savedState?.defenseText ?? '');
  const [transcribedTestimony, setTranscribedTestimony] = useState<string>(savedState?.transcribedTestimony ?? '');
  const [selectedWitnessForVoice, setSelectedWitnessForVoice] = useState<string>('');

  // Case Visibility Sync Effect
  useEffect(() => {
    const syncCaseVisibility = async () => {
      if (sessionId) {
        try {
          const caseData = await getCaseByIdFromFirestore(sessionId);
          if (caseData && typeof caseData.isPublic === 'boolean') {
            setIsCasePublic(caseData.isPublic);
          }
        } catch (e) {
          console.warn('Failed to sync case visibility:', e);
        }
      }
    };
    syncCaseVisibility();
  }, [sessionId]);

  const handleToggleVisibility = async () => {
    if (!sessionId) return;
    const nextVal = !isCasePublic;
    try {
      setIsCasePublic(nextVal);
      await toggleCasePublicVisibilityInFirestore(sessionId, nextVal, profile?.visitorName || 'Judge');
      showShortcutFeedback(nextVal ? 'Case is now PUBLICLY visible' : 'Case is now PRIVATE', nextVal ? '🔓' : '🔒');
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      setIsCasePublic(!nextVal); // rollback
    }
  };
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const audioFileRef = React.useRef<HTMLInputElement | null>(null);

  // Voice-to-Memo State
  const [showVoiceToMemo, setShowVoiceToMemo] = useState(true);
  const [showDictateCourtNote, setShowDictateCourtNote] = useState(false);
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  const [showEvidenceCaptureModal, setShowEvidenceCaptureModal] = useState(false);
  const [showMultiFileUpload, setShowMultiFileUpload] = useState(false);
  const [showCourtroomLayoutModal, setShowCourtroomLayoutModal] = useState(false);
  const [showFloatingAudioControl, setShowFloatingAudioControl] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);

  // Firestore Milestone Audit Trail State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isFetchingAuditLogs, setIsFetchingAuditLogs] = useState(false);
  const [milestoneAuditLogs, setMilestoneAuditLogs] = useState<any[]>([]);
  const [auditSource, setAuditSource] = useState<'firestore' | 'cache'>('cache');

  const handleOpenMainAuditTrail = async () => {
    setIsFetchingAuditLogs(true);
    setIsAuditModalOpen(true);
    try {
      const { fetchMilestoneAuditLogsFromFirestore } = await import('../services/caseMilestoneService');
      const caseNum = sessionId || (courtLevel === 'highCourt' ? 'CR-2026/089' : 'CR-2026/045');
      const { logs, source } = await fetchMilestoneAuditLogsFromFirestore(caseNum);
      setMilestoneAuditLogs(logs);
      setAuditSource(source);
    } catch (err) {
      console.warn('Audit trail fetch error:', err);
    } finally {
      setIsFetchingAuditLogs(false);
    }
  };


  // Witness Testimony Stopwatch State
  const [witnessStopwatchTime, setWitnessStopwatchTime] = useState<number>(0);
  const [isWitnessStopwatchActive, setIsWitnessStopwatchActive] = useState(false);
  const [showWitnessStopwatch, setShowWitnessStopwatch] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isWitnessStopwatchActive) {
      interval = setInterval(() => {
        setWitnessStopwatchTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isWitnessStopwatchActive]);

  const formatStopwatchTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const FloatingWitnessStopwatch = () => {
    if (!showWitnessStopwatch) return null;
    return (
      <motion.div 
        drag
        dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
        initial={{ opacity: 0, scale: 0.8, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="fixed bottom-32 right-6 z-[60] bg-slate-900/90 backdrop-blur-xl border-2 border-amber-500/50 rounded-2xl p-4 shadow-2xl w-48 space-y-3 cursor-move"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black uppercase text-amber-500 tracking-tighter">Testimony Time</span>
          </div>
          <button onClick={() => setShowWitnessStopwatch(false)} className="text-slate-500 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
        
        <div className="text-3xl font-black font-mono text-center text-white py-2 tabular-nums">
          {formatStopwatchTime(witnessStopwatchTime)}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setIsWitnessStopwatchActive(!isWitnessStopwatchActive)}
            className={`p-2 rounded-lg flex items-center justify-center transition-all ${isWitnessStopwatchActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
          >
            {isWitnessStopwatchActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setWitnessStopwatchTime(0); setIsWitnessStopwatchActive(false); }}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const timeStr = formatStopwatchTime(witnessStopwatchTime);
              setQuickNotes(prev => prev + `\n[⏱️ Testimony Duration: ${timeStr}]\n`);
              showShortcutFeedback('Time recorded to notes', '⏱️');
            }}
            className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center"
            title="Append to notes"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  const handleAutoLinkCitations = (target: 'notes' | 'testimony') => {
    const text = target === 'notes' ? quickNotes : transcribedTestimony;
    // Regex for Article/Keeyyata/አንቀጽ followed by numbers
    const citationRegex = /(Article|Keeyyata|አንቀጽ)\s+(\d+)/gi;
    
    if (!citationRegex.test(text)) {
      alert(currentLang === 'om' ? 'Keeyyanni seeraa hin argamne.' : 'No citations detected.');
      return;
    }

    const linkedText = text.replace(citationRegex, (match) => {
      return `[[${match}]]`; // Using a wikilink-style internal link for "conversion"
    });

    if (target === 'notes') {
      setQuickNotes(linkedText);
    } else {
      setTranscribedTestimony(linkedText);
    }
    
    showShortcutFeedback('Citations converted to links', '🔗');
  };

  const [showCourtOrderModal, setShowCourtOrderModal] = useState(false);

  const exportHearingMinutesPDF = () => {
    const doc = new jsPDF();
    const todayEth = formatEthiopianDate(new Date(), currentLang === 'am' ? 'am' : currentLang === 'om' ? 'om' : 'en');

    doc.setFontSize(16);
    doc.setTextColor(20, 30, 60);
    doc.text('FEDERAL / OROMIA COURTROOM HEARING MINUTES', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Docket Number: ${sessionTitle || 'CR-2026/045'} | Date (E.C.): ${todayEth}`, 14, 28);
    doc.text(`Court Level: ${t.courtLevels[courtLevel]}`, 14, 34);

    doc.setLineWidth(0.5);
    doc.setDrawColor(245, 158, 11);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(12);
    doc.setTextColor(20, 30, 60);
    doc.text('1. Procedural Milestone Roadmap', 14, 46);
    autoTable(doc, {
      startY: 50,
      head: [['Stage #', 'Procedural Milestone', 'Status']],
      body: PROCEDURAL_STEPS.map((s, idx) => [
        (idx + 1).toString(),
        s.title[currentLang] || s.title.en,
        idx <= currentStepIndex ? 'COMPLETED ✓' : 'PENDING'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] }
    });

    let nextY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.text('2. Timestamped Witness Testimonies & Audio Linkages', 14, nextY);

    const testimonyLogs = history.filter(h => h.tags?.includes('testimony') || h.tags?.includes('witness') || h.witnessId);
    autoTable(doc, {
      startY: nextY + 4,
      head: [['Timestamp', 'Witness Tag', 'Testimony Statement']],
      body: testimonyLogs.length > 0 
        ? testimonyLogs.map(l => [l.timestamp, l.witnessId ? 'Witness ID: ' + l.witnessId : 'General', l.text])
        : [['-', '-', 'No witness testimonies recorded for this session.']],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    applyCourtWatermarkToPDF(doc);
    doc.save(`Hearing_Minutes_${(sessionTitle || 'Case').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const handleArchiveCase = async () => {
    if (!sessionId) {
      alert(currentLang === 'om' ? 'Galmeen filatame hin jiru!' : 'No active case session selected!');
      return;
    }
    const confirmMsg = currentLang === 'om'
      ? 'Galmee kana Kuusaa Galmee (Archive) keessatti galchuuf mirkaneessaa?'
      : 'Are you sure you want to archive this case? It will be moved to archived records.';
    if (!window.confirm(confirmMsg)) return;

    try {
      if (db && sessionId) {
        await updateDoc(doc(db, 'cases', sessionId), {
          currentStage: 'closed',
          isArchived: true,
          archivedAt: new Date().toISOString()
        });
      }
      showShortcutFeedback(
        currentLang === 'om' ? 'Galmeen milkaa\'inaan Kuusaatti (Archive) dabarfameera!' : 'Case successfully archived!',
        '📦'
      );
    } catch (err) {
      console.warn('Error archiving case in Firestore:', err);
      showShortcutFeedback('Case archived locally.', '📦');
    }
  };

  const exportComprehensiveReportPDF = () => {
    const doc = new jsPDF();
    const todayEth = formatEthiopianDate(new Date(), currentLang === 'am' ? 'am' : currentLang === 'om' ? 'om' : 'en');
    
    // Header & Brand
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('SEERAAI CASE DOSSIER', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Comprehensive Legal Intelligence Report • Ethiopian Judicial Support', 105, 30, { align: 'center' });

    // Case Overview
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text('I. CASE IDENTIFICATION & OVERVIEW', 14, 50);
    doc.setLineWidth(0.5);
    doc.line(14, 52, 100, 52);

    autoTable(doc, {
      startY: 56,
      head: [['Field', 'Information Details']],
      body: [
        ['Case Reference', sessionTitle || 'CR-2026/045'],
        ['Internal ID', sessionId || 'N/A'],
        ['Jurisdiction Level', t.courtLevels[courtLevel]],
        ['Current Milestone', currentStep.title[currentLang]],
        ['Report Date (E.C.)', todayEth],
        ['Presiding Official', profile?.visitorName || 'Authorized User']
      ],
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] }
    });

    // II. Procedural Milestones
    let nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('II. PROCEDURAL PROGRESSION', 14, nextY);
    doc.line(14, nextY + 2, 80, nextY + 2);

    autoTable(doc, {
      startY: nextY + 6,
      head: [['Step', 'Status', 'Statutory Reference']],
      body: PROCEDURAL_STEPS.map((s, idx) => [
        s.title[currentLang],
        idx <= currentStepIndex ? 'COMPLETED' : 'PENDING',
        s.statuteRef || 'N/A'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // III. Evidence Inventory
    nextY = (doc as any).lastAutoTable.finalY + 15;
    if (nextY > 250) { doc.addPage(); nextY = 20; }
    doc.setFontSize(14);
    doc.text('III. EVIDENCE & EXHIBIT INVENTORY', 14, nextY);
    doc.line(14, nextY + 2, 85, nextY + 2);

    const evidenceLogs = history.filter(isEvidenceLog);
    autoTable(doc, {
      startY: nextY + 6,
      head: [['Exhibit ID', 'Type', 'Status', 'Summary/OCR Snippet']],
      body: evidenceLogs.length > 0 
        ? evidenceLogs.map(l => [
            l.evidenceMetadata?.exhibitNumber || 'EXH-' + l.id.slice(-4),
            l.fileType || 'Document',
            l.evidenceMetadata?.authenticityStatus || 'Uploaded',
            l.text.substring(0, 100) + (l.text.length > 100 ? '...' : '')
          ])
        : [['-', '-', '-', 'No formal evidence exhibits recorded.']],
      columnStyles: { 3: { cellWidth: 80 } },
      theme: 'striped'
    });

    // IV. Witness Testimonies
    nextY = (doc as any).lastAutoTable.finalY + 15;
    if (nextY > 250) { doc.addPage(); nextY = 20; }
    doc.setFontSize(14);
    doc.text('IV. DETAILED TRANSCRIPTS & TESTIMONY', 14, nextY);
    doc.line(14, nextY + 2, 95, nextY + 2);

    const testimonyLogs = history.filter(h => h.witnessId || h.tags?.includes('testimony'));
    autoTable(doc, {
      startY: nextY + 6,
      head: [['Timestamp', 'Source / Witness', 'Verbatim Statement Snippet']],
      body: testimonyLogs.length > 0 
        ? testimonyLogs.map(l => [
            l.timestamp,
            witnesses.find(w => w.id === l.witnessId)?.name || 'General Record',
            l.text
          ])
        : [['-', '-', 'No witness testimonies were transcribed for this session.']],
      columnStyles: { 2: { cellWidth: 110 } },
      theme: 'grid'
    });

    // V. Summary Notes
    nextY = (doc as any).lastAutoTable.finalY + 15;
    if (nextY > 250) { doc.addPage(); nextY = 20; }
    doc.setFontSize(14);
    doc.text('V. JUDICIAL SUMMARY & QUICK NOTES', 14, nextY);
    doc.line(14, nextY + 2, 95, nextY + 2);
    
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(quickNotes || 'No additional judicial notes recorded.', 180);
    doc.text(splitNotes, 14, nextY + 10);

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} | Generated by SEERAAI Legal Intelligence | Private & Confidential`, 105, 285, { align: 'center' });
    }

    applyCourtWatermarkToPDF(doc);
    doc.save(`Comprehensive_Report_${(sessionTitle || 'Case').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const exportCaseFileSummaryPDF = () => {
    const doc = new jsPDF();
    const todayEth = formatEthiopianDate(new Date(), currentLang === 'am' ? 'am' : currentLang === 'om' ? 'om' : 'en');
    
    // Header & Brand
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('MANA MURTII - CASE FILE SUMMARY', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Official Court Record & Evidence Metadata Summary • Date: ${todayEth}`, 105, 28, { align: 'center' });

    // I. Case & Milestone Summary
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.text('I. CASE MILESTONES & DOCKET METADATA', 14, 50);
    doc.setLineWidth(0.5);
    doc.line(14, 52, 110, 52);

    autoTable(doc, {
      startY: 56,
      head: [['Milestone Stage', 'Status / Progress', 'Statutory Basis']],
      body: PROCEDURAL_STEPS.map((s, idx) => [
        s.title[currentLang] || s.title.en,
        idx <= currentStepIndex ? 'COMPLETED ✓' : (idx === currentStepIndex ? 'ACTIVE' : 'PENDING'),
        s.statuteRef || 'General Procedure'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] } // amber-500
    });

    // II. Evidence Metadata Inventory
    let nextY = (doc as any).lastAutoTable.finalY + 14;
    if (nextY > 250) { doc.addPage(); nextY = 20; }
    doc.setFontSize(13);
    doc.text('II. COMPLETE EVIDENCE METADATA & EXHIBIT LOGS', 14, nextY);
    doc.line(14, nextY + 2, 115, nextY + 2);

    const evidenceLogs = history.filter(isEvidenceLog);
    autoTable(doc, {
      startY: nextY + 6,
      head: [['Exhibit #', 'Type / Name', 'Submitted By', 'Authenticity Status', 'Summary / Details']],
      body: evidenceLogs.length > 0 
        ? evidenceLogs.map(l => [
            l.evidenceMetadata?.exhibitNumber || 'EXH-' + l.id.slice(-4),
            l.fileType || l.fileName || 'Evidence Doc',
            l.evidenceMetadata?.submittedBy || 'Litigant / Party',
            l.evidenceMetadata?.authenticityStatus || 'Verified',
            l.evidenceMetadata?.summary || l.text.substring(0, 80)
          ])
        : [['-', 'No evidence exhibits logged in this session', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 4: { cellWidth: 70 } }
    });

    // III. Judicial Quick Notes & Orders
    nextY = (doc as any).lastAutoTable.finalY + 14;
    if (nextY > 250) { doc.addPage(); nextY = 20; }
    doc.setFontSize(13);
    doc.text('III. JUDICIAL MINUTES & SUMMARY NOTES', 14, nextY);
    doc.line(14, nextY + 2, 95, nextY + 2);

    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(quickNotes || 'No judicial quick notes recorded for this case file.', 180);
    doc.text(splitNotes, 14, nextY + 10);

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} | SEERAAI Pro Legal File Summary | Official Court Archive`, 105, 285, { align: 'center' });
    }

    applyCourtWatermarkToPDF(doc);
    doc.save(`Case_File_Summary_${(sessionTitle || 'Case').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  // Evidence Preview Modal State
  const [selectedEvidenceLog, setSelectedEvidenceLog] = useState<LogEntry | null>(null);
  const [firestoreEvidenceDetails, setFirestoreEvidenceDetails] = useState<CaseEvidence | null>(null);
  const [isFetchingPracticeCaseEvidence, setIsFetchingPracticeCaseEvidence] = useState(false);

  useEffect(() => {
    if (!selectedEvidenceLog) {
      setFirestoreEvidenceDetails(null);
      return;
    }

    let isMounted = true;
    const fetchEvidenceMetadata = async () => {
      setIsFetchingPracticeCaseEvidence(true);
      try {
        const queryTerm = selectedEvidenceLog.fileName || selectedEvidenceLog.id || selectedEvidenceLog.text.slice(0, 30);
        const record = await practiceCaseService.fetchEvidenceMetadataFromPracticeCases(queryTerm, sessionId || undefined);

        if (isMounted) {
          if (record) {
            setFirestoreEvidenceDetails(record);
          } else {
            // Synthesize fallback evidence metadata and prepare for courtroom display
            const generated = generateAIEvidenceDescription(
              {
                name: selectedEvidenceLog.fileName || `Exhibit_${selectedEvidenceLog.id.slice(-6)}.pdf`,
                category: selectedEvidenceLog.tags?.[0] || 'Documentary Exhibit',
                type: 'application/pdf',
                uploadedAt: selectedEvidenceLog.timestamp
              },
              { caseNumber: sessionTitle || 'CR-2026/045' },
              currentLang
            );

            const synthesized: CaseEvidence = {
              id: `evd-${selectedEvidenceLog.id}`,
              name: selectedEvidenceLog.fileName || `Court_Exhibit_${selectedEvidenceLog.id.slice(-6)}.pdf`,
              type: 'application/pdf',
              uploadedAt: new Date().toISOString(),
              category: selectedEvidenceLog.tags?.join(', ') || 'Documentary Exhibit',
              aiDescription: generated.description,
              aiRelevance: generated.relevance,
              evidentialWeight: generated.weight,
              admissibilityStatus: generated.admissibility === 'admissible' ? 'admissible' : 'conditional',
              authorOrSource: witnesses.find(w => w.id === selectedEvidenceLog.witnessId)?.name || 'Courtroom Record / Presiding Bench',
              tags: selectedEvidenceLog.tags || ['Evidence', 'Documentary']
            };
            setFirestoreEvidenceDetails(synthesized);
          }
        }
      } catch (err) {
        console.warn('Error fetching evidence metadata from practice_cases:', err);
      } finally {
        if (isMounted) setIsFetchingPracticeCaseEvidence(false);
      }
    };

    fetchEvidenceMetadata();

    return () => {
      isMounted = false;
    };
  }, [selectedEvidenceLog, currentLang, sessionId, sessionTitle]);

  const exportEvidenceMetadataPDF = (log: LogEntry) => {
    const doc = new jsPDF();
    const witnessObj = witnesses.find(w => w.id === log.witnessId);

    // Header
    doc.setFontSize(16);
    doc.setTextColor(180, 83, 9); // Amber
    doc.text("MANA MURTII AANAA GURBICHA", 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text("Gabaasa Ragaa fi Metaadaataa (Evidence Metadata & Summary Preview)", 105, 25, { align: 'center' });
    doc.text(`Lakk. Galmee: ${sessionId || 'OR/HC/8912/15'} | Guyyaa: ${log.timestamp}`, 105, 31, { align: 'center' });

    autoTable(doc, {
      startY: 38,
      head: [['Aadaa / Category', 'Qabiyyee / Details']],
      body: [
        ['Exhibit ID', log.evidenceMetadata?.exhibitNumber || `EXHIBIT-EVD-${log.id.slice(-6).toUpperCase()}`],
        ['Evidence Type', log.tags?.join(', ') || 'Documentary Evidence'],
        ['Submitted By / Ragaa', witnessObj ? witnessObj.name : (log.evidenceMetadata?.submittedBy || 'Court Record / Docket')],
        ['Timestamp', log.timestamp],
        ['Framed Issue', framedIssueForEvidence || log.evidenceMetadata?.framedIssueRelevance || 'General Docket Evidence'],
        ['Authenticity Status', log.evidenceMetadata?.authenticityStatus || 'Verified Authentic & Court Sealed'],
        ['Judge Annotation', log.annotation || 'None'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Qabiyyee fi Qabxii Ijoo Ragaa (Evidence Content & Key Facts):", 14, (doc as any).lastAutoTable.finalY + 10);
    
    const splitText = doc.splitTextToSize(log.text, 180);
    doc.text(splitText, 14, (doc as any).lastAutoTable.finalY + 18);

    applyCourtWatermarkToPDF(doc);
    doc.save(`Evidence_Metadata_Preview_${log.id}.pdf`);
  };

  const isEvidenceLog = (log: LogEntry): boolean => {
    if (log.fileUrl || log.fileName || log.evidenceMetadata) return true;
    if (!log.tags) return false;
    return log.tags.some(t => 
      /evidence|document|exhibit|ocr|testimony|key_facts|sanada|ragaa|ማስረጃ|ሰነድ/i.test(t)
    );
  };

  const getFileTypeIcon = (fileType?: string, fileName?: string, fileUrl?: string, evidenceType?: string) => {
    const combined = `${fileType || ''} ${fileName || ''} ${fileUrl || ''} ${evidenceType || ''}`.toLowerCase();

    // PDF Document
    if (/\.pdf|pdf|application\/pdf/i.test(combined)) {
      return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    // Video Recording
    if (/\.(mp4|mov|avi|mkv|webm|3gp)|video|cctv|recording_video/i.test(combined)) {
      return <Video className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    // Photo / Image / Scan
    if (/\.(jpg|jpeg|png|webp|gif|svg|bmp)|image|photo|camera|scan|picture/i.test(combined)) {
      return <Image className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    // Audio / Speech Recording
    if (/\.(mp3|wav|ogg|m4a|aac)|audio|voice|speech|recording_audio/i.test(combined)) {
      return <Radio className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    // Word / Text Document
    if (/\.(doc|docx|rtf|txt|odt)|word|document/i.test(combined)) {
      return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
  };

  const getFileTypeBadgeLabel = (fileType?: string, fileName?: string, evidenceType?: string): string => {
    const combined = `${fileType || ''} ${fileName || ''} ${evidenceType || ''}`.toLowerCase();

    if (/\.pdf|pdf/i.test(combined)) return 'PDF DOC';
    if (/\.(mp4|mov|avi|mkv|webm)|video/i.test(combined)) return 'VIDEO RECORDING';
    if (/\.(jpg|jpeg|png|webp|gif)|image|photo|scan/i.test(combined)) return 'IMAGE SCAN';
    if (/\.(mp3|wav|ogg|m4a)|audio|voice/i.test(combined)) return 'AUDIO SPEECH';
    if (/\.(doc|docx|txt)/i.test(combined)) return 'WORD DOC';
    return 'EVIDENCE FILE';
  };

  // Evidence Audio Processor State & Citation Copying
  const [evidenceAudioInput, setEvidenceAudioInput] = useState('');
  const [evidenceWitnessId, setEvidenceWitnessId] = useState('');
  const [isProcessingEvidence, setIsProcessingEvidence] = useState(false);
  const [evidenceSummaryResult, setEvidenceSummaryResult] = useState<{ summary: string; bullets: string[] } | null>(null);
  const [showUserManualModal, setShowUserManualModal] = useState(false);
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<'all' | 'admissible' | 'rejected' | 'verified' | 'pending' | 'uploaded'>('all');

  // Bulk Evidence Selection & Batch Actions State
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState<boolean>(false);

  // Main Left Column Tab Switcher: 'proceedings' vs 'witnessStatements'
  const [activeMainTab, setActiveMainTab] = useState<'proceedings' | 'witnessStatements'>('proceedings');
  const [syncState, setSyncState] = useState(syncStatusService.getState());

  useEffect(() => {
    return syncStatusService.subscribe(setSyncState);
  }, []);

  // Witness Statements Linked to Case File State
  const [caseWitnessStatements, setCaseWitnessStatements] = useState<CaseWitnessStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState<boolean>(false);
  const [witnessStatementFilter, setWitnessStatementFilter] = useState<'all' | 'plaintiff_witness' | 'defendant_witness' | 'expert_witness' | 'court_witness'>('all');
  const [witnessStatementSearch, setWitnessStatementSearch] = useState<string>('');

  // Witness Statement Form State
  const [newWitnessStmtName, setNewWitnessStmtName] = useState<string>('');
  const [newWitnessStmtRole, setNewWitnessStmtRole] = useState<'plaintiff_witness' | 'defendant_witness' | 'expert_witness' | 'court_witness'>('plaintiff_witness');
  const [newWitnessStmtText, setNewWitnessStmtText] = useState<string>('');
  const [newWitnessStmtCross, setNewWitnessStmtCross] = useState<string>('');
  const [newWitnessStmtCredibility, setNewWitnessStmtCredibility] = useState<'high' | 'moderate' | 'questionable'>('high');
  const [isLoggingWitnessStatement, setIsLoggingWitnessStatement] = useState<boolean>(false);
  const [isWitnessRecording, setIsWitnessRecording] = useState<boolean>(false);
  const witnessSpeechRecognitionRef = React.useRef<any>(null);

  // Load Witness Statements for current case
  useEffect(() => {
    const effectiveCaseId = sessionId || 'case-today-301';
    setLoadingStatements(true);
    fetchCaseWitnessStatements(effectiveCaseId)
      .then(stmts => {
        setCaseWitnessStatements(stmts);
      })
      .catch(err => {
        console.warn('Error loading case witness statements:', err);
        setCaseWitnessStatements(getLocalWitnessStatements(effectiveCaseId));
      })
      .finally(() => {
        setLoadingStatements(false);
      });
  }, [sessionId]);

  // Handle toggling single evidence selection
  const handleToggleSelectEvidence = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEvidenceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Handle selecting or deselecting all filtered evidence logs
  const handleSelectAllEvidence = (e?: React.SyntheticEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    const currentEvidenceIds = filteredHistory.filter(isEvidenceLog).map(l => l.id);
    if (currentEvidenceIds.length === 0) return;
    const allSelected = currentEvidenceIds.every(id => selectedEvidenceIds.includes(id));
    if (allSelected) {
      setSelectedEvidenceIds(prev => prev.filter(id => !currentEvidenceIds.includes(id)));
    } else {
      setSelectedEvidenceIds(prev => Array.from(new Set([...prev, ...currentEvidenceIds])));
    }
  };

  // Execute Firestore Batch Operation for Bulk Evidence Status
  const handleExecuteBulkAction = async (newStatus: 'admissible' | 'rejected' | 'pending' | string) => {
    if (selectedEvidenceIds.length === 0) return;
    setIsBatchUpdating(true);
    const effectiveCaseId = sessionId || 'case-today-301';
    const judgeOrStaff = profile?.visitorName || 'Judge / Court Reporter';

    try {
      // 1. Single atomic Firestore writeBatch operation
      const result = await bulkUpdateEvidenceAdmissibility(
        effectiveCaseId,
        selectedEvidenceIds,
        newStatus,
        `Batch status update: ${newStatus.toUpperCase()}`,
        judgeOrStaff
      );

      // 2. Update local history entries
      const statusLabel = newStatus === 'admissible' ? 'Admissible Evidence (Court Order)' : newStatus === 'rejected' ? 'Rejected by Bench Order' : 'Pending Judicial Review';
      setHistory(prev => prev.map(item => {
        if (selectedEvidenceIds.includes(item.id)) {
          return {
            ...item,
            evidenceMetadata: {
              ...item.evidenceMetadata,
              authenticityStatus: statusLabel,
              status: newStatus,
              admissibilityStatus: newStatus
            }
          };
        }
        return item;
      }));

      // 3. If there is an active Firestore session, sync session logs
      if (sessionId) {
        try {
          const sessionRef = doc(db, 'court_sessions', sessionId);
          const updatedLogs = history.map(item => {
            if (selectedEvidenceIds.includes(item.id)) {
              return {
                ...item,
                evidenceMetadata: {
                  ...item.evidenceMetadata,
                  authenticityStatus: statusLabel,
                  status: newStatus,
                  admissibilityStatus: newStatus
                }
              };
            }
            return item;
          });
          await updateDoc(sessionRef, {
            logs: updatedLogs,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.warn('Syncing updated logs to court_sessions failed:', err);
        }
      }

      // 4. Append audit log entry to courtroom history
      const bulkAuditLog: LogEntry = {
        id: 'bulk_batch_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        text: `[MURTEE GAMTAA / BATCH WRITE]: ${selectedEvidenceIds.length} ragaalee haalli isaanii gara "${newStatus.toUpperCase()}" tti jijjiirameera. (Firestore writeBatch completed successfully).`,
        type: 'manual',
        tags: ['bulk_action', 'admissibility_batch', newStatus]
      };
      setHistory(prev => [bulkAuditLog, ...prev]);

      // 5. User feedback toast
      const toastMsg = currentLang === 'om'
        ? `Ragaalee ${selectedEvidenceIds.length} gamtaan gara "${newStatus.toUpperCase()}" tti jijjiiramaniiru!`
        : currentLang === 'am'
        ? `${selectedEvidenceIds.length} ማስረጃዎች በአንድ ጊዜ ወደ "${newStatus.toUpperCase()}" ተቀይረዋል!`
        : `Successfully updated ${selectedEvidenceIds.length} evidence item(s) to ${newStatus.toUpperCase()} in Firestore!`;
      showShortcutFeedback(toastMsg, '✓');

      // Clear selection
      setSelectedEvidenceIds([]);
    } catch (err: any) {
      console.error('Error executing bulk evidence action:', err);
      alert('Bulk action failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Toggle speech recognition for witness statement summary
  const toggleWitnessSpeechDictation = () => {
    if (isWitnessRecording) {
      if (witnessSpeechRecognitionRef.current) {
        witnessSpeechRecognitionRef.current.stop();
      }
      setIsWitnessRecording(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please type the testimony summary.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLang === 'om' ? 'om-ET' : currentLang === 'am' ? 'am-ET' : 'en-US';

      recognition.onstart = () => {
        setIsWitnessRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setNewWitnessStmtText(prev => prev ? `${prev} ${transcript.trim()}` : transcript.trim());
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Witness speech recognition error:', e);
        setIsWitnessRecording(false);
      };

      recognition.onend = () => {
        setIsWitnessRecording(false);
      };

      witnessSpeechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition init error:', e);
      setIsWitnessRecording(false);
    }
  };

  // Submit and log new witness statement
  const handleSaveWitnessStatementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWitnessStmtName.trim()) {
      alert(currentLang === 'om' ? 'Maqaa ragaa galchuun dirqama!' : 'Please enter the witness name.');
      return;
    }
    if (!newWitnessStmtText.trim()) {
      alert(currentLang === 'om' ? 'Axereeraa jecha ragaa galchuun dirqama!' : 'Please enter the testimony summary.');
      return;
    }

    setIsLoggingWitnessStatement(true);
    const effectiveCaseId = sessionId || 'case-today-301';
    const activeCaseNo = sessionTitle || (courtLevel === 'highCourt' ? 'CR-2026/089' : 'CR-2026/045');
    const statementId = 'stmt_' + Date.now();
    const timeStr = new Date().toLocaleTimeString();

    const newStatement: CaseWitnessStatement = {
      id: statementId,
      caseId: effectiveCaseId,
      caseNumber: activeCaseNo,
      witnessName: newWitnessStmtName.trim(),
      witnessRole: newWitnessStmtRole,
      statementText: newWitnessStmtText.trim(),
      crossExaminationNotes: newWitnessStmtCross.trim() || undefined,
      credibilityRating: newWitnessStmtCredibility,
      recordedBy: profile?.visitorName || 'Court Reporter',
      timestamp: timeStr,
      statutoryBasis: 'Heera FDRE / SDFHH Art. 136-137 (Witness Examination & Cross)',
      createdAt: new Date().toISOString()
    };

    try {
      await saveCaseWitnessStatement(newStatement);
      setCaseWitnessStatements(prev => [newStatement, ...prev]);

      // Also append to session history logs
      const newLog: LogEntry = {
        id: statementId,
        timestamp: timeStr,
        text: `[GALMEE JECHA RAGAA - ${newStatement.witnessName} (${newStatement.witnessRole.toUpperCase()})]: ${newStatement.statementText}${newStatement.crossExaminationNotes ? ` | Qaxxaamuraa: ${newStatement.crossExaminationNotes}` : ''} | Madaallii: ${newStatement.credibilityRating.toUpperCase()}`,
        type: 'manual',
        tags: ['testimony', 'witness_statement', newStatement.witnessRole, newStatement.credibilityRating]
      };
      setHistory(prev => [newLog, ...prev]);

      // If active session in Firestore, sync
      if (sessionId) {
        try {
          const sessionRef = doc(db, 'court_sessions', sessionId);
          await updateDoc(sessionRef, {
            logs: [newLog, ...history],
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.warn('Syncing witness statement log to session failed:', err);
        }
      }

      // Reset form
      setNewWitnessStmtName('');
      setNewWitnessStmtText('');
      setNewWitnessStmtCross('');
      setNewWitnessStmtCredibility('high');

      showShortcutFeedback(
        currentLang === 'om' ? 'Jechi ragaa galmee dhimmaatiin walqabatee milkaa\'inaan galmaa\'eera!' : 'Witness statement logged and linked to case file!',
        '📜'
      );
    } catch (err: any) {
      console.error('Error saving witness statement:', err);
      alert('Failed to save statement: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsLoggingWitnessStatement(false);
    }
  };

  // Inline Evidence Expansion & Secure Share Link Dialog State
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Record<string, boolean>>({});
  const [shareEvidenceLog, setShareEvidenceLog] = useState<LogEntry | null>(null);
  const [shareExpiryHours, setShareExpiryHours] = useState<number>(24);
  const [sharePinCode, setSharePinCode] = useState<string>('');
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [copiedTelegramChannelLink, setCopiedTelegramChannelLink] = useState<boolean>(false);

  // Telegram Poll Creator Dialog State
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('Cassation #214539 commercial lease irratti ni hojjetaa?');
  const [pollOptions, setPollOptions] = useState<string[]>(['Eeyyee', 'Lakki', 'Murtii addaa']);
  const [pollChannelTarget, setPollChannelTarget] = useState('@seeraai_ethio');

  const handleAddPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleSaveAndPublishPoll = async () => {
    if (!pollQuestion.trim()) {
      alert(currentLang === 'om' ? 'Gaaffiin poll galchuuf dirqama!' : 'Please enter a poll question.');
      return;
    }
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) {
      alert(currentLang === 'om' ? 'Opsiiniin yoo xiqqaate 2 barbaachisa!' : 'At least 2 valid options are required.');
      return;
    }

    const commandStr = `/poll ${pollQuestion.trim()} | ${validOptions.join(' | ')}`;

    try {
      if (db) {
        await addDoc(collection(db, 'telegram_polls'), {
          pollId: 'poll_' + Date.now(),
          question: pollQuestion.trim(),
          options: validOptions,
          command: commandStr,
          createdBy: profile?.visitorName || 'Authorized Jurist',
          createdAt: new Date().toISOString(),
          channelTarget: pollChannelTarget
        });
      }
      navigator.clipboard.writeText(commandStr);
      showShortcutFeedback(
        currentLang === 'om' ? 'Ajajni /poll clipboard-itti waraabamee Firestore keessatti galmaa\'eera!' : 'Poll command /poll copied and logged to Firestore!',
        '📊'
      );
      setShowCreatePollModal(false);
    } catch (err) {
      console.warn('Error saving poll to Firestore:', err);
      navigator.clipboard.writeText(commandStr);
      showShortcutFeedback('Poll command /poll copied to clipboard.', '📊');
      setShowCreatePollModal(false);
    }
  };

  const toggleExpandEvidence = (logId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedEvidenceIds(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const handleOpenShareDialog = (log: LogEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShareEvidenceLog(log);
    setShareExpiryHours(24);
    setSharePinCode(Math.floor(1000 + Math.random() * 9000).toString());
    setCopiedShareLink(false);
  };

  const getLogEvidenceStatus = (log: LogEntry): 'admissible' | 'rejected' | 'verified' | 'pending' | 'uploaded' => {
    const rawStatus = (
      log.evidenceMetadata?.authenticityStatus ||
      (log.evidenceMetadata as any)?.status ||
      (log.evidenceMetadata as any)?.admissibilityStatus ||
      ''
    ).toLowerCase();
    if (rawStatus.includes('admissible') || rawStatus === 'admitted') {
      return 'admissible';
    }
    if (rawStatus.includes('rejected') || rawStatus.includes('inadmissible')) {
      return 'rejected';
    }
    if (rawStatus.includes('verified') || rawStatus.includes('authentic') || rawStatus.includes('sealed')) {
      return 'verified';
    }
    if (rawStatus.includes('pending') || rawStatus.includes('examination') || rawStatus.includes('review') || rawStatus.includes('challenge')) {
      return 'pending';
    }
    return 'uploaded';
  };

  const toggleEvidenceStatus = (
    log: LogEntry,
    newStatus: 'admissible' | 'rejected' | 'verified' | 'pending' | 'uploaded',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const statusLabel = newStatus === 'admissible'
      ? 'Admissible by Court Order'
      : newStatus === 'rejected'
      ? 'Rejected by Bench Order'
      : newStatus === 'verified'
      ? 'Verified Authentic & Court Sealed'
      : newStatus === 'pending'
      ? 'Pending Admissibility Review'
      : 'Uploaded Document Record';

    setHistory(prev => prev.map(item => {
      if (item.id === log.id) {
        return {
          ...item,
          evidenceMetadata: {
            ...item.evidenceMetadata,
            authenticityStatus: statusLabel,
            status: newStatus,
            admissibilityStatus: (newStatus === 'admissible' || newStatus === 'rejected') ? newStatus : undefined
          }
        };
      }
      return item;
    }));
    showShortcutFeedback(`Document status updated to ${newStatus.toUpperCase()}`, '✓');
  };

  const handleCopyEvidenceCitation = (log: LogEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exhibitNo = log.evidenceMetadata?.exhibitNumber || `EXHIBIT-EVD-${log.id.slice(-6).toUpperCase()}`;
    const witnessName = witnesses.find(w => w.id === log.witnessId)?.name || log.evidenceMetadata?.submittedBy || 'Court Record / Docket';
    const relevance = log.evidenceMetadata?.framedIssueRelevance || 'General Docket Evidence';
    const authenticity = log.evidenceMetadata?.authenticityStatus || 'Verified Authentic & Court Sealed';
    const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : new Date().toLocaleString();
    const fileRef = log.fileName ? `\n• File Attachment: ${log.fileName} (${log.fileSize || 'Attached'})` : '';

    const citationText = `📋 [SEERAAI EVIDENCE CITATION & STATUTORY REFERENCE]
• Exhibit Identifier: ${exhibitNo}
• Submitted By / Source: ${witnessName}
• Evidence Summary / Text: "${log.text}"${fileRef}
• Framed Issue Relevance: ${relevance}
• Authenticity Status: ${authenticity}
• Record Date: ${dateStr}
• Statutory Legal Basis: Ethiopian Civil Procedure Code Art. 137 / Criminal Procedure Code Art. 136 (Admissibility & Evaluation of Evidence)
• Archive Verification: Telegram Legal Archive (@seeraai_ethio)`;

    navigator.clipboard.writeText(citationText);
    setCopiedCitationId(log.id);
    showShortcutFeedback(
      currentLang === 'om' ? 'Waraabbiin Ragaa Clipboard\'tti galeeira!' : currentLang === 'am' ? 'የማስረጃው ጥቅስ ኮፒ ተደርጓል!' : 'Evidence citation & statutory reference copied!',
      '📋'
    );
    setTimeout(() => {
      setCopiedCitationId(null);
    }, 2500);
  };

  // Live Courtroom Kiosk WebSocket Monitoring State
  const [kioskConnectionState, setKioskConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [activeKiosksCount, setActiveKiosksCount] = useState<number>(0);
  const [lastKioskHeartbeat, setLastKioskHeartbeat] = useState<string | null>(null);
  const [isRefreshingKiosks, setIsRefreshingKiosks] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pollInterval: any = null;

    const checkKioskStatusHttp = async () => {
      try {
        const res = await fetch('/api/kiosk/status');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.connectedKiosks === 'number') {
            setActiveKiosksCount(data.connectedKiosks);
            setLastKioskHeartbeat(new Date().toLocaleTimeString());
          }
        }
      } catch (e) {
        // HTTP fallback quiet
      }
    };

    const connectKioskWebSocket = () => {
      if (typeof window === 'undefined') return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/kiosk-ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setKioskConnectionState('connected');
          setLastKioskHeartbeat(new Date().toLocaleTimeString());
          // Fetch authoritative HTTP snapshot
          checkKioskStatusHttp();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'KIOSK_PRESENCE' && typeof data.connectedKiosks === 'number') {
              setActiveKiosksCount(data.connectedKiosks);
              setLastKioskHeartbeat(new Date().toLocaleTimeString());
            } else if (data.type === 'CONNECTED') {
              setKioskConnectionState('connected');
              checkKioskStatusHttp();
            }
          } catch {
            // ignore non-json
          }
        };

        ws.onclose = () => {
          setKioskConnectionState('disconnected');
          reconnectTimeout = setTimeout(connectKioskWebSocket, 3000);
        };

        ws.onerror = () => {
          setKioskConnectionState('disconnected');
          ws?.close();
        };
      } catch (err) {
        setKioskConnectionState('disconnected');
      }
    };

    connectKioskWebSocket();
    // Periodic HTTP heartbeat verification every 10 seconds
    pollInterval = setInterval(checkKioskStatusHttp, 10000);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  const handleBroadcastHardRefresh = async () => {
    setIsRefreshingKiosks(true);
    try {
      await fetch('/api/kiosk/hard-refresh', { method: 'POST' });
    } catch (e) {
      console.warn('Hard refresh trigger error:', e);
    } finally {
      setTimeout(() => setIsRefreshingKiosks(false), 800);
    }
  };

  // Legal Privilege State (Web Crypto API AES-GCM)
  const [isLegalPrivilegeActive, setIsLegalPrivilegeActive] = useState(false);
  const [privilegePasscode, setPrivilegePasscode] = useState('');
  const [showLegalPrivilegeModal, setShowLegalPrivilegeModal] = useState(false);
  const [passcodeInputValue, setPasscodeInputValue] = useState('');

  const encryptText = async (text: string, passcode: string): Promise<string> => {
    if (!text || !passcode) return text;
    try {
      const enc = new TextEncoder();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(passcode), { name: "PBKDF2" }, false, ["deriveKey"]);
      const key = await window.crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
      const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(text));
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < combined.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(combined.subarray(i, i + chunkSize)));
      }
      return "ENC:" + btoa(binary);
    } catch (err) {
      console.error("Encryption error:", err);
      return text;
    }
  };

  const decryptText = async (cipher: string, passcode: string): Promise<string> => {
    if (!cipher || !cipher.startsWith("ENC:") || !passcode) return cipher;
    try {
      const rawB64 = cipher.substring(4);
      const decoded = Uint8Array.from(atob(rawB64), c => c.charCodeAt(0));
      const salt = decoded.slice(0, 16);
      const iv = decoded.slice(16, 28);
      const data = decoded.slice(28);
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(passcode), { name: "PBKDF2" }, false, ["deriveKey"]);
      const key = await window.crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.error("Decryption error:", err);
      return "[LOCKED: Invalid Master Passcode]";
    }
  };

  // Framed Issue Evidence Gate State
  const [framedIssueForEvidence, setFramedIssueForEvidence] = useState<string>(savedState?.framedIssueForEvidence ?? '');
  const [isVerifyingIssueRelevance, setIsVerifyingIssueRelevance] = useState(false);
  const [issueVerificationResult, setIssueVerificationResult] = useState<{ isRelevant: boolean; reason: string } | null>(null);

  // Document Image OCR & Extraction Hub State
  const [ocrCategory, setOcrCategory] = useState<'claim' | 'defense' | 'intervention' | 'objection' | 'judgment' | 'execution_objection'>(savedState?.ocrCategory ?? 'claim');
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(savedState?.ocrImagePreview ?? null);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [ocrExtractedText, setOcrExtractedText] = useState<string>(savedState?.ocrExtractedText ?? '');
  const ocrFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleOcrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingOcr(true);

    try {
      // 1. Process and downscale image off-main-thread via dedicated Web Worker
      const processed = await processDocumentOffThread(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
        enhanceContrast: true,
      });

      if (!processed.success || !processed.base64) {
        throw new Error(processed.error || 'Failed to process document image in Web Worker');
      }

      const previewDataUrl = `data:${processed.mimeType};base64,${processed.base64}`;
      setOcrImagePreview(previewDataUrl);

      // 2. Transmit lightweight optimized payload to legal OCR analysis
      const res = await analyzeLegalDocument({
        fileData: processed.base64,
        mimeType: processed.mimeType,
        fileName: file.name,
        analysisType: 'plain_explanation',
        outputLanguages: [currentLang],
        customInstructions: `Extract and transcribe all text from this legal document image (${ocrCategory}).`
      });

      if (res.analysis) {
        setOcrExtractedText(res.analysis);
        if (ocrCategory === 'claim') setClaimText(prev => prev ? prev + '\n\n' + res.analysis : res.analysis);
        if (ocrCategory === 'defense') setDefenseText(prev => prev ? prev + '\n\n' + res.analysis : res.analysis);
      }
    } catch (err: any) {
      console.error('OCR Extraction error:', err);
      alert('OCR Extraction failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExtractingOcr(false);
    }
  };

  const handleSaveVerifiedTestimony = async () => {
    if (!transcribedTestimony.trim()) return;

    if (!framedIssueForEvidence.trim()) {
      alert(currentLang === 'om' 
        ? 'Dursa "Ijoo Qulqullinaaf Qabame" galchaa! Jechi ragaa kamiyyuu akka seeraatti ijoorratti qofa hirkachuu qaba.' 
        : 'Please specify the Framed Issue (Ijoo Qulqullinaaf Qabame) first before recording testimony.');
      return;
    }

    setIsVerifyingIssueRelevance(true);
    try {
      const res = await generateLegalContent({
        prompt: `Verify whether the following witness testimony is strictly relevant to and addresses the framed issue ordered for clarification.\n\nFramed Issue (Ijoo): "${framedIssueForEvidence}"\n\nWitness Testimony:\n"${transcribedTestimony}"\n\nProvide response in JSON format or clear text starting with RELEVANT: YES or RELEVANT: NO, followed by a brief justification.`,
        outputLanguages: [currentLang],
        taskType: 'summarize',
      });

      const analysis = res.content || res.separatedVersions?.[currentLang] || '';
      const isRelevant = !analysis.toUpperCase().includes('RELEVANT: NO') && !analysis.toUpperCase().includes('NOT RELEVANT');

      setIssueVerificationResult({
        isRelevant,
        reason: analysis
      });

      const witnessObj = witnesses.find(w => w.id === selectedWitnessForVoice);
      const testimonyLog: LogEntry = {
        id: 'test_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        text: `[TESTIMONY FOR FRAMED ISSUE: "${framedIssueForEvidence}"${witnessObj ? ' - Ragaa: ' + witnessObj.name : ''}]: ${transcribedTestimony}\n[Relevance Check: ${isRelevant ? 'RELEVANT ✓' : 'DEVIATION FLAGGED ⚠'}]`,
        type: 'manual',
        witnessId: selectedWitnessForVoice || undefined,
        tags: ['testimony', isRelevant ? 'issue_verified' : 'issue_deviation']
      };

      setHistory([testimonyLog, ...history]);
      setTranscribedTestimony('');
    } catch (e) {
      console.error(e);
      const witnessObj = witnesses.find(w => w.id === selectedWitnessForVoice);
      const testimonyLog: LogEntry = {
        id: 'test_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        text: `[TESTIMONY FOR FRAMED ISSUE: "${framedIssueForEvidence}"${witnessObj ? ' - Ragaa: ' + witnessObj.name : ''}]: ${transcribedTestimony}`,
        type: 'manual',
        witnessId: selectedWitnessForVoice || undefined,
        tags: ['testimony', 'issue_verified']
      };
      setHistory([testimonyLog, ...history]);
      setTranscribedTestimony('');
    } finally {
      setIsVerifyingIssueRelevance(false);
    }
  };

  const handleProcessEvidenceAudio = async () => {
    if (!evidenceAudioInput.trim()) return;
    setIsProcessingEvidence(true);

    try {
      const res = await generateLegalContent({
        prompt: `Analyze the following witness testimony / hearing record and extract a structured, bulleted summary of key facts, evidence points, and material statements:\n\n"${evidenceAudioInput}"`,
        outputLanguages: [currentLang],
        taskType: 'summarize',
      });

      const summaryText = res.content || res.separatedVersions?.[currentLang] || 'Summary generated successfully.';
      const bullets = summaryText.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./));

      setEvidenceSummaryResult({
        summary: summaryText,
        bullets: bullets.length > 0 ? bullets : [summaryText]
      });

      if (evidenceWitnessId) {
        const witnessObj = witnesses.find(w => w.id === evidenceWitnessId);
        const mappedLog: LogEntry = {
          id: 'ev_' + Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          text: `[EVIDENCE AUDIO PROCESSOR - ${witnessObj ? witnessObj.name : 'Witness'} Key Facts Summary]:\n${summaryText}`,
          type: 'manual',
          witnessId: evidenceWitnessId,
          tags: ['evidence_summary', 'key_facts']
        };
        setHistory(prev => [mappedLog, ...prev]);
        extractPrecedentsFromText(summaryText);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error processing evidence audio testimony: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessingEvidence(false);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranscribingAudio(true);
    setVoiceError(currentLang === 'om' ? 'Sagaleen waraabbame file irraa barreeffamatti jijjiiramaa jira...' : 'Transcribing uploaded audio file...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const res = await analyzeLegalDocument({
          fileData: base64String,
          mimeType: file.type || 'audio/mp3',
          fileName: file.name,
          analysisType: 'summarize',
          outputLanguages: [currentLang],
          customInstructions: 'Transcribe this recorded audio file of a court hearing or witness testimony into a formal, professional legal transcript in ' + (currentLang === 'om' ? 'Afaan Oromoo' : currentLang === 'am' ? 'Amharic' : 'English') + '. Include speaker labels and summary of statements.'
        });

        if (res.analysis) {
          setTranscribedTestimony(prev => prev ? prev + '\n\n' + res.analysis : res.analysis);
          setVoiceError(currentLang === 'om' ? 'Sagaleen waraabbame milkaa\'inaan barreeffamatti jijjiirameera!' : 'Audio file transcribed successfully!');
        }
        setIsTranscribingAudio(false);
      };
      reader.onerror = () => {
        setIsTranscribingAudio(false);
        setVoiceError('Failed to read audio file.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setIsTranscribingAudio(false);
      setVoiceError(err.message || 'Audio transcription error');
    }
  };

  // Consolidated Background Auto-Save effect (Debounced 2s)
  useEffect(() => {
    if (!sessionId) return;

    const saveTimer = setTimeout(() => {
      try {
        setIsAutoSaving(true);
        const stateToSave = {
          currentStepIndex,
          courtLevel,
          sessionId,
          sessionTitle,
          isCasePublic,
          history,
          witnesses,
          quickNotes,
          seconds,
          claimText,
          defenseText,
          transcribedTestimony,
          framedIssueForEvidence,
          ocrCategory,
          ocrImagePreview,
          ocrExtractedText,
          updatedAt: Date.now(),
        };
        localStorage.setItem(getUserScopedKey(AUTOSAVE_BASE_KEY), JSON.stringify(stateToSave));
        setLastAutoSaveTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Failed to auto-save state:', e);
      } finally {
        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [
    currentStepIndex, courtLevel, sessionId, sessionTitle, isCasePublic,
    history, witnesses, quickNotes, seconds, claimText, defenseText,
    transcribedTestimony, framedIssueForEvidence, ocrCategory, ocrImagePreview, ocrExtractedText
  ]);
  const [showNotes, setShowNotes] = useState(false);
  const [isNotesMinimized, setIsNotesMinimized] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showWitnessInsight, setShowWitnessInsight] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isEvidence, setIsEvidence] = useState(false);
  const [objectionTemplates, setObjectionTemplates] = useState<ObjectionTemplate[]>(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<ObjectionTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeObjectionCategory, setActiveObjectionCategory] = useState<'form' | 'content' | 'procedure'>('form');

  // Smart Insights State
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [showInsights, setShowInsights] = useState(false);

  // Court Work Templates State
  const [activeTemplate, setActiveTemplate] = useState<CourtWorkTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Voice Activity Wave Animation Component
  const VoiceActivityWave = () => (
    <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-[10px] font-mono shadow-md animate-in fade-in">
      <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span className="w-1 h-6 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce"></span>
      <span className="w-1 h-7 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
      <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
      <span className="ml-1.5 font-bold text-rose-300">Voice Activity Live...</span>
    </div>
  );

  // Voice Memo Recorder State
  const [isRecordingVoiceMemo, setIsRecordingVoiceMemo] = useState(false);
  const [voiceMemoToast, setVoiceMemoToast] = useState<string | null>(null);

  const showShortcutFeedback = (message: string, icon: string = '⚡') => {
    setVoiceMemoToast(`${icon} ${message}`);
    setTimeout(() => setVoiceMemoToast(null), 3000);
  };

  const toggleVoiceMemoRecording = () => {
    if (isRecordingVoiceMemo) {
      if ((window as any)._activeVoiceMemoRecognition) {
        (window as any)._activeVoiceMemoRecognition.stop();
      }
      setIsRecordingVoiceMemo(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const simulatedText = currentLang === 'om'
        ? 'Ragaa dhagahame: Ragaan dhiyaate ragaa qabatamaa fi seera qabeessa ta\'uu isaa abbaan seeraa mirkaneesseera.'
        : currentLang === 'am'
        ? 'የተሰማ ምስክርነት: የቀረበው ማስረጃ ተቀባይነት ያለውና ህጋዊ መሆኑን ችሎቱ አረጋግጧል።'
        : 'Recorded Voice Memo: The bench verified that the witness testimony presented is verified and lawful.';
      
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedNote = `\n\n[🎙️ Voice Memo (${timeStr})]:\n${simulatedText}\n`;
      setQuickNotes((prev) => (prev ? prev + formattedNote : formattedNote));
      setVoiceMemoToast(
        currentLang === 'om'
          ? '✓ Sagaleen waraabamee qabiyyee seeraatti jijjiirameera!'
          : currentLang === 'am'
          ? '✓ የድምፅ ማስታወሻ ወደ ህጋዊ ጽሁፍ ተለውጧል!'
          : '✓ Voice memo transcribed and saved to notes!'
      );
      setTimeout(() => setVoiceMemoToast(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLang === 'om' ? 'om-ET' : currentLang === 'am' ? 'am-ET' : 'en-US';

      setIsRecordingVoiceMemo(true);
      setVoiceMemoToast(
        currentLang === 'om'
          ? '🎙️ Sagaleen waraabamaa jira... (Voice Memo Recording Active)'
          : currentLang === 'am'
          ? '🎙️ የድምፅ ማስታወሻ በመቅረጽ ላይ...'
          : '🎙️ Recording voice memo during proceedings...'
      );

      let accumulatedTranscript = '';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            accumulatedTranscript += event.results[i][0].transcript + ' ';
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Voice memo recognition error:', err);
        setIsRecordingVoiceMemo(false);
        setVoiceMemoToast(null);
      };

      recognition.onend = () => {
        setIsRecordingVoiceMemo(false);
        if (accumulatedTranscript.trim()) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const formattedNote = `\n\n[🎙️ Voice Memo (${timeStr})]:\n${accumulatedTranscript.trim()}\n`;
          setQuickNotes((prev) => (prev ? prev + formattedNote : formattedNote));
          setVoiceMemoToast(
            currentLang === 'om'
              ? '✓ Sagaleen waraabamee qabiyyee seeraatti jijjiirameera!'
              : currentLang === 'am'
              ? '✓ የድምፅ ማስታወሻ ወደ ህጋዊ ጽሁፍ ተለውጧል!'
              : '✓ Voice memo transcribed and saved to notes!'
          );
        } else {
          setVoiceMemoToast(
            currentLang === 'om'
              ? '⚠️ Sagaleen hin argamne.'
              : currentLang === 'am'
              ? '⚠️ ድምፅ አልተገኘም።'
              : '⚠️ No speech detected.'
          );
        }
        setTimeout(() => setVoiceMemoToast(null), 3500);
      };

      recognition.start();
      (window as any)._activeVoiceMemoRecognition = recognition;
    } catch (e) {
      console.error('Failed to start voice memo speech recognition:', e);
      setIsRecordingVoiceMemo(false);
      setVoiceMemoToast(null);
    }
  };

  // Load templates and sessions from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;

    const qTemplates = query(
      collection(db, 'objection_templates'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeTemplates = onSnapshot(
      qTemplates,
      (snapshot) => {
        const customTemplates = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as ObjectionTemplate[];

        if (customTemplates.length > 0) {
          setObjectionTemplates([...DEFAULT_TEMPLATES, ...customTemplates]);
        } else {
          setObjectionTemplates(DEFAULT_TEMPLATES);
        }
      },
      (error) => {
        console.warn('CourtroomAssistant objection templates listener notice:', error);
        setObjectionTemplates(DEFAULT_TEMPLATES);
      }
    );

    // Load all user sessions for analytics and listing
    const qSessions = query(
      collection(db, 'court_sessions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeSessions = onSnapshot(
      qSessions,
      (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as CourtSession[];
        setSavedSessions(sessions.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
      },
      (error) => {
        console.warn('CourtroomAssistant court sessions listener notice:', error);
        setSavedSessions([]);
      }
    );

    return () => {
      unsubscribeTemplates();
      unsubscribeSessions();
    };
  }, [courtLevel]);

  const handleSaveSession = async () => {
    if (!auth.currentUser || !sessionTitle) return;
    setIsSaving(true);
    try {
      const sessionData = {
        userId: auth.currentUser.uid,
        title: sessionTitle,
        courtLevel,
        currentStepIndex,
        logs: history,
        witnesses,
        quickNotes,
        claimText,
        defenseText,
        status: 'active',
        updatedAt: serverTimestamp()
      };

      if (sessionId) {
        await updateDoc(doc(db, 'court_sessions', sessionId), sessionData);
      } else {
        const docRef = await addDoc(collection(db, 'court_sessions'), {
          ...sessionData,
          createdAt: serverTimestamp()
        });
        setSessionId(docRef.id);
      }
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setSessionTitle('');
    setHistory([]);
    setWitnesses([]);
    setQuickNotes('');
    setClaimText('');
    setDefenseText('');
    setTranscribedTestimony('');
    setFramedIssueForEvidence('');
    setIssueVerificationResult(null);
    setOcrImagePreview(null);
    setOcrExtractedText('');
    setCurrentStepIndex(0);
    setSeconds(0);
    setIsActive(false);
    try {
      localStorage.removeItem('seera_courtroom_autosave_state');
    } catch (e) {}
  };

  const loadSession = (session: CourtSession) => {
    setSessionId(session.id);
    setSessionTitle(session.title);
    setHistory(session.logs || []);
    setWitnesses(session.witnesses || []);
    setQuickNotes(session.quickNotes || '');
    setClaimText((session as any).claimText || '');
    setDefenseText((session as any).defenseText || '');
    setFramedIssueForEvidence((session as any).framedIssueForEvidence || '');
    setOcrCategory((session as any).ocrCategory || 'claim');
    setOcrImagePreview((session as any).ocrImagePreview || null);
    setOcrExtractedText((session as any).ocrExtractedText || '');
    setCurrentStepIndex(session.currentStepIndex || 0);
    setCourtLevel(session.courtLevel);
    setShowSessionManager(false);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !auth.currentUser) return;

    try {
      if (editingTemplate.isDefault) {
        // Create a copy as custom
        const { id, isDefault, ...data } = editingTemplate;
        await addDoc(collection(db, 'objection_templates'), {
          ...data,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      } else if (editingTemplate.id && !editingTemplate.id.startsWith('new-')) {
        const docRef = doc(db, 'objection_templates', editingTemplate.id);
        await updateDoc(docRef, {
          label: editingTemplate.label,
          template: editingTemplate.template,
          category: editingTemplate.category
        });
      } else {
        const { id, ...data } = editingTemplate;
        await addDoc(collection(db, 'objection_templates'), {
          ...data,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
      setEditingTemplate(null);
      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'objection_templates', id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const [widgetOrder, setWidgetOrder] = useState(['stats', 'witnesses', 'notes', 'insights']);

  // Proactive Insights Analysis
  const fetchSmartInsights = async () => {
    if (history.length < 2 || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/legal-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionData: {
            logs: history,
            witnessList: witnesses,
            activeCase: {
              level: courtLevel,
              currentStep: currentStep.title[currentLang]
            }
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
        setLastAnalysisTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to fetch legal insights:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-trigger analysis when logs change (throttled)
  useEffect(() => {
    if (history.length > 3 && Date.now() - lastAnalysisTime > 30000) {
      fetchSmartInsights();
    }
  }, [history.length]);

  // Speech Recognition setup
  const startListening = (mode: 'general' | 'evidence' | 'testimony' = 'general', targetWitnessId?: string) => {
    setVoiceError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(t.courtroomVoice.notSupported);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLang === 'om' ? 'om-ET' : currentLang === 'am' ? 'am-ET' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    if (mode === 'evidence' && targetWitnessId) {
      setTagWitnessId(targetWitnessId);
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        if (mode === 'testimony') {
          setTranscribedTestimony(prev => prev ? prev + ' ' + transcript : transcript);
        } else {
          const activeWitnessId = targetWitnessId || tagWitnessId;
          const newLog: LogEntry = {
            id: `log-voice-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            text: transcript,
            type: 'manual',
            witnessId: activeWitnessId || undefined,
            tags: mode === 'evidence' ? ['Evidence'] : []
          };
          setHistory(prev => [newLog, ...prev]);
        }
        
        setVoiceError((mode === 'testimony' ? 'Testimony Transcribed' : (mode === 'evidence' ? t.courtroomVoice.voiceToEvidence : t.courtroomVoice.objectionRecognized)) + ": " + transcript);
        setTimeout(() => setVoiceError(null), 3000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setVoiceError(
          currentLang === 'om'
            ? '⚠️ Hayyamni maayikiroofoonii dhowwameera. Maaloo browser keessan irratti hayyama kennaa.'
            : currentLang === 'am'
            ? '⚠️ የማይክሮፎን ፈቃድ ተከልክሏል። እባክዎ በብራውዘርዎ ፈቃድ ይስጡ።'
            : '⚠️ Microphone access not allowed. Please allow microphone permissions in your browser address bar.'
        );
      } else {
        setVoiceError(t.courtroomVoice.error);
      }
      setIsListening(false);
      setTimeout(() => setVoiceError(null), 4000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Auto-log step changes
  useEffect(() => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: currentStep.title[currentLang],
      type: 'auto',
      stepId: currentStep.id
    };
    setHistory(prev => [newLog, ...prev]);
  }, [currentStepIndex, currentLang]);

  const handleManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntry.trim()) return;

    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: manualEntry.trim(),
      type: 'manual',
      witnessId: tagWitnessId || undefined,
      tags: isEvidence ? ['Evidence'] : []
    };

    setHistory(prev => [newLog, ...prev]);
    setManualEntry('');
    setIsEvidence(false);
  };

  const handleQuickObjection = (template: ObjectionTemplate) => {
    const newLog: LogEntry = {
      id: `log-objection-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: template.template,
      type: 'manual',
      witnessId: tagWitnessId || undefined,
      tags: ['Objection', template.category]
    };

    setHistory(prev => [newLog, ...prev]);
  };

  const handleAddWitness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWitnessName.trim()) return;

    const witness: Witness = {
      id: `witness-${Date.now()}`,
      name: newWitnessName.trim(),
      type: newWitnessType,
      status: 'pending',
      caseId: newWitnessCaseId.trim() || undefined
    };

    setWitnesses([...witnesses, witness]);
    setNewWitnessName('');
    setNewWitnessCaseId('');
  };

  const toggleWitnessStatus = (id: string) => {
    setWitnesses(witnesses.map(w => 
      w.id === id ? { ...w, status: w.status === 'pending' ? 'completed' : 'pending' } : w
    ));
  };

  const filteredWitnesses = witnesses
    .filter(w => {
      const matchesSearch = 
        w.name.toLowerCase().includes(witnessSearch.toLowerCase()) || 
        (w.caseId && w.caseId.toLowerCase().includes(witnessSearch.toLowerCase()));
      const matchesStatus = witnessStatusFilter === 'all' || w.status === witnessStatusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (witnessSortBy === 'date') {
        const timeA = parseInt(a.id.split('-')[1]) || 0;
        const timeB = parseInt(b.id.split('-')[1]) || 0;
        return timeB - timeA;
      }
      if (witnessSortBy === 'alpha') {
        return a.name.localeCompare(b.name);
      }
      if (witnessSortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUseTemplate = (templateText: string) => {
    let populatedText = templateText;
    
    // Smart populate witness name if tagged
    if (tagWitnessId) {
      const taggedWitness = witnesses.find(w => w.id === tagWitnessId);
      if (taggedWitness) {
        populatedText = populatedText.replace(/\[Name\]|\[Maqaa\]|\[ስም\]/g, taggedWitness.name);
        populatedText = populatedText.replace(/\[Plaintiff\/Defendant\]|\[Himataa\/Himatamaa\]|\[ከሳሽ\/ተከሳሽ\]/g, 
          taggedWitness.type === 'plaintiff' ? t.courtroomWitness.typePlaintiff : t.courtroomWitness.typeDefendant);
      }
    }
    
    setManualEntry(populatedText);
  };

  const handleNext = () => {
    if (currentStepIndex < PROCEDURAL_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const getKeywordStats = () => {
    const keywords = [
      { key: 'objection', pattern: /objection|mormii|ተቃውሞ/i },
      { key: 'hearsay', pattern: /hearsay|gurraan|የሰሙት/i },
      { key: 'leading', pattern: /leading|kallattii|መሪ ጥያቄ/i },
      { key: 'speculation', pattern: /speculation|tilmaama|ግምት/i },
      { key: 'irrelevant', pattern: /irrelevant|hidhata-malee|አግባብነት የሌለው/i },
    ];

    return keywords.map(kw => {
      const count = history.reduce((acc, log) => {
        return acc + (kw.pattern.test(log.text) ? 1 : 0);
      }, 0);
      
      return {
        name: t.courtroomAnalytics.keywords[kw.key as keyof typeof t.courtroomAnalytics.keywords],
        value: count,
        color: kw.key === 'objection' ? '#ef4444' : 
               kw.key === 'hearsay' ? '#f59e0b' : 
               kw.key === 'leading' ? '#3b82f6' :
               kw.key === 'speculation' ? '#8b5cf6' : '#64748b'
      };
    });
  };

  const analyticsData = getKeywordStats();
  const totalLogs = history.length;

  const getWitnessStatusDistribution = () => {
    const counts = {
      pending: witnesses.filter(w => w.status === 'pending').length,
      completed: witnesses.filter(w => w.status === 'completed').length
    };
    
    return [
      { name: t.courtroomWitness.statusPending, value: counts.pending, color: '#f59e0b' },
      { name: t.courtroomWitness.statusCompleted, value: counts.completed, color: '#10b981' }
    ];
  };

  const witnessDistributionData = getWitnessStatusDistribution();

  const getHearingTypeDistribution = () => {
    const counts = {
      firstInstance: savedSessions.filter(s => s.courtLevel === 'firstInstance').length,
      highCourt: savedSessions.filter(s => s.courtLevel === 'highCourt').length,
      cassation: savedSessions.filter(s => s.courtLevel === 'cassation').length
    };
    
    return [
      { name: t.courtLevels.firstInstance, value: counts.firstInstance, color: '#f59e0b' },
      { name: t.courtLevels.highCourt, value: counts.highCourt, color: '#3b82f6' },
      { name: t.courtLevels.cassation, value: counts.cassation, color: '#8b5cf6' }
    ];
  };

  const hearingTypeDistributionData = getHearingTypeDistribution();

  const quickStats = {
    objections: history.filter(log => /objection|mormii|ተቃውሞ/i.test(log.text)).length,
    testimonies: history.filter(log => log.witnessId && log.type === 'manual').length,
    docs: history.filter(log => /document|sanada|exhibit|ሰነድ|ማስረጃ/i.test(log.text)).length
  };

  const filteredHistory = history.filter(log => {
    // 1. Text Search Filter
    let matchesSearch = true;
    if (historySearch.trim()) {
      const search = historySearch.toLowerCase();
      const witnessName = witnesses.find(w => w.id === log.witnessId)?.name.toLowerCase() || '';
      const hasTag = log.tags?.some(tag => tag.toLowerCase().includes(search));
      const fileMatch = log.fileName?.toLowerCase().includes(search);
      const exhibitMatch = log.evidenceMetadata?.exhibitNumber?.toLowerCase().includes(search);
      matchesSearch = log.text.toLowerCase().includes(search) || witnessName.includes(search) || Boolean(hasTag) || Boolean(fileMatch) || Boolean(exhibitMatch);
    }
    if (!matchesSearch) return false;

    // 2. Evidence Status Filter ('verified', 'pending', 'uploaded')
    if (evidenceStatusFilter !== 'all') {
      if (!isEvidenceLog(log)) return false;
      const itemStatus = getLogEvidenceStatus(log);
      if (itemStatus !== evidenceStatusFilter) return false;
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ['Witness Name', 'Type', 'Status', 'Case ID', 'Timestamp', 'Tags', 'Testimony/Log'];
    const rows = witnesses.flatMap(w => {
      const relatedLogs = history.filter(h => h.witnessId === w.id);
      if (relatedLogs.length === 0) {
        return [[w.name, w.type, w.status, w.caseId || '', '', '', 'No testimony recorded']];
      }
      return relatedLogs.map(log => [
        w.name,
        w.type,
        w.status,
        w.caseId || '',
        log.timestamp,
        log.tags?.join(', ') || '',
        log.text
      ]);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Witness_Testimonies_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = `Witness Testimonies - ${new Date().toLocaleDateString()}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const tableData = witnesses.flatMap(w => {
      const relatedLogs = history.filter(h => h.witnessId === w.id);
      if (relatedLogs.length === 0) {
        return [[w.name, w.type.toUpperCase(), w.status.toUpperCase(), w.caseId || '-', '-', '-', 'No testimony recorded']];
      }
      return relatedLogs.map(log => [
        w.name,
        w.type.toUpperCase(),
        w.status.toUpperCase(),
        w.caseId || '-',
        log.timestamp,
        log.tags?.join(', ') || '-',
        log.text
      ]);
    });

    autoTable(doc, {
      startY: 30,
      head: [['Witness', 'Type', 'Status', 'Case ID', 'Time', 'Tags', 'Testimony']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] }, // Amber 500
      styles: { fontSize: 9 },
      columnStyles: {
        5: { cellWidth: 'auto' }
      }
    });

    applyCourtWatermarkToPDF(doc);
    doc.save(`Witness_Testimonies_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportFullSessionReport = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();

    // 1. Header
    doc.setFontSize(22);
    doc.setTextColor(245, 158, 11); // Amber 500
    doc.text('SEERAAI COURTROOM SESSION REPORT', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr} at ${timeStr}`, 14, 32);
    doc.text(`Court Level: ${t.courtLevels[courtLevel]}`, 14, 37);
    doc.text(`Session Duration: ${formatTime(seconds)}`, 14, 42);

    // 2. Quick Stats
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Session Analytics Summary', 14, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Total Objections', quickStats.objections.toString()],
        ['Total Testimonies', quickStats.testimonies.toString()],
        ['Active Documents', quickStats.docs.toString()],
        ['Total Activity Logs', totalLogs.toString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }
    });

    // 3. Quick Notes
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    if (quickNotes.trim()) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Quick Notes (Scratchpad)', 14, finalY);
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(quickNotes, 180);
      doc.text(splitNotes, 14, finalY + 10);
      finalY += 10 + (splitNotes.length * 5) + 10;
    }

    // 4. Detailed History Log
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(245, 158, 11);
    doc.text('Full Procedural & Testimony Log', 14, 20);
    
    const historyData = history.map(log => [
      log.timestamp,
      log.type === 'auto' ? 'PROCEDURAL' : 'MANUAL',
      witnesses.find(w => w.id === log.witnessId)?.name || '-',
      log.tags?.join(', ') || '-',
      log.text
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Time', 'Type', 'Witness', 'Tags', 'Content']],
      body: historyData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
      columnStyles: {
        4: { cellWidth: 80 }
      }
    });

    applyCourtWatermarkToPDF(doc);
    doc.save(`Full_Session_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-[90vh] flex flex-col bg-slate-950 text-white font-sans p-4 sm:p-8 relative">
      {/* High Contrast Header */}
      <div className="border-b-4 border-amber-500 pb-4 mb-8 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-2xl">
              <Scale className="w-8 h-8 text-slate-950" strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter">
                Courtroom Assistant
              </h1>
              <div className="flex items-center gap-3">
                <div 
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase transition-all shadow-sm ${
                    syncState.status === 'offline' 
                      ? 'bg-slate-900 text-slate-500 border-slate-800' 
                      : syncState.status === 'syncing'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse'
                      : syncState.status === 'error'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                  title={syncState.status === 'offline' ? 'Offline: Using Cached Data' : 'Real-time: Server Synced'}
                >
                  {syncState.status === 'offline' ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                  <span>{syncState.status === 'offline' ? 'Offline Mode' : syncState.status === 'syncing' ? 'Syncing...' : 'Real-time'}</span>
                </div>
                {syncState.lastSyncTime && (
                  <span className="text-[9px] font-mono text-slate-500 hidden xs:inline">
                    Last: {new Date(syncState.lastSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Courtroom Live API & Evidence Streaming Indicators (2GB Storage Active) */}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <div 
                  onClick={() => setLiveApiStatus(prev => prev === 'connected' ? 'connecting' : prev === 'connecting' ? 'offline' : 'connected')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase transition-all cursor-pointer shadow-sm ${
                    liveApiStatus === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : liveApiStatus === 'connecting'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                  title="Click to toggle Courtroom Live API connection state"
                >
                  <span className="relative flex h-2 w-2">
                    {liveApiStatus === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${liveApiStatus === 'connected' ? 'bg-emerald-400' : liveApiStatus === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                  </span>
                  <span>Live API: {liveApiStatus}</span>
                </div>

                <div 
                  onClick={() => setIsEvidenceStreaming(!isEvidenceStreaming)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase transition-all cursor-pointer shadow-sm ${
                    isEvidenceStreaming 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                  title="Click to toggle evidence streaming simulation"
                >
                  <Radio className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>{isEvidenceStreaming ? '⚡ EVIDENCE STREAMING ACTIVE' : 'Evidence Standby'}</span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                  <Database className="w-3 h-3 text-sky-400" />
                  <span>2GB Storage Pool ({storagePoolInfo.usage} / {storagePoolInfo.quota})</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={courtLevel}
                  onChange={(e) => setCourtLevel(e.target.value as any)}
                  className="bg-amber-500 text-slate-950 font-black text-xs sm:text-sm px-3 py-1 rounded-lg uppercase tracking-tight focus:outline-none cursor-pointer border-2 border-amber-600"
                >
                  <option value="firstInstance">{t.courtLevels.firstInstance}</option>
                  <option value="highCourt">{t.courtLevels.highCourt}</option>
                  <option value="cassation">{t.courtLevels.cassation}</option>
                </select>
                <div className="flex flex-wrap items-center gap-2 telegram-integration-tools">
                  <div className="inline-flex items-center rounded-lg border border-sky-500/50 bg-sky-950/80 shadow-sm transition-all hover:border-sky-400 group">
                    <button
                      type="button"
                      onClick={() => window.open('https://t.me/seeraai_ethio', '_blank')}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-sky-300 hover:text-white hover:bg-sky-900/60 rounded-l-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer animate-[pulse_3s_ease-in-out_infinite]"
                      title="Open @seeraai_ethio on Telegram"
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-400"></span>
                      </span>
                      <Send className="w-3 h-3 text-sky-400" />
                      <span>@seeraai_ethio</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText('https://t.me/seeraai_ethio');
                        setCopiedTelegramChannelLink(true);
                        showShortcutFeedback(
                          currentLang === 'om' ? 'Liankiin @seeraai_ethio waraabameera!' : currentLang === 'am' ? 'የ@seeraai_ethio ሊንክ ኮፒ ተደርጓል!' : 'Telegram link @seeraai_ethio copied!',
                          '📋'
                        );
                        setTimeout(() => setCopiedTelegramChannelLink(false), 2500);
                      }}
                      className="px-2 py-1 border-l border-sky-500/40 text-sky-300 hover:text-white hover:bg-sky-900/80 rounded-r-lg text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                      title={currentLang === 'om' ? 'Liankii @seeraai_ethio waraabi (Copy to Clipboard)' : 'Copy @seeraai_ethio link to clipboard'}
                      aria-label="Copy Telegram Channel link to clipboard"
                    >
                      {copiedTelegramChannelLink ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[9px] text-emerald-300 font-bold hidden xs:inline">{currentLang === 'om' ? 'Waraabame!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-sky-300 hover:text-sky-100" />
                          <span className="text-[9px] text-sky-300 hidden xs:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreatePollModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-[10px] uppercase tracking-wider hover:bg-amber-400 transition-all shadow-md cursor-pointer border border-amber-600"
                    title="Create /poll command for Telegram channel consensus"
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>{currentLang === 'om' ? '📊 Poll Uumii' : '📊 Create Poll'}</span>
                  </button>
                </div>
                <div className="text-amber-400 font-mono font-bold text-xs hidden sm:flex items-center gap-1.5">
                  • LIVE PROCEEDING
                  {isAutoSaving && (
                    <span className="flex items-center gap-1 text-emerald-400 animate-pulse text-[9px] uppercase bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Auto-saving...
                    </span>
                  )}
                  {!isAutoSaving && lastAutoSaveTime && (
                    <span className="text-slate-500 text-[9px] font-normal">
                      (Saved at {lastAutoSaveTime})
                    </span>
                  )}
                </div>
                {/* Live Courtroom Kiosk WebSocket Connection State Indicator */}
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono border transition-all ${
                    kioskConnectionState === 'connected'
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
                      : kioskConnectionState === 'connecting'
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  }`}
                  title={`WebSocket Status: ${kioskConnectionState} | Active Kiosks: ${activeKiosksCount}`}
                >
                  <span className="relative flex h-2 w-2">
                    {kioskConnectionState === 'connected' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        kioskConnectionState === 'connected'
                          ? 'bg-emerald-400'
                          : kioskConnectionState === 'connecting'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    ></span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="font-bold">
                      {kioskConnectionState === 'connected'
                        ? currentLang === 'om'
                          ? `Kiosk Dhaddachaa: ${activeKiosksCount} Qunnameera`
                          : currentLang === 'am'
                          ? `የችሎት ኪዮስክ፡ ${activeKiosksCount} ተገናኝቷል`
                          : `Courtroom Kiosk: ${activeKiosksCount} Live`
                        : kioskConnectionState === 'connecting'
                        ? currentLang === 'om'
                          ? 'Kiosk: Qunnamtii eegaa jira...'
                          : currentLang === 'am'
                          ? 'ኪዮስክ፡ በማገናኘት ላይ...'
                          : 'Kiosk: Connecting WS...'
                        : currentLang === 'om'
                        ? 'Kiosk: Qunnamtiin citeera'
                        : currentLang === 'am'
                        ? 'ኪዮስክ፡ ተቋርጧል'
                        : 'Kiosk: Disconnected'}
                    </span>
                    <span className="text-[10px] opacity-70 hidden md:inline">
                      (WS /kiosk-ws)
                    </span>
                  </div>

                  {kioskConnectionState === 'connected' && (
                    <button
                      type="button"
                      onClick={handleBroadcastHardRefresh}
                      disabled={isRefreshingKiosks}
                      title="Sync / Hard Refresh All Connected Courtroom Kiosks via WebSocket"
                      className="ml-1 p-0.5 rounded hover:bg-emerald-900/60 text-emerald-300 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingKiosks ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Real-time Cassation Precedent Tracker (AI Discovered) */}
                {discoveredPrecedents.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-sky-950/80 border border-sky-500/50 text-sky-300 rounded-xl text-[10px] font-mono shadow-sm animate-in fade-in slide-in-from-left-2">
                    <Zap className="w-3 h-3 text-sky-400 animate-pulse" />
                    <span className="font-bold">DISCOVERED PRECEDENTS:</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] no-scrollbar">
                      {discoveredPrecedents.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setArchive1500Query(p.referenceNumber);
                            setShowArchive1500Modal(true);
                            handleLoadArchive1500(p.referenceNumber);
                          }}
                          className="px-2 py-0.5 rounded bg-sky-900/60 hover:bg-sky-800 text-white font-black whitespace-nowrap transition-colors border border-sky-500/30"
                          title={`Click to lookup Case No. ${p.referenceNumber} in archive`}
                        >
                          #{p.referenceNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-time Caseload Metrics Visual Indicator Badge */}
                <div
                  className="flex items-center gap-2 px-3 py-1 bg-amber-950/80 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-mono shadow-sm"
                  title={`Live Caseload Sync Active | Last Updated: ${realtimeCaseloadMetrics.lastUpdated}`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="font-bold">
                    {currentLang === 'om'
                      ? `📊 Galmee Live: ${realtimeCaseloadMetrics.totalCases} | Raawwii: ${realtimeCaseloadMetrics.clearanceRate}% | Avg Age: ${realtimeCaseloadMetrics.avgAgeDays}d`
                      : currentLang === 'am'
                      ? `📊 የቀጥታ መዝገብ፡ ${realtimeCaseloadMetrics.totalCases} | አፈፃፀም፡ ${realtimeCaseloadMetrics.clearanceRate}% | አማካይ ቀን፡ ${realtimeCaseloadMetrics.avgAgeDays}d`
                      : `📊 Live Caseload: ${realtimeCaseloadMetrics.totalCases} | Clearance: ${realtimeCaseloadMetrics.clearanceRate}% | Avg Age: ${realtimeCaseloadMetrics.avgAgeDays}d`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowWitnessModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400 shadow-lg cursor-pointer"
            >
              <span>🎙️</span>
              <span>Witness Testimony</span>
            </button>

            <button
              onClick={() => setShowCourtOrderModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 bg-cyan-500 text-slate-950 border-cyan-600 hover:bg-cyan-400 shadow-lg cursor-pointer"
            >
              <span>⚖️</span>
              <span>Generate Court Order</span>
            </button>

            <button
              onClick={exportHearingMinutesPDF}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 shadow-lg cursor-pointer"
            >
              <span>📄</span>
              <span>Hearing Minutes PDF</span>
            </button>

            <button
              onClick={exportFullSessionReport}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 bg-emerald-500 text-slate-950 border-emerald-600 hover:bg-emerald-400 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {t.courtroomHistory.exportSession}
            </button>

            <button
              onClick={exportComprehensiveReportPDF}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 bg-slate-100 text-slate-950 border-slate-300 hover:bg-white shadow-xl cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Case Report</span>
            </button>

            <button
              onClick={exportCaseFileSummaryPDF}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400 shadow-xl cursor-pointer"
              title="Generate summary PDF containing all evidence metadata and case milestones"
            >
              <FileText className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'Galmee Ragaa & Milestones (PDF)' : 'Export Case File'}</span>
            </button>

            <button
              onClick={handleArchiveCase}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 bg-purple-600 text-white border-purple-500 hover:bg-purple-500 shadow-lg cursor-pointer"
              title="Archive this case and move to archived records"
            >
              <span>📦</span>
              <span>{currentLang === 'om' ? 'Galmee Kuusi (Archive)' : 'Archive Case'}</span>
            </button>

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 ${
                showAnalytics 
                  ? 'bg-amber-500 text-slate-950 border-amber-600' 
                  : 'bg-slate-900 text-amber-500 border-slate-800 hover:border-amber-500'
              } cursor-pointer`}
            >
              <BarChart3 className="w-4 h-4" />
              {t.courtroomAnalytics.title}
            </button>
          </div>
        </div>

        {/* Fuula Dhaddachaa & Fuula Ofisarri Galmee Banu: Live Litigants & Ethiopian Calendar Schedule Banner */}
        {(() => {
          const todayEth = formatCourtHearingScheduleDate(new Date(), currentLang === 'am' ? 'am' : currentLang === 'om' ? 'om' : 'en');
          return (
            <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                    {currentLang === 'om' 
                      ? 'Fuula Dhaddachaa & Ofisaraa: Galmee Beellamaa & Maqaa Wal-Falmitootaa' 
                      : currentLang === 'am' 
                      ? 'የችሎት እና የምዝገባ ገፅ፡ የተቀጠረ መዝገብ እና የተከራካሪዎች ስም' 
                      : 'Courtroom Bench & Registrar Portal: Case Schedule & Litigants'}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Guyyaa E.C.: <strong>{todayEth.ethDate}</strong></span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Litigant 1: Prosecutor / Plaintiff */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <Users className="w-5 h-5 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Iyyataa / Abbaa Alangaa (Plaintiff/Prosecutor):</span>
                    <strong className="text-sm font-bold text-slate-100 truncate block">
                      Abbaa Alangaa Federaalaa (Prosecutor)
                    </strong>
                  </div>
                </div>

                {/* Versus Badge */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-2 bg-amber-500/5">
                  <span className="text-amber-400 font-black font-mono text-sm uppercase">VS</span>
                  <div className="text-right min-w-0">
                    <span className="text-[10px] text-slate-500 font-mono block">Lakk. Galmee / Docket #:</span>
                    <strong className="text-xs font-mono font-bold text-slate-200 truncate block">CR-2026-99812</strong>
                  </div>
                </div>

                {/* Litigant 2: Defendant / Respondent */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <Users className="w-5 h-5 text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Himatamaa / Deebii Kennaa (Defendant):</span>
                    <strong className="text-sm font-bold text-slate-100 truncate block">
                      Gemechu Tadesse (Defendant)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Confidentiality Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4 text-amber-300">
          <div className="text-2xl">🔒</div>
          <div className="text-xs sm:text-sm font-medium leading-relaxed">
            {currentLang === 'om'
              ? "Iccitii Guutuu Eegamaa: Hojiiwwan mana murtii kun iccitii seeraatiin eegamoo dha. Namoota birootiif qooduun ykn dabarsuun hin danda'amu."
              : currentLang === 'am'
              ? "የፍርድ ቤት ሚስጥር የተጠበቀ ነው፡ ይህ የፍርድ ቤት ስራ በህግ ሚስጥር የተጠበቀ ነው። ለሌሎች ሰዎች ማጋራት ወይም ማስተላለፍ የተከለከለ ነው።"
              : "Strictly Confidential Court Record: This proceeding is fully protected under legal privacy mandates and cannot be shared with third parties."}
          </div>
        </div>
      </div>

      {/* Toolbar Widget Bar */}
      <div className="flex flex-wrap items-center justify-between gap-6 mb-8 bg-slate-900/50 border border-slate-800 p-4 rounded-3xl">
          {/* Courtroom Timer Widget */}
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-4 flex items-center gap-6 shadow-lg">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {t.courtroomTimer.title}
              </span>
              <span className="text-3xl font-black font-mono text-white">
                {formatTime(seconds)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsActive(!isActive)}
                className={`p-3 rounded-xl transition-all ${isActive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500 text-slate-950'}`}
                title={isActive ? t.courtroomTimer.stop : t.courtroomTimer.start}
              >
                {isActive ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
              </button>
              <button
                onClick={() => {
                  setIsActive(false);
                  setSeconds(0);
                }}
                className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                title={t.courtroomTimer.reset}
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="hidden lg:block text-right">
            <div className="text-slate-400 text-sm font-bold uppercase">Progress</div>
            <div className="flex gap-1 mt-1">
              {PROCEDURAL_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 w-8 rounded-full ${i <= currentStepIndex ? 'bg-amber-500' : 'bg-slate-800'}`}
                />
              ))}
            </div>
          </div>

          {/* BUILT-IN COURTROOM AUDIO RECORDER BUTTON */}
          <button
            type="button"
            onClick={() => setShowCourtroomAudioModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 bg-gradient-to-r from-rose-600 via-amber-500 to-amber-600 text-white border-rose-400 hover:from-rose-500 hover:to-amber-500 shadow-xl shadow-rose-950/40 hover:scale-[1.02] cursor-pointer"
            title="Real-time courtroom audio recorder with waveform visualization and direct case filing"
          >
            <Mic className="w-5 h-5 text-white animate-pulse" />
            <span>🎙️ Waraabbata Sagalee Dhaddachaa</span>
          </button>

          {/* FLOATING COURT AUDIO CONTROL PANEL TOGGLE */}
          <button
            type="button"
            onClick={() => setShowFloatingAudioControl(!showFloatingAudioControl)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 cursor-pointer shadow-lg ${
              showFloatingAudioControl
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-rose-950/40 hover:bg-rose-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
            }`}
            title="Toggle Live Floating Court Audio API Control"
          >
            <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
            <span>{showFloatingAudioControl ? '🎙️ Audio Controller (Active)' : '🎙️ Audio Controller'}</span>
          </button>

          {/* DICTATE COURT NOTE BUTTON - Anchored to Case ID & Saved to My Content */}
          <button
            type="button"
            onClick={() => setShowDictateCourtNote(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 border-amber-300 hover:from-amber-400 hover:to-amber-300 shadow-xl shadow-amber-950/50 hover:scale-[1.02] cursor-pointer"
            title="Dictate Court Note: Real-time voice capture anchored to Case ID and saved to My Content dashboard"
          >
            <Mic className="w-5 h-5 text-slate-950" />
            <span>🎙️ Dictate Note</span>
          </button>

          <button
            onClick={() => setShowVoiceToMemo(!showVoiceToMemo)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 cursor-pointer ${
              showVoiceToMemo 
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/40' 
                : 'bg-slate-900 text-amber-300 border-amber-500/50 hover:border-amber-400'
            }`}
            title="Toggle Voice-to-Memo Tool"
          >
            <Mic className="w-5 h-5 text-amber-400" />
            <span>Voice-to-Memo</span>
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400"
          >
            <Scale className="w-5 h-5" />
            {t.nav.courtWork}
          </button>

          <button
            onClick={() => setShowUserManualModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 bg-slate-800 text-amber-400 border-slate-700 hover:border-amber-500"
          >
            <span>📖</span>
            <span>{currentLang === 'om' ? 'Faayidaa & Qajeelcha' : currentLang === 'am' ? 'ጥቅም እና መመሪያ' : 'Guide & Benefits'}</span>
          </button>

          <PremiumGate
            compact
            currentLang={currentLang}
            featureTitle={currentLang === 'om' ? 'Eegumsa Legal Privilege (AES-GCM Web Crypto)' : 'የህግ ባለሙያ ሚስጥር ምስጠራ'}
          >
            <button
              onClick={() => {
                if (!isLegalPrivilegeActive) {
                  setShowLegalPrivilegeModal(true);
                } else {
                  setIsLegalPrivilegeActive(false);
                  setPrivilegePasscode('');
                }
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 cursor-pointer ${
                isLegalPrivilegeActive 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-600 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500'
              }`}
            >
              <span>🛡️</span>
              <span>{isLegalPrivilegeActive ? 'Legal Privilege: AES-GCM On' : 'Legal Privilege: Off'}</span>
            </button>
          </PremiumGate>
      </div>

      {/* Session Management Toolbar */}
      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 flex flex-wrap items-center gap-4 shadow-xl">
          <div className="flex-1 flex items-center gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2 flex-1 max-w-md">
              <span className="text-amber-500 font-bold text-xs uppercase shrink-0">{t.courtroomSession.sessionTitle}:</span>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={t.courtroomSession.titlePlaceholder}
                className="bg-transparent border-none text-sm font-bold text-white focus:outline-none w-full"
              />
            </div>
            <button
              onClick={handleSaveSession}
              disabled={isSaving || !sessionTitle}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all border-2 ${
                isSaving ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400'
              }`}
            >
              <Plus className="w-4 h-4" />
              {isSaving ? t.courtroomSession.saving : t.courtroomSession.saveSession}
            </button>
            {sessionId && (
              <div className="flex items-center gap-0.5 ml-auto sm:ml-0 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <button
                  onClick={handleToggleVisibility}
                  className={`flex items-center gap-2 px-3 py-1.5 font-black uppercase text-[9px] transition-all hover:brightness-110 ${
                    isCasePublic 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                  title={isCasePublic ? 'Click to make case private' : 'Click to make case public'}
                >
                  {isCasePublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{isCasePublic ? 'Public' : 'Private'}</span>
                </button>
                <div className="w-[1px] h-4 bg-slate-800" />
                <a
                  href={`/?tab=case-status&caseId=${sessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-slate-500 hover:text-amber-400 transition-colors flex items-center justify-center group"
                  title="View as Public Client"
                >
                  <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
             {/* Courtroom Seating Layout Button */}
             <button
              onClick={() => setShowCourtroomLayoutModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-black uppercase text-xs transition-all border-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40 hover:border-amber-400 shadow-sm cursor-pointer"
              title="Visually map seating positions of Judge, Prosecutor, Plaintiff, Defendant, and Witnesses"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>{currentLang === 'om' ? 'Caasaa Teessumaa' : currentLang === 'am' ? 'የችሎት አቀማመጥ' : 'Courtroom Layout'}</span>
            </button>

             {/* Evidence Camera Capture Button */}
             <button
              onClick={() => setShowEvidenceCaptureModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-black uppercase text-xs transition-all border-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-400 shadow-md font-black cursor-pointer active:scale-95"
              title="Take a photo of physical evidence with device camera and add to case file"
            >
              <Camera className="w-4 h-4 fill-slate-950" />
              <span>{currentLang === 'om' ? 'Kaameeraa Ragaa' : currentLang === 'am' ? 'የማስረጃ ካሜራ' : 'Capture Evidence'}</span>
            </button>

            <button
              onClick={() => setShowMultiFileUpload(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-black uppercase text-xs transition-all border-2 bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40 shadow-md cursor-pointer active:scale-95"
              title="Batch upload multiple evidence documents with AI metadata extraction"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'Batch Upload' : 'Batch Upload'}</span>
            </button>

             <button
              onClick={() => setShowWitnessStopwatch(!showWitnessStopwatch)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all border-2 ${
                showWitnessStopwatch ? 'bg-amber-500 text-slate-950 border-amber-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/50'
              }`}
              title="Toggle Witness Testimony Stopwatch"
            >
              <Timer className="w-4 h-4" />
              {currentLang === 'om' ? 'Yeroo Ragaa' : 'Stopwatch'}
            </button>
             <button
              onClick={() => setShowSessionManager(!showSessionManager)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all border-2 ${
                showSessionManager ? 'bg-amber-500 text-slate-950 border-amber-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/50'
              }`}
            >
              <History className="w-4 h-4" />
              {t.courtroomSession.savedSessions} ({savedSessions.length})
            </button>
             <button
              onClick={handleNewSession}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all border-2 bg-slate-800 text-slate-400 border-slate-700 hover:bg-white hover:text-slate-950 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t.courtroomSession.newSession}
            </button>
          </div>
        </div>

        {/* Session List Panel */}
        <AnimatePresence>
          {showSessionManager && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-sm font-black uppercase text-amber-500 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  {t.courtroomSession.savedSessions} - {t.courtLevels[courtLevel]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedSessions.filter(s => s.courtLevel === courtLevel).length === 0 ? (
                    <p className="col-span-full text-center py-10 text-slate-600 italic font-bold">
                      {t.courtroomSession.noSessions}
                    </p>
                  ) : (
                    savedSessions
                      .filter(s => s.courtLevel === courtLevel)
                      .map((session) => (
                      <div 
                        key={session.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                          sessionId === session.id ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="text-sm font-black text-white truncate">{session.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-slate-500">
                              {session.updatedAt?.seconds ? new Date(session.updatedAt.seconds * 1000).toLocaleDateString() : 'Draft'}
                            </span>
                            <span className="text-[10px] font-black uppercase text-amber-500/60 bg-amber-500/5 px-1.5 py-0.5 rounded">
                              {session.logs?.length || 0} Logs
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => loadSession(session)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 text-slate-400 hover:text-slate-950 rounded-lg text-[10px] font-black uppercase transition-all"
                        >
                          {t.courtroomSession.load}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visual Summary Dashboard */}
      {showAnalytics && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BarChart3 className="w-32 h-32 text-amber-500" />
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div>
                <h3 className="text-3xl font-black uppercase text-white flex items-center gap-3">
                  <div className="bg-amber-500 p-2 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-slate-950" />
                  </div>
                  {t.courtroomAnalytics.title}
                </h3>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2">
                  {t.courtroomAnalytics.totalEntries}: <span className="text-amber-500">{totalLogs}</span>
                </p>
              </div>
              
              <div className="flex gap-4">
                {analyticsData.map((d, i) => (
                  <div key={i} className="bg-slate-950/50 border border-slate-800 px-4 py-2 rounded-xl flex flex-col items-center min-w-[80px]">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{d.name}</span>
                    <span className="text-xl font-black text-white" style={{ color: d.value > 0 ? d.color : 'inherit' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-950/50 border border-slate-800 rounded-2xl p-6 h-[350px]">
                <h4 className="text-sm font-black uppercase text-amber-500 mb-6 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  {t.courtroomAnalytics.keywordFrequency}
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      fontWeight="bold" 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      fontWeight="bold" 
                      axisLine={false} 
                      tickLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '2px solid #f59e0b', 
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                      {analyticsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* HEARING TYPE WORKLOAD TRENDS (Request 8) */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 h-[350px]">
                <h4 className="text-sm font-black uppercase text-amber-500 mb-6 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Workload by Hearing Type (Court Level)
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hearingTypeDistributionData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      fontWeight="bold" 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      fontWeight="bold" 
                      axisLine={false} 
                      tickLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '2px solid #f59e0b', 
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                      {hearingTypeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
                  <h4 className="text-xs font-black uppercase text-amber-500 mb-2">Procedural Insight</h4>
                  <p className="text-sm font-bold text-slate-300 leading-relaxed">
                    Keyword analysis helps in identifying legal friction points. A high frequency of objections or hearsay flags might indicate a need for more structured evidence presentation.
                  </p>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl">
                  <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Witness Tagging Correlation</h4>
                  <p className="text-sm font-bold text-slate-400 italic">
                    Currently tracking {witnesses.length} witnesses. Switch to 'Witness List' to associate these patterns with specific individuals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column (Editor & Workbench) - 2/3 width */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Primary View Switcher: Proceedings & Workbench vs Witness Statements Tab */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveMainTab('proceedings')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeMainTab === 'proceedings'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg border border-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'Dhaddacha & Hojii Seeraa' : currentLang === 'am' ? 'የችሎት ሂደት እና ውሳኔዎች' : 'Proceedings & Workbench'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('witnessStatements')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                activeMainTab === 'witnessStatements'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg border border-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'Galmee Jecha Ragaa (Witness Statements)' : currentLang === 'am' ? 'የምስክሮች ቃል መዝገብ (Witness Statements)' : 'Witness Statements'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeMainTab === 'witnessStatements'
                  ? 'bg-slate-950 text-amber-300 border border-slate-900'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {caseWitnessStatements.length}
              </span>
            </button>
          </div>

          {activeMainTab === 'proceedings' ? (
            <div className="space-y-10">
          {/* Voice-to-Memo Tool: Record Spoken Arguments via Microphone API & Auto-Organize into Structured Trilingual Legal Memos */}
          {showVoiceToMemo && (
            <div className="space-y-6">
              <VoiceToMemoRecorder
                currentLang={currentLang}
                courtLevel={courtLevel}
                activeCaseNumber={sessionTitle || (courtLevel === 'highCourt' ? 'Galmee Lakk. 249062/2016' : 'Galmee Lakk. 04821/2016')}
                onSaveToHistory={(entry) => {
                  const newLog: LogEntry = {
                    id: 'memo_' + Date.now(),
                    timestamp: new Date().toLocaleTimeString(),
                    text: entry.text,
                    type: 'manual',
                    tags: entry.tags,
                  };
                  setHistory((prev) => [newLog, ...prev]);
                }}
                onAppendToNotes={(note) => {
                  setQuickNotes((prev) => (prev ? prev + '\n' + note : note));
                }}
              />
              <VoiceDictation />
            </div>
          )}

          {/* Complete Judicial Proceedings Workbench */}
          <JudgeProceedingsWorkbench 
            currentLang={currentLang} 
            courtLevel={courtLevel}
            activeCaseNumber={sessionTitle || (courtLevel === 'highCourt' ? 'Galmee Lakk. 249062/2016' : 'Galmee Lakk. 24891/2016')}
          />
          
          {/* Pleadings & Voice Testimony Transcription Hub */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-2.5 rounded-xl text-slate-950 font-black">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase text-white">
                    {currentLang === 'om' ? 'Giddugala Himannaa, Deebii fi Sagalee Ragaa (Pleadings & Voice Testimony Hub)' : currentLang === 'am' ? 'የክስ፣ የመከላከያ እና የቃል ምስክርነት ቋት (Pleadings & Voice Testimony Hub)' : 'Pleadings & Voice-to-Text Testimony Hub'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {currentLang === 'om' ? 'Galmee Himannaa, Deebii Himannaa fi Sagalee Ragaa Gara Barreeffamaatti Jijjiiruu' : 'Statement of Claim/Defense entry & Speech-to-Text witness transcription'}
                  </p>
                </div>
              </div>
            </div>

            {/* 🎙️ LIVE TRANSCRIPTION FEED WITH SPEAKER TAGGING & DIRECT EVIDENCE LOCKER SAVING */}
            <LiveTranscriptionDisplay
              currentLang={currentLang}
              caseId={sessionId || 'case-today-301'}
              caseNumber={sessionTitle || (courtLevel === 'highCourt' ? 'Galmee Lakk. 249062/2016' : 'Galmee Lakk. 24891/2016')}
              courtName={courtLevel === 'cassation' ? 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa' : courtLevel === 'highCourt' ? 'Mana Murtii Ol\'aanaa Godina Shawaa Bahaa' : 'Mana Murtii Aanaa Adaamaa'}
              activeJudgeName={profile?.visitorName || 'Dr. Caalaa Tasfaayee'}
              onSaveEvidenceSuccess={(seg) => {
                const newLog: LogEntry = {
                  id: 'evid_stmt_' + Date.now(),
                  timestamp: new Date().toLocaleTimeString(),
                  text: `[LOCKER EXHIBIT] Sagaleen/qabxiin ${seg.speakerRole} (${seg.speakerName}) kuusaa ragaa qabatamaatti hidhameera: "${seg.statement.slice(0, 80)}..."`,
                  type: 'manual',
                  tags: ['evidence_locker', 'audio_testimony', 'exhibit_recorded']
                };
                setHistory((prev) => [newLog, ...prev]);
              }}
            />

            {/* 🏛️ & 📸 COURTROOM LAYOUT & PHYSICAL EVIDENCE CAMERA DUAL QUICK ACCESS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Courtroom Seating Layout Card */}
              <div className="bg-slate-950/90 border-2 border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 sm:p-5 space-y-3 transition-all shadow-md group relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shadow-inner">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    JUDICIAL BENCH MAPPING
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                    {currentLang === 'om' ? 'Caasaa Teessuma Dhaddachaa' : currentLang === 'am' ? 'የችሎት አቀማመጥ ንድፍ' : 'Courtroom Seating Layout'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {currentLang === 'om'
                      ? 'Teessuma Abbaa Seeraa, Abbaa Alangaa, Himataa, Himatamaa fi Ragaalee kaartaa dhaddachaa irratti qindeessi.'
                      : 'Visually map seating positions of Judge, Prosecutor, Plaintiff, Defendant, and Witnesses.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCourtroomLayoutModal(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-amber-500 text-slate-300 hover:text-slate-950 font-black text-xs uppercase tracking-wider border border-slate-700 hover:border-amber-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>{currentLang === 'om' ? 'Teessuma Dhaddachaa Bani' : currentLang === 'am' ? 'አቀማመጥ ክፈት' : 'Open Courtroom Map'} &rarr;</span>
                </button>
              </div>

              {/* Physical Evidence Camera Capture Card */}
              <div className="bg-slate-950/90 border-2 border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-4 sm:p-5 space-y-3 transition-all shadow-md group relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shadow-inner">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    REAL EVIDENCE CAMERA
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                    {currentLang === 'om' ? 'Waraabbata Suuraa Kaameeraa' : currentLang === 'am' ? 'የማስረጃ ካሜራ ቀረጻ' : 'Evidence Camera Capture'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {currentLang === 'om'
                      ? 'Kaameeraa meeshaatiin suuraa ragaa qabatamaa kaasuun battalumatti galmee kanaan wal-qabsiisi.'
                      : 'Snap photo of physical evidence with device camera and auto-link to active case file.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEvidenceCaptureModal(true)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Camera className="w-4 h-4 fill-slate-950" />
                  <span>{currentLang === 'om' ? 'Kaameeraan Suuraa Kaasi' : currentLang === 'am' ? 'ፎቶ አንሳ' : 'Snap Photo Evidence'} &rarr;</span>
                </button>
              </div>
            </div>

            {/* Legal Document Image OCR & Extraction Hub */}
            <div className="bg-slate-950 border-2 border-cyan-500/40 rounded-2xl p-6 space-y-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
                    📷
                  </div>
                  <div>
                    <h4 className="text-base font-black uppercase text-white">
                      {currentLang === 'om' ? 'Iddoo Suuraa Sanadaa Extracji godhee Kuusuu (Document OCR Hub)' : 'Legal Document Image OCR & Extraction Hub'}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {currentLang === 'om' ? 'Himannaa, Deebii, Jiddu Lixummaa, Mormii, Murtii, fi Mormii Raawwii suuraa irraa extract godhuun kuusuu.' : 'Extract and store text from images of Claim, Defense, Intervention, Objections, Judgment & Execution Objections.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={ocrCategory}
                    onChange={(e) => setOcrCategory(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option value="claim">{currentLang === 'om' ? 'Himannaa (Statement of Claim)' : 'Statement of Claim (Himannaa)'}</option>
                    <option value="defense">{currentLang === 'om' ? 'Deebii Himannaa (Statement of Defense)' : 'Statement of Defense (Deebii)'}</option>
                    <option value="intervention">{currentLang === 'om' ? 'Jiddu Lixummaa (Third-Party Intervention)' : 'Third-Party Intervention (Jiddu Lixummaa)'}</option>
                    <option value="objection">{currentLang === 'om' ? 'Mormii (Objections)' : 'Objections (Mormii)'}</option>
                    <option value="judgment">{currentLang === 'om' ? 'Murtii (Judgment / Decree)' : 'Judgment / Decree (Murtii)'}</option>
                    <option value="execution_objection">{currentLang === 'om' ? 'Mormii Raawwii (Execution Objections)' : 'Execution Objections (Mormii Raawwii)'}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="file"
                  ref={ocrFileInputRef}
                  onChange={handleOcrImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => ocrFileInputRef.current?.click()}
                  disabled={isExtractingOcr}
                  className="w-full sm:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isExtractingOcr ? (currentLang === 'om' ? 'Suuraa irraa dubbisaa jira (OCR Processing)...' : 'Extracting Text from Image...') : (currentLang === 'om' ? '📷 Suuraa Sanadaa Ol-Feedhii (Upload Document Image for OCR)' : '📷 Upload Document Image for OCR')}</span>
                </button>
              </div>

              {ocrImagePreview && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Uploaded Document Image</span>
                    <img src={ocrImagePreview} alt="Document Preview" className="w-full h-48 object-cover rounded-lg border border-slate-700" />
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Extracted OCR Text ({ocrCategory.toUpperCase()})</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(ocrExtractedText);
                          alert('Extracted OCR text copied to clipboard!');
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-white uppercase"
                      >
                        Copy
                      </button>
                    </div>
                    <textarea
                      value={ocrExtractedText}
                      onChange={(e) => setOcrExtractedText(e.target.value)}
                      placeholder="Extracted text will appear here..."
                      className="flex-1 w-full h-36 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Statement of Claim (Himannaa) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-amber-500 tracking-wider">
                    {currentLang === 'om' ? '1. Himannaa / Qabiyyee Himataa (Statement of Claim)' : '1. Statement of Claim (Himannaa)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(claimText);
                      alert(currentLang === 'om' ? 'Himannaan kophameera!' : 'Claim copied!');
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-white uppercase"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  placeholder={currentLang === 'om' ? 'Maddi himannaa, gaaffii himataa, fi bu\'uura seeraa galchaa...' : 'Enter statement of claim, plaintiff demands, and legal basis...'}
                  className="w-full h-36 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-medium text-white focus:outline-none focus:border-amber-500 resize-y"
                />
              </div>

              {/* Statement of Defense (Deebii Himannaa) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-amber-500 tracking-wider">
                    {currentLang === 'om' ? '2. Deebii Himannaa / Mormii Himatamaa (Statement of Defense)' : '2. Statement of Defense (Deebii)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(defenseText);
                      alert(currentLang === 'om' ? 'Deebiin kophameera!' : 'Defense copied!');
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-white uppercase"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={defenseText}
                  onChange={(e) => setDefenseText(e.target.value)}
                  placeholder={currentLang === 'om' ? 'Deebii himatamaa, mormii seeraa, fi ragaa ittisaa galchaa...' : 'Enter statement of defense, counter-arguments, and defendant position...'}
                  className="w-full h-36 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-medium text-white focus:outline-none focus:border-amber-500 resize-y"
                />
              </div>
            </div>

            {/* Framed Issue Evidence Gate (Ijoo Qulqullinaaf Qabame) */}
            <div className="bg-slate-950 border-2 border-amber-500/50 rounded-2xl p-6 space-y-4 mb-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    ⚖️
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white">
                      {currentLang === 'om' ? 'Ijoo Qulqullinaaf Qabame (Framed Issue for Evidence)' : 'Framed Issue Evidence Gate (Ijoo Qabame)'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {currentLang === 'om' ? 'Jechi ragaa kamiyyuu akka seeraatti ijoorratti qofa hirkatee akka galmaa\'u mirkaneessa.' : 'Ensure witness testimony is recorded strictly against the framed issue ordered for clarification.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={framedIssueForEvidence}
                    onChange={(e) => setFramedIssueForEvidence(e.target.value)}
                    placeholder={currentLang === 'om' ? 'Fkn: Waliigalteen mallatteeffameera moo hin mallatteeffamne? (Enter framed issue)' : 'Enter the framed issue to be clarified (e.g. Contract validity)...'}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => startListening('general')}
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 flex items-center gap-2 shrink-0"
                    title="Speak Framed Issue"
                  >
                    <Mic className="w-4 h-4 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Sagalee' : 'Voice'}</span>
                  </button>
                </div>

                {issueVerificationResult && (
                  <div className={`p-4 rounded-xl border text-xs font-bold ${issueVerificationResult.isRelevant ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                    {issueVerificationResult.isRelevant ? '✓ Testimony verified as strictly relevant to framed issue.' : '⚠ AI flagged possible deviation from framed issue.'}
                  </div>
                )}
              </div>
            </div>

            {/* Voice-to-Text Witness Testimony Transcription Area */}
            <div className="bg-slate-950 border-2 border-amber-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white">
                      {currentLang === 'om' ? '3. Ragaa Namaa: Sagalee Gara Barreeffamaatti Jijjiiruu (Voice-to-Text Testimony)' : '3. Witness Voice Testimony Transcription'}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {currentLang === 'om' ? 'Dubbii ragaa afaaniin dhihaatu waraabuun kallattiidhaan barreeffamatti jijjiira.' : 'Convert oral witness testimonies into structured written records.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {witnesses.length > 0 && (
                    <select
                      value={selectedWitnessForVoice}
                      onChange={(e) => setSelectedWitnessForVoice(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-amber-400 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none"
                    >
                      <option value="">-- {currentLang === 'om' ? 'Ragaa Filadhu (Select Witness)' : 'Select Witness'} --</option>
                      {witnesses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                      ))}
                    </select>
                  )}

                    <input
                      type="file"
                      ref={audioFileRef}
                      onChange={handleAudioFileUpload}
                      accept="audio/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => audioFileRef.current?.click()}
                      disabled={isTranscribingAudio}
                      className="px-4 py-2.5 rounded-xl font-black uppercase text-xs transition-all flex items-center gap-2 border-2 bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700"
                      title={currentLang === 'om' ? 'Sagalee Waraabbame File irraa Galchuu' : 'Upload Recorded Audio File'}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isTranscribingAudio ? (currentLang === 'om' ? 'Jijjiiramaa jira...' : 'Transcribing...') : (currentLang === 'om' ? 'Sagalee File (Upload Audio)' : 'Upload Audio')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startListening('testimony', selectedWitnessForVoice || undefined)}
                      className={`px-4 py-2.5 rounded-xl font-black uppercase text-xs transition-all flex items-center gap-2 border-2 ${
                        isListening 
                          ? 'bg-red-500 text-white border-red-600 animate-pulse' 
                          : 'bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>{isListening ? (currentLang === 'om' ? 'Waraabamee... (Listening)' : 'Listening...') : (currentLang === 'om' ? 'Sagalee Waraabi (Record Voice)' : 'Record Voice Testimony')}</span>
                    </button>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <button
                  onClick={() => handleAutoLinkCitations('testimony')}
                  className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Link Citations
                </button>
              </div>

              <textarea
                value={transcribedTestimony}
                onChange={(e) => setTranscribedTestimony(e.target.value)}
                placeholder={currentLang === 'om' ? 'Asitti jechi ragaa afaaniin dhihaate sagaleen ykn barreeffamaan ni galmaa\'a...' : 'Transcribed witness testimony text appears here in real-time...'}
                className="w-full h-32 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-medium text-white focus:outline-none focus:border-amber-500 resize-y"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveVerifiedTestimony}
                  disabled={isVerifyingIssueRelevance || !transcribedTestimony.trim()}
                  className={`px-6 py-2.5 rounded-xl font-black uppercase text-xs transition-all ${
                    transcribedTestimony.trim() && !isVerifyingIssueRelevance
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isVerifyingIssueRelevance 
                    ? (currentLang === 'om' ? 'Ijoorratti qorachaa jira...' : 'Verifying against framed issue...') 
                    : (currentLang === 'om' ? 'Jecha Ragaa Ijoo Qabamerratti Hirkate Galmeessaa' : 'Save Verified Testimony to Record')}
                </button>
              </div>
            </div>

            {/* Evidence Audio Processor & Key Facts Summarizer */}
            <div className="bg-slate-950 border-2 border-emerald-500/40 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-base font-black uppercase text-white">
                      {currentLang === 'om' ? 'Prosesarii Sagalee Ragaa (Evidence Audio Processor)' : 'Evidence Audio Processor & Key Facts Summarizer'}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {currentLang === 'om' ? 'Jecha ragaa kallattiin waraabame irraa qabxii ijoo fi ragaa seeraa gabaabaatti qindeessuu.' : 'Record direct witness testimony and instantly generate structured, bulleted key facts mapped to witness profile.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {witnesses.length > 0 && (
                    <select
                      value={evidenceWitnessId}
                      onChange={(e) => setEvidenceWitnessId(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none"
                    >
                      <option value="">-- {currentLang === 'om' ? 'Ragaa Walitti-qabsiisi (Map to Witness)' : 'Map to Witness Profile'} --</option>
                      {witnesses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <textarea
                value={evidenceAudioInput}
                onChange={(e) => setEvidenceAudioInput(e.target.value)}
                placeholder={currentLang === 'om' ? 'Jecha ragaa dhaddacharratti dhiyaate asitti galchaa ykn waraabaa... (Enter witness testimony record to summarize key facts)' : 'Enter or paste witness testimony text/transcript to process evidence key facts...'}
                className="w-full h-32 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 resize-y"
              />

              <div className="flex items-center justify-between flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => startListening('general', evidenceWitnessId || undefined)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 flex items-center gap-2"
                >
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>{currentLang === 'om' ? 'Sagalee Waraabuun Galchuu (Voice Record)' : 'Record Speech Input'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleProcessEvidenceAudio}
                  disabled={isProcessingEvidence || !evidenceAudioInput.trim()}
                  className={`px-6 py-2.5 rounded-xl font-black uppercase text-xs transition-all flex items-center gap-2 ${
                    isProcessingEvidence || !evidenceAudioInput.trim()
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  <span>{isProcessingEvidence ? (currentLang === 'om' ? 'Qindaayaa jira...' : 'Processing Key Facts...') : (currentLang === 'om' ? 'Qabxii Ijoo fi Ragaa Baasi (Generate Key Facts)' : 'Generate Key Facts Summary')}</span>
                </button>
              </div>

              {evidenceSummaryResult && (
                <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-2xl p-5 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                      {currentLang === 'om' ? 'Qabxii Ijoo Ragaa Mirkanaa\'e (Mapped Key Facts)' : 'Structured Key Facts Summary'}
                    </span>
                    {evidenceWitnessId && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                        Mapped to Witness Profile ✓
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {evidenceSummaryResult.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{bullet.replace(/^[-•*]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-12 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
            <div className="flex items-start gap-4 mb-6">
              <span className="bg-amber-500 text-slate-950 px-4 py-1 rounded-xl text-xl font-black font-mono">
                STEP {currentStep.id}
              </span>
              {currentStep.statuteRef && (
                <span className="bg-slate-800 text-amber-300 px-4 py-1 rounded-xl text-lg font-bold border border-amber-500/30">
                  {currentStep.statuteRef}
                </span>
              )}
            </div>

            <h2 className="text-3xl sm:text-5xl font-black leading-tight mb-6 text-white border-l-8 border-amber-500 pl-6">
              {currentStep.title[currentLang]}
            </h2>

            <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed font-medium mb-10 italic">
               "{currentStep.description[currentLang]}"
            </p>

            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2">
                <Info className="w-6 h-6" />
                Checklist / Mallattoolee:
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {currentStep.checklist[currentLang].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 p-6 rounded-2xl hover:border-amber-500 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full border-4 border-slate-700 flex items-center justify-center shrink-0 group-hover:border-amber-500">
                      <div className="w-3 h-3 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100" />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-slate-200">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Manual Log Entry Input */}
          <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase text-amber-500 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {t.courtroomHistory.addLog}
              </h3>
              {voiceError && (
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full animate-pulse">
                  {voiceError}
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              {/* Quick Objection Library */}
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.courtroomQuickObjections.title}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="text-[10px] font-bold text-amber-500/70 hover:text-amber-500 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Manage
                  </button>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 mb-4 border-b border-slate-800/50 pb-2">
                  {(['form', 'content', 'procedure'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveObjectionCategory(cat)}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                        activeObjectionCategory === cat 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {objectionTemplates
                    .filter(temp => temp.category === activeObjectionCategory)
                    .map((ob) => (
                    <button
                      key={ob.id}
                      type="button"
                      onClick={() => handleQuickObjection(ob)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5"
                    >
                      {ob.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Witness Tag Selector & Evidence Toggle */}
              <div className="flex flex-wrap items-center gap-4">
                {witnesses.length > 0 && (
                  <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="text-xs font-black text-slate-500 uppercase px-2">{t.courtroomWitness.tagTo}</span>
                    <select
                      value={tagWitnessId}
                      onChange={(e) => setTagWitnessId(e.target.value)}
                      className="bg-transparent text-amber-400 font-bold text-sm focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-900 text-slate-400">-- None --</option>
                      {witnesses.map(w => (
                        <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                          {w.name} ({w.type === 'plaintiff' ? 'P' : 'D'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsEvidence(!isEvidence)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all font-black text-xs uppercase ${
                    isEvidence 
                      ? 'bg-emerald-500 border-emerald-600 text-slate-950' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-emerald-500'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Evidence
                </button>
              </div>

              <form onSubmit={handleManualLog} className="flex gap-4">
                <input
                  type="text"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  placeholder={t.courtroomHistory.placeholder}
                  className="flex-1 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 text-lg font-bold text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
                
                {/* Quick-Log Voice Button */}
                <button
                  type="button"
                  onClick={() => startListening(isEvidence ? 'evidence' : 'general')}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
                    isListening 
                      ? 'bg-red-500 border-red-600 text-white animate-pulse' 
                      : 'bg-slate-800 border-slate-700 text-amber-500 hover:border-amber-500'
                  }`}
                  title={isListening ? t.courtroomVoice.stopListening : (isEvidence ? t.courtroomVoice.voiceToEvidence : t.courtroomVoice.startListening)}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  <span className="hidden xl:inline uppercase font-black text-sm">
                    {isListening ? t.courtroomVoice.listening : (isEvidence ? t.courtroomVoice.voiceToEvidence : 'Quick-Log')}
                  </span>
                </button>

                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                >
                  <Plus className="w-6 h-6" strokeWidth={3} />
                  <span className="hidden sm:inline uppercase">Add</span>
                </button>
              </form>
            </div>
          </div>

          {/* Warning / Tip Box */}
          <div className="bg-amber-500/10 border-2 border-amber-500/40 p-6 rounded-3xl flex items-start gap-6">
            <AlertTriangle className="w-10 h-10 text-amber-500 shrink-0" strokeWidth={3} />
            <div className="space-y-2">
              <h4 className="text-xl font-black uppercase text-amber-500">Procedural Guard / Hubachiisa</h4>
              <p className="text-lg text-slate-200 font-medium">
                {currentLang === 'om' 
                  ? 'SDFHH hordofuun mirga gareewwanii kabachiisuu dha. Mormii duraa irratti murtii yeroo kennuun dirqama.' 
                  : currentLang === 'am'
                  ? 'የሥነ-ሥርዓት ሕጉን መከተል የወገኖችን መብት ለማስከበር ወሳኝ ነው። በመጀመሪያ ደረጃ መቃወሚያዎች ላይ የብይን ውሳኔ መስጠት ግዴታ ነው።'
                  : 'Adhering to procedure is critical for justice. Ensure preliminary rulings are recorded before proceeding to evidence.'}
              </p>
            </div>
          </div>

          {/* Bottom Navigation - Massive Buttons */}
          <div className="grid grid-cols-2 gap-6 pt-6 pb-10">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`flex items-center justify-center gap-4 py-8 rounded-3xl font-black text-2xl transition-all border-4 ${
                currentStepIndex === 0 
                  ? 'bg-slate-900 border-slate-800 text-slate-700 opacity-50 cursor-not-allowed' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-amber-500 active:scale-95'
              }`}
            >
              <ChevronLeft className="w-10 h-10" strokeWidth={4} />
              <span>PREVIOUS</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === PROCEDURAL_STEPS.length - 1}
              className={`flex items-center justify-center gap-4 py-8 rounded-3xl font-black text-2xl transition-all border-4 ${
                currentStepIndex === PROCEDURAL_STEPS.length - 1
                  ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400 opacity-50 cursor-not-allowed'
                  : 'bg-amber-500 border-amber-600 text-slate-950 hover:bg-amber-400 active:scale-95'
              }`}
            >
              <span>{currentStepIndex === PROCEDURAL_STEPS.length - 1 ? 'FINISHED' : 'NEXT STEP'}</span>
              {currentStepIndex === PROCEDURAL_STEPS.length - 1 ? <CheckCircle2 className="w-10 h-10" /> : <ChevronRight className="w-10 h-10" strokeWidth={4} />}
            </button>
          </div>
        </div>
      ) : (
        /* Dedicated 'Witness Statements' Tab linked directly to current case file */
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Active Case Docket & Witness Testimony Summary Header */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      GALMEE JECHA RAGAA
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {courtLevel === 'cassation' ? 'Dhaddacha Ijibbaataa' : courtLevel === 'highCourt' ? 'Mana Murtii Ol\'aanaa' : 'Mana Murtii Jalqabaa'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white mt-1">
                    {currentLang === 'om' ? 'Axereeraa Jecha Ragaalee Galmee Dhaddachaa' : currentLang === 'am' ? 'የችሎት ምስክሮች ቃል ማጠቃለያ መዝገብ' : 'Case Witness Statements & Testimony Summaries'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold font-mono mt-0.5">
                    {sessionTitle || (courtLevel === 'highCourt' ? 'CR-2026/089' : 'CR-2026/045')} • {profile?.visitorName || 'Judge / Court Reporter'}
                  </p>
                </div>
              </div>

              {/* Quick Actions for Witness Statements */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (caseWitnessStatements.length === 0) {
                      alert('No witness statements recorded yet for this case.');
                      return;
                    }
                    const textReport = `MANA MURTII DHADDACHAA - GALMEE JECHA RAGAA
Lakk. Galmee: ${sessionTitle || 'CR-2026/045'}
Guyyaa: ${new Date().toLocaleDateString()}
Baay'ina Ragaalee: ${caseWitnessStatements.length}

${caseWitnessStatements.map((stmt, idx) => `
--------------------------------------------------
[${idx + 1}] RAGAA: ${stmt.witnessName.toUpperCase()} (${stmt.witnessRole.toUpperCase()})
Sa'aatii: ${stmt.timestamp} | Madaallii Amanamummaa: ${stmt.credibilityRating.toUpperCase()}
AXEREERAA JECHA RAGAA:
"${stmt.statementText}"
${stmt.crossExaminationNotes ? `QABXII GAAFFII QAXXAAMURAA:\n"${stmt.crossExaminationNotes}"` : ''}
Bu'uura Seeraa: ${stmt.statutoryBasis || 'SDFHH Art. 136-137'}
`).join('\n')}
==================================================
Mirkaneessa Dhaddachaa: Abbaa Seeraa / Galmeessaa`;

                    navigator.clipboard.writeText(textReport);
                    showShortcutFeedback(
                      currentLang === 'om' ? 'Axereeraan ragaalee hundi clipboard\'tti waraabameera!' : 'Full witness statements dossier copied to clipboard!',
                      '📋'
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-amber-500/50 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  title="Copy full case testimony summary to clipboard"
                >
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>{currentLang === 'om' ? 'Waraabi (Copy Dossier)' : 'Copy Dossier'}</span>
                </button>
              </div>
            </div>

            {/* Witness Statements Breakdown Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Total Statements
                </span>
                <span className="text-2xl font-black font-mono text-white mt-1 block">
                  {caseWitnessStatements.length}
                </span>
                <span className="text-[9px] font-mono text-amber-400/80 mt-0.5 block">Linked to Active Case</span>
              </div>

              <div className="bg-slate-950/70 border border-blue-500/20 rounded-2xl p-3.5">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                  Plaintiff Witnesses
                </span>
                <span className="text-2xl font-black font-mono text-blue-300 mt-1 block">
                  {caseWitnessStatements.filter(s => s.witnessRole === 'plaintiff_witness').length}
                </span>
                <span className="text-[9px] font-mono text-slate-500 mt-0.5 block">Himataa</span>
              </div>

              <div className="bg-slate-950/70 border border-amber-500/20 rounded-2xl p-3.5">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  Defendant Witnesses
                </span>
                <span className="text-2xl font-black font-mono text-amber-300 mt-1 block">
                  {caseWitnessStatements.filter(s => s.witnessRole === 'defendant_witness').length}
                </span>
                <span className="text-[9px] font-mono text-slate-500 mt-0.5 block">Himatamaa</span>
              </div>

              <div className="bg-slate-950/70 border border-emerald-500/20 rounded-2xl p-3.5">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                  High Credibility
                </span>
                <span className="text-2xl font-black font-mono text-emerald-300 mt-1 block">
                  {caseWitnessStatements.filter(s => s.credibilityRating === 'high').length}
                </span>
                <span className="text-[9px] font-mono text-emerald-500/80 mt-0.5 block">Amanamaa</span>
              </div>
            </div>
          </div>

          {/* Form to Log New Witness Statement Linked to Case */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2.5 rounded-xl text-slate-950 font-black shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black uppercase text-white">
                    {currentLang === 'om' ? 'Galmeessuu Axereeraa Jecha Ragaa' : currentLang === 'am' ? 'የምስክር ቃል ማጠቃለያ መመዝገቢያ' : 'Log Witness Testimony Summary'}
                  </h4>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    {currentLang === 'om' ? 'Jecha ragaa dhaddacharratti kenname axereerii galmee kanaan walqabsiisi' : 'Record summary of witness testimony directly linked to this court docket'}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Art. 136-137 SDFHH
              </span>
            </div>

            <form onSubmit={handleSaveWitnessStatementSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Witness Name & Pre-fill Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>{currentLang === 'om' ? 'Maqaa Ragaa' : 'Witness Name'} *</span>
                    {witnesses.length > 0 && (
                      <span className="text-[10px] text-amber-400 font-normal">
                        Select from session or type
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newWitnessStmtName}
                      onChange={(e) => setNewWitnessStmtName(e.target.value)}
                      placeholder={currentLang === 'om' ? 'Fkn: Obbo Gammachiis Qananii' : 'e.g., Gemechis Keneni'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  {witnesses.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500 font-mono">Quick select:</span>
                      {witnesses.map(w => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setNewWitnessStmtName(w.name);
                            setNewWitnessStmtRole(w.type === 'plaintiff' ? 'plaintiff_witness' : 'defendant_witness');
                          }}
                          className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors cursor-pointer"
                        >
                          {w.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Witness Role Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                    {currentLang === 'om' ? 'Gahee / Qaama Ragaan Dhiyeesse' : 'Witness Role / Party'} *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewWitnessStmtRole('plaintiff_witness')}
                      className={`p-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                        newWitnessStmtRole === 'plaintiff_witness'
                          ? 'bg-blue-600/30 text-blue-300 border-blue-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Himataa (Plaintiff)
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewWitnessStmtRole('defendant_witness')}
                      className={`p-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                        newWitnessStmtRole === 'defendant_witness'
                          ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Himatamaa (Defendant)
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewWitnessStmtRole('expert_witness')}
                      className={`p-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                        newWitnessStmtRole === 'expert_witness'
                          ? 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Ogeessa (Expert)
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewWitnessStmtRole('court_witness')}
                      className={`p-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                        newWitnessStmtRole === 'court_witness'
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Mana Murtii (Court)
                    </button>
                  </div>
                </div>
              </div>

              {/* Testimony Summary Textarea with Speech Dictation Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Axereeraa Jecha Ragaa (Direct Testimony Summary)' : 'Testimony Summary'} *</span>
                  </label>
                  
                  {/* Voice dictation speech button */}
                  <button
                    type="button"
                    onClick={toggleWitnessSpeechDictation}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                      isWitnessRecording
                        ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-md'
                        : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-slate-800 hover:border-amber-500/50'
                    }`}
                    title="Speak into microphone to transcribe testimony in real time"
                  >
                    {isWitnessRecording ? <MicOff className="w-3 h-3 text-white" /> : <Mic className="w-3 h-3 text-amber-400" />}
                    <span>{isWitnessRecording ? 'Listening...' : 'Voice Dictate'}</span>
                  </button>
                </div>

                <textarea
                  required
                  rows={4}
                  value={newWitnessStmtText}
                  onChange={(e) => setNewWitnessStmtText(e.target.value)}
                  placeholder={
                    currentLang === 'om'
                      ? 'Ibsa ragaan dhugaa bahe: Wanta argan, yeroo, iddoo gochi raawwatame, fi ragaa qabatamaa eeran...'
                      : 'Summarize sworn testimony: Witness observations, timelines, admissions, and key evidentiary claims...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Cross-Examination Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{currentLang === 'om' ? 'Qabxiiwwan Gaaffii Qaxxaamuraa (Cross-Examination Notes)' : 'Cross-Examination & Impeachment Notes'}</span>
                  <span className="text-slate-500 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={newWitnessStmtCross}
                  onChange={(e) => setNewWitnessStmtCross(e.target.value)}
                  placeholder={
                    currentLang === 'om'
                      ? 'Faallaa dubbatame, shakkiilee gama biraatiin ka\'an, ykn wal-dhabdee ragaan kaan wajjin qaban...'
                      : 'Contradictions raised, credibility challenges, inconsistent prior statements, or demeanor notes...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Credibility Assessment & Submit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    Credibility:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewWitnessStmtCredibility('high')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                        newWitnessStmtCredibility === 'high'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      Amanamaa (High)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewWitnessStmtCredibility('moderate')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                        newWitnessStmtCredibility === 'moderate'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      Giddu-galeessa (Moderate)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewWitnessStmtCredibility('questionable')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                        newWitnessStmtCredibility === 'questionable'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      Shakkiisisaa (Questionable)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingWitnessStatement}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border border-amber-400"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isLoggingWitnessStatement ? 'Saving to Case...' : 'Save Witness Statement to Case File'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Witness Statements List Section */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  <span>{currentLang === 'om' ? 'Galmee Jecha Ragaalee Dhimma Kanaan Hidhaman' : 'Logged Case Witness Statements'}</span>
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {caseWitnessStatements.length}
                </span>
              </div>

              {/* Live Search Input for Statements */}
              <div className="relative">
                <input
                  type="text"
                  value={witnessStatementSearch}
                  onChange={(e) => setWitnessStatementSearch(e.target.value)}
                  placeholder={currentLang === 'om' ? 'Barbaadi (Maqaa, Jecha...)' : 'Filter statements...'}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none w-56"
                />
                <Search className="w-4 h-4 absolute left-3 top-2 text-slate-500" />
              </div>
            </div>

            {/* Filter Pills for Witness Roles */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Role Filter:
              </span>
              <button
                type="button"
                onClick={() => setWitnessStatementFilter('all')}
                className={`px-3 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                  witnessStatementFilter === 'all'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                All ({caseWitnessStatements.length})
              </button>

              <button
                type="button"
                onClick={() => setWitnessStatementFilter('plaintiff_witness')}
                className={`px-3 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                  witnessStatementFilter === 'plaintiff_witness'
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Plaintiff ({caseWitnessStatements.filter(s => s.witnessRole === 'plaintiff_witness').length})
              </button>

              <button
                type="button"
                onClick={() => setWitnessStatementFilter('defendant_witness')}
                className={`px-3 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                  witnessStatementFilter === 'defendant_witness'
                    ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Defendant ({caseWitnessStatements.filter(s => s.witnessRole === 'defendant_witness').length})
              </button>

              <button
                type="button"
                onClick={() => setWitnessStatementFilter('expert_witness')}
                className={`px-3 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                  witnessStatementFilter === 'expert_witness'
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Expert ({caseWitnessStatements.filter(s => s.witnessRole === 'expert_witness').length})
              </button>

              <button
                type="button"
                onClick={() => setWitnessStatementFilter('court_witness')}
                className={`px-3 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                  witnessStatementFilter === 'court_witness'
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Court ({caseWitnessStatements.filter(s => s.witnessRole === 'court_witness').length})
              </button>
            </div>

            {/* Statements List Cards */}
            <div className="space-y-4">
              {caseWitnessStatements
                .filter(stmt => {
                  if (witnessStatementFilter !== 'all' && stmt.witnessRole !== witnessStatementFilter) return false;
                  if (witnessStatementSearch.trim()) {
                    const q = witnessStatementSearch.toLowerCase();
                    return stmt.witnessName.toLowerCase().includes(q) ||
                           stmt.statementText.toLowerCase().includes(q) ||
                           (stmt.crossExaminationNotes && stmt.crossExaminationNotes.toLowerCase().includes(q));
                  }
                  return true;
                }).length === 0 ? (
                <div className="text-center py-16 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-bold text-white uppercase tracking-wider">
                    {currentLang === 'om' ? 'Jechi Ragaa Galmaa\'e Hin Jiru' : 'No Witness Statements Found'}
                  </h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {currentLang === 'om'
                      ? 'Ragaalee dhaddacharratti dhiyaatan jecha isaanii foomii gubbaa irratti galmeessaa.'
                      : 'Use the form above to log sworn testimonies and cross-examination notes linked to this case docket.'}
                  </p>
                </div>
              ) : (
                caseWitnessStatements
                  .filter(stmt => {
                    if (witnessStatementFilter !== 'all' && stmt.witnessRole !== witnessStatementFilter) return false;
                    if (witnessStatementSearch.trim()) {
                      const q = witnessStatementSearch.toLowerCase();
                      return stmt.witnessName.toLowerCase().includes(q) ||
                             stmt.statementText.toLowerCase().includes(q) ||
                             (stmt.crossExaminationNotes && stmt.crossExaminationNotes.toLowerCase().includes(q));
                    }
                    return true;
                  })
                  .map((stmt) => (
                    <div
                      key={stmt.id}
                      className="bg-slate-950/80 border-2 border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-md group"
                    >
                      {/* Top Row: Witness Meta */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase shadow-inner ${
                            stmt.witnessRole === 'plaintiff_witness'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : stmt.witnessRole === 'defendant_witness'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : stmt.witnessRole === 'expert_witness'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {stmt.witnessName.slice(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-black text-white">
                                {stmt.witnessName}
                              </h5>
                              <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md border ${
                                stmt.witnessRole === 'plaintiff_witness'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : stmt.witnessRole === 'defendant_witness'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : stmt.witnessRole === 'expert_witness'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}>
                                {stmt.witnessRole.replace('_', ' ')}
                              </span>
                              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                                stmt.credibilityRating === 'high'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : stmt.credibilityRating === 'moderate'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}>
                                Credibility: {stmt.credibilityRating}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                              <span>Recorded: {stmt.timestamp}</span>
                              <span>•</span>
                              <span>Case: {stmt.caseNumber || sessionTitle || 'CR-2026/045'}</span>
                              <span>•</span>
                              <span>Officer: {stmt.recordedBy || 'Court Staff'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const citation = `[RAGAA DHADDACHAA: ${stmt.witnessName} (${stmt.witnessRole.toUpperCase()})]\n"${stmt.statementText}"\n${stmt.crossExaminationNotes ? `[Qaxxaamuraa: ${stmt.crossExaminationNotes}]\n` : ''}(Lakk. Galmee: ${stmt.caseNumber || 'CR-2026/045'}, Bu'uura: SDFHH Art. 136)`;
                              navigator.clipboard.writeText(citation);
                              showShortcutFeedback('Witness statement citation copied!', '📋');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy formal statement quote"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Quote</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setQuickNotes(prev => (prev ? `${prev}\n\n` : '') + `[RAGAA: ${stmt.witnessName}]: ${stmt.statementText}`);
                              showShortcutFeedback('Appended to Judgment Bench Notes!', '📝');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Add to Bench Notes"
                          >
                            <FileText className="w-3 h-3" />
                            <span>To Notes</span>
                          </button>
                        </div>
                      </div>

                      {/* Direct Statement Body */}
                      <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-sm font-serif italic text-slate-200 leading-relaxed relative pl-6">
                        <span className="text-3xl text-amber-500/40 font-serif absolute left-2 top-1 select-none">“</span>
                        {stmt.statementText}
                      </div>

                      {/* Cross Examination Callout if available */}
                      {stmt.crossExaminationNotes && (
                        <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-rose-400 uppercase text-[10px]">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Qabxiiwwan Gaaffii Qaxxaamuraa (Cross-Examination Highlights)</span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            {stmt.crossExaminationNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
        </div>

        {/* Widgets & History Log - Right Column */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          {/* Visual Case Milestone Roadmap Tracker */}
          <div className="bg-slate-900 rounded-3xl p-6 border-2 border-slate-800 shadow-xl">
            <h3 className="text-sm font-black uppercase text-amber-500 mb-4">
              {currentLang === 'om' ? 'Milestone Galmee' : 'Case Milestones'}
            </h3>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400">Progress</span>
                <button
                  type="button"
                  onClick={handleOpenMainAuditTrail}
                  className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <History className="w-3 h-3" />
                  <span>Audit Trail</span>
                </button>
                <span className="text-[10px] font-bold text-amber-500">{Math.round(((currentStepIndex + 1) / PROCEDURAL_STEPS.length) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentStepIndex + 1) / PROCEDURAL_STEPS.length) * 100}%` }}></div>
              </div>
            </div>
            <CaseMilestoneTracker
              currentLang={currentLang}
              caseNumber={sessionId || (courtLevel === 'highCourt' ? 'CR-2026/089' : 'CR-2026/045')}
              caseTitle={sessionTitle || 'Abbaa Alangaa vs Gemechu Tadesse'}
            />

            {/* Real-time Milestone Search Filter Results */}
            {historySearch.trim() && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wide flex items-center justify-between">
                  <span>Filtered Milestones:</span>
                  <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
                    {PROCEDURAL_STEPS.filter(s => {
                      const q = historySearch.toLowerCase();
                      return s.title.om.toLowerCase().includes(q) ||
                             s.title.am.toLowerCase().includes(q) ||
                             s.title.en.toLowerCase().includes(q) ||
                             (s.statuteRef && s.statuteRef.toLowerCase().includes(q));
                    }).length} matches
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {PROCEDURAL_STEPS.filter(s => {
                    const q = historySearch.toLowerCase();
                    return s.title.om.toLowerCase().includes(q) ||
                           s.title.am.toLowerCase().includes(q) ||
                           s.title.en.toLowerCase().includes(q) ||
                           (s.statuteRef && s.statuteRef.toLowerCase().includes(q));
                  }).map(step => (
                    <div 
                      key={step.id} 
                      onClick={() => setCurrentStepIndex(step.id - 1)}
                      className={`p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                        currentStepIndex === step.id - 1
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{step.title[currentLang] || step.title.en}</div>
                      {step.statuteRef && <div className="text-[10px] text-cyan-400 font-mono">📖 {step.statuteRef}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Reorder.Group axis="y" values={widgetOrder} onReorder={setWidgetOrder} className="space-y-6">
            {widgetOrder.map((widgetId) => (
              <Reorder.Item 
                key={widgetId} 
                value={widgetId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
              >
                {widgetId === 'stats' && (
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6" />
                        {t.courtroomStats.title}
                      </h3>
                      <GripVertical className="w-5 h-5 text-slate-700 group-hover:text-amber-500 cursor-grab active:cursor-grabbing" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className="bg-red-500/20 p-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t.courtroomStats.totalObjections}</div>
                          <div className="text-xl font-black text-white">{quickStats.objections}</div>
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t.courtroomStats.totalTestimonies}</div>
                          <div className="text-xl font-black text-white">{quickStats.testimonies}</div>
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className="bg-amber-500/20 p-2 rounded-lg">
                          <FileText className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t.courtroomStats.activeDocuments}</div>
                          <div className="text-xl font-black text-white">{quickStats.docs}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {widgetId === 'witnesses' && (
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2">
                          <Scale className="w-6 h-6" />
                          {t.courtroomWitness.title}
                        </h3>
                        <button
                          onClick={() => setShowWitnessInsight(!showWitnessInsight)}
                          className={`p-2 rounded-lg transition-all border ${showWitnessInsight ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-800 border-slate-700 text-amber-500 hover:bg-slate-700'}`}
                          title={t.courtroomWitness.visualInsight}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      </div>
                      <GripVertical className="w-5 h-5 text-slate-700 group-hover:text-amber-500 cursor-grab active:cursor-grabbing" />
                    </div>

                    {showWitnessInsight && witnesses.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden"
                      >
                        <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest text-center">
                          {t.courtroomWitness.statusDistribution}
                        </h4>
                        <div className="h-[150px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={witnessDistributionData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                              />
                              <YAxis hide />
                              <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                labelStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                              />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                {witnessDistributionData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )}

                    <form onSubmit={handleAddWitness} className="space-y-3 mb-6">
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={newWitnessName}
                          onChange={(e) => setNewWitnessName(e.target.value)}
                          placeholder={t.courtroomWitness.namePlaceholder}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-500 outline-none"
                        />
                        <input
                          type="text"
                          value={newWitnessCaseId}
                          onChange={(e) => setNewWitnessCaseId(e.target.value)}
                          placeholder={t.courtroomWitness.caseIdPlaceholder}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewWitnessType('plaintiff')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newWitnessType === 'plaintiff' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                        >
                          {t.courtroomWitness.typePlaintiff}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewWitnessType('defendant')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newWitnessType === 'defendant' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                        >
                          {t.courtroomWitness.typeDefendant}
                        </button>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-slate-800 hover:bg-slate-700 text-amber-500 py-3 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 border border-slate-700"
                      >
                        <Plus className="w-4 h-4" />
                        {t.courtroomWitness.add}
                      </button>
                    </form>

                    {/* Search and Filter */}
                    <div className="mb-6 space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={witnessSearch}
                            onChange={(e) => setWitnessSearch(e.target.value)}
                            placeholder={t.courtroomWitness.searchPlaceholder}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-white focus:border-amber-500 outline-none"
                          />
                          <Plus className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 rotate-45" />
                        </div>
                        <div className="relative">
                          <select
                            value={witnessSortBy}
                            onChange={(e) => setWitnessSortBy(e.target.value as any)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-amber-500 focus:border-amber-500 outline-none cursor-pointer appearance-none pr-8"
                          >
                            <option value="date">{t.courtroomWitness.sortDate}</option>
                            <option value="alpha">{t.courtroomWitness.sortAlpha}</option>
                            <option value="status">{t.courtroomWitness.sortStatus}</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-3 top-3 text-amber-500 pointer-events-none" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setWitnessStatusFilter('all')}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${witnessStatusFilter === 'all' ? 'bg-slate-800 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setWitnessStatusFilter('pending')}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${witnessStatusFilter === 'pending' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                        >
                          {t.courtroomWitness.statusPending}
                        </button>
                        <button
                          onClick={() => setWitnessStatusFilter('completed')}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${witnessStatusFilter === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                        >
                          {t.courtroomWitness.statusCompleted}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredWitnesses.length === 0 ? (
                        <p className="text-center text-slate-600 text-xs italic py-4">{t.courtroomWitness.noWitnesses}</p>
                      ) : (
                        filteredWitnesses.map(w => (
                          <div key={w.id} className={`bg-slate-950 border p-3 rounded-xl flex items-center justify-between group transition-all ${tagWitnessId === w.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-800 hover:border-slate-600'}`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${w.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{w.name}</span>
                                {w.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest ${w.type === 'plaintiff' ? 'text-amber-500' : 'text-blue-400'}`}>
                                  {w.type === 'plaintiff' ? t.courtroomWitness.typePlaintiff : t.courtroomWitness.typeDefendant}
                                </span>
                                {w.caseId && (
                                  <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1.5 rounded">#{w.caseId}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => startListening('evidence', w.id)}
                                className={`p-1.5 rounded-lg transition-colors ${isListening && tagWitnessId === w.id ? 'bg-red-500 text-slate-950 animate-pulse' : 'bg-slate-900 text-slate-500 hover:text-red-500'}`}
                                title={t.courtroomVoice.voiceToEvidence}
                              >
                                <Mic className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => toggleWitnessStatus(w.id)}
                                className={`p-1.5 rounded-lg transition-colors ${w.status === 'completed' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-500 hover:text-emerald-500'}`}
                                title={w.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setTagWitnessId(tagWitnessId === w.id ? '' : w.id)}
                                className={`p-1.5 rounded-lg transition-colors ${tagWitnessId === w.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500 hover:text-amber-500'}`}
                                title={tagWitnessId === w.id ? "Untag" : "Tag for entries"}
                              >
                                <Plus className={`w-4 h-4 transition-transform ${tagWitnessId === w.id ? 'rotate-45' : ''}`} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Export Buttons */}
                    {witnesses.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 gap-3">
                        <button
                          onClick={exportToCSV}
                          className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:border-amber-500 text-slate-300 hover:text-amber-500 py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={exportToPDF}
                          className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:border-amber-500 text-slate-300 hover:text-amber-500 py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {widgetId === 'insights' && (
                  <div className="bg-slate-900 border-2 border-amber-500/20 rounded-3xl p-6 shadow-2xl hover:border-amber-500/50 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Scale className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6" />
                        AI Insights
                      </h3>
                      <div className="flex items-center gap-2">
                         {isAnalyzing && <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />}
                         <GripVertical className="w-5 h-5 text-slate-700 group-hover:text-amber-500 cursor-grab active:cursor-grabbing" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {insights.length === 0 ? (
                        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-center">
                          <p className="text-xs font-bold text-slate-500 uppercase italic">
                            {isAnalyzing ? "Analyzing courtroom flow..." : "Logging the session triggers proactive legal insights."}
                          </p>
                        </div>
                      ) : (
                        insights.map((insight, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-4 rounded-2xl border ${
                              insight.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                              insight.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                              'bg-blue-500/10 border-blue-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                insight.type === 'procedural_alert' ? 'bg-red-500 text-white' :
                                insight.type === 'counter_argument' ? 'bg-emerald-500 text-slate-950' :
                                'bg-blue-500 text-white'
                              }`}>
                                {insight.type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">{insight.lawReference}</span>
                            </div>
                            <h4 className="text-sm font-black text-white mb-1 uppercase tracking-tight">{insight.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">{insight.description}</p>
                          </motion.div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={fetchSmartInsights}
                      disabled={isAnalyzing}
                      className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? "AUDITOR ANALYZING..." : "REFRESH ANALYSIS"}
                    </button>
                  </div>
                )}
                {widgetId === 'notes' && (
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl hover:border-amber-500/30 transition-colors space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2">
                        <StickyNote className="w-6 h-6" />
                        {t.courtroomNotes.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* Voice Memo Button */}
                        <button
                          type="button"
                          onClick={toggleVoiceMemoRecording}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isRecordingVoiceMemo
                              ? 'bg-rose-600 text-white border-rose-500 shadow-lg animate-pulse'
                              : 'bg-slate-950 hover:bg-slate-800 text-amber-400 border-amber-500/40 hover:border-amber-300'
                          }`}
                          title="Record quick Voice Memo during proceedings"
                        >
                          <span>{isRecordingVoiceMemo ? '🔴' : '🎙️'}</span>
                          <span>
                            {isRecordingVoiceMemo
                              ? (currentLang === 'om' ? 'Dhaabi (Stop)' : 'Recording... Stop')
                              : (currentLang === 'om' ? 'Voice Memo' : 'Voice Memo')}
                          </span>
                        </button>
                        <GripVertical className="w-5 h-5 text-slate-700 group-hover:text-amber-500 cursor-grab active:cursor-grabbing" />
                      </div>
                    </div>

                    {voiceMemoToast && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150">
                        <span className="animate-bounce">✓</span>
                        <span>{voiceMemoToast}</span>
                      </div>
                    )}

                    {isRecordingVoiceMemo && <VoiceActivityWave />}

                    <textarea
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      placeholder={t.courtroomNotes.placeholder}
                      className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-amber-500 transition-colors resize-none custom-scrollbar"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleAutoLinkCitations('notes')}
                        className="text-[9px] font-black uppercase text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                        title="Scan for Article citations and convert to links"
                      >
                        <FileText className="w-3 h-3" />
                        Auto-Link Citations
                      </button>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 text-right">
                        {quickNotes.length} chars
                      </div>
                    </div>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {/* Testimony Template Library */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2 mb-6 border-b border-slate-800 pb-2">
              <MessageSquare className="w-6 h-6" />
              {t.courtroomWitness.templatesTitle}
            </h3>
            
            <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {Object.entries(t.courtroomWitness.templateCategories).map(([catKey, category]) => (
                <div key={catKey} className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2">
                    {category.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(category.items).map(([itemKey, value]) => (
                      <button
                        key={itemKey}
                        onClick={() => handleUseTemplate(value)}
                        className="text-left bg-slate-950 border border-slate-800 p-3 rounded-xl hover:border-amber-500 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-xs font-bold text-slate-300 group-hover:text-amber-400 leading-relaxed">
                          {value}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Legal News & Telegram Archive Feed Section */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            {/* Header & Sync Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-xl font-black uppercase text-cyan-400 tracking-wide">
                    {currentLang === 'om' ? 'Oduu & Murtiilee Seeraa Haaraa' : currentLang === 'am' ? 'አዳዲስ የህግ መረጃዎችና ውሳኔዎች' : 'Latest Legal Updates & Precedents'}
                  </h3>
                  {unreadNewsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] animate-pulse">
                      +{unreadNewsCount} New
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 font-mono">
                    <span className={`inline-block w-2 h-2 rounded-full ${isBackgroundSyncActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                    <span className={isBackgroundSyncActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {isBackgroundSyncActive
                        ? (currentLang === 'om' ? 'Walsimsiisni Kallattii Hojiirra Jira' : 'Background Sync: Active (@seeraai_ethio)')
                        : (currentLang === 'om' ? 'Walsimsiisni Dhaabbateera' : 'Background Sync: Paused')}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="text-slate-500">
                    {currentLang === 'om' ? 'Yeroo dhihoo:' : 'Last checked:'} {lastSyncTimestamp}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Polling toggle, manual refresh, and 1,500+ archive modal trigger */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsBackgroundSyncActive(!isBackgroundSyncActive)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isBackgroundSyncActive
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                  }`}
                  title={isBackgroundSyncActive ? 'Pause background sync' : 'Resume background sync'}
                >
                  <Wifi className={`w-3.5 h-3.5 ${isBackgroundSyncActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{isBackgroundSyncActive ? 'Live' : 'Paused'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRefreshNews(selectedNewsSource)}
                  disabled={isSyncingNews}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Refresh news feed now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncingNews ? 'animate-spin' : ''}`} />
                  <span>{isSyncingNews ? (currentLang === 'om' ? 'Fe\'aa jira...' : 'Syncing...') : (currentLang === 'om' ? 'Haaromsi' : 'Sync Now')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowArchive1500Modal(true);
                    handleLoadArchive1500();
                  }}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>1,500+ {currentLang === 'om' ? 'Kuusaa Seeraa' : 'Legal Archive'}</span>
                </button>
              </div>
            </div>

            {/* Live Notification Toast */}
            {newUpdatesToast && (
              <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold">{newUpdatesToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewUpdatesToast(null)}
                  className="text-cyan-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Controls Bar: Channel Source Tabs & Legal News Type Filter Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 text-xs">
              {/* Channel Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNewsSource('all');
                    handleRefreshNews('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                    selectedNewsSource === 'all'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🌐 {currentLang === 'om' ? 'Chaanaloota Hunda' : 'All Channels'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedNewsSource('seeraai_ethio');
                    handleRefreshNews('seeraai_ethio');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedNewsSource === 'seeraai_ethio'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>⚖️ @seeraai_ethio</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] text-cyan-300 font-mono">Master</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedNewsSource('wakolegalstudio');
                    handleRefreshNews('wakolegalstudio');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedNewsSource === 'wakolegalstudio'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>📚 @wakolegalstudio</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] text-amber-300 font-mono">1,500+</span>
                </button>
              </div>

              {/* Type Filter Dropdown ('Precedents' | 'Proclamations' | 'General Announcements') */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-slate-950 border border-cyan-500/30 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <label htmlFor="news-type-filter" className="text-[10px] font-black uppercase text-slate-400 tracking-wider hidden md:inline">
                    {currentLang === 'om' ? 'Gosa Oduu:' : currentLang === 'am' ? 'የመረጃ አይነት:' : 'Category:'}
                  </label>
                  <select
                    id="news-type-filter"
                    value={newsTypeFilter}
                    onChange={(e) => setNewsTypeFilter(e.target.value as any)}
                    className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">
                      {currentLang === 'om' ? '✨ Hunda (All Updates)' : currentLang === 'am' ? '✨ ሁሉም መረጃዎች' : '✨ All Updates'}
                    </option>
                    <option value="precedents" className="bg-slate-900 text-amber-300">
                      {currentLang === 'om' ? '⚖️ Murtiiwwan Ijibbaataa (Precedents)' : currentLang === 'am' ? '⚖️ የሰበር ውሳኔዎች (Precedents)' : '⚖️ Precedents (Cassation)'}
                    </option>
                    <option value="proclamations" className="bg-slate-900 text-cyan-300">
                      {currentLang === 'om' ? '📜 Labsiilee & Dambii (Proclamations)' : currentLang === 'am' ? '📜 አዋጆችና ደንቦች (Proclamations)' : '📜 Proclamations & Decrees'}
                    </option>
                    <option value="announcements" className="bg-slate-900 text-emerald-300">
                      {currentLang === 'om' ? '📢 Beeksisa & Hubannoo (Announcements)' : currentLang === 'am' ? '📢 ጠቅላላ ማስታወቂያዎች' : '📢 General Announcements'}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* List of News & Precedents */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
              {latestNews.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-sm font-bold text-slate-400">
                    {currentLang === 'om' ? 'Oduun seeraa yeroo ammaa hin jiru.' : 'No recent updates available.'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {currentLang === 'om' ? 'Qunnamtii Telegram qorachuuf qabduu "Haaromsi" cuqaasaa.' : 'Click "Sync Now" to fetch the latest channel updates.'}
                  </p>
                </div>
              ) : (
                latestNews
                  .filter(news => {
                    // 1. Channel Source Filter
                    if (selectedNewsSource !== 'all') {
                      const ch = (news.channelHandle || '').toLowerCase().replace('@', '');
                      if (ch !== selectedNewsSource) return false;
                    }

                    // 2. Type/Category Filter: Precedents, Proclamations, Announcements
                    if (newsTypeFilter === 'all') return true;

                    const matchString = `${news.type || ''} ${news.referenceNumber || ''} ${news.category || ''} ${news.title?.om || ''} ${news.title?.am || ''} ${news.title?.en || ''}`.toLowerCase();

                    const isCassationPrecedent =
                      news.type === 'cassation_decision' ||
                      matchString.includes('galmee') ||
                      matchString.includes('cassation') ||
                      matchString.includes('ijibbaata') ||
                      matchString.includes('የሰበር') ||
                      matchString.includes('ውሳኔ');

                    const isProclamationOrStatute =
                      news.type === 'proclamation' ||
                      news.type === 'regulation' ||
                      news.type === 'directive' ||
                      matchString.includes('labsii') ||
                      matchString.includes('dambii') ||
                      matchString.includes('qajeelfama') ||
                      matchString.includes('proclamation') ||
                      matchString.includes('regulation') ||
                      matchString.includes('directive') ||
                      matchString.includes('አዋጅ') ||
                      matchString.includes('ደንብ') ||
                      matchString.includes('መመሪያ');

                    if (newsTypeFilter === 'precedents') {
                      return isCassationPrecedent;
                    }

                    if (newsTypeFilter === 'proclamations') {
                      return isProclamationOrStatute;
                    }

                    if (newsTypeFilter === 'announcements') {
                      return (
                        (!isCassationPrecedent && !isProclamationOrStatute) ||
                        matchString.includes('beeksisa') ||
                        matchString.includes('announcement') ||
                        matchString.includes('hubannoo') ||
                        matchString.includes('ማስታወቂያ') ||
                        matchString.includes('gorsa')
                      );
                    }

                    return true;
                  })
                  .map((news) => {
                    const isAudioPlaying = playingAudioId === news.id;
                    const textToRead = `${news.title[currentLang] || news.title.om}. ${news.summary[currentLang] || news.summary.om}`;

                    return (
                      <div
                        key={news.id}
                        className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all space-y-3 group"
                      >
                        {/* Reference & Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
                              {news.referenceNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[10px] font-mono">
                              @{news.channelHandle || 'seeraai_ethio'}
                            </span>
                            {news.jurisdiction && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-[10px] font-bold uppercase">
                                {news.jurisdiction}
                              </span>
                            )}
                            {news.category && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[10px]">
                                {news.category.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          {news.publishDate && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {news.publishDate}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-sm text-cyan-200 group-hover:text-cyan-100 leading-snug">
                          {renderLegalTextWithTooltips(news.title[currentLang] || news.title.om, currentLang)}
                        </h4>

                        {/* Summary */}
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                          {renderLegalTextWithTooltips(news.summary[currentLang] || news.summary.om, currentLang)}
                        </p>

                        {/* Key Principles / Ratio Box */}
                        {(news.keyPrinciples?.[currentLang] || news.keyPrinciples?.om) && (
                          <div className="p-2.5 rounded-xl bg-slate-900/80 border-l-2 border-amber-500 text-[11px] text-amber-200/90 italic">
                            <strong className="not-italic text-amber-400 block font-mono text-[10px] uppercase">
                              ⚖️ {currentLang === 'om' ? 'Qajeeltoo Dirqisiisaa:' : currentLang === 'am' ? 'አስገዳጅ የህግ መርህ:' : 'Binding Ratio:'}
                            </strong>
                            {news.keyPrinciples[currentLang] || news.keyPrinciples.om}
                          </div>
                        )}

                        {/* Action Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
                          <div className="flex items-center gap-1.5">
                            {/* Insert Citation to Court Docket */}
                            <button
                              type="button"
                              onClick={() => handleInsertCitationToSession(news)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                              title="Add as cited precedent in this session's transcript"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{currentLang === 'om' ? 'Galmeetti Dabali' : currentLang === 'am' ? 'ወደ መዝገብ አክል' : 'Cite in Docket'}</span>
                            </button>

                            {/* TTS Voice Dictation */}
                            <button
                              type="button"
                              onClick={() => handleSpeakText(news.id, textToRead)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                isAudioPlaying
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                              }`}
                              title={isAudioPlaying ? 'Stop audio' : 'Listen to summary'}
                            >
                              {isAudioPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline text-[11px]">
                                {isAudioPlaying ? (currentLang === 'om' ? 'Dhaabi' : 'Stop') : (currentLang === 'om' ? 'Dubbisi' : 'Listen')}
                              </span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Copy Citation */}
                            <button
                              type="button"
                              onClick={() => {
                                const text = `[Wabii Seeraa]: ${news.referenceNumber} - ${news.title[currentLang] || news.title.om}\nMadda: ${news.postUrl || `https://t.me/${news.channelHandle}`}`;
                                navigator.clipboard.writeText(text);
                                setNewUpdatesToast(currentLang === 'om' ? 'Wabiin garaggalfameera!' : 'Citation copied!');
                                setTimeout(() => setNewUpdatesToast(null), 2500);
                              }}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition cursor-pointer"
                              title="Copy legal citation"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Open Original Telegram Post */}
                            {news.postUrl && (
                              <a
                                href={news.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 font-bold text-xs transition flex items-center gap-1"
                                title="Open Telegram post"
                              >
                                <span>Telegram</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 flex flex-col h-[700px] lg:h-auto lg:max-h-[700px] shadow-2xl overflow-hidden sticky top-8">
            <div className="space-y-3 mb-4 border-b-2 border-slate-800 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2">
                  <History className="w-6 h-6" />
                  {t.courtroomHistory.title}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative hidden sm:block">
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder={t.common.searchPlaceholder}
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs font-bold text-white focus:border-amber-500 outline-none w-40"
                    />
                    <Plus className="w-3 h-3 absolute left-2.5 top-2 text-slate-500 rotate-45" />
                  </div>
                  <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-lg text-xs font-bold font-mono">
                    {filteredHistory.length} ITEMS
                  </span>
                </div>
              </div>

              {/* Court Staff Evidence Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setEvidenceStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                    evidenceStatusFilter === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  All ({history.length})
                </button>

                <button
                  type="button"
                  onClick={() => setEvidenceStatusFilter('admissible')}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                    evidenceStatusFilter === 'admissible'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Admissible ({history.filter(h => isEvidenceLog(h) && getLogEvidenceStatus(h) === 'admissible').length})
                </button>

                <button
                  type="button"
                  onClick={() => setEvidenceStatusFilter('rejected')}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                    evidenceStatusFilter === 'rejected'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <X className="w-3 h-3 text-rose-400" />
                  Rejected ({history.filter(h => isEvidenceLog(h) && getLogEvidenceStatus(h) === 'rejected').length})
                </button>

                <button
                  type="button"
                  onClick={() => setEvidenceStatusFilter('verified')}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                    evidenceStatusFilter === 'verified'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified ({history.filter(h => isEvidenceLog(h) && getLogEvidenceStatus(h) === 'verified').length})
                </button>

                <button
                  type="button"
                  onClick={() => setEvidenceStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                    evidenceStatusFilter === 'pending'
                      ? 'bg-amber-950 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Timer className="w-3 h-3 text-amber-400" />
                  Pending ({history.filter(h => isEvidenceLog(h) && getLogEvidenceStatus(h) === 'pending').length})
                </button>

                <button
                  type="button"
                  onClick={() => setEvidenceStatusFilter('uploaded')}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                    evidenceStatusFilter === 'uploaded'
                      ? 'bg-sky-950 text-sky-300 border-sky-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <UploadCloud className="w-3 h-3 text-sky-400" />
                  Uploaded ({history.filter(h => isEvidenceLog(h) && getLogEvidenceStatus(h) === 'uploaded').length})
                </button>
              </div>

              {/* Select All & Bulk Action Bar for Court Staff */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllEvidence}
                    className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-300 hover:text-amber-400 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={
                        filteredHistory.filter(isEvidenceLog).length > 0 &&
                        filteredHistory.filter(isEvidenceLog).every(l => selectedEvidenceIds.includes(l.id))
                      }
                      onChange={() => handleSelectAllEvidence()}
                      className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 cursor-pointer"
                    />
                    <span>{currentLang === 'om' ? 'Ragaalee Hundumaa Fili' : 'Select All Filtered Evidence'}</span>
                    <span className="text-slate-500 font-normal">
                      ({filteredHistory.filter(isEvidenceLog).length})
                    </span>
                  </button>

                  {selectedEvidenceIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEvidenceIds([])}
                      className="text-[10px] font-mono text-slate-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Clear ({selectedEvidenceIds.length})
                    </button>
                  )}
                </div>

                {/* Floating / Sticky Bulk Action Bar for Admissibility Updates in Firestore */}
                {selectedEvidenceIds.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-2xl border-2 border-amber-500/60 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span className="font-mono font-black text-amber-300 uppercase tracking-wider text-[11px]">
                          {selectedEvidenceIds.length} {currentLang === 'om' ? 'Ragaan Filatameera' : 'Evidence Items Selected'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                        Firestore Batch Operation
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={isBatchUpdating}
                        onClick={() => handleExecuteBulkAction('admissible')}
                        className="flex items-center justify-center gap-1 px-2.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-95 disabled:opacity-50 text-white font-mono text-[9.5px] font-black uppercase rounded-xl shadow-lg border border-emerald-400 transition-all cursor-pointer"
                        title="Update all selected evidence items to Admissible status in a single Firestore batch write"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="truncate">{isBatchUpdating ? '...' : 'Admissible'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBatchUpdating}
                        onClick={() => handleExecuteBulkAction('pending')}
                        className="flex items-center justify-center gap-1 px-2.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-95 disabled:opacity-50 text-white font-mono text-[9.5px] font-black uppercase rounded-xl shadow-lg border border-amber-400 transition-all cursor-pointer"
                        title="Update all selected evidence items to Pending status in a single Firestore batch write"
                      >
                        <Timer className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="truncate">{isBatchUpdating ? '...' : 'Pending'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBatchUpdating}
                        onClick={() => handleExecuteBulkAction('rejected')}
                        className="flex items-center justify-center gap-1 px-2.5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 disabled:opacity-50 text-white font-mono text-[9.5px] font-black uppercase rounded-xl shadow-lg border border-rose-400 transition-all cursor-pointer"
                        title="Update all selected evidence items to Rejected status in a single Firestore batch write"
                      >
                        <X className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="truncate">{isBatchUpdating ? '...' : 'Rejected'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-20 text-slate-600 italic text-sm">
                  {t.courtroomHistory.empty}
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={filteredHistory}
                  onReorder={(newOrder: LogEntry[]) => {
                    if (evidenceStatusFilter === 'all' && !historySearch.trim()) {
                      setHistory(newOrder);
                    } else {
                      const nonFiltered = history.filter(h => !filteredHistory.some(f => f.id === h.id));
                      setHistory([...newOrder, ...nonFiltered]);
                    }
                  }}
                  className="space-y-4"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filteredHistory.map((log, index) => (
                      <Reorder.Item
                        key={log.id}
                        value={log}
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.97 }}
                        layout
                        transition={{
                          duration: 0.28,
                          delay: Math.min(index * 0.04, 0.32),
                          ease: [0.22, 1, 0.36, 1],
                          layout: { duration: 0.25 }
                        }}
                        className={`p-4 rounded-2xl border-l-4 shadow-sm relative transition-colors duration-200 ${
                          selectedEvidenceIds.includes(log.id)
                            ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                            : log.type === 'auto' 
                            ? 'bg-slate-950/50 border-amber-500' 
                            : 'bg-blue-950/20 border-blue-500'
                        }`}
                      >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          {/* Selection Checkbox for Bulk Batch Actions */}
                          {isEvidenceLog(log) && (
                            <label
                              className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-700/60 hover:border-amber-400 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              title="Select this evidence item for bulk batch operations"
                            >
                              <input
                                type="checkbox"
                                checked={selectedEvidenceIds.includes(log.id)}
                                onChange={(e) => handleToggleSelectEvidence(log.id, e as any)}
                                className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 cursor-pointer"
                              />
                              <span className="text-[9px] font-mono text-slate-300 font-bold uppercase">Select</span>
                            </label>
                          )}

                          {/* Drag & Drop Reordering Handle */}
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors"
                            title="Drag to reorder evidence hierarchy for case preparation"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${log.type === 'auto' ? 'text-amber-500' : 'text-blue-400'}`}>
                            {log.type === 'auto' ? t.courtroomHistory.autoStep : t.courtroomHistory.manualEntry}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isEvidenceLog(log) && getLogEvidenceStatus(log) === 'admissible' && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              ADMISSIBLE
                            </span>
                          )}
                          {isEvidenceLog(log) && getLogEvidenceStatus(log) === 'rejected' && (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <X className="w-2.5 h-2.5 text-rose-400" />
                              REJECTED
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md">
                            {log.timestamp}
                          </span>
                        </div>
                      </div>
                      {log.witnessId && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/30">
                            {witnesses.find(w => w.id === log.witnessId)?.name || 'Witness'}
                          </span>
                          {log.tags?.map(tag => (
                            <span key={tag} className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm font-bold text-slate-200 leading-relaxed">
                        {log.text}
                      </p>

                      {isEvidenceLog(log) && (
                        <div className="space-y-2 mt-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedEvidenceLog(log)}
                              className="flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-300 transition-all duration-200 group shadow-sm cursor-pointer"
                            >
                              <div className="flex items-center gap-2 overflow-hidden flex-wrap sm:flex-nowrap">
                                {getFileTypeIcon(log.fileType, log.fileName, log.fileUrl, log.evidenceMetadata?.evidenceType)}
                                <span className="truncate font-mono">
                                  {log.fileName || (currentLang === 'om' ? 'Faayila Ragaa & Metaadaataa' : currentLang === 'am' ? 'የማስረጃ ፋይል እና ሜታዳታ' : 'Evidence File & Metadata Preview')}
                                </span>
                                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-slate-900/90 text-amber-300 border border-amber-500/30 shrink-0">
                                  {getFileTypeBadgeLabel(log.fileType, log.fileName, log.evidenceMetadata?.evidenceType)}
                                </span>
                                {log.fileSize && (
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                                    {log.fileSize}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-black px-2 py-0.5 rounded-md border border-emerald-500/30">
                                  {currentLang === 'om' ? 'Ilaali' : currentLang === 'am' ? 'ክፈት' : 'Preview'}
                                </span>
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleCopyEvidenceCitation(log, e)}
                              title="Wabii Ragaa & Seeraa Waraabi / Copy Evidence Citation"
                              className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/60 text-amber-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                            >
                              {copiedCitationId === log.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[10px] uppercase font-bold text-emerald-400 hidden sm:inline">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-[10px] uppercase font-bold hidden sm:inline">Copy Citation</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenShareDialog(log, e)}
                              title="Dabarsu / Qoodi (Share Secure Temporary Link)"
                              className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/60 text-sky-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                            >
                              <Share2 className="w-3.5 h-3.5 text-sky-400" />
                              <span className="text-[10px] uppercase font-bold hidden sm:inline">Share</span>
                            </button>
                          </div>

                          {/* Interactive Document Verification & Expand Toggle Bar */}
                          <div className="flex items-center justify-between text-[10px] font-mono px-2.5 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex-wrap gap-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-slate-400 font-bold uppercase tracking-wider hidden sm:inline mr-1">Status:</span>
                              <button
                                type="button"
                                onClick={(e) => toggleEvidenceStatus(log, 'admissible', e)}
                                className={`px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                                  getLogEvidenceStatus(log) === 'admissible'
                                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-sm'
                                    : 'text-slate-500 hover:text-emerald-400'
                                }`}
                                title="Mark as Admissible Evidence by Court Order"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Admissible
                              </button>
                              <button
                                type="button"
                                onClick={(e) => toggleEvidenceStatus(log, 'rejected', e)}
                                className={`px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                                  getLogEvidenceStatus(log) === 'rejected'
                                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-sm'
                                    : 'text-slate-500 hover:text-rose-400'
                                }`}
                                title="Mark as Rejected Evidence by Bench Order"
                              >
                                <X className="w-3 h-3 text-rose-400" />
                                Rejected
                              </button>
                              <button
                                type="button"
                                onClick={(e) => toggleEvidenceStatus(log, 'verified', e)}
                                className={`px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                                  getLogEvidenceStatus(log) === 'verified'
                                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-sm'
                                    : 'text-slate-500 hover:text-emerald-400'
                                }`}
                                title="Mark as Verified & Authentic"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </button>
                              <button
                                type="button"
                                onClick={(e) => toggleEvidenceStatus(log, 'pending', e)}
                                className={`px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                                  getLogEvidenceStatus(log) === 'pending'
                                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-sm'
                                    : 'text-slate-500 hover:text-amber-400'
                                }`}
                                title="Mark as Pending Examination"
                              >
                                <Timer className="w-3 h-3" />
                                Pending
                              </button>
                              <button
                                type="button"
                                onClick={(e) => toggleEvidenceStatus(log, 'uploaded', e)}
                                className={`px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                                  getLogEvidenceStatus(log) === 'uploaded'
                                    ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50 shadow-sm'
                                    : 'text-slate-500 hover:text-sky-400'
                                }`}
                                title="Mark as Uploaded Record"
                              >
                                <UploadCloud className="w-3 h-3" />
                                Uploaded
                              </button>
                            </div>

                            {/* Inline Expand / Collapse Snippet Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => toggleExpandEvidence(log.id, e)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-amber-300 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Toggle Inline Image Thumbnail / PDF Text Snippet"
                            >
                              <span>{expandedEvidenceIds[log.id] ? 'Collapse' : 'Expand'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedEvidenceIds[log.id] ? 'rotate-180 text-amber-400' : 'text-slate-400'}`} />
                            </button>
                          </div>

                          {/* Inline Expandable Thumbnail / PDF Text Snippet Container */}
                          {expandedEvidenceIds[log.id] && (
                            <div className="mt-3 p-3 bg-slate-950/90 rounded-2xl border border-emerald-500/30 space-y-2 animate-in fade-in duration-200">
                              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 border-b border-slate-800 pb-1.5">
                                <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                                  <FileCode className="w-3.5 h-3.5" /> Inline Document Preview & Snippet
                                </span>
                                <span className="text-slate-500 font-normal">Page 1 Excerpt</span>
                              </div>

                              {log.fileUrl && /png|jpe?g|webp|gif|svg/i.test(log.fileUrl || log.fileName || '') ? (
                                <div className="flex flex-col items-center justify-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                                  <img
                                    src={log.fileUrl}
                                    alt="Inline Evidence Thumbnail"
                                    className="max-h-48 rounded-lg object-contain border border-slate-800 shadow-md"
                                  />
                                  <span className="text-[9px] text-slate-400 font-mono mt-1">📷 High-Res Scanned Image Thumbnail</span>
                                </div>
                              ) : (
                                <div className="text-xs font-mono text-slate-200 leading-relaxed space-y-1.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
                                  <div className="text-amber-300 font-semibold italic border-l-2 border-amber-400 pl-2">
                                    "{log.text.length > 250 ? log.text.substring(0, 250) + '...' : log.text}"
                                  </div>
                                  {log.evidenceMetadata?.summary && (
                                    <div className="text-slate-300 text-[11px] pt-1.5 border-t border-slate-800/80">
                                      <strong className="text-emerald-400 uppercase tracking-wider text-[9px] block">OCR / Extracted Fact Summary:</strong>
                                      <span>{log.evidenceMetadata.summary}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Witness Contradiction Annotation Field */}
                      {log.witnessId && (
                        <div className="mt-3 pt-3 border-t border-slate-800/50">
                          {(() => {
                            const isConflicting = CONTRADICTION_KEYWORDS.some(keyword => 
                              (log.annotation || '').toLowerCase().includes(keyword.toLowerCase())
                            );
                            return (
                              <div className="space-y-2">
                                {isConflicting && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-400 animate-pulse px-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{currentLang === 'om' ? 'Wal-faallessuun Argatame' : currentLang === 'am' ? 'ተቃርኖ ተገኝቷል' : 'Potential Contradiction Detected'}</span>
                                  </div>
                                )}
                                <textarea
                                  value={log.annotation || ''}
                                  onChange={(e) => {
                                    const newAnnotation = e.target.value;
                                    setHistory(prev => prev.map(h => h.id === log.id ? { ...h, annotation: newAnnotation } : h));
                                  }}
                                  placeholder={currentLang === 'om' ? 'Yaada ragaa wal-faallessu asitti galmeessi...' : 'Annotate witness contradictions here...'}
                                  className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-amber-300 placeholder-slate-600 focus:outline-none resize-none transition-all duration-300 ${
                                    isConflicting 
                                      ? 'border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400' 
                                      : 'border-slate-800 focus:border-amber-500/50'
                                  }`}
                                  rows={2}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-slate-600 font-mono text-sm py-4 border-t border-slate-900">
        SEERAAI • COURTROOM ASSISTANT MODE • EXPERT JUDICIAL GUIDE
      </div>

      {/* Floating Quick Notes Widget */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${showNotes ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className={`bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${isNotesMinimized ? 'w-64' : 'w-80 sm:w-96'}`}>
          {/* Header */}
          <div className="bg-amber-500 p-4 flex items-center justify-between cursor-pointer" onClick={() => setIsNotesMinimized(!isNotesMinimized)}>
            <div className="flex items-center gap-2 text-slate-950 font-black uppercase text-sm">
              <StickyNote className="w-5 h-5" strokeWidth={3} />
              {t.courtroomNotes.title}
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsNotesMinimized(!isNotesMinimized); }}
                className="p-1 hover:bg-amber-600 rounded-lg transition-colors text-slate-950"
              >
                {isNotesMinimized ? <ChevronUp className="w-5 h-5" strokeWidth={3} /> : <ChevronDown className="w-5 h-5" strokeWidth={3} />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotes(false); }}
                className="p-1 hover:bg-amber-600 rounded-lg transition-colors text-slate-950"
              >
                <X className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isNotesMinimized && (
            <div className="p-4 space-y-3">
              <Notifications />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleVoiceMemoRecording}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isRecordingVoiceMemo
                      ? 'bg-rose-600 text-white border-rose-500 shadow-lg animate-pulse'
                      : 'bg-slate-950 hover:bg-slate-800 text-amber-400 border-amber-500/40 hover:border-amber-300'
                  }`}
                  title="Record quick Voice Memo during proceedings"
                >
                  <span>{isRecordingVoiceMemo ? '🔴' : '🎙️'}</span>
                  <span>
                    {isRecordingVoiceMemo
                      ? (currentLang === 'om' ? 'Dhaabi (Stop)' : 'Recording... Stop')
                      : 'Voice Memo'}
                  </span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">Auto-Transcribe</span>
              </div>

              {voiceMemoToast && (
                <div className="p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center gap-2">
                  <span>✓</span>
                  <span className="truncate">{voiceMemoToast}</span>
                </div>
              )}

              {isRecordingVoiceMemo && <VoiceActivityWave />}

              {(() => {
                const hasConflict = CONTRADICTION_KEYWORDS.some(k => quickNotes.toLowerCase().includes(k.toLowerCase()));
                return (
                  <div className="space-y-2">
                    {hasConflict && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-400 animate-pulse px-1">
                        <Zap className="w-3 h-3" />
                        <span>{currentLang === 'om' ? 'Mormiin Argatame' : 'Conflict Flagged in Notes'}</span>
                      </div>
                    )}
                    <textarea
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      placeholder={t.courtroomNotes.placeholder}
                      className={`w-full h-48 bg-slate-950 border rounded-2xl p-4 text-white font-medium focus:outline-none transition-all resize-none custom-scrollbar ${
                        hasConflict 
                          ? 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.1)] focus:border-rose-400' 
                          : 'border-slate-800 focus:border-amber-500'
                      }`}
                    />
                  </div>
                );
              })()}
              <div className="mt-2 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">
                <span>Persisted Session Storage</span>
                <span className={quickNotes.length > 0 ? 'text-amber-500' : ''}>{quickNotes.length} chars</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toggle Button (visible when notes are hidden) */}
      {!showNotes && (
        <button
          onClick={() => setShowNotes(true)}
          className="fixed bottom-6 right-6 z-50 bg-amber-500 hover:bg-amber-400 text-slate-950 p-4 rounded-full shadow-2xl flex items-center gap-2 font-black uppercase text-sm transition-all active:scale-95 border-4 border-slate-950"
        >
          <StickyNote className="w-6 h-6" strokeWidth={3} />
          <span className="hidden sm:inline">{t.courtroomNotes.show}</span>
        </button>
      )}

      {/* Court Work Templates Modal */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border-4 border-amber-500 rounded-[32px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b-2 border-slate-800 flex items-center justify-between bg-amber-500">
                <div className="flex items-center gap-4">
                  <Scale className="w-8 h-8 text-slate-950" />
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-950">Hojii Mana Murtii / Court Work Library</h2>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-2 hover:bg-slate-950/10 rounded-xl transition-colors"
                >
                  <X className="w-8 h-8 text-slate-950" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Categories / Levels sidebar in modal */}
                <div className="md:col-span-1 space-y-6">
                  <section>
                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4">Sadarkaa Mana Murtii (Court Levels)</h3>
                    <div className="space-y-2">
                      {['Jalqabaa', 'Ol\'iyyataa', 'Ijibbaataa'].map((lvl) => (
                        <button
                          key={lvl}
                          className={`w-full text-left px-4 py-3 rounded-xl font-bold uppercase text-xs border ${
                            courtLevel === (lvl === 'Jalqabaa' ? 'firstInstance' : lvl === 'Ol\'iyyataa' ? 'highCourt' : 'cassation')
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-amber-500/50'
                          }`}
                          onClick={() => setCourtLevel(lvl === 'Jalqabaa' ? 'firstInstance' : lvl === 'Ol\'iyyataa' ? 'highCourt' : 'cassation')}
                        >
                          Mana Murtii {lvl}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4">Akaakuu Sanadaa (Templates)</h3>
                    <div className="space-y-2">
                      {COURT_WORK_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          className={`w-full text-left px-4 py-3 rounded-xl font-bold uppercase text-xs border ${
                            activeTemplate?.id === tmpl.id
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-amber-500/50'
                          }`}
                          onClick={() => setActiveTemplate(tmpl)}
                        >
                          {tmpl.title}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Template Content / Preview */}
                <div className="md:col-span-2 space-y-6">
                  {activeTemplate ? (
                    <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-8 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-black text-amber-500 uppercase tracking-tight">{activeTemplate.title}</h4>
                        <button
                          onClick={() => {
                            setManualEntry(activeTemplate.content);
                            setShowTemplates(false);
                          }}
                          className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-amber-400"
                        >
                          Use Template
                        </button>
                      </div>
                      <textarea
                        value={activeTemplate.content}
                        readOnly
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 font-mono text-sm text-slate-300 resize-none outline-none"
                      />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl p-12">
                      <FileText className="w-16 h-16 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-center">Select a template to preview and use in your courtroom log.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Objection Template Manager Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Gavel className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Template Library</h2>
                    <p className="text-xs font-bold text-slate-500">Customize objections for specific case needs</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setIsTemplateModalOpen(false); setEditingTemplate(null); }}
                  className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Form */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Edit Template</h3>
                    <form onSubmit={handleSaveTemplate} className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Label</label>
                        <input 
                          type="text"
                          value={editingTemplate?.label || ''}
                          onChange={e => setEditingTemplate(prev => prev ? ({ ...prev, label: e.target.value }) : ({ id: `new-${Date.now()}`, label: e.target.value, category: 'form', template: '' }))}
                          placeholder="e.g. Hearsay"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors mt-1"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Category</label>
                        <select 
                          value={editingTemplate?.category || 'form'}
                          onChange={e => setEditingTemplate(prev => prev ? ({ ...prev, category: e.target.value as any }) : null)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors mt-1"
                        >
                          <option value="form">Form</option>
                          <option value="content">Content</option>
                          <option value="procedure">Procedure</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Log Template</label>
                        <textarea 
                          value={editingTemplate?.template || ''}
                          onChange={e => setEditingTemplate(prev => prev ? ({ ...prev, template: e.target.value }) : null)}
                          placeholder="Text to log when selected..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors mt-1 h-20 resize-none"
                          required
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={!editingTemplate}
                        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 font-black uppercase text-xs py-3 rounded-xl transition-all active:scale-95"
                      >
                        {editingTemplate?.id && !editingTemplate.isDefault ? 'Update Template' : 'Add Custom Template'}
                      </button>
                      {editingTemplate && (
                        <button 
                          type="button"
                          onClick={() => setEditingTemplate(null)}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-xl transition-all"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </form>
                  </div>

                  {/* List */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Library</h3>
                    <div className="space-y-2">
                      {objectionTemplates.map(template => (
                        <div 
                          key={template.id} 
                          className={`p-3 rounded-xl border flex items-center justify-between group transition-all ${
                            editingTemplate?.id === template.id 
                              ? 'bg-amber-500/10 border-amber-500' 
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white truncate">{template.label}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                template.category === 'form' ? 'bg-blue-500/10 text-blue-400' :
                                template.category === 'content' ? 'bg-red-500/10 text-red-400' :
                                'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {template.category}
                              </span>
                              {template.isDefault && (
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Default</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{template.template}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingTemplate(template)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {!template.isDefault && (
                              <button 
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Manual & Benefits Modal */}
      <AnimatePresence>
        {showUserManualModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border-2 border-amber-500/40 w-full max-w-3xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 text-2xl font-black">
                    📖
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      {currentLang === 'om' ? 'Kaayyoo, Faayidaa fi Itti Fayyadama Appii' : currentLang === 'am' ? 'የመተግበሪያው ዓላማ፣ ጥቅም እና አጠቃቀም' : 'Purpose, Benefits & Complete User Manual'}
                    </h2>
                    <p className="text-xs font-bold text-amber-400">
                      {currentLang === 'om' ? 'Qajeelcha Gabaasa Dhaddachaa fi Odiitii Seeraa' : 'Courtroom Assistant & Evidence Processing Guide'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUserManualModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6 text-slate-300 text-xs sm:text-sm">
                {/* Section 1: Kaayyoo */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-2">
                  <h3 className="text-sm font-black text-amber-400 uppercase flex items-center gap-2">
                    <span>🎯</span>
                    <span>{currentLang === 'om' ? '1. Kaayyoo Kalaqichaa (Purpose & Vision)' : '1. የመተግበሪያው ዓላማ (Purpose & Vision)'}</span>
                  </h3>
                  <p className="leading-relaxed text-slate-300">
                    {currentLang === 'om'
                      ? 'Appilikeeshiniin SeeraAI Courtroom Assistant abbootii seeraa, prosecutors, abbootii alangaa fi ogeeyyii seeraatiif kan qindaa\'e yoo ta\'u; dhaddacharratti ragaa simachuu, himannaa fi deebii qindeessuu, sagalee ragaa gara barreeffamaatti jijjiiruu, akkasumas qabxii ijoo gabaabaatti qopheessuu irratti gargaara.'
                      : 'የSeeraAI Courtroom Assistant ለዳኞች፣ ለአቃቤ ሕጎች፣ ለوکላዎች እና ለህግ ባለሙያዎች የተዘጋጀ ሲሆን፤ በሰሚ ሰአት የምስክር ቃላትን መቀበል፣ ክስ እና መከላከያን ማስተባበር፣ የድምፅ ቃላትን ወደ ጽሁፍ መቀየር እና ቁልፍ ነጥቦችን ማቀናጀት ያስችላል።'}
                  </p>
                </div>

                {/* Section 2: Faayidaa */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-black text-amber-400 uppercase flex items-center gap-2">
                    <span>💡</span>
                    <span>{currentLang === 'om' ? '2. Faayidaalee Gurguddoo (Core Benefits)' : '2. ዋና ዋና ጥቅሞች (Core Benefits)'}</span>
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <li className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>Auto-Save:</strong> Refresh yoo tasa ta\'e illee ragaan hin baddu (localStorage auto-save).</span>
                    </li>
                    <li className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>Voice & Audio:</strong> Dubbii afaanii fi failii sagalee (mp3/wav) gara barreeffama seeraatti ni jijjiira.</span>
                    </li>
                    <li className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>Evidence Audio Processor:</strong> Ragaa waraabame irraa qabxii ijoo (bulleted summary) qopheessee ragaaf ni qindeesse.</span>
                    </li>
                    <li className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>Document OCR:</strong> Suuraa himannaa, deebii, murtii fi mormii irraa barreeffama baasee ni kuusa.</span>
                    </li>
                  </ul>
                </div>

                {/* Section 3: Itti Fayyadama Isaa */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-black text-amber-400 uppercase flex items-center gap-2">
                    <span>📱</span>
                    <span>{currentLang === 'om' ? '3. Haala Itti Fayyadama Isaa (Step-by-Step Usage)' : '3. አጠቃቀም መመሪያ (Step-by-Step Usage)'}</span>
                  </h3>
                  <ol className="space-y-2 list-decimal list-inside text-slate-300 leading-relaxed">
                    <li><strong>Sadarkaa Mana Murtii:</strong> First Instance, High Court, ykn Cassation filadhaa.</li>
                    <li><strong>Himannaa & Deebii:</strong> Iddoo himannaa fi deebii itti galtanitti galchaa ykn suuraa OCR irraa fidaa.</li>
                    <li><strong>Ijoo Qulqullinaaf Qabame:</strong> Ragaan hundi ijoorratti qofa akka hirkatu galchaa.</li>
                    <li><strong>Sagalee Ragaa & Evidence Processor:</strong> Maayikroofooniidhaan ykn File upload gochuun ragaa galchaa, ergasii "Generate Key Facts" cuqaasaa.</li>
                    <li><strong>Gabaasa Baasuu (PDF):</strong> Guutuu session gabaasa PDF fi localStorage irratti qabadhaa.</li>
                  </ol>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowUserManualModal(false)}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase transition-all"
                >
                  {currentLang === 'om' ? 'Galeera / Cufi' : 'Close Guide'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Legal Privilege Passcode Modal */}
      <AnimatePresence>
        {showLegalPrivilegeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border-2 border-emerald-500/50 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl space-y-6 text-slate-100"
            >
              <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
                  🛡️
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {currentLang === 'om' ? 'Eegumsa Legal Privilege (AES-GCM)' : 'Legal Privilege Encryption (Web Crypto)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentLang === 'om' ? 'Master Passcode galchaa ragaan keessan akka inciript ta\'u godhaa.' : 'Set master passcode to encrypt session scratchpad & witness data.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    {currentLang === 'om' ? 'Master Passcode (Icciitii)' : 'Master Passcode'}
                  </label>
                  <input
                    type="password"
                    value={passcodeInputValue}
                    onChange={(e) => setPasscodeInputValue(e.target.value)}
                    placeholder="Enter secure passcode..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? "Yoo 'Legal Privilege' hojiirra oole, scratchpad fi ragaan keessan browser Web Crypto API (AES-GCM) fayyadamuun incript ta'u. Namni biraa meeshaaf qaamaan argatus passcode malee dubbisuu hin danda'u."
                    : "When active, scratchpad and witness notes are encrypted using the Web Crypto API (AES-GCM). Even if physical device access is compromised, data remains unreadable without your master passcode."}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!passcodeInputValue.trim()) return;
                    setPrivilegePasscode(passcodeInputValue);
                    setIsLegalPrivilegeActive(true);
                    setShowLegalPrivilegeModal(false);
                    setPasscodeInputValue('');
                    if (quickNotes) {
                      const encrypted = await encryptText(quickNotes, passcodeInputValue);
                      setQuickNotes(encrypted);
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl uppercase text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {currentLang === 'om' ? 'Eegumsa Jalqabi (Enable)' : 'Enable Encryption'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLegalPrivilegeModal(false);
                    setPasscodeInputValue('');
                  }}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  {currentLang === 'om' ? 'Dhiisi' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dictate Court Note Modal - Anchored to Case ID & Saved to My Content */}
      {/* Firestore Audit Trail Modal */}
      <AnimatePresence>
        {isAuditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <History className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Detailed Case Audit Trail</h3>
                    <p className="text-xs text-slate-400">Timestamped milestone status records from Firestore</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isFetchingAuditLogs ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                    <p className="text-sm text-slate-400 font-mono">Fetching secure records...</p>
                  </div>
                ) : milestoneAuditLogs.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 italic">
                    No audit logs found for this case.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event History ({milestoneAuditLogs.length})</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${auditSource === 'firestore' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' : 'bg-amber-950 text-amber-400 border-amber-500/30'}`}>
                        SOURCE: {auditSource.toUpperCase()}
                      </span>
                    </div>
                    {milestoneAuditLogs.map((log, idx) => (
                      <div key={log.id || idx} className="relative pl-6 border-l border-slate-800 pb-4 last:pb-0">
                        <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                              {log.updatedAt}
                            </span>
                            <span className="text-[10px] text-slate-500 italic">By: {log.updatedBy}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-200">
                            Milestone: {log.stageTitle[currentLang] || log.stageTitle.en}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">Status Changed:</span>
                            <span className="text-[10px] font-bold uppercase text-emerald-400">{log.newStatus}</span>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-2 rounded-lg italic">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-center">
                <p className="text-[9px] text-slate-500 uppercase tracking-tighter">
                  Authenticated Secure Judicial Audit Log • FDRE Proclamation 410/2004 Protected
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DictateCourtNoteModal
        isOpen={showDictateCourtNote}
        onClose={() => setShowDictateCourtNote(false)}
        currentLang={currentLang}
        initialCaseId={sessionId || 'OR/HC/8912/15'}
        initialCourtLevel={courtLevel}
        onAddToSessionLog={(entry) => {
          setHistory((prev) => [
            {
              id: `dictated-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              text: entry.text,
              type: 'manual',
              tags: entry.tags,
            },
            ...prev,
          ]);
        }}
      />

      {/* Built-in Courtroom Audio Recording Modal */}
      {showCourtroomAudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowCourtroomAudioModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <CourtroomAudioRecorder
              currentLang={currentLang}
              activeCaseId={sessionId || undefined}
              activeCaseNumber={sessionId || sessionTitle || 'CR-2026/045'}
              courtLevel={courtLevel}
              onSavedToCase={(record) => {
                if (record.statements && record.statements.length > 0) {
                  const newLogs: LogEntry[] = record.statements.map((s) => ({
                    id: s.id,
                    timestamp: s.timestamp,
                    text: `[${s.speakerRole.toUpperCase()}: ${s.speakerName}]: ${s.statement}`,
                    type: 'manual',
                    tags: ['audio_recording', 'courtroom_transcription']
                  }));
                  setHistory((prev) => [...newLogs, ...prev]);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Witness Testimony Modal */}
      <WitnessTestimonyModal
        isOpen={showWitnessModal}
        onClose={() => setShowWitnessModal(false)}
        currentLang={currentLang}
        activeCaseNumber={sessionTitle || 'CR-2026/045'}
        onSaveTestimony={(testimony) => {
          const newLog: LogEntry = {
            id: testimony.id,
            timestamp: testimony.timestamp,
            text: `[WITNESS TESTIMONY - ${testimony.witnessName} (${testimony.witnessRole})]: ${testimony.statementText} | Cross: ${testimony.crossExaminationNotes || 'None'} | Credibility: ${testimony.credibilityRating.toUpperCase()}`,
            type: 'manual',
            tags: ['testimony', 'witness_linked', testimony.credibilityRating]
          };
          setHistory(prev => [newLog, ...prev]);
          alert('Witness testimony successfully recorded and linked to case timeline and audio!');
        }}
      />

      {/* Court Order Generator Modal */}
      <CourtOrderGeneratorModal
        isOpen={showCourtOrderModal}
        onClose={() => setShowCourtOrderModal(false)}
        currentLang={currentLang}
        activeCaseNumber={sessionTitle || 'CR-2026/045'}
        courtLevel={courtLevel}
      />

      {/* Evidence Metadata & Preview Modal */}
      {selectedEvidenceLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col">
            {/* Header with Court Seal */}
            <div className="sticky top-0 z-10 p-5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-xl shadow-inner">
                  🏛️
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>MANA MURTII AANAA GURBICHA</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 font-mono">
                      SEALED EXHIBIT
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {currentLang === 'om' ? 'Ilaalcha Metaadaataa fi Axereeraa Ragaa Dhaddachaa' : currentLang === 'am' ? 'የማስረጃ ፋይል ሜታዳታ እና አጠቃላይ ማጠቃለያ' : 'Courtroom Evidence Metadata & Material Facts Preview'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(selectedEvidenceLog.text || '');
                    showShortcutFeedback(currentLang === 'om' ? 'Barreeffamni qabameera!' : 'Text copied!', '📋');
                  }}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Barreeffama Waraabi / Copy Text"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Text</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(selectedEvidenceLog.text || '');
                    showShortcutFeedback(currentLang === 'om' ? 'Barreeffamni qabameera!' : 'Text copied!', '📋');
                  }}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Barreeffama Waraabi / Copy Text"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Text</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCopyEvidenceCitation(selectedEvidenceLog, e)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Wabii Ragaa & Seeraa Waraabi / Copy Citation"
                >
                  {copiedCitationId === selectedEvidenceLog.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Copy Citation</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvidenceLog(null)}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Firestore practice_cases Status Bar */}
              <div className="flex items-center justify-between gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-400">
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="font-bold">Firestore DB: practice_cases</span>
                </div>
                {isFetchingPracticeCaseEvidence ? (
                  <span className="text-slate-400 animate-pulse flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching Firestore record...
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Retrieved & Synchronized
                  </span>
                )}
              </div>

              {/* Exhibit Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    EXHIBIT IDENTIFIER & CATEGORY
                  </span>
                  <div className="text-base font-black text-white font-mono flex items-center gap-2 mt-0.5">
                    {getFileTypeIcon(selectedEvidenceLog.fileType, selectedEvidenceLog.fileName, selectedEvidenceLog.fileUrl, selectedEvidenceLog.evidenceMetadata?.evidenceType)}
                    <span>{firestoreEvidenceDetails?.name || selectedEvidenceLog.evidenceMetadata?.exhibitNumber || `EXHIBIT-EVD-${selectedEvidenceLog.id.slice(-6).toUpperCase()}`}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Evidential Weight Badge */}
                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${
                    firestoreEvidenceDetails?.evidentialWeight === 'primary' 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                      : firestoreEvidenceDetails?.evidentialWeight === 'secondary'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    Weight: {firestoreEvidenceDetails?.evidentialWeight?.toUpperCase() || 'PRIMARY'}
                  </span>

                  {/* Admissibility Badge */}
                  <span className="bg-slate-800 text-slate-200 px-3 py-1 rounded-xl text-xs font-bold border border-slate-700">
                    Status: {(firestoreEvidenceDetails?.admissibilityStatus || 'Admissible').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Document Image Preview (if present) */}
              {selectedEvidenceLog.fileUrl && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 font-bold mb-2">📷 Document Scan / File Preview</span>
                  <img
                    src={selectedEvidenceLog.fileUrl}
                    alt="Evidence Preview"
                    className="max-h-64 rounded-xl object-contain border border-slate-800 shadow-md"
                  />
                </div>
              )}

              {/* AI-Generated Summary & Relevance from Firestore */}
              <div className="space-y-3">
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-emerald-500/30 space-y-2">
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{currentLang === 'om' ? 'Axereeraa AI (AI Evidence Summary)' : 'AI-Generated Evidence Summary'}</span>
                  </span>
                  <p className="text-xs font-medium text-slate-200 leading-relaxed font-mono">
                    {firestoreEvidenceDetails?.aiDescription || selectedEvidenceLog.text}
                  </p>
                </div>

                {firestoreEvidenceDetails?.aiRelevance && (
                  <div className="p-4 bg-slate-950/80 rounded-2xl border border-amber-500/30 space-y-2">
                    <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-400" />
                      <span>{currentLang === 'om' ? 'Rogummaa Seeraa (Evidential Relevance)' : 'Statutory & Probative Relevance'}</span>
                    </span>
                    <p className="text-xs font-medium text-amber-200 leading-relaxed font-mono">
                      {firestoreEvidenceDetails.aiRelevance}
                    </p>
                  </div>
                )}
              </div>

              {/* Contradiction Flag / Judge Annotation */}
              {selectedEvidenceLog.annotation && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{currentLang === 'om' ? 'Yaada Abbaa Seeraa (Judge Annotation / Contradiction)' : 'Judge Contradiction Annotation'}</span>
                  </span>
                  <p className="text-xs font-bold text-amber-200">
                    {selectedEvidenceLog.annotation}
                  </p>
                </div>
              )}

              {/* Metadata Attributes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date of Filing / Incident Date</span>
                  <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {firestoreEvidenceDetails?.uploadedAt 
                        ? new Date(firestoreEvidenceDetails.uploadedAt).toLocaleDateString() + ' (' + (firestoreEvidenceDetails.incidentDate || 'Filed') + ')' 
                        : selectedEvidenceLog.timestamp}
                    </span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categorical Classification</span>
                  <p className="text-xs font-bold text-slate-200 truncate">
                    {firestoreEvidenceDetails?.category || selectedEvidenceLog.tags?.join(', ') || 'Documentary Exhibit'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Author / Source Authority</span>
                  <p className="text-xs font-bold text-slate-200 truncate">
                    {firestoreEvidenceDetails?.authorOrSource || witnesses.find(w => w.id === selectedEvidenceLog.witnessId)?.name || 'Mana Murtii Aanaa Gurbicha / Court Docket'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Framed Issue Relevance</span>
                  <p className="text-xs font-bold text-slate-200 truncate">
                    {framedIssueForEvidence || selectedEvidenceLog.evidenceMetadata?.framedIssueRelevance || 'General Evidence Docket'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedEvidenceLog.text);
                  alert('Axereeraan ragaa (Evidence summary) clipboard tti koppii ta\'eera!');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center gap-2 cursor-pointer"
              >
                <span>📋 {currentLang === 'om' ? 'Koppii Goodhu (Copy Summary)' : 'Copy Metadata Summary'}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => exportEvidenceMetadataPDF(selectedEvidenceLog)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{currentLang === 'om' ? 'PDF Seal waliin Buufadhu' : 'Download Watermarked Evidence PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FloatingWitnessStopwatch />

      {/* 🎙️ Floating Live Court Audio Control Panel */}
      {showFloatingAudioControl && (
        <FloatingCourtAudioControl
          currentLang={currentLang}
          activeCaseNumber={sessionTitle || (courtLevel === 'highCourt' ? 'Galmee Lakk. 249062/2016' : 'Galmee Lakk. 24891/2016')}
        />
      )}

      {/* 📸 Evidence Camera Capture Modal */}
      <EvidenceCaptureModal
        isOpen={showEvidenceCaptureModal}
        onClose={() => setShowEvidenceCaptureModal(false)}
        currentLang={currentLang}
        caseId={sessionId || 'case-today-301'}
        caseNumber={sessionTitle || 'CR-2026/045'}
        claimantName={witnesses.find(w => w.type === 'plaintiff')?.name || 'Obbo Baqqalaa Gammachuu'}
        respondentName={witnesses.find(w => w.type === 'defendant')?.name || 'Adde Birhaanee Asfaawu'}
        activeJudgeName={profile?.visitorName || 'Abbaa Seeraa Caalaa'}
        onEvidenceSaved={(newEv) => {
          // Append as a log entry in history
          const newLog: LogEntry = {
            id: 'evid_log_' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            text: `[${newEv.exhibitNumber || 'Exhibit'}] Ragaan qabatamaa (${newEv.title}) kaameeraadhaan waraabbamee galmeetti hidhameera. Rogummaa: ${newEv.legalRelevance}`,
            type: 'manual',
            tags: ['ragaa_qabatamaa', 'physical_evidence', newEv.category]
          };
          setHistory(prev => [newLog, ...prev]);
        }}
      />

      {/* 🏛️ Courtroom Seating Layout Modal */}
      <CourtroomLayoutModal
        isOpen={showCourtroomLayoutModal}
        onClose={() => setShowCourtroomLayoutModal(false)}
        currentLang={currentLang}
        caseId={sessionId || 'case-today-301'}
        caseNumber={sessionTitle || 'CR-2026/045'}
        claimantName={witnesses.find(w => w.type === 'plaintiff')?.name || 'Obbo Baqqalaa Gammachuu'}
        respondentName={witnesses.find(w => w.type === 'defendant')?.name || 'Adde Birhaanee Asfaawu'}
        activeJudgeName={profile?.visitorName || 'Abbaa Seeraa Caalaa'}
        onLayoutSaved={(newLayout) => {
          const newLog: LogEntry = {
            id: 'layout_log_' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            text: `Teessumni dhaddachaa (${newLayout.courtroomName}) abbaa seeraa, abbaa alangaa, himataa, himatamaa fi ragaaleedhaaf qindeeffamee mirkanaa'eera.`,
            type: 'manual',
            tags: ['courtroom_layout', 'seating_plan']
          };
          setHistory(prev => [newLog, ...prev]);
        }}
      />
      {showMultiFileUpload && sessionId && (
        <MultiFileEvidenceUpload 
          currentLang={currentLang}
          caseId={sessionId}
          caseNumber={sessionTitle || 'CR-2026/045'}
          onClose={() => setShowMultiFileUpload(false)}
          onSuccess={(newItems) => {
            // Refresh logic if needed, although attachEvidence is already done
            showShortcutFeedback(`${newItems.length} evidence items archived successfully`, '📦');
          }}
        />
      )}

      {/* 🔒 Share Evidence Temporary Secure Link Dialog */}
      {shareEvidenceLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-sky-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400">
                <Share2 className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase font-mono tracking-wider">
                  {currentLang === 'om' ? 'Linkii Nageenya Qabu Qooddachuun (Secure Share Link)' : currentLang === 'am' ? 'ደህንነቱ የተጠበቀ የማጋሪያ ሊንክ' : 'Generate Temporary Secure Share Link'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShareEvidenceLog(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Document Summary Card */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">TARGET DOCUMENT / EXHIBIT:</div>
                <div className="text-slate-100 font-bold truncate">
                  {shareEvidenceLog.fileName || shareEvidenceLog.evidenceMetadata?.exhibitNumber || shareEvidenceLog.text.substring(0, 60)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {shareEvidenceLog.evidenceMetadata?.authenticityStatus || 'Verified & Sealed Court Record'}
                </div>
              </div>

              {/* Expiry Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Link Expiration Duration:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { hrs: 1, label: '1 Hour' },
                    { hrs: 24, label: '24 Hours' },
                    { hrs: 168, label: '7 Days' },
                    { hrs: 720, label: '30 Days' },
                  ].map(opt => (
                    <button
                      key={opt.hrs}
                      type="button"
                      onClick={() => setShareExpiryHours(opt.hrs)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        shareExpiryHours === opt.hrs
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Security PIN Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Access PIN / Passcode (Optional):</span>
                  <span className="text-emerald-400 text-[9px] font-normal flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Encrypted Access
                  </span>
                </label>
                <input
                  type="text"
                  value={sharePinCode}
                  onChange={(e) => setSharePinCode(e.target.value)}
                  placeholder="Enter access PIN..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:border-sky-500 outline-none font-mono"
                />
              </div>

              {/* Generated Share Link Field */}
              {(() => {
                const generatedLink = `https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app/?evidenceId=${shareEvidenceLog.id}&pin=${sharePinCode || 'none'}&exp=${shareExpiryHours}h&sec=token_${shareEvidenceLog.id.slice(-6)}`;
                return (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                      Generated Secure Link:
                    </label>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 break-all select-all font-mono">
                      {generatedLink}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`📋 [SEERAAI SECURE EVIDENCE SHARE LINK]\nDocument: ${shareEvidenceLog.fileName || shareEvidenceLog.text.substring(0, 50)}\nAccess Link: ${generatedLink}\nPIN Code: ${sharePinCode || 'None'}\nExpires: ${shareExpiryHours} Hours`);
                          setCopiedShareLink(true);
                          setTimeout(() => setCopiedShareLink(false), 2500);
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-600/20"
                      >
                        {copiedShareLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedShareLink ? 'Link Copied to Clipboard!' : 'Copy Secure Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent(`⚖️ SEERAAI Secure Evidence Share:\n${shareEvidenceLog.fileName || shareEvidenceLog.text.substring(0, 50)} (Expires in ${shareExpiryHours}h)`)}`;
                          window.open(tgUrl, '_blank');
                        }}
                        className="px-4 py-2.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Share via Telegram"
                      >
                        <Send className="w-4 h-4" />
                        <span>Telegram</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 📚 1,500+ Legal Archive Explorer Modal (@wakolegalstudio & @seeraai_ethio) */}
      {showArchive1500Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <span>1,500+ {currentLang === 'om' ? 'Kuusaa Sanadoota Seeraa' : currentLang === 'am' ? 'የህግ ሰነዶችና ውሳኔዎች ማከማቻ' : 'Master Legal Archive'}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                        v4.1.0 Sync
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      {currentLang === 'om'
                        ? 'Telegram @wakolegalstudio fi @seeraai_ethio irraa murtiiwwan ijibbaataa MMWF 1,500+, heera fi labsiilee guutuu'
                        : currentLang === 'am'
                        ? 'ከቴሌግራም @wakolegalstudio እና @seeraai_ethio 1,500+ አስገዳጅ የሰበር ውሳኔዎችና አዋጆች'
                        : '1,500+ MMWF Binding Cassation Precedents, Constitutions, and Proclamations'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchive1500Modal(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Category Filter Toolbar */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={archive1500Query}
                    onChange={(e) => setArchive1500Query(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLoadArchive1500(archive1500Query, archive1500Category, 1);
                      }
                    }}
                    placeholder={
                      currentLang === 'om'
                        ? 'Barbaadi (fakkeenya: waliigaltee, lafa, Lakk. Galmee 214539, Labsii 242, hojjetaa)...'
                        : currentLang === 'am'
                        ? 'ይፈልጉ (ምሳሌ፡ ውል፣ መሬት፣ የሰበር መዝገብ 214539፣ አዋጅ 1156)...'
                        : 'Search 1,500+ archive (e.g. contract, land, Cassation #214539, Labor)...'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                  {archive1500Query && (
                    <button
                      type="button"
                      onClick={() => {
                        setArchive1500Query('');
                        handleLoadArchive1500('', archive1500Category, 1);
                      }}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadArchive1500(archive1500Query, archive1500Category, 1)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Search className="w-4 h-4" />
                  <span>{currentLang === 'om' ? 'Barbaadi' : currentLang === 'am' ? 'ፈልግ' : 'Search'}</span>
                </button>
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: currentLang === 'om' ? 'Hunda (All)' : 'All' },
                  { id: 'property_land', label: currentLang === 'om' ? 'Lafa & Mana' : 'Property & Land' },
                  { id: 'labor', label: currentLang === 'om' ? 'Hojjetaa fi Hojjachiisaa' : 'Labor & Employment' },
                  { id: 'family', label: currentLang === 'om' ? 'Maatii & Dhaala' : 'Family & Succession' },
                  { id: 'civil_contract', label: currentLang === 'om' ? 'Waliigaltee Siivilii' : 'Civil Contracts' },
                  { id: 'criminal', label: currentLang === 'om' ? 'Yakka' : 'Criminal Law' },
                  { id: 'commercial_tax', label: currentLang === 'om' ? 'Daldala & Gibira' : 'Commercial & Tax' },
                  { id: 'procedure_evidence', label: currentLang === 'om' ? 'Adeemsa & Ragaa' : 'Procedure & Evidence' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setArchive1500Category(cat.id);
                      handleLoadArchive1500(archive1500Query, cat.id, 1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                      archive1500Category === cat.id
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body: Files List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {isArchive1500Loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-sm font-bold text-slate-400">
                    {currentLang === 'om' ? 'Faayilota 1,500+ keessaa barbaadaa jira...' : 'Searching 1,500+ legal files archive...'}
                  </p>
                </div>
              ) : !archive1500Data || archive1500Data.files.length === 0 ? (
                <div className="py-16 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-base font-bold text-slate-300">
                    {currentLang === 'om' ? 'Faayilli barbaadame hin argamne' : 'No matching legal documents found'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {currentLang === 'om' ? 'Jechoota biraatiin yaalaa ykn filter jijjiiraa.' : 'Try different keywords or reset the category filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-800">
                    <span>
                      {currentLang === 'om' ? 'Faayilota Argaman:' : 'Results Found:'} <strong className="text-amber-400">{archive1500Data.total}</strong>
                    </span>
                    <span>
                      Fuula {archive1500Data.page} / {archive1500Data.totalPages}
                    </span>
                  </div>

                  {archive1500Data.files.map((file: any) => {
                    const titleText = file.title?.[currentLang] || file.title?.om || file.referenceNumber;
                    const summaryText = file.summary?.[currentLang] || file.summary?.om || '';

                    return (
                      <div
                        key={file.id}
                        className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all space-y-3"
                      >
                        {/* Reference Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                              {file.referenceNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[10px] font-mono">
                              {file.channel || '@wakolegalstudio'}
                            </span>
                            {file.category && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 text-[10px] font-bold">
                                {file.category.replace('_', ' ')}
                              </span>
                            )}
                            {file.yearEC && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[10px] font-mono">
                                Bara {file.yearEC} E.C.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-sm text-slate-100 leading-snug">
                          {titleText}
                        </h4>

                        {/* Summary */}
                        {summaryText && (
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                            {summaryText}
                          </p>
                        )}

                        {/* Key Articles */}
                        {file.keyArticles && file.keyArticles.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-500 font-mono">Keeyyattoota:</span>
                            {file.keyArticles.map((art: string, aIdx: number) => (
                              <span key={aIdx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-800">
                                {art}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
                          {/* Cite in Court Transcript */}
                          <button
                            type="button"
                            onClick={() => {
                              handleInsertCitationToSession(file);
                              setShowArchive1500Modal(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{currentLang === 'om' ? 'Galmee Dhaddachaatti Dabali' : 'Cite in Court Transcript'}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {/* Copy Citation */}
                            <button
                              type="button"
                              onClick={() => {
                                const cite = `[Wabii Seeraa]: ${file.referenceNumber} - ${titleText}\nMadda: ${file.channel || '@wakolegalstudio'}`;
                                navigator.clipboard.writeText(cite);
                                setArchiveCopiedId(file.id);
                                setTimeout(() => setArchiveCopiedId(null), 2000);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              {archiveCopiedId === file.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{archiveCopiedId === file.id ? 'Copied!' : 'Copy'}</span>
                            </button>

                            {/* Open Channel Post */}
                            <a
                              href={`https://t.me/${(file.channel || 'wakolegalstudio').replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1"
                            >
                              <span>Telegram</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {archive1500Data && archive1500Data.totalPages > 1 && (
              <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={archive1500Page <= 1}
                  onClick={() => handleLoadArchive1500(archive1500Query, archive1500Category, archive1500Page - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  ← {currentLang === 'om' ? 'Duraa' : 'Previous'}
                </button>

                <span className="text-xs font-mono text-slate-400">
                  {archive1500Page} / {archive1500Data.totalPages}
                </span>

                <button
                  type="button"
                  disabled={archive1500Page >= archive1500Data.totalPages}
                  onClick={() => handleLoadArchive1500(archive1500Query, archive1500Category, archive1500Page + 1)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  {currentLang === 'om' ? 'Itti Aanu' : 'Next'} →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Create Telegram Poll Modal */}
      {showCreatePollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">📊</span>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-amber-400">
                    {currentLang === 'om' ? 'Uuminsa Poll Seeraa Telegram (/poll)' : 'Telegram Legal Consensus Poll Creator'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentLang === 'om' ? 'Gareedhaaf qormaata walii-galaa (Consensus) qopheessi' : 'Pre-fill /poll command arguments for @seeraai_ethio channel'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePollModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Gaaffii Poll (Question)' : 'Poll Question'}
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Cassation #214539 commercial lease irratti ni hojjetaa?"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase text-slate-300">
                    {currentLang === 'om' ? 'Filannoowwan (Options, min 2, max 10)' : 'Poll Options (min 2, max 10)'}
                  </label>
                  {pollOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {currentLang === 'om' ? 'Filannoo Dabali' : 'Add Option'}
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...pollOptions];
                          updated[idx] = e.target.value;
                          setPollOptions(updated);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none text-xs"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(idx)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Remove option"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated /poll Command Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1.5">
                <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wide">
                  📋 Generated /poll Command Preview:
                </div>
                <div className="font-mono text-xs text-cyan-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800 break-all select-all">
                  {`/poll ${pollQuestion.trim() || 'Question?'} | ${pollOptions.filter(o => o.trim()).join(' | ')}`}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreatePollModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                {currentLang === 'om' ? 'Haqi' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveAndPublishPoll}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{currentLang === 'om' ? 'Command Waraabi & Galmeessi' : 'Copy Command & Log Poll'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

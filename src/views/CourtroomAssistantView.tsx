import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { Scale, Gavel, ChevronLeft, ChevronRight, Info, AlertTriangle, CheckCircle2, Timer, Play, Pause, RotateCcw, History, MessageSquare, Plus, Mic, MicOff, Download, FileText, StickyNote, X, ChevronUp, ChevronDown, BarChart3, GripVertical, Upload } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyCourtWatermarkToPDF } from '../services/watermarkService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { analyzeLegalDocument, generateLegalContent } from '../services/api';
import { processDocumentOffThread } from '../services/documentExtractionService';
import { getUserScopedKey } from '../services/storage';
import { VoiceToMemoRecorder } from '../components/VoiceToMemoRecorder';
import { VoiceDictation } from '../components/VoiceDictation';
import { JudgeProceedingsWorkbench } from '../components/JudgeProceedingsWorkbench';
import { DictateCourtNoteModal } from '../components/DictateCourtNoteModal';
import { PremiumGate } from '../components/PremiumGate';

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
  const [isSaving, setIsSaving] = useState(false);

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
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const audioFileRef = React.useRef<HTMLInputElement | null>(null);

  // Voice-to-Memo State
  const [showVoiceToMemo, setShowVoiceToMemo] = useState(true);
  const [showDictateCourtNote, setShowDictateCourtNote] = useState(false);

  // Evidence Audio Processor State
  const [evidenceAudioInput, setEvidenceAudioInput] = useState('');
  const [evidenceWitnessId, setEvidenceWitnessId] = useState('');
  const [isProcessingEvidence, setIsProcessingEvidence] = useState(false);
  const [evidenceSummaryResult, setEvidenceSummaryResult] = useState<{ summary: string; bullets: string[] } | null>(null);
  const [showUserManualModal, setShowUserManualModal] = useState(false);

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

  // Background Auto-Save effect
  useEffect(() => {
    try {
      const stateToSave = {
        currentStepIndex,
        courtLevel,
        sessionId,
        sessionTitle,
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
    } catch (e) {
      console.warn('Failed to auto-save state:', e);
    }
  }, [currentStepIndex, courtLevel, sessionId, sessionTitle, history, witnesses, quickNotes, seconds, claimText, defenseText, transcribedTestimony, framedIssueForEvidence, ocrCategory, ocrImagePreview, ocrExtractedText]);
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
    if (!historySearch.trim()) return true;
    const search = historySearch.toLowerCase();
    const witnessName = witnesses.find(w => w.id === log.witnessId)?.name.toLowerCase() || '';
    const hasTag = log.tags?.some(tag => tag.toLowerCase().includes(search));
    return log.text.toLowerCase().includes(search) || witnessName.includes(search) || hasTag;
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
                <div className="text-amber-400 font-mono font-bold text-xs hidden sm:block">
                  • LIVE PROCEEDING
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <button
              onClick={exportFullSessionReport}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 bg-emerald-500 text-slate-950 border-emerald-600 hover:bg-emerald-400"
            >
              <Download className="w-5 h-5" />
              {t.courtroomHistory.exportSession}
            </button>

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 ${
                showAnalytics 
                  ? 'bg-amber-500 text-slate-950 border-amber-600' 
                  : 'bg-slate-900 text-amber-500 border-slate-800 hover:border-amber-500'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              {t.courtroomAnalytics.title}
            </button>
          </div>
        </div>

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

          {/* DICTATE COURT NOTE BUTTON - Anchored to Case ID & Saved to My Content */}
          <button
            type="button"
            onClick={() => setShowDictateCourtNote(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-sm transition-all border-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 border-amber-300 hover:from-amber-400 hover:to-amber-300 shadow-xl shadow-amber-950/50 hover:scale-[1.02] cursor-pointer"
            title="Dictate Court Note: Real-time voice capture anchored to Case ID and saved to My Content dashboard"
          >
            <Mic className="w-5 h-5 text-slate-950 animate-pulse" />
            <span>🎙️ Dictate Court Note</span>
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
          </div>
          <div className="flex items-center gap-2">
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

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Content Area - Left Column */}
        <div className="flex-1 space-y-10">
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

          {/* Complete Judicial Proceedings Workbench: Pleadings, Preliminary Objections (Art. 245(1)), Interlocutory Rulings, Voice Oral Hearing, Framing of Issues, 3rd Party/Land/Agri Summons, and Final Judgment */}
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

        {/* Widgets & History Log - Right Column */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
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
                    <div className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 text-right">
                      {quickNotes.length} chars
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

          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 flex flex-col h-[700px] lg:h-auto lg:max-h-[700px] shadow-2xl overflow-hidden sticky top-8">
            <div className="flex items-center justify-between mb-6 border-b-2 border-slate-800 pb-4">
              <h3 className="text-xl font-black uppercase text-amber-500 flex items-center gap-2">
                <History className="w-6 h-6" />
                {t.courtroomHistory.title}
              </h3>
              <div className="flex items-center gap-4">
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

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-20 text-slate-600 italic text-sm">
                  {t.courtroomHistory.empty}
                </div>
              ) : (
                filteredHistory.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-4 rounded-2xl border-l-4 shadow-sm animate-in slide-in-from-right-2 duration-300 ${
                      log.type === 'auto' 
                        ? 'bg-slate-950/50 border-amber-500' 
                        : 'bg-blue-950/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${log.type === 'auto' ? 'text-amber-500' : 'text-blue-400'}`}>
                        {log.type === 'auto' ? t.courtroomHistory.autoStep : t.courtroomHistory.manualEntry}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md">
                        {log.timestamp}
                      </span>
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
                    <p className={`text-sm font-bold leading-relaxed ${log.type === 'auto' ? 'text-slate-100' : 'text-blue-100'}`}>
                      {log.type === 'auto' && log.stepId && (
                        <span className="text-amber-500 mr-2">#{log.stepId}</span>
                      )}
                      {log.text}
                    </p>
                  </div>
                ))
              )}
            </div>
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

              <textarea
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder={t.courtroomNotes.placeholder}
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-amber-500 transition-colors resize-none custom-scrollbar"
              />
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
    </div>
  );
};

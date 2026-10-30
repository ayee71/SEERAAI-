import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  RotateCcw, 
  Square, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Save, 
  AlertCircle, 
  Globe, 
  Scale, 
  Gavel, 
  History, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen,
  Volume2,
  ExternalLink,
  Layers
} from 'lucide-react';
import jsPDF from 'jspdf';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent } from '../services/api';

export interface StructuredLegalMemo {
  id: string;
  timestamp: string;
  caseNumber: string;
  speakerSide: 'plaintiff' | 'defendant' | 'prosecution' | 'judge' | 'bench_summary';
  proceduralStage: string;
  spokenAudioDurationSec?: number;
  rawTranscript: string;
  structuredMemos: {
    om: string;
    am: string;
    en: string;
  };
  detectedKeyArticles?: string[];
}

export interface VoiceToMemoRecorderProps {
  currentLang: Language;
  courtLevel?: 'firstInstance' | 'highCourt' | 'cassation';
  activeCaseNumber?: string;
  onSaveToHistory?: (entry: { text: string; tags: string[] }) => void;
  onAppendToNotes?: (note: string) => void;
}

const STORAGE_KEY = 'seera_voice_to_memos_v1';

const SAMPLE_ARGUMENTS = [
  {
    titleOm: 'Falmii Waliigaltee & Beenyaa (Contract Breach & Damages)',
    titleAm: 'የውል መቋረጥና የካሳ ክርክር',
    titleEn: 'Contract Breach & Consequential Damages Argument',
    text: `Kabajamaa Dhaddachaa, himatamaan waliigaltee daldalaa gaafa 15/04/2015 mallatteeffame bu'uura Koodii Siivilii keeyyata 1731 kabajuu dideera. Meeshaalee Birrii 450,000 baasan yeroon hin dhiyeessine. Sababa kanaan himataan kasaaraa Birrii 120,000 fi faayidaa hafeef beenyaan Koodii Siivilii keeyyata 1790 fi 1799 bu'uura godhachuun akka kaffalamuuf cimsinee gaafanna. Dhaddachi Ijoo Federaalaa Galmee Lakk. 98451 irratti murteessees kanuma mirkaneessa.`,
  },
  {
    titleOm: 'Mormii Aangoo & Res Judicata (Jurisdiction & Res Judicata)',
    titleAm: 'የስልጣንና ቀደም ሲል የተወሰነ ጉዳይ መቃወሚያ',
    titleEn: 'Preliminary Objection: Lack of Jurisdiction & Res Judicata',
    text: `Kabajamaa mana murtii, Seera Deemsa Falmii Hariiroo Hawaasaa keeyyata 244 (2) bu'uura godhachuun mormii duraa dhiyeessina. Dhimmi kun duraan Mana Murtii Sadarkaa Jalqabaa Lakk. Galmee 34912 irratti murtii dhumaa argateera. SDFHH keeyyata 5 bu'uuraan dhimma murtii dhumaa argate (Res Judicata) waan ta'eef manni murtii kun aangoo kan hin qabne ta'uu isaa beekamee galmeen akka cufamu gaafanna.`,
  },
  {
    titleOm: 'Yaada Xumuraa: Hanqina Ragaa Himataa (Closing Submissions)',
    titleAm: 'የመዝጊያ ክርክር፡ የማስረጃ ማነስ',
    titleEn: 'Defense Closing Submissions: Lack of Corroborative Evidence',
    text: `Dhaddacha kabajamaa, himataan dirqama ragaa dhiyeessuu SDFHH keeyyata 137 jalatti qabu hin baane. Ragaan namaa dhiyaate jecha wal-faalleessu kenneera; ragaan barreeffamaas ragaa sobaa ta'uun isaa madaallii ragaan mirkanaa'eera. Kanaafuu, himatamaan falmii kanaan bilisa ta'ee baasii fi kisaaraan akka murtaa'uuf boqonnaa kadhanna.`,
  },
];

export const VoiceToMemoRecorder: React.FC<VoiceToMemoRecorderProps> = ({
  currentLang,
  courtLevel = 'highCourt',
  activeCaseNumber = 'Galmee Lakk. 249062/2016',
  onSaveToHistory,
  onAppendToNotes,
}) => {
  // Speech Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechDialect, setSpeechDialect] = useState<'om-ET' | 'am-ET' | 'en-US'>(
    currentLang === 'am' ? 'am-ET' : currentLang === 'en' ? 'en-US' : 'om-ET'
  );
  const [rawTranscript, setRawTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  // Case Argument Context State
  const [caseNumber, setCaseNumber] = useState(activeCaseNumber);
  const [speakerSide, setSpeakerSide] = useState<'plaintiff' | 'defendant' | 'prosecution' | 'judge' | 'bench_summary'>('plaintiff');
  const [proceduralStage, setProceduralStage] = useState('Falmii Ragaa fi Qabxii Seeraa (Submissions on Evidence & Law)');

  // Memo Generation State
  const [isOrganizingMemo, setIsOrganizingMemo] = useState(false);
  const [currentMemo, setCurrentMemo] = useState<StructuredLegalMemo | null>(null);
  const [memoDisplayLang, setMemoDisplayLang] = useState<Language>(currentLang);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Memos History Archive
  const [savedMemos, setSavedMemos] = useState<StructuredLegalMemo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved voice memos', e);
    }
    return [];
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Audio stream & Speech Recognition refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Save history to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMemos));
    } catch (e) {
      console.warn('Failed to persist memos to storage', e);
    }
  }, [savedMemos]);

  // Update case number when prop changes
  useEffect(() => {
    if (activeCaseNumber) {
      setCaseNumber(activeCaseNumber);
    }
  }, [activeCaseNumber]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechDialect;

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (finalTrans.trim()) {
          setRawTranscript((prev) => (prev ? prev + ' ' + finalTrans.trim() : finalTrans.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          setMicError('Hayyama maayikiroofoonii dhowwameera (Microphone permission denied).');
        } else if (event.error === 'language-not-supported') {
          setMicError(`Language ${speechDialect} not supported by this browser engine.`);
        }
      };

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition setup error:', e);
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, [speechDialect, isRecording]);

  // Start recording using Microphone API (MediaRecorder + Web Speech API)
  const handleStartRecording = async () => {
    setMicError(null);
    setRecordingSeconds(0);

    // 1. Microphone Hardware API request via getUserMedia
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(250);
        mediaRecorderRef.current = mediaRecorder;
      }
    } catch (err: any) {
      console.warn('Microphone stream access error:', err);
      setMicError('Microphone API access error: ' + (err.message || 'Check microphone permissions in browser'));
    }

    // 2. Start speech-to-text recognition
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (e) {
      console.warn('Recognition start caught:', e);
    }

    setIsRecording(true);

    // 3. Timer interval
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Stop recording
  const handleStopRecording = () => {
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);

    // Stop MediaRecorder
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.warn('MediaRecorder stop error:', e);
    }

    // Stop SpeechRecognition
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.warn('Recognition stop error:', e);
    }
  };

  // Reset/Clear Transcript
  const handleClearTranscript = () => {
    setRawTranscript('');
    setRecordingSeconds(0);
    setMicError(null);
  };

  // Apply Sample Preset
  const handleApplyPreset = (sample: typeof SAMPLE_ARGUMENTS[0]) => {
    setRawTranscript(sample.text);
  };

  // Organize Spoken Legal Arguments into Structured Legal Memo
  const handleOrganizeIntoMemo = async () => {
    if (!rawTranscript.trim()) {
      setMicError(
        currentLang === 'om'
          ? 'Maaloo dursa falmii seeraa afaaniin waraabaa ykn barreeffama galchaa.'
          : 'Please record or enter spoken legal argument first.'
      );
      return;
    }

    setIsOrganizingMemo(true);
    setMicError(null);

    const sideLabels: Record<string, string> = {
      plaintiff: 'Counsel for Plaintiff (Abukaattoo Himataa / የከሳሽ ጠበቃ)',
      defendant: 'Counsel for Defendant (Abukaattoo Himatamaa / የተከሳሽ ጠበቃ)',
      prosecution: 'Public Prosecutor (Abbaa Alangaa / ዓቃቤ ሕግ)',
      judge: 'Judicial Bench Inquiries & Observations (Abbaa Seeraa / የዳኝነት አስተያየት)',
      bench_summary: 'Consolidated Bench Record (Cuunfaa Dhaddachaa)',
    };

    const sideName = sideLabels[speakerSide] || speakerSide;

    const structuringPrompt = `You are a Supreme Court Legal Research Auditor and Senior Judicial Clerk.
Organize the following SPOKEN ORAL COURT ARGUMENT (Falmii Seeraa Afaaniin Dhaddacharratti Dhiyaate) into a comprehensive, highly authoritative, structured COURTROOM LEGAL MEMO (Memo Seeraa Dhaddachaa).

CASE CONTEXT:
- Case Docket / Number: ${caseNumber || 'Galmee Lakk. 249062/2016'}
- Court Level: ${courtLevel}
- Speaker / Submitting Counsel: ${sideName}
- Procedural Stage: ${proceduralStage}
- Recording Timestamp: ${new Date().toLocaleString()}

RAW SPOKEN ARGUMENT TRANSCRIPT:
"${rawTranscript.trim()}"

MANDATORY LEGAL MEMO STRUCTURING REQUIREMENTS:
Structure the memo strictly with the following distinct sections:
1. 🏛️ MATA DUREE FI EENYUMMAA GALMEE (DOCKET & APPEARANCE HEADER)
- Case docket number, court bench, appearance party, and procedural session.

2. ⚖️ IJOO FALMII BU'UURAA (FRAMED LEGAL ISSUES)
- Precise formulation of the legal question(s) and material dispute arising from the spoken argument.

3. 📜 BU'UURA SEERAA FI MURTEEWWAN DHADDACHA IJOO (STATUTORY CITATIONS & PRECEDENTS)
- Explicitly identify and cite applicable provisions of Ethiopian Law:
  * Ethiopian Civil Code / Criminal Code / Commercial Code / Labor Proclamation 1156/2019
  * Civil Procedure Code (SDFHH) or Criminal Procedure Code
  * Binding Federal Supreme Court Cassation Precedents (Dhaddacha Ijoo).

4. 📋 TARREE FALMII FIRII DUBBII & SEERAA (FACTUAL SUBMISSIONS & POINTS OF CONTENTION)
- Clean, structured bulleted synthesis of facts, assertions, and legal doctrine advanced by counsel.

5. ⚠️ MADAALLII RAGAALEE & MORMII GAREEN BIROO KAASU (EVIDENTIARY APPRAISAL & COUNTER-ARGUMENTS)
- Assessment of evidence cited and evaluation of anticipated counter-pleas or procedural defects.

6. 🎯 GAAFFII DHUMAA & AJAJA BARBAADAMU (RELIEF SOUGHT / PRAYER TO THE BENCH)
- Concrete, actionable court order, judgment, or interlocutory relief requested.

LANGUAGE REQUIREMENT:
Provide complete, rigorous structured legal memo versions in ALL THREE LANGUAGES (Afaan Oromoo, አማርኛ, and English) separated using:
━━━━━━━━━━━━━━━━━━
AFAN OROMOO
━━━━━━━━━━━━━━━━━━
[Afaan Oromoo version]

━━━━━━━━━━━━━━━━━━
አማርኛ
━━━━━━━━━━━━━━━━━━
[Amharic version]

━━━━━━━━━━━━━━━━━━
ENGLISH
━━━━━━━━━━━━━━━━━━
[English version]`;

    try {
      const res = await generateLegalContent({
        prompt: structuringPrompt,
        outputLanguages: 'all',
        taskType: 'general',
        modelTier: 'deep_thinking',
      });

      const versions = res.separatedVersions || {
        om: res.content || '',
        am: res.content || '',
        en: res.content || '',
      };

      const newMemo: StructuredLegalMemo = {
        id: 'memo_' + Date.now(),
        timestamp: new Date().toLocaleString(),
        caseNumber: caseNumber || 'Galmee Lakk. 249062/2016',
        speakerSide,
        proceduralStage,
        spokenAudioDurationSec: recordingSeconds > 0 ? recordingSeconds : undefined,
        rawTranscript,
        structuredMemos: {
          om: versions.om || res.content,
          am: versions.am || res.content,
          en: versions.en || res.content,
        },
      };

      setCurrentMemo(newMemo);
      setSavedMemos((prev) => [newMemo, ...prev]);

      // Automatically notify parent courtroom assistant history if provided
      if (onSaveToHistory) {
        onSaveToHistory({
          text: `[VOICE-TO-MEMO: ${newMemo.caseNumber} - ${sideName}]: ${newMemo.structuredMemos[currentLang].slice(0, 300)}...`,
          tags: ['voice_memo', 'legal_argument', speakerSide],
        });
      }
    } catch (err: any) {
      console.error('Memo structuring error:', err);
      setMicError('Error organizing legal memo: ' + (err.message || 'Please try again.'));
    } finally {
      setIsOrganizingMemo(false);
    }
  };

  // Copy Memo to Clipboard
  const handleCopyMemo = () => {
    if (!currentMemo) return;
    const textToCopy = currentMemo.structuredMemos[memoDisplayLang] || currentMemo.structuredMemos.om;
    navigator.clipboard.writeText(textToCopy);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  // Export Memo to PDF
  const handleExportPDF = () => {
    if (!currentMemo) return;
    const doc = new jsPDF();
    const memoContent = currentMemo.structuredMemos[memoDisplayLang] || currentMemo.structuredMemos.om;

    doc.setFontSize(16);
    doc.text('COURTROOM LEGAL MEMO / MEMORANDUM SEERAA', 14, 20);

    doc.setFontSize(10);
    doc.text(`Docket No: ${currentMemo.caseNumber}`, 14, 28);
    doc.text(`Party: ${currentMemo.speakerSide.toUpperCase()}`, 14, 34);
    doc.text(`Procedural Stage: ${currentMemo.proceduralStage}`, 14, 40);
    doc.text(`Date: ${currentMemo.timestamp}`, 14, 46);
    doc.text('------------------------------------------------------------------------------------------------', 14, 52);

    doc.setFontSize(9);
    const splitText = doc.splitTextToSize(memoContent, 180);
    doc.text(splitText, 14, 58);

    doc.save(`Legal_Memo_${currentMemo.caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`);
  };

  // Save Memo to Session Notes
  const handleAppendNotes = () => {
    if (!currentMemo || !onAppendToNotes) return;
    const textToAppend = `\n\n=== LEGAL MEMORANDUM (${currentMemo.speakerSide.toUpperCase()} - ${currentMemo.timestamp}) ===\n${
      currentMemo.structuredMemos[memoDisplayLang]
    }\n===================================================\n`;
    onAppendToNotes(textToAppend);
    setSavedSuccessMsg(currentLang === 'om' ? 'Qabxiilee galmeerratti dabalameera!' : 'ወደ ችሎት ማስታወሻ ተጨምሯል!');
    setTimeout(() => setSavedSuccessMsg(null), 2500);
  };

  // Format Timer Display
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden text-left">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-inner">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                {currentLang === 'om' ? 'Sagalee Gara Memo Seeraatti (Voice-to-Memo)' : currentLang === 'am' ? 'የድምፅ የህግ ማስታወሻ (Voice-to-Memo)' : 'Courtroom Voice-to-Memo'}
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20">
                Microphone API ✓
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-mono font-bold border border-amber-500/20">
                Trilingual Support (OM / AM / EN)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentLang === 'om'
                ? 'Falmii seeraa afaaniin dhiyaate maayikiroofooniin waraabaa; AI\'n kallattiin qindeessuun gara Memo Seeraa qulqulluutti jijjiira.'
                : currentLang === 'am'
                ? 'በችሎት የቀረበን የቃል ክርክር በማይክሮፎን ይቅረጹ፤ ሥርዓቱ በቅጽበት የተዋቀረ ባለ 3 ቋንቋ የሕግ ማስታወሻ (Legal Memo) ያዘጋጃል።'
                : 'Record oral legal arguments via Microphone API, transcribe in real-time, and auto-organize into structured trilingual legal memos.'}
            </p>
          </div>
        </div>

        {/* History Modal Trigger */}
        <div className="flex items-center gap-2">
          {savedMemos.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {currentLang === 'om' ? `Memoowwan Kuufaman (${savedMemos.length})` : `የተቀመጡ ማስታወሻዎች (${savedMemos.length})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Case Context Form Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
            Lakk. Galmee (Case Docket No.)
          </label>
          <input
            type="text"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="fkn: Galmee Lakk. 249062/2016"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
            Qaama Dhiyaatee Dubbate (Speaker / Counsel Side)
          </label>
          <select
            value={speakerSide}
            onChange={(e) => setSpeakerSide(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
          >
            <option value="plaintiff">Abukaattoo Himataa (Counsel for Plaintiff)</option>
            <option value="defendant">Abukaattoo Himatamaa (Counsel for Defense)</option>
            <option value="prosecution">Abbaa Alangaa (Public Prosecutor)</option>
            <option value="judge">Yaada Abbaa Seeraa (Judicial Bench Remarks)</option>
            <option value="bench_summary">Cuunfaa Waliigalaa Dhaddachaa (Court Record)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
            Sadarkaa Falmii (Procedural Stage)
          </label>
          <select
            value={proceduralStage}
            onChange={(e) => setProceduralStage(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
          >
            <option value="Mormii Duraa (Preliminary Objections SDFHH 244)">Mormii Duraa (Preliminary Objections SDFHH 244)</option>
            <option value="Ijoo Falmii Qindeessuu (Issue Framing SDFHH 246)">Ijoo Falmii Qindeessuu (Issue Framing SDFHH 246)</option>
            <option value="Dhageettii Ragaa & Falmii (Production of Evidence SDFHH 137)">Dhageettii Ragaa & Falmii (Production of Evidence SDFHH 137)</option>
            <option value="Dhorkaa Yeroo (Interim Injunction SDFHH 154)">Dhorkaa Yeroo (Interim Injunction SDFHH 154)</option>
            <option value="Yaada Xumuraa Falmii (Closing Arguments)">Yaada Xumuraa Falmii (Closing Arguments)</option>
            <option value="Daagim-Daanyummaa & Mormii Murtee (Review SDFHH 6 & 358)">Daagim-Daanyummaa & Mormii Murtee (Review SDFHH 6 & 358)</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          MICROPHONE RECORDING & REAL-TIME SPEECH STREAM
          ========================================================================= */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        {/* Top Control Bar with Mic, Language & Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {/* Live Recording Toggle Button */}
            <button
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 animate-pulse border border-rose-500'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40 border border-amber-400'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
              <span>{isRecording ? (currentLang === 'om' ? 'Dhaabi (Stop Recording)' : 'አቁም (Stop Recording)') : (currentLang === 'om' ? 'Sagalee Waraabi (Record Argument)' : 'Record Oral Argument')}</span>
            </button>

            {/* Timer & Status */}
            {isRecording ? (
              <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-sm bg-rose-950/60 px-3 py-1.5 rounded-xl border border-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span>REC {formatTime(recordingSeconds)}</span>
              </div>
            ) : recordingSeconds > 0 ? (
              <div className="text-slate-400 font-mono text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                Duration: {formatTime(recordingSeconds)}
              </div>
            ) : null}
          </div>

          {/* Speech Language Dialect Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Afaan Sagalee (Speech Lang):</span>
            </span>
            <select
              value={speechDialect}
              onChange={(e) => setSpeechDialect(e.target.value as any)}
              disabled={isRecording}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="om-ET">🌳 Afaan Oromoo (om-ET)</option>
              <option value="am-ET">🇪🇹 አማርኛ (am-ET)</option>
              <option value="en-US">🇺🇸 English (en-US)</option>
            </select>
          </div>
        </div>

        {/* Live Audio Visualizer Animation when recording */}
        {isRecording && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-rose-400 animate-bounce" />
              <span className="text-xs font-bold text-rose-300">
                {currentLang === 'om' ? 'Maayikiroofooniin hojjetaa jira... Falmii keessan dubbadhaa.' : 'ማይክሮፎኑ እየቀረጸ ነው... የክርክር ቃልዎን ይናገሩ።'}
              </span>
            </div>
            {/* Visualizer bars */}
            <div className="flex items-center gap-1 h-6">
              {[40, 70, 90, 50, 100, 60, 80, 45, 95, 30, 85].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-amber-400 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error notification */}
        {micError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        {/* Transcribed Speech Text Area */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono uppercase font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {currentLang === 'om' ? 'Barreeffama Sagalee Irraa Waraabbame (Oral Argument Transcript):' : 'የተቀረጸው የቃል ክርክር ጽሑፍ፦'}
              </span>
            </label>
            {rawTranscript.trim() && (
              <button
                type="button"
                onClick={handleClearTranscript}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
              >
                {currentLang === 'om' ? 'Qulqulleessi (Clear)' : 'አጽዳ (Clear)'}
              </button>
            )}
          </div>

          <textarea
            value={rawTranscript}
            onChange={(e) => setRawTranscript(e.target.value)}
            placeholder={
              currentLang === 'om'
                ? 'Sagaleen yeroo dubbatamu asitti kallattiin barreeffamatti jijjiirama, yookiin barreeffama falmii asitti barreessuu/garagalchuu dandeessu...'
                : 'Spoken legal argument will appear here in real-time as you speak into the microphone, or you can paste/edit argument text directly...'
            }
            rows={5}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed shadow-inner"
          />
        </div>

        {/* Sample Argument Presets for Fast Testing */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] uppercase font-mono text-slate-500 block">
            {currentLang === 'om' ? 'Fkn Falmii Yeroo Qorumsaa (Quick Argument Presets):' : 'ፈጣን የክርክር ምሳሌዎች፦'}
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_ARGUMENTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(sample)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-medium transition-all cursor-pointer"
              >
                ⚡ {currentLang === 'om' ? sample.titleOm : currentLang === 'am' ? sample.titleAm : sample.titleEn}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Organize Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleOrganizeIntoMemo}
            disabled={isOrganizingMemo || !rawTranscript.trim()}
            className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
              isOrganizingMemo || !rawTranscript.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 hover:scale-[1.01] border border-emerald-500'
            }`}
          >
            {isOrganizingMemo ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>
                  {currentLang === 'om' ? 'Memo Seeraa Qindeessaa Jira...' : 'የሕግ ማስታወሻ በማዘጋጀት ላይ...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {currentLang === 'om' ? 'Memo Seeraatti Qindeessi (Generate Structured Memo)' : 'የተዋቀረ የሕግ ማስታወሻ አዘጋጅ (Generate Memo)'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          STRUCTURED LEGAL MEMO VIEW (TRILINGUAL)
          ========================================================================= */}
      {currentMemo && (
        <div className="bg-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in duration-300">
          {/* Memo Header & Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">⚖️</span>
                <h4 className="text-lg font-bold text-white">
                  {currentLang === 'om' ? 'Memo Seeraa Qindaaye (Structured Legal Memo)' : 'የተዋቀረ የችሎት የሕግ ማስታወሻ'}
                </h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400 font-mono">
                  {currentMemo.caseNumber}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                  {currentMemo.speakerSide.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {currentMemo.proceduralStage} • {currentMemo.timestamp}
              </p>
            </div>

            {/* Actions: Trilingual switcher + Copy + PDF + Notes */}
            <div className="flex flex-wrap items-center gap-2">
              {/* TRILINGUAL TABS */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-amber-500/30 text-xs">
                {(['om', 'am', 'en'] as Language[]).map((lang) => {
                  const isSelected = memoDisplayLang === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setMemoDisplayLang(lang)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {lang === 'om' ? 'Afaan Oromoo' : lang === 'am' ? 'አማርኛ' : 'English'}
                    </button>
                  );
                })}
              </div>

              {/* Copy */}
              <button
                type="button"
                onClick={handleCopyMemo}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedMemo ? (currentLang === 'om' ? 'Waraabame!' : 'ኮፒ ተደርጓል!') : (currentLang === 'om' ? 'Waraabi' : 'ኮፒ')}</span>
              </button>

              {/* PDF Export */}
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Download PDF Memo"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>PDF</span>
              </button>

              {/* Append to Session Notes */}
              {onAppendToNotes && (
                <button
                  type="button"
                  onClick={handleAppendNotes}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{currentLang === 'om' ? 'Yaada Galmeetti Dabali' : 'ወደ ማስታወሻ ጨምር'}</span>
                </button>
              )}
            </div>
          </div>

          {savedSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{savedSuccessMsg}</span>
            </div>
          )}

          {/* Rendered Structured Memo Content */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 font-sans text-xs sm:text-sm text-slate-200 leading-relaxed space-y-4 whitespace-pre-wrap select-text shadow-inner">
            {currentMemo.structuredMemos[memoDisplayLang] || currentMemo.structuredMemos.om}
          </div>
        </div>
      )}

      {/* =========================================================================
          SAVED MEMOS HISTORY ARCHIVE MODAL
          ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  {currentLang === 'om' ? 'Kuusaa Memoowwan Sagalee (Voice-to-Memo History)' : 'የተቀረጹ የህግ ማስታወሻዎች ታሪክ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-3 flex-1">
              {savedMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 text-xs text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-amber-400">
                      {memo.caseNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {memo.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono uppercase">
                      {memo.speakerSide}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {memo.proceduralStage}
                    </span>
                  </div>

                  <p className="text-slate-300 line-clamp-3 italic bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 text-[11px]">
                    "{memo.structuredMemos[currentLang] || memo.structuredMemos.om}"
                  </p>

                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMemo(memo);
                        setShowHistoryModal(false);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 cursor-pointer"
                    >
                      {currentLang === 'om' ? 'Bani (Load Memo)' : 'ክፈት'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSavedMemos((prev) => prev.filter((m) => m.id !== memo.id));
                      }}
                      className="p-1 rounded hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Memo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

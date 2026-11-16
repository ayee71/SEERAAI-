import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Save,
  X,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Shield,
  Scale,
  Gavel,
  Volume2,
  Copy,
  Check
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { saveDocument } from '../services/storage';
import { generateLegalContent } from '../services/api';
import { useLegalDictation } from '../hooks/useLegalDictation';

interface DictateCourtNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  initialCaseId?: string;
  initialCourtLevel?: 'firstInstance' | 'highCourt' | 'cassation';
  onNoteSaved?: (note: { id: string; caseId: string; title: string; content: string }) => void;
  onAddToSessionLog?: (logEntry: { text: string; tags: string[] }) => void;
}

export const DictateCourtNoteModal: React.FC<DictateCourtNoteModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  initialCaseId = '',
  initialCourtLevel = 'firstInstance',
  onNoteSaved,
  onAddToSessionLog,
}) => {
  const t = translations[currentLang];

  // Case Anchoring State
  const [caseId, setCaseId] = useState(initialCaseId || 'FDRE/SC/1042/16');
  const [caseTitle, setCaseTitle] = useState('');
  const [noteType, setNoteType] = useState<'bench_memo' | 'oral_argument' | 'court_order' | 'witness_note' | 'deliberation'>('bench_memo');
  const [courtLevel, setCourtLevel] = useState<'firstInstance' | 'highCourt' | 'cassation'>(initialCourtLevel);
  const [judgeOrOfficer, setJudgeOrOfficer] = useState('');

  // Dictation & Audio State
  const [useHighAccuracy, setUseHighAccuracy] = useState(true);
  const [dictationLang, setDictationLang] = useState<'om' | 'am' | 'en'>(currentLang);
  const [transcript, setTranscript] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    isRecording,
    isProcessing,
    durationSeconds,
    interimTranscript,
    audioVolume,
    error: dictationError,
    startDictation,
    stopDictation,
    cancelDictation,
  } = useLegalDictation({
    language: dictationLang,
    legalMode: true,
    onTranscriptionResult: (text, isFinal) => {
      if (text) {
        if (isFinal) {
          setTranscript(prev => (prev + ' ' + text).trim());
        } else {
          // Keep interim as visual indicator but don't overwrite final transcript
          setTranscript(prev => (prev + ' ' + text).trim());
        }
      }
    },
  });

  // AI Formatting & Polish State
  const [isPolishing, setIsPolishing] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // References
  const timerRef = useRef<any>(null);

  // Pre-populated Ethiopian Case ID presets for rapid anchoring
  const quickCasePresets = [
    'FDRE/SC/1042/16',
    'OR/HC/8912/15',
    'FIN/W03/409/16',
    'OR/SC/CAS/2210/16',
    'FDRE/FIC/8841/16'
  ];

  useEffect(() => {
    if (initialCaseId) {
      setCaseId(initialCaseId);
    }
  }, [initialCaseId]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      cancelDictation();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    await startDictation();
  };

  const handleStopRecording = async () => {
    const result = await stopDictation();
    if (result) {
      setTranscript(result);
    }
  };

  const handleResetRecording = () => {
    cancelDictation();
    setTranscript('');
    setSavedSuccessMsg(null);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // AI Structure and Polish Memo into formal Ethiopian court format
  const handlePolishMemo = async () => {
    if (!transcript.trim()) return;
    setIsPolishing(true);
    try {
      const polishPrompt = `You are a Senior Judicial Registrar and Legal Clerk in Ethiopia.
Format and refine the following spoken courtroom dictation into an authoritative, structured Ethiopian Court Memo / Yaada Dhaddachaa.

Parameters:
- Case Docket ID: ${caseId}
- Court Level: ${courtLevel}
- Note Classification: ${noteType}
- Presiding Bench / Officer: ${judgeOrOfficer || 'Dhaddacha Seeraa / Bench'}
- Primary Language: ${dictationLang === 'om' ? 'Afaan Oromoo' : dictationLang === 'am' ? 'Amharic' : 'English'}

Spoken Dictation:
"${transcript}"

Format with standard Ethiopian judicial structure:
1. HEADER: Case Docket, Court Level, Timestamp (Ethiopian Calendar B.A. and Gregorian), Bench Details.
2. PROCEDURAL CONTEXT: Nature of hearing (Pleading, Preliminary Objection, Oral Argument, Witness Hearing, or Order).
3. ORAL STATEMENTS & SUBMISSIONS: Clear, bulleted synthesis of what was stated on the record.
4. BENCH DIRECTIVES / INTERLOCUTORY DECISION: Specific directions, rulings, or adjournment order.
5. NEXT HEARING & COMPLIANCE TIMELINE: Specific dates or assignments.

Maintain 100% legal precision and do NOT add fictitious statutes.`;

      const res = await generateLegalContent({
        prompt: polishPrompt,
        outputLanguages: [dictationLang],
        taskType: 'general',
        modelTier: 'gemini-flash-lite-latest',
      });

      const polished = res.content || res.separatedVersions?.[dictationLang] || transcript;
      setTranscript(polished.trim());
    } catch (err: any) {
      console.error('Polish memo error:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  // Save Memo to 'My Content' dashboard
  const handleSaveToMyContent = () => {
    const cleanCaseId = caseId.trim() || 'COURT-UNASSIGNED';
    const noteTypeLabels = {
      bench_memo: 'Yaada Abbaa Seeraa (Judge Bench Memo)',
      oral_argument: 'Falmii Afaanii (Oral Argument Memo)',
      court_order: 'Ajaja Dhaddachaa (Court Order Memo)',
      witness_note: 'Ragaa Namaa (Witness Statement Memo)',
      deliberation: 'Yaada Murtii (Judicial Deliberation Memo)',
    };
    const noteTypeLabel = noteTypeLabels[noteType];

    const finalContent = transcript.trim() || interimTranscript.trim();
    if (!finalContent) {
      setSaveError(
        currentLang === 'om'
          ? 'Barreeffamni waraabbame hin jiru. Maaloo dura dubbadhaa ykn barreessaa.'
          : currentLang === 'am'
          ? 'የተቀረጸ ጽሑፍ የለም። እባክዎ አስቀድመው ይናገሩ ወይም ይጻፉ።'
          : 'No dictated note recorded yet. Please speak or type content.'
      );
      return;
    }
    setSaveError(null);

    const title = `[${cleanCaseId}] ${caseTitle ? caseTitle + ' - ' : ''}${noteTypeLabel}`;
    const timestampStr = new Date().toLocaleString();

    // Full structured note text
    const fullMemoText = `=======================================================
SEERAAI COURTROOM DICTATED MEMO / YAADA DHADDACHAA
=======================================================
Lakk. Galmee (Case ID): ${cleanCaseId}
Sadarkaa Mana Murtii: ${courtLevel.toUpperCase()}
Gosa Yaadaa (Note Type): ${noteTypeLabel}
Abbaa Seeraa / Registrar: ${judgeOrOfficer || 'Active Presiding Bench'}
Guyyaa / Yeroo: ${timestampStr}
Waraabbii Sagalee (Duration): ${formatTimer(durationSeconds)}
Afaan (Language): ${dictationLang.toUpperCase()}
=======================================================

${finalContent}

-------------------------------------------------------
Galmee Seeraa SEERAAI - Anchored to Case ID: ${cleanCaseId}
`;

    // Save into persistent storage via saveDocument
    const newDoc = saveDocument({
      title: title,
      taskType: 'general',
      prompt: `Dictated court note anchored to Case ID: ${cleanCaseId} [${noteTypeLabel}]`,
      outputLanguages: [dictationLang],
      content: fullMemoText,
      separatedVersions: {
        [dictationLang]: fullMemoText,
      },
      tags: [
        'dictate_court_note',
        'court_memo',
        'courtroom_assistant',
        cleanCaseId,
        noteType,
        `bench_${courtLevel}`,
      ],
      projectName: `Case ${cleanCaseId}`,
      isBookmarked: true,
      voiceNotes: [
        {
          id: `vn_${Date.now()}`,
          title: `Dictation: ${cleanCaseId} (${noteTypeLabel})`,
          durationSeconds: durationSeconds,
          transcript: finalContent.slice(0, 1000),
          language: dictationLang,
          recordedAt: new Date().toISOString(),
        },
      ],
    });

    // Also notify active courtroom assistant session if provided
    if (onAddToSessionLog) {
      onAddToSessionLog({
        text: `[DICTATED COURT NOTE - ${cleanCaseId} (${noteTypeLabel})]: ${finalContent.slice(0, 250)}...`,
        tags: ['dictated_note', 'court_memo', cleanCaseId, noteType],
      });
    }

    if (onNoteSaved) {
      onNoteSaved({
        id: newDoc.id,
        caseId: cleanCaseId,
        title: title,
        content: fullMemoText,
      });
    }

    setSavedSuccessMsg(
      currentLang === 'om'
        ? `✓ Qabxiin dhaddachaa galmee "${cleanCaseId}" tiif qabame 'My Content' irratti milkaa'inaan kuufameera!`
        : currentLang === 'am'
        ? `✓ ለመዝገብ "${cleanCaseId}" የተያዘው የችሎት ማስታወሻ 'My Content' ዳሽቦርድ ላይ ተቀምጧል!`
        : `✓ Dictated court note anchored to Case "${cleanCaseId}" saved to 'My Content' dashboard!`
    );

    setTimeout(() => {
      setSavedSuccessMsg(null);
    }, 4000);
  };

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-amber-950/50 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-serif">
                  {currentLang === 'om' ? 'Sagalee Dhaddachaa Qabadhu' : currentLang === 'am' ? 'የችሎት ቃለ-ጉባዔ ድምፅ ቅዳ' : 'Dictate Court Note'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                  Real-Time Voice
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Sagalee qabachuun galmee man-murtii adda baheef hidhaa, daashboordii My Content irratti kuusaa.'
                  : currentLang === 'am'
                  ? 'የችሎት ድምፅ በመቅዳት ከተለየ መዝገብ ጋር ያገናኙ፣ በMy Content ዳሽቦርድ ያስቀምጡ።'
                  : 'Capture spoken courtroom notes, anchor to a Case ID, and store directly into My Content.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* Case ID Anchoring Bar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
                <Gavel className="w-4 h-4 text-amber-400" />
                <span>Lakk. Galmee & Dhimma (Anchor to Case ID):</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Anchored to Court Docket
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Case ID Input */}
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Lakkoofsa Galmee / የመዝገብ ቁጥር *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    placeholder="e.g. FDRE/SC/1042/16"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>

              {/* Note Type Selector */}
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Gosa Yaadaa / ዓይነት
                </label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-200 outline-none cursor-pointer"
                >
                  <option value="bench_memo">⚖️ Yaada Abbaa Seeraa (Judge Memo)</option>
                  <option value="court_order">📜 Ajaja Dhaddachaa (Interlocutory Order)</option>
                  <option value="oral_argument">🗣️ Falmii Afaanii (Oral Argument)</option>
                  <option value="witness_note">👤 Ragaa Namaa (Witness Note)</option>
                  <option value="deliberation">🔍 Yaada Murtii (Judicial Deliberation)</option>
                </select>
              </div>

              {/* Court Level */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Sadarkaa Mana Murtii
                </label>
                <select
                  value={courtLevel}
                  onChange={(e) => setCourtLevel(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-200 outline-none cursor-pointer"
                >
                  <option value="firstInstance">Aanaa / First Instance</option>
                  <option value="highCourt">Ol’aanaa / High Court</option>
                  <option value="cassation">Ijibbaata / Cassation</option>
                </select>
              </div>
            </div>

            {/* Quick Case ID Selector Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-mono">Fakkeenya:</span>
              {quickCasePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCaseId(preset)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    caseId === preset
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Dictation Control Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Recording status & Audio Wave */}
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 text-amber-400">
                <Mic className={`w-7 h-7 ${isRecording ? 'animate-pulse text-rose-500' : ''}`} />
                {isRecording && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-slate-950 animate-ping" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-black text-amber-400">
                    {formatTimer(durationSeconds)}
                  </span>
                  {isRecording && (
                    <span className="text-[10px] font-mono font-bold uppercase text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                      LIVE RECORDING
                    </span>
                  )}
                  {isProcessing && (
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 animate-pulse">
                      AI PROCESSING...
                    </span>
                  )}
                </div>

                {/* Animated speech level indicator bars */}
                <div className="flex items-center gap-1 mt-1.5 h-3">
                  {[...Array(12)].map((_, i) => {
                    const level = (audioVolume / 100) * 100;
                    const activeHeight = isRecording ? Math.min(100, level + (i % 3) * 15) : 15;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-75 ${
                          isRecording
                            ? i < 8 ? 'bg-amber-400' : 'bg-rose-400'
                            : 'bg-slate-800'
                        }`}
                        style={{ height: `${Math.max(4, activeHeight * 0.14)}px` }}
                      />
                    );
                  })}
                  <span className="text-[10px] text-slate-500 font-mono ml-2">
                    {isRecording ? `${audioVolume}% Level` : isProcessing ? 'Transcribing...' : 'Ready to dictate'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Language switch & Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* High Accuracy Toggle */}
              <button
                type="button"
                onClick={() => setUseHighAccuracy(!useHighAccuracy)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                  useHighAccuracy 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>AI</span>
              </button>

              {/* Dictation Language */}
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-medium">
                {(['om', 'am', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setDictationLang(lang);
                      if (isRecording) {
                        handleStopRecording();
                        setTimeout(() => handleStartRecording(), 200);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                      dictationLang === lang
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang === 'om' ? 'OM' : lang === 'am' ? 'AM' : 'EN'}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wide shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{currentLang === 'om' ? 'Sagalee Qabi' : currentLang === 'am' ? 'መቅረጽ ጀምር' : 'Start Dictation'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Xumuri (Stop)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetRecording}
                disabled={(!transcript && durationSeconds === 0) || isProcessing}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-900 border border-slate-800 transition-colors disabled:opacity-30 cursor-pointer"
                title="Reset Transcript"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {(dictationError || saveError) && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{dictationError || saveError}</span>
            </div>
          )}

          {/* Success Banner */}
          {savedSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{savedSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('seera:navigate', { detail: { tab: 'myContent' } }));
                  onClose();
                }}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>My Content Bani</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Real-time Editable Transcript Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Qabiyyee Qabxii Dhaddachaa (Courtroom Transcript):</span>
              </span>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <span>{transcript.split(/\s+/).filter(Boolean).length} Jechoota (Words)</span>
                <span>•</span>
                <span>{transcript.length} Characters</span>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={
                  currentLang === 'om'
                    ? "Maayikiroofoonii dhiibaa dubbadhaa... Yaanni dhaddachaa asitti battalumatti barreeffama ta'a. Barreeffamicha sirreessuu ykn dabalataan barreessuu ni dandeessu."
                    : currentLang === 'am'
                    ? "ማይክሮፎኑን ተጭነው ይናገሩ... የችሎቱ ቃለ-ጉባዔ እዚህ ላይ ወዲያውኑ ይገለበጣል። ጽሑፉን ማስተካከል ወይም መተየብ ይችላሉ።"
                    : "Click start dictation and speak into your microphone. Your spoken court memo will transcribe in real time here with full editing capability."
                }
                rows={9}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 font-sans leading-relaxed outline-none resize-y placeholder:text-slate-600"
              />

              {/* Interim Real-Time Floating Badge */}
              {interimTranscript && (
                <div className="absolute bottom-3 left-3 right-3 p-2 bg-slate-900/95 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-mono italic animate-pulse flex items-center gap-2 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="truncate">"{interimTranscript}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Optional Bench / Note-taker Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                Mata-duree Addaa (Optional Note Sub-Title):
              </label>
              <input
                type="text"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                placeholder="e.g. Dhaddacha Ragaa Ittisaa / Falmii Qabeenyaa"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                Abbaa Seeraa / Galmeessaa (Judge / Note Taker):
              </label>
              <input
                type="text"
                value={judgeOrOfficer}
                onChange={(e) => setJudgeOrOfficer(e.target.value)}
                placeholder="e.g. Abbaa Seeraa Obbo Gammachiis"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* AI Polish Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePolishMemo}
              disabled={isPolishing || !transcript.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Transform raw spoken dictation into structured Ethiopian court memo"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isPolishing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
              <span>{isPolishing ? 'AI Caaseffamaa Jira...' : 'AI Fooyyessi & Caasessi'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!transcript.trim()}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Waraabameera' : 'Waraabi (Copy)'}</span>
            </button>
          </div>

          {/* Primary Save Action */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-800"
            >
              Cufi (Cancel)
            </button>

            <button
              type="button"
              onClick={handleSaveToMyContent}
              disabled={!transcript.trim() && !interimTranscript.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg shadow-amber-950/50 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              <Save className="w-4 h-4" />
              <span>Save to 'My Content'</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

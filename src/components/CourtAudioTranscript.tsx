import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  FileCode,
  FileSpreadsheet,
  Tag,
  Edit2,
  X,
  Download,
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Plus, 
  Copy, 
  Check, 
  Search, 
  Sparkles, 
  SlidersHorizontal,
  Clock,
  User,
  Scale,
  Shield,
  Briefcase,
  Mic,
  Languages,
  Zap,
  ArrowDownCircle,
  Eye,
  Radio,
  Archive,
  Lock
} from 'lucide-react';
import { CourtroomAudioStatement, savePhysicalEvidenceToCase } from '../services/courtCaseService';
import { Language } from '../i18n/translations';
import { TranscriptionConfidenceBadge, WordConfidenceHighlighter } from './TranscriptionConfidenceBadge';

export interface CourtAudioTranscriptProps {
  statements?: CourtroomAudioStatement[];
  audioUrl?: string | null;
  audioBlob?: Blob | null;
  currentLang: Language;
  onInsert: (text: string) => void;
  onPlaySegment?: (timestamp: string, seconds?: number) => void;
  onUpdateStatements?: (updatedStatements: CourtroomAudioStatement[]) => void;
  onSaveToEvidenceLocker?: (stmt: CourtroomAudioStatement) => void;
  caseId?: string;
  caseNumber?: string;
  courtName?: string;
  className?: string;
  totalDurationSeconds?: number;
}

// Default demonstration statements for Oromia Courtroom Proceedings if empty
const DEMO_STATEMENTS: CourtroomAudioStatement[] = [
  {
    id: 'stmt_1',
    speakerRole: 'Abbaa Seeraa',
    speakerName: 'Dr. Caalaa Tasfaayee (Presiding Judge)',
    statement: 'Dhaddachi Mana Murtii Aanaa Adaamaa beellama har\'aa galmee lakk. CR-2026/045 irratti banameera. Gareen lamaan dhiyaataniiru?',
    timestamp: '00:03',
    confidence: 0.98
  },
  {
    id: 'stmt_2',
    speakerRole: 'Abbaa Alangaa',
    speakerName: 'Obbo Kabbadaa Dheeressaa (Prosecutor)',
    statement: 'Eeyyee kabajamoo mana murtii, Abbaan Alangaa dhimma qabeenya mootummaa fi daldala seeraan alaa irratti ragaa barreeffamaa qopheessee dhiyaateera.',
    timestamp: '00:18',
    confidence: 0.96
  },
  {
    id: 'stmt_3',
    speakerRole: 'Abukaattoo Himatamaa',
    speakerName: 'Aadde Toltuu Margaa (Defense Counsel)',
    statement: 'Kabajamoo mana murtii, mirgi wabii himatamaa heera mootummaa keeyyata 19(6) bu\'uuraan akka eegamuuf iyyannoo dhiyeessina.',
    timestamp: '00:42',
    confidence: 0.97
  },
  {
    id: 'stmt_4',
    speakerRole: 'Ragaa',
    speakerName: 'Obbo Gurmeessaa Baqqalaa (Witness 1)',
    statement: 'Kakuu seeraa nan raawwadha; dhugaa jiru qofa nan dubbadha. Guyyaa sanatti bittaa fi gurgurtaan dachee bakka ani jirutti raawwatameera.',
    timestamp: '01:12',
    confidence: 0.95
  },
  {
    id: 'stmt_5',
    speakerRole: 'Abbaa Seeraa',
    speakerName: 'Dr. Caalaa Tasfaayee (Presiding Judge)',
    statement: 'Ragaan dhiyaate galmeeffameera. Galmeen madaallii ragaa dabalataaf beellama itti aanuuf qabameera.',
    timestamp: '01:45',
    confidence: 0.99
  }
];

// Parse timestamp string "MM:SS" or "HH:MM:SS" into numerical seconds
function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.trim().split(':').map(p => parseFloat(p) || 0);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parseFloat(ts) || 0;
}

// Format seconds into "MM:SS"
function formatSecondsToTimestamp(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const remainingSec = s % 60;
  return `${m.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
}

export const PREDEFINED_SPEAKER_TAGS = [
  { role: 'Abbaa Seeraa', labelOm: 'Abbaa Seeraa', labelAm: 'ዳኛ', labelEn: 'Judge / Presiding', icon: '⚖️', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { role: 'Abbaa Alangaa', labelOm: 'Abbaa Alangaa', labelAm: 'ዐቃቤ ሕግ', labelEn: 'Prosecutor', icon: '🛡️', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
  { role: 'Abukaattoo Himataa', labelOm: 'Abukaattoo Himataa', labelAm: 'የከሳሽ ጠበቃ', labelEn: 'Plaintiff Advocate', icon: '💼', color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
  { role: 'Abukaattoo Himatamaa', labelOm: 'Abukaattoo Himatamaa', labelAm: 'የተከሳሽ ጠበቃ', labelEn: 'Defense Advocate', icon: '⚖️', color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
  { role: 'Himataa', labelOm: 'Himataa', labelAm: 'ከሳሽ', labelEn: 'Plaintiff / Appellant', icon: '👤', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  { role: 'Himatamaa', labelOm: 'Himatamaa', labelAm: 'ተከሳሽ', labelEn: 'Defendant / Respondent', icon: '👥', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  { role: 'Ragaa', labelOm: 'Ragaa', labelAm: 'ምስክር', labelEn: 'Witness', icon: '🎙️', color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
  { role: 'Qindeessaa Dhaddachaa', labelOm: 'Qindeessaa Dhaddachaa', labelAm: 'የችሎት ጸሐፊ', labelEn: 'Court Registrar', icon: '📜', color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
  { role: 'Ogeessa Seeraa', labelOm: 'Ogeessa Seeraa', labelAm: 'የሕግ ባለሙያ', labelEn: 'Expert Witness', icon: '🎓', color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
];

export function exportTranscriptAsJSON(
  statements: CourtroomAudioStatement[],
  caseNumber: string = 'CR-2026/045',
  courtName: string = 'Mana Murtii Sadarkaa Jalqabaa'
) {
  const exportPayload = {
    metadata: {
      application: "SEERAAI Ethiopian Legal Intelligence Platform",
      exportType: "Courtroom Audio Diarized Transcript",
      caseNumber,
      courtName,
      exportedAt: new Date().toISOString(),
      totalSegments: statements.length,
      formatVersion: "1.0.0"
    },
    segments: statements.map(s => {
      const sec = parseTimestampToSeconds(s.timestamp);
      return {
        id: s.id,
        speakerRole: s.speakerRole,
        speakerName: s.speakerName,
        timestamp: s.timestamp,
        timestampSeconds: sec,
        statement: s.statement,
        confidence: s.confidence ?? 0.95,
        confidencePercentage: `${Math.round((s.confidence ?? 0.95) * 100)}%`
      };
    })
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const cleanCaseNo = caseNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `Transcript_${cleanCaseNo}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTranscriptAsCSV(
  statements: CourtroomAudioStatement[],
  caseNumber: string = 'CR-2026/045',
  courtName: string = 'Mana Murtii Sadarkaa Jalqabaa'
) {
  const headers = [
    'Segment ID',
    'Timestamp (MM:SS)',
    'Timestamp (Seconds)',
    'Speaker Role / Tag',
    'Speaker Name',
    'Confidence Score (%)',
    'Statement / Dialogue'
  ];
  
  const rows = statements.map(s => {
    const sec = parseTimestampToSeconds(s.timestamp);
    const confPct = `${Math.round((s.confidence ?? 0.95) * 100)}%`;
    const cleanStmt = `"${(s.statement || '').replace(/"/g, '""')}"`;
    const cleanRole = `"${(s.speakerRole || '').replace(/"/g, '""')}"`;
    const cleanName = `"${(s.speakerName || '').replace(/"/g, '""')}"`;
    
    return [
      s.id,
      s.timestamp,
      sec.toString(),
      cleanRole,
      cleanName,
      confPct,
      cleanStmt
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanCaseNo = caseNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `Transcript_${cleanCaseNo}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Speaker role presentation mappings
function getSpeakerStyle(role: string) {
  const r = role.toLowerCase();
  if (r.includes('seeraa') || r.includes('judge') || r.includes('ዳኛ')) {
    return {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/40',
      activeBg: 'bg-amber-500/20 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/60',
      highlightWord: 'bg-amber-400/30 text-amber-200 border-b-2 border-amber-400 font-bold',
      barColor: '#f59e0b',
      icon: Scale,
      label: 'Abbaa Seeraa'
    };
  }
  if (r.includes('alangaa') || r.includes('prosecutor') || r.includes('ዐቃቤ')) {
    return {
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/15',
      borderColor: 'border-rose-500/40',
      activeBg: 'bg-rose-500/20 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.25)] ring-2 ring-rose-500/60',
      highlightWord: 'bg-rose-400/30 text-rose-200 border-b-2 border-rose-400 font-bold',
      barColor: '#f43f5e',
      icon: Shield,
      label: 'Abbaa Alangaa'
    };
  }
  if (r.includes('abukaattoo') || r.includes('advocate') || r.includes('defense') || r.includes('ጠበቃ')) {
    return {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
      borderColor: 'border-blue-500/40',
      activeBg: 'bg-blue-500/20 border-blue-500/80 shadow-[0_0_25px_rgba(59,130,246,0.25)] ring-2 ring-blue-500/60',
      highlightWord: 'bg-blue-400/30 text-blue-200 border-b-2 border-blue-400 font-bold',
      barColor: '#3b82f6',
      icon: Briefcase,
      label: 'Abukaattoo'
    };
  }
  if (r.includes('ragaa') || r.includes('witness') || r.includes('ምስክር')) {
    return {
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15',
      borderColor: 'border-purple-500/40',
      activeBg: 'bg-purple-500/20 border-purple-500/80 shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-2 ring-purple-500/60',
      highlightWord: 'bg-purple-400/30 text-purple-200 border-b-2 border-purple-400 font-bold',
      barColor: '#a855f7',
      icon: Mic,
      label: 'Ragaa'
    };
  }
  return {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/40',
    activeBg: 'bg-emerald-500/20 border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/60',
    highlightWord: 'bg-emerald-400/30 text-emerald-200 border-b-2 border-emerald-400 font-bold',
    barColor: '#10b981',
    icon: User,
    label: role
  };
}

export const CourtAudioTranscript: React.FC<CourtAudioTranscriptProps> = ({
  statements: inputStatements,
  audioUrl,
  audioBlob,
  currentLang,
  onInsert,
  onPlaySegment,
  onUpdateStatements,
  onSaveToEvidenceLocker,
  caseId = 'case-today-301',
  caseNumber = 'CR-2026/045',
  courtName = 'Mana Murtii Aanaa Adaamaa',
  className = '',
  totalDurationSeconds
}) => {
  // Synchronized local state for interactive speaker tagging & edits
  const [localStatements, setLocalStatements] = useState<CourtroomAudioStatement[]>(() => {
    return (inputStatements && inputStatements.length > 0) ? inputStatements : DEMO_STATEMENTS;
  });

  const [savedToLockerIds, setSavedToLockerIds] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    if (inputStatements && inputStatements.length > 0) {
      setLocalStatements(inputStatements);
    }
  }, [inputStatements]);

  const statements = localStatements;

  // Speaker Tagging popover/modal state
  const [taggingStatementId, setTaggingStatementId] = useState<string | null>(null);
  const [taggingSpeakerName, setTaggingSpeakerName] = useState<string>('');
  const [applyToAllSameSpeaker, setApplyToAllSameSpeaker] = useState<boolean>(false);

  // Voice Navigation state
  const [isVoiceNavActive, setIsVoiceNavActive] = useState<boolean>(false);
  const [lastVoiceNavCommand, setLastVoiceNavCommand] = useState<string | null>(null);
  const [showVoiceNavCheatsheet, setShowVoiceNavCheatsheet] = useState<boolean>(false);
  const voiceNavRecognitionRef = useRef<any>(null);

  // Voice-Activated Search state
  const [isVoiceSearching, setIsVoiceSearching] = useState<boolean>(false);
  const voiceSearchRecognitionRef = useRef<any>(null);

  // Language selection state
  const [selectedLanguage, setSelectedLanguage] = useState<'om' | 'am' | 'en'>(
    (currentLang as 'om' | 'am' | 'en') || 'om'
  );

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [hoveredSegment, setHoveredSegment] = useState<{
    statement: CourtroomAudioStatement;
    percent: number;
    sec: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');

  // Calculate sorted statements and exact start/end time ranges
  const statementRanges = useMemo(() => {
    const sorted = [...statements].sort(
      (a, b) => parseTimestampToSeconds(a.timestamp) - parseTimestampToSeconds(b.timestamp)
    );

    return sorted.map((stmt, idx) => {
      const startSec = parseTimestampToSeconds(stmt.timestamp);
      let endSec: number;
      if (idx < sorted.length - 1) {
        const nextStart = parseTimestampToSeconds(sorted[idx + 1].timestamp);
        endSec = nextStart > startSec ? nextStart : startSec + 15;
      } else {
        endSec = startSec + 20;
      }
      const durationSec = Math.max(2, endSec - startSec);
      return {
        statement: stmt,
        startSec,
        endSec,
        durationSec
      };
    });
  }, [statements]);

  // Compute total duration
  const sessionDuration = useMemo(() => {
    if (totalDurationSeconds && totalDurationSeconds > 0) return totalDurationSeconds;
    if (statementRanges.length === 0) return 120;
    const lastRange = statementRanges[statementRanges.length - 1];
    return Math.max(lastRange.endSec + 10, 120);
  }, [totalDurationSeconds, statementRanges]);

  // Audio elements & synthesis refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthOscRef = useRef<OscillatorNode | null>(null);
  const synthGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const statementsListRef = useRef<HTMLDivElement | null>(null);
  const statementCardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  // Audio object URL from blob if provided
  const resolvedAudioSrc = useMemo(() => {
    if (audioUrl) return audioUrl;
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioUrl, audioBlob]);

  // Generate 80 waveform amplitude bars representing audio spectrum
  const waveformBars = useMemo(() => {
    const totalBars = 80;
    const bars: { id: number; amplitude: number; hasStatement: boolean; primaryRole?: string; rangeIndex?: number }[] = [];
    
    for (let i = 0; i < totalBars; i++) {
      const barTimeSec = (i / totalBars) * sessionDuration;
      const matchedRangeIdx = statementRanges.findIndex(
        st => barTimeSec >= st.startSec && barTimeSec < st.endSec
      );
      const activeRange = matchedRangeIdx >= 0 ? statementRanges[matchedRangeIdx] : null;

      // Create speech waveform amplitude cadence
      let baseAmp: number;
      if (activeRange) {
        const modulation = Math.sin(i * 0.85) * 0.25 + Math.cos(i * 1.7) * 0.15;
        baseAmp = 0.55 + Math.abs(modulation);
      } else {
        baseAmp = 0.12 + (Math.sin(i * 1.2) * 0.06);
      }

      const amplitude = Math.max(0.12, Math.min(0.98, baseAmp));
      bars.push({
        id: i,
        amplitude,
        hasStatement: !!activeRange,
        primaryRole: activeRange?.statement.speakerRole,
        rangeIndex: matchedRangeIdx >= 0 ? matchedRangeIdx : undefined
      });
    }

    return bars;
  }, [statementRanges, sessionDuration]);

  // Web Audio Synthesizer for procedural audio playback when no file is loaded
  const startSynthAudio = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      gain.gain.setValueAtTime(isMuted ? 0 : 0.05, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      synthOscRef.current = osc;
      synthGainRef.current = gain;
    } catch (e) {
      console.warn('Procedural audio playback notice:', e);
    }
  };

  const stopSynthAudio = () => {
    try {
      if (synthOscRef.current) {
        synthOscRef.current.stop();
        synthOscRef.current.disconnect();
        synthOscRef.current = null;
      }
    } catch {
      // Ignore cleanup
    }
  };

  // Playback loop controller
  useEffect(() => {
    if (!isPlaying) {
      if (resolvedAudioSrc && audioRef.current) {
        audioRef.current.pause();
      } else {
        stopSynthAudio();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    if (resolvedAudioSrc && audioRef.current) {
      audioRef.current.currentTime = currentTime;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.muted = isMuted;
      audioRef.current.play().catch(err => console.warn('Audio play notice:', err));
    } else {
      startSynthAudio();
    }

    let lastTick = performance.now();
    const updatePlayback = (now: number) => {
      const deltaSec = ((now - lastTick) / 1000) * playbackSpeed;
      lastTick = now;

      setCurrentTime(prev => {
        const nextTime = prev + deltaSec;
        if (nextTime >= sessionDuration) {
          setIsPlaying(false);
          return 0;
        }
        return nextTime;
      });

      animationFrameRef.current = requestAnimationFrame(updatePlayback);
    };

    animationFrameRef.current = requestAnimationFrame(updatePlayback);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopSynthAudio();
    };
  }, [isPlaying, resolvedAudioSrc, sessionDuration, playbackSpeed, isMuted]);

  // Identify the currently playing active statement and calculate segment progress
  const activeStatementInfo = useMemo(() => {
    const range = statementRanges.find(
      r => currentTime >= r.startSec && currentTime < r.endSec
    );

    if (!range) return null;

    const segmentProgressPercent = Math.max(
      0, 
      Math.min(100, ((currentTime - range.startSec) / range.durationSec) * 100)
    );

    const words = range.statement.statement.split(' ');
    const activeWordIndex = Math.min(
      words.length - 1, 
      Math.floor((segmentProgressPercent / 100) * words.length)
    );

    return {
      statement: range.statement,
      startSec: range.startSec,
      endSec: range.endSec,
      durationSec: range.durationSec,
      segmentProgressPercent,
      words,
      activeWordIndex
    };
  }, [statementRanges, currentTime]);

  const activeStatement = activeStatementInfo?.statement || null;

  // Real-time Synchronizer: Auto-scroll active transcript card into view
  useEffect(() => {
    if (!autoScrollEnabled || !activeStatement || !isPlaying) return;

    const el = statementCardRefs.current[activeStatement.id];
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeStatement?.id, autoScrollEnabled, isPlaying]);

  // Seek handler
  const handleSeek = (seconds: number) => {
    const clamped = Math.max(0, Math.min(sessionDuration, seconds));
    setCurrentTime(clamped);
    if (audioRef.current && resolvedAudioSrc) {
      audioRef.current.currentTime = clamped;
    }
  };

  // Waveform click seeking
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformContainerRef.current) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = percent * sessionDuration;
    handleSeek(targetSeconds);
  };

  // Play a specific segment from a statement
  const handlePlayStatement = (stmt: CourtroomAudioStatement) => {
    const sec = parseTimestampToSeconds(stmt.timestamp);
    handleSeek(sec);
    setIsPlaying(true);
    onPlaySegment?.(stmt.timestamp, sec);
  };

  // Quick jump backward/forward 5s
  const handleSkip = (deltaSeconds: number) => {
    handleSeek(currentTime + deltaSeconds);
  };

  // Insert to Legal Draft handler
  const handleInsertDraft = (stmt: CourtroomAudioStatement) => {
    const formattedEntry = `[${stmt.timestamp}] ${stmt.speakerRole} (${stmt.speakerName}): "${stmt.statement}"`;
    onInsert(formattedEntry);
    showToast(
      selectedLanguage === 'om' 
        ? 'Qaboo Yaa\'iitti dabalameera (Inserted to Draft)!' 
        : 'Inserted into Legal Draft!'
    );
  };

  // Copy handler
  const handleCopyStatement = (stmt: CourtroomAudioStatement) => {
    const text = `[${stmt.timestamp}] ${stmt.speakerRole} (${stmt.speakerName}): "${stmt.statement}"`;
    navigator.clipboard.writeText(text);
    setCopiedId(stmt.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(selectedLanguage === 'om' ? 'Koppii ta\'eera (Copied)!' : 'Copied to clipboard!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Save specific transcript statement block directly to Evidence Locker
  const handleSaveStatementToEvidenceLocker = async (stmt: CourtroomAudioStatement) => {
    try {
      setSavedToLockerIds(prev => ({ ...prev, [stmt.id]: true }));

      // Generate a mini visual SVG quote snapshot for physical evidence archive
      const svgQuote = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
        <rect width="100%" height="100%" fill="#020617"/>
        <rect x="20" y="20" width="760" height="360" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
        <text x="40" y="65" fill="#f59e0b" font-family="monospace" font-size="18" font-weight="bold">SEERAAI EVIDENCE LOCKER • CASE: ${caseNumber}</text>
        <text x="40" y="95" fill="#94a3b8" font-family="sans-serif" font-size="14">Timestamp: [${stmt.timestamp}] • Speaker: ${stmt.speakerRole} (${stmt.speakerName})</text>
        <line x1="40" y1="115" x2="760" y2="115" stroke="#334155" stroke-width="1"/>
        <foreignObject x="40" y="130" width="720" height="200">
          <p xmlns="http://www.w3.org/1999/xhtml" style="color:#f8fafc; font-family:sans-serif; font-size:16px; line-height:1.6; margin:0;">
            "${stmt.statement.replace(/"/g, '&quot;')}"
          </p>
        </foreignObject>
        <text x="40" y="355" fill="#10b981" font-family="monospace" font-size="13">✓ Transcribed under oath (C.P.C Art. 258) • Confidence: ${Math.round((stmt.confidence || 0.95) * 100)}%</text>
      </svg>`;
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgQuote)}`;

      await savePhysicalEvidenceToCase(caseId, {
        caseNumber,
        title: `Jecha Dhaddachaa [${stmt.timestamp}] - ${stmt.speakerRole}`,
        category: 'document',
        photoDataUrl: dataUrl,
        description: `Kutaa jecha afaanii (${stmt.speakerRole}: ${stmt.speakerName}) waraabbata sagalee dhaddachaa lakk. galmee ${caseNumber} irraa waraabbamee kuusaa ragaatti qabame.`,
        legalRelevance: `Madaallii firii dubbii fi ragaa afaanii bu'uureffata (S.A.F.H.H. Kwt 258 / Civil Procedure Code Art. 258).`,
        exhibitNumber: `Exhibit T-${stmt.timestamp.replace(':', '')}`,
        tenderedBy: stmt.speakerRole.toLowerCase().includes('alangaa') ? 'prosecutor' : stmt.speakerRole.toLowerCase().includes('himatamaa') ? 'defendant' : stmt.speakerRole.toLowerCase().includes('ragaa') ? 'witness' : 'plaintiff',
        tenderedByName: stmt.speakerName,
        custodianOfficer: courtName,
        capturedBy: 'SEERAAI Courtroom Assistant',
        capturedLocation: courtName,
        admissibilityStatus: 'admitted',
        statutoryBasis: 'Civil Procedure Code Art. 258 / SDFHH Kwt 258'
      });

      onSaveToEvidenceLocker?.(stmt);
      showToast(selectedLanguage === 'om' ? 'Kuusaa Ragaatti Qabameera (Saved to Evidence Locker)!' : 'Saved to Case Evidence Locker!');
    } catch (e: any) {
      console.error('Failed to save to evidence locker:', e);
      showToast('Dogoggora kuusaa ragaa: ' + (e.message || String(e)));
    }
  };

  // Speaker Tagging handler
  const handleTagSpeaker = (stmtId: string, newRole: string, newName?: string, batch: boolean = false) => {
    const target = localStatements.find(s => s.id === stmtId);
    if (!target) return;
    const oldRole = target.speakerRole;

    const updated = localStatements.map(s => {
      if (s.id === stmtId) {
        return {
          ...s,
          speakerRole: newRole,
          speakerName: newName && newName.trim() ? newName.trim() : s.speakerName
        };
      }
      if (batch && s.speakerRole === oldRole) {
        return {
          ...s,
          speakerRole: newRole,
          speakerName: newName && newName.trim() ? newName.trim() : s.speakerName
        };
      }
      return s;
    });

    setLocalStatements(updated);
    onUpdateStatements?.(updated);
    setTaggingStatementId(null);
    showToast(batch ? `All "${oldRole}" segments tagged as "${newRole}"` : `Segment tagged as "${newRole}"`);
  };

  // Jump to next speech segment
  const handleNextSegment = () => {
    if (statementRanges.length === 0) return;
    const currentIdx = activeStatementInfo 
      ? statementRanges.findIndex(r => r.statement.id === activeStatementInfo.statement.id)
      : -1;
    const nextIdx = currentIdx < statementRanges.length - 1 ? currentIdx + 1 : 0;
    const nextRange = statementRanges[nextIdx];
    if (nextRange) {
      handlePlayStatement(nextRange.statement);
      setLastVoiceNavCommand(`Next Segment -> [${nextRange.statement.timestamp}] ${nextRange.statement.speakerRole}`);
    }
  };

  // Jump to previous speech segment
  const handlePrevSegment = () => {
    if (statementRanges.length === 0) return;
    const currentIdx = activeStatementInfo 
      ? statementRanges.findIndex(r => r.statement.id === activeStatementInfo.statement.id)
      : 1;
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : statementRanges.length - 1;
    const prevRange = statementRanges[prevIdx];
    if (prevRange) {
      handlePlayStatement(prevRange.statement);
      setLastVoiceNavCommand(`Previous Segment -> [${prevRange.statement.timestamp}] ${prevRange.statement.speakerRole}`);
    }
  };

  // Jump to specific speaker role (Judge, Witness, Prosecutor, Defense)
  const handleJumpToSpeaker = (roleKeyword: 'judge' | 'witness' | 'prosecutor' | 'defense') => {
    const matchedRanges = statementRanges.filter(r => {
      const role = r.statement.speakerRole.toLowerCase();
      if (roleKeyword === 'judge') return role.includes('seeraa') || role.includes('judge') || role.includes('ዳኛ');
      if (roleKeyword === 'witness') return role.includes('ragaa') || role.includes('witness') || role.includes('ምስክር');
      if (roleKeyword === 'prosecutor') return role.includes('alangaa') || role.includes('prosecutor') || role.includes('ዐቃቤ');
      if (roleKeyword === 'defense') return role.includes('abukaattoo') || role.includes('defense') || role.includes('ጠበቃ');
      return false;
    });

    if (matchedRanges.length === 0) {
      showToast(`No segments found for ${roleKeyword}`);
      return;
    }

    const next = matchedRanges.find(r => r.startSec > currentTime + 1) || matchedRanges[0];
    handlePlayStatement(next.statement);
    setLastVoiceNavCommand(`Jumped to ${roleKeyword.toUpperCase()} -> [${next.statement.timestamp}]`);
  };

  // Voice Navigation Web Speech recognition listener
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!isVoiceNavActive) {
      if (voiceNavRecognitionRef.current) {
        try { voiceNavRecognitionRef.current.stop(); } catch {}
        voiceNavRecognitionRef.current = null;
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage === 'am' ? 'am-ET' : selectedLanguage === 'en' ? 'en-US' : 'om-ET';

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult[0]) {
          const phrase = lastResult[0].transcript.trim().toLowerCase();
          console.log('[Voice Navigation Command Heard]:', phrase);

          // Next Segment
          if (/(next|itti aani|fuuldura|gara fuulduraa|ቀጣይ|forward|ahead)/i.test(phrase)) {
            handleNextSegment();
          }
          // Previous Segment
          else if (/(previous|prev|deebi'i|duuba|gara duubaa|ቀደምት|back)/i.test(phrase)) {
            handlePrevSegment();
          }
          // Jump to Judge
          else if (/(judge|abbaa seeraa|seeraa|daanyaa|ዳኛ)/i.test(phrase)) {
            handleJumpToSpeaker('judge');
          }
          // Jump to Witness
          else if (/(witness|ragaa|raga|miskir|ምስክር)/i.test(phrase)) {
            handleJumpToSpeaker('witness');
          }
          // Jump to Prosecutor
          else if (/(prosecutor|alangaa|abbaa alangaa|akabe|ዐቃቤ)/i.test(phrase)) {
            handleJumpToSpeaker('prosecutor');
          }
          // Jump to Defense Counsel
          else if (/(defense|abukaattoo|tebeka|ጠበቃ)/i.test(phrase)) {
            handleJumpToSpeaker('defense');
          }
          // Play
          else if (/(play|taphisi|jalqabi|start|አጫውት)/i.test(phrase)) {
            setIsPlaying(true);
            setLastVoiceNavCommand('Audio Playback Started');
          }
          // Pause / Stop
          else if (/(pause|stop|dhaabi|harkisi|አቁም)/i.test(phrase)) {
            setIsPlaying(false);
            setLastVoiceNavCommand('Audio Playback Paused');
          }
          // Voice search query inside speech
          else if (/(barbaadi|search|ፈልግ)\s+(.+)/i.test(phrase)) {
            const match = phrase.match(/(barbaadi|search|ፈልግ)\s+(.+)/i);
            if (match && match[2]) {
              const query = match[2].trim();
              setSearchQuery(query);
              setLastVoiceNavCommand(`Search query: "${query}"`);
              showToast(`Searching for "${query}"`);
            }
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Voice navigation recognition warning:', err.error);
      };

      recognition.onend = () => {
        if (isVoiceNavActive && voiceNavRecognitionRef.current) {
          try { voiceNavRecognitionRef.current.start(); } catch {}
        }
      };

      recognition.start();
      voiceNavRecognitionRef.current = recognition;
    } catch (err) {
      console.warn('Failed to start voice navigation:', err);
      setIsVoiceNavActive(false);
    }

    return () => {
      if (voiceNavRecognitionRef.current) {
        try { voiceNavRecognitionRef.current.stop(); } catch {}
        voiceNavRecognitionRef.current = null;
      }
    };
  }, [isVoiceNavActive, selectedLanguage, statementRanges, currentTime, activeStatementInfo]);

  // Voice Search Handler
  const handleStartVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser');
      return;
    }

    if (isVoiceSearching) {
      if (voiceSearchRecognitionRef.current) {
        try { voiceSearchRecognitionRef.current.stop(); } catch {}
      }
      setIsVoiceSearching(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage === 'am' ? 'am-ET' : selectedLanguage === 'en' ? 'en-US' : 'om-ET';

      setIsVoiceSearching(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setSearchQuery(transcript);
        if (event.results[0].isFinal) {
          setIsVoiceSearching(false);
          showToast(`Voice Search: "${transcript}"`);
          setTimeout(() => {
            const firstMatch = filteredStatements[0];
            if (firstMatch && statementCardRefs.current[firstMatch.id]) {
              statementCardRefs.current[firstMatch.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
        }
      };

      recognition.onerror = () => {
        setIsVoiceSearching(false);
      };

      recognition.onend = () => {
        setIsVoiceSearching(false);
      };

      recognition.start();
      voiceSearchRecognitionRef.current = recognition;
    } catch (e) {
      setIsVoiceSearching(false);
    }
  };

  // Export Transcript as JSON
  const handleExportJSON = () => {
    exportTranscriptAsJSON(statements, caseNumber, courtName);
    showToast('Transcript exported as JSON with timestamps & confidence scores!');
  };

  // Export Transcript as CSV
  const handleExportCSV = () => {
    exportTranscriptAsCSV(statements, caseNumber, courtName);
    showToast('Transcript exported as CSV with timestamps & confidence scores!');
  };

  // Filtered statements by search query & speaker
  const filteredStatements = useMemo(() => {
    return statements.filter(stmt => {
      if (speakerFilter !== 'all') {
        const r = stmt.speakerRole.toLowerCase();
        if (speakerFilter === 'judge' && !r.includes('seeraa') && !r.includes('judge')) return false;
        if (speakerFilter === 'prosecutor' && !r.includes('alangaa') && !r.includes('prosecutor')) return false;
        if (speakerFilter === 'defense' && !r.includes('abukaattoo') && !r.includes('defense')) return false;
        if (speakerFilter === 'witness' && !r.includes('ragaa') && !r.includes('witness')) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          stmt.statement.toLowerCase().includes(q) ||
          stmt.speakerName.toLowerCase().includes(q) ||
          stmt.speakerRole.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statements, searchQuery, speakerFilter]);

  // Labels by language
  const labels = {
    om: {
      title: "Waraabbata Sagalee fi Waveform Dhaddachaa",
      subtitle: "Synchronizer: Real-time waveform, text transcript highlighting, and active speech segment tracking",
      langSelect: "Afaan Filadhaa:",
      waveformLabel: "AGARSIISTUU WAVEFORM SAGALEE (REAL-TIME WAVEFORM SYNCHRONIZER)",
      nowPlaying: "ACTIVE DIALOGUE SEGMENT",
      autoScroll: "Auto-Scroll Sync",
      searchPlaceholder: "Jecha ykn maqaa abbaa seeraa/ragaa barbaadi...",
      all: "Hunda",
      judgeOnly: "Abbaa Seeraa",
      prosecutorOnly: "Abbaa Alangaa",
      defenseOnly: "Abukaattoo",
      witnessOnly: "Ragaa",
      emptyState: "Jechi falmii qorannoo kana keessatti hin argamne."
    },
    am: {
      title: "የችሎት ድምፅ ሞገድና የተፃፈ ቃል (Court Waveform Transcript)",
      subtitle: "ቀጥታ ስንክሮናይዘር፡ የድምፅ ሞገድና የተፃፈ ቃል በቅጽበት ማድመቅና መከታተል",
      langSelect: "ቋንቋ ይምረጡ:",
      waveformLabel: "የድምፅ ሞገድ ማሳያ (REAL-TIME WAVEFORM SYNCHRONIZER)",
      nowPlaying: "በመደመጥ ላይ ያለ ቃል",
      autoScroll: "እራሱን የሚቀይር ስክሮል",
      searchPlaceholder: "ቃል ወይም የተናጋሪ ስም ፈልግ...",
      all: "ሁሉም",
      judgeOnly: "ዳኛ",
      prosecutorOnly: "ዐቃቤ ሕግ",
      defenseOnly: "ጠበቃ",
      witnessOnly: "ምስክር",
      emptyState: "ምንም የተገኘ ቃል የለም።"
    },
    en: {
      title: "Court Audio Transcript & Interactive Waveform",
      subtitle: "Real-time synchronizer between audio waveform display and verbatim text segments with karaoke text highlighting",
      langSelect: "Select Language:",
      waveformLabel: "AUDIO WAVEFORM REAL-TIME SYNCHRONIZER",
      nowPlaying: "ACTIVE DIALOGUE SEGMENT",
      autoScroll: "Auto-Scroll Sync",
      searchPlaceholder: "Search dialogue statements or speakers...",
      all: "All",
      judgeOnly: "Judge",
      prosecutorOnly: "Prosecutor",
      defenseOnly: "Defense",
      witnessOnly: "Witness",
      emptyState: "No matching dialogue segments found."
    }
  }[selectedLanguage];

  const playbackPercentage = (currentTime / sessionDuration) * 100;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Hidden real audio element if url is present */}
      {resolvedAudioSrc && (
        <audio
          ref={audioRef}
          src={resolvedAudioSrc}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Header with Title, Synchronizer Status & Language Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-legal flex items-center gap-2">
                <span>{labels.title}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30 font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-ping" />
                  REAL-TIME SYNC
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">{labels.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export JSON & CSV Toolbar */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-sm">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-300 hover:bg-slate-900 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export transcript as JSON with speaker tags, timestamps, and confidence scores"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-300 hover:text-emerald-300 hover:bg-slate-900 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export transcript as CSV (Excel compatible with UTF-8 BOM)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>

          {/* Voice Navigation Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-sm">
            <button
              type="button"
              onClick={() => {
                const nextState = !isVoiceNavActive;
                setIsVoiceNavActive(nextState);
                if (nextState) {
                  showToast('Voice Navigation Active: Say "next segment", "judge", "witness", etc.');
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isVoiceNavActive
                  ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Toggle Hands-Free Voice Controlled Navigation"
            >
              <Mic className={`w-3.5 h-3.5 ${isVoiceNavActive ? 'animate-bounce' : 'text-amber-400'}`} />
              <span>{isVoiceNavActive ? 'Voice Nav ON' : 'Voice Nav'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowVoiceNavCheatsheet(true)}
              className="px-2 py-1 rounded-lg text-[11px] font-mono text-slate-400 hover:text-amber-300 hover:bg-slate-900 cursor-pointer"
              title="Voice Commands Guide"
            >
              ?
            </button>
          </div>

          {/* Synchronizer Auto-Scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              autoScrollEnabled 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' 
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-white'
            }`}
            title="Toggle automatic transcript auto-scrolling during playback"
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScrollEnabled ? 'text-emerald-400' : ''}`} />
            <span>{labels.autoScroll}</span>
          </button>

          {/* Trilingual Language Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <Languages className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-1" />
            <button
              type="button"
              onClick={() => setSelectedLanguage('om')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedLanguage === 'om'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Afaan Oromoo
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('am')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedLanguage === 'am'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              አማርኛ
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('en')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedLanguage === 'en'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* Voice Navigation Listening / Active Feedback Bar */}
      {isVoiceNavActive && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-amber-400 font-mono font-bold text-[11px] uppercase tracking-wider">VOICE COMMAND LISTENING:</span>
            <span className="text-slate-200 font-mono text-xs bg-slate-950/60 px-2 py-0.5 rounded border border-amber-500/20">
              {lastVoiceNavCommand || 'Say "next segment", "judge", "witness", "play", "pause", or "barbaadi <word>"'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextSegment}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-800 cursor-pointer"
            >
              Next Segment &rarr;
            </button>
            <button
              type="button"
              onClick={() => setShowVoiceNavCheatsheet(true)}
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              Command List &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🌊 VISUAL WAVEFORM DISPLAY & AUDIO PLAYER SCRUBBER */}
      {/* ============================================================== */}
      <div className="bg-slate-950/90 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-inner space-y-4 relative">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-wider text-amber-400 uppercase">
              {labels.waveformLabel}
            </span>
          </div>

          {/* Time Elapsed / Total duration */}
          <div className="font-mono text-xs text-slate-300 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400">{formatSecondsToTimestamp(currentTime)}</span>
            <span className="text-slate-500">/</span>
            <span>{formatSecondsToTimestamp(sessionDuration)}</span>
          </div>
        </div>

        {/* Interactive Waveform Container with Active Segment Region Overlay */}
        <div 
          ref={waveformContainerRef}
          onClick={handleWaveformClick}
          className="relative h-28 bg-slate-900/90 rounded-xl border border-slate-800/80 cursor-pointer overflow-hidden group select-none transition-all hover:border-slate-700"
        >
          {/* Subtle grid background lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:10%_100%] opacity-20 pointer-events-none" />

          {/* Played Progress Overlay Shading */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-amber-500/10 pointer-events-none transition-all duration-75"
            style={{ width: `${playbackPercentage}%` }}
          />

          {/* Active Segment Region Highlight Overlay on Waveform Canvas */}
          {activeStatementInfo && (
            <div 
              className="absolute top-0 bottom-0 bg-amber-400/15 border-x border-amber-400/40 pointer-events-none transition-all duration-150 z-20"
              style={{
                left: `${(activeStatementInfo.startSec / sessionDuration) * 100}%`,
                width: `${(activeStatementInfo.durationSec / sessionDuration) * 100}%`
              }}
            >
              <div className="h-1 bg-amber-400 w-full animate-pulse" />
            </div>
          )}

          {/* Glowing Playhead Scrubber Line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 z-30 shadow-[0_0_12px_#f59e0b] pointer-events-none transition-all duration-75"
            style={{ left: `${playbackPercentage}%` }}
          >
            <div className="w-3 h-3 bg-amber-400 rounded-full -translate-x-[5px] -translate-y-1 shadow-md border-2 border-slate-950" />
          </div>

          {/* Waveform Amplitude Bars */}
          <div className="absolute inset-0 flex items-center justify-between px-2 gap-0.5 z-10 pointer-events-none">
            {waveformBars.map((bar, idx) => {
              const barPercent = (idx / waveformBars.length) * 100;
              const isPassed = barPercent <= playbackPercentage;
              const heightPx = Math.round(bar.amplitude * 80);
              const isBarInActiveSegment = activeStatementInfo && 
                ((idx / waveformBars.length) * sessionDuration) >= activeStatementInfo.startSec &&
                ((idx / waveformBars.length) * sessionDuration) < activeStatementInfo.endSec;

              return (
                <div 
                  key={bar.id}
                  className="flex-1 flex flex-col items-center justify-center h-full"
                >
                  <div
                    className={`w-full max-w-[4px] rounded-full transition-all duration-150 ${
                      isBarInActiveSegment
                        ? 'bg-gradient-to-t from-amber-400 via-emerald-400 to-amber-300 shadow-[0_0_10px_#f59e0b] scale-y-110'
                        : isPassed
                        ? 'bg-gradient-to-t from-amber-500 via-amber-400 to-amber-300 opacity-90'
                        : bar.hasStatement 
                          ? 'bg-slate-600 group-hover:bg-slate-500' 
                          : 'bg-slate-800/80'
                    }`}
                    style={{ height: `${heightPx}px` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Dialogue Segment Pin Markers (Positioned along timeline) */}
          <div className="absolute inset-x-2 top-1.5 z-20 pointer-events-auto">
            {statements.map((stmt) => {
              const sec = parseTimestampToSeconds(stmt.timestamp);
              const percent = Math.min(98, Math.max(1, (sec / sessionDuration) * 100));
              const style = getSpeakerStyle(stmt.speakerRole);
              const Icon = style.icon;
              const isActive = activeStatement?.id === stmt.id;

              return (
                <div
                  key={`pin_${stmt.id}`}
                  style={{ left: `${percent}%` }}
                  className="absolute -translate-x-1/2 top-0 group/marker cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayStatement(stmt);
                  }}
                  onMouseEnter={() => setHoveredSegment({ statement: stmt, percent, sec })}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div 
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold border transition-all ${
                      isActive 
                        ? 'scale-110 ring-2 ring-amber-400 shadow-lg ' + style.bgColor + ' ' + style.borderColor + ' ' + style.color
                        : 'opacity-85 hover:opacity-100 hover:scale-105 bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span className="hidden md:inline">{stmt.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hover Tooltip Preview */}
          {hoveredSegment && (
            <div 
              style={{ left: `${Math.min(80, Math.max(20, hoveredSegment.percent))}%` }}
              className="absolute bottom-2 -translate-x-1/2 z-40 bg-slate-950/95 border border-amber-500/40 p-2.5 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none max-w-xs animate-in fade-in zoom-in-95 text-left"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-amber-400 font-mono">
                  [{hoveredSegment.statement.timestamp}] {hoveredSegment.statement.speakerRole}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Click to seek</span>
              </div>
              <p className="text-[11px] text-slate-200 line-clamp-2 leading-snug">
                "{hoveredSegment.statement.statement}"
              </p>
            </div>
          )}
        </div>

        {/* Audio Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Main playback buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSkip(-5)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title="Skip back 5s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-slate-950" />
                  <span>Dhaabi (Pause)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Taphisi (Play)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSkip(5)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title="Skip forward 5s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Speaking Indicator with Live Progress Bar */}
          {activeStatementInfo && (
            <div className="flex items-center gap-3 bg-slate-900 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-xs max-w-md flex-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold mb-0.5">
                  <span className="truncate">{labels.nowPlaying}: {activeStatementInfo.statement.speakerRole}</span>
                  <span>{Math.round(activeStatementInfo.segmentProgressPercent)}%</span>
                </div>
                {/* Segment Progress Bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-100"
                    style={{ width: `${activeStatementInfo.segmentProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Speed & Volume Tools */}
          <div className="flex items-center gap-2">
            {/* Speed Toggle */}
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5 text-xs font-mono">
              {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                    playbackSpeed === spd 
                      ? 'bg-amber-500 text-slate-950 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Mute Button */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 🏷️ ACTIVE SPEAKER TAGGING BAR (Label speaker segments during playback) */}
        {activeStatement && (
          <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-400" />
                Tag Speaker [{activeStatement.timestamp}]:
              </span>
              <span className="font-bold text-white text-xs">{activeStatement.speakerRole} ({activeStatement.speakerName})</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {PREDEFINED_SPEAKER_TAGS.slice(0, 5).map((pt) => (
                <button
                  key={pt.role}
                  type="button"
                  onClick={() => handleTagSpeaker(activeStatement.id, pt.role, undefined, false)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                    activeStatement.speakerRole === pt.role
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                  title={`Tag current active speech segment as ${pt.role}`}
                >
                  <span>{pt.icon}</span>
                  <span>{pt.role}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setTaggingStatementId(activeStatement.id);
                  setTaggingSpeakerName(activeStatement.speakerName || '');
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                title="Open full speaker tagging & role customization modal"
              >
                <Edit2 className="w-2.5 h-2.5" />
                <span>More Roles / Batch...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 📜 DIALOGUE STATEMENTS LIST & SEARCH FILTER */}
      {/* ============================================================== */}
      <div className="space-y-3">
        {/* Search & Speaker Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {/* Voice-Activated Search Microphone Button */}
            <button
              type="button"
              onClick={handleStartVoiceSearch}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                isVoiceSearching
                  ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-400/50'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
              }`}
              title="Voice-Activated Search (Speak dialogue keywords to search and scroll)"
            >
              <Mic className={`w-3.5 h-3.5 ${isVoiceSearching ? 'animate-bounce' : ''}`} />
            </button>
          </div>

          {/* Quick Speaker Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSpeakerFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                speakerFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {labels.all}
            </button>
            <button
              type="button"
              onClick={() => setSpeakerFilter('judge')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                speakerFilter === 'judge'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-500 hover:text-amber-400'
              }`}
            >
              ⚖️ {labels.judgeOnly}
            </button>
            <button
              type="button"
              onClick={() => setSpeakerFilter('prosecutor')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                speakerFilter === 'prosecutor'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-500 hover:text-rose-400'
              }`}
            >
              🛡️ {labels.prosecutorOnly}
            </button>
            <button
              type="button"
              onClick={() => setSpeakerFilter('defense')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                speakerFilter === 'defense'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-500 hover:text-blue-400'
              }`}
            >
              💼 {labels.defenseOnly}
            </button>
            <button
              type="button"
              onClick={() => setSpeakerFilter('witness')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                speakerFilter === 'witness'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-500 hover:text-purple-400'
              }`}
            >
              🎙️ {labels.witnessOnly}
            </button>
          </div>
        </div>

        {/* Statements Feed with Real-Time Synchronized Highlighting */}
        <div ref={statementsListRef} className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredStatements.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
              <p className="text-xs">{labels.emptyState}</p>
            </div>
          ) : (
            filteredStatements.map((stmt) => {
              const style = getSpeakerStyle(stmt.speakerRole);
              const Icon = style.icon;
              const isActive = activeStatement?.id === stmt.id;

              return (
                <div
                  key={stmt.id}
                  ref={(el) => { statementCardRefs.current[stmt.id] = el; }}
                  onClick={() => handlePlayStatement(stmt)}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer group relative animate-transcript-slide-in ${
                    isActive
                      ? style.activeBg
                      : 'bg-slate-950/90 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Speaker, timestamp, confidence & quick action buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1.5 ${style.bgColor} ${style.borderColor} ${style.color}`}>
                        <Icon className="w-3 h-3" />
                        <span>{stmt.speakerRole}</span>
                      </span>
                      <span className="text-xs font-bold text-white font-sans">{stmt.speakerName}</span>
                      
                      {/* Interactive Timestamp Badge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayStatement(stmt);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                            : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-slate-800'
                        }`}
                        title="Click to play from this moment"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{stmt.timestamp}</span>
                      </button>

                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-400 text-slate-950 animate-pulse flex items-center gap-1">
                          <Radio className="w-2.5 h-2.5 fill-current" />
                          <span>PLAYING</span>
                        </span>
                      )}

                      {stmt.confidence && !isActive && (
                        <TranscriptionConfidenceBadge confidence={stmt.confidence} />
                      )}
                    </div>

                    {/* Action buttons: Tag Speaker, Insert to draft, Copy */}
                    <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {/* Speaker Tagging Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaggingStatementId(stmt.id);
                          setTaggingSpeakerName(stmt.speakerName || '');
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Change speaker label or name for this segment"
                      >
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span>Tag</span>
                      </button>

                      {/* 🔒 Save to Evidence Locker Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveStatementToEvidenceLocker(stmt);
                        }}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                          savedToLockerIds[stmt.id]
                            ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border-slate-800 hover:border-emerald-500/40'
                        }`}
                        title="Mark this statement as formal evidence and save to Case Evidence Locker"
                      >
                        <Archive className={`w-3 h-3 ${savedToLockerIds[stmt.id] ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span className="hidden md:inline">
                          {savedToLockerIds[stmt.id] ? 'Saved to Locker' : 'Save to Locker'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyStatement(stmt);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                        title="Copy Statement"
                      >
                        {copiedId === stmt.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsertDraft(stmt);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow"
                        title="Insert dialogue into legal draft"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Wixineetti Dabali (Insert)</span>
                      </button>
                    </div>
                  </div>

                  {/* Statement Dialogue Text with Real-Time Word-Level Synchronized Highlighting */}
                  <div className="text-xs text-slate-200 font-sans leading-relaxed pl-1">
                    {isActive && activeStatementInfo ? (
                      <div className="flex flex-wrap gap-1 items-baseline">
                        {activeStatementInfo.words.map((word, wIdx) => {
                          const isCurrentWord = wIdx === activeStatementInfo.activeWordIndex;
                          const isSpokenWord = wIdx < activeStatementInfo.activeWordIndex;

                          return (
                            <span
                              key={wIdx}
                              className={`px-1 py-0.5 rounded transition-all duration-75 ${
                                isCurrentWord
                                  ? style.highlightWord + ' scale-105 shadow-md'
                                  : isSpokenWord
                                  ? 'text-amber-200 font-medium'
                                  : 'text-slate-300 opacity-80'
                              }`}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p>"{stmt.statement}"</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🏷️ SPEAKER TAGGING MODAL */}
      {/* ============================================================== */}
      {taggingStatementId && (() => {
        const targetStmt = statements.find(s => s.id === taggingStatementId);
        if (!targetStmt) return null;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Tag Speaker Segment</h4>
                    <p className="text-[11px] text-slate-400 font-mono">Timestamp: [{targetStmt.timestamp}]</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaggingStatementId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Speaker Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Speaker Name (Maqaa Dubbataa)</label>
                <input
                  type="text"
                  value={taggingSpeakerName}
                  onChange={(e) => setTaggingSpeakerName(e.target.value)}
                  placeholder="e.g., Dr. Caalaa Tasfaayee, Obbo Kabbadaa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Predefined Judicial Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Select Judicial Role (Gahee Mana Murtii)</label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {PREDEFINED_SPEAKER_TAGS.map((tag) => (
                    <button
                      key={tag.role}
                      type="button"
                      onClick={() => handleTagSpeaker(taggingStatementId, tag.role, taggingSpeakerName, applyToAllSameSpeaker)}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800/80 hover:border-amber-500/40 text-left transition-all flex items-center gap-2 group cursor-pointer"
                    >
                      <span className="text-base">{tag.icon}</span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 truncate">{tag.role}</div>
                        <div className="text-[10px] text-slate-400 truncate">{tag.labelEn}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Apply Checkbox */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="batchApply"
                  checked={applyToAllSameSpeaker}
                  onChange={(e) => setApplyToAllSameSpeaker(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="batchApply" className="text-xs text-slate-300 cursor-pointer">
                  Apply to all segments currently tagged as "{targetStmt.speakerRole}"
                </label>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTaggingStatementId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 🎙️ VOICE NAVIGATION CHEATSHEET MODAL */}
      {/* ============================================================== */}
      {showVoiceNavCheatsheet && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                  <Mic className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Voice-Controlled Navigation Guide</h4>
                  <p className="text-xs text-slate-400">Hands-free court transcript voice commands (Oromoo, Amharic & English)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVoiceNavCheatsheet(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>➡️ Move to Next Segment</span>
                  <span className="font-mono text-[11px] text-slate-400">"next segment" / "itti aani" / "ቀጣይ"</span>
                </div>
                <p className="text-[11px] text-slate-400">Moves playback cursor and scrolls to the subsequent dialogue segment.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>⬅️ Move to Previous Segment</span>
                  <span className="font-mono text-[11px] text-slate-400">"previous speaker" / "deebi'i" / "ቀደምት"</span>
                </div>
                <p className="text-[11px] text-slate-400">Jumps backward to the previous speech turn.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>⚖️ Jump to Presiding Judge</span>
                  <span className="font-mono text-[11px] text-slate-400">"judge" / "abbaa seeraa" / "ዳኛ"</span>
                </div>
                <p className="text-[11px] text-slate-400">Immediately seeks and plays the next segment spoken by the judge.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>🎙️ Jump to Witness Testimony</span>
                  <span className="font-mono text-[11px] text-slate-400">"witness" / "ragaa" / "ምስክር"</span>
                </div>
                <p className="text-[11px] text-slate-400">Jumps straight to witness sworn testimony segments.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>🛡️ Jump to Prosecutor</span>
                  <span className="font-mono text-[11px] text-slate-400">"prosecutor" / "abbaa alangaa" / "ዐቃቤ ሕግ"</span>
                </div>
                <p className="text-[11px] text-slate-400">Finds and plays the public prosecutor's oral charges or objections.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>💼 Jump to Defense Advocate</span>
                  <span className="font-mono text-[11px] text-slate-400">"defense" / "abukaattoo" / "ጠበቃ"</span>
                </div>
                <p className="text-[11px] text-slate-400">Directly seeks to defense counsel statements and motions.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>⏯️ Play / Pause Audio</span>
                  <span className="font-mono text-[11px] text-slate-400">"play" / "taphisi" | "pause" / "dhaabi"</span>
                </div>
                <p className="text-[11px] text-slate-400">Controls playback without touching the mouse or keyboard.</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>🔍 Voice Search Keywords</span>
                  <span className="font-mono text-[11px] text-slate-400">"search [keyword]" / "barbaadi [jechoota]"</span>
                </div>
                <p className="text-[11px] text-slate-400">Filters and auto-scrolls directly to the matching keyword statement.</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">Web Speech API • Real-time continuous processing</span>
              <button
                type="button"
                onClick={() => setShowVoiceNavCheatsheet(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-4 right-4 z-50 bg-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

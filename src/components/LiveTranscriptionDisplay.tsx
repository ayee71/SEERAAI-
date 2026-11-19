import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Mic, 
  Archive, 
  Copy, 
  Check, 
  Scale, 
  Shield, 
  Briefcase, 
  User, 
  UserCheck, 
  Clock, 
  Trash2, 
  Download, 
  FileText,
  Lock,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  courtroomAudioService, 
  LiveTranscriptSegment, 
  AudioRecordingState 
} from '../services/courtroomAudioService';
import { 
  savePhysicalEvidenceToCase, 
  CourtroomAudioStatement 
} from '../services/courtCaseService';
import { TranscriptionConfidenceBadge, WordConfidenceHighlighter } from './TranscriptionConfidenceBadge';

export interface LiveTranscriptionDisplayProps {
  currentLang: Language;
  caseId?: string;
  caseNumber?: string;
  courtName?: string;
  activeJudgeName?: string;
  onSaveEvidenceSuccess?: (stmt: LiveTranscriptSegment) => void;
  className?: string;
}

const DEFAULT_SEED_SEGMENTS: LiveTranscriptSegment[] = [
  {
    id: 'seed_seg_1',
    speakerRole: 'Abbaa Seeraa',
    speakerName: 'Dr. Caalaa Tasfaayee (Presiding Judge)',
    statement: 'Dhaddachi Mana Murtii Aanaa Adaamaa beellama har\'aa galmee lakk. CR-2026/045 irratti banameera. Gareen lamaan dhiyaataniiru?',
    timestamp: '00:03',
    confidence: 0.98,
    isFinal: true
  },
  {
    id: 'seed_seg_2',
    speakerRole: 'Abbaa Alangaa',
    speakerName: 'Obbo Kabbadaa Dheeressaa (Prosecutor)',
    statement: 'Eeyyee kabajamoo mana murtii, Abbaan Alangaa dhimma qabeenya mootummaa fi daldala seeraan alaa irratti ragaa barreeffamaa qopheessee dhiyaateera.',
    timestamp: '00:18',
    confidence: 0.96,
    isFinal: true
  },
  {
    id: 'seed_seg_3',
    speakerRole: 'Himataa',
    speakerName: 'Obbo Baqqalaa Gammachuu (Plaintiff)',
    statement: 'Kabajamoo mana murtii, mirgi wabii himatamaa heera mootummaa keeyyata 19(6) bu\'uuraan akka eegamuuf iyyannoo dhiyeessina.',
    timestamp: '00:42',
    confidence: 0.97,
    isFinal: true
  }
];

export const LiveTranscriptionDisplay: React.FC<LiveTranscriptionDisplayProps> = ({
  currentLang,
  caseId = 'case-today-301',
  caseNumber = 'CR-2026/045',
  courtName = 'Mana Murtii Aanaa Adaamaa',
  activeJudgeName = 'Abbaa Seeraa Caalaa',
  onSaveEvidenceSuccess,
  className = ''
}) => {
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>(DEFAULT_SEED_SEGMENTS);
  const [recordingState, setRecordingState] = useState<AudioRecordingState>('idle');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedLockerIds, setSavedLockerIds] = useState<{ [id: string]: boolean }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');
  const [latestAddedId, setLatestAddedId] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to Live Audio Service segments & state
  useEffect(() => {
    const unsubState = courtroomAudioService.onStateChange((state, dur) => {
      setRecordingState(state);
      setDurationSeconds(dur);
    });

    const unsubSegment = courtroomAudioService.onTranscriptSegment((newSegment) => {
      setLatestAddedId(newSegment.id);
      setTimeout(() => {
        setLatestAddedId((curr) => (curr === newSegment.id ? null : curr));
      }, 3500);

      setSegments((prev) => {
        // If the latest segment in feed was interim and has same speaker/timestamp, update it
        const last = prev[prev.length - 1];
        if (last && !last.isFinal && last.speakerRole === newSegment.speakerRole) {
          return [...prev.slice(0, prev.length - 1), newSegment];
        }
        return [...prev, newSegment];
      });

      // Auto-scroll to latest speech
      setTimeout(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    return () => {
      unsubState();
      unsubSegment();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = (stmt: LiveTranscriptSegment) => {
    const formatted = `[${stmt.timestamp}] ${stmt.speakerRole} (${stmt.speakerName}): "${stmt.statement}"`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(stmt.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Koppii ta\'eera (Copied segment)!');
  };

  // 🔒 SAVE TO EVIDENCE LOCKER ACTION
  const handleSaveToEvidenceLocker = async (stmt: LiveTranscriptSegment) => {
    try {
      setSavedLockerIds(prev => ({ ...prev, [stmt.id]: true }));

      // Generate verifiable SVG document snapshot
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
        <text x="40" y="355" fill="#10b981" font-family="monospace" font-size="13">✓ Real-time court oral record (C.P.C Art. 258) • Confidence: ${Math.round((stmt.confidence || 0.95) * 100)}%</text>
      </svg>`;
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgQuote)}`;

      await savePhysicalEvidenceToCase(caseId, {
        caseNumber,
        title: `Ragaa Jecha Dhaddachaa [${stmt.timestamp}] - ${stmt.speakerRole}`,
        category: 'document',
        photoDataUrl: dataUrl,
        description: `Jecha afaanii (${stmt.speakerRole}: ${stmt.speakerName}) waraabbata sagalee live dhaddachaa galmee ${caseNumber} irraa fudhatamee kuusaa ragaatti hidhame.`,
        legalRelevance: `Madaallii ragaa afaanii fi qulqullina dubbii bu'uureffata (S.A.F.H.H. Kwt 258).`,
        exhibitNumber: `Exhibit Live-${stmt.timestamp.replace(':', '')}`,
        tenderedBy: stmt.speakerRole.toLowerCase().includes('alangaa') ? 'prosecutor' : stmt.speakerRole.toLowerCase().includes('himatamaa') ? 'defendant' : stmt.speakerRole.toLowerCase().includes('ragaa') ? 'witness' : 'plaintiff',
        tenderedByName: stmt.speakerName,
        custodianOfficer: activeJudgeName,
        capturedBy: activeJudgeName,
        capturedLocation: courtName,
        admissibilityStatus: 'admitted',
        statutoryBasis: 'Civil Procedure Code Art. 258 / SDFHH Kwt 258'
      });

      onSaveEvidenceSuccess?.(stmt);
      showToast('Kutaan jechaa kun kuusaa ragaatti (Evidence Locker) milkaa\'inaan qabameera!');
    } catch (e: any) {
      console.error('Evidence locker save error:', e);
      showToast('Dogoggora kuusaa ragaa: ' + (e.message || String(e)));
    }
  };

  const filteredSegments = segments.filter(seg => {
    if (speakerFilter !== 'all' && !seg.speakerRole.toLowerCase().includes(speakerFilter.toLowerCase())) {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        seg.statement.toLowerCase().includes(q) ||
        seg.speakerName.toLowerCase().includes(q) ||
        seg.speakerRole.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSpeakerStyle = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('seeraa') || r.includes('judge')) {
      return {
        badge: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        card: 'border-amber-500/20 bg-slate-950/80',
        icon: Scale
      };
    }
    if (r.includes('alangaa') || r.includes('prosecutor')) {
      return {
        badge: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
        card: 'border-rose-500/20 bg-slate-950/80',
        icon: Shield
      };
    }
    if (r.includes('abukaattoo') || r.includes('plaintiff') || r.includes('himataa')) {
      return {
        badge: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
        card: 'border-blue-500/20 bg-slate-950/80',
        icon: Briefcase
      };
    }
    if (r.includes('himatamaa') || r.includes('defendant')) {
      return {
        badge: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
        card: 'border-purple-500/20 bg-slate-950/80',
        icon: User
      };
    }
    if (r.includes('ragaa') || r.includes('witness')) {
      return {
        badge: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        card: 'border-emerald-500/20 bg-slate-950/80',
        icon: UserCheck
      };
    }
    return {
      badge: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
      card: 'border-cyan-500/20 bg-slate-950/80',
      icon: Radio
    };
  };

  return (
    <div className={`bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shadow-inner">
            <Radio className="w-5 h-5 animate-pulse text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Waraabbata Live Qaboo Yaa'ii (Live Court Transcription)</span>
              {recordingState === 'recording' && (
                <span className="text-[10px] bg-rose-500 text-white font-mono font-black px-2 py-0.5 rounded-full animate-ping">
                  LIVE STREAM
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Jechi afaaniin dubbatamu battalumatti gahee dubbataa waliin galmaa\'a; battalatti gara Kuusaa Ragaatti qabaa.'
                : 'Dynamically appends spoken segments tagged with active speaker. Click "Save to Locker" to mark as evidence.'}
            </p>
          </div>
        </div>

        {/* Filter & Count */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 font-bold">
            {segments.length} Segments
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Jecha qaboo yaa'ii barbaadaa..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'judge', 'prosecutor', 'himataa', 'himatamaa', 'ragaa'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSpeakerFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                speakerFilter === r
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Live Stream Transcript Feed */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredSegments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
            <Mic className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p className="text-xs">Sagaleen dubbatamu battalumatti asitti dhangala'a.</p>
            <p className="text-[11px] text-slate-600 font-mono">Qabduu 'Start Recording' fayyadamaa.</p>
          </div>
        ) : (
          filteredSegments.map((stmt) => {
            const style = getSpeakerStyle(stmt.speakerRole);
            const Icon = style.icon;
            const isSaved = savedLockerIds[stmt.id];
            const isNewlyAdded = latestAddedId === stmt.id;

            return (
              <div
                key={stmt.id}
                className={`p-3.5 rounded-2xl border transition-all duration-300 animate-transcript-slide-in ${style.card} ${
                  isNewlyAdded
                    ? 'ring-2 ring-amber-400/60 border-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.22)] scale-[1.01]'
                    : 'hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1.5 ${style.badge}`}>
                      <Icon className="w-3 h-3" />
                      <span>{stmt.speakerRole}</span>
                    </span>
                    <span className="text-xs font-bold text-white">{stmt.speakerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">[{stmt.timestamp}]</span>
                    {isNewlyAdded && (
                      <span className="text-[9px] font-mono font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping inline-block" />
                        <span>HAARAA (NEW)</span>
                      </span>
                    )}
                    <TranscriptionConfidenceBadge confidence={stmt.confidence ?? 0.95} />
                  </div>

                  {/* Segment Action Buttons: Save to Evidence Locker & Copy */}
                  <div className="flex items-center gap-1.5">
                    {/* 🔒 SAVE TO EVIDENCE LOCKER BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleSaveToEvidenceLocker(stmt)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                        isSaved
                          ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 font-black'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/60'
                      }`}
                      title="Save this spoken testimony segment into the case Physical Evidence Locker"
                    >
                      <Archive className={`w-3 h-3 ${isSaved ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span>{isSaved ? 'Kuusaa Ragaatti Qabameera' : 'Kuusaa Ragaatti Kuusi'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(stmt)}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                      title="Copy segment"
                    >
                      {copiedId === stmt.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed font-sans pl-1 pt-1">
                  <WordConfidenceHighlighter
                    text={stmt.statement}
                    confidence={stmt.confidence ?? 0.95}
                    currentLang={currentLang}
                    onVerifyWord={(oldWord, newWord) => {
                      setSegments(prev => prev.map(s => {
                        if (s.id === stmt.id) {
                          return {
                            ...s,
                            statement: s.statement.replace(oldWord, newWord),
                            confidence: 0.99
                          };
                        }
                        return s;
                      }));
                      setToastMessage(`Jechi "${oldWord}" gara "${newWord}" tti mirkanaa'eera!`);
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>

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

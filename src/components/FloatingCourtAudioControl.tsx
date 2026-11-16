import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  GripHorizontal, 
  Activity, 
  Radio, 
  Minimize2, 
  Maximize2,
  Tag,
  Scale,
  Shield,
  Briefcase,
  UserCheck,
  User,
  ChevronDown
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { courtroomAudioService, AudioRecordingState } from '../services/courtroomAudioService';

export interface FloatingCourtAudioControlProps {
  currentLang: Language;
  activeCaseNumber?: string;
  onActiveSpeakerChange?: (role: string, name: string) => void;
  className?: string;
}

const SPEAKER_ROLES = [
  { role: 'Abbaa Seeraa', labelOm: 'Abbaa Seeraa (Judge)', icon: '⚖️', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
  { role: 'Abbaa Alangaa', labelOm: 'Abbaa Alangaa (Prosecutor)', icon: '🛡️', color: 'text-rose-400 bg-rose-500/20 border-rose-500/40' },
  { role: 'Himataa', labelOm: 'Himataa / Abukaattoo (Plaintiff)', icon: '💼', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' },
  { role: 'Himatamaa', labelOm: 'Himatamaa / Abukaattoo (Defendant)', icon: '👤', color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' },
  { role: 'Ragaa', labelOm: 'Ragaa Dhaddachaa (Witness)', icon: '🎙️', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
  { role: 'Qindeessaa Dhaddachaa', labelOm: 'Qindeessaa (Registrar)', icon: '📜', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
];

export const FloatingCourtAudioControl: React.FC<FloatingCourtAudioControlProps> = ({
  currentLang,
  activeCaseNumber = 'CR-2026/045',
  onActiveSpeakerChange,
  className = ''
}) => {
  const [recordingState, setRecordingState] = useState<AudioRecordingState>('idle');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [volumeDb, setVolumeDb] = useState<number>(-60);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<string>('Abbaa Seeraa');
  const [activeSpeakerName, setActiveSpeakerName] = useState<string>('Abbaa Seeraa Caalaa');
  const [showSpeakerPicker, setShowSpeakerPicker] = useState<boolean>(false);

  // Position for dragging
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 120 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const unsubState = courtroomAudioService.onStateChange((state, dur) => {
      setRecordingState(state);
      setDurationSeconds(dur);
    });

    const unsubVol = courtroomAudioService.onVolumeDb((db) => {
      setVolumeDb(db);
    });

    return () => {
      unsubState();
      unsubVol();
    };
  }, []);

  const formatDuration = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    courtroomAudioService.setActiveSpeaker(activeRole, activeSpeakerName);
    courtroomAudioService.setLanguage(currentLang === 'am' ? 'am' : currentLang === 'en' ? 'en' : 'om');
    await courtroomAudioService.startRecording();
  };

  const handlePause = () => {
    if (recordingState === 'recording') {
      courtroomAudioService.pauseRecording();
    } else if (recordingState === 'paused') {
      courtroomAudioService.resumeRecording();
    }
  };

  const handleStop = () => {
    courtroomAudioService.stopRecording();
  };

  const handleSelectSpeaker = (role: string) => {
    setActiveRole(role);
    let defaultName = 'Abbaa Seeraa Caalaa';
    if (role === 'Abbaa Alangaa') defaultName = 'Abbaa Alangaa Tolasaa';
    if (role === 'Himataa') defaultName = 'Obbo Baqqalaa Gammachuu';
    if (role === 'Himatamaa') defaultName = 'Adde Birhaanee Asfaawu';
    if (role === 'Ragaa') defaultName = 'Obbo Gurmeessaa Baqqalaa';
    if (role === 'Qindeessaa Dhaddachaa') defaultName = 'Obbo Tolasaa Fiqaaduu';
    setActiveSpeakerName(defaultName);
    courtroomAudioService.setActiveSpeaker(role, defaultName);
    onActiveSpeakerChange?.(role, defaultName);
    setShowSpeakerPicker(false);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 320, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(70, Math.min(window.innerHeight - 150, e.clientY - dragOffsetRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const activeRoleConfig = SPEAKER_ROLES.find(r => r.role === activeRole) || SPEAKER_ROLES[0];

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`fixed z-50 select-none transition-shadow ${className}`}
    >
      <div className="bg-slate-950/95 border-2 border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden min-w-[280px] max-w-sm ring-1 ring-amber-500/30">
        {/* Header Bar with Drag Handle & Status */}
        <div 
          onMouseDown={handleMouseDown}
          className="p-3 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between cursor-move"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-slate-500" />
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${recordingState === 'recording' ? 'bg-rose-500 animate-ping' : recordingState === 'paused' ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span className="text-[11px] font-mono font-black uppercase text-amber-400 tracking-wider">
                COURT AUDIO API
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {formatDuration(durationSeconds)}
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Body Content */}
        {!isMinimized && (
          <div className="p-3.5 space-y-3">
            {/* Case & Active Speaker Tag Bar */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setShowSpeakerPicker(!showSpeakerPicker)}
                  className={`w-full p-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-1.5 cursor-pointer ${activeRoleConfig.color}`}
                  title="Switch Active Courtroom Speaker"
                >
                  <span className="truncate flex items-center gap-1">
                    <span>{activeRoleConfig.icon}</span>
                    <span className="truncate">{activeRole}: {activeSpeakerName}</span>
                  </span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>

                {/* Speaker Dropdown */}
                {showSpeakerPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95">
                    {SPEAKER_ROLES.map((role) => (
                      <button
                        key={role.role}
                        type="button"
                        onClick={() => handleSelectSpeaker(role.role)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-200 hover:text-amber-300 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{role.icon}</span>
                        <span className="truncate">{role.labelOm}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Direct API Recording Controls: Start / Pause / Stop */}
            <div className="grid grid-cols-3 gap-2">
              {/* Start Recording Button */}
              <button
                type="button"
                onClick={handleStart}
                disabled={recordingState === 'recording'}
                className={`py-2 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                  recordingState === 'recording'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 opacity-50 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                }`}
                title="Start Live Court Audio Recording"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>

              {/* Pause / Resume Button */}
              <button
                type="button"
                onClick={handlePause}
                disabled={recordingState === 'idle' || recordingState === 'stopped'}
                className={`py-2 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  recordingState === 'paused'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                    : recordingState === 'recording'
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
                }`}
                title="Pause or Resume Audio Stream"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{recordingState === 'paused' ? 'Resume' : 'Pause'}</span>
              </button>

              {/* Stop Button */}
              <button
                type="button"
                onClick={handleStop}
                disabled={recordingState === 'idle' || recordingState === 'stopped'}
                className={`py-2 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  recordingState === 'recording' || recordingState === 'paused'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg active:scale-95'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 opacity-50 cursor-not-allowed'
                }`}
                title="Stop Audio Recording Session"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>

            {/* Audio Volume Activity & Mic Indicator */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 flex-1 mr-3">
                <Activity className="w-3 h-3 text-amber-400 shrink-0" />
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, ((volumeDb + 60) / 60) * 100))}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0">{volumeDb} dB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  Headphones,
  Car,
  Smartphone,
  Radio,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Sliders,
  Share2,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import {
  generateLegalSummaryAudio,
  downloadLegalSummaryAudio,
  formatLegalSummaryForSpeech,
  GeneratedAudioResult,
  NeuralVoiceName,
} from '../services/legalAudioExportService';
import { playOromoSpeech } from '../utils/oromoGrammarSpeechEngine';

interface LegalSummaryAudioPlayerProps {
  currentLang: Language;
  summaryText: string;
  documentTitle?: string;
  onClose?: () => void;
  className?: string;
  autoPlay?: boolean;
}

export const LegalSummaryAudioPlayer: React.FC<LegalSummaryAudioPlayerProps> = ({
  currentLang,
  summaryText,
  documentTitle = 'Cuunfaa Sanada Seeraa',
  onClose,
  className = '',
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<NeuralVoiceName>('Zephyr');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [audioResult, setAudioResult] = useState<GeneratedAudioResult | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOnTheGoMode, setIsOnTheGoMode] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const webSpeechControllerRef = useRef<any>(null);

  // Labels trilingual
  const labels = {
    om: {
      title: 'Dhaggeeffannaa & Sagalee Cuunfaa Seeraa',
      sub: 'Imala irratti (On the go) seera dhaggeeffadhaa ykn akka faayilii sagaleetti buufadhaa',
      play: 'Taphisi',
      pause: 'Dhaabi',
      download: 'Sagalee Buusi (.wav)',
      downloading: 'Sagalee qopheessaa jira...',
      downloadSuccess: 'Faayilli sagalee milkaa\'inaan bu\'eera!',
      generating: 'Sagaleen AI qophaa\'aa jira...',
      voice: 'Sagalee AI',
      speed: 'Saffisa',
      onTheGoMode: 'Haala Imalaa (Car / Commute Mode)',
      webSpeechFallback: 'Web Speech (Browser Voice)',
      offlineNotice: 'Offline: Sagaleen meeshaa keessanii ni dubbisa.',
      copyNotice: 'Waraabameera!',
    },
    am: {
      title: 'የሕግ ማጠቃለያ የድምፅ ማጫወቻና ማውረጃ',
      sub: 'በጉዞ ላይ ሳሉ ያዳምጡ ወይም እንደ ድምፅ ፋይል ያውርዱ',
      play: 'አጫውት',
      pause: 'አቁም',
      download: 'ድምፅ አውርድ (.wav)',
      downloading: 'ድምፅ እየተዘጋጀ ነው...',
      downloadSuccess: 'የድምፅ ፋይሉ በተሳካ ሁኔታ ወርዷል!',
      generating: 'AI ድምፅ በማመንጨት ላይ...',
      voice: 'የድምፅ ዓይነት',
      speed: 'ፍጥነት',
      onTheGoMode: 'የጉዞ ሁነታ (Car / Commute Mode)',
      webSpeechFallback: 'Web Speech (የአሳሽ ድምፅ)',
      offlineNotice: 'ከመስመር ውጭ፡ የመሣሪያው ድምፅ ያነባል።',
      copyNotice: 'ተገልብጧል!',
    },
    en: {
      title: 'Legal Summary Audio Player & Exporter',
      sub: 'Review legal briefs hands-free on the go or export as audio file',
      play: 'Play',
      pause: 'Pause',
      download: 'Export Audio (.wav)',
      downloading: 'Generating Audio File...',
      downloadSuccess: 'Audio file downloaded successfully!',
      generating: 'Synthesizing Audio with Gemini AI...',
      voice: 'AI Voice',
      speed: 'Speed',
      onTheGoMode: 'On-the-Go / Car Mode',
      webSpeechFallback: 'Web Speech (Browser Voice)',
      offlineNotice: 'Offline: Local speech synthesizer active.',
      copyNotice: 'Copied!',
    },
  }[currentLang];

  // Stop any active speech on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (webSpeechControllerRef.current) {
        webSpeechControllerRef.current.stop?.();
        webSpeechControllerRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Pre-generate audio URL when player opens or voice changes
  useEffect(() => {
    let isCancelled = false;

    const prepareAudio = async () => {
      if (!summaryText.trim()) return;
      setIsGenerating(true);
      setErrorMessage(null);

      try {
        const result = await generateLegalSummaryAudio(summaryText, documentTitle, {
          lang: currentLang,
          voiceName: selectedVoice,
          speed: playbackSpeed,
          preferNeural: true,
        });

        if (!isCancelled) {
          setAudioResult(result);
          if (result.durationEstimateSec) {
            setDuration(result.durationEstimateSec);
          }

          // If autoPlay was requested
          if (autoPlay && !isPlaying) {
            handlePlay(result);
          }
        }
      } catch (err: any) {
        console.warn('Audio prep error:', err);
        if (!isCancelled) {
          setErrorMessage(err?.message || 'Audio synthesis unavailable. Using browser speech.');
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    prepareAudio();

    return () => {
      isCancelled = true;
    };
  }, [summaryText, selectedVoice, currentLang]);

  // Handle Play
  const handlePlay = async (resultToUse?: GeneratedAudioResult) => {
    const res = resultToUse || audioResult;

    if (res && res.audioUrl) {
      if (!audioElementRef.current) {
        const audio = new Audio(res.audioUrl);
        audioElementRef.current = audio;

        audio.playbackRate = playbackSpeed;
        audio.muted = isMuted;

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
          if (audio.duration && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
        };

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        audio.onerror = () => {
          console.warn('HTML5 Audio playback error, falling back to Web Speech engine');
          fallbackToWebSpeechPlayback();
        };
      }

      try {
        await audioElementRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback blocked, attempting Web Speech:', err);
        fallbackToWebSpeechPlayback();
      }
    } else {
      fallbackToWebSpeechPlayback();
    }
  };

  // Web Speech playback fallback
  const fallbackToWebSpeechPlayback = async () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setErrorMessage('Browser Speech Synthesis is not supported on this device.');
      return;
    }

    try {
      if (webSpeechControllerRef.current) {
        webSpeechControllerRef.current.stop();
      }

      const controller = await playOromoSpeech(summaryText, {
        speed: playbackSpeed,
        preferAiVoice: false,
        onStart: () => setIsPlaying(true),
        onEnd: () => {
          setIsPlaying(false);
          setCurrentTime(0);
        },
        onError: (err) => {
          console.warn('WebSpeech error:', err);
          setIsPlaying(false);
        },
      });

      webSpeechControllerRef.current = controller;
      setIsPlaying(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Speech synthesis failed.');
      setIsPlaying(false);
    }
  };

  // Handle Pause
  const handlePause = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (webSpeechControllerRef.current) {
      webSpeechControllerRef.current.pause?.();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setIsPlaying(false);
  };

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  // Skip 10 seconds back
  const handleSkipBack = () => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.max(0, audioElementRef.current.currentTime - 10);
    }
  };

  // Skip 10 seconds forward
  const handleSkipForward = () => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.min(
        duration || 9999,
        audioElementRef.current.currentTime + 10
      );
    }
  };

  // Change Speed
  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
    }
  };

  // Seek Progress
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = newTime;
    }
  };

  // Direct Audio File Export
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadLegalSummaryAudio(summaryText, documentTitle, {
        lang: currentLang,
        voiceName: selectedVoice,
        speed: playbackSpeed,
        preferNeural: true,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not export audio file.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-300 border shadow-xl ${
        isOnTheGoMode
          ? 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/50 p-6'
          : 'bg-slate-900/95 backdrop-blur-md border-amber-500/30 p-5'
      } ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isPlaying ? <Radio className="w-5 h-5 animate-spin" /> : <Headphones className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span>{labels.title}</span>
                {audioResult?.isNeural && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Gemini 3.8 Neural TTS
                  </span>
                )}
              </h4>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-md">
              {documentTitle} • {labels.sub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* On The Go Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsOnTheGoMode(!isOnTheGoMode)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isOnTheGoMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
            title={labels.onTheGoMode}
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Car Mode</span>
          </button>

          {/* Expand / Minimize */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Close button if provided */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-300 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Expanded Controls */}
      {isExpanded && (
        <div className="pt-4 space-y-4">
          {/* Timeline and scrubber */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>{formatTime(currentTime)}</span>
              <div className="flex items-center gap-1.5">
                {isPlaying && (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px]">Playing</span>
                  </span>
                )}
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
              />
            </div>
          </div>

          {/* Main Action Buttons: Rewind, Play/Pause, Forward, Speed, Download */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Playback Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleSkipBack}
                disabled={isGenerating}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer border border-slate-700 disabled:opacity-40"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isGenerating}
                className={`flex items-center justify-center gap-2 rounded-2xl font-bold transition-all shadow-lg cursor-pointer ${
                  isOnTheGoMode
                    ? 'h-16 px-8 text-base bg-amber-500 hover:bg-amber-400 text-slate-950 scale-105 ring-4 ring-amber-500/20'
                    : 'h-12 px-6 text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950'
                } disabled:opacity-50`}
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>{labels.pause}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{labels.play}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipForward}
                disabled={isGenerating}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all cursor-pointer border border-slate-700 disabled:opacity-40"
                title="Forward 10 seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Speed Switcher */}
              <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
                {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => handleChangeSpeed(spd)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Export Audio File Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || !summaryText}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  downloadSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400'
                } disabled:opacity-50`}
                title={labels.download}
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{labels.downloading}</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{labels.downloadSuccess}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{labels.download}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Voice Selector and Settings Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>{labels.voice}:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['Zephyr', 'Kore', 'Fenrir', 'Puck'] as NeuralVoiceName[]).map((voice) => (
                  <button
                    key={voice}
                    type="button"
                    onClick={() => setSelectedVoice(voice)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      selectedVoice === voice
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    {voice === 'Zephyr'
                      ? '🎙️ Zephyr (Warm)'
                      : voice === 'Kore'
                      ? '🎙️ Kore (Formal)'
                      : voice === 'Fenrir'
                      ? '🎙️ Fenrir (Deep)'
                      : '🎙️ Puck (Crisp)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio format badge */}
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>WAV (24kHz Mono 16-bit)</span>
              <span>•</span>
              <span>Gemini 3.8 Flash-Lite</span>
            </div>
          </div>

          {/* Status / Error Toast */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-amber-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* On-the-Go / Car Mode Tips */}
          {isOnTheGoMode && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <Car className="w-4 h-4" />
                <span>Qajeelfama Imalaa (Hands-Free & Car Review):</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Gara bilbilaatti fe\'uun sagalee buufadhaa (.wav), yookiin Bluetooth konkolaataa keessaniin walitti qabsiisaatii osoo imaltan cuunfaa seeraa kana dhaggeeffadhaa.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

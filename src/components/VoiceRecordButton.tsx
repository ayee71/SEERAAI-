import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, Check } from 'lucide-react';
import { Language } from '../i18n/translations';
import { transcribeSpeechAudio } from '../services/api';

export interface VoiceRecordButtonProps {
  onTranscription?: (text: string) => void;
  onValueChange?: (text: string) => void;
  targetRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  targetInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  currentValue?: string;
  currentLang?: Language | 'auto';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  buttonLabel?: string;
  mode?: 'default' | 'icon-only';
  showTimer?: boolean;
}

export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({
  onTranscription,
  onValueChange,
  targetRef,
  targetInputRef,
  currentValue = '',
  currentLang = 'om',
  className = '',
  size = 'md',
  label,
  buttonLabel,
  mode = 'default',
  showTimer = true,
}) => {
  const activeTargetRef = targetRef || targetInputRef;
  const activeLabel = label || buttonLabel;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcribeSuccess, setTranscribeSuccess] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
    return 'audio/webm';
  };

  const startRecording = async () => {
    setError(null);
    setTranscribeSuccess(false);
    audioChunksRef.current = [];
    setDurationSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDurationSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('[VoiceRecordButton] getUserMedia error:', err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message || '').toLowerCase().includes('denied');
      const msg = isDenied
        ? currentLang === 'om'
          ? 'Hayyama maaykirofoonii eeyyamaa (Microphone permission denied).'
          : currentLang === 'am'
          ? 'የማይክሮፎን ፈቃድ አልተሰጠም። እባክዎ ፍቃድ ይስጡ።'
          : 'Microphone permission denied. Please allow microphone access.'
        : currentLang === 'om'
        ? 'Maaykirofooniin hin argamne.'
        : 'Could not access microphone.';
      setError(msg);
      setTimeout(() => setError(null), 4000);
      stopTracks();
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const recorder = mediaRecorderRef.current;
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {
          resolve();
        }
      });

      stopTracks();

      const blobType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: blobType });

      if (audioBlob.size < 500) {
        throw new Error('Recorded audio was empty. Please speak clearly.');
      }

      // Convert Blob to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const raw = reader.result as string;
          resolve(raw);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Send to server transcription endpoint with verbatimMode = true
      const response = await transcribeSpeechAudio({
        audioData: base64Data,
        mimeType: blobType,
        language: currentLang === 'auto' ? undefined : currentLang,
        legalMode: true,
        verbatimMode: true,
      });

      const verbatimText = response.transcription?.trim() || '';

      if (verbatimText) {
        injectVerbatimText(verbatimText);
        setTranscribeSuccess(true);
        setTimeout(() => setTranscribeSuccess(false), 2500);
      } else {
        throw new Error('No speech detected in audio.');
      }
    } catch (err: any) {
      console.warn('[VoiceRecordButton] Transcription error:', err);
      const msg =
        err?.message ||
        (currentLang === 'om'
          ? 'Waraabbiin sagalee hin milkoofne. Maaloo irra deebi\'aa yaalaa.'
          : 'Failed to transcribe audio. Please try again.');
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsTranscribing(false);
      audioChunksRef.current = [];
    }
  };

  const injectVerbatimText = (verbatimText: string) => {
    if (activeTargetRef?.current) {
      const elem = activeTargetRef.current;
      const start = elem.selectionStart ?? elem.value.length;
      const end = elem.selectionEnd ?? elem.value.length;
      const prevVal = elem.value || currentValue || '';
      const prefix = prevVal.substring(0, start);
      const suffix = prevVal.substring(end);
      const needsLeadingSpace = prefix.length > 0 && !prefix.endsWith(' ') && !prefix.endsWith('\n');
      const injectedChunk = (needsLeadingSpace ? ' ' : '') + verbatimText;
      const newVal = prefix + injectedChunk + suffix;

      elem.value = newVal;

      // Dispatch React synthetic events
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(elem),
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(elem, newVal);
      }
      elem.dispatchEvent(new Event('input', { bubbles: true }));
      elem.dispatchEvent(new Event('change', { bubbles: true }));

      // Set caret right after injected text
      const newCaretPos = start + injectedChunk.length;
      try {
        elem.setSelectionRange(newCaretPos, newCaretPos);
        elem.focus();
      } catch {}

      onTranscription?.(newVal);
      onValueChange?.(newVal);
    } else {
      const prevVal = currentValue ? `${currentValue} ${verbatimText}` : verbatimText;
      onTranscription?.(prevVal);
      onValueChange?.(prevVal);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRecording) {
      stopRecordingAndTranscribe();
    } else if (!isTranscribing) {
      startRecording();
    }
  };

  // Size styling
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-xs sm:text-sm gap-2',
    lg: 'px-4 py-2 text-sm sm:text-base gap-2.5',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isTranscribing}
        className={`rounded-xl font-bold transition-all cursor-pointer inline-flex items-center justify-center border shadow-sm ${sizeClasses} ${
          isRecording
            ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 animate-pulse shadow-rose-950/40 ring-2 ring-rose-500/50'
            : isTranscribing
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-wait'
            : transcribeSuccess
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border-slate-700/80 hover:border-amber-500/40'
        }`}
        title={
          isRecording
            ? currentLang === 'om'
              ? 'Waraabuu dhaabiitii gara barruutti jijjiiri (Stop and transcribe)'
              : 'Stop recording and transcribe verbatim'
            : isTranscribing
            ? 'Sagalee gara barruutti jijjiiraa jira... (Transcribing...)'
            : currentLang === 'om'
            ? 'Sagaleen waraabbadhu (Record speech via MediaRecorder)'
            : 'Record voice input (Verbatim Speech-to-Text)'
        }
      >
        {isTranscribing ? (
          <>
            <Loader2 className={`${iconSizes} animate-spin text-amber-400`} />
            <span className="font-mono text-[11px]">Transcribing...</span>
          </>
        ) : isRecording ? (
          <>
            <Square className={`${iconSizes} text-white fill-current animate-pulse`} />
            {showTimer && (
              <span className="font-mono font-bold tracking-wider text-[11px] text-white">
                {formatTimer(durationSeconds)}
              </span>
            )}
            <span className="text-[11px] font-semibold">
              {currentLang === 'om' ? 'Dhaabi' : currentLang === 'am' ? 'አቁም' : 'Stop'}
            </span>
          </>
        ) : transcribeSuccess ? (
          <>
            <Check className={`${iconSizes} text-emerald-400`} />
            <span className="text-[11px] text-emerald-300 font-semibold">Verbatim Injected</span>
          </>
        ) : (
          <>
            <Mic className={`${iconSizes} text-amber-400 group-hover:scale-110 transition-transform`} />
            {mode !== 'icon-only' && activeLabel && <span className="font-semibold">{activeLabel}</span>}
          </>
        )}
      </button>

      {error && (
        <span className="text-[11px] text-rose-400 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
};

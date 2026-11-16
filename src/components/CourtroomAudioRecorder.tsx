import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Download, 
  FileText, 
  Sparkles, 
  Check, 
  Copy, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Plus, 
  Activity, 
  ShieldCheck, 
  Building2, 
  Scale, 
  User, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ExternalLink,
  Archive,
  RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import { Language, translations } from '../i18n/translations';
import { TranscriptionConfidenceBadge, WordConfidenceHighlighter } from './TranscriptionConfidenceBadge';
import { 
  saveCourtroomAudioRecordingToCase, 
  savePhysicalEvidenceToCase,
  CourtroomAudioStatement, 
  CourtroomAudioRecordingRecord,
  DEFAULT_CASE_DOCKETS,
  FirestoreCaseDocket 
} from '../services/courtCaseService';
import { saveOfflineAudioBufferToDB } from '../services/indexedDb';
import { CourtAudioTranscript } from './CourtAudioTranscript';

export interface CourtroomAudioRecorderProps {
  currentLang: Language;
  activeCaseId?: string;
  activeCaseNumber?: string;
  courtName?: string;
  courtLevel?: 'firstInstance' | 'highCourt' | 'cassation';
  onSavedToCase?: (record: CourtroomAudioRecordingRecord) => void;
  className?: string;
}

export type SpeakerRole = 
  | 'Abbaa Seeraa'
  | 'Abbaa Alangaa'
  | 'Abukaattoo Himataa'
  | 'Abukaattoo Himatamaa'
  | 'Himataa'
  | 'Himatamaa'
  | 'Ragaa'
  | 'Qindeessaa Dhaddachaa';

interface SpeakerPreset {
  role: SpeakerRole;
  labelOm: string;
  labelAm: string;
  labelEn: string;
  color: string;
  badgeBg: string;
  icon: string;
}

const SPEAKER_PRESETS: SpeakerPreset[] = [
  { role: 'Abbaa Seeraa', labelOm: 'Abbaa Seeraa (Judge)', labelAm: 'ዳኛ / ሰብሳቢ', labelEn: 'Judge / Presiding', color: 'text-amber-400', badgeBg: 'bg-amber-500/15 border-amber-500/30', icon: '⚖️' },
  { role: 'Abbaa Alangaa', labelOm: 'Abbaa Alangaa (Prosecutor)', labelAm: 'ዐቃቤ ሕግ', labelEn: 'Prosecutor', color: 'text-rose-400', badgeBg: 'bg-rose-500/15 border-rose-500/30', icon: '🛡️' },
  { role: 'Abukaattoo Himataa', labelOm: 'Abukaattoo Himataa (Plaintiff Counsel)', labelAm: 'የከሳሽ ጠበቃ', labelEn: 'Plaintiff Advocate', color: 'text-blue-400', badgeBg: 'bg-blue-500/15 border-blue-500/30', icon: '💼' },
  { role: 'Abukaattoo Himatamaa', labelOm: 'Abukaattoo Himatamaa (Defense Counsel)', labelAm: 'የተከሳሽ ጠበቃ', labelEn: 'Defense Advocate', color: 'text-indigo-400', badgeBg: 'bg-indigo-500/15 border-indigo-500/30', icon: '⚖️' },
  { role: 'Himataa', labelOm: 'Himataa / Ol-Iyyataa (Plaintiff)', labelAm: 'ከሳሽ / ይግባኝ ባይ', labelEn: 'Plaintiff / Appellant', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/15 border-emerald-500/30', icon: '👤' },
  { role: 'Himatamaa', labelOm: 'Himatamaa / Deebii-Kennaa (Defendant)', labelAm: 'ተከሳሽ / መልስ ሰጪ', labelEn: 'Defendant / Respondent', color: 'text-amber-300', badgeBg: 'bg-amber-500/15 border-amber-500/30', icon: '👥' },
  { role: 'Ragaa', labelOm: 'Ragaa Dhaddachaa (Witness)', labelAm: 'ምስክር', labelEn: 'Witness', color: 'text-purple-400', badgeBg: 'bg-purple-500/15 border-purple-500/30', icon: '🎙️' },
  { role: 'Qindeessaa Dhaddachaa', labelOm: 'Qindeessaa Dhaddachaa (Registrar)', labelAm: 'የችሎት ጸሐፊ', labelEn: 'Court Registrar', color: 'text-cyan-400', badgeBg: 'bg-cyan-500/15 border-cyan-500/30', icon: '📜' }
];

export const CourtroomAudioRecorder: React.FC<CourtroomAudioRecorderProps> = ({
  currentLang,
  activeCaseId: initialCaseId,
  activeCaseNumber: initialCaseNumber,
  courtName: initialCourtName = 'Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa',
  courtLevel = 'firstInstance',
  onSavedToCase,
  className = ''
}) => {
  const t = translations[currentLang];

  // Case details
  const [availableCases, setAvailableCases] = useState<FirestoreCaseDocket[]>(DEFAULT_CASE_DOCKETS);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId || DEFAULT_CASE_DOCKETS[0]?.id || 'case-today-301');
  const [customCaseNumber, setCustomCaseNumber] = useState<string>(initialCaseNumber || DEFAULT_CASE_DOCKETS[0]?.caseNumber || 'CR-2026/045');
  const [sessionTitle, setSessionTitle] = useState<string>('Dhaddacha Falmii Afaanii & Ragaa (Courtroom Oral Proceedings)');
  const [proceedingStage, setProceedingStage] = useState<string>('oral_hearing');
  const [courtNameInput, setCourtNameInput] = useState<string>(initialCourtName);

  // Recording states
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  // Active Speaker
  const [activeSpeakerRole, setActiveSpeakerRole] = useState<SpeakerRole>('Abbaa Seeraa');
  const [activeSpeakerName, setActiveSpeakerName] = useState<string>('Abbaa Seeraa Caalaa');

  // Statements list
  const [statements, setStatements] = useState<CourtroomAudioStatement[]>([]);
  const [transcriptViewMode, setTranscriptViewMode] = useState<'waveform' | 'standard'>('waveform');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [manualStatementText, setManualStatementText] = useState<string>('');

  // Visualizer & Audio Context
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<'waveform' | 'spectrum'>('waveform');
  const [inputVolumeDb, setInputVolumeDb] = useState<number>(-60);

  // Speech Recognition (Web Speech API)
  const recognitionRef = useRef<any>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState<boolean>(true);
  const [recognitionLang, setRecognitionLang] = useState<string>('om-ET');

  // Player controls
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioPlaybackCurrentTime, setAudioPlaybackCurrentTime] = useState<number>(0);
  const [audioPlaybackTotalDuration, setAudioPlaybackTotalDuration] = useState<number>(0);
  const [audioPlaybackSpeed, setAudioPlaybackSpeed] = useState<number>(1.0);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Status flags
  const [isSavingToCase, setIsSavingToCase] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isAiPolishing, setIsAiPolishing] = useState<boolean>(false);
  const [aiPolishSummary, setAiPolishSummary] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Real-time transcript preview state using /api/transcribe
  const [isGeneratingRealtimePreview, setIsGeneratingRealtimePreview] = useState<boolean>(false);
  const [realtimeTranscriptPreview, setRealtimeTranscriptPreview] = useState<string | null>(null);

  const handleGenerateRealtimeTranscriptPreview = async (base64Override?: string) => {
    const dataToSend = base64Override || audioBase64;
    if (!dataToSend) return;
    setIsGeneratingRealtimePreview(true);
    try {
      const resp = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: dataToSend,
          mimeType: audioBlob?.type || 'audio/webm',
          language: recognitionLang.startsWith('am') ? 'am' : recognitionLang.startsWith('en') ? 'en' : 'om',
          legalMode: true,
          verbatimMode: true
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.transcription) {
          setRealtimeTranscriptPreview(data.transcription);
        } else {
          setRealtimeTranscriptPreview('No transcription returned from /api/transcribe.');
        }
      } else {
        setRealtimeTranscriptPreview('Failed to generate real-time transcript preview.');
      }
    } catch (err: any) {
      console.warn('Real-time transcript preview error:', err);
      setRealtimeTranscriptPreview(`Error: ${err.message || 'Network error'}`);
    } finally {
      setIsGeneratingRealtimePreview(false);
    }
  };

  useEffect(() => {
    if (audioBase64 && recordingState === 'stopped' && !realtimeTranscriptPreview) {
      handleGenerateRealtimeTranscriptPreview(audioBase64);
    }
  }, [audioBase64, recordingState]);

  // Timer Ref
  const timerIntervalRef = useRef<any>(null);

  // Load cases from localStorage or initial
  useEffect(() => {
    try {
      const raw = localStorage.getItem('seera_court_cases_cache_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableCases(parsed);
          if (!initialCaseId) {
            setSelectedCaseId(parsed[0].id);
            setCustomCaseNumber(parsed[0].caseNumber || 'CR-2026/045');
          }
        }
      }
    } catch (e) {
      // Use defaults
    }
  }, [initialCaseId]);

  // Update case info on selection
  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    const found = availableCases.find(c => c.id === caseId);
    if (found) {
      setCustomCaseNumber(found.caseNumber);
      if (found.claimSubject) {
        setSessionTitle(`Dhaddacha: ${found.claimSubject.slice(0, 50)}...`);
      }
      if (found.assignedJudge && found.assignedJudge !== 'Pending Assignment') {
        setActiveSpeakerName(found.assignedJudge);
      }
    }
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechRecognitionSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLang;

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const finalCleaned = transcriptChunk.trim();
            if (finalCleaned.length > 0) {
              const newStatement: CourtroomAudioStatement = {
                id: `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                speakerRole: activeSpeakerRole,
                speakerName: activeSpeakerName,
                statement: finalCleaned,
                timestamp: formatSecondsToTime(recordedDuration),
                confidence: event.results[i][0].confidence || 0.92
              };
              setStatements(prev => [...prev, newStatement]);
              setInterimTranscript('');
            }
          } else {
            currentInterim += transcriptChunk;
          }
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (e: any) => {
        console.warn('[Web Speech] Court recognition event note:', e.error);
        if (e.error === 'no-speech' || e.error === 'network') {
          // Normal transient pauses
        }
      };

      recognition.onend = () => {
        // If still in recording state, smoothly restart
        if (recordingState === 'recording' && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            // ignore restart collision
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition setup failed:', err);
      setIsSpeechRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [recognitionLang, activeSpeakerRole, activeSpeakerName, recordingState, recordedDuration]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      stopTracksAndAudioContext();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  const stopTracksAndAudioContext = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  };

  // Visualizer Animation Loop
  const startVisualizer = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const timeDataArray = new Uint8Array(bufferLength);
    const freqDataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameIdRef.current = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(0, height / 4);
      ctx.lineTo(width, height / 4);
      ctx.moveTo(0, (height * 3) / 4);
      ctx.lineTo(width, (height * 3) / 4);
      ctx.stroke();

      if (visualizerMode === 'waveform') {
        // OSCILLOSCOPE WAVEFORM
        analyser.getByteTimeDomainData(timeDataArray);

        // Calculate simple RMS volume
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (timeDataArray[i] - 128) / 128;
          sumSquares += val * val;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const db = rms > 0 ? 20 * Math.log10(rms) : -60;
        setInputVolumeDb(Math.max(-60, Math.min(0, Math.round(db))));

        // Draw waveform
        ctx.lineWidth = 2.5;
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, '#38bdf8');
        lineGrad.addColorStop(0.5, '#f59e0b');
        lineGrad.addColorStop(1, '#10b981');
        ctx.strokeStyle = lineGrad;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeDataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
      } else {
        // FREQUENCY BARS SPECTRUM
        analyser.getByteFrequencyData(freqDataArray);

        const barsCount = 36;
        const barWidth = (width / barsCount) - 3;
        let x = 2;

        let maxVal = 0;
        for (let i = 0; i < barsCount; i++) {
          const dataIndex = Math.floor((i / barsCount) * bufferLength * 0.7);
          const barHeight = ((freqDataArray[dataIndex] || 0) / 255) * (height - 12);
          if (freqDataArray[dataIndex] > maxVal) maxVal = freqDataArray[dataIndex];

          const barGrad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          barGrad.addColorStop(0, '#f59e0b');
          barGrad.addColorStop(0.5, '#38bdf8');
          barGrad.addColorStop(1, '#a855f7');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight - 2, barWidth, barHeight, 3);
          ctx.fill();

          x += barWidth + 3;
        }

        const normRms = maxVal / 255;
        const db = normRms > 0 ? 20 * Math.log10(normRms) : -60;
        setInputVolumeDb(Math.max(-60, Math.min(0, Math.round(db))));
      }
    };

    render();
  };

  // Start Recording Action
  const handleStartRecording = async () => {
    try {
      setSaveSuccessMessage(null);
      setSaveErrorMessage(null);
      audioChunksRef.current = [];

      // 1. Microphone capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      mediaStreamRef.current = stream;

      // 2. Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      sourceNode.connect(analyser);
      analyserRef.current = analyser;

      startVisualizer(analyser);

      // 3. MediaRecorder initialization
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(recordedBlob);
      };

      recorder.start(1000); // chunk every 1s
      setRecordingState('recording');
      window.dispatchEvent(new CustomEvent('seera:court_audio_timer_update', { detail: { duration: 0, state: 'recording' } }));

      // 4. Auto-save to IndexedDB every 30 seconds
      timerIntervalRef.current = setInterval(async () => {
        setRecordedDuration(prev => {
          const next = prev + 1;
          window.dispatchEvent(new CustomEvent('seera:court_audio_timer_update', {
            detail: { duration: next, state: 'recording' }
          }));
          return next;
        });
        if (recordingState === 'recording' && audioChunksRef.current.length > 0) {
          const bufferBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          await saveOfflineAudioBufferToDB(`audio_buffer_${selectedCaseId}`, bufferBlob);
          console.log('Audio buffer auto-saved to IndexedDB');
        }
      }, 1000);

      // 5. Speech recognition start
      if (recognitionRef.current && isSpeechRecognitionSupported) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // May already be running
        }
      }
    } catch (err: any) {
      console.error('Courtroom audio microphone access denied:', err);
      setSaveErrorMessage('Maaykirofooniin hin argamne ykn eeyyama hin qabu. Maaloo eeyyama maaykirofoonii mirkaneessaa.');
      setRecordingState('idle');
    }
  };

  // Pause Recording
  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setRecordingState('paused');
      window.dispatchEvent(new CustomEvent('seera:court_audio_timer_update', { detail: { duration: recordedDuration, state: 'paused' } }));
    }
  };

  // Resume Recording
  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = setInterval(() => {
        setRecordedDuration(prev => {
          const next = prev + 1;
          window.dispatchEvent(new CustomEvent('seera:court_audio_timer_update', {
            detail: { duration: next, state: 'recording' }
          }));
          return next;
        });
      }, 1000);
      if (recognitionRef.current && isSpeechRecognitionSupported) {
        try { recognitionRef.current.start(); } catch {}
      }
      setRecordingState('recording');
      window.dispatchEvent(new CustomEvent('seera:court_audio_timer_update', { detail: { duration: recordedDuration, state: 'recording' } }));
    }
  };

  // Listen for global audio recording toggle commands (pause / resume / start)
  useEffect(() => {
    const handleToggleEvent = (e: any) => {
      const action = e.detail?.action;
      if (action === 'pause') {
        handlePauseRecording();
      } else if (action === 'resume') {
        handleResumeRecording();
      } else if (action === 'start' && recordingState === 'idle') {
        handleStartRecording();
      }
    };
    window.addEventListener('seera:court_audio_recording_toggle', handleToggleEvent);
    return () => window.removeEventListener('seera:court_audio_recording_toggle', handleToggleEvent);
  }, [recordingState, recordedDuration]);

  // Stop Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      mediaRecorderRef.current.stop();
      stopTracksAndAudioContext();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setRecordingState('stopped');
      window.dispatchEvent(new CustomEvent('seera:court_audio_timer_update', { detail: { duration: recordedDuration, state: 'stopped' } }));
    }
  };

  // Reset / Re-record
  const handleResetRecording = () => {
    if (window.confirm("Waraabbata kana haqanii haaraa jalqabuu barbaadduu? (Are you sure you want to reset this recording?)")) {
      handleStopRecording();
      setAudioBlob(null);
      setAudioUrl(null);
      setAudioBase64(null);
      setRecordedDuration(0);
      setStatements([]);
      setInterimTranscript('');
      setRealtimeTranscriptPreview(null);
      setRecordingState('idle');
      setSaveSuccessMessage(null);
      setSaveErrorMessage(null);
      setAiPolishSummary(null);
      window.dispatchEvent(new CustomEvent('seera:court_audio_timer_update', { detail: { duration: 0, state: 'idle' } }));
    }
  };

  // Add Manual Statement to Transcript
  const handleAddManualStatement = () => {
    if (!manualStatementText.trim()) return;

    const newStatement: CourtroomAudioStatement = {
      id: `stmt_${Date.now()}_manual`,
      speakerRole: activeSpeakerRole,
      speakerName: activeSpeakerName,
      statement: manualStatementText.trim(),
      timestamp: formatSecondsToTime(recordedDuration),
      confidence: 1.0
    };

    setStatements(prev => [...prev, newStatement]);
    setManualStatementText('');
  };

  // Delete single statement
  const handleDeleteStatement = (id: string) => {
    setStatements(prev => prev.filter(s => s.id !== id));
  };

  // Refine with Gemini AI
  const handleAiPolishTranscript = async () => {
    if (statements.length === 0 && !audioBase64) return;
    setIsAiPolishing(true);
    setSaveErrorMessage(null);

    try {
      const resp = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioBase64 || '',
          mimeType: audioBlob?.type || 'audio/webm',
          language: recognitionLang.startsWith('am') ? 'am' : recognitionLang.startsWith('en') ? 'en' : 'om',
          legalMode: true
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.transcription) {
          setAiPolishSummary(data.transcription);
          // If we had no statements, create one from the transcript
          if (statements.length === 0) {
            setStatements([
              {
                id: `stmt_ai_${Date.now()}`,
                speakerRole: activeSpeakerRole,
                speakerName: activeSpeakerName,
                statement: data.transcription,
                timestamp: formatSecondsToTime(recordedDuration),
                confidence: 0.98
              }
            ]);
          }
        }
      }
    } catch (err: any) {
      console.warn('AI Polish note:', err);
      setSaveErrorMessage('Qulqulleessuun AI yeroof hin milkoofne. Barreeffamni jiru eegameera.');
    } finally {
      setIsAiPolishing(false);
    }
  };

  // Save Audio & Transcript to Case File
  const handleSaveToCaseFile = async () => {
    if (!selectedCaseId && !customCaseNumber) {
      setSaveErrorMessage('Maaloo Lakkoofsa Galmee Mana Murtii filadhaa ykn galchaa.');
      return;
    }

    setIsSavingToCase(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    try {
      const activeCase = availableCases.find(c => c.id === selectedCaseId);
      const caseNum = customCaseNumber || activeCase?.caseNumber || 'CR-2026/045';

      const payload = {
        caseId: selectedCaseId || `case_${caseNum.replace(/[^a-zA-Z0-9]/g, '_')}`,
        caseNumber: caseNum,
        courtId: activeCase?.benchId || 'court_adama_first_instance',
        courtName: courtNameInput,
        sessionTitle: sessionTitle || 'Waraabbata Sagalee Dhaddachaa',
        stage: proceedingStage,
        duration: recordedDuration,
        speakerStatements: statements,
        audioData: audioBase64 || null,
        mimeType: audioBlob?.type || 'audio/webm',
        recordedBy: activeCase?.assignedJudge || activeSpeakerName || 'Abbaa Seeraa',
        recordedByRole: 'judge',
        language: (recognitionLang.startsWith('am') ? 'am' : recognitionLang.startsWith('en') ? 'en' : 'om') as 'om' | 'am' | 'en'
      };

      const result = await saveCourtroomAudioRecordingToCase(payload);

      if (result.success && result.recording) {
        setSaveSuccessMessage(result.message || "Waraabbanni sagalee dhaddachaa galmee irratti hidhameera!");
        if (onSavedToCase) {
          onSavedToCase(result.recording);
        }
      } else {
        setSaveErrorMessage(result.message || 'Galmee irratti kuusuun hin milkoofne.');
      }
    } catch (err: any) {
      console.error('Error saving court audio recording:', err);
      setSaveErrorMessage(err.message || 'Waraabbata sagalee galmeessuu irratti dogoggorri uumameera.');
    } finally {
      setIsSavingToCase(false);
    }
  };

  // Download Raw Audio File (.webm)
  const handleDownloadAudioFile = () => {
    if (!audioBlob) return;
    const cleanCaseNo = (customCaseNumber || 'CourtAudio').replace(/[^a-zA-Z0-9_-]/g, '_');
    const a = document.createElement('a');
    a.href = audioUrl || URL.createObjectURL(audioBlob);
    a.download = `Sagalee_Dhaddachaa_${cleanCaseNo}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export Court Minutes PDF with Watermark & Seals
  const handleExportMinutesPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 30, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 158, 11); // amber-500
      doc.setFontSize(14);
      doc.text(courtNameInput.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("QABOO YAA'II WARAABBATA SAGALEE DHADDACHAA (COURT AUDIO MINUTES)", pageWidth / 2, 19, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Guyyaa: ${new Date().toISOString().slice(0, 10)} | Sa'aatii: ${new Date().toLocaleTimeString()}`, pageWidth / 2, 25, { align: 'center' });

      // Case Meta Box
      let y = 38;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`Lakk. Galmee: ${customCaseNumber}`, 18, y + 7);
      doc.text(`Sadarkaa Dhaddachaa: ${proceedingStage.toUpperCase()}`, 110, y + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Mata-Duree: ${sessionTitle}`, 18, y + 14);
      doc.text(`Dheerina Sagalee: ${formatSecondsToTime(recordedDuration)}`, 110, y + 14);
      doc.text(`Ofiisara/Abbaa Seeraa: ${activeSpeakerName}`, 18, y + 21);
      doc.text(`Baay'ina Jecha Falmii: ${statements.length}`, 110, y + 21);

      y += 34;

      // Executive Summary if present
      if (aiPolishSummary) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text("GABAABINA DHADDACHAA (EXECUTIVE HEARING MINUTES SUMMARY):", 18, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const splitSumm = doc.splitTextToSize(aiPolishSummary, pageWidth - 36);
        doc.text(splitSumm.slice(0, 3), 18, y + 10);
        y += 28;
      }

      // Statements Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("JECHA FALMII DHADDACHAA (RECORDED TESTIMONY & STATEMENTS)", 14, y);
      y += 5;

      statements.forEach((stmt, idx) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.setDrawColor(226, 232, 240);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9);
        doc.text(`[${stmt.timestamp}] ${stmt.speakerRole.toUpperCase()}: ${stmt.speakerName}`, 16, y + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const splitText = doc.splitTextToSize(`"${stmt.statement}"`, pageWidth - 34);
        doc.text(splitText, 16, y + 9);

        const blockHeight = 11 + splitText.length * 4;
        doc.rect(14, y, pageWidth - 28, blockHeight);
        y += blockHeight + 2;
      });

      // Verification Signature Block
      if (y > 245) {
        doc.addPage();
        y = 25;
      } else {
        y += 10;
      }

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Galmeen qaboo yaa'ii kun sagalee waraabbame irraa sirrummaan teeknoolojii SEERAAI tiin mirkanaa'eera.", 14, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Mallattoo Abbaa Seeraa / Registrar: _______________________", 14, y);
      doc.text("Chaappaa Mana Murtii: [ SEAL ]", pageWidth - 70, y);

      // Save PDF
      const cleanCaseNo = (customCaseNumber || 'CourtMinutes').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Qaboo_Yaaii_Dhaddachaa_${cleanCaseNo}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('PDF uumuun hin milkoofne. Maaloo barreeffama waraabaa.');
    }
  };

  // Helper formatting seconds to MM:SS or HH:MM:SS
  const formatSecondsToTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Copy full transcript text
  const handleCopyTranscript = (textToCopy: string, index?: number) => {
    navigator.clipboard.writeText(textToCopy);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl ${className}`}>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 sm:p-6 border-b border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Waraabbata Sagalee Dhaddachaa
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Live Courtroom Audio
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time legal speech transcription, speaker diarization, audio visualization & case filing
              </p>
            </div>
          </div>

          {/* Dialect / Language Selector */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-400">Afaan / Language:</span>
            <select
              value={recognitionLang}
              onChange={(e) => setRecognitionLang(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-amber-300 font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500"
            >
              <option value="om-ET">Afaan Oromoo (om-ET)</option>
              <option value="am-ET">አማርኛ / Amharic (am-ET)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </div>
        </div>

        {/* Case Binder Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-800/60 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Galmee Mana Murtii (Case):</label>
            <select
              value={selectedCaseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            >
              {availableCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.claimantName.slice(0, 16)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Lakk. Galmee Qajeelaa (Case No):</label>
            <input
              type="text"
              value={customCaseNumber}
              onChange={(e) => setCustomCaseNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono font-bold focus:outline-none focus:border-amber-500"
              placeholder="e.g. CR-2026/045"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Sadarkaa Dhaddachaa (Stage):</label>
            <select
              value={proceedingStage}
              onChange={(e) => setProceedingStage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="oral_hearing">3. Falmii Afaanii (SDFHH Kwt 340)</option>
              <option value="witness_testimony">Dhaddacha Ragaa Namaa (Witness Examination)</option>
              <option value="preliminary_objection">Mormii Sadarkaa Duraa (SDFHH 245)</option>
              <option value="substantive_hearing">Falmii Hundee Dhimmaa (Substantive)</option>
              <option value="ruling_delivery">Labsa Murtii (Judgment Reading)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Mana Murtii (Court Bench):</label>
            <input
              type="text"
              value={courtNameInput}
              onChange={(e) => setCourtNameInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 truncate"
            />
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">

        {/* Visualizer Canvas & Live Status Bar */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-inner">
          <div className="p-3 sm:p-4 bg-slate-900/60 border-b border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              {recordingState === 'recording' ? (
                <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 text-rose-400 px-3 py-1 rounded-full font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>LIVE RECORDING</span>
                </div>
              ) : recordingState === 'paused' ? (
                <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>PAUSED</span>
                </div>
              ) : recordingState === 'stopped' ? (
                <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>FINISHED (WARAABBAMEERA)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  <span>QOPHII DHADDACHAA (READY)</span>
                </div>
              )}

              {/* Timer */}
              <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-black text-amber-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{formatSecondsToTime(recordedDuration)}</span>
              </div>
            </div>

            {/* Visualizer Mode Controls & Volume Meter */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                <span>MIC LEVEL:</span>
                <span className={`font-bold ${inputVolumeDb > -10 ? 'text-rose-400 font-black' : inputVolumeDb > -30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {inputVolumeDb} dB
                </span>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-75 ${inputVolumeDb > -10 ? 'bg-rose-500' : inputVolumeDb > -30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.max(5, Math.min(100, ((inputVolumeDb + 60) / 60) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVisualizerMode('waveform')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    visualizerMode === 'waveform'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Wave
                </button>
                <button
                  type="button"
                  onClick={() => setVisualizerMode('spectrum')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    visualizerMode === 'spectrum'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bars
                </button>
              </div>
            </div>
          </div>

          {/* HTML5 Canvas Waveform */}
          <div className="w-full h-32 sm:h-40 bg-slate-950 relative flex items-center justify-center">
            <canvas 
              ref={canvasRef} 
              width={720} 
              height={160} 
              className="w-full h-full block"
            />
            {recordingState === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 pointer-events-none">
                <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                <span className="text-xs font-mono">Baniinsa maaykirofoonii eegaa jira... (Microphone standby)</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>Sagalee Waraabi (Start Recording)</span>
              </button>
            )}

            {recordingState === 'recording' && (
              <>
                <button
                  type="button"
                  onClick={handlePauseRecording}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Yeroof Dhaabi (Pause)</span>
                </button>

                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer transition-all active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Xumuri (Stop Recording)</span>
                </button>
              </>
            )}

            {recordingState === 'paused' && (
              <>
                <button
                  type="button"
                  onClick={handleResumeRecording}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Itti Fufi (Resume)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Waraabbata kana xumuruu barbaadduu? (Are you sure you want to finalize this recording?)")) {
                      handleStopRecording();
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Xumuri (Stop)</span>
                </button>
              </>
            )}

            {recordingState === 'stopped' && (
              <button
                type="button"
                onClick={handleResetRecording}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Haaraa Waraabi (Re-record)</span>
              </button>
            )}
          </div>

          {/* Action buttons: Save to Case / Polish / Download */}
          <div className="flex flex-wrap items-center gap-2">
            {recordingState === 'stopped' && (
              <>
                <button
                  type="button"
                  onClick={handleAiPolishTranscript}
                  disabled={isAiPolishing || (statements.length === 0 && !audioBase64)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Refine and format using Gemini 3.8 Flash Multimodal Audio"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isAiPolishing ? 'AI Qulqulleessaa...' : 'Gemini AI Qulqulleessi'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAudioFile}
                  disabled={!audioBlob}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Download .webm audio file"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audio (.webm)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMinutesPdf}
                  disabled={statements.length === 0}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Download formal judicial minutes in PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>PDF Minutes</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToCaseFile}
                  disabled={isSavingToCase}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingToCase ? 'Galmeessaa jira...' : 'Galmeetti Kuusi (Save to Case)'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Audio Player if stopped */}
        {audioUrl && recordingState === 'stopped' && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Volume2 className="w-4 h-4" />
                <span>Sagalee Dhaddachaa Waraabbame (Recorded Audio Playback):</span>
              </span>
              <span>{formatSecondsToTime(audioPlaybackCurrentTime)} / {formatSecondsToTime(audioPlaybackTotalDuration || recordedDuration)}</span>
            </div>

            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onTimeUpdate={() => {
                if (audioPlayerRef.current) {
                  setAudioPlaybackCurrentTime(audioPlayerRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (audioPlayerRef.current) {
                  setAudioPlaybackTotalDuration(audioPlayerRef.current.duration);
                }
              }}
              onEnded={() => setIsPlayingAudio(false)}
              className="hidden"
            />

            {/* Custom scrubber */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (audioPlayerRef.current) {
                    if (isPlayingAudio) {
                      audioPlayerRef.current.pause();
                      setIsPlayingAudio(false);
                    } else {
                      audioPlayerRef.current.play();
                      setIsPlayingAudio(true);
                    }
                  }
                }}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md cursor-pointer transition-all"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <input
                type="range"
                min={0}
                max={audioPlaybackTotalDuration || recordedDuration || 1}
                step={0.1}
                value={audioPlaybackCurrentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAudioPlaybackCurrentTime(val);
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.currentTime = val;
                  }
                }}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      setAudioPlaybackSpeed(spd);
                      if (audioPlayerRef.current) {
                        audioPlayerRef.current.playbackRate = spd;
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                      audioPlaybackSpeed === spd
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Transcript Preview below audio player using /api/transcribe */}
        {audioUrl && recordingState === 'stopped' && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h5 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                  Real-Time Transcript Preview (/api/transcribe)
                </h5>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateRealtimeTranscriptPreview()}
                  disabled={isGeneratingRealtimePreview || !audioBase64}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingRealtimePreview ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingRealtimePreview ? 'Generating...' : 'Refresh / Regenerate'}</span>
                </button>
                {realtimeTranscriptPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(realtimeTranscriptPreview);
                      alert('Real-time transcript preview copied to clipboard!');
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-amber-400" />
                    <span>Copy</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 font-serif leading-relaxed max-h-48 overflow-y-auto">
              {isGeneratingRealtimePreview ? (
                <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="font-mono text-xs">Calling /api/transcribe endpoint for real-time legal transcript preview...</span>
                </div>
              ) : realtimeTranscriptPreview ? (
                <p className="whitespace-pre-wrap">{realtimeTranscriptPreview}</p>
              ) : (
                <p className="text-slate-500 italic font-mono text-[11px]">No transcript preview generated yet. Click Refresh to invoke /api/transcribe.</p>
              )}
            </div>
          </div>
        )}

        {/* Success / Error Banners */}
        {saveSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs"
            >
              ×
            </button>
          </div>
        )}

        {saveErrorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{saveErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-xs"
            >
              ×
            </button>
          </div>
        )}

        {/* Live Speaker Switcher Bar */}
        <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Nama Amma Dubbatu Filadhaa (Active Court Speaker):
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono">Maqaa:</span>
              <input
                type="text"
                value={activeSpeakerName}
                onChange={(e) => setActiveSpeakerName(e.target.value)}
                placeholder="Maqaa dubbataa..."
                className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Speaker Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SPEAKER_PRESETS.map((preset) => {
              const isSelected = activeSpeakerRole === preset.role;
              return (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => {
                    setActiveSpeakerRole(preset.role);
                    if (preset.role === 'Abbaa Seeraa') setActiveSpeakerName('Abbaa Seeraa Caalaa');
                    else if (preset.role === 'Abbaa Alangaa') setActiveSpeakerName('Abbaa Alangaa Tolasaa');
                    else if (preset.role === 'Abukaattoo Himataa') setActiveSpeakerName('Abukaattoo Tashoomaa');
                    else if (preset.role === 'Abukaattoo Himatamaa') setActiveSpeakerName('Abukaattoo Caalaa');
                    else if (preset.role === 'Himataa') setActiveSpeakerName('Obbo Baqqalaa Gammachuu');
                    else if (preset.role === 'Himatamaa') setActiveSpeakerName('Obbo Alamuu Dheeressaa');
                    else if (preset.role === 'Ragaa') setActiveSpeakerName('Ragaa Dhaddachaa');
                    else setActiveSpeakerName('Qindeessaa Galmee');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-base">{preset.icon}</span>
                  <div className="truncate">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {currentLang === 'am' ? preset.labelAm : currentLang === 'en' ? preset.labelEn : preset.labelOm}
                    </p>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {preset.role}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Transcription Visualization Area */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>
                Qaboo Yaa'ii Jecha Falmii ({statements.length} Statements Transcribed)
              </span>
            </h4>

            {/* Toggle Mode: Waveform Transcript vs Standard */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTranscriptViewMode('waveform')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    transcriptViewMode === 'waveform'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>Waveform & Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptViewMode('standard')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    transcriptViewMode === 'standard'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Tarree (List)</span>
                </button>
              </div>

              {statements.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allText = statements
                      .map(s => `[${s.timestamp}] ${s.speakerRole} (${s.speakerName}): "${s.statement}"`)
                      .join('\n\n');
                    handleCopyTranscript(allText);
                    alert("Qaboon yaa'ii guutummaan waraabbameera (Copied transcript).");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Koppii Godhi (Copy All)</span>
                </button>
              )}
            </div>
          </div>

          {/* If Waveform View is selected, display CourtAudioTranscript */}
          {transcriptViewMode === 'waveform' && (
            <CourtAudioTranscript
              statements={statements}
              audioUrl={audioUrl}
              audioBlob={audioBlob}
              currentLang={currentLang}
              caseId={selectedCaseId}
              caseNumber={customCaseNumber}
              courtName={courtNameInput}
              totalDurationSeconds={recordedDuration > 0 ? recordedDuration : undefined}
              onUpdateStatements={(updated) => setStatements(updated)}
              onInsert={(text) => {
                navigator.clipboard.writeText(text);
                alert("Jechi dhaddachaa waraabbamee gara qabattuu wixineetti dabalameera (Copied to draft buffer)!");
              }}
            />
          )}

          {/* Floating Interim Stream (live as voice is spoken) */}
          {recordingState === 'recording' && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl animate-pulse">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-[11px] font-mono font-bold text-amber-400">
                  {activeSpeakerRole} ({activeSpeakerName}) dubbataa jira...
                </span>
              </div>
              <p className="text-xs text-slate-200 italic font-sans leading-relaxed">
                {interimTranscript || "Jechi afaaniin dubbatamu battalumatti asitti barreeffamaan dhangala'a..."}
              </p>
            </div>
          )}

          {/* Statements List & Manual Entry (Standard View) */}
          {transcriptViewMode === 'standard' && (
            <>
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {statements.length === 0 && recordingState !== 'recording' ? (
                  <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800/80 text-center text-slate-500 space-y-2">
                    <Mic className="w-8 h-8 mx-auto text-slate-700" />
                    <p className="text-xs">Jechi dhaddachaa ammaaf hin galmoofne.</p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Sagalee waraabuu jalqabuuf qabduu 'Sagalee Waraabi' jedhu cuqqaalaa ykn barreeffama harkaatiin dabaladhaa.
                    </p>
                  </div>
                ) : (
                  statements.map((stmt, idx) => {
                    const preset = SPEAKER_PRESETS.find(p => p.role === stmt.speakerRole);
                    return (
                      <div
                        key={stmt.id}
                        className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${preset?.badgeBg || 'bg-slate-800 text-slate-300'}`}>
                              {preset?.icon || '👤'} {stmt.speakerRole}
                            </span>
                            <span className="text-xs font-bold text-white">{stmt.speakerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">[{stmt.timestamp}]</span>
                            <TranscriptionConfidenceBadge confidence={stmt.confidence ?? 0.95} />
                          </div>
                          <div className="text-xs text-slate-200 leading-relaxed font-sans pl-1 pt-1">
                            <WordConfidenceHighlighter
                              text={stmt.statement}
                              confidence={stmt.confidence ?? 0.95}
                              currentLang={currentLang}
                              onVerifyWord={(oldWord, newWord) => {
                                setStatements(prev => prev.map(s => s.id === stmt.id ? { ...s, statement: s.statement.replace(oldWord, newWord), confidence: 0.99 } : s));
                                setSaveSuccessMessage(`Jechi "${oldWord}" gara "${newWord}" tti mirkanaa'eera!`);
                                setTimeout(() => setSaveSuccessMessage(null), 3000);
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Save to Evidence Locker Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const svgQuote = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
                                  <rect width="100%" height="100%" fill="#020617"/>
                                  <rect x="20" y="20" width="760" height="360" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
                                  <text x="40" y="65" fill="#f59e0b" font-family="monospace" font-size="18" font-weight="bold">SEERAAI EVIDENCE LOCKER • CASE: ${customCaseNumber}</text>
                                  <text x="40" y="95" fill="#94a3b8" font-family="sans-serif" font-size="14">Timestamp: [${stmt.timestamp}] • Speaker: ${stmt.speakerRole} (${stmt.speakerName})</text>
                                  <line x1="40" y1="115" x2="760" y2="115" stroke="#334155" stroke-width="1"/>
                                  <foreignObject x="40" y="130" width="720" height="200">
                                    <p xmlns="http://www.w3.org/1999/xhtml" style="color:#f8fafc; font-family:sans-serif; font-size:16px; line-height:1.6; margin:0;">
                                      "${stmt.statement.replace(/"/g, '&quot;')}"
                                    </p>
                                  </foreignObject>
                                  <text x="40" y="355" fill="#10b981" font-family="monospace" font-size="13">✓ Real-time sworn testimony (C.P.C Art. 258)</text>
                                </svg>`;
                                const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgQuote)}`;

                                await savePhysicalEvidenceToCase(selectedCaseId, {
                                  caseNumber: customCaseNumber,
                                  title: `Jecha Dhaddachaa [${stmt.timestamp}] - ${stmt.speakerRole}`,
                                  category: 'document',
                                  photoDataUrl: dataUrl,
                                  description: `Kutaa jecha afaanii (${stmt.speakerRole}: ${stmt.speakerName}) waraabbata sagalee dhaddachaa lakk. galmee ${customCaseNumber} irraa waraabbamee kuusaa ragaatti qabame.`,
                                  legalRelevance: `Madaallii ragaa afaanii bu'uureffata (S.A.F.H.H. Kwt 258).`,
                                  exhibitNumber: `Exhibit T-${stmt.timestamp.replace(':', '')}`,
                                  tenderedBy: stmt.speakerRole.toLowerCase().includes('alangaa') ? 'prosecutor' : stmt.speakerRole.toLowerCase().includes('himatamaa') ? 'defendant' : stmt.speakerRole.toLowerCase().includes('ragaa') ? 'witness' : 'plaintiff',
                                  tenderedByName: stmt.speakerName,
                                  custodianOfficer: courtNameInput,
                                  capturedBy: activeSpeakerName,
                                  capturedLocation: courtNameInput,
                                  admissibilityStatus: 'admitted',
                                  statutoryBasis: 'Civil Procedure Code Art. 258 / SDFHH Kwt 258'
                                });
                                alert(`Kutaa jechaa [${stmt.timestamp}] kuusaa ragaatti (Evidence Locker) milkaa'inaan qabameera!`);
                              } catch (e: any) {
                                alert('Kuusaa ragaatti galmeessuun hin danda\'amne: ' + (e.message || String(e)));
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-300 transition-colors cursor-pointer"
                            title="Save to Evidence Locker"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyTranscript(stmt.statement, idx)}
                            className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
                            title="Copy statement"
                          >
                            {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStatement(stmt.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Haqi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Manual Statement Entry (Court Registrar Fallback) */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  value={manualStatementText}
                  onChange={(e) => setManualStatementText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualStatement();
                    }
                  }}
                  placeholder={`Jecha ${activeSpeakerRole} dabaladhaa (Harkaan barreessuuf)...`}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddManualStatement}
                  disabled={!manualStatementText.trim()}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dabali (Add)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI Hearing Minutes Summary Card if generated */}
        {aiPolishSummary && (
          <div className="bg-indigo-950/30 border border-indigo-500/40 p-4 sm:p-5 rounded-2xl space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider font-mono">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Gabaabina Qaboo Yaa'ii Gemini AI (Judicial Hearing Minutes):</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans pl-1">
              {aiPolishSummary}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

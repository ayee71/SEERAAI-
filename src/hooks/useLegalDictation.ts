import { useState, useRef, useEffect, useCallback } from 'react';
import { Language } from '../i18n/translations';
import { transcribeSpeechAudio } from '../services/api';
import { correctOromoLegalText } from '../utils/oromoTextCorrector';

export interface UseLegalDictationOptions {
  language?: Language | 'auto';
  speechDialect?: string;
  legalMode?: boolean;
  onTranscriptionResult?: (text: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseLegalDictationReturn {
  isRecording: boolean;
  isProcessing: boolean;
  durationSeconds: number;
  interimTranscript: string;
  audioVolume: number;
  error: string | null;
  startDictation: () => Promise<void>;
  stopDictation: () => Promise<string>;
  cancelDictation: () => void;
  insertAtCursor: (
    textarea: HTMLTextAreaElement | null,
    textToInsert: string,
    currentValue: string,
    onChange: (newValue: string) => void
  ) => void;
  isWebSpeechSupported: boolean;
}

/**
 * Standardizes Ethiopian legal text formatting from spoken audio:
 * - Fixes citation shorthand (e.g. "keeyyata 137" -> "Kwt. 137")
 * - Formats proclamation numbers (e.g. "labsii 1156" -> "Labsii Lakk. 1156/2019")
 * - Applies Harargee & Central Oromo legal orthography corrections
 */
export function formatSpokenLegalText(rawText: string, lang: Language | 'auto' = 'om'): string {
  if (!rawText) return '';
  let text = rawText.trim();

  // 1. Proclamation numbers formatting
  text = text.replace(/\b(?:labsii|labsii lakk|labsii lakkoofsa|አዋጅ ቁጥር|proclamation no\.?)\s*(\d+)(?:\/(\d+))?/gi, (_m, num, yr) => {
    if (yr) return `Labsii Lakk. ${num}/${yr}`;
    if (num === '1156') return `Labsii Lakk. 1156/2019`;
    if (num === '263') return `Labsii Lakk. 263/2016`;
    if (num === '410') return `Labsii Lakk. 410/2004`;
    if (num === '1') return `Heera Mootummaa FDRE (1987/1995)`;
    return `Labsii Lakk. ${num}`;
  });

  // 2. Article numbers formatting (Kwt. / አንቀጽ / Article)
  text = text.replace(/\b(?:keeyyata|keewwata|kwt\.?|አንቀጽ|article)\s*(\d+)(?:\s*(?:keeyyata xiqqaa|ንዑስ አንቀጽ|sub-article|sub article)\s*(\d+))?/gi, (_m, art, sub) => {
    if (sub) return `Kwt. ${art}(${sub})`;
    return `Kwt. ${art}`;
  });

  // 3. Cassation files formatting (Galmee / የሰበር መዝገብ / Cassation file)
  text = text.replace(/\b(?:galmee|lakk\.?\s*galmee|መዝገብ ቁጥር|cassation file)\s*(\d+)/gi, 'Galmee Lakk. $1');

  // 4. If Oromo text, apply specialized legal spell corrections
  if (lang === 'om' || (lang === 'auto' && !/[\u1200-\u137F]/.test(text) && !/\b(court|law|case)\b/i.test(text))) {
    try {
      const corrected = correctOromoLegalText(text);
      if (corrected && corrected.correctedText) {
        text = corrected.correctedText;
      }
    } catch (e) {
      // Keep best-effort string
    }
  }

  // Ensure first letter capitalized
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

export function useLegalDictation(options: UseLegalDictationOptions = {}): UseLegalDictationReturn {
  const {
    language = 'om',
    speechDialect,
    legalMode = true,
    onTranscriptionResult,
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioVolume, setAudioVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Audio recording refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Collected text during current session
  const sessionTextRef = useRef<string>('');

  const isWebSpeechSupported = typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      cancelDictation();
    };
  }, []);

  const getDialectCode = useCallback((): string => {
    if (speechDialect) return speechDialect;
    if (language === 'am') return 'am-ET';
    if (language === 'en') return 'en-US';
    return 'om-ET';
  }, [language, speechDialect]);

  const monitorVolume = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      // AudioContext not allowed or unsupported
    }
  };

  const startDictation = async () => {
    setError(null);
    setInterimTranscript('');
    sessionTextRef.current = '';
    setDurationSeconds(0);
    audioChunksRef.current = [];

    try {
      // 1. Request microphone access from device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      monitorVolume(stream);

      // 2. Setup MediaRecorder for high-fidelity server backup transcription
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(500); // 500ms timeslices
      }

      // 3. Setup Web Speech Recognition for instant streaming words
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = getDialectCode();

          recognition.onresult = (event: any) => {
            let interim = '';
            let finalBatch = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcriptPiece = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalBatch += transcriptPiece + ' ';
              } else {
                interim += transcriptPiece;
              }
            }

            if (finalBatch) {
              sessionTextRef.current += (sessionTextRef.current ? ' ' : '') + finalBatch.trim();
              const formatted = formatSpokenLegalText(sessionTextRef.current, language);
              onTranscriptionResult?.(formatted, true);
            }

            setInterimTranscript(interim);
          };

          recognition.onerror = (e: any) => {
            console.warn('SpeechRecognition browser event:', e?.error);
            // Non-fatal, MediaRecorder will provide server backup transcription
          };

          recognition.start();
        } catch (recognitionErr) {
          console.warn('Failed to start Web Speech Recognition:', recognitionErr);
        }
      }

      // 4. Start timer
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((sec) => sec + 1);
      }, 1000);

      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone dictation access denied:', err);
      const errMsg = err?.name === 'NotAllowedError'
        ? 'Hayyanni maaykirofoonii hin heyyamamne. Maaloo browser keessan keessatti eeyyamaa. / Microphone access was denied.'
        : 'Maaykirofoonii argachuu hin dandeenye. Maaloo meeshaa keessan qoradhaa. / Could not access microphone.';
      setError(errMsg);
      onError?.(errMsg);
      cleanupStream();
    }
  };

  const stopDictation = async (): Promise<string> => {
    setIsRecording(false);
    setIsProcessing(true);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioVolume(0);

    // Stop web speech recognition if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    let finalResultText = sessionTextRef.current.trim();

    // Now process recorded audio blob with server-side Gemini STT for legal precision
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          try {
            recorder.stop();
          } catch (e) {
            resolve();
          }
        });
      }

      const recordedBlob = new Blob(audioChunksRef.current, {
        type: recorder?.mimeType || 'audio/webm',
      });

      // If we have recorded audio and either we got no stream text or need deep legal STT
      if (recordedBlob.size > 1000) {
        const base64Audio = await blobToBase64(recordedBlob);
        if (base64Audio) {
          try {
            const apiRes = await transcribeSpeechAudio({
              audioData: base64Audio,
              mimeType: recordedBlob.type || 'audio/webm',
              language: language === 'auto' ? undefined : language,
              legalMode,
            });

            if (apiRes && apiRes.transcription && apiRes.transcription.trim().length > 0) {
              const serverText = apiRes.transcription.trim();
              // If server provided rich transcription, prioritize or merge
              if (serverText.length > 3 && !serverText.includes('offline-transcription-fallback')) {
                finalResultText = serverText;
              }
            }
          } catch (serverErr) {
            console.warn('Server transcription fallback to streaming text:', serverErr);
          }
        }
      }
    } catch (e) {
      console.warn('Error finalizing dictation audio:', e);
    } finally {
      cleanupStream();
      setIsProcessing(false);
    }

    const formatted = formatSpokenLegalText(finalResultText, language);
    setInterimTranscript('');
    onTranscriptionResult?.(formatted, true);
    return formatted;
  };

  const cancelDictation = () => {
    setIsRecording(false);
    setIsProcessing(false);
    setInterimTranscript('');
    setAudioVolume(0);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    cleanupStream();
  };

  const cleanupStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  /**
   * Directly inserts transcribed text into an HTML textarea at current cursor position
   * or replaces current selection, maintaining proper legal spacing and paragraphs.
   */
  const insertAtCursor = useCallback(
    (
      textarea: HTMLTextAreaElement | null,
      textToInsert: string,
      currentValue: string,
      onChange: (newValue: string) => void
    ) => {
      if (!textToInsert) return;

      if (!textarea) {
        // Fallback: append cleanly
        const updated = currentValue
          ? `${currentValue}\n\n${textToInsert}`
          : textToInsert;
        onChange(updated);
        return;
      }

      const start = textarea.selectionStart ?? currentValue.length;
      const end = textarea.selectionEnd ?? currentValue.length;

      const before = currentValue.substring(0, start);
      const after = currentValue.substring(end);

      // Determine smart prefix/suffix spacing
      const needsPrefixNewline = before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ');
      const prefix = needsPrefixNewline ? ' ' : '';

      const insertedChunk = prefix + textToInsert;
      const newValue = before + insertedChunk + after;

      onChange(newValue);

      // Restore cursor position smoothly right after inserted text
      setTimeout(() => {
        try {
          textarea.focus();
          const newCursorPos = start + insertedChunk.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        } catch (e) {}
      }, 50);
    },
    []
  );

  return {
    isRecording,
    isProcessing,
    durationSeconds,
    interimTranscript,
    audioVolume,
    error,
    startDictation,
    stopDictation,
    cancelDictation,
    insertAtCursor,
    isWebSpeechSupported,
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

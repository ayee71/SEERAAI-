import { useCallback, useEffect, useRef, useState } from "react";
import {
  courtroomAudioService,
  AudioRecordingState,
  LiveTranscriptSegment,
} from "../services/courtroomAudioService";

export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
}

export interface CourtroomRecorderHook {
  state: AudioRecordingState;
  durationSeconds: number;
  volumeDbFS: number;
  error: string | null;
  result: AudioRecordingResult | null;
  audioUrl: string | null;
  latestSegment: LiveTranscriptSegment | null;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<AudioRecordingResult | null>;
  clear: () => void;
}

export function useCourtroomRecorder(): CourtroomRecorderHook {
  const audioUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<AudioRecordingState>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [volumeDbFS, setVolumeDbFS] = useState(-60);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AudioRecordingResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [latestSegment, setLatestSegment] = useState<LiveTranscriptSegment | null>(null);

  useEffect(() => {
    const unsubState = courtroomAudioService.onStateChange((s, dur) => {
      setState(s);
      setDurationSeconds(dur);
    });

    const unsubVol = courtroomAudioService.onVolumeDb((db) => {
      setVolumeDbFS(db);
    });

    const unsubSegment = courtroomAudioService.onTranscriptSegment((seg) => {
      setLatestSegment(seg);
    });

    return () => {
      unsubState();
      unsubVol();
      unsubSegment();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    };
  }, []);

  const clear = useCallback(() => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setDurationSeconds(0);
    setVolumeDbFS(-60);
    setState("idle");
    setLatestSegment(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);

    try {
      const ok = await courtroomAudioService.startRecording();
      if (!ok) {
        setError("Waraabbiin duraanuu adeemaa jira ykn maaykiroofooniin hin banamne.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording failed.");
    }
  }, []);

  const pause = useCallback(() => courtroomAudioService.pauseRecording(), []);
  const resume = useCallback(() => courtroomAudioService.resumeRecording(), []);

  const stop = useCallback(async () => {
    try {
      const blob = await courtroomAudioService.stopRecording();
      if (blob) {
        const recordingResult: AudioRecordingResult = {
          blob,
          mimeType: courtroomAudioService.mimeType || blob.type || "audio/webm",
          durationSeconds: courtroomAudioService.durationSeconds,
          sizeBytes: blob.size,
        };
        setResult(recordingResult);
        const url = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = url;
        setAudioUrl(url);
        return recordingResult;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop recording.");
      return null;
    }
  }, []);

  return {
    state,
    durationSeconds,
    volumeDbFS,
    error,
    result,
    audioUrl,
    latestSegment,
    start,
    pause,
    resume,
    stop,
    clear,
  };
}

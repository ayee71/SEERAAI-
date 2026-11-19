/**
 * SEERAAI PRO — COURTROOM AUDIO SERVICE V2 (ENHANCED)
 * =========================================================================
 * Production-grade browser audio recording, live speech transcription streaming,
 * monotonic timing with pause subtraction, 32-bit Float dBFS metering,
 * chunk queueing, error resilience, and trilingual courtroom intelligence.
 */

export type AudioRecordingState = 'idle' | 'recording' | 'paused' | 'stopped';
export type RecordingState = AudioRecordingState; // Alias for V2 compatibility

export interface LiveTranscriptSegment {
  id: string;
  speakerRole: string;
  speakerName: string;
  statement: string;
  timestamp: string;
  confidence?: number;
  isFinal?: boolean;
}

export interface CourtroomAudioCallbacks {
  onStateChange?: (state: AudioRecordingState) => void;
  onDurationChange?: (seconds: number) => void;
  onVolumeChange?: (dbFS: number) => void;
  onTranscriptSegment?: (segment: LiveTranscriptSegment) => void;
  onChunk?: (chunk: Blob, index: number) => void | Promise<void>;
  onRecordingComplete?: (blob: Blob | null) => void;
  onError?: (error: Error) => void;
  onWarning?: (message: string) => void;
}

export interface CourtroomAudioOptions {
  /** MediaRecorder chunk interval request in milliseconds; default 1000 */
  timesliceMs?: number;
  audioBitsPerSecond?: number;
  audioConstraints?: MediaTrackConstraints;
  callbacks?: CourtroomAudioCallbacks;

  /**
   * true (default): keep chunks in memory and return a complete Blob.
   * false: do not retain chunks locally; use onChunk for backend upload.
   * When false, stopRecording() returns null.
   */
  retainChunks?: boolean;
}

export type AudioStateChangeListener = (state: AudioRecordingState, durationSec: number) => void;
export type TranscriptSegmentListener = (segment: LiveTranscriptSegment) => void;
export type VolumeDbListener = (dbFS: number) => void;
export type DurationChangeListener = (seconds: number) => void;

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

export class CourtroomAudioService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // Web Speech recognition for Live Speech-to-Text
  private recognition: any = null;

  // Monotonic Timing
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private volumeFrame: number | null = null;
  private elapsedMilliseconds = 0;
  private activeSegmentStartedAt: number | null = null;

  // Chunk Upload Queue
  private chunkIndex = 0;
  private chunkUploadQueue: Promise<void> = Promise.resolve();
  private chunkUploadError: Error | null = null;

  // Completion Handling
  private completionPromise: Promise<Blob | null> | null = null;
  private resolveCompletion: ((blob: Blob | null) => void) | null = null;
  private finalizingRecorder: MediaRecorder | null = null;
  private lastBlob: Blob | null = null;
  private recordingMimeType = '';

  // Options & Callbacks
  private options: CourtroomAudioOptions;
  private callbacks: CourtroomAudioCallbacks;

  // Multi-listener Event Subscriptions
  private stateListeners: Set<AudioStateChangeListener> = new Set();
  private segmentListeners: Set<TranscriptSegmentListener> = new Set();
  private volumeListeners: Set<VolumeDbListener> = new Set();
  private durationListeners: Set<DurationChangeListener> = new Set();

  // Public State
  public state: AudioRecordingState = 'idle';
  public durationSeconds = 0;
  public activeSpeakerRole = 'Abbaa Seeraa';
  public activeSpeakerName = 'Abbaa Seeraa Caalaa';
  public activeLanguage: 'om' | 'am' | 'en' = 'om';
  public recordedAudioBlob: Blob | null = null;
  public recordedAudioUrl: string | null = null;

  constructor(options: CourtroomAudioOptions = {}) {
    this.options = {
      timesliceMs: 1000,
      audioBitsPerSecond: 128000,
      retainChunks: true,
      ...options,
    };

    this.callbacks = options.callbacks ?? {};
    this.initSpeechRecognition();
  }

  /** Set / update options dynamically */
  public setOptions(options: Partial<CourtroomAudioOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.callbacks) {
      this.callbacks = { ...this.callbacks, ...options.callbacks };
    }
  }

  /** Replace single-callback bundle (for React component lifecycle) */
  public setCallbacks(callbacks: CourtroomAudioCallbacks): void {
    this.callbacks = callbacks;
  }

  // =========================================================================
  // Web Speech Recognition for Live Court Transcription
  // =========================================================================
  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;
    const win = window as WindowWithWebkitAudioContext;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.getRecognitionLangCode(this.activeLanguage);

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          const cleaned = chunk ? chunk.trim() : '';

          if (cleaned.length > 0) {
            const segment: LiveTranscriptSegment = {
              id: `live_seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              speakerRole: this.activeSpeakerRole,
              speakerName: this.activeSpeakerName,
              statement: cleaned,
              timestamp: this.formatSeconds(this.durationSeconds),
              confidence: event.results[i][0].confidence || (isFinal ? 0.98 : 0.88),
              isFinal,
            };
            this.notifySegment(segment);
          }
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('[CourtroomAudioService] Speech recognition notice:', e.error);
        }
      };

      this.recognition.onend = () => {
        // Automatically keep alive while recording
        if (this.state === 'recording' && this.recognition) {
          try {
            this.recognition.start();
          } catch {
            // Already started or busy
          }
        }
      };
    } catch (e) {
      console.warn('SpeechRecognition initialization error:', e);
    }
  }

  private getRecognitionLangCode(lang: 'om' | 'am' | 'en'): string {
    if (lang === 'am') return 'am-ET';
    if (lang === 'en') return 'en-US';
    return 'om-ET';
  }

  public setLanguage(lang: 'om' | 'am' | 'en'): void {
    this.activeLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = this.getRecognitionLangCode(lang);
    }
  }

  public setActiveSpeaker(role: string, name: string): void {
    this.activeSpeakerRole = role;
    this.activeSpeakerName = name;
  }

  // =========================================================================
  // Multi-Listener Event Subscription Methods (Observable Pattern)
  // =========================================================================
  public onStateChange(listener: AudioStateChangeListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state, this.durationSeconds);
    return () => this.stateListeners.delete(listener);
  }

  public onTranscriptSegment(listener: TranscriptSegmentListener): () => void {
    this.segmentListeners.add(listener);
    return () => this.segmentListeners.delete(listener);
  }

  public onVolumeDb(listener: VolumeDbListener): () => void {
    this.volumeListeners.add(listener);
    return () => this.volumeListeners.delete(listener);
  }

  public onDurationChange(listener: DurationChangeListener): () => void {
    this.durationListeners.add(listener);
    listener(this.durationSeconds);
    return () => this.durationListeners.delete(listener);
  }

  private safelyCall<T>(callback: (() => T) | undefined): T | undefined {
    if (!callback) return undefined;
    try {
      return callback();
    } catch (error) {
      const callbackError = this.toError(error);
      if (this.callbacks.onError && callback !== this.callbacks.onError) {
        try {
          this.callbacks.onError(callbackError);
        } catch {
          // Prevent recursive loop
        }
      }
      return undefined;
    }
  }

  private setState(state: AudioRecordingState): void {
    this.state = state;
    this.safelyCall(() => this.callbacks.onStateChange?.(state));
    this.stateListeners.forEach((listener) => {
      try {
        listener(state, this.durationSeconds);
      } catch (err) {
        console.warn('State listener error:', err);
      }
    });
  }

  private notifySegment(segment: LiveTranscriptSegment): void {
    this.safelyCall(() => this.callbacks.onTranscriptSegment?.(segment));
    this.segmentListeners.forEach((listener) => {
      try {
        listener(segment);
      } catch (err) {
        console.warn('Transcript listener error:', err);
      }
    });
  }

  private notifyVolume(dbFS: number): void {
    this.safelyCall(() => this.callbacks.onVolumeChange?.(dbFS));
    this.volumeListeners.forEach((listener) => {
      try {
        listener(dbFS);
      } catch (err) {
        console.warn('Volume listener error:', err);
      }
    });
  }

  private notifyDuration(seconds: number): void {
    this.safelyCall(() => this.callbacks.onDurationChange?.(seconds));
    this.durationListeners.forEach((listener) => {
      try {
        listener(seconds);
      } catch (err) {
        console.warn('Duration listener error:', err);
      }
    });
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  private reportError(error: unknown): void {
    const normalized = this.toError(error);
    this.safelyCall(() => this.callbacks.onError?.(normalized));
  }

  private reportWarning(message: string): void {
    this.safelyCall(() => this.callbacks.onWarning?.(message));
  }

  // =========================================================================
  // MediaRecorder & MIME Fallback Selection
  // =========================================================================
  private createRecorder(stream: MediaStream): MediaRecorder {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];

    const selectedType = candidates.find((type) => {
      try {
        return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type);
      } catch {
        return false;
      }
    });

    const recorderOptions: MediaRecorderOptions = {};

    if (this.options.audioBitsPerSecond) {
      recorderOptions.audioBitsPerSecond = this.options.audioBitsPerSecond;
    }

    if (selectedType) {
      try {
        return new MediaRecorder(stream, {
          ...recorderOptions,
          mimeType: selectedType,
        });
      } catch {
        // Fall back to browser default
      }
    }

    return new MediaRecorder(stream, recorderOptions);
  }

  // =========================================================================
  // Web Audio Analyser (dBFS Volume Metering)
  // =========================================================================
  private async setupAnalyser(stream: MediaStream): Promise<void> {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as WindowWithWebkitAudioContext).webkitAudioContext;

    if (!AudioContextConstructor) {
      this.reportWarning('Browser kun AudioContext hin deeggaru. Volume meter hin hojjetu.');
      return;
    }

    try {
      const ctx = new AudioContextConstructor();
      this.audioContext = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      this.analyser = analyser;
    } catch (error) {
      this.reportWarning(`Audio analyser qopheessuun hin danda'amne: ${this.toError(error).message}`);
      await this.closeAudioContext();
    }
  }

  // =========================================================================
  // Recording Lifecycle: Start, Pause, Resume, Stop
  // =========================================================================
  public async startRecording(): Promise<boolean> {
    if (this.state === 'recording' || this.state === 'paused') {
      this.reportWarning('Waraabbiin duraanuu adeemaa jira.');
      return false;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err = new Error('Microphone hin deeggaramu. Browser ammayyaa fi HTTPS fayyadamaa.');
      this.reportError(err);
      throw err;
    }

    if (typeof MediaRecorder === 'undefined') {
      const err = new Error('Browser kun MediaRecorder hin deeggaru.');
      this.reportError(err);
      throw err;
    }

    if (!window.isSecureContext) {
      const err = new Error('Microphone fayyadamuuf wal-qunnamtii nageenya qabu (HTTPS) barbaachisa.');
      this.reportError(err);
      throw err;
    }

    if (this.options.retainChunks === false && !this.callbacks.onChunk) {
      const err = new Error('retainChunks=false yoo ta\'e onChunk callback backend upload\'f kennuu qabda.');
      this.reportError(err);
      throw err;
    }

    await this.cleanupResources();

    this.audioChunks = [];
    this.chunkIndex = 0;
    this.elapsedMilliseconds = 0;
    this.durationSeconds = 0;
    this.lastBlob = null;
    this.finalizingRecorder = null;
    this.recordingMimeType = '';
    this.chunkUploadQueue = Promise.resolve();
    this.chunkUploadError = null;
    this.completionPromise = null;
    this.resolveCompletion = null;
    this.setState('idle');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: this.options.audioConstraints ?? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });

      await this.setupAnalyser(this.mediaStream);

      const recorder = this.createRecorder(this.mediaStream);
      this.mediaRecorder = recorder;
      this.recordingMimeType = recorder.mimeType || 'audio/webm';

      this.completionPromise = new Promise<Blob | null>((resolve) => {
        this.resolveCompletion = resolve;
      });

      recorder.addEventListener('dataavailable', (event: BlobEvent) => {
        const chunk = event.data;
        if (!chunk || chunk.size === 0) return;

        if (this.options.retainChunks !== false) {
          this.audioChunks.push(chunk);
        }

        const index = this.chunkIndex++;
        const uploadCallback = this.callbacks.onChunk;

        if (uploadCallback) {
          // Preserve chunk order sequentially
          this.chunkUploadQueue = this.chunkUploadQueue
            .then(() => uploadCallback(chunk, index))
            .catch((error: unknown) => {
              const uploadError = new Error(
                `Audio chunk ${index} upload failed: ${this.toError(error).message}`
              );
              this.chunkUploadError = uploadError;
              this.reportError(uploadError);
            });
        }
      });

      recorder.addEventListener('error', (event: Event) => {
        const recorderError = (event as Event & { error?: DOMException }).error;
        this.reportError(recorderError ?? new Error('MediaRecorder error.'));

        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch (stopError) {
            this.reportError(stopError);
          }
        }
      });

      recorder.addEventListener(
        'stop',
        () => {
          void this.finalizeRecording(recorder);
        },
        { once: true }
      );

      // Handle unexpected microphone disconnection
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.addEventListener(
          'ended',
          () => {
            if (this.state === 'recording' || this.state === 'paused') {
              this.reportError(new Error('Microphone connection addaan cite (Hardware disconnected).'));
              void this.stopRecording().catch((error) => this.reportError(error));
            }
          },
          { once: true }
        );
      });

      const timeslice = Math.max(250, this.options.timesliceMs ?? 1000);
      recorder.start(timeslice);

      this.elapsedMilliseconds = 0;
      this.activeSegmentStartedAt = performance.now();
      this.setState('recording');
      this.startDurationTimer();
      this.startVolumeMonitoring();

      // Start speech recognition
      if (this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // Non-fatal if speech recognition is already running or unsupported
        }
      }

      return true;
    } catch (error) {
      await this.cleanupResources();
      const resolveFailedStart = this.resolveCompletion as ((blob: Blob | null) => void) | null;
      if (resolveFailedStart) resolveFailedStart(null);
      this.resolveCompletion = null;
      this.completionPromise = null;
      this.mediaRecorder = null;
      this.setState('idle');
      this.reportError(error);
      return false;
    }
  }

  public pauseRecording(): void {
    if (!this.mediaRecorder || this.state !== 'recording') return;

    try {
      this.mediaRecorder.pause();
      this.finishActiveSegment();
      this.stopDurationTimer();
      this.stopVolumeMonitoring();

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch {}
      }

      this.setState('paused');
    } catch (error) {
      this.reportError(error);
      throw this.toError(error);
    }
  }

  public resumeRecording(): void {
    if (!this.mediaRecorder || this.state !== 'paused') return;

    try {
      this.mediaRecorder.resume();
      this.activeSegmentStartedAt = performance.now();
      this.setState('recording');
      this.startDurationTimer();
      this.startVolumeMonitoring();

      if (this.recognition) {
        try {
          this.recognition.start();
        } catch {}
      }
    } catch (error) {
      this.reportError(error);
      throw this.toError(error);
    }
  }

  public stopRecording(): Promise<Blob | null> {
    const recorder = this.mediaRecorder;

    if (!recorder) {
      return this.completionPromise ?? Promise.resolve(this.lastBlob);
    }

    this.finishActiveSegment();
    this.stopDurationTimer();
    this.stopVolumeMonitoring();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch (error) {
      this.reportError(error);
      return Promise.reject(this.toError(error));
    }

    return this.completionPromise ?? Promise.resolve(this.lastBlob);
  }

  private async finalizeRecording(recorder: MediaRecorder): Promise<void> {
    if (this.finalizingRecorder === recorder) return;
    this.finalizingRecorder = recorder;

    this.finishActiveSegment();
    this.stopDurationTimer();
    this.stopVolumeMonitoring();

    try {
      // Wait until queued chunk uploads finish
      await this.chunkUploadQueue;

      const mimeType = recorder.mimeType || this.recordingMimeType || 'audio/webm';
      const blob =
        this.options.retainChunks !== false && this.audioChunks.length > 0
          ? new Blob(this.audioChunks, { type: mimeType })
          : null;

      this.lastBlob = blob;
      this.recordedAudioBlob = blob;

      if (blob) {
        if (this.recordedAudioUrl) {
          try {
            URL.revokeObjectURL(this.recordedAudioUrl);
          } catch {}
        }
        this.recordedAudioUrl = URL.createObjectURL(blob);
      }

      await this.cleanupResources();
      this.mediaRecorder = null;
      this.setState('stopped');

      this.safelyCall(() => this.callbacks.onRecordingComplete?.(blob));

      if (this.options.retainChunks === false && !this.callbacks.onChunk) {
        this.reportError(
          new Error('retainChunks=false dha; garuu onChunk callback hin kennamne.')
        );
      }

      if (this.chunkUploadError && this.options.retainChunks === false) {
        this.reportError(
          new Error('Chunk upload tokko yookaan isaa ol hin milkoofne.')
        );
      }

      this.resolveCompletion?.(blob);
    } catch (error) {
      this.reportError(error);
      await this.cleanupResources();
      this.mediaRecorder = null;
      this.setState('stopped');
      this.resolveCompletion?.(null);
    } finally {
      this.resolveCompletion = null;
      this.completionPromise = null;
      this.finalizingRecorder = null;
    }
  }

  // =========================================================================
  // High-Precision Monotonic Timer & Volume Metering
  // =========================================================================
  private updateDuration(): void {
    const activeTime =
      this.activeSegmentStartedAt !== null
        ? performance.now() - this.activeSegmentStartedAt
        : 0;

    const totalMilliseconds = this.elapsedMilliseconds + activeTime;
    const nextSeconds = Math.floor(totalMilliseconds / 1000);

    if (nextSeconds !== this.durationSeconds) {
      this.durationSeconds = nextSeconds;
      this.notifyDuration(nextSeconds);
    }
  }

  private finishActiveSegment(): void {
    if (this.activeSegmentStartedAt !== null) {
      this.elapsedMilliseconds += performance.now() - this.activeSegmentStartedAt;
      this.activeSegmentStartedAt = null;
    }
    this.updateDuration();
  }

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationTimer = setInterval(() => this.updateDuration(), 250);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  /** Return current input level in true dBFS using 32-bit Float RMS */
  public getVolumeDbFS(): number {
    if (!this.analyser) return -60;

    const samples = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(samples);

    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sumSquares / samples.length);
    const dbFS = 20 * Math.log10(Math.max(rms, 0.000001));

    return Math.max(-60, Math.min(0, Math.round(dbFS)));
  }

  private monitorVolume = (): void => {
    if (!this.analyser || typeof window === 'undefined') return;

    const dbFS = this.getVolumeDbFS();
    this.notifyVolume(dbFS);

    this.volumeFrame = window.requestAnimationFrame(this.monitorVolume);
  };

  private startVolumeMonitoring(): void {
    if (!this.analyser || typeof window === 'undefined') return;
    this.stopVolumeMonitoring();
    this.volumeFrame = window.requestAnimationFrame(this.monitorVolume);
  }

  private stopVolumeMonitoring(): void {
    if (this.volumeFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.volumeFrame);
      this.volumeFrame = null;
    }
  }

  private async closeAudioContext(): Promise<void> {
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.analyser = null;

    const context = this.audioContext;
    this.audioContext = null;

    if (context && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
        // Ignored if already closed
      }
    }
  }

  private async cleanupResources(): Promise<void> {
    this.stopDurationTimer();
    this.stopVolumeMonitoring();

    const stream = this.mediaStream;
    this.mediaStream = null;

    stream?.getTracks().forEach((track) => {
      if (track.readyState !== 'ended') track.stop();
    });

    await this.closeAudioContext();
  }

  public async dispose(): Promise<void> {
    if (this.mediaRecorder) {
      try {
        await this.stopRecording();
      } catch (error) {
        this.reportError(error);
      }
    }

    if (this.recordedAudioUrl) {
      try {
        URL.revokeObjectURL(this.recordedAudioUrl);
      } catch {}
      this.recordedAudioUrl = null;
    }

    await this.cleanupResources();
  }

  public formatSeconds(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }

  public get mimeType(): string {
    return this.recordingMimeType;
  }

  public get uploadError(): Error | null {
    return this.chunkUploadError;
  }
}

// Singleton instance exported for courtroom components
export const courtroomAudioService = new CourtroomAudioService();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Download,
  Plus,
  Volume2,
  Clock,
  Globe,
  FileText,
  X,
  AlertCircle,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import {
  SavedLegalDocument,
  VoiceAnnotation,
  addVoiceNoteToDocument,
  deleteVoiceNoteFromDocument,
  updateDocument,
} from '../services/storage';

interface DocumentVoiceNoteModalProps {
  doc: SavedLegalDocument;
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
  onUpdatedDoc: (updated: SavedLegalDocument) => void;
}

export const DocumentVoiceNoteModal: React.FC<DocumentVoiceNoteModalProps> = ({
  doc,
  currentLang,
  isOpen,
  onClose,
  onUpdatedDoc,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'om' | 'am' | 'en'>(
    (currentLang as 'om' | 'am' | 'en') || 'om'
  );

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [recordError, setRecordError] = useState<string | null>(null);

  // Playback state for preview or existing items
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  const voiceNotes = doc.voiceNotes || [];

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
  };

  const startRecording = async () => {
    setRecordError(null);
    setRecordedAudioUrl(null);
    setRecordedDuration(0);
    setTranscriptText('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setRecordedAudioUrl(base64Data);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks from stream to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);

      // Start timer
      let secs = 0;
      timerIntervalRef.current = setInterval(() => {
        secs += 1;
        setRecordingSeconds(secs);
        if (secs >= 300) {
          // Cap at 5 minutes
          stopRecording();
        }
      }, 1000);

      // Try starting SpeechRecognition for live transcription
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          speechRecognitionRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang =
            selectedLanguage === 'om'
              ? 'om-ET'
              : selectedLanguage === 'am'
              ? 'am-ET'
              : 'en-US';

          recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript + ' ';
            }
            setTranscriptText(fullTranscript.trim());
          };

          recognition.onerror = () => {
            // Non-fatal: user can still record and type notes
          };

          recognition.start();
        } catch {
          // SpeechRecognition not supported or permission denied
        }
      }
    } catch (err: any) {
      console.error('Microphone error:', err);
      setRecordError(
        currentLang === 'om'
          ? 'Maaykirofooniin hin heyyamamne. Maaloo eeyyama kennaa.'
          : currentLang === 'am'
          ? 'የማይክሮፎን ፈቃድ አልተሰጠም። እባክዎ ፈቃድ ይስጡ።'
          : 'Microphone access denied. Please allow microphone permission.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordedDuration(recordingSeconds);
    stopRecordingCleanup();
  };

  const handleSaveNote = () => {
    if (!recordedAudioUrl && !transcriptText.trim()) {
      setRecordError(
        currentLang === 'om'
          ? 'Waraabbii sagalee ykn yaada barreeffamaa galchaa.'
          : 'ድምፅ ይቅረጹ ወይም የጽሑፍ ማስታወሻ ያስገቡ።'
      );
      return;
    }

    const titleToUse =
      noteTitle.trim() ||
      (currentLang === 'om'
        ? `Yaada Sagalee (${new Date().toLocaleDateString()})`
        : currentLang === 'am'
        ? `የድምፅ ማስታወሻ (${new Date().toLocaleDateString()})`
        : `Voice Note (${new Date().toLocaleDateString()})`);

    const newNote = addVoiceNoteToDocument(doc.id, {
      title: titleToUse,
      audioDataUrl: recordedAudioUrl || undefined,
      durationSeconds: recordedDuration || 1,
      transcript: transcriptText.trim() || undefined,
      language: selectedLanguage,
    });

    if (newNote) {
      const updatedList = [...voiceNotes, newNote];
      const updatedDoc = { ...doc, voiceNotes: updatedList };
      onUpdatedDoc(updatedDoc);

      // Reset recording form
      setRecordedAudioUrl(null);
      setTranscriptText('');
      setNoteTitle('');
      setRecordingSeconds(0);
      setRecordedDuration(0);
      setToastMessage(
        currentLang === 'om'
          ? 'Yaadni sagalee milkaa\'inaan kuufameera!'
          : 'የድምፅ ማስታወሻው በሚገባ ተቀምጧል!'
      );
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (
      confirm(
        currentLang === 'om'
          ? 'Yaada sagalee kana haquu barbaadduu?'
          : 'ይህንን የድምፅ ማስታወሻ መሰረዝ ይፈልጋሉ?'
      )
    ) {
      deleteVoiceNoteFromDocument(doc.id, noteId);
      const updated = voiceNotes.filter((n) => n.id !== noteId);
      onUpdatedDoc({ ...doc, voiceNotes: updated });
    }
  };

  const handlePlayAudio = (noteId: string, audioDataUrl?: string) => {
    if (!audioDataUrl) return;

    if (playingNoteId === noteId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingNoteId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(audioDataUrl);
    activeAudioRef.current = audio;
    setPlayingNoteId(noteId);

    audio.onended = () => {
      setPlayingNoteId(null);
    };
    audio.onerror = () => {
      setPlayingNoteId(null);
    };

    audio.play().catch(console.error);
  };

  const handleAppendToDocument = (transcriptTextContent?: string) => {
    if (!transcriptTextContent) return;

    const appendedContent = `${doc.content}\n\n--- [🎙️ YAADA SAGALEE / VOICE NOTE ANNOTATION - ${new Date().toLocaleDateString()}] ---\n${transcriptTextContent}`;
    const updated = updateDocument(doc.id, { content: appendedContent });
    if (updated) {
      onUpdatedDoc(updated);
      setToastMessage(
        currentLang === 'om'
          ? 'Yaadni sagalee gara qabiyyee sanadaatti dabalameera!'
          : 'የድምፅ ማስታወሻው ወደ ሰነዱ ይዘት ተጨምሯል!'
      );
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining
      .toString()
      .padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  {currentLang === 'om'
                    ? 'Waraabbii Sagalee & Yaada Seeraa'
                    : currentLang === 'am'
                    ? 'የሕግ ድምፅ ማስታወሻና ማብራሪያ'
                    : 'Legal Voice Notes & Spoken Annotations'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {voiceNotes.length} Notes
                </span>
              </div>
              <p className="text-xs text-amber-400/90 font-medium truncate max-w-[340px] sm:max-w-[480px]">
                "{doc.title}"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="px-5 py-2.5 bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Record Section Box */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>
                  {currentLang === 'om'
                    ? 'Sagalee Haaraa Waraabi'
                    : currentLang === 'am'
                    ? 'አዲስ የድምፅ ማስታወሻ ቅረጽ'
                    : 'Record Spoken Legal Note'}
                </span>
              </span>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
                {[
                  { id: 'om', label: 'Oromoo' },
                  { id: 'am', label: 'አማርኛ' },
                  { id: 'en', label: 'English' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedLanguage === lang.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mic Recording Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all cursor-pointer animate-pulse shadow-lg shadow-rose-950/40"
                    title="Stop Recording"
                  >
                    <Square className="w-5 h-5 fill-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-amber-950/30 group"
                    title="Start Recording"
                  >
                    <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isRecording
                          ? 'bg-rose-500 animate-ping'
                          : recordedAudioUrl
                          ? 'bg-emerald-400'
                          : 'bg-slate-600'
                      }`}
                    />
                    <span className="font-mono text-base font-bold text-slate-100">
                      {isRecording
                        ? formatSeconds(recordingSeconds)
                        : recordedAudioUrl
                        ? formatSeconds(recordedDuration)
                        : '00:00'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isRecording
                        ? currentLang === 'om'
                          ? 'Waraabamaa jira...'
                          : 'እየተቀረጸ ነው...'
                        : recordedAudioUrl
                        ? currentLang === 'om'
                          ? 'Waraabbiin xumurameera'
                          : 'ተቀርጾ ተጠናቋል'
                        : currentLang === 'om'
                        ? 'Waraabuuf mic tuqaa'
                        : 'ለመቅረጽ ይጫኑ'}
                    </span>
                  </div>

                  {isRecording && (
                    <span className="text-[10px] text-amber-400 font-medium">
                      {currentLang === 'om'
                        ? 'Afaan filatameen dubbadhaa (Max 5 daqiiqaa)'
                        : 'በተመረጠው ቋንቋ ይናገሩ (እስከ 5 ደቂቃ)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Audio Controls if recorded */}
              {recordedAudioUrl && !isRecording && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (previewAudioRef.current) {
                        if (previewPlaying) {
                          previewAudioRef.current.pause();
                          setPreviewPlaying(false);
                        } else {
                          previewAudioRef.current.play();
                          setPreviewPlaying(true);
                        }
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    {previewPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{previewPlaying ? 'Dhaabi / Pause' : 'Dhaggeeffadhu / Play'}</span>
                  </button>

                  <audio
                    ref={previewAudioRef}
                    src={recordedAudioUrl}
                    onEnded={() => setPreviewPlaying(false)}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {recordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recordError}</span>
              </div>
            )}

            {/* Note Title & Transcript Text Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Mata-duree Yaada Sagalee (Note Title)
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={
                    currentLang === 'om'
                      ? 'fkn: Yaada ragaa lammaffaa, Qabxii falmii murteessaa...'
                      : 'ለምሳሌ፦ የ2ኛው ምስክር ቃል ማስታወሻ...'
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Barreeffama / Contextual Annotation Transcript
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {currentLang === 'om'
                      ? 'Ofumaan jijjiirama / Gulaaluun ni danda\'ama'
                      : 'ከድምፅ የተቀዳ ወይም በእጅ የሚጻፍ'}
                  </span>
                </div>
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  rows={3}
                  placeholder={
                    currentLang === 'om'
                      ? 'Yaada sagalee kana irraa cuunfame ykn yaada dabalataa keessan asitti galchaa...'
                      : 'የተናገሩትን ማስታወሻ ወይም ተጨማሪ የሕግ ትንታኔ እዚህ ይጻፉ...'
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 leading-relaxed resize-none font-sans"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={!recordedAudioUrl && !transcriptText.trim()}
                  onClick={handleSaveNote}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/20 cursor-pointer disabled:opacity-40 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {currentLang === 'om'
                      ? 'Yaada Sagalee Olkaayi / Save Note'
                      : 'የድምፅ ማስታወሻውን መዝግብ'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Existing Voice Notes List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>
                {currentLang === 'om'
                  ? 'Yaadawwan Sagalee Kuufaman'
                  : currentLang === 'am'
                  ? 'የተመዘገቡ የድምፅ ማስታወሻዎች'
                  : 'Saved Voice Annotations'}
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                ({voiceNotes.length})
              </span>
            </h4>

            {voiceNotes.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-slate-400 space-y-1.5">
                <Mic className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs">
                  {currentLang === 'om'
                    ? 'Sanada kana irratti yaadni sagalee hamma ammaatti hin kuufamne.'
                    : 'ለዚህ ሰነድ ምንም የተቀረጸ የድምፅ ማስታወሻ የለም።'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {currentLang === 'om'
                    ? 'Gubbaarratti mic tuquun yaada keessan sagaleen waraabaa.'
                    : 'ከላይ ማይክሮፎኑን በመጫን ድምፅዎን ይቅረጹ።'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {voiceNotes.map((note, index) => {
                  const isPlaying = playingNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3"
                    >
                      {/* Note Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            #{index + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-100">
                            {note.title || `Voice Note #${index + 1}`}
                          </span>
                          <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {note.language.toUpperCase()}
                          </span>
                          {note.durationSeconds > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatSeconds(note.durationSeconds)}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(note.recordedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Audio Player Row */}
                      {note.audioDataUrl && (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                          <button
                            type="button"
                            onClick={() =>
                              handlePlayAudio(note.id, note.audioDataUrl)
                            }
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isPlaying
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                            }`}
                          >
                            {isPlaying ? (
                              <Pause className="w-4 h-4 fill-slate-950" />
                            ) : (
                              <Play className="w-4 h-4 fill-amber-300 ml-0.5" />
                            )}
                          </button>

                          <div className="flex-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-amber-400 transition-all ${
                                  isPlaying ? 'animate-pulse w-2/3' : 'w-full'
                                }`}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {formatSeconds(note.durationSeconds)}
                            </span>
                          </div>

                          <a
                            href={note.audioDataUrl}
                            download={`VoiceNote_${doc.title.replace(
                              /\s+/g,
                              '_'
                            )}_${note.id}.webm`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            title="Download Audio File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {/* Transcript display */}
                      {note.transcript && (
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-200 leading-relaxed font-sans">
                          {note.transcript}
                        </div>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                        <div className="flex items-center gap-2">
                          {note.transcript && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAppendToDocument(note.transcript)
                              }
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                              title="Qabiyyee sanadichaatti dabali"
                            >
                              <FileText className="w-3 h-3" />
                              <span>
                                {currentLang === 'om'
                                  ? 'Sanadatti Dabali'
                                  : 'ሰነዱ ላይ ጨምር'}
                              </span>
                            </button>
                          )}

                          {note.transcript && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (note.transcript) {
                                  await navigator.clipboard.writeText(
                                    note.transcript
                                  );
                                  setCopiedId(note.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {copiedId === note.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>
                                {copiedId === note.id ? 'Copied' : 'Copy'}
                              </span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Haqi / Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {currentLang === 'om'
              ? 'Waraabbiin sagalee iccitummaadhaan kuufama.'
              : 'የድምፅ ማስታወሻዎች በአስተማማኝ ሁኔታ ይቀመጣሉ።'}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Cufi / Close
          </button>
        </div>
      </div>
    </div>
  );
};

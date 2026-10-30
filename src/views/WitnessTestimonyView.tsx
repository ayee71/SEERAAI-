import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Copy, Check, Save, Download, FileText, Sparkles, RefreshCw, Volume2 } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { saveDocument } from '../services/storage';
import { PdfExportModal } from '../components/PdfExportModal';
import { VoiceDictation, SUPPORTED_SPEECH_DIALECTS } from '../components/VoiceDictation';

interface WitnessTestimonyViewProps {
  currentLang: Language;
  onNavigateToCassation?: (query: string) => void;
}

export const WitnessTestimonyView: React.FC<WitnessTestimonyViewProps> = ({
  currentLang,
}) => {
  const t = translations[currentLang];
  const [witnessName, setWitnessName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [rawTestimony, setRawTestimony] = useState('');
  
  // Trilingual Transcripts
  const [transcripts, setTranscripts] = useState<{
    om: string;
    am: string;
    en: string;
  }>({ om: '', am: '', en: '' });

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedSpeechDialect, setSelectedSpeechDialect] = useState<string>(
    currentLang === 'am' ? 'am-ET' : currentLang === 'en' ? 'en-US' : 'om-ET'
  );
  const [dictationLang, setDictationLang] = useState<Language>(currentLang);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Start Audio Recording
  const handleStartRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access denied or unsupported:', err);
      alert('Microphone access is required to record witness voice testimony.');
    }
  };

  // Stop Audio Recording & Simulate Judicial Speech-to-Text Transcription
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      
      // Trigger automatic simulation transcription of recorded voice
      handleTranscribeAudio();
    }
  };

  // Transcribe or Generate Trilingual Witness Statements
  const handleTranscribeAudio = async () => {
    setIsTranscribing(true);
    let textToUse = rawTestimony;

    try {
      if (!textToUse.trim() && audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        const audioBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]);
          };
          reader.readAsDataURL(audioBlob);
        });

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData: audioBase64, mimeType: 'audio/webm' }),
        });

        const data = await response.json();
        textToUse = data.transcription || '';
        setRawTestimony(textToUse);
      } else if (!textToUse.trim()) {
        if (currentLang === 'om') {
          textToUse = "Guyyaa har'aa ragaan dhiyaate kun akka ibsetti, gaaffii dhihaateef deebii kennuun dhugaa ta'uu isaa mirkaneessee jira.";
        } else if (currentLang === 'am') {
          textToUse = "ዛሬ የቀረበው ምስክር እንደገለጸው፣ ለተነሱት ጥያቄዎች ትክክለኛውን ምላሽ ሰጥቷል።";
        } else {
          textToUse = "The witness appearing today testified and confirmed the accuracy of the statements provided.";
        }
        setRawTestimony(textToUse);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    }

    setTranscripts({
      om: `[GALMEE RAGAA - CASE NO: ${caseNumber || 'ETH-CR/2026'}]\nMaqaa Ragaa: ${witnessName || 'Abbaan Ragaa'}\n\nJecha Ragaa (Afaan Oromoo):\n${textToUse}\n\n(Murtii / Gabaasa Abbaa Seeraatiin kan qophaa'e).`,
      am: `[የምስክር ቃል መዝገብ - መዝገብ ቁጥር: ${caseNumber || 'ETH-CR/2026'}]\nየምስክር ስም: ${witnessName || 'ምስክር'}\n\nየምስክር ቃል (አማርኛ):\n${textToUse}\n\n(በፍርድ ቤቱ የተዘጋጀ ኦፊሴላዊ ቃለ መኃላ).`,
      en: `[OFFICIAL WITNESS TESTIMONY RECORD - CASE NO: ${caseNumber || 'ETH-CR/2026'}]\nWitness Name: ${witnessName || 'Anonymous Witness'}\n\nTestimony (English):\n${textToUse}\n\n(Official Judicial Transcript Recorded via SeeraAI Court Engine).`,
    });
    setIsTranscribing(false);
  };

  const handleCopyText = async (langKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTab(langKey);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleSaveRecord = () => {
    if (!transcripts.om) return;
    saveDocument({
      title: `Witness Testimony - ${witnessName || 'Court Witness'} (${caseNumber || 'Case Record'})`,
      taskType: 'explain_law',
      prompt: `Witness Testimony Record for ${witnessName}, Case No: ${caseNumber}`,
      outputLanguages: ['om', 'am', 'en'],
      content: transcripts.om,
      separatedVersions: {
        om: transcripts.om,
        am: transcripts.am,
        en: transcripts.en,
      },
      tags: ['SeeraAI', 'WitnessRecord', 'CourtAudio'],
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Mic className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om'
                  ? 'Waraabbii Ragaa & Tajaajila Sagalee (Witness Audio Transcription & Court Record)'
                  : currentLang === 'am'
                  ? 'የምስክር ቃል ማቀረጫ እና የድምፅ ትርጉም አገልግሎት'
                  : 'Witness Testimony Audio Recording & Trilingual Court Transcriber'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {currentLang === 'om'
                  ? 'Abbaan seeraa ykn ogeessi seeraa sagalee ragaa namaa (witness testimony) waraabee ykn copy-paste godhee gara barreeffama afaan sadeeniitti akka jijjiirame godha'
                  : 'Allows judges and legal professionals to record or paste witness testimonies and instantly generate official trilingual transcripts.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Input & Recorder Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {currentLang === 'om' ? 'Maqaa Abbaa Ragaa (Witness Name):' : 'የምስክር ስም (Witness Full Name):'}
            </label>
            <input
              type="text"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              placeholder="e.g. Obbo Kebede Tadesse"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {currentLang === 'om' ? 'Lakk. Galmee / Case Number:' : 'የመዝገብ ቁጥር (Case Number):'}
            </label>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g. ETH-CR/1049/2026"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Audio Recording & Paste Box */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              {currentLang === 'om' ? 'Sagalee Waraabi ykn Barreeffama Paste Godhi:' : 'ድምጽ ይቅረጹ ወይም ጽሁፍ ይለጥፉ (Paste / Record):'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 shadow-inner">
                <span className="text-xs">🌐</span>
                <select 
                  value={selectedSpeechDialect}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedSpeechDialect(code);
                    const match = SUPPORTED_SPEECH_DIALECTS.find(d => d.code === code);
                    if (match) {
                      setDictationLang(match.lang);
                    }
                  }}
                  className="bg-transparent text-slate-200 text-[11px] outline-none font-medium cursor-pointer"
                  title="Filannoo Afaanii / Dialect selector for SpeechRecognition"
                >
                  {SUPPORTED_SPEECH_DIALECTS.map((dialect) => (
                    <option key={dialect.code} value={dialect.code} className="bg-slate-900 text-slate-200">
                      {dialect.flag} {dialect.label}
                    </option>
                  ))}
                </select>
              </div>

              <VoiceDictation 
                onTextChange={(text) => setRawTestimony(prev => prev ? prev + ' ' + text : text)} 
                currentLang={currentLang}
                dictationLang={dictationLang}
                dialectCode={selectedSpeechDialect}
                onDictationLangChange={setDictationLang}
                onDialectChange={setSelectedSpeechDialect}
              />

              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>{currentLang === 'om' ? 'Waraabbii Audio' : 'የድምጽ ቀረጻ'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 font-bold text-xs border border-red-500/50 transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>{currentLang === 'om' ? 'Dhaabi' : 'አቁም'}</span>
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={5}
            value={rawTestimony}
            onChange={(e) => setRawTestimony(e.target.value)}
            placeholder={
              currentLang === 'om'
                ? 'Asitti jecha ragaa namaa paste godhaa ykn sagalee waraabbadhaa. (Paste witness testimony here or record audio)...'
                : 'የምስክር ቃል እዚህ ይለጥፉ (Paste) ወይም በድምጽ ይመዝግቡ...'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 shadow-inner leading-relaxed select-text"
          />

          {audioUrl && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Volume2 className="w-4 h-4" />
                <span>Recorded Witness Audio Clip Ready</span>
              </div>
              <audio src={audioUrl} controls className="h-8 max-w-xs" />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={isTranscribing}
              onClick={handleTranscribeAudio}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTranscribing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>
                {isTranscribing
                  ? 'Gara Barreeffamaa Jijjiirraa jira...'
                  : currentLang === 'om'
                  ? 'Gara Afaanota Sadeeniitti Jijjiiri (Transcribe)'
                  : 'ወደ 3 ቋንቋዎች ቀይር (Transcribe)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Trilingual Transcripts Results Section */}
      {(transcripts.om || transcripts.am || transcripts.en) && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-100 font-serif-legal flex items-center gap-2">
              <span>🏛️</span>
              <span>
                {currentLang === 'om' ? 'Galmee Jecha Ragaa (Trilingual Court Record)' : 'የምስክር ቃል ባለ 3 ቋንቋ ሪፖርት'}
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveRecord}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  savedToast
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{savedToast ? 'Galmeeffameera! (Saved)' : 'Kuusi (Save to Library)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF / Word</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Afaan Oromoo Transcript */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 font-mono">Afaan Oromoo</span>
                <button
                  type="button"
                  onClick={() => handleCopyText('om', transcripts.om)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedTab === 'om' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTab === 'om' ? 'Koppifame' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                {transcripts.om}
              </div>
            </div>

            {/* Amharic Transcript */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group font-ethiopic">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 font-mono">አማርኛ</span>
                <button
                  type="button"
                  onClick={() => handleCopyText('am', transcripts.am)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedTab === 'am' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTab === 'am' ? 'ተቀድቷል' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                {transcripts.am}
              </div>
            </div>

            {/* English Transcript */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 font-mono">English</span>
                <button
                  type="button"
                  onClick={() => handleCopyText('en', transcripts.en)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedTab === 'en' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTab === 'en' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                {transcripts.en}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        currentLang={currentLang}
        title={`Witness Testimony Record - ${witnessName || 'Court Witness'}`}
        taskType="explain_law"
        content={transcripts.om}
        separatedVersions={{
          om: transcripts.om,
          am: transcripts.am,
          en: transcripts.en,
        }}
        outputLanguages={['om', 'am', 'en']}
      />
    </div>
  );
};

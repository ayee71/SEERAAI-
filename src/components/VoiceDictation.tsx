import React, { useState } from 'react';
import { Mic, Square, Loader2, Plus, Volume2, Globe, Check, AlertCircle } from 'lucide-react';
import { Language } from '../i18n/translations';
import { useLegalDictation } from '../hooks/useLegalDictation';

export const SUPPORTED_SPEECH_DIALECTS: { code: string; lang: Language; flag: string; label: string }[] = [
  { code: 'om-ET', lang: 'om', flag: '🇪🇹', label: 'Afaan Oromoo' },
  { code: 'am-ET', lang: 'am', flag: '🇪🇹', label: 'አማርኛ' },
  { code: 'en-US', lang: 'en', flag: '🇺🇸', label: 'English' }
];

export const SUPPORTED_SPEECH_DIALECTS_STRINGS = SUPPORTED_SPEECH_DIALECTS.map(d => d.code);

interface VoiceDictationProps {
  onTextChange?: (text: string) => void;
  currentLang?: Language;
  dictationLang?: Language;
  dialectCode?: string;
  onDictationLangChange?: (lang: Language) => void;
  onDialectChange?: (dialect: string) => void;
}

export const VoiceDictation: React.FC<VoiceDictationProps> = ({ 
  onTextChange, 
  currentLang = 'om', 
  dictationLang = 'om', 
  dialectCode = 'om-ET', 
  onDictationLangChange, 
  onDialectChange 
}) => {
  const [transcriptionHistory, setTranscriptionHistory] = useState<string>('');
  const [autoInsert, setAutoInsert] = useState<boolean>(true);

  const {
    isRecording,
    isProcessing,
    durationSeconds,
    interimTranscript,
    audioVolume,
    error,
    startDictation,
    stopDictation,
    cancelDictation,
  } = useLegalDictation({
    language: dictationLang,
    speechDialect: dialectCode,
    legalMode: true,
    onTranscriptionResult: (text, isFinal) => {
      if (text) {
        setTranscriptionHistory(text);
        if (autoInsert && isFinal) {
          onTextChange?.(text);
        }
      }
    },
  });

  const handleToggle = async () => {
    if (isRecording) {
      const finalResult = await stopDictation();
      if (finalResult && finalResult.trim().length > 0) {
        setTranscriptionHistory(finalResult);
        onTextChange?.(finalResult);
      }
    } else {
      await startDictation();
    }
  };

  const handleManualInsert = () => {
    if (transcriptionHistory.trim()) {
      onTextChange?.(transcriptionHistory.trim());
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 font-serif-legal">
          <Mic className="w-4 h-4 text-rose-400" />
          <span>Waraabbii Sagalee Seeraa / Courtroom Legal Dictation</span>
        </h3>
        
        {/* Dialect / Language Picker */}
        <div className="flex items-center gap-2">
          <select
            value={dialectCode}
            onChange={(e) => {
              const code = e.target.value;
              onDialectChange?.(code);
              const found = SUPPORTED_SPEECH_DIALECTS.find((d) => d.code === code);
              if (found) {
                onDictationLangChange?.(found.lang);
              }
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            {SUPPORTED_SPEECH_DIALECTS.map((dialect) => (
              <option key={dialect.code} value={dialect.code}>
                {dialect.flag} {dialect.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleToggle}
            disabled={isProcessing}
            className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isRecording 
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40' 
                : isProcessing 
                ? 'bg-amber-500/20 text-amber-300' 
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Legal Dictation'}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Recording status bar */}
      {isRecording && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono font-bold">REC {formatTimer(durationSeconds)}</span>
            <div className="flex items-center gap-0.5 ml-2 h-3">
              {[1, 2, 3, 4, 5, 6].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    (audioVolume / 16) >= bar ? 'bg-rose-400 h-3' : 'bg-slate-700 h-1'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={cancelDictation}
            className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
          >
            Dhiisi / Cancel
          </button>
        </div>
      )}

      {/* Transcription output box */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 min-h-[90px] text-sm text-slate-200 leading-relaxed overflow-y-auto">
        {isProcessing ? (
          <div className="flex items-center gap-2 text-amber-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI STT Sagalee gara barreeffama seeraatti jijjiiraa jira...</span>
          </div>
        ) : isRecording && interimTranscript ? (
          <div className="text-amber-300 italic font-serif">
            "{interimTranscript}..."
          </div>
        ) : (
          transcriptionHistory || (
            <span className="text-slate-500 text-xs italic">
              Maaykirofoonii tuquun sagaleen dubbisaa; jechoonni seeraa (labsii, keeyyata, murtee) ofumaan gara qabiyyeetti dabalama.
            </span>
          )
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-slate-400">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoInsert}
            onChange={(e) => setAutoInsert(e.target.checked)}
            className="rounded border-slate-700 text-amber-500 focus:ring-0"
          />
          <span>Gulaallitti ofumaan dabali / Auto-insert into editor</span>
        </label>

        {transcriptionHistory && (
          <button
            type="button"
            onClick={handleManualInsert}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gulaallitti Dabali / Insert</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

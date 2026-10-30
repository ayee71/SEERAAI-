import React, { useState, useEffect } from 'react';
import {
  Mic,
  Square,
  Loader2,
  Globe,
  Check,
  AlertCircle,
  X,
  Plus,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { useLegalDictation, formatSpokenLegalText } from '../hooks/useLegalDictation';

export interface LegalDictationToolbarProps {
  currentLang?: Language;
  onInsertText: (text: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  currentValue?: string;
  className?: string;
  compact?: boolean;
}

const SUPPORTED_LANG_OPTIONS: { code: Language | 'auto'; label: string; flag: string }[] = [
  { code: 'om', label: 'Afaan Oromoo', flag: '🇪🇹' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'auto', label: 'Auto Detect', flag: '🌐' },
];

export const LegalDictationToolbar: React.FC<LegalDictationToolbarProps> = ({
  currentLang = 'om',
  onInsertText,
  textareaRef,
  currentValue = '',
  className = '',
  compact = false,
}) => {
  const [selectedLang, setSelectedLang] = useState<Language | 'auto'>(currentLang);
  const [lastInsertedSnippet, setLastInsertedSnippet] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

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
    insertAtCursor,
  } = useLegalDictation({
    language: selectedLang,
    legalMode: true,
  });

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      const transcribed = await stopDictation();
      if (transcribed && transcribed.trim().length > 0) {
        if (textareaRef?.current) {
          insertAtCursor(textareaRef.current, transcribed, currentValue, onInsertText);
        } else {
          onInsertText(transcribed);
        }
        setLastInsertedSnippet(transcribed.slice(0, 45) + (transcribed.length > 45 ? '...' : ''));
        setTimeout(() => setLastInsertedSnippet(null), 3500);
      }
    } else {
      await startDictation();
    }
  };

  const handleInsertQuickPhrase = (phrase: string) => {
    if (textareaRef?.current) {
      insertAtCursor(textareaRef.current, phrase, currentValue, onInsertText);
    } else {
      onInsertText(phrase);
    }
  };

  // Quick legal insertion buttons based on language
  const quickPhrases = selectedLang === 'am' ? [
    'በአዋጅ ቁጥር ',
    'በአንቀጽ ',
    'የሰበር ውሳኔ መዝገብ ቁጥር ',
    'የይርጋ ጊዜ ',
    'የግራ ቀኙ ክርክር ',
  ] : selectedLang === 'en' ? [
    'Pursuant to Proclamation No. ',
    'Under Article ',
    'Federal Cassation File No. ',
    'Statute of Limitations ',
    'Court Order & Judgment: ',
  ] : [
    'Labsii Lakk. ',
    'Kwt. ',
    'Dhaddacha Ijibbaataa Galmee Lakk. ',
    'Yeroon Darbiinsaa ',
    'Murtii Mana Murtii: ',
  ];

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main Toolbar Line */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          {/* Microphone Recording Button */}
          <button
            type="button"
            onClick={handleToggleRecord}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none shadow-sm ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30'
                : isProcessing
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300'
            }`}
            title="Meeshaa maaykirofooniitiin seera dubbisaa barreessi / Dictate legal text using device microphone"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Dictation Transcribing...</span>
              </>
            ) : isRecording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Dhaabi & Galchi / Stop ({formatTimer(durationSeconds)})</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Sagaleen Barreessi / Legal Dictation</span>
              </>
            )}
          </button>

          {/* Volume Indicator when recording */}
          {isRecording && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-950 rounded-md border border-rose-500/30">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <div className="flex items-center gap-0.5 h-3">
                {[1, 2, 3, 4, 5].map((bar) => {
                  const active = (audioVolume / 20) >= bar;
                  return (
                    <div
                      key={bar}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        active ? 'bg-rose-400 h-3' : 'bg-slate-700 h-1'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-rose-300 font-mono ml-1">REC</span>
            </div>
          )}

          {/* Cancel button if recording */}
          {isRecording && (
            <button
              type="button"
              onClick={cancelDictation}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all text-xs"
              title="Dhiisi / Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] text-slate-200 cursor-pointer"
            >
              <Globe className="w-3 h-3 text-amber-400" />
              <span>
                {SUPPORTED_LANG_OPTIONS.find((l) => l.code === selectedLang)?.flag}{' '}
                {SUPPORTED_LANG_OPTIONS.find((l) => l.code === selectedLang)?.label}
              </span>
            </button>

            {showLangMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-[150px] animate-in fade-in duration-100">
                {SUPPORTED_LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(opt.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-all ${
                      selectedLang === opt.code ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span>{opt.flag} {opt.label}</span>
                    {selectedLang === opt.code && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Legal Shorthand Chips */}
        {!compact && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider hidden sm:inline">
              Shorthand:
            </span>
            {quickPhrases.slice(0, 3).map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleInsertQuickPhrase(phrase)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700 text-[10px] text-slate-300 transition-all cursor-pointer"
                title={`Galchi: ${phrase}`}
              >
                + {phrase}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Streaming Interim Transcript Banner */}
      {isRecording && interimTranscript && (
        <div className="p-2.5 bg-slate-950/90 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate italic font-serif">"{interimTranscript}"</span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">Waraabamaa jira...</span>
        </div>
      )}

      {/* Success Notification */}
      {lastInsertedSnippet && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Barreeffamni seeraa milkaa'inaan gara gulaallichaatti dhufe: <strong>"{lastInsertedSnippet}"</strong></span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

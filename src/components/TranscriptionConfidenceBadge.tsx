import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Edit3, Check } from 'lucide-react';
import { getConfidenceDetails, analyzeWordConfidence, WordConfidenceToken } from '../utils/confidenceUtils';
import { Language } from '../i18n/translations';

interface TranscriptionConfidenceBadgeProps {
  confidence?: number;
  showTextLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const TranscriptionConfidenceBadge: React.FC<TranscriptionConfidenceBadgeProps> = ({
  confidence = 0.95,
  showTextLabel = true,
  size = 'sm',
  className = ''
}) => {
  const details = getConfidenceDetails(confidence);

  const IconComponent = details.level === 'high' 
    ? CheckCircle2 
    : details.level === 'medium' 
    ? AlertCircle 
    : AlertTriangle;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold transition-all shadow-sm ${details.badgeBg} ${details.textColor} ${details.borderColor} ${className}`}
      title={`AI Audio Transcription Confidence: ${details.percentage}% (${details.level.toUpperCase()})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${details.dotColor} ${details.level === 'low' ? 'animate-ping' : ''}`} />
      <IconComponent className="w-3 h-3 shrink-0" />
      {showTextLabel && (
        <span className="font-semibold tracking-tight">
          {details.percentage}% {details.level === 'high' ? 'High' : details.level === 'medium' ? 'Med' : 'Low'}
        </span>
      )}
    </div>
  );
};

interface WordConfidenceHighlighterProps {
  text: string;
  confidence?: number;
  currentLang: Language;
  onVerifyWord?: (oldWord: string, newWord: string) => void;
  className?: string;
}

export const WordConfidenceHighlighter: React.FC<WordConfidenceHighlighterProps> = ({
  text,
  confidence = 0.95,
  currentLang,
  onVerifyWord,
  className = ''
}) => {
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const tokens = analyzeWordConfidence(text, confidence);

  const handleStartEdit = (idx: number, currentWord: string) => {
    setEditingWordIndex(idx);
    setEditingValue(currentWord);
  };

  const handleSaveEdit = (oldWord: string) => {
    if (editingWordIndex !== null && editingValue.trim()) {
      onVerifyWord?.(oldWord, editingValue.trim());
    }
    setEditingWordIndex(null);
  };

  return (
    <div className={`inline-flex flex-wrap items-baseline gap-1 ${className}`}>
      {tokens.map((token, idx) => {
        const isEditing = editingWordIndex === idx;

        if (isEditing) {
          return (
            <span key={idx} className="inline-flex items-center gap-1 bg-amber-950 border border-amber-500 rounded px-1.5 py-0.5 z-10 shadow-lg">
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(token.word);
                  if (e.key === 'Escape') setEditingWordIndex(null);
                }}
                autoFocus
                className="bg-slate-900 border border-amber-400/60 rounded px-1 text-xs text-white outline-none font-bold w-28"
              />
              <button
                type="button"
                onClick={() => handleSaveEdit(token.word)}
                className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold"
                title="Save verified word"
              >
                <Check className="w-3 h-3" />
              </button>
            </span>
          );
        }

        if (token.isLowConfidence) {
          return (
            <span
              key={idx}
              className="group/term relative inline-block bg-rose-500/20 text-rose-200 border-b-2 border-rose-500/80 px-1 py-0.5 rounded cursor-pointer hover:bg-rose-500/40 hover:text-white transition-all font-medium"
            >
              <span onClick={() => handleStartEdit(idx, token.word)}>{token.word}</span>
              <span className="ml-0.5 text-[9px] font-mono text-rose-300 font-bold opacity-80 group-hover:opacity-100">
                ⚠ {Math.round(token.score * 100)}%
              </span>
              {/* Tooltip for alternatives */}
              {token.suggestedFixes && token.suggestedFixes.length > 0 && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/term:block z-50 w-40 p-2 bg-slate-900 border border-rose-500/60 text-[11px] text-slate-200 rounded-xl shadow-2xl pointer-events-auto">
                  <span className="font-bold text-rose-400 block mb-1">Alternatives:</span>
                  {token.suggestedFixes.map(fix => (
                    <button 
                      key={fix} 
                      className="block w-full text-left hover:text-white hover:bg-rose-900/50 p-1 rounded transition-colors"
                      onClick={() => onVerifyWord?.(token.word, fix)}
                    >
                      {fix}
                    </button>
                  ))}
                </span>
              )}
            </span>
          );
        }

        return <span key={idx}>{token.word}</span>;
      })}
    </div>
  );
};

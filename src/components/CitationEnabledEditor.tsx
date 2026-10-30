import React, { useRef } from 'react';
import { Clock, Cloud, Loader2, AlertCircle } from 'lucide-react';
import { Language } from '../i18n/translations';
import { SmartCitationLinker } from './SmartCitationLinker';
import { LegalDictationToolbar } from './LegalDictationToolbar';
import { useFirestoreAutoSave } from '../hooks/useFirestoreAutoSave';

interface CitationEnabledEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currentLang?: Language;
  onNavigateToCassation?: (query: string) => void;
  rows?: number;
  className?: string;
  docId?: string; // Optional document ID for automatic 5s debounced Firestore auto-save
}

export const CitationEnabledEditor: React.FC<CitationEnabledEditorProps> = ({
  label,
  value,
  onChange,
  placeholder,
  currentLang = 'om',
  onNavigateToCassation,
  rows = 5,
  className = '',
  docId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { saveStatus, lastSavedAt } = useFirestoreAutoSave({
    docId: docId || '',
    collectionName: 'document_drafts',
    debounceMs: 5000,
    data: {
      id: docId || '',
      content: value,
    },
    enabled: Boolean(docId && value.trim()),
  });

  const handleInsert = (citationOrContent: string) => {
    if (!textareaRef.current) {
      onChange(value ? `${value}\n\n${citationOrContent}` : citationOrContent);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const before = value.substring(0, start);
    const after = value.substring(end);
    const insertion = (before.endsWith('\n') || !before ? '' : '\n') + citationOrContent + (after.startsWith('\n') ? '' : '\n');

    const nextValue = before + insertion + after;
    onChange(nextValue);

    // Reset cursor after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + insertion.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 50);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {label && (
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {label}
          </label>
        )}

        {docId && (
          <div className="flex items-center gap-1.5 text-[11px]">
            {saveStatus === 'pending' && (
              <span className="text-amber-300 flex items-center gap-1 animate-pulse">
                <Clock className="w-3 h-3" /> Auto-saving in 5s...
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-amber-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Saved to Firestore {lastSavedAt ? `(${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Auto-save failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Device Microphone Legal Dictation Toolbar */}
      <LegalDictationToolbar
        currentLang={currentLang}
        onInsertText={handleInsert}
        textareaRef={textareaRef}
        currentValue={value}
      />

      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all leading-relaxed"
        placeholder={placeholder}
      />
      <SmartCitationLinker
        text={value}
        onInsert={handleInsert}
        currentLang={currentLang}
        onNavigateToCassation={onNavigateToCassation}
      />
    </div>
  );
};

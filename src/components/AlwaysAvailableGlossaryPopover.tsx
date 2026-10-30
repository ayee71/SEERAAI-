import React, { useState, useEffect, useRef } from 'react';
import { LEGAL_GLOSSARY_DATA, LegalGlossaryEntry } from '../data/legalGlossary';
import { WEBSTER_DICTIONARY_ENTRIES, WEBSTER_LATIN_LEGAL_MAXIMS } from '../data/websterLawDictionary';
import { Language, translations } from '../i18n/translations';

interface AlwaysAvailableGlossaryPopoverProps {
  currentLang: Language;
}

export const AlwaysAvailableGlossaryPopover: React.FC<AlwaysAvailableGlossaryPopoverProps> = ({
  currentLang,
}) => {
  const t = translations[currentLang];
  const [selectedText, setSelectedText] = useState('');
  const [matchedEntries, setMatchedEntries] = useState<LegalGlossaryEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<LegalGlossaryEntry | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [insertedNotification, setInsertedNotification] = useState(false);
  
  // Track currently active editor elements to enable contextual options
  const [hasActiveEditor, setHasActiveEditor] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Listen to selection changes across the entire document
  useEffect(() => {
    const handleMouseOrSelectionUp = (e: MouseEvent | TouchEvent) => {
      // Small delay to allow selection coordinates to resolve accurately
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          // If clicked outside popover, close it
          if (popoverRef.current && !popoverRef.current.contains(document.activeElement)) {
            // Check if click was inside popover
            const target = e.target as HTMLElement;
            if (!popoverRef.current.contains(target)) {
              setPopoverCoords(null);
              setSelectedText('');
              setMatchedEntries([]);
              setActiveEntry(null);
            }
          }
          return;
        }

        const text = selection.toString().trim();
        // Set constraints: words or short legal phrases between 3 and 60 chars
        if (text.length < 3 || text.length > 60) {
          return;
        }

        // Check if there is an active text input or textarea currently focused or in DOM
        const activeEl = document.activeElement;
        const isEditing = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');
        setHasActiveEditor(!!isEditing);

        // Find matches in the official glossary engine and Webster's Law Dictionary
        const searchStr = text.toLowerCase();
        const matches = LEGAL_GLOSSARY_DATA.filter((entry) => {
          const omTerm = entry.om.term.toLowerCase();
          const amTerm = entry.am.term.toLowerCase();
          const enTerm = entry.en.term.toLowerCase();

          return (
            omTerm.includes(searchStr) ||
            amTerm.includes(searchStr) ||
            enTerm.includes(searchStr) ||
            searchStr.includes(omTerm) ||
            searchStr.includes(amTerm) ||
            searchStr.includes(enTerm)
          );
        });

        // Also check Webster's Law Dictionary entries
        const websterMatches: LegalGlossaryEntry[] = WEBSTER_DICTIONARY_ENTRIES.filter((e) => {
          const term = e.term.toLowerCase();
          const omTerm = e.om.term.toLowerCase();
          const amTerm = e.am.term.toLowerCase();
          return (
            term.includes(searchStr) ||
            searchStr.includes(term) ||
            omTerm.includes(searchStr) ||
            amTerm.includes(searchStr)
          );
        }).map((e) => ({
          id: e.id,
          category: 'civilCourt' as const,
          om: {
            term: e.om.term,
            definition: e.om.definition,
            usage: e.om.usage || '',
          },
          am: {
            term: e.am.term,
            definition: e.am.definition,
            usage: e.am.usage || '',
          },
          en: {
            term: e.term,
            definition: e.definitionEn,
            usage: e.examplesEn || '',
          },
          sourceReference: "Webster's New World Law Dictionary (Wiley Publishing)",
        }));

        // Also check Webster's Latin Legal Maxims
        const maximMatches: LegalGlossaryEntry[] = WEBSTER_LATIN_LEGAL_MAXIMS.filter((m) => {
          const ph = m.phrase.toLowerCase();
          return ph.includes(searchStr) || searchStr.includes(ph);
        }).map((m, i) => ({
          id: `maxim_${i}`,
          category: 'constitutional' as const,
          om: {
            term: m.phrase,
            definition: m.legalMeaningOm,
            usage: `Literal: "${m.literalTranslation}"`,
          },
          am: {
            term: m.phrase,
            definition: m.legalMeaningAm,
            usage: `Literal: "${m.literalTranslation}"`,
          },
          en: {
            term: m.phrase,
            definition: m.legalMeaningEn,
            usage: `Literal: "${m.literalTranslation}"`,
          },
          sourceReference: "Webster's Latin Legal Maxims",
        }));

        const combinedMatches = [...matches, ...websterMatches, ...maximMatches];

        if (combinedMatches.length > 0) {
          // Get selection coordinates on the screen
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              // Calculate ideal placement: center horizontally below/above the highlight
              const x = rect.left + window.scrollX + rect.width / 2;
              const y = rect.bottom + window.scrollY + 8; // placed 8px under highlighted text

              setPopoverCoords({ x, y });
              setSelectedText(text);
              setMatchedEntries(combinedMatches);
              setActiveEntry(combinedMatches[0]); // Default to first match
            }
          } catch (err) {
            console.warn('Error calculating selection range rect:', err);
          }
        }
      }, 50);
    };

    document.addEventListener('mouseup', handleMouseOrSelectionUp);
    document.addEventListener('touchend', handleMouseOrSelectionUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseOrSelectionUp);
      document.removeEventListener('touchend', handleMouseOrSelectionUp);
    };
  }, []);

  // Close popover when Esc key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverCoords(null);
        setSelectedText('');
        setMatchedEntries([]);
        setActiveEntry(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!popoverCoords || matchedEntries.length === 0 || !activeEntry) {
    return null;
  }

  const getLegalDefinitionLabel = () => {
    if (currentLang === 'om') return 'Hiika Seeraa';
    if (currentLang === 'am') return 'የሕግ ትርጓሜ';
    return 'Legal Definition';
  };

  // Insert term details directly into the active cursor position of the document editor
  const handleInsertIntoEditor = (type: 'term' | 'definition' | 'citation' | 'all') => {
    const activeEl = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
    if (!activeEl) return;

    let textToInsert = '';
    const currentLangTerm = activeEntry[currentLang]?.term || activeEntry.om.term;
    const currentLangDef = activeEntry[currentLang]?.definition || activeEntry.om.definition;
    const citation = activeEntry.sourceReference;

    if (type === 'term') {
      textToInsert = currentLangTerm;
    } else if (type === 'definition') {
      textToInsert = currentLangDef;
    } else if (type === 'citation') {
      textToInsert = ` (${citation})`;
    } else if (type === 'all') {
      textToInsert = `"${currentLangTerm}" (${getLegalDefinitionLabel()}: ${currentLangDef} [Source: ${citation}])`;
    }

    try {
      const start = activeEl.selectionStart || 0;
      const end = activeEl.selectionEnd || 0;
      const originalValue = activeEl.value;
      
      const newValue = originalValue.substring(0, start) + textToInsert + originalValue.substring(end);
      activeEl.value = newValue;

      // Trigger synthetic React input event to force state synchronization
      const inputEvent = new Event('input', { bubbles: true });
      activeEl.dispatchEvent(inputEvent);

      // Refocus and set cursor index immediately following insertion
      activeEl.focus();
      const newCursorPos = start + textToInsert.length;
      activeEl.setSelectionRange(newCursorPos, newCursorPos);

      setInsertedNotification(true);
      setTimeout(() => setInsertedNotification(false), 1500);
    } catch (err) {
      console.error('Failed to insert text at cursor:', err);
    }
  };

  const handleCopyText = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 1500);
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
    }
  };

  // Switch to main Glossary tab and load search query for deeper research
  const handleNavigateToMainGlossary = () => {
    const termToSearch = activeEntry[currentLang]?.term || activeEntry.om.term;
    // Dispatch custom navigation event
    window.dispatchEvent(new CustomEvent('seera:navigate', { 
      detail: { tab: 'glossary', query: termToSearch } 
    }));
    // Close popover
    setPopoverCoords(null);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute z-[9999] w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-4 text-slate-100 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${popoverCoords.y}px`,
        left: `${Math.max(10, Math.min(window.innerWidth - 390, popoverCoords.x - 192))}px`,
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-base">⚖️</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Mini-Glossary Popover
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {matchedEntries.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] text-slate-400">
              <span>🔄</span>
              <select
                value={activeEntry.id}
                onChange={(e) => {
                  const entry = matchedEntries.find((m) => m.id === e.target.value);
                  if (entry) setActiveEntry(entry);
                }}
                className="bg-transparent text-slate-300 outline-none cursor-pointer text-[10px] font-semibold"
              >
                {matchedEntries.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-slate-300">
                    {m[currentLang]?.term || m.om.term}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => {
              setPopoverCoords(null);
              setSelectedText('');
              setMatchedEntries([]);
              setActiveEntry(null);
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main entry display */}
      <div className="space-y-2.5">
        <div>
          {/* Term name across languages */}
          <h4 className="text-sm font-extrabold text-amber-300 flex items-center gap-1.5 flex-wrap">
            <span>{activeEntry[currentLang]?.term || activeEntry.om.term}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono font-normal uppercase text-slate-400">
              {activeEntry.category}
            </span>
          </h4>
          <div className="text-[10px] text-slate-400 flex flex-col gap-0.5 mt-1 bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
            {currentLang !== 'om' && (
              <p>
                <span className="font-bold">Oromo:</span> {activeEntry.om.term}
              </p>
            )}
            {currentLang !== 'am' && (
              <p className="font-ethiopic">
                <span className="font-sans font-bold">Amharic:</span> {activeEntry.am.term}
              </p>
            )}
            {currentLang !== 'en' && (
              <p>
                <span className="font-bold">English:</span> {activeEntry.en.term}
              </p>
            )}
          </div>
        </div>

        {/* Definition Content */}
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
            📖 {getLegalDefinitionLabel()}
          </span>
          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {activeEntry[currentLang]?.definition || activeEntry.om.definition}
          </p>
        </div>

        {/* Precedent / Statutory citation citations section */}
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
            ⚖️ Citation & Relevant Articles
          </span>
          <p className="text-[11px] text-amber-200/90 font-mono font-semibold">
            🔗 {activeEntry.sourceReference}
          </p>
          <div className="text-[10px] text-slate-400 italic border-t border-slate-800 pt-1.5 mt-1 leading-relaxed">
            <span className="font-bold block text-[9px] uppercase text-slate-500 not-italic">Example usage:</span>
            "{activeEntry[currentLang]?.usage || activeEntry.om.usage}"
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
        {/* Editor Insertion options - only if textarea/input active */}
        {hasActiveEditor ? (
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
              ✍️ Editor Quick-Insert Actions
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleInsertIntoEditor('term')}
                className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-all cursor-pointer text-center"
                title="Insert term only"
              >
                Insert Term
              </button>
              <button
                type="button"
                onClick={() => handleInsertIntoEditor('definition')}
                className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-all cursor-pointer text-center"
                title="Insert definition text only"
              >
                Insert Definition
              </button>
              <button
                type="button"
                onClick={() => handleInsertIntoEditor('citation')}
                className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-all cursor-pointer text-center"
                title="Insert statutory citation reference"
              >
                Insert Citation
              </button>
              <button
                type="button"
                onClick={() => handleInsertIntoEditor('all')}
                className="py-1 px-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] font-black transition-all cursor-pointer text-center"
                title="Insert term, definition, and citation altogether"
              >
                Insert Full Info
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-500 text-center py-1">
            💡 Highlight inside drafting textareas to enable quick editor insertion!
          </p>
        )}

        {/* Global Utilities */}
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => handleCopyText(
              `"${activeEntry[currentLang]?.term || activeEntry.om.term}": ${activeEntry[currentLang]?.definition || activeEntry.om.definition} (Source: ${activeEntry.sourceReference})`
            )}
            className="flex-1 py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-[10px] font-bold text-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <span>📋</span>
            <span>
              {copiedNotification ? 'Waraabame!' : 'Copy to Clipboard'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleNavigateToMainGlossary}
            className="py-1.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] font-bold text-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
            title="Explore full legal definitions, related articles, and cassation precedents in main Glossary engine"
          >
            <span>🔎</span>
            <span>Search Glossary</span>
          </button>
        </div>
      </div>

      {/* Small notification indicator */}
      {insertedNotification && (
        <div className="absolute inset-x-0 bottom-0 py-1 bg-emerald-600 text-white font-bold text-[10px] text-center animate-in slide-in-from-bottom">
          ✓ Block successfully injected into editor!
        </div>
      )}
    </div>
  );
};

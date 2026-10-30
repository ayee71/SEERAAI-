import React, { useState, useRef, useEffect } from 'react';
import { X, Save, ShieldCheck, Clock, Wifi, WifiOff, CheckCircle, Cloud, Loader2, AlertCircle } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { SavedLegalDocument, updateDocument } from '../services/storage';
import { SmartCitationLinker } from './SmartCitationLinker';
import { LegalDictationToolbar } from './LegalDictationToolbar';
import { useFirestoreAutoSave } from '../hooks/useFirestoreAutoSave';

interface EditDocumentModalProps {
  doc: SavedLegalDocument;
  currentLang: Language;
  onClose: () => void;
  onSaved: (updated: SavedLegalDocument) => void;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  doc,
  currentLang,
  onClose,
  onSaved,
}) => {
  const t = translations[currentLang];
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 5-second debounced Firestore auto-save
  const { saveStatus, lastSavedAt, errorMessage, forceSaveNow } = useFirestoreAutoSave({
    docId: doc.id,
    collectionName: 'user_documents',
    debounceMs: 5000,
    data: {
      id: doc.id,
      title: title.trim(),
      content: content.trim(),
      taskType: doc.taskType,
      userId: doc.userId,
      userEmail: doc.userEmail,
    },
    enabled: isOnline && (title !== doc.title || content !== doc.content),
    onSaveSuccess: () => {
      updateDocument(doc.id, {
        title: title.trim(),
        content: content.trim(),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await forceSaveNow();
      const updated = {
        ...doc,
        title: title.trim(),
        content: content.trim(),
        updatedAt: new Date().toISOString(),
      };
      
      updateDocument(doc.id, {
        title: updated.title,
        content: updated.content,
      });

      onSaved(updated);
      onClose();
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                Sanada Fooyyessi / Edit Document
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isOnline ? (
                  <span className="text-[10px] flex items-center gap-1 text-emerald-400 font-mono">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="text-[10px] flex items-center gap-1 text-amber-400 font-mono">
                    <WifiOff className="w-3 h-3" /> Offline (Queued)
                  </span>
                )}

                {/* Firestore 5s Auto-Save Status Badge */}
                {saveStatus === 'pending' && (
                  <span className="text-[10px] bg-slate-800/80 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3" /> Auto-saving in 5s...
                  </span>
                )}
                {saveStatus === 'saving' && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving to Firestore...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Saved to Firestore {lastSavedAt ? `(${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})` : ''}
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md border border-rose-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Auto-save failed
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto">
            {!isOnline && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Intarneeta hin qabdan. Fooyya'iinsatti dhuunfaan ni kuufama; akkuma intarneettiin deebi'een ofumaan wal simata.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mata-duree Sanadaa / Document Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-all"
                placeholder="Mata-duree galchi..."
              />
            </div>

            <div className="flex-1 flex flex-col min-h-[300px] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Qabiyyee Seeraa / Legal Content
                </label>
              </div>

              {/* Device Microphone Legal Dictation Toolbar */}
              <LegalDictationToolbar
                currentLang={currentLang}
                onInsertText={(insertedText) => setContent((prev) => (prev ? `${prev}\n\n${insertedText}` : insertedText))}
                textareaRef={contentRef}
                currentValue={content}
              />

              <textarea
                ref={contentRef}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-sans resize-none leading-relaxed min-h-[220px]"
                placeholder="Qabiyyee sanadaa asitti fooyyessi ykn sagaleen dubbisi..."
              />
              <SmartCitationLinker
                text={content}
                onInsert={(insertedText) => setContent((prev) => (prev ? `${prev}\n\n${insertedText}` : insertedText))}
                currentLang={currentLang}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
              <span>Gulaalliin keessan encrypted dha.</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Dhiisi / Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Olkaayi / Save {!isOnline && '(Offline)'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

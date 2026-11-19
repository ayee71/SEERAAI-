import React, { useState } from 'react';
import { 
  Highlighter, 
  StickyNote, 
  MessageSquare, 
  CheckCircle2, 
  Save, 
  Tag, 
  Sparkles, 
  Download,
  X,
  Plus
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { addAnnotation } from '../services/annotationService';
import { useAuth } from '../context/AuthContext';
import { getActiveCourtSession } from '../services/courtInstitutionService';

interface PdfAnnotationToolbarProps {
  documentId: string;
  documentTitle?: string;
  currentLang: Language;
  onAnnotationAdded?: () => void;
}

export const PdfAnnotationToolbar: React.FC<PdfAnnotationToolbarProps> = ({
  documentId,
  documentTitle = 'Legal PDF Document',
  currentLang,
  onAnnotationAdded,
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const { user, profile } = useAuth();
  const activeSession = getActiveCourtSession();

  const authorName = 
    activeSession?.user?.fullName || 
    profile?.visitorName || 
    user?.displayName || 
    'Ogeessa Seeraa (Legal Officer)';

  const [activeTool, setActiveTool] = useState<'highlight' | 'sticky' | 'comment' | null>(null);
  const [selectedColor, setSelectedColor] = useState<'amber' | 'emerald' | 'cyan' | 'rose'>('amber');
  const [noteText, setNoteText] = useState('');
  const [tag, setTag] = useState<'risk' | 'important' | 'pleading' | 'citation'>('important');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleSaveAnnotation = async () => {
    if (!noteText.trim() && activeTool !== 'highlight') {
      alert(isOm ? 'Barreeffama yaadaa galchaa.' : 'Please enter note content.');
      return;
    }

    setSaving(true);
    try {
      await addAnnotation({
        documentId: documentId || 'current-pdf-doc',
        selectedText: noteText.trim().slice(0, 100) || 'PDF Selection Marker',
        content: noteText.trim() || (activeTool === 'sticky' ? 'Sticky Note Marker' : 'Highlight Marker'),
        color: selectedColor,
        authorName,
        authorRole: activeSession?.user?.role || 'legal_officer',
        tag: tag as any,
      });

      setToastMsg(
        isOm 
          ? 'Yaadannoon/Yaadni keessan Firestore irratti milkaa\'inaan olkaa\'ameera!' 
          : 'Sticky Note / Annotation marker saved to Firestore!'
      );
      setNoteText('');
      setActiveTool(null);
      if (onAnnotationAdded) onAnnotationAdded();

      setTimeout(() => setToastMsg(null), 3500);
    } catch (e) {
      console.error('Failed to save annotation:', e);
      alert('Error saving marker to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 shadow-2xl space-y-3">
      {/* Toast popup */}
      {toastMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Toolbar Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] font-bold text-amber-400 font-mono px-2 uppercase border-r border-slate-800">
            PDF Tools:
          </span>

          <button
            type="button"
            onClick={() => setActiveTool(activeTool === 'highlight' ? null : 'highlight')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'highlight' 
                ? 'bg-amber-500 text-slate-950 font-bold' 
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>{isOm ? 'Balledhi / Highlight' : 'Highlight'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool(activeTool === 'sticky' ? null : 'sticky')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'sticky' 
                ? 'bg-amber-500 text-slate-950 font-bold' 
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5 text-yellow-400" />
            <span>{isOm ? 'Maxxannee (Sticky Note)' : 'Sticky Note'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool(activeTool === 'comment' ? null : 'comment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'comment' 
                ? 'bg-amber-500 text-slate-950 font-bold' 
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>{isOm ? 'Yaada / Comment' : 'Comment'}</span>
          </button>
        </div>

        {/* Color Palette Picker */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono px-1">Color:</span>
          <button
            type="button"
            onClick={() => setSelectedColor('amber')}
            className={`w-5 h-5 rounded-full bg-amber-400 transition-all ${
              selectedColor === 'amber' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="Amber Yellow"
          />
          <button
            type="button"
            onClick={() => setSelectedColor('emerald')}
            className={`w-5 h-5 rounded-full bg-emerald-400 transition-all ${
              selectedColor === 'emerald' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="Emerald Green"
          />
          <button
            type="button"
            onClick={() => setSelectedColor('cyan')}
            className={`w-5 h-5 rounded-full bg-cyan-400 transition-all ${
              selectedColor === 'cyan' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="Cyan Blue"
          />
          <button
            type="button"
            onClick={() => setSelectedColor('rose')}
            className={`w-5 h-5 rounded-full bg-rose-400 transition-all ${
              selectedColor === 'rose' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="Rose Red"
          />
        </div>
      </div>

      {/* Expanded Annotation Form */}
      {activeTool && (
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              {activeTool === 'sticky' && <StickyNote className="w-4 h-4 text-yellow-400" />}
              {activeTool === 'highlight' && <Highlighter className="w-4 h-4 text-amber-400" />}
              {activeTool === 'comment' && <MessageSquare className="w-4 h-4 text-sky-400" />}
              <span>
                {activeTool === 'sticky' ? 'Add Sticky Note Marker' : activeTool === 'highlight' ? 'Highlight Selection' : 'Add Legal Comment'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={
              isOm
                ? 'Yaada keessan barreeffama PDF irratti maxxiinsuuf asitti barreessaa...'
                : 'Enter your sticky note comment or review note to attach to this PDF section...'
            }
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 min-h-[60px]"
          />

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Tag:</span>
              <select
                value={tag}
                onChange={(e: any) => setTag(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="important">Important / Ijooma</option>
                <option value="risk">Risk / Sodaa Seeraa</option>
                <option value="pleading">Pleading / Falmii</option>
                <option value="citation">Citation / Wabii Proclamation</option>
              </select>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAnnotation}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Olkaa\'aa jira...' : isOm ? 'Firestore tti Olkaa\'i' : 'Save to Firestore'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

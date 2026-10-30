import React, { useState, useRef, useEffect } from 'react';
import { X, Eye, Edit3, Highlighter, PenTool, RotateCcw, Save, Trash2, CheckCircle2, Download, ShieldCheck, Palette, FileText } from 'lucide-react';
import { Language } from '../i18n/translations';
import { SavedLegalDocument, saveDocument } from '../services/storage';
import { VersionHistoryView } from './VersionHistoryView';

interface DocumentQuickPreviewModalProps {
  doc: SavedLegalDocument;
  currentLang: Language;
  onClose: () => void;
  onSavedAsNew: (newDoc: SavedLegalDocument) => void;
}

interface DrawStroke {
  color: string;
  width: number;
  points: { x: number; y: number }[];
  isHighlighter?: boolean;
}

interface HighlightedText {
  id: string;
  text: string;
  color: string;
  timestamp: string;
  note?: string;
}

export const DocumentQuickPreviewModal: React.FC<DocumentQuickPreviewModalProps> = ({
  doc,
  currentLang,
  onClose,
  onSavedAsNew,
}) => {
  const [activeTool, setActiveTool] = useState<'view' | 'pen' | 'highlighter'>('view');
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [strokeColor, setStrokeColor] = useState<string>('#f59e0b'); // Amber
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [highlightedTexts, setHighlightedTexts] = useState<HighlightedText[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Redraw canvas whenever strokes change or resizing occurs
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (stroke.isHighlighter) {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 0.9;
      }
      ctx.stroke();
    });

    // Draw active stroke in progress
    if (currentStroke && currentStroke.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (currentStroke.isHighlighter) {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 0.9;
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    redrawCanvas();
  }, [strokes, currentStroke]);

  // Adjust canvas size to match content container
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      canvas.width = container.scrollWidth;
      canvas.height = Math.max(container.scrollHeight, 800);
      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [doc.content]);

  // Canvas drawing mouse/touch handlers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === 'view') return;
    setIsDrawing(true);
    const coords = getCoordinates(e);
    const isHigh = activeTool === 'highlighter';
    const newStroke: DrawStroke = {
      color: strokeColor,
      width: isHigh ? Math.max(strokeWidth * 4, 16) : strokeWidth,
      points: [coords],
      isHighlighter: isHigh,
    };
    setCurrentStroke(newStroke);
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    const coords = getCoordinates(e);
    setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, coords] } : null));
  };

  const handleEndDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke && currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  };

  // Text selection listener for highlighting specific text passages
  const handleTextMouseUp = () => {
    if (activeTool !== 'highlighter') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (text.length >= 3) {
      const newHighlight: HighlightedText = {
        id: `hl_${Date.now()}`,
        text,
        color: strokeColor,
        timestamp: new Date().toLocaleTimeString(),
      };
      setHighlightedTexts((prev) => [...prev, newHighlight]);
      selection.removeAllRanges();
    }
  };

  const handleClearAll = () => {
    if (confirm(currentLang === 'om' ? 'Dibamoota fi calaqqee hunda haquu barbaadduu?' : 'Clear all drawing annotations and highlights?')) {
      setStrokes([]);
      setHighlightedTexts([]);
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, prev.length - 1));
  };

  // Save annotated version as brand new document in manager
  const handleSaveAsNewDocument = () => {
    let annotationSummary = '';
    if (highlightedTexts.length > 0) {
      annotationSummary += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 QABXIIWWAAN CALAQSIFAMAN (HIGHLIGHTED LEGAL ANNOTATIONS):\n`;
      highlightedTexts.forEach((hl, i) => {
        annotationSummary += `• [${hl.timestamp}] "${hl.text}"\n`;
      });
    }

    if (strokes.length > 0) {
      annotationSummary += `\n[Hubachiisa: Sanadni kun dibata saaphanaa (${strokes.length} strokes) of keessaa qaba.]`;
    }

    const newDocTitle = `${doc.title} (Annotated ${new Date().toLocaleDateString('om-ET', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    const updatedContent = `${doc.content}${annotationSummary}`;

    const created = saveDocument({
      title: newDocTitle,
      content: updatedContent,
      taskType: doc.taskType,
      prompt: doc.prompt || 'Annotated version from Quick Preview',
      outputLanguages: doc.outputLanguages || ['om'],
      tags: [...(doc.tags || []), 'Annotated', 'QuickPreview'],
      folderId: doc.folderId,
    });

    setSaveSuccessMsg(
      currentLang === 'om'
        ? `Sanadni haaraan "${newDocTitle}" milkaa'inaan kuufameera!`
        : `New annotated document "${newDocTitle}" saved successfully!`
    );

    setTimeout(() => {
      onSavedAsNew(created);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'preview' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              History
            </button>
          </div>
          <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                  {currentLang === 'om' ? 'Ilaallata Saffisaa & Dibata (Quick Preview & Annotations)' : 'PDF Quick Preview & Annotations'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30 shrink-0">
                  Interactive Canvas
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-lg mt-0.5">
                {doc.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveAsNewDocument}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
              title="Save annotated copy as new document"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save as New Document</span>
              <span className="sm:hidden">Save</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Annotation Toolbar */}
        <div className="px-4 py-3 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTool('view')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'view'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/50 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Select / Read</span>
            </button>

            <button
              onClick={() => setActiveTool('pen')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'pen'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Pen Draw</span>
            </button>

            <button
              onClick={() => setActiveTool('highlighter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'highlighter'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Text Highlight</span>
            </button>
          </div>

          {/* Color Palette and Width */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { name: 'Amber', color: '#f59e0b' },
                { name: 'Emerald', color: '#10b981' },
                { name: 'Cyan', color: '#06b6d4' },
                { name: 'Rose', color: '#f43f5e' },
                { name: 'Purple', color: '#a855f7' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => setStrokeColor(c.color)}
                  className={`w-5 h-5 rounded-full transition-all cursor-pointer border ${
                    strokeColor === c.color ? 'scale-125 border-white shadow-md' : 'border-transparent opacity-80'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {[2, 4, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
                    strokeWidth === w ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                title="Undo last stroke"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleClearAll}
                disabled={strokes.length === 0 && highlightedTexts.length === 0}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 disabled:opacity-40 transition-colors cursor-pointer"
                title="Clear all drawings"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Toast Alert */}
        {saveSuccessMsg && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Main Document & Canvas Viewport */}
        <div className="flex-1 flex overflow-hidden bg-slate-950 relative">
          {activeTab === 'preview' ? (
            <>
              {/* Scrollable Document Page Container */}
              <div
                ref={containerRef}
                onMouseUp={handleTextMouseUp}
                className="flex-1 overflow-y-auto p-4 sm:p-10 relative flex justify-center select-text"
              >
                {/* ... (existing preview content) */}
                <div className="max-w-3xl w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-12 shadow-2xl space-y-6 relative text-slate-100 font-serif-legal leading-relaxed">
                  {/* Paper Header */}
                  <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block mb-1">
                        {doc.taskType || 'Legal Document'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {doc.title}
                      </h2>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400">
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Visual File Preview (Image/PDF) if available */}
                  {doc.fileDataUrl && (
                    <div className="mb-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                      {doc.mimeType?.startsWith('image/') ? (
                        <img 
                          src={doc.fileDataUrl} 
                          alt="Original Document Source" 
                          className="w-full h-auto object-contain max-h-[600px]"
                        />
                      ) : doc.mimeType === 'application/pdf' ? (
                        <iframe 
                          src={doc.fileDataUrl} 
                          title="PDF Preview"
                          className="w-full h-[600px] border-0"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* Document Text Content */}
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans selection:bg-amber-500/30 selection:text-amber-200 relative z-10">
                    {doc.content}
                  </div>

                  {/* Highlights Summary List on Document Sheet */}
                  {highlightedTexts.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Highlighter className="w-3.5 h-3.5" />
                        <span>Highlighted Excerpts ({highlightedTexts.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {highlightedTexts.map((hl) => (
                          <div
                            key={hl.id}
                            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-start gap-2.5"
                          >
                            <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: hl.color }} />
                            <span className="text-slate-300 italic">"{hl.text}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Drawing Canvas Overlay */}
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleStartDraw}
                  onMouseMove={handleMoveDraw}
                  onMouseUp={handleEndDraw}
                  onMouseLeave={handleEndDraw}
                  onTouchStart={handleStartDraw}
                  onTouchMove={handleMoveDraw}
                  onTouchEnd={handleEndDraw}
                  className={`absolute top-0 left-0 w-full h-full ${
                    activeTool === 'view' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'
                  }`}
                />
              </div>

              {/* Right Highlights & Annotations Sidebar */}
              {highlightedTexts.length > 0 && (
                <div className="hidden lg:flex w-72 border-l border-slate-800 bg-slate-900/60 p-4 flex-col space-y-3 overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Text Highlights</span>
                  </h4>
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {highlightedTexts.map((hl) => (
                      <div key={hl.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{hl.timestamp}</span>
                          <button
                            onClick={() => setHighlightedTexts((prev) => prev.filter((item) => item.id !== hl.id))}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-slate-200 line-clamp-3 italic">"{hl.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <VersionHistoryView 
              doc={doc} 
              currentLang={currentLang} 
              onRestored={(updated) => {
                // Handle restored document (e.g. reload or show toast)
              }} 
            />
          )}
        </div>

        {/* Footer Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">💡</span>
            <span>
              {activeTool === 'pen'
                ? 'Pen Draw Active: Draw directly over the document.'
                : activeTool === 'highlighter'
                ? 'Highlight Active: Select any text or draw to highlight.'
                : 'View Mode: Switch to Pen or Highlighter in toolbar to draw.'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-500">
              {strokes.length} drawings • {highlightedTexts.length} highlights
            </span>
            <button
              onClick={handleSaveAsNewDocument}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow"
            >
              Save as New Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

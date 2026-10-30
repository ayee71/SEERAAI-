import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../i18n/translations';
import { Annotation } from '../services/storage';
import { addAnnotation, getAnnotations, deleteAnnotation } from '../services/annotationService';

interface AnnotationToolProps {
  documentId: string;
  currentLang: Language;
  documentText?: string;
  onNavigateToCassation?: (query: string) => void;
  onNavigateToExplainLaw?: (query: string) => void;
}

export const AnnotationTool: React.FC<AnnotationToolProps> = ({
  documentId,
  currentLang,
  documentText = '',
  onNavigateToCassation,
  onNavigateToExplainLaw,
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<'all' | 'risk' | 'cross_ref' | 'pleading'>('all');
  const [copiedNoteId, setCopiedId] = useState<string | null>(null);

  // New Annotation Popover & Form State
  const [selectedText, setSelectedText] = useState('');
  const [selectedColor, setSelectedColor] = useState<'amber' | 'emerald' | 'cyan' | 'purple'>('amber');
  const [selectedTag, setSelectedTag] = useState<'risk' | 'compliance' | 'important' | 'cross_ref' | 'pleading'>('risk');
  const [noteContent, setNoteContent] = useState('');
  const [crossRefText, setCrossRefText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchDocAnnotations = async () => {
    if (!documentId) return;
    const list = await getAnnotations(documentId);
    setAnnotations(list);
  };

  useEffect(() => {
    fetchDocAnnotations();
  }, [documentId]);

  // Listen for text selection inside parent document container
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const txt = selection.toString().trim();
      if (txt.length >= 3) {
        setSelectedText(txt);
        // Position popover
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setPopoverPos({
            top: Math.max(10, rect.top - 60 + window.scrollY),
            left: Math.max(10, rect.left + window.scrollX),
          });
          setShowAddForm(true);
        } catch {
          setShowAddForm(true);
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleSaveAnnotation = async () => {
    if (!selectedText.trim() && !noteContent.trim()) return;

    const targetDocId = documentId || 'current-doc';
    await addAnnotation({
      documentId: targetDocId,
      selectedText: selectedText || documentText.substring(0, 80),
      color: selectedColor,
      content: noteContent || 'Wabii seeraa dhuunfaa.',
      crossReference: crossRefText,
      tag: selectedTag,
    });

    await fetchDocAnnotations();
    setShowAddForm(false);
    setSelectedText('');
    setNoteContent('');
    setCrossRefText('');
    setPopoverPos(null);
  };

  const handleDelete = async (id: string) => {
    await deleteAnnotation(id);
    await fetchDocAnnotations();
  };

  const filteredAnnotations = annotations.filter((ann) => {
    if (activeTagFilter === 'all') return true;
    if (activeTagFilter === 'risk') return ann.tag === 'risk' || ann.color === 'amber';
    if (activeTagFilter === 'cross_ref') return ann.tag === 'cross_ref' || ann.color === 'purple' || Boolean(ann.crossReference);
    if (activeTagFilter === 'pleading') return ann.tag === 'pleading' || ann.tag === 'compliance';
    return true;
  });

  const handleExportAnnotationsMarkdown = async () => {
    if (annotations.length === 0) return;
    const dateStr = new Date().toLocaleDateString();
    let md = `# YAA'A YAADOOLEEN SEERAA FI WABIILEEN DHUUNFAA (LEGAL ANNOTATIONS SUMMARY)\n`;
    md += `Guyyaa / Date: ${dateStr}\n`;
    md += `Baayyina Yaadotaa / Total Annotations: ${annotations.length}\n\n`;

    annotations.forEach((a, i) => {
      md += `### ${i + 1}. [${(a.tag || 'NOTE').toUpperCase()}] ${a.selectedText.substring(0, 60)}...\n`;
      md += `• **Barreeffama Fudhatame / Excerpt:** "${a.selectedText}"\n`;
      md += `• **Yaada Dhuunfaa / Legal Comment:** ${a.content}\n`;
      if (a.crossReference) md += `• **Wabii Seeraa / Cross-Reference:** ${a.crossReference}\n`;
      md += `\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      alert(currentLang === 'om' ? '📋 Yaadoni seeraa hundi waraabbatamaniiru! Word ykn Email keessatti paste gochuu dandeessu.' : '📋 Annotations exported to clipboard!');
    } catch {
      console.error('Copy failed');
    }
  };

  return (
    <div ref={containerRef} className="mt-6 space-y-4 text-left">
      {/* Selection Floating Popover Button */}
      {showAddForm && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/60 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 border-t-2 border-t-amber-400">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🖍️</span>
              <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wider">
                {currentLang === 'om' ? 'Yaada Seeraa & Wabii Dabaladhaa' : currentLang === 'am' ? 'የሕግ ማስታወሻና ዋቢ ይጨምሩ' : 'Add Legal Annotation & Cross-Reference'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[10px] text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800 cursor-pointer"
            >
              ✕ Cufi
            </button>
          </div>

          {/* Selected Text Excerpt Preview */}
          {selectedText && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-amber-200/90 font-serif line-clamp-2 italic">
              "{selectedText}"
            </div>
          )}

          {/* Color & Tag Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">
                Halluu (Highlight Color):
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'amber', label: '🟨 Risk', bg: 'bg-amber-500' },
                  { id: 'emerald', label: '🟩 Valid', bg: 'bg-emerald-500' },
                  { id: 'cyan', label: '🟦 Key', bg: 'bg-cyan-500' },
                  { id: 'purple', label: '🟪 Ref', bg: 'bg-purple-500' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id as any)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedColor === c.id
                        ? 'bg-slate-800 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">
                Tag / Category:
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[11px] text-amber-300 font-semibold cursor-pointer"
              >
                <option value="risk">🔥 Balaa Seeraa (High Risk)</option>
                <option value="compliance">📜 Seera-Qabeessa (Compliance)</option>
                <option value="important">⭐ Qabxii Ijoo (Important Note)</option>
                <option value="cross_ref">🔗 Wabii Seeraa (Cross-Reference)</option>
                <option value="pleading">⚖️ Falmii Mana Murtii (Pleading Strategy)</option>
              </select>
            </div>
          </div>

          {/* Form inputs */}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">
                Yaada Dhuunfaa (Private Comment/Note):
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Fkn: Keeyyata kana irratti waliigalteen DARA duratti galmaa'u qaba..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">
                Wabii Seeraa / Cassation Reference (Optional):
              </label>
              <input
                type="text"
                value={crossRefText}
                onChange={(e) => setCrossRefText(e.target.value)}
                placeholder="Fkn: Labsii 1156/2019 Keeyyata 27 ykn Galmee 18431..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-slate-200 cursor-pointer"
            >
              Dhiisi (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSaveAnnotation}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>Yaada Olkaa'i (Save Note)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Annotations Panel Header */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-lg">
              🖍️
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>
                  {currentLang === 'om'
                    ? 'Yaadolee Seeraa & Wabiilee Dhuunfaa'
                    : currentLang === 'am'
                    ? 'የሕግ ማስታወሻዎችና ድንጋጌዎች'
                    : 'Private Legal Annotations & Cross-References'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 font-mono border border-slate-800 font-bold">
                  {annotations.length} Notes
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentLang === 'om'
                  ? 'Barreeffama sanadaa keessaa cuqaasuun yaada dhuunfaa fi wabiilee seeraa dabaladhaa.'
                  : currentLang === 'am'
                  ? 'የተመረጡ ጥቅሶችን በማጉላት የግል ማስታወሻዎችንና የህግ ዋቢዎችን ያስቀምጡ።'
                  : 'Highlight document text to attach private comments, risk flags, and statutory references.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {annotations.length > 0 && (
              <button
                type="button"
                onClick={handleExportAnnotationsMarkdown}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Export all annotations as clean text summary for Word/Briefs"
              >
                <span>📥</span>
                <span>Export Notes</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedText(documentText.substring(0, 100));
                setShowAddForm(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Yaada Haaraa (Add Note)</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        {annotations.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTagFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTagFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hunda ({annotations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTagFilter('risk')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTagFilter === 'risk'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔥 Balaa (Risk)
            </button>
            <button
              type="button"
              onClick={() => setActiveTagFilter('cross_ref')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTagFilter === 'cross_ref'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔗 Wabiilee (Cross-Ref)
            </button>
            <button
              type="button"
              onClick={() => setActiveTagFilter('pleading')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTagFilter === 'pleading'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚖️ Falmii (Pleadings)
            </button>
          </div>
        )}

        {/* List of Annotations */}
        {filteredAnnotations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-1">
            <p>Yaadonni dhuunfaa qophaa'an hin jiran. Barreeffama sanadaa cuqaasuun dabaladhaa.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {filteredAnnotations.map((item) => {
              const colorBg =
                item.color === 'emerald'
                  ? 'border-emerald-500/50 bg-slate-950'
                  : item.color === 'cyan'
                  ? 'border-cyan-500/50 bg-slate-950'
                  : item.color === 'purple'
                  ? 'border-purple-500/50 bg-slate-950'
                  : 'border-amber-500/50 bg-slate-950';

              const badgeLabel =
                item.tag === 'risk'
                  ? '🔥 High Risk'
                  : item.tag === 'compliance'
                  ? '📜 Statutory Compliance'
                  : item.tag === 'important'
                  ? '⭐ Important'
                  : item.tag === 'cross_ref'
                  ? '🔗 Cross-Reference'
                  : '⚖️ Pleading Strategy';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border ${colorBg} space-y-2.5 transition-all shadow-sm hover:border-amber-400/80 group`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 border border-slate-800">
                        {badgeLabel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-500 hover:text-rose-400 text-xs p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                      title="Delete annotation"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Selected Excerpt */}
                  <blockquote className="p-2.5 rounded-xl bg-slate-900 border-l-2 border-l-amber-400 text-[11px] text-slate-200 font-serif italic line-clamp-3">
                    "{item.selectedText}"
                  </blockquote>

                  {/* Private Comment Note */}
                  <div className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/40 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">Yaada Dhuunfaa (Comment):</span>
                    <span>{item.content}</span>
                  </div>

                  {/* Cross-Reference Badge and Action Links */}
                  {item.crossReference && (
                    <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-purple-300 font-bold text-[11px]">
                        <span>🔗</span>
                        <span>Wabii Seeraa: {item.crossReference}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        {onNavigateToExplainLaw && (
                          <button
                            type="button"
                            onClick={() => onNavigateToExplainLaw(`Labsii ykn keeyyata ${item.crossReference} irratti ibsa guutuu fi keeyyattoota hojiirra jiran naaf dhiyeessi.`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/40 font-bold cursor-pointer"
                          >
                            📖 Seera Kana Qori
                          </button>
                        )}

                        {onNavigateToCassation && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCassation(item.crossReference || '')}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-semibold cursor-pointer"
                          >
                            🔍 Dhaddacha Ijoo Barbaadi
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

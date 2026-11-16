import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../i18n/translations';
import { Annotation, CommentReply } from '../services/storage';
import { 
  addAnnotation, 
  getAnnotations, 
  deleteAnnotation, 
  addCommentReply, 
  toggleAnnotationStatus 
} from '../services/annotationService';
import { useAuth } from '../context/AuthContext';
import { getActiveCourtSession } from '../services/courtInstitutionService';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  Tag, 
  User, 
  Sparkles, 
  CornerDownRight, 
  Check, 
  Trash2, 
  BookOpen, 
  Search, 
  Share2, 
  Download,
  AlertTriangle
} from 'lucide-react';

interface AnnotationToolProps {
  documentId: string;
  currentLang: Language;
  documentText?: string;
  onNavigateToCassation?: (query: string) => void;
  onNavigateToExplainLaw?: (query: string) => void;
}

const CONTRADICTION_KEYWORDS = ['contradiction', 'discrepancy', 'conflict', 'wal-faallessu', 'faallaa', 'ተቃርኖ', 'ልዩነት', 'hiifoo'];

export const AnnotationTool: React.FC<AnnotationToolProps> = ({
  documentId,
  currentLang,
  documentText = '',
  onNavigateToCassation,
  onNavigateToExplainLaw,
}) => {
  const { user, profile } = useAuth();
  const activeSession = getActiveCourtSession();

  // Author identity
  const currentAuthorName = 
    activeSession?.user?.fullName || 
    profile?.visitorName || 
    user?.displayName || 
    user?.email?.split('@')[0] || 
    'Ogeessa Seeraa (Legal Expert)';

  const currentAuthorRole = 
    activeSession?.user?.role || 
    profile?.legalRole || 
    'team_reviewer';

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<'all' | 'open' | 'resolved' | 'risk'>('all');

  // New Annotation Popover & Form State
  const [selectedText, setSelectedText] = useState('');
  const [selectedColor, setSelectedColor] = useState<'amber' | 'emerald' | 'cyan' | 'purple' | 'rose'>('amber');
  const [selectedTag, setSelectedTag] = useState<'risk' | 'compliance' | 'important' | 'cross_ref' | 'pleading'>('risk');
  const [noteContent, setNoteContent] = useState('');
  const [crossRefText, setCrossRefText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Reply Input State per Annotation ID
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

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
        setShowAddForm(true);
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
      content: noteContent || 'Yaada qorannoo seeraa fi mormii.',
      crossReference: crossRefText,
      tag: selectedTag,
      authorName: currentAuthorName,
      authorRole: currentAuthorRole,
      status: 'open',
      replies: [],
    });

    await fetchDocAnnotations();
    setShowAddForm(false);
    setSelectedText('');
    setNoteContent('');
    setCrossRefText('');
  };

  const handleAddReply = async (annotationId: string) => {
    const replyText = replyInputMap[annotationId];
    if (!replyText || !replyText.trim()) return;

    await addCommentReply(annotationId, {
      authorName: currentAuthorName,
      authorRole: currentAuthorRole,
      content: replyText.trim(),
    });

    setReplyInputMap((prev) => ({ ...prev, [annotationId]: '' }));
    setActiveReplyId(null);
    await fetchDocAnnotations();
  };

  const handleToggleStatus = async (annotationId: string) => {
    await toggleAnnotationStatus(annotationId, currentAuthorName);
    await fetchDocAnnotations();
  };

  const handleDelete = async (id: string) => {
    await deleteAnnotation(id);
    await fetchDocAnnotations();
  };

  const filteredAnnotations = annotations.filter((ann) => {
    if (activeTagFilter === 'all') return true;
    if (activeTagFilter === 'open') return ann.status !== 'resolved';
    if (activeTagFilter === 'resolved') return ann.status === 'resolved';
    if (activeTagFilter === 'risk') return ann.tag === 'risk' || ann.color === 'amber' || ann.color === 'rose';
    return true;
  });

  const handleExportAnnotationsMarkdown = async () => {
    if (annotations.length === 0) return;
    const dateStr = new Date().toLocaleDateString();
    let md = `# YAA'A YAADOOLEEN SEERAA Fi WAL-IYYANNOO GAREEE (COLLABORATIVE REVIEW SUMMARY)\n`;
    md += `Guyyaa / Date: ${dateStr}\n`;
    md += `Baayyina Yaadotaa / Total Comments: ${annotations.length}\n\n`;

    annotations.forEach((a, i) => {
      md += `### ${i + 1}. [${(a.tag || 'NOTE').toUpperCase()}] (${a.status === 'resolved' ? 'RESOLVED ✓' : 'OPEN'}) ${a.selectedText.substring(0, 60)}...\n`;
      md += `• **Barreeffama Fudhatame / Excerpt:** "${a.selectedText}"\n`;
      md += `• **Barreessaa / Author:** ${a.authorName || 'Ogeessa Seeraa'} (${a.authorRole || 'Reviewer'})\n`;
      md += `• **Yaada Seeraa / Legal Note:** ${a.content}\n`;
      if (a.crossReference) md += `• **Wabii Seeraa / Reference:** ${a.crossReference}\n`;

      if (a.replies && a.replies.length > 0) {
        md += `• **Deebii Gareee / Team Replies (${a.replies.length}):**\n`;
        a.replies.forEach((r) => {
          md += `   - **${r.authorName}**: ${r.content}\n`;
        });
      }
      md += `\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      alert(currentLang === 'om' ? '📋 Yaadoleen garee hundi waraabbatamaniiru! Word ykn Email keessatti paste gochuu dandeessu.' : '📋 Collaborative review summary exported to clipboard!');
    } catch {
      console.error('Copy failed');
    }
  };

  const isConflicting = CONTRADICTION_KEYWORDS.some(k => noteContent.toLowerCase().includes(k.toLowerCase()));

  return (
    <div ref={containerRef} className="mt-6 space-y-4 text-left">
      {/* Add Annotation / Comment Popover Modal */}
      {showAddForm && (
        <div className="p-5 rounded-3xl bg-slate-900 border-2 border-amber-500/60 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">💬</span>
              <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wider">
                {currentLang === 'om' 
                  ? 'Yaada Gareee & Wabii Seeraa Dabaladhaa (Add Collaborative Comment)' 
                  : currentLang === 'am' 
                  ? 'የቡድን አስተያየት እና የሕግ ማስታወሻ ይጨምሩ' 
                  : 'Add Team Review Comment & Legal Citation'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[10px] text-slate-400 hover:text-white font-bold px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
            >
              ✕ Cufi
            </button>
          </div>

          {/* Author Badge Banner */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Barreessaa: <strong className="text-amber-300">{currentAuthorName}</strong></span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px] uppercase">
              {currentAuthorRole}
            </span>
          </div>

          {/* Selected Text Excerpt Preview */}
          {selectedText && (
            <blockquote className="p-3 rounded-2xl bg-slate-950 border-l-4 border-l-amber-400 text-xs text-amber-200/90 font-serif italic line-clamp-3">
              "{selectedText}"
            </blockquote>
          )}

          {/* Color & Tag Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Halluu Qabxeesitoota (Highlight Tag):
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'amber', label: '🟨 Risk', bg: 'bg-amber-500' },
                  { id: 'rose', label: '🌹 Dispute', bg: 'bg-rose-500' },
                  { id: 'emerald', label: '🟩 Valid', bg: 'bg-emerald-500' },
                  { id: 'cyan', label: '🟦 Key', bg: 'bg-cyan-500' },
                  { id: 'purple', label: '🟪 Ref', bg: 'bg-purple-500' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
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
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Gosa Yaadaa (Category):
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-amber-300 font-bold cursor-pointer"
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
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Yaada Gareee / Review Comment:
              </label>
              <div className="space-y-2">
                {isConflicting && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-400 animate-pulse px-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{currentLang === 'om' ? 'Wal-faallessuun Argatame' : currentLang === 'am' ? 'ተቃርኖ ተገኝቷል' : 'Conflict Detected in Annotation'}</span>
                  </div>
                )}
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Yaada keessan barreesaa (Fkn: Keeyyata 27/2/a irratti mormiin dhiyaateera...)"
                  rows={3}
                  className={`w-full bg-slate-950 border rounded-2xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all ${
                    isConflicting
                      ? 'border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                      : 'border-slate-800 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Wabii Seeraa / Statutory Reference (Optional):
              </label>
              <input
                type="text"
                value={crossRefText}
                onChange={(e) => setCrossRefText(e.target.value)}
                placeholder="Fkn: Labsii 1156/2019 Keeyyata 27 ykn Galmee 18431..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold hover:text-slate-200 cursor-pointer"
            >
              Dhiisi (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSaveAnnotation}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Yaada Maxxansi (Post Comment)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Collaborative Comments Panel */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>
                  {currentLang === 'om'
                    ? 'Sirna Yaada & Mormii Gareee (Collaborative Review Comments)'
                    : currentLang === 'am'
                    ? 'የቡድን አስተያየት እና ይግባኝ መወያያ (Collaborative Comments)'
                    : 'Collaborative Document Comments & Team Review'}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30 font-bold">
                  {annotations.length} Threads
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Sanada irratti barreeffama cuqaasuun yaada dhuunfaa fi deebii gareee waliin kennuun murtii qulqulleessaa.'
                  : currentLang === 'am'
                  ? 'የተመረጡ ክፍሎችን በማጉላት ከቡድን አባላት ጋር ይወያዩ እና ይገምግሙ።'
                  : 'Highlight document text to leave contextual notes, reply to team members, and resolve review threads.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {annotations.length > 0 && (
              <button
                type="button"
                onClick={handleExportAnnotationsMarkdown}
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                title="Export all team comments as clean summary report"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Summary</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedText(documentText.substring(0, 100));
                setShowAddForm(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Yaada Haaraa (Add Note)</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        {annotations.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTagFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTagFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hunda ({annotations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTagFilter('open')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTagFilter === 'open'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟡 Kanneen Banaman ({annotations.filter((a) => a.status !== 'resolved').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTagFilter('resolved')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTagFilter === 'resolved'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 Kanneen Xumuraman ({annotations.filter((a) => a.status === 'resolved').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTagFilter('risk')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTagFilter === 'risk'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔥 High Risk
            </button>
          </div>
        )}

        {/* List of Collaborative Threads */}
        {filteredAnnotations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-3xl border border-slate-800 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-400 font-medium">Yaadonni gareee qophaa'an hin jiran. Barreeffama sanadaa cuqaasuun dabaladhaa.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {filteredAnnotations.map((item) => {
              const isResolved = item.status === 'resolved';
              const colorBg =
                item.color === 'emerald'
                  ? 'border-emerald-500/50 bg-slate-950/90'
                  : item.color === 'rose'
                  ? 'border-rose-500/50 bg-slate-950/90'
                  : item.color === 'cyan'
                  ? 'border-cyan-500/50 bg-slate-950/90'
                  : item.color === 'purple'
                  ? 'border-purple-500/50 bg-slate-950/90'
                  : 'border-amber-500/50 bg-slate-950/90';

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
                  className={`p-4 sm:p-5 rounded-3xl border ${colorBg} space-y-3 transition-all shadow-md ${
                    isResolved ? 'opacity-75 grayscale-[0.2]' : ''
                  }`}
                >
                  {/* Thread Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-slate-800">
                        {badgeLabel}
                      </span>

                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-200">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.authorName || 'Ogeessa Seeraa'}</span>
                        {item.authorRole && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {item.authorRole}
                          </span>
                        )}
                      </span>

                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Resolution Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isResolved ? 'Xumurameera (Resolved ✓)' : 'Banaadha (Resolve)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Delete comment thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Highlighted Document Excerpt */}
                  <blockquote className="p-3 rounded-2xl bg-slate-900/90 border-l-4 border-l-amber-400 text-xs text-slate-100 font-serif italic leading-relaxed">
                    "{item.selectedText}"
                  </blockquote>

                  {/* Primary Review Note */}
                  <div className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-amber-400 font-mono font-bold uppercase block">
                      Yaada Seeraa (Comment):
                    </span>
                    <p className="whitespace-pre-wrap">{item.content}</p>
                  </div>

                  {/* Statutory Cross-Reference */}
                  {item.crossReference && (
                    <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                        <span>🔗</span>
                        <span>Wabii Seeraa: {item.crossReference}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        {onNavigateToExplainLaw && (
                          <button
                            type="button"
                            onClick={() => onNavigateToExplainLaw(`Labsii ykn keeyyata ${item.crossReference} irratti ibsa guutuu naaf dhiyeessi.`)}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/40 font-bold cursor-pointer"
                          >
                            📖 Seera Kana Qori
                          </button>
                        )}

                        {onNavigateToCassation && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCassation(item.crossReference || '')}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-semibold cursor-pointer"
                          >
                            🔍 Dhaddacha Ijoo Barbaadi
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Thread Replies List */}
                  {item.replies && item.replies.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                        Deebii Gareee / Team Replies ({item.replies.length}):
                      </span>

                      {item.replies.map((rep) => (
                        <div key={rep.id} className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-xs space-y-1 ml-3 sm:ml-5">
                          <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                            <span className="flex items-center gap-1.5 text-amber-300">
                              <CornerDownRight className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{rep.authorName}</span>
                              {rep.authorRole && (
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 font-normal">
                                  {rep.authorRole}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-200 text-xs pl-4 leading-relaxed">{rep.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input Form */}
                  <div className="pt-2">
                    {activeReplyId === item.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={replyInputMap[item.id] || ''}
                          onChange={(e) => setReplyInputMap({ ...replyInputMap, [item.id]: e.target.value })}
                          placeholder="Deebii gareee barreesaa..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddReply(item.id);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddReply(item.id)}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1 shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Ergi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReplyId(null)}
                          className="px-2.5 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs rounded-xl cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveReplyId(item.id)}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer pt-1"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Deebii Kenni (Reply to thread)...</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

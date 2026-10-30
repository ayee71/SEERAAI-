import React, { useState, useEffect, useRef } from 'react';
import { Language, translations } from '../i18n/translations';
import {
  SharedDraft,
  SharedDraftComment,
  DraftCollaborator,
  ReviewerRole,
  getSharedDraftByToken,
  addCommentToSharedDraft,
  toggleCommentResolution,
  applyRevisionToDraft,
  sendCollaboratorPresence,
} from '../services/sharedDraftService';
import { PdfExportModal } from './PdfExportModal';
import { LegalCitationHighlighter } from './LegalCitationHighlighter';
import { SignatureRequestModal } from './SignatureRequestModal';
import { LegalMemoGeneratorModal } from './LegalMemoGeneratorModal';

interface SharedDraftWorkspaceProps {
  shareToken: string;
  currentLang: Language;
  onBack?: () => void;
  className?: string;
}

export const SharedDraftWorkspace: React.FC<SharedDraftWorkspaceProps> = ({
  shareToken,
  currentLang,
  onBack,
  className = '',
}) => {
  const t = translations[currentLang];

  const [draft, setDraft] = useState<SharedDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasscodeRequired, setIsPasscodeRequired] = useState(false);
  const [passcodeAttempt, setPasscodeAttempt] = useState('');

  // Comment Form State
  const [reviewerName, setReviewerName] = useState(() => {
    return localStorage.getItem('seera_reviewer_name') || 'Abukaattoo Gammachuu';
  });
  const [reviewerRole, setReviewerRole] = useState<ReviewerRole>('Advocate');
  const [commentText, setCommentText] = useState('');
  const [suggestedRevision, setSuggestedRevision] = useState('');
  const [statutoryReference, setStatutoryReference] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'resolved' | 'revisions'>('all');

  // Floating Selection Tooltip
  const [floatingTooltip, setFloatingTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const docContainerRef = useRef<HTMLDivElement>(null);

  // Active presence collaborators
  const [activeCollaborators, setActiveCollaborators] = useState<DraftCollaborator[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);

  // Initial Load & Passcode handler

  // Initial Load & Passcode handler
  const loadDraft = async (pin?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSharedDraftByToken(shareToken, pin);
      if (res.isPasswordProtected) {
        setIsPasscodeRequired(true);
        if (res.error) setError(res.error);
      } else if (res.draft) {
        setDraft(res.draft);
        setIsPasscodeRequired(false);
        setActiveCollaborators(res.draft.activeCollaborators || []);
      } else {
        setError(res.error || 'Draft not found');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading shared draft');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDraft();
  }, [shareToken]);

  // Real-time polling & presence heartbeat (every 4 seconds for simultaneous sync)
  useEffect(() => {
    if (!draft || isPasscodeRequired) return;

    const interval = setInterval(async () => {
      try {
        // 1. Send our presence
        const updatedCollabs = await sendCollaboratorPresence(shareToken, {
          name: reviewerName,
          role: reviewerRole,
        });
        if (updatedCollabs && updatedCollabs.length > 0) {
          setActiveCollaborators(updatedCollabs);
        }

        // 2. Fetch fresh comments and draft updates
        const res = await getSharedDraftByToken(shareToken, passcodeAttempt || undefined);
        if (res.draft) {
          setDraft((prev) => {
            if (!prev) return res.draft;
            // Only update if comments count changed or content changed
            if (
              prev.comments?.length !== res.draft?.comments?.length ||
              prev.content !== res.draft?.content ||
              prev.updatedAt !== res.draft?.updatedAt
            ) {
              return res.draft;
            }
            return prev;
          });
        }
      } catch (e) {
        // silent heartbeat error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [shareToken, draft?.id, reviewerName, reviewerRole, isPasscodeRequired, passcodeAttempt]);

  // Handle Text Selection in Document to anchor a comment
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setFloatingTooltip(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 4) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setFloatingTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        text,
      });
    } else {
      setFloatingTooltip(null);
    }
  };

  const handleAnchorCommentOnSelection = () => {
    if (floatingTooltip) {
      setSelectedQuote(floatingTooltip.text);
      setFloatingTooltip(null);
      // Scroll to comment form smoothly
      const formEl = document.getElementById('shared-draft-comment-form');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !draft) return;

    setIsSubmittingComment(true);
    localStorage.setItem('seera_reviewer_name', reviewerName);

    try {
      const res = await addCommentToSharedDraft(shareToken, {
        authorName: reviewerName,
        authorRole: reviewerRole,
        selectedText: selectedQuote || undefined,
        commentText,
        suggestedRevision: suggestedRevision.trim() || undefined,
        statutoryReference: statutoryReference.trim() || undefined,
      });

      if (res.success) {
        if (res.updatedDraft) {
          setDraft(res.updatedDraft);
        } else {
          setDraft((prev) => (prev ? { ...prev, comments: [...prev.comments, res.comment] } : null));
        }
        setCommentText('');
        setSuggestedRevision('');
        setStatutoryReference('');
        setSelectedQuote(null);
        setToastMessage(
          currentLang === 'om'
            ? '💬 Yaanni keessan galmeeffameera!'
            : currentLang === 'am'
            ? '💬 አስተያየትዎ በተሳካ ሁኔታ ተመዝግቧል!'
            : '💬 Comment added to shared draft!'
        );
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err: any) {
      setError(err?.message || 'Yaada dabalachuu hin dandeenye.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Toggle Resolve
  const handleToggleResolve = async (comment: SharedDraftComment) => {
    const newStatus = comment.status === 'resolved' ? 'open' : 'resolved';
    await toggleCommentResolution(shareToken, comment.id, newStatus);
    setDraft((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        comments: prev.comments.map((c) => (c.id === comment.id ? { ...c, status: newStatus } : c)),
      };
    });
  };

  // Apply Suggested Revision
  const handleApplyRevision = async (comment: SharedDraftComment) => {
    if (!comment.suggestedRevision || !draft) return;

    try {
      const res = await applyRevisionToDraft(
        shareToken,
        comment.id,
        comment.suggestedRevision,
        comment.selectedText
      );

      if (res.success) {
        setDraft((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            content: res.updatedContent,
            comments: prev.comments.map((c) => (c.id === comment.id ? { ...c, status: 'applied' } : c)),
          };
        });

        setToastMessage(
          currentLang === 'om'
            ? '⚡ Fooyya\'iinsi yaadaa sanada keessatti dabalameera!'
            : currentLang === 'am'
            ? '⚡ የቀረበው ማሻሻያ ወደ ሰነዱ ተካቷል!'
            : '⚡ Revision applied directly into draft!'
        );
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      console.error('Error applying revision:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <div className="text-3xl animate-spin">⏳</div>
        <span className="text-sm font-bold text-slate-200 block">
          {currentLang === 'om' ? 'Sanada Qoodame Fidaa Jira...' : currentLang === 'am' ? 'የተጋራውን ሰነድ በመጫን ላይ...' : 'Loading Shared Draft...'}
        </span>
        <span className="text-xs text-slate-500 font-mono">Token: {shareToken}</span>
      </div>
    );
  }

  // Passcode Protection Screen
  if (isPasscodeRequired) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-slate-900 border border-amber-500/40 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl mx-auto">
          🔒
        </div>
        <h3 className="text-lg font-bold text-white">
          {currentLang === 'om' ? 'Koodii Eegumsaa (Passcode Required)' : currentLang === 'am' ? 'የምስጢር ቁጥር ያስፈልጋል' : 'Passcode Protected Draft'}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          {currentLang === 'om'
            ? 'Sanadni kun iccitii ogeessa seeraatiin kan eegamedha. Maaloo koodii eegumsaa galchaa.'
            : currentLang === 'am'
            ? 'ይህ ሰነድ በምስጢር ቁጥር የተጠበቀ ነው። እባክዎ የምስጢር ቁጥሩን ያስገቡ።'
            : 'This draft is passcode-protected for attorney-client confidentiality. Please enter the access PIN.'}
        </p>

        {error && <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs">⚠️ {error}</div>}

        <div className="space-y-3">
          <input
            type="password"
            value={passcodeAttempt}
            onChange={(e) => setPasscodeAttempt(e.target.value)}
            placeholder="Passcode / PIN..."
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-center text-white focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => loadDraft(passcodeAttempt)}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg"
          >
            Bani (Unlock Draft)
          </button>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 border border-rose-500/30 text-center space-y-3">
        <div className="text-3xl">⚠️</div>
        <h3 className="text-base font-bold text-rose-300">{error || 'Draft not accessible'}</h3>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            Deebi'i (Back)
          </button>
        )}
      </div>
    );
  }

  const filteredComments = (draft.comments || []).filter((c) => {
    if (activeFilter === 'open') return c.status === 'open';
    if (activeFilter === 'resolved') return c.status === 'resolved';
    if (activeFilter === 'revisions') return !!c.suggestedRevision;
    return true;
  });

  const openCommentsCount = (draft.comments || []).filter((c) => c.status === 'open').length;

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-16 ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xl animate-in fade-in">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Selection Tooltip */}
      {floatingTooltip && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.max(10, floatingTooltip.y - 45)}px`,
            left: `${floatingTooltip.x}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={handleAnchorCommentOnSelection}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer border border-amber-300"
          >
            <span>💬</span>
            <span>{currentLang === 'om' ? 'Qabiyyee Kanaan Yaada Dabali' : currentLang === 'am' ? 'በተመረጠው ላይ አስተያየት ስጥ' : 'Comment on Selection'}</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Shared Token: {draft.shareToken}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                {draft.accessLevel === 'view_and_comment' ? '👀💬 View & Comment' : draft.accessLevel === 'co_edit' ? '✍️ Co-Edit' : '🔒 View Only'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {draft.viewsCount || 1} Views
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-serif-legal text-white">
              {draft.title}
            </h1>

            <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
              <span>Abbaa Sanadaa: <strong className="text-slate-200">{draft.originalAuthor}</strong> ({draft.authorRole})</span>
              <span>•</span>
              <span>Qoodame: {new Date(draft.createdAt).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                // Simplified share modal logic: just confirm the user is sharing a read-only link.
                // In a production app, we would ideally generate a *new* token for read-only access here if we were co-editing.
                // Given the current infrastructure, this link is the standard way to share access.
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                setToastMessage(
                  currentLang === 'om'
                    ? '🔗 Linkiin read-only koppii godhameera!'
                    : currentLang === 'am'
                    ? '🔗 የንባብ ብቻ ሊንክ ተቀድቷል!'
                    : '🔗 Read-only link copied to clipboard!'
                );
                setTimeout(() => setToastMessage(null), 3500);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <span>🔗</span>
              <span>{currentLang === 'om' ? 'Share (Read-only)' : currentLang === 'am' ? 'አጋራ (ለማንበብ ብቻ)' : 'Share (Read-only)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span>✍️</span>
              <span>Sign</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMemoModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span>📝</span>
              <span>Memo</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <span>📥</span>
              <span>PDF</span>
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ←
              </button>
            )}
          </div>
        </div>

        {/* Real-time Presence & Active Reviewers Bar */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ogeessota Amma Hordofaa Jiran (Active Reviewers):</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeCollaborators.length > 0 ? (
                activeCollaborators.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950 border text-slate-200 flex items-center gap-1"
                    style={{ borderColor: c.color || '#f59e0b' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color || '#f59e0b' }} />
                    <span>{c.name}</span>
                    <span className="text-[9px] text-slate-400 font-normal">({c.role})</span>
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic text-[11px]">Si qofatu jira</span>
              )}
            </div>
          </div>

          <span className="text-[11px] text-amber-300/80 font-mono">
            ⚡ Real-time Multi-User Sync Active
          </span>
        </div>
      </div>

      {/* 2-Column Split Workspace: Document Draft (Left) & Comments Thread (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document Draft Body */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span>📄</span>
                <span>Qabiyyee Sanadaa (Draft Text)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Barreeffama filachuun yaada kennuu dandeessu
              </span>
            </div>

            {/* Document Content with selection listener */}
            <div
              ref={docContainerRef}
              onMouseUp={handleTextSelection}
              onTouchEnd={handleTextSelection}
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap legal-content-body select-text selection:bg-amber-500/30 selection:text-amber-200 min-h-[420px]"
            >
              <LegalCitationHighlighter text={draft.content} currentLang={currentLang} />
            </div>
          </div>
        </div>

        {/* Right: Live Collaborative Comments & Revision Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Comments Filter & Stats Header */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>💬</span>
                <span>Yaada & Fooyya'iinsa ({draft.comments?.length || 0})</span>
              </span>
              {openCommentsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {openCommentsCount} Open
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              {(['all', 'open', 'resolved', 'revisions'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveFilter(mode)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeFilter === mode
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'all' ? 'Hunda' : mode === 'open' ? 'Banamoo' : mode === 'resolved' ? 'Kan Furaman' : 'Fooyya\'iinsa'}
                </button>
              ))}
            </div>
          </div>

          {/* List of Comments */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredComments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
                <span className="text-2xl block">💭</span>
                <span className="text-xs font-bold text-slate-300 block">
                  {currentLang === 'om' ? 'Yaanni Seeraa Hin Jiru' : currentLang === 'am' ? 'ምንም አስተያየት የለም' : 'No comments in this filter'}
                </span>
                <p className="text-[11px] text-slate-500">
                  Barreeffama sanadaa keessaa filachuun ykn formii armaan gadiitiin yaada keessan barreessaa.
                </p>
              </div>
            ) : (
              filteredComments.map((comment) => {
                const isResolved = comment.status === 'resolved';
                const isApplied = comment.status === 'applied';

                return (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isApplied
                        ? 'bg-emerald-950/40 border-emerald-500/40'
                        : isResolved
                        ? 'bg-slate-950/60 border-slate-800 opacity-75'
                        : 'bg-slate-900 border-amber-500/30 shadow-md'
                    }`}
                  >
                    {/* Author & Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
                          {comment.authorName.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block leading-tight">
                            {comment.authorName}
                          </span>
                          <span className="text-[10px] text-amber-400/80 font-mono">
                            {comment.authorRole}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isApplied && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-500/40">
                            ✓ Applied
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleResolve(comment)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
                            isResolved
                              ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900'
                          }`}
                        >
                          {isResolved ? 'Reopen' : '✓ Resolve'}
                        </button>
                      </div>
                    </div>

                    {/* Quoted target text */}
                    {comment.selectedText && (
                      <div className="p-2 rounded-lg bg-slate-950 border-l-2 border-amber-400 text-[11px] text-slate-300 font-mono italic">
                        "{comment.selectedText}"
                      </div>
                    )}

                    {/* Main comment text */}
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {comment.commentText}
                    </p>

                    {/* Statutory reference if specified */}
                    {comment.statutoryReference && (
                      <div className="text-[10px] text-amber-300/90 font-mono flex items-center gap-1">
                        <span>📜</span>
                        <span>{comment.statutoryReference}</span>
                      </div>
                    )}

                    {/* Suggested Revision Box */}
                    {comment.suggestedRevision && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                        <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">
                          Fooyya'iinsa Yaaddame (Suggested Text Replacement):
                        </span>
                        <div className="text-xs text-emerald-200 font-mono bg-slate-900 p-2 rounded border border-slate-800">
                          {comment.suggestedRevision}
                        </div>

                        {!isApplied && draft.accessLevel !== 'view_only' && (
                          <button
                            type="button"
                            onClick={() => handleApplyRevision(comment)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
                          >
                            <span>⚡</span>
                            <span>Sanada Keessatti Dabali (Accept & Apply)</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="text-[9px] text-slate-500 pt-1">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form to Add New Comment */}
          {draft.accessLevel !== 'view_only' && (
            <form
              id="shared-draft-comment-form"
              onSubmit={handleAddComment}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>✍️</span>
                  <span>Yaada & Fooyya'iinsa Haaraa Dabali</span>
                </span>
                {selectedQuote && (
                  <button
                    type="button"
                    onClick={() => setSelectedQuote(null)}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    ✕ Quoted Text Haqi
                  </button>
                )}
              </div>

              {/* Selected quote preview in form */}
              {selectedQuote && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-[11px] text-amber-200 font-mono">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Qabiyyee Filatame:</span>
                  "{selectedQuote}"
                </div>
              )}

              {/* Reviewer Name and Role */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Maqaa keessan..."
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
                <select
                  value={reviewerRole}
                  onChange={(e) => setReviewerRole(e.target.value as ReviewerRole)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Advocate">Abukaattoo (Advocate)</option>
                  <option value="Judge">Abbaa Seeraa (Judge)</option>
                  <option value="Legal Scholar">Hayyuu Seeraa</option>
                  <option value="Client">Maamila (Client)</option>
                </select>
              </div>

              {/* Comment Body */}
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Gorsa seeraa, balaa adda bahe, ykn yaada keessan asitti barreessaa..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed"
                required
              />

              {/* Optional Statutory Reference & Suggested Replacement */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={statutoryReference}
                  onChange={(e) => setStatutoryReference(e.target.value)}
                  placeholder="Labsii ykn Keeyyata Seeraa (fkn: SDFHH Kwt 244, Koodii Siiviilii 1723)..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />

                <textarea
                  rows={2}
                  value={suggestedRevision}
                  onChange={(e) => setSuggestedRevision(e.target.value)}
                  placeholder="[Filannoo] Barreeffama fooyya'ee bakka bu'uu qabu (Suggested replacement text)..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingComment || !commentText.trim()}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>{isSubmittingComment ? '⏳ Galmeessaa Jira...' : '💬 Yaada Seeraa Ergi (Post Comment)'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* PDF Export Modal */}
      {showPdfModal && draft && (
        <PdfExportModal
          isOpen={showPdfModal}
          currentLang={currentLang}
          title={`Shared Draft: ${draft.title}`}
          content={`${draft.content}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nYAADA FI GORSA OGEESSOTA SEERAA (LEGAL PEER COMMENTS):\n${draft.comments
            ?.map(
              (c, i) =>
                `${i + 1}. [${c.authorName} - ${c.authorRole}]: ${c.commentText} ${
                  c.statutoryReference ? `(Madda: ${c.statutoryReference})` : ''
                }`
            )
            .join('\n')}`}
          taskType="contract"
          outputLanguages={[currentLang]}
          onClose={() => setShowPdfModal(false)}
        />
      )}
      {showMemoModal && draft && (
        <LegalMemoGeneratorModal
          isOpen={showMemoModal}
          onClose={() => setShowMemoModal(false)}
          draft={draft}
        />
      )}
      {showSignatureModal && draft && (
        <SignatureRequestModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          draft={draft}
          onSuccess={(updated) => setDraft(updated)}
        />
      )}
    </div>
  );
};

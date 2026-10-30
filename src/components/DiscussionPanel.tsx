import React, { useState, useEffect } from 'react';
import {
  subscribeToComments,
  addComment,
  updateDiscussion,
  DiscussionComment,
  MeetingData,
  generateSecureMeetingRoom,
  getOrCreateDiscussionId,
  addCollaborationInvite,
  getLocalInvites,
  CollaborationInvite,
} from '../services/discussionService';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Phone,
  MessageCircle,
  Send,
  Video,
  UserPlus,
  Copy,
  Check,
  ShieldCheck,
  AtSign,
  Sparkles,
  ExternalLink,
  Clock,
  Maximize2,
  X,
  Share2,
  Trash2,
} from 'lucide-react';

interface DiscussionPanelProps {
  targetId: string;
  title?: string;
}

export const DiscussionPanel: React.FC<DiscussionPanelProps> = ({ targetId, title }) => {
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [discussionId, setDiscussionId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [customMeetingTopic, setCustomMeetingTopic] = useState('');
  const [activeEmbeddedMeetingUrl, setActiveEmbeddedMeetingUrl] = useState<string | null>(null);
  const [meetingInsertedSuccess, setMeetingInsertedSuccess] = useState<string | null>(null);

  // Invite Collaborator State
  const [collaboratorHandle, setCollaboratorHandle] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState<'editor' | 'reviewer' | 'viewer'>('editor');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedMeetingUrl, setCopiedMeetingUrl] = useState<string | null>(null);
  const [invites, setInvites] = useState<CollaborationInvite[]>([]);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<DiscussionComment | null>(null);

  const { user, profile } = useAuth();
  const commentsRef = React.useRef<DiscussionComment[]>([]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    const init = async () => {
      const id = await getOrCreateDiscussionId(targetId);
      setDiscussionId(id);
      setInvites(getLocalInvites(targetId));
    };
    init();

    const unsubscribe = subscribeToComments(targetId, (newComments) => {
      if (newComments.length > commentsRef.current.length && commentsRef.current.length > 0) {
        window.dispatchEvent(
          new CustomEvent('seera:discussion_toast', {
            detail: {
              title: 'Marii & Yaada Haaraa',
              summary: 'Yaanni haaraan dabaltii qabiyyee seeraa irratti laatameera.',
              category: 'labor',
            },
          })
        );
      }
      setComments(newComments);
    });
    return () => unsubscribe();
  }, [targetId]);

  const currentAuthorName =
    profile?.visitorName || profile?.appUsername || user?.displayName || 'Ogeessa Seeraa (Legal Professional)';
  const currentAuthorHandle = profile?.appUsername
    ? `@${profile.appUsername}`
    : `@${(user?.email || 'lawyer').split('@')[0]}`;

  const handleSend = async () => {
    if (!text.trim() || !user) return;

    // Detect tagged @handles in comment
    const taggedMatches = text.match(/@[a-zA-Z0-9_]+/g) || [];
    const taggedHandles = Array.from(new Set(taggedMatches));

    await addComment({
      targetId,
      authorId: user.uid,
      authorName: currentAuthorName,
      authorHandle: currentAuthorHandle,
      text: text.trim(),
      taggedHandles,
      createdAt: null,
    });
    setText('');
  };

  /**
   * Generates a temporary secure video conferencing meeting link
   * and automatically inserts it into the current chat thread as a clickable element.
   */
  const handleGenerateAndInsertMeetingLink = async (customTopic?: string) => {
    const effectiveTopic =
      customTopic?.trim() ||
      customMeetingTopic.trim() ||
      (title ? `Marii Wixinee Seeraa: ${title}` : 'Marii Wixinee Seeraa (Live Legal Draft Session)');

    // Generate secure temporary room
    const meetingData: MeetingData = generateSecureMeetingRoom(targetId, effectiveTopic, 2);
    setMeetingLink(meetingData.meetingUrl);

    // Rich message text representation
    const messageText = `📹 [Walgahii Viidiyoo Seeraa / Live Video Meeting]\n"${effectiveTopic}"\nLinkii: ${meetingData.meetingUrl}`;

    // Tag current user or author
    const taggedHandles = [currentAuthorHandle];

    // Automatically insert into active discussion thread
    await addComment({
      targetId,
      authorId: user?.uid || 'guest_user',
      authorName: currentAuthorName,
      authorHandle: currentAuthorHandle,
      text: messageText,
      taggedHandles,
      meetingData,
      createdAt: null,
    });

    if (discussionId) {
      updateDiscussion(discussionId, {
        latestMeetingUrl: meetingData.meetingUrl,
        latestMeetingTopic: effectiveTopic,
        updatedAt: new Date().toISOString(),
      });
    }

    setMeetingInsertedSuccess(
      `✓ Linkiin walgahii viidiyoo uumamee kallattiin marii keessatti qoodameera! (Meeting link inserted into discussion thread)`
    );
    setShowMeetingModal(false);
    setCustomMeetingTopic('');
    setTimeout(() => setMeetingInsertedSuccess(null), 5000);
  };

  const handleGenerateCollaborationLink = async () => {
    const handleClean = collaboratorHandle.trim().replace(/^@/, '');
    const handleFormatted = handleClean ? `@${handleClean}` : 'collaborator';
    const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const secureLink = `${baseUrl}?tab=discussion&targetId=${encodeURIComponent(
      targetId
    )}&collabToken=${token}&handle=${encodeURIComponent(handleFormatted)}&role=${collaboratorRole}`;

    setGeneratedLink(secureLink);

    const inviteObj: CollaborationInvite = {
      targetId,
      inviterId: user?.uid || 'user',
      inviterName: currentAuthorName,
      invitedHandle: handleFormatted,
      role: collaboratorRole,
      token,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    await addCollaborationInvite(inviteObj);
    setInvites(getLocalInvites(targetId));

    setInviteSuccessMsg(`Linkiin tumsaa gabaabaa fi amansiisaa (${handleFormatted}) qophaa'eera!`);
    setTimeout(() => setInviteSuccessMsg(null), 4000);
  };

  const handleCopyLink = async (linkToCopy?: string) => {
    const targetLink = linkToCopy || generatedLink || window.location.href;
    await navigator.clipboard.writeText(targetLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleCopyMeetingLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedMeetingUrl(url);
    setTimeout(() => setCopiedMeetingUrl(null), 2500);
  };

  const shareMeetingOnSocial = (platform: 'telegram' | 'whatsapp' | 'sms', url: string, topic?: string) => {
    const textMsg = `Walgahii Viidiyoo Seeraa Battalaa (SEERAAI Legal Video Consultation):\n"${topic || 'Marii Sanada Seeraa'}"\nLinkii seenaa: ${url}`;
    if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(textMsg)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`, '_blank');
    } else {
      window.open(`sms:?body=${encodeURIComponent(textMsg)}`, '_blank');
    }
  };

  const shareInvite = (platform: 'phone' | 'fb' | 'telegram' | 'whatsapp') => {
    const link = generatedLink || meetingLink || window.location.href;
    const msg = `Marii Seeraa fi Tumsa Draft SeeraAI (SAI Ethio) irratti hirmaadhaa!\nLinkii tumsaa amansiisaa: ${link}`;

    if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    } else if (platform === 'phone') {
      window.open(`sms:?body=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
    }
  };

  const handleShareDiscussion = async () => {
    await navigator.clipboard.writeText(window.location.href);
    window.dispatchEvent(
      new CustomEvent('seera:discussion_toast', {
        detail: {
          title: 'Linkii Marii Qoodame',
          summary: 'Linkiin marii kanaa koppii ta\'eera. (Discussion link copied to clipboard)',
          category: 'labor',
        },
      })
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
            💬
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300 font-serif-legal">
              Marii & Tumsa Wixinee (Discussion & Live Collaboration)
            </h3>
            <p className="text-[11px] text-slate-400 truncate max-w-sm">
              {title || `Session ID: ${targetId}`}
            </p>
          </div>
        </div>

        {/* Header Action Buttons: Generate Meeting Link & Invite */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleGenerateAndInsertMeetingLink()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md border border-emerald-400/30"
            title="Generate a secure temporary video meeting room and insert it into chat"
          >
            <Video className="w-3.5 h-3.5" />
            <span>📹 Walgahii Viidiyoo Uumi (Generate Meeting Link)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInviteOptions(!showInviteOptions)}
            className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showInviteOptions ? 'Cufi' : 'Tumsaa Affeeri'}</span>
          </button>
          <button
            type="button"
            onClick={handleShareDiscussion}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border border-slate-700"
            title="Qoodi (Share) - Linkii marii kanaa qoodi"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Qoodi</span>
          </button>
        </div>
      </div>

      {/* Success Notification for Meeting Link Insertion */}
      {meetingInsertedSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{meetingInsertedSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setMeetingInsertedSuccess(null)}
            className="text-emerald-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Invite Collaborator Section */}
      {showInviteOptions && (
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Affeerraa Tumsaa Amansiisaa (Invite Collaborator via Handle):</span>
            </span>
            <span className="text-[10px] text-amber-400/90 font-mono">App Handle / Username</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 relative">
              <AtSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="App Handle (fkn: @ayele_lawyer ykn email...)"
                value={collaboratorHandle}
                onChange={(e) => setCollaboratorHandle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={collaboratorRole}
              onChange={(e) => setCollaboratorRole(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="editor">Editor (Gulaalaa)</option>
              <option value="reviewer">Reviewer (Madaalaa)</option>
              <option value="viewer">Viewer (Dubbisaa)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerateCollaborationLink}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Linkii Tumsaa Amansiisaa Uumi (Generate Secure Link)</span>
          </button>

          {inviteSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{inviteSuccessMsg}</span>
            </div>
          )}

          {generatedLink && (
            <div className="p-3 bg-slate-900 rounded-xl border border-sky-500/40 space-y-2">
              <span className="text-[10px] text-slate-400 block font-mono">Linkii Tumsaa Qophaa'e:</span>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-[11px] font-mono text-sky-300 truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(generatedLink)}
                  className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Koppii!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Social Share Buttons */}
          <div className="pt-1 space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">
              Qoodi (Share Link):
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => shareInvite('telegram')}
                className="px-3 py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-xs font-semibold flex items-center gap-1.5 border border-sky-700/50 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>Telegram</span>
              </button>
              <button
                type="button"
                onClick={() => shareInvite('whatsapp')}
                className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 border border-emerald-700/50 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => shareInvite('phone')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>SMS / Phone</span>
              </button>
            </div>
          </div>

          {/* List of Active/Pending Invites */}
          {invites.length > 0 && (
            <div className="pt-2 space-y-1.5 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-mono block">
                Miseensota Affeeraman ({invites.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {invites.map((inv, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-sky-300 flex items-center gap-1"
                  >
                    <span>👥 {inv.invitedHandle}</span>
                    <span className="text-[9px] text-slate-500">({inv.role})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discussion Comments List */}
      <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
        {comments.length > 0 ? (
          comments.map((comment) => {
            const isMeeting = Boolean(
              comment.meetingData ||
                (comment.text && (comment.text.includes('meet.jit.si') || comment.text.includes('[Walgahii Viidiyoo')))
            );

            const meetingUrl =
              comment.meetingData?.meetingUrl ||
              (comment.text.match(/https:\/\/meet\.jit\.si\/[^\s\n]+/)?.[0] ?? '');

            const meetingTopic =
              comment.meetingData?.topic ||
              (comment.text.match(/"([^"]+)"/)?.[1] ?? 'Marii Sanada Seeraa (Legal Draft Consultation)');

            return (
              <div
                key={comment.id}
                className={`p-4 rounded-2xl border transition-all text-xs animate-in fade-in duration-150 ${
                  isMeeting
                    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-emerald-500/40 shadow-lg ring-1 ring-emerald-500/20'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                {/* Author row */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{comment.authorName}</span>
                    {comment.authorHandle && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                        {comment.authorHandle}
                      </span>
                    )}
                    {isMeeting && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Live Meeting</span>
                      </span>
                    )}
                  </div>
                  {comment.createdAt && (
                    <span className="text-[9px] font-mono text-slate-500">
                      {typeof comment.createdAt === 'string'
                        ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </span>
                  )}
                </div>

                {/* If this is a meeting link message, render rich interactive clickable element */}
                {isMeeting && meetingUrl ? (
                  <div className="space-y-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold">
                              Walgahii Viidiyoo Seeraa Battalaa / የቀጥታ ስብሰባ / Live Legal Video Session
                            </div>
                            <div className="font-bold text-slate-100 text-xs sm:text-sm mt-0.5">
                              {meetingTopic}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>Yeroo Murtaa'e (2h)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>🔒 Jitsi Encrypted Mesh</span>
                        <span>•</span>
                        <span>Browsariin Seena (No install needed)</span>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Primary Clickable Join Button */}
                        <a
                          href={meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer border border-emerald-400/40"
                        >
                          <Video className="w-4 h-4" />
                          <span>🎥 Walgahii Seenaa (Join Video Meeting)</span>
                          <ExternalLink className="w-3 h-3 text-emerald-200" />
                        </a>

                        {/* In-App Embed Button */}
                        <button
                          type="button"
                          onClick={() => setActiveEmbeddedMeetingUrl(meetingUrl)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs flex items-center gap-1.5 border border-sky-500/30 cursor-pointer"
                          title="Open meeting inside SEERAAI without leaving page"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Asumatti Bani (In-App)</span>
                        </button>

                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyMeetingLink(meetingUrl)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                        >
                          {copiedMeetingUrl === meetingUrl ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Koppii Ta'eera!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Koppii Linkii</span>
                            </>
                          )}
                        </button>

                        {/* Social share */}
                        <button
                          type="button"
                          onClick={() => shareMeetingOnSocial('telegram', meetingUrl, meetingTopic)}
                          className="p-2 rounded-xl bg-sky-900/40 hover:bg-sky-800 text-sky-300 border border-sky-700/40 cursor-pointer"
                          title="Share to Telegram"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => shareMeetingOnSocial('whatsapp', meetingUrl, meetingTopic)}
                          className="p-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/40 cursor-pointer"
                          title="Share to WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                )}

                {comment.taggedHandles && comment.taggedHandles.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {comment.taggedHandles.map((h, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs italic space-y-2 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <span className="text-2xl block">💬</span>
            <p>Yaanni marii fi tumsaa dhimma kana irratti kenname hin jiru.</p>
            <p className="text-[11px] text-slate-600">
              Wixinee seeraa irratti yaada kennuuf yookiin walgahii viidiyoo uumuuf qophiidha!
            </p>
          </div>
        )}
      </div>

      {/* Quick Handle Tag Chips & Quick Meeting Creator Button */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <span className="shrink-0 text-slate-500">Tag (@):</span>
          {['@colleague', '@advocate', '@judge', '@reviewer'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setText((prev) => `${prev} ${chip} `)}
              className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 hover:text-amber-300 cursor-pointer shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Quick Meeting Button directly beside tags */}
        <button
          type="button"
          onClick={() => setShowMeetingModal(true)}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer shrink-0"
          title="Customize Meeting Agenda & Insert Link"
        >
          <Video className="w-3 h-3 text-emerald-400" />
          <span>+ Mata Dureen Uumi (With Agenda)</span>
        </button>
      </div>

      {/* Comment Input & Meeting Trigger */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleGenerateAndInsertMeetingLink()}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow transition-all cursor-pointer shrink-0 border border-emerald-400/30"
          title="1-Click: Generate Meeting Link & insert directly into chat thread"
        >
          <Video className="w-4 h-4" />
          <span className="hidden sm:inline">Meeting</span>
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Yaada marii keessan barreessaa... (@handle fayyadamaa)"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />

        <button
          type="button"
          onClick={handleSend}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ergi</span>
        </button>
      </div>

      {/* Modal to customize Meeting Agenda before generation */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Video className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-100 text-sm font-serif-legal">
                  Walgahii Viidiyoo Seeraa Uumi (Generate Video Meeting)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Walgahiin viidiyoo amansiisaa fi yeroo murtaa'e (temporary encrypted session) wixinee kanaaf qophaa'ee
              kallattiin marii keessatti qoodama.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Mata-Duree Walgahii (Meeting Agenda / Topic):
              </label>
              <input
                type="text"
                placeholder={title || 'fkn: Marii Keewwata 1679 & 1731...'}
                value={customMeetingTopic}
                onChange={(e) => setCustomMeetingTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div>🔒 Dhaabbata: Jitsi Secure Encrypted Web Mesh</div>
              <div>⏱️ Yeroo Tursiisa: Sa'aatii 2 (2 Hours active)</div>
              <div>👥 Hirmaattota: Murtaa'ina hin qabu (Unlimited)</div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Haqi (Cancel)
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAndInsertMeetingLink(customMeetingTopic)}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Uumi & Qoodi (Generate & Share)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded In-App Video Conference Modal */}
      {activeEmbeddedMeetingUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-4 py-3 shrink-0 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-slate-100 text-xs sm:text-sm font-serif-legal">
                SEERAAI Live Legal Video Conference
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                In-App Session
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeEmbeddedMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-mono flex items-center gap-1 border border-slate-700"
              >
                <span>Foddaa Haaraa</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setActiveEmbeddedMeetingUrl(null)}
                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-pointer"
                title="Cufi (Close)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative">
            <iframe
              src={activeEmbeddedMeetingUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full border-0"
              title="SEERAAI Video Consultation Room"
            />
          </div>
        </div>
      )}
    </div>
  );
};

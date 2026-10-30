import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { createSharedDraft } from '../services/sharedDraftService';
import { auth } from '../services/firebase';

interface ShareDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  title?: string;
  content?: string;
  documentTitle?: string;
  documentContent?: string;
  taskType?: string;
}

export const ShareDraftModal: React.FC<ShareDraftModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  title,
  content,
  documentTitle,
  documentContent,
  taskType,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');

  const activeTitle = title || documentTitle || 'Legal Draft';
  const activeContent = content || documentContent || '';

  if (!isOpen) return null;

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);
    try {
      const { shareUrl } = await createSharedDraft({
        title: activeTitle,
        content: activeContent,
        authorName: auth.currentUser?.displayName || 'Ogeessa Seeraa',
        passcode: passcode.trim() || undefined,
        accessLevel: 'view_and_comment',
        taskType: taskType as any,
      });
      setShareUrl(shareUrl);
    } catch (err: any) {
      setError(err.message || 'Share failed');
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied!');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
        <h2 className="text-xl font-bold text-slate-100">Share Document Draft</h2>
        <p className="text-sm text-slate-400">
          Generates a unique, secure link for colleagues to view and comment on this draft.
        </p>

        {!shareUrl && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase">PIN / Passcode (Optional)</label>
            <input 
              type="text" 
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              placeholder="e.g. 1234 (highly recommended for security)"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {shareUrl ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4">
              <span className="text-xs text-emerald-400 truncate">{shareUrl}</span>
              <button onClick={copyToClipboard} className="text-emerald-500 font-bold text-xs cursor-pointer">Copy</button>
            </div>
            <button onClick={onClose} className="w-full py-3 bg-slate-800 rounded-xl text-slate-100 text-sm font-bold">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <div className="text-rose-400 text-xs">{error}</div>}
            <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-3 bg-slate-800 rounded-xl text-slate-100 text-sm font-bold">Cancel</button>
              <button onClick={handleShare} disabled={isSharing} className="flex-1 py-3 bg-amber-500 rounded-xl text-slate-950 text-sm font-bold">
                {isSharing ? 'Sharing...' : 'Generate Secure Link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

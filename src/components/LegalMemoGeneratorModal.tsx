import React from 'react';
import { SharedDraft } from '../services/sharedDraftService';

interface LegalMemoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: SharedDraft;
}

export const LegalMemoGeneratorModal: React.FC<LegalMemoGeneratorModalProps> = ({ isOpen, onClose, draft }) => {
  if (!isOpen) return null;

  const memoContent = `
# LEGAL MEMO: ${draft.title}

## Summary
Document Draft compiled on ${new Date().toLocaleDateString()}.

## Content
${draft.content}

## Active Comments
${draft.comments.map(c => `- [${c.authorName}]: ${c.commentText} ${c.statutoryReference ? `(Reference: ${c.statutoryReference})` : ''}`).join('\n')}

## Signatures
${draft.signatures?.map(s => `- ${s.name} on ${new Date(s.signedAt).toLocaleDateString()}`).join('\n') || 'No signatures yet.'}
  `;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white">Generated Legal Memo</h3>
        <pre className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 font-mono whitespace-pre-wrap">{memoContent}</pre>
        <div className="flex gap-2">
            <button onClick={() => {navigator.clipboard.writeText(memoContent);}} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Copy to Clipboard</button>
            <button onClick={onClose} className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">Close</button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { SignaturePad } from './SignaturePad';
import { addSignatureToSharedDraft, SharedDraft } from '../services/sharedDraftService';

interface SignatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: SharedDraft;
  onSuccess: (updatedDraft: SharedDraft) => void;
}

export const SignatureRequestModal: React.FC<SignatureRequestModalProps> = ({ isOpen, onClose, draft, onSuccess }) => {
  const [signatureData, setSignatureData] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveSignature = async (data: string) => {
    const signature = {
      userId: 'current_user', // Mocked userId
      name: 'User Name', // Mocked name
      signatureData: data,
      signedAt: new Date().toISOString(),
    };
    const success = await addSignatureToSharedDraft(draft.shareToken, signature);
    if (success) {
        // Need to update the local draft state
        onSuccess({ ...draft, signatures: [...(draft.signatures || []), signature] });
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-bold text-white">Sign Document</h3>
        <SignaturePad onSave={handleSaveSignature} onClear={() => setSignatureData(null)} />
        <button onClick={onClose} className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">Cancel</button>
      </div>
    </div>
  );
};

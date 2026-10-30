import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onClear: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigCanvas.current?.clear();
    onClear();
  };

  const save = () => {
    if (sigCanvas.current) {
      onSave(sigCanvas.current.toDataURL());
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-700 rounded-xl bg-slate-950">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="white"
          canvasProps={{ width: 400, height: 200, className: 'sigCanvas' }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={clear}
          className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
        >
          Clear
        </button>
        <button
          onClick={save}
          className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};

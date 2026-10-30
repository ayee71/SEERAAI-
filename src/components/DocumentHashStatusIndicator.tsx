import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, Lock, Info } from 'lucide-react';
import { HashVerificationResult } from '../services/documentHashVerificationService';

interface DocumentHashStatusIndicatorProps {
  documentId: string;
  isVerifying?: boolean;
  result?: HashVerificationResult | null;
  size?: 'xs' | 'sm' | 'md';
  showDetailsPopover?: boolean;
  className?: string;
}

export const DocumentHashStatusIndicator: React.FC<DocumentHashStatusIndicatorProps> = ({
  documentId,
  isVerifying = false,
  result,
  size = 'xs',
  showDetailsPopover = true,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  if (isVerifying) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse ${className}`}
        title="Checking document cryptographic hash against server's known good registry..."
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
        <span>Verifying SHA-256...</span>
      </span>
    );
  }

  if (result && result.isVerified) {
    const shortHash = result.expectedHash
      ? `${result.expectedHash.substring(0, 6)}...${result.expectedHash.substring(result.expectedHash.length - 4)}`
      : 'SHA-256';

    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition-colors cursor-pointer group shadow-xs"
          title="File hash verified against server's known-good registry"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold">Hash Verified</span>
          <span className="text-[9px] text-emerald-400/80 font-mono hidden sm:inline">[{shortHash}]</span>
        </button>

        {showDetailsPopover && showTooltip && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 rounded-2xl bg-slate-950 border border-emerald-500/50 shadow-2xl text-left text-xs space-y-2 backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Known Good Match</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                {result.algorithm}
              </span>
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="text-slate-400">Server Status:</div>
              <div className="font-semibold text-slate-200">✓ Authenticity Confirmed by Server</div>
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="text-slate-400">Cryptographic Hash:</div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 font-mono text-amber-300 break-all select-all text-[9px]">
                {result.expectedHash}
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/80">
              <span>Audited: {result.verifiedAt.split('T')[0]}</span>
              <button
                type="button"
                onClick={() => setShowTooltip(false)}
                className="text-slate-400 hover:text-white"
              >
                Cufi (Close)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (result && !result.isVerified) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/50 ${className}`}
        title="Hash mismatch! Document differs from server's known good copy."
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span className="font-bold">Hash Mismatch</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-800 text-slate-400 border border-slate-700 ${className}`}
      title="Verification pending"
    >
      <Lock className="w-3 h-3 text-slate-500" />
      <span>Unverified</span>
    </span>
  );
};

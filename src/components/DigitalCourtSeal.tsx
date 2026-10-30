import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const DigitalCourtSeal: React.FC<{ officerName: string; timestamp: string }> = ({ officerName, timestamp }) => (
  <div className="relative group">
    <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all duration-500" />
    <div className="relative flex items-center gap-3 p-3 bg-slate-950/80 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
      <div className="absolute -right-4 -top-4 w-16 h-16 border-4 border-emerald-500/10 rounded-full flex items-center justify-center rotate-12">
        <ShieldCheck className="w-10 h-10 text-emerald-500/20" />
      </div>
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <div className="space-y-0.5">
        <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-tighter">Verified Official Record</div>
        <div className="text-[10px] font-bold text-white truncate max-w-[120px]">{officerName}</div>
        <div className="text-[8px] font-mono text-slate-500">{timestamp}</div>
      </div>
    </div>
  </div>
);

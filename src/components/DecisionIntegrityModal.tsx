import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, X } from 'lucide-react';
import { Language } from '../i18n/translations';

interface DecisionIntegrityModalProps {
  documentTitle: string;
  documentContent: string;
  currentLang: Language;
  onClose: () => void;
}

export const DecisionIntegrityModal: React.FC<DecisionIntegrityModalProps> = ({
  documentTitle,
  documentContent,
  currentLang,
  onClose,
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftJudgmentText: `${documentTitle}\n\n${documentContent}` }),
      });
      const data = await response.json();
      setReport(data.integrityReport);
    } catch (err) {
      console.error(err);
      alert('Integrity check failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Decision Integrity Checker: {documentTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {!report && !loading && (
            <div className="text-center py-8 space-y-4">
              <p className="text-xs text-slate-400">
                Cross-reference legal citations in this draft judgment against the latest Supreme Court Cassation database to ensure adherence to established principles.
              </p>
              <button
                onClick={runCheck}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Run Integrity Verification
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <span className="text-xs text-slate-300 font-mono">Cross-referencing Cassation precedents...</span>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                {report}
              </div>
              <button
                onClick={runCheck}
                disabled={loading}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
              >
                Re-Run Check
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Scale, RefreshCw, X, FileText, CheckCircle2 } from 'lucide-react';
import { Language } from '../i18n/translations';
import { SavedLegalDocument } from '../services/storage';

interface LegalArgumentComparatorModalProps {
  documents: SavedLegalDocument[];
  currentLang: Language;
  onClose: () => void;
}

export const LegalArgumentComparatorModal: React.FC<LegalArgumentComparatorModalProps> = ({
  documents,
  currentLang,
  onClose,
}) => {
  const [docAId, setDocAId] = useState<string>(documents[0]?.id || '');
  const [docBId, setDocBId] = useState<string>(documents[1]?.id || documents[0]?.id || '');
  const [comparison, setComparison] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    const docA = documents.find(d => d.id === docAId);
    const docB = documents.find(d => d.id === docBId);
    if (!docA || !docB) return;

    setLoading(true);
    setComparison(null);
    try {
      const response = await fetch('/api/compare-arguments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          argA: `Title: ${docA.title}\n\n${docA.content}`,
          argB: `Title: ${docB.title}\n\n${docB.content}`,
        }),
      });
      const data = await response.json();
      setComparison(data.comparison);
    } catch (err) {
      console.error(err);
      alert('Argument comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Legal Argument Comparator</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Draft / Argument A:</label>
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Draft / Argument B (Opposing):</label>
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompare}
            disabled={loading || documents.length < 2}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Compare Arguments with Gemini</span>
          </button>

          {comparison && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-in fade-in duration-300">
              <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Side-by-Side Synthesis & Analysis</span>
              </h4>
              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans pt-2 border-t border-slate-800">
                {comparison}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

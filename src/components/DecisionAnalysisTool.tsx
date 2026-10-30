import React, { useState } from 'react';
import { Gavel, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Language } from '../i18n/translations';

interface DecisionAnalysisToolProps {
  decisionContent: string;
  precedents: any[];
  currentLang: Language;
}

export const DecisionAnalysisTool: React.FC<DecisionAnalysisToolProps> = ({ decisionContent, precedents, currentLang }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentContent: decisionContent, precedents }),
      });
      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
      alert('Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg mt-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Gavel className="w-5 h-5 text-amber-500" />
        Decision Legal Accuracy Audit
      </h3>
      <button
        onClick={runAnalysis}
        disabled={loading}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-2"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Analyze Decision vs Precedents
      </button>
      
      {analysis && (
        <div className="mt-6 p-4 bg-slate-950 rounded-xl text-slate-300 text-sm whitespace-pre-wrap border border-slate-800">
          {analysis}
        </div>
      )}
    </div>
  );
};

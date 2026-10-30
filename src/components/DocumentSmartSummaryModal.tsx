import React, { useState, useEffect } from 'react';
import { Sparkles, X, Copy, Check, RefreshCw, Volume2, Globe, FileText, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { Language } from '../i18n/translations';
import { SavedLegalDocument } from '../services/storage';
import { analyzeLegalDocument } from '../services/api';
import { AudioSpeakButton } from './AudioSpeakButton';

interface DocumentSmartSummaryModalProps {
  doc: SavedLegalDocument;
  currentLang: Language;
  onClose: () => void;
}

export const DocumentSmartSummaryModal: React.FC<DocumentSmartSummaryModalProps> = ({
  doc,
  currentLang,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<string>('');
  const [separatedVersions, setSeparatedVersions] = useState<{ om?: string; am?: string; en?: string }>({});
  const [activeLangTab, setActiveLangTab] = useState<'om' | 'am' | 'en'>(currentLang);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSmartSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const customInstructions = `
Task: Generate an Executive Legal Smart Summary (Cuunfaa Seeraa Qulqulluu) of this document.
Focus strictly on:
1. Qabxii Falmii Ijoo (Core Legal Arguments & Pleadings)
2. Bu'uura Seeraa & Keeyyattoota (Governing Statutory Provisions & Codes)
3. Xumura Seeraa & Murtoo (Legal Conclusions, Liabilities & Judicial Outcomes)
4. Gorsa Ogeessa Seeraa (Executive Counsel Recommendation)

Ensure strict adherence to Zero Asterisks (*) and Zero Hashes (#) rules for immaculate professional legal prose.
`;

      const response = await analyzeLegalDocument({
        fileText: `TITLE: ${doc.title}\n\nCONTENT:\n${doc.content}`,
        fileName: doc.title,
        analysisType: 'summarize',
        outputLanguages: ['om', 'am', 'en'],
        customInstructions,
        modelTier: 'gemini-3.8-flash',
      });

      if (response && response.analysis) {
        setSummary(response.analysis);
        if (response.separatedVersions) {
          setSeparatedVersions(response.separatedVersions);
        }
      } else {
        throw new Error('Summary response was empty.');
      }
    } catch (err: any) {
      console.error('Smart summary generation error:', err);
      setError(err?.message || 'Failed to generate Smart Summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmartSummary();
  }, [doc.id]);

  const activeContent = separatedVersions[activeLangTab] || summary;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  {currentLang === 'om' ? 'Cuunfaa Seeraa Qulqulluu (Smart Summary)' : 'Smart Executive Summary'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  AI Multi-Language
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md mt-0.5">
                {doc.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Language Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Language:</span>
            </span>
            <button
              onClick={() => setActiveLangTab('om')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLangTab === 'om'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Afaan Oromoo
            </button>
            <button
              onClick={() => setActiveLangTab('am')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLangTab === 'am'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              አማርኛ
            </button>
            <button
              onClick={() => setActiveLangTab('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLangTab === 'en'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              English
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!loading && activeContent && (
              <AudioSpeakButton
                text={activeContent}
                label="Listen"
              />
            )}
            <button
              onClick={handleCopy}
              disabled={loading || !activeContent}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs font-medium animate-pulse">
                {currentLang === 'om'
                  ? 'Qabxii falmii fi murtii seeraa sanada kana irraa cuunfaa jira...'
                  : 'Generating concise legal executive summary across languages...'}
              </p>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-3">
              <p className="font-bold">Summary generation notice: {error}</p>
              <button
                onClick={fetchSmartSummary}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Summary</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-amber-500/20">
                {activeContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Focuses on arguments, statutory provisions, and judicial outcomes.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Scale, RefreshCw, CheckCircle2, Upload, FileText, Image as ImageIcon, Landmark, Gavel } from 'lucide-react';
import { Language } from '../i18n/translations';

interface AppealsAnalysisModuleProps {
  currentLang: Language;
}

export const AppealsAnalysisModule: React.FC<AppealsAnalysisModuleProps> = ({ currentLang }) => {
  const [trialCourtName, setTrialCourtName] = useState('Mana Murtii Aanaa Adaamaa');
  const [trialRulingText, setTrialRulingText] = useState('');
  const [appellateCourtName, setAppellateCourtName] = useState('Mana Murtii Ol-aanaa Shawaa Bahaa');
  const [appellateRulingText, setAppellateRulingText] = useState('');
  
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<'trial' | 'appellate' | null>(null);

  // File upload & OCR extraction helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'trial' | 'appellate') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(target);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('/api/ocr-convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64String,
            mimeType: file.type || 'image/jpeg',
            fileName: file.name,
            language: currentLang,
          }),
        });
        const data = await res.json();
        if (data.extractedText) {
          if (target === 'trial') {
            setTrialRulingText(prev => prev ? `${prev}\n\n${data.extractedText}` : data.extractedText);
          } else {
            setAppellateRulingText(prev => prev ? `${prev}\n\n${data.extractedText}` : data.extractedText);
          }
        }
      } catch (err) {
        console.error('OCR failed:', err);
        alert('File reading / OCR conversion failed.');
      } finally {
        setOcrLoading(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async () => {
    if (!trialRulingText.trim() && !appellateRulingText.trim()) return;
    setLoading(true);
    setReport(null);
    try {
      const combinedText = `MANA MURTII SADARKAA JALQABAA (TRIAL COURT): ${trialCourtName}\n${trialRulingText}\n\nMANA MURTII OL-IYYANNOO / DHADDACHA IJOO (APPELLATE RULING): ${appellateCourtName}\n${appellateRulingText}`;
      
      const response = await fetch('/api/appeals-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rulingText: combinedText }),
      });
      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      console.error(err);
      alert('Comparative appeals analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Scale className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-serif-legal">
              {currentLang === 'om' ? 'Xinxala Galmeewwan Murtii (Trial & Appellate Comparative Analysis)' : 'Comparative Appeals & Trial Decision Analysis'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentLang === 'om'
                ? 'Murtii Mana Murtii Sadarkaa Jalaa fi Murtii Mana Murtii Ol-iyyannoo wal-bira qabuun sirrummaa, dogongora seeraa fi sababa diigumsaa xinxali.'
                : 'Compare trial court and appellate court rulings against statutory frameworks and Cassation precedents.'}
            </p>
          </div>
        </div>
      </div>

      {/* Two Panels: Trial Court vs Appellate Court */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Trial Court */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Landmark className="w-4 h-4" />
                <span>1. MANA MURTII SADARKAA JALQABAA (TRIAL COURT)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Initial Judgment</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Maqaa Mana Murtii Jalqabaa (Court Name):</label>
              <input
                type="text"
                value={trialCourtName}
                onChange={(e) => setTrialCourtName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Qabxii Falmii, Ragaa & Murtii Sadarkaa Jalqabaa:</label>
                <label className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{ocrLoading === 'trial' ? 'Reading PDF/Word/Image...' : 'Upload PDF/Word/Image'}</span>
                  <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => handleFileUpload(e, 'trial')} className="hidden" />
                </label>
              </div>
              <textarea
                value={trialRulingText}
                onChange={(e) => setTrialRulingText(e.target.value)}
                rows={8}
                placeholder="Murtii manicha, sababa murtichaa, fi qabxii ragaa asitti galchaa ykn fayila ol-fe'aa..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>

        {/* Panel 2: Appellate Court */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Gavel className="w-4 h-4" />
                <span>2. MANA MURTII OL-IYYANNOO / DHADDACHA IJOO</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Appellate Ruling</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Maqaa Mana Murtii Ol-iyyannoo (Appellate Court):</label>
              <input
                type="text"
                value={appellateCourtName}
                onChange={(e) => setAppellateCourtName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Mormii Ol-iyyannoo, Dogoggora Seeraa & Murtii Ol-iyyannoo:</label>
                <label className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{ocrLoading === 'appellate' ? 'Reading PDF/Word/Image...' : 'Upload PDF/Word/Image'}</span>
                  <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => handleFileUpload(e, 'appellate')} className="hidden" />
                </label>
              </div>
              <textarea
                value={appellateRulingText}
                onChange={(e) => setAppellateRulingText(e.target.value)}
                rows={8}
                placeholder="Murtii ol-iyyannoo kennames asitti galchaa ykn fayila ol-fe'aa..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleRunAnalysis}
        disabled={loading || (!trialRulingText.trim() && !appellateRulingText.trim())}
        className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Scale className="w-5 h-5" />}
        <span>{currentLang === 'om' ? 'Xinxala Wal-bira Qabuu Gaggeessi (Run Comparative Appellate Analysis)' : 'Run Comparative Appellate Analysis'}</span>
      </button>

      {/* Report Section */}
      {report && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Gabaasa Xinxala Wal-bira Qabuu (Comparative Analysis Report)</span>
            </h3>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
              Verified Legal Report
            </span>
          </div>

          <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans pt-2">
            {report}
          </div>
        </div>
      )}
    </div>
  );
};

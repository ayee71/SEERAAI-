import React, { useState } from 'react';
import { Scale, FileText, Upload, AlertTriangle, CheckCircle2, RefreshCw, BookOpen, ShieldCheck, FileCheck, ArrowRight } from 'lucide-react';
import { Language } from '../i18n/translations';

interface CaseRulingAnalysisViewProps {
  currentLang: Language;
}

export const CaseRulingAnalysisView: React.FC<CaseRulingAnalysisViewProps> = ({ currentLang }) => {
  const [activeSubTab, setActiveSubTab] = useState<'appeals' | 'integrity' | 'audit'>('appeals');
  const [rulingText, setRulingText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2GB limit check
    if (file.size > 2 * 1024 * 1024 * 1024) {
      const errorMsg = currentLang === 'om' 
        ? 'Guddina faayilii GB 2 olii hin fudhatamu.' 
        : currentLang === 'am' 
          ? 'ከ 2 ជីጋ ባይት በላይ የሆነ ፋይል ተቀባይነት የለውም።' 
          : 'File size exceeds 2GB limit.';
      alert(errorMsg);
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    if (file.type.includes('image') || file.type.includes('pdf')) {
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setLoading(true);
        try {
          const res = await fetch('/api/analyze-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64,
              mimeType: file.type,
              fileName: file.name,
              analysisType: 'extract_text',
              outputLanguages: [currentLang],
            }),
          });
          const data = await res.json();
          if (data.analysis) {
            setRulingText(data.analysis);
          }
        } catch (err) {
          console.error(err);
          alert('Failed to extract text from file.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        setRulingText(reader.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!rulingText.trim()) {
      alert(currentLang === 'om' ? 'Maaloo barreeffama murtii galchaa ykn ukaasaa.' : 'Please enter or upload ruling text.');
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      let endpoint = '/api/appeals-analysis';
      let payload: any = { rulingText };

      if (activeSubTab === 'integrity') {
        endpoint = '/api/integrity-check';
        payload = { draftJudgmentText: rulingText };
      } else if (activeSubTab === 'audit') {
        endpoint = '/api/audit-legal-logic';
        payload = { text: rulingText, language: currentLang };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (activeSubTab === 'audit') {
        const audit = data.auditReport;
        setReport(
          `MALAALAA AUDIT & COMPLIANCE SCORE: ${audit?.overallScore}%\n\n` +
          `Status: ${audit?.status}\n\n` +
          `Summary:\n${audit?.summary?.[currentLang] || audit?.summary?.om || ''}\n\n` +
          `Warnings / Flaws:\n` +
          (audit?.warnings || []).map((w: any) => `• [${w.severity.toUpperCase()}] ${w.title?.[currentLang] || w.title?.om}: ${w.description?.[currentLang] || w.description?.om} (${w.statutoryReference})`).join('\n')
        );
      } else {
        setReport(data.report || data.integrityReport || data.analysis || 'Analysis completed successfully.');
      }
    } catch (err) {
      console.error(err);
      alert('Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {currentLang === 'om' ? 'Xinxala Galmeelee & Murtee Mana Murtii' : currentLang === 'am' ? 'የፍርድ ቤት መዝገቦችና ውሳኔዎች ትንተና' : 'Court Ruling & Decision Analysis Module'}
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                {currentLang === 'om'
                  ? 'Murtii mana murtii sadarkaa jalaa fi ol-iyyannoo PDF, Word ykn suuraan galchuun seeraan madaaluu fi mirkaneessuu.'
                  : 'Upload lower or appellate court rulings via PDF, Word, or Image for comprehensive legal and procedural verification.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('appeals')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'appeals'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'om' ? 'Xinxala Ol-iyyannoo' : 'Appeals Analysis'}
            </button>
            <button
              onClick={() => setActiveSubTab('integrity')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'integrity'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'om' ? 'Mirkaneessa Murtii' : 'Decision Integrity'}
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'audit'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentLang === 'om' ? 'Auditor Galmee' : 'Record Audit'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {currentLang === 'om' ? 'Sanada Murtii (PDF, Word, Suuraa ykn Barreeffama)' : 'Ruling Document / Text Input'}
              </label>
              <label className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>{currentLang === 'om' ? 'Galmee Fe’i (Upload)' : 'Upload File'}</span>
                <input type="file" accept=".pdf,.docx,.doc,.txt,image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {uploadedFileName && (
              <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <span className="truncate">✓ {uploadedFileName} loaded successfully</span>
                <button onClick={() => { setUploadedFileName(''); setRulingText(''); }} className="text-slate-400 hover:text-white">✕</button>
              </div>
            )}

            <textarea
              rows={12}
              value={rulingText}
              onChange={(e) => setRulingText(e.target.value)}
              placeholder={
                currentLang === 'om'
                  ? 'Asitti barreeffama murtii mana murtii jalaa ykn ol-iyyannoo galchaa ykn sanada fe’aa...'
                  : 'Paste or upload court ruling text here for Gemini legal analysis...'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono resize-none leading-relaxed"
            />

            <button
              onClick={handleAnalyze}
              disabled={loading || !rulingText.trim()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>
                {activeSubTab === 'appeals'
                  ? (currentLang === 'om' ? 'Xinxala Ol-iyyannoo Gaggeessi' : 'Run Appeals Analysis')
                  : activeSubTab === 'integrity'
                  ? (currentLang === 'om' ? 'Mirkaneessa Murtii Ilaali' : 'Check Decision Integrity')
                  : (currentLang === 'om' ? 'Auditor Galmee Gaggeessi' : 'Run Record Audit')}
              </span>
            </button>
          </div>

          <div className="space-y-4 flex flex-col">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>{currentLang === 'om' ? 'Gabaasa Xinxala Seeraa & Murtii' : 'Legal & Ruling Analysis Report'}</span>
            </label>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-y-auto max-h-[480px]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs">Gemini is analyzing the ruling against Ethiopian statutory frameworks and precedents...</p>
                </div>
              ) : report ? (
                <div className="space-y-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {report}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500 text-center px-6">
                  <BookOpen className="w-10 h-10 mb-2 opacity-40 text-amber-400" />
                  <p className="text-xs">
                    {currentLang === 'om'
                      ? 'Sanada murtii galchaatii gabaasa xinxala seeraa argachuuf bitaatti tuqaa.'
                      : 'Upload or paste a court ruling on the left and click analyze to generate a rigorous legal report.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

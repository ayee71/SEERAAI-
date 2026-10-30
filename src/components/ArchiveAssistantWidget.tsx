import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  Printer, 
  Volume2, 
  VolumeX, 
  Scale, 
  BookOpen, 
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  FileText
} from 'lucide-react';
import { Language } from '../types';
import { askArchiveAssistant, ArchiveAssistantResult } from '../services/archiveAssistantService';
import { playOromoSpeech, stopOromoSpeech } from '../utils/oromoSpeechNormalizer';

interface ArchiveAssistantWidgetProps {
  language: Language;
  onNavigateToFile?: (fileNumber: string) => void;
  className?: string;
  initialQuestion?: string;
}

export const ArchiveAssistantWidget: React.FC<ArchiveAssistantWidgetProps> = ({
  language,
  onNavigateToFile,
  className = '',
  initialQuestion = '',
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [targetLang, setTargetLang] = useState<'om' | 'en'>(language === 'en' ? 'en' : 'om');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArchiveAssistantResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() !== '') {
      setQuestion(initialQuestion);
      handleAsk(initialQuestion);
    }
  }, [initialQuestion]);

  const sampleQuestions = [
    { om: 'Dhaaltummaa irratti yeroon daangaa maali?', en: 'Limitation period on inheritance claims' },
    { om: 'Waliigaltee bittaa fi gurgurtaa lafaa ykn manaa', en: 'Validity of real estate sale agreements' },
    { om: 'Lafa baadiyaa waggaa 12 qabatanii nagaan itti fayyadamuu', en: '12-year rural land possession adverse possession' },
    { om: 'Hojjataa seeraan ala hojiirraa gaggeessuu fi beenyaa', en: 'Severance pay for unlawful termination' },
    { om: 'Waliigaltee araaraa mana murtiitiin alatti taasifame (Kwt 277)', en: 'Out of court settlement validity Civ Pro Art 277' },
  ];

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    stopOromoSpeech();
    setIsPlayingAudio(false);

    try {
      const res = await askArchiveAssistant(q, targetLang);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || (language === 'om' ? 'Qorannoon seeraa hin milkoofne' : 'Legal query analysis failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopOromoSpeech();
      setIsPlayingAudio(false);
    } else {
      if (!result?.answer) return;
      setIsPlayingAudio(true);
      playOromoSpeech(result.answer, {
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    }
  };

  const handleDownloadWord = () => {
    if (!result?.answer) return;
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Qorannoo Seeraa - Telegram & Dhaddacha Ijoo</title>
        <style>
          body { font-family: 'Calibri', serif; font-size: 12pt; line-height: 1.6; color: #1e293b; margin: 1in; }
          h1 { color: #002347; border-bottom: 2pt solid #d4af37; padding-bottom: 6pt; }
          .badge { background-color: #fef3c7; color: #92400e; padding: 4pt 8pt; font-weight: bold; border-radius: 4pt; }
          .section-title { color: #002347; font-weight: bold; font-size: 14pt; margin-top: 14pt; border-bottom: 1pt solid #cbd5e1; }
          .footer { margin-top: 30pt; font-size: 9pt; color: #64748b; border-top: 1pt solid #cbd5e1; padding-top: 6pt; }
        </style>
      </head>
      <body>
        <div class="badge">WAKO LEGAL STUDIO & SEERAAI ARCHIVE ASSISTANT</div>
        <h1>Qorannoo fi Deebii Seeraa Dhaddacha Ijibbaataa</h1>
        <p><strong>Gaaffii:</strong> ${question}</p>
        <hr/>
        <div style="white-space: pre-wrap;">${result.answer}</div>
        <div class="footer">Madda Ragaa: Telegram @wakolegalstudio (1,500+ Files) & Supreme Cassation Decisions • SAI Ethio</div>
      </body>
      </html>
    `;
    const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Qorannoo_Seeraa_Telegram_Dhaddacha_Ijoo.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!result?.answer) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Deebii Seeraa - Archive Assistant</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.65; max-width: 820px; margin: 30px auto; padding: 20px; color: #0f172a; }
          .header { border-bottom: 3px solid #002347; padding-bottom: 12px; margin-bottom: 20px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-bottom: 8px; }
          h1 { color: #002347; font-size: 20px; margin: 6px 0; }
          .box { margin: 16px 0; padding: 18px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #004080; white-space: pre-wrap; font-size: 14px; }
          .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
          @media print { body { margin: 0; padding: 15mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">SEERAAI • TELEGRAM & CASSATION ARCHIVE ASSISTANT</div>
          <h1>Deebii Seeraa fi Qorannoo Murtii Dhaddacha Ijibbaataa</h1>
          <p style="font-size: 13px; color: #475569;"><strong>Gaaffii Dhiyaate:</strong> ${question}</p>
        </div>
        <div class="box">${result.answer}</div>
        <div class="footer">
          Channaalii Telegram @wakolegalstudio (Faayilaalee 1,500+) & Murteewwan Mana Murtii Waliigalaa Oromiyaa fi Federaalaa
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 ${className}`}>
      {/* Top Banner & Endpoint Link Integration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gargaaraa AI Telegram & Dhaddacha Ijoo</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-950 text-sky-300 border border-sky-800">
              <span>📡 Endpoint Connected</span>
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-serif-legal text-slate-100">
            {language === 'om'
              ? 'Gaaffii fi Deebii Seeraa: Kuusaa Telegram 1,500+ fi Dhaddacha Ijoo'
              : 'Legal Q&A Archive Assistant: Telegram 1,500+ & Cassation Precedents'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'om'
              ? 'Gaaffii seeraa keessan barreessaa; sirnichi murtiiwwan Telegram fi dhaddacha ijoo sakatta\'uun deebii seeraa qulqulluu qajeeltoo 4 qabu siif kenna.'
              : 'Enter any legal question; the assistant analyzes 1,500+ Telegram precedent files & Cassation rulings to produce a 4-part authoritative legal analysis.'}
          </p>
        </div>

        {/* Target Language Toggle */}
        <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setTargetLang('om')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              targetLang === 'om' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Afaan Oromoo
          </button>
          <button
            type="button"
            onClick={() => setTargetLang('en')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              targetLang === 'en' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Endpoint URL Badge for User Transparency */}
      <div className="flex items-center justify-between text-[11px] bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 truncate max-w-full font-mono text-slate-300">
          <span className="text-emerald-400">●</span>
          <span>API URL:</span>
          <span className="truncate text-sky-400">
            {result?.endpoint || 'https://ais-pre-bc2fy5apvmi7geryybwgsq-551578258786.europe-west3.run.app/api/gemini/archive-assistant'}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
          Active & Synced
        </span>
      </div>

      {/* Search Input Box */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleAsk();
              }
            }}
            placeholder={
              language === 'om'
                ? 'Gaaffii ykn qabiyyee seeraa barbaaddan asitti barreessaa (fkn: Dhaaltummaa, Waliigaltee bittaa manaa, Lafa baadiyaa, Hojjataa ariisaa...)'
                : 'Enter your legal question or keywords (e.g., Rural land adverse possession, Employment severance, Real estate authentication...)'
            }
            rows={3}
            className="w-full px-4 py-3.5 pr-28 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs sm:text-sm font-medium resize-none shadow-inner"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading || !question.trim()}
              onClick={() => handleAsk()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Qorachaa...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{language === 'om' ? 'Gaafadhu' : 'Analyze'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Sample Questions */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400">
            {language === 'om' ? '💡 Fakkeenya gaaffiilee seeraa:' : '💡 Sample legal questions:'}
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            {sampleQuestions.map((s, idx) => {
              const text = targetLang === 'en' ? s.en : s.om;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuestion(text);
                    handleAsk(text);
                  }}
                  className="px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-amber-500/50 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State with Skeleton */}
      {isLoading && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-pulse text-center">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-300">
            {language === 'om'
              ? 'Faayilaalee Telegram 1,500+ fi Dhaddacha Ijoo sakatta\'ee deebii qajeeltoo 4 qabu qopheessaa jira...'
              : 'Cross-referencing 1,500+ Telegram archives and Supreme Cassation precedents to synthesize authoritative analysis...'}
          </p>
        </div>
      )}

      {/* Result Display: Structured 4-Heading Legal Layout */}
      {result && !isLoading && (
        <div className="space-y-4 pt-2">
          {/* Action Bar for Result */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                ✓ Deebii Seeraa Qophaa'e
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Source: {result.source === 'remote-assistant' ? 'External Endpoint' : 'Resilient Gemini Legal Engine'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Audio Playback with Harargee TTS */}
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isPlayingAudio
                    ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-sm animate-pulse'
                    : 'bg-slate-900 text-slate-200 hover:text-white border-slate-700'
                }`}
                title="Sagaleen Dhaggeeffadhu (Afaan Oromoo TTS)"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Dhaabi</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dhaggeeffadhu</span>
                  </>
                )}
              </button>

              {/* Copy */}
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Garagalfeera!' : 'Garagalchi'}</span>
              </button>

              {/* Word Export */}
              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Word (.doc) Buufadhu"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Word</span>
              </button>

              {/* Print / PDF */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Print ykn PDF"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>

          {/* Structured 4 Headings Cards */}
          {result.structuredSections && (result.structuredSections.deebiiSeeraa || result.structuredSections.ragummaa) ? (
            <div className="grid grid-cols-1 gap-3.5">
              {/* 1. DEEBII SEERAA */}
              {result.structuredSections.deebiiSeeraa && (
                <div className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-2 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">📘</span>
                    <span>1. DEEBII SEERAA (Direct Legal Answer & Analysis)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pl-8">
                    {result.structuredSections.deebiiSeeraa}
                  </p>
                </div>
              )}

              {/* 2. RAGUMMAA SEERAA FI MURTIIWWAN IJIBBAATAA */}
              {result.structuredSections.ragummaa && (
                <div className="bg-slate-950 border border-slate-800 hover:border-sky-500/40 rounded-2xl p-4 sm:p-5 space-y-2 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wide">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-sm">📜</span>
                    <span>2. RAGUMMAA SEERAA FI MURTIIWWAN IJIBBAATAA (Binding Precedent Citations)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pl-8">
                    {result.structuredSections.ragummaa}
                  </p>
                </div>
              )}

              {/* 3. QAJEELTOO BU'UURAA */}
              {result.structuredSections.qajeeltoo && (
                <div className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-2 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">⚖️</span>
                    <span>3. QAJEELTOO BU'UURAA (Core Binding Rule Established by Cassation)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pl-8">
                    {result.structuredSections.qajeeltoo}
                  </p>
                </div>
              )}

              {/* 4. GORSA QABATAMAA */}
              {result.structuredSections.gorsa && (
                <div className="bg-slate-950 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 sm:p-5 space-y-2 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wide">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">💡</span>
                    <span>4. GORSA QABATAMAA (Practical Guidance for Litigants)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pl-8">
                    {result.structuredSections.gorsa}
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Full Raw Text Display if unformatted
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {result.answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

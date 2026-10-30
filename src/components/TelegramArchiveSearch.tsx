import React, { useState, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  Download, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Scale, 
  BookOpen, 
  Filter, 
  Database, 
  Eye, 
  Printer, 
  X, 
  HelpCircle, 
  Share2,
  FileCheck,
  Bookmark,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';
import { Language } from '../types';
import { useBookmarks } from '../context/BookmarkContext';
import { AudioSpeakButton } from './AudioSpeakButton';
import { TelegramImportModal } from './TelegramImportModal';
import { ArchiveAssistantWidget } from './ArchiveAssistantWidget';
import { MasterLegalFile, MASTER_FILES, generateMasterFiles } from '../data/telegramMasterArchive';
export type { MasterLegalFile };
export { MASTER_FILES, generateMasterFiles };

interface TelegramArchiveSearchProps {
  language: Language;
}

export const TelegramArchiveSearch: React.FC<TelegramArchiveSearchProps> = ({ language }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [downloadSuccessFile, setDownloadSuccessFile] = useState<string | null>(null);
  const [activeModalFile, setActiveModalFile] = useState<MasterLegalFile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [isSyncingArchive, setIsSyncingArchive] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('');
  const [activeTabMode, setActiveTabMode] = useState<'files' | 'assistant'>('files');
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string>('');
  const { toggleBookmark, isBookmarked } = useBookmarks();

  const langKey = language === 'om' ? 'om' : 'en';

  const filteredFiles = useMemo(() => {
    return MASTER_FILES.filter((f) => {
      const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
      const q = query.toLowerCase().trim();
      if (!q) return matchesCat;

      const matchesQ =
        f.fileNumber.includes(q) ||
        f.title[langKey].toLowerCase().includes(q) ||
        f.summary[langKey].toLowerCase().includes(q) ||
        f.principle[langKey].toLowerCase().includes(q) ||
        (f.keyArticles?.[langKey]?.toLowerCase().includes(q) ?? false) ||
        f.volume.toLowerCase().includes(q) ||
        f.postNumber.toString().includes(q);

      return matchesCat && matchesQ;
    });
  }, [query, selectedCategory, langKey]);

  // 1. Download as Microsoft Word (.doc)
  const downloadAsWord = (file: MasterLegalFile) => {
    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Galmee ${file.fileNumber} - Wako Legal Studio</title>
        <style>
          body { font-family: 'Calibri', 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #1c1917; margin: 1in; }
          .header-title { font-size: 18pt; font-weight: bold; color: #78350f; border-bottom: 2pt solid #b45309; padding-bottom: 6pt; margin-bottom: 14pt; }
          .meta-box { background-color: #f5f5f4; border: 1pt solid #d6d3d1; padding: 10pt; margin-bottom: 16pt; }
          .section-heading { font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-top: 14pt; margin-bottom: 6pt; border-bottom: 1pt solid #93c5fd; padding-bottom: 3pt; }
          .highlight-principle { background-color: #ecfdf5; border-left: 4pt solid #059669; padding: 10pt; font-weight: bold; color: #064e3b; margin: 12pt 0; }
          .footer { margin-top: 30pt; font-size: 9pt; color: #78716c; border-top: 1pt solid #e7e5e4; padding-top: 8pt; text-align: center; }
        </style>
      </head>
      <body>
        <div class='meta-box'>
          <strong>WAKO LEGAL STUDIO • KUUSAA GALMEE IJIBBAATAA</strong><br/>
          <strong>Lakkoofsa Galmee:</strong> ${file.fileNumber} &nbsp;|&nbsp; 
          <strong>Maxxansa:</strong> Jildii ${file.volume} &nbsp;|&nbsp; 
          <strong>Telegram Post:</strong> #${file.postNumber} &nbsp;|&nbsp;
          <strong>Gita Seeraa:</strong> ${file.category.toUpperCase()}
        </div>

        <div class='header-title'>${file.title[langKey]}</div>

        <div class='section-heading'>1. CUUNFAA GABAABAA (CASE SUMMARY)</div>
        <p>${file.summary[langKey]}</p>

        <div class='section-heading'>2. QAJEELTOO DIRQISIISAA (CORE BINDING PRINCIPLE)</div>
        <div class='highlight-principle'>
          ${file.principle[langKey]}
        </div>

        ${file.keyArticles ? `
        <div class='section-heading'>3. HEERA FI LABSIIWWAN DHIMMA KANAAN WALQABATAN</div>
        <p><strong>Keewwattoota Seeraa:</strong> ${file.keyArticles[langKey]}</p>
        ` : ''}

        <div class='footer'>
          Madda Ragaa: Channaalii Telegram @wakolegalstudio (Galmee #${file.fileNumber})<br/>
          Oromia & Ethiopian Legal Research Platform • Hubannoo Seeraa Dhaddacha Ijibbaataa
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([wordContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Galmee_${file.fileNumber}_Cuunfaa_Seeraa.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccessFile(file.id);
    setTimeout(() => setDownloadSuccessFile(null), 3000);
  };

  // 2. Download as clean Text (.txt)
  const downloadAsText = (file: MasterLegalFile) => {
    const textContent = `===============================================================
WAKO LEGAL STUDIO • KUUSAA MURTIIWWAN IJIBBAATAA
Telegram: @wakolegalstudio
===============================================================

LAKKOOFSA GALMEE: ${file.fileNumber}
MAXXANSA: ${file.volume}
POST NUMBER: #${file.postNumber}
GITA SEERAA: ${file.category.toUpperCase()}

MATA DUREE:
${file.title[langKey]}

---------------------------------------------------------------
1. CUUNFAA GABAABAA (CASE SUMMARY):
---------------------------------------------------------------
${file.summary[langKey]}

---------------------------------------------------------------
2. QAJEELTOO BU'UURAA FI DIRQISIISAA (BINDING LEGAL PRINCIPLE):
---------------------------------------------------------------
${file.principle[langKey]}

${file.keyArticles ? `
---------------------------------------------------------------
3. KEESSOO SEERAA (STATUTES & ARTICLES):
---------------------------------------------------------------
${file.keyArticles[langKey]}
` : ''}

===============================================================
Madda: https://t.me/wakolegalstudio/${file.postNumber}
Hubannoo fi Qorannoo Seeraa MMWF fi Oromiyaa
===============================================================
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Galmee_${file.fileNumber}_Cuunfaa.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccessFile(file.id);
    setTimeout(() => setDownloadSuccessFile(null), 3000);
  };

  // 3. Print / Save as PDF
  const handlePrint = (file: MasterLegalFile) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Galmee ${file.fileNumber} - Wako Legal Studio</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 30px auto; padding: 20px; color: #1c1917; }
          .header { border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 20px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-bottom: 8px; }
          h1 { color: #78350f; font-size: 22px; margin: 8px 0; }
          .meta { font-size: 13px; color: #57534e; margin-bottom: 16px; }
          .box { margin: 16px 0; padding: 16px; background: #f5f5f4; border-radius: 8px; border-left: 4px solid #b45309; }
          .principle-box { background: #ecfdf5; border-left: 4px solid #059669; color: #064e3b; padding: 16px; border-radius: 8px; font-weight: 500; }
          h3 { margin-top: 0; font-size: 15px; color: #1c1917; }
          .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e7e5e4; font-size: 11px; color: #78716c; text-align: center; }
          @media print {
            body { margin: 0; padding: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">WAKO LEGAL STUDIO • GALMEE #${file.fileNumber}</div>
          <h1>${file.title[langKey]}</h1>
          <div class="meta">Volume: ${file.volume} | Post: #${file.postNumber} | Gita: ${file.category.toUpperCase()}</div>
        </div>

        <div class="box">
          <h3>Cuunfaa Gabaabaa (Summary):</h3>
          <p>${file.summary[langKey]}</p>
        </div>

        <div class="principle-box">
          <h3 style="color: #064e3b;">Qajeeltoo Bu'uuraa (Binding Precedent Principle):</h3>
          <p>${file.principle[langKey]}</p>
        </div>

        ${file.keyArticles ? `
        <div class="box" style="border-left-color: #2563eb;">
          <h3>Heera fi Labsiiwwan Walqabatan:</h3>
          <p>${file.keyArticles[langKey]}</p>
        </div>
        ` : ''}

        <div class="footer">
          Channaalii Telegram @wakolegalstudio (Galmee #${file.fileNumber}) • Hubannoo Seeraa
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleCopy = (file: MasterLegalFile) => {
    const text = `Galmee #${file.fileNumber} - ${file.title[langKey]}\nVolume: ${file.volume}\n\nCuunfaa:\n${file.summary[langKey]}\n\nQajeeltoo Bu'uuraa:\n${file.principle[langKey]}\n\nTelegram @wakolegalstudio`;
    navigator.clipboard.writeText(text);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-oromia-header bg-gadaa-pattern rounded-2xl p-6 sm:p-8 text-stone-100 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-600/15 via-amber-500/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Database className="w-3.5 h-3.5" />
              {language === 'om' ? 'Kuusaa Galmee Maastarii (1,500+ Files)' : 'Master Legal Archive (1,500+ Files)'}
            </span>
            <a
              href="https://t.me/saiorethio1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 transition-colors"
            >
              <span>✈️</span>
              <span>Telegram @saiorethio1 (Master Archive)</span>
            </a>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
            {language === 'om'
              ? 'Kuusaa Faayilaalee Telegram 1,500+: Cuunfaa Cinaatti Barreeffame fi Buufata Mobaayilaa'
              : 'Complete Telegram Master Archive: Summaries Printed Alongside & Multi-Format Downloads'}
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {language === 'om'
              ? 'Tokkoon tokkoo faayilaatiif cuunfaa gabaabaa cinaatti barreeffame dubbisaa; akkasumas bifa Word (.doc), Text (.txt) ykn PDF tiin mobaayila fi kompiitara keessan irratti kallattiin buufadhaa.'
              : 'Read clear summaries alongside each precedent file, with direct downloads available in Word (.doc), universal Text (.txt), and printable PDF formats.'}
          </p>
        </div>
      </div>

      {/* Guide Banner for Downloads & Mobile Reading */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 sm:p-5 text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-600 text-white mt-0.5 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-bold text-emerald-300">
              {language === 'om'
                ? 'Akkaataa Faayilaalee Buusuu fi Dubbisuu:'
                : 'How to Download and Read Precedents:'}
            </h4>
            <p className="text-emerald-200/90 leading-relaxed text-xs">
              {language === 'om'
                ? '1) "Word (.doc)" tuquun Microsoft Word ykn WPS Office tiin banaa. 2) "Text (.txt)" tuquun mobaayila kamiyyuu irratti sooftiweerii malee dubbisaa. 3) "Sagaleen Dubbisi" tuquun cuunfaa fi qajeeltoo dhaddachaa dhaggeeffadhaa!'
                : '1) Click "Word (.doc)" for Microsoft Word / WPS Office. 2) Click "Text (.txt)" for instant reading on any phone notepad. 3) Click audio button to listen to precedents.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <span>📥</span>
            <span>{language === 'om' ? 'Telegram Import & Sync' : 'Telegram Import & Sync'}</span>
          </button>
          <a
            href="https://t.me/wakolegalstudio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <span>Telegram Channel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Visual Syncing Indicator Banner (When Background Data Sync is Active) */}
      {isSyncingArchive && (
        <div className="bg-sky-950/90 border border-sky-500/50 rounded-2xl p-4 text-sky-200 flex items-center justify-between gap-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500 text-slate-950">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-xs uppercase tracking-wider text-sky-300 block">
                {language === 'om' ? '🔄 Telegram Syncing Active...' : '🔄 Background Data Sync Active...'}
              </span>
              <p className="text-xs text-sky-100 font-mono">{syncStatusMessage || 'Syncing documents...'}</p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-sky-900/80 text-sky-300 border border-sky-600">
            Active
          </span>
        </div>
      )}

      {showImportModal && (
        <TelegramImportModal
          language={language}
          onClose={() => setShowImportModal(false)}
          onImportComplete={(count) => {
            setShowImportModal(false);
            setIsSyncingArchive(false);
          }}
          onSyncStateChange={(syncing, msg) => {
            setIsSyncingArchive(syncing);
            setSyncStatusMessage(msg);
          }}
        />
      )}

      {/* Mode Switcher: 1,500+ Master Files vs AI Precedent Research Assistant */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTabMode('files')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTabMode === 'files'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{language === 'om' ? '📁 Kuusaa Galmee 1,500+' : '📁 Master Files (1,500+)'}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/60 text-slate-200">
              {MASTER_FILES.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('assistant')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTabMode === 'assistant'
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{language === 'om' ? '✨ Gargaaraa Qorannoo Seeraa' : '✨ AI Legal Assistant'}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
              4 Headings
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden md:inline font-mono text-[11px] text-slate-300">
            Endpoint: /api/gemini/archive-assistant
          </span>
        </div>
      </div>

      {/* Render AI Precedent Assistant Mode */}
      {activeTabMode === 'assistant' && (
        <ArchiveAssistantWidget
          language={language}
          initialQuestion={assistantInitialQuery}
          onNavigateToFile={(fileNum) => {
            setQuery(fileNum);
            setActiveTabMode('files');
          }}
        />
      )}

      {/* Render Master Files Browser Mode */}
      {activeTabMode === 'files' && (
        <>
          {/* Search & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-telegram-search"
              type="text"
              placeholder={
                language === 'om'
                  ? 'Galmee Lakk. (Fkn: 138286, 140538) ykn jecha...'
                  : 'Search File # (e.g. 138286) or keyword...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg text-xs sm:text-sm bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">
              {language === 'om' ? 'Gita:' : 'Filter:'}
            </span>
            {[
              { id: 'all', label: language === 'om' ? 'Hunda (1,500+)' : 'All Files' },
              { id: 'land', label: language === 'om' ? 'Lafa (Land)' : 'Land Law' },
              { id: 'family', label: language === 'om' ? 'Maatii (Family)' : 'Family' },
              { id: 'procedure', label: language === 'om' ? 'Sirna Falmii' : 'Procedure' },
              { id: 'civil', label: language === 'om' ? 'Hariiroo Haw.' : 'Civil' },
              { id: 'labor', label: language === 'om' ? 'Hojjetaa' : 'Labor' },
              { id: 'criminal', label: language === 'om' ? 'Yakka (Criminal)' : 'Criminal' },
              { id: 'administrative', label: language === 'om' ? 'Bulchiinsa' : 'Admin' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results summary line */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
          <span>
            {language === 'om'
              ? `Faayilaalee ${filteredFiles.length} argaman (Cuunfaa cinaatti barreeffameen)`
              : `Showing ${filteredFiles.length} files (with side-by-side summaries)`}
          </span>
          <span className="font-mono text-amber-400 font-semibold">
            t.me/wakolegalstudio (#125+)
          </span>
        </div>
      </div>

      {/* Streamlined File Number List */}
      <div className="space-y-2.5">
        {filteredFiles.slice(0, 100).map((file) => {
          return (
            <div
              key={file.id}
              onClick={() => setActiveModalFile(file)}
              className="bg-slate-900 border border-slate-800 hover:border-amber-400/60 rounded-xl p-4 shadow-sm transition-all flex items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-lg bg-slate-950 text-amber-400 font-mono text-xs font-bold border border-slate-800 group-hover:border-amber-500 transition-colors">
                  Galmee #{file.fileNumber}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-serif-legal group-hover:text-amber-300 transition-colors">
                    {file.title[langKey]}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {file.summary[langKey]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono">
                  {file.volume}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{language === 'om' ? 'Cuunfaa Ilaali' : 'View Summary'}</span>
                </span>
              </div>
            </div>
          );
        })}

        {filteredFiles.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <Search className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-200">
              {language === 'om' ? 'Wanti barbaaddan hin argamne' : 'No matching precedents found'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {language === 'om'
                ? 'Lakkoofsa galmee biraatiin (Fkn: 138286, 140538) ykn jecha akka "lafa", "gaa\'ila", "araara" jedhuun yaalaa.'
                : 'Try searching another file number (e.g. 138286, 140538) or legal topic terms.'}
            </p>
          </div>
        )}
      </div>

      {filteredFiles.length > 80 && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
          {language === 'om'
            ? `Faayilaaleen ${filteredFiles.length} kuusaa keessa jiru. Barbaacha dhiphisuuf lakkoofsa galmee barreessaa.`
            : `Showing top 80 of ${filteredFiles.length} matches. Type specific file number to narrow down.`}
        </div>
      )}
        </>
      )}

      {/* In-App Document Reader Modal (Dubbisi) */}
      {activeModalFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 border border-slate-800 animate-scale-up text-slate-100">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-950 text-amber-400 border border-slate-800">
                    Galmee #{activeModalFile.fileNumber}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {activeModalFile.volume} • Post #{activeModalFile.postNumber}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 font-serif-legal leading-snug">
                  {activeModalFile.title[langKey]}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalFile(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>{language === 'om' ? 'Cuunfaa Gabaabaa (Summary):' : 'Comprehensive Case Summary:'}</span>
                  </h4>
                  <AudioSpeakButton
                    text={activeModalFile.summary[langKey]}
                    variant="pill"
                    label="Cuunfaa Dhaggeeffadhu"
                  />
                </div>
                <p className="text-slate-200 leading-relaxed">{activeModalFile.summary[langKey]}</p>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'om' ? 'Qajeeltoo Dirqisiisaa (Binding Cassation Ruling):' : 'Binding Ruling Principle:'}</span>
                  </h4>
                  <AudioSpeakButton
                    text={activeModalFile.principle[langKey]}
                    variant="pill"
                    label="Qajeeltoo Dhaggeeffadhu"
                  />
                </div>
                <p className="text-emerald-100 font-medium leading-relaxed">{activeModalFile.principle[langKey]}</p>
              </div>

              {activeModalFile.keyArticles && (
                <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 space-y-1.5">
                  <h4 className="font-bold text-blue-300 text-xs">
                    {language === 'om' ? 'Heera fi Labsiiwwan Qabiyyee Kanaa:' : 'Statutory & Constitutional Basis:'}
                  </h4>
                  <p className="text-blue-200 font-mono text-xs">{activeModalFile.keyArticles[langKey]}</p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleCopy(activeModalFile)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedId === activeModalFile.id ? 'Copied!' : 'Copy'}</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const f = activeModalFile;
                    setActiveModalFile(null);
                    setAssistantInitialQuery(`Galmee #${f.fileNumber}: ${f.title[langKey]}`);
                    setActiveTabMode('assistant');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'om' ? 'AI Qoradhu (4 Headings)' : 'Analyze with AI'}</span>
                </button>

                <button
                  onClick={() => downloadAsWord(activeModalFile)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-sm cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Word (.doc)</span>
                </button>

                <button
                  onClick={() => downloadAsText(activeModalFile)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Text (.txt)</span>
                </button>

                <button
                  onClick={() => handlePrint(activeModalFile)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <a
                  href={`https://t.me/wakolegalstudio/${activeModalFile.postNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-500/40"
                >
                  <span>Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

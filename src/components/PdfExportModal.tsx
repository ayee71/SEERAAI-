import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { getUserSettings } from '../services/storage';
import {
  exportLegalDocumentToPdf,
  exportLegalDocumentToDocx,
  exportLegalDocumentToWordHtml,
  sanitizeFilename,
  sanitizeContentForExport,
} from '../services/legalDocumentExport';
import { OpenWithAppModal } from './OpenWithAppModal';
import { redactSensitiveLegalData, isPrivacyShieldActive, logConfidentialAccess } from '../services/confidentialityService';
import { useAuth } from '../context/AuthContext';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  title: string;
  taskType: string;
  content: string;
  separatedVersions?: {
    om?: string;
    am?: string;
    en?: string;
  };
  outputLanguages: Language[];
  initialMode?: 'pdf' | 'word';
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  title,
  taskType,
  content,
  separatedVersions,
  outputLanguages,
  initialMode = 'pdf',
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();
  const userSettings = getUserSettings();
  const branding = userSettings.lawFirmBranding;

  const hasMultiple = outputLanguages.length > 1;
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'om' | 'am' | 'en'>(
    hasMultiple ? 'all' : outputLanguages[0] || 'om'
  );

  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [includeSeal, setIncludeSeal] = useState(branding.showSealOnPdf ?? true);
  const [includeSignatureBlock, setIncludeSignatureBlock] = useState(
    taskType === 'contract' || taskType === 'petition' || taskType === 'cassation'
  );
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [applyPrivacyRedaction, setApplyPrivacyRedaction] = useState<boolean>(() => isPrivacyShieldActive());
  const [fontSize, setFontSize] = useState<'normal' | 'compact' | 'large'>('normal');

  // Open with App Chooser Modal State
  const [isOpenWithModalOpen, setIsOpenWithModalOpen] = useState(false);

  // Export Loading States
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingWordDoc, setIsExportingWordDoc] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate Reference ID & Dates
  const refNumber = `ETH-LAW/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
  const gregorianDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const ethiopianDate = `Fulbaana 23, 2019 B.A. / መስከረም 23 ቀን 2019 ዓ.ም`;

  const formatText = (txt: string) => {
    const sanitized = sanitizeContentForExport(txt);
    return applyPrivacyRedaction ? redactSensitiveLegalData(sanitized).text : sanitized;
  };

  // Get active text based on format (sanitizing out risk scores/ratings and redacting if shield is active)
  const getSectionsToPrint = () => {
    if (selectedFormat === 'om' && separatedVersions?.om) {
      return [{ lang: 'om' as Language, title: 'AFAN OROMOO', text: formatText(separatedVersions.om) }];
    }
    if (selectedFormat === 'am' && separatedVersions?.am) {
      return [{ lang: 'am' as Language, title: 'አማርኛ (AMHARIC)', text: formatText(separatedVersions.am) }];
    }
    if (selectedFormat === 'en' && separatedVersions?.en) {
      return [{ lang: 'en' as Language, title: 'ENGLISH', text: formatText(separatedVersions.en) }];
    }

    // If 'all' or no separated versions
    if (hasMultiple && separatedVersions) {
      const sections = [];
      if (separatedVersions.om) sections.push({ lang: 'om' as Language, title: 'AFAN OROMOO', text: formatText(separatedVersions.om) });
      if (separatedVersions.am) sections.push({ lang: 'am' as Language, title: 'አማርኛ (AMHARIC)', text: formatText(separatedVersions.am) });
      if (separatedVersions.en) sections.push({ lang: 'en' as Language, title: 'ENGLISH', text: formatText(separatedVersions.en) });
      if (sections.length > 0) return sections;
    }

    return [{ lang: currentLang, title: title, text: formatText(content) }];
  };

  const sectionsToPrint = getSectionsToPrint();

  // 1. Export directly to PDF
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setExportError(null);
    setExportStatus('PDF qopheessaa jira (Rendering high-res PDF)...');

    try {
      const filename = `${sanitizeFilename(title)}_Legal_Doc.pdf`;
      await exportLegalDocumentToPdf('legal-print-container', filename, (msg) => {
        setExportStatus(msg);
      });
      setExportStatus('PDF milkaa\'inaan bu\'eera (PDF downloaded successfully)!');
      setTimeout(() => setExportStatus(null), 3500);
    } catch (e: any) {
      console.error('PDF export failed:', e);
      setExportError(e.message || 'PDF export failed. Opening browser print dialog fallback...');
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. Export directly to native Word (.docx)
  const handleExportWordDocx = async () => {
    setIsExportingWord(true);
    setExportError(null);
    setExportStatus('Word (.docx) qopheessaa jira...');

    try {
      const filename = `${sanitizeFilename(title)}_Legal_Contract.docx`;
      await exportLegalDocumentToDocx(
        {
          title,
          taskType,
          refNumber,
          gregorianDate,
          ethiopianDate,
          sections: sectionsToPrint,
          branding,
          includeLetterhead,
          includeSignatureBlock,
          includeWatermark,
        },
        filename,
        (msg) => setExportStatus(msg)
      );
      setExportStatus('Word (.docx) milkaa\'inaan bu\'eera!');
      setTimeout(() => setExportStatus(null), 3500);
    } catch (e: any) {
      console.error('Word export failed:', e);
      // Automatic fallback to Word HTML .doc
      handleExportWordDoc();
    } finally {
      setIsExportingWord(false);
    }
  };

  // 3. Export to Word formatted (.doc)
  const handleExportWordDoc = () => {
    setIsExportingWordDoc(true);
    setExportError(null);
    setExportStatus('Word (.doc) qopheessaa jira...');
    try {
      const filename = `${sanitizeFilename(title)}_Legal_Contract.doc`;
      exportLegalDocumentToWordHtml('legal-print-container', filename, title, includeWatermark);
      setExportStatus('Word (.doc) bu\'eera!');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (e: any) {
      setExportError('Word export failed: ' + e.message);
    } finally {
      setIsExportingWordDoc(false);
    }
  };

  // 4. Fallback print
  const handlePrint = () => {
    window.print();
  };

  // 5. Download HTML format
  const handleDownloadHtml = () => {
    const printElement = document.getElementById('legal-print-container');
    if (!printElement) return;

    let watermarkMarkup = '';
    if (includeWatermark) {
      watermarkMarkup = `<div class="legal-watermark" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 54pt; font-weight: 800; color: rgba(15, 23, 42, 0.05); pointer-events: none; z-index: 0; text-transform: uppercase; letter-spacing: 0.25em; user-select: none; white-space: nowrap;">SeeraAI • Confidential</div>`;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="om">
<head>
  <meta charset="utf-8">
  <title>${title} - ${refNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', 'Noto Sans Ethiopic', Georgia, serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 40px 20px;
      font-size: 11pt;
      line-height: 1.6;
      position: relative;
    }
    .legal-print-wrapper {
      position: relative;
      overflow: hidden;
    }
    .legal-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 54pt;
      font-weight: 800;
      color: rgba(15, 23, 42, 0.05);
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      user-select: none;
      white-space: nowrap;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 50px 60px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      position: relative;
    }
    @media print {
      body { background: white; padding: 0; }
      .page { box-shadow: none; border: none; padding: 0; width: 100%; max-width: none; }
      .page-break { page-break-before: always; break-before: page; margin-top: 40px; }
      .legal-watermark {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="legal-print-wrapper" style="position: relative;">
      ${watermarkMarkup}
      ${printElement.innerHTML}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(title)}_PDF_Export.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFontSizeClass = () => {
    if (fontSize === 'compact') return 'text-[12px] leading-relaxed';
    if (fontSize === 'large') return 'text-[15px] leading-loose';
    return 'text-[13px] leading-relaxed';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <span>⚖️</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Sanada Seeraa Baasi / የሕግ ሰነድ ማውረጃ / Export Legal Document (PDF & Word)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  LEGAL-PRINT-WRAPPER
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Preserves exact letterhead, seal, reference numbers, typography parity, and signatory blocks for courts and clients.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <span>✕</span>
          </button>
        </div>

        {/* Configuration Bar (Hidden during print) */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          {/* Format / Language Selector */}
          {hasMultiple && (
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] px-2 font-medium">Export:</span>
              <button
                onClick={() => setSelectedFormat('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedFormat === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                All 3 Languages
              </button>
              {outputLanguages.includes('om') && (
                <button
                  onClick={() => setSelectedFormat('om')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedFormat === 'om'
                      ? 'bg-amber-500 text-slate-950 shadow font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Afaan Oromoo
                </button>
              )}
              {outputLanguages.includes('am') && (
                <button
                  onClick={() => setSelectedFormat('am')}
                  className={`px-2.5 py-1 rounded-lg font-ethiopic font-medium transition-all cursor-pointer ${
                    selectedFormat === 'am'
                      ? 'bg-amber-500 text-slate-950 shadow font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  አማርኛ
                </button>
              )}
              {outputLanguages.includes('en') && (
                <button
                  onClick={() => setSelectedFormat('en')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedFormat === 'en'
                      ? 'bg-amber-500 text-slate-950 shadow font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  English
                </button>
              )}
            </div>
          )}

          {/* Toggle Letterhead & Signatures */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Letterhead & Seal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={includeSignatureBlock}
                onChange={(e) => setIncludeSignatureBlock(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Signatures</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={includeWatermark}
                onChange={(e) => setIncludeWatermark(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Watermark</span>
            </label>

            {/* Privacy Shield Redactor */}
            <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300 font-semibold select-none bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              <input
                type="checkbox"
                checked={applyPrivacyRedaction}
                onChange={(e) => setApplyPrivacyRedaction(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>🛡️ Iccitummaa (Privacy Shield)</span>
            </label>

            {/* Font Size Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setFontSize('compact')}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === 'compact' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              >
                Small
              </button>
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === 'normal' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              >
                Normal
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === 'large' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              >
                Large
              </button>
            </div>
          </div>
        </div>

        {/* Paper Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/90 flex justify-center">
          
          {/* PRINTABLE CONTAINER: This is what prints via window.print() and captures into PDF & Word */}
          <div
            id="legal-print-container"
            className={`legal-print-wrapper w-full max-w-[800px] bg-white text-slate-900 rounded-sm shadow-2xl p-8 sm:p-12 border border-slate-300 print:border-none print:shadow-none print:p-0 ${getFontSizeClass()}`}
          >
            {/* Confidential Watermark Overlay */}
            {includeWatermark && (
              <div className="legal-watermark">
                SeeraAI • Confidential
              </div>
            )}

            {/* Official Legal Letterhead */}
            {includeLetterhead && (
              <div className="border-b-2 border-slate-900 pb-5 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0">
                      <span className="text-3xl">⚖️</span>
                    </div>
                    <div>
                      <div className="font-serif-legal font-bold text-base sm:text-lg tracking-wider text-slate-950 uppercase">
                        {branding.firmNameOm || 'OGEESSA SEERAA - AYELE BE DHA'}
                      </div>
                      <div className="text-[12px] font-ethiopic font-semibold text-slate-800">
                        {branding.firmNameAm || 'የሕግ ባለሙያ - አየለ በዳ'} • {branding.firmNameEn || 'Legal Expert - Ayele Be Dha'}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                        {branding.advocateName || 'Ayele Be Dha (Ogeessa Seeraa)'} ({branding.licenseNumber || 'FDRE-JURIST/2026'}) | {branding.officeAddress || 'Finfinnee, Ethiopia'} | {branding.facebookPage ? `Facebook: ${branding.facebookPage}` : branding.phone ? `Tel: ${branding.phone}` : 'Facebook: facebook.com/ayele.bedha'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Official Circular Digital Legal Seal */}
                    {includeSeal && (
                      <div className="w-20 h-20 rounded-full border-[3px] border-double border-blue-900 flex flex-col items-center justify-center text-blue-950 p-1 text-center font-mono rotate-[-6deg] shadow-sm select-none shrink-0 print:border-blue-900 print:text-blue-950 -webkit-print-color-adjust: exact">
                        <div className="text-[6.5px] font-bold tracking-widest uppercase text-blue-900">★ OGEESSA SEERAA ★</div>
                        <span className="text-lg">⚖️</span>
                        <div className="text-[7.5px] font-bold font-serif-legal leading-none text-blue-950">{branding.licenseNumber || 'JURIST/2026'}</div>
                        <div className="text-[6px] uppercase font-bold tracking-tighter mt-0.5 text-blue-900">OGEESSA SEERAA</div>
                      </div>
                    )}

                    <div className="text-right text-[11px] font-mono text-slate-600 shrink-0">
                      <div className="font-bold text-slate-900">{refNumber}</div>
                      <div>{gregorianDate}</div>
                      <div className="text-[10px] text-slate-500 font-ethiopic">{ethiopianDate}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] uppercase font-mono text-slate-500">
                  <span>Document Type: {taskType.toUpperCase()}</span>
                  <span>Jurisdiction: Federal Democratic Republic of Ethiopia (FDRE)</span>
                </div>
              </div>
            )}

            {/* Document Title */}
            <div className="text-center my-6">
              <h1 className="font-serif-legal font-bold text-xl sm:text-2xl text-slate-950 uppercase tracking-wide border-b-2 border-t-2 border-slate-900 py-2.5 inline-block px-8">
                {title}
              </h1>
            </div>

            {/* Body Sections: Trilingual or Single with Clear Solid Separators and Typography Parity */}
            <div className="space-y-6">
              {sectionsToPrint.map((sec, idx) => (
                <div
                  key={idx}
                  className={`section-wrapper ${idx > 0 && selectedFormat === 'all' ? 'page-break-before pt-6' : ''}`}
                >
                  {/* Distinct Solid Section Divider between Languages */}
                  {idx > 0 && selectedFormat === 'all' && (
                    <div className="legal-section-divider-double no-screen-hidden mb-6" />
                  )}

                  {/* Clear Trilingual Language Header with Solid Line & Badge */}
                  {selectedFormat === 'all' && (
                    <div className="legal-lang-header">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block" />
                        <h2 className="legal-lang-header-title">
                          {sec.title}
                        </h2>
                      </div>
                      <span className="legal-lang-header-badge">
                        {sec.lang === 'om' ? 'Afaan Oromoo • Legal Code' : sec.lang === 'am' ? 'አማርኛ • የሕግ ሰነድ' : 'English • Statutory Text'}
                      </span>
                    </div>
                  )}

                  {/* Section Text with Language-Specific Font Parity & Line Height */}
                  <div
                    className={`legal-content-body lang-${sec.lang} ${sec.lang === 'am' ? 'font-ethiopic-print' : ''}`}
                  >
                    {sec.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Formal Legal Signatory Block (Optional) */}
            {includeSignatureBlock && (
              <div className="legal-signatory-block mt-12 pt-6 border-t-2 border-slate-900 avoid-break-inside">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-6 text-center">
                  MALLATTOO QAAMOLEE FI RAGAALEE / የተዋዋዮች እና የምስክሮች ፊርማ / SIGNATURE & ATTESTATION
                </div>

                <div className="grid grid-cols-2 gap-10 text-xs">
                  {/* Party 1 */}
                  <div className="space-y-6">
                    <div>
                      <div className="font-semibold text-slate-900">Gargala 1ffaa / 1ኛ ተዋዋይ / Party 1:</div>
                      <div className="text-[11px] text-slate-500">Maqaa / ስም: ____________________________</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Mallattoo / ፊርማ: _______________________</div>
                      <div className="text-[11px] text-slate-500 mt-2">Guyyaa / ቀን: __________________________</div>
                    </div>
                  </div>

                  {/* Party 2 */}
                  <div className="space-y-6">
                    <div>
                      <div className="font-semibold text-slate-900">Gargala 2ffaa / 2ኛ ተዋዋይ / Party 2:</div>
                      <div className="text-[11px] text-slate-500">Maqaa / ስም: ____________________________</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Mallattoo / ፊርማ: _______________________</div>
                      <div className="text-[11px] text-slate-500 mt-2">Guyyaa / ቀን: __________________________</div>
                    </div>
                  </div>
                </div>

                {/* Witnesses under Civil Code Art. 1727 */}
                <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-10 text-[11px] text-slate-600">
                  <div>
                    <div className="font-semibold text-slate-800">Ragaa 1ffaa / 1ኛ ምስክር / Witness 1:</div>
                    <div>Maqaa: __________________ Mallattoo: __________</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Ragaa 2ffaa / 2ኛ ምስክር / Witness 2:</div>
                    <div>Maqaa: __________________ Mallattoo: __________</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Footer Verification */}
            <div className="mt-12 pt-4 border-t border-slate-300 text-[10px] text-slate-500 flex items-center justify-between font-mono avoid-break-inside">
              <span>SeeraAI Trilingual Legal Assistant • Negarit Gazette & Cassation Precedents Standard</span>
              <span>FDRE Legal Format Verification • Confidential</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {exportStatus ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                <span>✓</span>
                <span>{exportStatus}</span>
              </span>
            ) : exportError ? (
              <span className="text-red-400 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{exportError}</span>
              </span>
            ) : (
              <>
                <span>🛡️</span>
                <span>Preserves exact formatting in legal-print-wrapper for court filing and client use.</span>
              </>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* HTML Download */}
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              title="Download standalone HTML file"
            >
              <span>📥</span>
              <span>HTML</span>
            </button>

            {/* Word .doc (Word HTML format) */}
            <button
              onClick={handleExportWordDoc}
              disabled={isExportingWordDoc}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-950/70 hover:bg-sky-900/80 text-sky-200 text-xs font-semibold border border-sky-700/60 transition-all cursor-pointer"
              title="Export formatted Word document (.doc) with exact CSS styles and seal"
            >
              {isExportingWordDoc ? (
                <span className="animate-spin inline-block">🔄</span>
              ) : (
                <span>📄</span>
              )}
              <span>Word (.doc)</span>
            </button>

            {/* Word .docx (Native OpenXML format) */}
            <button
              onClick={handleExportWordDocx}
              disabled={isExportingWord}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-950/40 transition-all hover:scale-[1.02] cursor-pointer border border-blue-400/40"
              title="Export as native Microsoft Word document (.docx)"
            >
              {isExportingWord ? (
                <>
                  <span className="animate-spin inline-block">🔄</span>
                  <span>Word qopheessaa jira...</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>Word (.docx) Baasi</span>
                </>
              )}
            </button>

            {/* Open with App (Bani Nawaan) Button matching Android Chooser */}
            <button
              onClick={() => setIsOpenWithModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/50 shadow-md transition-all hover:scale-[1.02] cursor-pointer"
              title="Open document with apps (TECNO File Viewer, Drive, Files, Dropbox, Edge...)"
            >
              <span>📱</span>
              <span>
                {currentLang === 'om' ? 'Bani (Open with)' : currentLang === 'am' ? 'በዚህ ይክፈቱ' : 'Open with'}
              </span>
            </button>

            {/* Direct High-Resolution PDF Download (.pdf) */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all hover:scale-[1.02] cursor-pointer border border-rose-400/40"
              title="Download as PDF file (.pdf)"
            >
              {isExportingPdf ? (
                <>
                  <span className="animate-spin inline-block">🔄</span>
                  <span>PDF qopheessaa jira...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>PDF (.pdf) Buusi</span>
                </>
              )}
            </button>

            {/* Print / System Dialog */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/40 transition-all hover:scale-[1.02] cursor-pointer"
              title="Open browser print dialog"
            >
              <span>🖨️</span>
              <span>Maxxansi / Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Open with App Modal (Matching Android System Chooser in Screenshot) */}
      <OpenWithAppModal
        isOpen={isOpenWithModalOpen}
        onClose={() => setIsOpenWithModalOpen(false)}
        currentLang={currentLang}
        title={title}
        filename={`${sanitizeFilename(title)}_Legal_Doc.pdf`}
        fileType="pdf"
      />
    </div>
  );
};

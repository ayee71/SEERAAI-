import React, { useState, useEffect, useRef } from 'react';
import { 
  Languages, 
  ArrowRightLeft, 
  Sparkles, 
  Check, 
  Copy, 
  Bookmark, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle, 
  FileDown, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileUp, 
  X, 
  Camera, 
  FileType 
} from 'lucide-react';
import mammoth from 'mammoth';
import { Language, translations } from '../i18n/translations';
import { translateLegalText, TranslateResponse, detectLanguage, analyzeLegalDocument } from '../services/api';
import { saveDocument } from '../services/storage';
import { saveOfflineTranslationToDB } from '../services/indexedDb';
import { exportToWord } from '../utils/docxExporter';
import { PdfExportModal } from '../components/PdfExportModal';
import { analyticsService } from '../services/analytics';

interface TranslateViewProps {
  currentLang: Language;
}

export const TranslateView: React.FC<TranslateViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];

  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState<Language>('om');
  const [targetLang, setTargetLang] = useState<Language>('am');
  const [isRewriteMode, setIsRewriteMode] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResponse | null>(null);

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // File Upload & Document Extraction States (PDF, Word .docx, Image)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);

  const isSameLanguage = sourceLang === targetLang;

  // File Upload Handler (PDF, Word .docx, PNG, JPG, JPEG, TXT)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsExtractingFile(true);
    setExtractedFileName(file.name);
    setExtractionProgress(
      currentLang === 'om'
        ? `Faayila "${file.name}" qindeessaa jira...`
        : `"${file.name}" በማቀነባበር ላይ...`
    );

    try {
      const fileNameLower = file.name.toLowerCase();

      // 1. Plain Text (.txt)
      if (file.type === 'text/plain' || fileNameLower.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = (event.target?.result as string) || '';
          setSourceText(text);
          setIsExtractingFile(false);
          setExtractionProgress(null);
        };
        reader.onerror = () => {
          setError(currentLang === 'om' ? 'Faayila barreeffamaa dubbisuun hin danda\'amne.' : 'የጽሑፍ ፋይል ማንበብ አልተቻለም።');
          setIsExtractingFile(false);
          setExtractionProgress(null);
        };
        reader.readAsText(file);
        return;
      }

      // 2. Microsoft Word Document (.docx)
      if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileNameLower.endsWith('.docx')
      ) {
        setExtractionProgress(
          currentLang === 'om'
            ? 'Sanada Word (.docx) keessaa barreeffama baasaa jira...'
            : 'ከዎርድ (.docx) ሰነድ ጽሑፍ በማውጣት ላይ...'
        );
        const arrayBuffer = await file.arrayBuffer();
        const docxResult = await mammoth.extractRawText({ arrayBuffer });
        if (docxResult && docxResult.value) {
          setSourceText(docxResult.value.trim());
          setIsExtractingFile(false);
          setExtractionProgress(null);
          return;
        } else {
          throw new Error('Word (.docx) empty or unsupported format');
        }
      }

      // 3. PDF or Scanned Legal Images (PNG, JPG, JPEG, WEBP) via Gemini Vision OCR
      setExtractionProgress(
        currentLang === 'om'
          ? 'AI Vision OCR: Sanada PDF/Suuraa irraa barreeffama qulqullinaan baasaa jira...'
          : 'በAI Vision OCR ከሰነዱ ጽሑፍ በማውጣት ላይ...'
      );

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const resultStr = (event.target?.result as string) || '';
          const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          const mimeType = file.type || (fileNameLower.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

          const analysis = await analyzeLegalDocument({
            fileData: base64Data,
            mimeType: mimeType,
            fileName: file.name,
            analysisType: 'extract_text',
            outputLanguages: [sourceLang],
          });

          const extracted = analysis.analysis || 
            (analysis.separatedVersions && (analysis.separatedVersions.om || analysis.separatedVersions.am || analysis.separatedVersions.en)) || 
            '';

          if (extracted.trim()) {
            setSourceText(extracted.trim());
          } else {
            setError(
              currentLang === 'om'
                ? 'Barreeffamni sanada kana keessaa argamuu hin dandeenye.'
                : 'ከሰነዱ ውስጥ ጽሑፍ ማግኘት አልተቻለም።'
            );
          }
        } catch (ocrErr: any) {
          console.error('OCR Extraction error:', ocrErr);
          setError(ocrErr.message || 'Failed to extract text from document');
        } finally {
          setIsExtractingFile(false);
          setExtractionProgress(null);
        }
      };

      reader.onerror = () => {
        setError(currentLang === 'om' ? 'Faayilicha dubbisuun hin danda\'amne.' : 'ፋይሉን ማንበብ አልተቻለም።');
        setIsExtractingFile(false);
        setExtractionProgress(null);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(err.message || 'Error processing document file');
      setIsExtractingFile(false);
      setExtractionProgress(null);
    }
  };

  // Swap source and target languages
  const handleSwap = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    if (result) {
      setSourceText(result.translatedText);
      setResult(null);
    }
  };

  // Sample legal snippets for instant testing
  const sampleLegalTexts = [
    {
      title: "Labsii 1156/2019 (Afaan Oromoo)",
      lang: 'om' as Language,
      text: "Bu'uura Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2019 Keeyyata 27(1)(a)tiin, hojjetaan heeyyama malee guyyoota walitti aanan shan (5) hojii irraa hafe, hojjechiisaan akeekkachiisa malee waliigaltee hojii addaan kutuu ni danda'a.",
    },
    {
      title: "የንግድ ሕግ አንቀጽ 315 (አማርኛ)",
      lang: 'am' as Language,
      text: "በአዲሱ የንግድ ሕግ አዋጅ ቁጥር 1243/2013 አንቀጽ 315 መሰረት የዳይሬክተሮች ቦርድ የባለአክሲዮኖችን ጠቅላላ ጉባዔ የመጥራት ስልጣን ያለው ሲሆን፣ የካፒታሉን 10 በመቶ የሚወክሉ ባለአክሲዮኖችም ጉባዔው እንዲጠራ የማስገደድ መብት አላቸው።",
    },
    {
      title: "Cassation Decision Precedent (English)",
      lang: 'en' as Language,
      text: "According to the binding legal interpretation of the Federal Supreme Court Cassation Division in File No. 154211 (Vol. 24), an employee wrongfully terminated without procedural due process is entitled to reinstatement or statutory compensation equivalent to three months of the employee’s average wage.",
    },
  ];

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setError(null);

    try {
      const resp = await translateLegalText({
        sourceText,
        sourceLang,
        targetLang,
        mode: isSameLanguage ? 'proofread_rewrite' : 'translate',
      });
      setResult(resp);
      saveOfflineTranslationToDB({
        sourceText,
        translatedText: resp.translatedText,
        sourceLang,
        targetLangs: [targetLang],
        taskType: 'translate',
        title: `Hiikkaa / ትርጉም: ${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}`,
      });
      
      // Track in analytics
      analyticsService.trackTranslation(sourceLang, targetLang);
    } catch (e: any) {
      setError(e.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.translatedText) return;
    await navigator.clipboard.writeText(result.translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!result?.translatedText) return;
    saveDocument({
      title: `Hiikkaa / ትርጉም: ${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}`,
      taskType: 'translate',
      prompt: sourceText,
      outputLanguages: [targetLang],
      content: result.translatedText,
      tags: ['Translation', sourceLang, targetLang],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    const handleGlobalSave = () => {
      if (result?.translatedText) {
        handleSave();
      }
    };

    const handleGlobalPrint = () => {
      if (result?.translatedText) {
        window.print();
      }
    };

    window.addEventListener('seera:save_current_document', handleGlobalSave);
    window.addEventListener('seera:print_current_document', handleGlobalPrint);

    return () => {
      window.removeEventListener('seera:save_current_document', handleGlobalSave);
      window.removeEventListener('seera:print_current_document', handleGlobalPrint);
    };
  }, [result, sourceLang, targetLang, sourceText]);

  const getButtonText = () => {
    if (isSameLanguage) {
      return currentLang === 'om' ? 'FOOYYEESSI / GULAALI' : currentLang === 'am' ? 'አሻሽል / አርም' : 'IMPROVE & REWRITE';
    }
    return currentLang === 'om' ? 'HIIKKAA' : currentLang === 'am' ? 'ተርጉም' : 'TRANSLATE';
  };

  return (
    <div className="space-y-8 pb-16 overflow-y-auto max-h-screen">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
          <Languages className="w-7 h-7 text-emerald-400" />
          <span>{t.translateView.title}</span>
        </h1>
        <p className="mt-1 text-slate-400 text-sm">{t.translateView.subtitle}</p>
      </div>

      {/* Mandatory Terminology & Citations Preservation Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-slate-200">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-amber-300">
            {t.translateView.legalPreservationRuleTitle}
          </div>
          <p className="text-slate-300">
            {t.translateView.legalPreservationRuleDesc} (Keeyyata / አንቀጽ / Article, Labsii Lakk. / አዋጅ ቁጥር / Proclamation No., Mana Murtii Waliigalaa / ጠቅላይ ፍርድ ቤት).
          </p>
        </div>
      </div>

      {/* Language Direction Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Source Language Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t.common.sourceLanguage}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSourceLang('om')}
                className={`py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                  sourceLang === 'om'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                Afaan Oromoo
              </button>
              <button
                onClick={() => setSourceLang('am')}
                className={`py-2 px-3 text-xs font-ethiopic font-medium rounded-lg transition-all ${
                  sourceLang === 'am'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                አማርኛ
              </button>
              <button
                onClick={() => setSourceLang('en')}
                className={`py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                  sourceLang === 'en'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Swap Button */}
          <div className="self-end pb-1">
            <button
              onClick={handleSwap}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-transform hover:scale-105 active:scale-95"
              title={t.translateView.swapDirection}
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Target Language Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t.common.targetLanguage}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTargetLang('om')}
                className={`py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                  targetLang === 'om'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                Afaan Oromoo
              </button>
              <button
                onClick={() => setTargetLang('am')}
                className={`py-2 px-3 text-xs font-ethiopic font-medium rounded-lg transition-all ${
                  targetLang === 'am'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                አማርኛ
              </button>
              <button
                onClick={() => setTargetLang('en')}
                className={`py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                  targetLang === 'en'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Proofreading Mode Notification (When Source === Target) */}
        {isSameLanguage && (
          <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
            <span>{t.translateView.proofreadingBadge}</span>
          </div>
        )}
      </div>

      {/* Sample Snippets Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <span className="text-xs text-slate-400 whitespace-nowrap">Sample Legal Sources:</span>
        {sampleLegalTexts.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSourceText(sample.text);
              setSourceLang(sample.lang);
            }}
            className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs whitespace-nowrap transition-colors"
          >
            {sample.title}
          </button>
        ))}
      </div>

      {/* Two Panes: Source & Target */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Pane */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          {/* Hidden File Input for PDF, Word .docx, Image */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
            className="hidden"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Source ({sourceLang.toUpperCase()})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {sourceText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            {/* Document Upload Buttons (PDF, Word, Image) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingFile}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                title="Sanada PDF, Word (.docx), ykn Suuraa galchi"
              >
                <FileUp className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentLang === 'om' ? 'Sanada Galchi (Upload File)' : currentLang === 'am' ? 'ሰነድ ስቀል' : 'Upload Document'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                <span className="text-rose-400 font-bold">PDF</span>
                <span>•</span>
                <span className="text-blue-400 font-bold">Word</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">Suuraa (Image)</span>
              </div>

              {sourceText && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceText('');
                    setExtractedFileName(null);
                  }}
                  className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Clear text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Extraction Progress Status Banner */}
          {isExtractingFile && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300 animate-pulse font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>{extractionProgress || 'Sanada qindeessaa jira...'}</span>
            </div>
          )}

          {extractedFileName && !isExtractingFile && (
            <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2 truncate">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Faayila qophaa'e: <strong>{extractedFileName}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setExtractedFileName(null)}
                className="text-slate-400 hover:text-white ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={t.translateView.inputPlaceholder}
            rows={12}
            className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70 leading-relaxed font-sans"
          />

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              {isTranslating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.actions.translating}</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  <span>{getButtonText()}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Target Output Pane */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isSameLanguage ? 'Proofread / Rewritten Legal Text' : `Translation (${targetLang.toUpperCase()})`}
            </span>
            {result?.translatedText && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportToWord(result.translatedText, `hiikkaa_${new Date().toISOString().slice(0,10)}.docx`)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-blue-600/90 hover:bg-blue-500 text-white font-bold transition-all shadow-sm"
                  title="Download as Word"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Word</span>
                </button>
                <button
                  onClick={() => setIsPdfModalOpen(true)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-red-600/90 hover:bg-red-500 text-white font-bold transition-all shadow-sm"
                  title="Download as PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-amber-400 font-semibold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t.actions.copied : t.actions.copy}</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-amber-400 font-semibold transition-colors ml-1"
                >
                  {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5" />}
                  <span>{saved ? t.actions.saved : t.actions.save}</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-full flex-1 min-h-[280px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap overflow-y-auto selection:bg-amber-500/20">
            {result ? (
              result.translatedText
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs">
                <Languages className="w-8 h-8 mb-2 opacity-40" />
                <span>Bu'aan hiikkaa asitti mul'ata / የትርጉም ውጤት እዚህ ይታያል</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {result && (
        <PdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          currentLang={currentLang}
          title={`Legal Translation (${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()})`}
          taskType="translate"
          content={result.translatedText}
          outputLanguages={[targetLang]}
        />
      )}
    </div>
  );
};

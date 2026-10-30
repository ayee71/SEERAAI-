import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Language } from '../i18n/translations';
import { openFileWithNativeChooser } from '../services/legalDocumentExport';

interface OpenWithAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  title: string;
  fileBlob?: Blob | null;
  filename?: string;
  fileType?: 'pdf' | 'docx' | 'txt';
  onDirectExport?: (type: 'pdf' | 'docx' | 'txt') => Promise<Blob | null | void>;
}

export const OpenWithAppModal: React.FC<OpenWithAppModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  title,
  fileBlob,
  filename = 'SeeraAI_Legal_Document.pdf',
  fileType = 'pdf',
  onDirectExport,
}) => {
  const [selectedApp, setSelectedApp] = useState<'tecno' | 'drive' | 'files' | 'dropbox' | 'edge'>('tecno');
  const [preferenceSaved, setPreferenceSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const getEffectiveBlob = async (): Promise<Blob | null> => {
    if (fileBlob) return fileBlob;
    if (onDirectExport) {
      setIsLoading(true);
      try {
        const generated = await onDirectExport(fileType);
        if (generated instanceof Blob) return generated;
      } catch (e) {
        console.error('Blob generation failed:', e);
      } finally {
        setIsLoading(false);
      }
    }
    // Fallback blob
    return new Blob([title], { type: 'text/plain' });
  };

  const handleOpenAction = async (isAlways: boolean) => {
    setIsLoading(true);
    try {
      const activeBlob = await getEffectiveBlob();
      const effectiveFilename = filename || `${title.replace(/\s+/g, '_')}.${fileType}`;

      if (isAlways) {
        localStorage.setItem('seera_preferred_file_app', selectedApp);
        setPreferenceSaved(true);
      }

      if (selectedApp === 'tecno') {
        // Trigger Native Android/System "Open with..." Chooser via Web Share
        if (activeBlob) {
          const shared = await openFileWithNativeChooser(activeBlob, effectiveFilename, title);
          if (shared) {
            onClose();
            return;
          }
        }
      }

      if (selectedApp === 'drive') {
        // Open PDF / Doc in Drive / Browser Blob preview
        if (activeBlob) {
          const url = URL.createObjectURL(activeBlob);
          window.open(url, '_blank');
        }
      } else if (selectedApp === 'files') {
        // Download directly to device Files / Downloads folder
        if (activeBlob) {
          const url = URL.createObjectURL(activeBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = effectiveFilename;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (selectedApp === 'dropbox' || selectedApp === 'edge') {
        // Open in browser tab
        if (activeBlob) {
          const url = URL.createObjectURL(activeBlob);
          window.open(url, '_blank');
        }
      } else {
        // Fallback native share
        if (activeBlob) {
          await openFileWithNativeChooser(activeBlob, effectiveFilename, title);
        }
      }

      onClose();
    } catch (err) {
      console.error('Open with app failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#18191c] border-t border-slate-800 rounded-t-3xl p-6 shadow-2xl space-y-6 text-slate-100 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100 font-sans tracking-wide">
            {currentLang === 'om'
              ? 'Bani Nawaan (Open with)'
              : currentLang === 'am'
              ? 'በዚህ ይክፈቱ (Open with)'
              : 'Open with'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recommended Primary App Card (Matching TECNO File Viewer in Screenshot) */}
        <div
          onClick={() => setSelectedApp('tecno')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
            selectedApp === 'tecno'
              ? 'bg-slate-800/90 border-blue-500/80 shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/40'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md font-bold text-xl">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm sm:text-base">
                  TECNO File Viewer
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  ( Recommend )
                </span>
              </div>
              <span className="text-xs text-slate-400 block mt-0.5">
                {currentLang === 'om'
                  ? 'Banituu sanadaa Android/Device'
                  : currentLang === 'am'
                  ? 'የመሳሪያው የሰነድ መክፈቻ'
                  : 'Device default legal file viewer'}
              </span>
            </div>
          </div>

          <div
            className={`w-6 h-6 rounded-full border flex items-center justify-center ${
              selectedApp === 'tecno'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-slate-600 bg-slate-950'
            }`}
          >
            {selectedApp === 'tecno' && <Check className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Apps Grid (Matching Screenshot: Drive, Files by Google, Dropbox, Edge) */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {/* 1. Drive */}
          <button
            type="button"
            onClick={() => setSelectedApp('drive')}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              selectedApp === 'drive'
                ? 'bg-slate-800 border-blue-500/80 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-sm">
              📐
            </div>
            <span className="text-[11px] font-medium text-slate-300 leading-tight">
              Drive<br />
              <span className="text-[9px] text-slate-400">PDF Viewer</span>
            </span>
          </button>

          {/* 2. Files by Google */}
          <button
            type="button"
            onClick={() => setSelectedApp('files')}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              selectedApp === 'files'
                ? 'bg-slate-800 border-blue-500/80 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-2xl shadow-sm">
              📁
            </div>
            <span className="text-[11px] font-medium text-slate-300 leading-tight">
              Files<br />
              <span className="text-[9px] text-slate-400">by Google</span>
            </span>
          </button>

          {/* 3. Dropbox PDF Viewer */}
          <button
            type="button"
            onClick={() => setSelectedApp('dropbox')}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              selectedApp === 'dropbox'
                ? 'bg-slate-800 border-blue-500/80 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl shadow-sm">
              📦
            </div>
            <span className="text-[11px] font-medium text-slate-300 leading-tight">
              Dropbox<br />
              <span className="text-[9px] text-slate-400">PDF Viewer</span>
            </span>
          </button>

          {/* 4. Microsoft Edge / Browser Viewer */}
          <button
            type="button"
            onClick={() => setSelectedApp('edge')}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              selectedApp === 'edge'
                ? 'bg-slate-800 border-blue-500/80 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shadow-sm">
              🌐
            </div>
            <span className="text-[11px] font-medium text-slate-300 leading-tight">
              Edge<br />
              <span className="text-[9px] text-slate-400">Browser</span>
            </span>
          </button>
        </div>

        {/* Dots Pagination Indicator (Matching Screenshot) */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
        </div>

        {/* Action Buttons: Just once / Always (Matching Screenshot) */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleOpenAction(false)}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer border border-slate-700 text-center shadow-md active:scale-95 disabled:opacity-50"
          >
            {isLoading
              ? 'Banaas jira...'
              : currentLang === 'om'
              ? "Si'a tokko qofa (Just once)"
              : currentLang === 'am'
              ? 'ለአንድ ጊዜ ብቻ (Just once)'
              : 'Just once'}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleOpenAction(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all cursor-pointer text-center shadow-lg shadow-blue-950/50 active:scale-95 disabled:opacity-50"
          >
            {isLoading
              ? 'Banaas jira...'
              : currentLang === 'om'
              ? 'Yeroo Hunda (Always)'
              : currentLang === 'am'
              ? 'ሁልጊዜ (Always)'
              : 'Always'}
          </button>
        </div>
      </div>
    </div>
  );
};

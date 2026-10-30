import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { LegalCitationFinder } from './LegalCitationFinder';
import { X, BookOpen, Sparkles } from 'lucide-react';

interface CitationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSelect: (citation: string) => void;
  initialQuery?: string;
}

export const CitationPickerModal: React.FC<CitationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSelect,
  initialQuery = '',
}) => {
  const t = translations[currentLang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>{currentLang === 'om' ? 'Wabii Seeraa Filadhu' : currentLang === 'am' ? 'የሕግ ማጣቀሻ ይምረጡ' : 'Select Legal Citation'}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-mono border border-amber-500/20 uppercase">
                  Search & Insert
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' 
                  ? 'Koodii Siivilii, Labsii 1156, SDFHH, fi kkf keessaa filachuun battalatti galchi.' 
                  : 'ከፍትሐብሔር ሕግ፣ ከአዋጅ 1156፣ ከሥነ-ሥርዓት ሕግ ወዘተ በመምረጥ ወዲያውኑ ያስገቡ።'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Searchable List */}
        <div className="flex-1 overflow-y-auto bg-slate-900/50">
          <LegalCitationFinder
            currentLang={currentLang}
            initialQuery={initialQuery}
            isEmbedded={true}
            onInsertCitation={(text) => {
              onSelect(text);
              onClose();
            }}
          />
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentLang === 'om' ? 'Wabiilee qophaa\'an hunda battalatti argattu.' : 'ሁሉንም የተዘጋጁ ማጣቀሻዎችን ወዲያውኑ ያገኛሉ።'}</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-bold transition-all"
          >
            {currentLang === 'om' ? 'Cufi' : 'ዝጋ'}
          </button>
        </div>
      </div>
    </div>
  );
};

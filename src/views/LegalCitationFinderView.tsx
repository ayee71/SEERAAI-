import React from 'react';
import { Language } from '../i18n/translations';
import { LegalCitationFinder } from '../components/LegalCitationFinder';

interface LegalCitationFinderViewProps {
  currentLang: Language;
  onNavigateTab?: (tab: string, query?: string) => void;
}

export const LegalCitationFinderView: React.FC<LegalCitationFinderViewProps> = ({
  currentLang,
  onNavigateTab,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6">
      <LegalCitationFinder
        currentLang={currentLang}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};

export default LegalCitationFinderView;

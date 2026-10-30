import React from 'react';
import { Language, translations } from '../i18n/translations';

interface LibraryViewProps {
  currentLang: Language;
  onNavigateTab: (tab: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ currentLang, onNavigateTab }) => {
  const t = translations[currentLang];
  
  const libraryItems = [
    { 
      id: 'telegramArchive', 
      label: currentLang === 'om' ? 'Kuusaa Telegram 1,500+ (Precedent Files)' : 'Telegram Master Archive 1,500+', 
      emoji: '✈️',
      desc: currentLang === 'om' ? 'Faayilaalee 1,500+ cuunfaa cinaa, Word, Text fi PDF tiin' : '1,500+ files with side-by-side summaries, Word & Text'
    },
    { 
      id: 'templates', 
      label: t.nav.templates, 
      emoji: '📝',
      desc: currentLang === 'om' ? 'Wixineewwan waliigaltee fi xalayaalee seeraa' : 'Legal contract and pleading templates'
    },
    { 
      id: 'legislationRepository', 
      label: currentLang === 'om' ? 'Labsiilee & Dambiilee' : 'Laws & Directives', 
      emoji: '📚',
      desc: currentLang === 'om' ? 'Labsiilee Caffee Oromiyaa fi Federaalaa guutuu' : 'Complete Oromia & Federal laws'
    },
    { 
      id: 'cassation', 
      label: t.nav.cassation, 
      emoji: '🏛️',
      desc: currentLang === 'om' ? 'Murtiiwwan Dhaddacha Ijibbaataa jildii 1-25+' : 'Federal & Oromia Supreme Cassation Rulings'
    },
    { 
      id: 'legalQnA', 
      label: currentLang === 'om' ? 'Kuusaa Gaaffii & Deebii' : 'Legal Q&A Archive', 
      emoji: '💬',
      desc: currentLang === 'om' ? 'Gaaffiilee seeraa deebiin kennameef & sagaleen dubbifaman' : 'Answered questions with Oromo audio reading'
    },
    { 
      id: 'glossary', 
      label: t.nav.glossary, 
      emoji: '📖',
      desc: currentLang === 'om' ? 'Galmee jechoota seeraa afaan sadeeniin' : 'Trilingual legal terminology glossary'
    },
    { 
      id: 'websterDictionary', 
      label: "Webster's New World Law Dictionary (PDF & A-Z)", 
      emoji: '📕',
      desc: currentLang === 'om' ? 'Galmee jechoota seeraa addunyaa, Laatiinii fi PDF guutuu (Susan Ellis Wild, Wiley Publishing)' : "World legal terminology, Latin maxims, abbreviations & 334-page PDF book"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold font-serif-legal text-slate-100 flex items-center gap-2.5">
          <span>📂</span>
          <span>{currentLang === 'om' ? 'Kuusaa Sanadootaa (Library)' : 'Document Library'}</span>
        </h2>
        <p className="text-xs text-slate-400">
          {currentLang === 'om'
            ? 'Faayilaalee Telegram, murtiiwwan dhaddacha ijoo, labsiilee fi sanadoota seeraa hunda bakka tokkotti argadhaa.'
            : 'Access all Telegram archives, cassation rulings, laws, and legal templates in one place.'}
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium font-mono">
          <span>🌐</span>
          <span>Large datasets are available for download at saorethio1.com</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {libraryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigateTab(item.id)}
            className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 transition-all text-left cursor-pointer group shadow-sm"
          >
            <span className="text-3xl p-2 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-105 transition-transform">{item.emoji}</span>
            <div className="space-y-1">
              <span className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors block">{item.label}</span>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

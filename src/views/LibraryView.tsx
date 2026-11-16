import React, { useState, useMemo } from 'react';
import { Language, translations } from '../i18n/translations';
import { searchLegislationRepository } from '../services/legislationSyncService';
import { searchLegalDocuments, cleanRagChunk, formatRagResultsToEssay } from '../services/ragService';
import { HighlightText } from '../components/HighlightText';
import { Search, X, Sparkles, MessageSquare, BookOpen, Layers, RefreshCw, ChevronRight, FileText } from 'lucide-react';

interface LibraryViewProps {
  currentLang: Language;
  onNavigateTab: (tab: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ currentLang, onNavigateTab }) => {
  const t = translations[currentLang];
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchType, setActiveSearchType] = useState<'legislation' | 'telegram'>('legislation');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isHighlightEnabled, setIsHighlightEnabled] = useState(true);

  // Telegram Archive Search State
  const [telegramResults, setTelegramResults] = useState<any[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [telegramExpandedIndex, setTelegramExpandedIndex] = useState<number | null>(null);

  const handleTelegramAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiSearching(true);
    setTelegramResults([]);
    try {
      // Query the synchronized Telegram legal channel archive using the existing backend RAG service
      const results = await searchLegalDocuments(searchQuery, 10);
      setTelegramResults(results);
    } catch (err) {
      console.error('Telegram AI Search failed:', err);
    } finally {
      setIsAiSearching(false);
    }
  };

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

  const quickSearchTags = [
    '1156/2019',
    '242/2014',
    'lafa baadiyyaa',
    'beenyaa',
    'kireeffataa',
    '165/1960',
    'dhaala',
    'walfuutota'
  ];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchLegislationRepository(searchQuery);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold font-serif-legal text-slate-100 flex items-center gap-2.5">
          <span>📂</span>
          <span>{currentLang === 'om' ? 'Kuusaa Sanadootaa & Barbaacha Seeraa (Library & Live Highlight Search)' : 'Document Library & Highlight Search'}</span>
        </h2>
        <p className="text-xs text-slate-400">
          {currentLang === 'om'
            ? 'Faayilaalee Telegram, murtiiwwan dhaddacha ijoo, labsiilee fi sanadoota seeraa hunda bakka tokkotti barbaadaa, jechoota wal-makaas calaqqisiisaa.'
            : 'Search legislation, cassation rulings, and legal texts with real-time keyword highlighting.'}
        </p>
      </div>

      {/* Search Type Selector */}
      <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveSearchType('legislation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSearchType === 'legislation'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{currentLang === 'om' ? 'Labsiilee' : 'Legislation'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSearchType('telegram');
            if (searchQuery.trim() && telegramResults.length === 0) handleTelegramAiSearch();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSearchType === 'telegram'
              ? 'bg-sky-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{currentLang === 'om' ? 'Arkaba Telegram' : 'Telegram Archive'}</span>
        </button>
      </div>

      {/* Interactive Search Bar */}
      <div className={`bg-gradient-to-br border rounded-3xl p-5 shadow-xl space-y-3 transition-all ${
        activeSearchType === 'telegram' 
          ? 'from-sky-950/20 to-slate-950 border-sky-500/30' 
          : 'from-slate-900 to-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className={`flex items-center gap-1.5 ${activeSearchType === 'telegram' ? 'text-sky-400' : 'text-amber-400'}`}>
            {activeSearchType === 'telegram' ? <Layers className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            <span>
              {activeSearchType === 'telegram' 
                ? (currentLang === 'om' ? 'AI Deep Search: Telegram Master Archive' : 'AI-Powered Telegram Archive Search')
                : (currentLang === 'om' ? 'Barbaacha Kuusaa Seeraa (Legislation Search)' : 'Legislation Keyword Search')}
            </span>
          </span>
          {searchQuery && activeSearchType === 'legislation' && (
            <span className="text-[11px] text-slate-400">
              Argaman: <strong className="text-amber-300 font-bold">{searchResults.length}</strong>
            </span>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && activeSearchType === 'telegram') handleTelegramAiSearch();
            }}
            placeholder={
              activeSearchType === 'telegram'
                ? (currentLang === 'om' ? 'Gaaffii ykn jecha barbaachaa galchaa (fkn: "murtii bittaa manaa")...' : 'Search Telegram archive using AI (e.g. "labor dispute rulings")...')
                : (currentLang === 'om' ? 'Jecha ykn lakkoofsa labsii galchaa (fkn: "1156/2019")...' : 'Enter keyword or proclamation number (e.g. "1156/2019")...')
            }
            className={`w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-950 border text-slate-100 placeholder-slate-500 focus:outline-none text-sm font-sans transition-all ${
              activeSearchType === 'telegram' ? 'border-sky-500/40 focus:border-sky-400' : 'border-slate-800 focus:border-amber-500'
            }`}
          />
          <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${activeSearchType === 'telegram' ? 'text-sky-500/60' : 'text-slate-500'}`} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {activeSearchType === 'telegram' && (
              <button
                type="button"
                onClick={handleTelegramAiSearch}
                disabled={isAiSearching || !searchQuery.trim()}
                className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 transition-all cursor-pointer"
                title="AI Search"
              >
                {isAiSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Highlight Toggle (Only for Legislation) */}
        {activeSearchType === 'legislation' && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="highlight-toggle"
              checked={isHighlightEnabled}
              onChange={() => setIsHighlightEnabled(!isHighlightEnabled)}
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="highlight-toggle" className="text-xs text-slate-400 cursor-pointer select-none">
              {currentLang === 'om' ? 'Jechoota Calaqqisiisi (Highlight Search Terms)' : 'Highlight Search Terms'}
            </label>
          </div>
        )}

        {/* Quick Search Tag Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            {currentLang === 'om' ? 'Fakkeenya Barbaachaa:' : 'Quick Tags:'}
          </span>
          {(activeSearchType === 'telegram' ? ['murtii ijibbaataa', 'waliigaltee', 'hojjetaa', 'dhaala'] : quickSearchTags).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSearchQuery(tag);
                if (activeSearchType === 'telegram') setTimeout(handleTelegramAiSearch, 100);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium transition-all cursor-pointer border ${
                searchQuery.toLowerCase() === tag.toLowerCase()
                  ? (activeSearchType === 'telegram' ? 'bg-sky-500 text-white border-sky-400 font-bold' : 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow')
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-slate-700'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Display */}
      {activeSearchType === 'telegram' && (searchQuery.trim() !== '' || telegramResults.length > 0) && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-2 font-mono">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>
                {isAiSearching 
                  ? (currentLang === 'om' ? 'AI\'n Arkaba Telegram qorachaa jira...' : 'AI is searching the Telegram Archive...')
                  : (currentLang === 'om' 
                    ? `Bu'aa Barbaacha Telegram (${telegramResults.length} argamaniiru):` 
                    : `Telegram Archive matches (${telegramResults.length} found):`)}
              </span>
            </span>
          </div>

          {telegramResults.length === 0 && !isAiSearching ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <div className="text-4xl text-sky-500/50">📡</div>
              <h4 className="text-sm font-bold text-slate-200">
                {currentLang === 'om' ? 'Bu\'aan barbaacha Telegram hin argamne' : 'No matching Telegram posts found'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {currentLang === 'om'
                  ? 'Jecha biraatiin yaalaamaa ykn mata-duree seeraa qabatamaa galchaa.'
                  : 'Try searching for specific legal topics or cassation file numbers.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {telegramResults.map((item, idx) => {
                const isExpanded = telegramExpandedIndex === idx;
                const cleanedText = cleanRagChunk(item.text);
                const metadata = item.metadata || {};

                return (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-2xl p-5 shadow-lg space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30 font-bold">
                            TELEGRAM ARCHIVE
                          </span>
                          <span className="text-slate-500">
                            {metadata.channelTitle || '@seeraai_ethio'}
                          </span>
                          {metadata.referenceNumber && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {metadata.referenceNumber}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-100 font-serif leading-relaxed line-clamp-2">
                          {cleanedText.split('\n')[0].replace(/^[⚖️📢📘📜🏛️•\s]+/, '')}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTelegramExpandedIndex(isExpanded ? null : idx)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                          isExpanded ? 'bg-slate-800 text-slate-300' : 'bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'
                        }`}
                      >
                        {isExpanded ? 'Cufi 🔼' : 'Dubbisi 🔽'}
                      </button>
                    </div>

                    <div className={`p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed overflow-hidden transition-all ${
                      isExpanded ? 'max-h-none' : 'max-h-24 relative'
                    }`}>
                      <div className="whitespace-pre-wrap">{cleanedText}</div>
                      {!isExpanded && (
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                      )}
                    </div>

                    {isExpanded && metadata.postUrl && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                        <a 
                          href={metadata.postUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold underline"
                        >
                          Telegram irratti ilaali <ChevronRight className="w-3 h-3" />
                        </a>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Relevance: {Math.round((item.similarity || 0.8) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legislation Search Results Display */}
      {activeSearchType === 'legislation' && searchQuery.trim() !== '' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-2 font-mono">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {currentLang === 'om'
                  ? `Bu'aa Barbaacha Jecha "${searchQuery}" (${searchResults.length} items):`
                  : `Search matches for "${searchQuery}" (${searchResults.length} items):`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-amber-400 hover:underline font-bold cursor-pointer"
            >
              {currentLang === 'om' ? 'Haquu (Clear Search)' : 'Clear Search'}
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <div className="text-4xl">🔎</div>
              <h4 className="text-sm font-bold text-slate-200">
                {currentLang === 'om' ? 'Wanti barbaaddan hin argamne' : 'No matching legislation found'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {currentLang === 'om'
                  ? 'Jecha biraatiin yaalaamaa ykn tag "1156/2019" ykn "lafa" jedhu tuquun irra deebiadhaa.'
                  : 'Try another keyword or select one of the quick tags above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((item) => {
                const isExpanded = expandedId === item.id;
                const isOromia = item.jurisdiction === 'oromia';
                const titleText = item.title[currentLang] || item.title.om;
                const summaryText = item.summary[currentLang] || item.summary.om;
                const authorityText = item.authority[currentLang] || item.authority.om;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            isOromia
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                          }`}>
                            {isOromia ? '🌳 OROMIA REGIONAL' : '🏛️ FEDERAL FDRE'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase font-bold">
                            {item.type.replace('_', ' ')}
                          </span>
                          <span className="text-slate-400">
                            {item.number} • Bara {item.yearEC} B.A.
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-slate-100 font-serif leading-snug">
                          <HighlightText text={titleText} query={searchQuery} enabled={isHighlightEnabled} />
                        </h3>

                        <p className="text-xs text-slate-400">
                          <strong>Qaama Baase:</strong> <HighlightText text={authorityText} query={searchQuery} enabled={isHighlightEnabled} />
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shrink-0"
                      >
                        {isExpanded ? 'Cufi 🔼' : 'Ilaali 🔽'}
                      </button>
                    </div>

                    {/* Summary Preview */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <HighlightText text={summaryText} query={searchQuery} enabled={isHighlightEnabled} />
                    </div>

                    {/* Expanded Full-Text Articles & Key Principles */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800 space-y-3 animate-in fade-in duration-200">
                        {item.fullTextArticles && item.fullTextArticles.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-amber-400 font-mono uppercase">
                              Keeyyattoota Seeraa (Articles & Clauses):
                            </h4>
                            <div className="space-y-2">
                              {item.fullTextArticles.map((art, idx) => {
                                const artContent = art.content[currentLang] || art.content.om;
                                return (
                                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                                    <div className="text-xs font-bold text-emerald-300 font-mono">
                                      <HighlightText text={`${art.articleNumber} ${art.title ? `• ${art.title}` : ''}`} query={searchQuery} enabled={isHighlightEnabled} />
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed">
                                      <HighlightText text={artContent} query={searchQuery} enabled={isHighlightEnabled} />
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {item.keyPrinciples && (
                          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/50 space-y-1">
                            <h4 className="text-xs font-bold text-purple-300 uppercase font-mono">
                              💡 Yaada Seeraa Dirqisiisaa (Binding Legal Principle):
                            </h4>
                            <p className="text-xs text-slate-200 leading-relaxed font-serif italic">
                              "<HighlightText text={item.keyPrinciples[currentLang] || item.keyPrinciples.om} query={searchQuery} enabled={isHighlightEnabled} />"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Standard Library Hub Directory when no search query */}
      {!searchQuery.trim() && (
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
      )}
    </div>
  );
};

export default LibraryView;

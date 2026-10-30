import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { 
  LegalEnactment, 
  Jurisdiction, 
  LegislationType, 
  LegalCategory 
} from '../data/legislationDatabase';
import { 
  getLegislationSyncStats, 
  performFullLegislationSync, 
  searchLegislationRepository, 
  toggleAutoSync, 
  SyncStats 
} from '../services/legislationSyncService';
import {
  MONITORED_TELEGRAM_CHANNELS,
  TelegramLegalPost,
  getStoredHarvestedPosts,
  harvestFromTelegramChannel,
  ingestTelegramPostToDatabase,
  batchIngestTelegramChannel,
  subscribeToStoredTelegramDocs
} from '../services/telegramLegalHarvesterService';
import { exportLegalDocumentToPdf } from '../services/legalDocumentExport';

interface LegislationRepositoryViewProps {
  currentLang: Language;
  initialSearchQuery?: string;
  onNavigateToAnalysis?: (query: string) => void;
  onNavigateToCassation?: (query: string) => void;
}

export const LegislationRepositoryView: React.FC<LegislationRepositoryViewProps> = ({
  currentLang,
  initialSearchQuery = '',
  onNavigateToAnalysis,
  onNavigateToCassation,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all_laws' | 'telegram_harvester'>('all_laws');
  const [stats, setStats] = useState<SyncStats>(getLegislationSyncStats());
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | 'all'>('all');
  const [selectedType, setSelectedType] = useState<LegislationType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LegalCategory | 'all'>('all');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string | null>(null);
  const [syncPercent, setSyncPercent] = useState<number>(0);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const [expandedEnactmentId, setExpandedEnactmentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Telegram Ingestion & Harvesting States
  const [telegramChannelInput, setTelegramChannelInput] = useState('https://t.me/wakoyeb');
  const [telegramSearchQuery, setTelegramSearchQuery] = useState('');
  const [selectedChannelHandle, setSelectedChannelHandle] = useState<string>('all');
  const [harvestedPosts, setHarvestedPosts] = useState<TelegramLegalPost[]>([]);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [harvestToast, setHarvestToast] = useState<string | null>(null);
  const [expandedTelegramPostId, setExpandedTelegramPostId] = useState<string | null>(null);
  const [isBatchIngesting, setIsBatchIngesting] = useState(false);

  useEffect(() => {
    refreshData();
    // Real-time listener for Telegram legal posts from Firestore
    const unsubscribe = subscribeToStoredTelegramDocs((posts) => {
      setHarvestedPosts(posts.map(p => ({
        ...p,
        isIngested: true,
        extractedTitle: p.title,
        corePrinciples: p.keyPrinciples
      })));
    });
    return () => unsubscribe();
  }, [searchQuery, selectedJurisdiction, selectedType, selectedCategory]);

  const handleBatchIngest = async () => {
    setIsBatchIngesting(true);
    try {
      const res = await batchIngestTelegramChannel(telegramChannelInput, (msg) => {
        setHarvestToast(msg);
      });
      refreshData();
      setHarvestToast(`Maxxansiwwan ${res.ingestedCount} Firestore fi Kuusaa Seeraatti milkiidhaan kuufamaniiru!`);
      setTimeout(() => setHarvestToast(null), 5000);
    } catch (e: any) {
      setHarvestToast(e.message || 'Batch ingest failed');
      setTimeout(() => setHarvestToast(null), 4000);
    } finally {
      setIsBatchIngesting(false);
    }
  };

  const items = React.useMemo(() => {
    return searchLegislationRepository(
      searchQuery,
      selectedJurisdiction,
      selectedType,
      selectedCategory
    );
  }, [searchQuery, selectedJurisdiction, selectedType, selectedCategory]);

  const refreshData = () => {
    setStats(getLegislationSyncStats());
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncPercent(5);
    setSyncProgressMsg(
      currentLang === 'om'
        ? 'Wal-simsiisa Labsiilee Caffee Oromiyaa fi Federaalaa Jalqabamaa Jira...'
        : currentLang === 'am'
        ? 'የጨፌ ኦሮሚያ እና ፌዴራል አዋጆች ማመሳሰል በመጀመር ላይ...'
        : 'Initiating full sync for Oromia and Federal legislation...'
    );

    const result = await performFullLegislationSync((msg, pct) => {
      setSyncProgressMsg(msg);
      setSyncPercent(pct);
    });

    setIsSyncing(false);
    setSyncPercent(100);
    setStats(result.updatedStats);
    refreshData();

    setSyncToast(
      currentLang === 'om'
        ? 'Kuusaan Labsiilee, Dambiilee, Qajeelfamoota fi Murtiilee Ijibbaataa Guutuutti Haaroomeera!'
        : currentLang === 'am'
        ? 'የህግጋት፣ ደንቦች፣ መመሪያዎች እና የሰበር ውሳኔዎች ማከማቻ በሙሉ ተዘምኗል!'
        : 'Legislation, Regulations, Directives & Cassation repository successfully updated!'
    );

    setTimeout(() => {
      setSyncToast(null);
      setSyncProgressMsg(null);
    }, 4000);
  };

  const handleToggleAutoSync = () => {
    const newSetting = !stats.autoSyncEnabled;
    toggleAutoSync(newSetting);
    setStats(getLegislationSyncStats());
  };

  const handleCopyCitation = (item: LegalEnactment) => {
    const textToCopy = `${item.number} - ${item.title[currentLang] || item.title.om}\n${item.summary[currentLang] || item.summary.om}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportPdf = (item: LegalEnactment) => {
    const textContent = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KUUSAA SEERAA (LEGISLATION REPOSITORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lakkoofsa: ${item.number}
Mata Duree: ${item.title[currentLang] || item.title.om}
Qaama Baase: ${item.authority[currentLang] || item.authority.om}
Gosa Seeraa: ${item.type.toUpperCase()} | Naannoo/Federaala: ${item.jurisdiction.toUpperCase()}
Bara: ${item.yearEC} B.A. (${item.yearGC} G.C.)
Sadarkaa: ${item.status.toUpperCase()}

IBSA FI CUUNFAA (SUMMARY):
${item.summary[currentLang] || item.summary.om}

YAADA SEERAA DIRQISIISAA (KEY BINDING PRINCIPLE):
${item.keyPrinciples ? item.keyPrinciples[currentLang] || item.keyPrinciples.om : 'N/A'}

KEEYYATTOOTA SEERAA (ARTICLES):
${(item.fullTextArticles || []).map(a => `\n[${a.articleNumber} - ${a.title || ''}]\n${a.content[currentLang] || a.content.om}`).join('\n')}

Maddi: SAI Ethio Legal Intelligence (www.saorethio1.com)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.number.replace(/[^a-zA-Z0-9]/g, '_')}_SeeraAI_Document.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Telegram Harvesting handler
  const handleHarvestTelegram = async (customChannel?: string) => {
    setIsHarvesting(true);
    const target = customChannel || telegramChannelInput;
    try {
      const result = await harvestFromTelegramChannel(target, telegramSearchQuery);
      setHarvestedPosts(getStoredHarvestedPosts());
      setHarvestToast(result.message);
      setTimeout(() => setHarvestToast(null), 4000);
    } catch (e: any) {
      setHarvestToast(e.message || 'Telegram scraping error');
      setTimeout(() => setHarvestToast(null), 4000);
    } finally {
      setIsHarvesting(false);
    }
  };

  // Ingest specific Telegram post into official Legislation database
  const handleIngestPost = async (post: TelegramLegalPost) => {
    const res = await ingestTelegramPostToDatabase(post);
    setHarvestedPosts(getStoredHarvestedPosts());
    refreshData();
    setHarvestToast(res.message);
    setTimeout(() => setHarvestToast(null), 4000);
  };

  const filteredTelegramPosts = React.useMemo(() => {
    return harvestedPosts.filter(p => {
      const matchesChannel = selectedChannelHandle === 'all' || p.channelHandle === selectedChannelHandle;
      const titleOm = p.extractedTitle?.om || p.title?.om || '';
      const titleAm = p.extractedTitle?.am || p.title?.am || '';
      const matchesQuery = !telegramSearchQuery.trim() || 
        p.rawText.toLowerCase().includes(telegramSearchQuery.toLowerCase()) ||
        p.referenceNumber.toLowerCase().includes(telegramSearchQuery.toLowerCase()) ||
        titleOm.toLowerCase().includes(telegramSearchQuery.toLowerCase()) ||
        titleAm.toLowerCase().includes(telegramSearchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(telegramSearchQuery.toLowerCase()));
      return matchesChannel && matchesQuery;
    });
  }, [harvestedPosts, selectedChannelHandle, telegramSearchQuery]);

  return (
    <div className="space-y-8 pb-16">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📚</span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100">
              {currentLang === 'om' 
                ? 'Kuusaa Labsiilee, Dambiilee & Murtiilee Caffee Oromiyaa fi Federaalaa'
                : currentLang === 'am'
                ? 'የጨፌ ኦሮሚያ እና የፌዴራል አዋጆች፣ ደንቦች እና የሰበር ውሳኔዎች ማከማቻ'
                : 'Caffee Oromiyaa & Federal Legislation & Cassation Repository'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            {currentLang === 'om'
              ? 'Labsiilee Caffee Oromiyaa fi Mana Marii Bakka Bu\'oota Itoophiyaa, dambiilee, qajeelfamoota fi murtiilee dhaddacha ijibbaataa hanga ammaatti bahan hunda kan kuusu, Telegram (@wakoyeb) irraa waraabu fi yeroo yeroon ofiin update godhu.'
              : currentLang === 'am'
              ? 'እስከ አሁን የወጡ የጨፌ ኦሮሚያ እና የኢትዮጵያ ህዝብ ተወካዮች ምክር ቤት አዋጆች፣ ደንቦች፣ መመሪያዎች እና የሰበር ውሳኔዎችን ማከማቻ፣ ከቴሌግራም ቻናል (@wakoyeb) መረጃ ማሰባሰቢያ እና ራስ-አዘምን ስርአት።'
              : 'Unified repository for Caffee Oromiyaa enactments, FDRE Federal proclamations, regulations, directives, Telegram legal harvesting (@wakoyeb), and cassation precedents with live auto-update.'}
          </p>
        </div>

        {/* Top Sub-Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('all_laws')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'all_laws'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span>
            <span>{currentLang === 'om' ? 'Labsiilee & Dambiilee' : currentLang === 'am' ? 'አዋጆችና ደንቦች' : 'Legislation Database'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('telegram_harvester')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'telegram_harvester'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🌐</span>
            <span>{currentLang === 'om' ? 'Social Media & Web Hub' : currentLang === 'am' ? 'ሶሻል ሚዲያ እና ዌብ መረጃ' : 'Social Media & Web Hub'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Bar & Live Metrics Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">
                  {currentLang === 'om' ? 'Haala Wal-simsiisa Kuusaa (Live Auto-Sync Status)' : 'የማከማቻው የቀጥታ ዝመና ሁኔታ (Live Sync)'}
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ONLINE ACTIVE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'om'
                  ? `Haaroomsa Dhiheenyaa: ${new Date(stats.lastSyncTime).toLocaleDateString()} ${new Date(stats.lastSyncTime).toLocaleTimeString()}`
                  : `የመጨረሻ ዝመና፡ ${new Date(stats.lastSyncTime).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAutoSync}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                stats.autoSyncEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>{stats.autoSyncEnabled ? '✅' : '⚪'}</span>
              <span>{stats.autoSyncEnabled ? 'Auto-Update: ON' : 'Auto-Update: OFF'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
              <span>{isSyncing ? 'Haaromaa jira...' : 'Amma Haaroomsi (Sync Now)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'offline_legislation.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>📥</span>
              <span>Download Offline</span>
            </button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isSyncing && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <div className="flex justify-between text-xs text-amber-300">
              <span>{syncProgressMsg}</span>
              <span>{syncPercent}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${syncPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Toast Alert */}
        {syncToast && (
          <div className="p-3.5 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <span>✅</span>
            <span>{syncToast}</span>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2 border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-medium">Ida\'ama Waliigalaa</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{stats.totalCount}</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-emerald-400 font-medium">🌳 Caffee Oromiyaa</div>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">{stats.oromiaCount}</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-cyan-400 font-medium">🏛️ Federaala Itoophiyaa</div>
            <div className="text-lg font-bold text-cyan-300 mt-0.5">{stats.federalCount}</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-amber-400 font-medium">📜 Labsiilee (Procl.)</div>
            <div className="text-lg font-bold text-amber-300 mt-0.5">{stats.proclamationsCount}</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-purple-400 font-medium">📘 Dambiilee (Reg.)</div>
            <div className="text-lg font-bold text-purple-300 mt-0.5">{stats.regulationsCount}</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-blue-400 font-medium">📋 Qajeelfamoota</div>
            <div className="text-lg font-bold text-blue-300 mt-0.5">{stats.directivesCount}</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[11px] text-rose-400 font-medium">⚖️ Ijibbaata (Cass.)</div>
            <div className="text-lg font-bold text-rose-300 mt-0.5">{stats.cassationCount}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 2: TELEGRAM CHANNEL LEGAL HARVESTER & SOCIAL MEDIA INGESTION HUB   */}
      {/* ========================================================================= */}
      {activeSubTab === 'telegram_harvester' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Telegram Ingestion Hero Card */}
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <h2 className="text-xl font-bold text-slate-100">
                    Maddoota Social Media Hunda & Platformii Digitalaa (Telegram, Facebook, X, YouTube, TikTok, LinkedIn & Web)
                  </h2>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Platformii social media hunda (Telegram, Facebook, X/Twitter, YouTube, TikTok, LinkedIn) fi marsariitiiwwan mootummaa irraa murtiilee ijibbaataa, labsiilee fi qajeelfamoota barbaadi, xiinxali, akkasumas gara Kuusaa Seeraatti galchi.
                </p>
              </div>

              {/* Verified Badge */}
              <div className="px-3.5 py-2 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-2 shrink-0">
                <span>🛡️</span>
                <span>Multi-Platform Social Media & Web Scraper Active</span>
              </div>
            </div>

            {/* Monitored Channels Row */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Maddoota Social Media Hunda (All Social Media & Digital Sources):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {MONITORED_TELEGRAM_CHANNELS.map(ch => (
                  <div
                    key={ch.id}
                    onClick={() => {
                      setTelegramChannelInput(ch.url);
                      setSelectedChannelHandle(ch.handle);
                      handleHarvestTelegram(ch.url);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedChannelHandle === ch.handle
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ch.avatarEmoji}</span>
                        <span className="text-xs font-bold text-slate-200">@{ch.handle}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-cyan-400 font-mono">
                        {ch.totalPostsFound} posts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {ch.description[currentLang] || ch.description.om}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                      <a 
                        href={ch.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={(e) => e.stopPropagation()}
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>🔗</span>
                        <span>Telegram irratti bani</span>
                      </a>
                      <span className="text-emerald-400 font-bold">✓ Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom URL & Search Bar */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">
                    Channel / Group Telegram Link (fakkeenyaaf: https://t.me/wakoyeb):
                  </label>
                  <input
                    type="text"
                    value={telegramChannelInput}
                    onChange={(e) => setTelegramChannelInput(e.target.value)}
                    placeholder="https://t.me/wakoyeb ykn @channel_name"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">
                    Jecha Barbaaddan (Filter Keyword / Lakk. Galmee / Labsii):
                  </label>
                  <input
                    type="text"
                    value={telegramSearchQuery}
                    onChange={(e) => setTelegramSearchQuery(e.target.value)}
                    placeholder="Fakkeenya: 'beenyaa', '214539', 'kireeffataa', 'lafa baadiyyaa'..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => handleHarvestTelegram()}
                    disabled={isHarvesting || isBatchIngesting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    <span>{isHarvesting ? '⏳' : '🔍'}</span>
                    <span>{isHarvesting ? 'Waraabaa jira...' : 'Barbaadi & Waraabi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchIngest}
                    disabled={isBatchIngesting || isHarvesting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 shadow-md"
                    title="Channel kana guutummaatti Firestore'tti kuusi"
                  >
                    <span>{isBatchIngesting ? '⏳' : '⚡'}</span>
                    <span>{isBatchIngesting ? 'Firestore\'tti kuusaa jira...' : 'Kuusaa Guutuu Firestore\'tti Galchi'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Harvest Notification Alert */}
            {harvestToast && (
              <div className="p-3.5 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-xs text-cyan-200 flex items-center gap-2">
                <span>🔔</span>
                <span>{harvestToast}</span>
              </div>
            )}
          </div>

          {/* Harvested Telegram Posts Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>📋</span>
                <span>Maxxansiwwan Seeraa Telegram Irraa Qoratamanii Argaman ({filteredTelegramPosts.length}):</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChannelHandle('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    selectedChannelHandle === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Hunda ({harvestedPosts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChannelHandle('wakoyeb')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    selectedChannelHandle === 'wakoyeb' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  @wakoyeb
                </button>
              </div>
            </div>

            {filteredTelegramPosts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <div className="text-4xl">🔍</div>
                <h4 className="text-base font-bold text-slate-200">Maxxansi Barbaaddan Hin Argamne</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Jecha biraa fayyadamaa ykn button 'Barbaadi & Waraabi' jedhu tuquun channel Telegram irraa haaroomsadhaa.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTelegramPosts.map(post => {
                  const isExpanded = expandedTelegramPostId === post.id;
                  return (
                    <div
                      key={post.id}
                      className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-3xl p-5 shadow-xl space-y-4 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                              @{post.channelHandle}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase font-bold">
                              {post.referenceNumber}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                              {post.jurisdiction === 'oromia' ? '🌳 Oromia' : '🏛️ Federal'}
                            </span>
                            <span className="text-slate-500">Maxxansa: {post.publishDate}</span>
                          </div>

                          <h3 className="text-base font-bold text-slate-100 font-serif leading-snug">
                            {(post.extractedTitle && (post.extractedTitle[currentLang] || post.extractedTitle.om)) || (post.title && (post.title[currentLang] || post.title.om)) || post.referenceNumber}
                          </h3>
                        </div>

                        {/* Action Buttons for Telegram Post */}
                        <div className="flex items-center gap-2 shrink-0 self-start">
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                            title="Telegram Post Bani (Open in Telegram)"
                          >
                            <span>🔗</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleIngestPost(post)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                            title="Kuusaa Seeraatti Dabali (Ingest to Repository)"
                          >
                            <span>📥</span>
                            <span>{post.isIngested ? 'Kuufameera ✓' : 'Gara Kuusaatti Galchi'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedTelegramPostId(isExpanded ? null : post.id)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                          >
                            <span>{isExpanded ? 'Cufi 🔼' : 'Ilaali 🔽'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Summary Text */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                        {post.summary[currentLang] || post.summary.om}
                      </div>

                      {/* Expanded Raw Text & Extracted Articles */}
                      {isExpanded && (
                        <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
                          {/* Raw Telegram Post */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                              Barreeffama Guutuu Telegram Irraa:
                            </label>
                            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                              {post.rawText}
                            </pre>
                          </div>

                          {/* Binding Principle */}
                          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/50 space-y-1">
                            <div className="text-[11px] font-bold text-purple-300 uppercase">
                              💡 Yaada Seeraa Dirqisiisaa (Extracted Legal Ratio):
                            </div>
                            <p className="text-xs text-purple-100 font-serif italic">
                              "{((post.corePrinciples && (post.corePrinciples[currentLang] || post.corePrinciples.om)) || (post.keyPrinciples && (post.keyPrinciples[currentLang] || post.keyPrinciples.om))) || 'Yaada seeraa dirqisiisaa eeguu qaba.'}"
                            </p>
                          </div>

                          {/* Quick Citations */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {post.keyArticles.map((art, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300">
                                📌 {art}
                              </span>
                            ))}
                            {onNavigateToAnalysis && (
                              <button
                                type="button"
                                onClick={() => onNavigateToAnalysis(post.referenceNumber)}
                                className="px-3 py-1 rounded-xl bg-slate-950 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold cursor-pointer transition-all ml-auto"
                              >
                                ✨ Analysis View'tti Qori
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 1: ALL LAWS, REGULATIONS, PROCLAMATIONS & CASSATION PRECEDENTS      */}
      {/* ========================================================================= */}
      {activeSubTab === 'all_laws' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Search & Filter Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentLang === 'om'
                    ? 'Lakkoofsa labsii, dambii, murtii ijibbaataa, ykn mata duree barreessaa (fkn: "242/2014", "1156/2019", "lafa", "kireeffataa")...'
                    : currentLang === 'am'
                    ? 'የአዋጅ ቁጥር፣ ደንብ፣ የሰበር መዝገብ ወይም ርዕስ ይፈልጉ (ምሳሌ፡ "1156/2019", "መሬት", "ውርስ")...'
                    : 'Search by proclamation number, title, keyword (e.g. "1156/2019", "land", "labor", "242/2014")...'
                }
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm font-sans"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Jurisdiction Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Naannoo / Federaala (Jurisdiction):
                </label>
                <select
                  value={selectedJurisdiction}
                  onChange={(e) => setSelectedJurisdiction(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Hunda (All Jurisdictions)</option>
                  <option value="oromia">🌳 Mootummaa Naannoo Oromiyaa (Caffee)</option>
                  <option value="federal">🏛️ Federaala Itoophiyaa (FDRE Parliament)</option>
                </select>
              </div>

              {/* Legislation Type Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Gosa Seeraa (Enactment Type):
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Gosa Hunda (All Types)</option>
                  <option value="proclamation">📜 Labsiilee (Proclamations)</option>
                  <option value="regulation">📘 Dambiilee (Regulations)</option>
                  <option value="directive">📋 Qajeelfamoota (Directives)</option>
                  <option value="cassation_decision">⚖️ Murtiilee Ijibbaataa (Cassation)</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Muummee Dhimmaa (Legal Category):
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Muummee Hunda (All Categories)</option>
                  <option value="labor">👔 Hojjetaa fi Hojjachiisaa (Labor)</option>
                  <option value="property_land">🏡 Qabiyyee fi Lafa Baadiyyaa (Property/Land)</option>
                  <option value="civil_contract">📝 Waliigaltee fi Hariiroo (Civil & Contracts)</option>
                  <option value="commercial_tax">💼 Daldalaa fi Gibira (Commercial & Tax)</option>
                  <option value="criminal">🚔 Seera Yakkaa (Criminal)</option>
                  <option value="family">👨‍👩‍👧 Maatii fi Dhaala (Family & Succession)</option>
                  <option value="constitutional_admin">🏛️ Heera fi Bulchiinsa (Constitutional)</option>
                  <option value="procedure_evidence">⚖️ Adeemsa Falmii & Ragaa (Procedure)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Bu'aa argaman: <strong className="text-slate-100">{items.length}</strong> seera/murtiilee</span>
              <span>Kuusaan yeroo hundaa kan haaroomu dha</span>
            </div>

            {items.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <div className="text-4xl">🔍</div>
                <h4 className="text-base font-bold text-slate-200">Wanti barbaaddan hin argamne</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Jecha biraatiin barbaadaa ykn filter 'Hunda' jedhu filadhaa. Akkasumas button 'Amma Haaroomsi' jedhu tuquun kuusicha haaroomsaa.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const isExpanded = expandedEnactmentId === item.id;
                  const isOromia = item.jurisdiction === 'oromia';

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 shadow-xl transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                            <span className={`px-2.5 py-0.5 rounded-md font-bold ${
                              isOromia 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            }`}>
                              {isOromia ? '🌳 OROMIA REGIONAL' : '🏛️ FEDERAL FDRE'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase font-bold">
                              {item.type.replace('_', ' ')}
                            </span>
                            <span className="text-slate-400">Bara {item.yearEC} B.A. ({item.yearGC} G.C.)</span>
                          </div>

                          <h3 className="text-base font-bold text-slate-100 font-serif leading-snug">
                            {item.title[currentLang] || item.title.om}
                          </h3>

                          <p className="text-xs text-slate-400">
                            <strong>Qaama Baase:</strong> {item.authority[currentLang] || item.authority.om}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start">
                          <button
                            type="button"
                            onClick={() => handleCopyCitation(item)}
                            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                            title="Citation Waraabbadhu (Copy Citation)"
                          >
                            <span>{copiedId === item.id ? '✅' : '📋'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportPdf(item)}
                            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                            title="PDF'n Fe'adhu (Export PDF)"
                          >
                            <span>📥</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedEnactmentId(isExpanded ? null : item.id)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{isExpanded ? 'Cufi 🔼' : 'Bal\'inaan Dubbisi 🔽'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Summary Preview */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                        {item.summary[currentLang] || item.summary.om}
                      </div>

                      {/* Expanded Full-Text Articles & Key Principles */}
                      {isExpanded && (
                        <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
                          {item.fullTextArticles && item.fullTextArticles.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                <span>📄</span>
                                <span>Keeyyattoota Seeraa (Articles & Clauses):</span>
                              </h4>
                              <div className="space-y-2.5">
                                {item.fullTextArticles.map((art, idx) => (
                                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                                    <div className="text-xs font-bold text-emerald-300 font-mono">
                                      {art.articleNumber} {art.title ? `• ${art.title}` : ''}
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed">
                                      {art.content[currentLang] || art.content.om}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.keyPrinciples && (
                            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50 space-y-1.5">
                              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                                <span>💡</span>
                                <span>Yaada Seeraa Dirqisiisaa (Binding Legal Principle):</span>
                              </h4>
                              <p className="text-xs text-slate-200 leading-relaxed font-serif italic">
                                "{item.keyPrinciples[currentLang] || item.keyPrinciples.om}"
                              </p>
                            </div>
                          )}

                          {/* Quick Navigation Action Buttons */}
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            {onNavigateToAnalysis && (
                              <button
                                type="button"
                                onClick={() => onNavigateToAnalysis(item.number)}
                                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <span>✨</span>
                                <span>Document Analysis View'tti Xiinxali</span>
                              </button>
                            )}
                            {onNavigateToCassation && item.type === 'cassation_decision' && (
                              <button
                                type="button"
                                onClick={() => onNavigateToCassation(item.number)}
                                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <span>⚖️</span>
                                <span>Cassation Library'tti Ilaali</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { Language, translations } from '../i18n/translations';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent, ALL_CASSATION_VOLUMES } from '../data/cassationPrecedents';
import { PdfExportModal } from '../components/PdfExportModal';
import { AnnotationTool } from '../components/AnnotationTool';
import { RecentSearches } from '../components/RecentSearches';
import { CassationCitationMap } from '../components/CassationCitationMap';
import { StatutoryInterpretationsView } from '../components/StatutoryInterpretationsView';
import { PrecedentFinderTool } from '../components/PrecedentFinderTool';
const TelegramArchiveSearch = lazy(() => import('../components/TelegramArchiveSearch').then(m => ({ default: m.TelegramArchiveSearch })));
import { SmoothHeight } from '../components/SmoothHeight';
import { CassationBaafata } from '../components/CassationBaafata';
import { saveRecentSearch, getRecentSearches, deleteRecentSearch, RecentSearch, SavedSearchBookmark, getSavedSearchBookmarks, saveSearchBookmark, deleteSearchBookmark } from '../services/storage';
import { MASTER_FILES, MasterLegalFile } from '../data/telegramMasterArchive';
import { retrieveStoredTelegramLegalDocs, ParsedTelegramLegalContent } from '../services/telegramLegalService';
import { analyticsService } from '../services/analytics';
import { History, Search, RotateCcw, X, Clock, Bookmark, Star, Trash2 } from 'lucide-react';
import {
  cachePrecedentsForOffline,
  getOfflineCachedPrecedents,
  getNotificationPermission,
  requestPrecedentNotificationPermission,
  isNotificationSupported,
  triggerPrecedentNotification,
  setupBackgroundSyncListeners,
} from '../services/precedentOfflineSync';

export function mapTelegramCategory(cat: string): CassationPrecedent['category'] {
  const mapping: Record<string, CassationPrecedent['category']> = {
    'land': 'property',
    'property_land': 'property',
    'civil': 'civil',
    'civil_contract': 'civil',
    'criminal': 'criminal',
    'procedure': 'procedure',
    'procedure_evidence': 'procedure',
    'family': 'family',
    'labor': 'labor',
    'administrative': 'administrative',
    'constitutional_admin': 'administrative',
    'commercial': 'commercial',
    'commercial_tax': 'commercial',
    'contract': 'contract'
  };
  return mapping[cat] || 'other';
}

interface CassationLibraryViewProps {
  currentLang: Language;
  initialQuery?: string;
  onSendToExplain?: (query: string) => void;
  onQueryChange?: (query: string) => void;
}

export const CassationLibraryView: React.FC<CassationLibraryViewProps> = ({
  currentLang,
  initialQuery = '',
  onSendToExplain,
  onQueryChange,
}) => {
  const t = translations[currentLang];

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [fileNumberFilter, setFileNumberFilter] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<'all' | 'oromia' | 'federal'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVolume, setSelectedVolume] = useState<number | 'all'>('all');
  const [selectedProclamation, setSelectedProclamation] = useState<string>('all');
  const [interpretationsOnly, setInterpretationsOnly] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'year_desc' | 'year_asc' | 'proclamation' | 'volume_asc'>('relevance');
  const [groupBy, setGroupBy] = useState<'none' | 'proclamation' | 'year' | 'volume' | 'category'>('none');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfCase, setPdfCase] = useState<CassationPrecedent | null>(null);
  const [recentKey, setRecentKey] = useState(0);
  const [recentPrecedentQueries, setRecentPrecedentQueries] = useState<RecentSearch[]>([]);
  const [savedSearchBookmarks, setSavedSearchBookmarks] = useState<SavedSearchBookmark[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<'hub' | 'precedents' | 'statutoryInterpretations' | 'precedentFinder' | 'telegramArchive'>('hub');
  const [harvestedTelegramDocs, setHarvestedTelegramDocs] = useState<CassationPrecedent[]>([]);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);

  useEffect(() => {
    setSavedSearchBookmarks(getSavedSearchBookmarks());
  }, []);

  const handleSaveCurrentSearch = () => {
    const defaultTitle = searchQuery.trim() || fileNumberFilter.trim() || (selectedCategory !== 'all' ? `Category: ${selectedCategory}` : 'Saved Complex Search');
    const titleInput = window.prompt(
      currentLang === 'om' ? 'Mata-duree barbaacha kanaaf kenni (Bookmark Title):' : 'Enter a title for this saved search bookmark:',
      defaultTitle
    );
    if (titleInput !== null) {
      const updated = saveSearchBookmark({
        title: titleInput.trim() || defaultTitle,
        query: searchQuery,
        fileNumber: fileNumberFilter,
        court: selectedCourt,
        category: selectedCategory,
        volume: selectedVolume,
      });
      setSavedSearchBookmarks(updated);
    }
  };

  const handleDeleteBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteSearchBookmark(id);
    setSavedSearchBookmarks(updated);
  };

  // Map Master Files to CassationPrecedent
  const mappedMasterFiles = useMemo<CassationPrecedent[]>(() => {
    return MASTER_FILES.map((f: any) => ({
      id: f.id,
      courtJurisdiction: f.title.om.toLowerCase().includes('federaala') ? 'federal' : 'oromia',
      courtName: {
        om: 'Telegram Master Archive',
        am: 'የቴሌግራም ዋና መዝገብ',
        en: 'Telegram Master Archive'
      },
      volume: parseInt(f.volume.replace(/\D/g, '')) || 0,
      fileNumber: f.fileNumber,
      yearEC: 2016,
      yearGC: 2024,
      category: mapTelegramCategory(f.category),
      parties: {
        om: f.title.om,
        am: f.title.om,
        en: f.title.en
      },
      legalIssue: {
        om: f.summary.om,
        am: f.summary.om,
        en: f.summary.en
      },
      bindingPrinciple: {
        om: f.principle.om,
        am: f.principle.om,
        en: f.principle.en
      },
      statutoryProvisions: f.keyArticles ? [f.keyArticles.om] : []
    }));
  }, []);

  // Merge everything into a single unified database
  const allPrecedents = useMemo(() => {
    return [...CASSATION_PRECEDENTS_DATA, ...mappedMasterFiles, ...harvestedTelegramDocs];
  }, [mappedMasterFiles, harvestedTelegramDocs]);

  // D3 Visual Citation Map state
  const [selectedRulingForMap, setSelectedRulingForMap] = useState<CassationPrecedent | null>(
    allPrecedents[0] || CASSATION_PRECEDENTS_DATA[0] || null
  );
  const [showCitationMap, setShowCitationMap] = useState<boolean>(true);
  const citationMapSectionRef = useRef<HTMLDivElement>(null);

  // Offline caching & Notification state
  const [cachedPrecedents, setCachedPrecedents] = useState<CassationPrecedent[]>([]);
  const [isCaching, setIsCaching] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Read initial cached precedents
    const cached = getOfflineCachedPrecedents();
    setCachedPrecedents(cached);
    setNotificationPerm(getNotificationPermission());

    // Setup background sync listeners
    const cleanup = setupBackgroundSyncListeners(allPrecedents, (online) => {
      setIsOnline(online);
      if (online) {
        setCachedPrecedents(getOfflineCachedPrecedents());
      }
    });

    return cleanup;
  }, []);

  // Fetch harvested Telegram documents and map them to CassationPrecedent
  useEffect(() => {
    const fetchTelegramDocs = async () => {
      setIsLoadingTelegram(true);
      try {
        const docs = await retrieveStoredTelegramLegalDocs();
        const mappedDocs: CassationPrecedent[] = docs
          .filter(d => d.type === 'cassation_decision')
          .map(d => ({
            id: d.id,
            courtJurisdiction: d.jurisdiction,
            courtName: {
              om: d.channelTitle,
              am: d.channelTitle,
              en: d.channelTitle
            },
            volume: 0, // Placeholder for harvested
            fileNumber: d.referenceNumber.replace(/\D/g, '') || d.referenceNumber,
            yearEC: d.yearEC,
            yearGC: d.yearGC,
            category: mapTelegramCategory(d.category),
            parties: {
              om: d.title.om,
              am: d.title.am,
              en: d.title.en
            },
            legalIssue: {
              om: d.summary.om,
              am: d.summary.am,
              en: d.summary.en
            },
            bindingPrinciple: {
              om: d.keyPrinciples.om,
              am: d.keyPrinciples.am,
              en: d.keyPrinciples.en
            },
            statutoryProvisions: d.keyArticles
          }));
        setHarvestedTelegramDocs(mappedDocs);
      } catch (e) {
        console.error('Failed to load harvested telegram docs', e);
      } finally {
        setIsLoadingTelegram(false);
      }
    };

    fetchTelegramDocs();
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      if (onQueryChange) onQueryChange(initialQuery);

      // Auto-select the matching precedent in the D3 citation map
      const q = initialQuery.trim().toLowerCase();
      const match = allPrecedents.find(
        (c) => c.fileNumber === q || q.includes(c.fileNumber.toLowerCase())
      );
      if (match) {
        setSelectedRulingForMap(match);
        setShowCitationMap(true);
      }
    }
  }, [initialQuery]);

  // Auto-update selectedRulingForMap when user searches for a specific file number
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      const match = allPrecedents.find(
        (c) => c.fileNumber === trimmed || trimmed.includes(c.fileNumber.toLowerCase())
      );
      if (match) {
        setSelectedRulingForMap(match);
      }
    }
  }, [searchQuery]);

  // Load and refresh recent precedent queries (top 3)
  useEffect(() => {
    const list = getRecentSearches('cassation');
    setRecentPrecedentQueries(list.slice(0, 3));
  }, [recentKey]);

  // Debounced save for search queries
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 3) {
      const timer = setTimeout(() => {
        saveRecentSearch(trimmed, 'cassation');
        setRecentKey((k) => k + 1);
        analyticsService.trackLegalSearch(trimmed, 'cassation', filteredCases.length);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const categories = [
    { id: 'all', label: 'Hunda (All)' },
    { id: 'sdfhh', label: '⚖️ SDFHH (Civil Procedure)' },
    { id: 'sdfy', label: '🚔 SDFY (Criminal Procedure)' },
    { id: 'civil', label: '📜 Seera Hariiroo Hawaasaa (Civil)' },
    { id: 'criminal', label: '🚨 Seera Yakkaa (Criminal)' },
    { id: 'administrative', label: '🏛️ Bulchiinsa (Administrative)' },
    { id: 'property', label: '🏡 Qabeenya & Lafa (Property)' },
    { id: 'labor', label: '👷 Hojjetaa & Hojjechiisaa (Labor)' },
    { id: 'contract', label: '📝 Waliigaltee (Contract)' },
    { id: 'family', label: '👨‍👩‍👧 Maatii (Family)' },
    { id: 'commercial', label: '💼 Daldala & Baankii (Commercial)' },
  ];

  // Dynamically extract unique Proclamations / Laws from database
  const availableProclamations = Array.from(
    new Set(
      allPrecedents.flatMap((c) =>
        c.statutoryProvisions.map((p) => {
          const match = p.match(/(Proc\.\s*No\.\s*\d+\/\d+|Civil Code|Civil Proc|Commercial Code|Criminal Code|Labor Proc)/i);
          return match ? match[0] : p.split('Art')[0].trim();
        })
      )
    )
  ).filter(Boolean).sort();

  // Dynamically extract unique decision years (EC)
  const availableYears = Array.from(
    new Set(allPrecedents.map((c) => c.yearEC))
  ).sort((a, b) => b - a);

  const filteredCases = React.useMemo(() => {
    return allPrecedents.filter((c) => {
      // Court filter
      if (selectedCourt !== 'all') {
        const isOromia = (c.courtJurisdiction as string) === 'oromia' || c.id.startsWith('oromia_') || c.id.startsWith('file-') && (c.courtJurisdiction as string) === 'oromia';
        if (selectedCourt === 'oromia' && !isOromia) return false;
        if (selectedCourt === 'federal' && isOromia) return false;
      }

      // Category filter
      const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
      if (!matchesCat) return false;

      // Volume filter
      const matchesVol = selectedVolume === 'all' || c.volume === selectedVolume;
      if (!matchesVol) return false;

      // Proclamation Filter
      if (selectedProclamation !== 'all') {
        const pFilter = selectedProclamation.toLowerCase();
        const matchesProc = c.statutoryProvisions.some((p) =>
          p.toLowerCase().includes(pFilter)
        );
        if (!matchesProc) return false;
      }

      // Interpretation Filter
      if (interpretationsOnly) {
        const isInterp = (
          c.bindingPrinciple.om.toLowerCase().includes('hikkoo') || 
          c.legalIssue.om.toLowerCase().includes('hikkoo') ||
          c.bindingPrinciple.am.includes('ትርጓሜ') || 
          c.legalIssue.am.includes('ትርጓሜ')
        );
        if (!isInterp) return false;
      }

      // Decision Year Filter
      if (selectedYear !== 'all') {
        const matchesYear =
          c.yearEC.toString() === selectedYear ||
          c.yearGC.toString() === selectedYear;
        if (!matchesYear) return false;
      }

      // Specific File Number Filter
      if (fileNumberFilter.trim()) {
        const fn = fileNumberFilter.trim().toLowerCase();
        if (!c.fileNumber.toLowerCase().includes(fn)) return false;
      }

      // General Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      // Normalize prefix like 'k.' or 'art.' or 'keeyyata'
      const normalizedQ = q.replace(/\b(k\.|art\.|keeyyata|anqats)\s*(\d+)/gi, '$2');
      const queryParts = normalizedQ.split(/\s+/).filter((p) => p.length > 0);

      const legalStopwords = [
        'jildii', 'volume', 'ቅጽ', 'galmee', 'lakk', 'lakk.',
        'tumaa', 'tumaalee', 'keeyyata', 'keeyyattoota', 'hiikkoo', 'hikkoo', 'seera', 'seeraa',
        'murtii', 'murtee', 'dhaddacha', 'ijibbaataa', 'ijoo',
        'article', 'provision', 'provisions', 'section',
        'አንቀጽ', 'ድንጋጌ', 'ውሳኔ', 'ሰበር', 'ህግ', 'የህግ', 'ትርጓሜ'
      ];

      return queryParts.every(
        (part) =>
          c.fileNumber.includes(part) ||
          c.parties.om.toLowerCase().includes(part) ||
          c.parties.am.toLowerCase().includes(part) ||
          c.parties.en.toLowerCase().includes(part) ||
          c.legalIssue.om.toLowerCase().includes(part) ||
          c.legalIssue.am.toLowerCase().includes(part) ||
          c.legalIssue.en.toLowerCase().includes(part) ||
          c.bindingPrinciple.om.toLowerCase().includes(part) ||
          c.bindingPrinciple.am.toLowerCase().includes(part) ||
          c.bindingPrinciple.en.toLowerCase().includes(part) ||
          c.statutoryProvisions.some((p) => p.toLowerCase().includes(part)) ||
          c.volume.toString().includes(part) ||
          c.yearEC.toString().includes(part) ||
          c.yearGC.toString().includes(part) ||
          (c.courtName && c.courtName.om.toLowerCase().includes(part)) ||
          legalStopwords.includes(part)
      );
    });
  }, [allPrecedents, searchQuery, fileNumberFilter, selectedCourt, selectedCategory, selectedVolume, selectedProclamation, interpretationsOnly, selectedYear]);

  // Apply sorting options
  const sortedCases = [...filteredCases].sort((a, b) => {
    if (sortBy === 'year_desc') {
      return b.yearEC - a.yearEC || Number(b.fileNumber) - Number(a.fileNumber);
    }
    if (sortBy === 'year_asc') {
      return a.yearEC - b.yearEC || Number(a.fileNumber) - Number(b.fileNumber);
    }
    if (sortBy === 'volume_asc') {
      return a.volume - b.volume || Number(a.fileNumber) - Number(a.fileNumber);
    }
    if (sortBy === 'proclamation') {
      const procA = a.statutoryProvisions[0] || '';
      const procB = b.statutoryProvisions[0] || '';
      return procA.localeCompare(procB);
    }
    return 0;
  });

  // Group cases if groupBy !== 'none'
  const getGroupTitle = (c: CassationPrecedent): string => {
    if (groupBy === 'proclamation') {
      const mainStat = c.statutoryProvisions[0] || 'Seera Siiviilii / Civil Code';
      const match = mainStat.match(/(Proc\.\s*No\.\s*\d+\/\d+|Civil Code|Civil Proc|Commercial Code|Criminal Code)/i);
      return match ? `📜 ${match[0]}` : `📜 ${mainStat}`;
    }
    if (groupBy === 'year') {
      return `📅 Bara ${c.yearEC} B.A. (${c.yearGC} G.C.)`;
    }
    if (groupBy === 'volume') {
      return `📚 Jildii ${c.volume} (Volume ${c.volume})`;
    }
    if (groupBy === 'category') {
      const found = categories.find((cat) => cat.id === c.category);
      return found ? found.label : c.category;
    }
    return 'Murtiiwwan Hunda';
  };

  const groupedMap: { [key: string]: CassationPrecedent[] } = {};
  if (groupBy !== 'none') {
    sortedCases.forEach((c) => {
      const gKey = getGroupTitle(c);
      if (!groupedMap[gKey]) groupedMap[gKey] = [];
      groupedMap[gKey].push(c);
    });
  }

  const handleCopyCitation = async (c: CassationPrecedent) => {
    const isOromia = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');
    const courtTitle = isOromia
      ? `Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume}) / የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት በመዝገብ ቁጥር ${c.fileNumber}`
      : `Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume}) / የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት በመዝገብ ቁጥር ${c.fileNumber}`;
    
    await navigator.clipboard.writeText(courtTitle);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadAllOffline = async () => {
    setIsCaching(true);
    setSyncFeedback(null);
    try {
      if (isNotificationSupported() && notificationPerm !== 'granted') {
        const p = await requestPrecedentNotificationPermission();
        setNotificationPerm(p);
      }

      const res = await cachePrecedentsForOffline(allPrecedents);
      if (res.success) {
        setCachedPrecedents(allPrecedents);
        setSyncFeedback(`Murtiiwwan Dhaddacha Ijoo ${res.count} milkaa'inaan offline kuufamaniiru!`);
        setTimeout(() => setSyncFeedback(null), 5000);
      }
    } catch (e: any) {
      setSyncFeedback('Kuusuun hin milkoofne.');
    } finally {
      setIsCaching(false);
    }
  };

  const handleTriggerExplainWithAi = (c: CassationPrecedent) => {
    const query = `Murtii Dhaddacha Ijoo Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume}): ${c.parties.om} - ${c.legalIssue.om}`;
    if (onSendToExplain) {
      onSendToExplain(query);
    }
  };

  const handleOpenCitationMap = (c: CassationPrecedent) => {
    setSelectedRulingForMap(c);
    setShowCitationMap(true);
    setTimeout(() => {
      citationMapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleScrollToRulingCard = (fileNumber: string) => {
    const el = document.getElementById(`case-card-${fileNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-amber-500');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-amber-500');
      }, 3000);
    }
  };

  const renderPrecedentCard = (c: CassationPrecedent) => {
    const isOromia = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');
    const isSelectedInMap = selectedRulingForMap?.fileNumber === c.fileNumber;

    return (
      <div
        key={c.id}
        id={`case-card-${c.fileNumber}`}
        className={`bg-slate-900 border ${
          isSelectedInMap
            ? 'border-amber-500 ring-2 ring-amber-500/50 shadow-amber-500/10'
            : 'border-slate-800 hover:border-slate-700'
        } rounded-3xl p-6 shadow-xl space-y-4 transition-all`}
      >
        {/* Case Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] px-3 py-1 rounded-xl font-bold uppercase border ${
                isOromia
                  ? 'bg-red-950 text-red-300 border-red-500/40'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isOromia ? '🔴 Oromiyaa Cassation' : '🟢 Federal Cassation'}
            </span>

            {/* Interpretation Badge */}
            {(c.bindingPrinciple.om.toLowerCase().includes('hikkoo') || 
              c.legalIssue.om.toLowerCase().includes('hikkoo') || 
              c.bindingPrinciple.am.includes('ትርጓሜ') || 
              c.legalIssue.am.includes('ትርጓሜ')) && (
              <span className="text-[11px] px-3 py-1 rounded-xl font-bold uppercase border bg-sky-950 text-sky-300 border-sky-500/40">
                ✨ Hikkoo Seeraa
              </span>
            )}

            <span className="text-xs px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-bold shadow-xs">
              Lakk. Galmee: {c.fileNumber}
            </span>

            <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 font-mono font-bold border border-slate-800">
              Jildii {c.volume} (Vol. {c.volume})
            </span>

            <span className="text-[11px] text-slate-400 font-mono">
              Bara {c.yearEC} B.A. ({c.yearGC} G.C.)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenCitationMap(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelectedInMap
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                  : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/30'
              }`}
              title="Agarsiisi Kartaa Waraabbii (D3.js Citation Map)"
            >
              <span>🗺️</span>
              <span>{isSelectedInMap ? 'Kartaa Keessa Jira' : 'Kartaa Waraabbii'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyCitation(c)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
              title="Waraabi"
            >
              <span>{copiedId === c.id ? '✓ Waraabame!' : '📋 Waraabi'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPdfCase(c)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📥 PDF</span>
            </button>
          </div>
        </div>

        {/* Parties */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Qaamolee Falmii (Parties):
          </div>
          <div className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
            <span>{c.parties.om}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-ethiopic">{c.parties.am}</span>
          </div>
        </div>

        {/* Legal Issue & Binding Ratio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {/* Issue */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>📌</span>
              <span>Gaaffii Seeraa Ijoo (Core Legal Issue):</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {c.legalIssue.om}
            </p>
            <p className="text-[11px] text-slate-400 font-ethiopic leading-relaxed pt-1 border-t border-slate-900">
              {c.legalIssue.am}
            </p>
          </div>

          {/* Binding Principle */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>📜</span>
              <span>Qajeeltoo Seeraa Dirqisiisaa (Binding Ratio):</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
              {c.bindingPrinciple.om}
            </p>
            <p className="text-[11px] text-slate-400 font-ethiopic leading-relaxed pt-1 border-t border-slate-900">
              {c.bindingPrinciple.am}
            </p>
          </div>
        </div>

        {/* Statutory Provisions & AI Deep Dive Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500">Keeyyattoota:</span>
            {c.statutoryProvisions.map((prov, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(prov);
                  if (onQueryChange) onQueryChange(prov);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-mono text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                title="Tumaa seeraa kanaan barbaadi"
              >
                <span>⚖️</span>
                <span>{prov}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleTriggerExplainWithAi(c)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center shadow-xs"
          >
            <span>🤖</span>
            <span>Murtii Kana AI'n Bal'inaan Ibsi</span>
          </button>
        </div>
        <AnnotationTool documentId={c.id} currentLang={currentLang} />
      </div>
    );
  };

  const getCaseFormattedContent = (c: CassationPrecedent) => {
    const isOromia = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');
    const courtTitleOm = isOromia ? 'MANA MURTII WALIIGALAA OROMIYAA DHADDACHA IJIBBAATAA' : 'MANA MURTII WALIIGALAA FEDERAALAA DHADDACHA IJIBBAATAA';
    const courtTitleAm = isOromia ? 'የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት' : 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት';
    const courtTitleEn = isOromia ? 'OROMIA SUPREME COURT CASSATION DIVISION' : 'FEDERAL SUPREME COURT CASSATION DIVISION';

    return `━━━━━━━━━━━━━━━━━━
AFAN OROMOO
━━━━━━━━━━━━━━━━━━
⚖️ ${courtTitleOm}
Lakk. Galmee: ${c.fileNumber} | Jildii: ${c.volume} | Bara: ${c.yearEC} B.A. (${c.yearGC} G.C.)
Qaamolee: ${c.parties.om}

📌 Gaaffii Seeraa Ijoo:
${c.legalIssue.om}

📜 Qajeeltoo Seeraa Dirqisiisaa (Binding Ratio Decidendi):
${c.bindingPrinciple.om}

Keeyyattoota Seeraa Walqabatan:
${c.statutoryProvisions.join(', ')}

━━━━━━━━━━━━━━━━━━
አማርኛ
━━━━━━━━━━━━━━━━━━
⚖️ ${courtTitleAm} አስገዳጅ የሕግ ትርጉም ውሳኔ
የመዝገብ ቁጥር፦ ${c.fileNumber} | ቅጽ፦ ${c.volume} | ዓመተ ምሕረት፦ ${c.yearEC} ዓ.ም
ተከራካሪ ወገኖች፦ ${c.parties.am}

📌 አከራካሪው የሕግ ነጥብ፦
${c.legalIssue.am}

📜 አስገዳጅ የሕግ ትርጉም ድንጋጌ፦
${c.bindingPrinciple.am}

አግባብነት ያላቸው ድንጋጌዎች፦
${c.statutoryProvisions.join(', ')}

━━━━━━━━━━━━━━━━━━
ENGLISH
━━━━━━━━━━━━━━━━━━
⚖️ ${courtTitleEn} BINDING PRECEDENT
File No.: ${c.fileNumber} | Volume: ${c.volume} | Year: ${c.yearEC} E.C. (${c.yearGC} G.C.)
Parties: ${c.parties.en}

📌 Core Legal Issue:
${c.legalIssue.en}

📜 Binding Legal Ratio Decidendi:
${c.bindingPrinciple.en}

Statutory Provisions Interpreted:
${c.statutoryProvisions.join(', ')}`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* View Header */}
      <div className="bg-oromia-header bg-gadaa-pattern rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="text-3xl sm:text-4xl p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold border border-amber-400 shrink-0 shadow-md">
              🏛️
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Kuusaa Murteewwan Dhaddacha Ijoo</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
                Murteewwan dirqisiisoo <strong>Mana Murtii Waliigalaa Oromiyaa</strong> fi <strong>Mana Murtii Waliigalaa Federaalaa</strong> Dhaddacha Ijibbaataatiin kennaman Lakkoofsa Galmee, Jildii, fi Dhimma Seeraatiin barbaadaa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              type="button"
              onClick={() => {
                setShowCitationMap(true);
                setTimeout(() => {
                  citationMapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>🗺️</span>
              <span>Kartaa Waraabbii (Citation Map)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAllOffline}
              disabled={isCaching}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>{isCaching ? '⏳ Kuusaa jira...' : '💾 Offline Kuusi'}</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <span>✓</span>
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Main Tab Switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMainTab('hub')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'hub'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🗂️</span>
            <span>Baafata (Index Hub)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('precedents')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'precedents'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🏛️</span>
            <span>Feed (Search & Filter)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeMainTab === 'precedents' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'}`}>
              {allPrecedents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('statutoryInterpretations')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'statutoryInterpretations'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>⚖️</span>
            <span>Tumaalee Seeraa Hiikkoon Itti Kenname (Statutory Interpretations)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeMainTab === 'statutoryInterpretations' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              50+ Hiikkoo
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('precedentFinder')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'precedentFinder'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🧭</span>
            <span>Precedent Finder (Barbaada Murtee Ijoo)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeMainTab === 'precedentFinder' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              Theme Matcher
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('telegramArchive')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'telegramArchive'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>✈️</span>
            <span>Kuusaa Telegram 1,500+ (Master Files)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeMainTab === 'telegramArchive' ? 'bg-slate-950 text-amber-300' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'}`}>
              1,500+ Files
            </span>
          </button>
        </div>
      </div>

      {activeMainTab === 'telegramArchive' ? (
        <Suspense fallback={<div className="p-4 text-center">Loading Telegram Archive...</div>}>
          <TelegramArchiveSearch language={currentLang} />
        </Suspense>
      ) : activeMainTab === 'precedentFinder' ? (
        <PrecedentFinderTool
          currentLang={currentLang}
          precedents={allPrecedents}
          onNavigateToRuling={(fn) => {
            setActiveMainTab('precedents');
            const cleanFn = fn.replace(/[^\d]/g, '') || fn;
            setFileNumberFilter(cleanFn);
            setSearchQuery('');
            setTimeout(() => {
              handleScrollToRulingCard(cleanFn);
            }, 120);
          }}
          onSendToExplain={onSendToExplain}
        />
      ) : activeMainTab === 'statutoryInterpretations' ? (
        <StatutoryInterpretationsView
          currentLang={currentLang}
          precedents={allPrecedents}
          onNavigateToCassation={(fn) => {
            setActiveMainTab('precedents');
            const cleanFn = fn.replace(/[^\d]/g, '') || fn;
            setFileNumberFilter(cleanFn);
            setSearchQuery('');
            setTimeout(() => {
              handleScrollToRulingCard(cleanFn);
            }, 120);
          }}
          onSendToExplain={onSendToExplain}
        />
      ) : activeMainTab === 'hub' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CassationBaafata
            categories={categories}
            precedents={allPrecedents}
            selectedCategory={selectedCategory}
            currentLang={currentLang}
            onSelectCategory={setSelectedCategory}
            onSelectArticle={(art) => {
              setActiveMainTab('precedents');
              setSearchQuery(`K. ${art}`);
              if (onQueryChange) onQueryChange(`K. ${art}`);
              // Scroll to search results anchor
              setTimeout(() => {
                const el = document.getElementById('search-results-anchor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            onSelectRuling={(fileNo) => {
              setActiveMainTab('precedents');
              setFileNumberFilter(fileNo);
              setSearchQuery('');
              setTimeout(() => {
                handleScrollToRulingCard(fileNo);
              }, 120);
            }}
          />
        </div>
      ) : (
        <>
          {/* Quick Precedent Finder Launcher Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold border border-amber-400 shrink-0">
                🧭
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Precedent Finder Tool</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                    Judicial Themes
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Dhimma seeraa keessan xiinxaluudhaan murtiilee dhaddacha ijibbaataa mata-dureewwan akka <em>'Contract Nullity'</em> fi <em>'Land Dispute Ownership'</em> tiin adda baasaa.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveMainTab('precedentFinder')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-sm"
            >
              <span>🧭 Precedent Finder Bani</span>
            </button>
          </div>

      {/* DEDICATED SEARCH & FILTER PANEL (Court, File Number, Volume, Category) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>🔍</span>
            <span>Barbaacha Murteewwanii (File Number, Volume & Court Search)</span>
          </h2>
          <button
            type="button"
            onClick={handleSaveCurrentSearch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Bookmark complex search & filters"
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>⭐ Barbaacha Kana Kuusi (Bookmark Search)</span>
          </button>
        </div>

        {/* Saved Complex Search Queries Section */}
        {savedSearchBookmarks.length > 0 && (
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Maallaqaalee Barbaacha Kuufaman (Saved Search Bookmarks):</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                {savedSearchBookmarks.length} Saved
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {savedSearchBookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => {
                    setSearchQuery(bm.query || '');
                    setFileNumberFilter(bm.fileNumber || '');
                    if (bm.court) setSelectedCourt(bm.court as any);
                    if (bm.category) setSelectedCategory(bm.category);
                    if (bm.volume !== undefined) setSelectedVolume(bm.volume);
                  }}
                  className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3 text-xs cursor-pointer transition-all shadow-sm space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                      {bm.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBookmark(e, bm.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Delete saved bookmark"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                    {bm.query && <span className="truncate max-w-[140px]">Query: {bm.query}</span>}
                    {bm.fileNumber && <span className="font-mono text-amber-400">File: {bm.fileNumber}</span>}
                    {bm.category && bm.category !== 'all' && <span className="bg-slate-800 px-1.5 py-0.5 rounded">{bm.category}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 1. Court / Jurisdiction Selection Tabs */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-400">
            Mana Murtii Filadhaa (Jurisdiction):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'all', label: '🏛️ Hunda (Mana Murtii Federaalaa & Oromiyaa)', count: allPrecedents.length },
              { id: 'oromia', label: '🔴 Mana Murtii Waliigalaa Oromiyaa', count: allPrecedents.filter(c => (c.courtJurisdiction as string) === 'oromia' || c.id.startsWith('oromia_') || c.id.startsWith('file-') && (c.courtJurisdiction as string) === 'oromia').length },
              { id: 'federal', label: '🟢 Mana Murtii Waliigalaa Federaalaa', count: allPrecedents.filter(c => (c.courtJurisdiction as string) !== 'oromia' && !c.id.startsWith('oromia_') && !(c.id.startsWith('file-') && (c.courtJurisdiction as string) === 'oromia')).length },
            ].map((court) => (
              <button
                key={court.id}
                type="button"
                onClick={() => setSelectedCourt(court.id as any)}
                className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  selectedCourt === court.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{court.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${selectedCourt === court.id ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'}`}>
                  {court.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Dual Search Inputs: Keyword Search + Specific File Number Input + Volume Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1">
          {/* General Keyword Search */}
          <div className="sm:col-span-6 space-y-1">
            <label className="block text-xs font-semibold text-slate-400">
              Qabiyyee / Dhimma Seeraa / Qaamolee:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onQueryChange) onQueryChange(e.target.value);
                }}
                placeholder="fkn: Tumaa Seeraa (K. 1723, K. 6, Labsii 1156, K. 2472), Galmee, Dhaaltummaa, Ariisaa hojii..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Recent Searches Chip Group Beneath Search Bar */}
            {recentPrecedentQueries.length > 0 && (
              <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 shrink-0">
                  <History className="w-3 h-3 text-amber-400" />
                  <span>Recent:</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {recentPrecedentQueries.map((item) => {
                    const isSelected = searchQuery.trim().toLowerCase() === item.query.trim().toLowerCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery(item.query);
                          if (onQueryChange) onQueryChange(item.query);
                        }}
                        title={`Re-run query: "${item.query}"`}
                        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                            : 'bg-slate-950 hover:bg-slate-800/90 text-slate-300 hover:text-amber-300 border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <Search className={`w-2.5 h-2.5 shrink-0 ${isSelected ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'}`} />
                        <span className="max-w-[130px] sm:max-w-[180px] truncate">{item.query}</span>
                        <RotateCcw className={`w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dedicated File Number Input */}
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-semibold text-slate-400">
              🔢 Lakk. Galmee (File No.):
            </label>
            <input
              type="text"
              value={fileNumberFilter}
              onChange={(e) => setFileNumberFilter(e.target.value)}
              placeholder="fkn: 16568, 10293..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold"
            />
          </div>

          {/* Volume Dropdown */}
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-semibold text-slate-400">
              📚 Jildii (Volume):
            </label>
            <select
              value={selectedVolume}
              onChange={(e) => setSelectedVolume(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="all">Jildii Hunda (All Volumes)</option>
              {ALL_CASSATION_VOLUMES.map((vol) => (
                <option key={vol} value={vol}>
                  Jildii {vol} (Volume {vol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Category Filter Chips & Interpretations Toggle */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-slate-400">
            Gosa Dhimma Seeraa (Legal Category):
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs flex-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 shrink-0 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="interpretationsOnly"
                checked={interpretationsOnly}
                onChange={(e) => setInterpretationsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="interpretationsOnly" className="text-[11px] font-bold text-amber-300 cursor-pointer">
                Hikkoo Dhaddacha Ijibbaataa (Bench Interpretations)
              </label>
            </div>
          </div>
        </div>

        {/* 4. PROCLAMATION & YEAR FILTERS + SORTING & GROUPING TOOLBAR */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <span>📜</span>
              <span>Filannoo Labsii, Bara Murtee, Tartiiba & Gurmuu (Proclamation & Year Filters)</span>
            </span>

            {(selectedProclamation !== 'all' || selectedYear !== 'all' || sortBy !== 'relevance' || groupBy !== 'none') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProclamation('all');
                  setSelectedYear('all');
                  setSortBy('relevance');
                  setGroupBy('none');
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
              >
                🔄 Filter Deebisi (Reset Filters)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Proclamation Filter Dropdown */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span>📜 Labsii / Seera Filadhaa:</span>
                {selectedProclamation !== 'all' && (
                  <span className="text-[10px] text-amber-400 font-bold font-mono">Active</span>
                )}
              </label>
              <select
                value={selectedProclamation}
                onChange={(e) => setSelectedProclamation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">📜 Labsii Hunda (All Proclamations)</option>
                {availableProclamations.map((proc) => (
                  <option key={proc} value={proc}>
                    {proc}
                  </option>
                ))}
              </select>
            </div>

            {/* Decision Year Dropdown */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span>📅 Bara Murtee (Decision Year):</span>
                {selectedYear !== 'all' && (
                  <span className="text-[10px] text-amber-400 font-bold font-mono">Active</span>
                )}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="all">📅 Bara Hunda (All Years)</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr.toString()}>
                    Bara {yr} B.A. ({yr + 8} G.C.)
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order Toggle */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                🔃 Tartiiba (Sorting Order):
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="relevance">🎯 Relevancy (Default)</option>
                <option value="year_desc">📅 Bara: Haaraa ➔ Jaarraa (Newest)</option>
                <option value="year_asc">📅 Bara: Jaarraa ➔ Haaraa (Oldest)</option>
                <option value="proclamation">📜 Labsidhaan (By Proclamation)</option>
                <option value="volume_asc">📚 Jildiidhaan (By Volume)</option>
              </select>
            </div>

            {/* Group By Toggle */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                📂 Gurmuudhaan Agarsiisi (Group By):
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="none">📋 Tarree Baramaa (No Grouping)</option>
                <option value="proclamation">📜 Labsiidhaan Gurmeessi (Group by Proclamation)</option>
                <option value="year">📅 Baraan Gurmeessi (Group by Year)</option>
                <option value="volume">📚 Jildiidhaan Gurmeessi (Group by Volume)</option>
                <option value="category">⚖️ Gosan Gurmeessi (Group by Category)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recent Searches Row */}
        <div className="pt-1">
          <RecentSearches
            key={recentKey}
            currentLang={currentLang}
            onSelectSearch={(q) => {
              setSearchQuery(q);
              if (onQueryChange) onQueryChange(q);
            }}
            mode="under-search"
            maxDisplay={5}
          />
        </div>
      </div>

      {/* D3.JS VISUAL CITATION MAP SECTION */}
      <div ref={citationMapSectionRef} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-2xl bg-amber-500 text-slate-950 font-bold border border-amber-400 shrink-0 shadow-md">
              🗺️
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-serif-legal">
                  Visual Citation Map (D3.js)
                </h2>
                {selectedRulingForMap && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                    Lakk. {selectedRulingForMap.fileNumber} (Jildii {selectedRulingForMap.volume})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Walitti dhufeenya murteewwanii (citations, statutes, precedents) D3.js tiin qoradhaa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowCitationMap((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>{showCitationMap ? '▼ Dhoksi (Collapse)' : '▲ Agarsiisi (Expand Map)'}</span>
            </button>
          </div>
        </div>

        {showCitationMap && selectedRulingForMap && (
          <CassationCitationMap
            currentLang={currentLang}
            selectedRuling={selectedRulingForMap}
            onSelectRuling={(precedent) => {
              setSelectedRulingForMap(precedent);
            }}
            onSendToExplain={onSendToExplain}
            onOpenPdf={(precedent) => setPdfCase(precedent)}
            onScrollToRulingCard={handleScrollToRulingCard}
          />
        )}
      </div>

      {/* SEARCH RESULTS FEED */}
      <div id="search-results-anchor" className="scroll-mt-24" />
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            Murtiiwwan Argaman: <strong className="text-amber-400 font-mono">{sortedCases.length}</strong>
          </span>
          <span>Afaan Oromoo • አማርኛ • English</span>
        </div>

        <SmoothHeight triggerKey={`${selectedCategory}-${interpretationsOnly}-${selectedVolume}-${selectedProclamation}`} duration={320} className="w-full">
          {sortedCases.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-xl">
            <span className="text-4xl block">🔍</span>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-100">
                Murtii barbaaddan kuusaa keessatti hin argamne.
              </h3>
              <p className="text-xs text-slate-400">
                Lakk. Galmee/Labsii "{fileNumberFilter || searchQuery}" kuusaa dhihoo kana keessa hin jiru yoo ta'e, AI Seeraatiin qorachuu dandeessu.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const q = `Murtii Dhaddacha Ijoo Lakk. Galmee ${fileNumberFilter || searchQuery}: Dhimma fi qajeeltoo seeraa isaa guutummaatti ibsi.`;
                if (onSendToExplain) onSendToExplain(q);
              }}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>🤖</span>
              <span>AI'n Murtii Kana Guutummaatti Barbaadi & Ibsi</span>
            </button>
          </div>
        ) : groupBy === 'none' ? (
          sortedCases.map(renderPrecedentCard)
        ) : (
          Object.entries(groupedMap).map(([groupTitle, casesInGroup]) => (
            <div key={groupTitle} className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 flex items-center justify-between shadow-md">
                <span className="font-bold text-sm flex items-center gap-2">
                  <span>{groupTitle}</span>
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-bold font-mono">
                  {casesInGroup.length} {casesInGroup.length === 1 ? 'Murtii' : 'Murtiiwwan'}
                </span>
              </div>
              {casesInGroup.map(renderPrecedentCard)}
            </div>
          ))
        )}
        </SmoothHeight>
      </div>

      {/* PDF Export Modal */}
      {pdfCase && (
        <PdfExportModal
          isOpen={!!pdfCase}
          currentLang={currentLang}
          title={`Murtii Dhaddacha Ijoo Lakk. ${pdfCase.fileNumber} (Jildii ${pdfCase.volume})`}
          content={getCaseFormattedContent(pdfCase)}
          taskType="cassation"
          outputLanguages={[currentLang]}
          onClose={() => setPdfCase(null)}
        />
      )}
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Language, translations } from '../i18n/translations';
import { getRecentSearches } from '../services/storage';

// Types moved from service to avoid early import
interface ParsedTelegramLegalContent {
  id: string;
  category: string;
  title: {
    om: string;
    am: string;
    en: string;
  };
  summary: {
    om: string;
    am: string;
    en: string;
  };
  rawText: string;
  tags: string[];
  postUrl: string;
  publishDate?: string;
  createdAt?: any;
}

interface RealTimeNotificationSystemProps {
  currentLang: Language;
  onNavigateTab: (tab: string) => void;
  onSetQuery?: (query: string) => void;
}

interface InAppNotification {
  id: string;
  title: string;
  summary: string;
  category: string;
  docId: string;
  timestamp: number;
  read: boolean;
  matchReason: string;
  postUrl: string;
}

export const RealTimeNotificationSystem: React.FC<RealTimeNotificationSystemProps> = ({
  currentLang,
  onNavigateTab,
  onSetQuery,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<InAppNotification | null>(null);
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('seera_subscribed_categories');
      return stored ? JSON.parse(stored) : ['property_land', 'labor', 'criminal', 'civil_contract'];
    } catch {
      return ['property_land', 'labor', 'criminal', 'civil_contract'];
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevDocCountRef = useRef<number>(0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen for programmatic toast trigger events
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; summary: string; category: string }>;
      setActiveToast({
        id: Date.now().toString(),
        title: customEvent.detail.title,
        summary: customEvent.detail.summary,
        category: customEvent.detail.category,
        docId: '',
        timestamp: Date.now(),
        read: false,
        matchReason: 'Discussion Update',
        postUrl: '',
      });
      setTimeout(() => setActiveToast(null), 6000);
    };

    window.addEventListener('seera:discussion_toast', handleToastEvent);
    return () => window.removeEventListener('seera:discussion_toast', handleToastEvent);
  }, []);

  // Save subscribed categories
  useEffect(() => {
    try {
      localStorage.setItem('seera_subscribed_categories', JSON.stringify(subscribedCategories));
    } catch {}
  }, [subscribedCategories]);

  // Subscribe to live Telegram legislation & cassation documents
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initSubscription = async () => {
      try {
        const { subscribeToStoredTelegramDocs } = await import('../services/telegramLegalService');
        unsubscribe = subscribeToStoredTelegramDocs((docs: ParsedTelegramLegalContent[]) => {
          // Process real-time alerts
          const searches = getRecentSearches();
          const searchKeywords = searches.map(s => s.query.toLowerCase().trim()).filter(q => q.length > 2);
          
          const newNotifications: InAppNotification[] = [];
          const dismissedIds = new Set<string>();
          try {
            const stored = localStorage.getItem('seera_dismissed_notifications');
            if (stored) {
              JSON.parse(stored).forEach((id: string) => dismissedIds.add(id));
            }
          } catch {}

          docs.forEach((doc) => {
            if (dismissedIds.has(doc.id)) return;

            // Check if matching categories OR matching search keywords
            let isMatch = false;
            let reason = '';

            if (subscribedCategories.includes(doc.category)) {
              isMatch = true;
              reason = currentLang === 'om' 
                ? `Dhimma Filatame: ${doc.category.toUpperCase().replace('_', ' ')}`
                : `የተመረጠ ርዕስ፦ ${doc.category.toUpperCase().replace('_', ' ')}`;
            } else {
              // Check previous searches keywords
              const matchedKeyword = searchKeywords.find(kw => 
                doc.title.om.toLowerCase().includes(kw) || 
                doc.title.am.toLowerCase().includes(kw) || 
                doc.rawText.toLowerCase().includes(kw) ||
                doc.tags.some(t => t.toLowerCase().includes(kw))
              );

              if (matchedKeyword) {
                isMatch = true;
                reason = currentLang === 'om'
                  ? `Barbaacha Kee Cinaa: "${matchedKeyword}"`
                  : `ቀደም ሲል የፈለጉት፦ "${matchedKeyword}"`;
              }
            }

            if (isMatch) {
              newNotifications.push({
                id: doc.id,
                title: doc.title[currentLang] || doc.title.om,
                summary: doc.summary[currentLang] || doc.summary.om,
                category: doc.category,
                docId: doc.id,
                timestamp: Date.now(),
                read: false,
                matchReason: reason,
                postUrl: doc.postUrl,
              });
            }
          });

          // Filter and sync read status from local storage to keep state stable
          try {
            const readIds = JSON.parse(localStorage.getItem('seera_read_notifications') || '[]');
            newNotifications.forEach(notif => {
              if (readIds.includes(notif.id)) {
                notif.read = true;
              }
            });
          } catch {}

          setNotifications(newNotifications);

          // Trigger a floating Toast Alert only if new documents actually arrived
          if (prevDocCountRef.current > 0 && docs.length > prevDocCountRef.current) {
            const newestDoc = docs[docs.length - 1];
            const alreadyNotified = newNotifications.find(n => n.id === newestDoc.id);
            if (newestDoc && alreadyNotified && !alreadyNotified.read) {
              setActiveToast(alreadyNotified);
              setTimeout(() => setActiveToast(null), 6000);
            }
          }
          
          prevDocCountRef.current = docs.length;
        });
      } catch (err) {
        console.warn('Telegram service subscription failed to load:', err);
      }
    };

    initSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribedCategories, currentLang]);

  const handleToggleCategory = (cat: string) => {
    setSubscribedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleMarkAsRead = (id: string) => {
    try {
      const readIds = JSON.parse(localStorage.getItem('seera_read_notifications') || '[]');
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('seera_read_notifications', JSON.stringify(readIds));
      }
    } catch {}

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    try {
      localStorage.setItem('seera_read_notifications', JSON.stringify(allIds));
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dismissed = JSON.parse(localStorage.getItem('seera_dismissed_notifications') || '[]');
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem('seera_dismissed_notifications', JSON.stringify(dismissed));
      }
    } catch {}
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (activeToast?.id === id) {
      setActiveToast(null);
    }
  };

  const handleNotificationClick = (notif: InAppNotification) => {
    handleMarkAsRead(notif.id);
    setIsOpen(false);
    
    // Detect tab from document type/category
    const targetTab = notif.docId.includes('proc') || notif.category === 'constitutional_admin'
      ? 'legislationRepository'
      : 'cassation';

    if (onSetQuery) {
      onSetQuery(notif.title);
    }
    
    onNavigateTab(targetTab);

    // Dispatch the global custom event so App.tsx captures it, sets the preloaded query and changes tab
    window.dispatchEvent(new CustomEvent('seera:navigate', {
      detail: {
        tab: targetTab,
        query: notif.title
      }
    }));

    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const categoriesList = [
    { id: 'property_land', labelOm: 'Qabiyyee Lafa & Manaa', labelAm: 'የመሬትና ቤት ይዞታ', labelEn: 'Land & Property' },
    { id: 'labor', labelOm: 'Hojjetaa fi Hojjachiisaa', labelAm: 'የአሰሪና ሰራተኛ ጉዳይ', labelEn: 'Labor & Employment' },
    { id: 'criminal', labelOm: 'Seera Yakkaa', labelAm: 'የወንጀል ሕግ', labelEn: 'Criminal Law' },
    { id: 'civil_contract', labelOm: 'Waliigaltee Hariiroo Hawaasaa', labelAm: 'የውልና የፍትሐብሔር ጉዳይ', labelEn: 'Civil Contract' },
    { id: 'constitutional_admin', labelOm: 'Heera Mootummaa & Bulchiinsa', labelAm: 'ሕገ-መንግሥትና አስተዳደር', labelEn: 'Constitutional & Admin' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Floating Toast Alert Banner */}
      {activeToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="flex items-start justify-between gap-2.5">
            <span className="text-xl">🔔</span>
            <div className="flex-1 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider font-mono">
                {currentLang === 'om' ? 'Haaromsi Seeraa Battalaa' : 'አዲስ የህግ መረጃ / ውሳኔ'}
              </span>
              <h4 className="font-bold text-slate-100 line-clamp-1">{activeToast.title}</h4>
              <p className="text-slate-400 line-clamp-2">{activeToast.summary}</p>
              <span className="text-[9px] text-emerald-400 block font-semibold">{activeToast.matchReason}</span>
            </div>
            <button
              onClick={(e) => handleDismissNotification(activeToast.id, e)}
              className="text-slate-500 hover:text-slate-300 font-bold"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex justify-end gap-2 text-[10px]">
            <button
              onClick={() => handleNotificationClick(activeToast)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
            >
              {currentLang === 'om' ? 'Ilaali' : 'አንብብ'}
            </button>
          </div>
        </div>
      )}

      {/* Bell Trigger Button with pulse notifications indicator */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 transition-all cursor-pointer shadow-sm"
        title={currentLang === 'om' ? 'Beeksisa Seeraa (Legal Notifications)' : 'የህግ መረጃ ማሳወቂያዎች'}
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Interactive Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-[350px] sm:w-[420px] bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">📡</span>
              <h4 className="font-bold text-slate-100 font-serif-legal text-sm">
                {currentLang === 'om' ? 'Sinkii Beeksisa Seeraa' : 'የእውነተኛ ጊዜ የህግ መረጃ መከታተያ'}
              </h4>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300"
              >
                {currentLang === 'om' ? 'Hunda dubbisi' : 'ሁሉንም አንብቤያለሁ'}
              </button>
            )}
          </div>

          {/* Subscribed topics checklist section */}
          <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-850 text-xs">
            <span className="font-bold text-slate-300 block text-[10px] uppercase tracking-wider font-mono">
              🎯 {currentLang === 'om' ? 'Dameewwan Seeraa hordofaman (Category Subscriptions):' : 'እንዲደርስዎት የሚፈልጓቸው የህግ ዘርፎች፦'}
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categoriesList.map(cat => {
                const isSel = subscribedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-medium border cursor-pointer transition-all ${
                      isSel 
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {isSel ? '✓ ' : '+ '}
                    {currentLang === 'om' ? cat.labelOm : currentLang === 'am' ? cat.labelAm : cat.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Alerts Feed List */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider font-mono">
              📋 {currentLang === 'om' ? 'Odeeffannoo fi Murteewwan Haaraya (Live In-App Alerts):' : 'አዳዲስ የህግ መረጃዎች እና የሰበር ውሳኔዎች፦'}
            </span>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-2.5 relative group ${
                      notif.read 
                        ? 'bg-slate-950/40 border-slate-850 hover:border-slate-800' 
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="shrink-0 text-base mt-0.5">
                      {notif.category === 'labor' ? '💼' : notif.category === 'property_land' ? '🏡' : '⚖️'}
                    </div>

                    <div className="flex-1 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-amber-400 font-mono font-bold tracking-wide">
                          {notif.category.toUpperCase().replace('_', ' ')}
                        </span>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 block shrink-0" />
                        )}
                      </div>

                      <h5 className="font-bold text-slate-200 line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {notif.title}
                      </h5>
                      <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                        {notif.summary}
                      </p>
                      
                      <div className="flex items-center justify-between pt-1 text-[9px] text-slate-500 font-mono">
                        <span>{notif.matchReason}</span>
                        <button
                          onClick={(e) => handleDismissNotification(notif.id, e)}
                          className="text-slate-600 hover:text-rose-400 font-sans"
                        >
                          {currentLang === 'om' ? 'Haqi' : 'አስወግድ'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs italic space-y-2">
                  <span>📭</span>
                  <p>
                    {currentLang === 'om'
                      ? 'Beeksisa haaraya hin jiru. Gorsa ykn dhimma seeraa filatanii eeggadhaa.'
                      : 'ምንም አዲስ ማሳወቂያ የለም። አዳዲስ የህግ ሰነዶች ሲወጡ እዚህ ይደርስዎታል።'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { backgroundSyncManager } from '../services/backgroundSync';
import { getSavedDocuments, SavedLegalDocument, saveUserSettings } from '../services/storage';
import { QueuedDocumentEdit } from '../services/indexedDb';
import { syncStatusService, CloudSyncStatus } from '../services/syncStatusService';
import { useOfflineMode } from '../hooks/useOfflineMode';
import { useAuth } from '../context/AuthContext';

interface SyncStatusIndicatorProps {
  currentLang?: Language;
  variant?: 'compact' | 'card';
  className?: string;
  onSyncComplete?: (count: number) => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  currentLang = 'om',
  variant = 'compact',
  className = '',
  onSyncComplete,
}) => {
  const {
    isManualOffline,
    isNetworkOnline,
    isEffectiveOffline,
    isTransitioning,
    setOfflineMode,
  } = useOfflineMode();
  const { user, updateProfile } = useAuth();

  const [lastSyncIso, setLastSyncIso] = useState<string | null>(
    backgroundSyncManager.getLastSyncTime()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [cachedDocsCount, setCachedDocsCount] = useState<number>(() => getSavedDocuments().length);
  const [queuedEdits, setQueuedEdits] = useState<QueuedDocumentEdit[]>([]);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() => syncStatusService.getState().status);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(
    () => syncStatusService.getState().isFirestoreConnected
  );
  const [showDetailsPopup, setShowDetailsPopup] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);
  const popupContainerRef = useRef<HTMLDivElement>(null);

  const isOnlineEffective = isNetworkOnline && !isManualOffline;

  const formatSyncTime = useCallback(
    (isoString: string | null): { relative: string; full: string } => {
      if (!isoString) {
        if (currentLang === 'am') return { relative: 'እስካሁን አልተመሳሰለም', full: 'የማመሳሰል ታሪክ የለም' };
        if (currentLang === 'en') return { relative: 'Not synced yet', full: 'No sync recorded' };
        return { relative: 'Hanga ammaatti hin haaromne', full: 'Galmeen hin jiru' };
      }

      const syncDate = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - syncDate.getTime()) / 1000);

      const fullTimeStr = syncDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const fullDateStr = syncDate.toLocaleDateString();
      const full = `${fullDateStr} ${fullTimeStr}`;

      if (diffSec < 45) {
        if (currentLang === 'am') return { relative: 'አሁን', full };
        if (currentLang === 'en') return { relative: 'Just now', full };
        return { relative: 'Amma qofa', full };
      }

      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        if (currentLang === 'am') return { relative: `ከ ${diffMin} ደቂቃ በፊት`, full };
        if (currentLang === 'en') return { relative: `${diffMin} min${diffMin > 1 ? 's' : ''} ago`, full };
        return { relative: `Daqiiqaa ${diffMin} dura`, full };
      }

      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) {
        if (currentLang === 'am') return { relative: `ከ ${diffHours} ሰዓት በፊት`, full };
        if (currentLang === 'en') return { relative: `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`, full };
        return { relative: `Sa'aatii ${diffHours} dura`, full };
      }

      const diffDays = Math.floor(diffHours / 24);
      if (currentLang === 'am') return { relative: `ከ ${diffDays} ቀን በፊት`, full };
      if (currentLang === 'en') return { relative: `${diffDays} day${diffDays > 1 ? 's' : ''} ago`, full };
      return { relative: `Guyyaa ${diffDays} dura`, full };
    },
    [currentLang]
  );

  // Close compact dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (popupContainerRef.current && !popupContainerRef.current.contains(event.target as Node)) {
        setShowDetailsPopup(false);
      }
    };
    if (showDetailsPopup) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDetailsPopup]);

  const handleManualSync = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (isSyncing) return;

      if (isManualOffline) {
        const manualOfflineMsg =
          currentLang === 'am'
            ? 'ከመስመር ውጭ ሁነታ በርቷል — ለማመሳሰል ወደ ኦንላይን ይመለሱ'
            : currentLang === 'en'
            ? 'Offline Mode is active — switch back to Online to re-sync'
            : 'Haalli Offline banaadha — haaromsuuf gara Online tti deebisaa';
        setSyncSuccessMessage(manualOfflineMsg);
        setTimeout(() => setSyncSuccessMessage(null), 3500);
        return;
      }

      if (!navigator.onLine) {
        const offlineMsg =
          currentLang === 'am'
            ? 'ኢንተርኔት የለም - እባክዎ እንደገና ለማመሳሰል ኢንተርኔት ያገናኙ'
            : currentLang === 'en'
            ? 'Offline - Please connect to the internet to re-sync documents'
            : 'Intarneetiin hin jiru - haaromsuuf intarneeta qabsiisaa';
        setSyncSuccessMessage(offlineMsg);
        setTimeout(() => setSyncSuccessMessage(null), 3500);
        return;
      }

      setIsSyncing(true);
      setSyncSuccessMessage(null);

      try {
        const result = await backgroundSyncManager.triggerManualSync();
        setLastSyncIso(result.timestamp);
        setCachedDocsCount(result.syncedDocsCount);

        const successMsg =
          currentLang === 'am'
            ? `ሰነዶች በተሳካ ሁኔታ ተመሳስለዋል (${result.syncedDocsCount} ሰነዶች)`
            : currentLang === 'en'
            ? `Documents re-synced (${result.syncedDocsCount} docs)`
            : `Sanadoonni milkaa'inaan wal simataniiru (${result.syncedDocsCount} sanada)`;

        setSyncSuccessMessage(successMsg);
        if (onSyncComplete) {
          onSyncComplete(result.syncedDocsCount);
        }
        setTimeout(() => setSyncSuccessMessage(null), 3500);
      } catch (err) {
        console.error('Manual sync failed:', err);
        const failMsg =
          currentLang === 'am'
            ? 'ማመሳሰል አልተሳካም - እባክዎ እንደገና ይሞክሩ'
            : currentLang === 'en'
            ? 'Sync failed - Please try again'
            : 'Wal-simsiisuun hin milkoofne - deebisaa yaalaa';
        setSyncSuccessMessage(failMsg);
        setTimeout(() => setSyncSuccessMessage(null), 3500);
      } finally {
        setIsSyncing(false);
      }
    },
    [currentLang, isManualOffline, isSyncing, onSyncComplete]
  );

  // Subscribe to background sync manager updates & events
  useEffect(() => {
    const handleOnline = () => {
      if (!isManualOffline) {
        handleManualSync();
      }
    };
    window.addEventListener('online', handleOnline);

    const unsubDocs = backgroundSyncManager.subscribe((docs: SavedLegalDocument[]) => {
      setCachedDocsCount(docs.length);
      const time = backgroundSyncManager.getLastSyncTime();
      if (time) setLastSyncIso(time);
    });

    const unsubQueue = backgroundSyncManager.subscribeQueue((queue: QueuedDocumentEdit[]) => {
      setQueuedEdits(queue);
    });

    const unsubCloud = syncStatusService.subscribe((state) => {
      setCloudStatus(state.status);
      setIsFirestoreConnected(state.isFirestoreConnected);
      if (state.lastSyncTime) setLastSyncIso(state.lastSyncTime);
    });

    const handleSyncStatusEvent = (e: Event) => {
      const custom = e as CustomEvent<{ timestamp?: string; syncedDocsCount?: number }>;
      if (custom.detail?.timestamp) {
        setLastSyncIso(custom.detail.timestamp);
      }
      if (typeof custom.detail?.syncedDocsCount === 'number') {
        setCachedDocsCount(custom.detail.syncedDocsCount);
      }
    };

    window.addEventListener('seera_sync_status_updated', handleSyncStatusEvent);
    window.addEventListener('seera_documents_synced', handleSyncStatusEvent);

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('seera_sync_status_updated', handleSyncStatusEvent);
      window.removeEventListener('seera_documents_synced', handleSyncStatusEvent);
      unsubDocs();
      unsubQueue();
      unsubCloud();
      clearInterval(interval);
    };
  }, [handleManualSync, isManualOffline]);

  const handleToggleOfflineMode = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextOffline = !isManualOffline;
    saveUserSettings({ offlineModeEnabled: nextOffline });
    await setOfflineMode(nextOffline);

    if (user && isNetworkOnline && !nextOffline) {
      updateProfile({ offlineModeEnabled: nextOffline }).catch(() => {});
    }

    const toggleNotice = nextOffline
      ? currentLang === 'am'
        ? 'ከመስመር ውጭ ሁነታ በ localStorage ተቀምጧል'
        : currentLang === 'en'
        ? 'Offline Mode saved to localStorage — cloud sync paused'
        : 'Haalli Offline localStorage keessatti kuufameera — sync dhaabbateera'
      : isNetworkOnline
      ? currentLang === 'am'
        ? 'ወደ ኦንላይን ተመልሷል — ማመሳሰል ጀምሯል'
        : currentLang === 'en'
        ? 'Online restored — syncing local changes'
        : 'Gara Online tti deebi\'eera — wal-simsiisaa jira'
      : currentLang === 'am'
      ? 'ከመስመር ውጭ ምርጫ ጠፍቷል (ኢንተርኔት እየጠበቀ ነው)'
      : currentLang === 'en'
      ? 'Offline Mode disabled — waiting for internet'
      : 'Haalli Offline cufameera — intarneeta eegaa jira';

    setSyncSuccessMessage(toggleNotice);
    setTimeout(() => setSyncSuccessMessage(null), 3500);
  };

  const { relative: relativeTime, full: fullTime } = formatSyncTime(lastSyncIso);

  const statusInfo = isManualOffline
    ? {
        label:
          currentLang === 'am'
            ? 'ከመስመር ውጭ (Offline)'
            : currentLang === 'en'
            ? 'Offline Mode'
            : 'Haala Offline',
        badgeBg: 'bg-amber-950/60 text-amber-200 border-amber-500/40',
        cardBorder: 'bg-slate-900 border-amber-500/40 text-slate-100',
        icon: <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />,
      }
    : !isNetworkOnline
    ? {
        label:
          currentLang === 'am'
            ? 'ኢንተርኔት የለም'
            : currentLang === 'en'
            ? 'No Internet'
            : 'Intarneetiin Citaa',
        badgeBg: 'bg-amber-950/60 text-amber-200 border-amber-500/40',
        cardBorder: 'bg-slate-900 border-amber-500/40 text-slate-100',
        icon: <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />,
      }
    : isSyncing || cloudStatus === 'syncing'
    ? {
        label:
          currentLang === 'am'
            ? 'በማመሳሰል ላይ...'
            : currentLang === 'en'
            ? 'Syncing...'
            : 'Wal-simsiisaa jira...',
        badgeBg: 'bg-sky-950/60 text-sky-200 border-sky-500/40',
        cardBorder: 'bg-slate-900 border-sky-500/40 text-slate-100',
        icon: <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />,
      }
    : queuedEdits.length > 0
    ? {
        label:
          currentLang === 'am'
            ? `የተጠራቀሙ (${queuedEdits.length})`
            : currentLang === 'en'
            ? `Edits Pending (${queuedEdits.length})`
            : `Eegaa Jira (${queuedEdits.length})`,
        badgeBg: 'bg-amber-950/60 text-amber-200 border-amber-500/40',
        cardBorder: 'bg-slate-900 border-amber-500/40 text-slate-100',
        icon: <Clock className="w-4 h-4 text-amber-400 shrink-0" />,
      }
    : cloudStatus === 'error'
    ? {
        label:
          currentLang === 'am'
            ? 'የማመሳሰል ስህተት'
            : currentLang === 'en'
            ? 'Sync Error'
            : 'Dogoggora Sync',
        badgeBg: 'bg-rose-950/60 text-rose-200 border-rose-500/40',
        cardBorder: 'bg-slate-900 border-rose-500/40 text-slate-100',
        icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      }
    : {
        label:
          currentLang === 'am'
            ? 'ተመሳስሏል'
            : currentLang === 'en'
            ? 'Synced'
            : 'Wal-simateera',
        badgeBg: 'bg-emerald-950/40 text-emerald-200 border-emerald-500/35',
        cardBorder: 'bg-slate-900 border-slate-800 text-slate-100',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      };

  const cloudConnectionLabel = isManualOffline
    ? currentLang === 'am'
      ? 'ቆሟል (Offline Mode)'
      : currentLang === 'en'
      ? 'Paused (Offline Mode)'
      : 'Dhaabbateera (Offline Mode)'
    : !isNetworkOnline
    ? currentLang === 'am'
      ? 'ኢንተርኔት እየጠበቀ ነው'
      : currentLang === 'en'
      ? 'Waiting for Network'
      : 'Intarneeta Eegaa Jira'
    : isFirestoreConnected
    ? currentLang === 'am'
      ? 'ተገናኝቷል'
      : currentLang === 'en'
      ? 'Connected'
      : 'Wal-qunnameera'
    : currentLang === 'am'
    ? 'በመጠባበቅ ላይ'
    : currentLang === 'en'
    ? 'Reconnecting'
    : 'Eegaa Jira';

  // -------------------------------------------------------------
  // COMPACT VARIANT (Navbar & Header control with details dropdown)
  // -------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`} ref={popupContainerRef}>
        <button
          type="button"
          onClick={() => setShowDetailsPopup((prev) => !prev)}
          aria-expanded={showDetailsPopup}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-xl text-xs font-medium border transition-colors cursor-pointer shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${statusInfo.badgeBg} hover:opacity-95`}
          title={`Sync Status: ${statusInfo.label} | ${relativeTime}`}
        >
          {statusInfo.icon}
          <span className="hidden sm:inline font-semibold text-[11px] whitespace-nowrap shrink-0">
            {statusInfo.label}
          </span>
          <span className="text-[10px] opacity-80 hidden md:inline tabular-nums whitespace-nowrap shrink-0">
            · {relativeTime}
          </span>
        </button>

        {showDetailsPopup && (
          <div
            className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-4 z-50 text-slate-200 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2 font-bold text-slate-100">
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {currentLang === 'am'
                    ? 'የሰነዶች ማመሳሰል ሁኔታ'
                    : currentLang === 'en'
                    ? 'Document Sync Status'
                    : 'Haala Wal-simsiisa Sanadoota'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsPopup(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold px-1.5 py-0.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Offline Mode Switch inside Sync Popup */}
            <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 mb-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-100">
                  {currentLang === 'am'
                    ? 'ከመስመር ውጭ ሁነታ'
                    : currentLang === 'en'
                    ? 'Offline Mode'
                    : 'Haala Offline'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isManualOffline
                    ? currentLang === 'en'
                      ? 'Persisted in localStorage'
                      : 'localStorage keessatti kuufameera'
                    : currentLang === 'en'
                    ? 'Auto-sync active when online'
                    : 'Wal-simsiisni banaadha'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isManualOffline}
                aria-label={currentLang === 'en' ? 'Toggle Offline Mode' : 'Haala Offline jijjiiri'}
                disabled={isTransitioning}
                onClick={handleToggleOfflineMode}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isManualOffline ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ${
                    isManualOffline ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2 mb-3.5 tabular-nums">
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-slate-400">
                  {currentLang === 'am' ? 'ግንኙነት' : currentLang === 'en' ? 'Mode' : 'Haala'}
                </span>
                <span className={`font-semibold flex items-center gap-1.5 ${isOnlineEffective ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {isOnlineEffective ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span>{isManualOffline ? 'Manual Offline' : isNetworkOnline ? 'Online' : 'No Internet'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-slate-400">
                  {currentLang === 'am' ? 'የክላውድ ግንኙነት' : currentLang === 'en' ? 'Cloud Connection' : 'Cloud Sync'}
                </span>
                <span className={`font-semibold ${isOnlineEffective && isFirestoreConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {cloudConnectionLabel}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>
                    {currentLang === 'am' ? 'የተቀመጡ ሰነዶች' : currentLang === 'en' ? 'Cached Documents' : 'Sanadoota Kuufaman'}
                  </span>
                </span>
                <span className="font-mono font-bold text-amber-300">{cachedDocsCount}</span>
              </div>

              {queuedEdits.length > 0 && (
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                  <span>
                    {currentLang === 'am' ? 'በመጠባበቅ ላይ' : currentLang === 'en' ? 'Pending Edits' : 'Gulaallii Eegaa Jiru'}
                  </span>
                  <span className="font-mono font-bold">{queuedEdits.length}</span>
                </div>
              )}

              <div className="py-1.5 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <div className="text-[11px] text-slate-400">
                  {currentLang === 'am' ? 'የመጨረሻ ማመሳሰል' : currentLang === 'en' ? 'Last Updated' : 'Yeroo Dhumaa'}
                </div>
                <div className="font-semibold text-slate-200 mt-0.5 flex items-center justify-between gap-2">
                  <span>{relativeTime}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{fullTime}</span>
                </div>
              </div>
            </div>

            {syncSuccessMessage && (
              <div className="mb-3 p-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-center font-medium text-slate-200">
                {syncSuccessMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || !isOnlineEffective}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[40px] ${
                !isOnlineEffective
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : isSyncing
                  ? 'bg-sky-600 text-white cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? currentLang === 'am'
                    ? 'በማመሳሰል ላይ...'
                    : currentLang === 'en'
                    ? 'Re-syncing Now...'
                    : 'Wal-simsiisaa Jira...'
                  : !isOnlineEffective
                  ? isManualOffline
                    ? currentLang === 'am'
                      ? 'ለማመሳሰል Offline Mode ያጥፉ'
                      : currentLang === 'en'
                      ? 'Go Online to Re-sync'
                      : 'Haaromsuuf Offline Cufaa'
                    : currentLang === 'am'
                    ? 'ለማመሳሰል ኢንተርኔት ያገናኙ'
                    : currentLang === 'en'
                    ? 'Connect Internet to Re-sync'
                    : 'Haaromsuuf Intarneeta Qabsiisaa'
                  : currentLang === 'am'
                  ? 'አሁን እንደገና አመሳስል'
                  : currentLang === 'en'
                  ? 'Re-sync Now'
                  : 'Amma Wal-simsiisi'}
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // CARD VARIANT (For MyContentView, SettingsView, and Main Views)
  // -------------------------------------------------------------
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-lg transition-colors ${statusInfo.cardBorder} ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
            {statusInfo.icon}
          </div>

          <div className="space-y-1.5 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-slate-100">
              {currentLang === 'am'
                ? 'የሰነዶች የደመና እና ከመስመር ውጭ ማመሳሰል'
                : currentLang === 'en'
                ? 'Cloud & Offline Sync Status'
                : 'Haala Wal-simsiisa Cloud & Offline'}
            </h3>

            {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 tabular-nums">
              <span className={`font-semibold ${isEffectiveOffline ? 'text-amber-300' : cloudStatus === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                {statusInfo.label}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300">
                {cloudConnectionLabel}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">
                {cachedDocsCount}{' '}
                {currentLang === 'am'
                  ? 'የተሸጎጡ ሰነዶች'
                  : currentLang === 'en'
                  ? 'cached docs'
                  : 'sanadoota kuufaman'}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">
                {currentLang === 'am'
                  ? 'የመጨረሻ ማመሳሰል:'
                  : currentLang === 'en'
                  ? 'Last sync:'
                  : 'Yeroo dhumaa:'}{' '}
                <span className="text-slate-200 font-medium">{relativeTime}</span>
                {lastSyncIso && (
                  <span className="text-slate-500 ml-1 font-mono text-[11px]">({fullTime})</span>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {isManualOffline
                ? currentLang === 'am'
                  ? 'ከመስመር ውጭ ሁነታ ነቅቷል (በ localStorage ተቀምጧል)፤ የክላውድ ማመሳሰል ቆሟል።'
                  : currentLang === 'en'
                  ? 'Manual Offline Mode is enabled and persisted in localStorage. Cloud sync and network requests are paused.'
                  : 'Haalli Offline banaadha (localStorage keessatti kuufameera); wal-simsiisni Cloud dhaabbateera.'
                : currentLang === 'am'
                ? 'ሰነዶች በ IndexedDB ውስጥ ተቀምጠዋል እንዲሁም ከ Cloud Firestore ጋር ይመሳሰላሉ።'
                : currentLang === 'en'
                ? 'Legal documents are cached in IndexedDB for offline access and automatically synced with Cloud Firestore.'
                : 'Sanadoonni seeraa IndexedDB keessatti kuufamaniiru, akkasumas Cloud Firestore waliin wal simatu.'}
            </p>

            {queuedEdits.length > 0 && (
              <div className="text-xs text-amber-300 font-medium pt-0.5 flex items-center gap-1.5 tabular-nums">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {currentLang === 'am'
                    ? `${queuedEdits.length} ማሻሻያዎች ከመስመር ውጭ በመጠባበቅ ላይ ናቸው፤ ኦንላይን ሲሆኑ በራሱ ይመሳሰላል።`
                    : currentLang === 'en'
                    ? `${queuedEdits.length} edit(s) queued locally; will reconcile automatically when online.`
                    : `Gulaalliin ${queuedEdits.length} offline eegaa jira; akkuma online deebi'een ofumaan wal simata.`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Controls: Offline Mode Toggle Switch + Re-sync Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-medium text-slate-200 whitespace-nowrap shrink-0">
              {currentLang === 'am'
                ? 'ከመስመር ውጭ ሁነታ'
                : currentLang === 'en'
                ? 'Offline Mode'
                : 'Haala Offline'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isManualOffline}
              aria-label={currentLang === 'en' ? 'Toggle Offline Mode' : 'Haala Offline jijjiiri'}
              disabled={isTransitioning}
              onClick={handleToggleOfflineMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isManualOffline ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ${
                  isManualOffline ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || !isOnlineEffective}
            className={`px-4 py-2.5 min-h-[40px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              !isOnlineEffective
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : isSyncing
                ? 'bg-sky-600 text-white cursor-wait'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? currentLang === 'am'
                  ? 'በማመሳሰል ላይ...'
                  : currentLang === 'en'
                  ? 'Re-syncing...'
                  : 'Wal-simsiisaa jira...'
                : currentLang === 'am'
                ? 'አሁን አመሳስል'
                : currentLang === 'en'
                ? 'Re-sync Now'
                : 'Amma Wal-simsiisi'}
            </span>
          </button>
        </div>
      </div>

      {syncSuccessMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-center font-medium text-slate-200">
          <span>{syncSuccessMessage}</span>
        </div>
      )}
    </div>
  );
};

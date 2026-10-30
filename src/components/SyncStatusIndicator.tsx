import React, { useState, useEffect, useCallback } from 'react';
import { Language } from '../i18n/translations';
import { backgroundSyncManager } from '../services/backgroundSync';
import { getSavedDocuments, SavedLegalDocument } from '../services/storage';
import { QueuedDocumentEdit } from '../services/indexedDb';

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
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSyncIso, setLastSyncIso] = useState<string | null>(
    backgroundSyncManager.getLastSyncTime()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [cachedDocsCount, setCachedDocsCount] = useState<number>(() => getSavedDocuments().length);
  const [queuedEdits, setQueuedEdits] = useState<QueuedDocumentEdit[]>([]);
  const [showDetailsPopup, setShowDetailsPopup] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  // Helper to format relative and absolute time in trilingual terms
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

      const fullTimeStr = syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  // Subscribe to background sync manager updates & events
  useEffect(() => {
    // 1. Connection listeners
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync on connection restoration
      handleManualSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Document count changes
    const unsubDocs = backgroundSyncManager.subscribe((docs: SavedLegalDocument[]) => {
      setCachedDocsCount(docs.length);
      const time = backgroundSyncManager.getLastSyncTime();
      if (time) setLastSyncIso(time);
    });

    // 3. Queue changes
    const unsubQueue = backgroundSyncManager.subscribeQueue((queue: QueuedDocumentEdit[]) => {
      setQueuedEdits(queue);
    });

    // 4. Custom sync events
    const handleSyncStatusEvent = (e: Event) => {
      const custom = e as CustomEvent<{ timestamp: string; syncedDocsCount: number }>;
      if (custom.detail?.timestamp) {
        setLastSyncIso(custom.detail.timestamp);
      }
      if (typeof custom.detail?.syncedDocsCount === 'number') {
        setCachedDocsCount(custom.detail.syncedDocsCount);
      }
    };

    window.addEventListener('seera_sync_status_updated', handleSyncStatusEvent);
    window.addEventListener('seera_documents_synced', handleSyncStatusEvent);

    // 5. Periodic tick to keep relative time updated (every 20s)
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('seera_sync_status_updated', handleSyncStatusEvent);
      window.removeEventListener('seera_documents_synced', handleSyncStatusEvent);
      unsubDocs();
      unsubQueue();
      clearInterval(interval);
    };
  }, []);

  // Trigger manual sync
  const handleManualSync = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isSyncing) return;

    if (!navigator.onLine) {
      const offlineMsg =
        currentLang === 'am'
          ? 'ኢንተርኔት የለም - እባክዎ እንደገና ለማመሳሰል ኢንተርኔት ያገናኙ'
          : currentLang === 'en'
          ? 'Offline - Please connect to the internet to re-sync documents'
          : 'Intarneetiin hin jiru - haaromsuuf intarneeta qabsiisaa';
      setSyncSuccessMessage(`⚠️ ${offlineMsg}`);
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
          ? `ሰነዶች በተሳካ ሁኔታ ተመሳስለዋል! (${result.syncedDocsCount} ሰነዶች)`
          : currentLang === 'en'
          ? `Documents re-synced successfully! (${result.syncedDocsCount} docs)`
          : `Sanadoonni milkaa'inaan wal simataniiru! (${result.syncedDocsCount} sanada)`;

      setSyncSuccessMessage(`✅ ${successMsg}`);
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
      setSyncSuccessMessage(`⚠️ ${failMsg}`);
      setTimeout(() => setSyncSuccessMessage(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  const { relative: relativeTime, full: fullTime } = formatSyncTime(lastSyncIso);

  // Status configuration
  const statusInfo = !isOnline
    ? {
        label: currentLang === 'am' ? 'ከመስመር ውጭ' : currentLang === 'en' ? 'Offline' : 'Offline',
        emoji: '🟡',
        colorClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      }
    : queuedEdits.length > 0
    ? {
        label:
          currentLang === 'am'
            ? `የተጠራቀሙ (${queuedEdits.length})`
            : currentLang === 'en'
            ? `Edits Pending (${queuedEdits.length})`
            : `Gulaalliin Eegaa Jira (${queuedEdits.length})`,
        emoji: '⏳',
        colorClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      }
    : isSyncing
    ? {
        label:
          currentLang === 'am'
            ? 'በማመሳሰል ላይ...'
            : currentLang === 'en'
            ? 'Syncing...'
            : 'Wal-simsiisaa jira...',
        emoji: '🔄',
        colorClass: 'bg-blue-950/80 border-blue-500/40 text-blue-300',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      }
    : {
        label:
          currentLang === 'am'
            ? 'የተመሳሰለ'
            : currentLang === 'en'
            ? 'Up to Date'
            : 'Wal-simateera',
        emoji: '🟢',
        colorClass: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };

  // -------------------------------------------------------------
  // COMPACT VARIANT (Navbar & Header pill with details dropdown)
  // -------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={() => setShowDetailsPopup((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer shadow-sm ${statusInfo.badgeBg} hover:opacity-90`}
          title={`Sync Status: ${statusInfo.label} | ${relativeTime}`}
        >
          <span className={`text-xs ${isSyncing ? 'animate-spin inline-block' : ''}`}>
            {isSyncing ? '🔄' : statusInfo.emoji}
          </span>
          <span className="hidden sm:inline font-semibold">{statusInfo.label}</span>
          <span className="text-[10px] text-slate-300 hidden md:inline">
            • {relativeTime}
          </span>
        </button>

        {/* Floating Details Popup */}
        {showDetailsPopup && (
          <div
            className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 z-50 text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2 font-bold text-slate-100">
                <span>🔄</span>
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
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-3.5">
              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">
                  {currentLang === 'am' ? 'ግንኙነት:' : currentLang === 'en' ? 'Connection:' : 'Walitti-dhufeenya:'}
                </span>
                <span className="font-semibold flex items-center gap-1">
                  <span>{isOnline ? '🟢' : '🟡'}</span>
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">
                  {currentLang === 'am' ? 'የተቀመጡ ሰነዶች:' : currentLang === 'en' ? 'Cached Documents:' : 'Sanadoota Kuufaman:'}
                </span>
                <span className="font-mono font-bold text-amber-300">
                  📁 {cachedDocsCount}
                </span>
              </div>

              {queuedEdits.length > 0 && (
                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                  <span>
                    {currentLang === 'am' ? 'በመጠባበቅ ላይ ያሉ:' : currentLang === 'en' ? 'Pending Edits:' : 'Gulaallii Eegaa Jiru:'}
                  </span>
                  <span className="font-mono font-bold">
                    ⏳ {queuedEdits.length}
                  </span>
                </div>
              )}

              <div className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">
                  {currentLang === 'am' ? 'የመጨረሻ ማመሳሰል:' : currentLang === 'en' ? 'Last Updated:' : 'Yeroo Dhumaf Kan Haaromfame:'}
                </div>
                <div className="font-semibold text-slate-200 mt-0.5 flex items-center justify-between">
                  <span>⏱️ {relativeTime}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{fullTime}</span>
                </div>
              </div>
            </div>

            {/* Notification message inside popup */}
            {syncSuccessMessage && (
              <div className="mb-3 p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-center font-medium">
                {syncSuccessMessage}
              </div>
            )}

            {/* Re-sync Button */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                !isOnline
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : isSyncing
                  ? 'bg-blue-600 text-white cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <span className={isSyncing ? 'animate-spin inline-block' : ''}>
                🔄
              </span>
              <span>
                {isSyncing
                  ? currentLang === 'am'
                    ? 'በማመሳሰል ላይ...'
                    : currentLang === 'en'
                    ? 'Re-syncing Now...'
                    : 'Wal-simsiisaa Jira...'
                  : !isOnline
                  ? currentLang === 'am'
                    ? 'ለማመሳሰል ኢንተርኔት ያገናኙ'
                    : currentLang === 'en'
                    ? 'Connect Online to Re-sync'
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
  // CARD VARIANT (For MyContentView and Main Views)
  // -------------------------------------------------------------
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-lg transition-all ${statusInfo.colorClass} ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Indicator & Sync Status Information */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0 shadow-inner">
            <span className={isSyncing ? 'animate-spin inline-block' : ''}>
              {isSyncing ? '🔄' : statusInfo.emoji}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
                <span>
                  {currentLang === 'am'
                    ? 'የሰነዶች ከመስመር ውጭ ማመሳሰል'
                    : currentLang === 'en'
                    ? 'Offline Documents Sync Status'
                    : 'Haala Wal-simsiisa Sanadoota Offline'}
                </span>
              </h3>

              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${statusInfo.badgeBg}`}
              >
                {statusInfo.label}
              </span>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                {isOnline ? '🟢 Online' : '🟡 Offline Mode'}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {currentLang === 'am'
                ? `ሰነዶች (${cachedDocsCount}) በ IndexedDB ውስጥ ከመስመር ውጭ ተቀምጠዋል። ያለ ኢንተርኔት ማንበብ እና ማሻሻል ይችላሉ።`
                : currentLang === 'en'
                ? `Legal documents (${cachedDocsCount}) cached in IndexedDB. Fully accessible and editable without internet.`
                : `Sanadoonni seeraa (${cachedDocsCount}) IndexedDB keessatti kuufamaniiru. Intarneeta malee guutummaatti dubbisuu fi gulaaluun ni danda'ama.`}
            </p>

            {/* Timestamp line */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300 font-mono">
              <span className="text-amber-400 font-semibold">
                ⏱️ {currentLang === 'am' ? 'የመጨረሻ ማሻሻያ:' : currentLang === 'en' ? 'Last Updated:' : 'Yeroo Dhumaf Kan Haaromfame:'}
              </span>
              <span className="font-bold text-slate-100">{relativeTime}</span>
              {lastSyncIso && (
                <span className="text-slate-400 text-[10px]">({fullTime})</span>
              )}
            </div>

            {queuedEdits.length > 0 && (
              <div className="text-xs text-amber-300 font-medium pt-0.5 flex items-center gap-1.5">
                <span>⏳</span>
                <span>
                  {currentLang === 'am'
                    ? `${queuedEdits.length} ማሻሻያዎች ከመስመር ውጭ በመጠባበቅ ላይ ናቸው፤ ኢንተርኔት ሲመለስ በራሱ ይመሳሰላል።`
                    : currentLang === 'en'
                    ? `${queuedEdits.length} edits queued offline; will automatically reconcile when reconnected.`
                    : `Gulaalliin ${queuedEdits.length} offline eegaa jira; akkuma intarneettiin deebi'een ofumaan wal simata.`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Re-sync Trigger Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 md:self-center">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              !isOnline
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80'
                : isSyncing
                ? 'bg-blue-600 text-white cursor-wait'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
            }`}
            title={
              !isOnline
                ? currentLang === 'am'
                  ? 'ለማመሳሰል ኢንተርኔት ያገናኙ'
                  : currentLang === 'en'
                  ? 'Connect to internet to trigger re-sync'
                  : 'Haaromsuuf intarneeta qabsiisaa'
                : currentLang === 'am'
                ? 'አሁን እንደገና አመሳስል'
                : currentLang === 'en'
                ? 'Trigger manual re-sync'
                : 'Amma deebisii wal-simsiisi'
            }
          >
            <span className={`text-sm ${isSyncing ? 'animate-spin inline-block' : ''}`}>
              🔄
            </span>
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

      {/* Sync Success / Failure Notification Banner */}
      {syncSuccessMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-center font-medium animate-in fade-in duration-200">
          <span>{syncSuccessMessage}</span>
        </div>
      )}
    </div>
  );
};

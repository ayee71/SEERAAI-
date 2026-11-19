import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, CloudOff, AlertCircle, CheckCircle2, HardDrive } from 'lucide-react';
import { Language } from '../i18n/translations';
import { useOfflineMode } from '../hooks/useOfflineMode';
import { useAuth } from '../context/AuthContext';
import { saveUserSettings } from '../services/storage';
import { syncStatusService, SyncState } from '../services/syncStatusService';

interface ConnectionStatusIndicatorProps {
  currentLang: Language;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ currentLang }) => {
  const {
    isManualOffline,
    isNetworkOnline,
    isEffectiveOffline,
    isTransitioning,
    setOfflineMode,
  } = useOfflineMode();
  const { user, updateProfile } = useAuth();
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>(() => syncStatusService.getState());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return syncStatusService.subscribe(setSyncState);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };
    if (showDetails) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDetails]);

  const handleToggleOffline = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextOffline = !isManualOffline;
    saveUserSettings({ offlineModeEnabled: nextOffline });
    await setOfflineMode(nextOffline);
    if (user && isNetworkOnline && !nextOffline) {
      updateProfile({ offlineModeEnabled: nextOffline }).catch(() => {});
    }
  };

  const statusText = isManualOffline
    ? currentLang === 'om'
      ? 'Offline Mode'
      : currentLang === 'am'
      ? 'ከመስመር ውጭ'
      : 'Offline Mode'
    : !isNetworkOnline
    ? currentLang === 'om'
      ? 'Intarneetiin Citaa'
      : currentLang === 'am'
      ? 'ኢንተርኔት የለም'
      : 'No Internet'
    : currentLang === 'om'
    ? 'Online'
    : currentLang === 'am'
    ? 'ኦንላይን'
    : 'Online';

  const switchAriaLabel =
    currentLang === 'om'
      ? 'Haala Offline jijjiiri'
      : currentLang === 'am'
      ? 'ከመስመር ውጭ ሁነታን ቀይር'
      : 'Toggle offline mode';

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <div
        className={`flex items-center rounded-xl border transition-colors shadow-sm ${
          isEffectiveOffline
            ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/35 text-emerald-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-l-xl hover:bg-white/5 transition-colors"
          title={
            isManualOffline
              ? currentLang === 'om'
                ? 'Haala Offline (Harkaaf banaa) — Kuusaa naannoo qofatu hojjeta'
                : currentLang === 'am'
                ? 'ከመስመር ውጭ ሁነታ (በተጠቃሚ የተመረጠ)'
                : 'Offline Mode (Enabled) — Using local cached database'
              : !isNetworkOnline
              ? currentLang === 'om'
                ? 'Neetworkiin hin jiru — Kuusaa naannoo irraa hojjeta'
                : currentLang === 'am'
                ? 'ኢንተርኔት የለም — የተሸጎጠ መረጃ ይሰራል'
                : 'No internet connection — Cached database active'
              : currentLang === 'om'
              ? 'Sarara irratti jira — AI fi Cloud Sync qophii dha'
              : currentLang === 'am'
              ? 'ኦንላይን — ሁሉም የ AI እና ክላውድ አገልግሎቶች ዝግጁ ናቸው'
              : 'Online — Cloud AI and real-time sync active'
          }
        >
          {isManualOffline ? (
            <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : !isNetworkOnline ? (
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="hidden sm:inline font-semibold text-[11px] whitespace-nowrap shrink-0">
            {statusText}
          </span>
        </button>

        {/* Direct 1-click Offline Mode Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isManualOffline}
          aria-label={switchAriaLabel}
          disabled={isTransitioning}
          onClick={handleToggleOffline}
          title={
            isManualOffline
              ? currentLang === 'om'
                ? 'Gara Online tti deebisi'
                : currentLang === 'am'
                ? 'ወደ ኦንላይን ይመለሱ'
                : 'Switch back to Online mode'
              : currentLang === 'om'
              ? 'Haala Offline (localStorage) bani'
              : currentLang === 'am'
              ? 'ከመስመር ውጭ ሁነታን ያብሩ'
              : 'Enable Offline mode (persisted locally)'
          }
          className="flex items-center gap-1.5 pr-2 pl-1.5 py-1.5 min-h-[36px] border-l border-white/10 cursor-pointer hover:bg-white/5 rounded-r-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors shrink-0 disabled:opacity-60"
        >
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              isManualOffline ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-150 ${
                isManualOffline ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className="hidden xl:inline text-[10px] font-medium opacity-90 whitespace-nowrap shrink-0">
            {isManualOffline ? 'Offline' : 'Live'}
          </span>
        </button>
      </div>

      {/* Interactive Connection & Offline Mode Popover */}
      {showDetails && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 shadow-2xl z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              {isEffectiveOffline ? (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="font-bold text-slate-100">
                {isManualOffline
                  ? currentLang === 'om'
                    ? 'Haala Offline (Filatame)'
                    : currentLang === 'am'
                    ? 'ከመስመር ውጭ ሁነታ (ንቁ)'
                    : 'Offline Mode Enabled'
                  : !isNetworkOnline
                  ? currentLang === 'om'
                    ? 'Neetworkiin Citaadha'
                    : currentLang === 'am'
                    ? 'ኢንተርኔት ተቋርጧል'
                    : 'Network Disconnected'
                  : currentLang === 'om'
                  ? 'Tajaajilli Cloud & AI Banaadha'
                  : currentLang === 'am'
                  ? 'ሁሉም የ AI አገልግሎቶች ክፍት ናቸው'
                  : 'Full AI & Cloud Sync Active'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Interactive Offline Mode Toggle inside Popover */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 mb-3">
            <div className="min-w-0">
              <div className="font-semibold text-slate-100">
                {currentLang === 'om'
                  ? 'Haala Offline (Al-sararaa)'
                  : currentLang === 'am'
                  ? 'ከመስመር ውጭ ሁነታ'
                  : 'Offline Mode'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isManualOffline
                  ? currentLang === 'om'
                    ? 'localStorage keessatti kuufameera; sync dhaabbateera.'
                    : currentLang === 'am'
                    ? 'በ localStorage ተቀምጧል፤ ማመሳሰል ቆሟል።'
                    : 'Saved in localStorage; cloud sync paused.'
                  : currentLang === 'om'
                  ? 'Yoo bante, cloud sync fi AI traffic ni dhaabbata.'
                  : currentLang === 'am'
                  ? 'ሲበራ የክላውድ ማመሳሰልን ያቆማል።'
                  : 'Pause cloud sync and work from local cache.'}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isManualOffline}
              aria-label={switchAriaLabel}
              disabled={isTransitioning}
              onClick={handleToggleOffline}
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

          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            {isEffectiveOffline
              ? currentLang === 'om'
                ? 'Kuusaan seeraa (IndexedDB & localStorage) fi murtiiwwan Ijibbaataa guutummaatti hojjetu. Gulaalliin haaraan hanga online deebitutti ni eegama.'
                : currentLang === 'am'
                ? 'የተሸጎጠው የሕግ መረጃ (IndexedDB እና localStorage) እና የሰበር ውሳኔዎች ያለኢንተርኔት ይሰራሉ።'
                : 'Your cached legal database, precedents, and saved documents remain accessible. Edits stay queued locally until you go back online.'
              : currentLang === 'om'
              ? 'Gemini AI, hiika afaanii fi wal-simsiisni Cloud Firestore yeroo hundaa hojii irra jiru.'
              : currentLang === 'am'
              ? 'Gemini AI፣ ትርጉም እና የ Cloud Firestore ማመሳሰል በንቃት እየሰሩ ናቸው።'
              : 'Cloud AI analysis, live translation, and Firestore synchronization are active.'}
          </p>

          <div className="space-y-1.5 pt-2.5 border-t border-slate-800 text-[11px] tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cloud AI Inference</span>
              <span className={isEffectiveOffline ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {isEffectiveOffline ? 'Paused (Offline)' : 'Active'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cached Legal DB</span>
              <span className="text-emerald-400 font-semibold">Available</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cloud Sync Status</span>
              <span className={isEffectiveOffline ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {syncState.status === 'syncing'
                  ? 'Syncing...'
                  : isManualOffline
                  ? 'Paused (Manual Offline)'
                  : !isNetworkOnline
                  ? 'Waiting for Internet'
                  : 'Synced'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                <span>Setting Storage</span>
              </span>
              <span className="text-slate-300 font-mono text-[10px]">
                {isManualOffline ? 'localStorage: offline' : 'localStorage: online'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

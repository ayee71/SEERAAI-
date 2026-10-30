import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Language } from '../i18n/translations';

interface ConnectionStatusIndicatorProps {
  currentLang: Language;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ currentLang }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-sm ${
          isOnline
            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
        }`}
        title={
          isOnline
            ? (currentLang === 'om' ? 'Sarara irratti jira - Tooftaaleen AI cufa ni hojjetu' : currentLang === 'am' ? 'ኦንላይን - ሁሉም የ AI አገልግሎቶች ይሰራሉ' : 'Online - All AI Features Available')
            : (currentLang === 'om' ? 'Sarara irraa bahe - Kuusaa qofatu hojjeta' : currentLang === 'am' ? 'ኦፍላይን - የተخዘ መረጃ ብቻ ይሰራል' : 'Offline Mode - Cached Legal DB Active')
        }
      >
        <span className="relative flex h-2 w-2">
          {isOnline ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          )}
        </span>
        <span className="font-semibold text-[11px] hidden sm:inline">
          {isOnline 
            ? (currentLang === 'om' ? 'Online (AI Ready)' : currentLang === 'am' ? 'ኦንላይን (AI ዝግጁ)' : 'Online (AI Ready)')
            : (currentLang === 'om' ? 'Offline (Cached)' : currentLang === 'am' ? 'ኦፍላይን' : 'Offline Mode')}
        </span>
        {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
      </button>

      {/* Granular AI Availability Popup / Tooltip */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
            {isOnline ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-bold text-slate-100">
              {isOnline
                ? (currentLang === 'om' ? 'Hojiin AI Cufa Caccabsameera' : currentLang === 'am' ? 'ሁሉም የ AI አገልግሎቶች ክፍት ናቸው' : 'Full AI & Cloud Available')
                : (currentLang === 'om' ? 'Haala Offline (AI Hojii Alaa)' : currentLang === 'am' ? 'የኦፍላይን ሁኔታ (AI ተቋርጧል)' : 'Offline Mode (AI Paused)')}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
            {isOnline
              ? (currentLang === 'om' 
                  ? 'Sarara irratti waan jirtuuf, Gemini Flash AI, hiika luuqa, tajaajilli ragaa fi sinkiiwwan cufa bifa saffisaa ta\'een argamtu.'
                  : currentLang === 'am' 
                  ? 'በኦንላይን ስለሆኑ የ Gemini Flash AI፣ የሕግ ትንተና፣ የትርጉም እና የማመሳሰል አገልግሎቶች በሙሉ ይሰራሉ።'
                  : 'You are connected to the cloud. Gemini Flash AI, deep reasoning, legal analysis, live translation, and cloud sync are fully operational.')
              : (currentLang === 'om'
                  ? 'Intarneetiin waan hin jirreef, tajaajilli AI duuboo (Cloud AI inference) yeroof dhaabbateera. Ta\'us kuusaan seeraa qabame (Cached Legal DB), ragaan kee fi bakkewwan kuusaa hojjechuu danda\'u.'
                  : currentLang === 'am'
                  ? 'ኢንተርኔት ስለሌለ የክላውድ AI ትንተና ቆሟል። ነገር ግን የተخዘው የሕግ መረጃ (Cached DB) እና የተቀመጡ ፋይሎችዎ መስራታቸውን ይቀጥላሉ።'
                  : 'Internet connection is offline. Cloud AI generation and real-time cloud sync are paused. However, your local cached legal database, saved library, and offline tools remain fully accessible.')}
          </p>

          <div className="space-y-1 pt-2 border-t border-slate-900 text-[10px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>🤖</span> Cloud AI Inference:
              </span>
              <span className={isOnline ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {isOnline ? 'Active (🟢)' : 'Paused (Offline ⚠️)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>📚</span> Cached Legal DB:
              </span>
              <span className="text-emerald-400 font-bold">
                Available (🟢)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>⚡</span> Real-Time Sync:
              </span>
              <span className={isOnline ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                {isOnline ? 'Synced (🟢)' : 'Local Only (⏳)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

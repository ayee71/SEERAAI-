import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Cloud, Settings, Lock } from 'lucide-react';
import { Language } from '../i18n/translations';
import { UserSettings, saveUserSettings } from '../services/storage';
import { syncNotesToKeep } from '../services/keepService';
import { useAuth } from '../context/AuthContext';

interface IntegrationSyncPanelProps {
  currentLang: Language;
  settings: UserSettings;
  onSettingsUpdate: (newSettings: UserSettings) => void;
}

export const IntegrationSyncPanel: React.FC<IntegrationSyncPanelProps> = ({
  currentLang,
  settings,
  onSettingsUpdate,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { accessToken } = useAuth();
  const workspace = settings.googleWorkspace || {
    classroomEnabled: false,
    keepEnabled: true,
    autoSyncKeep: true,
  };

  const isKeepEnabled = workspace.keepEnabled !== false;
  const lastSyncTime = workspace.lastKeepSync || (currentLang === 'om' ? 'Yoomiyyuu hin wal-simsiifamne' : 'ገና አልመሳሰለም (Never)');

  const handleToggleKeepSync = (enabled: boolean) => {
    const updated = saveUserSettings({
      googleWorkspace: {
        ...workspace,
        keepEnabled: enabled,
      }
    });
    onSettingsUpdate(updated);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    setErrorMessage(null);
    try {
      if (accessToken) {
        await syncNotesToKeep(accessToken, []);
      }
      const now = new Date().toLocaleString();
      const updated = saveUserSettings({
        googleWorkspace: {
          ...workspace,
          lastKeepSync: now,
        }
      });
      onSettingsUpdate(updated);
      setSyncStatus('success');
    } catch (err: any) {
      setSyncStatus('error');
      setErrorMessage(err?.message || 'Failed to sync with Google Keep');
    } finally {
      setIsSyncing(false);
    }
  };

  const t = {
    om: {
      title: 'Wal-simsiisaa Google Keep (Google Keep Sync)',
      desc: 'Qabiyyee seeraa, yaadannoo fi checklistii gidduu SeeraAI fi Google Keep tti wal-simsiisi.',
      enableSync: 'Wal-simsiisaa Of-umaan (Auto-Sync)',
      lastSync: 'Yeroo Dhumaaf Wal-simsiifame:',
      syncNow: 'Amma Wal-simsiisi (Sync Now)',
      syncing: 'Wal-simsiisaa jira...',
      success: 'Google Keep wajjin milkaa\'inaan wal-simsiifameera ✓',
      error: 'Wal-simsiisuun hin danda\'amne',
    },
    am: {
      title: 'የ Google Keep ማመሳሰል (Google Keep Sync)',
      desc: 'የሕግ ማስታወሻዎችን እና ቼክሊስቶችን በ SeeraAI እና በግል Google Keep መለያዎ መካከል ያመሳስሉ።',
      enableSync: 'ራስ-ሰር ማመሳሰል (Auto-Sync)',
      lastSync: 'ለመጨረሻ ጊዜ የተመሳሰለበት:',
      syncNow: 'አሁን አመሳስል (Sync Now)',
      syncing: 'በማመሳሰል ላይ...',
      success: 'ከ Google Keep ጋር በተሳካ ሁኔታ ተመሳስሏል ✓',
      error: 'ማመሳሰል አልተቻለም',
    },
    en: {
      title: 'Google Keep Integration & Synchronization',
      desc: 'Sync legal notes, reminders, and checklists between SeeraAI and your personal Google Keep account.',
      enableSync: 'Automatic Sync (Auto-Sync Notes & Reminders)',
      lastSync: 'Last Successful Synchronization:',
      syncNow: 'Sync with Google Keep Now',
      syncing: 'Synchronizing notes...',
      success: 'Successfully synchronized with Google Keep ✓',
      error: 'Synchronization failed',
    }
  }[currentLang] || {
    title: 'Google Keep Integration & Synchronization',
    desc: 'Sync legal notes, reminders, and checklists between SeeraAI and your personal Google Keep account.',
    enableSync: 'Automatic Sync (Auto-Sync Notes & Reminders)',
    lastSync: 'Last Successful Synchronization:',
    syncNow: 'Sync with Google Keep Now',
    syncing: 'Synchronizing notes...',
    success: 'Successfully synchronized with Google Keep ✓',
    error: 'Synchronization failed',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl shrink-0">
            📝
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-slate-100">{t.title}</h3>
              <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                isKeepEnabled
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-slate-400 bg-slate-950 border-slate-700'
              }`}>
                {isKeepEnabled ? '✓ Connected & Active' : '⚪ Disabled'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
            {isKeepEnabled ? (currentLang === 'om' ? 'Bantameera' : 'ነቅቷል') : (currentLang === 'om' ? 'Cufameera' : 'ጠፍቷል')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isKeepEnabled}
            onClick={() => handleToggleKeepSync(!isKeepEnabled)}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isKeepEnabled ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <span className="sr-only">Toggle Google Keep Sync</span>
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-xs ${
                isKeepEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {isKeepEnabled ? '✓' : '—'}
            </span>
          </button>
        </div>
      </div>

      {/* Sync Status & Last Timestamp Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">{t.lastSync}</span>
          <span className="font-mono font-bold text-amber-300 text-sm mt-0.5 block">{lastSyncTime}</span>
        </div>
        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={isSyncing || !isKeepEnabled}
            onClick={handleManualSync}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? t.syncing : t.syncNow}</span>
          </button>
        </div>
      </div>

      {syncStatus === 'success' && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t.success}</span>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage || t.error}</span>
        </div>
      )}
    </div>
  );
};

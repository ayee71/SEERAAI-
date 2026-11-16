import React, { useEffect, useState } from 'react';
import { SyncLogEntry, getSyncLogs, clearSyncLogs, deleteSyncLog } from '../services/syncLogService';
import { Language, translations } from '../i18n/translations';
import { resolveCaseConflict, CourtCaseFile } from '../services/courtOfflineStore';

interface SyncLogViewProps {
  currentLang: Language;
}

export const SyncLogView: React.FC<SyncLogViewProps> = ({ currentLang }) => {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingConflict, setResolvingConflict] = useState<SyncLogEntry | null>(null);
  const [isProcessingResolution, setIsProcessingResolution] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    const data = await getSyncLogs();
    setLogs(data);
    setIsLoading(false);
  };

  const t = (om: string, am: string, en: string) => {
    if (currentLang === 'om') return om;
    if (currentLang === 'am') return am;
    return en;
  };

  const handleClear = async () => {
    if (confirm(t('Galmee wal-simsiisaa hunda haquu barbaadduu?', 'ሁሉንም የማመሳሰል ምዝግብ ማስታወሻዎች መሰረዝ ይፈልጋሉ?', 'Are you sure you want to clear all sync logs?'))) {
      await clearSyncLogs();
      setLogs([]);
    }
  };

  const handleResolve = async (version: 'local' | 'remote') => {
    if (!resolvingConflict || !resolvingConflict.conflictData) return;
    
    setIsProcessingResolution(true);
    try {
      const chosen = version === 'local' ? resolvingConflict.conflictData.local : resolvingConflict.conflictData.remote;
      await resolveCaseConflict(resolvingConflict.affectedIds[0], chosen, resolvingConflict.id);
      // Delete the log that had the conflict
      await deleteSyncLog(resolvingConflict.id);
      setResolvingConflict(null);
      await loadLogs();
    } catch (err) {
      console.error('Resolution failed:', err);
      alert(t('Rakkoon uumameera.', 'ስህተት ተከስቷል።', 'An error occurred.'));
    } finally {
      setIsProcessingResolution(false);
    }
  };

  const getStatusColor = (status: SyncLogEntry['status']) => {
    switch (status) {
      case 'success': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'failed': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'partial': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getTypeLabel = (type: SyncLogEntry['type']) => {
    switch (type) {
      case 'upload': return t('Ol-kaasuu', 'መጫን', 'Upload');
      case 'download': return t('Buusuu', 'ማውረድ', 'Download');
      case 'full': return t('Guutuu', 'ሙሉ', 'Full');
      case 'conflict_resolution': return t('Furmaata Wal-dhabdee', 'ግጭት መፍታት', 'Conflict Resolution');
      default: return type;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📊</span>
            <span>{t('Galmee Wal-simsiisaa', 'የማመሳሰል ምዝግብ ማስታወሻ', 'Sync Log')}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'Seenaa wal-simsiisaa sanadootaa fi jijjiiramoota mana murtii.', 
              'የሰነዶች እና የፍርድ ቤት ለውጦች ማመሳሰል ታሪክ።',
              'History of document and court change synchronization.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            🔄
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-rose-500/20"
          >
            {t('Qulqulleessi', 'አጽዳ', 'Clear')}
          </button>
        </div>
      </div>

      {/* Sync Statistics Section */}
      {!isLoading && logs.length > 0 && (
        <div className="p-5 border-b border-slate-800 bg-slate-950/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Success Rate Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t('Galfii Milkaa\'inaa', 'የስኬት መጠን', 'Success Rate')}
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {Math.round((logs.filter((l: SyncLogEntry) => l.status === 'success').length / logs.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${(logs.filter((l: SyncLogEntry) => l.status === 'success').length / logs.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{logs.filter((l: SyncLogEntry) => l.status === 'success').length} {t('Milkaa\'ee', 'ተሳክቷል', 'Success')}</span>
                <span>{logs.length} {t('Waliigala', 'ጠቅላላ', 'Total')}</span>
              </div>
            </div>

            {/* Status Breakdown Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t('Addaan Baafata Haalaa', 'የሁኔታ ዝርዝር', 'Status Breakdown')}
              </span>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                <div 
                  className="bg-emerald-500 h-full" 
                  style={{ width: `${(logs.filter((l: SyncLogEntry) => l.status === 'success').length / logs.length) * 100}%` }}
                  title="Success"
                />
                <div 
                  className="bg-amber-500 h-full" 
                  style={{ width: `${(logs.filter((l: SyncLogEntry) => l.status === 'partial').length / logs.length) * 100}%` }}
                  title="Partial"
                />
                <div 
                  className="bg-rose-500 h-full" 
                  style={{ width: `${(logs.filter((l: SyncLogEntry) => l.status === 'failed').length / logs.length) * 100}%` }}
                  title="Failed"
                />
              </div>
              <div className="flex gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-400">{logs.filter((l: SyncLogEntry) => l.status === 'success').length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-400">{logs.filter((l: SyncLogEntry) => l.status === 'partial').length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-400">{logs.filter((l: SyncLogEntry) => l.status === 'failed').length}</span>
                </div>
              </div>
            </div>

            {/* Latency Metrics Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t('Saffisa Wal-simsiisaa', 'የማመሳሰል ፍጥነት', 'Sync Latency')}
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800/50">
                  <p className="text-[9px] text-slate-500 uppercase font-bold">{t('Giddu-galeessa', 'አማካይ', 'Average')}</p>
                  <p className="text-sm font-mono text-blue-400 font-bold">
                    {(() => {
                      const latencies = logs.filter((l: SyncLogEntry) => l.latency !== undefined).map((l: SyncLogEntry) => l.latency!);
                      if (latencies.length === 0) return '---';
                      return Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) + 'ms';
                    })()}
                  </p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800/50">
                  <p className="text-[9px] text-slate-500 uppercase font-bold">{t('Olaanaa', 'ከፍተኛ', 'Peak')}</p>
                  <p className="text-sm font-mono text-amber-400 font-bold">
                    {(() => {
                      const latencies = logs.filter((l: SyncLogEntry) => l.latency !== undefined).map((l: SyncLogEntry) => l.latency!);
                      if (latencies.length === 0) return '---';
                      return Math.max(...latencies) + 'ms';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 italic">
            <div className="animate-spin text-2xl mb-2">🔄</div>
            <p>{t('Galmeen dubbisamaa jira...', 'ምዝግብ ማስታወሻ በመጫን ላይ...', 'Loading sync logs...')}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">
            <p>{t('Galmeen wal-simsiisaa hin jiru.', 'ምንም የማመሳሰል ምዝግብ ማስታወሻ የለም።', 'No sync logs found.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {logs.map((log: SyncLogEntry) => (
              <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {getTypeLabel(log.type)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString(currentLang === 'en' ? 'en-US' : 'en-GB')}
                      </span>
                      {log.latency !== undefined && (
                        <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          {log.latency}ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {log.details}
                    </p>
                    {log.affectedIds.length > 0 && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="font-bold">Affected:</span>
                        <span className="font-mono truncate max-w-md">{log.affectedIds.join(', ')}</span>
                      </div>
                    )}
                    {log.errorMessage && (
                      <div className="mt-2 p-2 bg-rose-500/5 border border-rose-500/20 rounded text-[11px] text-rose-300 font-mono">
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                  {log.conflictsResolved && (
                    <div className="shrink-0" title="Conflicts Resolved">
                      <span className="text-emerald-500 text-lg">✅</span>
                    </div>
                  )}
                  {log.conflictData && !log.conflictsResolved && (
                    <button
                      onClick={() => setResolvingConflict(log)}
                      className="shrink-0 px-3 py-1 bg-amber-500 text-slate-900 text-[10px] font-bold rounded-lg hover:bg-amber-400 transition-colors"
                    >
                      {t('Hiiki', 'ፍታ', 'Resolve')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {resolvingConflict && resolvingConflict.conflictData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-amber-500">⚖️</span>
                <span>{t('Wal-dhabdee Hiikuu', 'ግጭትን መፍታት', 'Resolve Conflict')}</span>
              </h3>
              <button 
                onClick={() => setResolvingConflict(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-400 mb-6 italic">
                {t(
                  'Sanada tokko irratti jijjiirama terminals adda addaa irraa dhufe lama argameera. Kamtu sirrii dha?',
                  'በአንድ ሰነድ ላይ ከተለያዩ ተርሚናሎች የመጡ ሁለት ለውጦች ተገኝተዋል። የትኛው ትክክል ነው?',
                  'Two versions of this document were detected from different terminals. Which one should be kept?'
                )}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Local Version */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      {t('VERSION KEE', 'የእርስዎ ስሪት', 'YOUR VERSION')}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(resolvingConflict.conflictData.local.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold text-white truncate">
                      {resolvingConflict.conflictData.local.caseNumber} - {resolvingConflict.conflictData.local.claimantName}
                    </p>
                    <div className="p-2 bg-slate-900 rounded text-[10px] text-slate-400 font-mono line-clamp-4">
                      {resolvingConflict.conflictData.local.claimSubject}
                    </div>
                  </div>
                  <button
                    disabled={isProcessingResolution}
                    onClick={() => handleResolve('local')}
                    className="mt-4 w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-all border border-slate-700"
                  >
                    {isProcessingResolution ? '...' : t('Kan koo fudhadhu', 'የእኔን ውሰድ', 'Keep Mine')}
                  </button>
                </div>

                {/* Remote Version */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                      {t('VERSION SERVERII', 'የአገልጋይ ስሪት', 'SERVER VERSION')}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(resolvingConflict.conflictData.remote.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold text-white truncate">
                      {resolvingConflict.conflictData.remote.caseNumber} - {resolvingConflict.conflictData.remote.claimantName}
                    </p>
                    <div className="p-2 bg-slate-900 rounded text-[10px] text-slate-400 font-mono line-clamp-4">
                      {resolvingConflict.conflictData.remote.claimSubject}
                    </div>
                  </div>
                  <button
                    disabled={isProcessingResolution}
                    onClick={() => handleResolve('remote')}
                    className="mt-4 w-full py-2 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-400 transition-all shadow-lg"
                  >
                    {isProcessingResolution ? '...' : t('Kan Serverii fudhadhu', 'የአገልጋዩን ውሰድ', 'Keep Server\'s')}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <p className="text-[10px] text-blue-300 leading-relaxed">
                  {t(
                    'Hubachiisa: Version tokko yoo filattan kan biraa guutummaatti ni haqama.',
                    'ማሳሰቢያ፡ አንድ ስሪት ሲመርጡ ሌላኛው ሙሉ በሙሉ ይሰረዛል።',
                    'Note: Choosing one version will permanently overwrite the other across all terminals.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
        <span>Total Logs: {logs.length}</span>
        <span>Offline IndexedDB Storage</span>
      </div>
    </div>
  );
};

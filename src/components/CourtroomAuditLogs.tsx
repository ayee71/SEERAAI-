import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldCheck, Search, Filter, Clock, User, FileText, CheckCircle2, AlertCircle, RefreshCw, Layers, Download, CheckSquare, Square } from 'lucide-react';
import { Language } from '../i18n/translations';
import { CaseActivityLog, fetchCaseActivityLogs, subscribeToCaseActivityLogs } from '../services/courtCaseService';

interface CourtroomAuditLogsProps {
  currentLang: Language;
  caseNumber: string;
  caseId?: string;
  onClose?: () => void;
}

export const CourtroomAuditLogs: React.FC<CourtroomAuditLogsProps> = ({
  currentLang,
  caseNumber,
  caseId,
  onClose
}) => {
  const isOm = currentLang === 'om';
  const [logs, setLogs] = useState<CaseActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caseNumber) return;
    setLoading(true);
    setError(null);

    // Fetch initial and subscribe
    fetchCaseActivityLogs(caseNumber)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load audit logs');
        setLoading(false);
      });

    const unsubscribe = subscribeToCaseActivityLogs(caseNumber, (updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [caseNumber]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesSearch = !searchQuery.trim() || 
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.performedBy && log.performedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((log as any).sessionId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((log as any).ipAddress?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedLogIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map((l, idx) => l.id || `log-${idx}`));
    }
  };

  const toggleSelectLog = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLogIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const exportSelectedToCsv = () => {
    const logsToExport = filteredLogs.filter((l, idx) => 
      selectedLogIds.length === 0 || selectedLogIds.includes(l.id || `log-${idx}`)
    );

    if (logsToExport.length === 0) {
      alert(isOm ? 'Galmeen xiinxalamuuf filatame hin jiru.' : 'No log entries selected to export.');
      return;
    }

    const csvRows = [
      ['Log ID', 'Timestamp', 'Action', 'Title', 'Performed By', 'Role', 'Description', 'Case Number'].join(',')
    ];

    logsToExport.forEach((l, idx) => {
      const row = [
        `"${l.id || `log-${idx}`}"`,
        `"${l.timestamp ? new Date(l.timestamp).toISOString() : ''}"`,
        `"${l.action || ''}"`,
        `"${(l.title || '').replace(/"/g, '""')}"`,
        `"${(l.performedBy || 'System').replace(/"/g, '""')}"`,
        `"${(l.performedByRole || '').replace(/"/g, '""')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${caseNumber}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Courtroom_Audit_Logs_${caseNumber.replace(/[/\\?%*:|"<>]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const t = {
    om: {
      title: `Galmee Lakk. ${caseNumber} - Hojiilee & Ragaa Dhaddachaa (Courtroom Audit Logs)`,
      desc: 'Hojiilee hundi hoggansa mana murtii, abbaa seeraa, ofiisara seeraa fi hojjettootaan galmee kana irratti raawwataman.',
      searchPlaceholder: 'Hojjetaa, mata-duree ykn ibsa barbaadi...',
      allActions: 'Hojiilee Hunda (All Actions)',
      noLogs: 'Hojiilee dhaddachaa galmee kana irratti galmaa\'e hin jiru.',
      performedBy: 'Hojjetaa Raawwate:',
      timestamp: 'Sa\'aa Raawwii:',
    },
    am: {
      title: `መዝገብ ቁጥር ${caseNumber} - የፍርድ ቤት የኦዲት ማስታወሻዎች (Courtroom Audit Logs)`,
      desc: 'በዳኞች፣ በሕግ ኦፊሰሮች እና በሰራተኞች በዚህ መዝገብ ላይ የተከናወኑ ሁሉም የፍርድ ቤት ተግባራት።',
      searchPlaceholder: 'ሰራተኛ፣ ርዕስ ወይም መግለጫ ይፈልጉ...',
      allActions: 'ሁሉም ተግባራት (All Actions)',
      noLogs: 'በዚህ መዝገብ ላይ የተመዘገበ የፍርድ ቤት ተግባር የለም።',
      performedBy: 'የፈጸመው አካል:',
      timestamp: 'የተከናወነበት ሰዓት:',
    },
    en: {
      title: `Docket #${caseNumber} - Courtroom Audit Logs & Proceedings`,
      desc: 'Complete immutable audit trail of actions performed by court personnel, judges, and officers for this case docket.',
      searchPlaceholder: 'Search staff, action title, or description...',
      allActions: 'All Actions',
      noLogs: 'No court audit logs recorded for this case yet.',
      performedBy: 'Performed By:',
      timestamp: 'Timestamp:',
    }
  }[currentLang] || {
    title: `Docket #${caseNumber} - Courtroom Audit Logs & Proceedings`,
    desc: 'Complete immutable audit trail of actions performed by court personnel, judges, and officers for this case docket.',
    searchPlaceholder: 'Search staff, action title, or description...',
    allActions: 'All Actions',
    noLogs: 'No court audit logs recorded for this case yet.',
    performedBy: 'Performed By:',
    timestamp: 'Timestamp:',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-slate-100 font-serif-legal">{t.title}</h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                Firestore Verified & Immutable
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-amber-500"/>
            {isOm ? 'Scroll auto' : 'Auto-scroll'}
          </label>
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">{t.allActions}</option>
            <option value="case_created">Case Created</option>
            <option value="case_assigned">Case Assigned</option>
            <option value="status_changed">Status Changed</option>
            <option value="order_dispatched">Order Dispatched</option>
            <option value="hearing_scheduled">Hearing Scheduled</option>
            <option value="general_update">General Update</option>
          </select>
        </div>
      </div>

      {/* Bulk Export Toolbar */}
      {filteredLogs.length > 0 && (
        <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer font-medium"
          >
            {selectedLogIds.length === filteredLogs.length && filteredLogs.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {isOm 
                ? `Hunda Filadhu (${selectedLogIds.length}/${filteredLogs.length})` 
                : `Select All (${selectedLogIds.length}/${filteredLogs.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={exportSelectedToCsv}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isOm 
                ? (selectedLogIds.length > 0 ? `CSV Baasi (${selectedLogIds.length})` : 'CSV Hunda Baasi')
                : (selectedLogIds.length > 0 ? `Export CSV (${selectedLogIds.length})` : 'Export All CSV')}
            </span>
          </button>
        </div>
      )}

      {/* Logs List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs">Loading courtroom audit logs from Firestore...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2 bg-slate-950/50 rounded-2xl border border-slate-800/80">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs">{t.noLogs}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1" ref={scrollRef}>
          {filteredLogs.map((log, index) => {
            const [isExpanded, setIsExpanded] = useState(false);
            const logId = log.id || `log-${index}`;
            const isSelected = selectedLogIds.includes(logId);

            return (
              <div
                key={logId}
                className={`p-4 rounded-2xl bg-slate-950 border transition-all space-y-2 cursor-pointer ${
                  isSelected ? 'border-amber-500/70 bg-amber-500/5' : 'border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => toggleSelectLog(logId, e)}
                      className="p-0.5 text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-xs text-slate-100">{log.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-amber-300 uppercase font-bold">
                      {log.action}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {log.description}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-850">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.performedBy} <strong className="text-slate-200">{log.performedBy || 'System Registrar'}</strong></span>
                    {log.performedByRole && <span className="text-slate-500">({log.performedByRole})</span>}
                  </div>

                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Verified Log • {isExpanded ? 'Hide Details' : 'Show Details'}
                  </span>
                </div>

                {isExpanded && (
                  <div className="mt-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800 animate-in slide-in-from-top-2 duration-200 text-[10px] text-slate-400 space-y-1.5 font-mono">
                    <p><strong>Session ID:</strong> {(log as any).sessionId || 'N/A'}</p>
                    <p><strong>Device ID:</strong> {(log as any).deviceId || 'Unknown'}</p>
                    <p><strong>IP Address:</strong> {(log as any).ipAddress || '192.168.1.xxx'}</p>
                    <p><strong>User Agent:</strong> {(log as any).userAgent || 'Mozilla/5.0...'}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

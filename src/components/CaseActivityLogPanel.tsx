import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { 
  CaseActivityLog, 
  fetchCaseActivityLogs, 
  subscribeToCaseActivityLogs, 
  addCaseActivityLog 
} from '../services/courtCaseService';
import { 
  History, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Gavel, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Flag,
  ArrowRight,
  Filter,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { downloadCaseWorkHistoryPDF } from '../services/caseSummaryService';

interface CaseActivityLogPanelProps {
  caseId: string;
  caseNumber: string;
  claimSubject?: string;
  currentLang: Language;
  onClose: () => void;
  currentUser?: {
    fullName: string;
    role: string;
  };
}

export const CaseActivityLogPanel: React.FC<CaseActivityLogPanelProps> = ({
  caseId,
  caseNumber,
  claimSubject,
  currentLang,
  onClose,
  currentUser
}) => {
  const [logs, setLogs] = useState<CaseActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Note Entry
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Subscribe to live activity_logs subcollection
    const unsubscribe = subscribeToCaseActivityLogs(caseId, (fetchedLogs) => {
      setLogs(fetchedLogs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [caseId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);
    try {
      const performer = currentUser?.fullName || 'Ofiisara Seeraa';
      const role = currentUser?.role || 'court_personnel';

      await addCaseActivityLog(caseId, {
        action: 'general_update',
        title: currentLang === 'om' ? 'Galmee Irratti Yaada/Tarkaanfii Galmaa\'e' : 'የክስ ሂደት ማስታወሻ',
        description: newNoteText.trim(),
        performedBy: performer,
        performedByRole: role,
        details: { manualNote: true }
      });

      setNewNoteText('');
    } catch (err) {
      console.error('Failed to add case activity note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'case_assigned':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-amber-400" />,
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          label: currentLang === 'om' ? 'Ramaddii' : 'ምደባ'
        };
      case 'priority_updated':
        return {
          icon: <Flag className="w-3.5 h-3.5 text-rose-400" />,
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          label: currentLang === 'om' ? 'Ariifannaa' : 'ቅድሚያ'
        };
      case 'status_changed':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />,
          bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
          label: currentLang === 'om' ? 'Sadarkaa' : 'ሁኔታ'
        };
      case 'payment_updated':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          label: currentLang === 'om' ? 'Kaffaltii' : 'ክፍያ'
        };
      case 'case_created':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-indigo-400" />,
          bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
          label: currentLang === 'om' ? 'Baname' : 'የተከፈተ'
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          label: currentLang === 'om' ? 'Gabaasa' : 'ማስታወሻ'
        };
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'all') return true;
    return log.action === filterAction;
  });

  const handleCopyLogs = () => {
    const textToCopy = `=== CASE ACTIVITY LOG ===\nLakk. Galmee: ${caseNumber}\nDhimma: ${claimSubject || 'N/A'}\n\n` + 
      logs.map(l => `[${new Date(l.timestamp).toLocaleString()}] ${l.title}\n${l.description}\nRaaawwataan: ${l.performedBy} (${l.performedByRole || 'Staff'})\n`).join('\n---\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadWorkHistoryPDF = () => {
    const officerLog = logs.find(l => l.performedByRole?.includes('officer') || l.performedByRole?.includes('registrar') || l.action === 'case_created');
    const judgeLog = logs.find(l => l.performedByRole?.includes('judge') || l.action === 'case_assigned');

    downloadCaseWorkHistoryPDF({
      caseNumber: caseNumber,
      claimSubject: claimSubject || 'Dhimma Falmii',
      courtName: 'MANA MURTII AANAA ADAAMAA',
      benchName: 'Dhaddacha Hariiroo Hawaasaa',
      filingDate: logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      legalOfficerName: officerLog?.performedBy || 'Ofiisara Seeraa Galmee',
      legalOfficerRole: officerLog?.performedByRole || 'Registrar/Officer',
      assignedJudgeName: judgeLog?.performedBy || 'Abbaa Seeraa Caalaa',
      assignedJudgeBench: 'Dhaddacha Hariiroo Hawaasaa 1ffaa',
      activityLogs: logs.map(l => ({
        title: l.title,
        description: l.description,
        performedBy: l.performedBy,
        performedByRole: l.performedByRole,
        timestamp: l.timestamp,
        action: l.action
      }))
    }, currentLang);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-bold">
                  Firestore activity_logs
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  {caseNumber}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif-legal mt-0.5">
                {currentLang === 'om' ? 'Galmee Seenaa Tarkaanfii (Case Activity Log)' : currentLang === 'am' ? 'የክስ እንቅስቃሴ ታሪክ እና ሰነዶች' : 'Case Activity Log & Action History'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadWorkHistoryPDF}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-amber-400/40"
              title="Waraqaa Hojii Galmee Download (PDF with Court Logo)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{currentLang === 'om' ? 'Waraqaa Hojii PDF' : 'Download Work PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLogs}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Copy All Case Logs"
            >
              {copiedId === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copiedId === 'all' ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Claim Subject Summary & Action Filter */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-300 font-medium truncate max-w-md">
            <span className="text-slate-500 font-mono text-[11px] uppercase mr-1.5">Mata-duree:</span>
            {claimSubject || 'Dhimma Falmii'}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {[
              { id: 'all', label: currentLang === 'om' ? 'Hunda' : 'All' },
              { id: 'case_assigned', label: currentLang === 'om' ? 'Ramaddii' : 'Assignments' },
              { id: 'priority_updated', label: currentLang === 'om' ? 'Ariifannaa' : 'Priority' },
              { id: 'payment_updated', label: currentLang === 'om' ? 'Kaffaltii' : 'Payment' },
              { id: 'general_update', label: currentLang === 'om' ? 'Yaada' : 'Notes' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAction(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                  filterAction === f.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Timeline List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">{currentLang === 'om' ? 'Seenaan galmee fe\'amaa jira...' : 'Loading case activity logs...'}</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <History className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs">
                {currentLang === 'om' ? 'Seenaan galmee filatame hin jiru.' : 'No activity logs found for this filter.'}
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-800 ml-4 space-y-5 py-2">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.action);
                const dateObj = new Date(log.timestamp);
                const formattedDate = dateObj.toLocaleDateString(undefined, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                });
                const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={log.id} className="relative pl-6 group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center group-hover:scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    </div>

                    {/* Activity Card */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all shadow-md space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold flex items-center gap-1 ${badge.bg}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {log.title}
                          </h4>
                        </div>

                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span className="text-amber-400/90">{formattedTime}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {log.description}
                      </p>

                      {/* Details / Assigned Judges Tag list if present */}
                      {log.details?.assignedJudges && Array.isArray(log.details.assignedJudges) && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] font-mono text-slate-500">Abbootii Seeraa:</span>
                          {log.details.assignedJudges.map((jName: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-amber-300 font-mono font-medium">
                              ⚖️ {jName}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Details / Priority Badge if present */}
                      {log.details?.priority && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-mono text-slate-500">Sadarkaa:</span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold uppercase">
                            ⚡ {log.details.priority}
                          </span>
                        </div>
                      )}

                      {/* Performer Footer */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-300 font-semibold">{log.performedBy}</span>
                          {log.performedByRole && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({log.performedByRole})
                            </span>
                          )}
                        </div>

                        <span className="text-[9px] font-mono text-slate-600">
                          ID: {log.id.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action/Note Insertion Form at Bottom */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 shrink-0">
          <form onSubmit={handleAddNote} className="space-y-2">
            <div className="text-[11px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentLang === 'om' ? 'Yaada / Tarkaanfii Haaraa Galmee Kana Irratti Galchi:' : 'Add Case Activity / Judicial Note:'}</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder={currentLang === 'om' ? 'Fkn: Waamichi lammaffaa himatamaaf bilbilaan darbeera...' : 'e.g. Summons confirmed, evidence file submitted...'}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />

              <button
                type="submit"
                disabled={!newNoteText.trim() || isSubmittingNote}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isSubmittingNote ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{currentLang === 'om' ? 'Galchi' : 'Add Log'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

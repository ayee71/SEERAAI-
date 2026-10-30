import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { AuditLogEntry } from '../services/auditService';
import { Clock, Download } from 'lucide-react';

interface AuditLogPanelProps {
  institutionId: string;
}

export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ institutionId }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'audit_logs'),
      where('institutionId', '==', institutionId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        } as AuditLogEntry));
        setLogs(data);
        setLoading(false);
      },
      (error) => {
        console.warn('AuditLogPanel listener notice:', error);
        setLogs([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [institutionId]);

  const filteredLogs = logs.filter(log =>
    log.institutionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actionType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadCsv = () => {
    const headers = ['Action Type', 'Details', 'Performed By', 'Timestamp'];
    const rows = filteredLogs.map(log => [
      `"${log.actionType || ''}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${log.performedBy || ''}"`,
      `"${log.timestamp ? new Date(log.timestamp).toISOString() : ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `institution_${institutionId}_audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-4 text-xs text-slate-400">Loading audit trail...</div>;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Search logs by institution, bench ID, or action..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Logs (CSV)</span>
        </button>
      </div>
      <table className="w-full text-xs text-left">
        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
          <tr>
            <th className="p-3 font-semibold">Action</th>
            <th className="p-3 font-semibold">Details</th>
            <th className="p-3 font-semibold">Performed By</th>
            <th className="p-3 font-semibold">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {filteredLogs.map((log, i) => (
            <tr key={i} className="hover:bg-slate-900 transition-colors text-slate-200">
              <td className="p-3 font-mono text-amber-400 font-bold uppercase text-[10px]">{log.actionType}</td>
              <td className="p-3 text-slate-300">{log.details}</td>
              <td className="p-3 text-slate-400">{log.performedBy}</td>
              <td className="p-3 text-slate-500 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {log.timestamp?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

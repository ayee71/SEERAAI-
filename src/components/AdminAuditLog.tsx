import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface AuditLog {
  id: string;
  actionType: string;
  details: string;
  timestamp: any;
}

export const AdminAuditLog: React.FC<{ institutionId: string }> = ({ institutionId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'admin_logs'),
      where('institutionId', '==', institutionId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    return onSnapshot(
      q,
      (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      },
      (error) => {
        console.warn('AdminAuditLog onSnapshot notice:', error);
        setLogs([]);
      }
    );
  }, [institutionId]);

  return (
    <div className="bg-slate-900 p-4 rounded-3xl border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-3">Admin Audit Log</h3>
      <ul className="space-y-2 text-xs text-slate-300">
        {logs.map(log => (
          <li key={log.id} className="p-2 border-b border-slate-800">
            <strong>{log.actionType}</strong>: {log.details}
          </li>
        ))}
      </ul>
    </div>
  );
};

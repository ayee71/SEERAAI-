import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface AuthLog {
  id: string;
  userId: string;
  attemptType: 'success' | 'failed';
  timestamp: any;
  details?: string;
}

export const HistoryLogComponent: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuthLog[]>([]);

  useEffect(() => {
    if (!user) return;

    const logsRef = collection(db, 'auth_logs');
    const q = query(logsRef, where('userId', '==', user.uid), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logsData: AuthLog[] = [];
        snapshot.forEach((doc) => {
          logsData.push({ id: doc.id, ...doc.data() } as AuthLog);
        });
        setLogs(logsData);
      },
      (error) => {
        console.warn('HistoryLogComponent onSnapshot notice:', error);
        setLogs([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mt-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Biometric Audit Log (Firestore)</h4>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="flex flex-col gap-1">
              <span className="text-slate-300 font-mono">{log.timestamp?.toDate().toLocaleString()}</span>
              {log.details && <span className="text-slate-500">{log.details}</span>}
            </div>
            <span className={`px-2 py-0.5 rounded font-bold ${log.attemptType === 'success' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
              {log.attemptType}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-xs text-slate-600 italic">No biometric logs found in database.</p>
        )}
      </div>
    </div>
  );
};
